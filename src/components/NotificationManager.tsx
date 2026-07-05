import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, Info, Volume2, AlertCircle } from 'lucide-react';
import { AppSettings, SholatSchedule } from '../types';

interface NotificationManagerProps {
  settings: AppSettings;
}

export default function NotificationManager({ settings }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notificationsHistory, setNotificationsHistory] = useState<{ time: string; message: string; prayer: string }[]>([]);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);
  const [browserSupport, setBrowserSupport] = useState<boolean>(true);

  // Check initial state
  useEffect(() => {
    if (!('Notification' in window)) {
      setBrowserSupport(false);
      return;
    }
    setPermission(Notification.permission);
    
    // Load audio preference
    const savedSound = localStorage.getItem('sholat_notif_sound');
    if (savedSound !== null) {
      setSoundEnabled(savedSound === 'true');
    }

    // Load recent notifications history
    const savedHistory = localStorage.getItem('sholat_notif_history');
    if (savedHistory) {
      try {
        setNotificationsHistory(JSON.parse(savedHistory));
      } catch {
        // Clear corrupt history
      }
    }
  }, []);

  // Request native permission
  const requestPermission = async () => {
    if (!browserSupport) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        playNotificationSound();
        triggerLocalNotification('Pengingat Aktif', 'Notifikasi pengingat sholat 5 menit sebelum adzan berhasil diaktifkan!');
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
    }
  };

  // Sound Synthesizer: Elegant islamic-themed dual-tone resonant melody
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number, volume = 0.15) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        // Use Triangle or Soft Sine for an elegant, warm bell chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        
        // Volume envelope
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      
      // Beautiful harmonic chime (G major arpeggio / Asian traditional scale)
      playTone(392.00, now, 1.2, 0.12);       // G4
      playTone(493.88, now + 0.15, 1.2, 0.12); // B4
      playTone(587.33, now + 0.3, 1.5, 0.15);  // D5
      playTone(783.99, now + 0.45, 1.8, 0.1);  // G5 (high accent)
    } catch (err) {
      console.error('Audio synthesizer error:', err);
    }
  };

  const triggerLocalNotification = (title: string, body: string) => {
    if (!browserSupport) return;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/logo.jpg',
          vibrate: [200, 100, 200],
          requireInteraction: false
        } as any);
        
        notif.onclick = () => {
          window.focus();
        };
      } catch (err) {
        // Fallback for some browsers / mobile platforms that expect service workers for notifications
        console.warn('Direct notification constructor failed, trying service worker...', err);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: '/logo.jpg',
              vibrate: [200, 100, 200]
            } as any);
          }).catch(swErr => {
            console.error('Service worker notification failed:', swErr);
          });
        }
      }
    }
  };

  // Helper to convert HH:mm string to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  };

  // Periodic checker loop
  useEffect(() => {
    const checkPrayerTimes = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Get current date string (ID local format YYYY-MM-DD)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      settings.schedules.forEach((schedule) => {
        const prayerMinutes = timeToMinutes(schedule.start);
        if (prayerMinutes === -1) return;

        // Calculate difference in minutes
        const diff = prayerMinutes - currentMinutes;

        // Exactly 5 minutes before
        if (diff === 5) {
          const key = `notified_${todayStr}_${schedule.name}`;
          const alreadyNotified = localStorage.getItem(key);

          if (!alreadyNotified) {
            // Mark as notified to prevent repeating within this minute
            localStorage.setItem(key, 'true');

            // Trigger sound & notification
            playNotificationSound();
            
            const message = `5 menit lagi memasuki waktu sholat ${schedule.name}. Mari bersiap-siap menuju masjid.`;
            triggerLocalNotification(`Panggilan Sholat ${schedule.name}`, message);

            // Add to in-app history list
            const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const newHistoryItem = {
              time: timestamp,
              message: `Pengingat Sholat ${schedule.name} terkirim.`,
              prayer: schedule.name
            };

            setNotificationsHistory(prev => {
              const updated = [newHistoryItem, ...prev].slice(0, 5);
              localStorage.setItem('sholat_notif_history', JSON.stringify(updated));
              return updated;
            });
          }
        }
      });
    };

    // Run check once on mount
    checkPrayerTimes();

    // Check every 25 seconds for reliable minutes match
    const interval = setInterval(checkPrayerTimes, 25000);
    return () => clearInterval(interval);
  }, [settings.schedules, soundEnabled]);

  const toggleSound = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    localStorage.setItem('sholat_notif_sound', String(newSound));
  };

  const handleTestNotification = () => {
    playNotificationSound();
    triggerLocalNotification('Uji Coba Pengingat', 'Alhamdulillah, sistem pengingat sholat 5 menit berfungsi dengan baik!');
    
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3000);

    const now = new Date();
    const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setNotificationsHistory(prev => {
      const updated = [{
        time: timestamp,
        message: 'Uji coba pengingat sholat terkirim.',
        prayer: 'Test'
      }, ...prev].slice(0, 5);
      localStorage.setItem('sholat_notif_history', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div id="notification-manager-container" className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl">
            <Bell className="w-5 h-5 animate-swing" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">Sistem Pengingat Sholat (5 Menit)</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Bekerja di iOS (PWA), Android, & Desktop</p>
          </div>
        </div>
        
        {/* Toggle Sound */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            soundEnabled 
              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
          }`}
          title={soundEnabled ? "Suara Aktif" : "Suara Senyap"}
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Permission Request Alert Card */}
      {permission !== 'granted' ? (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 space-y-3">
          <div className="flex gap-2.5 items-start">
            <AlertCircle className="w-4.5 h-4.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold text-xs block">Izin Notifikasi Belum Aktif</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Agar notifikasi pengingat sholat 5 menit sebelum adzan bisa masuk di HP iOS/Android atau browser Anda, silakan ketuk tombol aktifkan izin di bawah ini.
              </p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
          >
            Minta Izin Notifikasi
          </button>
          
          <div className="text-[10px] text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-black/10 p-2 rounded-lg leading-relaxed">
            <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">💡 Tips untuk pengguna iOS (iPhone):</span>
            Tekan tombol <strong>"Share" (Bagikan)</strong> di safari, pilih <strong>"Add to Home Screen" (Tambahkan ke Layar Utama)</strong>, buka aplikasi dari layar utama, lalu klik tombol aktifkan izin di atas.
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
            <div>
              <span className="font-bold text-xs block">Izin Notifikasi Aktif</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Sistem siap mengirimkan pengingat 5 menit sebelum sholat.</p>
            </div>
          </div>
          <button
            onClick={handleTestNotification}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-[10px] rounded-lg cursor-pointer transition-colors"
          >
            {testSuccess ? 'Terkirim! ✔' : 'Uji Notifikasi'}
          </button>
        </div>
      )}

      {/* Prayer Times Monitor List */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <span>Jadwal Pengingat Aktif</span>
          <span>Waktu Adzan</span>
        </div>
        
        <div className="grid grid-cols-5 gap-1.5">
          {settings.schedules.map((schedule, index) => {
            const adzanMinutes = timeToMinutes(schedule.start);
            let reminderTime = '';
            if (adzanMinutes !== -1) {
              const remMin = adzanMinutes - 5;
              const h = String(Math.floor(remMin / 60)).padStart(2, '0');
              const m = String(remMin % 60).padStart(2, '0');
              reminderTime = `${h}:${m}`;
            }

            return (
              <div key={index} className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-850 text-center space-y-0.5">
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{schedule.name}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Reminder:</span>
                <span className="text-[11px] font-bold text-brand-500 font-mono block">{reminderTime}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Log */}
      {notificationsHistory.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Riwayat Pengingat Terakhir</span>
          <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
            {notificationsHistory.map((log, index) => (
              <div key={index} className="flex justify-between items-center text-[10px] p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-100/20">{log.prayer}</span>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{log.message}</span>
                </div>
                <span className="text-slate-400 font-mono text-[9px]">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
