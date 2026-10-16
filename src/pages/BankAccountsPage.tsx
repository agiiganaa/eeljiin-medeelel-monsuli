import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { BankAccount, BankTransaction, Employee } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Landmark,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  CreditCard,
} from 'lucide-react';

export const BankAccountsPage: React.FC = () => {
  const { role, user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add Bank Account
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  // Modal: Add Transaction
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txAccountId, setTxAccountId] = useState('');
  const [txEmpId, setTxEmpId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState('QPay / Дансны орлого');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [statementAmount, setStatementAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [accRes, txRes, empRes] = await Promise.all([
        supabase.from('bank_accounts').select('*').order('created_at'),
        supabase
          .from('bank_transactions')
          .select('*, bank_account:bank_accounts(*), employee:employees(*)')
          .order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true),
      ]);

      if (accRes.data) setAccounts(accRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (empRes.data) setEmployees(empRes.data);
    } catch (err) {
      console.error('Bank fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('bank_accounts').insert([
      {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        is_active: true,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsAccountModalOpen(false);
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      fetchData();
    }
  };

  const diffCalc = Math.round(Number(statementAmount) - Number(txAmount));

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('bank_transactions').insert([
      {
        bank_account_id: txAccountId,
        employee_id: txEmpId,
        transaction_date: txDate,
        transaction_type: txType,
        amount: Math.round(Number(txAmount)),
        statement_amount: Math.round(Number(statementAmount)),
        verified_amount: Math.round(Number(statementAmount)),
        difference: diffCalc,
        notes: notes || null,
        status: 'approved',
        verified_by: user?.id || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsTxModalOpen(false);
      setTxAmount(0);
      setStatementAmount(0);
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
            Банкны дансны тооцоо
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            QPay болон шилжүүлгийн орлогыг банкны хуулгатай тулган зөрүүг шалгах
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Данс бүртгэх</span>
            </button>
          )}

          <button
            onClick={() => setIsTxModalOpen(true)}
            disabled={accounts.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Дансны гүйлгээ тулгах</span>
          </button>
        </div>
      </div>

      {/* Accounts Strip */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
          <span className="font-semibold text-slate-300">
            Бүртгэлтэй банкны дансууд ({accounts.length}):
          </span>
          <span className="text-[11px] text-slate-400">
            * Гараар болон файл импортоор тулгах
          </span>
        </div>

        {accounts.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Одоогоор банкны данс бүртгэгдээгүй байна. "Данс бүртгэх" товчоор нэмнэ үү.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{acc.bank_name}</div>
                  <div className="font-mono text-amber-300 mt-0.5">{acc.account_number}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{acc.account_name}</div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Идэвхтэй
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Дансны орлого & Хуулгын тулгалтын жагсаалт
        </h3>

        {transactions.length === 0 ? (
          <EmptyState
            title="Банкны тооцоо бүртгэгдээгүй байна"
            description="Түгээгчийн хүлээн авсан дансны болон QPay төлбөрийг банкны хуулгатай тулгаж оруулна уу."
            actionText="Дансны гүйлгээ тулгах"
            onAction={() => setIsTxModalOpen(true)}
            icon={Landmark}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Банк & Данс</th>
                  <th className="py-3 px-4">Гүйлгээний төрөл</th>
                  <th className="py-3 px-4">Бүртгэсэн дүн</th>
                  <th className="py-3 px-4">Хуулгын дүн</th>
                  <th className="py-3 px-4">Зөрүү</th>
                  <th className="py-3 px-4">Ажилтан</th>
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
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white block">
                        {tx.bank_account?.bank_name}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {tx.bank_account?.account_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{tx.transaction_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {formatMNT(tx.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {formatMNT(tx.statement_amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {tx.difference === 0 ? (
                        <span className="text-emerald-400">0 ₮</span>
                      ) : (
                        <span className="text-rose-400">{formatMNT(tx.difference)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{tx.employee?.full_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{tx.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Тулгагдсан
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Bank Account */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Шинэ банкны данс бүртгэх"
      >
        <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
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
              Дансны дугаар
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="5000123456"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Дансны нэр / Эзэмшигч
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="ШТС Борлуулалтын үндсэн данс"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Данс хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Transaction */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Банкны гүйлгээ тулгаж бүртгэх"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Банкны данс сонгох
            </label>
            <select
              required
              value={txAccountId}
              onChange={(e) => setTxAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Данс сонгох --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} ({a.account_number}) - {a.account_name}
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
              Гүйлгээний төрөл
            </label>
            <input
              type="text"
              required
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              placeholder="QPay / Дансаар шилжүүлсэн орлого"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ажилтны бүртгэсэн дүн (₮)
              </label>
              <input
                type="number"
                required
                value={txAmount || ''}
                onChange={(e) => setTxAmount(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Банкны хуулгын бодит дүн (₮)
              </label>
              <input
                type="number"
                required
                value={statementAmount || ''}
                onChange={(e) => setStatementAmount(Math.round(Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Тулгалтын зөрүү:</span>
            <span
              className={`font-mono font-bold text-sm ${
                diffCalc === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMNT(diffCalc)}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар / Баримтын гүйлгээний дугаар
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Шалгасан эрхлэгчийн тэмдэглэл"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Тулгалт баталгаажуулах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
