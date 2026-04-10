import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    let serviceAccount;
    try {
      // Handle the case where the env var might be wrapped in extra quotes
      let rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
      if (rawJson.startsWith("'") && rawJson.endsWith("'")) {
        rawJson = rawJson.slice(1, -1);
      }
      serviceAccount = JSON.parse(rawJson);
    } catch (parseError) {
      console.error("[firebaseAdmin] Fatal: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON string.");
      console.error("[firebaseAdmin] Error details:", parseError.message);
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format.");
    }

    // Robust private key cleaning logic
    if (serviceAccount.private_key) {
      // 1. Remove outer quotes if present
      let pk = serviceAccount.private_key.trim();
      if (pk.startsWith('"') && pk.endsWith('"')) {
        pk = pk.slice(1, -1);
      }

      // 2. Fix escaping: literal \n or double-escaped \\n strings to real newlines
      // We use a regex that handles both backslash+n and real newlines
      pk = pk.replace(/\\n/gm, '\n');
      
      // 3. Ensure BEGIN/END tags are on their own lines
      if (!pk.startsWith('-----BEGIN PRIVATE KEY-----')) {
        pk = `-----BEGIN PRIVATE KEY-----\n${pk}`;
      }
      if (!pk.endsWith('-----END PRIVATE KEY-----') && !pk.includes('-----END PRIVATE KEY-----')) {
        pk = `${pk}\n-----END PRIVATE KEY-----\n`;
      }

      serviceAccount.private_key = pk;
    }

    console.log('[firebaseAdmin] Initializing Firebase Admin SDK:', {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      hasPrivateKey: !!serviceAccount.private_key,
      keyLength: serviceAccount.private_key?.length,
    });

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });

    console.log('[firebaseAdmin] Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error("[firebaseAdmin] Initialization Error:", error.message || error);
  }
}

// Initializing services with safety checks
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;

if (adminDb) {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    console.warn("[firebaseAdmin] Could not set ignoreUndefinedProperties:", e.message);
  }
}

export default admin;
