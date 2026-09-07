'use client';

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-stone-200 bg-stone-50 text-stone-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-center sm:text-left">
            &copy; {currentYear} Kevin Simatupang
          </p>
          <p className="text-center sm:text-right font-medium text-stone-600">
            Dokumentasi Digital GMAHK Galilea
          </p>
        </div>
      </div>
    </footer>
  );
}
