import admin from "firebase-admin";

// Initialize once per server process
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle both formats: literal \n from unquoted env values, and \\n from some env parsers
  let rawKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  // Remove outer quotes if present
  if (rawKey?.startsWith('"') && rawKey?.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }

  const privateKey = rawKey?.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${projectId}.appspot.com`;

  const missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');

  if (missingVars.length > 0) {
    const errorMsg = `Missing Firebase Admin credentials: ${missingVars.join(', ')}. Please check your .env.local file.`;
    console.error(`[firebaseAdmin] Fatal Error: ${errorMsg}`);
    // We don't throw here to avoid crashing the whole server if other parts don't need Firebase
  } else {
    try {
      console.log('[firebaseAdmin] Initializing Firebase Admin SDK:', {
        projectId,
        clientEmail,
        hasPrivateKey: !!privateKey,
        keyLength: privateKey?.length,
        storageBucket,
      });

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });

      console.log('[firebaseAdmin] Firebase Admin SDK initialized successfully');
    } catch (initError) {
      console.error('[firebaseAdmin] Failed to initialize Firebase Admin SDK:', initError);
    }
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = (() => {
  if (!admin.apps.length) return null;
  const db = admin.firestore();
  try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
  return db;
})();
export const adminStorage = admin.apps.length ? admin.storage() : null;

export const FieldValue = admin.firestore.FieldValue;
export default admin;

