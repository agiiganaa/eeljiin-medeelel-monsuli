import React, { useEffect, useState } from 'react';
import {
  LogOut,
  User,
  Clock,
  Database,
  Menu,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';

interface HeaderProps {
  pageTitle: string;
  sidebarCollapsed: boolean;
  onOpenMobileMenu: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  sidebarCollapsed,
  onOpenMobileMenu,
  onOpenSettings,
  onOpenLogin,
}) => {
  const { user, profile, role, logout, switchActiveRole, configured } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('mn-MN', {
          timeZone: 'Asia/Ulaanbaatar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('mn-MN', {
          timeZone: 'Asia/Ulaanbaatar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'Админ';
      case 'manager':
        return 'Эрхлэгч';
      case 'worker':
        return 'Ажилтан';
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        sidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
      }`}
    >
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          title="Цэс нээх"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right controls: Time, Supabase status, Role switcher, User profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Date & Time (Asia/Ulaanbaatar) */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-300 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono">{dateStr}</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-amber-300 font-semibold">{timeStr}</span>
          <span className="text-[10px] text-slate-400 font-sans">UB</span>
        </div>

        {/* Supabase status indicator */}
        <button
          onClick={onOpenSettings}
          title="Supabase тохиргоо нээх"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
            configured
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40 animate-pulse'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px] font-medium">
            {configured ? 'Supabase холбогдсон' : 'Supabase холбох'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              configured ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Role switcher */}
        <div className="hidden sm:flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5">
          {(['admin', 'manager', 'worker'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchActiveRole(r)}
              className={`px-2 py-1 text-[11px] rounded-md transition-all font-medium ${
                role === r
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {getRoleLabel(r)}
            </button>
          ))}
        </div>

        {/* User button / Login */}
        {user ? (
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                {profile?.full_name || user.email || 'Хэрэглэгч'}
              </span>
              <span className="text-[10px] text-amber-400 font-medium">
                {getRoleLabel(role)}
              </span>
            </div>
            <button
              onClick={logout}
              title="Гарах"
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>Нэвтрэх</span>
          </button>
        )}
      </div>
    </header>
  );
};
