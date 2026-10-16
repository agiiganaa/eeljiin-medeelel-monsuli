import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { PosDevice, PosTransaction, Employee, Shift } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  CreditCard,
  Plus,
  Landmark,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calculator,
} from 'lucide-react';

export const PosPage: React.FC = () => {
  const { role, user } = useAuth();
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add POS Device (Admin)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [bankName, setBankName] = useState('Хаан Банк');
  const [deviceNumber, setDeviceNumber] = useState('');

  // Modal: Record POS Transaction
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [posDeviceId, setPosDeviceId] = useState('');
  const [txShiftId, setTxShiftId] = useState('');
  const [txEmpId, setTxEmpId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialAmount, setInitialAmount] = useState<number>(0);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [salesAmount, setSalesAmount] = useState<number>(0);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [voidAmount, setVoidAmount] = useState<number>(0);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [devRes, txRes, empRes, shiftRes] = await Promise.all([
        supabase.from('pos_devices').select('*').order('created_at'),
        supabase
          .from('pos_transactions')
          .select('*, pos_device:pos_devices(*), employee:employees(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('shifts').select('*').eq('is_active', true),
      ]);

      if (devRes.data) setDevices(devRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
    } catch (err) {
      console.error('POS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('pos_devices').insert([
      {
        device_name: deviceName,
        bank_name: bankName,
        device_number: deviceNumber,
        is_active: true,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsDeviceModalOpen(false);
      setDeviceName('');
      setDeviceNumber('');
      fetchData();
    }
  };

  const netCalc = Math.max(
    0,
    Math.round(Number(salesAmount) - Number(refundAmount) - Number(voidAmount) - Number(feeAmount))
  );

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('pos_transactions').insert([
      {
        pos_device_id: posDeviceId,
        shift_id: txShiftId || null,
        employee_id: txEmpId,
        transaction_date: txDate,
        initial_amount: Math.round(Number(initialAmount)),
        final_amount: Math.round(Number(finalAmount)),
        sales_amount: Math.round(Number(salesAmount)),
        refund_amount: Math.round(Number(refundAmount)),
        void_amount: Math.round(Number(voidAmount)),
        fee_amount: Math.round(Number(feeAmount)),
        net_amount: netCalc,
        notes: notes || null,
        status: 'approved',
        verified_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsTxModalOpen(false);
      setInitialAmount(0);
      setFinalAmount(0);
      setSalesAmount(0);
      setRefundAmount(0);
      setVoidAmount(0);
      setFeeAmount(0);
      setNotes('');
      fetchData();
    }
  };

  const totalPosNet = transactions.reduce((acc, t) => acc + Number(t.net_amount || 0), 0);
  const totalPosSales = transactions.reduce((acc, t) => acc + Number(t.sales_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            POS төхөөрөмжийн тооцоо
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Карт болон цахим гүйлгээний төхөөрөмж бүрийн нийлбэр, буцаалт, шимтгэл ба цэвэр дүн
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>POS төхөөрөмж нэмэх</span>
            </button>
          )}

          <button
            onClick={() => setIsTxModalOpen(true)}
            disabled={devices.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>POS тооцоо оруулах</span>
          </button>
        </div>
      </div>

      {/* POS Device Strip & Total Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Нийт POS цэвэр орлого</span>
            <Calculator className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-2 font-mono">
            {formatMNT(totalPosNet)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Борлуулалтын дүн: {formatMNT(totalPosSales)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">Бүртгэлтэй төхөөрөмжүүд ({devices.length}):</span>
          </div>
          {devices.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Одоогоор POS төхөөрөмж бүртгэгдээгүй байна.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{d.device_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {d.bank_name} · Дугаар: {d.device_number}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Идэвхтэй
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          POS ээлжийн гүйлгээний тооцоонууд
        </h3>

        {transactions.length === 0 ? (
          <EmptyState
            title="POS тооцоо бүртгэгдээгүй байна"
            description="Ээлж дуусахад POS төхөөрөмжийн эцсийн дүнгээс буцаалт, шимтгэлийг хасаж цэвэр дүнгээр бүртгэнэ үү."
            actionText="POS тооцоо оруулах"
            onAction={() => setIsTxModalOpen(true)}
            icon={CreditCard}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Төхөөрөмж / Банк</th>
                  <th className="py-3 px-4">Ажилтан</th>
                  <th className="py-3 px-4">Борлуулалт</th>
                  <th className="py-3 px-4">Буцаалт / Цуцлалт</th>
                  <th className="py-3 px-4">Шимтгэл</th>
                  <th className="py-3 px-4">Цэвэр дүн</th>
                  <th className="py-3 px-4">Тайлбар</th>
                  <th className="py-3 px-4">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">{tx.transaction_date}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">
                        {tx.pos_device?.device_name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tx.pos_device?.bank_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{tx.employee?.full_name || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {formatMNT(tx.sales_amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-400">
                      -{formatMNT(Number(tx.refund_amount) + Number(tx.void_amount))}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      -{formatMNT(tx.fee_amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {formatMNT(tx.net_amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{tx.notes || '-'}</td>
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

      {/* Modal: Add Device */}
      <Modal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        title="Шинэ POS төхөөрөмж бүртгэх"
      >
        <form onSubmit={handleSaveDevice} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Төхөөрөмжийн нэр
            </label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Жишээ: Касс 1 POS (Хаан)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Банкны нэр
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Хаан Банк, Голомт, Худалдаа Хөгжил"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Төхөөрөмжийн ТИД / Серийн дугаар
            </label>
            <input
              type="text"
              required
              value={deviceNumber}
              onChange={(e) => setDeviceNumber(e.target.value)}
              placeholder="TID-98765432"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Төхөөрөмж хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record POS Transaction */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="POS ээлжийн тооцоо оруулах"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              POS төхөөрөмж сонгох
            </label>
            <select
              required
              value={posDeviceId}
              onChange={(e) => setPosDeviceId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Төхөөрөмж сонгох --</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_name} ({d.bank_name} - {d.device_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Гүйлгээний огноо
              </label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Хариуцсан ажилтан
              </label>
              <select
                required
                value={txEmpId}
                onChange={(e) => setTxEmpId(e.target.value)}
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

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Нийт POS борлуулалт (₮)
            </label>
            <input
              type="number"
              required
              value={salesAmount || ''}
              onChange={(e) => setSalesAmount(Math.round(Number(e.target.value)))}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Буцаалт (₮)
              </label>
              <input
                type="number"
                value={refundAmount || ''}
                onChange={(e) => setRefundAmount(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Цуцлалт (₮)
              </label>
              <input
                type="number"
                value={voidAmount || ''}
                onChange={(e) => setVoidAmount(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Шимтгэл (₮)
              </label>
              <input
                type="number"
                value={feeAmount || ''}
                onChange={(e) => setFeeAmount(Math.round(Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Тооцоолсон цэвэр дүн:</span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {formatMNT(netCalc)}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Баримтын дугаар
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Жишээ: Ээлжийн эцсийн Z тайлан шалгав"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              POS тооцоо баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
