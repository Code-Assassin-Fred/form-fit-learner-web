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
    const userDoc = await adminDb.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ onboardingComplete: false });
    }
    return NextResponse.json(userDoc.data());
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    await adminDb.collection('users').doc(user.uid).set({
      ...data,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return NextResponse.json({ status: 'success' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
