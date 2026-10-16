import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT, formatLiters } from '../lib/supabase';
import {
  FuelNozzle,
  FuelType,
  FuelPrice,
  FuelMeterReading,
  Employee,
  Shift,
  StorageTank,
  NozzleStatus,
} from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Fuel,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Clock,
  History,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from 'lucide-react';

export const FuelSalesPage: React.FC = () => {
  const { role, user } = useAuth();
  const [nozzles, setNozzles] = useState<FuelNozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [readings, setReadings] = useState<FuelMeterReading[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Nozzle
  const [isNozzleModalOpen, setIsNozzleModalOpen] = useState(false);
  const [nozzleNumber, setNozzleNumber] = useState('');
  const [nozzleName, setNozzleName] = useState('');
  const [nozzleFuelTypeId, setNozzleFuelTypeId] = useState('');
  const [nozzleTankId, setNozzleTankId] = useState('');
  const [nozzleInitialMeter, setNozzleInitialMeter] = useState('0');

  // Modal: Change Status
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedNozzle, setSelectedNozzle] = useState<FuelNozzle | null>(null);
  const [newStatus, setNewStatus] = useState<NozzleStatus>('active');
  const [statusReason, setStatusReason] = useState('');

  // Modal: Record Meter Reading
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [activeNozzleForReading, setActiveNozzleForReading] = useState<FuelNozzle | null>(null);
  const [readingShiftId, setReadingShiftId] = useState('');
  const [readingEmpId, setReadingEmpId] = useState('');
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialMeter, setInitialMeter] = useState<number>(0);
  const [finalMeter, setFinalMeter] = useState<number>(0);
  const [readingPricePerLiter, setReadingPricePerLiter] = useState<number>(0);
  const [soldLiters, setSoldLiters] = useState<number>(0);
  const [totalSalesAmount, setTotalSalesAmount] = useState<number>(0);
  const [readingNotes, setReadingNotes] = useState('');
  const [readingError, setReadingError] = useState<string | null>(null);

  // Modal: Set Price (Admin only)
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceFuelTypeId, setPriceFuelTypeId] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [nozRes, typeRes, priceRes, readRes, empRes, shiftRes, tankRes] = await Promise.all([
        supabase
          .from('fuel_nozzles')
          .select('*, fuel_type:fuel_types(*), tank:storage_tanks(*)')
          .order('nozzle_number'),
        supabase.from('fuel_types').select('*').eq('is_active', true),
        supabase.from('fuel_prices').select('*, fuel_type:fuel_types(*)').order('created_at', { ascending: false }),
        supabase
          .from('fuel_meter_readings')
          .select('*, nozzle:fuel_nozzles(*), employee:employees(*), shift:shifts(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shifts').select('*').eq('is_active', true),
        supabase.from('storage_tanks').select('*'),
      ]);

      if (nozRes.data) setNozzles(nozRes.data);
      if (typeRes.data) setFuelTypes(typeRes.data);
      if (priceRes.data) setPrices(priceRes.data);
      if (readRes.data) setReadings(readRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
      if (tankRes.data) setTanks(tankRes.data);
    } catch (err) {
      console.error('Fuel sales fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Get active price for a fuel type
  const getCurrentPrice = (fuelTypeId: string): number => {
    const found = prices.find((p) => p.fuel_type_id === fuelTypeId && (!p.effective_to || new Date(p.effective_to) > new Date()));
    return found ? Number(found.price_per_liter) : 0;
  };

  // Auto calculate sold liters & total sales amount dynamically when final meter or initial meter changes
  useEffect(() => {
    if (finalMeter !== undefined && initialMeter !== undefined) {
      const liters = +(finalMeter - initialMeter).toFixed(2);
      setSoldLiters(liters);
      if (liters < 0) {
        setReadingError('Анхаар: Эцсийн милль эхний милльээс бага байж болохгүй! Сөрөг зөрүү гарлаа.');
        setTotalSalesAmount(0);
      } else {
        setReadingError(null);
        const total = Math.round(liters * readingPricePerLiter);
        setTotalSalesAmount(total);
      }
    }
  }, [finalMeter, initialMeter, readingPricePerLiter]);

  const handleOpenReadingModal = (nozzle: FuelNozzle) => {
    if (nozzle.status !== 'active') {
      alert(`Энэ хошуу одоогоор "${getNozzleStatusLabel(nozzle.status)}" төлөвтэй байгаа тул борлуулалт оруулах боломжгүй.`);
      return;
    }

    setActiveNozzleForReading(nozzle);
    // Find last reading or fallback to nozzle.last_reading
    const lastRec = readings.find((r) => r.nozzle_id === nozzle.id && r.status === 'approved');
    const startMeter = lastRec ? Number(lastRec.final_meter) : Number(nozzle.last_reading) || 0;
    setInitialMeter(startMeter);
    setFinalMeter(startMeter);

    const curPrice = getCurrentPrice(nozzle.fuel_type_id);
    setReadingPricePerLiter(curPrice);
    setReadingError(null);
    setReadingNotes('');
    setIsReadingModalOpen(true);
  };

  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNozzleForReading) return;
    if (soldLiters < 0) {
      alert('Сөрөг зөрүүтэй борлуулалтыг батлах боломжгүй. Шалтгааныг шалгана уу.');
      return;
    }
    if (readingPricePerLiter <= 0) {
      alert('Шатахууны хүчинтэй литрийн үнэ тохируулаагүй байна. Эхлээд үнэ тохируулна уу.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    // 1. Insert meter reading
    const { data: insertedReading, error: readErr } = await supabase
      .from('fuel_meter_readings')
      .insert([
        {
          nozzle_id: activeNozzleForReading.id,
          shift_id: readingShiftId || null,
          employee_id: readingEmpId,
          reading_date: readingDate,
          initial_meter: initialMeter,
          final_meter: finalMeter,
          sold_liters: soldLiters,
          price_per_liter: readingPricePerLiter,
          total_amount: totalSalesAmount,
          status: 'approved',
          notes: readingNotes || null,
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (readErr) {
      alert(`Алдаа: ${readErr.message}`);
      return;
    }

    // 2. Update nozzle's last_reading
    await supabase
      .from('fuel_nozzles')
      .update({
        last_reading: finalMeter,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeNozzleForReading.id);

    // 3. Deduct from associated storage tank if exists
    if (activeNozzleForReading.tank_id) {
      const tank = tanks.find((t) => t.id === activeNozzleForReading.tank_id);
      if (tank) {
        const newTankLiters = Math.max(0, +(Number(tank.current_liters) - soldLiters).toFixed(2));
        await supabase
          .from('storage_tanks')
          .update({
            current_liters: newTankLiters,
            last_measured_at: new Date().toISOString(),
          })
          .eq('id', tank.id);
      }
    }

    setIsReadingModalOpen(false);
    fetchData();
  };

  const handleSaveNozzle = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('fuel_nozzles').insert([
      {
        nozzle_number: nozzleNumber,
        nozzle_name: nozzleName,
        fuel_type_id: nozzleFuelTypeId,
        tank_id: nozzleTankId || null,
        status: 'active',
        last_reading: parseFloat(nozzleInitialMeter) || 0,
        updated_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsNozzleModalOpen(false);
      setNozzleNumber('');
      setNozzleName('');
      setNozzleInitialMeter('0');
      fetchData();
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNozzle) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('fuel_nozzles')
      .update({
        status: newStatus,
        status_reason: statusReason || null,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedNozzle.id);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsStatusModalOpen(false);
      setSelectedNozzle(null);
      setStatusReason('');
      fetchData();
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('fuel_prices').insert([
      {
        fuel_type_id: priceFuelTypeId,
        price_per_liter: Math.round(Number(newPrice)),
        set_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsPriceModalOpen(false);
      setNewPrice(0);
      fetchData();
    }
  };

  const getNozzleStatusLabel = (s: NozzleStatus) => {
    switch (s) {
      case 'active':
        return 'Идэвхтэй';
      case 'out_of_fuel':
        return 'Шатахуун дууссан';
      case 'temp_closed':
        return 'Түр хаасан';
      case 'maintenance':
        return 'Засвартай';
      case 'inactive':
        return 'Идэвхгүй';
    }
  };

  const getStatusBadgeClass = (s: NozzleStatus) => {
    switch (s) {
      case 'active':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'out_of_fuel':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'temp_closed':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'maintenance':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'inactive':
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Шатахууны хошуу ба борлуулалт
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Хошууны төлөв, милль заалтын автомат бодолт ба үнийн түүх
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <>
              <button
                onClick={() => setIsPriceModalOpen(true)}
                disabled={fuelTypes.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Үнэ шинэчлэх</span>
              </button>
              <button
                onClick={() => setIsNozzleModalOpen(true)}
                disabled={fuelTypes.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Хошуу нэмэх</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fuel Type Price Strip */}
      {fuelTypes.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Хүчинтэй үнэ:
          </span>
          {fuelTypes.map((ft) => {
            const p = getCurrentPrice(ft.id);
            return (
              <div
                key={ft.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
              >
                <span className="text-xs font-bold text-amber-300">{ft.name}</span>
                <span className="text-xs font-mono font-semibold text-white">
                  {p > 0 ? formatMNT(p) : 'Үнэ тохируулаагүй'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Nozzles Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Шатахуун түгээх хошуунууд
        </h3>

        {nozzles.length === 0 ? (
          <EmptyState
            title="Хошуу бүртгэгдээгүй байна"
            description="ШТС-ийн хошууг нэмэхийн өмнө шатахууны төрлийг Админ тохиргооноос бүртгэнэ үү."
            actionText={role === 'admin' && fuelTypes.length > 0 ? 'Хошуу нэмэх' : undefined}
            onAction={() => setIsNozzleModalOpen(true)}
            icon={Fuel}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nozzles.map((noz) => {
              const curPrice = getCurrentPrice(noz.fuel_type_id);
              return (
                <div
                  key={noz.id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {noz.nozzle_number}-р хошуу
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({noz.nozzle_name})
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(
                        noz.status
                      )}`}
                    >
                      {getNozzleStatusLabel(noz.status)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Шатахуун:</span>
                      <span className="font-semibold text-amber-300">
                        {noz.fuel_type?.name} ({noz.fuel_type?.code})
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Сүүлийн милль:</span>
                      <span className="font-mono text-slate-100 font-bold">
                        {noz.last_reading}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Литрийн үнэ:</span>
                      <span className="font-mono text-emerald-400">
                        {curPrice > 0 ? formatMNT(curPrice) : 'Тохируулаагүй'}
                      </span>
                    </div>
                    {noz.status_reason && (
                      <div className="text-[11px] text-rose-300/90 pt-1">
                        Шалтгаан: {noz.status_reason}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedNozzle(noz);
                        setNewStatus(noz.status);
                        setStatusReason(noz.status_reason || '');
                        setIsStatusModalOpen(true);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Төлөв өөрчлөх
                    </button>

                    <button
                      onClick={() => handleOpenReadingModal(noz)}
                      disabled={noz.status !== 'active'}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                    >
                      Милль бүртгэх
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meter Readings History */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Сүүлийн борлуулалтын милль заалтууд
        </h3>

        {readings.length === 0 ? (
          <EmptyState
            title="Милль заалт бүртгэгдээгүй байна"
            description="Ээлжийн дараа хошуу бүрийн эхний болон эцсийн заалтыг оруулж борлуулалтыг бодно."
            icon={Clock}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Хошуу / Шатахуун</th>
                  <th className="py-3 px-4">Ажилтан</th>
                  <th className="py-3 px-4">Эхний милль</th>
                  <th className="py-3 px-4">Эцсийн милль</th>
                  <th className="py-3 px-4">Зарагдсан литр</th>
                  <th className="py-3 px-4">Үнэ</th>
                  <th className="py-3 px-4">Нийт борлуулалт</th>
                  <th className="py-3 px-4">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {readings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">{r.reading_date}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">
                        {r.nozzle?.nozzle_number}-р хошуу
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {r.employee?.full_name || 'Ажилтан'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.initial_meter}</td>
                    <td className="py-3 px-4 font-mono text-slate-200 font-semibold">{r.final_meter}</td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {formatLiters(r.sold_liters)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatMNT(r.price_per_liter)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatMNT(r.total_amount)}
                    </td>
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

      {/* Modal: Record Meter Reading */}
      <Modal
        isOpen={isReadingModalOpen}
        onClose={() => setIsReadingModalOpen(false)}
        title={`Хошуу ${activeNozzleForReading?.nozzle_number} - Милль бүртгэх`}
      >
        <form onSubmit={handleSaveReading} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Шатахуун:</span>
              <span className="font-bold text-amber-400">
                {activeNozzleForReading?.fuel_type?.name}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Хүчинтэй үнэ:</span>
              <span className="font-bold font-mono text-emerald-400">
                {formatMNT(readingPricePerLiter)} / литр
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Борлуулалтын огноо
              </label>
              <input
                type="date"
                required
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Хариуцсан ажилтан
              </label>
              <select
                required
                value={readingEmpId}
                onChange={(e) => setReadingEmpId(e.target.value)}
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эхний милль
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={initialMeter}
                onChange={(e) => setInitialMeter(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эцсийн милль
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={finalMeter}
                onChange={(e) => setFinalMeter(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold"
              />
            </div>
          </div>

          {/* Auto Calculated Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Зарагдсан литр:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {formatLiters(soldLiters)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Борлуулалтын дүн:</span>
              <span className="font-mono font-bold text-emerald-400 text-base">
                {formatMNT(totalSalesAmount)}
              </span>
            </div>
          </div>

          {readingError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {readingError}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Зөрүүгийн шалтгаан
            </label>
            <input
              type="text"
              value={readingNotes}
              onChange={(e) => setReadingNotes(e.target.value)}
              placeholder="Шаардлагатай бол тайлбар бичих"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={soldLiters < 0 || readingPricePerLiter <= 0}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              Милль & Борлуулалт баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Nozzle */}
      <Modal
        isOpen={isNozzleModalOpen}
        onClose={() => setIsNozzleModalOpen(false)}
        title="Шинэ хошуу бүртгэх"
      >
        <form onSubmit={handleSaveNozzle} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хошууны дугаар
            </label>
            <input
              type="text"
              required
              value={nozzleNumber}
              onChange={(e) => setNozzleNumber(e.target.value)}
              placeholder="Жишээ: 1"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хошууны таних нэр
            </label>
            <input
              type="text"
              required
              value={nozzleName}
              onChange={(e) => setNozzleName(e.target.value)}
              placeholder="Жишээ: Баруун талын А-92 хошуу"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шатахууны төрөл
            </label>
            <select
              required
              value={nozzleFuelTypeId}
              onChange={(e) => setNozzleFuelTypeId(e.target.value)}
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

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Холбогдох сав (Сонголттой)
            </label>
            <select
              value={nozzleTankId}
              onChange={(e) => setNozzleTankId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Сав сонгохгүй --</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tank_number} ({t.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Анхны милль заалт
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={nozzleInitialMeter}
              onChange={(e) => setNozzleInitialMeter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Хошуу бүртгэх
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Status */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Хошууны төлөв солих"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Төлөв сонгох
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as NozzleStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="active">Идэвхтэй (Борлуулалт нээлттэй)</option>
              <option value="out_of_fuel">Шатахуун дууссан (Борлуулалт хаагдсан)</option>
              <option value="temp_closed">Түр хаасан</option>
              <option value="maintenance">Засвартай</option>
              <option value="inactive">Идэвхгүй</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Төлөв солих шалтгаан
            </label>
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Жишээ: Савны түвшин дууссан тул түр хаав"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Төлөв шинэчлэх
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Set Price (Admin) */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        title="Шатахууны үнэ шинэчлэх"
      >
        <form onSubmit={handleSavePrice} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шатахууны төрөл
            </label>
            <select
              required
              value={priceFuelTypeId}
              onChange={(e) => setPriceFuelTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Төрөл сонгох --</option>
              {fuelTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.name} ({ft.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Шинэ литрийн үнэ (бүхэл төгрөг)
            </label>
            <input
              type="number"
              required
              value={newPrice}
              onChange={(e) => setNewPrice(Math.round(Number(e.target.value)))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            * Анхаар: Үнэ шинэчлэгдсэн ч өмнөх баталгаажсан хуучин борлуулалтын дүн өөрчлөгдөхгүй, үнийн түүх хадгалагдана.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Үнэ хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
