'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileItem } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  FileText,
  Video,
  Presentation,
  FileSpreadsheet,
} from 'lucide-react';

interface MediaViewerProps {
  files: FileItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onFileDeleted?: (fileId: string) => void;
}

export default function MediaViewer({
  files,
  initialIndex = 0,
  isOpen,
  onClose,
  onFileDeleted,
}: MediaViewerProps) {
  const { role } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevInitial, setPrevInitial] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);

  // Sync index during render if initialIndex changed (React recommended pattern)
  if (initialIndex !== prevInitial) {
    setPrevInitial(initialIndex);
    setCurrentIndex(initialIndex);
  }

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : prev));
  }, [files.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex];
  if (!currentFile) return null;

  const handleDelete = async () => {
    if (role !== 'admin') {
      alert('Hanya Admin yang berhak menghapus berkas.');
      return;
    }

    if (!confirm(`Pindahkan "${currentFile.name}" ke Sampah Google Drive?`)) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-role': role,
        },
        body: JSON.stringify({
          fileId: currentFile.id,
          fileName: currentFile.name,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('Berkas berhasil dipindahkan ke Sampah.');
        if (onFileDeleted) onFileDeleted(currentFile.id);
        if (files.length <= 1) {
          onClose();
        } else {
          handleNext();
        }
      } else {
        alert(json.error || 'Gagal menghapus file');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setDeleting(false);
    }
  };

  const renderContent = () => {
    switch (currentFile.fileType) {
      case 'photo':
        return (
          <div className="relative w-full h-[70vh] flex items-center justify-center">
            {currentFile.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentFile.thumbnailUrl}
                alt={currentFile.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                <FileText className="w-16 h-16 text-zinc-500" />
                <p>Pratinjau gambar belum tersedia</p>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="w-full max-w-4xl max-h-[70vh] aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
            {currentFile.webViewLink ? (
              <iframe
                src={`${currentFile.webViewLink.replace('/view', '/preview')}`}
                className="w-full h-full border-0"
                allow="autoplay"
              ></iframe>
            ) : (
              <div className="text-center text-zinc-400">
                <Video className="w-16 h-16 mx-auto mb-2 text-zinc-600" />
                <p>Pemutar video Google Drive</p>
              </div>
            )}
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full max-w-4xl h-[70vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <iframe
              src={currentFile.webViewLink || `https://docs.google.com/viewer?url=${encodeURIComponent(currentFile.webContentLink || '')}&embedded=true`}
              className="w-full flex-1 border-0"
              title={currentFile.name}
            ></iframe>
          </div>
        );

      default:
        return (
          <div className="w-full max-w-lg p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
              {currentFile.fileType === 'presentation' ? (
                <Presentation className="w-8 h-8" />
              ) : currentFile.fileType === 'spreadsheet' ? (
                <FileSpreadsheet className="w-8 h-8" />
              ) : (
                <FileText className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 break-words">{currentFile.name}</h3>
            <p className="text-xs text-zinc-400">
              Dokumen ini dapat dibuka langsung di Google Drive atau diunduh ke perangkat Anda.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {currentFile.webViewLink && (
                <a
                  href={currentFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka di Drive
                </a>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="max-w-xl truncate">
          <p className="text-sm font-semibold truncate">{currentFile.name}</p>
          <p className="text-xs text-zinc-400">
            {currentFile.sabbathTitle} • {currentFile.category === 'documentation' ? 'Dokumentasi' : 'File Ibadah'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons */}
          {currentFile.webViewLink && (
            <a
              href={currentFile.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors"
              title="Buka di Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {role === 'admin' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-full bg-red-950/80 hover:bg-red-800 text-red-300 transition-colors"
              title="Pindahkan ke Sampah Google Drive (Khusus Admin)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative w-full h-full flex items-center justify-center p-6">
        {renderContent()}

        {/* Previous Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Navigation */}
        {currentIndex < files.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-zinc-800/80 backdrop-blur-md text-xs text-zinc-300">
        {currentIndex + 1} dari {files.length}
      </div>
    </div>
  );
}
