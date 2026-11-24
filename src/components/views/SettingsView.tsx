import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  TARGET_CURRENCIES,
  type CurrencyCode,
  type Goal,
  type Habit,
  type LanguageCode,
  type Note,
  type Task,
  type ThemeVariant,
  type Transaction,
  type UserProfile,
} from '../../types';
import {
  clearDemoData,
  restoreBackupData,
  seedDemoData,
  updateUserSettings,
  type BackupPayload,
} from '../../services/firestoreService';
import { useI18n } from '../../i18n/LanguageContext';

interface SettingsViewProps {
  uid: string;
  profile: UserProfile | null;
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  onNotify: (msg: string) => void;
}

export function SettingsView({
  uid,
  profile,
  tasks,
  transactions,
  notes,
  goals,
  habits,
  onNotify,
}: SettingsViewProps) {
  const { lang, setLang, theme, setTheme, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(profile?.language ?? lang);
  const [selectedTheme, setSelectedTheme] = useState<ThemeVariant>(profile?.theme ?? theme);
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(
    profile?.preferredCurrency ?? 'USD'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    profile?.notificationsEnabled ?? true
  );
  const [workStart, setWorkStart] = useState(profile?.dailyWorkStart ?? '08:30');
  const [workEnd, setWorkEnd] = useState(profile?.dailyWorkEnd ?? '17:30');
  const [monthlyBudget, setMonthlyBudget] = useState(String(profile?.monthlyBudget ?? 15_000_000));
  const [savingsGoalMonthly, setSavingsGoalMonthly] = useState(
    String(profile?.savingsGoalMonthly ?? 5_000_000)
  );
  const [threshold, setThreshold] = useState(String(profile?.budgetAlertThreshold ?? 80));

  const [saving, setSaving] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserSettings(uid, {
        displayName,
        language: selectedLang,
        theme: selectedTheme,
        preferredCurrency,
        notificationsEnabled,
        dailyWorkStart: workStart,
        dailyWorkEnd: workEnd,
        monthlyBudget: Number(monthlyBudget) || 0,
        savingsGoalMonthly: Number(savingsGoalMonthly) || 0,
        budgetAlertThreshold: Number(threshold) || 80,
      });
      setLang(selectedLang);
      setTheme(selectedTheme);
      onNotify(t.settings.settingsSaved);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDemo = async () => {
    setDemoBusy(true);
    try {
      await seedDemoData(uid);
      onNotify(t.settings.demoLoaded);
    } finally {
      setDemoBusy(false);
    }
  };

  const handleClearDemo = async () => {
    setDemoBusy(true);
    try {
      await clearDemoData(uid);
      onNotify(t.settings.demoCleared);
    } finally {
      setDemoBusy(false);
    }
  };

  const handleExportBackup = () => {
    const payload: BackupPayload = {
      app: 'Daily Hub',
      version: 2,
      exportedAt: new Date().toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      profile: {
        monthlyBudget: profile?.monthlyBudget ?? 15_000_000,
        budgetAlertThreshold: profile?.budgetAlertThreshold ?? 80,
        savingsGoalMonthly: profile?.savingsGoalMonthly ?? 5_000_000,
      },
      tasks: tasks.map((tk) => ({
        title: tk.title,
        description: tk.description,
        category: tk.category,
        priority: tk.priority,
        startDate: tk.startDate,
        deadline: tk.deadline,
        status: tk.status,
        notes: tk.notes,
        subtasks: tk.subtasks,
        recurrence: tk.recurrence,
        estimatedMinutes: tk.estimatedMinutes,
        timeBlockStart: tk.timeBlockStart,
        reminderTime: tk.reminderTime,
      })),
      transactions: transactions.map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
        paymentMethod: tx.paymentMethod,
        description: tx.description,
        note: tx.note,
        isRecurring: tx.isRecurring,
        recurrenceInterval: tx.recurrenceInterval,
      })),
      notes: notes.map((n) => ({
        title: n.title,
        content: n.content,
        category: n.category,
        folder: n.folder,
        tags: n.tags,
        pinned: n.pinned,
        archived: n.archived,
        attachments: n.attachments,
      })),
      goals: goals.map((g) => ({
        title: g.title,
        description: g.description,
        category: g.category,
        period: g.period,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        unit: g.unit,
        startDate: g.startDate,
        targetDate: g.targetDate,
        completed: g.completed,
      })),
      habits: habits.map((h) => ({
        title: h.title,
        category: h.category,
        frequency: h.frequency,
        reminderTime: h.reminderTime,
        completedDates: h.completedDates,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      await restoreBackupData(uid, parsed);
      onNotify(t.settings.restoreSuccess);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Invalid JSON backup.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.settings.title}</h2>
        <p className="text-xs text-[#7F6D67] mt-1">{t.settings.subtitle}</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Profile, Theme & Language */}
        <section className="dh-card p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#A77C78]" />
            {t.settings.profileSection}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.displayNameLabel}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.languageLabel}
              </label>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                className="dh-input w-full px-3 py-2 text-sm"
              >
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.themeLabel}
              </label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value as ThemeVariant)}
                className="dh-input w-full px-3 py-2 text-sm"
              >
                <option value="warm_ivory">{t.settings.themeWarmIvory}</option>
                <option value="soft_blush">{t.settings.themeSoftBlush}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.preferredCurrencyLabel}
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value as CurrencyCode)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              >
                {TARGET_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.workStart}
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.workEnd}
              </label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-[#55443F] pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="accent-[#55443F]"
              />
              {t.settings.notificationsLabel}
            </label>
          </div>
        </section>

        {/* Budget & Savings */}
        <section className="dh-card p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-[#55443F]">
            {t.settings.budgetSection}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.monthlyBudgetLabel}
              </label>
              <input
                type="number"
                min="0"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.savingsGoalLabel}
              </label>
              <input
                type="number"
                min="0"
                value={savingsGoalMonthly}
                onChange={(e) => setSavingsGoalMonthly(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.settings.alertThresholdLabel}
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="dh-btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saving ? t.common.saving : t.settings.saveSettings}
            </button>
          </div>
        </section>
      </form>

      {/* Demo Data & Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="dh-card p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#A77C78]" />
            {t.settings.demoSection}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleLoadDemo()}
              disabled={demoBusy}
              className="dh-btn-accent px-3.5 py-2 text-xs font-semibold disabled:opacity-60"
            >
              {t.settings.loadDemoBtn}
            </button>
            <button
              type="button"
              onClick={() => void handleClearDemo()}
              disabled={demoBusy}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8DFD6] text-[#55443F] hover:bg-[#F7ECEC] inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#A77C78]" />
              {t.settings.clearDemoBtn}
            </button>
          </div>
        </section>

        <section className="dh-card p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-[#55443F]">
            {t.settings.backupSection}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="dh-btn-primary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {t.settings.exportJsonBtn}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8DFD6] text-[#55443F] hover:bg-[#F7ECEC] inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {t.settings.restoreJsonBtn}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => void handleRestoreFile(e)}
              className="hidden"
            />
          </div>
          {restoreError && <p className="text-xs text-[#A77C78]">{restoreError}</p>}
        </section>
      </div>

      {/* Security Info */}
      <section className="dh-card p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#5B6B52] shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-[#55443F]">{t.settings.securitySection}</h3>
          <p className="text-xs text-[#7F6D67] mt-1 leading-relaxed">{t.settings.securityDesc}</p>
        </div>
      </section>
    </div>
  );
}
