'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Sparkles,
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
    <div className="min-h-screen bg-[#FAFAFA] pb-16 text-stone-900 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        {/* 1. HERO SECTION */}
        <section className="pt-20 pb-16 text-center space-y-6 max-w-2xl mx-auto">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/adventist-logo.svg" alt="Adventist" className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Dokumentasi Digital Galilea
          </h1>
          
          <p className="text-base text-stone-500 leading-relaxed">
            Dokumentasi dan berkas pelayanan GMAHK Galilea.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/archive"
              className="inline-flex items-center justify-center bg-[#4A7729] hover:bg-[#3D6422] text-white rounded-full px-6 py-3 text-sm font-medium transition-colors"
            >
              Lihat Dokumentasi
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-full px-6 py-3 text-sm font-medium transition-colors"
            >
              Unggah Berkas
            </Link>
          </div>
        </section>

        {/* 2. THIS SABBATH SPOTLIGHT */}
        <section className="mb-12">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-stone-500 font-medium">
                  <Calendar className="w-4 h-4" />
                  Sabat Terdekat
                </div>
                <h2 className="text-xl font-semibold text-stone-900">
                  {sabbathInfo ? sabbathInfo.formattedTitle : 'Memuat Sabat...'}
                </h2>
                <p className="text-xs text-stone-400">
                  WITA • {sabbathInfo?.quarterTitle || 'Triwulan III'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=documentation`}
                  className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg px-3 py-2 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Dokumentasi
                </Link>
                <Link
                  href={`/archive?sabbath=${sabbathInfo?.date || ''}&category=worship`}
                  className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg px-3 py-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Berkas Ibadah
                </Link>
                <Link
                  href={`/upload?sabbath=${sabbathInfo?.date || ''}`}
                  className="inline-flex items-center gap-1.5 bg-[#4A7729] hover:bg-[#3D6422] text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors shadow-sm"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Unggah ke Sabat Ini
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3. QUICK ACCESS */}
        <section className="mb-16">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Akses Cepat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/archive?category=documentation"
              className="group bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#E8F0E0] rounded-xl text-[#4A7729]">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-stone-900">Dokumentasi</h4>
                  <p className="text-sm text-stone-500 mt-1">
                    Foto dan rekaman video kegiatan Sabat, pelayanan, dan momen gereja.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-[#4A7729] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                Lihat Koleksi <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="/archive?category=worship"
              className="group bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-md hover:border-stone-300 transition-all flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#E8F0E0] rounded-xl text-[#4A7729]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-stone-900">Berkas Ibadah</h4>
                  <p className="text-sm text-stone-500 mt-1">
                    Tata ibadah, slide khotbah, warta, partitur, dan materi sekolah Sabat.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-[#4A7729] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                Lihat Berkas <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* 4. FROM THE ARCHIVE */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Sparkles className="w-5 h-5 text-[#4A7729]" />
              Dari Arsip
            </h3>
            <button
              onClick={handleShuffle}
              disabled={loadingRandom}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRandom ? 'animate-spin' : ''}`} />
              Acak
            </button>
          </div>

          {randomFiles.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-stone-200 text-stone-500 text-sm">
              Belum ada media foto/video.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {randomFiles.map((file, idx) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileIndex(idx)}
                  className="group relative bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col"
                >
                  <div className="aspect-square bg-stone-100 relative overflow-hidden">
                    {file.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        {file.fileType === 'video' ? (
                          <VideoIcon className="w-8 h-8" />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    <div className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 shadow-sm text-stone-700">
                      {file.fileType === 'video' ? (
                        <VideoIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-white">
                    <p className="text-xs font-medium text-stone-900 truncate">{file.name}</p>
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">{file.sabbathTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. EXPLORE ARCHIVE CTA */}
        <section className="bg-stone-50 border border-stone-200 rounded-2xl p-8 text-center max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold text-stone-900 mb-2">
            Jelajahi Seluruh Arsip
          </h3>
          <p className="text-sm text-stone-500 mb-6">
            Temukan seluruh berkas dan dokumentasi dari tahun ke tahun.
          </p>
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 bg-[#4A7729] hover:bg-[#3D6422] text-white text-sm font-medium rounded-full px-6 py-2.5 transition-colors"
          >
            Buka Arsip <ArrowRight className="w-4 h-4" />
          </Link>
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
