import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  List,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
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
import type {
  NavSection,
  PaymentMethod,
  Transaction,
  TransactionCategory,
  TransactionRecurrence,
  TransactionType,
  UserProfile,
} from '../../types';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '../../services/firestoreService';
import {
  addDaysToDateStr,
  addMonthsToDateStr,
  formatShortDate,
  formatVND,
  getCurrentMonthVN,
  getTodayVN,
} from '../../utils/date';
import { useI18n } from '../../i18n/LanguageContext';

const PIE_COLORS = ['#55443F', '#A77C78', '#A8B5A0', '#D8C3B5', '#C89B96', '#7F6D67', '#8C9B84'];

interface ExpensesViewProps {
  uid: string;
  profile: UserProfile | null;
  transactions: Transaction[];
  onNavigate: (section: NavSection) => void;
  onNotify: (msg: string) => void;
}

export function ExpensesView({ uid, profile, transactions, onNavigate, onNotify }: ExpensesViewProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthVN());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('e_wallet');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<TransactionRecurrence>('monthly');
  const [saving, setSaving] = useState(false);

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const totalIncome = useMemo(
    () => monthTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0),
    [monthTransactions]
  );
  const totalExpense = useMemo(
    () => monthTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0),
    [monthTransactions]
  );
  const netCashFlow = totalIncome - totalExpense;
  const monthlyBudget = profile?.monthlyBudget ?? 15_000_000;
  const threshold = profile?.budgetAlertThreshold ?? 80;
  const savingsGoal = profile?.savingsGoalMonthly ?? 5_000_000;
  const remainingBudget = Math.max(0, monthlyBudget - totalExpense);
  const budgetUsedPct = monthlyBudget > 0 ? Math.round((totalExpense / monthlyBudget) * 100) : 0;
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;
  const savingsGoalPct = savingsGoal > 0 ? Math.max(0, Math.min(100, Math.round((netCashFlow / savingsGoal) * 100))) : 0;

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return monthTransactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      if (filterMethod !== 'all' && tx.paymentMethod !== filterMethod) return false;
      if (q) {
        const hay = `${tx.description} ${tx.note}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTransactions, filterType, filterCategory, filterMethod, searchTerm]);

  const categoryChartData = useMemo(() => {
    const map = new Map<TransactionCategory, number>();
    for (const tx of monthTransactions) {
      if (tx.type === 'expense') {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        name: t.transactionCategories[cat],
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions, t.transactionCategories]);

  const monthlyComparisonData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const items: Array<{ month: string; income: number; expense: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1));
      const key = dt.toISOString().slice(0, 7);
      items.push({
        month: key.slice(5) + '/' + key.slice(2, 4),
        income: transactions
          .filter((tx) => tx.type === 'income' && tx.date.startsWith(key))
          .reduce((s, tx) => s + tx.amount, 0),
        expense: transactions
          .filter((tx) => tx.type === 'expense' && tx.date.startsWith(key))
          .reduce((s, tx) => s + tx.amount, 0),
      });
    }
    return items;
  }, [transactions, selectedMonth]);

  const calendarDays = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const offset = (first.getUTCDay() + 6) % 7;
    const cells: Array<{ dateStr: string | null; day: number | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ dateStr: null, day: null });
    for (let d = 1; d <= lastDay; d++) {
      cells.push({ dateStr: `${selectedMonth}-${String(d).padStart(2, '0')}`, day: d });
    }
    return cells;
  }, [selectedMonth]);

  const openCreateModal = () => {
    setEditingTx(null);
    setType('expense');
    setAmount('');
    setDate(today);
    setCategory('food');
    setPaymentMethod('e_wallet');
    setDescription('');
    setNote('');
    setIsRecurring(false);
    setRecurrenceInterval('monthly');
    setModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setType(tx.type);
    setAmount(String(tx.amount));
    setDate(tx.date);
    setCategory(tx.category);
    setPaymentMethod(tx.paymentMethod);
    setDescription(tx.description);
    setNote(tx.note);
    setIsRecurring(Boolean(tx.isRecurring));
    setRecurrenceInterval(tx.recurrenceInterval ?? 'monthly');
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0 || !description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount: numeric,
        date,
        category,
        paymentMethod,
        description,
        note,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : 'none',
      };
      if (editingTx) {
        await updateTransaction(uid, editingTx.id, payload);
        onNotify(lang === 'en' ? 'Transaction updated.' : 'Đã cập nhật giao dịch.');
      } else {
        await createTransaction(uid, payload);
        onNotify(lang === 'en' ? 'Transaction recorded.' : 'Đã ghi nhận giao dịch mới.');
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerRecurring = async (tx: Transaction) => {
    const nextDate =
      tx.recurrenceInterval === 'weekly'
        ? addDaysToDateStr(tx.date, 7)
        : addMonthsToDateStr(tx.date, 1);
    const confirmMsg = `${t.expenses.recurringConfirmDesc} (${formatShortDate(nextDate, lang)}: ${formatVND(tx.amount, lang)})`;
    if (!window.confirm(confirmMsg)) return;
    await createTransaction(uid, {
      type: tx.type,
      amount: tx.amount,
      date: nextDate,
      category: tx.category,
      paymentMethod: tx.paymentMethod,
      description: tx.description,
      note: tx.note,
      isRecurring: true,
      recurrenceInterval: tx.recurrenceInterval ?? 'monthly',
    });
    onNotify(lang === 'en' ? 'Next recurring entry recorded.' : 'Đã ghi nhận giao dịch định kỳ tiếp theo.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.expenses.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.expenses.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="dh-input px-3 py-2 text-xs font-mono"
          />
          <button
            type="button"
            onClick={openCreateModal}
            className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t.expenses.addTransaction}
          </button>
        </div>
      </div>

      {/* Budget Alert Banner */}
      {budgetUsedPct >= threshold && (
        <div className="p-4 rounded-2xl bg-[#F7ECEC] border border-[#EBCFD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-[#55443F]">
            <AlertTriangle className="w-4 h-4 text-[#A77C78] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t.expenses.budgetAlertTitle}: {budgetUsedPct}%</p>
              <p className="text-[#7F6D67] mt-0.5">
                {formatVND(totalExpense, lang)} / {formatVND(monthlyBudget, lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E8DFD6] rounded-xl text-[#55443F]"
          >
            {t.nav.settings}
          </button>
        </div>
      )}

      {/* 5 Financial KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="dh-card p-4">
          <p className="text-xs font-semibold text-[#7F6D67]">{t.expenses.totalIncome}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-[#5B6B52]">{formatVND(totalIncome, lang)}</p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs font-semibold text-[#7F6D67]">{t.expenses.totalExpense}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-[#A77C78]">{formatVND(totalExpense, lang)}</p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs font-semibold text-[#7F6D67]">{t.expenses.netCashFlow}</p>
          <p className={`mt-2 font-mono text-xl font-semibold ${netCashFlow >= 0 ? 'text-[#5B6B52]' : 'text-[#A77C78]'}`}>
            {formatVND(netCashFlow, lang)}
          </p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs font-semibold text-[#7F6D67]">{t.expenses.remainingBudget}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-[#55443F]">{formatVND(remainingBudget, lang)}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#F3EDE6] overflow-hidden">
            <div className="h-full bg-[#A77C78]" style={{ width: `${Math.min(100, budgetUsedPct)}%` }} />
          </div>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs font-semibold text-[#7F6D67]">{t.expenses.savingsRate}</p>
          <p className="mt-2 font-mono text-xl font-semibold text-[#55443F]">{savingsRate}%</p>
          <p className="mt-1 text-[11px] text-[#7F6D67]">
            {t.expenses.savingsGoalProgress}: {savingsGoalPct}%
          </p>
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dh-card p-5">
          <h3 className="font-display text-base font-semibold text-[#55443F] mb-4">
            {t.expenses.categoryChart}
          </h3>
          {categoryChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#9A8983]">
              {t.expenses.emptyState}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={78} paddingAngle={2}>
                      {categoryChartData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                      formatter={(v) => formatVND(Number(v ?? 0), lang)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryChartData.map((row, idx) => (
                  <div key={row.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="font-mono text-[#7F6D67]">{formatVND(row.value, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dh-card p-5">
          <h3 className="font-display text-base font-semibold text-[#55443F] mb-4">
            {t.expenses.monthlyComparisonChart}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData}>
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
      </section>

      {/* Filters & View Switch */}
      <div className="dh-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-[#F3EDE6] rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${
                viewMode === 'list' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {t.expenses.viewList}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${
                viewMode === 'calendar' ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {t.expenses.viewCalendar}
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#9A8983] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.expenses.searchPlaceholder}
              className="dh-input w-full pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.common.all}</option>
            <option value="expense">{t.expenses.expense}</option>
            <option value="income">{t.expenses.income}</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.expenses.categoryLabel}: {t.common.all}</option>
            {(Object.keys(t.transactionCategories) as TransactionCategory[]).map((cat) => (
              <option key={cat} value={cat}>{t.transactionCategories[cat]}</option>
            ))}
          </select>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="dh-input px-3 py-1.5 text-xs"
          >
            <option value="all">{t.expenses.paymentMethodLabel}: {t.common.all}</option>
            {(Object.keys(t.paymentMethods) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{t.paymentMethods[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction List vs Financial Calendar */}
      {viewMode === 'list' ? (
        <div className="dh-card overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <p className="p-8 text-center text-xs text-[#9A8983]">{t.expenses.emptyState}</p>
          ) : (
            <div className="divide-y divide-[#EFE7DF]">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-[#FCF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#55443F] truncate">{tx.description}</p>
                      {tx.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F7ECEC] text-[#A77C78]">
                          <Repeat className="w-3 h-3" />
                          {t.transactionRecurrence[tx.recurrenceInterval ?? 'monthly']}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7F6D67] mt-0.5">
                      {formatShortDate(tx.date, lang)} · {t.transactionCategories[tx.category]} ·{' '}
                      {t.paymentMethods[tx.paymentMethod]}
                    </p>
                    {tx.note && <p className="text-[11px] text-[#9A8983] mt-0.5">{tx.note}</p>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        tx.type === 'income' ? 'text-[#5B6B52]' : 'text-[#A77C78]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatVND(tx.amount, lang)}
                    </span>
                    {tx.isRecurring && (
                      <button
                        type="button"
                        onClick={() => void handleTriggerRecurring(tx)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#F3EDE6] text-[#55443F] hover:bg-[#EBCFD0]"
                        title={t.expenses.recurringTriggerBtn}
                      >
                        {t.expenses.recurringTriggerBtn}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(tx)}
                      className="p-1.5 text-[#7F6D67] hover:text-[#55443F]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.expenses.deleteConfirm)) {
                          void deleteTransaction(uid, tx.id);
                        }
                      }}
                      className="p-1.5 text-[#7F6D67] hover:text-[#A77C78]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="dh-card p-5">
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.dateStr) return <div key={idx} className="min-h-[82px] rounded-xl bg-[#F8F5F0]/60" />;
              const dayTxs = filteredTransactions.filter((tx) => tx.date === cell.dateStr);
              const dayInc = dayTxs.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
              const dayExp = dayTxs.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[86px] p-2 rounded-xl border ${
                    cell.dateStr === today ? 'border-[#A77C78] bg-[#F7ECEC]/60' : 'border-[#EFE7DF] bg-white'
                  }`}
                >
                  <p className="text-[11px] font-mono font-semibold text-[#7F6D67]">{cell.day}</p>
                  {dayInc > 0 && (
                    <p className="font-mono text-[10px] text-[#5B6B52] mt-1 truncate">
                      +{Math.round(dayInc / 1000)}k
                    </p>
                  )}
                  {dayExp > 0 && (
                    <p className="font-mono text-[10px] text-[#A77C78] truncate">
                      -{Math.round(dayExp / 1000)}k
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#55443F]">
                {editingTx ? t.expenses.editTransaction : t.expenses.addTransaction}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-[#7F6D67] hover:text-[#55443F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F3EDE6] rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 text-xs font-semibold rounded-lg ${
                    type === 'expense' ? 'bg-white text-[#A77C78] shadow-xs' : 'text-[#7F6D67]'
                  }`}
                >
                  {t.expenses.expense}
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 text-xs font-semibold rounded-lg ${
                    type === 'income' ? 'bg-white text-[#5B6B52] shadow-xs' : 'text-[#7F6D67]'
                  }`}
                >
                  {t.expenses.income}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.amountLabel} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.dateLabel}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(Object.keys(t.transactionCategories) as TransactionCategory[]).map((cat) => (
                      <option key={cat} value={cat}>{t.transactionCategories[cat]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.paymentMethodLabel}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(Object.keys(t.paymentMethods) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>{t.paymentMethods[m]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.expenses.descriptionLabel} *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.expenses.noteLabel}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF]">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#55443F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="accent-[#55443F]"
                  />
                  {t.expenses.recurringLabel}
                </label>
                {isRecurring && (
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value as TransactionRecurrence)}
                    className="dh-input px-2.5 py-1 text-xs"
                  >
                    <option value="weekly">{t.transactionRecurrence.weekly}</option>
                    <option value="monthly">{t.transactionRecurrence.monthly}</option>
                  </select>
                )}
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
