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

  try {
    const { id } = await params;
    
    // 1. Delete associated assessments
    const assessmentSnapshot = await adminDb.collection('assessments')
      .where('learnerId', '==', id)
      .where('userId', '==', user.uid)
      .get();
    
    if (!assessmentSnapshot.empty) {
      const batch = adminDb.batch();
      assessmentSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    // 2. Delete learner
    await adminDb.collection('learners').doc(id).delete();
    
    return NextResponse.json({ status: 'success' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
