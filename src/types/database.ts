export type UserRole = 'admin' | 'manager' | 'worker';
export type NozzleStatus = 'active' | 'out_of_fuel' | 'temp_closed' | 'maintenance' | 'inactive';
export type RecordStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  shift_partner_id?: string;
  payroll_type: 'hourly' | 'fixed_salary' | 'shift_based';
  hourly_rate: number;
  base_salary: number;
  is_active: boolean;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time_str: string;
  end_time_str: string;
  is_overnight: boolean;
  duration_hours: number;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  employee_id: string;
  assignment_date: string;
  planned_start: string;
  planned_end: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  shift?: Shift;
  employee?: Employee;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  shift_id?: string;
  work_date: string;
  planned_start?: string;
  planned_end?: string;
  actual_check_in: string;
  actual_check_out?: string;
  break_minutes: number;
  actual_hours: number;
  late_minutes: number;
  overtime_hours: number;
  status: RecordStatus;
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  employee?: Employee;
}

export interface PayrollSettings {
  id: string;
  cut_off_day: number;
  first_payout_day: number;
  second_payout_day: number;
  notes?: string;
  updated_by?: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  base_pay: number;
  hourly_pay: number;
  verified_hours: number;
  bonus: number;
  deduction: number;
  advance: number;
  total_net: number;
  paid_amount: number;
  balance: number;
  status: RecordStatus;
  verified_by?: string;
  created_at: string;
  employee?: Employee;
}

export interface PayrollPayment {
  id: string;
  payroll_record_id: string;
  employee_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'cash' | 'bank_transfer';
  notes?: string;
  created_by?: string;
  created_at: string;
  employee?: Employee;
}

export interface FuelType {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface FuelPrice {
  id: string;
  fuel_type_id: string;
  price_per_liter: number;
  effective_from: string;
  effective_to?: string;
  set_by?: string;
  created_at: string;
  fuel_type?: FuelType;
}

export interface StorageTank {
  id: string;
  tank_number: string;
  name: string;
  fuel_type_id: string;
  capacity_liters: number;
  current_liters: number;
  safety_threshold_liters: number;
  max_fill_liters: number;
  measurement_method: 'dipstick' | 'sensor';
  last_measured_at?: string;
  measured_by?: string;
  notes?: string;
  created_at: string;
  fuel_type?: FuelType;
}

export interface TankMeasurement {
  id: string;
  tank_id: string;
  measurement_value: number;
  unit: string;
  calculated_liters: number;
  measured_at: string;
  employee_id?: string;
  notes?: string;
  status: RecordStatus;
  verified_by?: string;
  created_at: string;
  tank?: StorageTank;
  employee?: Employee;
}

export interface CalibrationSetting {
  id: string;
  tank_id: string;
  height_mm: number;
  volume_liters: number;
  created_at: string;
}

export interface FuelNozzle {
  id: string;
  nozzle_number: string;
  nozzle_name: string;
  fuel_type_id: string;
  tank_id?: string;
  status: NozzleStatus;
  status_reason?: string;
  last_reading: number;
  updated_by?: string;
  created_at: string;
  fuel_type?: FuelType;
  tank?: StorageTank;
}

export interface FuelMeterReading {
  id: string;
  nozzle_id: string;
  shift_id?: string;
  employee_id: string;
  reading_date: string;
  initial_meter: number;
  final_meter: number;
  sold_liters: number;
  price_per_liter: number;
  total_amount: number;
  status: RecordStatus;
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  nozzle?: FuelNozzle;
  employee?: Employee;
  shift?: Shift;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string;
  category: string;
  unit: string;
  package_size?: string;
  unit_price: number;
  initial_stock: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductStockMovement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'damage';
  quantity: number;
  reason?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
}

export interface ProductSale {
  id: string;
  product_id: string;
  shift_id?: string;
  employee_id: string;
  sale_date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: RecordStatus;
  notes?: string;
  created_at: string;
  product?: Product;
  employee?: Employee;
}

export interface PosDevice {
  id: string;
  device_name: string;
  bank_name: string;
  device_number: string;
  is_active: boolean;
  created_at: string;
}

export interface PosTransaction {
  id: string;
  pos_device_id: string;
  shift_id?: string;
  employee_id: string;
  transaction_date: string;
  initial_amount: number;
  final_amount: number;
  sales_amount: number;
  refund_amount: number;
  void_amount: number;
  fee_amount: number;
  net_amount: number;
  receipt_url?: string;
  notes?: string;
  status: RecordStatus;
  verified_by?: string;
  created_at: string;
  pos_device?: PosDevice;
  employee?: Employee;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  shift_id?: string;
  employee_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  statement_amount: number;
  verified_amount: number;
  difference: number;
  notes?: string;
  status: RecordStatus;
  verified_by?: string;
  created_at: string;
  bank_account?: BankAccount;
  employee?: Employee;
}

export interface CashRegister {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  register_id?: string;
  shift_id?: string;
  employee_id: string;
  transaction_date: string;
  opening_cash: number;
  cash_sales: number;
  other_income: number;
  refunds: number;
  approved_expenses: number;
  calculated_cash: number;
  actual_cash: number;
  difference: number;
  notes?: string;
  status: RecordStatus;
  verified_by?: string;
  created_at: string;
  employee?: Employee;
}

export interface ShiftHandover {
  id: string;
  handover_date: string;
  shift_id?: string;
  outgoing_employee_id: string;
  incoming_employee_id: string;
  fuel_sales_total: number;
  product_sales_total: number;
  pos_total: number;
  bank_total: number;
  cash_total: number;
  calculated_total: number;
  actual_total: number;
  difference: number;
  outgoing_confirmed: boolean;
  incoming_confirmed: boolean;
  manager_verified: boolean;
  manager_id?: string;
  notes?: string;
  status: RecordStatus;
  created_at: string;
  outgoing_employee?: Employee;
  incoming_employee?: Employee;
  shift?: Shift;
}

export interface ManagerHandoverPayment {
  id: string;
  handover_id?: string;
  shift_id?: string;
  employee_id: string;
  manager_id: string;
  handover_date: string;
  payment_type: 'cash' | 'card_total' | 'bank_slip';
  handed_amount: number;
  received_amount: number;
  difference: number;
  is_confirmed: boolean;
  notes?: string;
  created_at: string;
  employee?: Employee;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  details?: any;
  created_at: string;
}
