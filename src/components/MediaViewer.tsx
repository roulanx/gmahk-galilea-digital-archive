'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, Trash2, FileText, FileSpreadsheet, Presentation, Video, Image as ImageIcon, AlertTriangle, Download, Share2 } from 'lucide-react';
import { FileItem } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface MediaViewerProps {
  file?: FileItem;
  files?: FileItem[];
  initialIndex?: number;
  isOpen?: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onFileDeleted?: (fileId: string) => void;
}

export default function MediaViewer({
  file,
  files,
  initialIndex = 0,
  isOpen = true,
  onClose,
  onNext,
  onPrev,
  onFileDeleted,
}: MediaViewerProps) {
  const { role, getIdToken } = useAuth();
  const { showToast } = useToast();
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const [prevInitial, setPrevInitial] = useState(initialIndex);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync index during render if initialIndex changed
  if (initialIndex !== prevInitial) {
    setPrevInitial(initialIndex);
    setInternalIndex(initialIndex);
  }

  const currentFile = file ?? (files && files[internalIndex]);
  const hasFiles = Boolean(files && files.length > 0);

  const canGoNext = Boolean(onNext || (hasFiles && files && internalIndex < files.length - 1));
  const canGoPrev = Boolean(onPrev || (hasFiles && internalIndex > 0));

  const handleNext = useCallback(() => {
    if (onNext) {
      onNext();
    } else if (hasFiles && files) {
      setInternalIndex((prev) => (prev < files.length - 1 ? prev + 1 : prev));
    }
  }, [onNext, hasFiles, files]);

  const handlePrev = useCallback(() => {
    if (onPrev) {
      onPrev();
    } else if (hasFiles) {
      setInternalIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  }, [onPrev, hasFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && canGoNext) handleNext();
      if (e.key === 'ArrowLeft' && canGoPrev) handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, canGoNext, canGoPrev, handleNext, handlePrev]);

  if (!isOpen || !currentFile) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const response = await fetch(`/api/archive/download?fileId=${currentFile.id}`);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Gagal mengunduh berkas');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let loaded = 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream tidak didukung browser ini.');

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          if (total > 0) {
            setDownloadProgress(Math.round((loaded / total) * 100));
          } else {
            setDownloadProgress(loaded);
          }
        }
      }

      const blob = new Blob(chunks as any, { type: response.headers.get('Content-Type') || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = currentFile.name;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;'"]+)/i);
        if (filenameMatch && filenameMatch[1]) {
          fileName = decodeURIComponent(filenameMatch[1]);
        }
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        message: 'Unduhan Berhasil',
        description: `"${fileName}" berhasil diunduh.`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      showToast({
        type: 'error',
        message: 'Unduhan Gagal',
        description: error.message || 'Terjadi kesalahan saat mengunduh berkas.',
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast({
        type: 'info',
        message: 'Link Disalin',
        description: 'Link berkas berhasil disalin.',
      });
    }).catch(() => {
      showToast({
        type: 'error',
        message: 'Gagal Menyalin',
        description: 'Tidak dapat menyalin link ke clipboard.',
      });
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = window.location.href; 
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentFile.name,
          text: 'Lihat berkas GMAHK Galilea',
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const handleDeleteClick = () => {
    if (role !== 'admin') {
      showToast({
        type: 'warning',
        message: 'Akses Terbatas',
        description: 'Hanya pengurus yang memiliki wewenang untuk menghapus berkas.',
      });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setIsDeleting(true);
      const idToken = await getIdToken();
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fileId: currentFile.id,
          fileName: currentFile.name,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          message: 'Berkas Dipindahkan',
          description: `"${currentFile.name}" telah dipindahkan ke Sampah Google Drive.`,
        });
        if (onFileDeleted) {
          onFileDeleted(currentFile.id);
        } else {
          if (hasFiles && files && files.length > 1) {
            if (internalIndex < files.length - 1) {
               handleNext();
            } else {
               handlePrev();
            }
          } else {
            onClose();
          }
        }
      } else {
        showToast({
          type: 'error',
          message: 'Gagal Memindahkan Berkas',
          description: json.error || 'Terjadi kendala saat memindahkan berkas ke Sampah.',
        });
      }
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        message: 'Koneksi Terputus',
        description: 'Tidak dapat menghubungi server. Periksa kembali sambungan internet Anda.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContent = () => {
    switch (currentFile.fileType) {
      case 'photo':
        return (
          <div className="relative w-full h-[75vh] flex items-center justify-center p-4">
            {currentFile.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentFile.thumbnailUrl.replace(/=s\d+/, '=s2048')}
                alt={currentFile.name}
                className="max-h-full max-w-full object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/50 gap-4">
                <FileText className="w-16 h-16 opacity-50" />
                <p>Pratinjau gambar belum tersedia</p>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="w-full max-w-5xl h-[75vh] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {currentFile.webViewLink ? (
              <iframe
                src={currentFile.webViewLink.replace('/view', '/preview')}
                className="w-full h-full border-0"
                allow="autoplay"
              ></iframe>
            ) : (
              <div className="text-center text-white/50">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Pemutar video Google Drive</p>
              </div>
            )}
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full max-w-5xl h-[80vh] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <iframe
              src={currentFile.webViewLink ? currentFile.webViewLink.replace('/view', '/preview') : `https://docs.google.com/viewer?url=${encodeURIComponent(currentFile.webContentLink || '')}&embedded=true`}
              className="w-full flex-1 border-0"
              title={currentFile.name}
            ></iframe>
          </div>
        );

      default:
        return (
          <div className="w-full max-w-md p-10 rounded-3xl bg-black border border-white/10 text-center shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-white/5 flex items-center justify-center text-white">
              {currentFile.fileType === 'presentation' ? (
                <Presentation className="w-10 h-10" />
              ) : currentFile.fileType === 'spreadsheet' ? (
                <FileSpreadsheet className="w-10 h-10" />
              ) : (
                <FileText className="w-10 h-10" />
              )}
            </div>
            <h3 className="text-xl font-normal text-white mb-2 break-words leading-tight">{currentFile.name}</h3>
            <p className="text-sm text-white/60 mb-8 font-light">
              Dokumen ini dapat dibuka langsung di Google Drive atau diunduh ke perangkat Anda.
            </p>
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 p-6 flex items-start justify-between text-white z-20 pointer-events-none">
        <div className="max-w-2xl">
        </div>
        <div className="flex flex-wrap items-center gap-3 ml-auto pointer-events-auto">
          
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center h-11 px-4 gap-2 rounded-full bg-white text-black hover:bg-white/80 font-medium transition-colors"
            title="Unduh"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">
              {isDownloading ? (
                downloadProgress !== null && downloadProgress <= 100 
                  ? `${downloadProgress}%` 
                  : 'MENGUNDUH...'
              ) : 'UNDUH'}
            </span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center h-11 px-4 gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Bagikan"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">BAGIKAN</span>
          </button>

          {currentFile.webViewLink && (
            <a
              href={currentFile.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-11 px-4 gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Buka di Google Drive"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}

          {role === 'admin' && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="flex items-center justify-center h-11 min-w-[2.75rem] px-3 rounded-full bg-white/10 hover:bg-red-500 hover:text-white text-white transition-colors"
              title="Pindahkan ke Sampah"
              aria-label="Pindahkan ke Sampah"
            >
              {isDeleting ? <span className="text-sm px-2">MEMINDAHKAN...</span> : <Trash2 className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center justify-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            title="Tutup"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        className="relative w-full h-full flex items-center justify-center p-8 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}

        {canGoPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shadow-lg cursor-pointer"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {canGoNext && (
          <button
            onClick={handleNext}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shadow-lg cursor-pointer"
            aria-label="Selanjutnya"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-center z-10 pointer-events-none">
        <div 
          className="bg-black/60 backdrop-blur-md px-8 py-5 rounded-2xl flex flex-col items-center max-w-3xl w-full text-center border border-white/10 shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-white font-medium text-lg mb-2 truncate w-full">{currentFile.name}</h2>
          <div className="flex items-center justify-center gap-3 text-xs tracking-wider text-white/70 flex-wrap uppercase font-light">
            <span>{currentFile.sabbathTitle}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span>{currentFile.category === 'documentation' ? 'Dokumentasi' : 'File Ibadah'}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span>{currentFile.fileType}</span>
            {hasFiles && files && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30"></span>
                <span>{internalIndex + 1} / {files.length}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-5 text-white">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Pindahkan ke Sampah?</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed font-light">
              Apakah Anda yakin ingin memindahkan <span className="font-medium text-white">{currentFile.name}</span> ke Sampah Google Drive?
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={confirmDelete}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-white/80 text-black text-sm font-medium transition-colors"
              >
                Pindahkan ke Sampah
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-neutral-200 text-white text-sm font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
