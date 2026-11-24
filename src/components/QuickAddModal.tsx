import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  NOTE_CATEGORY_KEYS,
  TASK_CATEGORY_KEYS,
  type PaymentMethod,
  type Task,
  type TaskPriority,
  type TransactionCategory,
  type TransactionType,
} from '../types';
import { createNote, createTask, createTransaction } from '../services/firestoreService';
import { getTodayVN } from '../utils/date';
import { useI18n } from '../i18n/LanguageContext';

interface QuickAddModalProps {
  uid: string;
  mode: 'task' | 'transaction' | 'note';
  tasks: Task[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function QuickAddModal({ uid, mode, tasks, onClose, onSuccess }: QuickAddModalProps) {
  const { lang, t } = useI18n();
  const today = getTodayVN();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<string>(TASK_CATEGORY_KEYS[0]);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDeadline, setTaskDeadline] = useState(today);
  const [taskTimeBlock, setTaskTimeBlock] = useState('');
  const [taskEstimatedMin, setTaskEstimatedMin] = useState('30');
  const [taskDesc, setTaskDesc] = useState('');

  // Transaction fields
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(today);
  const [txCategory, setTxCategory] = useState<TransactionCategory>('food');
  const [txMethod, setTxMethod] = useState<PaymentMethod>('e_wallet');
  const [txDesc, setTxDesc] = useState('');

  // Note fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<string>(NOTE_CATEGORY_KEYS[0]);
  const [noteContent, setNoteContent] = useState('');
  const [noteLinkedTaskId, setNoteLinkedTaskId] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (mode === 'task') {
        if (!taskTitle.trim()) {
          throw new Error(t.common.requiredField);
        }
        await createTask(uid, {
          title: taskTitle,
          description: taskDesc,
          category: taskCategory,
          priority: taskPriority,
          startDate: today,
          deadline: taskDeadline,
          status: 'todo',
          notes: '',
          timeBlockStart: taskTimeBlock,
          estimatedMinutes: Number(taskEstimatedMin) || 0,
        });
        onSuccess(lang === 'en' ? 'New task added.' : 'Đã thêm công việc mới.');
      } else if (mode === 'transaction') {
        const numericAmount = Number(txAmount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !txDesc.trim()) {
          throw new Error(t.common.requiredField);
        }
        await createTransaction(uid, {
          type: txType,
          amount: numericAmount,
          date: txDate,
          category: txCategory,
          paymentMethod: txMethod,
          description: txDesc,
          note: '',
        });
        onSuccess(lang === 'en' ? 'Transaction recorded.' : 'Đã ghi nhận giao dịch mới.');
      } else {
        if (!noteTitle.trim()) {
          throw new Error(t.common.requiredField);
        }
        await createNote(uid, {
          title: noteTitle,
          content: noteContent,
          category: noteCategory,
          tags: [],
          pinned: false,
          linkedTaskId: noteLinkedTaskId,
        });
        onSuccess(lang === 'en' ? 'Note saved.' : 'Đã lưu ghi chú mới.');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.requiredField);
    } finally {
      setSaving(false);
    }
  };

  const titleText =
    mode === 'task'
      ? t.tasks.addTask
      : mode === 'transaction'
      ? t.expenses.addTransaction
      : t.notes.newNote;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#55443F]/35 backdrop-blur-[2px]">
      <div className="bg-white border border-[#E8DFD6] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8DFD6] bg-[#FCF9F6] flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#55443F]">{titleText}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#7F6D67] hover:text-[#55443F] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#F7ECEC] border border-[#EBCFD0] text-xs text-[#55443F]">
              {error}
            </div>
          )}

          {mode === 'task' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.tasks.titleLabel} *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.categoryLabel}
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {TASK_CATEGORY_KEYS.map((c) => (
                      <option key={c} value={c}>
                        {t.taskCategories[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.priorityLabel}
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {t.taskPriority[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.deadlineLabel}
                  </label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="dh-input w-full px-2.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.timeBlockLabel}
                  </label>
                  <input
                    type="time"
                    value={taskTimeBlock}
                    onChange={(e) => setTaskTimeBlock(e.target.value)}
                    className="dh-input w-full px-2.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.tasks.durationLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={taskEstimatedMin}
                    onChange={(e) => setTaskEstimatedMin(e.target.value)}
                    className="dh-input w-full px-2.5 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.tasks.descLabel}
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={2}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {mode === 'transaction' && (
            <>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F3EDE6] rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    txType === 'expense' ? 'bg-white text-[#A77C78] shadow-xs' : 'text-[#7F6D67]'
                  }`}
                >
                  {t.expenses.expense}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    txType === 'income' ? 'bg-white text-[#5B6B52] shadow-xs' : 'text-[#7F6D67]'
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
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm font-mono"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.dateLabel}
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
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
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as TransactionCategory)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(Object.keys(t.transactionCategories) as TransactionCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {t.transactionCategories[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.expenses.paymentMethodLabel}
                  </label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as PaymentMethod)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {(Object.keys(t.paymentMethods) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {t.paymentMethods[m]}
                      </option>
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
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  required
                />
              </div>
            </>
          )}

          {mode === 'note' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  {t.notes.titlePlaceholder} *
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="dh-input w-full px-3 py-2 text-sm"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.notes.categoryLabel}
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    {NOTE_CATEGORY_KEYS.map((cat) => (
                      <option key={cat} value={cat}>
                        {t.noteCategories[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                    {t.notes.linkedTaskLabel}
                  </label>
                  <select
                    value={noteLinkedTaskId}
                    onChange={(e) => setNoteLinkedTaskId(e.target.value)}
                    className="dh-input w-full px-3 py-2 text-sm"
                  >
                    <option value="">{t.common.none}</option>
                    {tasks.slice(0, 30).map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                  Markdown
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  className="dh-input w-full px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#7F6D67] bg-[#F8F5F0] border border-[#E8DFD6] rounded-xl hover:bg-[#EDE4DC]"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-[#F8F5F0] bg-[#55443F] rounded-xl hover:bg-[#433531] disabled:opacity-60"
            >
              {saving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
