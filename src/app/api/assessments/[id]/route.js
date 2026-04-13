import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split('Bearer ')[1];
    return await adminAuth.verifyIdToken(token);
  } catch (err) {
    return null;
  }
}

export async function DELETE(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    console.log(`[DELETE ASSESSMENT] User ${user.uid} attempting to delete assessment ${id}`);
    
    const docRef = adminDb.collection('assessments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`[DELETE ASSESSMENT] Assessment ${id} not found or already deleted.`);
      // Return 200 for idempotency - if it's already gone, the goal is achieved
      return NextResponse.json({ message: 'Assessment already removed' });
    }

    if (doc.data().userId !== user.uid) {
      console.warn(`[DELETE ASSESSMENT] Forbidden: User ${user.uid} tried to delete assessment ${id} owned by ${doc.data().userId}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Since the report and 3d tool info are stored WITHIN the assessment document,
    // deleting the document removes them as well.
    await docRef.delete();
    
    console.log(`[DELETE ASSESSMENT] Assessment ${id} and associated report/tool records deleted successfully.`);
    return NextResponse.json({ message: 'Assessment and all associated records deleted successfully' });
  } catch (err) {
    console.error(`[DELETE ASSESSMENT ERROR] ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { clientFeedback } = await req.json();

  try {
    const docRef = adminDb.collection('assessments').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (doc.data().userId !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await docRef.update({ clientFeedback });
    return NextResponse.json({ message: 'Feedback updated successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
