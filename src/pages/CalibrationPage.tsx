import React, { useEffect, useState } from 'react';
import { getSupabase, formatLiters, formatDateTimeUB } from '../lib/supabase';
import {
  StorageTank,
  CalibrationSetting,
  TankMeasurement,
  Employee,
} from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Ruler, Plus, CheckCircle2, History, Database, ArrowRight } from 'lucide-react';

export const CalibrationPage: React.FC = () => {
  const { role, user } = useAuth();
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationSetting[]>([]);
  const [measurements, setMeasurements] = useState<TankMeasurement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Calibration Point (Admin)
  const [isCalibModalOpen, setIsCalibModalOpen] = useState(false);
  const [calibTankId, setCalibTankId] = useState('');
  const [calibMm, setCalibMm] = useState('');
  const [calibLiters, setCalibLiters] = useState('');

  // Modal: New Dipstick Measurement
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [measureTankId, setMeasureTankId] = useState('');
  const [measureMm, setMeasureMm] = useState<number>(0);
  const [measureEmpId, setMeasureEmpId] = useState('');
  const [measureNotes, setMeasureNotes] = useState('');
  const [calculatedLiters, setCalculatedLiters] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [tRes, cRes, mRes, eRes] = await Promise.all([
        supabase.from('storage_tanks').select('*, fuel_type:fuel_types(*)'),
        supabase.from('calibration_settings').select('*').order('height_mm'),
        supabase
          .from('tank_measurements')
          .select('*, tank:storage_tanks(*), employee:employees(*)')
          .order('measured_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
      ]);

      if (tRes.data) setTanks(tRes.data);
      if (cRes.data) setCalibrations(cRes.data);
      if (mRes.data) setMeasurements(mRes.data);
      if (eRes.data) setEmployees(eRes.data);
    } catch (err) {
      console.error('Calibration fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute liters based on calibration table interpolation
  useEffect(() => {
    if (!measureTankId || measureMm <= 0) {
      setCalculatedLiters(null);
      return;
    }

    const tankCalibs = calibrations.filter((c) => c.tank_id === measureTankId);
    if (tankCalibs.length === 0) {
      // No calibration points configured
      setCalculatedLiters(null);
      return;
    }

    // Exact match
    const exact = tankCalibs.find((c) => Number(c.height_mm) === measureMm);
    if (exact) {
      setCalculatedLiters(Number(exact.volume_liters));
      return;
    }

    // Interpolation between closest lower and higher
    const lower = [...tankCalibs]
      .filter((c) => Number(c.height_mm) <= measureMm)
      .sort((a, b) => Number(b.height_mm) - Number(a.height_mm))[0];
    const upper = [...tankCalibs]
      .filter((c) => Number(c.height_mm) >= measureMm)
      .sort((a, b) => Number(a.height_mm) - Number(b.height_mm))[0];

    if (lower && upper && lower.height_mm !== upper.height_mm) {
      const ratio =
        (measureMm - Number(lower.height_mm)) /
        (Number(upper.height_mm) - Number(lower.height_mm));
      const interpolated =
        Number(lower.volume_liters) +
        ratio * (Number(upper.volume_liters) - Number(lower.volume_liters));
      setCalculatedLiters(+(interpolated).toFixed(2));
    } else if (lower) {
      setCalculatedLiters(Number(lower.volume_liters));
    } else if (upper) {
      setCalculatedLiters(Number(upper.volume_liters));
    } else {
      setCalculatedLiters(null);
    }
  }, [measureTankId, measureMm, calibrations]);

  const handleSaveCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('calibration_settings').insert([
      {
        tank_id: calibTankId,
        height_mm: parseFloat(calibMm) || 0,
        volume_liters: parseFloat(calibLiters) || 0,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsCalibModalOpen(false);
      setCalibMm('');
      setCalibLiters('');
      fetchData();
    }
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedLiters === null) {
      alert('Энэ саванд тохирох калибровкын хүснэгт тохируулаагүй байна. Литрийн хэмжээг зохиож тооцохгүй тул эхлээд калибровк тохируулна уу.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    // 1. Insert measurement record
    const { error: mErr } = await supabase.from('tank_measurements').insert([
      {
        tank_id: measureTankId,
        measurement_value: measureMm,
        unit: 'mm',
        calculated_liters: calculatedLiters,
        measured_at: new Date().toISOString(),
        employee_id: measureEmpId || null,
        notes: measureNotes || null,
        status: 'approved',
        verified_by: user?.id || null,
      },
    ]);

    if (mErr) {
      alert(`Алдаа: ${mErr.message}`);
      return;
    }

    // 2. Update storage tank current liters
    await supabase
      .from('storage_tanks')
      .update({
        current_liters: calculatedLiters,
        last_measured_at: new Date().toISOString(),
      })
      .eq('id', measureTankId);

    setIsMeasureModalOpen(false);
    setMeasureMm(0);
    setMeasureNotes('');
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Мастшапын хэмжилт
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Шугамын миллиметр (мм) хэмжилт ба калибровкын хүснэгтээр литр тооцоолох
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setIsCalibModalOpen(true)}
              disabled={tanks.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Калибровк нэмэх</span>
            </button>
          )}

          <button
            onClick={() => setIsMeasureModalOpen(true)}
            disabled={tanks.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Хэмжилт оруулах</span>
          </button>
        </div>
      </div>

      {/* Info notice about strict calibration rule */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
        <p>
          * <strong>Журмын дагуу:</strong> Мастшапын хэмжилтийн литрийг зөвхөн админы оруулсан албан ёсны калибровкын хүснэгтэд үндэслэн тооцно. Хөрвүүлэх мэдээлэл байхгүй үед литрийн хэмжээг зохиож эсвэл таамаглаж бодохгүй.
        </p>
      </div>

      {/* Measurements Log */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Сүүлийн мастшапын хэмжилтүүд
        </h3>

        {measurements.length === 0 ? (
          <EmptyState
            title="Мастшапын хэмжилт бүртгэгдээгүй байна"
            description="Шугамаар савны түвшинг мм-ээр хэмжиж, батлагдсан литрийн үлдэгдлийг бүртгэнэ үү."
            actionText="Хэмжилт оруулах"
            onAction={() => setIsMeasureModalOpen(true)}
            icon={Ruler}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо, цаг</th>
                  <th className="py-3 px-4">Сав</th>
                  <th className="py-3 px-4">Хэмжилт (мм)</th>
                  <th className="py-3 px-4">Тооцоолсон литр</th>
                  <th className="py-3 px-4">Хэмжсэн ажилтан</th>
                  <th className="py-3 px-4">Тайлбар</th>
                  <th className="py-3 px-4">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {measurements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatDateTimeUB(m.measured_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {m.tank?.tank_number} ({m.tank?.name})
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {m.measurement_value} мм
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatLiters(m.calculated_liters)}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {m.employee?.full_name || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{m.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Баталгаажсан
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calibration points summary for admin */}
      {role === 'admin' && calibrations.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>Бүртгэлтэй калибровкын цэгүүд ({calibrations.length})</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {calibrations.map((c) => (
              <div
                key={c.id}
                className="p-2 rounded bg-slate-900 border border-slate-800/80 text-xs font-mono"
              >
                <div className="text-slate-400 text-[10px]">{c.height_mm} мм</div>
                <div className="text-amber-300 font-bold">{formatLiters(c.volume_liters)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: New Dipstick Measurement */}
      <Modal
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        title="Шугамын (мастшап) хэмжилт оруулах"
      >
        <form onSubmit={handleSaveMeasurement} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Сав сонгох
            </label>
            <select
              required
              value={measureTankId}
              onChange={(e) => setMeasureTankId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Сав сонгох --</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tank_number} ({t.name} - {t.fuel_type?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шугамын хэмжилтийн өндөр (мм)
            </label>
            <input
              type="number"
              step="1"
              required
              value={measureMm || ''}
              onChange={(e) => setMeasureMm(parseFloat(e.target.value) || 0)}
              placeholder="Жишээ: 1250"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
            />
          </div>

          {/* Automatic Calculated Liters View */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-xs">Калибровкоор бодсон литр:</span>
            <div className="text-base font-bold font-mono mt-1">
              {calculatedLiters !== null ? (
                <span className="text-emerald-400">{formatLiters(calculatedLiters)}</span>
              ) : (
                <span className="text-amber-400 text-xs">
                  Калибровк тохируулаагүй эсвэл өндөр оруулаагүй
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хэмжсэн ажилтан
            </label>
            <select
              value={measureEmpId}
              onChange={(e) => setMeasureEmpId(e.target.value)}
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
              Тэмдэглэл / Шалтгаан
            </label>
            <input
              type="text"
              value={measureNotes}
              onChange={(e) => setMeasureNotes(e.target.value)}
              placeholder="Сорьц авсан байдал гэх мэт"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={calculatedLiters === null}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              Хэмжилтийг баталгаажуулж саванд хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Calibration Point (Admin) */}
      <Modal
        isOpen={isCalibModalOpen}
        onClose={() => setIsCalibModalOpen(false)}
        title="Калибровкын цэг бүртгэх"
      >
        <form onSubmit={handleSaveCalibration} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Сав сонгох
            </label>
            <select
              required
              value={calibTankId}
              onChange={(e) => setCalibTankId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Сав сонгох --</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tank_number} ({t.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Өндөр (мм)
              </label>
              <input
                type="number"
                step="1"
                required
                value={calibMm}
                onChange={(e) => setCalibMm(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эзлэхүүн (литр)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={calibLiters}
                onChange={(e) => setCalibLiters(e.target.value)}
                placeholder="10500"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Калибровк хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
