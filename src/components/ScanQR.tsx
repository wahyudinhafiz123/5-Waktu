import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Scan, Camera, Check, X, ShieldAlert, AlertCircle, Clock, 
  MapPin, HelpCircle, Phone, Smartphone, User, ShieldCheck, HeartPulse
} from 'lucide-react';
import { Jamaah, Absensi, SholatSchedule, SholatType } from '../types';
import { determineSholatTime } from '../lib/db';

interface ScanQRProps {
  jamaahList: Jamaah[];
  schedules: SholatSchedule[];
  durasiTelat?: number;
  onAddAbsensi: (absensi: Absensi) => Promise<boolean>;
}

export default function ScanQR({ jamaahList, schedules, durasiTelat, onAddAbsensi }: ScanQRProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment');
  
  // Last scanned details
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    jamaah?: Jamaah;
    time?: string;
    prayer?: SholatType;
  } | null>(null);

  // Manual Sholat Time Selector Override
  const [manualOverride, setManualOverride] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<SholatType | ''>('');

  const qrReaderId = 'qr-reader';
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Play synthetic pleasant success chime
  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      
      setTimeout(() => {
        const ctx2 = new AudioCtx();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx2.currentTime); // E5
        gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.005, ctx2.currentTime + 0.4);
        osc2.start(ctx2.currentTime);
        osc2.stop(ctx2.currentTime + 0.4);
      }, 100);
    } catch (e) {
      console.warn('Audio not supported or blocked by browser policy:', e);
    }
  };

  // Play synthetic buzzer error sound
  const playErrorSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime); // G3
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio not supported:', e);
    }
  };

  // Automatically determine current prayer time
  const currentPrayerInfo = useMemo(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    return {
      time: timeStr,
      prayer: determineSholatTime(timeStr, schedules),
    };
  }, [schedules]);

  // Primary function triggered when QR successfully scans
  const handleScanSuccess = async (qrText: string) => {
    // 1. Stop scanner immediately to avoid multiple rapid duplicate reads
    await stopScanning();

    // 2. Identify the target prayer
    let prayer: SholatType | null = null;
    if (manualOverride && selectedPrayer) {
      prayer = selectedPrayer as SholatType;
    } else {
      prayer = currentPrayerInfo.prayer;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // Check if sholat time is determined
    if (!prayer) {
      playErrorSound();
      setScanResult({
        success: false,
        message: 'Di luar rentang waktu sholat yang ditentukan. Silakan pilih jenis sholat manual di panel bawah jika diperlukan.',
        time: timeStr
      });
      setIsPopupOpen(true);
      return;
    }

    // 3. Locate the jamaah
    const jamaah = jamaahList.find(j => j.id.trim() === qrText.trim());

    if (!jamaah) {
      playErrorSound();
      setScanResult({
        success: false,
        message: `ID Jamaah "${qrText}" tidak terdaftar di database masjid.`,
        time: timeStr,
        prayer
      });
      setIsPopupOpen(true);
      return;
    }

    if (!jamaah.status_aktif) {
      playErrorSound();
      setScanResult({
        success: false,
        message: `Jamaah "${jamaah.nama}" terdaftar namun status keanggotaannya NON-AKTIF.`,
        jamaah,
        time: timeStr,
        prayer
      });
      setIsPopupOpen(true);
      return;
    }

    // 4. Validate GPS if available (optional mock data)
    let gps = '';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gps = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        },
        () => {}
      );
    }

    // Determine if late (Telat) or on-time (Berhasil)
    let finalStatus: 'Berhasil' | 'Telat' = 'Berhasil';
    const activeSchedule = schedules.find(s => s.name === prayer);
    if (activeSchedule) {
      const [startH, startM] = activeSchedule.start.split(':').map(Number);
      const [nowH, nowM] = timeStr.slice(0, 5).split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const nowMinutes = nowH * 60 + nowM;
      
      let diffMinutes = nowMinutes - startMinutes;
      if (diffMinutes < 0) {
        // Handle overnight wrap around just in case
        diffMinutes += 1440;
      }
      
      const lateThreshold = durasiTelat !== undefined ? durasiTelat : 15;
      if (diffMinutes > lateThreshold) {
        finalStatus = 'Telat';
      }
    }

    // 5. Submit to Parent App to save record
    const absensiRecord: Absensi = {
      id: `AB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tanggal: todayStr,
      jam: timeStr,
      jenis_sholat: prayer,
      id_jamaah: jamaah.id,
      nama: jamaah.nama,
      status: finalStatus,
      device: `Kamera HP - ${navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iOS' : 'Desktop'}`,
      lokasi_gps: gps || undefined,
    };

    const result = await onAddAbsensi(absensiRecord);

    if (result) {
      // SUCCESS!
      playSuccessSound();
      setScanResult({
        success: true,
        message: finalStatus === 'Telat'
          ? 'Absensi Anda berhasil dicatat (Status: TELAT).'
          : 'Absensi Anda berhasil dicatat.',
        jamaah,
        time: timeStr,
        prayer
      });
    } else {
      // DUPLICATE OR ALREADY SCANNED
      playErrorSound();
      setScanResult({
        success: false,
        message: 'Absensi sudah tercatat pada waktu sholat yang sama hari ini.',
        jamaah,
        time: timeStr,
        prayer
      });
    }

    setIsPopupOpen(true);
  };

  // Start HTML5 Camera QR Code Capture
  const startScanning = async () => {
    setScannerError('');
    setIsScanning(true);
    
    // Ensure element is created in DOM before scanning starts
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrReaderId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: cameraMode }, // Camera dinamik berdasarkan state
          {
            fps: 12,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Silently parse scanning frames without logging error spams
          }
        );
      } catch (err: any) {
        console.error('Failed to start camera scan:', err);
        setScannerError(err.message || 'Kamera tidak dapat diakses. Pastikan izin kamera diberikan.');
        setIsScanning(false);
      }
    }, 100);
  };

  // Toggle Camera Mode dynamically on the fly
  const handleToggleCamera = async () => {
    const nextMode = cameraMode === 'environment' ? 'user' : 'environment';
    setCameraMode(nextMode);

    if (isScanning && html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner during camera toggle:', e);
      }

      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(qrReaderId);
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: nextMode },
            {
              fps: 12,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } catch (err: any) {
          console.error('Failed to restart scanner with new facingMode:', err);
          setScannerError(err.message || 'Kamera tidak dapat diakses. Pastikan izin kamera diberikan.');
          setIsScanning(false);
        }
      }, 150);
    }
  };

  // Stop QR Code Scanner
  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping html5-qrcode scanner:', e);
      }
    }
    setIsScanning(false);
  };

  // Cleanup camera scanning stream on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  // Popup closer resets the camera to scan again automatically
  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setScanResult(null);
    startScanning(); // restart scanning again automatically
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
        <div className="mx-auto w-12 h-12 bg-brand-50 dark:bg-slate-950/40 rounded-xl flex items-center justify-center text-brand-500 dark:text-brand-400 border border-brand-100 dark:border-brand-900/40">
          <Scan className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-display">Scan Absensi Jamaah</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Pindai Kartu QR Code Jamaah menggunakan kamera HP belakang.</p>
        </div>

        {/* Current Active Prayer Info Banner */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-850 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>Jam Server: <strong className="font-mono">{currentPrayerInfo.time}</strong></span>
          </div>
          <div>
            {currentPrayerInfo.prayer ? (
              <span className="bg-brand-50 dark:bg-slate-800 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-lg font-semibold text-[10px] uppercase tracking-wider">
                Sholat: {currentPrayerInfo.prayer}
              </span>
            ) : (
              <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-lg font-semibold text-[10px] uppercase tracking-wider">
                Di Luar Waktu Sholat
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Scanner Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        {scannerError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div>
              <span className="font-bold">Akses Kamera Gagal:</span> {scannerError}
              <p className="mt-1 text-[10px] text-slate-400">Pastikan Anda membuka website ini menggunakan HTTPS, memberikan izin akses kamera, dan tidak ada aplikasi lain yang sedang mengunci kamera.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center space-y-4">
          {isScanning ? (
            <div className="w-full relative">
              {/* Target scan border design overlays */}
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-emerald-400/50 rounded-2xl relative">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md" />
                  
                  {/* Scanning pulse line */}
                  <div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/80 animate-bounce top-1/2" />
                </div>
              </div>

              {/* QR Reader Area */}
              <div id={qrReaderId} className="w-full h-80 bg-black rounded-2xl overflow-hidden shadow-inner relative" />

              <div className="flex gap-2 mt-4">
                <button
                  id="stop-scanning-btn"
                  onClick={stopScanning}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                >
                  Hentikan Kamera
                </button>
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4 text-brand-500" />
                  Ganti Kamera ({cameraMode === 'environment' ? 'Belakang' : 'Depan'})
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-4 w-full">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-brand-50 dark:bg-slate-950/40 border border-brand-100 dark:border-brand-900/40 rounded-full flex items-center justify-center text-brand-500 dark:text-brand-400 mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="absolute inset-0 rounded-full border border-brand-500/30 pulse-ring pointer-events-none" />
              </div>
              <div>
                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">Kamera Sedang Non-Aktif</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Klik tombol di bawah untuk mengaktifkan kamera dan mulai memindai kartu jamaah secara langsung.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  id="start-scanning-btn"
                  onClick={startScanning}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4.5 h-4.5" />
                  Aktifkan Kamera Scanner
                </button>
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 font-semibold text-xs px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-brand-500" />
                  Kamera: {cameraMode === 'environment' ? 'Belakang (Rear)' : 'Depan (Front)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Prayer Time override settings (for testing/override flexibility) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <button
          onClick={() => setManualOverride(!manualOverride)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <span>Abaikan Deteksi Sholat Otomatis (Uji Coba)</span>
          <span className={`px-2 py-0.5 rounded text-[9px] ${manualOverride ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            {manualOverride ? 'Manual AKTIF' : 'Otomatis Server'}
          </span>
        </button>

        {manualOverride && (
          <div className="pt-2 animate-in fade-in duration-200">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Sholat Absensi Manual</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'] as SholatType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPrayer(p)}
                  className={`py-2 text-[10px] font-bold rounded-lg border cursor-pointer text-center transition-all ${
                    selectedPrayer === p
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RESULT MODAL POPUP */}
      {isPopupOpen && scanResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in fade-in zoom-in duration-300">
            {/* Success/Error Header Banner */}
            <div className={`px-6 py-6 text-center text-white flex flex-col items-center ${
              scanResult.success 
                ? 'bg-emerald-500 dark:bg-emerald-600' 
                : scanResult.message.includes('sudah tercatat') 
                ? 'bg-amber-500 dark:bg-amber-600' 
                : 'bg-rose-500 dark:bg-rose-600'
            }`}>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center shadow-inner mb-3">
                {scanResult.success ? (
                  <Check className="w-10 h-10 text-white" />
                ) : scanResult.message.includes('sudah tercatat') ? (
                  <Clock className="w-10 h-10 text-white" />
                ) : (
                  <X className="w-10 h-10 text-white" />
                )}
              </div>
              <h3 className="font-bold text-lg font-display tracking-tight">
                {scanResult.success 
                  ? 'ABSENSI BERHASIL!' 
                  : scanResult.message.includes('sudah tercatat') 
                  ? 'SUDAH ABSEN' 
                  : 'ABSENSI GAGAL'}
              </h3>
              <p className="text-white/80 text-xs mt-0.5">{scanResult.message}</p>
            </div>

            {/* Scanned Jamaah Details Box */}
            <div className="p-6 space-y-4">
              {scanResult.jamaah ? (
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-2 border-brand-500/30 flex-shrink-0 flex items-center justify-center">
                    {scanResult.jamaah.foto ? (
                      <img src={scanResult.jamaah.foto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">NAMA JAMAAH</span>
                    <span className="font-bold text-slate-800 dark:text-white block leading-snug truncate">{scanResult.jamaah.nama}</span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">ID: {scanResult.jamaah.id}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-slate-400 text-xs font-mono">
                  Data Jamaah tidak valid / tidak dikenal.
                </div>
              )}

              {/* Time & Prayer Info Row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block mb-0.5">WAKTU SCAN</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{scanResult.time}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block mb-0.5">JENIS SHOLAT</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{scanResult.prayer || '-'}</span>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                id="scan-popup-dismiss-btn"
                onClick={handleClosePopup}
                className="w-full mt-2 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Tutup & Scan Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
