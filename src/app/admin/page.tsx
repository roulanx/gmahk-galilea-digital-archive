'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ShieldAlert,
  FolderSync,
} from 'lucide-react';
import { ActivityItem, AutomationStatus, SystemLog } from '@/lib/types';

type AdminTab = 'dashboard' | 'activities' | 'automation' | 'logs' | 'settings';

export default function AdminPage() {
  const { role, user, loading, roleLoading, isSigningIn, signInWithGoogle, signOut, getIdToken } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState<'documentation' | 'worship'>('documentation');
  const [creatingActivity, setCreatingActivity] = useState(false);

  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [runningAutomation, setRunningAutomation] = useState(false);

  const [logs, setLogs] = useState<SystemLog[]>([]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [getIdToken]);

  const fetchActivities = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/activities', { headers });
      const json = await res.json();
      if (json.success) setActivities(json.data);
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchAutomationStatus = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/automation', { headers });
      const json = await res.json();
      if (json.success) setAutomationStatus(json.data);
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchLogs = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/logs', { headers });
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  useEffect(() => {
    let isMounted = true;
    if (role === 'admin') {
      const loadInitial = async () => {
        try {
          const headers = await getAuthHeaders();
          const [resAct, resAuto, resLogs] = await Promise.all([
            fetch('/api/admin/activities', { headers }),
            fetch('/api/admin/automation', { headers }),
            fetch('/api/admin/logs', { headers }),
          ]);
          const [jsonAct, jsonAuto, jsonLogs] = await Promise.all([
            resAct.json(),
            resAuto.json(),
            resLogs.json(),
          ]);
          if (isMounted) {
            if (jsonAct.success) setActivities(jsonAct.data);
            if (jsonAuto.success) setAutomationStatus(jsonAuto.data);
            if (jsonLogs.success) setLogs(jsonLogs.data);
          }
        } catch (err) {
          console.error('Failed to load admin data:', err);
        }
      };
      loadInitial();
    }
    return () => { isMounted = false; };
  }, [role, getAuthHeaders]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;
    setCreatingActivity(true);
    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const res = await fetch('/api/admin/activities', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newTitle, date: newDate, category: newCategory }),
      });
      const json = await res.json();
      if (json.success) {
        showToast({ type: 'success', message: 'Tersimpan.', description: `"${newTitle}" berhasil dibuat.` });
        setNewTitle(''); setNewDate(''); fetchActivities(); fetchLogs();
      } else {
        showToast({ type: 'error', message: 'Gagal.', description: json.error || 'Terjadi kesalahan.' });
      }
    } catch (err) {
      console.error('Create activity error:', err);
      showToast({ type: 'error', message: 'Koneksi Terputus.', description: 'Periksa jaringan Anda.' });
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleTriggerAutomation = async () => {
    setRunningAutomation(true);
    showToast({ type: 'info', message: 'Menjalankan...', description: 'Memeriksa struktur folder Google Drive.' });
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/automation', { method: 'POST', headers });
      const json = await res.json();
      if (json.success) {
        showToast({
          type: 'success',
          message: 'Selesai.',
          description: json.message || json.data?.details || 'Folder disinkronkan.',
        });
      } else {
        const lastLog =
          Array.isArray(json.data?.logs) && json.data.logs.length > 0
            ? json.data.logs.find((l: string) => l.startsWith('[ERROR]')) || json.data.logs[json.data.logs.length - 1]
            : undefined;

        const failureReason =
          json.error ||
          json.data?.error ||
          json.data?.details ||
          json.message ||
          lastLog ||
          'Terjadi kegagalan saat menjalankan otomasi Google Drive.';

        showToast({
          type: 'error',
          message: 'Peringatan',
          description: failureReason,
        });
      }
      fetchAutomationStatus();
      fetchLogs();
    } catch (err) {
      console.error('Automation error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast({ type: 'error', message: 'Koneksi Terputus.', description: `Gagal memanggil API: ${errMsg}` });
    } finally {
      setRunningAutomation(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-6" />
        <p className="font-mono text-xs tracking-widest text-white/50 uppercase">MEMERIKSA HAK AKSES ADMINISTRATOR...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <span className="editorial-eyebrow">PORTAL SISTEM</span>
        <h1 className="editorial-title uppercase mb-6">MASUK KE<br />PANEL ADMIN</h1>
        <p className="editorial-desc mb-10 max-w-md">
          Halaman ini khusus untuk pengelolaan arsip dan sistem GMAHK Galilea. Masuk dengan akun Google Anda untuk melanjutkan.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            signInWithGoogle();
          }}
          disabled={isSigningIn}
          className="editorial-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? 'MEMPROSES...' : 'MASUK DENGAN GOOGLE'}
        </button>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <ShieldAlert className="w-16 h-16 text-white/20 mb-8" />
        <h1 className="editorial-title uppercase">AKSES DITOLAK</h1>
        <p className="editorial-desc mt-6 max-w-md">
          Akun <span className="text-white font-medium">{user.email}</span> terdaftar sebagai Viewer. Hubungi Super Admin (simatupangkevin9@gmail.com) untuk meminta hak akses Administrator.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/" className="editorial-button-secondary">
            KEMBALI KE BERANDA
          </Link>
          <button onClick={signOut} className="editorial-button">
            GANTI AKUN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-32 animate-fade-in">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12">
        
        {/* EDITORIAL HEADER */}
        <section className="pt-24 sm:pt-32 pb-16">
          <span className="editorial-eyebrow">SISTEM KENDALI</span>
          <h1 className="editorial-title uppercase">KELOLA<br/>GALILEA</h1>
          
          <div className="mt-16 overflow-x-auto scrollbar-none border-b border-white/10 flex gap-8">
            {[
              { id: 'dashboard', label: 'DASHBOARD' },
              { id: 'activities', label: 'KEGIATAN' },
              { id: 'automation', label: 'OTOMASI' },
              { id: 'logs', label: 'CATATAN SISTEM' },
              { id: 'settings', label: 'PENGATURAN' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`py-4 text-xs font-mono tracking-[0.2em] transition-all whitespace-nowrap relative ${
                  activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* CONTENT */}
        <div className="pt-8 pb-20 animate-fade-in-up">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
                <span className="editorial-meta">PENYIMPANAN UTAMA</span>
                <div className="mt-8">
                  <h3 className="text-2xl font-light text-white mb-2">Google Drive</h3>
                  <p className="font-mono text-[10px] text-white/40">My Drive / GMAHK Galilea</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
                <span className="editorial-meta">KATALOG METADATA</span>
                <div className="mt-8">
                  <h3 className="text-2xl font-light text-white mb-2">Cloud Firestore</h3>
                  <p className="font-mono text-[10px] text-white/40">gmahk-galilea-archive</p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
                <span className="editorial-meta">STATUS OTOMASI</span>
                <div className="mt-8">
                  <p className="text-sm font-light text-white/80 leading-relaxed">
                    {automationStatus?.details || 'Sistem siap dijalankan. Struktur arsip berada dalam kondisi teratur.'}
                  </p>
                  <p className="font-mono text-[10px] text-white/40 mt-4">
                    LAST RUN: {automationStatus?.lastRun ? new Date(automationStatus.lastRun).toLocaleString('id-ID') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVITIES */}
          {activeTab === 'activities' && (
            <div className="flex flex-col lg:flex-row gap-12">
              <form onSubmit={handleCreateActivity} className="flex-1 max-w-xl">
                <h3 className="editorial-section-title uppercase mb-8">TAMBAH KEGIATAN</h3>
                
                <div className="space-y-8">
                  <div>
                    <label className="editorial-meta block mb-3">NAMA KEGIATAN</label>
                    <input
                      type="text"
                      placeholder="Ketik nama kegiatan..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-white/20 pb-3 text-xl text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors font-light"
                    />
                  </div>
                  <div>
                    <label className="editorial-meta block mb-3">TANGGAL PELAKSANAAN</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-white/20 pb-3 text-xl text-white focus:outline-none focus:border-white transition-colors font-light color-scheme-dark"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="editorial-meta block mb-3">KATEGORI</label>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => setNewCategory('documentation')} className={`py-2 px-6 rounded-full text-xs font-mono tracking-widest uppercase border ${newCategory === 'documentation' ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}>FOTOGRAFI</button>
                      <button type="button" onClick={() => setNewCategory('worship')} className={`py-2 px-6 rounded-full text-xs font-mono tracking-widest uppercase border ${newCategory === 'worship' ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}>BERKAS IBADAH</button>
                    </div>
                  </div>
                  <button type="submit" disabled={creatingActivity} className="editorial-button w-full mt-4">
                    {creatingActivity ? 'MENYIMPAN...' : 'TAMBAH KEGIATAN'}
                  </button>
                </div>
              </form>

              <div className="flex-1">
                <h3 className="text-xs font-mono tracking-widest text-white/50 uppercase mb-8">KEGIATAN TERCATAT</h3>
                <div className="grid gap-4">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="text-xl font-light text-white mb-1">{act.title}</h4>
                        <p className="editorial-meta">{act.date}</p>
                      </div>
                      <span className="text-[9px] font-mono tracking-widest uppercase px-3 py-1 bg-white/10 rounded-full">
                        {act.category === 'documentation' ? 'FOTO' : 'BERKAS'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATION */}
          {activeTab === 'automation' && (
            <div className="max-w-2xl">
              <h3 className="editorial-section-title uppercase mb-6">SINKRONISASI STRUKTUR</h3>
              <p className="editorial-desc mb-10">
                Sistem akan membaca susunan kalender tahun ini dan mereplika struktur triwulan serta Sabat ke dalam Google Drive jika belum ada.
              </p>
              
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl mb-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`p-3 rounded-full ${automationStatus?.status === 'READY' || automationStatus?.status === 'SUCCESS' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                    <FolderSync className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-light text-white mb-2">Google Drive Bootstrap</h4>
                    <p className="text-sm font-light text-white/60">Terakhir: {automationStatus?.lastRun ? new Date(automationStatus.lastRun).toLocaleString('id-ID') : 'Belum pernah'}</p>
                  </div>
                </div>
                <p className="font-mono text-xs text-white/40 mb-8">{automationStatus?.details}</p>
                <button onClick={handleTriggerAutomation} disabled={runningAutomation} className="editorial-button-secondary w-full">
                  {runningAutomation ? 'MEMERIKSA...' : 'JALANKAN OTOMASI'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LOGS */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="editorial-meta mb-6">CATATAN SISTEM INTERNAL</h3>
              <div className="border-t border-white/10">
                {logs.map((log) => (
                  <div key={log.id} className="py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white/[0.02] px-4 -mx-4 transition-colors">
                    <div className="flex items-start md:items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase border shrink-0 ${log.type === 'SECURITY_ALERT' ? 'border-white text-white' : log.type === 'DELETE' ? 'border-white/50 text-white/80' : 'border-white/20 text-white/50'}`}>
                        {log.type}
                      </span>
                      <span className="text-sm font-light text-white/80 group-hover:text-white transition-colors">{log.message}</span>
                    </div>
                    <span className="editorial-meta shrink-0">{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="py-20 text-center text-white/30 font-light">Belum ada catatan sistem.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl">
              <h3 className="editorial-section-title uppercase mb-10">PENGATURAN</h3>
              <div className="space-y-8">
                <div>
                  <label className="editorial-meta block mb-3">PENYIMPANAN BERKAS UTAMA</label>
                  <input type="text" disabled value="Google Drive (Folder: GMAHK Galilea)" className="w-full bg-white/5 border-b border-white/10 pb-3 pt-3 px-4 text-sm text-white/50 cursor-not-allowed font-light rounded-t-xl" />
                </div>
                <div>
                  <label className="editorial-meta block mb-3">ZONA WAKTU STANDAR</label>
                  <input type="text" disabled value="Asia/Makassar (WITA, UTC+8)" className="w-full bg-white/5 border-b border-white/10 pb-3 pt-3 px-4 text-sm text-white/50 cursor-not-allowed font-light rounded-t-xl" />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

