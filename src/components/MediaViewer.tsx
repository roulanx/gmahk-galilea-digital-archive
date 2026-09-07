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
  AlertTriangle
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      if (showDeleteConfirm) return; // Disable navigation when confirm is open
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose, showDeleteConfirm]);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex];
  if (!currentFile) return null;

  const handleDeleteClick = () => {
    if (role !== 'admin') {
      alert('Hanya Admin yang berhak menghapus berkas.');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setIsDeleting(true);
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
                src={currentFile.thumbnailUrl}
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
          <div className="w-full max-w-5xl max-h-[75vh] aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
            {currentFile.webViewLink ? (
              <iframe
                src={`${currentFile.webViewLink.replace('/view', '/preview')}`}
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
          <div className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <iframe
              src={currentFile.webViewLink || `https://docs.google.com/viewer?url=${encodeURIComponent(currentFile.webContentLink || '')}&embedded=true`}
              className="w-full flex-1 border-0"
              title={currentFile.name}
            ></iframe>
          </div>
        );

      default:
        return (
          <div className="w-full max-w-md p-10 rounded-3xl bg-white text-center shadow-2xl flex flex-col items-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-stone-50 flex items-center justify-center text-[#4A7729]">
              {currentFile.fileType === 'presentation' ? (
                <Presentation className="w-10 h-10" />
              ) : currentFile.fileType === 'spreadsheet' ? (
                <FileSpreadsheet className="w-10 h-10" />
              ) : (
                <FileText className="w-10 h-10" />
              )}
            </div>
            <h3 className="text-xl font-medium text-stone-900 mb-2 break-words leading-tight">{currentFile.name}</h3>
            <p className="text-sm text-stone-500 mb-8">
              Dokumen ini dapat dibuka langsung di Google Drive atau diunduh ke perangkat Anda.
            </p>
            <div className="flex items-center justify-center">
              {currentFile.webViewLink && (
                <a
                  href={currentFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#4A7729] hover:bg-[#3D6422] text-white text-sm font-medium transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Buka di Drive
                </a>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="absolute top-0 left-0 right-0 p-6 flex items-start justify-between text-white z-20 pointer-events-none"
      >
        <div className="max-w-2xl">
          {/* Spacing for alignment if needed */}
        </div>

        <div className="flex items-center gap-3 ml-auto pointer-events-auto">
          {currentFile.webViewLink && (
            <a
              href={currentFile.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Buka di Google Drive"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}

          {role === 'admin' && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-3 rounded-full bg-white/10 hover:bg-red-500/90 text-white transition-colors"
              title="Hapus Berkas (Khusus Admin)"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-8 pb-32"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}

        {/* Previous Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Navigation */}
        {currentIndex < files.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-center z-10 pointer-events-none"
      >
        <div 
          className="bg-black/40 backdrop-blur-md px-8 py-5 rounded-2xl flex flex-col items-center max-w-3xl w-full text-center border border-white/10 shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-white font-medium text-lg mb-2 truncate w-full">{currentFile.name}</h2>
          <div className="flex items-center justify-center gap-3 text-sm text-white/70 flex-wrap">
            <span>{currentFile.sabbathTitle}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span>{currentFile.category === 'documentation' ? 'Dokumentasi' : 'File Ibadah'}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span className="uppercase">{currentFile.fileType}</span>
            <span className="w-1 h-1 rounded-full bg-white/30"></span>
            <span>{currentIndex + 1} dari {files.length}</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-xl font-medium text-stone-900 mb-2">Hapus Berkas?</h3>
            <p className="text-stone-500 mb-8 leading-relaxed">
              Apakah Anda yakin ingin memindahkan <span className="font-medium text-stone-700">{currentFile.name}</span> ke Sampah Google Drive?
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={confirmDelete}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                Ya, Pindahkan
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
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
