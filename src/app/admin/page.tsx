'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ShieldAlert,
  RotateCw,
  Plus,
  FolderSync,
} from 'lucide-react';
import { ActivityItem, AutomationStatus, SystemLog } from '@/lib/types';

type AdminTab = 'dashboard' | 'activities' | 'automation' | 'logs' | 'settings';

export default function AdminPage() {
  const { role } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // State for Activities
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState<'documentation' | 'worship'>('documentation');
  const [creatingActivity, setCreatingActivity] = useState(false);

  // State for Automation
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [runningAutomation, setRunningAutomation] = useState(false);

  // State for Logs
  const [logs, setLogs] = useState<SystemLog[]>([]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activities');
      const json = await res.json();
      if (json.success) setActivities(json.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAutomationStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/automation');
      const json = await res.json();
      if (json.success) setAutomationStatus(json.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'x-dev-role': role },
      });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) {
      console.error(e);
    }
  }, [role]);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/admin/activities')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) setActivities(json.data);
      })
      .catch(console.error);

    fetch('/api/admin/automation')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) setAutomationStatus(json.data);
      })
      .catch(console.error);

    fetch('/api/admin/logs', { headers: { 'x-dev-role': role } })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) setLogs(json.data);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, [role]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;

    setCreatingActivity(true);
    try {
      const res = await fetch('/api/admin/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-role': role,
        },
        body: JSON.stringify({
          title: newTitle,
          date: newDate,
          category: newCategory,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          message: 'Kegiatan Ditambahkan',
          description: `"${newTitle}" berhasil dicatat dalam jadwal kegiatan.`,
        });
        setNewTitle('');
        setNewDate('');
        fetchActivities();
        fetchLogs();
      } else {
        showToast({
          type: 'error',
          message: 'Gagal Menambahkan Kegiatan',
          description: json.error || 'Terjadi kendala saat menyimpan kegiatan.',
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
      setCreatingActivity(false);
    }
  };

  const handleTriggerAutomation = async () => {
    setRunningAutomation(true);
    showToast({
      type: 'info',
      message: 'Menjalankan Otomasi',
      description: 'Sedang memeriksa struktur folder Sabat di Google Drive...',
    });

    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'x-dev-role': role },
      });

      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          message: 'Otomasi Selesai',
          description: json.message || 'Struktur folder telah disinkronkan dengan baik.',
        });
      } else {
        showToast({
          type: 'error',
          message: 'Peringatan Otomasi',
          description: json.message || 'Tidak dapat menyelesaikan seluruh langkah otomasi.',
        });
      }
      fetchAutomationStatus();
      fetchLogs();
    } catch (err) {
      console.error(err);
      showToast({
        type: 'error',
        message: 'Koneksi Terputus',
        description: 'Terjadi kegagalan saat menjalankan proses otomasi.',
      });
    } finally {
      setRunningAutomation(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-neutral-50 border border-neutral-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mx-auto text-black">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium text-black">Akses Khusus Pengurus</h2>
          <p className="text-sm text-neutral-500 font-light leading-relaxed">
            Halaman ini dikhususkan bagi pengurus untuk mengelola sistem pengarsipan. Silakan kembali ke beranda atau masuk menggunakan akun pengurus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-32">
      {/* Admin Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-6">
            <div>
              <span className="text-[11px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
                Panel Pengurus
              </span>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-black mt-2">
                Administrasi Sistem
              </h1>
            </div>

            {/* Quick Automation Trigger */}
            <button
              onClick={handleTriggerAutomation}
              disabled={runningAutomation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-sm self-start sm:self-auto disabled:opacity-40 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${runningAutomation ? 'animate-spin' : ''}`} />
              {runningAutomation ? 'Sedang Sinkronisasi...' : 'Jalankan Otomasi'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex items-center gap-6 overflow-x-auto pb-1 text-xs">
            {[
              { key: 'dashboard', label: 'Ringkasan' },
              { key: 'activities', label: 'Kegiatan Khusus' },
              { key: 'automation', label: 'Otomasi Folder' },
              { key: 'logs', label: 'Catatan Aktivitas' },
              { key: 'settings', label: 'Pengaturan' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as AdminTab)}
                  className={`py-2 tracking-tight transition-colors shrink-0 relative cursor-pointer ${
                    isActive
                      ? 'text-black font-medium'
                      : 'text-neutral-400 hover:text-black font-normal'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-neutral-200 bg-white flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Penyimpanan Utama
                </span>
                <div className="mt-4">
                  <h3 className="text-xl font-normal text-black">Google Drive</h3>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">My Drive / GMAHK Galilea</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-neutral-200 bg-white flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Katalog Metadata
                </span>
                <div className="mt-4">
                  <h3 className="text-xl font-normal text-black">Cloud Firestore</h3>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">gmahk-galilea-archive</p>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-neutral-200 bg-white flex flex-col justify-between">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Zona Waktu Pelayanan
                </span>
                <div className="mt-4">
                  <h3 className="text-xl font-normal text-black">WITA (UTC+8)</h3>
                  <p className="text-xs text-neutral-400 mt-1">Asia/Makassar</p>
                </div>
              </div>
            </div>

            {/* Automation Summary Card */}
            <div className="p-6 rounded-2xl border border-neutral-200 bg-white">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                Status Otomasi Terakhir
              </span>
              <p className="text-sm text-neutral-800 mt-2 leading-relaxed font-light">
                {automationStatus?.details || 'Sistem siap dijalankan. Struktur arsip berada dalam kondisi teratur.'}
              </p>
              <p className="text-xs text-neutral-400 mt-4 flex items-center gap-1.5 font-light">
                <RotateCw className="w-3.5 h-3.5 text-neutral-400" />
                Pemeriksaan terakhir: {automationStatus?.lastRun ? new Date(automationStatus.lastRun).toLocaleString('id-ID') : 'Belum dijalankan'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITIES */}
        {activeTab === 'activities' && (
          <div className="space-y-8">
            {/* Create Activity Form */}
            <form
              onSubmit={handleCreateActivity}
              className="p-6 rounded-2xl bg-white border border-neutral-200 max-w-xl"
            >
              <h3 className="text-lg font-medium text-black mb-1">Tambah Kegiatan Khusus</h3>
              <p className="text-sm text-neutral-500 mb-6 font-light">
                Misalnya: Kebaktian Kebangunan Rohani, Perkemahan Pathfinder, atau Acara Khusus Jemaat.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                    Nama Kegiatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kebaktian Kebangunan Rohani - 19 September 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors font-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                      Tanggal Pelaksanaan
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors font-light"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                      Kategori Berkas
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'documentation' | 'worship')}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors font-light"
                    >
                      <option value="documentation">Dokumentasi</option>
                      <option value="worship">File Ibadah</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingActivity}
                  className="w-full py-3 mt-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {creatingActivity ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>

            {/* List of Activities */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Daftar Kegiatan Tersimpan ({activities.length})
              </h3>
              <div className="grid gap-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl bg-white border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-black">{act.title}</p>
                      <p className="text-xs text-neutral-500 mt-1 font-light">
                        {act.date} • Triwulan {act.quarter} {act.year} • {act.category === 'documentation' ? 'Dokumentasi' : 'File Ibadah'}
                      </p>
                    </div>
                    <span className="text-xs font-light text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full self-start sm:self-center">
                      Dicatat oleh: {act.createdBy}
                    </span>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="p-8 text-center text-sm text-neutral-400 bg-white border border-neutral-200 rounded-2xl border-dashed font-light">
                    Belum ada kegiatan khusus yang ditambahkan.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTOMATION */}
        {activeTab === 'automation' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200">
              <h3 className="text-lg font-medium text-black mb-4">Aturan & Mekanisme Otomasi</h3>
              <ul className="space-y-3 text-sm text-neutral-600 list-disc list-outside ml-4 mb-6 font-light leading-relaxed">
                <li>Membuat folder tahun 7 hari sebelum tahun baru dimulai di Google Drive.</li>
                <li>Membuat struktur folder triwulan (I - IV) secara teratur.</li>
                <li>Menghitung seluruh hari Sabat dan membuat folder tanggal secara idempoten.</li>
                <li>Mencegah duplikasi folder jika folder sudah pernah dibuat sebelumnya.</li>
                <li>Mencatat hasil otomasi ke sistem catatan audit Firestore.</li>
              </ul>

              <button
                onClick={handleTriggerAutomation}
                disabled={runningAutomation}
                className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <FolderSync className={`w-4 h-4 ${runningAutomation ? 'animate-spin' : ''}`} />
                {runningAutomation ? 'Sedang Memproses...' : 'Sinkronkan Folder Sekarang'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
              Catatan Aktivitas Sistem
            </h3>
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="divide-y divide-neutral-100">
                {logs.map((log) => {
                  let badgeClass = 'bg-neutral-100 text-neutral-700 border-neutral-200';
                  if (log.type === 'DELETE') {
                    badgeClass = 'bg-black text-white border-black';
                  } else if (log.type === 'UPLOAD') {
                    badgeClass = 'bg-neutral-100 text-black border-neutral-300';
                  } else if (log.type === 'AUTH') {
                    badgeClass = 'bg-neutral-200 text-neutral-800 border-neutral-200';
                  } else if (log.type === 'SECURITY_ALERT') {
                    badgeClass = 'bg-neutral-900 text-white border-neutral-900';
                  } else if (log.type === 'AUTOMATION') {
                    badgeClass = 'border border-neutral-400 text-neutral-800';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-medium border ${badgeClass} shrink-0`}
                        >
                          {log.type}
                        </span>
                        <span className="text-sm text-neutral-800 font-light">
                          {log.message}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 font-light shrink-0">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                  <div className="p-8 text-center text-sm text-neutral-400 font-light">
                    Belum ada catatan aktivitas yang tersimpan.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 max-w-xl">
            <h3 className="text-lg font-medium text-black mb-6">Konfigurasi Penyimpanan</h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1.5">Penanggung Jawab Sistem</label>
                <input
                  type="text"
                  disabled
                  value="Kevin Simatupang — Dokumentasi Digital GMAHK Galilea"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600 cursor-not-allowed font-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1.5">Penyimpanan Berkas Utama</label>
                <input
                  type="text"
                  disabled
                  value="Google Drive (Folder: GMAHK Galilea)"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600 cursor-not-allowed font-light"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1.5">Zona Waktu Standar</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Makassar (WITA, UTC+8)"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-neutral-600 cursor-not-allowed font-light"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
