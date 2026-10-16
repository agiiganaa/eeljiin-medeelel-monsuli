/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NAV_ITEMS } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AuthModal } from './components/auth/AuthModal';
import { SupabaseConfigModal } from './components/settings/SupabaseConfigModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { AttendancePage } from './pages/AttendancePage';
import { PayrollPage } from './pages/PayrollPage';
import { FuelSalesPage } from './pages/FuelSalesPage';
import { StorageTanksPage } from './pages/StorageTanksPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { ProductsPage } from './pages/ProductsPage';
import { PosPage } from './pages/PosPage';
import { BankAccountsPage } from './pages/BankAccountsPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { HandoverPage } from './pages/HandoverPage';
import { ManagerHandoverPage } from './pages/ManagerHandoverPage';
import { ReportsPage } from './pages/ReportsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { GuidePage } from './pages/GuidePage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

function MainApp() {
  const { role, user, configured } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSbModalOpen, setIsSbModalOpen] = useState(false);

  // Parse current route from window.location.hash, fallback to 'dashboard'
  const getInitialRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const valid = NAV_ITEMS.some((item) => item.id === hash);
    return valid ? hash : 'dashboard';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const valid = NAV_ITEMS.some((item) => item.id === hash);
      if (valid) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = `#/${route}`;
    setCurrentRoute(route);
    setMobileOpen(false);
  };

  const currentNav = NAV_ITEMS.find((item) => item.id === currentRoute);
  const pageTitle = currentNav?.label || '1. Хянах самбар';

  // Role check: Admin-only or Manager-only pages guard
  const isAccessibleByRole = (routeId: string) => {
    const target = NAV_ITEMS.find((n) => n.id === routeId);
    if (!target?.minRole) return true;
    return target.minRole.includes(role);
  };

  const renderCurrentPage = () => {
    if (!isAccessibleByRole(currentRoute)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-md shadow-lg">
            <h3 className="text-base font-bold">Хандах эрх хүрэлцэхгүй байна</h3>
            <p className="text-xs text-rose-300/80 mt-2 leading-relaxed">
              Энэ хуудас нь зөвхөн эрх бүхий удирдлагад нээлттэй. Таны одоогийн эрх: <strong className="uppercase">{role}</strong>.
            </p>
            <button
              onClick={() => navigateTo('dashboard')}
              className="mt-5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Хянах самбар луу буцах
            </button>
          </div>
        </div>
      );
    }

    switch (currentRoute) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={navigateTo}
            onOpenSupabaseConfig={() => setIsSbModalOpen(true)}
          />
        );
      case 'shifts':
        return <ShiftsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'payroll':
        return <PayrollPage />;
      case 'fuel_sales':
        return <FuelSalesPage />;
      case 'storage_tanks':
        return <StorageTanksPage />;
      case 'calibration':
        return <CalibrationPage />;
      case 'products':
        return <ProductsPage />;
      case 'pos':
        return <PosPage />;
      case 'bank':
        return <BankAccountsPage />;
      case 'cash':
        return <CashRegisterPage />;
      case 'handover':
        return <HandoverPage />;
      case 'manager_handover':
        return <ManagerHandoverPage />;
      case 'reports':
        return <ReportsPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'guide':
        return <GuidePage />;
      case 'admin_settings':
        return <AdminSettingsPage />;
      default:
        return (
          <DashboardPage
            onNavigate={navigateTo}
            onOpenSupabaseConfig={() => setIsSbModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      {/* Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Layout Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'pl-0 lg:pl-20' : 'pl-0 lg:pl-64'
        }`}
      >
        {/* Header */}
        <Header
          pageTitle={pageTitle}
          sidebarCollapsed={collapsed}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenSettings={() => setIsSbModalOpen(true)}
          onOpenLogin={() => setIsAuthModalOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <SupabaseConfigModal
        isOpen={isSbModalOpen}
        onClose={() => setIsSbModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
