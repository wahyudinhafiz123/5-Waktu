import React, { useState } from 'react';
import { Lock, User, CheckSquare, Square, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (remember: boolean) => void;
  masjidName: string;
}

export default function Login({ onLoginSuccess, masjidName }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Username dan Password wajib diisi.');
      return;
    }

    setIsLoading(true);

    // Simulate login validation for role ADMIN
    setTimeout(() => {
      if (username.toLowerCase() === 'admin' && password === 'admin123') {
        onLoginSuccess(rememberMe);
      } else {
        setError('Username atau Password salah. (Default: admin / admin123)');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-300">
      {/* Background decoration line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
      
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/80 overflow-hidden transform transition-all">
        {/* Header Branding */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-8 text-center border-b border-slate-200 dark:border-slate-800/80 relative">
          <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/30 rounded-full flex items-center justify-center border border-brand-200 dark:border-brand-900 mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-brand-500 dark:text-brand-400" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white tracking-tight">Absensi Sholat 5 Waktu</h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-mono tracking-wide">{masjidName || 'Masjid Agung Al-Ikhlas'}</p>
        </div>

        {/* Form Body */}
        <div className="px-8 py-8">
          <div className="text-center mb-6">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Login Administrator</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Silakan masukkan akun Anda untuk mengakses sistem</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-pulse" id="login-error-alert">
              <span className="font-semibold">Peringatan:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-600 transition-colors dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-600 transition-colors dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                id="remember-checkbox-btn"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4.5 h-4.5 text-brand-500" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-slate-400" />
                )}
                Ingat Saya
              </button>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700 pt-4">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Username & Password Default: <br />
              <strong className="text-slate-600 dark:text-slate-400">admin / admin123</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
