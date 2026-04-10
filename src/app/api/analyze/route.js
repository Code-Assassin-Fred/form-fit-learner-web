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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step, progress, message) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', step, progress, message })}\n\n`));
      };

      try {
        sendProgress('init', 10, 'Initializing AI agents...');

        // AGENT 1: Observation Agent
        sendProgress('observing', 25, 'Agent 1: Observing student challenges...');
        const observerPrompt = `You are a Specialist Observation Agent for Assistive Technology and Physical Inclusion.
Identify and describe the learner's specific physical inabilities, constrictions, and interaction barriers in this ${mediaType}.
Focus on: Physical inabilities, limited range of motion, tremors, and difficulties in tasks like writing or gripping.`;

        const observerResult = await model.generateContent([
          observerPrompt,
          { inlineData: { data: mediaBase64, mimeType } },
        ]);
        const observations = await observerResult.response.text();

        // AGENT 2: Analysis Agent
        sendProgress('analyzing', 50, 'Agent 2: Analyzing physical inabilities & barriers...');
        const analystPrompt = `You are an Adaptive Learning & Inclusion Analysis Agent. Based on these observations: "${observations}"
Analyze where standard educational tools fail and the impact on learning endurance and dignity.`;
        const analystResult = await model.generateContent(analystPrompt);
        const analysis = await analystResult.response.text();

        // AGENT 3: Solutions Agent
        sendProgress('recommending', 75, 'Agent 3: Generating assistive recommendations...');
        const solutionsPrompt = `You are an Assistive Technology Specialist.
Observations: "${observations}"
Analysis: "${analysis}"
Task: Recommend ONE 3D printable tool and generate a Markdown report.
Return JSON with keys: "issue", "details", "recommendedToolId", "toolDescription", "category".`;

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

        // Save to Firestore
        const assessmentRef = adminDb.collection('assessments').doc();
        const newAssessment = {
          id: assessmentRef.id,
          learnerId,
          userId: user.uid,
          mediaUrl: 'https://placeholder.com/media', // In production, upload to Firebase Storage
          mediaType: mediaType || 'image',
          timestamp: new Date().toISOString(),
          analysisResults: finalResults,
          reportSummary: finalResults.details,
          recommendedToolId: finalResults.recommendedToolId,
          toolDescription: finalResults.toolDescription,
          status: 'completed'
        };

        await assessmentRef.set(newAssessment);
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', assessmentId: newAssessment.id, assessment: newAssessment })}\n\n`));
        controller.close();
      } catch (err) {
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
