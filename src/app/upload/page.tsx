'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  UploadCloud,
  Check,
  FileText,
  X,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { ArchiveCategory, SabbathInfo } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

function UploadContent() {
  const searchParams = useSearchParams();
  const querySabbath = searchParams.get('sabbath') || '';
  const queryCategory = searchParams.get('category') as ArchiveCategory | null;

  const { showToast } = useToast();
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
  const [uploadSuccessData, setUploadSuccessData] = useState<{
    path: string;
    sabbathTitle: string;
    count: number;
    sabbathDate: string;
    category: ArchiveCategory;
  } | null>(null);

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
    selectedSabbathInfo?.formattedTitle || defaultSabbath?.formattedTitle || 'Sebentar, kami sedang menyiapkannya...';
  const activeYear = selectedSabbathInfo?.year || defaultSabbath?.year || new Date().getFullYear();
  const activeQuarterTitle =
    selectedSabbathInfo?.quarterTitle || defaultSabbath?.quarterTitle || '';
  const categoryLabel = category === 'documentation' ? 'Dokumentasi' : 'Berkas Ibadah';

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
    const validFiles: File[] = [];

    newFiles.forEach((file) => {
      // Check large file warning (> 25MB)
      if (file.size > 25 * 1024 * 1024) {
        showToast({
          type: 'warning',
          message: 'Berkas ini cukup besar.',
          description: `Proses unggah "${file.name}" mungkin membutuhkan waktu sedikit lebih lama.`,
        });
      }
      validFiles.push(file);
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0 || !selectedSabbathDate) return;

    setUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('category', category);
    formData.append('sabbathDate', selectedSabbathDate);

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setUploadProgress(40);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const json = await res.json();

      if (json.success) {
        setUploadProgress(100);
        showToast({
          type: 'success',
          message: '✓ Berkas berhasil diunggah.',
          description: 'Sudah tersimpan dan siap dilihat kembali.',
        });

        setUploadSuccessData({
          path: json.data?.destination?.folderPath || destinationBreadcrumb,
          sabbathTitle: activeFormattedTitle,
          count: selectedFiles.length,
          sabbathDate: selectedSabbathDate,
          category,
        });

        setSelectedFiles([]);
      } else {
        throw new Error(json.error || 'Ada sedikit kendala.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ada sedikit kendala. Silakan coba lagi.';
      showToast({
        type: 'error',
        message: 'Ada sedikit kendala.',
        description: 'Silakan coba lagi.',
      });
      console.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-32">
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        {/* 1. EDITORIAL HEADER */}
        <div className="pt-16 sm:pt-24 pb-10">
          <span className="text-xs font-semibold tracking-widest text-black/50 uppercase">
            PORTAL PELAYANAN
          </span>
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-black mt-2">
            Unggah Berkas
          </h1>
          <p className="text-sm text-black/60 mt-3">
            Simpan foto, rekaman video, dan berkas ibadah ke arsip resmi GMAHK Galilea.
          </p>
        </div>

        {/* 2. AUTOMATIC SABBATH DESTINATION CONTEXT */}
        <div className="py-6 border-y border-black/10 mb-10 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-normal text-black/40 uppercase tracking-wider">
                Sabat Tujuan
              </p>
              <h2 className="text-xl sm:text-2xl font-normal text-black mt-0.5">
                {activeFormattedTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs font-medium text-black hover:opacity-60 transition-opacity cursor-pointer underline underline-offset-4"
            >
              {showDatePicker ? 'Tutup Pilihan' : 'Ganti tanggal'}
            </button>
          </div>

          <p className="text-xs text-black/40 font-mono">
            {destinationBreadcrumb}
          </p>

          {/* Collapsible Date Selector for older archives */}
          {showDatePicker && (
            <div className="pt-4 mt-4 border-t border-black/10 space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <span className="text-xs text-black/60 font-normal">Pilih Sabat:</span>
                <div className="flex flex-wrap gap-2">
                  {defaultSabbath && (
                    <button
                      type="button"
                      onClick={() => setSelectedSabbathDate(defaultSabbath.date)}
                      className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                        selectedSabbathDate === defaultSabbath.date
                          ? 'bg-black text-white font-medium'
                          : 'bg-black/5 text-black hover:bg-black/10'
                      }`}
                    >
                      Sabat Terdekat ({defaultSabbath.formattedTitle.split(' ').slice(0, 2).join(' ')})
                    </button>
                  )}
                  {previousSabbath && (
                    <button
                      type="button"
                      onClick={() => setSelectedSabbathDate(previousSabbath.date)}
                      className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                        selectedSabbathDate === previousSabbath.date
                          ? 'bg-black text-white font-medium'
                          : 'bg-black/5 text-black hover:bg-black/10'
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
                  className="w-full px-4 py-2.5 rounded-xl bg-black/5 border border-black/10 text-xs text-black focus:outline-none focus:border-black appearance-none cursor-pointer"
                >
                  {sabbathList.map((sab) => (
                    <option key={sab.date} value={sab.date}>
                      {sab.formattedTitle} ({sab.quarterTitle}) {sab.isToday ? '• Hari Ini' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 3. CATEGORY SELECTION (DOKUMENTASI VS BERKAS IBADAH) */}
        <div className="mb-10 space-y-3">
          <label className="text-xs font-normal text-black/50 uppercase tracking-wider block">
            Pilih Kategori Berkas
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCategory('documentation')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                category === 'documentation'
                  ? 'border-black bg-black text-white shadow-sm'
                  : 'border-black/10 bg-white hover:border-black/30 text-black'
              }`}
            >
              <ImageIcon className={`w-5 h-5 ${category === 'documentation' ? 'text-white' : 'text-black/60'}`} />
              <div>
                <p className="text-sm font-medium">Dokumentasi</p>
                <p className={`text-xs mt-0.5 ${category === 'documentation' ? 'text-white/70' : 'text-black/50'}`}>
                  Foto dan video kegiatan
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCategory('worship')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                category === 'worship'
                  ? 'border-black bg-black text-white shadow-sm'
                  : 'border-black/10 bg-white hover:border-black/30 text-black'
              }`}
            >
              <FileText className={`w-5 h-5 ${category === 'worship' ? 'text-white' : 'text-black/60'}`} />
              <div>
                <p className="text-sm font-medium">Berkas Ibadah</p>
                <p className={`text-xs mt-0.5 ${category === 'worship' ? 'text-white/70' : 'text-black/50'}`}>
                  Tata kebaktian, slide, PDF
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 4. SUCCESS BANNER (IF JUST COMPLETED) */}
        {uploadSuccessData && (
          <div className="mb-10 p-6 rounded-2xl bg-black/5 border border-black/10 animate-in fade-in duration-300">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-black">
                  Berkas berhasil diunggah. Sudah tersimpan dan siap dilihat kembali.
                </h3>
                <p className="text-xs text-black/50 font-mono mt-1 break-all">
                  {uploadSuccessData.path}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <Link
                    href={`/archive?sabbath=${uploadSuccessData.sabbathDate}&category=${uploadSuccessData.category}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-black text-white px-5 py-2.5 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <span>Lihat di Arsip</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setUploadSuccessData(null)}
                    className="text-xs font-medium text-black/60 hover:text-black px-4 py-2.5 transition-colors cursor-pointer"
                  >
                    Unggah Berkas Lain
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. DROPZONE & FILE PICKER */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-black bg-black/5'
              : 'border-black/15 hover:border-black/35 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            accept={
              category === 'documentation'
                ? 'image/*,video/*'
                : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*'
            }
          />

          <div className="flex justify-center mb-4 text-black/40">
            <UploadCloud className="w-10 h-10" />
          </div>

          <p className="text-sm font-medium text-black">
            Pilih Berkas atau tarik berkas ke sini
          </p>
          <p className="text-xs text-black/40 mt-1">
            {category === 'documentation'
              ? 'Mendukung foto (JPG, PNG) dan video (MP4, MOV)'
              : 'Mendukung PDF, presentasi PowerPoint, Word, dan slide ibadah'}
          </p>
        </div>

        {/* 6. SELECTED FILES LIST */}
        {selectedFiles.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-normal text-black/50 uppercase tracking-wider">
                Berkas Terpilih ({selectedFiles.length})
              </span>
              <button
                type="button"
                onClick={() => setSelectedFiles([])}
                className="text-xs text-black/50 hover:text-black transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>

            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-black/10 bg-black/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center text-black/60 shrink-0">
                      {category === 'documentation' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-black truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-black/40 mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1.5 text-black/40 hover:text-black transition-colors rounded-full"
                    aria-label="Hapus file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="pt-4 space-y-2">
                <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-black/60 text-center">
                  Sebentar, kami sedang menyiapkannya...
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={handleStartUpload}
                className="w-full sm:w-auto inline-flex items-center justify-center bg-black hover:bg-black/80 disabled:opacity-50 text-white rounded-full px-8 py-3 text-xs font-medium transition-all shadow-sm cursor-pointer"
              >
                {uploading ? 'Mengunggah...' : `Mulai Unggah (${selectedFiles.length} Berkas)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white text-black flex items-center justify-center">
          <p className="text-xs text-black/50">Sebentar, kami sedang menyiapkannya...</p>
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
