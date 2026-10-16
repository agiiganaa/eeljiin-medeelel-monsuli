import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT, formatLiters, formatDateTimeUB } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Fuel,
  Package,
  CreditCard,
  Landmark,
  Coins,
  Clock,
  ArrowRightLeft,
  Banknote,
  Search,
} from 'lucide-react';

type ReportTab =
  | 'fuel_sales'
  | 'product_sales'
  | 'attendance'
  | 'payroll'
  | 'pos'
  | 'bank'
  | 'cash'
  | 'handovers'
  | 'variance';

export const ReportsPage: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('fuel_sales');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      let query;
      switch (activeTab) {
        case 'fuel_sales':
          query = supabase
            .from('fuel_meter_readings')
            .select('*, nozzle:fuel_nozzles(*), employee:employees(*)')
            .gte('reading_date', startDate)
            .lte('reading_date', endDate)
            .order('reading_date', { ascending: false });
          break;
        case 'product_sales':
          query = supabase
            .from('product_sales')
            .select('*, product:products(*), employee:employees(*)')
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)
            .order('sale_date', { ascending: false });
          break;
        case 'attendance':
          query = supabase
            .from('attendance_records')
            .select('*, employee:employees(*)')
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', { ascending: false });
          break;
        case 'payroll':
          query = supabase
            .from('payroll_records')
            .select('*, employee:employees(*)')
            .gte('period_end', startDate)
            .lte('period_end', endDate)
            .order('period_end', { ascending: false });
          break;
        case 'pos':
          query = supabase
            .from('pos_transactions')
            .select('*, pos_device:pos_devices(*), employee:employees(*)')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });
          break;
        case 'bank':
          query = supabase
            .from('bank_transactions')
            .select('*, bank_account:bank_accounts(*), employee:employees(*)')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });
          break;
        case 'cash':
          query = supabase
            .from('cash_transactions')
            .select('*, employee:employees(*)')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });
          break;
        case 'handovers':
          query = supabase
            .from('shift_handovers')
            .select('*, outgoing_employee:employees!shift_handovers_outgoing_employee_id_fkey(*), incoming_employee:employees!shift_handovers_incoming_employee_id_fkey(*)')
            .gte('handover_date', startDate)
            .lte('handover_date', endDate)
            .order('handover_date', { ascending: false });
          break;
        case 'variance':
          query = supabase
            .from('cash_transactions')
            .select('*, employee:employees(*)')
            .neq('difference', 0)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)
            .order('transaction_date', { ascending: false });
          break;
      }

      const res = await query;
      setData(res.data || []);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('Экспорт хийх өгөгдөл байхгүй байна');
      return;
    }

    const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object');
    const rows = data.map((item) =>
      headers
        .map((h) => {
          const val = item[h];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${activeTab}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTabs = [
    { id: 'fuel_sales', label: 'Шатахууны борлуулалт', icon: Fuel },
    { id: 'product_sales', label: 'Бүтээгдэхүүний борлуулалт', icon: Package },
    { id: 'attendance', label: 'Ирц, цагийн тайлан', icon: Clock },
    { id: 'payroll', label: 'Цалингийн тооцоо', icon: Banknote },
    { id: 'pos', label: 'POS тайлан', icon: CreditCard },
    { id: 'bank', label: 'Банкны тооцоо', icon: Landmark },
    { id: 'cash', label: 'Кассын тайлан', icon: Coins },
    { id: 'handovers', label: 'Ээлж хүлээлцэх', icon: ArrowRightLeft },
    { id: 'variance', label: 'Зөрүүгийн нэгдсэн тайлан', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Нэгдсэн тайлан & Экспорт
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ШТС-ийн бүх модулийн тайлан, CSV экспорт ба хэвлэх горим
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV экспорт</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Хэвлэх</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Tab Selection */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Хугацаа:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white"
            />
            <span className="text-slate-600">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Олдсон бичлэг: <span className="font-bold text-white">{data.length}</span>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ReportTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {reportTabs.find((t) => t.id === activeTab)?.label} ({startDate} ~ {endDate})
          </h3>
        </div>

        {data.length === 0 ? (
          <EmptyState
            title="Сонгосон хугацаанд тайлангийн мэдээлэл олдсонгүй"
            description="Огнооны хязгаарыг өөрчилж эсвэл тухайн модульд бүртгэл хийгдсэн эсэхийг шалгана уу."
            icon={BarChart3}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              {activeTab === 'fuel_sales' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Хошуу</th>
                      <th className="py-3 px-4">Ажилтан</th>
                      <th className="py-3 px-4">Эхний милль</th>
                      <th className="py-3 px-4">Эцсийн милль</th>
                      <th className="py-3 px-4">Зарагдсан литр</th>
                      <th className="py-3 px-4">Үнэ</th>
                      <th className="py-3 px-4">Борлуулалт</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.reading_date}</td>
                        <td className="py-3 px-4 font-bold text-white">
                          {r.nozzle?.nozzle_number}-р хошуу
                        </td>
                        <td className="py-3 px-4">{r.employee?.full_name}</td>
                        <td className="py-3 px-4 font-mono">{r.initial_meter}</td>
                        <td className="py-3 px-4 font-mono">{r.final_meter}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {formatLiters(r.sold_liters)}
                        </td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.price_per_liter)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatMNT(r.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'product_sales' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Бүтээгдэхүүн</th>
                      <th className="py-3 px-4">Тоо</th>
                      <th className="py-3 px-4">Нэгж үнэ</th>
                      <th className="py-3 px-4">Нийт дүн</th>
                      <th className="py-3 px-4">Ажилтан</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.sale_date}</td>
                        <td className="py-3 px-4 font-bold text-white">{r.product?.name}</td>
                        <td className="py-3 px-4 font-mono">{r.quantity} {r.product?.unit}</td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.unit_price)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatMNT(r.total_amount)}
                        </td>
                        <td className="py-3 px-4">{r.employee?.full_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'attendance' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Ажилтан</th>
                      <th className="py-3 px-4">Ажилласан цаг</th>
                      <th className="py-3 px-4">Илүү цаг</th>
                      <th className="py-3 px-4">Төлөв</th>
                      <th className="py-3 px-4">Тэмдэглэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.work_date}</td>
                        <td className="py-3 px-4 font-bold text-white">{r.employee?.full_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {r.actual_hours} цаг
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.overtime_hours > 0 ? `+${r.overtime_hours} цаг` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400">{r.status}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'payroll' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Хугацаа</th>
                      <th className="py-3 px-4">Ажилтан</th>
                      <th className="py-3 px-4">Батлагдсан цаг</th>
                      <th className="py-3 px-4">Нийт цэвэр</th>
                      <th className="py-3 px-4">Олгосон</th>
                      <th className="py-3 px-4">Үлдэгдэл</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">
                          {r.period_start} ~ {r.period_end}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{r.employee?.full_name}</td>
                        <td className="py-3 px-4 font-mono text-amber-300">
                          {r.verified_hours} цаг
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatMNT(r.total_net)}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {formatMNT(r.paid_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {formatMNT(r.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'pos' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Төхөөрөмж</th>
                      <th className="py-3 px-4">Борлуулалт</th>
                      <th className="py-3 px-4">Буцаалт/Цуцлалт</th>
                      <th className="py-3 px-4">Шимтгэл</th>
                      <th className="py-3 px-4">Цэвэр дүн</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.transaction_date}</td>
                        <td className="py-3 px-4 font-bold text-white">
                          {r.pos_device?.device_name}
                        </td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.sales_amount)}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">
                          -{formatMNT(Number(r.refund_amount) + Number(r.void_amount))}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          -{formatMNT(r.fee_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatMNT(r.net_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'bank' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Данс</th>
                      <th className="py-3 px-4">Бүртгэсэн</th>
                      <th className="py-3 px-4">Хуулгын дүн</th>
                      <th className="py-3 px-4">Зөрүү</th>
                      <th className="py-3 px-4">Ажилтан</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.transaction_date}</td>
                        <td className="py-3 px-4 font-bold text-white">
                          {r.bank_account?.bank_name} ({r.bank_account?.account_number})
                        </td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.amount)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatMNT(r.statement_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {r.difference === 0 ? (
                            <span className="text-emerald-400">0 ₮</span>
                          ) : (
                            <span className="text-rose-400">{formatMNT(r.difference)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{r.employee?.full_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'cash' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Ажилтан</th>
                      <th className="py-3 px-4">Бэлэн борлуулалт</th>
                      <th className="py-3 px-4">Тооцоолсон эцсийн</th>
                      <th className="py-3 px-4">Бодит тоолсон</th>
                      <th className="py-3 px-4">Зөрүү</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.transaction_date}</td>
                        <td className="py-3 px-4 font-bold text-white">{r.employee?.full_name}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {formatMNT(r.cash_sales)}
                        </td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.calculated_cash)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatMNT(r.actual_cash)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {r.difference === 0 ? (
                            <span className="text-emerald-400">0 ₮</span>
                          ) : (
                            <span className="text-rose-400">{formatMNT(r.difference)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'handovers' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Өгсөн ажилтан</th>
                      <th className="py-3 px-4">Авсан ажилтан</th>
                      <th className="py-3 px-4">Нийт борлуулалт</th>
                      <th className="py-3 px-4">Төлбөрийн нийлбэр</th>
                      <th className="py-3 px-4">Зөрүү</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.handover_date}</td>
                        <td className="py-3 px-4 font-semibold text-amber-300">
                          {r.outgoing_employee?.full_name}
                        </td>
                        <td className="py-3 px-4 font-semibold text-sky-300">
                          {r.incoming_employee?.full_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatMNT(r.calculated_total)}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          {formatMNT(r.actual_total)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {r.difference === 0 ? (
                            <span className="text-emerald-400">0 ₮</span>
                          ) : (
                            <span className="text-rose-400">{formatMNT(r.difference)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'variance' && (
                <>
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Огноо</th>
                      <th className="py-3 px-4">Ажилтан</th>
                      <th className="py-3 px-4">Тооцоолсон касс</th>
                      <th className="py-3 px-4">Бодит касс</th>
                      <th className="py-3 px-4">Зөрүүгийн дүн</th>
                      <th className="py-3 px-4">Тайлбар</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {data.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-mono">{r.transaction_date}</td>
                        <td className="py-3 px-4 font-bold text-white">{r.employee?.full_name}</td>
                        <td className="py-3 px-4 font-mono">{formatMNT(r.calculated_cash)}</td>
                        <td className="py-3 px-4 font-mono text-white">{formatMNT(r.actual_cash)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-400 text-sm">
                          {formatMNT(r.difference)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
