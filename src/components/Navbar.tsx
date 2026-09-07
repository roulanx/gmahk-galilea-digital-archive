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
  const { user, role, signInWithGoogle, signOut, toggleDevRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/archive?category=documentation', label: 'Dokumentasi' },
    { href: '/archive?category=worship', label: 'Berkas Ibadah' },
    { href: '/upload', label: 'Unggah' },
    ...(role === 'admin' ? [{ href: '/admin', label: 'Admin Portal' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-stone-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/adventist-logo.svg"
              alt="GMAHK Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div className="flex flex-col">
              <span className="hidden sm:block font-semibold tracking-tight text-stone-900 text-sm">
                DOKUMENTASI DIGITAL GALILEA
              </span>
              <span className="block sm:hidden font-semibold tracking-tight text-stone-900 text-base">
                GALILEA
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const hrefPath = link.href.split('?')[0];
              const isActive = pathname === hrefPath;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#4A7729]'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Auth / Profile */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E8F0E0] text-[#4A7729] font-medium text-sm flex items-center justify-center">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium text-stone-900 truncate max-w-[120px]">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-stone-200 shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs text-stone-500">Masuk sebagai</p>
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={toggleDevRole}
                      className="w-full text-left px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 flex items-center justify-between"
                    >
                      <span>Ganti Role (Demo)</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#E8F0E0] text-[#4A7729] text-[10px] font-mono uppercase flex items-center gap-1">
                        {role === 'admin' && <Shield className="w-3 h-3" />}
                        {role}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A7729] text-[#4A7729] hover:bg-[#4A7729] hover:text-white text-sm font-medium transition-colors"
              >
                Masuk
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-4">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const hrefPath = link.href.split('?')[0];
              const isActive = pathname === hrefPath;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-base font-medium rounded-lg ${
                    isActive
                      ? 'text-[#4A7729] bg-[#E8F0E0]'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="pt-4 border-t border-stone-100">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8F0E0] text-[#4A7729] font-medium text-base flex items-center justify-center">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded bg-[#E8F0E0] text-[#4A7729] uppercase flex items-center gap-1">
                    {role === 'admin' && <Shield className="w-3 h-3" />}
                    {role}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-stone-50 text-stone-600 hover:bg-stone-100 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4A7729] text-white text-sm font-medium hover:bg-[#3D6422] transition-colors"
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
