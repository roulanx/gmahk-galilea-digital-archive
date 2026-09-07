'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  UploadCloud,
  FolderOpen,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { FileItem, SabbathInfo } from '@/lib/types';
import MediaViewer from '@/components/MediaViewer';

export default function Home() {
  const [sabbathInfo, setSabbathInfo] = useState<SabbathInfo | null>(null);
  const [randomFiles, setRandomFiles] = useState<FileItem[]>([]);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch upcoming Sabbath
    fetch('/api/sabbath')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setSabbathInfo(data.data.nextSabbath);
        }
      })
      .catch(console.error);

    // Initial random archive sample
    fetch('/api/archive/random?count=6')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setRandomFiles(data.data);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleShuffle = () => {
    setLoadingRandom(true);
    fetch('/api/archive/random?count=6')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRandomFiles(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRandom(false));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-white pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-950/20 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            GMAHK GALILEA BALIKPAPAN
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Digital Archive
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto">
            Pusat arsip dokumentasi sejarah, momen perbaktian, dan berkas pelayanan ibadah jemaat
            terstruktur rapi dalam ekosistem cloud terpercaya.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Link
              href="/archive"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-200 shadow-md hover:scale-105"
            >
              <FolderOpen className="w-4 h-4 text-emerald-700" />
              Eksplorasi Arsip
            </Link>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-medium text-sm transition-all duration-200 hover:scale-105"
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              Unggah Berkas
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THIS SABBATH SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/40 to-zinc-900/90 border border-zinc-800/80 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                <Calendar className="w-4 h-4" />
                This Sabbath
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {sabbathInfo ? sabbathInfo.formattedTitle : 'Memuat Sabat...'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                WITA (Asia/Makassar) • {sabbathInfo?.quarterTitle || 'Triwulan III'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=documentation`}
                className="px-4 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                Dokumentasi
              </Link>
              <Link
                href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=worship`}
                className="px-4 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                File Ibadah
              </Link>
              <Link
                href={`/upload?sabbath=${sabbathInfo?.date || ''}`}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <UploadCloud className="w-4 h-4" />
                Unggah ke Sabat Ini
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUICK ACCESS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-white">Quick Access</h3>
          <span className="text-xs text-zinc-500">Penyimpanan Terpisah</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Dokumentasi */}
          <Link
            href="/archive?category=documentation"
            className="group relative p-8 rounded-3xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-300 shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Dokumentasi
                </h4>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Foto dan rekaman video kegiatan Sabat, pelayanan persekutuan, ibadah syukur, dan
                  momen bersejarah gereja.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              Buka Kategori Dokumentasi
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: File Ibadah */}
          <Link
            href="/archive?category=worship"
            className="group relative p-8 rounded-3xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-300 shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-950/60 border border-teal-800/40 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                  File Ibadah
                </h4>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  Tata ibadah (PDF), slide khotbah PowerPoint, lembar warta, partitur lagu pujian,
                  dan materi sekolah Sabat.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-teal-400">
              Buka Kategori File Ibadah
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. FROM THE ARCHIVE (RANDOM SHOWCASE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              From the Archive
            </div>
            <h3 className="text-xl font-bold text-white mt-1">Koleksi Kenangan Acak</h3>
          </div>

          <button
            onClick={handleShuffle}
            disabled={loadingRandom}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin' : ''}`} />
            Acak Ulang
          </button>
        </div>

        {randomFiles.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-900/30 border border-zinc-800/60 text-zinc-500">
            Belum ada media foto/video yang diindeks.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {randomFiles.map((file, idx) => (
              <div
                key={file.id}
                onClick={() => setSelectedFileIndex(idx)}
                className="group relative aspect-square rounded-2xl bg-zinc-900 overflow-hidden border border-zinc-800/80 hover:border-emerald-700/60 cursor-pointer shadow-md transition-all duration-300 hover:scale-[1.02]"
              >
                {file.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    {file.fileType === 'video' ? (
                      <VideoIcon className="w-8 h-8" />
                    ) : (
                      <ImageIcon className="w-8 h-8" />
                    )}
                  </div>
                )}

                {/* Badge File Type */}
                <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white">
                  {file.fileType === 'video' ? (
                    <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </div>

                {/* Bottom Overlay Title */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{file.sabbathTitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. EXPLORE ARCHIVE CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900 border border-emerald-900/30 text-center space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-white">
            Jelajahi Arsip Tahun & Triwulan
          </h3>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Temukan berkas ibadah dan dokumentasi dari tahun ke tahun dengan navigasi folder Sabat
            yang terorganisir rapi.
          </p>
          <div className="pt-2">
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-transform hover:scale-105 shadow-lg shadow-emerald-900/20"
            >
              Buka Seluruh Arsip <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Universal Media Viewer Modal */}
      {selectedFileIndex !== null && (
        <MediaViewer
          files={randomFiles}
          initialIndex={selectedFileIndex}
          isOpen={selectedFileIndex !== null}
          onClose={() => setSelectedFileIndex(null)}
          onFileDeleted={(id) => {
            setRandomFiles((prev) => prev.filter((f) => f.id !== id));
            setSelectedFileIndex(null);
          }}
        />
      )}
    </div>
  );
}
