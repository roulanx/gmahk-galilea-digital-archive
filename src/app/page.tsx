'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Video as VideoIcon,
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

    fetch('/api/sabbath')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setSabbathInfo(data.data.nextSabbath);
        }
      })
      .catch(console.error);

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
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* 1. EDITORIAL HERO SECTION */}
        <section className="pt-24 pb-20 sm:pt-36 sm:pb-28 text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-8">
            <Image
              src="/adventist-logo.svg"
              alt="GMAHK Logo"
              width={46}
              height={46}
              className="w-11 h-11 object-contain text-black"
            />
          </div>

          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-black leading-[1.08]">
            DOKUMENTASI <br className="hidden sm:inline" />
            <span className="font-semibold">DIGITAL GALILEA</span>
          </h1>

          <p className="text-lg sm:text-xl text-black/60 font-normal mt-6 max-w-xl mx-auto leading-relaxed">
            Dokumentasi dan berkas pelayanan GMAHK Galilea.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-10">
            <Link
              href="/archive"
              className="inline-flex items-center justify-center bg-black hover:bg-black/80 text-white rounded-full px-8 py-3.5 text-sm font-medium transition-all shadow-sm"
            >
              Lihat Dokumentasi
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center border border-black/20 hover:border-black/40 hover:bg-black/5 text-black rounded-full px-8 py-3.5 text-sm font-medium transition-all"
            >
              Unggah Berkas
            </Link>
          </div>

          {/* Cinematic Featured Frame (If media available) */}
          {randomFiles[0] && (
            <div className="mt-16 sm:mt-24 text-left">
              <div
                onClick={() => setSelectedFileIndex(0)}
                className="group cursor-pointer relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-black/5 border border-black/10"
              >
                {randomFiles[0].thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={randomFiles[0].thumbnailUrl}
                    alt={randomFiles[0].name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black/30">
                    {randomFiles[0].fileType === 'video' ? (
                      <VideoIcon className="w-16 h-16" />
                    ) : (
                      <ImageIcon className="w-16 h-16" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-white/70">
                    Dokumentasi Terpilih
                  </span>
                  <p className="text-lg sm:text-xl font-medium mt-1 truncate">
                    {randomFiles[0].name}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {randomFiles[0].sabbathTitle}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-black/10" />

        {/* 2. SABAT MINGGU INI (CENTERPIECE OF HOMEPAGE) */}
        <section className="py-20 sm:py-28 text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
            SABAT MINGGU INI
          </span>

          <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-black mt-3">
            {sabbathInfo ? sabbathInfo.formattedTitle : 'Sebentar, kami sedang menyiapkannya...'}
          </h2>

          <p className="text-base sm:text-lg text-black/60 mt-5 leading-relaxed font-normal">
            Setiap Sabat menyimpan cerita. Mari simpan momen pelayanan dan kebersamaan kita.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
            <Link
              href={`/archive?sabbath=${sabbathInfo?.date || ''}`}
              className="inline-flex items-center justify-center bg-black hover:bg-black/80 text-white rounded-full px-7 py-3 text-xs font-medium transition-all shadow-sm"
            >
              Lihat Dokumentasi
            </Link>
            <Link
              href={`/upload?sabbath=${sabbathInfo?.date || ''}`}
              className="inline-flex items-center justify-center border border-black/20 hover:border-black/40 hover:bg-black/5 text-black rounded-full px-7 py-3 text-xs font-medium transition-all"
            >
              Unggah Berkas
            </Link>
          </div>
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-black/10" />

        {/* 3. DARI DOKUMENTASI GALILEA (EDITORIAL ASYMMETRIC GALLERY) */}
        <section className="py-20 sm:py-28">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                DARI DOKUMENTASI GALILEA
              </span>
              <h3 className="text-2xl sm:text-4xl font-light tracking-tight text-black mt-2">
                Koleksi Rekaman & Foto Pelayanan
              </h3>
            </div>

            <button
              onClick={handleShuffle}
              disabled={loadingRandom}
              className="inline-flex items-center gap-2 text-xs font-medium text-black/60 hover:text-black transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin' : ''}`} />
              Acak Ulang
            </button>
          </div>

          {randomFiles.length === 0 ? (
            <div className="py-24 text-center text-black/40 text-sm font-normal">
              Belum ada dokumentasi di sini. Dokumentasi akan muncul setelah tersedia.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Featured Card (Left, 7 columns) */}
              {randomFiles[0] && (
                <div
                  onClick={() => setSelectedFileIndex(0)}
                  className="md:col-span-7 group cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/5 border border-black/10">
                    {randomFiles[0].thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={randomFiles[0].thumbnailUrl}
                        alt={randomFiles[0].name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-black/30">
                        {randomFiles[0].fileType === 'video' ? (
                          <VideoIcon className="w-12 h-12" />
                        ) : (
                          <ImageIcon className="w-12 h-12" />
                        )}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-mono tracking-wider uppercase">
                      {randomFiles[0].fileType}
                    </div>
                  </div>

                  <div className="pt-3.5">
                    <p className="text-sm font-medium text-black group-hover:text-black/70 transition-colors truncate">
                      {randomFiles[0].name}
                    </p>
                    <p className="text-xs text-black/50 mt-0.5">
                      {randomFiles[0].sabbathTitle}
                    </p>
                  </div>
                </div>
              )}

              {/* Supporting Column (Right, 5 columns: 2 stacked items) */}
              <div className="md:col-span-5 flex flex-col justify-between gap-6">
                {randomFiles.slice(1, 3).map((file, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileIndex(actualIdx)}
                      className="group cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/5 border border-black/10">
                        {file.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnailUrl}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-black/30">
                            {file.fileType === 'video' ? (
                              <VideoIcon className="w-8 h-8" />
                            ) : (
                              <ImageIcon className="w-8 h-8" />
                            )}
                          </div>
                        )}

                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase">
                          {file.fileType}
                        </div>
                      </div>

                      <div className="pt-2.5">
                        <p className="text-xs font-medium text-black group-hover:text-black/70 transition-colors truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-black/50 mt-0.5">
                          {file.sabbathTitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-black/10" />

        {/* 4. AKSES CEPAT (2 SIMPLE EDITORIAL SECTIONS) */}
        <section className="py-20 sm:py-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16">
            {/* Dokumentasi */}
            <Link
              href="/archive?category=documentation"
              className="group flex flex-col justify-between py-4"
            >
              <div>
                <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                  KOLEKSI VISUAL
                </span>
                <h4 className="text-2xl sm:text-3xl font-light text-black mt-2 group-hover:text-black/70 transition-colors">
                  Dokumentasi
                </h4>
                <p className="text-sm text-black/60 mt-3 leading-relaxed max-w-md">
                  Foto dan video kegiatan jemaat.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-black group-hover:translate-x-1 transition-transform">
                <span>Buka Dokumentasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Berkas Ibadah */}
            <Link
              href="/archive?category=worship"
              className="group flex flex-col justify-between py-4 md:border-l md:border-black/10 md:pl-12 sm:md:pl-16"
            >
              <div>
                <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                  ARSIP PELAYANAN
                </span>
                <h4 className="text-2xl sm:text-3xl font-light text-black mt-2 group-hover:text-black/70 transition-colors">
                  Berkas Ibadah
                </h4>
                <p className="text-sm text-black/60 mt-3 leading-relaxed max-w-md">
                  PDF, PowerPoint, Word, dan materi ibadah.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-black group-hover:translate-x-1 transition-transform">
                <span>Buka Berkas Ibadah</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </section>
      </div>

      {/* Fullscreen Cinematic Media Viewer */}
      {selectedFileIndex !== null && randomFiles[selectedFileIndex] && (
        <MediaViewer
          file={randomFiles[selectedFileIndex]}
          onClose={() => setSelectedFileIndex(null)}
          onNext={
            selectedFileIndex < randomFiles.length - 1
              ? () => setSelectedFileIndex(selectedFileIndex + 1)
              : undefined
          }
          onPrev={
            selectedFileIndex > 0
              ? () => setSelectedFileIndex(selectedFileIndex - 1)
              : undefined
          }
        />
      )}
    </div>
  );
}
