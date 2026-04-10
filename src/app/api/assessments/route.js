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

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await adminDb.collection('assessments').where('userId', '==', user.uid).get();
    const assessments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(assessments);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
