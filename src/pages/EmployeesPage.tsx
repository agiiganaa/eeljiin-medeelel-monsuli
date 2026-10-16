import React, { useEffect, useState } from 'react';
import { getSupabase, formatMNT } from '../lib/supabase';
import { Employee, UserRole } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Users,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Phone,
  Shield,
  DollarSign,
  UserCheck,
  UserX,
} from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { role, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: Add/Edit Employee
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [empRole, setEmpRole] = useState<UserRole>('worker');
  const [shiftPartnerId, setShiftPartnerId] = useState('');
  const [payrollType, setPayrollType] = useState<'hourly' | 'fixed_salary' | 'shift_based'>('hourly');
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [baseSalary, setBaseSalary] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setEmployees(data);
    } catch (err) {
      console.error('Employees fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setEmployeeCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setFullName('');
    setPhone('');
    setEmpRole('worker');
    setShiftPartnerId('');
    setPayrollType('hourly');
    setHourlyRate(0);
    setBaseSalary(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEmployeeCode(emp.employee_code);
    setFullName(emp.full_name);
    setPhone(emp.phone || '');
    setEmpRole(emp.role);
    setShiftPartnerId(emp.shift_partner_id || '');
    setPayrollType(emp.payroll_type);
    setHourlyRate(emp.hourly_rate);
    setBaseSalary(emp.base_salary);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (emp: Employee) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('employees')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id);

    if (!error) fetchData();
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const payload = {
      employee_code: employeeCode,
      full_name: fullName,
      phone: phone || null,
      role: empRole,
      shift_partner_id: shiftPartnerId || null,
      payroll_type: payrollType,
      hourly_rate: Math.round(Number(hourlyRate)),
      base_salary: Math.round(Number(baseSalary)),
    };

    if (editingId) {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', editingId);

      if (error) alert(`Алдаа: ${error.message}`);
    } else {
      const { error } = await supabase.from('employees').insert([
        {
          ...payload,
          is_active: true,
        },
      ]);

      if (error) alert(`Алдаа: ${error.message}`);
    }

    setIsModalOpen(false);
    fetchData();
  };

  const getPartnerName = (partnerId?: string) => {
    if (!partnerId) return '-';
    const found = employees.find((e) => e.id === partnerId);
    return found ? found.full_name : '-';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ажилтнуудын бүртгэл
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ШТС-ийн ажилтнууд, ээлжийн хос, цагийн үнэлгээ ба эрхийн тохиргоо
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Шинэ ажилтан бүртгэх</span>
          </button>
        )}
      </div>

      {/* Employees Table */}
      {employees.length === 0 ? (
        <EmptyState
          title="Ажилтан бүртгэгдээгүй байна"
          description="ШТС-д ажиллах түгээгч болон бусад ажилтнуудыг шинээр бүртгэж эхэлнэ үү. Хуурамч жишээ нэрс үүсгэхгүй."
          actionText="Шинэ ажилтан нэмэх"
          onAction={handleOpenAdd}
          icon={Users}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Код</th>
                <th className="py-3 px-4">Овог нэр</th>
                <th className="py-3 px-4">Албан тушаал / Эрх</th>
                <th className="py-3 px-4">Утас</th>
                <th className="py-3 px-4">Ээлжийн хос</th>
                <th className="py-3 px-4">Цалингийн хэлбэр</th>
                <th className="py-3 px-4">Үнэлгээ (₮)</th>
                <th className="py-3 px-4">Төлөв</th>
                <th className="py-3 px-4 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 font-bold">
                    {emp.employee_code}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    {emp.full_name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        emp.role === 'admin'
                          ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                          : emp.role === 'manager'
                          ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                          : 'text-slate-300 bg-slate-800 border-slate-700'
                      }`}
                    >
                      {emp.role === 'admin'
                        ? 'Админ'
                        : emp.role === 'manager'
                        ? 'Эрхлэгч'
                        : 'Түгээгч (Ажилтан)'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {emp.phone || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {getPartnerName(emp.shift_partner_id)}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {emp.payroll_type === 'hourly'
                      ? 'Цагийн үнэлгээтэй'
                      : emp.payroll_type === 'fixed_salary'
                      ? 'Үндсэн цалин'
                      : 'Ээлжийн үнэлгээ'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {emp.payroll_type === 'hourly'
                      ? `${formatMNT(emp.hourly_rate)} / цаг`
                      : formatMNT(emp.base_salary)}
                  </td>
                  <td className="py-3 px-4">
                    {emp.is_active ? (
                      <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Идэвхтэй
                      </span>
                    ) : (
                      <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Идэвхгүй
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {role === 'admin' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Засах"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1 rounded transition-colors ${
                            emp.is_active
                              ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/40'
                              : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                          }`}
                          title={emp.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                        >
                          {emp.is_active ? (
                            <UserX className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add/Edit Employee */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Ажилтны мэдээлэл засах' : 'Шинэ ажилтан бүртгэх'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ажилтны код
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="EMP-001"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Утасны дугаар
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="99112233"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Овог, нэр
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Жишээ: Бат Болд"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Системийн эрх (Role)
              </label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="worker">Түгээгч (Ажилтан)</option>
                <option value="manager">Эрхлэгч</option>
                <option value="admin">Админ</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ээлжийн хамтрагч хос
              </label>
              <select
                value={shiftPartnerId}
                onChange={(e) => setShiftPartnerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              >
                <option value="">-- Хос сонгохгүй --</option>
                {employees
                  .filter((e) => e.id !== editingId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Цалин бодох хэлбэр
            </label>
            <select
              value={payrollType}
              onChange={(e) => setPayrollType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="hourly">Цагийн үнэлгээгээр (Баталгаажсан цаг × Цагийн хөлс)</option>
              <option value="fixed_salary">Үндсэн сарын тогтмол цалин</option>
              <option value="shift_based">Ээлж бүрийн тогтмол үнэлгээгээр</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Цагийн хөлс (₮/цаг)
              </label>
              <input
                type="number"
                value={hourlyRate || ''}
                onChange={(e) => setHourlyRate(Math.round(Number(e.target.value)))}
                placeholder="Жишээ: 15000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Үндсэн сарын цалин (₮)
              </label>
              <input
                type="number"
                value={baseSalary || ''}
                onChange={(e) => setBaseSalary(Math.round(Number(e.target.value)))}
                placeholder="Жишээ: 1800000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Ажилтан хадгалах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
