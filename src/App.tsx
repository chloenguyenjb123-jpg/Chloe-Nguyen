import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { auth } from './firebase';
import type {
  ActivityLog,
  ExchangeRateSnapshot,
  Goal,
  Habit,
  LanguageCode,
  NavSection,
  Note,
  SavedReport,
  Task,
  Transaction,
  UserProfile,
} from './types';
import {
  ensureUserProfile,
  saveExchangeRateSnapshot,
  subscribeActivities,
  subscribeExchangeRates,
  subscribeGoals,
  subscribeHabits,
  subscribeNotes,
  subscribeReports,
  subscribeTasks,
  subscribeTransactions,
  subscribeUserProfile,
  updateUserSettings,
} from './services/firestoreService';
import { fetchLiveExchangeRates } from './services/apiService';
import { getTodayVN } from './utils/date';
import { LanguageProvider, useI18n } from './i18n/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { Layout } from './components/Layout';
import { QuickAddModal } from './components/QuickAddModal';
import { DashboardView } from './components/views/DashboardView';
import { TasksView } from './components/views/TasksView';
import { ExpensesView } from './components/views/ExpensesView';
import { NotesView } from './components/views/NotesView';
import { GoalsHabitsView } from './components/views/GoalsHabitsView';
import { ExchangeRatesView } from './components/views/ExchangeRatesView';
import { AIAssistantView } from './components/views/AIAssistantView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

function DailyHubApp() {
  const { lang, setLang, setTheme, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [quickAddMode, setQuickAddMode] = useState<'task' | 'transaction' | 'note' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Firestore synced state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [rateSnapshots, setRateSnapshots] = useState<ExchangeRateSnapshot[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Live Exchange Rate fetch state
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const autoFetchedDateRef = useRef<string | null>(null);
  const syncedProfilePrefsRef = useRef<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        await ensureUserProfile(nextUser);
      } else {
        setProfile(null);
        setTasks([]);
        setTransactions([]);
        setNotes([]);
        setGoals([]);
        setHabits([]);
        setActivities([]);
        setRateSnapshots([]);
        setSavedReports([]);
        autoFetchedDateRef.current = null;
        syncedProfilePrefsRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const unsubs = [
      subscribeUserProfile(uid, setProfile),
      subscribeTasks(uid, setTasks),
      subscribeTransactions(uid, setTransactions),
      subscribeNotes(uid, setNotes),
      subscribeGoals(uid, setGoals),
      subscribeHabits(uid, setHabits),
      subscribeActivities(uid, setActivities),
      subscribeExchangeRates(uid, setRateSnapshots),
      subscribeReports(uid, setSavedReports),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [user]);

  // Sync saved Firestore language & theme once when profile loads
  useEffect(() => {
    if (!profile || syncedProfilePrefsRef.current === profile.uid) return;
    syncedProfilePrefsRef.current = profile.uid;
    if (profile.language === 'vi' || profile.language === 'en') {
      setLang(profile.language);
    }
    if (profile.theme === 'warm_ivory' || profile.theme === 'soft_blush') {
      setTheme(profile.theme);
    }
  }, [profile, setLang, setTheme]);

  const handleChangeLanguage = useCallback(
    async (next: LanguageCode) => {
      setLang(next);
      if (user) {
        await updateUserSettings(user.uid, { language: next });
      }
    },
    [user, setLang]
  );

  const refreshExchangeRates = useCallback(
    async (force = false) => {
      if (!user) return;
      setRatesLoading(true);
      setRatesError(null);
      try {
        const live = await fetchLiveExchangeRates(force);
        await saveExchangeRateSnapshot(user.uid, {
          date: live.date,
          rates: live.rates,
          previousRates: live.previousRates,
          source: live.source,
          fetchedAt: live.fetchedAt,
          scheduleTag: live.scheduleTag,
        });
        if (force) {
          notify(lang === 'en' ? 'Exchange rates updated.' : 'Đã cập nhật tỷ giá ngoại tệ mới nhất.');
        }
      } catch (err) {
        setRatesError(
          err instanceof Error
            ? err.message
            : lang === 'en'
            ? 'Unable to fetch exchange rates.'
            : 'Không thể lấy tỷ giá từ máy chủ.'
        );
      } finally {
        setRatesLoading(false);
      }
    },
    [user, notify, lang]
  );

  // Auto-refresh once per day in Asia/Ho_Chi_Minh timezone
  useEffect(() => {
    if (!user) return;
    const today = getTodayVN();
    const hasTodaySnapshot = rateSnapshots.some((s) => s.date === today);
    if (!hasTodaySnapshot && autoFetchedDateRef.current !== today) {
      autoFetchedDateRef.current = today;
      void refreshExchangeRates(false);
    }
  }, [user, rateSnapshots, refreshExchangeRates]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">
        <div className="inline-flex items-center gap-2.5 text-sm font-medium text-[#7F6D67]">
          <Loader2 className="w-5 h-5 animate-spin text-[#A77C78]" />
          <span>{t.loadingApp}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const latestRate = rateSnapshots[0] ?? null;
  const shownName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Daily Hub';

  return (
    <Layout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      user={user}
      displayName={shownName}
      onSignOut={handleSignOut}
      onChangeLanguage={(next) => void handleChangeLanguage(next)}
      onOpenQuickAdd={(mode) => setQuickAddMode(mode)}
    >
      {activeSection === 'dashboard' && (
        <DashboardView
          uid={user.uid}
          userName={shownName}
          profile={profile}
          tasks={tasks}
          transactions={transactions}
          notes={notes}
          goals={goals}
          habits={habits}
          activities={activities}
          latestRate={latestRate}
          ratesLoading={ratesLoading}
          ratesError={ratesError}
          onRefreshRates={() => void refreshExchangeRates(true)}
          onOpenQuickAdd={(mode) => setQuickAddMode(mode)}
          onNavigate={setActiveSection}
          onNotify={notify}
        />
      )}

      {activeSection === 'tasks' && (
        <TasksView uid={user.uid} tasks={tasks} onNotify={notify} />
      )}

      {activeSection === 'expenses' && (
        <ExpensesView
          uid={user.uid}
          profile={profile}
          transactions={transactions}
          onNavigate={setActiveSection}
          onNotify={notify}
        />
      )}

      {activeSection === 'notes' && (
        <NotesView uid={user.uid} notes={notes} tasks={tasks} onNotify={notify} />
      )}

      {activeSection === 'goals-habits' && (
        <GoalsHabitsView uid={user.uid} goals={goals} habits={habits} onNotify={notify} />
      )}

      {activeSection === 'exchange-rates' && (
        <ExchangeRatesView
          snapshots={rateSnapshots}
          latestRate={latestRate}
          loading={ratesLoading}
          error={ratesError}
          preferredCurrency={profile?.preferredCurrency}
          onRefresh={() => void refreshExchangeRates(true)}
        />
      )}

      {activeSection === 'ai-assistant' && (
        <AIAssistantView
          uid={user.uid}
          profile={profile}
          tasks={tasks}
          transactions={transactions}
          notes={notes}
          goals={goals}
          habits={habits}
          latestRate={latestRate}
          onNotify={notify}
        />
      )}

      {activeSection === 'reports' && (
        <ReportsView
          uid={user.uid}
          userName={shownName}
          profile={profile}
          tasks={tasks}
          transactions={transactions}
          notes={notes}
          goals={goals}
          habits={habits}
          latestRate={latestRate}
          savedReports={savedReports}
          onNotify={notify}
        />
      )}

      {activeSection === 'settings' && (
        <SettingsView
          uid={user.uid}
          profile={profile}
          tasks={tasks}
          transactions={transactions}
          notes={notes}
          goals={goals}
          habits={habits}
          onNotify={notify}
        />
      )}

      {quickAddMode && (
        <QuickAddModal
          uid={user.uid}
          mode={quickAddMode}
          tasks={tasks}
          onClose={() => setQuickAddMode(null)}
          onSuccess={notify}
        />
      )}

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#55443F] text-[#F8F5F0] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#A8B5A0] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <DailyHubApp />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
