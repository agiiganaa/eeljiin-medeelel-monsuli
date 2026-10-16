import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Banknote,
  Fuel,
  Database,
  Ruler,
  Package,
  CreditCard,
  Landmark,
  Coins,
  ArrowRightLeft,
  HandCoins,
  BarChart3,
  Users,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';

export interface NavItem {
  id: string;
  label: string;
  category: 'main' | 'fuel' | 'finance' | 'admin';
  icon: React.ComponentType<{ className?: string }>;
  minRole?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  // 1. Үндсэн ажлын бүртгэл
  { id: 'dashboard', label: '1. Хянах самбар', category: 'main', icon: LayoutDashboard },
  { id: 'shifts', label: '2. Ээлжийн хуваарь', category: 'main', icon: CalendarDays },
  { id: 'attendance', label: '3. Цагийн бүртгэл', category: 'main', icon: Clock },
  { id: 'payroll', label: '4. Цалингийн бүртгэл', category: 'main', icon: Banknote, minRole: ['admin', 'manager'] },

  // 2. Шатахуун & Савны хяналт
  { id: 'fuel_sales', label: '5. Шатахууны борлуулалт', category: 'fuel', icon: Fuel },
  { id: 'storage_tanks', label: '6. Савны бүртгэл', category: 'fuel', icon: Database },
  { id: 'calibration', label: '7. Мастшапын хэмжилт', category: 'fuel', icon: Ruler },
  { id: 'products', label: '8. Тос, нэмэлт бараа', category: 'fuel', icon: Package },

  // 3. Тооцоо & Санхүү
  { id: 'pos', label: '9. POS төхөөрөмж', category: 'finance', icon: CreditCard },
  { id: 'bank', label: '10. Банкны данс', category: 'finance', icon: Landmark },
  { id: 'cash', label: '11. Бэлэн мөнгө (Касс)', category: 'finance', icon: Coins },
  { id: 'handover', label: '12. Ээлж хүлээлцэх', category: 'finance', icon: ArrowRightLeft },
  { id: 'manager_handover', label: '13. Эрхлэгчид мөнгө өгөх', category: 'finance', icon: HandCoins },

  // 4. Удирдлага & Тайлан
  { id: 'reports', label: '14. Нэгдсэн тайлан', category: 'admin', icon: BarChart3, minRole: ['admin', 'manager'] },
  { id: 'employees', label: '15. Ажилтнууд', category: 'admin', icon: Users, minRole: ['admin', 'manager'] },
  { id: 'guide', label: '16. Зааварчилгаа', category: 'admin', icon: BookOpen },
  { id: 'admin_settings', label: '17. Админ тохиргоо', category: 'admin', icon: Settings, minRole: ['admin'] },
];

const CATEGORY_TITLES: Record<string, string> = {
  main: 'Үндсэн ажлын бүртгэл',
  fuel: 'Шатахуун & Сав',
  finance: 'Тооцоо & Касс',
  admin: 'Удирдлага & Тайлан',
};

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { role } = useAuth();

  const isAccessible = (item: NavItem) => {
    if (!item.minRole) return true;
    return item.minRole.includes(role);
  };

  const categories = ['main', 'fuel', 'finance', 'admin'] as const;

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out shadow-xl lg:shadow-none ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/90 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-white truncate">
                  ШТС Удирдлага
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  Монгол Улс · Asia/UB
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors focus:outline-none"
            title={collapsed ? 'Цэсийг дэлгэх' : 'Цэсийг эвхэх'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close toggle */}
          <button
            onClick={onCloseMobile}
            className="flex lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
            title="Хаах"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {categories.map((catKey) => {
            const catItems = NAV_ITEMS.filter(
              (item) => item.category === catKey && isAccessible(item)
            );

            if (catItems.length === 0) return null;

            return (
              <div key={catKey} className="space-y-1">
                {(!collapsed || mobileOpen) && (
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    {CATEGORY_TITLES[catKey]}
                  </div>
                )}
                {collapsed && !mobileOpen && (
                  <div className="w-full border-t border-slate-800/80 my-2" />
                )}

                <div className="space-y-1">
                  {catItems.map((item) => {
                    const active = currentRoute === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          onCloseMobile();
                        }}
                        title={collapsed && !mobileOpen ? item.label : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all text-left group ${
                          active
                            ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-xs'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                        } ${collapsed && !mobileOpen ? 'justify-center px-2' : ''}`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            active
                              ? 'text-amber-400'
                              : 'text-slate-400 group-hover:text-amber-300'
                          }`}
                        />
                        {(!collapsed || mobileOpen) && (
                          <span className="truncate flex-1 tracking-tight">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer Role badge */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-950/80 shrink-0">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Эрх: <strong className="text-white capitalize">{role === 'admin' ? 'Админ' : role === 'manager' ? 'Эрхлэгч' : 'Ажилтан'}</strong>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v1.1</span>
            </div>
          ) : (
            <div className="flex justify-center" title={`Эрх: ${role}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
