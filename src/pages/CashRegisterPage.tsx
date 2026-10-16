import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { CashTransaction, Employee, Shift, CashRegister } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Coins,
  Plus,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export const CashRegisterPage: React.FC = () => {
  const { role, user } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Record Cash Count
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empId, setEmpId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [cashSales, setCashSales] = useState<number>(0);
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [refunds, setRefunds] = useState<number>(0);
  const [approvedExpenses, setApprovedExpenses] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Auto calculated fields
  const calculatedEndCash = Math.round(
    Number(openingCash) +
      Number(cashSales) +
      Number(otherIncome) -
      Number(refunds) -
      Number(approvedExpenses)
  );

  const variance = Math.round(Number(actualCash) - calculatedEndCash);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [txRes, empRes, shiftRes, regRes] = await Promise.all([
        supabase
          .from('cash_transactions')
          .select('*, employee:employees(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shifts').select('*').eq('is_active', true),
        supabase.from('cash_registers').select('*'),
      ]);

      if (txRes.data) setTransactions(txRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
      if (regRes.data) setRegisters(regRes.data);
    } catch (err) {
      console.error('Cash fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('cash_transactions').insert([
      {
        employee_id: empId,
        shift_id: shiftId || null,
        transaction_date: date,
        opening_cash: Math.round(Number(openingCash)),
        cash_sales: Math.round(Number(cashSales)),
        other_income: Math.round(Number(otherIncome)),
        refunds: Math.round(Number(refunds)),
        approved_expenses: Math.round(Number(approvedExpenses)),
        calculated_cash: calculatedEndCash,
        actual_cash: Math.round(Number(actualCash)),
        difference: variance,
        notes: notes || null,
        status: 'approved',
        verified_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setOpeningCash(0);
      setCashSales(0);
      setOtherIncome(0);
      setRefunds(0);
      setApprovedExpenses(0);
      setActualCash(0);
      setNotes('');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Бэлэн мөнгөний тооцоо
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Эхний касс, бэлэн борлуулалт, зөвшөөрөгдсөн зарлага ба бодит тоолсон зөрүү
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={employees.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Касс тоолох & Бүртгэх</span>
        </button>
      </div>

      {/* Formula explanation box */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-white">Тооцооллын стандарт дүрэм:</div>
          <div className="text-slate-400 font-mono text-[11px]">
            Тооцоолсон эцсийн касс = Эхний касс + Бэлэн борлуулалт + Бусад орлого − Буцаалт − Зөвшөөрөгдсөн зарлага
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            Зөрүү = Бодитоор тоолсон мөнгө − Тооцоолсон эцсийн касс
          </div>
        </div>
        <div className="text-amber-400 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20 text-xs font-semibold shrink-0">
          Бүхэл төгрөгөөр (₮)
        </div>
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Кассын тооллого ба тэнцлийн түүх
        </h3>

        {transactions.length === 0 ? (
          <EmptyState
            title="Кассын тооцоо бүртгэгдээгүй байна"
            description="Ээлж дуусахад кассын бодит бэлэн мөнгийг тоолж, тооцоолсон дүнтэй тулган бүртгэнэ."
            actionText="Касс тоолох"
            onAction={() => setIsModalOpen(true)}
            icon={Coins}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Ажилтан</th>
                  <th className="py-3 px-4">Эхний касс</th>
                  <th className="py-3 px-4">Бэлэн борлуулалт</th>
                  <th className="py-3 px-4">Зөвшөөрсөн зарлага</th>
                  <th className="py-3 px-4">Тооцоолсон касс</th>
                  <th className="py-3 px-4">Бодит тоолсон</th>
                  <th className="py-3 px-4">Зөрүү</th>
                  <th className="py-3 px-4">Тайлбар</th>
                  <th className="py-3 px-4">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {tx.transaction_date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {tx.employee?.full_name || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatMNT(tx.opening_cash)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      +{formatMNT(tx.cash_sales)}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-400">
                      -{formatMNT(tx.approved_expenses)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {formatMNT(tx.calculated_cash)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {formatMNT(tx.actual_cash)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {tx.difference === 0 ? (
                        <span className="text-emerald-400">0 ₮ (Тэгш)</span>
                      ) : tx.difference > 0 ? (
                        <span className="text-emerald-400">+{formatMNT(tx.difference)}</span>
                      ) : (
                        <span className="text-rose-400">{formatMNT(tx.difference)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{tx.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Батлагдсан
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Cash Count */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Бэлэн мөнгөний тооллого & Кассын тэнцэл бүртгэх"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
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
                Хариуцсан ажилтан
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эхний касс (₮)
              </label>
              <input
                type="number"
                value={openingCash || ''}
                onChange={(e) => setOpeningCash(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Бэлэн борлуулалт (₮)
              </label>
              <input
                type="number"
                required
                value={cashSales || ''}
                onChange={(e) => setCashSales(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Бусад орлого (₮)
              </label>
              <input
                type="number"
                value={otherIncome || ''}
                onChange={(e) => setOtherIncome(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Буцаалт (₮)
              </label>
              <input
                type="number"
                value={refunds || ''}
                onChange={(e) => setRefunds(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Зөвшөөрсөн зарлага (₮)
              </label>
              <input
                type="number"
                value={approvedExpenses || ''}
                onChange={(e) => setApprovedExpenses(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Тооцоолсон эцсийн касс:</span>
            <span className="text-sm font-bold font-mono text-white">
              {formatMNT(calculatedEndCash)}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Бодитоор тоолсон бэлэн мөнгө (₮)
            </label>
            <input
              type="number"
              required
              value={actualCash || ''}
              onChange={(e) => setActualCash(Math.round(Number(e.target.value)))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold text-amber-300"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Кассын зөрүү:</span>
            <span
              className={`text-sm font-bold font-mono ${
                variance === 0
                  ? 'text-emerald-400'
                  : variance > 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {variance === 0 ? '0 ₮' : formatMNT(variance)}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Зөрүү гарсан шалтгаан
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Шаардлагатай бол зөрүүгийн тайлбар"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Кассын тооцоо хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
