'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  Layers,
  Activity,
  RotateCw,
  Terminal,
  Settings,
  Plus,
  FolderSync,
} from 'lucide-react';
import { ActivityItem, AutomationStatus, SystemLog } from '@/lib/types';

type AdminTab = 'dashboard' | 'activities' | 'automation' | 'logs' | 'settings';

export default function AdminPage() {
  const { role } = useAuth();

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
        alert('Kegiatan berhasil ditambahkan!');
        setNewTitle('');
        setNewDate('');
        fetchActivities();
        fetchLogs();
      } else {
        alert(json.error || 'Gagal menambahkan kegiatan.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleTriggerAutomation = async () => {
    if (!confirm('Jalankan otomasi verifikasi dan pembuatan folder Sabat sekarang?')) return;

    setRunningAutomation(true);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'x-dev-role': role },
      });

      const json = await res.json();
      alert(json.message || 'Otomasi selesai dijalankan.');
      fetchAutomationStatus();
      fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses otomasi.');
    } finally {
      setRunningAutomation(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-stone-200 text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold text-stone-900">Akses Dibatasi</h2>
          <p className="text-sm text-stone-500">
            Halaman ini khusus untuk Administrator Arsip Digital. Silakan kembali ke halaman utama atau gunakan akses demo jika Anda memiliki izin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-stone-900 pb-24 font-sans">
      {/* Admin Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                <ShieldAlert className="w-4 h-4 text-[#4A7729]" />
                Pusat Kontrol Administrator
              </div>
              <h1 className="text-2xl font-bold text-stone-900">Admin</h1>
            </div>

            {/* Quick Automation Trigger */}
            <button
              onClick={handleTriggerAutomation}
              disabled={runningAutomation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4A7729] hover:bg-[#3D6422] text-white text-sm font-medium transition-all shadow-sm self-start sm:self-auto disabled:opacity-70"
            >
              <RotateCw className={`w-4 h-4 ${runningAutomation ? 'animate-spin' : ''}`} />
              Jalankan Otomasi
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
            <div className="flex p-1 bg-stone-100 rounded-lg">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: Layers },
                { key: 'activities', label: 'Kegiatan', icon: Activity },
                { key: 'automation', label: 'Otomasi', icon: FolderSync },
                { key: 'logs', label: 'Log Audit', icon: Terminal },
                { key: 'settings', label: 'Pengaturan', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as AdminTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#4A7729] text-white shadow-sm'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col justify-center">
                <span className="text-sm font-medium text-stone-500 mb-1">Penyimpanan Terhubung</span>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">Google Drive</h3>
                <p className="text-sm text-[#4A7729]">Root: GMAHK Galilea</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col justify-center">
                <span className="text-sm font-medium text-stone-500 mb-1">Metadata Layer</span>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">Cloud Firestore</h3>
                <p className="text-sm text-[#4A7729]">Project: gmahk-galilea-archive</p>
              </div>

              <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col justify-center">
                <span className="text-sm font-medium text-stone-500 mb-1">Zona Waktu Sistem</span>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">WITA (UTC+8)</h3>
                <p className="text-sm text-stone-500">Asia/Makassar</p>
              </div>
            </div>

            {/* Automation Summary Card */}
            <div className="p-6 rounded-xl bg-white border border-stone-200 shadow-sm">
              <h4 className="text-lg font-semibold text-stone-900 mb-3">Status Otomasi Terakhir</h4>
              <p className="text-sm text-stone-700 mb-4">
                {automationStatus?.details || 'Otomasi siap dijalankan. Sistem berada dalam kondisi stabil.'}
              </p>
              <p className="text-xs text-stone-500 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                Terakhir diperiksa: {automationStatus?.lastRun ? new Date(automationStatus.lastRun).toLocaleString('id-ID') : '-'}
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
              className="p-5 rounded-xl bg-white border border-stone-200 shadow-sm max-w-xl"
            >
              <h3 className="text-lg font-semibold text-stone-900 mb-1">Tambah Kegiatan Khusus</h3>
              <p className="text-sm text-stone-500 mb-5">
                Contoh: KKR Pemuda, Kebaktian Kebangunan Rohani, Perkemahan Pathfinder.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">
                    Nama Kegiatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: KKR Pemuda - 19 September 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#4A7729]/20 focus:border-[#4A7729] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-stone-700 block mb-1.5">
                      Tanggal Pelaksanaan
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#4A7729]/20 focus:border-[#4A7729] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-700 block mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'documentation' | 'worship')}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#4A7729]/20 focus:border-[#4A7729] transition-colors"
                    >
                      <option value="documentation">Dokumentasi</option>
                      <option value="worship">File Ibadah</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingActivity}
                  className="w-full py-2.5 mt-2 rounded-lg bg-[#4A7729] hover:bg-[#3D6422] text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Plus className="w-4 h-4" />
                  {creatingActivity ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>

            {/* List of Activities */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-stone-500">
                Daftar Kegiatan Tersimpan ({activities.length})
              </h3>
              <div className="grid gap-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{act.title}</p>
                      <p className="text-sm text-stone-500 mt-1">
                        {act.date} • Triwulan {act.quarter} {act.year} • {act.category === 'documentation' ? 'Dokumentasi' : 'Ibadah'}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded-md self-start sm:self-center">
                      Oleh: {act.createdBy}
                    </span>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="p-6 text-center text-stone-500 bg-white border border-stone-200 rounded-xl border-dashed">
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
            <div className="p-6 rounded-xl bg-white border border-stone-200 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Aturan & Jadwal Otomasi</h3>
              <ul className="space-y-3 text-sm text-stone-600 list-disc list-outside ml-4 mb-6">
                <li>Membuat folder tahun 7 hari sebelum tahun baru dimulai.</li>
                <li>Membuat folder triwulan (I - IV) 7 hari sebelum triwulan baru.</li>
                <li>Menghitung seluruh hari Sabat dan membuat folder tanggal secara idempoten.</li>
                <li>Mencegah duplikasi folder jika folder sudah pernah dibuat sebelumnya.</li>
                <li>Mencatat hasil otomasi ke sistem audit log Firestore.</li>
              </ul>

              <button
                onClick={handleTriggerAutomation}
                disabled={runningAutomation}
                className="px-5 py-2.5 rounded-lg bg-[#4A7729] hover:bg-[#3D6422] text-white text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                <FolderSync className={`w-4 h-4 ${runningAutomation ? 'animate-spin' : ''}`} />
                {runningAutomation ? 'Sedang Memproses...' : 'Eksekusi Otomasi Sekarang'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-stone-500 mb-2">
              Log Audit Sistem
            </h3>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-stone-100">
                {logs.map((log) => {
                  let badgeClass = 'bg-stone-100 text-stone-700 border-stone-200';
                  if (log.type === 'DELETE') {
                    badgeClass = 'bg-red-50 text-red-700 border-red-200';
                  } else if (log.type === 'UPLOAD') {
                    badgeClass = 'bg-green-50 text-green-700 border-green-200';
                  } else if (log.type === 'AUTH') {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  } else if (log.type === 'SECURITY_ALERT') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (log.type === 'AUTOMATION') {
                    badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass} shrink-0`}
                        >
                          {log.type}
                        </span>
                        <span className="text-sm text-stone-700 font-mono">
                          {log.message}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400 font-medium shrink-0">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                  <div className="p-6 text-center text-sm text-stone-500">
                    Tidak ada log audit yang tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-xl bg-white border border-stone-200 shadow-sm max-w-xl">
            <h3 className="text-lg font-semibold text-stone-900 mb-6">Konfigurasi Pengarsipan</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Email Administrator</label>
                <input
                  type="text"
                  disabled
                  value="admin@gmahk-galilea.org"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Batas Penyimpanan Utama</label>
                <input
                  type="text"
                  disabled
                  value="GMAHK Galilea (Google Drive ID)"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Zona Waktu Default</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Makassar (WITA, UTC+8)"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
