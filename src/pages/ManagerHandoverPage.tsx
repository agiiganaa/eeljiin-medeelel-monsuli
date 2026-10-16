import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { ManagerHandoverPayment, Employee, Shift } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  HandCoins,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  Coins,
} from 'lucide-react';

export const ManagerHandoverPage: React.FC = () => {
  const { role, user } = useAuth();
  const [payments, setPayments] = useState<ManagerHandoverPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Create Handover to Manager
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [empId, setEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'card_total' | 'bank_slip'>('cash');
  const [handedAmount, setHandedAmount] = useState<number>(0);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const diff = Math.round(Number(receivedAmount) - Number(handedAmount));

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [payRes, empRes, shiftRes] = await Promise.all([
        supabase
          .from('manager_handover_payments')
          .select('*, employee:employees(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shifts').select('*').eq('is_active', true),
      ]);

      if (payRes.data) setPayments(payRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
    } catch (err) {
      console.error('Manager handover fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (handedAmount <= 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('manager_handover_payments').insert([
      {
        employee_id: empId,
        manager_id: user?.id || empId, // Assigned manager
        shift_id: shiftId || null,
        handover_date: date,
        payment_type: paymentType,
        handed_amount: Math.round(Number(handedAmount)),
        received_amount: Math.round(Number(receivedAmount || handedAmount)),
        difference: Number(receivedAmount) ? diff : 0,
        is_confirmed: role === 'admin' || role === 'manager',
        notes: notes || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setHandedAmount(0);
      setReceivedAmount(0);
      setNotes('');
      fetchData();
    }
  };

  const handleManagerConfirm = async (id: string, amount: number) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('manager_handover_payments')
      .update({
        is_confirmed: true,
        received_amount: amount,
        difference: 0,
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
            Эрхлэгчид мөнгө хүлээлгэн өгөх
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Түгээгчээс эрхлэгчид тушаасан бэлэн болон картын орлогын тооцоо
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={employees.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Мөнгө хүлээлгэн өгөх</span>
        </button>
      </div>

      {/* Info notice */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
        <p className="leading-relaxed">
          * <strong>Давхар тооцохоос сэргийлэх дүрэм:</strong> Эрхлэгчид тушаасан мөнгө нь кассын болон эрхлэгчийн дансны бүртгэлд тус бүрдээ давхар хасагдаж/нэмэгдэхгүй бөгөөд тогтвортой гүйлгээний бүртгэлээр хянагдана.
        </p>
      </div>

      {/* Handover Payments Table */}
      {payments.length === 0 ? (
        <EmptyState
          title="Эрхлэгчид тушаасан мөнгөний бүртгэл байхгүй байна"
          description="Түгээгч ээлжийн орлогоо эрхлэгчид тоолж хүлээлгэн өгөх үед энэ хуудсанд бүртгэнэ."
          actionText="Мөнгө хүлээлгэн өгөх"
          onAction={() => setIsModalOpen(true)}
          icon={HandCoins}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Огноо</th>
                <th className="py-3 px-4">Хүлээлгэн өгсөн ажилтан</th>
                <th className="py-3 px-4">Төрөл</th>
                <th className="py-3 px-4">Өгсөн дүн</th>
                <th className="py-3 px-4">Хүлээн авсан дүн</th>
                <th className="py-3 px-4">Зөрүү</th>
                <th className="py-3 px-4">Төлөв</th>
                <th className="py-3 px-4">Тайлбар</th>
                <th className="py-3 px-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-300">{p.handover_date}</td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {p.employee?.full_name}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {p.payment_type === 'cash'
                      ? 'Бэлэн мөнгө'
                      : p.payment_type === 'card_total'
                      ? 'Картын дүн'
                      : 'Банкны баримт'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {formatMNT(p.handed_amount)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {formatMNT(p.received_amount)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {p.difference === 0 ? (
                      <span className="text-emerald-400">0 ₮</span>
                    ) : (
                      <span className="text-rose-400">{formatMNT(p.difference)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {p.is_confirmed ? (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Хүлээн авсан
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400">Хүлээгдэж буй</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{p.notes || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    {!p.is_confirmed && (role === 'admin' || role === 'manager') && (
                      <button
                        onClick={() => handleManagerConfirm(p.id, p.handed_amount)}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
                      >
                        Хүлээж авах
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Handover to Manager */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Эрхлэгчид мөнгө хүлээлгэн өгөх"
      >
        <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Огноо
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
                Хүлээлгэн өгч буй ажилтан
              </label>
              <select
                required
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="">-- Ажилтан сонгох --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Мөнгөний төрөл
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="cash">Бэлэн мөнгө (Кассын орлого)</option>
              <option value="card_total">POS картын нийт дүн</option>
              <option value="bank_slip">Банкны баримт / Шилжүүлэг</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Хүлээлгэн өгөх дүн (₮)
              </label>
              <input
                type="number"
                required
                value={handedAmount || ''}
                onChange={(e) => setHandedAmount(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Бодит хүлээн авсан дүн (₮)
              </label>
              <input
                type="number"
                value={receivedAmount || ''}
                onChange={(e) => setReceivedAmount(Math.round(Number(e.target.value)))}
                placeholder="Ижил дүнгээр авах бол хоосон орхиж болно"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Зөрүүгийн тэмдэглэл
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Жишээ: 10/12-ны өдрийн ээлжийн кассын үлдэгдэл тушаав"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Мөнгө хүлээлгэн өгсөн бүртгэл үүсгэх
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
