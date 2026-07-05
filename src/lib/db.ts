import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Jamaah, Absensi, AppSettings, SholatType, SholatSchedule } from '../types';

// Default configurations
const DEFAULT_SCHEDULES: SholatSchedule[] = [
  { name: 'Subuh', start: '04:00', end: '05:59' },
  { name: 'Dzuhur', start: '11:30', end: '14:59' },
  { name: 'Ashar', start: '15:00', end: '17:29' },
  { name: 'Maghrib', start: '17:30', end: '18:59' },
  { name: 'Isya', start: '19:00', end: '23:59' },
];

const DEFAULT_SETTINGS: AppSettings = {
  masjid: {
    nama_masjid: 'Masjid Agung Al-Ikhlas',
    alamat: 'Jl. Raya Syuhada No. 12, Pusat Kota',
    logo: '', // Default placeholder will be used
  },
  schedules: DEFAULT_SCHEDULES,
  supabase: {
    url: '',
    anonKey: '',
    connected: false,
  },
  durasi_telat: 15
};

// Initial Seed Data for beautiful out-of-the-box Dashboard & Charts
const MOCK_JAMAAH: Jamaah[] = [
  {
    id: 'JM001',
    nama: 'H. Ahmad Subarkah',
    nik: '3171012345670001',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Jl. Melati No. 45, RT 02/05',
    no_hp: '081234567890',
    status_aktif: true,
    tanggal_daftar: '2026-06-01',
    qr_code: 'JM001'
  },
  {
    id: 'JM002',
    nama: 'Budi Raharjo',
    nik: '3171012345670002',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Gang Sahabat No. 12A',
    no_hp: '085712345678',
    status_aktif: true,
    tanggal_daftar: '2026-06-05',
    qr_code: 'JM002'
  },
  {
    id: 'JM003',
    nama: 'Ustadzah Siti Aminah',
    nik: '3171012345670003',
    jenis_kelamin: 'Perempuan',
    alamat: 'Komp. Hijau Lestari Blok C/4',
    no_hp: '081398765432',
    status_aktif: true,
    tanggal_daftar: '2026-06-10',
    qr_code: 'JM003'
  },
  {
    id: 'JM004',
    nama: 'Rian Hidayat',
    nik: '3171012345670004',
    jenis_kelamin: 'Laki-laki',
    alamat: 'Jl. Kebon Jeruk No. 8',
    no_hp: '08991234567',
    status_aktif: true,
    tanggal_daftar: '2026-06-12',
    qr_code: 'JM004'
  },
  {
    id: 'JM005',
    nama: 'Fatimah Az-Zahra',
    nik: '3171012345670005',
    jenis_kelamin: 'Perempuan',
    alamat: 'Jl. Mawar Gg. 3 No. 15',
    no_hp: '087812345678',
    status_aktif: true,
    tanggal_daftar: '2026-06-15',
    qr_code: 'JM005'
  },
];

const MOCK_ABSENSI: Absensi[] = [
  { id: 'AB001', tanggal: '2026-07-05', jam: '04:45:12', jenis_sholat: 'Subuh', id_jamaah: 'JM001', nama: 'H. Ahmad Subarkah', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB002', tanggal: '2026-07-05', jam: '04:50:30', jenis_sholat: 'Subuh', id_jamaah: 'JM002', nama: 'Budi Raharjo', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB003', tanggal: '2026-07-05', jam: '05:10:05', jenis_sholat: 'Subuh', id_jamaah: 'JM003', nama: 'Ustadzah Siti Aminah', status: 'Berhasil', device: 'Mobile Safari - iOS' },
  
  { id: 'AB004', tanggal: '2026-07-04', jam: '12:05:40', jenis_sholat: 'Dzuhur', id_jamaah: 'JM001', nama: 'H. Ahmad Subarkah', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB005', tanggal: '2026-07-04', jam: '12:15:22', jenis_sholat: 'Dzuhur', id_jamaah: 'JM004', nama: 'Rian Hidayat', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  
  { id: 'AB006', tanggal: '2026-07-04', jam: '15:30:15', jenis_sholat: 'Ashar', id_jamaah: 'JM002', nama: 'Budi Raharjo', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB007', tanggal: '2026-07-04', jam: '15:45:00', jenis_sholat: 'Ashar', id_jamaah: 'JM005', nama: 'Fatimah Az-Zahra', status: 'Berhasil', device: 'Mobile Safari - iOS' },
  
  { id: 'AB008', tanggal: '2026-07-04', jam: '17:50:33', jenis_sholat: 'Maghrib', id_jamaah: 'JM001', nama: 'H. Ahmad Subarkah', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB009', tanggal: '2026-07-04', jam: '18:02:11', jenis_sholat: 'Maghrib', id_jamaah: 'JM003', nama: 'Ustadzah Siti Aminah', status: 'Berhasil', device: 'Mobile Safari - iOS' },
  
  { id: 'AB010', tanggal: '2026-07-04', jam: '19:30:12', jenis_sholat: 'Isya', id_jamaah: 'JM001', nama: 'H. Ahmad Subarkah', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB011', tanggal: '2026-07-04', jam: '19:45:50', jenis_sholat: 'Isya', id_jamaah: 'JM002', nama: 'Budi Raharjo', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB012', tanggal: '2026-07-04', jam: '20:01:05', jenis_sholat: 'Isya', id_jamaah: 'JM004', nama: 'Rian Hidayat', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  
  // Older dates for charts
  { id: 'AB013', tanggal: '2026-07-03', jam: '04:52:10', jenis_sholat: 'Subuh', id_jamaah: 'JM001', nama: 'H. Ahmad Subarkah', status: 'Berhasil', device: 'Mobile Chrome - Android' },
  { id: 'AB014', tanggal: '2026-07-03', jam: '18:10:00', jenis_sholat: 'Maghrib', id_jamaah: 'JM005', nama: 'Fatimah Az-Zahra', status: 'Berhasil', device: 'Mobile Safari - iOS' },
  { id: 'AB015', tanggal: '2026-07-02', jam: '12:10:00', jenis_sholat: 'Dzuhur', id_jamaah: 'JM002', nama: 'Budi Raharjo', status: 'Berhasil', device: 'Mobile Chrome - Android' },
];

let supabaseClientInstance: SupabaseClient | null = null;

// Lazy initialization of Supabase
export function getSupabase(config: AppSettings['supabase']): SupabaseClient | null {
  if (config.url && config.anonKey) {
    if (!supabaseClientInstance) {
      try {
        supabaseClientInstance = createClient(config.url, config.anonKey);
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        return null;
      }
    }
    return supabaseClientInstance;
  }
  return null;
}

// Check database connection
export async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  if (!url || !key) return false;
  try {
    const tempClient = createClient(url, key);
    const { data, error } = await tempClient.from('jamaah').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('Supabase test ping warning (table might not exist yet):', error.message);
      // If the error is just that table doesn't exist, we consider the connection technically successful
      if (error.code === 'PGRST116' || error.message.includes('relation "jamaah" does not exist')) {
        return true;
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase connection test failed:', err);
    return false;
  }
}

// -----------------------------------------
// REUSABLE DB WRAPPER
// -----------------------------------------

export function getLocalSettings(): AppSettings {
  const data = localStorage.getItem('sholat_settings');
  if (!data) {
    localStorage.setItem('sholat_settings', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(data);
    if (parsed.durasi_telat === undefined) {
      parsed.durasi_telat = 15;
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: AppSettings): void {
  localStorage.setItem('sholat_settings', JSON.stringify(settings));
  // Reset Supabase cached client in case credentials changed
  supabaseClientInstance = null;
}

// JAMA’AH FUNCTIONS
export async function getJamaahList(): Promise<Jamaah[]> {
  const settings = getLocalSettings();
  const client = getSupabase(settings.supabase);

  if (client && settings.supabase.connected) {
    try {
      const { data, error } = await client.from('jamaah').select('*').order('nama', { ascending: true });
      if (!error && data) {
        // Synchronize local storage to ensure offline safety
        localStorage.setItem('sholat_jamaah', JSON.stringify(data));
        return data as Jamaah[];
      }
      console.warn('Supabase read error, falling back to local storage:', error);
    } catch (err) {
      console.error('Supabase getJamaah exception, falling back:', err);
    }
  }

  // Fallback to local storage
  const localData = localStorage.getItem('sholat_jamaah');
  if (!localData) {
    localStorage.setItem('sholat_jamaah', JSON.stringify(MOCK_JAMAAH));
    return MOCK_JAMAAH;
  }
  try {
    return JSON.parse(localData);
  } catch {
    return MOCK_JAMAAH;
  }
}

export async function saveJamaah(jamaah: Jamaah): Promise<boolean> {
  const settings = getLocalSettings();
  const list = await getJamaahList();
  
  // Update local list
  const index = list.findIndex(j => j.id === jamaah.id);
  if (index !== -1) {
    list[index] = jamaah;
  } else {
    list.push(jamaah);
  }
  localStorage.setItem('sholat_jamaah', JSON.stringify(list));

  // Sync to Supabase if connected
  const client = getSupabase(settings.supabase);
  if (client && settings.supabase.connected) {
    try {
      const { error } = await client.from('jamaah').upsert({
        id: jamaah.id,
        nama: jamaah.nama,
        nik: jamaah.nik,
        jenis_kelamin: jamaah.jenis_kelamin,
        alamat: jamaah.alamat,
        no_hp: jamaah.no_hp,
        status_aktif: jamaah.status_aktif,
        foto: jamaah.foto,
        qr_code: jamaah.qr_code,
        tanggal_daftar: jamaah.tanggal_daftar
      });
      if (error) {
        console.error('Failed to sync saved Jamaah to Supabase:', error);
        return false;
      }
    } catch (err) {
      console.error('Supabase exception saving Jamaah:', err);
      return false;
    }
  }
  return true;
}

export async function deleteJamaah(id: string): Promise<boolean> {
  const settings = getLocalSettings();
  const list = await getJamaahList();
  const newList = list.filter(j => j.id !== id);
  localStorage.setItem('sholat_jamaah', JSON.stringify(newList));

  // Sync delete to Supabase if connected
  const client = getSupabase(settings.supabase);
  if (client && settings.supabase.connected) {
    try {
      const { error } = await client.from('jamaah').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete Jamaah from Supabase:', error);
        return false;
      }
    } catch (err) {
      console.error('Supabase exception deleting Jamaah:', err);
      return false;
    }
  }
  return true;
}

// ABSENSI FUNCTIONS
export async function getAbsensiList(): Promise<Absensi[]> {
  const settings = getLocalSettings();
  const client = getSupabase(settings.supabase);

  if (client && settings.supabase.connected) {
    try {
      const { data, error } = await client.from('absensi').select('*').order('tanggal', { ascending: false }).order('jam', { ascending: false });
      if (!error && data) {
        localStorage.setItem('sholat_absensi', JSON.stringify(data));
        return data as Absensi[];
      }
      console.warn('Supabase absensi read error, falling back to local:', error);
    } catch (err) {
      console.error('Supabase getAbsensi exception, falling back:', err);
    }
  }

  // Fallback
  const localData = localStorage.getItem('sholat_absensi');
  if (!localData) {
    localStorage.setItem('sholat_absensi', JSON.stringify(MOCK_ABSENSI));
    return MOCK_ABSENSI;
  }
  try {
    return JSON.parse(localData);
  } catch {
    return MOCK_ABSENSI;
  }
}

export async function saveAbsensi(absensi: Absensi): Promise<boolean> {
  const settings = getLocalSettings();
  const list = await getAbsensiList();
  list.unshift(absensi); // Add to the top
  localStorage.setItem('sholat_absensi', JSON.stringify(list));

  // Sync to Supabase
  const client = getSupabase(settings.supabase);
  if (client && settings.supabase.connected) {
    try {
      const { error } = await client.from('absensi').insert({
        id: absensi.id,
        tanggal: absensi.tanggal,
        jam: absensi.jam,
        jenis_sholat: absensi.jenis_sholat,
        id_jamaah: absensi.id_jamaah,
        nama: absensi.nama,
        status: absensi.status,
        device: absensi.device,
        lokasi_gps: absensi.lokasi_gps
      });
      if (error) {
        console.error('Failed to sync Absensi record to Supabase:', error);
        return false;
      }
    } catch (err) {
      console.error('Supabase exception saving Absensi:', err);
      return false;
    }
  }
  return true;
}

// DETERMINE SHOLAT AUTOMATICALLY
export function determineSholatTime(timeStr: string, schedules: SholatSchedule[]): SholatType | null {
  // timeStr: HH:mm (or HH:mm:ss, we take first 5 chars)
  const [targetH, targetM] = timeStr.slice(0, 5).split(':').map(Number);
  const targetMinutes = targetH * 60 + targetM;

  for (const schedule of schedules) {
    const [startH, startM] = schedule.start.split(':').map(Number);
    const [endH, endM] = schedule.end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // Normal schedule (e.g. 04:00 to 05:59)
      if (targetMinutes >= startMinutes && targetMinutes <= endMinutes) {
        return schedule.name;
      }
    } else {
      // Over-midnight schedule (e.g. 23:00 to 01:00)
      if (targetMinutes >= startMinutes || targetMinutes <= endMinutes) {
        return schedule.name;
      }
    }
  }
  return null;
}

// BACKUP DATABASE (Produces JSON download)
export function exportBackupData(): string {
  const backup = {
    settings: getLocalSettings(),
    jamaah: localStorage.getItem('sholat_jamaah') ? JSON.parse(localStorage.getItem('sholat_jamaah')!) : MOCK_JAMAAH,
    absensi: localStorage.getItem('sholat_absensi') ? JSON.parse(localStorage.getItem('sholat_absensi')!) : MOCK_ABSENSI,
    timestamp: new Date().toISOString(),
  };
  return JSON.stringify(backup, null, 2);
}

// RESTORE DATABASE
export async function restoreBackupData(jsonString: string): Promise<boolean> {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.settings || !backup.jamaah || !backup.absensi) {
      throw new Error('Format backup tidak valid.');
    }
    
    // Save to localStorage
    localStorage.setItem('sholat_settings', JSON.stringify(backup.settings));
    localStorage.setItem('sholat_jamaah', JSON.stringify(backup.jamaah));
    localStorage.setItem('sholat_absensi', JSON.stringify(backup.absensi));
    
    // Attempt full sync to Supabase if connected
    const settings = backup.settings as AppSettings;
    const client = getSupabase(settings.supabase);
    if (client && settings.supabase.connected) {
      // Upsert all records to Supabase in batches
      const jamaahList = backup.jamaah as Jamaah[];
      const absensiList = backup.absensi as Absensi[];
      
      if (jamaahList.length > 0) {
        await client.from('jamaah').upsert(jamaahList.map(j => ({
          id: j.id,
          nama: j.nama,
          nik: j.nik,
          jenis_kelamin: j.jenis_kelamin,
          alamat: j.alamat,
          no_hp: j.no_hp,
          status_aktif: j.status_aktif,
          foto: j.foto,
          qr_code: j.qr_code,
          tanggal_daftar: j.tanggal_daftar
        })));
      }
      
      if (absensiList.length > 0) {
        await client.from('absensi').upsert(absensiList.map(a => ({
          id: a.id,
          tanggal: a.tanggal,
          jam: a.jam,
          jenis_sholat: a.jenis_sholat,
          id_jamaah: a.id_jamaah,
          nama: a.nama,
          status: a.status,
          device: a.device,
          lokasi_gps: a.lokasi_gps
        })));
      }
    }
    return true;
  } catch (err) {
    console.error('Error restoring backup:', err);
    return false;
  }
}
