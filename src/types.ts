export type LanguageCode = 'vi' | 'en';
export type ThemeVariant = 'warm_ivory' | 'soft_blush';

export type NavSection =
  | 'dashboard'
  | 'tasks'
  | 'expenses'
  | 'notes'
  | 'goals-habits'
  | 'exchange-rates'
  | 'ai-assistant'
  | 'reports'
  | 'settings';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TransactionType = 'income' | 'expense';
export type TransactionCategory =
  | 'food'
  | 'transportation'
  | 'shopping'
  | 'education'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'salary'
  | 'other';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'e_wallet';
export type TransactionRecurrence = 'none' | 'weekly' | 'monthly';

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'CNY' | 'AUD' | 'SGD' | 'THB';

export const TARGET_CURRENCIES: CurrencyCode[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'KRW',
  'CNY',
  'AUD',
  'SGD',
  'THB',
];

export const CURRENCY_NAMES: Record<CurrencyCode, { vi: string; en: string }> = {
  USD: { vi: 'Đô la Mỹ', en: 'US Dollar' },
  EUR: { vi: 'Euro', en: 'Euro' },
  GBP: { vi: 'Bảng Anh', en: 'British Pound' },
  JPY: { vi: 'Yên Nhật', en: 'Japanese Yen' },
  KRW: { vi: 'Won Hàn Quốc', en: 'South Korean Won' },
  CNY: { vi: 'Nhân dân tệ', en: 'Chinese Yuan' },
  AUD: { vi: 'Đô la Úc', en: 'Australian Dollar' },
  SGD: { vi: 'Đô la Singapore', en: 'Singapore Dollar' },
  THB: { vi: 'Baht Thái', en: 'Thai Baht' },
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  monthlyBudget: number;
  budgetAlertThreshold: number;
  savingsGoalMonthly?: number;
  language?: LanguageCode;
  theme?: ThemeVariant;
  preferredCurrency?: CurrencyCode;
  notificationsEnabled?: boolean;
  dailyWorkStart?: string;
  dailyWorkEnd?: string;
  timezone: 'Asia/Ho_Chi_Minh';
  currency: 'VND';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  startDate: string;
  deadline: string;
  status: TaskStatus;
  notes: string;
  subtasks?: TaskSubtask[];
  recurrence?: TaskRecurrence;
  estimatedMinutes?: number;
  timeBlockStart?: string;
  reminderTime?: string;
  carriedOverFrom?: string;
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  description: string;
  note: string;
  isRecurring?: boolean;
  recurrenceInterval?: TransactionRecurrence;
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NoteAttachment {
  name: string;
  url: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  folder?: string;
  tags: string[];
  pinned: boolean;
  archived?: boolean;
  linkedTaskId?: string;
  attachments?: NoteAttachment[];
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  period: GoalPeriod;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  completed: boolean;
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  category: string;
  frequency: HabitFrequency;
  reminderTime?: string;
  completedDates: string[];
  isDemo?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'transaction_created'
  | 'note_saved'
  | 'goal_updated'
  | 'habit_checked'
  | 'report_generated';

export interface ActivityLog {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  detail: string;
  timestampIso: string;
  createdAt?: unknown;
}

export interface ExchangeRateSnapshot {
  id: string;
  userId: string;
  date: string;
  baseCurrency: 'VND';
  rates: Record<string, number>;
  previousRates?: Record<string, number>;
  source: string;
  fetchedAt: string;
  scheduleTag?: '06:00_VN' | 'manual' | 'auto';
  stale?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedReport {
  id: string;
  userId: string;
  periodType: ReportPeriodType;
  dateKey: string;
  aiInsights: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AIProposedAction {
  type: 'create_task' | 'complete_task' | 'create_note';
  label: string;
  taskId?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  deadline?: string;
  estimatedMinutes?: number;
  timeBlockStart?: string;
}

export const TASK_CATEGORY_KEYS = [
  'Work',
  'Personal',
  'Learning',
  'Finance',
  'Health',
  'Family',
  'Other',
] as const;

export const NOTE_CATEGORY_KEYS = [
  'Work',
  'Ideas',
  'Learning',
  'Planning',
  'Finance',
  'Personal',
] as const;

export const GOAL_CATEGORY_KEYS = [
  'Productivity',
  'Finance',
  'Health',
  'Learning',
  'Personal',
  'Other',
] as const;

// Synchronized verbatim with firebase-blueprint.json & firestore.rules bounds
export const FIELD_LIMITS = {
  taskTitleMax: 200,
  taskDescriptionMax: 2000,
  taskCategoryMax: 60,
  taskNotesMax: 2000,
  taskSubtasksMaxCount: 25,
  taskSubtaskTitleMax: 160,
  transactionDescriptionMax: 300,
  transactionNoteMax: 1000,
  transactionAmountMax: 1_000_000_000_000,
  noteTitleMax: 200,
  noteContentMax: 20000,
  noteCategoryMax: 60,
  noteFolderMax: 60,
  noteTagsMaxCount: 10,
  noteTagMaxLength: 32,
  noteAttachmentsMaxCount: 8,
  goalTitleMax: 200,
  goalDescriptionMax: 1000,
  goalUnitMax: 30,
  habitTitleMax: 160,
  datePattern: /^\d{4}-\d{2}-\d{2}$/,
  timePattern: /^([01]\d|2[0-3]):[0-5]\d$/,
  idPattern: /^[a-zA-Z0-9_-]{1,128}$/,
} as const;
