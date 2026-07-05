import React, { useState, useRef } from 'react';
import { 
  Clock, MapPin, Shield, Download, Upload, AlertCircle, CheckCircle, 
  HelpCircle, Database, RefreshCw, Key, Image, Save, Sparkles, AlertTriangle 
} from 'lucide-react';
import { AppSettings, SholatSchedule } from '../types';
import { testSupabaseConnection, exportBackupData, restoreBackupData } from '../lib/db';

const envSupabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
const envSupabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

interface SettingProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshData: () => void;
}

export default function Setting({ settings, onSaveSettings, onRefreshData }: SettingProps) {
  // Local settings clone state
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  
  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Update setting values
  const handleMasjidChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      masjid: {
        ...prev.masjid,
        [field]: value
      }
    }));
  };

  const handleScheduleChange = (index: number, field: 'start' | 'end', value: string) => {
    const updatedSchedules = [...localSettings.schedules];
    updatedSchedules[index] = {
      ...updatedSchedules[index],
      [field]: value
    };
    setLocalSettings(prev => ({
      ...prev,
      schedules: updatedSchedules
    }));
  };

  const handleSupabaseChange = (field: 'url' | 'anonKey', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      supabase: {
        ...prev.supabase,
        [field]: value,
        connected: value === '' ? false : prev.supabase.connected // disconnect if cleared
      }
    }));
  };

  // Test Supabase connection client-side
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    const { url, anonKey } = localSettings.supabase;
    if (!url || !anonKey) {
      setTestResult({
        success: false,
        message: 'Mohon isi URL dan Anon Key terlebih dahulu.'
      });
      setTestingConnection(false);
      return;
    }

    const isConnected = await testSupabaseConnection(url, anonKey);
    if (isConnected) {
      setTestResult({
        success: true,
        message: 'Koneksi ke database Supabase BERHASIL! Klik "Simpan Pengaturan" di bawah untuk mengaktifkan sinkronisasi.'
      });
      // Temporarily mark as connected in local memory
      setLocalSettings(prev => ({
        ...prev,
        supabase: {
          ...prev.supabase,
          connected: true
        }
      }));
    } else {
      setTestResult({
        success: false,
        message: 'Koneksi GAGAL. Periksa kembali URL / Anon Key Anda, atau pastikan tabel "jamaah" dan "absensi" sudah di-setup di Supabase SQL Editor.'
      });
    }
    setTestingConnection(false);
  };

  // Handle Logo file reader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('File logo terlalu besar. Maksimal 1 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleMasjidChange('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Settings Save
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(localSettings);
    
    // Play pleasant synthetic success chime
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {}

    alert('Pengaturan berhasil disimpan!');
    onRefreshData();
  };

  // BACKUP EXPORT ACTION
  const handleTriggerBackup = () => {
    const dataStr = exportBackupData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `Backup_Absensi_Masjid_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // RESTORE ACTION
  const handleTriggerRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const confirmRestore = confirm('PERINGATAN: Memulihkan database akan menimpa seluruh data Jamaah, Absensi, dan Pengaturan saat ini.\n\nApakah Anda yakin ingin melanjutkan?');
        if (confirmRestore) {
          const success = await restoreBackupData(content);
          if (success) {
            alert('Database berhasil dipulihkan!');
            window.location.reload(); // Hard reload to rebuild DB caches
          } else {
            alert('Format file backup salah atau rusak.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white font-display">Pengaturan Aplikasi</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Sesuaikan data masjid, rentang waktu sholat, backup database, dan koneksi Supabase.</p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Row 1: Masjid Details */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-brand-500" />
            Profil Masjid & Organisasi
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Logo upload block */}
            <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/20">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex items-center justify-center relative group">
                {localSettings.masjid.logo ? (
                  <img src={localSettings.masjid.logo} alt="Masjid Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Image className="w-7 h-7 mx-auto text-slate-300" />
                    <span className="text-[9px] text-slate-400 block mt-1">Belum ada logo</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                Ubah Logo
              </button>
            </div>

            {/* Inputs block */}
            <div className="md:col-span-3 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nama Masjid</label>
                <input
                  type="text"
                  required
                  value={localSettings.masjid.nama_masjid}
                  onChange={(e) => handleMasjidChange('nama_masjid', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Alamat Masjid</label>
                <textarea
                  rows={2}
                  required
                  value={localSettings.masjid.alamat}
                  onChange={(e) => handleMasjidChange('alamat', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Sholat Time Config */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-brand-500" />
            Rentang Waktu Sholat Otomatis
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
            Sistem menentukan waktu absensi secara cerdas berdasarkan jam server. Ubah rentang jam mulai dan selesai di bawah ini agar sesuai dengan zona waktu lokal Anda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {localSettings.schedules.map((schedule, index) => (
              <div key={schedule.name} className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">{schedule.name}</span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Mulai</label>
                    <input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono text-[11px] dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Selesai</label>
                    <input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 font-mono text-[11px] dark:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Batas Toleransi Keterlambatan (Durasi Telat) */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Toleransi Keterlambatan (Menit)</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Batas waktu (menit) setelah jam mulai sholat sebelum jamaah dicatat sebagai "Telat".</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="setting-durasi-telat"
                type="number"
                min="0"
                max="120"
                value={localSettings.durasi_telat !== undefined ? localSettings.durasi_telat : 15}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  durasi_telat: Math.max(0, parseInt(e.target.value) || 0)
                }))}
                className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-center font-mono focus:outline-none focus:border-brand-500 dark:text-slate-200"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Menit</span>
            </div>
          </div>
        </div>

        {/* Row 3: Supabase Integration */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-brand-500" />
              Integrasi Cloud Database Supabase
            </h3>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              localSettings.supabase.connected 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {localSettings.supabase.connected ? 'TERHUBUNG' : 'MENGGUNAKAN LOCAL STORAGE'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Secara default, aplikasi menyimpan data secara instan di browser <strong>LocalStorage</strong> (Aman, Cepat, Offline-Ready). Untuk sinkronisasi data antar HP admin secara realtime, masukkan kredensial Supabase Anda di bawah ini.
          </p>

          <div className="space-y-3">
            {envSupabaseUrl && envSupabaseAnonKey && (
              <div className="p-3 text-xs rounded-xl flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                <div>
                  <span className="font-bold block">Terhubung Otomatis via Vercel!</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                    Kredensial Supabase terdeteksi dari environment variables Vercel dan langsung digunakan secara otomatis. Anda tidak perlu memasukkannya secara manual di bawah.
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Supabase URL</label>
              <input
                type="url"
                placeholder="https://xxxxxxxxx.supabase.co"
                value={localSettings.supabase.url}
                onChange={(e) => handleSupabaseChange('url', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-brand-500 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Supabase Anon Key</label>
              <input
                type="text"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6..."
                value={localSettings.supabase.anonKey}
                onChange={(e) => handleSupabaseChange('anonKey', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-brand-500 dark:text-slate-200"
              />
            </div>

            {testResult && (
              <div className={`p-3 text-xs rounded-xl flex items-start gap-2 border ${
                testResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' 
                  : 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/30'
              }`}>
                {testResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              id="test-connection-btn"
              type="button"
              disabled={testingConnection}
              onClick={handleTestConnection}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Uji Koneksi Database Supabase
            </button>
          </div>

          {/* Supabase SQL code assistance toggle */}
          <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1">
              <Key className="w-4 h-4 text-emerald-500" />
              Skrip SQL Setup Supabase:
            </span>
            <p className="text-slate-400">
              Salin skrip ini dan jalankan di panel <strong>SQL Editor</strong> Supabase Anda untuk membuat struktur tabel yang sesuai:
            </p>
            <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto select-all max-h-36">
{`-- Buat Tabel Jamaah
CREATE TABLE jamaah (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  nik TEXT,
  jenis_kelamin TEXT,
  alamat TEXT,
  no_hp TEXT,
  status_aktif BOOLEAN,
  foto TEXT,
  qr_code TEXT,
  tanggal_daftar TEXT
);

-- Buat Tabel Absensi
CREATE TABLE absensi (
  id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  jam TEXT NOT NULL,
  jenis_sholat TEXT NOT NULL,
  id_jamaah TEXT NOT NULL,
  nama TEXT NOT NULL,
  status TEXT,
  device TEXT,
  lokasi_gps TEXT
);

-- Nonaktifkan RLS agar dapat diakses oleh client anonymous secara langsung
-- (Atau Anda juga dapat mengaktifkan RLS dan membuat kebijakan/policies SELECT/INSERT untuk role 'anon')
ALTER TABLE jamaah DISABLE ROW LEVEL SECURITY;
ALTER TABLE absensi DISABLE ROW LEVEL SECURITY;`}
            </pre>
          </div>
        </div>

        {/* Row 4: Backup / Restore Offline */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-brand-500" />
            Cadangan & Pemulihan Manual (Offline)
          </h3>
          <p className="text-[11px] text-slate-400">
            Cadangkan semua data Anda ke dalam file JSON lokal kapan saja. File ini dapat digunakan untuk memulihkan data pada perangkat baru.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="download-backup-btn"
              type="button"
              onClick={handleTriggerBackup}
              className="bg-brand-50 hover:bg-brand-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-brand-700 dark:text-brand-300 font-semibold text-xs px-4 py-2.5 rounded-xl border border-brand-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh File Cadangan (.JSON)
            </button>

            <input
              type="file"
              accept=".json"
              ref={restoreInputRef}
              onChange={handleTriggerRestore}
              className="hidden"
            />
            <button
              id="upload-backup-btn"
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Unggah & Pulihkan Data
            </button>
          </div>
        </div>

        {/* Save Button floating on desktop or sticking at bottom */}
        <div className="flex items-center justify-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            id="settings-save-btn"
            type="submit"
            className="w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4.5 h-4.5" />
            Simpan Seluruh Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}
