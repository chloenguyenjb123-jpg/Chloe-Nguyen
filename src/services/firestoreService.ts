import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  FIELD_LIMITS,
  type ActivityLog,
  type ActivityType,
  type CurrencyCode,
  type ExchangeRateSnapshot,
  type Goal,
  type GoalPeriod,
  type Habit,
  type HabitFrequency,
  type LanguageCode,
  type Note,
  type NoteAttachment,
  type PaymentMethod,
  type ReportPeriodType,
  type SavedReport,
  type Task,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type TaskSubtask,
  type ThemeVariant,
  type Transaction,
  type TransactionCategory,
  type TransactionRecurrence,
  type TransactionType,
  type UserProfile,
} from '../types';
import { addDaysToDateStr, getTodayVN } from '../utils/date';

function sanitizeString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function sanitizeDate(value: string, fallback: string): string {
  return FIELD_LIMITS.datePattern.test(value) ? value : fallback;
}

function sanitizeOptionalTime(value?: string): string {
  if (!value) return '';
  return FIELD_LIMITS.timePattern.test(value.trim()) ? value.trim() : '';
}

function sanitizeTags(tags: string[]): string[] {
  return tags
    .map((t) => t.trim().slice(0, FIELD_LIMITS.noteTagMaxLength))
    .filter((t) => t.length > 0)
    .slice(0, FIELD_LIMITS.noteTagsMaxCount);
}

function sanitizeSubtasks(subtasks?: TaskSubtask[]): TaskSubtask[] {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .filter((s) => s && typeof s.title === 'string' && s.title.trim().length > 0)
    .slice(0, FIELD_LIMITS.taskSubtasksMaxCount)
    .map((s, idx) => ({
      id: (s.id && FIELD_LIMITS.idPattern.test(s.id) ? s.id : `sub_${idx}_${Date.now()}`).slice(0, 64),
      title: s.title.trim().slice(0, FIELD_LIMITS.taskSubtaskTitleMax),
      completed: Boolean(s.completed),
    }));
}

export function isValidSafeUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeAttachments(attachments?: NoteAttachment[]): NoteAttachment[] {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((a) => a && typeof a.url === 'string' && isValidSafeUrl(a.url))
    .slice(0, FIELD_LIMITS.noteAttachmentsMaxCount)
    .map((a) => ({
      name: sanitizeString(a.name || a.url, 120) || 'Link',
      url: a.url.trim().slice(0, 500),
    }));
}

// --- ACTIVITY LOGS ---
export async function logActivity(
  uid: string,
  type: ActivityType,
  title: string,
  detail = ''
): Promise<void> {
  const path = `users/${uid}/activities`;
  try {
    await addDoc(collection(db, 'users', uid, 'activities'), {
      userId: uid,
      type,
      title: sanitizeString(title, 200) || type,
      detail: sanitizeString(detail, 400),
      timestampIso: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Activity log skipped:', path, err);
  }
}

export function subscribeActivities(uid: string, onData: (items: ActivityLog[]) => void): Unsubscribe {
  const path = `users/${uid}/activities`;
  const q = query(collection(db, 'users', uid, 'activities'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ActivityLog[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ActivityLog, 'id'>),
      }));
      items.sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
      onData(items.slice(0, 40));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

// --- USER PROFILE ---
export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: (user.email || 'user@dailyhub.local').slice(0, 254),
        displayName: (user.displayName || user.email?.split('@')[0] || 'Người dùng').slice(0, 120),
        monthlyBudget: 15_000_000,
        budgetAlertThreshold: 80,
        savingsGoalMonthly: 5_000_000,
        language: 'vi',
        theme: 'warm_ivory',
        preferredCurrency: 'USD',
        notificationsEnabled: true,
        dailyWorkStart: '08:30',
        dailyWorkEnd: '17:30',
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as UserProfile);
      } else {
        onData(null);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function updateBudgetSettings(
  uid: string,
  monthlyBudget: number,
  budgetAlertThreshold: number
): Promise<void> {
  const path = `users/${uid}`;
  const safeBudget = Math.max(0, Math.min(FIELD_LIMITS.transactionAmountMax, Math.round(monthlyBudget)));
  const safeThreshold = Math.max(10, Math.min(100, Math.round(budgetAlertThreshold)));
  try {
    await updateDoc(doc(db, 'users', uid), {
      monthlyBudget: safeBudget,
      budgetAlertThreshold: safeThreshold,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export interface UserSettingsUpdate {
  displayName?: string;
  monthlyBudget?: number;
  budgetAlertThreshold?: number;
  savingsGoalMonthly?: number;
  language?: LanguageCode;
  theme?: ThemeVariant;
  preferredCurrency?: CurrencyCode;
  notificationsEnabled?: boolean;
  dailyWorkStart?: string;
  dailyWorkEnd?: string;
}

export async function updateUserSettings(uid: string, update: UserSettingsUpdate): Promise<void> {
  const path = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof update.displayName === 'string' && update.displayName.trim()) {
    payload.displayName = sanitizeString(update.displayName, 120);
  }
  if (typeof update.monthlyBudget === 'number') {
    payload.monthlyBudget = Math.max(0, Math.min(FIELD_LIMITS.transactionAmountMax, Math.round(update.monthlyBudget)));
  }
  if (typeof update.budgetAlertThreshold === 'number') {
    payload.budgetAlertThreshold = Math.max(10, Math.min(100, Math.round(update.budgetAlertThreshold)));
  }
  if (typeof update.savingsGoalMonthly === 'number') {
    payload.savingsGoalMonthly = Math.max(0, Math.min(FIELD_LIMITS.transactionAmountMax, Math.round(update.savingsGoalMonthly)));
  }
  if (update.language === 'vi' || update.language === 'en') {
    payload.language = update.language;
  }
  if (update.theme === 'warm_ivory' || update.theme === 'soft_blush') {
    payload.theme = update.theme;
  }
  if (update.preferredCurrency) {
    payload.preferredCurrency = update.preferredCurrency;
  }
  if (typeof update.notificationsEnabled === 'boolean') {
    payload.notificationsEnabled = update.notificationsEnabled;
  }
  if (typeof update.dailyWorkStart === 'string' && FIELD_LIMITS.timePattern.test(update.dailyWorkStart)) {
    payload.dailyWorkStart = update.dailyWorkStart;
  }
  if (typeof update.dailyWorkEnd === 'string' && FIELD_LIMITS.timePattern.test(update.dailyWorkEnd)) {
    payload.dailyWorkEnd = update.dailyWorkEnd;
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- TASKS ---
export function subscribeTasks(uid: string, onData: (tasks: Task[]) => void): Unsubscribe {
  const path = `users/${uid}/tasks`;
  const q = query(collection(db, 'users', uid, 'tasks'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Task[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, 'id'>),
      }));
      items.sort((a, b) => a.deadline.localeCompare(b.deadline));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface TaskInput {
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
  isDemo?: boolean;
}

export async function createTask(uid: string, input: TaskInput): Promise<string> {
  const path = `users/${uid}/tasks`;
  const today = getTodayVN();
  const title = sanitizeString(input.title, FIELD_LIMITS.taskTitleMax);
  if (!title) throw new Error('Task title is required.');

  const payload: Record<string, unknown> = {
    userId: uid,
    title,
    description: sanitizeString(input.description, FIELD_LIMITS.taskDescriptionMax),
    category: sanitizeString(input.category || 'Work', FIELD_LIMITS.taskCategoryMax) || 'Work',
    priority: input.priority,
    startDate: sanitizeDate(input.startDate, today),
    deadline: sanitizeDate(input.deadline, today),
    status: input.status,
    notes: sanitizeString(input.notes, FIELD_LIMITS.taskNotesMax),
    subtasks: sanitizeSubtasks(input.subtasks),
    recurrence: input.recurrence ?? 'none',
    estimatedMinutes: Math.max(0, Math.min(1440, Math.round(input.estimatedMinutes ?? 0))),
    timeBlockStart: sanitizeOptionalTime(input.timeBlockStart),
    reminderTime: sanitizeOptionalTime(input.reminderTime),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.isDemo) {
    payload.isDemo = true;
  }

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'tasks'), payload);
    if (!input.isDemo) {
      void logActivity(uid, 'task_created', title, payload.deadline as string);
    }
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTask(uid: string, taskId: string, input: TaskInput): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  const today = getTodayVN();
  const title = sanitizeString(input.title, FIELD_LIMITS.taskTitleMax);
  if (!title) throw new Error('Task title is required.');

  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
      title,
      description: sanitizeString(input.description, FIELD_LIMITS.taskDescriptionMax),
      category: sanitizeString(input.category || 'Work', FIELD_LIMITS.taskCategoryMax) || 'Work',
      priority: input.priority,
      startDate: sanitizeDate(input.startDate, today),
      deadline: sanitizeDate(input.deadline, today),
      status: input.status,
      notes: sanitizeString(input.notes, FIELD_LIMITS.taskNotesMax),
      subtasks: sanitizeSubtasks(input.subtasks),
      recurrence: input.recurrence ?? 'none',
      estimatedMinutes: Math.max(0, Math.min(1440, Math.round(input.estimatedMinutes ?? 0))),
      timeBlockStart: sanitizeOptionalTime(input.timeBlockStart),
      reminderTime: sanitizeOptionalTime(input.reminderTime),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateTaskStatus(uid: string, taskId: string, status: TaskStatus): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
      status,
      updatedAt: serverTimestamp(),
    });
    if (status === 'completed') {
      void logActivity(uid, 'task_completed', taskId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateTaskSubtasks(uid: string, taskId: string, subtasks: TaskSubtask[]): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
      subtasks: sanitizeSubtasks(subtasks),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function carryForwardTasks(uid: string, tasksToCarry: Task[], targetDate: string): Promise<void> {
  const path = `users/${uid}/tasks`;
  if (tasksToCarry.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const task of tasksToCarry) {
      const ref = doc(db, 'users', uid, 'tasks', task.id);
      batch.update(ref, {
        startDate: task.startDate > targetDate ? targetDate : task.startDate,
        deadline: targetDate,
        carriedOverFrom: task.deadline,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- TRANSACTIONS ---
export function subscribeTransactions(uid: string, onData: (items: Transaction[]) => void): Unsubscribe {
  const path = `users/${uid}/transactions`;
  const q = query(collection(db, 'users', uid, 'transactions'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Transaction, 'id'>),
      }));
      items.sort((a, b) => b.date.localeCompare(a.date));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface TransactionInput {
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
}

export async function createTransaction(uid: string, input: TransactionInput): Promise<string> {
  const path = `users/${uid}/transactions`;
  const today = getTodayVN();
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > FIELD_LIMITS.transactionAmountMax) {
    throw new Error('Amount must be positive and valid.');
  }
  const description = sanitizeString(input.description, FIELD_LIMITS.transactionDescriptionMax);
  if (!description) throw new Error('Transaction description is required.');

  const payload: Record<string, unknown> = {
    userId: uid,
    type: input.type,
    amount,
    date: sanitizeDate(input.date, today),
    category: input.category,
    paymentMethod: input.paymentMethod,
    description,
    note: sanitizeString(input.note, FIELD_LIMITS.transactionNoteMax),
    isRecurring: Boolean(input.isRecurring),
    recurrenceInterval: input.isRecurring ? input.recurrenceInterval ?? 'monthly' : 'none',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.isDemo) {
    payload.isDemo = true;
  }

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'transactions'), payload);
    if (!input.isDemo) {
      void logActivity(uid, 'transaction_created', description, `${input.type}:${amount}`);
    }
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  uid: string,
  transactionId: string,
  input: TransactionInput
): Promise<void> {
  const path = `users/${uid}/transactions/${transactionId}`;
  const today = getTodayVN();
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > FIELD_LIMITS.transactionAmountMax) {
    throw new Error('Amount must be positive and valid.');
  }
  const description = sanitizeString(input.description, FIELD_LIMITS.transactionDescriptionMax);
  if (!description) throw new Error('Transaction description is required.');

  try {
    await updateDoc(doc(db, 'users', uid, 'transactions', transactionId), {
      type: input.type,
      amount,
      date: sanitizeDate(input.date, today),
      category: input.category,
      paymentMethod: input.paymentMethod,
      description,
      note: sanitizeString(input.note, FIELD_LIMITS.transactionNoteMax),
      isRecurring: Boolean(input.isRecurring),
      recurrenceInterval: input.isRecurring ? input.recurrenceInterval ?? 'monthly' : 'none',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(uid: string, transactionId: string): Promise<void> {
  const path = `users/${uid}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'transactions', transactionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- NOTES ---
export function subscribeNotes(uid: string, onData: (notes: Note[]) => void): Unsubscribe {
  const path = `users/${uid}/notes`;
  const q = query(collection(db, 'users', uid, 'notes'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Note[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Note, 'id'>),
      }));
      items.sort((a, b) => Number(b.pinned) - Number(a.pinned));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface NoteInput {
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
}

export async function createNote(uid: string, input: NoteInput): Promise<string> {
  const path = `users/${uid}/notes`;
  const title = sanitizeString(input.title, FIELD_LIMITS.noteTitleMax);
  if (!title) throw new Error('Note title is required.');

  const linkedTaskId =
    input.linkedTaskId && FIELD_LIMITS.idPattern.test(input.linkedTaskId)
      ? input.linkedTaskId
      : '';

  const payload: Record<string, unknown> = {
    userId: uid,
    title,
    content: input.content.slice(0, FIELD_LIMITS.noteContentMax),
    category: sanitizeString(input.category || 'Personal', FIELD_LIMITS.noteCategoryMax) || 'Personal',
    folder: sanitizeString(input.folder || '', FIELD_LIMITS.noteFolderMax),
    tags: sanitizeTags(input.tags),
    pinned: Boolean(input.pinned),
    archived: Boolean(input.archived),
    linkedTaskId,
    attachments: sanitizeAttachments(input.attachments),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.isDemo) {
    payload.isDemo = true;
  }

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'notes'), payload);
    if (!input.isDemo) {
      void logActivity(uid, 'note_saved', title);
    }
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateNote(uid: string, noteId: string, input: NoteInput): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  const title = sanitizeString(input.title, FIELD_LIMITS.noteTitleMax);
  if (!title) throw new Error('Note title is required.');

  const linkedTaskId =
    input.linkedTaskId && FIELD_LIMITS.idPattern.test(input.linkedTaskId)
      ? input.linkedTaskId
      : '';

  try {
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
      title,
      content: input.content.slice(0, FIELD_LIMITS.noteContentMax),
      category: sanitizeString(input.category || 'Personal', FIELD_LIMITS.noteCategoryMax) || 'Personal',
      folder: sanitizeString(input.folder || '', FIELD_LIMITS.noteFolderMax),
      tags: sanitizeTags(input.tags),
      pinned: Boolean(input.pinned),
      archived: Boolean(input.archived),
      linkedTaskId,
      attachments: sanitizeAttachments(input.attachments),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleNotePin(uid: string, noteId: string, pinned: boolean): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), {
      pinned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleNoteArchive(uid: string, noteId: string, archived: boolean): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    const payload: Record<string, unknown> = {
      archived,
      updatedAt: serverTimestamp(),
    };
    if (archived) {
      payload.pinned = false;
    }
    await updateDoc(doc(db, 'users', uid, 'notes', noteId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteNote(uid: string, noteId: string): Promise<void> {
  const path = `users/${uid}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notes', noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- GOALS ---
export function subscribeGoals(uid: string, onData: (goals: Goal[]) => void): Unsubscribe {
  const path = `users/${uid}/goals`;
  const q = query(collection(db, 'users', uid, 'goals'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Goal[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Goal, 'id'>),
      }));
      items.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface GoalInput {
  title: string;
  description: string;
  category: string;
  period: GoalPeriod;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  completed?: boolean;
  isDemo?: boolean;
}

export async function createGoal(uid: string, input: GoalInput): Promise<string> {
  const path = `users/${uid}/goals`;
  const today = getTodayVN();
  const title = sanitizeString(input.title, FIELD_LIMITS.goalTitleMax);
  if (!title) throw new Error('Goal title is required.');
  const targetValue = Math.max(1, Number(input.targetValue) || 1);
  const currentValue = Math.max(0, Number(input.currentValue) || 0);

  const payload: Record<string, unknown> = {
    userId: uid,
    title,
    description: sanitizeString(input.description, FIELD_LIMITS.goalDescriptionMax),
    category: sanitizeString(input.category || 'Productivity', 60) || 'Productivity',
    period: input.period,
    targetValue,
    currentValue,
    unit: sanitizeString(input.unit || '%', FIELD_LIMITS.goalUnitMax) || '%',
    startDate: sanitizeDate(input.startDate, today),
    targetDate: sanitizeDate(input.targetDate, addDaysToDateStr(today, 30)),
    completed: Boolean(input.completed ?? currentValue >= targetValue),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.isDemo) payload.isDemo = true;

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'goals'), payload);
    if (!input.isDemo) {
      void logActivity(uid, 'goal_updated', title);
    }
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateGoal(uid: string, goalId: string, input: GoalInput): Promise<void> {
  const path = `users/${uid}/goals/${goalId}`;
  const today = getTodayVN();
  const title = sanitizeString(input.title, FIELD_LIMITS.goalTitleMax);
  if (!title) throw new Error('Goal title is required.');
  const targetValue = Math.max(1, Number(input.targetValue) || 1);
  const currentValue = Math.max(0, Number(input.currentValue) || 0);

  try {
    await updateDoc(doc(db, 'users', uid, 'goals', goalId), {
      title,
      description: sanitizeString(input.description, FIELD_LIMITS.goalDescriptionMax),
      category: sanitizeString(input.category || 'Productivity', 60) || 'Productivity',
      period: input.period,
      targetValue,
      currentValue,
      unit: sanitizeString(input.unit || '%', FIELD_LIMITS.goalUnitMax) || '%',
      startDate: sanitizeDate(input.startDate, today),
      targetDate: sanitizeDate(input.targetDate, addDaysToDateStr(today, 30)),
      completed: Boolean(input.completed ?? currentValue >= targetValue),
      updatedAt: serverTimestamp(),
    });
    void logActivity(uid, 'goal_updated', title, `${currentValue}/${targetValue}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  const path = `users/${uid}/goals/${goalId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- HABITS ---
export function subscribeHabits(uid: string, onData: (habits: Habit[]) => void): Unsubscribe {
  const path = `users/${uid}/habits`;
  const q = query(collection(db, 'users', uid, 'habits'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Habit[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Habit, 'id'>),
      }));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export interface HabitInput {
  title: string;
  category: string;
  frequency: HabitFrequency;
  reminderTime?: string;
  completedDates?: string[];
  isDemo?: boolean;
}

export async function createHabit(uid: string, input: HabitInput): Promise<string> {
  const path = `users/${uid}/habits`;
  const title = sanitizeString(input.title, FIELD_LIMITS.habitTitleMax);
  if (!title) throw new Error('Habit title is required.');

  const payload: Record<string, unknown> = {
    userId: uid,
    title,
    category: sanitizeString(input.category || 'Health', 60) || 'Health',
    frequency: input.frequency,
    reminderTime: sanitizeOptionalTime(input.reminderTime),
    completedDates: Array.isArray(input.completedDates)
      ? input.completedDates.filter((d) => FIELD_LIMITS.datePattern.test(d)).slice(-400)
      : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.isDemo) payload.isDemo = true;

  try {
    const ref = await addDoc(collection(db, 'users', uid, 'habits'), payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateHabit(uid: string, habitId: string, input: HabitInput): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  const title = sanitizeString(input.title, FIELD_LIMITS.habitTitleMax);
  if (!title) throw new Error('Habit title is required.');

  try {
    await updateDoc(doc(db, 'users', uid, 'habits', habitId), {
      title,
      category: sanitizeString(input.category || 'Health', 60) || 'Health',
      frequency: input.frequency,
      reminderTime: sanitizeOptionalTime(input.reminderTime),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleHabitDate(uid: string, habit: Habit, dateStr: string): Promise<void> {
  const path = `users/${uid}/habits/${habit.id}`;
  const set = new Set(habit.completedDates || []);
  const willComplete = !set.has(dateStr);
  if (willComplete) {
    set.add(dateStr);
  } else {
    set.delete(dateStr);
  }
  const nextDates = Array.from(set).sort().slice(-400);
  try {
    await updateDoc(doc(db, 'users', uid, 'habits', habit.id), {
      completedDates: nextDates,
      updatedAt: serverTimestamp(),
    });
    if (willComplete) {
      void logActivity(uid, 'habit_checked', habit.title, dateStr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteHabit(uid: string, habitId: string): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'habits', habitId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- EXCHANGE RATES HISTORY ---
export function subscribeExchangeRates(
  uid: string,
  onData: (snapshots: ExchangeRateSnapshot[]) => void
): Unsubscribe {
  const path = `users/${uid}/exchangeRates`;
  const q = query(collection(db, 'users', uid, 'exchangeRates'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ExchangeRateSnapshot[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ExchangeRateSnapshot, 'id'>),
      }));
      items.sort((a, b) => b.date.localeCompare(a.date));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function saveExchangeRateSnapshot(
  uid: string,
  data: {
    date: string;
    rates: Record<string, number>;
    previousRates?: Record<string, number> | null;
    source: string;
    fetchedAt: string;
    scheduleTag?: '06:00_VN' | 'manual' | 'auto';
  }
): Promise<void> {
  const dateKey = sanitizeDate(data.date, getTodayVN());
  const path = `users/${uid}/exchangeRates/${dateKey}`;
  const ref = doc(db, 'users', uid, 'exchangeRates', dateKey);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      const createPayload: Record<string, unknown> = {
        userId: uid,
        date: dateKey,
        baseCurrency: 'VND',
        rates: data.rates,
        source: data.source.slice(0, 200),
        fetchedAt: data.fetchedAt.slice(0, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (data.previousRates) createPayload.previousRates = data.previousRates;
      if (data.scheduleTag) createPayload.scheduleTag = data.scheduleTag;
      await setDoc(ref, createPayload);
    } else {
      const updatePayload: Record<string, unknown> = {
        rates: data.rates,
        source: data.source.slice(0, 200),
        fetchedAt: data.fetchedAt.slice(0, 64),
        updatedAt: serverTimestamp(),
      };
      if (data.previousRates) updatePayload.previousRates = data.previousRates;
      if (data.scheduleTag) updatePayload.scheduleTag = data.scheduleTag;
      await updateDoc(ref, updatePayload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- REPORTS ---
export function subscribeReports(uid: string, onData: (reports: SavedReport[]) => void): Unsubscribe {
  const path = `users/${uid}/reports`;
  const q = query(collection(db, 'users', uid, 'reports'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedReport[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedReport, 'id'>),
      }));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function saveReportInsights(
  uid: string,
  periodType: ReportPeriodType,
  dateKey: string,
  aiInsights: string
): Promise<void> {
  const reportId = `${periodType}_${dateKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `users/${uid}/reports/${reportId}`;
  const ref = doc(db, 'users', uid, 'reports', reportId);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        userId: uid,
        periodType,
        dateKey,
        aiInsights: aiInsights.slice(0, 15000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        aiInsights: aiInsights.slice(0, 15000),
        updatedAt: serverTimestamp(),
      });
    }
    void logActivity(uid, 'report_generated', `${periodType} · ${dateKey}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// --- DEMO DATA & BACKUP ---
export async function seedDemoData(uid: string): Promise<void> {
  const today = getTodayVN();
  const yesterday = addDaysToDateStr(today, -1);
  const tomorrow = addDaysToDateStr(today, 1);
  const twoDaysLater = addDaysToDateStr(today, 2);

  const demoTasks: TaskInput[] = [
    {
      title: '[Sample] Finalize weekly progress review',
      description: 'Consolidate sprint metrics and send summary notes.',
      category: 'Work',
      priority: 'high',
      startDate: today,
      deadline: today,
      status: 'in_progress',
      notes: 'Double check timeline checkpoints before 17:00.',
      timeBlockStart: '09:30',
      estimatedMinutes: 60,
      reminderTime: '09:15',
      recurrence: 'weekly',
      subtasks: [
        { id: 's1', title: 'Export task completion stats', completed: true },
        { id: 's2', title: 'Highlight overdue items', completed: false },
      ],
      isDemo: true,
    },
    {
      title: '[Sample] Pay electricity & fiber internet bills',
      description: 'Monthly recurring household utility transfer.',
      category: 'Finance',
      priority: 'urgent',
      startDate: yesterday,
      deadline: yesterday,
      status: 'todo',
      notes: 'Save receipt screenshot after payment.',
      timeBlockStart: '11:00',
      estimatedMinutes: 15,
      recurrence: 'monthly',
      isDemo: true,
    },
    {
      title: '[Sample] 30-min personal finance reading',
      description: 'Read chapter 4 and summarize key takeaways.',
      category: 'Learning',
      priority: 'medium',
      startDate: today,
      deadline: today,
      status: 'completed',
      notes: 'Completed during morning routine.',
      timeBlockStart: '07:30',
      estimatedMinutes: 30,
      isDemo: true,
    },
    {
      title: '[Sample] Prepare weekly planning agenda',
      description: 'Outline 3 priority outcomes for next week.',
      category: 'Work',
      priority: 'medium',
      startDate: today,
      deadline: tomorrow,
      status: 'todo',
      notes: '',
      timeBlockStart: '14:00',
      estimatedMinutes: 45,
      isDemo: true,
    },
    {
      title: '[Sample] Annual health checkup booking',
      description: 'Schedule morning lab appointment at clinic.',
      category: 'Health',
      priority: 'low',
      startDate: today,
      deadline: twoDaysLater,
      status: 'on_hold',
      notes: 'Waiting for clinic confirmation.',
      estimatedMinutes: 20,
      isDemo: true,
    },
  ];

  const createdTaskIds: string[] = [];
  for (const t of demoTasks) {
    const id = await createTask(uid, t);
    createdTaskIds.push(id);
  }

  const demoTransactions: TransactionInput[] = [
    {
      type: 'income',
      amount: 22_000_000,
      date: `${today.slice(0, 7)}-05`,
      category: 'salary',
      paymentMethod: 'bank_transfer',
      description: '[Sample] Monthly salary deposit',
      note: 'Direct bank payroll',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      isDemo: true,
    },
    {
      type: 'expense',
      amount: 145_000,
      date: today,
      category: 'food',
      paymentMethod: 'e_wallet',
      description: '[Sample] Lunch & artisanal coffee',
      note: 'Paid via e-wallet',
      isDemo: true,
    },
    {
      type: 'expense',
      amount: 85_000,
      date: today,
      category: 'transportation',
      paymentMethod: 'cash',
      description: '[Sample] Fuel refill',
      note: '',
      isDemo: true,
    },
    {
      type: 'expense',
      amount: 1_250_000,
      date: yesterday,
      category: 'bills',
      paymentMethod: 'bank_transfer',
      description: '[Sample] Electricity & water utilities',
      note: 'Monthly recurring bill',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      isDemo: true,
    },
    {
      type: 'expense',
      amount: 420_000,
      date: addDaysToDateStr(today, -3),
      category: 'education',
      paymentMethod: 'bank_transfer',
      description: '[Sample] Design & strategy book',
      note: '',
      isDemo: true,
    },
  ];

  for (const tx of demoTransactions) {
    await createTransaction(uid, tx);
  }

  const demoNotes: NoteInput[] = [
    {
      title: '[Sample] 50/30/20 Personal Budget Blueprint',
      content:
        '# Allocation Rules\n- **50%** Essentials (housing, utilities, groceries)\n- **30%** Lifestyle & dining\n- **20%** Savings & emergency buffer\n- [x] Configure monthly alert threshold in Settings',
      category: 'Finance',
      folder: 'Finance & Wealth',
      tags: ['sample', 'budget'],
      pinned: true,
      linkedTaskId: '',
      isDemo: true,
    },
    {
      title: '[Sample] Weekly Review Checklist',
      content:
        '- [x] Gather completed task metrics\n- [ ] Carry forward unfinished items\n- [ ] Export bilingual PDF summary',
      category: 'Work',
      folder: 'Work Operations',
      tags: ['sample', 'review'],
      pinned: false,
      linkedTaskId: createdTaskIds[0] || '',
      isDemo: true,
    },
  ];

  for (const n of demoNotes) {
    await createNote(uid, n);
  }

  await createGoal(uid, {
    title: '[Sample] Read 12 Books This Year',
    description: 'Build a steady evening reading rhythm across finance and design.',
    category: 'Learning',
    period: 'yearly',
    targetValue: 12,
    currentValue: 5,
    unit: 'books',
    startDate: `${today.slice(0, 4)}-01-01`,
    targetDate: `${today.slice(0, 4)}-12-31`,
    isDemo: true,
  });

  await createGoal(uid, {
    title: '[Sample] Monthly Emergency Reserve',
    description: 'Set aside consistent monthly savings.',
    category: 'Finance',
    period: 'monthly',
    targetValue: 5,
    currentValue: 3.5,
    unit: 'M VND',
    startDate: `${today.slice(0, 7)}-01`,
    targetDate: addDaysToDateStr(`${today.slice(0, 7)}-01`, 29),
    isDemo: true,
  });

  await createHabit(uid, {
    title: '[Sample] Morning Hydration & 15-min Stretch',
    category: 'Health',
    frequency: 'daily',
    reminderTime: '07:00',
    completedDates: [
      addDaysToDateStr(today, -4),
      addDaysToDateStr(today, -3),
      addDaysToDateStr(today, -2),
      yesterday,
    ],
    isDemo: true,
  });

  await createHabit(uid, {
    title: '[Sample] Deep Focus Work Block (90m)',
    category: 'Productivity',
    frequency: 'daily',
    reminderTime: '09:00',
    completedDates: [addDaysToDateStr(today, -2), yesterday, today],
    isDemo: true,
  });
}

export async function clearDemoData(uid: string): Promise<number> {
  let deleted = 0;
  const subcollections = ['tasks', 'transactions', 'notes', 'goals', 'habits'] as const;

  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const q = query(collection(db, 'users', uid, sub), where('userId', '==', uid));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let countInBatch = 0;
      for (const d of snap.docs) {
        if (d.data()?.isDemo === true) {
          batch.delete(d.ref);
          countInBatch++;
          deleted++;
        }
      }
      if (countInBatch > 0) {
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
  return deleted;
}

export interface BackupPayload {
  app: 'Daily Hub';
  version: 1 | 2;
  exportedAt: string;
  timezone: 'Asia/Ho_Chi_Minh';
  profile: {
    monthlyBudget: number;
    budgetAlertThreshold: number;
    savingsGoalMonthly?: number;
  };
  tasks: TaskInput[];
  transactions: TransactionInput[];
  notes: NoteInput[];
  goals?: GoalInput[];
  habits?: HabitInput[];
}

export async function restoreBackupData(uid: string, backup: BackupPayload): Promise<{
  tasksCount: number;
  transactionsCount: number;
  notesCount: number;
  goalsCount: number;
  habitsCount: number;
}> {
  if (backup.app !== 'Daily Hub') {
    throw new Error('Invalid Daily Hub backup file.');
  }

  if (backup.profile && typeof backup.profile.monthlyBudget === 'number') {
    await updateUserSettings(uid, {
      monthlyBudget: backup.profile.monthlyBudget,
      budgetAlertThreshold: backup.profile.budgetAlertThreshold || 80,
      savingsGoalMonthly: backup.profile.savingsGoalMonthly,
    });
  }

  let tasksCount = 0;
  let transactionsCount = 0;
  let notesCount = 0;
  let goalsCount = 0;
  let habitsCount = 0;

  if (Array.isArray(backup.tasks)) {
    for (const t of backup.tasks.slice(0, 200)) {
      if (t && typeof t.title === 'string' && t.title.trim()) {
        await createTask(uid, {
          title: t.title,
          description: t.description || '',
          category: t.category || 'Work',
          priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
          startDate: t.startDate || getTodayVN(),
          deadline: t.deadline || getTodayVN(),
          status: ['todo', 'in_progress', 'completed', 'on_hold'].includes(t.status) ? t.status : 'todo',
          notes: t.notes || '',
          subtasks: t.subtasks,
          recurrence: t.recurrence,
          estimatedMinutes: t.estimatedMinutes,
          timeBlockStart: t.timeBlockStart,
          reminderTime: t.reminderTime,
        });
        tasksCount++;
      }
    }
  }

  if (Array.isArray(backup.transactions)) {
    for (const tx of backup.transactions.slice(0, 500)) {
      if (tx && typeof tx.amount === 'number' && tx.amount > 0 && typeof tx.description === 'string') {
        await createTransaction(uid, {
          type: tx.type === 'income' ? 'income' : 'expense',
          amount: tx.amount,
          date: tx.date || getTodayVN(),
          category: [
            'food',
            'transportation',
            'shopping',
            'education',
            'bills',
            'entertainment',
            'health',
            'salary',
            'other',
          ].includes(tx.category)
            ? tx.category
            : 'other',
          paymentMethod: ['cash', 'bank_transfer', 'e_wallet'].includes(tx.paymentMethod)
            ? tx.paymentMethod
            : 'cash',
          description: tx.description,
          note: tx.note || '',
          isRecurring: tx.isRecurring,
          recurrenceInterval: tx.recurrenceInterval,
        });
        transactionsCount++;
      }
    }
  }

  if (Array.isArray(backup.notes)) {
    for (const n of backup.notes.slice(0, 200)) {
      if (n && typeof n.title === 'string' && n.title.trim()) {
        await createNote(uid, {
          title: n.title,
          content: n.content || '',
          category: n.category || 'Personal',
          folder: n.folder || '',
          tags: Array.isArray(n.tags) ? n.tags.map(String) : [],
          pinned: Boolean(n.pinned),
          archived: Boolean(n.archived),
          linkedTaskId: '',
          attachments: n.attachments,
        });
        notesCount++;
      }
    }
  }

  if (Array.isArray(backup.goals)) {
    for (const g of backup.goals.slice(0, 100)) {
      if (g && typeof g.title === 'string' && g.title.trim()) {
        await createGoal(uid, {
          title: g.title,
          description: g.description || '',
          category: g.category || 'Productivity',
          period: ['weekly', 'monthly', 'quarterly', 'yearly'].includes(g.period) ? g.period : 'monthly',
          targetValue: Number(g.targetValue) || 1,
          currentValue: Number(g.currentValue) || 0,
          unit: g.unit || '%',
          startDate: g.startDate || getTodayVN(),
          targetDate: g.targetDate || addDaysToDateStr(getTodayVN(), 30),
          completed: Boolean(g.completed),
        });
        goalsCount++;
      }
    }
  }

  if (Array.isArray(backup.habits)) {
    for (const h of backup.habits.slice(0, 100)) {
      if (h && typeof h.title === 'string' && h.title.trim()) {
        await createHabit(uid, {
          title: h.title,
          category: h.category || 'Health',
          frequency: h.frequency === 'weekly' ? 'weekly' : 'daily',
          reminderTime: h.reminderTime,
          completedDates: Array.isArray(h.completedDates) ? h.completedDates : [],
        });
        habitsCount++;
      }
    }
  }

  return { tasksCount, transactionsCount, notesCount, goalsCount, habitsCount };
}
