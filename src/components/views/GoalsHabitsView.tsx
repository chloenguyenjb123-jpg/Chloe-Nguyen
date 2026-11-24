import { useMemo, useState, type FormEvent } from 'react';
import {
  Bell,
  CheckCircle2,
  Flame,
  Pencil,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  GOAL_CATEGORY_KEYS,
  type Goal,
  type GoalPeriod,
  type Habit,
  type HabitFrequency,
} from '../../types';
import {
  createGoal,
  createHabit,
  deleteGoal,
  deleteHabit,
  toggleHabitDate,
  updateGoal,
  updateHabit,
} from '../../services/firestoreService';
import {
  addDaysToDateStr,
  calculateHabitStreak,
  formatShortDate,
  getTodayVN,
} from '../../utils/date';
import { useI18n } from '../../i18n/LanguageContext';

interface GoalsHabitsViewProps {
  uid: string;
  goals: Goal[];
  habits: Habit[];
  onNotify: (msg: string) => void;
}

export function GoalsHabitsView({ uid, goals, habits, onNotify }: GoalsHabitsViewProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();
  const [activeTab, setActiveTab] = useState<'habits' | 'goals'>('habits');

  // Goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [gTitle, setGTitle] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gCategory, setGCategory] = useState<string>(GOAL_CATEGORY_KEYS[0]);
  const [gPeriod, setGPeriod] = useState<GoalPeriod>('monthly');
  const [gTarget, setGTarget] = useState('10');
  const [gCurrent, setGCurrent] = useState('0');
  const [gUnit, setGUnit] = useState('%');
  const [gTargetDate, setGTargetDate] = useState(addDaysToDateStr(today, 30));
  const [savingGoal, setSavingGoal] = useState(false);

  // Habit modal
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [hTitle, setHTitle] = useState('');
  const [hCategory, setHCategory] = useState<string>(GOAL_CATEGORY_KEYS[2]);
  const [hFrequency, setHFrequency] = useState<HabitFrequency>('daily');
  const [hReminder, setHReminder] = useState('07:30');
  const [savingHabit, setSavingHabit] = useState(false);

  const last14Days = useMemo(() => {
    const arr: string[] = [];
    for (let i = -13; i <= 0; i++) {
      arr.push(addDaysToDateStr(today, i));
    }
    return arr;
  }, [today]);

  const goalChartData = useMemo(
    () =>
      goals.slice(0, 8).map((g) => ({
        name: g.title.length > 16 ? g.title.slice(0, 15) + '…' : g.title,
        progress: Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100)),
      })),
    [goals]
  );

  const openGoalCreate = () => {
    setEditingGoal(null);
    setGTitle('');
    setGDesc('');
    setGCategory(GOAL_CATEGORY_KEYS[0]);
    setGPeriod('monthly');
    setGTarget('10');
    setGCurrent('0');
    setGUnit('%');
    setGTargetDate(addDaysToDateStr(today, 30));
    setGoalModalOpen(true);
  };

  const openGoalEdit = (g: Goal) => {
    setEditingGoal(g);
    setGTitle(g.title);
    setGDesc(g.description);
    setGCategory(g.category);
    setGPeriod(g.period);
    setGTarget(String(g.targetValue));
    setGCurrent(String(g.currentValue));
    setGUnit(g.unit);
    setGTargetDate(g.targetDate);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!gTitle.trim()) return;
    setSavingGoal(true);
    try {
      const payload = {
        title: gTitle,
        description: gDesc,
        category: gCategory,
        period: gPeriod,
        targetValue: Number(gTarget) || 1,
        currentValue: Number(gCurrent) || 0,
        unit: gUnit || '%',
        startDate: editingGoal?.startDate || today,
        targetDate: gTargetDate,
      };
      if (editingGoal) {
        await updateGoal(uid, editingGoal.id, payload);
        onNotify(lang === 'en' ? 'Goal updated.' : 'Đã cập nhật mục tiêu.');
      } else {
        await createGoal(uid, payload);
        onNotify(lang === 'en' ? 'New goal created.' : 'Đã tạo mục tiêu mới.');
      }
      setGoalModalOpen(false);
    } finally {
      setSavingGoal(false);
    }
  };

  const openHabitCreate = () => {
    setEditingHabit(null);
    setHTitle('');
    setHCategory(GOAL_CATEGORY_KEYS[2]);
    setHFrequency('daily');
    setHReminder('07:30');
    setHabitModalOpen(true);
  };

  const openHabitEdit = (h: Habit) => {
    setEditingHabit(h);
    setHTitle(h.title);
    setHCategory(h.category);
    setHFrequency(h.frequency);
    setHReminder(h.reminderTime || '');
    setHabitModalOpen(true);
  };

  const handleSaveHabit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hTitle.trim()) return;
    setSavingHabit(true);
    try {
      const payload = {
        title: hTitle,
        category: hCategory,
        frequency: hFrequency,
        reminderTime: hReminder,
      };
      if (editingHabit) {
        await updateHabit(uid, editingHabit.id, payload);
        onNotify(lang === 'en' ? 'Habit updated.' : 'Đã cập nhật thói quen.');
      } else {
        await createHabit(uid, payload);
        onNotify(lang === 'en' ? 'New habit created.' : 'Đã tạo thói quen mới.');
      }
      setHabitModalOpen(false);
    } finally {
      setSavingHabit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.goalsHabits.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.goalsHabits.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openHabitCreate}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#EBCFD0]/70 text-[#55443F] border border-[#EBCFD0] hover:bg-[#EBCFD0] inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.goalsHabits.addHabit}
          </button>
          <button
            type="button"
            onClick={openGoalCreate}
            className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t.goalsHabits.addGoal}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex p-1 bg-[#F3EDE6] rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('habits')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'habits' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
          }`}
        >
          {t.goalsHabits.habitsTab} ({habits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'goals' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
          }`}
        >
          {t.goalsHabits.goalsTab} ({goals.length})
        </button>
      </div>

      {/* HABITS TAB */}
      {activeTab === 'habits' && (
        <div className="space-y-4">
          {habits.length === 0 ? (
            <div className="dh-card p-10 text-center text-xs text-[#9A8983]">
              {t.goalsHabits.emptyHabits}
            </div>
          ) : (
            habits.map((habit) => {
              const completedSet = new Set(habit.completedDates || []);
              const doneToday = completedSet.has(today);
              const streak = calculateHabitStreak(habit.completedDates || [], today);
              return (
                <div key={habit.id} className="dh-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-display text-base font-semibold text-[#55443F]">{habit.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7ECEC] text-[#A77C78] font-mono text-xs font-semibold">
                          <Flame className="w-3.5 h-3.5" />
                          {streak} {t.goalsHabits.streakDays}
                        </span>
                      </div>
                      <p className="text-xs text-[#7F6D67] mt-1 flex items-center gap-3">
                        <span>{t.goalCategories[habit.category] || habit.category}</span>
                        <span>· {t.habitFrequencies[habit.frequency]}</span>
                        {habit.reminderTime && (
                          <span className="inline-flex items-center gap-1 font-mono text-[#A77C78]">
                            <Bell className="w-3 h-3" />
                            {habit.reminderTime}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleHabitDate(uid, habit, today)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                          doneToday
                            ? 'bg-[#A8B5A0] text-white'
                            : 'bg-[#55443F] text-[#F8F5F0] hover:bg-[#433531]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {doneToday ? t.goalsHabits.completedToday : t.goalsHabits.markTodayDone}
                      </button>
                      <button
                        type="button"
                        onClick={() => openHabitEdit(habit)}
                        className="p-2 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteHabit(uid, habit.id)}
                        className="p-2 text-[#7F6D67] hover:text-[#A77C78] rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 14-day completion grid */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#7F6D67] mb-2">
                      {t.goalsHabits.completionGrid}
                    </p>
                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                      {last14Days.map((d) => {
                        const checked = completedSet.has(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => void toggleHabitDate(uid, habit, d)}
                            title={formatShortDate(d, lang)}
                            className={`h-9 rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center transition-colors ${
                              checked
                                ? 'bg-[#A8B5A0] border-[#5B6B52] text-white'
                                : d === today
                                ? 'bg-[#F7ECEC] border-[#A77C78] text-[#55443F]'
                                : 'bg-[#FCF9F6] border-[#EFE7DF] text-[#9A8983] hover:border-[#D8C3B5]'
                            }`}
                          >
                            <span>{d.slice(8)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {goals.length > 0 && (
            <div className="dh-card p-5">
              <h3 className="font-display text-base font-semibold text-[#55443F] mb-4">
                {t.goalsHabits.progressChart}
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFE7DF" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7F6D67' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7F6D67' }} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                      formatter={(v) => `${Number(v ?? 0)}%`}
                    />
                    <Bar dataKey="progress" fill="#A77C78" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="dh-card p-10 text-center text-xs text-[#9A8983]">
              {t.goalsHabits.emptyGoals}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
                return (
                  <div key={g.id} className="dh-card p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F7ECEC] text-[#A77C78]">
                          <Target className="w-3 h-3" />
                          {t.goalPeriods[g.period]}
                        </span>
                        <h3 className="font-display text-base font-semibold text-[#55443F] mt-2">{g.title}</h3>
                        {g.description && <p className="text-xs text-[#7F6D67] mt-1">{g.description}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openGoalEdit(g)}
                          className="p-1.5 text-[#7F6D67] hover:text-[#55443F]"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteGoal(uid, g.id)}
                          className="p-1.5 text-[#7F6D67] hover:text-[#A77C78]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-mono text-[#55443F] font-semibold">
                          {g.currentValue} / {g.targetValue} {g.unit}
                        </span>
                        <span className="font-mono text-[#A77C78] font-semibold">{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
                        <div className="h-full bg-[#A8B5A0] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#7F6D67]">
                        <span>{t.goalCategories[g.category] || g.category}</span>
                        <span className="font-mono">{formatShortDate(g.targetDate, lang)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Goal Modal */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#55443F]">
                {editingGoal ? t.goalsHabits.editGoal : t.goalsHabits.addGoal}
              </h3>
              <button type="button" onClick={() => setGoalModalOpen(false)} className="p-1 text-[#7F6D67]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.goalsHabits.goalTitle} *
                </label>
                <input
                  type="text"
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.goalsHabits.goalDesc}
                </label>
                <textarea
                  value={gDesc}
                  onChange={(e) => setGDesc(e.target.value)}
                  rows={2}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.categoryLabel}
                  </label>
                  <select
                    value={gCategory}
                    onChange={(e) => setGCategory(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {GOAL_CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t.goalCategories[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.goalsHabits.goalPeriod}
                  </label>
                  <select
                    value={gPeriod}
                    onChange={(e) => setGPeriod(e.target.value as GoalPeriod)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(['weekly', 'monthly', 'quarterly', 'yearly'] as GoalPeriod[]).map((p) => (
                      <option key={p} value={p}>{t.goalPeriods[p]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.goalsHabits.goalCurrent}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={gCurrent}
                    onChange={(e) => setGCurrent(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.goalsHabits.goalTarget}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={gTarget}
                    onChange={(e) => setGTarget(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.goalsHabits.goalUnit}
                  </label>
                  <input
                    type="text"
                    value={gUnit}
                    onChange={(e) => setGUnit(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.goalsHabits.goalTargetDate}
                </label>
                <input
                  type="date"
                  value={gTargetDate}
                  onChange={(e) => setGTargetDate(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7F6D67] bg-[#F8F5F0] rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="dh-btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {savingGoal ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Habit Modal */}
      {habitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#55443F]">
                {editingHabit ? t.goalsHabits.editHabit : t.goalsHabits.addHabit}
              </h3>
              <button type="button" onClick={() => setHabitModalOpen(false)} className="p-1 text-[#7F6D67]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveHabit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.goalsHabits.habitTitle} *
                </label>
                <input
                  type="text"
                  value={hTitle}
                  onChange={(e) => setHTitle(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.categoryLabel}
                  </label>
                  <select
                    value={hCategory}
                    onChange={(e) => setHCategory(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {GOAL_CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>{t.goalCategories[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.goalsHabits.habitFrequency}
                  </label>
                  <select
                    value={hFrequency}
                    onChange={(e) => setHFrequency(e.target.value as HabitFrequency)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    <option value="daily">{t.habitFrequencies.daily}</option>
                    <option value="weekly">{t.habitFrequencies.weekly}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.goalsHabits.habitReminder}
                </label>
                <input
                  type="time"
                  value={hReminder}
                  onChange={(e) => setHReminder(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHabitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7F6D67] bg-[#F8F5F0] rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingHabit}
                  className="dh-btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {savingHabit ? t.common.saving : t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
