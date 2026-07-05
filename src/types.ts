export interface Jamaah {
  id: string; // Unique ID (usually short code or alphanumeric)
  nama: string;
  nik: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  no_hp: string;
  status_aktif: boolean;
  foto?: string; // Base64 data URL
  qr_code: string; // Value contained in the QR code (same as ID)
  tanggal_daftar: string; // Date string
}

export type SholatType = 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';

export interface Absensi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  jenis_sholat: SholatType;
  id_jamaah: string;
  nama: string;
  status: 'Berhasil' | 'Gagal' | 'Sudah Absen' | 'Telat';
  device: string; // Information about device used
  lokasi_gps?: string; // Optional GPS coordinates
}

export interface SholatSchedule {
  name: SholatType;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface MasjidConfig {
  nama_masjid: string;
  alamat: string;
  logo?: string; // Base64
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export interface AppSettings {
  masjid: MasjidConfig;
  schedules: SholatSchedule[];
  supabase: SupabaseConfig;
  durasi_telat: number; // in minutes
}
