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
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const email = currentUser.email?.toLowerCase() || '';
          // Define Super Admin Email (should ideally match process.env but client-side we hardcode or fetch)
          const superAdminEmail = 'admin@gmahk-galilea.org';
          if (email === superAdminEmail || email === 'simatupangkevin9@gmail.com') {
            setRole('admin');
          } else {
            setRole('viewer');
          }
        } else {
          setRole('viewer');
        }
        setLoading(false);
      });
    } catch {
      setTimeout(() => setLoading(false), 0);
    }

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
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
