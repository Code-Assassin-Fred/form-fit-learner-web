import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to generate ASCII STL content based on parametric specs
function generateSTL(specs) {
  const { type, dimensions } = specs;
  const name = specs.name || "assistive_tool";
  let stl = `solid ${name.replace(/\s+/g, '_')}\n`;

  const addFacet = (v1, v2, v3) => {
    stl += "  facet normal 0 0 0\n    outer loop\n";
    stl += `      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n`;
    stl += `      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n`;
    stl += `      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n`;
    stl += "    endloop\n  endfacet\n";
  };

  if (type === 'grip') {
    const r = (dimensions.diameter || 25) / 2;
    const h = dimensions.height || 40;
    const sides = 8;
    const vT = [], vB = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      vB.push([r * Math.cos(a), r * Math.sin(a), 0]);
      vT.push([r * Math.cos(a), r * Math.sin(a), h]);
    }
    for (let i = 1; i < sides - 1; i++) {
       addFacet(vB[0], vB[i], vB[i+1]);
       addFacet(vT[0], vT[i+1], vT[i]);
    }
    for (let i = 0; i < sides; i++) {
       const nx = (i + 1) % sides;
       addFacet(vB[i], vT[i], vT[nx]);
       addFacet(vB[i], vT[nx], vB[nx]);
    }
  } else if (type === 'wedge') {
    const l = dimensions.length || 50, w = dimensions.width || 40, h = dimensions.height || 20;
    const v = [[0,0,0], [l,0,0], [l,w,0], [0,w,0], [0,0,h], [0,w,h]];
    addFacet(v[0], v[3], v[2]); addFacet(v[0], v[2], v[1]);
    addFacet(v[0], v[1], v[4]); addFacet(v[3], v[5], v[2]);
    addFacet(v[1], v[2], v[5]); addFacet(v[1], v[5], v[4]);
    addFacet(v[0], v[4], v[5]); addFacet(v[0], v[5], v[3]);
  } else {
    const x = dimensions.x || 30, y = dimensions.y || 30, z = dimensions.z || 10;
    const v = [[0,0,0], [x,0,0], [x,y,0], [0,y,0], [0,0,z], [x,0,z], [x,y,z], [0,y,z]];
    addFacet(v[0], v[3], v[2]); addFacet(v[0], v[2], v[1]);
    addFacet(v[4], v[5], v[6]); addFacet(v[4], v[6], v[7]);
    addFacet(v[0], v[1], v[5]); addFacet(v[0], v[5], v[4]);
    addFacet(v[1], v[2], v[6]); addFacet(v[1], v[6], v[5]);
    addFacet(v[2], v[3], v[7]); addFacet(v[2], v[7], v[6]);
    addFacet(v[3], v[0], v[4]); addFacet(v[3], v[4], v[7]);
  }
  stl += `endsolid ${name.replace(/\s+/g, '_')}\n`;
  return stl;
}

// Next.js Route Handler for SSE AI Analysis & Refinement
export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let user;
  try {
    const token = authHeader.split('Bearer ')[1];
    user = await adminAuth.verifyIdToken(token);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { mediaBase64, mimeType, mediaType, clientId, mode, assessmentId, clientFeedback } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step, progress, message) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', step, progress, message })}\n\n`));
      };

      try {
        let finalResults;
        let originalAssessment = null;

        if (mode === 'refine' && assessmentId) {
          sendProgress('refining', 20, 'Fetching original assessment...');
          const assessmentDoc = await adminDb.collection('assessments').doc(assessmentId).get();
          if (!assessmentDoc.exists) throw new Error('Original assessment not found.');
          originalAssessment = assessmentDoc.data();

          sendProgress('refining', 40, 'Refining with AI suggestions...');
          const refinementPrompt = `You are a Specialist Assistive Technology Refinement Agent.
          
ORIGINAL REPORT:
"${originalAssessment.analysisResults?.details || originalAssessment.reportSummary}"

USER/CLIENT SUGGESTIONS FOR IMPROVEMENT:
"${clientFeedback}"

TASK:
1. Update the doctoral-level research report to incorporate the specific suggestions.
2. Refine the 3D printable specifications (stlSpecs) to reflect the ergonomic adjustments requested.
3. Improve the technical rationale based on the new constraints.

Return ONLY a valid JSON object with:
{
  "issue": "Revised primary constraint description.",
  "details": "THE UPDATED FULL MARKDOWN REPORT",
  "recommendedToolId": "${originalAssessment.recommendedToolId}",
  "toolDescription": "Updated Tool Name",
  "category": "${originalAssessment.analysisResults?.category || 'accessibility'}",
  "stlSpecs": {
    "type": "${originalAssessment.stlParams?.type || 'grip'}",
    "dimensions": { ... updated dimensions based on feedback ... }
  }
}`;
          const refinementResult = await model.generateContent(refinementPrompt);
          const refinementText = await refinementResult.response.text();
          
          try {
            const sanitizedText = refinementText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
            finalResults = JSON.parse(jsonMatch ? jsonMatch[0] : sanitizedText);
          } catch (e) {
            throw new Error('Failed to parse refined JSON output.');
          }

        } else {
          // ORIGINAL ANALYSIS FLOW
          sendProgress('init', 10, 'Initializing AI agents...');
          const observerPrompt = `Specialist Observation Agent... Observe physical interactions in this ${mediaType}. Focus on Capability, Barriers, and Kinematic Data.`;
          const observerResult = await model.generateContent([
            observerPrompt,
            { inlineData: { data: mediaBase64, mimeType } },
          ]);
          const observations = await observerResult.response.text();

          sendProgress('analyzing', 50, 'Performing kinematic analysis...');
          const analystPrompt = `Analysis Agent... Analyze observations: "${observations}". Focus on Educational Impact and Learning Endurance.`;
          const analystResult = await model.generateContent(analystPrompt);
          const analysis = await analystResult.response.text();

          sendProgress('recommending', 75, 'Generating STL specifications...');
          const solutionsPrompt = `Solutions Agent... Observations: "${observations}" Analysis: "${analysis}". Generate exactly ONE 3D printable tool specification and a doctoral report.
          Return ONLY a valid JSON with: { "issue", "details", "recommendedToolId", "toolDescription", "category", "stlSpecs": { "type", "dimensions" } }`;
          const solutionsResult = await model.generateContent(solutionsPrompt);
          const solutionsText = await solutionsResult.response.text();
          
          try {
            const sanitizedText = solutionsText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
            finalResults = JSON.parse(jsonMatch ? jsonMatch[0] : sanitizedText);
          } catch (e) {
            finalResults = { details: solutionsText, recommendedToolId: 'custom', toolDescription: 'Custom Tool', category: 'accessibility', stlSpecs: { type: 'mount', dimensions: { x: 40, y: 40, z: 10 } } };
          }
        }

        // VISUALIZATION (Trigger for both analysis and refinement)
        sendProgress('visualizing', 90, 'Generating revised 3D visual preview...');
        let previewImageUrl = originalAssessment?.previewImage || null;
        try {
          const visualPrompt = `A high-quality, photorealistic 3D rendering of a custom assistive device: ${finalResults.toolDescription}. Designed for ${finalResults.category} assistance. Context constraints: ${finalResults.issue}. Studio lighting, white background, technical product photography, 4k.`;
          
          const imageRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: visualPrompt }] }] })
          });

          if (imageRes.ok) {
            const imageData = await imageRes.json();
            const parts = imageData.candidates?.[0]?.content?.parts;
            if (parts) {
              const imagePart = parts.find(p => p.inlineData);
              if (imagePart) previewImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }
          }
        } catch (visErr) {
          console.error('[VISUAL ERROR]', visErr);
        }

        // SAVE
        const reportContent = finalResults?.details || 'Analysis completed.';
        const stlData = generateSTL(finalResults.stlSpecs || { type: 'mount', dimensions: { x: 40, y: 40, z: 10 } });
        
        const chunkContent = (text, size = 500000) => {
          if (!text) return [];
          const chunks = [];
          for (let i = 0; i < text.length; i += size) chunks.push(text.substring(i, i + size));
          return chunks;
        };
        const reportChunks = chunkContent(reportContent);

        const assessmentRef = adminDb.collection('assessments').doc();
        const newAssessment = {
          id: assessmentRef.id,
          learnerId: mode === 'refine' ? originalAssessment.learnerId : (clientId || 'unknown'),
          userId: user.uid,
          mediaUrl: mode === 'refine' ? (originalAssessment.mediaUrl || '') : 'https://placeholder.com/media',
          mediaType: mode === 'refine' ? (originalAssessment.mediaType || 'image') : (mediaType || 'image'),
          timestamp: new Date().toISOString(),
          analysisResults: finalResults || {},
          reportSummary: reportContent.substring(0, 500),
          reportChunks: reportChunks,
          stlData: stlData,
          stlParams: finalResults.stlSpecs || {},
          recommendedToolId: finalResults?.recommendedToolId || 'custom',
          toolDescription: finalResults?.toolDescription || 'Custom Tool',
          previewImage: previewImageUrl,
          status: 'completed',
          parentAssessmentId: mode === 'refine' ? assessmentId : null
        };

        await assessmentRef.set(newAssessment);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', assessmentId: newAssessment.id })}\n\n`));
        controller.close();
      } catch (err) {
        console.error('[AI ERROR]', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
