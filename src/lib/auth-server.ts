import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from './firebase-admin';
import { UserRole } from './types';

export interface AuthSession {
  uid: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
}

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@gmahk-galilea.org';

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

  const adminAuth = await getAdminAuth();
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth is not initialized');
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email || '';
    const uid = decoded.uid;

    const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
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

/**
 * Helper to ensure the request is authorized as an admin
 */
export async function requireAdmin(req: NextRequest): Promise<{ authorized: boolean; session?: AuthSession }> {
  const session = await authenticateRequest(req);
  if (!session) {
    return { authorized: false };
  }

  if (session.role !== 'admin') {
    return { authorized: false, session };
  }

  return { authorized: true, session };
}
