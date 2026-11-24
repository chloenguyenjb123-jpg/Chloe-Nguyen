import { auth } from '../firebase';
import type {
  AIProposedAction,
  CurrencyCode,
  ExchangeRateSnapshot,
  Goal,
  Habit,
  LanguageCode,
  Note,
  ReportPeriodType,
  Task,
  Transaction,
} from '../types';
import { calculateHabitStreak, getTodayVN } from '../utils/date';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Authentication required.');
  }
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface LiveExchangeRateResponse {
  date: string;
  effectiveDate?: string;
  fetchedAt: string;
  source: string;
  scheduleTag?: '06:00_VN' | 'manual' | 'auto';
  stale?: boolean;
  rates: Record<string, number>;
  previousRates: Record<string, number> | null;
  previousDate: string;
  previousSource: string | null;
  unavailable?: boolean;
  error?: string;
}

export async function fetchLiveExchangeRates(force = false): Promise<LiveExchangeRateResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/exchange-rates${force ? '?force=true' : ''}`, { headers });
  const data = (await res.json()) as LiveExchangeRateResponse;
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load live exchange rates.');
  }
  return data;
}

export interface ExchangeRateHistoryResponse {
  currency: CurrencyCode;
  days: 7 | 30 | 90;
  source: string;
  points: Array<{ date: string; rate: number | null }>;
}

export async function fetchExchangeRateHistory(
  currency: CurrencyCode,
  days: 7 | 30 | 90
): Promise<ExchangeRateHistoryResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/exchange-rates/history?currency=${encodeURIComponent(currency)}&days=${days}`, {
    headers,
  });
  const data = (await res.json()) as ExchangeRateHistoryResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Unable to load historical exchange rates.');
  }
  return data;
}

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export async function askAIAssistant(params: {
  language: LanguageCode;
  message: string;
  history: AssistantChatMessage[];
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  latestRate: ExchangeRateSnapshot | null;
  monthlyBudget: number;
  budgetAlertThreshold: number;
}): Promise<{ reply: string; proposedActions: AIProposedAction[] }> {
  const headers = await getAuthHeaders();
  const today = getTodayVN();
  const res = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language: params.language,
      message: params.message,
      history: params.history,
      context: {
        language: params.language,
        today,
        nowVN: new Date().toISOString(),
        monthlyBudget: params.monthlyBudget,
        budgetAlertThreshold: params.budgetAlertThreshold,
        tasks: params.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          priority: t.priority,
          startDate: t.startDate,
          deadline: t.deadline,
          status: t.status,
          estimatedMinutes: t.estimatedMinutes,
          timeBlockStart: t.timeBlockStart,
          subtasksTotal: t.subtasks?.length ?? 0,
          subtasksDone: t.subtasks?.filter((s) => s.completed).length ?? 0,
        })),
        transactions: params.transactions.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          category: tx.category,
          paymentMethod: tx.paymentMethod,
          description: tx.description,
        })),
        notes: params.notes
          .filter((n) => !n.archived)
          .map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content.slice(0, 600),
            category: n.category,
            pinned: n.pinned,
            linkedTaskId: n.linkedTaskId,
          })),
        goals: params.goals.map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          progress: g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0,
          targetDate: g.targetDate,
          period: g.period,
        })),
        habits: params.habits.map((h) => ({
          id: h.id,
          title: h.title,
          category: h.category,
          frequency: h.frequency,
          streak: calculateHabitStreak(h.completedDates || [], today),
          completedToday: (h.completedDates || []).includes(today),
        })),
        exchangeRates: params.latestRate
          ? {
              date: params.latestRate.date,
              source: params.latestRate.source,
              rates: params.latestRate.rates,
              previousRates: params.latestRate.previousRates ?? null,
            }
          : null,
      },
    }),
  });

  const data = (await res.json()) as {
    reply?: string;
    proposedActions?: AIProposedAction[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'AI Assistant is temporarily unavailable.');
  }
  return {
    reply: data.reply || '',
    proposedActions: data.proposedActions || [],
  };
}

export async function generateAIReportInsights(params: {
  language: LanguageCode;
  periodType: ReportPeriodType;
  periodLabel: string;
  summary: Record<string, unknown>;
}): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/ai/report-insights', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { insights?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Unable to generate AI insights for report.');
  }
  return data.insights || '';
}
