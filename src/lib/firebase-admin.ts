import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

export function getFirebaseAdmin(): App | null {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'gmahk-galilea-archive';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (clientEmail && privateKey && !privateKey.includes('YOUR_KEY_HERE')) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin with credentials:', err);
    }
  }

  // Fallback: Initialize with projectId only (supports verifyIdToken using public Google certificates)
  try {
    adminApp = initializeApp({ projectId });
    return adminApp;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin with projectId fallback:', err);
  }

  return null;
}

export function getAdminFirestore(): Firestore | null {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  // ONLY instantiate Firestore Admin if explicit service account credentials are provided.
  // Without credentials, @google-cloud/firestore attempts to load ADC and throws:
  // "Could not load the default credentials" in serverless environments like Vercel.
  if (!clientEmail || !privateKey || privateKey.includes('YOUR_KEY_HERE')) {
    return null;
  }

  const app = getFirebaseAdmin();
  if (app) {
    return getFirestore(app);
  }
  return null;
}

export async function getAdminAuth(): Promise<Auth | null> {
  const app = getFirebaseAdmin();
  if (app) {
    try {
      const { getAuth } = await import('firebase-admin/auth');
      return getAuth(app);
    } catch (err) {
      console.warn('Failed to load firebase-admin/auth module:', err);
      return null;
    }
  }
  return null;
}
