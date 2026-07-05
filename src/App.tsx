import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Scan, Users, History, Settings, LogOut, 
  Sun, Moon, Menu, X, Shield, Sparkles, Clock, Calendar, CheckSquare,
  Bell, MessageSquare
} from 'lucide-react';

import { Jamaah, Absensi, AppSettings } from './types';
import { 
  getLocalSettings, saveLocalSettings, getJamaahList, saveJamaah, 
  deleteJamaah, getAbsensiList, saveAbsensi 
} from './lib/db';

// Component Imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import JamaahCRUD from './components/JamaahCRUD';
import ScanQR from './components/ScanQR';
import RiwayatAbsensi from './components/RiwayatAbsensi';
import Setting from './components/Setting';

export default function App() {
  // Session & UI States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null means checking session
  const [activeView, setActiveView] = useState<'dashboard' | 'scan' | 'jamaah' | 'riwayat' | 'setting'>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // App Data States
  const [settings, setSettings] = useState<AppSettings>(getLocalSettings());
  const [jamaahList, setJamaahList] = useState<Jamaah[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Live clock display in header
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Floating in-app message notification state
  const [inAppNotif, setInAppNotif] = useState<{
    title: string;
    body: string;
    prayer: string;
  } | null>(null);

  // Listener for custom in-app prayer reminder events
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleCustomNotif = (e: any) => {
      setInAppNotif(e.detail);
      // Auto-dismiss after 10 seconds
      clearTimeout(timer);
      timer = setTimeout(() => {
        setInAppNotif(null);
      }, 10000);
    };

    window.addEventListener('show-in-app-sholat-notif', handleCustomNotif);
    return () => {
      window.removeEventListener('show-in-app-sholat-notif', handleCustomNotif);
      clearTimeout(timer);
    };
  }, []);

  // 1. Initial Session & Theme Checker
  useEffect(() => {
    // Check Remember Login Session
    const savedSession = localStorage.getItem('sholat_admin_session');
    if (savedSession === 'active') {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }

    // Check Theme preference
    const savedTheme = localStorage.getItem('sholat_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 2. Fetch DB Lists once logged in
  const loadDatabaseData = async () => {
    setLoadingData(true);
    try {
      const jList = await getJamaahList();
      const aList = await getAbsensiList();
      setJamaahList(jList);
      setAbsensiList(aList);
    } catch (e) {
      console.error('Failed to load database data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn === true) {
      loadDatabaseData();
    }
  }, [isLoggedIn]);

  // 3. Realtime clock handler
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Format Clock
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hh}:${mm}:${ss}`);

      // Format Date in Indonesian
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setCurrentDate(now.toLocaleDateString('id-ID', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 4. Session Handlers
  const handleLoginSuccess = (remember: boolean) => {
    if (remember) {
      localStorage.setItem('sholat_admin_session', 'active');
    } else {
      // Session level only (will be cleared on browser close, but we can write simple storage state)
      localStorage.setItem('sholat_admin_session', 'active');
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    const confirmLogout = confirm('Apakah Anda yakin ingin keluar dari Panel Admin?');
    if (confirmLogout) {
      localStorage.removeItem('sholat_admin_session');
      setIsLoggedIn(false);
      setActiveView('dashboard');
    }
  };

  // 5. Dark Mode Toggle
  const handleToggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('sholat_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sholat_theme', 'light');
    }
  };

  // 5.5. Global Background Prayer Reminder Loop (Works across all active tabs/views)
  useEffect(() => {
    const timeToMinutes = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return -1;
      return h * 60 + m;
    };

    const playTone = () => {
      // Check sound preference from localStorage (synced with NotificationManager toggle)
      const soundEnabled = localStorage.getItem('sholat_notif_sound') !== 'false';
      if (!soundEnabled) return;

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playToneHarmonic = (freq: number, start: number, duration: number, volume = 0.15) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(volume, start + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };

        const now = audioCtx.currentTime;
        playToneHarmonic(392.00, now, 1.2, 0.12);       // G4
        playToneHarmonic(493.88, now + 0.15, 1.2, 0.12); // B4
        playToneHarmonic(587.33, now + 0.3, 1.5, 0.15);  // D5
        playToneHarmonic(783.99, now + 0.45, 1.8, 0.1);  // G5
      } catch (e) {
        console.error('Audio synthesis failed:', e);
      }
    };

    const triggerNotification = (title: string, body: string) => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            icon: '/logo.jpg',
            vibrate: [200, 100, 200]
          } as any);
          notif.onclick = () => window.focus();
        } catch {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body,
                icon: '/logo.jpg',
                vibrate: [200, 100, 200]
              } as any);
            }).catch(() => {});
          }
        }
      }
    };

    const checkSchedules = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      settings.schedules.forEach((schedule) => {
        const prayerMinutes = timeToMinutes(schedule.start);
        if (prayerMinutes === -1) return;

        const diff = prayerMinutes - currentMinutes;

        if (diff === 5) {
          const key = `notified_${todayStr}_${schedule.name}`;
          const alreadyNotified = localStorage.getItem(key);

          if (!alreadyNotified) {
            localStorage.setItem(key, 'true');
            playTone();
            
             const message = `5 menit lagi memasuki waktu sholat ${schedule.name}. Mari bersiap-siap menuju masjid.`;
             triggerNotification(`Panggilan Sholat ${schedule.name}`, message);

             // Dispatch in-app overlay message event
             window.dispatchEvent(new CustomEvent('show-in-app-sholat-notif', {
               detail: {
                 title: `Panggilan Sholat ${schedule.name}`,
                 body: message,
                 prayer: schedule.name
               }
             }));

            // Sync with NotificationManager history log
            try {
              const savedHistory = localStorage.getItem('sholat_notif_history');
              const history = savedHistory ? JSON.parse(savedHistory) : [];
              const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              const newHistoryItem = {
                time: timestamp,
                message: `Pengingat Sholat ${schedule.name} terkirim.`,
                prayer: schedule.name
              };
              const updated = [newHistoryItem, ...history].slice(0, 5);
              localStorage.setItem('sholat_notif_history', JSON.stringify(updated));
            } catch {}
          }
        }
      });
    };

    // Check every 30 seconds
    const interval = setInterval(checkSchedules, 30000);
    return () => clearInterval(interval);
  }, [settings.schedules]);

  // 6. DB operations bound to components
  const handleSaveSettings = (newSettings: AppSettings) => {
    saveLocalSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSaveJamaah = async (jamaah: Jamaah): Promise<boolean> => {
    const success = await saveJamaah(jamaah);
    if (success) {
      await loadDatabaseData(); // refresh
    }
    return success;
  };

  const handleDeleteJamaah = async (id: string): Promise<boolean> => {
    const success = await deleteJamaah(id);
    if (success) {
      await loadDatabaseData(); // refresh
    }
    return success;
  };

  const handleAddAbsensi = async (newAbsensi: Absensi): Promise<boolean> => {
    // Check anti-duplicate scan: "cek apakah sudah scan pada waktu sholat yang sama hari ini"
    const isDuplicate = absensiList.some(item => 
      item.id_jamaah === newAbsensi.id_jamaah &&
      item.tanggal === newAbsensi.tanggal &&
      item.jenis_sholat === newAbsensi.jenis_sholat &&
      (item.status === 'Berhasil' || item.status === 'Telat')
    );

    if (isDuplicate) {
      return false; // Tells component that check-in failed (Duplicate)
    }

    const success = await saveAbsensi(newAbsensi);
    if (success) {
      await loadDatabaseData(); // refresh UI lists
    }
    return success;
  };

  // Navigation Links definition
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', label: 'Scan QR Code', icon: Scan },
    { id: 'jamaah', label: 'Data Jamaah', icon: Users },
    { id: 'riwayat', label: 'Riwayat Absen', icon: History },
    { id: 'setting', label: 'Pengaturan', icon: Settings },
  ] as const;

  // Session state waiting
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-3 font-mono">Memuat Konfigurasi Absensi...</p>
      </div>
    );
  }

  // Not Logged In Screen
  if (!isLoggedIn) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        masjidName={settings.masjid.nama_masjid} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* 1. DESKTOP SIDEBAR NAVIGATION (lg:) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-shrink-0 relative">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-brand-500/10">
            <CheckSquare className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight font-display">Absensi Sholat</h1>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-mono tracking-wider font-semibold uppercase">PANEL ADMIN</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-brand-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-xs">
              AD
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block leading-tight truncate">Administrator</span>
              <span className="text-[9px] text-slate-400 block font-mono">Role: ADMIN</span>
            </div>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={handleLogout}
            className="w-full py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Panel
          </button>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION BAR */}
      <header className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow">
            <CheckSquare className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-800 dark:text-white leading-tight font-display">Absensi Sholat</h1>
            <p className="text-[8px] text-slate-400 font-mono tracking-wider font-semibold uppercase">{settings.masjid.nama_masjid || 'Masjid Al-Ikhlas'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme switcher */}
          <button
            onClick={handleToggleTheme}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          
          {/* Hamburger trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown drawer */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-xl p-4 space-y-1.5 z-40 animate-in slide-in-from-top-4 duration-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-brand-500 text-white' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Role: ADMIN</span>
              <button
                id="mobile-logout-btn"
                onClick={handleLogout}
                className="text-xs font-bold text-rose-500 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. MAIN APP LAYOUT & WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Ribbon bar with Status / Time / Theme switches */}
        <header className="hidden lg:flex items-center justify-between bg-white dark:bg-slate-900 px-8 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            {/* Mosque details display */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-tight font-display">{settings.masjid.nama_masjid}</h2>
              <span className="text-[10px] text-slate-400 block mt-0.5">{settings.masjid.alamat}</span>
            </div>

            {/* Supabase status indicator bubble */}
            <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              settings.supabase.connected 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${settings.supabase.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>Database: {settings.supabase.connected ? 'Cloud Sync' : 'Local Storage'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Realtime dynamic clock display */}
            <div className="text-right flex items-center gap-2 border-r border-slate-100 dark:border-slate-800 pr-4">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block text-[9px]">LOKAL SEKARANG</span>
                <span className="font-bold text-slate-800 dark:text-white text-sm font-mono">{currentTime}</span>
              </div>
              <Clock className="w-4 h-4 text-brand-500" />
            </div>

            {/* Theme switcher desktop */}
            <button
              onClick={handleToggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Ganti Tema Visual"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* 4. SCROLLABLE VIEWS PORTAL */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 pb-20 lg:pb-8">
          {loadingData ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 mt-2 font-mono">Sinkronisasi Database...</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeView === 'dashboard' && (
                <Dashboard 
                  jamaahList={jamaahList} 
                  absensiList={absensiList} 
                  settings={settings}
                  onNavigateToScan={() => setActiveView('scan')} 
                />
              )}
              
              {activeView === 'scan' && (
                <ScanQR 
                  jamaahList={jamaahList} 
                  schedules={settings.schedules} 
                  onAddAbsensi={handleAddAbsensi} 
                />
              )}
              
              {activeView === 'jamaah' && (
                <JamaahCRUD 
                  jamaahList={jamaahList} 
                  onSave={handleSaveJamaah} 
                  onDelete={handleDeleteJamaah} 
                />
              )}
              
              {activeView === 'riwayat' && (
                <RiwayatAbsensi 
                  absensiList={absensiList} 
                />
              )}
              
              {activeView === 'setting' && (
                <Setting 
                  settings={settings} 
                  onSaveSettings={handleSaveSettings} 
                  onRefreshData={loadDatabaseData} 
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* 5. MOBILE BOTTOM NAVIGATION RAIL (HP PWA Feel) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 py-1 flex items-center justify-around z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[9px] font-bold tracking-wide transition-all ${
                isActive 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50/50 dark:bg-slate-800' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label === 'Scan QR Code' ? 'Scan' : item.label === 'Riwayat Absen' ? 'Riwayat' : item.label === 'Data Jamaah' ? 'Jamaah' : item.label}
            </button>
          );
        })}
      </nav>

      {/* 6. FLOATING IN-APP CHAT/MESSAGE NOTIFICATION POPUP */}
      {inAppNotif && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[400px] z-[9999] animate-in slide-in-from-top-12 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            {/* Top decorative bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-brand-500" />
            
            {/* Round avatar / mosque logo */}
            <div className="relative flex-shrink-0">
              <img 
                src="/logo.jpg" 
                alt="Logo Masjid" 
                className="w-11 h-11 rounded-full object-cover border-2 border-brand-100 dark:border-brand-900/50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-brand-500 text-white p-0.5 rounded-full border-2 border-white dark:border-slate-900">
                <Bell className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* Notification content */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block font-display">
                  PENGINGAT MASJID
                </span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 font-mono tracking-wider">
                  BARU SAJA
                </span>
              </div>
              <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mt-0.5 font-sans">
                {inAppNotif.title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                {inAppNotif.body}
              </p>
              
              {/* Interactive buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    setInAppNotif(null);
                    setActiveView('dashboard');
                  }}
                  className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                >
                  Buka Dashboard
                </button>
                <button
                  onClick={() => setInAppNotif(null)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 active:scale-95 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-semibold border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Slide-out close button */}
            <button
              onClick={() => setInAppNotif(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
