'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Shield,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, signInWithGoogle, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/archive?category=documentation', label: 'Dokumentasi' },
    { href: '/archive?category=worship', label: 'Berkas Ibadah' },
    { href: '/upload', label: 'Unggah' },
    ...(role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-white/10 transition-all">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <Image
              src="/adventist-logo.svg"
              alt="GMAHK Logo"
              width={34}
              height={34}
              className="w-8 h-8 object-contain filter invert transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="hidden sm:block font-mono tracking-[0.2em] text-white/90 text-xs uppercase">
                GALILEA
              </span>
              <span className="block sm:hidden font-mono tracking-[0.2em] text-white/90 text-xs uppercase">
                GALILEA
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links - Minimalist */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10">
            {navLinks.map((link) => {
              const hrefPath = link.href.split('?')[0];
              const isActive = pathname === hrefPath;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[11px] font-mono tracking-widest uppercase transition-colors py-1 relative ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-white/50 hover:text-white font-light'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Auth / Profile */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-full hover:bg-white/5 dark:hover:bg-black/90/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-white/5  text-white  font-medium text-xs flex items-center justify-center border border-white/10 ">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-normal text-white/80  max-w-[110px] truncate hidden lg:inline">
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-black/90  border border-white/10  shadow-2xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/10 ">
                      <p className="text-[11px] text-white/40">Masuk sebagai</p>
                      <p className="text-xs font-medium text-white  truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-white/70 /70 hover:bg-white/5 dark:hover:bg-black/90/5 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="text-xs font-medium text-white  hover:opacity-70 px-4 py-2 rounded-full border border-black/15 dark:border-white/20 transition-all"
              >
                Masuk
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/80 hover:text-stone-950 transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10  bg-black/90 dark:bg-black px-6 py-6 space-y-6">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => {
              const hrefPath = link.href.split('?')[0];
              const isActive = pathname === hrefPath;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 text-base tracking-tight transition-colors ${
                    isActive
                      ? 'text-white  font-medium'
                      : 'text-white/50 hover:text-white dark:text-white/40 dark:hover:text-white font-normal'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-white/10 ">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5  text-white  font-medium text-base flex items-center justify-center">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white ">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-xs text-white/50">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-white/5  text-white  uppercase flex items-center gap-1">
                    {role === 'admin' && <Shield className="w-3 h-3" />}
                    {role}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/10  text-white/80  hover:bg-white/5 dark:hover:bg-black/90/5 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Keluar
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-black text-white hover:bg-black/85    text-xs font-medium transition-colors"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
