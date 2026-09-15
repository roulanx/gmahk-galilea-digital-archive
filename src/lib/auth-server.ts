import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from './firebase-admin';
import { UserRole } from './types';

export interface AuthSession {
  uid: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

const SUPER_ADMIN_EMAILS = [
  'admin@gmahk-galilea.org',
  (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

/**
 * Verifies request authentication token and returns user session with strict server-side role check
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthSession | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return null;

  try {
    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      console.warn('[ServerAuth] Firebase Admin Auth is not initialized. Server credentials missing.');
      return null;
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase().trim();
    const uid = decoded.uid;

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email);
    let role: UserRole = isSuperAdmin ? 'admin' : 'viewer';

    // Check custom claims or Firestore role if not super admin
    if (!isSuperAdmin) {
      const db = getAdminFirestore();
      if (db) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          if (data?.role === 'admin') {
            role = 'admin';
          }
        }
      }
    }

    return {
      uid,
      email,
      role,
      isSuperAdmin,
    };
  } catch (err) {
    console.error('Error verifying auth token:', err);
    return null;
  }
}

export type RequireAdminResult =
  | { authorized: true; status: 'authorized'; session: AuthSession }
  | { authorized: false; status: 'unauthenticated'; session?: undefined }
  | { authorized: false; status: 'forbidden'; session: AuthSession };

/**
 * Helper to ensure the request is authorized as an admin
 */
export async function requireAdmin(req: NextRequest): Promise<RequireAdminResult> {
  const session = await authenticateRequest(req);
  if (!session) {
    return { authorized: false, status: 'unauthenticated' };
  }

  if (session.role !== 'admin') {
    return { authorized: false, status: 'forbidden', session };
  }

  return { authorized: true, status: 'authorized', session };
}
