'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Calendar,
  Image as ImageIcon,
  FolderUp,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FolderCheck,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { ArchiveCategory, SabbathInfo } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

function UploadContent() {
  const searchParams = useSearchParams();
  const querySabbath = searchParams.get('sabbath') || '';
  const queryCategory = searchParams.get('category') as ArchiveCategory | null;

  const { role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ArchiveCategory>(queryCategory || 'documentation');
  const [sabbathList, setSabbathList] = useState<SabbathInfo[]>([]);
  const [defaultSabbath, setDefaultSabbath] = useState<SabbathInfo | null>(null);
  const [previousSabbath, setPreviousSabbath] = useState<SabbathInfo | null>(null);
  const [selectedSabbathDate, setSelectedSabbathDate] = useState<string>(querySabbath);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadSuccessData, setUploadSuccessData] = useState<{
    path: string;
    sabbathTitle: string;
    count: number;
    sabbathDate: string;
    category: ArchiveCategory;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Sabbath destination from server (WITA calculation)
  useEffect(() => {
    let isMounted = true;
    fetch('/api/sabbath')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted || !json.success) return;

        const defaultSab: SabbathInfo = json.data.defaultUpload || json.data.nextSabbath;
        const prevSab: SabbathInfo = json.data.previousSabbath;
        const allQuarterSabs: SabbathInfo[] = json.data.quarter?.sabbaths || [];

        setDefaultSabbath(defaultSab);
        setPreviousSabbath(prevSab);
        setSabbathList(allQuarterSabs);

        // If no query param was given, automatically default to nearest Sabbath
        if (!querySabbath) {
          setSelectedSabbathDate(defaultSab.date);
        }
      })
      .catch((err) => {
        console.error('Failed to load Sabbath destination:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [querySabbath]);

  // Derived selected Sabbath information
  const selectedSabbathInfo =
    sabbathList.find((s) => s.date === selectedSabbathDate) ||
    (defaultSabbath?.date === selectedSabbathDate ? defaultSabbath : null) ||
    (previousSabbath?.date === selectedSabbathDate ? previousSabbath : null);

  const activeFormattedTitle =
    selectedSabbathInfo?.formattedTitle || defaultSabbath?.formattedTitle || '12 September 2026';
  const activeYear = selectedSabbathInfo?.year || defaultSabbath?.year || 2026;
  const activeQuarterTitle =
    selectedSabbathInfo?.quarterTitle || defaultSabbath?.quarterTitle || 'Triwulan III';
  const categoryLabel = category === 'documentation' ? 'Dokumentasi' : 'File Ibadah';

  const destinationBreadcrumb = `GMAHK Galilea / ${categoryLabel} / ${activeYear} / ${activeQuarterTitle} / ${activeFormattedTitle}`;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage('Pilih minimal satu berkas untuk diunggah.');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setUploadStatusText('Menghubungkan ke folder Sabat...');
    setErrorMessage('');
    setUploadSuccessData(null);

    try {
      const formData = new FormData();
      formData.append('category', category);
      if (selectedSabbathDate) {
        formData.append('sabbathDate', selectedSabbathDate);
      }

      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      setUploadProgress(40);
      setUploadStatusText(`Mengunggah ${selectedFiles.length} berkas ke Google Drive...`);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-dev-role': role,
        },
        body: formData,
      });

      setUploadProgress(85);
      setUploadStatusText('Menyimpan metadata dan mengindeks ke Firestore...');

      const json = await res.json();
      if (json.success) {
        setUploadProgress(100);
        setUploadSuccessData({
          path: json.destination?.path || destinationBreadcrumb,
          sabbathTitle: json.destination?.sabbathTitle || activeFormattedTitle,
          count: selectedFiles.length,
          sabbathDate: json.destination?.sabbathDate || selectedSabbathDate,
          category,
        });
        setSelectedFiles([]);
      } else {
        setErrorMessage(json.error || 'Terjadi kesalahan saat mengunggah.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage('Gagal menghubungi server untuk proses upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 mb-1">
            <FolderUp className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Unggah Berkas Pelayanan
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Sistem otomatis menempatkan berkas ke folder Sabat terdekat di Google Drive jemaat.
          </p>
        </div>

        {/* 1. HERO BANNER: Active Destination Display (Requirements 1, 2, 4, 5, 6) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/50 border border-emerald-900/40 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[11px] font-semibold text-emerald-400">
                <FolderCheck className="w-3.5 h-3.5" />
                Folder Tujuan Otomatis
              </div>
              <p className="text-xs font-medium text-zinc-400">Upload untuk Sabat</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {activeFormattedTitle}
              </h2>
              {/* Breadcrumb Path Preview */}
              <p className="text-[11px] sm:text-xs font-mono text-emerald-400/90 flex items-center gap-1 overflow-x-auto whitespace-nowrap pt-1">
                <span>{destinationBreadcrumb}</span>
              </p>
            </div>

            {/* Toggle "Ganti tanggal / Pilih arsip lain" (Requirement 6) */}
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-medium text-zinc-200 hover:text-white border border-zinc-700/60 transition-all shrink-0 self-start sm:self-center cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showDatePicker ? 'Tutup Pilihan' : 'Ganti tanggal'}</span>
              {showDatePicker ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Collapsible Destination Selector */}
          {showDatePicker && (
            <div className="mt-5 pt-5 border-t border-zinc-800/80 space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-300">Pilih Cepat:</p>
                <div className="flex flex-wrap gap-2">
                  {defaultSabbath && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSabbathDate(defaultSabbath.date);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        selectedSabbathDate === defaultSabbath.date
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sabat Terdekat ({defaultSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                    </button>
                  )}
                  {previousSabbath && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSabbathDate(previousSabbath.date);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        selectedSabbathDate === previousSabbath.date
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Sabat Lalu ({previousSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Atau Pilih Sabat Lain dalam Triwulan:
                </label>
                <div className="relative">
                  <select
                    value={selectedSabbathDate}
                    onChange={(e) => {
                      setSelectedSabbathDate(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 appearance-none font-medium cursor-pointer"
                  >
                    {sabbathList.map((sab) => (
                      <option key={sab.date} value={sab.date}>
                        {sab.formattedTitle} ({sab.quarterTitle}) {sab.isToday ? '• Hari Ini' : ''}
                      </option>
                    ))}
                  </select>
                  <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <p className="text-[11px] text-zinc-500">
                Folder tujuan di Google Drive akan disesuaikan secara otomatis dan dibuat jika belum
                tersedia.
              </p>
            </div>
          )}
        </div>

        {/* Upload Success Alert */}
        {uploadSuccessData && (
          <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-800/60 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-emerald-200">
                  {uploadSuccessData.count} Berkas Berhasil Diunggah!
                </h3>
                <p className="text-xs text-zinc-300">
                  Semua berkas telah disimpan di Google Drive dan terindeks di Cloud Firestore.
                </p>
                <p className="text-[11px] font-mono text-emerald-400/90 break-all pt-1">
                  📁 {uploadSuccessData.path}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/archive?sabbath=${uploadSuccessData.sabbathDate}&category=${uploadSuccessData.category}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
              >
                <span>Lihat di Penjelajah Arsip</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setUploadSuccessData(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Unggah Berkas Lain</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs sm:text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Main Upload Form */}
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* STEP 1: Category Selection */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Langkah 1: Pilih Kategori Berkas
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategory('documentation')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  category === 'documentation'
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ImageIcon className="w-6 h-6 text-emerald-400" />
                  {category === 'documentation' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                </div>
                <p className="font-bold text-sm text-white">Dokumentasi</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Foto & rekaman video kegiatan ibadah Sabat
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCategory('worship')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  category === 'worship'
                    ? 'bg-teal-950/50 border-teal-500 text-teal-300 ring-2 ring-teal-500/20 shadow-md'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-6 h-6 text-teal-400" />
                  {category === 'worship' && (
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  )}
                </div>
                <p className="font-bold text-sm text-white">File Ibadah</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tata Ibadah PDF, Slide Khotbah PPTX, Lembar Warta
                </p>
              </button>
            </div>
          </div>

          {/* STEP 2: Drag & Drop / Mobile Picker */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Langkah 2: Pilih atau Tarik Berkas
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                accept="image/*,video/*,application/pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
              />
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-900 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">
                    Ketuk untuk memilih foto, video, atau dokumen
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Atau tarik dan lepaskan berkas langsung ke area ini
                  </p>
                </div>
                <div className="inline-block px-3 py-1.5 rounded-xl bg-zinc-800/60 text-[11px] text-zinc-400 font-medium">
                  Mendukung foto kualitas asli, MP4, PDF, & Slide PPTX
                </div>
              </div>
            </div>

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold">Antrean Siap Unggah ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-[11px] text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                    >
                      <div className="truncate max-w-[80%]">
                        <p className="font-semibold text-zinc-200 truncate">{file.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'file'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Progress & Upload Action */}
          {uploading && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  {uploadStatusText}
                </span>
                <span className="font-bold text-emerald-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm sm:text-base transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses Unggahan...</span>
              </>
            ) : selectedFiles.length > 0 ? (
              <>
                <FolderUp className="w-4 h-4" />
                <span>Unggah {selectedFiles.length} Berkas ke Sabat {activeFormattedTitle}</span>
              </>
            ) : (
              <span>Pilih Berkas Terlebih Dahulu</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
          Memuat formulir unggah...
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
