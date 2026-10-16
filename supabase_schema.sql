-- ==============================================================================
-- ШТС-ийн Удирдлагын Веб Систем — Supabase PostgreSQL Schema & RLS Policies
-- Огноо: Asia/Ulaanbaatar цагийн бүсэд зориулагдсан
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'worker');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE nozzle_status AS ENUM ('active', 'out_of_fuel', 'temp_closed', 'maintenance', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES (Хэрэглэгчийн эрх ба мэдээлэл)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 4. EMPLOYEES (Ажилтнууд)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'worker',
  shift_partner_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  payroll_type TEXT NOT NULL DEFAULT 'hourly', -- 'hourly', 'fixed_salary', 'shift_based'
  hourly_rate NUMERIC(12, 0) NOT NULL DEFAULT 0, -- бүхэл төгрөг
  base_salary NUMERIC(12, 0) NOT NULL DEFAULT 0, -- бүхэл төгрөг
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 5. SHIFTS (Ээлжийн загварууд)
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time_str TEXT NOT NULL, -- Жишээ: '09:00'
  end_time_str TEXT NOT NULL,   -- Жишээ: '09:00'
  is_overnight BOOLEAN NOT NULL DEFAULT true,
  duration_hours NUMERIC(5, 2) NOT NULL DEFAULT 24,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 6. SHIFT ASSIGNMENTS (Ээлжийн хуваарь)
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  planned_start TIMESTAMPTZ NOT NULL,
  planned_end TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  CONSTRAINT unique_emp_shift_date UNIQUE (employee_id, assignment_date, shift_id)
);

-- 7. ATTENDANCE RECORDS (Цагийн бүртгэл)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  actual_check_in TIMESTAMPTZ NOT NULL,
  actual_check_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  actual_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 8. PAYROLL SETTINGS (Цалингийн тохиргоо)
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cut_off_day INTEGER NOT NULL DEFAULT 18,
  first_payout_day INTEGER NOT NULL DEFAULT 25,
  second_payout_day INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 9. PAYROLL RECORDS (Цалингийн бүртгэл)
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_pay NUMERIC(12, 0) NOT NULL DEFAULT 0,
  hourly_pay NUMERIC(12, 0) NOT NULL DEFAULT 0,
  verified_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12, 0) NOT NULL DEFAULT 0,
  deduction NUMERIC(12, 0) NOT NULL DEFAULT 0,
  advance NUMERIC(12, 0) NOT NULL DEFAULT 0,
  total_net NUMERIC(12, 0) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 0) NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  CONSTRAINT unique_emp_period UNIQUE (employee_id, period_start, period_end)
);

-- 10. PAYROLL PAYMENTS (Цалингийн олголт)
CREATE TABLE IF NOT EXISTS public.payroll_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 0) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'bank_transfer', -- 'cash', 'bank_transfer'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 11. FUEL TYPES (Шатахууны төрлүүд)
CREATE TABLE IF NOT EXISTS public.fuel_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- Жишээ: 'A-92', 'A-95', 'ДТ'
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 12. FUEL PRICES (Шатахууны үнийн түүх)
CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fuel_type_id UUID NOT NULL REFERENCES public.fuel_types(id) ON DELETE RESTRICT,
  price_per_liter NUMERIC(10, 0) NOT NULL, -- бүхэл төгрөг
  effective_from TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  effective_to TIMESTAMPTZ,
  set_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 13. STORAGE TANKS (Савны бүртгэл)
CREATE TABLE IF NOT EXISTS public.storage_tanks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  fuel_type_id UUID NOT NULL REFERENCES public.fuel_types(id) ON DELETE RESTRICT,
  capacity_liters NUMERIC(12, 2) NOT NULL,
  current_liters NUMERIC(12, 2) NOT NULL DEFAULT 0,
  safety_threshold_liters NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_fill_liters NUMERIC(12, 2) NOT NULL,
  measurement_method TEXT NOT NULL DEFAULT 'dipstick', -- 'dipstick', 'sensor'
  last_measured_at TIMESTAMPTZ,
  measured_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 14. TANK MEASUREMENTS (Мастшапын болон түвшний хэмжилт)
CREATE TABLE IF NOT EXISTS public.tank_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID NOT NULL REFERENCES public.storage_tanks(id) ON DELETE CASCADE,
  measurement_value NUMERIC(10, 2) NOT NULL, -- мм эсвэл см
  unit TEXT NOT NULL DEFAULT 'mm',
  calculated_liters NUMERIC(12, 2) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  employee_id UUID REFERENCES public.employees(id),
  notes TEXT,
  status record_status NOT NULL DEFAULT 'approved',
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 15. CALIBRATION SETTINGS (Мастшапын калибровкын хүснэгт)
CREATE TABLE IF NOT EXISTS public.calibration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID NOT NULL REFERENCES public.storage_tanks(id) ON DELETE CASCADE,
  height_mm NUMERIC(10, 2) NOT NULL,
  volume_liters NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  CONSTRAINT unique_tank_height UNIQUE (tank_id, height_mm)
);

-- 16. FUEL NOZZLES (Шатахууны хошуу)
CREATE TABLE IF NOT EXISTS public.fuel_nozzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nozzle_number TEXT NOT NULL UNIQUE,
  nozzle_name TEXT NOT NULL,
  fuel_type_id UUID NOT NULL REFERENCES public.fuel_types(id) ON DELETE RESTRICT,
  tank_id UUID REFERENCES public.storage_tanks(id) ON DELETE SET NULL,
  status nozzle_status NOT NULL DEFAULT 'active',
  status_reason TEXT,
  last_reading NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 17. FUEL METER READINGS (Шатахууны милль ба борлуулалт)
CREATE TABLE IF NOT EXISTS public.fuel_meter_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nozzle_id UUID NOT NULL REFERENCES public.fuel_nozzles(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  reading_date DATE NOT NULL,
  initial_meter NUMERIC(14, 2) NOT NULL,
  final_meter NUMERIC(14, 2) NOT NULL,
  sold_liters NUMERIC(12, 2) NOT NULL,
  price_per_liter NUMERIC(10, 0) NOT NULL,
  total_amount NUMERIC(14, 0) NOT NULL,
  status record_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 18. PRODUCTS (Тос, нэмэлт бүтээгдэхүүн)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL, -- Жишээ: 'Хөдөлгүүрийн тос', 'Хөргөлтийн шингэн', 'Шил арчигч'
  unit TEXT NOT NULL DEFAULT 'ш',
  package_size TEXT,
  unit_price NUMERIC(12, 0) NOT NULL, -- бүхэл төгрөг
  initial_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 19. PRODUCT STOCK MOVEMENTS (Бүтээгдэхүүний орлого/зарлага)
CREATE TABLE IF NOT EXISTS public.product_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'damage'
  quantity NUMERIC(10, 2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 20. PRODUCT SALES (Бүтээгдэхүүний борлуулалт)
CREATE TABLE IF NOT EXISTS public.product_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  sale_date DATE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(12, 0) NOT NULL,
  total_amount NUMERIC(14, 0) NOT NULL,
  status record_status NOT NULL DEFAULT 'approved',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 21. POS DEVICES (POS төхөөрөмжүүд)
CREATE TABLE IF NOT EXISTS public.pos_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  device_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 22. POS TRANSACTIONS (POS тооцоо)
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pos_device_id UUID NOT NULL REFERENCES public.pos_devices(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  transaction_date DATE NOT NULL,
  initial_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  final_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  sales_amount NUMERIC(14, 0) NOT NULL,
  refund_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  void_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14, 0) NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  status record_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 23. BANK ACCOUNTS (Банкны дансууд)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 24. BANK TRANSACTIONS (Банкны тооцоо)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'qpay_or_transfer',
  amount NUMERIC(14, 0) NOT NULL,
  statement_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  verified_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  difference NUMERIC(14, 0) NOT NULL DEFAULT 0,
  notes TEXT,
  status record_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 25. CASH REGISTERS (Кассын нэгж)
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 26. CASH TRANSACTIONS (Бэлэн мөнгөний тооцоо)
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  register_id UUID REFERENCES public.cash_registers(id),
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  transaction_date DATE NOT NULL,
  opening_cash NUMERIC(14, 0) NOT NULL DEFAULT 0,
  cash_sales NUMERIC(14, 0) NOT NULL DEFAULT 0,
  other_income NUMERIC(14, 0) NOT NULL DEFAULT 0,
  refunds NUMERIC(14, 0) NOT NULL DEFAULT 0,
  approved_expenses NUMERIC(14, 0) NOT NULL DEFAULT 0,
  calculated_cash NUMERIC(14, 0) NOT NULL,
  actual_cash NUMERIC(14, 0) NOT NULL,
  difference NUMERIC(14, 0) NOT NULL DEFAULT 0,
  notes TEXT,
  status record_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 27. SHIFT HANDOVERS (Ээлж хүлээлцэх)
CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_date DATE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id),
  outgoing_employee_id UUID NOT NULL REFERENCES public.employees(id),
  incoming_employee_id UUID NOT NULL REFERENCES public.employees(id),
  fuel_sales_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  product_sales_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  pos_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  bank_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  cash_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  calculated_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  actual_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  difference NUMERIC(14, 0) NOT NULL DEFAULT 0,
  outgoing_confirmed BOOLEAN NOT NULL DEFAULT false,
  incoming_confirmed BOOLEAN NOT NULL DEFAULT false,
  manager_verified BOOLEAN NOT NULL DEFAULT false,
  manager_id UUID REFERENCES auth.users(id),
  notes TEXT,
  status record_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 28. MANAGER HANDOVER PAYMENTS (Эрхлэгчид мөнгө хүлээлгэн өгөх)
CREATE TABLE IF NOT EXISTS public.manager_handover_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_id UUID REFERENCES public.shift_handovers(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.shifts(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  handover_date DATE NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'card_total', 'bank_slip'
  handed_amount NUMERIC(14, 0) NOT NULL,
  received_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  difference NUMERIC(14, 0) NOT NULL DEFAULT 0,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- 29. AUDIT LOGS (Өөрчлөлтийн түүх)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Ulaanbaatar', now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_nozzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_handover_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check role in RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Authenticated users can read all profiles; only admin can update roles; user can update own phone/name
CREATE POLICY "Profiles read by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles update own or by admin" ON public.profiles FOR UPDATE TO authenticated USING (
  auth.uid() = id OR public.current_user_role() = 'admin'
);
CREATE POLICY "Profiles insert on auth sign up" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Base read policies for authenticated staff
CREATE POLICY "Staff read fuel_types" ON public.fuel_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read fuel_prices" ON public.fuel_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read nozzles" ON public.fuel_nozzles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read tanks" ON public.storage_tanks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read pos_devices" ON public.pos_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read shifts" ON public.shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read employees" ON public.employees FOR SELECT TO authenticated USING (true);

-- Admin full management policies
CREATE POLICY "Admin manage fuel_types" ON public.fuel_types FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage fuel_prices" ON public.fuel_prices FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage nozzles" ON public.fuel_nozzles FOR ALL TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Admin manage tanks" ON public.storage_tanks FOR ALL TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Admin manage products" ON public.products FOR ALL TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Admin manage pos_devices" ON public.pos_devices FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage shifts" ON public.shifts FOR ALL TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Admin manage employees" ON public.employees FOR ALL TO authenticated USING (public.current_user_role() = 'admin');

-- Staff can insert meter readings, sales, pos, bank, cash, handovers
CREATE POLICY "Staff read meter readings" ON public.fuel_meter_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert meter readings" ON public.fuel_meter_readings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Manager/Admin verify meter readings" ON public.fuel_meter_readings FOR UPDATE TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Staff read product sales" ON public.product_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert product sales" ON public.product_sales FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff read pos transactions" ON public.pos_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert pos transactions" ON public.pos_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Manager/Admin verify pos transactions" ON public.pos_transactions FOR UPDATE TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Staff read bank transactions" ON public.bank_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert bank transactions" ON public.bank_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff read cash transactions" ON public.cash_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert cash transactions" ON public.cash_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff read handovers" ON public.shift_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert handovers" ON public.shift_handovers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update handovers" ON public.shift_handovers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff read manager handover payments" ON public.manager_handover_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert manager handover payments" ON public.manager_handover_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Manager confirm handover payments" ON public.manager_handover_payments FOR UPDATE TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));

-- Attendance & Payroll security
CREATE POLICY "Staff read own or admin all attendance" ON public.attendance_records FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin', 'manager') OR auth.uid() IN (SELECT user_id FROM public.employees WHERE id = employee_id)
);
CREATE POLICY "Staff insert attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Manager/Admin update attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "Payroll records read" ON public.payroll_records FOR SELECT TO authenticated USING (
  public.current_user_role() IN ('admin', 'manager') OR auth.uid() IN (SELECT user_id FROM public.employees WHERE id = employee_id)
);
CREATE POLICY "Admin manage payroll" ON public.payroll_records FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage payroll settings" ON public.payroll_settings FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Admin manage payroll payments" ON public.payroll_payments FOR ALL TO authenticated USING (public.current_user_role() = 'admin');

-- Calibration & Tanks
CREATE POLICY "Staff read calibration" ON public.calibration_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage calibration" ON public.calibration_settings FOR ALL TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Staff read tank measurements" ON public.tank_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert tank measurements" ON public.tank_measurements FOR INSERT TO authenticated WITH CHECK (true);

-- Shift Assignments
CREATE POLICY "Staff read shift assignments" ON public.shift_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manager/Admin manage shift assignments" ON public.shift_assignments FOR ALL TO authenticated USING (public.current_user_role() IN ('admin', 'manager'));

-- Audit Logs
CREATE POLICY "Admin read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Anyone insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
