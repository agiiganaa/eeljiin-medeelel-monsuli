import React, { useEffect, useState } from 'react';
import { getSupabase, formatLiters, formatDateTimeUB } from '../lib/supabase';
import { StorageTank, FuelType, TankMeasurement, Employee } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Database,
  Plus,
  AlertTriangle,
  Ruler,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export const StorageTanksPage: React.FC = () => {
  const { role, user } = useAuth();
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Tank
  const [isTankModalOpen, setIsTankModalOpen] = useState(false);
  const [tankNumber, setTankNumber] = useState('');
  const [tankName, setTankName] = useState('');
  const [tankFuelTypeId, setTankFuelTypeId] = useState('');
  const [capacityLiters, setCapacityLiters] = useState('');
  const [currentLiters, setCurrentLiters] = useState('');
  const [safetyThreshold, setSafetyThreshold] = useState('');
  const [maxFillLiters, setMaxFillLiters] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState<'dipstick' | 'sensor'>('dipstick');
  const [tankNotes, setTankNotes] = useState('');

  // Modal: Direct Measurement Update
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [activeTank, setActiveTank] = useState<StorageTank | null>(null);
  const [measuredLiters, setMeasuredLiters] = useState('');
  const [measuredByEmpId, setMeasuredByEmpId] = useState('');
  const [measureNotes, setMeasureNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [tRes, fRes, eRes] = await Promise.all([
        supabase
          .from('storage_tanks')
          .select('*, fuel_type:fuel_types(*)')
          .order('tank_number'),
        supabase.from('fuel_types').select('*').eq('is_active', true),
        supabase.from('employees').select('*').eq('is_active', true),
      ]);

      if (tRes.data) setTanks(tRes.data);
      if (fRes.data) setFuelTypes(fRes.data);
      if (eRes.data) setEmployees(eRes.data);
    } catch (err) {
      console.error('Tanks fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTank = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('storage_tanks').insert([
      {
        tank_number: tankNumber,
        name: tankName,
        fuel_type_id: tankFuelTypeId,
        capacity_liters: parseFloat(capacityLiters) || 0,
        current_liters: parseFloat(currentLiters) || 0,
        safety_threshold_liters: parseFloat(safetyThreshold) || 0,
        max_fill_liters: parseFloat(maxFillLiters) || parseFloat(capacityLiters) || 0,
        measurement_method: measurementMethod,
        notes: tankNotes || null,
        last_measured_at: currentLiters ? new Date().toISOString() : null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsTankModalOpen(false);
      setTankNumber('');
      setTankName('');
      setCapacityLiters('');
      setCurrentLiters('');
      setSafetyThreshold('');
      setMaxFillLiters('');
      setTankNotes('');
      fetchData();
    }
  };

  const handleUpdateMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTank) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const lit = parseFloat(measuredLiters) || 0;

    // 1. Update tank current liters
    const { error: tErr } = await supabase
      .from('storage_tanks')
      .update({
        current_liters: lit,
        last_measured_at: new Date().toISOString(),
        measured_by: user?.id || null,
      })
      .eq('id', activeTank.id);

    if (tErr) {
      alert(`Алдаа: ${tErr.message}`);
      return;
    }

    // 2. Insert into tank_measurements log
    await supabase.from('tank_measurements').insert([
      {
        tank_id: activeTank.id,
        measurement_value: lit,
        unit: 'liters',
        calculated_liters: lit,
        measured_at: new Date().toISOString(),
        employee_id: measuredByEmpId || null,
        notes: measureNotes || null,
        status: 'approved',
      },
    ]);

    setIsMeasureModalOpen(false);
    setActiveTank(null);
    setMeasuredLiters('');
    setMeasureNotes('');
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Савны бүртгэл
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Шатахууны газар доорх ба дээрх савнуудын багтаамж, үлдэгдэл, аюулгүйн босго
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsTankModalOpen(true)}
            disabled={fuelTypes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Сав нэмэх</span>
          </button>
        )}
      </div>

      {/* Tanks Grid */}
      {tanks.length === 0 ? (
        <EmptyState
          title="Сав бүртгэгдээгүй байна"
          description="ШТС-ийн шатахуун хадгалах савнуудыг нэмж, багтаамж болон аюулгүйн босгыг тохируулна уу."
          actionText={role === 'admin' ? 'Сав нэмэх' : undefined}
          onAction={() => setIsTankModalOpen(true)}
          icon={Database}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tanks.map((t) => {
            const fillPct = t.capacity_liters > 0 ? Math.min(100, Math.round((t.current_liters / t.capacity_liters) * 100)) : 0;
            const isLow = t.safety_threshold_liters > 0 && t.current_liters <= t.safety_threshold_liters;

            return (
              <div
                key={t.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {t.tank_number}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({t.name})
                      </span>
                    </div>
                    {isLow ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Аюулгүйн босго!
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Хэвийн
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Шатахууны төрөл:</span>
                      <span className="font-bold text-amber-300">
                        {t.fuel_type?.name} ({t.fuel_type?.code})
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Нийт багтаамж:</span>
                      <span className="font-mono text-slate-200">
                        {formatLiters(t.capacity_liters)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Бодит үлдэгдэл:</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {formatLiters(t.current_liters)}
                      </span>
                    </div>

                    {/* Tank fill visual progress */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Дүүргэлт: {fillPct}%</span>
                        <span>Хязгаар: {formatLiters(t.max_fill_liters)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isLow ? 'bg-rose-500' : fillPct > 90 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>Аюулгүйн босго:</span>
                      <span className="font-mono text-rose-400">
                        {formatLiters(t.safety_threshold_liters)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Сүүлд хэмжсэн:</span>
                      <span className="text-[11px] text-slate-300">
                        {t.last_measured_at ? formatDateTimeUB(t.last_measured_at) : 'Хэмжилт хийгдээгүй'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Арга: {t.measurement_method === 'dipstick' ? 'Мастшап (шугам)' : 'Мэдрэгч'}
                  </span>
                  <button
                    onClick={() => {
                      setActiveTank(t);
                      setMeasuredLiters(String(t.current_liters));
                      setIsMeasureModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                  >
                    Хэмжилт шинэчлэх
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Tank */}
      <Modal
        isOpen={isTankModalOpen}
        onClose={() => setIsTankModalOpen(false)}
        title="Шинэ сав бүртгэх"
      >
        <form onSubmit={handleSaveTank} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Савны дугаар / код
              </label>
              <input
                type="text"
                required
                value={tankNumber}
                onChange={(e) => setTankNumber(e.target.value)}
                placeholder="Сав 1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Савны нэр
              </label>
              <input
                type="text"
                required
                value={tankName}
                onChange={(e) => setTankName(e.target.value)}
                placeholder="Жишээ: А-92 үндсэн сав"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шатахууны төрөл
            </label>
            <select
              required
              value={tankFuelTypeId}
              onChange={(e) => setTankFuelTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Шатахуун сонгох --</option>
              {fuelTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.name} ({ft.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Нийт багтаамж (литр)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={capacityLiters}
                onChange={(e) => setCapacityLiters(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Анхны бодит үлдэгдэл (литр)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentLiters}
                onChange={(e) => setCurrentLiters(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Аюулгүйн босго (литр)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={safetyThreshold}
                onChange={(e) => setSafetyThreshold(e.target.value)}
                placeholder="3000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Дүүргэлтийн хязгаар (литр)
              </label>
              <input
                type="number"
                step="0.01"
                value={maxFillLiters}
                onChange={(e) => setMaxFillLiters(e.target.value)}
                placeholder="24000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хэмжилтийн үндсэн арга
            </label>
            <select
              value={measurementMethod}
              onChange={(e) => setMeasurementMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="dipstick">Мастшап (шугаман калибровкын хэмжилт)</option>
              <option value="sensor">Автомат цахим түвшний мэдрэгч</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар
            </label>
            <input
              type="text"
              value={tankNotes}
              onChange={(e) => setTankNotes(e.target.value)}
              placeholder="Жишээ: 1998 оны нөөцийн сав"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Сав хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Tank Level */}
      <Modal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        title={`Савны үлдэгдэл шинэчлэх (${activeTank?.tank_number})`}
      >
        <form onSubmit={handleUpdateMeasurement} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хэмжилт хийсэн бодит литр
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={measuredLiters}
              onChange={(e) => setMeasuredLiters(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хэмжилт хийсэн ажилтан
            </label>
            <select
              value={measuredByEmpId}
              onChange={(e) => setMeasuredByEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Ажилтан сонгох --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хэмжилтийн тэмдэглэл
            </label>
            <input
              type="text"
              value={measureNotes}
              onChange={(e) => setMeasureNotes(e.target.value)}
              placeholder="Жишээ: Ээлжийн эхэнд шугамаар хэмжив"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Хэмжилтийг баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
