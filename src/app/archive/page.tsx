'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Folder,
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
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case 'video':
        return <VideoIcon className="w-5 h-5 text-purple-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'presentation':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
      default:
        return <FileText className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Top Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Folder className="w-6 h-6 text-emerald-500" />
                Eksplorasi Arsip GMAHK Galilea
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Struktur hierarkis: Tahun → Triwulan → Sabat → Berkas
              </p>
            </div>

            {/* Category Switcher Tabs */}
            <div className="inline-flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setCategory('documentation')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  category === 'documentation'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dokumentasi
              </button>
              <button
                onClick={() => setCategory('worship')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  category === 'worship'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                File Ibadah
              </button>
            </div>
          </div>

          {/* Year & Quarter Selectors */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-xs font-medium text-zinc-500">Tahun:</span>
            {[2026, 2027].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                  year === y
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-200 dark:text-zinc-950 font-bold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {y}
              </button>
            ))}

            <span className="text-zinc-700 mx-2">|</span>

            <span className="text-xs font-medium text-zinc-500">Triwulan:</span>
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                  quarter === q
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-200 dark:text-zinc-950 font-bold'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Triwulan {q === 1 ? 'I' : q === 2 ? 'II' : q === 3 ? 'III' : 'IV'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Sabbath Sidebar + Files Browser */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Sabbath list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Daftar Sabat
              </span>
              <span className="text-[11px] text-emerald-500 font-medium">
                {sabbaths.length} Sabat
              </span>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {sabbaths.map((sab) => {
                const isSelected = selectedSabbath === sab.date;
                return (
                  <button
                    key={sab.date}
                    onClick={() => setSelectedSabbath(sab.date)}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-medium transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-zinc-800 border border-emerald-500/50 text-white shadow-sm'
                        : 'bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-zinc-100">{sab.formattedTitle}</p>
                      <span className="text-[10px] text-zinc-500">{sab.date}</span>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content: Files in selected Sabbath */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari nama berkas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Format Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'photo', label: 'Foto' },
                  { key: 'video', label: 'Video' },
                  { key: 'pdf', label: 'PDF' },
                  { key: 'presentation', label: 'Slide' },
                  { key: 'document', label: 'Doc' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFormatFilter(f.key)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                      formatFilter === f.key
                        ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Files Grid / Empty State */}
            {loading ? (
              <div className="p-16 text-center text-zinc-500">Memuat berkas...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-zinc-900/30 border border-zinc-800/60 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-300">Belum ada berkas tersimpan</p>
                <p className="text-xs text-zinc-500">
                  Belum ada berkas yang diunggah untuk Sabat dan kategori ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => setViewerIndex(idx)}
                    className="group relative rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-600/50 overflow-hidden cursor-pointer shadow-md transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between"
                  >
                    {/* Thumbnail / Icon Container */}
                    <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {file.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="p-4">{getFormatIcon(file.fileType)}</div>
                      )}

                      {/* File format indicator badge */}
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-zinc-300 uppercase">
                        {file.fileType}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-emerald-300 transition-colors">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
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
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
          Memuat penjelajah arsip...
        </div>
      }
    >
      <ArchiveContent />
    </Suspense>
  );
}
