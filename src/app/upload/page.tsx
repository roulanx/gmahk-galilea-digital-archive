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
  RefreshCw,
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
    selectedSabbathInfo?.formattedTitle || defaultSabbath?.formattedTitle || 'Memuat...';
  const activeYear = selectedSabbathInfo?.year || defaultSabbath?.year || new Date().getFullYear();
  const activeQuarterTitle =
    selectedSabbathInfo?.quarterTitle || defaultSabbath?.quarterTitle || '';
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
      setUploadStatusText('Menyimpan metadata dan mengindeks...');

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
    <div className="min-h-screen bg-white text-stone-900 selection:bg-[#4A7729] selection:text-white pb-32">
      <div className="max-w-xl mx-auto px-6 pt-16 sm:pt-24">
        {/* 1. EDITORIAL TITLE */}
        <div className="space-y-3 mb-12">
          <span className="text-xs font-semibold tracking-widest text-[#4A7729] uppercase">
            Portal Pelayanan
          </span>
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-stone-950">
            Unggah Dokumentasi
          </h1>
          <p className="text-sm text-stone-500">
            Simpan foto, rekaman video, dan berkas ibadah ke arsip resmi GMAHK Galilea.
          </p>
        </div>

        {/* 2. SABBATH DESTINATION CONTEXT */}
        <div className="py-6 border-y border-[#EEEEEC] mb-10 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-normal text-stone-400 uppercase tracking-wider">
                Sabat Tujuan
              </p>
              <h2 className="text-xl sm:text-2xl font-normal text-stone-950 mt-0.5">
                {activeFormattedTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs font-medium text-[#4A7729] hover:text-[#3D6422] transition-colors cursor-pointer"
            >
              {showDatePicker ? 'Tutup Pilihan' : 'Ganti tanggal'}
            </button>
          </div>

          <p className="text-xs text-stone-400 font-mono">
            {destinationBreadcrumb}
          </p>

          {/* Collapsible Date Selector */}
          {showDatePicker && (
            <div className="pt-4 mt-4 border-t border-[#EEEEEC] space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <span className="text-xs text-stone-500 font-normal">Pilih Sabat Lain:</span>
                <div className="flex flex-wrap gap-2">
                  {defaultSabbath && (
                    <button
                      type="button"
                      onClick={() => setSelectedSabbathDate(defaultSabbath.date)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                        selectedSabbathDate === defaultSabbath.date
                          ? 'bg-stone-950 text-white font-medium'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Sabat Terdekat ({defaultSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                    </button>
                  )}
                  {previousSabbath && (
                    <button
                      type="button"
                      onClick={() => setSelectedSabbathDate(previousSabbath.date)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                        selectedSabbathDate === previousSabbath.date
                          ? 'bg-stone-950 text-white font-medium'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Sabat Lalu ({previousSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                    </button>
                  )}
                </div>
              </div>

              <div className="relative pt-1">
                <select
                  value={selectedSabbathDate}
                  onChange={(e) => setSelectedSabbathDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-stone-400 appearance-none cursor-pointer"
                >
                  {sabbathList.map((sab) => (
                    <option key={sab.date} value={sab.date}>
                      {sab.formattedTitle} ({sab.quarterTitle}) {sab.isToday ? '• Hari Ini' : ''}
                    </option>
                  ))}
                </select>
                <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {uploadSuccessData && (
          <div className="mb-10 p-6 rounded-2xl bg-[#F0F6EB] border border-[#4A7729]/20 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4A7729] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-medium text-sm text-stone-950">
                  {uploadSuccessData.count} Berkas Berhasil Diunggah
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Berkas telah disimpan dengan aman di Google Drive dan terindeks di arsip jemaat.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href={`/archive?sabbath=${uploadSuccessData.sabbathDate}&category=${uploadSuccessData.category}`}
                className="text-xs font-medium text-[#4A7729] hover:underline"
              >
                Lihat di Penjelajah Arsip →
              </Link>
              <button
                type="button"
                onClick={() => setUploadSuccessData(null)}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Unggah Berkas Lain
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-10 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* MAIN UPLOAD FLOW */}
        <form onSubmit={handleUploadSubmit} className="space-y-10">
          {/* STEP 1: CATEGORY SELECTION */}
          <div className="space-y-3">
            <label className="text-sm font-normal text-stone-800 block">
              Apa yang ingin Anda unggah?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCategory('documentation')}
                className={`p-5 rounded-2xl text-left transition-all cursor-pointer border ${
                  category === 'documentation'
                    ? 'border-[#4A7729] bg-[#F0F6EB] shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <ImageIcon
                    className={`w-5 h-5 ${
                      category === 'documentation' ? 'text-[#4A7729]' : 'text-stone-400'
                    }`}
                  />
                  {category === 'documentation' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A7729]" />
                  )}
                </div>
                <p className="font-medium text-sm text-stone-950">Dokumentasi</p>
                <p className="text-xs text-stone-500 mt-1 leading-normal">
                  Foto dan rekaman video kegiatan Sabat
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCategory('worship')}
                className={`p-5 rounded-2xl text-left transition-all cursor-pointer border ${
                  category === 'worship'
                    ? 'border-[#4A7729] bg-[#F0F6EB] shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <FileText
                    className={`w-5 h-5 ${
                      category === 'worship' ? 'text-[#4A7729]' : 'text-stone-400'
                    }`}
                  />
                  {category === 'worship' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A7729]" />
                  )}
                </div>
                <p className="font-medium text-sm text-stone-950">Berkas Ibadah</p>
                <p className="text-xs text-stone-500 mt-1 leading-normal">
                  Tata ibadah PDF, slide khotbah, warta jemaat
                </p>
              </button>
            </div>
          </div>

          {/* STEP 2: LARGE MINIMALIST DROPZONE */}
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 sm:p-16 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all duration-300 ${
                dragOver
                  ? 'border-[#4A7729] bg-[#F0F6EB]/50'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50'
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
              <div className="space-y-4 max-w-xs mx-auto">
                <div className="w-12 h-12 mx-auto rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 shadow-2xs">
                  <UploadCloud className="w-5 h-5 text-stone-600" />
                </div>
                <div>
                  <p className="text-sm font-normal text-stone-900">
                    Tarik file ke sini
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    atau
                  </p>
                </div>
                <div>
                  <span className="inline-block px-5 py-2 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:border-stone-300 shadow-2xs">
                    Pilih Berkas
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 pt-2">
                  Mendukung foto, video MP4, PDF, dan dokumen presentasi
                </p>
              </div>
            </div>

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                  <span className="font-medium text-stone-900">
                    {selectedFiles.length} berkas dipilih
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>

                <div className="divide-y divide-[#EEEEEC] border border-[#EEEEEC] rounded-2xl overflow-hidden bg-white">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 text-xs hover:bg-stone-50 transition-colors"
                    >
                      <div className="truncate max-w-[80%]">
                        <p className="font-medium text-stone-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 rounded-full text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        aria-label="Hapus berkas"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* UPLOAD PROGRESS */}
          {uploading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4A7729]" />
                  {uploadStatusText}
                </span>
                <span className="font-mono text-stone-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#4A7729] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* PRIMARY CTA */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="w-full py-4 rounded-full bg-stone-950 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-950 text-white font-medium text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : selectedFiles.length > 0 ? (
                <span>Unggah Sekarang</span>
              ) : (
                <span>Pilih Berkas Terlebih Dahulu</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-stone-400 text-sm">
          Memuat formulir unggah...
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
