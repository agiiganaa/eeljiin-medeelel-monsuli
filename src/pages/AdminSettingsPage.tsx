import React, { useEffect, useState } from 'react';
import {
  getSupabase,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';
import { FuelType, Profile, UserRole, AuditLog } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import {
  Settings,
  Database,
  ShieldCheck,
  Fuel,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  History,
  Key,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { role, user, refreshProfile } = useAuth();
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase Config Form
  const currentConfig = getStoredSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentConfig.url);
  const [sbKey, setSbKey] = useState(currentConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Modal: Add Fuel Type
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [fuelCode, setFuelCode] = useState('');
  const [fuelName, setFuelName] = useState('');
  const [fuelDesc, setFuelDesc] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [fRes, pRes, aRes] = await Promise.all([
        supabase.from('fuel_types').select('*').order('code'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (fRes.data) setFuelTypes(fRes.data);
      if (pRes.data) setProfiles(pRes.data);
      if (aRes.data) setAuditLogs(aRes.data);
    } catch (err) {
      console.error('Admin settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestAndSaveSb = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    saveStoredSupabaseConfig(sbUrl.trim(), sbKey.trim());
    await refreshProfile();

    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveFuelType = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('fuel_types').insert([
      {
        code: fuelCode.toUpperCase(),
        name: fuelName,
        description: fuelDesc || null,
        is_active: true,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsFuelModalOpen(false);
      setFuelCode('');
      setFuelName('');
      setFuelDesc('');
      fetchData();
    }
  };

  const handleChangeProfileRole = async (profileId: string, newRole: UserRole) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      fetchData();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>Админ удирдлагын тохиргоо</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Supabase өгөгдлийн сангийн холболт, шатахууны төрлүүд ба системийн хэрэглэгчийн эрх
        </p>
      </div>

      {/* Card 1: Supabase Connection Setup */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Supabase PostgreSQL Холболтын түлхүүр
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {currentConfig.isFromEnv ? 'Орчны хувьсагчаас авсан (.env)' : 'Хөтчийн тохиргоо'}
          </span>
        </div>

        <form onSubmit={handleTestAndSaveSb} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              required
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Supabase Anon / Public API Key
            </label>
            <textarea
              rows={2}
              required
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="text-xs">
                <span className="font-semibold block">
                  {testResult.success ? 'Холболт амжилттай' : 'Холболт амжилтгүй'}
                </span>
                <span className="text-slate-300 text-[11px] mt-0.5 block">
                  {testResult.message}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Шалгаж байна...' : 'Хадгалах & Холболт шалгах'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Fuel Types Management */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Шатахууны төрлүүд ({fuelTypes.length})
            </h3>
          </div>
          <button
            onClick={() => setIsFuelModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Шатахууны төрөл нэмэх</span>
          </button>
        </div>

        {fuelTypes.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Шатахууны төрөл бүртгэгдээгүй байна. Дээрх товчоор А-92, А-95, ДТ зэрэг төрлүүдийг нэмнэ үү.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fuelTypes.map((ft) => (
              <div
                key={ft.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white text-sm">{ft.name}</div>
                  <div className="font-mono text-amber-400 font-semibold mt-0.5">
                    Код: {ft.code}
                  </div>
                  {ft.description && (
                    <div className="text-[11px] text-slate-400 mt-1">{ft.description}</div>
                  )}
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Идэвхтэй
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 3: User Profiles & Roles RBAC */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              Системийн хэрэглэгчид ба эрх (Profiles & Roles)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Нийт бүртгэл: {profiles.length}
          </span>
        </div>

        {profiles.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Хэрэглэгч бүртгэгдээгүй байна. Системд шинээр бүртгүүлсэн хэрэглэгчдийн эрхийг эндээс удирдана.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5">Овог нэр</th>
                  <th className="py-2.5">И-мэйл</th>
                  <th className="py-2.5">Утас</th>
                  <th className="py-2.5">Одоогийн эрх</th>
                  <th className="py-2.5 text-right">Эрх өөрчлөх</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-bold text-white">{p.full_name}</td>
                    <td className="py-2.5 font-mono text-slate-300">{p.email}</td>
                    <td className="py-2.5 font-mono text-slate-400">{p.phone || '-'}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          p.role === 'admin'
                            ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                            : p.role === 'manager'
                            ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                            : 'text-slate-300 bg-slate-800 border-slate-700'
                        }`}
                      >
                        {p.role === 'admin' ? 'Админ' : p.role === 'manager' ? 'Эрхлэгч' : 'Ажилтан'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <select
                        value={p.role}
                        onChange={(e) => handleChangeProfileRole(p.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-[11px] bg-slate-900 border border-slate-800 rounded text-white"
                      >
                        <option value="worker">Ажилтан болгох</option>
                        <option value="manager">Эрхлэгч болгох</option>
                        <option value="admin">Админ болгох</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Fuel Type */}
      <Modal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        title="Шинэ шатахууны төрөл бүртгэх"
      >
        <form onSubmit={handleSaveFuelType} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шатахууны код
            </label>
            <input
              type="text"
              required
              value={fuelCode}
              onChange={(e) => setFuelCode(e.target.value)}
              placeholder="А-92, А-95, ДТ, Евро-5"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Бүтэн нэршил
            </label>
            <input
              type="text"
              required
              value={fuelName}
              onChange={(e) => setFuelName(e.target.value)}
              placeholder="Автобензин А-92"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Стандарт
            </label>
            <input
              type="text"
              value={fuelDesc}
              onChange={(e) => setFuelDesc(e.target.value)}
              placeholder="Жишээ: MNS 217:2018 стандарт"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Төрөл хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
