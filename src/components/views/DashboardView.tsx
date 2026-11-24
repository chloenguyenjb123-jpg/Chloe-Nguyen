import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  RefreshCw,
  Sparkles,
  StickyNote,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TARGET_CURRENCIES,
  type ActivityLog,
  type CurrencyCode,
  type ExchangeRateSnapshot,
  type Goal,
  type Habit,
  type NavSection,
  type Note,
  type Task,
  type Transaction,
  type UserProfile,
} from '../../types';
import {
  addDaysToDateStr,
  calculateHabitStreak,
  formatDateTime,
  formatLongDate,
  formatRateVND,
  formatShortDate,
  formatVND,
  getCurrentMonthVN,
  getGreeting,
  getTodayVN,
  getWeekRangeVN,
  isTaskOverdue,
} from '../../utils/date';
import {
  createNote,
  toggleHabitDate,
  updateTaskStatus,
} from '../../services/firestoreService';
import { useI18n } from '../../i18n/LanguageContext';

const CHART_PALETTE = ['#55443F', '#A77C78', '#A8B5A0', '#D8C3B5', '#C89B96', '#7F6D67', '#8C9B84'];

interface DashboardViewProps {
  uid: string;
  userName: string;
  profile: UserProfile | null;
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  activities: ActivityLog[];
  latestRate: ExchangeRateSnapshot | null;
  ratesLoading: boolean;
  ratesError: string | null;
  onRefreshRates: () => void;
  onOpenQuickAdd: (mode: 'task' | 'transaction' | 'note') => void;
  onNavigate: (section: NavSection) => void;
  onNotify: (msg: string) => void;
}

export function DashboardView({
  uid,
  userName,
  profile,
  tasks,
  transactions,
  notes,
  goals,
  habits,
  activities,
  latestRate,
  ratesLoading,
  ratesError,
  onRefreshRates,
  onOpenQuickAdd,
  onNavigate,
  onNotify,
}: DashboardViewProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();
  const currentMonth = getCurrentMonthVN();
  const weekRange = getWeekRangeVN(today);

  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const todayTasks = useMemo(
    () => tasks.filter((tk) => tk.deadline === today || (tk.startDate <= today && tk.deadline >= today)),
    [tasks, today]
  );
  const completedTasksCount = useMemo(
    () => tasks.filter((tk) => tk.status === 'completed').length,
    [tasks]
  );
  const pendingTasksCount = useMemo(
    () => tasks.filter((tk) => tk.status === 'todo' || tk.status === 'in_progress').length,
    [tasks]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((tk) => isTaskOverdue(tk.deadline, tk.status, today)),
    [tasks, today]
  );
  const todayCompletedCount = useMemo(
    () => todayTasks.filter((tk) => tk.status === 'completed').length,
    [todayTasks]
  );
  const todayProgressPct =
    todayTasks.length > 0 ? Math.round((todayCompletedCount / todayTasks.length) * 100) : 0;

  const todayIncome = useMemo(
    () =>
      transactions
        .filter((tx) => tx.date === today && tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, today]
  );
  const todayExpense = useMemo(
    () =>
      transactions
        .filter((tx) => tx.date === today && tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, today]
  );

  const monthlyBudget = profile?.monthlyBudget ?? 15_000_000;
  const threshold = profile?.budgetAlertThreshold ?? 80;
  const monthExpense = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth))
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions, currentMonth]
  );
  const budgetPct = monthlyBudget > 0 ? Math.round((monthExpense / monthlyBudget) * 100) : 0;

  // Weekly 7-day productivity data
  const weeklyChartData = useMemo(() => {
    const days: Array<{ label: string; completed: number; total: number; rate: number }> = [];
    for (let i = -6; i <= 0; i++) {
      const dateStr = addDaysToDateStr(today, i);
      const dayTasks = tasks.filter((tk) => tk.deadline === dateStr);
      const done = dayTasks.filter((tk) => tk.status === 'completed').length;
      const total = dayTasks.length;
      days.push({
        label: dateStr.slice(5).split('-').reverse().join('/'),
        completed: done,
        total,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      });
    }
    return days;
  }, [tasks, today]);

  // Monthly spending trend (last 14 days in current month or rolling 14 days)
  const spendingTrendData = useMemo(() => {
    const pts: Array<{ label: string; amount: number }> = [];
    for (let i = -13; i <= 0; i++) {
      const dateStr = addDaysToDateStr(today, i);
      const amount = transactions
        .filter((tx) => tx.type === 'expense' && tx.date === dateStr)
        .reduce((sum, tx) => sum + tx.amount, 0);
      pts.push({
        label: dateStr.slice(8),
        amount,
      });
    }
    return pts;
  }, [transactions, today]);

  // Expense breakdown by category for current month
  const expensePieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.date.startsWith(currentMonth)) {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        name: t.transactionCategories[cat as keyof typeof t.transactionCategories] || cat,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, currentMonth, t.transactionCategories]);

  // Income vs Expenses last 6 months
  const incomeVsExpenseData = useMemo(() => {
    const months: Array<{ month: string; income: number; expense: number }> = [];
    const [curY, curM] = currentMonth.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(Date.UTC(curY, curM - 1 - i, 1));
      const key = dt.toISOString().slice(0, 7);
      const income = transactions
        .filter((tx) => tx.type === 'income' && tx.date.startsWith(key))
        .reduce((s, tx) => s + tx.amount, 0);
      const expense = transactions
        .filter((tx) => tx.type === 'expense' && tx.date.startsWith(key))
        .reduce((s, tx) => s + tx.amount, 0);
      months.push({
        month: key.slice(5) + '/' + key.slice(2, 4),
        income,
        expense,
      });
    }
    return months;
  }, [transactions, currentMonth]);

  const scheduledToday = useMemo(
    () =>
      [...todayTasks]
        .filter((tk) => tk.status !== 'completed')
        .sort((a, b) => (a.timeBlockStart || '99:99').localeCompare(b.timeBlockStart || '99:99'))
        .slice(0, 6),
    [todayTasks]
  );

  const upcomingDeadlines = useMemo(
    () =>
      tasks
        .filter((tk) => tk.status !== 'completed' && tk.deadline >= today)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 5),
    [tasks, today]
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
  const visibleNotes = useMemo(
    () => notes.filter((n) => !n.archived).slice(0, 4),
    [notes]
  );

  const highlightedCurrencies: CurrencyCode[] = useMemo(() => {
    const pref = profile?.preferredCurrency;
    const base: CurrencyCode[] = ['USD', 'EUR', 'JPY', 'SGD'];
    if (pref && TARGET_CURRENCIES.includes(pref) && !base.includes(pref)) {
      return [pref, 'USD', 'EUR', 'JPY'];
    }
    return base;
  }, [profile?.preferredCurrency]);

  const handleSaveQuickNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim() && !quickNoteTitle.trim()) return;
    setSavingNote(true);
    try {
      const title = quickNoteTitle.trim() || quickNoteText.trim().slice(0, 50);
      await createNote(uid, {
        title,
        content: quickNoteText.trim(),
        category: 'Personal',
        tags: [],
        pinned: false,
      });
      setQuickNoteTitle('');
      setQuickNoteText('');
      onNotify(t.dashboard.quickNoteSaved);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="dh-card p-6 bg-gradient-to-r from-[#FCF9F6] via-[#F7ECEC]/70 to-[#F3EDE6]/70">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#A77C78]">
              {formatLongDate(today, lang)}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#55443F] mt-1">
              {getGreeting(userName, lang)}
            </h2>
            <p className="text-xs text-[#7F6D67] mt-1.5">
              {lang === 'en'
                ? `Week ${formatShortDate(weekRange.start, lang)} – ${formatShortDate(weekRange.end, lang)} · ${completedTasksCount}/${tasks.length} tasks completed`
                : `Tuần ${formatShortDate(weekRange.start, lang)} – ${formatShortDate(weekRange.end, lang)} · Hoàn thành ${completedTasksCount}/${tasks.length} công việc`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenQuickAdd('task')}
              className="dh-btn-primary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.common.quickAddTask}
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('transaction')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#EBCFD0]/60 text-[#55443F] border border-[#EBCFD0] hover:bg-[#EBCFD0] inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.common.quickAddExpense}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('ai-assistant')}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#55443F] border border-[#E8DFD6] hover:bg-[#F8F5F0] inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A77C78]" />
              {t.nav.aiAssistant}
            </button>
          </div>
        </div>
      </section>

      {/* Primary KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="dh-card dh-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7F6D67]">
            <span>{t.dashboard.todayProgress}</span>
            <CheckCircle2 className="w-4 h-4 text-[#5B6B52]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-[#55443F]">{todayProgressPct}%</span>
            <span className="text-xs text-[#7F6D67]">
              ({todayCompletedCount}/{todayTasks.length})
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#A8B5A0] transition-all duration-300"
              style={{ width: `${todayProgressPct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#7F6D67]">
            <span>
              {t.dashboard.pendingCount}: <strong className="text-[#55443F]">{pendingTasksCount}</strong>
            </span>
            <span className={overdueTasks.length > 0 ? 'text-[#A77C78] font-semibold' : ''}>
              {t.dashboard.overdueCount}: {overdueTasks.length}
            </span>
          </div>
        </div>

        <div className="dh-card dh-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7F6D67]">
            <span>{t.dashboard.todayIncome}</span>
            <TrendingUp className="w-4 h-4 text-[#5B6B52]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#5B6B52]">
            {formatVND(todayIncome, lang)}
          </p>
          <p className="mt-3 text-[11px] text-[#7F6D67]">
            {lang === 'en' ? 'Recorded for' : 'Ghi nhận trong ngày'} {formatShortDate(today, lang)}
          </p>
        </div>

        <div className="dh-card dh-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7F6D67]">
            <span>{t.dashboard.todayExpense}</span>
            <TrendingDown className="w-4 h-4 text-[#A77C78]" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#A77C78]">
            {formatVND(todayExpense, lang)}
          </p>
          <p className="mt-3 text-[11px] text-[#7F6D67]">
            {lang === 'en' ? 'Month total:' : 'Tổng tháng:'}{' '}
            <span className="font-mono font-medium text-[#55443F]">{formatVND(monthExpense, lang)}</span>
          </p>
        </div>

        <div className="dh-card dh-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7F6D67]">
            <span>{t.dashboard.monthlyBudgetProgress}</span>
            {budgetPct >= threshold && <AlertTriangle className="w-4 h-4 text-[#A77C78]" />}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-[#55443F]">{budgetPct}%</span>
            <span className="text-[11px] font-medium text-[#A77C78]">
              {budgetPct >= 100
                ? t.dashboard.budgetExceeded
                : budgetPct >= threshold
                ? t.dashboard.budgetWarning
                : t.dashboard.budgetHealthy}
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                budgetPct >= 100 ? 'bg-[#A77C78]' : budgetPct >= threshold ? 'bg-[#D8C3B5]' : 'bg-[#A8B5A0]'
              }`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-[#7F6D67] font-mono">
            {formatVND(monthExpense, lang)} / {formatVND(monthlyBudget, lang)}
          </p>
        </div>
      </section>

      {/* Interactive Charts Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-[#55443F]">
              {t.dashboard.weeklyProductivity}
            </h3>
            <span className="text-[11px] text-[#7F6D67]">{lang === 'en' ? 'Completion %' : 'Tỷ lệ hoàn thành'}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="dhProdFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A77C78" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A77C78" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE7DF" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7F6D67' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7F6D67' }} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                  formatter={(v) => `${Number(v ?? 0)}%`}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#A77C78"
                  strokeWidth={2}
                  fill="url(#dhProdFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-[#55443F]">
              {t.dashboard.monthlySpendingTrend}
            </h3>
            <span className="text-[11px] text-[#7F6D67]">{lang === 'en' ? 'Last 14 days' : '14 ngày gần đây'}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrendData}>
                <defs>
                  <linearGradient id="dhSpendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#55443F" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#55443F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE7DF" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7F6D67' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7F6D67' }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                  formatter={(v) => formatVND(Number(v ?? 0), lang)}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#55443F"
                  strokeWidth={2}
                  fill="url(#dhSpendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Interactive Charts Row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dh-card p-5">
          <h3 className="font-display text-base font-semibold text-[#55443F] mb-4">
            {t.dashboard.incomeVsExpense}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE7DF" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7F6D67' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7F6D67' }} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                  formatter={(v) => formatVND(Number(v ?? 0), lang)}
                />
                <Bar dataKey="income" name={t.expenses.income} fill="#A8B5A0" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name={t.expenses.expense} fill="#A77C78" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dh-card p-5">
          <h3 className="font-display text-base font-semibold text-[#55443F] mb-4">
            {t.dashboard.expenseBreakdown}
          </h3>
          {expensePieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#9A8983]">
              {t.dashboard.noTransactions}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {expensePieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                      formatter={(v) => formatVND(Number(v ?? 0), lang)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {expensePieData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                      />
                      <span className="text-[#55443F] truncate">{entry.name}</span>
                    </div>
                    <span className="font-mono font-medium text-[#7F6D67] shrink-0">
                      {formatVND(entry.value, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Schedule, Goals & Habits, Exchange Rates */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Time-blocks & Upcoming Deadlines */}
        <div className="dh-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#A77C78]" />
                {t.dashboard.todaySchedule}
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-xs font-medium text-[#A77C78] hover:text-[#55443F] inline-flex items-center gap-1"
              >
                {t.common.viewAll}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {scheduledToday.length === 0 ? (
              <p className="text-xs text-[#9A8983] py-4">{t.dashboard.noTasksToday}</p>
            ) : (
              <div className="space-y-2">
                {scheduledToday.map((tk) => (
                  <div
                    key={tk.id}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF]"
                  >
                    <button
                      type="button"
                      onClick={() => updateTaskStatus(uid, tk.id, 'completed')}
                      className="mt-0.5 w-4 h-4 rounded border border-[#A77C78] hover:bg-[#EBCFD0] shrink-0"
                      title={t.taskStatus.completed}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#55443F] truncate">{tk.title}</p>
                      <p className="text-[11px] text-[#7F6D67] flex items-center gap-2 mt-0.5">
                        {tk.timeBlockStart && (
                          <span className="font-mono text-[#A77C78]">{tk.timeBlockStart}</span>
                        )}
                        {tk.estimatedMinutes ? (
                          <span>
                            {tk.estimatedMinutes} {t.common.minutesShort}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-xs font-semibold text-[#7F6D67] uppercase tracking-wider mt-5 mb-2">
              {t.dashboard.upcomingDeadlines}
            </h4>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[#9A8983]">{t.dashboard.noDeadlines}</p>
            ) : (
              <div className="space-y-1.5">
                {upcomingDeadlines.map((tk) => (
                  <div key={tk.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-[#55443F] truncate pr-2">{tk.title}</span>
                    <span className="font-mono text-[11px] text-[#7F6D67] shrink-0">
                      {formatShortDate(tk.deadline, lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Goals & Habits Check-in */}
        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#5B6B52]" />
              {t.dashboard.dailyGoalsHabits}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('goals-habits')}
              className="text-xs font-medium text-[#A77C78] hover:text-[#55443F] inline-flex items-center gap-1"
            >
              {t.common.viewAll}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {habits.length === 0 && goals.length === 0 ? (
            <p className="text-xs text-[#9A8983] py-6">{t.dashboard.noHabits}</p>
          ) : (
            <div className="space-y-4">
              {habits.slice(0, 4).map((habit) => {
                const doneToday = (habit.completedDates || []).includes(today);
                const streak = calculateHabitStreak(habit.completedDates || [], today);
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHabitDate(uid, habit, today)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                        doneToday
                          ? 'bg-[#A8B5A0] text-white'
                          : 'bg-white border border-[#D8C3B5] text-[#55443F] hover:bg-[#F7ECEC]'
                      }`}
                    >
                      {doneToday ? '✓' : '+'}
                    </button>
                    <span className="text-xs font-medium text-[#55443F] flex-1 truncate">{habit.title}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A77C78] shrink-0">
                      <Flame className="w-3 h-3" />
                      {streak}
                    </span>
                  </div>
                );
              })}

              {goals.slice(0, 2).map((g) => {
                const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
                return (
                  <div key={g.id} className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#55443F] truncate">{g.title}</span>
                      <span className="font-mono text-[#7F6D67]">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
                      <div className="h-full rounded-full bg-[#A77C78]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Exchange Rate Highlights */}
        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-[#55443F]">
              {t.dashboard.exchangeHighlights}
            </h3>
            <button
              type="button"
              onClick={onRefreshRates}
              disabled={ratesLoading}
              className="p-1.5 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
              title={t.common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {ratesError && !latestRate ? (
            <p className="text-xs text-[#A77C78] py-4">{t.exchangeRates.unavailableBanner}</p>
          ) : !latestRate ? (
            <p className="text-xs text-[#9A8983] py-4">{t.common.loading}</p>
          ) : (
            <div className="space-y-2.5">
              {highlightedCurrencies.map((code) => {
                const val = latestRate.rates[code];
                const prev = latestRate.previousRates?.[code];
                const pct =
                  typeof val === 'number' && typeof prev === 'number' && prev > 0
                    ? ((val - prev) / prev) * 100
                    : null;
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF]"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#55443F]">{code} / VND</p>
                      <p className="text-[11px] text-[#7F6D67]">
                        {formatShortDate(latestRate.date, lang)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-semibold text-[#55443F]">
                        {typeof val === 'number' ? formatRateVND(val, lang) : '—'}
                      </p>
                      {pct !== null && (
                        <p
                          className={`font-mono text-[11px] ${
                            pct >= 0 ? 'text-[#5B6B52]' : 'text-[#A77C78]'
                          }`}
                        >
                          {pct >= 0 ? '+' : ''}
                          {pct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => onNavigate('exchange-rates')}
                className="w-full mt-1 py-2 text-xs font-semibold text-[#A77C78] hover:text-[#55443F] inline-flex items-center justify-center gap-1"
              >
                {t.common.viewAll}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recent Transactions, Quick Notes, Activity Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-[#55443F]">
              {t.dashboard.recentTransactions}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-medium text-[#A77C78] hover:text-[#55443F]"
            >
              {t.common.viewAll}
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-xs text-[#9A8983] py-4">{t.dashboard.noTransactions}</p>
          ) : (
            <div className="space-y-2.5">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[#F3EDE6] last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-[#55443F] truncate">{tx.description}</p>
                    <p className="text-[11px] text-[#7F6D67]">
                      {formatShortDate(tx.date, lang)} · {t.transactionCategories[tx.category]}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-semibold shrink-0 ${
                      tx.type === 'income' ? 'text-[#5B6B52]' : 'text-[#A77C78]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatVND(tx.amount, lang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dh-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-[#A77C78]" />
              {t.dashboard.quickNotes}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="text-xs font-medium text-[#A77C78] hover:text-[#55443F]"
            >
              {t.common.viewAll}
            </button>
          </div>

          <form onSubmit={handleSaveQuickNote} className="space-y-2 mb-3">
            <input
              type="text"
              value={quickNoteTitle}
              onChange={(e) => setQuickNoteTitle(e.target.value)}
              placeholder={t.notes.titlePlaceholder}
              className="dh-input w-full px-3 py-1.5 text-xs"
            />
            <textarea
              value={quickNoteText}
              onChange={(e) => setQuickNoteText(e.target.value)}
              rows={2}
              placeholder={t.dashboard.quickNotePlaceholder}
              className="dh-input w-full px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              disabled={savingNote || (!quickNoteText.trim() && !quickNoteTitle.trim())}
              className="dh-btn-accent px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {savingNote ? t.common.saving : t.dashboard.saveQuickNote}
            </button>
          </form>

          {visibleNotes.length === 0 ? (
            <p className="text-xs text-[#9A8983]">{t.dashboard.noNotes}</p>
          ) : (
            <div className="space-y-1.5">
              {visibleNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNavigate('notes')}
                  className="p-2 rounded-lg bg-[#FCF9F6] hover:bg-[#F7ECEC] cursor-pointer transition-colors"
                >
                  <p className="text-xs font-semibold text-[#55443F] truncate">{n.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dh-card p-5">
          <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#7F6D67]" />
            {t.dashboard.activityTimeline}
          </h3>
          {activities.length === 0 ? (
            <p className="text-xs text-[#9A8983] py-4">{t.dashboard.noActivities}</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {activities.slice(0, 8).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#A77C78] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#55443F] truncate">{act.title}</p>
                    <p className="text-[11px] text-[#7F6D67]">
                      {formatDateTime(act.timestampIso, lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
