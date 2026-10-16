import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { Shift, ShiftAssignment, Employee } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  CalendarDays,
  Plus,
  Clock,
  User,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';

export const ShiftsPage: React.FC = () => {
  const { role } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('list');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // New Shift Model Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('09:00');
  const [isOvernight, setIsOvernight] = useState(true);
  const [shiftDuration, setShiftDuration] = useState('24');
  const [shiftDesc, setShiftDesc] = useState('');

  // New Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignDate, setAssignDate] = useState(selectedDate);
  const [assignNotes, setAssignNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const [shiftsRes, empsRes, assignRes] = await Promise.all([
        supabase.from('shifts').select('*').order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
        supabase.from('shift_assignments').select(`
          *,
          shift:shifts(*),
          employee:employees(*)
        `).order('assignment_date', { ascending: false }),
      ]);

      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (empsRes.data) setEmployees(empsRes.data);
      if (assignRes.data) setAssignments(assignRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick preset loader if no shift templates exist yet
  const handleCreateDefaultTemplate = async (type: 'day24' | 'night12') => {
    const supabase = getSupabase();
    if (!supabase) return;

    const payload =
      type === 'day24'
        ? {
            name: 'Өдрийн ээлж (24 цаг)',
            start_time_str: '09:00',
            end_time_str: '09:00',
            is_overnight: true,
            duration_hours: 24,
            description: '09:00-оос маргааш 09:00 хүртэл бүрэн ээлж',
            is_active: true,
          }
        : {
            name: 'Шөнийн ээлж (12 цаг)',
            start_time_str: '20:30',
            end_time_str: '08:30',
            is_overnight: true,
            duration_hours: 12,
            description: '20:30-аас маргааш 08:30 хүртэл шөнийн ээлж',
            is_active: true,
          };

    const { error } = await supabase.from('shifts').insert([payload]);
    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      fetchData();
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('shifts').insert([
      {
        name: shiftName,
        start_time_str: shiftStart,
        end_time_str: shiftEnd,
        is_overnight: isOvernight,
        duration_hours: parseFloat(shiftDuration) || 24,
        description: shiftDesc || null,
        is_active: true,
      },
    ]);

    if (error) {
      alert(`Алдаа: ${error.message}`);
    } else {
      setIsShiftModalOpen(false);
      setShiftName('');
      setShiftDesc('');
      fetchData();
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const supabase = getSupabase();
    if (!supabase) return;

    if (!assignShiftId || !assignEmpId || !assignDate) {
      setErrorMessage('Бүх талбарыг бөглөнө үү');
      return;
    }

    const targetShift = shifts.find((s) => s.id === assignShiftId);
    const plannedStart = `${assignDate}T${targetShift?.start_time_str || '09:00'}:00+08:00`;
    // For overnight, plannedEnd is next day
    const nextDay = new Date(assignDate);
    if (targetShift?.is_overnight) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    const nextDayStr = nextDay.toISOString().split('T')[0];
    const plannedEnd = `${nextDayStr}T${targetShift?.end_time_str || '09:00'}:00+08:00`;

    const { error } = await supabase.from('shift_assignments').insert([
      {
        shift_id: assignShiftId,
        employee_id: assignEmpId,
        assignment_date: assignDate,
        planned_start: plannedStart,
        planned_end: plannedEnd,
        notes: assignNotes || null,
      },
    ]);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setIsAssignModalOpen(false);
      setAssignNotes('');
      fetchData();
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Энэ хуваарийг устгах уу?')) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
    if (!error) {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Ээлжийн хуваарь
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ШТС-ийн 24/12 цагийн ээлжийн загвар болон ажилтнуудын томилгоо
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Ээлжийн загвар нэмэх</span>
            </button>
          )}

          <button
            onClick={() => setIsAssignModalOpen(true)}
            disabled={shifts.length === 0 || employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Хуваарь оруулах</span>
          </button>
        </div>
      </div>

      {/* Shift Templates section */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Тохируулсан ээлжийн загварууд
            </span>
          </div>
          {shifts.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Шуурхай үүсгэх:</span>
              <button
                onClick={() => handleCreateDefaultTemplate('day24')}
                className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
              >
                + Өдрийн 24 цаг (09:00–09:00)
              </button>
              <button
                onClick={() => handleCreateDefaultTemplate('night12')}
                className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition-colors"
              >
                + Шөнийн 12 цаг (20:30–08:30)
              </button>
            </div>
          )}
        </div>

        {shifts.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Одоогоор ээлжийн загвар бүртгэгдээгүй байна. Дээрх шуурхай товч эсвэл "Ээлжийн загвар нэмэх" товчоор тохируулна уу.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">{s.name}</span>
                    {s.is_overnight && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Шөнө дамнах
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    {s.start_time_str} → {s.end_time_str} ({s.duration_hours} цаг)
                  </div>
                  {s.description && (
                    <div className="text-[11px] text-slate-400 mt-1">
                      {s.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignments Filter & List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Бүртгэгдсэн хуваарийн жагсаалт
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Огноо:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="Ээлжийн хуваарь бүртгэгдээгүй байна"
            description="Ажилтнуудыг тухайн өдрийн ээлжинд томилохын тулд 'Хуваарь оруулах' товчийг дарна уу."
            actionText="Хуваарь оруулах"
            onAction={() => setIsAssignModalOpen(true)}
            icon={CalendarDays}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Огноо</th>
                  <th className="py-3 px-4">Ээлж</th>
                  <th className="py-3 px-4">Ажилтан</th>
                  <th className="py-3 px-4">Төлөвлөсөн цаг</th>
                  <th className="py-3 px-4">Тайлбар</th>
                  <th className="py-3 px-4 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {item.assignment_date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-amber-300">
                        {item.shift?.name || 'Ээлж'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {item.employee?.full_name || 'Ажилтан'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {item.shift?.start_time_str} - {item.shift?.end_time_str}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {role === 'admin' && (
                        <button
                          onClick={() => handleDeleteAssignment(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Устгах"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Shift Template */}
      <Modal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        title="Шинэ ээлжийн загвар үүсгэх"
      >
        <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ээлжийн нэр
            </label>
            <input
              type="text"
              required
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="Жишээ: 1-р ээлж (24 цаг)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Эхлэх цаг
              </label>
              <input
                type="time"
                required
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Дуусах цаг
              </label>
              <input
                type="time"
                required
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Үргэлжлэх цаг
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={shiftDuration}
                onChange={(e) => setShiftDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <span>Шөнө дамнасан ээлж</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Тайлбар
            </label>
            <input
              type="text"
              value={shiftDesc}
              onChange={(e) => setShiftDesc(e.target.value)}
              placeholder="Нэмэлт тайлбар"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Загвар хадгалах
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Assignment */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Ажилтанд ээлж хуваарилах"
      >
        {errorMessage && (
          <div className="mb-3 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Огноо
            </label>
            <input
              type="date"
              required
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ээлжийн төрөл
            </label>
            <select
              required
              value={assignShiftId}
              onChange={(e) => setAssignShiftId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="">-- Ээлж сонгох --</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.start_time_str} - {s.end_time_str})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Ажилтан
            </label>
            <select
              required
              value={assignEmpId}
              onChange={(e) => setAssignEmpId(e.target.value)}
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
              Тэмдэглэл / Тайлбар
            </label>
            <input
              type="text"
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Жишээ: 1-р хошуу хариуцна"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Хуваарь батлах
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
