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

export default function AdminPage() {
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'activities' | 'automation' | 'logs' | 'settings'>('dashboard');

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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold text-white">Akses Dibatasi</h2>
          <p className="text-xs text-zinc-400">
            Halaman ini khusus untuk Super Admin GMAHK Galilea Digital Archive. Gunakan toggle demo
            di kanan atas Navbar jika ingin menguji fitur Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Admin Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <ShieldAlert className="w-4 h-4" />
                Administrator Control Center
              </div>
              <h1 className="text-2xl font-bold text-white mt-1">Admin Dashboard</h1>
            </div>

            {/* Quick Automation Trigger */}
            <button
              onClick={handleTriggerAutomation}
              disabled={runningAutomation}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md self-start sm:self-auto"
            >
              <RotateCw className={`w-3.5 h-3.5 ${runningAutomation ? 'animate-spin' : ''}`} />
              Jalankan Otomasi Folder
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: Layers },
              { key: 'activities', label: 'Activities', icon: Activity },
              { key: 'automation', label: 'Automation', icon: FolderSync },
              { key: 'logs', label: 'Audit Logs', icon: Terminal },
              { key: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'dashboard' | 'activities' | 'automation' | 'logs' | 'settings')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-zinc-800 text-white border border-emerald-500/40 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-medium text-zinc-500">Penyimpanan Terhubung</span>
                <h3 className="text-2xl font-bold text-white">Google Drive</h3>
                <p className="text-xs text-emerald-400">Root: GMAHK Galilea</p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-medium text-zinc-500">Metadata Layer</span>
                <h3 className="text-2xl font-bold text-white">Cloud Firestore</h3>
                <p className="text-xs text-emerald-400">Project: gmahk-galilea-archive</p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-medium text-zinc-500">Zona Waktu Sistem</span>
                <h3 className="text-2xl font-bold text-white">WITA (UTC+8)</h3>
                <p className="text-xs text-zinc-400">Asia/Makassar</p>
              </div>
            </div>

            {/* Automation Summary Card */}
            <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <h4 className="text-sm font-semibold text-zinc-200">Status Otomasi Terakhir</h4>
              <p className="text-xs text-zinc-400">
                {automationStatus?.details || 'Otomasi siap dijalankan.'}
              </p>
              <p className="text-[10px] text-zinc-500">
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
              className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 max-w-xl"
            >
              <h3 className="text-base font-bold text-white">Tambah Kegiatan Khusus</h3>
              <p className="text-xs text-zinc-400">
                Contoh: KKR Pemuda, Kebaktian Kebangunan Rohani, Perkemahan Pathfinder.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Nama Kegiatan
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KKR Pemuda - 19 September 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Tanggal Pelaksanaan
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1">
                      Kategori
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as 'documentation' | 'worship')}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="documentation">Dokumentasi</option>
                      <option value="worship">File Ibadah</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingActivity}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {creatingActivity ? 'Menyimpan...' : 'Simpan Kegiatan'}
                </button>
              </div>
            </form>

            {/* List of Activities */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Daftar Kegiatan Tersimpan ({activities.length})
              </h3>
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm text-white">{act.title}</p>
                      <p className="text-xs text-zinc-400">
                        {act.date} • Triwulan {act.quarter} {act.year} • {act.category}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500">{act.createdBy}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTOMATION */}
        {activeTab === 'automation' && (
          <div className="space-y-6 max-w-2xl">
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <h3 className="text-base font-bold text-white">Aturan & Jadwal Otomasi</h3>
              <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside leading-relaxed">
                <li>Membuat folder tahun 7 hari sebelum tahun baru dimulai.</li>
                <li>Membuat folder triwulan (I - IV) 7 hari sebelum quarter baru.</li>
                <li>Menghitung seluruh hari Sabat dan membuat folder tanggal secara idempoten.</li>
                <li>Mencegah duplikasi folder jika folder sudah pernah dibuat.</li>
                <li>Mencatat hasil otomasi ke audit log Firestore.</li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={handleTriggerAutomation}
                  disabled={runningAutomation}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  {runningAutomation ? 'Sedang Memproses...' : 'Eksekusi Otomasi Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              System Audit Logs
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.type === 'DELETE'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : log.type === 'UPLOAD'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-zinc-200">{log.message}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px] shrink-0">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 max-w-xl space-y-4">
            <h3 className="text-base font-bold text-white">Konfigurasi Pengarsipan</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Super Admin Email</label>
                <input
                  type="text"
                  disabled
                  value="admin@gmahk-galilea.org"
                  className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 opacity-80"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Primary Storage Boundary</label>
                <input
                  type="text"
                  disabled
                  value="GMAHK Galilea (Google Drive ID)"
                  className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 opacity-80"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Timezone</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Makassar (WITA, UTC+8)"
                  className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 opacity-80"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
