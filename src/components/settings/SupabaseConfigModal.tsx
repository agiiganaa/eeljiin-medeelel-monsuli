import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, Key, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getStoredSupabaseConfig();
  const { refreshProfile } = useAuth();

  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    // Save temporary to localStorage to test
    saveStoredSupabaseConfig(url.trim(), anonKey.trim());
    await refreshProfile();

    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase өгөгдлийн сангийн тохиргоо"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-300 leading-relaxed">
          Энэхүү систем нь бодит <strong>Supabase PostgreSQL</strong> өгөгдлийн сантай шууд холбогдож ажиллана.
          Хуурамч (mock) өгөгдөл ашигладаггүй тул та өөрийн Supabase төслийн холболтыг доор тохируулна уу.
        </p>

        <form onSubmit={handleTestAndSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project URL (Жишээ: https://xyzcompany.supabase.co)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Anon / Public API Key
            </label>
            <textarea
              rows={3}
              required
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono resize-none"
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

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              * Frontend-д зөвхөн public anon key хадгалагдана. Service role key бүү оруул.
            </span>
            <button
              type="submit"
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Шалгаж байна...' : 'Хадгалах & Шалгах'}</span>
            </button>
          </div>
        </form>

        <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">SQL Схем үүсгэх:</span>
            <a
              href="#/guide"
              onClick={onClose}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
            >
              <span>Заавар хуудас руу очих</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-400">
            Хэрэв та Supabase төсөлдөө хүснэгтүүдээ үүсгээгүй байгаа бол уг системийн <strong>/supabase_schema.sql</strong> кодыг хуулж Supabase dashboard-ын SQL Editor хэсэгт ажиллуулна уу.
          </p>
        </div>
      </div>
    </Modal>
  );
};
