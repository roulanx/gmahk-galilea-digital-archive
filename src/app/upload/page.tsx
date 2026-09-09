'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  FileText,
  Upload,
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
  const [selectedSabbathDate, setSelectedSabbathDate] = useState<string>(querySabbath);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/sabbath')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted || !json.success) return;
        const defaultSab: SabbathInfo = json.data.defaultUpload || json.data.nextSabbath;
        const allQuarterSabs: SabbathInfo[] = json.data.quarter?.sabbaths || [];
        setDefaultSabbath(defaultSab);
        setSabbathList(allQuarterSabs);
        if (!querySabbath && defaultSab) {
          setSelectedSabbathDate(defaultSab.date);
        }
      })
      .catch((err) => console.error(err));
    return () => { isMounted = false; };
  }, [querySabbath]);

  const selectedSabbathInfo = sabbathList.find((s) => s.date === selectedSabbathDate) || defaultSabbath;
  const activeFormattedTitle = selectedSabbathInfo?.formattedTitle || 'MENYIAPKAN...';

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files as FileList)]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0 || !selectedSabbathDate) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('category', category);
    formData.append('sabbathDate', selectedSabbathDate);
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setUploadSuccess(true);
      } else {
        showToast({ type: 'error', message: 'Gagal mengunggah berkas.', description: json.error || 'Terjadi kesalahan sistem.' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast({ type: 'error', message: 'Terjadi kesalahan jaringan.', description: 'Silakan periksa koneksi Anda.' });
    } finally {
      setUploading(false);
    }
  };

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-32 pt-32 px-6 flex flex-col items-center justify-center text-center animate-fade-in">
        <h1 className="editorial-title uppercase">TERSIMPAN.</h1>
        <p className="editorial-meta mt-6 mb-8">{activeFormattedTitle}</p>
        <p className="editorial-desc mb-16">
          Berkas pelayanan berhasil diunggah.<br/>
          Sudah tersimpan di arsip digital dan siap dilihat kembali.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={`/archive?category=${category}&sabbath=${selectedSabbathDate}`} className="editorial-button">
            LIHAT DOKUMENTASI
          </Link>
          <button 
            onClick={() => { setUploadSuccess(false); setSelectedFiles([]); }}
            className="editorial-button-secondary"
          >
            UNGGAH LAGI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-40">
      <div className="max-w-[1000px] mx-auto px-6 sm:px-12">
        
        {/* EDITORIAL HEADER */}
        <section className="pt-24 sm:pt-32 pb-20">
          <span className="editorial-eyebrow">PORTAL PELAYANAN</span>
          <h1 className="editorial-title uppercase">UNGGAH<br/>DOKUMENTASI</h1>
          <p className="editorial-desc mt-6">
            Simpan foto, video, dan berkas ibadah ke dalam<br/> arsip resmi jemaat Galilea.
          </p>
        </section>

        <div className="space-y-32">
          {/* STEP 01: SABBATH */}
          <section>
            <h2 className="workflow-number">01</h2>
            <h3 className="workflow-step">PILIH SABAT & KATEGORI</h3>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="editorial-meta mb-2">SABAT TUJUAN</p>
                    <h4 className="text-2xl font-light text-white uppercase">{activeFormattedTitle}</h4>
                  </div>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="text-xs font-mono tracking-widest text-white/50 hover:text-white uppercase underline underline-offset-4"
                  >
                    {showDatePicker ? 'TUTUP' : 'UBAH SABAT'}
                  </button>
                </div>

                {showDatePicker && sabbathList.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up">
                    {sabbathList.map(sab => (
                      <button
                        key={sab.date}
                        onClick={() => { setSelectedSabbathDate(sab.date); setShowDatePicker(false); }}
                        className={`text-left p-4 rounded-xl transition-all ${
                          selectedSabbathDate === sab.date 
                            ? 'bg-white text-black' 
                            : 'bg-white/5 hover:bg-white/10 text-white'
                        }`}
                      >
                        <p className={`text-[10px] font-mono tracking-widest uppercase mb-1 ${selectedSabbathDate === sab.date ? 'text-black/50' : 'text-white/40'}`}>
                          {sab.date}
                        </p>
                        <p className="text-sm font-medium">{sab.formattedTitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
                <p className="editorial-meta">KATEGORI ARSIP</p>
                <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-full">
                  <button
                    onClick={() => setCategory('documentation')}
                    className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase rounded-full transition-all ${
                      category === 'documentation' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    FOTO / VIDEO
                  </button>
                  <button
                    onClick={() => setCategory('worship')}
                    className={`flex-1 py-3 text-[10px] font-mono tracking-widest uppercase rounded-full transition-all ${
                      category === 'worship' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    BERKAS IBADAH
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 02: SELECT FILES */}
          <section>
            <h2 className="workflow-number">02</h2>
            <h3 className="workflow-step">PILIH BERKAS</h3>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`relative w-full border border-white/10 rounded-[2rem] p-12 sm:p-24 flex flex-col items-center justify-center text-center transition-all ${
                dragOver ? 'bg-white/10 border-white/30 scale-[1.01]' : 'bg-white/5 hover:bg-white/[0.07]'
              }`}
            >
              <Upload className="w-12 h-12 text-white/30 mb-8" />
              <h4 className="text-2xl sm:text-4xl font-light text-white mb-6">SERET BERKAS KE SINI</h4>
              <p className="editorial-desc mb-10 max-w-sm">
                Bisa berupa foto, rekaman video pelayanan, materi presentasi, atau PDF tata ibadah.
              </p>
              
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileInputChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="editorial-button-secondary"
              >
                PILIH BERKAS
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-8 animate-fade-in-up">
                <p className="editorial-meta mb-4">{selectedFiles.length} BERKAS DIPILIH</p>
                <div className="flex flex-col gap-3">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <FileText className="w-5 h-5 text-white/40 shrink-0" />
                        <span className="text-sm font-light text-white truncate">{f.name}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                        className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* STEP 03: UPLOAD */}
          {selectedFiles.length > 0 && (
            <section className="animate-fade-in-up">
              <h2 className="workflow-number">03</h2>
              <h3 className="workflow-step">UNGGAH</h3>
              
              <button
                onClick={handleStartUpload}
                disabled={uploading}
                className={`w-full py-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${
                  uploading 
                    ? 'bg-white/10 text-white cursor-wait' 
                    : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span className="text-xs font-mono tracking-widest uppercase">MENGUNGGAH...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-light tracking-wide uppercase">Simpan ke Arsip</span>
                    <span className="text-[10px] font-mono tracking-widest uppercase opacity-50">Tujuan: {activeFormattedTitle}</span>
                  </>
                )}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <UploadContent />
    </Suspense>
  );
}
