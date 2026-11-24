import { useMemo, useState } from 'react';
import { Download, Eye, Loader2, Sparkles, X } from 'lucide-react';
import type {
  ExchangeRateSnapshot,
  Goal,
  Habit,
  Note,
  ReportPeriodType,
  SavedReport,
  Task,
  Transaction,
  TransactionCategory,
  UserProfile,
} from '../../types';
import { generateAIReportInsights } from '../../services/apiService';
import { saveReportInsights } from '../../services/firestoreService';
import { generateReportPdfDoc } from '../../services/pdfExportService';
import {
  calculateHabitStreak,
  formatShortDate,
  formatVND,
  getMonthRangeVN,
  getTodayVN,
  getWeekRangeVN,
} from '../../utils/date';
import { RichTextRenderer } from '../RichTextRenderer';
import { useI18n } from '../../i18n/LanguageContext';

interface ReportsViewProps {
  uid: string;
  userName: string;
  profile: UserProfile | null;
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  latestRate: ExchangeRateSnapshot | null;
  savedReports: SavedReport[];
  onNotify: (msg: string) => void;
}

export function ReportsView({
  uid,
  userName,
  profile,
  tasks,
  transactions,
  notes,
  goals,
  habits,
  latestRate,
  savedReports,
  onNotify,
}: ReportsViewProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();

  const [periodType, setPeriodType] = useState<ReportPeriodType>('daily');
  const [anchorDate, setAnchorDate] = useState(today);
  const [customStart, setCustomStart] = useState(getWeekRangeVN(today).start);
  const [customEnd, setCustomEnd] = useState(today);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const periodRange = useMemo(() => {
    if (periodType === 'daily') {
      return { start: anchorDate, end: anchorDate, key: anchorDate };
    }
    if (periodType === 'weekly') {
      const wk = getWeekRangeVN(anchorDate);
      return { start: wk.start, end: wk.end, key: `${wk.start}_${wk.end}` };
    }
    if (periodType === 'monthly') {
      const mo = getMonthRangeVN(anchorDate);
      return { start: mo.start, end: mo.end, key: mo.monthKey };
    }
    const start = customStart <= customEnd ? customStart : customEnd;
    const end = customStart <= customEnd ? customEnd : customStart;
    return { start, end, key: `${start}_${end}` };
  }, [periodType, anchorDate, customStart, customEnd]);

  const periodLabel = useMemo(() => {
    if (periodType === 'daily') return formatShortDate(periodRange.start, lang);
    return `${formatShortDate(periodRange.start, lang)} – ${formatShortDate(periodRange.end, lang)}`;
  }, [periodType, periodRange, lang]);

  const periodTasks = useMemo(
    () => tasks.filter((tk) => tk.deadline >= periodRange.start && tk.deadline <= periodRange.end),
    [tasks, periodRange]
  );
  const completedTasks = useMemo(
    () => periodTasks.filter((tk) => tk.status === 'completed'),
    [periodTasks]
  );
  const pendingTasks = useMemo(
    () => periodTasks.filter((tk) => tk.status !== 'completed'),
    [periodTasks]
  );
  const progressPercent =
    periodTasks.length > 0 ? Math.round((completedTasks.length / periodTasks.length) * 100) : 0;

  const periodTransactions = useMemo(
    () => transactions.filter((tx) => tx.date >= periodRange.start && tx.date <= periodRange.end),
    [transactions, periodRange]
  );
  const totalIncome = useMemo(
    () => periodTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0),
    [periodTransactions]
  );
  const totalExpense = useMemo(
    () => periodTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0),
    [periodTransactions]
  );

  const expenseByCategory = useMemo(() => {
    const map = new Map<TransactionCategory, number>();
    for (const tx of periodTransactions) {
      if (tx.type === 'expense') {
        map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        label: t.transactionCategories[category],
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, t.transactionCategories]);

  const importantNotes = useMemo(
    () => notes.filter((n) => !n.archived && (n.pinned || periodTasks.some((tk) => tk.id === n.linkedTaskId))),
    [notes, periodTasks]
  );

  const reportDocId = `${periodType}_${periodRange.key}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const currentInsights = useMemo(
    () => savedReports.find((r) => r.id === reportDocId)?.aiInsights ?? '',
    [savedReports, reportDocId]
  );

  const handleGenerateInsights = async () => {
    setGeneratingAI(true);
    try {
      const insights = await generateAIReportInsights({
        language: lang,
        periodType,
        periodLabel,
        summary: {
          tasksTotal: periodTasks.length,
          tasksCompleted: completedTasks.length,
          progressPercent,
          totalIncome,
          totalExpense,
          monthlyBudget: profile?.monthlyBudget ?? 15_000_000,
          expenseByCategory,
          goalsCount: goals.length,
          habitsCount: habits.length,
          habitStreaks: habits.map((h) => ({
            title: h.title,
            streak: calculateHabitStreak(h.completedDates || [], today),
          })),
        },
      });
      await saveReportInsights(uid, periodType, periodRange.key, insights);
      onNotify(lang === 'en' ? 'AI insights generated and saved.' : 'Đã tạo và lưu phân tích AI.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const buildPdf = async () => {
    return generateReportPdfDoc({
      language: lang,
      periodType,
      periodLabel,
      userName,
      tasks: periodTasks,
      completedTasks,
      pendingTasks,
      progressPercent,
      transactions: periodTransactions,
      totalIncome,
      totalExpense,
      monthlyBudget: profile?.monthlyBudget ?? 15_000_000,
      expenseByCategory,
      goals,
      habits,
      importantNotes,
      latestRates: latestRate,
      aiInsights: currentInsights,
    });
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const doc = await buildPdf();
      doc.save(`DailyHub_${periodType}_${periodRange.key}_${lang}.pdf`);
      onNotify(lang === 'en' ? 'PDF report downloaded.' : 'Đã tải xuống báo cáo PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePreviewPdf = async () => {
    setExportingPdf(true);
    try {
      const doc = await buildPdf();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.reports.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.reports.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleGenerateInsights()}
            disabled={generatingAI}
            className="dh-btn-accent px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generatingAI ? t.reports.generatingAI : t.reports.generateAI}
          </button>
          <button
            type="button"
            onClick={() => void handlePreviewPdf()}
            disabled={exportingPdf}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8DFD6] text-[#55443F] hover:bg-[#F7ECEC] inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {t.reports.previewPDF}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={exportingPdf}
            className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t.reports.exportPDF}
          </button>
        </div>
      </div>

      {/* Period Picker */}
      <div className="dh-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap p-1 bg-[#F3EDE6] rounded-xl gap-1">
          {(['daily', 'weekly', 'monthly', 'custom'] as ReportPeriodType[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodType(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                periodType === p ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
              }`}
            >
              {t.reportPeriods[p]}
            </button>
          ))}
        </div>

        {periodType === 'custom' ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#7F6D67]">{t.reports.customStart}:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="dh-input px-2.5 py-1.5 text-xs font-mono"
            />
            <span className="text-[#7F6D67]">{t.reports.customEnd}:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="dh-input px-2.5 py-1.5 text-xs font-mono"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className="dh-input px-3 py-1.5 text-xs font-mono"
            />
            <span className="font-mono text-xs text-[#7F6D67]">{periodLabel}</span>
          </div>
        )}
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dh-card p-4">
          <p className="text-xs text-[#7F6D67]">{t.dashboard.tasksCompletedLabel}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#55443F]">
            {completedTasks.length}/{periodTasks.length} ({progressPercent}%)
          </p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs text-[#7F6D67]">{t.expenses.totalIncome}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#5B6B52]">{formatVND(totalIncome, lang)}</p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs text-[#7F6D67]">{t.expenses.totalExpense}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#A77C78]">{formatVND(totalExpense, lang)}</p>
        </div>
        <div className="dh-card p-4">
          <p className="text-xs text-[#7F6D67]">{t.expenses.netCashFlow}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#55443F]">
            {formatVND(totalIncome - totalExpense, lang)}
          </p>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="dh-card p-5 space-y-3">
        <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A77C78]" />
          {t.reports.aiInsightsSection}
        </h3>
        {currentInsights ? (
          <div className="p-4 rounded-xl bg-[#FCF9F6] border border-[#EFE7DF]">
            <RichTextRenderer content={currentInsights} />
          </div>
        ) : (
          <p className="text-xs text-[#9A8983]">{t.reports.noInsightsYet}</p>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/45 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E8DFD6] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-[#55443F]">{t.reports.previewPDF}</h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="p-1.5 text-[#7F6D67] hover:text-[#55443F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full border-0" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
