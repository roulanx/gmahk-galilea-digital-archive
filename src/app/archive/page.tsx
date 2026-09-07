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
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 pb-24">
      {/* Top Header */}
      <div className="border-b border-stone-200 bg-stone-50 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
                <Folder className="w-6 h-6 text-[#4A7729]" />
                {category === 'documentation' ? 'Dokumentasi' : 'Berkas Ibadah'}
              </h1>
            </div>

            {/* Category Switcher Tabs */}
            <div className="inline-flex p-1 rounded-lg bg-stone-100">
              <button
                onClick={() => setCategory('documentation')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  category === 'documentation'
                    ? 'bg-[#4A7729] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Dokumentasi
              </button>
              <button
                onClick={() => setCategory('worship')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  category === 'worship'
                    ? 'bg-[#4A7729] text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Berkas Ibadah
              </button>
            </div>
          </div>

          {/* Year & Quarter Selectors */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-xs font-medium text-stone-500">Tahun:</span>
            {[2026, 2027].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  year === y
                    ? 'bg-[#4A7729] text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:text-stone-900'
                }`}
              >
                {y}
              </button>
            ))}

            <span className="text-stone-300 mx-2">|</span>

            <span className="text-xs font-medium text-stone-500">Triwulan:</span>
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setQuarter(q)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  quarter === q
                    ? 'bg-[#4A7729] text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:text-stone-900'
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
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Daftar Sabat
              </span>
              <span className="text-[11px] text-[#4A7729] font-medium">
                {sabbaths.length} Sabat
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {sabbaths.map((sab) => {
                const isSelected = selectedSabbath === sab.date;
                return (
                  <button
                    key={sab.date}
                    onClick={() => setSelectedSabbath(sab.date)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#E8F0E0] border border-[#4A7729]'
                        : 'bg-white border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-sm text-stone-900">{sab.formattedTitle}</p>
                      <span className="text-xs text-stone-400">{sab.date}</span>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-[#4A7729]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Content: Files in selected Sabbath */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Cari nama berkas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#4A7729] focus:ring-1 focus:ring-[#4A7729]"
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                      formatFilter === f.key
                        ? 'bg-[#4A7729] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Files Grid / Empty State */}
            {loading ? (
              <div className="p-16 text-center text-stone-500">Memuat berkas...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-stone-400" />
                <p className="text-sm font-medium text-stone-800">Belum ada berkas tersimpan</p>
                <p className="text-xs text-stone-500">
                  Belum ada berkas yang diunggah untuk Sabat dan kategori ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => setViewerIndex(idx)}
                    className="group relative rounded-xl bg-white border border-stone-200 hover:border-stone-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Thumbnail / Icon Container */}
                    <div className="relative aspect-video w-full bg-stone-100 flex items-center justify-center overflow-hidden">
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
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 shadow-sm text-[10px] font-mono text-stone-600 uppercase">
                        {file.fileType}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="p-3">
                      <p className="text-xs font-medium text-stone-800 truncate group-hover:text-[#4A7729] transition-colors">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1">
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
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-stone-500 text-sm">
          Memuat penjelajah arsip...
        </div>
      }
    >
      <ArchiveContent />
    </Suspense>
  );
}
