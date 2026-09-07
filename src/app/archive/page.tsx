'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Presentation,
  FileSpreadsheet,
  ChevronRight,
  Search,
} from 'lucide-react';
import { ArchiveCategory, FileFormatType, FileItem, SabbathInfo } from '@/lib/types';
import MediaViewer from '@/components/MediaViewer';

function ArchiveContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as ArchiveCategory) || 'documentation';
  const initialSabbath = searchParams.get('sabbath') || '';

  const [year, setYear] = useState<number>(2026);
  const [quarter, setQuarter] = useState<number>(3);
  const [category, setCategory] = useState<ArchiveCategory>(initialCategory);
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [sabbaths, setSabbaths] = useState<SabbathInfo[]>([]);
  const [selectedSabbath, setSelectedSabbath] = useState<string>(initialSabbath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

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
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [year, quarter, category, selectedSabbath]);

  // Filter files based on format and search query
  const filteredFiles = files.filter((file) => {
    const matchFormat = formatFilter === 'all' || file.fileType === formatFilter;
    const matchSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFormat && matchSearch;
  });

  const getFormatIcon = (type: FileFormatType) => {
    switch (type) {
      case 'photo':
        return <ImageIcon className="w-5 h-5 text-green-600" />;
      case 'video':
        return <VideoIcon className="w-5 h-5 text-purple-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'presentation':
        return <Presentation className="w-5 h-5 text-amber-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-stone-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 selection:bg-[#4A7729] selection:text-white pb-32">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* 1. EDITORIAL ARCHIVE HEADER */}
        <section className="pt-16 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-6">
            <div>
              <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
                Arsip Pelayanan
              </span>
              <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-stone-950 mt-1">
                {category === 'documentation' ? 'Dokumentasi' : 'Berkas Ibadah'}
              </h1>
            </div>

            {/* Category Toggle - Clean Segmented Control */}
            <div className="inline-flex p-1 rounded-full bg-stone-100/80 border border-stone-200/60 self-start sm:self-auto">
              <button
                onClick={() => {
                  setCategory('documentation');
                  setFormatFilter('all');
                }}
                className={`px-5 py-2 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                  category === 'documentation'
                    ? 'bg-white text-stone-950 font-medium shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 font-normal'
                }`}
              >
                Dokumentasi
              </button>
              <button
                onClick={() => {
                  setCategory('worship');
                  setFormatFilter('all');
                }}
                className={`px-5 py-2 rounded-full text-xs tracking-tight transition-all cursor-pointer ${
                  category === 'worship'
                    ? 'bg-white text-stone-950 font-medium shadow-sm'
                    : 'text-stone-500 hover:text-stone-900 font-normal'
                }`}
              >
                Berkas Ibadah
              </button>
            </div>
          </div>

          {/* Time Context & Inline Year / Quarter Selectors */}
          <div className="flex flex-wrap items-center gap-6 pt-8 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="font-normal text-stone-400">Tahun:</span>
              <div className="flex items-center gap-1">
                {[2026, 2027].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                      year === y
                        ? 'bg-stone-900 text-white font-medium'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-stone-300">·</span>

            <div className="flex items-center gap-2">
              <span className="font-normal text-stone-400">Triwulan:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuarter(q)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                      quarter === q
                        ? 'bg-stone-900 text-white font-medium'
                        : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    {q === 1 ? 'I' : q === 2 ? 'II' : q === 3 ? 'III' : 'IV'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HAIRLINE DIVIDER */}
        <div className="border-t border-[#EEEEEC]" />

        {/* 2. MAIN EDITORIAL CONTENT: SABBATH TIMELINE + DOMINANT MEDIA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-12">
          {/* Left Column: Sabbath Timeline / List */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEC]">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Daftar Sabat
              </span>
              <span className="text-xs text-stone-400">
                {sabbaths.length} Sabat
              </span>
            </div>

            <div className="space-y-1">
              {sabbaths.map((sab) => {
                const isSelected = selectedSabbath === sab.date;
                return (
                  <button
                    key={sab.date}
                    onClick={() => setSelectedSabbath(sab.date)}
                    className={`w-full text-left py-3.5 px-3 transition-all flex items-baseline justify-between group cursor-pointer rounded-xl ${
                      isSelected
                        ? 'border-l-2 border-[#4A7729] bg-[#F0F6EB]/60 pl-4'
                        : 'hover:bg-stone-50 text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-sm tracking-tight ${
                          isSelected ? 'font-medium text-stone-950' : 'font-normal'
                        }`}
                      >
                        {sab.formattedTitle}
                      </p>
                      {sab.isToday && (
                        <span className="inline-block text-[11px] text-[#4A7729] font-medium mt-0.5">
                          Sabat Hari Ini
                        </span>
                      )}
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected
                          ? 'text-[#4A7729] translate-x-0.5'
                          : 'text-stone-300 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dominant Media & Document Viewer */}
          <div className="md:col-span-8 space-y-8 md:pl-6">
            {/* Context bar with Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEEEEC]">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-stone-400">
                  Dokumentasi Terpilih
                </span>
                <h2 className="text-xl sm:text-2xl font-light tracking-tight text-stone-950">
                  {sabbaths.find((s) => s.date === selectedSabbath)?.formattedTitle || 'Sabat Terpilih'}
                </h2>
              </div>

              {/* Minimal Search & Filter */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Cari berkas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors w-40 sm:w-48"
                  />
                </div>

                {category === 'documentation' && (
                  <div className="flex items-center gap-1 text-xs">
                    {[
                      { key: 'all', label: 'Semua' },
                      { key: 'photo', label: 'Foto' },
                      { key: 'video', label: 'Video' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFormatFilter(f.key)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          formatFilter === f.key
                            ? 'bg-stone-900 text-white font-medium'
                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Content Display: Loading / Empty / Gallery / Document List */}
            {loading ? (
              <div className="py-24 text-center text-stone-400 text-sm">
                Memuat dokumentasi...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-24 text-center space-y-2">
                <FileText className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-sm font-medium text-stone-800">
                  Belum ada berkas untuk Sabat ini
                </p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Belum ada dokumentasi atau file ibadah yang tersimpan untuk tanggal ini.
                </p>
              </div>
            ) : category === 'documentation' ? (
              /* A. PHOTO & VIDEO VISUAL GALLERY */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {filteredFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => setViewerIndex(idx)}
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

                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase">
                        {file.fileType}
                      </div>
                    </div>

                    <div className="pt-2.5">
                      <p className="text-xs font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* B. WORSHIP CLEAN DOCUMENT LIST */
              <div className="divide-y divide-[#EEEEEC]">
                {filteredFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => setViewerIndex(idx)}
                    className="py-4 flex items-center justify-between gap-4 hover:bg-stone-50/80 px-3 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                        {getFormatIcon(file.fileType)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 group-hover:text-[#4A7729] transition-colors truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.fileType.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-stone-600 group-hover:text-stone-950 transition-colors">
                        Buka Berkas →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Universal Media Viewer Modal */}
      {viewerIndex !== null && (
        <MediaViewer
          files={filteredFiles}
          initialIndex={viewerIndex}
          isOpen={viewerIndex !== null}
          onClose={() => setViewerIndex(null)}
          onFileDeleted={(id) => {
            setFiles((prev) => prev.filter((f) => f.id !== id));
            setViewerIndex(null);
          }}
        />
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-stone-500 text-sm">
          Memuat penjelajah arsip...
        </div>
      }
    >
      <ArchiveContent />
    </Suspense>
  );
}
