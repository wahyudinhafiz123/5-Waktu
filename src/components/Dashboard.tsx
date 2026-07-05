import React, { useMemo } from 'react';
import { Users, Scan, Sun, Moon, Sunrise, Sunset, Flame, CalendarRange, Clock, Sparkles } from 'lucide-react';
import { Jamaah, Absensi, SholatType } from '../types';

interface DashboardProps {
  jamaahList: Jamaah[];
  absensiList: Absensi[];
  onNavigateToScan: () => void;
}

export default function Dashboard({ jamaahList, absensiList, onNavigateToScan }: DashboardProps) {
  // Get today's date in local YYYY-MM-DD format
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Total statistics
  const totalJamaah = jamaahList.length;
  const activeJamaah = jamaahList.filter(j => j.status_aktif).length;

  // Filter today's successful scans
  const todayScans = useMemo(() => {
    return absensiList.filter(a => a.tanggal === todayStr && a.status === 'Berhasil');
  }, [absensiList, todayStr]);

  const totalScanToday = todayScans.length;

  // Count by sholat for today
  const sholatCounts = useMemo(() => {
    const counts: Record<SholatType, number> = {
      Subuh: 0,
      Dzuhur: 0,
      Ashar: 0,
      Maghrib: 0,
      Isya: 0,
    };
    todayScans.forEach(scan => {
      if (counts[scan.jenis_sholat] !== undefined) {
        counts[scan.jenis_sholat]++;
      }
    });
    return counts;
  }, [todayScans]);

  // Last 10 scans
  const last10Scans = useMemo(() => {
    return absensiList.slice(0, 10);
  }, [absensiList]);

  // Weekly Attendance Chart Data (Past 7 Days)
  const weeklyData = useMemo(() => {
    const days = [];
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = weekdays[d.getDay()];
      
      const count = absensiList.filter(a => a.tanggal === dateStr && a.status === 'Berhasil').length;
      days.push({ dayName, count, dateStr });
    }
    return days;
  }, [absensiList]);

  // Monthly Attendance Chart Data (Past 4 Weeks)
  const monthlyData = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const startD = new Date();
      startD.setDate(startD.getDate() - (i * 7 + 6));
      const endD = new Date();
      endD.setDate(endD.getDate() - (i * 7));
      
      const count = absensiList.filter(a => {
        const d = new Date(a.tanggal);
        return d >= startD && d <= endD && a.status === 'Berhasil';
      }).length;
      
      weeks.push({ weekLabel: `Mgg ${4 - i}`, count });
    }
    return weeks;
  }, [absensiList]);

  // Max counts for scale calculation
  const maxWeeklyCount = Math.max(...weeklyData.map(d => d.count), 5);
  const maxMonthlyCount = Math.max(...monthlyData.map(d => d.count), 5);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner - Clean Utility Style */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 border-l-4 border-l-brand-500 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">Assalamu'alaikum, Admin</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
              Selamat datang kembali di Panel Monitoring Kehadiran Jamaah. Semua sistem absensi sholat berjalan normal dan siap digunakan.
            </p>
          </div>
          <button
            id="dashboard-scan-now-btn"
            onClick={onNavigateToScan}
            className="self-start md:self-center bg-brand-50 hover:bg-brand-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-brand-600 dark:text-brand-400 px-5 py-2.5 rounded-xl text-xs font-semibold border border-brand-200/40 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Scan className="w-4 h-4" />
            Buka Scanner Kamera
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Total Jamaah */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-1 lg:col-span-2 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Jamaah</span>
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white font-display">{totalJamaah}</span>
            <span className="text-xs text-brand-600 dark:text-brand-400 font-medium block">● {activeJamaah} Jamaah Aktif</span>
          </div>
          <div className="p-3 bg-brand-50 dark:bg-slate-800/60 rounded-xl text-brand-600 dark:text-brand-400 border border-brand-100/20">
            <Users className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Scan Hari Ini */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-1 lg:col-span-2 shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Scan Hari Ini</span>
            <span className="text-3xl font-extrabold text-slate-950 dark:text-white font-display">{totalScanToday}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Hari ini: {todayStr}</span>
          </div>
          <div className="p-3 bg-brand-50 dark:bg-slate-800/60 rounded-xl text-brand-600 dark:text-brand-400 border border-brand-100/20">
            <Scan className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Bento sholat counters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 lg:col-span-3 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">Kehadiran Sholat Hari Ini</span>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Subuh', icon: Sunrise, count: sholatCounts.Subuh, colorClass: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Dzuhur', icon: Sun, count: sholatCounts.Dzuhur, colorClass: 'text-amber-600 dark:text-amber-400' },
              { label: 'Ashar', icon: Flame, count: sholatCounts.Ashar, colorClass: 'text-orange-600 dark:text-orange-400' },
              { label: 'Maghrib', icon: Sunset, count: sholatCounts.Maghrib, colorClass: 'text-rose-600 dark:text-rose-400' },
              { label: 'Isya', icon: Moon, count: sholatCounts.Isya, colorClass: 'text-purple-600 dark:text-purple-400' },
            ].map((prayer, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/80">
                <prayer.icon className={`w-4 h-4 ${prayer.colorClass} mb-1`} />
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">{prayer.label}</span>
                <span className="text-lg font-bold text-brand-500 mt-0.5">{prayer.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 font-display">Grafik Kehadiran Mingguan</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Statistik kehadiran 7 hari terakhir</p>
            </div>
            <CalendarRange className="w-5 h-5 text-slate-400" />
          </div>

          {/* SVG Bar Chart */}
          <div className="relative h-48 w-full flex items-end justify-between pt-6 px-2">
            {weeklyData.map((day, i) => {
              const heightPercent = `${(day.count / maxWeeklyCount) * 80}%`;
              return (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-mono shadow-md z-20 pointer-events-none">
                    {day.count} Absen
                  </div>
                  {/* Bar */}
                  <div className="w-8 sm:w-10 bg-slate-50 dark:bg-slate-800/40 rounded-t-lg h-36 flex items-end overflow-hidden relative">
                    <div 
                      className="w-full bg-brand-500 dark:bg-brand-600 rounded-t-lg transition-all duration-500 ease-out" 
                      style={{ height: heightPercent }}
                    />
                  </div>
                  {/* Label */}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2">{day.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 font-display">Grafik Kehadiran Bulanan</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Kehadiran bulanan (4 minggu terakhir)</p>
            </div>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>

          {/* SVG Line/Area Chart Representation */}
          <div className="relative h-48 w-full pt-6 flex items-end justify-between px-4">
            {monthlyData.map((week, i) => {
              const heightPercent = `${(week.count / maxMonthlyCount) * 75}%`;
              return (
                <div key={i} className="flex flex-col items-center flex-1 group relative">
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-mono shadow-md z-20 pointer-events-none">
                    {week.count} Absen
                  </div>
                  {/* Dot & Line representations */}
                  <div className="h-36 w-full flex flex-col justify-end items-center relative">
                    {/* Anchor dot */}
                    <div 
                      className="w-3.5 h-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 border-2 border-white dark:border-slate-800 shadow-md absolute z-10 hover:scale-125 transition-transform" 
                      style={{ bottom: heightPercent }}
                    />
                    {/* Support vertical line */}
                    <div 
                      className="w-0.5 bg-dashed border-l border-emerald-500/20 absolute bottom-0 top-0 pointer-events-none"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2">{week.weekLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Last 10 Scans Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 font-display">10 Scan Terakhir</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Data riwayat scan waktu nyata paling baru</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800/80">
                <th className="px-6 py-3.5">Nama Jamaah</th>
                <th className="px-6 py-3.5">Tanggal & Jam</th>
                <th className="px-6 py-3.5">Sholat</th>
                <th className="px-6 py-3.5">Device</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {last10Scans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-mono text-xs">
                    Belum ada data absensi hari ini.
                  </td>
                </tr>
              ) : (
                last10Scans.map((scan, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{scan.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{scan.id_jamaah}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 dark:text-slate-300 font-medium">{scan.jam}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{scan.tanggal}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        scan.jenis_sholat === 'Subuh' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                        scan.jenis_sholat === 'Dzuhur' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                        scan.jenis_sholat === 'Ashar' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' :
                        scan.jenis_sholat === 'Maghrib' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' :
                        'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {scan.jenis_sholat}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 max-w-[150px] truncate">
                      {scan.device}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        scan.status === 'Berhasil' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                        scan.status === 'Sudah Absen' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                        'bg-red-50 dark:bg-red-950/20 text-red-600'
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
