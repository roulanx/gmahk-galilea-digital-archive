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
  ChevronDown,
  ChevronUp,
  ArrowRight,
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
    <div className="min-h-screen bg-[#FAFAFA] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page Title Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Unggah Berkas
          </h1>
          <p className="text-sm text-stone-500">
            Pilih berkas untuk diunggah ke folder Sabat.
          </p>
        </div>

        <div className="space-y-6">
          {/* HERO BANNER: Active Destination Display */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-stone-500">Upload untuk Sabat</p>
                <h2 className="text-xl font-semibold text-stone-900">
                  {activeFormattedTitle}
                </h2>
                <p className="text-xs text-[#4A7729] font-mono mt-1 flex items-center overflow-x-auto whitespace-nowrap">
                  {destinationBreadcrumb}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-600 transition-all shrink-0 self-start sm:self-center cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{showDatePicker ? 'Tutup Pilihan' : 'Ganti tanggal'}</span>
                {showDatePicker ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showDatePicker && (
              <div className="mt-4 pt-4 border-t border-stone-200 space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-500">Pilih Cepat:</p>
                  <div className="flex flex-wrap gap-2">
                    {defaultSabbath && (
                      <button
                        type="button"
                        onClick={() => setSelectedSabbathDate(defaultSabbath.date)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          selectedSabbathDate === defaultSabbath.date
                            ? 'bg-[#4A7729] border-[#4A7729] text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Sabat Terdekat ({defaultSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                      </button>
                    )}
                    {previousSabbath && (
                      <button
                        type="button"
                        onClick={() => setSelectedSabbathDate(previousSabbath.date)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          selectedSabbathDate === previousSabbath.date
                            ? 'bg-[#4A7729] border-[#4A7729] text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Sabat Lalu ({previousSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-500 block">
                    Atau Pilih Sabat Lain:
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSabbathDate}
                      onChange={(e) => setSelectedSabbathDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-700 focus:outline-none focus:border-[#4A7729] appearance-none font-medium cursor-pointer"
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
              </div>
            )}
          </div>

          {/* Upload Success Alert */}
          {uploadSuccessData && (
            <div className="p-5 rounded-2xl bg-[#E8F0E0] border border-[#4A7729]/20 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#4A7729] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-stone-900">
                    {uploadSuccessData.count} Berkas Berhasil Diunggah!
                  </h3>
                  <p className="text-xs text-stone-600">
                    Semua berkas telah disimpan di Google Drive.
                  </p>
                  <p className="text-[11px] font-mono text-[#4A7729] break-all pt-1">
                    📁 {uploadSuccessData.path}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href={`/archive?sabbath=${uploadSuccessData.sabbathDate}&category=${uploadSuccessData.category}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A7729] hover:bg-[#3D6422] text-white text-xs font-semibold transition-all"
                >
                  <span>Lihat di Arsip</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setUploadSuccessData(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Unggah Lagi</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {/* STEP 1: Category Selection */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
              <label className="text-sm font-medium text-stone-700 block">
                Kategori
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('documentation')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    category === 'documentation'
                      ? 'border-[#4A7729] bg-[#E8F0E0] ring-1 ring-[#4A7729]/20'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <ImageIcon className={`w-5 h-5 ${category === 'documentation' ? 'text-[#4A7729]' : 'text-stone-400'}`} />
                    {category === 'documentation' && (
                      <CheckCircle2 className="w-4 h-4 text-[#4A7729]" />
                    )}
                  </div>
                  <p className={`font-semibold text-sm ${category === 'documentation' ? 'text-stone-900' : 'text-stone-700'}`}>
                    Dokumentasi
                  </p>
                  <p className={`text-[11px] mt-1 ${category === 'documentation' ? 'text-[#4A7729]/80' : 'text-stone-500'}`}>
                    Foto & rekaman video kegiatan ibadah Sabat
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('worship')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    category === 'worship'
                      ? 'border-[#4A7729] bg-[#E8F0E0] ring-1 ring-[#4A7729]/20'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileText className={`w-5 h-5 ${category === 'worship' ? 'text-[#4A7729]' : 'text-stone-400'}`} />
                    {category === 'worship' && (
                      <CheckCircle2 className="w-4 h-4 text-[#4A7729]" />
                    )}
                  </div>
                  <p className={`font-semibold text-sm ${category === 'worship' ? 'text-stone-900' : 'text-stone-700'}`}>
                    File Ibadah
                  </p>
                  <p className={`text-[11px] mt-1 ${category === 'worship' ? 'text-[#4A7729]/80' : 'text-stone-500'}`}>
                    Tata Ibadah PDF, Slide Khotbah PPTX, Lembar Warta
                  </p>
                </button>
              </div>
            </div>

            {/* STEP 2: Drag & Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 rounded-2xl bg-white border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-[#4A7729] bg-[#E8F0E0]/50'
                  : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50/50'
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
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${dragOver ? 'bg-[#E8F0E0] text-[#4A7729]' : 'bg-stone-100 text-stone-400'}`}>
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    Ketuk untuk memilih berkas
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Atau tarik dan lepaskan berkas ke area ini
                  </p>
                </div>
                <div className="inline-block px-3 py-1.5 rounded-lg bg-stone-100 text-[11px] text-stone-500 font-medium">
                  Mendukung foto, MP4, PDF, & Slide PPTX
                </div>
              </div>
            </div>

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                  <span className="font-semibold text-stone-700">Antrean Berkas ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                    >
                      <div className="truncate max-w-[80%]">
                        <p className="font-semibold text-stone-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-stone-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-200 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Progress & Upload Action */}
            {uploading && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-medium flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4A7729]" />
                    {uploadStatusText}
                  </span>
                  <span className="font-bold text-[#4A7729]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#4A7729] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="w-full py-3.5 px-6 rounded-xl bg-[#4A7729] hover:bg-[#3D6422] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : selectedFiles.length > 0 ? (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Unggah {selectedFiles.length} Berkas</span>
                </>
              ) : (
                <span>Pilih Berkas Terlebih Dahulu</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-stone-500 text-sm">
          Memuat formulir unggah...
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
