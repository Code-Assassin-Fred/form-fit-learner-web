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
2. Generate a comprehensive "Inclusion & Kinematic Research Report".

REPORT DEPTH REQUIREMENT:
- This MUST be a high-fidelity research report.
- Narrative sections like "Executive Summary" and "Research-Based Barrier Analysis" MUST consist of at least 3-5 detailed paragraphs each.
- Use a professional, academic, and empathetic tone.
- CRITICAL: Do NOT provide one-paragraph summaries. Provide deep, evidence-based reasoning.

CRITICAL FORMATTING RULES:
- Use MARKDOWN for document structure.
- DO NOT use LaTeX commands like \\section, \\textbf, \\documentclass, etc.
- Use ## **Heading Name** for all major sections (ensure they are **BOLDED**).
- Use ### **Subheading Name** for subsections.
- ONLY use LaTeX for mathematical measurements, angles, or geometric notations (e.g., $45^{\circ}$, $15cm$), wrapped in single $.
- Focus heavily on the **Human Challenges**, **Kinematic Constrictions**, and how to overcome them.

The report MUST include:
1. # Inclusion & Kinematic Research Report
2. ## **Executive Summary**: A multi-paragraph overview of core findings and humanitarian impact.
3. ## **Physical Observation Table**: A Markdown table [Category, Detailed Observation, Inclusion Impact].
4. ## **Research-Based Barrier Analysis**: A deep-dive (3+ paragraphs) into why standard tools are failing, referencing kinematic constrictions.
5. ## **3D Printable Specification**: Detailed description of the proposed tool with rationale.
6. ## **Technical Specifications Table**: A Markdown table [Metric, Specification, Rationale].
7. ## **Implementation Strategy & Longitudinal Monitoring**: A multi-paragraph guide for educators.

Return a JSON object with:
"issue": Concise 1-sentence primary constraint.
"details": THE FULL MARKDOWN RESEARCH REPORT (must be long, academic, and detailed).
"recommendedToolId": A snake_case machine-friendly ID.
"toolDescription": Simple name for the assistive tool (MAX 5 words).
"category": One of: 'grip', 'posture', 'stability', 'accessibility'.`;

        const solutionsResult = await model.generateContent(solutionsPrompt);
        const solutionsText = await solutionsResult.response.text();
        const cleanJsonTxt = solutionsText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let finalResults;
        try {
          finalResults = JSON.parse(cleanJsonTxt);
        } catch (e) {
          finalResults = {
            issue: 'Inclusive Assessment',
            details: solutionsText,
            recommendedToolId: 'custom_adaptation',
            toolDescription: 'Custom Adaptation',
            category: 'accessibility'
          };
        }

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
          reportSummary: finalResults?.details || 'Analysis completed with no detailed report.',
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
