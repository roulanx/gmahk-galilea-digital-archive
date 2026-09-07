'use client';

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#EEEEEC] bg-white text-stone-400">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="tracking-wide">
            &copy; {currentYear} Kevin Simatupang
          </p>
          <p className="tracking-wider text-stone-500 uppercase text-[11px] font-normal">
            Dokumentasi Digital GMAHK Galilea
          </p>
        </div>
      </div>
    </footer>
  );
}
