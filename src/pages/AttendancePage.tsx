import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { AttendanceRecord, Employee, Shift, RecordStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  User,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { role, user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // New Record Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutDate, setCheckOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutTime, setCheckOutTime] = useState('09:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [notes, setNotes] = useState('');

  // Auto-calculated state
  const [calcHours, setCalcHours] = useState<number>(24);
  const [calcLate, setCalcLate] = useState<number>(0);
  const [calcOvertime, setCalcOvertime] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [recRes, empRes, shiftRes] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*, employee:employees(*)')
          .order('work_date', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
        supabase.from('shifts').select('*').eq('is_active', true),
      ]);

      if (recRes.data) setRecords(recRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
    } catch (err) {
      console.error('Attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate hours dynamically when times change
  useEffect(() => {
    try {
      const startDateTime = new Date(`${workDate}T${checkInTime}:00`);
      const endDateTime = new Date(`${checkOutDate}T${checkOutTime}:00`);
      const diffMs = endDateTime.getTime() - startDateTime.getTime();

      if (diffMs > 0) {
        const totalMinutes = Math.floor(diffMs / 60000) - breakMinutes;
        const hours = Math.max(0, +(totalMinutes / 60).toFixed(2));
        setCalcHours(hours);

        // Calculate overtime if > 24 for 24h shift or > 12
        const targetShift = shifts.find((s) => s.id === selectedShiftId);
        const standardShiftHours = targetShift?.duration_hours || 24;
        if (hours > standardShiftHours) {
          setCalcOvertime(+(hours - standardShiftHours).toFixed(2));
        } else {
          setCalcOvertime(0);
        }
      } else {
        setCalcHours(0);
      }
    } catch {
      setCalcHours(0);
    }
  }, [workDate, checkInTime, checkOutDate, checkOutTime, breakMinutes, selectedShiftId, shifts]);

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const startIso = `${workDate}T${checkInTime}:00+08:00`;
    const endIso = `${checkOutDate}T${checkOutTime}:00+08:00`;

    const { error } = await supabase.from('attendance_records').insert([
      {
        employee_id: selectedEmpId,
        shift_id: selectedShiftId || null,
        work_date: workDate,
        actual_check_in: startIso,
        actual_check_out: endIso,
        break_minutes: breakMinutes,
        actual_hours: calcHours,
        late_minutes: calcLate,
        overtime_hours: calcOvertime,
        status: 'pending',
        notes: notes || null,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setNotes('');
      fetchData();
    }
  };

  const handleStatusChange = async (id: string, newStatus: RecordStatus) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('attendance_records')
      .update({
        status: newStatus,
        verified_by: user?.id || null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      fetchData();
    } else {
      alert(`Алдаа: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Цагийн бүртгэл
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ажилтнуудын бодит ирсэн, буусан цаг болон эрхлэгчийн баталгаажуулалт
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={employees.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Цаг бүртгэх</span>
        </button>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="Цагийн бүртгэл байхгүй байна"
          description="Ажилтны ирсэн болон буусан цагийг бүртгэж, эрхлэгч баталгаажуулснаар цалин бодох эрх үүснэ."
          actionText="Цаг бүртгэх"
          onAction={() => setIsModalOpen(true)}
          icon={Clock}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Огноо</th>
                <th className="py-3 px-4">Ажилтан</th>
                <th className="py-3 px-4">Ирсэн / Буусан</th>
                <th className="py-3 px-4">Завсарлага</th>
                <th className="py-3 px-4">Ажилласан</th>
                <th className="py-3 px-4">Илүү цаг</th>
                <th className="py-3 px-4">Төлөв</th>
                <th className="py-3 px-4">Тайлбар</th>
                <th className="py-3 px-4 text-right">Баталгаажуулалт</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {records.map((r) => {
                const inTime = r.actual_check_in
                  ? new Date(r.actual_check_in).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
                  : '-';
                const outTime = r.actual_check_out
                  ? new Date(r.actual_check_out).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
                  : '-';

                return (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-200">{r.work_date}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {r.employee?.full_name || 'Ажилтан'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {inTime} - {outTime}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {r.break_minutes} мин
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {r.actual_hours} цаг
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {r.overtime_hours > 0 ? `+${r.overtime_hours} цаг` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {r.status === 'approved' && (
                        <span className="text-emerald-400 text-[11px] font-semibold">
                          Баталгаажсан
                        </span>
                      )}
                      {r.status === 'pending' && (
                        <span className="text-amber-400 text-[11px] font-semibold">
                          Хүлээгдэж буй
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="text-rose-400 text-[11px] font-semibold">
                          Татгалзсан
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{r.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {(role === 'admin' || role === 'manager') && r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusChange(r.id, 'approved')}
                            className="p-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900 transition-colors"
                            title="Батлах"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(r.id, 'rejected')}
                            className="p-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition-colors"
                            title="Татгалзах"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Attendance Record */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Цагийн бүртгэл оруулах"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-3.5 text-xs">
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
                  {emp.full_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ээлжийн төрөл
            </label>
            <select
              value={selectedShiftId}
              onChange={(e) => setSelectedShiftId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Сонголтгүй / Чөлөөт цаг --</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time_str} - {s.end_time_str})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ирсэн огноо
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Ирсэн цаг
              </label>
              <input
                type="time"
                required
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Буусан огноо
              </label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Буусан цаг
              </label>
              <input
                type="time"
                required
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Завсарлага (минут)
            </label>
            <input
              type="number"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Тооцоолсон бодит цаг:</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {calcHours} цаг {calcOvertime > 0 ? `(+${calcOvertime} илүү)` : ''}
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тэмдэглэл / Тайлбар
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Жишээ: 10 минут эрт ирсэн"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Цагийн бүртгэл илгээх
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
