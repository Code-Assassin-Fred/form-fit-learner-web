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

// Next.js Route Handler for SSE AI Analysis
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

  const { mediaBase64, mimeType, mediaType, clientId } = await req.json();

  if (!mediaBase64 || !clientId) {
    return NextResponse.json({ error: 'mediaBase64 and clientId are required' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step, progress, message) => {
        console.log(`[AI PROGRESS] ${step}: ${progress}% - ${message}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', step, progress, message })}\n\n`));
      };

      try {
        sendProgress('init', 10, 'Initializing AI agents...');

        // AGENT 1: Observation Agent
        sendProgress('observing', 25, 'Observing student challenges...');
        const observerPrompt = `You are a Specialist Observation Agent for Assistive Technology and Physical Inclusion.
Your task is to provide a PRECISE, EMPATHETIC, and OBJECTIVE observation of the user's physical interactions in this ${mediaType}.
Focus strictly on:
- **Human Capability & Physical Barriers**: Identify specific physical inabilities (e.g., missing limbs, paralyzed areas) and physical constrictions (e.g., limited range of motion, tremors).
- **Interactive Obstacles**: Describe specific difficulties the client faces when trying to perform educational tasks (writing, typing, gripping).
- **Kinematic Data**: Note observable angles of flexion or range of motion limits.
Avoid focusing on furniture or room setup unless it's an immediate physical hazard. Be extremely specific.`;

        const observerResult = await model.generateContent([
          observerPrompt,
          { inlineData: { data: mediaBase64, mimeType } },
        ]);
        const observations = await observerResult.response.text();

        // AGENT 2: Analysis Agent
        sendProgress('analyzing', 50, 'Analyzing physical inabilities & barriers...');
        const analystPrompt = `You are an Adaptive Learning & Inclusion Analysis Agent. Based on these observations:
"${observations}"

Perform a deep-dive analysis into the specific physical inabilities and constrictions that create learning barriers.
Analyze:
- **Educational Impact**: Identify precisely where standard educational tools fail to accommodate their unique physical profile.
- **Learning Endurance**: Assess the impact on fatigue and musculoskeletal health over time.
- **Academic Dignity**: Analyze the impact on their independence and ability to reach their full potential.
The goal is to move beyond simple observation into profound ergonomic and educational analysis.`;
        const analystResult = await model.generateContent(analystPrompt);
        const analysis = await analystResult.response.text();

        // AGENT 3: Solutions Agent
        sendProgress('recommending', 75, 'Generating assistive recommendations...');
        const solutionsPrompt = `You are an Assistive Technology & Inclusion Specialist.
Observations: "${observations}"
Analysis: "${analysis}"

Your task:
1. Recommend exactly ONE specific 3D printable assistive tool tailored to this client's specific physical inability or constriction.
2. Generate a comprehensive "Inclusion & Kinematic Research Report" in a professional layout.

REPORT DEPTH REQUIREMENT:
- This MUST be a deep, doctoral-level research report.
- Narrative sections MUST be exhaustive (3-5 detailed paragraphs each).
- Use a professional, academic, and empathetic tone.

FORMATTING RULES (IMPORTANT):
- Use Markdown Headers for structure: # Title, ## Section, ### Subsection.
- DO NOT use LaTeX structural commands like \\section.
- ONLY use LaTeX for mathematical formulas and measurements.

The report MUST include:
# Inclusion & Kinematic Research Report
## Executive Summary
## Physical Observation Table
## Research-Based Barrier Analysis
## 3D Printable Specification (Include mathematical rationale)
## Technical Specifications Table
## Implementation Strategy

Return ONLY a valid JSON object with:
{
  "issue": "Concise 1-sentence primary constraint.",
  "details": "THE FULL MARKDOWN REPORT",
  "recommendedToolId": "snake_case_id",
  "toolDescription": "Tool name",
  "category": "grip|posture|stability|accessibility",
  "stlSpecs": {
    "type": "grip" | "wedge" | "mount",
    "dimensions": { "diameter": 25, "height": 50, "hole_diameter": 10 } (example)
  }
}`;

        const solutionsResult = await model.generateContent(solutionsPrompt);
        const solutionsText = await solutionsResult.response.text();
        
        // Robust JSON extraction using Regex and sanitization
        let finalResults;
        try {
          // Remove potential Markdown code fences and leading/trailing chatter
          const sanitizedText = solutionsText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
          
          const jsonMatch = sanitizedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            finalResults = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON object found in response');
          }
        } catch (e) {
          console.error('[JSON PARSE ERROR]', e);
          finalResults = {
            issue: 'Inclusion Assessment',
            details: solutionsText,
            recommendedToolId: 'custom_adaptation',
            toolDescription: 'Custom Adaptation',
            category: 'accessibility',
            stlSpecs: { type: 'mount', dimensions: { x: 40, y: 40, z: 5 } }
          };
        }
        const reportContent = finalResults?.details || 'Analysis completed with no detailed report.';
        
        // Generate actual STL data
        const stlData = generateSTL(finalResults.stlSpecs || { type: 'mount', dimensions: { x: 40, y: 40, z: 10 } });
        const chunkContent = (text, size = 500000) => {
          if (!text) return [];
          const chunks = [];
          for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
          }
          return chunks;
        };
        const reportChunks = chunkContent(reportContent);

        // AGENT 4: Visual Agent (Gemini 3 Pro Image Preview)
        sendProgress('visualizing', 90, 'Simulating 3D visual prototype...');
        let previewImageUrl = null;
        try {
          // Using a refined prompt for the visual representation of the tool
          const visualPrompt = `A high-quality, photorealistic 3D rendering of a custom assistive device: ${finalResults.toolDescription}. 
          Designed for ${finalResults.category} assistance. 
          The tool is ${finalResults.stlSpecs?.type || 'ergonomic'} shaped. 
          Studio lighting, white background, technical product photography, 4k resolution.`;
          
          const imageRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: visualPrompt }] }]
            })
          });

          if (imageRes.ok) {
            const imageData = await imageRes.json();
            // Extract image from parts[1].inlineData or wherever it is in the response
            const parts = imageData.candidates?.[0]?.content?.parts;
            if (parts) {
              const imagePart = parts.find(p => p.inlineData);
              if (imagePart) {
                previewImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
              } else {
                // Fallback: check if it's text-based image data (some versions return it differently)
                console.log('[VISUAL] No inlineData found, checking other parts');
              }
            }
          }
        } catch (visErr) {
          console.error('[VISUAL ERROR]', visErr);
        }

        // Save to Firestore
        const assessmentRef = adminDb.collection('assessments').doc();
        const newAssessment = {
          id: assessmentRef.id,
          learnerId: clientId || 'unknown_client',
          userId: user.uid,
          mediaUrl: 'https://placeholder.com/media',
          mediaType: mediaType || 'image',
          timestamp: new Date().toISOString(),
          analysisResults: finalResults || {},
          reportSummary: reportContent.substring(0, 500),
          reportChunks: reportChunks,
          stlData: stlData,
          stlParams: finalResults.stlSpecs || {},
          recommendedToolId: finalResults?.recommendedToolId || 'custom_adaptation',
          toolDescription: finalResults?.toolDescription || 'Custom Assistive Adaptation',
          previewImage: previewImageUrl,
          status: 'completed'
        };

        await assessmentRef.set(newAssessment);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', assessmentId: newAssessment.id, assessment: newAssessment })}\n\n`));
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
