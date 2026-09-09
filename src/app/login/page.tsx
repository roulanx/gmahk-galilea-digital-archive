'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { user, role, isSuperAdmin, loading, roleLoading, signInWithGoogle, signOut, isConfigured } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col justify-center items-center px-6 py-24 animate-fade-in">
      <div className="max-w-xl w-full text-center">
        <span className="editorial-eyebrow">AUTENTIKASI RESMI</span>

        {loading || roleLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-6">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="font-mono text-xs tracking-widest text-white/50 uppercase">
              MEMERIKSA STATUS AKUN...
            </p>
          </div>
        ) : user ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 sm:p-14 animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <span className="editorial-meta mb-2 block">STATUS AKSES ANDA</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white mb-2 truncate">
              {user.displayName || user.email}
            </h1>
            <p className="text-sm font-mono text-white/50 mb-8 truncate">
              {user.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono tracking-widest uppercase mb-10">
              {isSuperAdmin ? <Shield className="w-3.5 h-3.5" /> : null}
              ROLE: {isSuperAdmin ? 'SUPER ADMIN' : role.toUpperCase()}
            </div>

            <div className="flex flex-col gap-3">
              {role === 'admin' ? (
                <Link href="/admin" className="editorial-button w-full">
                  BUKA PANEL ADMIN <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href="/archive" className="editorial-button w-full">
                  JELAJAHI DOKUMENTASI <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link href="/" className="editorial-button-secondary w-full">
                KEMBALI KE BERANDA
              </Link>
              <button
                onClick={signOut}
                className="w-full py-3 text-xs font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <LogOut className="w-3.5 h-3.5" /> KELUAR DARI AKUN
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="editorial-title uppercase">
              MASUK KE<br />GALILEA
            </h1>
            <p className="editorial-desc mx-auto">
              Gunakan akun Google Anda untuk mengakses dokumentasi dan berkas pelayanan resmi GMAHK Galilea.
            </p>

            <div className="pt-6 flex flex-col items-center gap-4">
              <button
                onClick={signInWithGoogle}
                className="editorial-button w-full sm:w-auto px-10 py-5 text-sm"
              >
                MASUK DENGAN GOOGLE
              </button>

              <Link
                href="/"
                className="text-xs font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors mt-4"
              >
                KEMBALI KE BERANDA
              </Link>
            </div>

            {!isConfigured && (
              <div className="mt-12 p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-left">
                <p className="font-mono text-[11px] tracking-wider text-white/60 uppercase mb-2">
                  Catatan Pengaturan:
                </p>
                <p className="text-xs font-light text-white/40 leading-relaxed">
                  Autentikasi Firebase memerlukan variabel lingkungan klien (API Key & Project ID). Pastikan konfigurasi telah dimasukkan ke Vercel Production Settings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
