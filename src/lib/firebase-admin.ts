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

  if (clientEmail && privateKey) {
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

  return null;
}

export function getAdminFirestore(): Firestore | null {
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
