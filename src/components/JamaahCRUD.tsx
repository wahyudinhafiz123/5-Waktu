import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Printer, Download, Upload, 
  X, Check, AlertCircle, RefreshCw, UserCheck, UserX, Image, FileDown, ShieldAlert
} from 'lucide-react';
import { Jamaah } from '../types';

interface JamaahCRUDProps {
  jamaahList: Jamaah[];
  onSave: (jamaah: Jamaah) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function JamaahCRUD({ jamaahList, onSave, onDelete }: JamaahCRUDProps) {
  // UI states
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Active Jamaah being added/edited
  const [editingJamaah, setEditingJamaah] = useState<Partial<Jamaah> | null>(null);
  const [activeQRJamaah, setActiveQRJamaah] = useState<Jamaah | null>(null);
  const [qrSize, setQrSize] = useState<'card' | 'a4' | 'label'>('card');
  
  // CSV Import States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return jamaahList.filter(j => {
      const matchSearch = j.nama.toLowerCase().includes(search.toLowerCase()) || 
                          j.id.toLowerCase().includes(search.toLowerCase()) ||
                          j.nik.includes(search);
      const matchGender = filterGender ? j.jenis_kelamin === filterGender : true;
      const matchStatus = filterStatus ? 
                          (filterStatus === 'aktif' ? j.status_aktif === true : j.status_aktif === false) 
                          : true;
      return matchSearch && matchGender && matchStatus;
    });
  }, [jamaahList, search, filterGender, filterStatus]);

  // Handle Foto upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert('File foto terlalu besar. Maksimal 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingJamaah(prev => ({ ...prev, foto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger form open
  const openAddForm = () => {
    // Generate next unique ID e.g. JM006
    const num = jamaahList.reduce((acc, curr) => {
      const match = curr.id.match(/JM(\d+)/);
      if (match) {
        const idNum = parseInt(match[1]);
        return idNum > acc ? idNum : acc;
      }
      return acc;
    }, 5);
    const nextId = `JM${String(num + 1).padStart(3, '0')}`;

    setEditingJamaah({
      id: nextId,
      nama: '',
      nik: '',
      jenis_kelamin: 'Laki-laki',
      alamat: '',
      no_hp: '',
      status_aktif: true,
      qr_code: nextId,
      tanggal_daftar: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditForm = (jamaah: Jamaah) => {
    setEditingJamaah({ ...jamaah });
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJamaah || !editingJamaah.id || !editingJamaah.nama || !editingJamaah.nik) {
      alert('Nama Lengkap dan NIK wajib diisi.');
      return;
    }

    const success = await onSave(editingJamaah as Jamaah);
    if (success) {
      setIsModalOpen(false);
      setEditingJamaah(null);
    } else {
      alert('Gagal menyimpan data.');
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jamaah "${name}"?\nSemua riwayat absensinya juga tidak akan terafiliasi.`)) {
      const success = await onDelete(id);
      if (!success) {
        alert('Gagal menghapus data.');
      }
    }
  };

  // EXPORT TO EXCEL / CSV
  const handleExportCSV = () => {
    // CSV Header
    let csv = 'ID Jamaah,Nama Lengkap,NIK,Jenis Kelamin,Alamat,No HP,Status Aktif,Tanggal Daftar\n';
    
    // Add rows
    filteredList.forEach(j => {
      csv += `"${j.id}","${j.nama.replace(/"/g, '""')}","'${j.nik}","${j.jenis_kelamin}","${j.alamat.replace(/"/g, '""')}","${j.no_hp}","${j.status_aktif ? 'Aktif' : 'Tidak Aktif'}","${j.tanggal_daftar}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Jamaah_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT LIST (As PDF Export fallback)
  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredList.map(j => `
      <tr>
        <td>${j.id}</td>
        <td>${j.nama}</td>
        <td>${j.nik}</td>
        <td>${j.jenis_kelamin}</td>
        <td>${j.no_hp}</td>
        <td>${j.status_aktif ? 'Aktif' : 'Nonaktif'}</td>
        <td>${j.tanggal_daftar}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Daftar Jamaah Masjid</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 5px; }
            p { text-align: center; font-size: 12px; color: #555; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>DAFTAR JAMAAH MASJID</h2>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Lengkap</th>
                <th>NIK</th>
                <th>L/P</th>
                <th>No HP</th>
                <th>Status</th>
                <th>Tgl Daftar</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CSV IMPORT PROCESSOR
  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    if (!csvText.trim()) {
      setImportError('Teks CSV kosong.');
      return;
    }

    try {
      const lines = csvText.split('\n');
      let count = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple parse CSV line splitting by commas outside quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 5) continue;

        const clean = (val: string) => val.replace(/^"|"$/g, '').trim();

        const id = clean(matches[0]);
        const nama = clean(matches[1]);
        const nik = clean(matches[2]).replace(/^'/, ''); // Strip excel text quotes
        const jenis_kelamin = clean(matches[3]) as 'Laki-laki' | 'Perempuan';
        const alamat = clean(matches[4]);
        const no_hp = matches[5] ? clean(matches[5]) : '';

        if (!id || !nama || !nik) continue;

        onSave({
          id,
          nama,
          nik,
          jenis_kelamin: jenis_kelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          alamat,
          no_hp,
          status_aktif: true,
          qr_code: id,
          tanggal_daftar: new Date().toISOString().split('T')[0]
        });
        count++;
      }

      setImportSuccess(`Berhasil mengimpor ${count} data jamaah!`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 1500);

    } catch (err) {
      setImportError('Format CSV tidak didukung atau rusak.');
    }
  };

  // PRINT QR CODE ACTION
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !activeQRJamaah) return;

    const qrUrl = `https://quickchart.io/qr?text=${activeQRJamaah.id}&size=250&margin=1`;
    let sizeStyle = '';

    if (qrSize === 'card') {
      sizeStyle = `
        .qr-box { width: 320px; border: 2px solid #16a34a; border-radius: 12px; padding: 15px; text-align: center; font-family: sans-serif; background: #fff; margin: auto; }
        .qr-title { font-size: 14px; font-weight: bold; color: #16a34a; margin-bottom: 2px; }
        .qr-subtitle { font-size: 9px; color: #666; margin-bottom: 12px; text-transform: uppercase; }
        .qr-code-img { width: 140px; height: 140px; margin-bottom: 8px; }
        .qr-name { font-size: 13px; font-weight: bold; color: #333; margin-top: 5px; }
        .qr-id { font-size: 11px; font-family: monospace; color: #666; margin-top: 2px; }
      `;
    } else if (qrSize === 'a4') {
      sizeStyle = `
        .qr-box { width: 500px; padding: 40px; text-align: center; font-family: sans-serif; background: #fff; margin: auto; border: 1px solid #ddd; }
        .qr-title { font-size: 22px; font-weight: bold; color: #16a34a; }
        .qr-subtitle { font-size: 12px; color: #666; margin-bottom: 30px; }
        .qr-code-img { width: 300px; height: 300px; }
        .qr-name { font-size: 20px; font-weight: bold; margin-top: 20px; }
        .qr-id { font-size: 16px; font-family: monospace; color: #555; }
      `;
    } else { // label
      sizeStyle = `
        .qr-box { width: 150px; text-align: center; font-family: sans-serif; padding: 5px; border: 1px dashed #ccc; margin: auto; }
        .qr-title { display: none; }
        .qr-code-img { width: 100px; height: 100px; }
        .qr-name { font-size: 9px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr-id { font-size: 8px; font-family: monospace; }
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR - ${activeQRJamaah.nama}</title>
          <style>
            body { background: #f9f9f9; padding: 50px 20px; display: flex; align-items: center; justify-content: center; }
            ${sizeStyle}
            @media print {
              body { background: #fff; padding: 0; }
              .qr-box { border: ${qrSize === 'card' ? '2px solid #16a34a' : 'none'}; }
            }
          </style>
        </head>
        <body>
          <div class="qr-box">
            <div class="qr-title">KARTU ANGGOTA JAMAAH</div>
            <div class="qr-subtitle">Masjid Agung Al-Ikhlas</div>
            <img class="qr-code-img" src="${qrUrl}" alt="QR" />
            <div class="qr-name">${activeQRJamaah.nama}</div>
            <div class="qr-id">ID: ${activeQRJamaah.id}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
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
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-display">Master Data Jamaah</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Kelola informasi jamaah, cetak QR Code, ekspor dan impor data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="jamaah-add-btn"
            onClick={openAddForm}
            className="flex-1 sm:flex-initial bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jamaah
          </button>
          <button
            id="jamaah-import-btn"
            onClick={() => setIsImportOpen(true)}
            className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            id="jamaah-export-btn"
            onClick={handleExportCSV}
            className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            id="jamaah-print-list-btn"
            onClick={handlePrintList}
            className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak List
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="jamaah-search"
            type="text"
            placeholder="Cari ID, Nama, atau NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 transition-colors dark:text-slate-200"
          />
        </div>

        <div>
          <select
            id="filter-gender"
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-300 transition-colors"
          >
            <option value="">Semua Jenis Kelamin</option>
            <option value="Laki-laki">Laki-Laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </div>

        <div>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-300 transition-colors"
          >
            <option value="">Semua Status Aktif</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-Aktif</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800/80">
                <th className="px-6 py-3.5">Profil</th>
                <th className="px-6 py-3.5">ID & NIK</th>
                <th className="px-6 py-3.5">L/P</th>
                <th className="px-6 py-3.5">No HP & Alamat</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-mono text-xs">
                    Tidak ada data jamaah yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600">
                          {j.foto ? (
                            <img src={j.foto} alt="Foto" className="w-full h-full object-cover" />
                          ) : (
                            <Image className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">{j.nama}</div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Daftar: {j.tanggal_daftar}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-slate-700 px-2 py-0.5 rounded-md inline-block">
                        {j.id}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{j.nik}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        j.jenis_kelamin === 'Laki-laki' 
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600' 
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                      }`}>
                        {j.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">{j.no_hp || '-'}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5" title={j.alamat}>
                        {j.alamat || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                        j.status_aktif 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {j.status_aktif ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Aktif
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" /> Non-Aktif
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveQRJamaah(j);
                            setIsQRModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Cetak/Lihat QR Code"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(j)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Jamaah"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(j.id, j.nama)}
                          className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Jamaah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT */}
      {isModalOpen && editingJamaah && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-brand-500 dark:bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base font-display">
                {editingJamaah.id && jamaahList.some(j => j.id === editingJamaah.id) ? 'Edit Data Jamaah' : 'Tambah Jamaah Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ID Jamaah (Kunci)</label>
                  <input
                    type="text"
                    value={editingJamaah.id || ''}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">NIK (Nomor Induk)</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="Masukkan 16 digit NIK"
                    value={editingJamaah.nik || ''}
                    onChange={(e) => setEditingJamaah(prev => ({ ...prev, nik: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: H. Fulan bin Fulan"
                  value={editingJamaah.nama || ''}
                  onChange={(e) => setEditingJamaah(prev => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                  <select
                    value={editingJamaah.jenis_kelamin || 'Laki-laki'}
                    onChange={(e) => setEditingJamaah(prev => ({ ...prev, jenis_kelamin: e.target.value as 'Laki-laki' | 'Perempuan' }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">No. HP (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={editingJamaah.no_hp || ''}
                    onChange={(e) => setEditingJamaah(prev => ({ ...prev, no_hp: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Alamat Rumah</label>
                <textarea
                  rows={2}
                  placeholder="Masukkan alamat lengkap RT/RW"
                  value={editingJamaah.alamat || ''}
                  onChange={(e) => setEditingJamaah(prev => ({ ...prev, alamat: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-500 dark:text-slate-200"
                />
              </div>

              {/* Upload Foto (Base64) */}
              <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Foto Profil Jamaah</span>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                    {editingJamaah.foto ? (
                      <img src={editingJamaah.foto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs px-3 py-2 rounded-xl transition-all"
                    >
                      Unggah Foto
                    </button>
                    {editingJamaah.foto && (
                      <button
                        type="button"
                        onClick={() => setEditingJamaah(prev => ({ ...prev, foto: undefined }))}
                        className="text-red-500 hover:text-red-600 text-xs block pl-1"
                      >
                        Hapus Foto
                      </button>
                    )}
                    <span className="block text-[10px] text-slate-400">Rekomendasi rasio 1:1, maks 1.5MB</span>
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Status Keanggotaan Aktif</span>
                  <span className="text-[10px] text-slate-400">Non-aktifkan jika jamaah sudah pindah domisili</span>
                </div>
                <button
                  type="button"
                  id="status-toggle-btn"
                  onClick={() => setEditingJamaah(prev => ({ ...prev, status_aktif: !prev.status_aktif }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editingJamaah.status_aktif ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${editingJamaah.status_aktif ? 'left-6.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="save-jamaah-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/10 transition-colors cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT QR CODE LAYOUT */}
      {isQRModalOpen && activeQRJamaah && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-brand-500 dark:bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base font-display">Cetak QR Code Anggota</h3>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider">{activeQRJamaah.nama}</p>
              </div>
              <button 
                onClick={() => setIsQRModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 text-center">
              {/* QR Preview Frame */}
              <div className="mx-auto bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 inline-block">
                <img 
                  src={`https://quickchart.io/qr?text=${activeQRJamaah.id}&size=200&margin=1`} 
                  alt="QR Code" 
                  className="w-40 h-40 object-contain mx-auto bg-white p-2 rounded-xl border border-slate-100" 
                />
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{activeQRJamaah.nama}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block mt-1">ID: {activeQRJamaah.id}</span>
                </div>
              </div>

              {/* Layout options */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ukuran/Layout Cetak</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'card', label: 'Kartu Anggota', desc: 'Saku/ID Card' },
                    { val: 'a4', label: 'Kertas A4', desc: 'Besar/Dinding' },
                    { val: 'label', label: 'Label Sticker', desc: 'Kecil/Tempelan' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setQrSize(opt.val as any)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        qrSize === opt.val 
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300' 
                          : 'border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Print triggers */}
              <button
                id="print-qr-submit-btn"
                onClick={handlePrintQR}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                Cetak QR Sekarang (Ukuran {qrSize === 'card' ? 'Kartu' : qrSize === 'a4' ? 'A4' : 'Label'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT DRAWER */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-base font-display flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Import Jamaah dari CSV
              </h3>
              <button 
                onClick={() => setIsImportOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleImportCSV} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Panduan Format CSV:</span>
                <p className="text-slate-500 leading-relaxed">
                  Gunakan format CSV terpisah koma (,) dengan baris pertama sebagai header. Contoh: <br />
                  <code className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    ID Jamaah,Nama Lengkap,NIK,Jenis Kelamin,Alamat,No HP
                  </code><br />
                  <code className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    "JM010","Muhammad Zaky","3171010000000010","Laki-laki","Jl. Merpati 5","081299999"
                  </code>
                </p>
              </div>

              {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {importSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tempel Konten CSV</label>
                <textarea
                  rows={6}
                  required
                  placeholder="ID Jamaah,Nama Lengkap,NIK,Jenis Kelamin,Alamat,No HP&#10;&quot;JM008&quot;,&quot;Abdul Malik&quot;,&quot;32130129031023&quot;,&quot;Laki-laki&quot;,&quot;Gg. Subur&quot;,&quot;08571212&quot;"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:border-brand-500 dark:text-slate-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="import-csv-submit-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-brand-500/10 transition-colors cursor-pointer"
                >
                  Proses Impor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
