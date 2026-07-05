import React, { useState, useMemo } from 'react';
import { 
  Search, Calendar, Filter, Download, Printer, RefreshCw, Clock, 
  MapPin, CheckCircle, HelpCircle, X, ShieldAlert 
} from 'lucide-react';
import { Absensi, SholatType } from '../types';

interface RiwayatAbsensiProps {
  absensiList: Absensi[];
}

export default function RiwayatAbsensi({ absensiList }: RiwayatAbsensiProps) {
  // Filter states
  const [search, setSearch] = useState('');
  const [filterPrayer, setFilterPrayer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterPrayer('');
    setFilterStatus('');
    setFilterDate('');
  };

  // Filter & Search computation
  const filteredList = useMemo(() => {
    return absensiList.filter(item => {
      const matchSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || 
                          item.id_jamaah.toLowerCase().includes(search.toLowerCase()) ||
                          item.id.toLowerCase().includes(search.toLowerCase());
      const matchPrayer = filterPrayer ? item.jenis_sholat === filterPrayer : true;
      const matchStatus = filterStatus ? item.status === filterStatus : true;
      const matchDate = filterDate ? item.tanggal === filterDate : true;

      return matchSearch && matchPrayer && matchStatus && matchDate;
    });
  }, [absensiList, search, filterPrayer, filterStatus, filterDate]);

  // EXPORT RIWAYAT TO CSV (Excel Compatible)
  const handleExportCSV = () => {
    let csv = 'ID Absensi,Tanggal,Jam,Jenis Sholat,ID Jamaah,Nama Jamaah,Status,Device,Lokasi GPS\n';
    
    filteredList.forEach(item => {
      csv += `"${item.id}","${item.tanggal}","${item.jam}","${item.jenis_sholat}","${item.id_jamaah}","${item.nama.replace(/"/g, '""')}","${item.status}","${item.device}","${item.lokasi_gps || '-'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Riwayat_Absensi_Sholat_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT RIWAYAT LIST (Print / PDF)
  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredList.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.tanggal} ${item.jam}</td>
        <td>${item.jenis_sholat}</td>
        <td>${item.id_jamaah}</td>
        <td>${item.nama}</td>
        <td>${item.status}</td>
        <td>${item.device}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Kehadiran Absensi Sholat</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 2px; }
            h3 { text-align: center; font-size: 14px; margin-top: 0; color: #16a34a; }
            p { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .badge { font-weight: bold; padding: 2px 4px; border-radius: 4px; font-size: 10px; }
          </style>
        </head>
        <body>
          <h2>LAPORAN KEHADIRAN ABSENSI SHOLAT</h2>
          <h3>Masjid Agung Al-Ikhlas</h3>
          <p>Laporan diringkas dari: ${filterDate || 'Semua Tanggal'} | Jenis Sholat: ${filterPrayer || 'Semua'} | Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu Scan</th>
                <th>Sholat</th>
                <th>ID Jamaah</th>
                <th>Nama Jamaah</th>
                <th>Status</th>
                <th>Perangkat</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="7" style="text-align:center;">Tidak ada data riwayat absensi.</td></tr>'}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-display">Riwayat Absensi</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Lihat, saring, dan ekspor seluruh log pencatatan absensi jamaah.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="riwayat-export-btn"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor Excel (CSV)
          </button>
          <button
            id="riwayat-print-btn"
            onClick={handlePrintList}
            className="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by name/id */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="riwayat-search-input"
              type="text"
              placeholder="Cari ID Jamaah / Nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 transition-colors dark:text-slate-200"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              id="riwayat-date-input"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 transition-colors dark:text-slate-200 text-slate-500 dark:text-slate-300"
            />
          </div>

          {/* Sholat Select */}
          <div>
            <select
              id="riwayat-prayer-select"
              value={filterPrayer}
              onChange={(e) => setFilterPrayer(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-300 transition-colors"
            >
              <option value="">Semua Sholat</option>
              <option value="Subuh">Subuh</option>
              <option value="Dzuhur">Dzuhur</option>
              <option value="Ashar">Ashar</option>
              <option value="Maghrib">Maghrib</option>
              <option value="Isya">Isya</option>
            </select>
          </div>

          {/* Status Select */}
          <div>
            <select
              id="riwayat-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-300 transition-colors"
            >
              <option value="">Semua Status</option>
              <option value="Berhasil">Berhasil</option>
              <option value="Telat">Telat</option>
              <option value="Sudah Absen">Sudah Absen</option>
              <option value="Gagal">Gagal</option>
            </select>
          </div>
        </div>

        {/* Filters Active Display */}
        {(search || filterDate || filterPrayer || filterStatus) && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-3 text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
              <span className="font-semibold text-slate-400">Penyaringan aktif:</span>
              {search && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">Cari "{search}"</span>}
              {filterDate && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">Tanggal: {filterDate}</span>}
              {filterPrayer && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">Sholat: {filterPrayer}</span>}
              {filterStatus && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">Status: {filterStatus}</span>}
            </div>
            <button
              id="reset-filters-btn"
              onClick={handleResetFilters}
              className="text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          </div>
        )}
      </div>

      {/* Main Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 font-mono">DITEMUKAN {filteredList.length} REKOR ABSENSI</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800/80">
                <th className="px-6 py-3.5">ID Absen</th>
                <th className="px-6 py-3.5">Tanggal & Jam</th>
                <th className="px-6 py-3.5">Jamaah</th>
                <th className="px-6 py-3.5">Sholat</th>
                <th className="px-6 py-3.5">Perangkat & GPS</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-mono text-xs">
                    Belum ada riwayat absensi yang tersimpan atau cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-400">{item.id.length > 15 ? `${item.id.slice(0, 12)}...` : item.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{item.jam}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.tanggal}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{item.nama}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {item.id_jamaah}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.jenis_sholat === 'Subuh' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                        item.jenis_sholat === 'Dzuhur' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                        item.jenis_sholat === 'Ashar' ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400' :
                        item.jenis_sholat === 'Maghrib' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' :
                        'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {item.jenis_sholat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={item.device}>
                        {item.device}
                      </div>
                      {item.lokasi_gps && (
                        <div className="text-[10px] text-brand-600 dark:text-brand-400 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{item.lokasi_gps}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                        item.status === 'Berhasil' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                        item.status === 'Telat' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                        item.status === 'Sudah Absen' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' :
                        'bg-red-50 dark:bg-red-950/20 text-red-600'
                      }`}>
                        {item.status}
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
