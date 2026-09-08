'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { FileItem, SabbathInfo } from '@/lib/types';
import MediaViewer from '@/components/MediaViewer';

export default function Home() {
  const [sabbathInfo, setSabbathInfo] = useState<SabbathInfo | null>(null);
  const [randomFiles, setRandomFiles] = useState<FileItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      
      {/* 1 & 2. HERO SECTION: GALILEA + YESUS */}
      <section className="relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden pt-20 px-6 sm:px-12">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black z-0" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay z-0 pointer-events-none" />

        {/* Central Subject - JESUS */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="relative w-full max-w-[1200px] h-[80vh] sm:h-[90vh] md:h-[100vh] opacity-90 animate-fade-in mix-blend-screen overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
            <img 
              src="/jesus-hero.jpg" 
              alt="Artistic Representation of Jesus Christ" 
              className="w-full h-full object-cover object-center filter grayscale contrast-125 brightness-90 animate-subtle-zoom"
            />
          </div>
        </div>

        {/* Typography & Floating Info */}
        <div className="relative z-20 w-full max-w-[1400px] h-full flex flex-col justify-between py-12 md:py-20 gap-20">
          
          {/* Top Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="space-y-1">
              <p className="text-[10px] md:text-xs font-mono tracking-[0.3em] text-white/50 uppercase">
                Digital Archive
              </p>
              <h2 className="text-sm md:text-base font-light tracking-widest text-white/80 uppercase">
                GMAHK Galilea
              </h2>
            </div>

            <div className="hidden md:flex flex-col items-end space-y-1 text-right">
              <p className="text-[10px] md:text-xs font-mono tracking-[0.2em] text-white/50 uppercase">
                Est. 2026
              </p>
              <Link href="/archive?category=documentation" className="text-xs md:text-sm font-light tracking-wider text-white hover:text-white/70 transition-colors flex items-center gap-2 group">
                Jelajahi Arsip
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Huge Main Typography */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between w-full mt-auto mb-10 gap-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            
            {/* Title Left */}
            <div className="flex flex-col mix-blend-difference pointer-events-none">
              <h1 className="text-[12vw] sm:text-[10vw] lg:text-[8vw] leading-[0.8] font-bold tracking-tighter uppercase text-white">
                SETIAP SABAT
              </h1>
              <h1 className="text-[12vw] sm:text-[10vw] lg:text-[8vw] leading-[0.8] font-bold tracking-tighter uppercase text-white/80 italic ml-0 lg:ml-20">
                MENYIMPAN
              </h1>
              <h1 className="text-[12vw] sm:text-[10vw] lg:text-[8vw] leading-[0.8] font-bold tracking-tighter uppercase text-white/60 ml-0 lg:ml-40">
                CERITA.
              </h1>
            </div>

            {/* Floating Sabbath Info Box (Bottom Right) */}
            <div className="w-full lg:w-auto bg-black/40 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-2xl flex flex-col gap-4 pointer-events-auto">
              <div>
                <p className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase mb-1">
                  Sabat Terdekat
                </p>
                {loadingInitial ? (
                  <div className="h-8 w-40 bg-white/10 animate-shimmer rounded" />
                ) : sabbathInfo ? (
                  <h3 className="text-xl sm:text-2xl font-light tracking-wide text-white">
                    {sabbathInfo.formattedTitle}
                  </h3>
                ) : (
                  <h3 className="text-xl sm:text-2xl font-light tracking-wide text-white/50">
                    Belum Ada Jadwal
                  </h3>
                )}
              </div>
              
              <div className="w-full h-[1px] bg-white/10 my-2" />

              <Link
                href={sabbathInfo ? `/archive?sabbath=${sabbathInfo.date}` : '/archive'}
                className="group flex items-center justify-between gap-4 text-xs font-mono tracking-widest text-white uppercase hover:text-white/70 transition-colors"
              >
                Lihat Dokumentasi
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
            
          </div>
        </div>
      </section>

      {/* 3. MOMENTS (REAL DOCUMENTATION) */}
      <section className="relative w-full py-32 px-6 sm:px-12 max-w-[1400px] mx-auto z-20">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-4">
              Momen Pelayanan
            </h2>
            <h3 className="text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
              Koleksi visual <br />
              <span className="text-white/40 italic">jemaat Galilea.</span>
            </h3>
          </div>
          <p className="text-sm text-white/50 max-w-sm leading-relaxed font-light">
            Sistem arsip yang hidup, menyimpan setiap senyum, doa, dan pujian dari Sabat ke Sabat secara permanen.
          </p>
        </div>

        {loadingInitial ? (
          <div className="w-full aspect-[21/9] bg-white/5 animate-shimmer rounded-3xl" />
        ) : randomFiles.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center border border-white/10 rounded-3xl bg-white/[0.02]">
            <h4 className="text-2xl sm:text-4xl font-light text-white mb-4">Belum ada dokumentasi.</h4>
            <p className="text-white/40 text-sm max-w-md font-light leading-relaxed mb-8">
              Simpan momen pelayanan Sabat pertama Anda agar dapat dikenang bersama oleh seluruh jemaat.
            </p>
            <Link
              href="/upload"
              className="px-8 py-3 rounded-full bg-white text-black text-xs font-mono tracking-widest uppercase hover:bg-white/80 transition-colors"
            >
              Unggah Dokumentasi
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-stretch">
            {/* Asymmetric layout depending on media count */}
            {randomFiles[0] && (
              <div 
                className={`group cursor-pointer flex flex-col ${randomFiles.length > 1 ? 'md:col-span-8' : 'md:col-span-12'}`}
                onClick={() => setSelectedFileIndex(0)}
              >
                <div className={`relative w-full overflow-hidden bg-white/5 border border-white/10 rounded-2xl ${randomFiles.length > 1 ? 'aspect-[16/10]' : 'aspect-[21/9]'}`}>
                  {randomFiles[0].thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={randomFiles[0].thumbnailUrl} alt={randomFiles[0].name} className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      {randomFiles[0].fileType === 'video' ? <VideoIcon className="w-12 h-12" /> : <ImageIcon className="w-12 h-12" />}
                    </div>
                  )}
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div>
                      <p className="text-white text-lg font-medium drop-shadow-md">{randomFiles[0].name}</p>
                      <p className="text-white/70 text-xs font-mono mt-1 drop-shadow-md">{randomFiles[0].sabbathTitle}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono tracking-widest uppercase">
                      {randomFiles[0].fileType}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {randomFiles.length > 1 && (
              <div className="md:col-span-4 flex flex-col justify-between gap-6 md:gap-10">
                {randomFiles.slice(1, 3).map((file, idx) => {
                  const actualIdx = idx + 1;
                  return (
                    <div 
                      key={file.id} 
                      className="group cursor-pointer flex flex-col h-full"
                      onClick={() => setSelectedFileIndex(actualIdx)}
                    >
                      <div className="relative w-full h-full min-h-[250px] overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
                        {file.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            {file.fileType === 'video' ? <VideoIcon className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                          </div>
                        )}
                        <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[9px] font-mono tracking-widest uppercase">
                          {file.fileType}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <p className="text-white text-sm font-medium drop-shadow-md truncate">{file.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. ARCHIVE LINKS */}
      <section className="relative w-full py-20 px-6 sm:px-12 max-w-[1400px] mx-auto z-20 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20">
          <Link href="/archive?category=documentation" className="group flex flex-col gap-6">
            <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Akses Galeri</span>
            <h4 className="text-3xl sm:text-4xl font-light text-white group-hover:text-white/60 transition-colors">
              Foto & Video
            </h4>
            <div className="w-12 h-[1px] bg-white/20 group-hover:w-full transition-all duration-700" />
          </Link>
          <Link href="/archive?category=worship" className="group flex flex-col gap-6">
            <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Akses Dokumen</span>
            <h4 className="text-3xl sm:text-4xl font-light text-white group-hover:text-white/60 transition-colors">
              Berkas Pelayanan
            </h4>
            <div className="w-12 h-[1px] bg-white/20 group-hover:w-full transition-all duration-700" />
          </Link>
        </div>
      </section>

      {/* 5. MEMORY (CLOSING STATEMENT) */}
      <section className="w-full py-32 px-6 flex flex-col items-center justify-center text-center bg-black">
        <div className="w-[1px] h-24 bg-white/20 mb-16" />
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-light tracking-wider uppercase text-white/90 leading-tight">
          Sebuah museum digital <br />
          <span className="text-white/40 italic">kehidupan jemaat.</span>
        </h2>
        <p className="text-xs font-mono tracking-[0.4em] text-white/30 uppercase mt-16">
          GMAHK Galilea
        </p>
      </section>

      {selectedFileIndex !== null && randomFiles[selectedFileIndex] && (
        <MediaViewer
          file={randomFiles[selectedFileIndex]}
          onClose={() => setSelectedFileIndex(null)}
          onNext={selectedFileIndex < randomFiles.length - 1 ? () => setSelectedFileIndex(selectedFileIndex + 1) : undefined}
          onPrev={selectedFileIndex > 0 ? () => setSelectedFileIndex(selectedFileIndex - 1) : undefined}
        />
      )}
    </div>
  );
}
