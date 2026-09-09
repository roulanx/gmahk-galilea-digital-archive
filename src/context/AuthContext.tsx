'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured, db } from '@/lib/firebase-client';
import { UserRole } from '@/lib/types';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isSuperAdmin: boolean;
  loading: boolean;
  roleLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'viewer',
  isSuperAdmin: false,
  loading: true,
  roleLoading: false,
  isConfigured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

const SUPER_ADMIN_EMAILS = [
  'simatupangkevin9@gmail.com',
  'admin@gmahk-galilea.org',
  (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState<boolean>(() => isFirebaseConfigured());
  const [roleLoading, setRoleLoading] = useState(false);
  const { showToast } = useToast();

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!auth) return;

    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      if (currentUser) {
        setRoleLoading(true);
        const email = currentUser.email?.toLowerCase().trim() || '';
        const isSuper = SUPER_ADMIN_EMAILS.includes(email);

        let resolvedRole: UserRole = isSuper ? 'admin' : 'viewer';

        // Check Firestore role if not super admin
        if (!isSuper && db) {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data?.role === 'admin') {
                resolvedRole = 'admin';
              }
            }
          } catch (err) {
            console.warn('Could not query Firestore user profile:', err);
          }
        }

        if (isMounted) {
          setRole(resolvedRole);
          setRoleLoading(false);
          setLoading(false);
        }
      } else {
        if (isMounted) {
          setRole('viewer');
          setRoleLoading(false);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !isFirebaseConfigured()) {
      console.warn('[Auth] Google Sign-In triggered but Firebase client credentials are not configured in environment variables.');
      showToast({
        type: 'error',
        message: 'Layanan Masuk Belum Siap',
        description: 'Sistem autentikasi sedang disiapkan oleh administrator. Silakan coba beberapa saat lagi.',
      });
      return;
    }

    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      showToast({
        type: 'success',
        message: 'Selamat Datang',
        description: 'Anda berhasil masuk ke sistem dokumentasi GMAHK Galilea.',
      });
    } catch (error: unknown) {
      console.error('Google Sign-In Error:', error);
      const err = error as { code?: string; message?: string };
      const code = err?.code || '';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showToast({
          type: 'info',
          message: 'Login Dibatalkan',
          description: 'Jendela masuk Google ditutup sebelum proses selesai.',
        });
      } else if (code === 'auth/network-request-failed') {
        showToast({
          type: 'error',
          message: 'Koneksi Terputus',
          description: 'Periksa koneksi internet Anda lalu coba lagi.',
        });
      } else if (code === 'auth/unauthorized-domain') {
        showToast({
          type: 'error',
          message: 'Domain Belum Diizinkan',
          description: 'Domain website ini belum didaftarkan di Firebase Authorized Domains.',
        });
      } else {
        showToast({
          type: 'error',
          message: 'Login Belum Berhasil',
          description: 'Silakan coba beberapa saat lagi atau hubungi administrator.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await fbSignOut(auth);
      showToast({
        type: 'info',
        message: 'Keluar Berhasil',
        description: 'Sesi akun Anda telah ditutup.',
      });
    } catch {
      // ignore
    }
    setUser(null);
    setRole('viewer');
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.error('Failed to get user ID token:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isSuperAdmin: role === 'admin',
        loading,
        roleLoading,
        isConfigured,
        signInWithGoogle,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
