'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  ChevronRight,
  Search,
} from 'lucide-react';
import { ArchiveCategory, FileItem, SabbathInfo } from '@/lib/types';
import MediaViewer from '@/components/MediaViewer';

function ArchiveContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ArchiveCategory) || 'documentation';
  const initialSabbath = searchParams.get('sabbath') || '';

  const [year, setYear] = useState<number>(2026);
  const [quarter, setQuarter] = useState<number>(3);
  const [category, setCategory] = useState<ArchiveCategory>(initialCategory);
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [sabbaths, setSabbaths] = useState<SabbathInfo[]>([]);
  const [selectedSabbath, setSelectedSabbath] = useState<string>(initialSabbath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Viewer Modal State
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const url = `/api/archive/tree?year=${year}&quarter=${quarter}&category=${category}${
      selectedSabbath ? `&sabbath=${selectedSabbath}` : ''
    }`;

    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setSabbaths(json.data.sabbaths);
          if (!selectedSabbath && json.data.selectedSabbath) {
            setSelectedSabbath(json.data.selectedSabbath);
          }
          setFiles(json.data.files);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [year, quarter, category, selectedSabbath]);

  // Filter files based on simple 4 categories
  const filteredFiles = files.filter((file) => {
    let matchType = true;
    if (filterType === 'photo') matchType = file.fileType === 'photo';
    else if (filterType === 'video') matchType = file.fileType === 'video';
    else if (filterType === 'document') {
      matchType = ['pdf', 'presentation', 'document', 'spreadsheet', 'other'].includes(file.fileType);
    }

    const matchSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const getEmptyMessage = () => {
    if (searchQuery.trim()) return 'Kami belum menemukan yang Anda cari.';
    if (filterType === 'photo') return 'Belum ada foto di sini.';
    if (filterType === 'video') return 'Belum ada video di sini.';
    if (filterType === 'document' || category === 'worship') return 'Belum ada berkas ibadah.';
    return 'Belum ada dokumentasi di sini. Dokumentasi akan muncul setelah tersedia.';
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* 1. EDITORIAL ARCHIVE HEADER */}
        <section className="pt-16 sm:pt-24 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-6">
            <div>
              <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
                RUANG DOKUMENTASI
              </span>
              <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-black mt-2">
                {category === 'documentation' ? 'Dokumentasi' : 'Berkas Ibadah'}
              </h1>
              <p className="text-sm text-black/60 mt-3">
                {category === 'documentation'
                  ? 'Koleksi rekaman visual, foto pelayanan, dan kegiatan jemaat GMAHK Galilea.'
                  : 'Tata ibadah mingguan, slide presentasi khotbah, dan berkas pelayanan jemaat.'}
              </p>
            </div>

            {/* Category Toggle Buttons */}
            <div className="flex items-center gap-2 border border-black/10 p-1 rounded-full shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setCategory('documentation');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                  category === 'documentation'
                    ? 'bg-black text-white font-medium'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                Dokumentasi
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setCategory('worship');
                }}
                className={`px-4 py-2 rounded-full text-xs transition-all cursor-pointer ${
                  category === 'worship'
                    ? 'bg-black text-white font-medium'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                Berkas Ibadah
              </button>
            </div>
          </div>
        </section>

        {/* 2. EXHIBITION HIERARCHY NAVIGATION (YEAR -> QUARTER -> SABBATH) */}
        <div className="py-6 border-y border-black/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Year & Quarter Selector */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="font-mono text-black/40">HIERARKI:</span>

            {/* Year Selector */}
            <select
              value={year}
              onChange={(e) => {
                setLoading(true);
                setYear(parseInt(e.target.value, 10));
              }}
              className="bg-black/5 border border-black/10 px-3.5 py-1.5 rounded-full text-black font-medium focus:outline-none cursor-pointer"
            >
              <option value={2026}>Tahun 2026</option>
              <option value={2025}>Tahun 2025</option>
            </select>

            <ChevronRight className="w-3.5 h-3.5 text-black/30" />

            {/* Quarter Selector */}
            <div className="flex items-center gap-1.5">
              {[
                { q: 1, label: 'Triwulan I' },
                { q: 2, label: 'Triwulan II' },
                { q: 3, label: 'Triwulan III' },
                { q: 4, label: 'Triwulan IV' },
              ].map((item) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setQuarter(item.q);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                    quarter === item.q
                      ? 'bg-black text-white font-medium'
                      : 'bg-black/5 text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dokumentasi..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-black/5 border border-black/10 rounded-full text-black placeholder-black/40 focus:outline-none focus:border-black"
            />
          </div>
        </div>

        {/* 3. SABBATH TIMELINE BAR */}
        {sabbaths.length > 0 && (
          <div className="py-4 overflow-x-auto scrollbar-none flex items-center gap-2 border-b border-black/10">
            <span className="text-[11px] font-mono text-black/40 uppercase tracking-wider pl-1 shrink-0">
              SABAT:
            </span>
            {sabbaths.map((sab) => {
              const isSelected = selectedSabbath === sab.date;
              return (
                <button
                  key={sab.date}
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setSelectedSabbath(sab.date);
                  }}
                  className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-black text-white font-medium shadow-sm'
                      : 'bg-black/[0.03] text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                >
                  {sab.formattedTitle}
                  {sab.isToday && ' • Hari Ini'}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. SIMPLE 4-TYPE FILTER */}
        <div className="pt-8 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'photo', label: 'Foto' },
                { id: 'video', label: 'Video' },
                { id: 'document', label: 'Dokumen' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                  filterType === f.id
                    ? 'border border-black text-black font-medium'
                    : 'text-black/50 hover:text-black'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-black/40">
            {loading ? 'Sebentar, kami sedang menyiapkannya...' : `${filteredFiles.length} berkas`}
          </span>
        </div>

        {/* 5. EXHIBITION GALLERY GRID */}
        {loading ? (
          <div className="py-32 text-center text-black/40 text-xs animate-pulse">
            Sebentar, kami sedang menyiapkannya...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-32 text-center text-black/40 text-sm font-normal">
            {getEmptyMessage()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredFiles.map((file, idx) => {
              return (
                <div
                  key={file.id}
                  onClick={() => setViewerIndex(idx)}
                  className="group cursor-pointer flex flex-col"
                >
                  {/* Thumbnail Frame */}
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black/5 border border-black/10">
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
                          <VideoIcon className="w-10 h-10" />
                        ) : file.fileType === 'photo' ? (
                          <ImageIcon className="w-10 h-10" />
                        ) : (
                          <FileText className="w-10 h-10" />
                        )}
                      </div>
                    )}

                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase">
                      {file.fileType}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-2.5">
                    <p className="text-xs font-medium text-black group-hover:text-black/70 transition-colors truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-black/40 mt-0.5">
                      {file.sabbathTitle || 'Arsip Pelayanan'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Cinematic Media Viewer */}
      {viewerIndex !== null && filteredFiles[viewerIndex] && (
        <MediaViewer
          file={filteredFiles[viewerIndex]}
          onClose={() => setViewerIndex(null)}
          onNext={
            viewerIndex < filteredFiles.length - 1
              ? () => setViewerIndex(viewerIndex + 1)
              : undefined
          }
          onPrev={
            viewerIndex > 0
              ? () => setViewerIndex(viewerIndex - 1)
              : undefined
          }
        />
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-black flex items-center justify-center">
          <p className="text-xs text-black/40">Sebentar, kami sedang menyiapkannya...</p>
        </div>
      }
    >
      <ArchiveContent />
    </Suspense>
  );
}
