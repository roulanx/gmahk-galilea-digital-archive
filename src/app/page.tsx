'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  ArrowRight,
  RefreshCw,
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
    <div className="min-h-screen bg-white text-stone-900 selection:bg-[#4A7729] selection:text-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* 1. LARGE EDITORIAL HERO */}
        <section className="pt-24 pb-20 sm:pt-36 sm:pb-28 text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Image
              src="/adventist-logo.svg"
              alt="Adventist Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>

          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-stone-950 leading-[1.08]">
            Dokumentasi <br className="hidden sm:inline" />
            <span className="font-semibold">Digital Galilea</span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-500 font-normal mt-6 max-w-xl mx-auto leading-relaxed">
            Dokumentasi dan berkas pelayanan GMAHK Galilea.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-10">
            <Link
              href="/archive"
              className="inline-flex items-center justify-center bg-stone-950 hover:bg-stone-800 text-white rounded-full px-8 py-3.5 text-sm font-medium transition-all shadow-sm"
            >
              Lihat Dokumentasi
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center border border-stone-300 hover:border-stone-400 hover:bg-stone-50 text-stone-800 rounded-full px-8 py-3.5 text-sm font-medium transition-all"
            >
              Unggah Berkas
            </Link>
          </div>
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-[#EEEEEC]" />

        {/* 2. SABAT MINGGU INI (EDITORIAL, NOT A CARD) */}
        <section className="py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-baseline">
            <div className="md:col-span-4 space-y-2">
              <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
                Sabat Minggu Ini
              </span>
              <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-stone-950">
                {sabbathInfo ? sabbathInfo.formattedTitle : 'Memuat Sabat...'}
              </h2>
              <p className="text-xs text-stone-400 tracking-wide pt-1">
                WITA (Asia/Makassar) • {sabbathInfo?.quarterTitle || 'Triwulan III'}
              </p>
            </div>

            <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:pl-8 md:border-l md:border-[#EEEEEC]">
              <p className="text-sm text-stone-500 leading-relaxed max-w-md">
                Dokumentasi foto, rekaman ibadah, tata kebaktian, dan slide khotbah untuk Sabat terdekat.
              </p>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=documentation`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-950 px-4 py-2.5 rounded-full border border-stone-200 hover:border-stone-300 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                  Dokumentasi
                </Link>
                <Link
                  href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=worship`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-950 px-4 py-2.5 rounded-full border border-stone-200 hover:border-stone-300 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  Berkas Ibadah
                </Link>
                <Link
                  href={`/upload?sabbath=${sabbathInfo?.date || ''}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#4A7729] hover:bg-[#3D6422] text-white px-4 py-2.5 rounded-full transition-colors shadow-sm"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Unggah ke Sabat Ini
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-[#EEEEEC]" />

        {/* 3. VISUAL DOCUMENTATION SHOWCASE (EDITORIAL ASYMMETRIC GALLERY) */}
        <section className="py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
                Dari Dokumentasi Galilea
              </span>
              <h3 className="text-2xl sm:text-3xl font-light tracking-tight text-stone-950 mt-1">
                Koleksi Rekaman & Foto Pelayanan
              </h3>
            </div>

            <button
              onClick={handleShuffle}
              disabled={loadingRandom}
              className="inline-flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin text-[#4A7729]' : ''}`} />
              Acak Ulang
            </button>
          </div>

          {randomFiles.length === 0 ? (
            <div className="py-20 text-center text-stone-400 text-sm">
              Belum ada media foto/video yang diindeks.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Featured Large Media (Left, 7 columns) */}
              {randomFiles[0] && (
                <div
                  onClick={() => setSelectedFileIndex(0)}
                  className="md:col-span-7 group cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-100">
                    {randomFiles[0].thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={randomFiles[0].thumbnailUrl}
                        alt={randomFiles[0].name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        {randomFiles[0].fileType === 'video' ? (
                          <VideoIcon className="w-12 h-12" />
                        ) : (
                          <ImageIcon className="w-12 h-12" />
                        )}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-mono tracking-wider uppercase">
                      {randomFiles[0].fileType}
                    </div>
                  </div>

                  <div className="pt-3.5">
                    <p className="text-sm font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors truncate">
                      {randomFiles[0].name}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {randomFiles[0].sabbathTitle}
                    </p>
                  </div>
                </div>
              )}

              {/* Supporting Media Column (Right, 5 columns: 2 stacked items) */}
              <div className="md:col-span-5 flex flex-col justify-between gap-6">
                {randomFiles.slice(1, 3).map((file, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileIndex(actualIdx)}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100">
                        {file.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            {file.fileType === 'video' ? (
                              <VideoIcon className="w-8 h-8" />
                            ) : (
                              <ImageIcon className="w-8 h-8" />
                            )}
                          </div>
                        )}

                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase">
                          {file.fileType}
                        </div>
                      </div>

                      <div className="pt-2.5">
                        <p className="text-xs font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {file.sabbathTitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Additional Row for remaining 3 items if available */}
              {randomFiles.length > 3 && (
                <div className="col-span-1 md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                  {randomFiles.slice(3, 6).map((file, idx) => {
                    const actualIdx = idx + 3;
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFileIndex(actualIdx)}
                        className="group cursor-pointer flex flex-col"
                      >
                        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-stone-100">
                          {file.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.thumbnailUrl}
                              alt={file.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              {file.fileType === 'video' ? (
                                <VideoIcon className="w-8 h-8" />
                              ) : (
                                <ImageIcon className="w-8 h-8" />
                              )}
                            </div>
                          )}

                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase">
                            {file.fileType}
                          </div>
                        </div>

                        <div className="pt-2">
                          <p className="text-xs font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {file.sabbathTitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-[#EEEEEC]" />

        {/* 4. TWO SIMPLE ACCESS PATHS (EDITORIAL TWO-COLUMN) */}
        <section className="py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
            <Link
              href="/archive?category=documentation"
              className="group flex flex-col justify-between py-4"
            >
              <div>
                <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
                  Koleksi Visual
                </span>
                <h4 className="text-2xl sm:text-3xl font-light text-stone-950 mt-2 group-hover:text-[#4A7729] transition-colors">
                  Dokumentasi
                </h4>
                <p className="text-sm text-stone-500 mt-3 leading-relaxed max-w-md">
                  Foto dan rekaman video kegiatan Sabat, persekutuan doa, pelayanan sosial, dan momen bersejarah jemaat.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors">
                <span>Jelajahi Dokumentasi</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/archive?category=worship"
              className="group flex flex-col justify-between py-4 md:border-l md:border-[#EEEEEC] md:pl-12 sm:md:pl-16"
            >
              <div>
                <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
                  Arsip Pelayanan
                </span>
                <h4 className="text-2xl sm:text-3xl font-light text-stone-950 mt-2 group-hover:text-[#4A7729] transition-colors">
                  Berkas Ibadah
                </h4>
                <p className="text-sm text-stone-500 mt-3 leading-relaxed max-w-md">
                  Tata ibadah mingguan (PDF), slide presentasi khotbah, warta jemaat, partitur pujian, dan materi sekolah Sabat.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors">
                <span>Buka Berkas Ibadah</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-[#EEEEEC]" />

        {/* 5. SIMPLE QUIET CTA */}
        <section className="py-20 sm:py-28 text-center max-w-xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-light text-stone-950 tracking-tight">
            Jelajahi Seluruh Arsip
          </h3>
          <p className="text-sm text-stone-500 mt-3 leading-relaxed">
            Telusuri dokumentasi dan berkas pelayanan GMAHK Galilea terorganisir per Tahun, Triwulan, dan Sabat.
          </p>
          <div className="pt-8">
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 bg-stone-950 hover:bg-stone-800 text-white text-xs font-medium rounded-full px-7 py-3 transition-colors shadow-sm"
            >
              <span>Buka Penjelajah Arsip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>

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
