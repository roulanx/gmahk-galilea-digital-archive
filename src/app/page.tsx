'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/sabbath').then((res) => res.json()),
      fetch('/api/archive/random?count=6').then((res) => res.json())
    ]).then(([sabbathData, randomData]) => {
      if (isMounted) {
        if (sabbathData.success) {
          setSabbathInfo(sabbathData.data.nextSabbath);
        }
        if (randomData.success) {
          setRandomFiles(randomData.data || []);
        }
        setLoadingInitial(false);
      }
    }).catch((err) => {
      console.error(err);
      if (isMounted) setLoadingInitial(false);
    });

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
          setRandomFiles(data.data || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingRandom(false));
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-20 animate-fade-in">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-32 sm:pt-40">
        
        {/* 1. HERO SECTION */}
        <header className="max-w-4xl animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light tracking-tight text-black leading-[1.1]">
            Museum digital <br className="hidden sm:block" />
            <span className="text-black/40">kehidupan jemaat.</span>
          </h1>
          <p className="mt-8 text-sm sm:text-base text-black/60 max-w-xl leading-relaxed font-normal">
            Arsip pelayanan, dokumentasi Sabat, dan memori jemaat GMAHK Galilea,
            disimpan secara permanen untuk dikenang bersama.
          </p>
        </header>

        {/* 2. SABAT MINGGU INI (EDITORIAL INTRO) */}
        <section className="mt-28 sm:mt-40 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 border-b border-black/10 pb-8">
            <div>
              <h2 className="text-xs font-semibold tracking-widest text-black/40 uppercase mb-2">
                Sabat Terdekat
              </h2>
              {loadingInitial ? (
                <div className="h-10 w-64 bg-black/5 animate-shimmer rounded"></div>
              ) : sabbathInfo ? (
                <h3 className="text-3xl sm:text-4xl font-light text-black">
                  {sabbathInfo.formattedTitle}
                </h3>
              ) : (
                <h3 className="text-3xl sm:text-4xl font-light text-black">
                  Belum ada jadwal
                </h3>
              )}
            </div>
            {sabbathInfo && (
              <Link
                href={`/archive?sabbath=${sabbathInfo.date}`}
                className="group flex items-center gap-2 text-xs font-medium text-black hover:text-black/60 transition-colors"
              >
                Lihat Dokumentasi Sabat Ini
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </section>

        {/* 3. RANDOM ARCHIVE HIGHLIGHTS */}
        <section className="mb-20 sm:mb-32 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-medium text-black/50">Sorotan Memori</h3>
            <button
              onClick={handleShuffle}
              disabled={loadingRandom || loadingInitial || randomFiles.length === 0}
              className="inline-flex items-center gap-2 text-xs font-medium text-black/60 hover:text-black transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin' : ''}`} />
              Acak Ulang
            </button>
          </div>

          {loadingInitial ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              <div className="md:col-span-7 aspect-[16/10] bg-black/5 animate-shimmer rounded-2xl"></div>
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="aspect-[16/9] bg-black/5 animate-shimmer rounded-2xl"></div>
                <div className="aspect-[16/9] bg-black/5 animate-shimmer rounded-2xl"></div>
              </div>
            </div>
          ) : randomFiles.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-black/40 text-sm font-normal">
                Belum ada dokumentasi di sini.
              </p>
              <p className="text-black/40 text-sm font-normal mt-1">
                Simpan foto dan video pelayanan Sabat ini agar bisa dikenang bersama.
              </p>
              <Link
                href="/upload"
                className="mt-6 inline-flex items-center gap-2 text-xs font-medium bg-black text-white px-5 py-2.5 rounded-full hover:bg-black/80 transition-colors"
              >
                Unggah Dokumentasi
              </Link>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch transition-opacity duration-500 ${loadingRandom ? 'opacity-50' : 'opacity-100'}`}>
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
              {randomFiles.length > 1 && (
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
              )}
            </div>
          )}
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-black/10" />

        {/* 4. AKSES CEPAT (2 SIMPLE EDITORIAL SECTIONS) */}
        <section className="py-20 sm:py-28 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
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
