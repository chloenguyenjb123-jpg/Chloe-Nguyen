import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import {
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Columns3,
  Forward,
  List,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  TASK_CATEGORY_KEYS,
  type Task,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type TaskSubtask,
} from '../../types';
import {
  carryForwardTasks,
  createTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
  updateTaskSubtasks,
} from '../../services/firestoreService';
import {
  addDaysToDateStr,
  formatShortDate,
  getMonthRangeVN,
  getTodayVN,
  getWeekRangeVN,
  isTaskOverdue,
} from '../../utils/date';
import { useI18n } from '../../i18n/LanguageContext';

interface TasksViewProps {
  uid: string;
  tasks: Task[];
  onNotify: (msg: string) => void;
}

type TaskViewMode = 'list' | 'kanban' | 'calendar';

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'bg-[#F3EDE6] text-[#7F6D67]',
  medium: 'bg-[#EDF1EA] text-[#5B6B52]',
  high: 'bg-[#F7ECEC] text-[#A77C78]',
  urgent: 'bg-[#EBCFD0] text-[#55443F]',
};

export function TasksView({ uid, tasks, onNotify }: TasksViewProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();
  const weekRange = getWeekRangeVN(today);
  const monthRange = getMonthRangeVN(today);

  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Carry-forward modal
  const [carryModalOpen, setCarryModalOpen] = useState(false);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(TASK_CATEGORY_KEYS[0]);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [startDate, setStartDate] = useState(today);
  const [deadline, setDeadline] = useState(today);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [timeBlockStart, setTimeBlockStart] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('30');
  const [reminderTime, setReminderTime] = useState('');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [saving, setSaving] = useState(false);

  const overdueTasks = useMemo(
    () => tasks.filter((tk) => isTaskOverdue(tk.deadline, tk.status, today)),
    [tasks, today]
  );

  const filteredTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tasks.filter((tk) => {
      if (filterCategory !== 'all' && tk.category !== filterCategory) return false;
      if (filterPriority !== 'all' && tk.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && tk.status !== filterStatus) return false;
      if (filterDate && tk.deadline !== filterDate && tk.startDate !== filterDate) return false;
      if (q) {
        const hay = `${tk.title} ${tk.description} ${tk.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, searchTerm, filterCategory, filterPriority, filterStatus, filterDate]);

  const weeklyStats = useMemo(() => {
    const wk = tasks.filter((tk) => tk.deadline >= weekRange.start && tk.deadline <= weekRange.end);
    const done = wk.filter((tk) => tk.status === 'completed').length;
    return { total: wk.length, done, pct: wk.length > 0 ? Math.round((done / wk.length) * 100) : 0 };
  }, [tasks, weekRange]);

  const monthlyStats = useMemo(() => {
    const mo = tasks.filter((tk) => tk.deadline >= monthRange.start && tk.deadline <= monthRange.end);
    const done = mo.filter((tk) => tk.status === 'completed').length;
    return { total: mo.length, done, pct: mo.length > 0 ? Math.round((done / mo.length) * 100) : 0 };
  }, [tasks, monthRange]);

  const openCreateModal = (defaultStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategory(TASK_CATEGORY_KEYS[0]);
    setPriority('medium');
    setStatus(defaultStatus);
    setStartDate(today);
    setDeadline(today);
    setRecurrence('none');
    setTimeBlockStart('');
    setEstimatedMinutes('30');
    setReminderTime('');
    setNotes('');
    setSubtasks([]);
    setNewSubtaskText('');
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setStartDate(task.startDate);
    setDeadline(task.deadline);
    setRecurrence(task.recurrence ?? 'none');
    setTimeBlockStart(task.timeBlockStart ?? '');
    setEstimatedMinutes(String(task.estimatedMinutes ?? 0));
    setReminderTime(task.reminderTime ?? '');
    setNotes(task.notes);
    setSubtasks(task.subtasks ?? []);
    setNewSubtaskText('');
    setModalOpen(true);
  };

  const handleAddSubtask = () => {
    const clean = newSubtaskText.trim();
    if (!clean) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `sub_${Date.now()}_${prev.length}`, title: clean, completed: false },
    ]);
    setNewSubtaskText('');
  };

  const handleSaveTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        category,
        priority,
        startDate,
        deadline,
        status,
        notes,
        subtasks,
        recurrence,
        timeBlockStart,
        estimatedMinutes: Number(estimatedMinutes) || 0,
        reminderTime,
      };
      if (editingTask) {
        await updateTask(uid, editingTask.id, payload);
        onNotify(lang === 'en' ? 'Task updated.' : 'Đã cập nhật công việc.');
      } else {
        await createTask(uid, payload);
        onNotify(lang === 'en' ? 'New task created.' : 'Đã tạo công việc mới.');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubtaskInline = async (task: Task, subId: string) => {
    const next = (task.subtasks || []).map((s) =>
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    await updateTaskSubtasks(uid, task.id, next);
  };

  const handleConfirmCarryForward = async () => {
    await carryForwardTasks(uid, overdueTasks, today);
    setCarryModalOpen(false);
    onNotify(t.tasks.carryForwardDone);
  };

  const handleDropOnColumn = async (targetStatus: TaskStatus, e: DragEvent) => {
    e.preventDefault();
    const id = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);
    if (!id) return;
    const task = tasks.find((tk) => tk.id === id);
    if (!task || task.status === targetStatus) return;
    await updateTaskStatus(uid, id, targetStatus);
  };

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startOffset = (first.getUTCDay() + 6) % 7;
    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ dateStr: null, dayNum: null });
    for (let d = 1; d <= lastDay; d++) {
      cells.push({
        dateStr: `${calendarMonth}-${String(d).padStart(2, '0')}`,
        dayNum: d,
      });
    }
    return cells;
  }, [calendarMonth]);

  const columns: TaskStatus[] = ['todo', 'in_progress', 'on_hold', 'completed'];

  return (
    <div className="space-y-6">
      {/* Header + Progress Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.tasks.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.tasks.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overdueTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setCarryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#F7ECEC] text-[#A77C78] border border-[#EBCFD0] hover:bg-[#EBCFD0]/60 transition-colors"
            >
              <Forward className="w-3.5 h-3.5" />
              {t.tasks.carryForwardBtn} ({overdueTasks.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => openCreateModal('todo')}
            className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t.tasks.addTask}
          </button>
        </div>
      </div>

      {/* Weekly & Monthly Progress Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="dh-card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#55443F]">
            <span>{t.tasks.weeklyProgress}</span>
            <span className="font-mono text-[#A77C78]">
              {weeklyStats.done}/{weeklyStats.total} ({weeklyStats.pct}%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
            <div className="h-full bg-[#A8B5A0] rounded-full" style={{ width: `${weeklyStats.pct}%` }} />
          </div>
        </div>
        <div className="dh-card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#55443F]">
            <span>{t.tasks.monthlyProgress}</span>
            <span className="font-mono text-[#A77C78]">
              {monthlyStats.done}/{monthlyStats.total} ({monthlyStats.pct}%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
            <div className="h-full bg-[#A77C78] rounded-full" style={{ width: `${monthlyStats.pct}%` }} />
          </div>
        </div>
      </div>

      {/* Toolbar: View Switcher + Filters */}
      <div className="dh-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-[#F3EDE6] rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              {t.tasks.viewKanban}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {t.tasks.viewList}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {t.tasks.viewCalendar}
            </button>
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-[#9A8983] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.tasks.searchPlaceholder}
              className="dh-input w-full pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.tasks.filterCategory}: {t.common.all}</option>
            {TASK_CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>{t.taskCategories[c]}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.tasks.filterPriority}: {t.common.all}</option>
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{t.taskPriority[p]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.tasks.filterStatus}: {t.common.all}</option>
            {columns.map((st) => (
              <option key={st} value={st}>{t.taskStatus[st]}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div>
          <p className="text-[11px] text-[#7F6D67] mb-2">{t.tasks.dragHint}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columns.map((colStatus) => {
              const colTasks = filteredTasks.filter((tk) => tk.status === colStatus);
              return (
                <div
                  key={colStatus}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropOnColumn(colStatus, e)}
                  className="bg-[#F3EDE6]/70 border border-[#E8DFD6] rounded-2xl p-3.5 min-h-[340px] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold text-[#55443F] flex items-center gap-2">
                      {t.taskStatus[colStatus]}
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white text-[#7F6D67]">
                        {colTasks.length}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateModal(colStatus)}
                      className="p-1 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colTasks.map((tk) => {
                      const overdue = isTaskOverdue(tk.deadline, tk.status, today);
                      const subs = tk.subtasks || [];
                      const subsDone = subs.filter((s) => s.completed).length;
                      return (
                        <div
                          key={tk.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskId(tk.id);
                            e.dataTransfer.setData('text/plain', tk.id);
                          }}
                          className="dh-card p-3.5 cursor-grab active:cursor-grabbing hover:border-[#A77C78]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-xs font-semibold leading-snug ${
                                tk.status === 'completed' ? 'line-through text-[#9A8983]' : 'text-[#55443F]'
                              }`}
                            >
                              {tk.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditModal(tk)}
                                className="p-1 text-[#7F6D67] hover:text-[#55443F]"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(t.tasks.deleteConfirm)) {
                                    void deleteTask(uid, tk.id);
                                  }
                                }}
                                className="p-1 text-[#7F6D67] hover:text-[#A77C78]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${PRIORITY_STYLE[tk.priority]}`}>
                              {t.taskPriority[tk.priority]}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#FCF9F6] border border-[#E8DFD6] text-[#7F6D67]">
                              {t.taskCategories[tk.category] || tk.category}
                            </span>
                            {tk.recurrence && tk.recurrence !== 'none' && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#A77C78]">
                                <Repeat className="w-3 h-3" />
                              </span>
                            )}
                          </div>

                          {subs.length > 0 && (
                            <div className="mt-2.5 space-y-1 border-t border-[#F3EDE6] pt-2">
                              <p className="text-[10px] font-mono text-[#7F6D67]">
                                {subsDone}/{subs.length} {t.tasks.subtasksLabel}
                              </p>
                              {subs.slice(0, 3).map((sub) => (
                                <label key={sub.id} className="flex items-center gap-1.5 text-[11px] text-[#55443F] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={sub.completed}
                                    onChange={() => void handleToggleSubtaskInline(tk, sub.id)}
                                    className="rounded border-[#D8C3B5] accent-[#55443F]"
                                  />
                                  <span className={sub.completed ? 'line-through text-[#9A8983]' : ''}>
                                    {sub.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}

                          <div className="mt-2.5 pt-2 border-t border-[#F3EDE6] flex items-center justify-between text-[11px]">
                            <span className={`font-mono ${overdue ? 'text-[#A77C78] font-semibold' : 'text-[#7F6D67]'}`}>
                              {formatShortDate(tk.deadline, lang)}
                            </span>
                            <div className="flex items-center gap-2 text-[#7F6D67]">
                              {tk.timeBlockStart && (
                                <span className="inline-flex items-center gap-0.5 font-mono">
                                  <Clock className="w-3 h-3" />
                                  {tk.timeBlockStart}
                                </span>
                              )}
                              {tk.reminderTime && (
                                <span className="inline-flex items-center gap-0.5 font-mono text-[#A77C78]">
                                  <Bell className="w-3 h-3" />
                                  {tk.reminderTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="dh-card overflow-hidden">
          {filteredTasks.length === 0 ? (
            <p className="p-8 text-center text-xs text-[#9A8983]">{t.tasks.emptyState}</p>
          ) : (
            <div className="divide-y divide-[#EFE7DF]">
              {filteredTasks.map((tk) => {
                const overdue = isTaskOverdue(tk.deadline, tk.status, today);
                const subs = tk.subtasks || [];
                const subsDone = subs.filter((s) => s.completed).length;
                return (
                  <div key={tk.id} className="p-4 hover:bg-[#FCF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          void updateTaskStatus(uid, tk.id, tk.status === 'completed' ? 'todo' : 'completed')
                        }
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          tk.status === 'completed'
                            ? 'bg-[#A8B5A0] border-[#A8B5A0] text-white'
                            : 'border-[#D8C3B5] bg-white'
                        }`}
                      >
                        {tk.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            tk.status === 'completed' ? 'line-through text-[#9A8983]' : 'text-[#55443F]'
                          }`}
                        >
                          {tk.title}
                        </p>
                        {tk.description && (
                          <p className="text-xs text-[#7F6D67] mt-0.5 line-clamp-1">{tk.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-semibold ${PRIORITY_STYLE[tk.priority]}`}>
                            {t.taskPriority[tk.priority]}
                          </span>
                          <span className="text-[#7F6D67]">{t.taskCategories[tk.category] || tk.category}</span>
                          <span className={`font-mono ${overdue ? 'text-[#A77C78] font-semibold' : 'text-[#7F6D67]'}`}>
                            {formatShortDate(tk.deadline, lang)}
                          </span>
                          {tk.timeBlockStart && (
                            <span className="font-mono text-[#A77C78]">
                              {tk.timeBlockStart} ({tk.estimatedMinutes || 0} {t.common.minutesShort})
                            </span>
                          )}
                          {subs.length > 0 && (
                            <span className="font-mono text-[#7F6D67]">
                              [{subsDone}/{subs.length}]
                            </span>
                          )}
                          {tk.carriedOverFrom && (
                            <span className="text-[#A77C78]">
                              {t.tasks.carriedFrom} {formatShortDate(tk.carriedOverFrom, lang)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={tk.status}
                        onChange={(e) => void updateTaskStatus(uid, tk.id, e.target.value as TaskStatus)}
                        className="dh-input px-2.5 py-1 text-xs"
                      >
                        {columns.map((st) => (
                          <option key={st} value={st}>{t.taskStatus[st]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEditModal(tk)}
                        className="p-1.5 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t.tasks.deleteConfirm)) {
                            void deleteTask(uid, tk.id);
                          }
                        }}
                        className="p-1.5 text-[#7F6D67] hover:text-[#A77C78] rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-4">
            <input
              type="month"
              value={calendarMonth}
              onChange={(e) => setCalendarMonth(e.target.value)}
              className="dh-input px-3 py-1.5 text-xs font-mono"
            />
            <span className="text-xs text-[#7F6D67]">{calendarMonth}</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr) {
                return <div key={idx} className="min-h-[84px] rounded-xl bg-[#F8F5F0]/60" />;
              }
              const dayTasks = filteredTasks.filter((tk) => tk.deadline === cell.dateStr);
              const isToday = cell.dateStr === today;
              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[96px] p-2 rounded-xl border ${
                    isToday ? 'border-[#A77C78] bg-[#F7ECEC]/60' : 'border-[#EFE7DF] bg-white'
                  }`}
                >
                  <p className={`text-[11px] font-mono font-semibold mb-1 ${isToday ? 'text-[#A77C78]' : 'text-[#7F6D67]'}`}>
                    {cell.dayNum}
                  </p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((tk) => (
                      <button
                        key={tk.id}
                        type="button"
                        onClick={() => openEditModal(tk)}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate ${
                          tk.status === 'completed'
                            ? 'bg-[#EDF1EA] text-[#5B6B52] line-through'
                            : 'bg-[#F3EDE6] text-[#55443F]'
                        }`}
                      >
                        {tk.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-[10px] text-[#7F6D67]">+{dayTasks.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carry Forward Confirmation Modal */}
      {carryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-display text-lg font-semibold text-[#55443F]">
              {t.tasks.carryForwardConfirmTitle}
            </h3>
            <p className="text-xs text-[#7F6D67]">{t.tasks.carryForwardConfirmDesc}</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 bg-[#FCF9F6] p-3 rounded-xl border border-[#EFE7DF]">
              {overdueTasks.map((tk) => (
                <div key={tk.id} className="flex items-center justify-between text-xs">
                  <span className="text-[#55443F] truncate pr-2">{tk.title}</span>
                  <span className="font-mono text-[11px] text-[#A77C78] shrink-0">
                    {formatShortDate(tk.deadline, lang)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCarryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#7F6D67] bg-[#F8F5F0] rounded-xl"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCarryForward()}
                className="dh-btn-primary px-4 py-2 text-xs font-semibold"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-5 py-4 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display text-lg font-semibold text-[#55443F]">
                {editingTask ? t.tasks.editTask : t.tasks.addTask}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.tasks.titleLabel} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.tasks.descLabel}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {TASK_CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t.taskCategories[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.priorityLabel}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>{t.taskPriority[p]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.statusLabel}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {columns.map((st) => (
                      <option key={st} value={st}>{t.taskStatus[st]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.startDateLabel}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.deadlineLabel}
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.recurrenceLabel}
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(['none', 'daily', 'weekly', 'monthly'] as TaskRecurrence[]).map((r) => (
                      <option key={r} value={r}>{t.taskRecurrence[r]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.timeBlockLabel}
                  </label>
                  <input
                    type="time"
                    value={timeBlockStart}
                    onChange={(e) => setTimeBlockStart(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.durationLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.reminderLabel}
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div className="p-3.5 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF] space-y-2.5">
                <label className="block text-xs font-semibold text-[#55443F]">
                  {t.tasks.subtasksLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder={t.tasks.addSubtaskPlaceholder}
                    className="dh-input flex-1 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#EBCFD0]/70 text-[#55443F] rounded-xl"
                  >
                    {t.common.add}
                  </button>
                </div>
                {subtasks.length > 0 && (
                  <div className="space-y-1.5">
                    {subtasks.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() =>
                              setSubtasks((prev) =>
                                prev.map((item) =>
                                  item.id === s.id ? { ...item, completed: !item.completed } : item
                                )
                              )
                            }
                            className="accent-[#55443F]"
                          />
                          <span className={s.completed ? 'line-through text-[#9A8983]' : 'text-[#55443F]'}>
                            {s.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== s.id))}
                          className="text-[#9A8983] hover:text-[#A77C78]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.tasks.notesLabel}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7F6D67] bg-[#F8F5F0] rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="dh-btn-primary px-5 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
