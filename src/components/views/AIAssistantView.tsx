import { useState, type FormEvent } from 'react';
import { Bot, Check, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import type {
  AIProposedAction,
  ExchangeRateSnapshot,
  Goal,
  Habit,
  Note,
  Task,
  Transaction,
  UserProfile,
} from '../../types';
import { askAIAssistant, type AssistantChatMessage } from '../../services/apiService';
import { createNote, createTask, updateTaskStatus } from '../../services/firestoreService';
import { getTodayVN } from '../../utils/date';
import { RichTextRenderer } from '../RichTextRenderer';
import { useI18n } from '../../i18n/LanguageContext';

interface AIAssistantViewProps {
  uid: string;
  profile: UserProfile | null;
  tasks: Task[];
  transactions: Transaction[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  latestRate: ExchangeRateSnapshot | null;
  onNotify: (msg: string) => void;
}

interface ChatTurn extends AssistantChatMessage {
  proposedActions?: AIProposedAction[];
  confirmedIndices?: number[];
}

export function AIAssistantView({
  uid,
  profile,
  tasks,
  transactions,
  notes,
  goals,
  habits,
  latestRate,
  onNotify,
}: AIAssistantViewProps) {
  const { lang, t } = useI18n();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const historyForApi: AssistantChatMessage[] = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, { role: 'user', text: clean }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAIAssistant({
        language: lang,
        message: clean,
        history: historyForApi,
        tasks,
        transactions,
        notes,
        goals,
        habits,
        latestRate,
        monthlyBudget: profile?.monthlyBudget ?? 15_000_000,
        budgetAlertThreshold: profile?.budgetAlertThreshold ?? 80,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          proposedActions: res.proposedActions,
          confirmedIndices: [],
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error';
      setMessages((prev) => [...prev, { role: 'assistant', text: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgIdx: number, actionIdx: number, action: AIProposedAction) => {
    const today = getTodayVN();
    if (action.type === 'create_task') {
      await createTask(uid, {
        title: action.title || action.label,
        description: action.description || '',
        category: action.category || 'Work',
        priority: action.priority || 'medium',
        startDate: today,
        deadline: action.deadline || today,
        status: 'todo',
        notes: '',
        estimatedMinutes: action.estimatedMinutes,
        timeBlockStart: action.timeBlockStart,
      });
    } else if (action.type === 'complete_task' && action.taskId) {
      await updateTaskStatus(uid, action.taskId, 'completed');
    } else if (action.type === 'create_note') {
      await createNote(uid, {
        title: action.title || action.label,
        content: action.description || '',
        category: action.category || 'Personal',
        tags: [],
        pinned: false,
      });
    }

    setMessages((prev) =>
      prev.map((m, idx) =>
        idx === msgIdx
          ? { ...m, confirmedIndices: [...(m.confirmedIndices || []), actionIdx] }
          : m
      )
    );
    onNotify(t.aiAssistant.actionConfirmed);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const quickPrompts = [
    t.aiAssistant.prompts.schedule,
    t.aiAssistant.prompts.spending,
    t.aiAssistant.prompts.summarizeNotes,
    t.aiAssistant.prompts.draftTask,
    t.aiAssistant.prompts.currencyTrend,
    t.aiAssistant.prompts.dailyReport,
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.aiAssistant.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.aiAssistant.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E8DFD6] text-[#55443F] hover:bg-[#F7ECEC] inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.aiAssistant.clearChat}
          </button>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => void sendMessage(p)}
            disabled={loading}
            className="text-left p-3 rounded-xl bg-white border border-[#E8DFD6] hover:border-[#A77C78] hover:bg-[#FCF9F6] text-xs text-[#55443F] transition-colors flex items-start gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#A77C78] shrink-0 mt-0.5" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Stream */}
      <div className="dh-card p-5 space-y-4 min-h-[380px] max-h-[540px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FCF9F6] border border-[#EFE7DF]">
            <div className="w-8 h-8 rounded-xl bg-[#EBCFD0] text-[#55443F] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-sm text-[#55443F] leading-relaxed">
              <p>{t.aiAssistant.welcomeMessage}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-[#EDF1EA] text-[#5B6B52] font-semibold">
                  [{t.aiAssistant.factBadge}]
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#F7ECEC] text-[#A77C78] font-semibold">
                  [{t.aiAssistant.suggestionBadge}]
                </span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, msgIdx) => (
            <div key={msgIdx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl p-4 ${
                  m.role === 'user'
                    ? 'bg-[#55443F] text-[#F8F5F0] text-sm'
                    : 'bg-[#FCF9F6] border border-[#E8DFD6] text-[#55443F]'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                ) : (
                  <div className="space-y-3">
                    <RichTextRenderer content={m.text} />
                    {m.proposedActions && m.proposedActions.length > 0 && (
                      <div className="pt-3 border-t border-[#E8DFD6] space-y-2">
                        {m.proposedActions.map((act, actionIdx) => {
                          const confirmed = m.confirmedIndices?.includes(actionIdx);
                          return (
                            <div
                              key={actionIdx}
                              className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#E8DFD6] text-xs"
                            >
                              <span className="font-medium text-[#55443F]">{act.label}</span>
                              {confirmed ? (
                                <span className="inline-flex items-center gap-1 text-[#5B6B52] font-semibold">
                                  <Check className="w-3.5 h-3.5" />
                                  {t.aiAssistant.actionConfirmed}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleConfirmAction(msgIdx, actionIdx, act)}
                                  className="dh-btn-accent px-3 py-1 text-[11px] font-semibold"
                                >
                                  {t.aiAssistant.confirmActionBtn}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#7F6D67] px-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#A77C78]" />
            <span>{t.aiAssistant.thinking}</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.aiAssistant.placeholder}
          className="dh-input flex-1 px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="dh-btn-primary px-5 py-3 text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{t.aiAssistant.send}</span>
        </button>
      </form>
    </div>
  );
}
