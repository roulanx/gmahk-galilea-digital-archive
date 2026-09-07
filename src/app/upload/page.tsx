'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Calendar,
  Image as ImageIcon,
  FolderUp,
} from 'lucide-react';
import { ArchiveCategory, SabbathInfo } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSabbath = searchParams.get('sabbath') || '';

  const { role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ArchiveCategory>('documentation');
  const [sabbathList, setSabbathList] = useState<SabbathInfo[]>([]);
  const [selectedSabbath, setSelectedSabbath] = useState<string>(preselectedSabbath);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch available upcoming and quarter Sabbaths
    fetch('/api/sabbath')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const quarterSabs: SabbathInfo[] = json.data.quarter.sabbaths;
          setSabbathList(quarterSabs);
          if (!selectedSabbath) {
            setSelectedSabbath(json.data.defaultUpload.date);
          }
        }
      })
      .catch(console.error);
  }, [selectedSabbath]);

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
    setUploadProgress(20);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('sabbathDate', selectedSabbath);

      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      setUploadProgress(50);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-dev-role': role,
        },
        body: formData,
      });

      setUploadProgress(90);

      const json = await res.json();
      if (json.success) {
        setUploadProgress(100);
        setUploadSuccess(true);
        setSelectedFiles([]);
        setTimeout(() => {
          router.push(`/archive?sabbath=${selectedSabbath}&category=${category}`);
        }, 1500);
      } else {
        setErrorMessage(json.error || 'Terjadi kesalahan saat mengunggah.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Gagal menghubungi server untuk proses upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 mb-2">
            <FolderUp className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Unggah Berkas Arsip</h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Unggah foto, video, atau dokumen pelayanan ke folder Sabat yang dituju. Berkas akan
            disimpan langsung di Google Drive jemaat.
          </p>
        </div>

        {uploadSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Berkas berhasil diunggah! Mengarahkan ke halaman penjelajah arsip...
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* 1. Category Selection */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              1. Pilih Kategori Penyimpanan
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCategory('documentation')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  category === 'documentation'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-6 h-6 mb-2 text-emerald-400" />
                <p className="font-bold text-sm text-white">Dokumentasi</p>
                <p className="text-xs text-zinc-500 mt-1">Foto & rekaman video kegiatan Sabat</p>
              </button>

              <button
                type="button"
                onClick={() => setCategory('worship')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  category === 'worship'
                    ? 'bg-teal-950/40 border-teal-500 text-teal-300 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-6 h-6 mb-2 text-teal-400" />
                <p className="font-bold text-sm text-white">File Ibadah</p>
                <p className="text-xs text-zinc-500 mt-1">Tata ibadah PDF, Slide PPTX, Lembar Warta</p>
              </button>
            </div>
          </div>

          {/* 2. Target Sabbath Selection */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              2. Target Tanggal Sabat
            </label>
            <div className="relative">
              <select
                value={selectedSabbath}
                onChange={(e) => setSelectedSabbath(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 appearance-none font-medium"
              >
                {sabbathList.map((sab) => (
                  <option key={sab.date} value={sab.date}>
                    {sab.formattedTitle} ({sab.quarterTitle}) {sab.isUpcoming ? '• Mendatang' : ''}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-500">
              Secara default sistem memilih Sabat berikutnya secara otomatis sesuai aturan penanggalan
              WITA.
            </p>
          </div>

          {/* 3. Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-10 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="space-y-3">
              <UploadCloud className="w-12 h-12 mx-auto text-zinc-500" />
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Tarik dan lepaskan berkas ke sini, atau{' '}
                  <span className="text-emerald-400 hover:underline">pilih dari perangkat</span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Mendukung multi-upload: Foto (JPG, PNG, HEIC), Video (MP4, MOV), Dokumen (PDF,
                  PPTX, DOCX, XLSX)
                </p>
              </div>
            </div>
          </div>

          {/* File Queue List */}
          {selectedFiles.length > 0 && (
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Antrean Berkas ({selectedFiles.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs"
                  >
                    <div className="truncate max-w-[80%]">
                      <p className="font-semibold text-zinc-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'unknown'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-xs text-zinc-400">
                Mengunggah ke Google Drive... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40"
          >
            {uploading ? 'Memproses Berkas...' : `Mulai Unggah ${selectedFiles.length} Berkas`}
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
