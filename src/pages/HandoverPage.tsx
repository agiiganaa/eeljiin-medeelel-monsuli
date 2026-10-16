import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { ShiftHandover, Employee, Shift } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

export const HandoverPage: React.FC = () => {
  const { role, user } = useAuth();
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: New Handover
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftId, setShiftId] = useState('');
  const [outgoingEmpId, setOutgoingEmpId] = useState('');
  const [incomingEmpId, setIncomingEmpId] = useState('');
  const [fuelSalesTotal, setFuelSalesTotal] = useState<number>(0);
  const [productSalesTotal, setProductSalesTotal] = useState<number>(0);
  const [posTotal, setPosTotal] = useState<number>(0);
  const [bankTotal, setBankTotal] = useState<number>(0);
  const [cashTotal, setCashTotal] = useState<number>(0);
  const [actualTotal, setActualTotal] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Auto aggregated values
  const totalCalculatedSales = Math.round(Number(fuelSalesTotal) + Number(productSalesTotal));
  const totalSettledPayments = Math.round(Number(posTotal) + Number(bankTotal) + Number(cashTotal));
  const diff = Math.round(totalSettledPayments - totalCalculatedSales);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [hRes, eRes, sRes] = await Promise.all([
        supabase
          .from('shift_handovers')
          .select(`
            *,
            outgoing_employee:employees!shift_handovers_outgoing_employee_id_fkey(*),
            incoming_employee:employees!shift_handovers_incoming_employee_id_fkey(*),
            shift:shifts(*)
          `)
          .order('handover_date', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shifts').select('*').eq('is_active', true),
      ]);

      if (hRes.data) setHandovers(hRes.data);
      if (eRes.data) setEmployees(eRes.data);
      if (sRes.data) setShifts(sRes.data);
    } catch (err) {
      console.error('Handover fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (outgoingEmpId === incomingEmpId) {
      alert('Хүлээлгэн өгөгч болон хүлээн авагч ажилтан өөр хүмүүс байх ёстой!');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('shift_handovers').insert([
      {
        handover_date: date,
        shift_id: shiftId || null,
        outgoing_employee_id: outgoingEmpId,
        incoming_employee_id: incomingEmpId,
        fuel_sales_total: Math.round(Number(fuelSalesTotal)),
        product_sales_total: Math.round(Number(productSalesTotal)),
        pos_total: Math.round(Number(posTotal)),
        bank_total: Math.round(Number(bankTotal)),
        cash_total: Math.round(Number(cashTotal)),
        calculated_total: totalCalculatedSales,
        actual_total: totalSettledPayments,
        difference: diff,
        outgoing_confirmed: true, // Outgoing employee submits so confirmed
        incoming_confirmed: false,
        manager_verified: false,
        notes: notes || null,
        status: 'pending',
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleConfirmIncoming = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('shift_handovers')
      .update({ incoming_confirmed: true })
      .eq('id', id);

    if (!error) fetchData();
  };

  const handleManagerVerify = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('shift_handovers')
      .update({
        manager_verified: true,
        manager_id: user?.id || null,
        status: 'approved',
      })
      .eq('id', id);

    if (!error) fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ээлж хүлээлцэх
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Хоёр талын (өгсөн, авсан) ажилтны болон эрхлэгчийн 3 талт нэгдсэн баталгаажуулалт
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={employees.length < 2}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Шинэ ээлж хүлээлцэх</span>
        </button>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
        <div className="font-semibold text-white mb-1">Хүлээлцэх протокол:</div>
        <p className="text-slate-400 leading-relaxed">
          1. Хүлээлгэн өгч буй ажилтан шатахууны милль, тос, POS, банк болон бэлэн мөнгөө нэгтгэн илгээнэ.
          2. Хүлээн авч буй ажилтан үлдэгдлийг тулган баталгаажуулна.
          3. Эрхлэгч/Админ эцсийн баталгаажуулалт хийснээр дараагийн ээлжийн эхний милльд автоматаар шилжинэ.
        </p>
      </div>

      {/* Handovers Table */}
      {handovers.length === 0 ? (
        <EmptyState
          title="Ээлж хүлээлцсэн бүртгэл байхгүй байна"
          description="Ээлж солигдох үед ажилтнууд тооцоогоо нэгтгэн 'Шинэ ээлж хүлээлцэх' товчоор баталгаажуулна."
          actionText="Ээлж хүлээлцэх"
          onAction={() => setIsModalOpen(true)}
          icon={ArrowRightLeft}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Огноо / Ээлж</th>
                <th className="py-3 px-4">Хүлээлгэн өгсөн</th>
                <th className="py-3 px-4">Хүлээн авсан</th>
                <th className="py-3 px-4">Нийт борлуулалт</th>
                <th className="py-3 px-4">Төлбөрийн нийлбэр (POS+Банк+Касс)</th>
                <th className="py-3 px-4">Зөрүү</th>
                <th className="py-3 px-4">Баталгаажуулалт</th>
                <th className="py-3 px-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {handovers.map((h) => (
                <tr key={h.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <span className="block text-white font-bold">{h.handover_date}</span>
                    <span className="text-[11px] text-slate-400">{h.shift?.name || 'Ээлж'}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-amber-300">
                    {h.outgoing_employee?.full_name}
                  </td>
                  <td className="py-3 px-4 font-semibold text-sky-300">
                    {h.incoming_employee?.full_name}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {formatMNT(h.calculated_total)}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">
                    {formatMNT(h.actual_total)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    {h.difference === 0 ? (
                      <span className="text-emerald-400">0 ₮ (Тэнцсэн)</span>
                    ) : (
                      <span className="text-rose-400">{formatMNT(h.difference)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">Авсан:</span>
                      {h.incoming_confirmed ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Баталсан
                        </span>
                      ) : (
                        <span className="text-amber-400">Хүлээгдэж буй</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">Эрхлэгч:</span>
                      {h.manager_verified ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Баталсан
                        </span>
                      ) : (
                        <span className="text-slate-500">Батлаагүй</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!h.incoming_confirmed && (
                        <button
                          onClick={() => handleConfirmIncoming(h.id)}
                          className="px-2 py-1 text-xs rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition-colors"
                        >
                          Хүлээн авсан батлах
                        </button>
                      )}

                      {!h.manager_verified && (role === 'admin' || role === 'manager') && (
                        <button
                          onClick={() => handleManagerVerify(h.id)}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                        >
                          Эрхлэгч батлах
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Handover */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ээлж хүлээлцэх тайлан бүртгэх"
      >
        <form onSubmit={handleCreateHandover} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Хүлээлцэх огноо
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ээлжийн загвар
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="">-- Ээлж сонгох --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time_str} - {s.end_time_str})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Хүлээлгэн өгөгч (Бууж буй)
              </label>
              <select
                required
                value={outgoingEmpId}
                onChange={(e) => setOutgoingEmpId(e.target.value)}
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
                Хүлээн авагч (Орж буй)
              </label>
              <select
                required
                value={incomingEmpId}
                onChange={(e) => setIncomingEmpId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Шатахууны нийт борлуулалт (₮)
              </label>
              <input
                type="number"
                required
                value={fuelSalesTotal || ''}
                onChange={(e) => setFuelSalesTotal(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Тос, бүтээгдэхүүний дүн (₮)
              </label>
              <input
                type="number"
                value={productSalesTotal || ''}
                onChange={(e) => setProductSalesTotal(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                POS картын дүн (₮)
              </label>
              <input
                type="number"
                value={posTotal || ''}
                onChange={(e) => setPosTotal(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Банк / QPay дүн (₮)
              </label>
              <input
                type="number"
                value={bankTotal || ''}
                onChange={(e) => setBankTotal(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Бэлэн мөнгөний дүн (₮)
              </label>
              <input
                type="number"
                value={cashTotal || ''}
                onChange={(e) => setCashTotal(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Нийт борлуулалт:</span>
              <span className="text-white font-bold">{formatMNT(totalCalculatedSales)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Төлбөрийн нийлбэр:</span>
              <span className="text-emerald-400 font-bold">{formatMNT(totalSettledPayments)}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span>Тооцооны зөрүү:</span>
              <span
                className={`font-bold ${
                  diff === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatMNT(diff)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Зөрүү гарсан бол
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Хоёр талын тэмдэглэл"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Ээлж хүлээлцэх баримт үүсгэх
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
