import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch (err) {
    console.error('Auth verification failed:', err.message);
    return null;
  }
}

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await adminDb.collection('clients').where('userId', '==', user.uid).get();
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(clients);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, age, disabilityInfo } = await req.json();
    if (!name || age === undefined) {
      return NextResponse.json({ error: 'Name and age are required' }, { status: 400 });
    }

    const clientRef = adminDb.collection('clients').doc();
    const newClient = {
      id: clientRef.id,
      userId: user.uid,
      name: String(name),
      age: parseInt(age),
      disabilityInfo: disabilityInfo || 'Not specified',
      createdAt: new Date().toISOString(),
    };

    await clientRef.set(newClient);
    return NextResponse.json({ status: 'success', clientId: clientRef.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
