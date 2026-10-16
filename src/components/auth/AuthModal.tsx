import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import { LogIn, UserPlus, AlertCircle, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, configured } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Нэрээ оруулна уу');
          setLoading(false);
          return;
        }
        const res = await register(email, password, fullName, role, phone);
        if (!res.success) {
          setError(res.error || 'Бүртгэл амжилтгүй');
        } else {
          onClose();
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Нэвтрэх нэр эсвэл нууц үг буруу байна');
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRegister ? 'Шинэ хэрэглэгч бүртгэх' : 'Системд нэвтрэх'}
      maxWidth="max-w-md"
    >
      {!configured && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-semibold">Supabase холбогдоогүй байна</p>
            <p className="text-[11px] text-amber-400/90 mt-0.5">
              Бодит Supabase Auth ашиглахын тулд "Админ тохиргоо" цэснээс Supabase URL болон Anon Key оруулж холбоно уу.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {isRegister && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Овог, нэр
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Жишээ: Бат Болд"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            И-мэйл хаяг
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@station.mn"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Нууц үг
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {isRegister && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Утасны дугаар
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="99112233"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Эрх (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="worker">Ажилтан (Түгээгч)</option>
                <option value="manager">Эрхлэгч</option>
                <option value="admin">Админ (Системийн удирдлага)</option>
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRegister ? (
            <>
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
        >
          {isRegister
            ? 'Бүртгэлтэй юу? Нэвтрэх'
            : 'Шинэ хэрэглэгч үүсгэх үү? Бүртгүүлэх'}
        </button>
      </div>
    </Modal>
  );
};
