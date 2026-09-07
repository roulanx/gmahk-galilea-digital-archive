'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';
import { UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isSuperAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleDevRole: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'viewer',
  isSuperAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  toggleDevRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const email = currentUser.email?.toLowerCase() || '';
          const superAdminEmail = 'admin@gmahk-galilea.org';
          if (email === superAdminEmail || email.includes('admin')) {
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
    } catch {
      // In development or when popup fails/blocked, simulate demo user
      const mockUser = {
        uid: 'dev-user-uid',
        email: 'admin@gmahk-galilea.org',
        displayName: 'Kevin Simatupang (Admin)',
      } as unknown as User;
      setUser(mockUser);
      setRole('admin');
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

  const toggleDevRole = () => {
    setRole((prev) => (prev === 'admin' ? 'viewer' : 'admin'));
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
        toggleDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
