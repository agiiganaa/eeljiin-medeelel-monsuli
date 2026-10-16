import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT, formatLiters, isSupabaseConfigured } from '../lib/supabase';
import {
  Fuel,
  Package,
  Calendar,
  Users,
  Clock,
  Banknote,
  AlertTriangle,
  ArrowRightLeft,
  Coins,
  CreditCard,
  Landmark,
  RefreshCw,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

interface DashboardStats {
  todayFuelSalesMnt: number;
  todayFuelLiters: number;
  todayProductSalesMnt: number;
  monthFuelSalesMnt: number;
  monthProductSalesMnt: number;
  totalEmployees: number;
  activeShiftsCount: number;
  pendingAttendanceCount: number;
  pendingPayrollBalance: number;
  outOfFuelNozzlesCount: number;
  lowTankWarningsCount: number;
  totalVarianceMnt: number;
  pendingHandoversCount: number;
}

interface DashboardPageProps {
  onNavigate: (route: string) => void;
  onOpenSupabaseConfig: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenSupabaseConfig }) => {
  const [stats, setStats] = useState<DashboardStats>({
    todayFuelSalesMnt: 0,
    todayFuelLiters: 0,
    todayProductSalesMnt: 0,
    monthFuelSalesMnt: 0,
    monthProductSalesMnt: 0,
    totalEmployees: 0,
    activeShiftsCount: 0,
    pendingAttendanceCount: 0,
    pendingPayrollBalance: 0,
    outOfFuelNozzlesCount: 0,
    lowTankWarningsCount: 0,
    totalVarianceMnt: 0,
    pendingHandoversCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [hasAnyData, setHasAnyData] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setConfigured(isSupabaseConfigured());
    const supabase = getSupabase();

    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const startOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

      // 1. Employees count
      const { count: empCount } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true });

      // 2. Fuel meter readings (today & month)
      const { data: todayReadings } = await supabase
        .from('fuel_meter_readings')
        .select('sold_liters, total_amount')
        .eq('reading_date', todayStr);

      const { data: monthReadings } = await supabase
        .from('fuel_meter_readings')
        .select('total_amount')
        .gte('reading_date', startOfMonthStr);

      // 3. Product sales (today & month)
      const { data: todayProdSales } = await supabase
        .from('product_sales')
        .select('total_amount')
        .eq('sale_date', todayStr);

      const { data: monthProdSales } = await supabase
        .from('product_sales')
        .select('total_amount')
        .gte('sale_date', startOfMonthStr);

      // 4. Pending attendance
      const { count: pendingAtt } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 5. Payroll balances
      const { data: payrollData } = await supabase
        .from('payroll_records')
        .select('balance');

      // 6. Out of fuel nozzles
      const { count: outNozzles } = await supabase
        .from('fuel_nozzles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'out_of_fuel');

      // 7. Tank low safety alerts
      const { data: tanks } = await supabase
        .from('storage_tanks')
        .select('current_liters, safety_threshold_liters');

      let lowTanks = 0;
      if (tanks) {
        lowTanks = tanks.filter(
          (t) => Number(t.current_liters) <= Number(t.safety_threshold_liters) && Number(t.safety_threshold_liters) > 0
        ).length;
      }

      // 8. Pending handovers
      const { count: pendingHandovers } = await supabase
        .from('shift_handovers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 9. Active shifts
      const { count: shiftsCount } = await supabase
        .from('shifts')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      // 10. Cash transactions variance
      const { data: cashTrans } = await supabase
        .from('cash_transactions')
        .select('difference')
        .eq('transaction_date', todayStr);

      const todayFuelLiters = (todayReadings || []).reduce((acc, r) => acc + Number(r.sold_liters || 0), 0);
      const todayFuelMnt = (todayReadings || []).reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
      const monthFuelMnt = (monthReadings || []).reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

      const todayProdMnt = (todayProdSales || []).reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
      const monthProdMnt = (monthProdSales || []).reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

      const payrollBalanceTotal = (payrollData || []).reduce((acc, r) => acc + Number(r.balance || 0), 0);
      const todayVariance = (cashTrans || []).reduce((acc, r) => acc + Number(r.difference || 0), 0);

      const totalRecordsCount =
        (empCount || 0) +
        (todayReadings?.length || 0) +
        (monthReadings?.length || 0) +
        (tanks?.length || 0);

      setHasAnyData(totalRecordsCount > 0);

      setStats({
        todayFuelSalesMnt: todayFuelMnt,
        todayFuelLiters: todayFuelLiters,
        todayProductSalesMnt: todayProdMnt,
        monthFuelSalesMnt: monthFuelMnt,
        monthProductSalesMnt: monthProdMnt,
        totalEmployees: empCount || 0,
        activeShiftsCount: shiftsCount || 0,
        pendingAttendanceCount: pendingAtt || 0,
        pendingPayrollBalance: payrollBalanceTotal,
        outOfFuelNozzlesCount: outNozzles || 0,
        lowTankWarningsCount: lowTanks,
        totalVarianceMnt: todayVariance,
        pendingHandoversCount: pendingHandovers || 0,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with reload and setup notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            ШТС-ийн Хянах Самбар
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Бодит өгөгдлийн нэгдсэн хяналт · Asia/Ulaanbaatar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Шинэчлэх</span>
          </button>
        </div>
      </div>

      {/* Supabase Not Configured Banner */}
      {!configured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">
                Supabase өгөгдлийн сангийн холболт тохируулаагүй байна
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Системд бодитоор өгөгдөл хадгалахын тулд Supabase URL болон Anon Key оруулна уу. Хуурамч эсвэл түр өгөгдөл ашиглахгүй.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSupabaseConfig}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shrink-0 shadow-xs"
          >
            Холболт тохируулах
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today Fuel Sales */}
        <div
          onClick={() => onNavigate('fuel_sales')}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Өнөөдрийн шатахуун</span>
            <Fuel className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white tracking-tight">
              {formatMNT(stats.todayFuelSalesMnt)}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {formatLiters(stats.todayFuelLiters)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400/90">
            <span>Хошуу & милль харах</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 2. Today Product Sales */}
        <div
          onClick={() => onNavigate('products')}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Тос, бүтээгдэхүүн</span>
            <Package className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white tracking-tight">
              {formatMNT(stats.todayProductSalesMnt)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Сарын нийт: {formatMNT(stats.monthProductSalesMnt)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-sky-400/90">
            <span>Бараа, үлдэгдэл</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 3. Monthly Total Sales */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Энэ сарын нийт борлуулалт</span>
            <Banknote className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white tracking-tight">
              {formatMNT(stats.monthFuelSalesMnt + stats.monthProductSalesMnt)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Шатахуун: {formatMNT(stats.monthFuelSalesMnt)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400/90">
            <span>Тайлан шинжилгээ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 4. Active shifts & Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Ажилтны бүртгэл</span>
            <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white tracking-tight">
              {stats.totalEmployees} ажилтан
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Тохируулсан ээлж: {stats.activeShiftsCount}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-purple-400/90">
            <span>Ажилтны хуудас</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Operational Warnings and Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Warning 1: Nozzles / Out of fuel */}
        <div
          onClick={() => onNavigate('fuel_sales')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            stats.outOfFuelNozzlesCount > 0
              ? 'bg-rose-950/30 border-rose-800/80 hover:bg-rose-950/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Шатахуун дууссан хошуу
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                stats.outOfFuelNozzlesCount > 0 ? 'text-rose-400' : 'text-slate-500'
              }`}
            />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {stats.outOfFuelNozzlesCount === 0 ? '0' : `${stats.outOfFuelNozzlesCount} хошуу`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.outOfFuelNozzlesCount > 0
              ? 'Анхаар: Шатахуун дууссан хошуугаар борлуулалт хаагдсан.'
              : 'Бүх хошуу хэвийн ажиллаж байна.'}
          </p>
        </div>

        {/* Warning 2: Tank Safety Threshold */}
        <div
          onClick={() => onNavigate('storage_tanks')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            stats.lowTankWarningsCount > 0
              ? 'bg-amber-950/30 border-amber-800/80 hover:bg-amber-950/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Савны үлдэгдлийн анхааруулга
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                stats.lowTankWarningsCount > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {stats.lowTankWarningsCount === 0 ? '0' : `${stats.lowTankWarningsCount} сав`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.lowTankWarningsCount > 0
              ? 'Аюулгүйн босгоос доошилсон савнууд байна.'
              : 'Бүх савны үлдэгдэл аюулгүйн хэмжээнээс дээш байна.'}
          </p>
        </div>

        {/* Warning 3: Pending Attendance / Time verify */}
        <div
          onClick={() => onNavigate('attendance')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            stats.pendingAttendanceCount > 0
              ? 'bg-blue-950/30 border-blue-800/80 hover:bg-blue-950/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Баталгаажаагүй цаг
            </span>
            <Clock
              className={`w-4 h-4 ${
                stats.pendingAttendanceCount > 0 ? 'text-blue-400' : 'text-slate-500'
              }`}
            />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {stats.pendingAttendanceCount === 0 ? '0' : `${stats.pendingAttendanceCount} бүртгэл`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.pendingAttendanceCount > 0
              ? 'Эрхлэгч/Админ батлаагүй цаг цалинд орохгүй.'
              : 'Хүлээгдэж буй цагийн бүртгэл байхгүй.'}
          </p>
        </div>

        {/* Warning 4: Pending Shift Handovers */}
        <div
          onClick={() => onNavigate('handover')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            stats.pendingHandoversCount > 0
              ? 'bg-purple-950/30 border-purple-800/80 hover:bg-purple-950/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Баталгаажаагүй ээлж хүлээлцэлт
            </span>
            <ArrowRightLeft
              className={`w-4 h-4 ${
                stats.pendingHandoversCount > 0 ? 'text-purple-400' : 'text-slate-500'
              }`}
            />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {stats.pendingHandoversCount === 0 ? '0' : `${stats.pendingHandoversCount} ээлж`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.pendingHandoversCount > 0
              ? 'Хоёр талын болон эрхлэгчийн баталгаажуулалт хүлээгдэж байна.'
              : 'Бүх хүлээлцэлт баталгаажсан.'}
          </p>
        </div>

        {/* Warning 5: Payroll Balance */}
        <div
          onClick={() => onNavigate('payroll')}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Цалингийн олгоогүй үлдэгдэл
            </span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {formatMNT(stats.pendingPayrollBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Батлагдсан нийт цалингаас олгоогүй байгаа дүн
          </p>
        </div>

        {/* Warning 6: Cash & POS Variance */}
        <div
          onClick={() => onNavigate('cash')}
          className={`p-4 rounded-xl border transition-colors cursor-pointer ${
            stats.totalVarianceMnt !== 0
              ? 'bg-rose-950/30 border-rose-800/80 hover:bg-rose-950/40'
              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Өнөөдрийн кассын зөрүү
            </span>
            <Coins
              className={`w-4 h-4 ${
                stats.totalVarianceMnt !== 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            />
          </div>
          <div className="mt-2 text-lg font-bold text-white">
            {stats.totalVarianceMnt === 0 ? '0 ₮' : formatMNT(stats.totalVarianceMnt)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Бодит тоолсон болон тооцоолсон кассын зөрүү
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Шуурхай ажлын бүртгэлүүд
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('fuel_sales')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <Fuel className="w-4 h-4 text-amber-400 mb-2" />
            <div className="text-xs font-semibold text-white">Милль бүртгэх</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Хошууны заалт</div>
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <Clock className="w-4 h-4 text-blue-400 mb-2" />
            <div className="text-xs font-semibold text-white">Цаг бүртгэх</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ирсэн / явах</div>
          </button>
          <button
            onClick={() => onNavigate('pos')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <CreditCard className="w-4 h-4 text-emerald-400 mb-2" />
            <div className="text-xs font-semibold text-white">POS гүйлгээ</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Карт тооцоо</div>
          </button>
          <button
            onClick={() => onNavigate('cash')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <Coins className="w-4 h-4 text-amber-400 mb-2" />
            <div className="text-xs font-semibold text-white">Касс тоолох</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Бэлэн мөнгө</div>
          </button>
          <button
            onClick={() => onNavigate('handover')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-400 mb-2" />
            <div className="text-xs font-semibold text-white">Ээлж хүлээлцэх</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Нэгдсэн тооцоо</div>
          </button>
          <button
            onClick={() => onNavigate('manager_handover')}
            className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 transition-colors"
          >
            <Landmark className="w-4 h-4 text-rose-400 mb-2" />
            <div className="text-xs font-semibold text-white">Эрхлэгчид өгөх</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Орлого хүлээлгэх</div>
          </button>
        </div>
      </div>
    </div>
  );
};
