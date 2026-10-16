import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { PayrollRecord, PayrollPayment, PayrollSettings, Employee } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Banknote,
  Plus,
  Settings,
  Calendar,
  CheckCircle2,
  DollarSign,
  Send,
  User,
  History,
} from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const { role, user } = useAuth();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Calculate/Create Payroll
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [periodStart, setPeriodStart] = useState('2026-09-19');
  const [periodEnd, setPeriodEnd] = useState('2026-10-18');
  const [bonus, setBonus] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [advance, setAdvance] = useState(0);

  // Modal: Pay Salary
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activePayrollRecord, setActivePayrollRecord] = useState<PayrollRecord | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payType, setPayType] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [payNotes, setPayNotes] = useState('');

  // Modal: Settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [cutoffDay, setCutoffDay] = useState(18);
  const [firstPayoutDay, setFirstPayoutDay] = useState(25);
  const [secondPayoutDay, setSecondPayoutDay] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [payRes, empRes, setRes, paymentRes] = await Promise.all([
        supabase
          .from('payroll_records')
          .select('*, employee:employees(*)')
          .order('period_end', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('payroll_settings').select('*').limit(1).maybeSingle(),
        supabase.from('payroll_payments').select('*, employee:employees(*)').order('created_at', { ascending: false }),
      ]);

      if (payRes.data) setPayrollRecords(payRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (setRes.data) {
        setSettings(setRes.data);
        setCutoffDay(setRes.data.cut_off_day);
        setFirstPayoutDay(setRes.data.first_payout_day);
        setSecondPayoutDay(setRes.data.second_payout_day);
      }
      if (paymentRes.data) setPayments(paymentRes.data);
    } catch (err) {
      console.error('Payroll fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute verified hours and salary preview for employee
  const handleCalculateAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !selectedEmpId) return;

    // Fetch verified attendance records within the period ONLY ('approved' status)
    const { data: attData } = await supabase
      .from('attendance_records')
      .select('actual_hours')
      .eq('employee_id', selectedEmpId)
      .eq('status', 'approved')
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd);

    const verifiedHours = (attData || []).reduce((acc, a) => acc + Number(a.actual_hours || 0), 0);

    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) return;

    let basePay = Number(emp.base_salary) || 0;
    let hourlyPay = 0;

    if (emp.payroll_type === 'hourly') {
      hourlyPay = Math.round(verifiedHours * Number(emp.hourly_rate));
    } else if (emp.payroll_type === 'shift_based') {
      hourlyPay = Math.round(verifiedHours * Number(emp.hourly_rate));
    }

    const gross = (emp.payroll_type === 'fixed_salary' ? basePay : hourlyPay) + Number(bonus);
    const net = Math.max(0, gross - Number(deduction) - Number(advance));

    const { error } = await supabase.from('payroll_records').insert([
      {
        employee_id: selectedEmpId,
        period_start: periodStart,
        period_end: periodEnd,
        base_pay: basePay,
        hourly_pay: hourlyPay,
        verified_hours: verifiedHours,
        bonus: Number(bonus),
        deduction: Number(deduction),
        advance: Number(advance),
        total_net: net,
        paid_amount: 0,
        balance: net,
        status: 'approved',
        verified_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsCalcModalOpen(false);
      setBonus(0);
      setDeduction(0);
      setAdvance(0);
      fetchData();
    }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayrollRecord || payAmount <= 0) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const newPaidAmount = Number(activePayrollRecord.paid_amount) + Number(payAmount);
    const newBalance = Math.max(0, Number(activePayrollRecord.total_net) - newPaidAmount);

    // 1. Insert payment transaction
    const { error: payErr } = await supabase.from('payroll_payments').insert([
      {
        payroll_record_id: activePayrollRecord.id,
        employee_id: activePayrollRecord.employee_id,
        amount: Math.round(Number(payAmount)),
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: payType,
        notes: payNotes || null,
        created_by: user?.id || null,
      },
    ]);

    if (payErr) {
      alert(`Алдаа: ${payErr.message}`);
      return;
    }

    // 2. Update record balance
    await supabase
      .from('payroll_records')
      .update({
        paid_amount: newPaidAmount,
        balance: newBalance,
      })
      .eq('id', activePayrollRecord.id);

    setIsPayModalOpen(false);
    setActivePayrollRecord(null);
    setPayAmount(0);
    setPayNotes('');
    fetchData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    if (settings?.id) {
      await supabase
        .from('payroll_settings')
        .update({
          cut_off_day: cutoffDay,
          first_payout_day: firstPayoutDay,
          second_payout_day: secondPayoutDay,
          updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);
    } else {
      await supabase.from('payroll_settings').insert([
        {
          cut_off_day: cutoffDay,
          first_payout_day: firstPayoutDay,
          second_payout_day: secondPayoutDay,
          updated_by: user?.id || null,
        },
      ]);
    }

    setIsSettingsModalOpen(false);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Цалингийн бүртгэл
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Зөвхөн баталгаажсан цагт үндэслэн бүхэл төгрөгөөр тооцоолох
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Мөчлөгийн тохиргоо</span>
            </button>
          )}

          <button
            onClick={() => setIsCalcModalOpen(true)}
            disabled={employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Цалин бодох</span>
          </button>
        </div>
      </div>

      {/* Cycle settings notice */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Цалингийн мөчлөг:</span>{' '}
            Сар бүрийн <strong>{cutoffDay}-нд</strong> таслах · Үндсэн олголт:{' '}
            <strong>{firstPayoutDay}-нд</strong> · Үлдэгдэл / 2-р олголт:{' '}
            <strong>Дараа сарын {secondPayoutDay}-нд</strong>
          </div>
        </div>
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
          Бүхэл ₮ (бутархайгүй)
        </div>
      </div>

      {/* Payroll Table */}
      {payrollRecords.length === 0 ? (
        <EmptyState
          title="Цалингийн бүртгэл байхгүй байна"
          description="Ажилтнуудын баталгаажсан цагт үндэслэн цалин бодохын тулд 'Цалин бодох' товчийг дарна уу."
          actionText="Цалин бодох"
          onAction={() => setIsCalcModalOpen(true)}
          icon={Banknote}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Хугацаа</th>
                <th className="py-3 px-4">Ажилтан</th>
                <th className="py-3 px-4">Батлагдсан цаг</th>
                <th className="py-3 px-4">Үндсэн / Цагийн</th>
                <th className="py-3 px-4">Нэмэгдэл / Суутгал</th>
                <th className="py-3 px-4">Нийт цэвэр</th>
                <th className="py-3 px-4">Олгосон</th>
                <th className="py-3 px-4">Үлдэгдэл</th>
                <th className="py-3 px-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {payrollRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {r.period_start} ~ {r.period_end}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {r.employee?.full_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-300">
                    {r.verified_hours} цаг
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {r.employee?.payroll_type === 'hourly'
                      ? formatMNT(r.hourly_pay)
                      : formatMNT(r.base_pay)}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    +{formatMNT(r.bonus)} / -{formatMNT(r.deduction + r.advance)}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {formatMNT(r.total_net)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-400">
                    {formatMNT(r.paid_amount)}
                  </td>
                  <td className="py-3 px-4 font-bold text-amber-300">
                    {formatMNT(r.balance)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.balance > 0 && (role === 'admin' || role === 'manager') ? (
                      <button
                        onClick={() => {
                          setActivePayrollRecord(r);
                          setPayAmount(Number(r.balance));
                          setIsPayModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Олгох</span>
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-[11px] font-semibold">
                        Олгогдсон
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Transactions Log */}
      {payments.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            <span>Цалингийн олголтын түүх</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-2">Огноо</th>
                  <th className="py-2">Ажилтан</th>
                  <th className="py-2">Олгосон дүн</th>
                  <th className="py-2">Төлбөрийн хэлбэр</th>
                  <th className="py-2">Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-mono text-slate-400">{p.payment_date}</td>
                    <td className="py-2 font-semibold text-white">{p.employee?.full_name}</td>
                    <td className="py-2 font-bold text-emerald-400">{formatMNT(p.amount)}</td>
                    <td className="py-2 text-slate-300">
                      {p.payment_type === 'bank_transfer' ? 'Дансаар' : 'Бэлнээр'}
                    </td>
                    <td className="py-2 text-slate-400">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Calculate Payroll */}
      <Modal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        title="Цалин бодох (Баталгаажсан цагаар)"
      >
        <form onSubmit={handleCalculateAndCreate} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ажилтан сонгох
            </label>
            <select
              required
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Ажилтан сонгох --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.employee_code}) - {emp.payroll_type === 'hourly' ? `${formatMNT(emp.hourly_rate)}/ц` : formatMNT(emp.base_salary)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эхлэх өдөр
              </label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Дуусах өдөр (Таслах)
              </label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Нэмэгдэл (₮)
              </label>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Суутгал (₮)
              </label>
              <input
                type="number"
                value={deduction}
                onChange={(e) => setDeduction(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Урьдчилгаа (₮)
              </label>
              <input
                type="number"
                value={advance}
                onChange={(e) => setAdvance(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
            * Анхаар: Зөвхөн эрхлэгч/админ баталгаажуулсан цагийн бүртгэлүүдийг автоматаар нэгтгэн цалин бодно.
          </p>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Цалин бодож батлах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Pay Salary */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Цалингийн олголт бүртгэх"
      >
        <form onSubmit={handlePaySalary} className="space-y-3.5 text-xs">
          <div>
            <span className="text-slate-400">Ажилтан:</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {activePayrollRecord?.employee?.full_name}
            </div>
            <div className="text-xs text-amber-300 mt-1 font-mono">
              Олгох боломжит үлдэгдэл: {formatMNT(activePayrollRecord?.balance)}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Олгох мөнгөн дүн (бүхэл төгрөг)
            </label>
            <input
              type="number"
              required
              max={activePayrollRecord?.balance || 0}
              value={payAmount}
              onChange={(e) => setPayAmount(Math.round(Number(e.target.value)))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Төлбөрийн хэлбэр
            </label>
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="bank_transfer">Банкны шилжүүлгээр</option>
              <option value="cash">Бэлэн мөнгөөр</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Гүйлгээний утга / Тайлбар
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Жишээ: 10-р сарын үндсэн олголт"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Олголт баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Settings */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Цалингийн мөчлөгийн тохиргоо"
      >
        <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тооцооны таслах өдөр (сар бүрийн)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={cutoffDay}
              onChange={(e) => setCutoffDay(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Зөвлөмж: Сар бүрийн 18-ны өдөр
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Үндсэн олголтын өдөр (сар бүрийн)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={firstPayoutDay}
              onChange={(e) => setFirstPayoutDay(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Зөвлөмж: Сар бүрийн 25-ны өдөр
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Хоёр дахь олголт / үлдэгдэл олгох өдөр (дараа сарын)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={secondPayoutDay}
              onChange={(e) => setSecondPayoutDay(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Зөвлөмж: Дараа сарын 10-ны өдөр
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Тохиргоо хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
