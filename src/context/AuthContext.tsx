'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';
import { UserRole } from '@/lib/types';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isSuperAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'viewer',
  isSuperAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      if (auth) {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          if (currentUser) {
            const email = currentUser.email?.toLowerCase() || '';
            const isAdmin =
              email === 'admin@gmahk-galilea.org' || email === 'simatupangkevin9@gmail.com';
            setRole(isAdmin ? 'admin' : 'viewer');
          } else {
            setRole('viewer');
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error('Firebase Auth listener error:', e);
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      showToast({
        type: 'error',
        message: 'Authentication Not Configured',
        description: 'Hubungi administrator untuk konfigurasi sistem.',
      });
      return;
    }
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      console.error('Google Sign-In Error:', error);
      showToast({
        type: 'error',
        message: 'Login Google dibatalkan atau gagal.',
        description: 'Silakan coba lagi.',
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setRole('viewer');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isSuperAdmin: role === 'admin',
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
