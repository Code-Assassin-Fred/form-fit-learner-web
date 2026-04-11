import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  const { mediaBase64, mimeType, mediaType, learnerId } = await req.json();

  if (!mediaBase64 || !learnerId) {
    return NextResponse.json({ error: 'mediaBase64 and learnerId are required' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
- **Interactive Obstacles**: Describe specific difficulties the learner faces when trying to perform educational tasks (writing, typing, gripping).
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
1. Recommend exactly ONE specific 3D printable assistive tool tailored to this learner's specific physical inability or constriction.
2. Generate a comprehensive "Inclusion & Kinematic Research Report" in a professional layout.

REPORT DEPTH REQUIREMENT:
- This MUST be a deep, doctoral-level research report.
- Narrative sections MUST be exhaustive (3-5 detailed paragraphs each).
- Use a professional, academic, and empathetic tone.

FORMATTING RULES (IMPORTANT):
- Use Markdown Headers for structure: # for the main title, ## for major sections, ### for subsections.
- DO NOT use LaTeX structural commands like \\section or \\subsection.
- ONLY use LaTeX for mathematical formulas, angles, measurements, and scientific notation (using $ for inline and $$ for blocks).
- Example: "The flexion angle is $45^{\circ}$" or "Formula: $$F = m \cdot a$$".
- Use Markdown lists (- item) and Markdown tables (| Header |) for data.

The report MUST include:
# Inclusion & Kinematic Research Report
## Executive Summary
Multi-paragraph humanitarian impact overview.
## Physical Observation Table
Markdown table [Category, Detailed Observation, Inclusion Impact].
## Research-Based Barrier Analysis
Deep-dive (3+ paragraphs) into kinematic failures of standard tools.
## 3D Printable Specification
Description of the proposed tool with mathematical rationale in LaTeX.
## Technical Specifications Table
Markdown table [Metric, Specification, Rationale].
## Implementation Strategy & Longitudinal Monitoring
Multi-paragraph educator guide.

Return ONLY a valid JSON object with:
{
  "issue": "Concise 1-sentence primary constraint.",
  "details": "THE FULL REPORT (using Markdown for headers/lists and LaTeX for math).",
  "recommendedToolId": "snake_case_id",
  "toolDescription": "Simple tool name (MAX 5 words)",
  "category": "one of: 'grip', 'posture', 'stability', 'accessibility'"
}`;

        const solutionsResult = await model.generateContent(solutionsPrompt);
        const solutionsText = await solutionsResult.response.text();
        
        // Robust JSON extraction using Regex
        let finalResults;
        try {
          const jsonMatch = solutionsText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            finalResults = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON object found in response');
          }
        } catch (e) {
          console.error('[JSON PARSE ERROR]', e);
          finalResults = {
            issue: 'Inclusive Assessment',
            details: solutionsText,
            recommendedToolId: 'custom_adaptation',
            toolDescription: 'Custom Adaptation',
            category: 'accessibility'
          };
        }

        // Utility: Split text into chunks to avoid Firestore 1MB limit
        const chunkContent = (text, size = 500000) => {
          if (!text) return [];
          const chunks = [];
          for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
          }
          return chunks;
        };

        const reportContent = finalResults?.details || 'Analysis completed with no detailed report.';
        const reportChunks = chunkContent(reportContent);

        // Save to Firestore with defensive mapping to avoid undefined properties
        const assessmentRef = adminDb.collection('assessments').doc();
        const newAssessment = {
          id: assessmentRef.id,
          learnerId: learnerId || 'unknown_learner',
          userId: user.uid,
          mediaUrl: 'https://placeholder.com/media', // In production, upload to Firebase Storage
          mediaType: mediaType || 'image',
          timestamp: new Date().toISOString(),
          analysisResults: finalResults || {},
          reportSummary: reportContent.substring(0, 500), // Short summary for quick list views
          reportChunks: reportChunks, // Full report stored in chunks for Firestore safety
          recommendedToolId: finalResults?.recommendedToolId || 'custom_adaptation',
          toolDescription: finalResults?.toolDescription || 'Custom Assistive Adaptation',
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
