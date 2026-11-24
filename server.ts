import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig: FirebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const TARGET_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'AUD', 'SGD', 'THB'] as const;

interface AuthenticatedRequest extends express.Request {
  authUser?: {
    uid: string;
    email?: string;
    emailVerified: boolean;
  };
}

function getTodayVN(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getHourMinuteVN(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

function getYesterdayVN(todayStr: string): string {
  return addDaysToDateStr(todayStr, -1);
}

async function verifyFirebaseAuth(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid authentication token.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      audience: firebaseConfig.projectId,
    });

    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const emailVerified = payload.email_verified === true;

    if (!uid || !emailVerified) {
      res.status(403).json({ error: 'Verified email account required.' });
      return;
    }

    req.authUser = { uid, email, emailVerified };
    next();
  } catch (err) {
    console.error('Token verification failed:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Session expired or invalid.' });
  }
}

interface ExchangeRateCache {
  date: string;
  effectiveDate: string;
  fetchedAt: string;
  source: string;
  scheduleTag: '06:00_VN' | 'manual' | 'auto';
  stale: boolean;
  rates: Record<string, number>;
  previousRates: Record<string, number> | null;
  previousDate: string;
  previousSource: string | null;
}

let exchangeRateCache: ExchangeRateCache | null = null;
let exchangeRateCacheTimestamp = 0;
let lastManualRefreshMs = 0;
let lastScheduledRunDate: string | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MANUAL_RATE_LIMIT_MS = 15 * 1000;

interface HistoryPoint {
  date: string;
  rate: number | null;
}

const historyCache = new Map<string, { fetchedAtMs: number; points: HistoryPoint[]; source: string }>();
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000;

function computeVndRatesFromUsdBase(usdRates: Record<string, number>): Record<string, number> | null {
  const vndPerUsd = usdRates['VND'] ?? usdRates['vnd'];
  if (typeof vndPerUsd !== 'number' || !Number.isFinite(vndPerUsd) || vndPerUsd <= 0) {
    return null;
  }

  const result: Record<string, number> = {};
  for (const code of TARGET_CURRENCIES) {
    if (code === 'USD') {
      result.USD = Math.round(vndPerUsd * 100) / 100;
    } else {
      const rateVsUsd = usdRates[code] ?? usdRates[code.toLowerCase()];
      if (typeof rateVsUsd === 'number' && Number.isFinite(rateVsUsd) && rateVsUsd > 0) {
        result[code] = Math.round((vndPerUsd / rateVsUsd) * 100) / 100;
      }
    }
  }
  return Object.keys(result).length === TARGET_CURRENCIES.length ? result : null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url: string, timeoutMs = 8000, maxRetries = 2): Promise<unknown> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (resp.status === 429) {
        throw new Error(`HTTP 429 rate limited from ${url}`);
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} from ${url}`);
      }
      return await resp.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(300 * Math.pow(2, attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Failed fetching ${url}`);
}

async function fetchLiveUsdRates(): Promise<{
  rates: Record<string, number>;
  source: string;
  fetchedAt: string;
}> {
  const customApiKey = process.env.EXCHANGE_RATE_API_KEY?.trim();
  if (customApiKey) {
    try {
      const data = (await fetchJsonWithRetry(
        `https://v6.exchangerate-api.com/v6/${encodeURIComponent(customApiKey)}/latest/USD`,
        8000,
        2
      )) as { result?: string; conversion_rates?: Record<string, number> };
      if (data.result === 'success' && data.conversion_rates) {
        const computed = computeVndRatesFromUsdBase(data.conversion_rates);
        if (computed) {
          return {
            rates: computed,
            source: 'ExchangeRate-API v6 (exchangerate-api.com)',
            fetchedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('ExchangeRate-API v6 fallback triggered:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const data = (await fetchJsonWithRetry('https://open.er-api.com/v6/latest/USD', 8000, 2)) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result === 'success' && data.rates) {
      const computed = computeVndRatesFromUsdBase(data.rates);
      if (computed) {
        return {
          rates: computed,
          source: 'Open Exchange Rates API (open.er-api.com)',
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('open.er-api.com failed:', err instanceof Error ? err.message : err);
  }

  const fallbackData = (await fetchJsonWithRetry(
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    8000,
    2
  )) as { usd?: Record<string, number> };
  if (fallbackData.usd) {
    const computed = computeVndRatesFromUsdBase(fallbackData.usd);
    if (computed) {
      return {
        rates: computed,
        source: 'Fawazahmed0 Currency API (jsdelivr CDN)',
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  throw new Error('Unable to connect to live exchange rate providers.');
}

async function fetchHistoricalUsdRates(dateStr: string): Promise<{
  rates: Record<string, number> | null;
  source: string | null;
}> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`,
    `https://${dateStr}.currency-api.pages.dev/v1/currencies/usd.json`,
  ];

  for (const url of urls) {
    try {
      const data = (await fetchJsonWithRetry(url, 5500, 1)) as { usd?: Record<string, number> };
      if (data.usd) {
        const computed = computeVndRatesFromUsdBase(data.usd);
        if (computed) {
          return {
            rates: computed,
            source: 'Fawazahmed0 Historical Currency API',
          };
        }
      }
    } catch {
      // Try next historical source
    }
  }

  return { rates: null, source: null };
}

async function refreshExchangeCacheInternal(scheduleTag: '06:00_VN' | 'manual' | 'auto'): Promise<ExchangeRateCache> {
  const today = getTodayVN();
  const yesterday = getYesterdayVN(today);
  const [live, historical] = await Promise.all([
    fetchLiveUsdRates(),
    fetchHistoricalUsdRates(yesterday),
  ]);

  const payload: ExchangeRateCache = {
    date: today,
    effectiveDate: today,
    fetchedAt: live.fetchedAt,
    source: live.source,
    scheduleTag,
    stale: false,
    rates: live.rates,
    previousRates: historical.rates,
    previousDate: yesterday,
    previousSource: historical.source,
  };

  exchangeRateCache = payload;
  exchangeRateCacheTimestamp = Date.now();
  return payload;
}

// Background daily 06:00 Asia/Ho_Chi_Minh scheduler
function startDailyRateScheduler(): void {
  const checkSchedule = async () => {
    const today = getTodayVN();
    const { hour } = getHourMinuteVN();
    if (hour >= 6 && lastScheduledRunDate !== today) {
      lastScheduledRunDate = today;
      try {
        await refreshExchangeCacheInternal('06:00_VN');
        console.log(`[Scheduler 06:00 Asia/Ho_Chi_Minh] Daily exchange rates updated for ${today}`);
      } catch (err) {
        console.warn('[Scheduler 06:00 Asia/Ho_Chi_Minh] Exchange rate refresh failed:', err instanceof Error ? err.message : err);
      }
    }
  };
  void checkSchedule();
  setInterval(() => {
    void checkSchedule();
  }, 5 * 60 * 1000);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
app.use(express.json({ limit: '1.5mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    timeZone: 'Asia/Ho_Chi_Minh',
    date: getTodayVN(),
    scheduler: '06:00 Asia/Ho_Chi_Minh',
  });
});

app.get('/api/exchange-rates', verifyFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const force = req.query.force === 'true';
  const today = getTodayVN();
  const now = Date.now();

  if (force && now - lastManualRefreshMs < MANUAL_RATE_LIMIT_MS && exchangeRateCache) {
    res.json(exchangeRateCache);
    return;
  }

  if (
    !force &&
    exchangeRateCache &&
    exchangeRateCache.date === today &&
    now - exchangeRateCacheTimestamp < CACHE_TTL_MS
  ) {
    res.json(exchangeRateCache);
    return;
  }

  try {
    if (force) lastManualRefreshMs = now;
    const payload = await refreshExchangeCacheInternal(force ? 'manual' : 'auto');
    res.json(payload);
  } catch (err) {
    console.error('Exchange rate fetch error:', err);
    if (exchangeRateCache) {
      // Preserve last-valid data, explicitly marked as stale rather than substituting synthetic numbers
      res.json({
        ...exchangeRateCache,
        stale: true,
      });
      return;
    }
    res.status(503).json({
      unavailable: true,
      error: 'Unable to connect to live exchange rate providers. Please retry later.',
    });
  }
});

app.get('/api/exchange-rates/history', verifyFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  const currencyRaw = String(req.query.currency || 'USD').toUpperCase();
  const currency = TARGET_CURRENCIES.includes(currencyRaw as (typeof TARGET_CURRENCIES)[number])
    ? currencyRaw
    : 'USD';
  const daysRaw = Number(req.query.days || 30);
  const days = daysRaw === 7 || daysRaw === 30 || daysRaw === 90 ? daysRaw : 30;

  const cacheKey = `${currency}_${days}`;
  const cached = historyCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAtMs < HISTORY_CACHE_TTL_MS) {
    res.json({
      currency,
      days,
      source: cached.source,
      points: cached.points,
    });
    return;
  }

  const today = getTodayVN();
  // Sample every day for 7d/30d, every 3 days for 90d to keep upstream API traffic fast & respectful
  const step = days === 90 ? 3 : 1;
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= step) {
    dates.push(addDaysToDateStr(today, -offset));
  }
  if (dates[dates.length - 1] !== today) {
    dates.push(today);
  }

  const points: HistoryPoint[] = new Array(dates.length);
  const CONCURRENCY = 6;
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const chunk = dates.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (dateStr, idx) => {
        if (dateStr === today && exchangeRateCache?.date === today && typeof exchangeRateCache.rates[currency] === 'number') {
          points[i + idx] = { date: dateStr, rate: exchangeRateCache.rates[currency] };
          return;
        }
        const hist = await fetchHistoricalUsdRates(dateStr);
        const val = hist.rates && typeof hist.rates[currency] === 'number' ? hist.rates[currency] : null;
        points[i + idx] = { date: dateStr, rate: val };
      })
    );
  }

  const validPoints = points.filter((p) => p && typeof p.rate === 'number');
  if (validPoints.length === 0) {
    res.status(503).json({
      unavailable: true,
      error: 'Historical exchange rate data is temporarily unavailable.',
    });
    return;
  }

  const source = 'Fawazahmed0 Historical Currency API';
  historyCache.set(cacheKey, {
    fetchedAtMs: Date.now(),
    points,
    source,
  });

  res.json({
    currency,
    days,
    source,
    points,
  });
});

interface AssistantContextPayload {
  language?: 'vi' | 'en';
  today: string;
  nowVN: string;
  monthlyBudget: number;
  budgetAlertThreshold: number;
  tasks: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    startDate: string;
    deadline: string;
    status: string;
    estimatedMinutes?: number;
    timeBlockStart?: string;
    subtasksTotal?: number;
    subtasksDone?: number;
  }>;
  transactions: Array<{
    type: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: string;
    description: string;
  }>;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    pinned: boolean;
    linkedTaskId?: string;
  }>;
  goals?: Array<{
    id: string;
    title: string;
    category: string;
    progress: number;
    targetDate: string;
    period: string;
  }>;
  habits?: Array<{
    id: string;
    title: string;
    category: string;
    frequency: string;
    streak: number;
    completedToday: boolean;
  }>;
  exchangeRates?: {
    date: string;
    source: string;
    rates: Record<string, number>;
    previousRates?: Record<string, number> | null;
  } | null;
}

app.post('/api/ai/assistant', verifyFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as {
      language?: unknown;
      message?: unknown;
      history?: unknown;
      context?: unknown;
    };

    const lang: 'vi' | 'en' = body.language === 'en' ? 'en' : 'vi';

    if (typeof body.message !== 'string' || body.message.trim().length === 0 || body.message.length > 2500) {
      res.status(400).json({
        error: lang === 'en' ? 'Invalid message (max 2500 characters).' : 'Tin nhắn không hợp lệ (tối đa 2500 ký tự).',
      });
      return;
    }

    const userMessage = body.message.trim();
    const rawContext = (body.context && typeof body.context === 'object' ? body.context : {}) as Partial<AssistantContextPayload>;

    const safeContext = {
      today: typeof rawContext.today === 'string' ? rawContext.today : getTodayVN(),
      nowVN: typeof rawContext.nowVN === 'string' ? rawContext.nowVN : new Date().toISOString(),
      monthlyBudget: typeof rawContext.monthlyBudget === 'number' ? rawContext.monthlyBudget : 0,
      budgetAlertThreshold: typeof rawContext.budgetAlertThreshold === 'number' ? rawContext.budgetAlertThreshold : 80,
      tasks: Array.isArray(rawContext.tasks) ? rawContext.tasks.slice(0, 120) : [],
      transactions: Array.isArray(rawContext.transactions) ? rawContext.transactions.slice(0, 150) : [],
      notes: Array.isArray(rawContext.notes) ? rawContext.notes.slice(0, 60) : [],
      goals: Array.isArray(rawContext.goals) ? rawContext.goals.slice(0, 40) : [],
      habits: Array.isArray(rawContext.habits) ? rawContext.habits.slice(0, 40) : [],
      exchangeRates: rawContext.exchangeRates ?? null,
    };

    const historyItems = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .filter(
            (h): h is { role: 'user' | 'assistant'; text: string } =>
              Boolean(h) &&
              typeof h === 'object' &&
              ((h as { role?: string }).role === 'user' || (h as { role?: string }).role === 'assistant') &&
              typeof (h as { text?: unknown }).text === 'string'
          )
      : [];

    const ai = getGeminiClient();

    const systemInstruction =
      lang === 'en'
        ? `You are the Personal AI Assistant inside Daily Hub 2.0. Always respond strictly in natural, clear, concise English.

MANDATORY RULES:
1. DISTINGUISH FACTS FROM SUGGESTIONS:
   - Clearly label actual tasks, transactions, notes, goals, habits, and retrieved exchange rates from context under **[Actual Data]**.
   - Clearly label schedules, forecasts, recommendations, and advice under **[AI Suggestion]**.
2. ZERO FABRICATION:
   - Never invent financial transactions, amounts, tasks, or exchange rates not present in the context.
   - Only cite exchange rate numbers if present in \`exchangeRates\` in the context (always mention source & date). If \`exchangeRates\` is null, state that live exchange rates are not loaded yet.
   - If no records exist for a queried day/month, explicitly state that no records were saved.
3. CONFIRMATION BEFORE ANY MUTATION:
   - You cannot directly write to the database.
   - When the user asks to create a task, mark a task complete, or create a note (or convert natural language into draft tasks), return structured items in \`proposedActions\` so the user can manually confirm.
   - NEVER propose \`create_transaction\` or fabricate financial records in \`proposedActions\`.
4. TIMEZONE & CURRENCY:
   - Use Asia/Ho_Chi_Minh timezone and VND formatting (e.g., 150,000 VND).`
        : `Bạn là Trợ lý Cá nhân AI của ứng dụng Daily Hub 2.0, luôn trả lời hoàn toàn bằng tiếng Việt rõ ràng, súc tích, tinh tế và trung thực.

NGUYÊN TẮC BẮT BUỘC:
1. PHÂN BIỆT RÕ DỮ LIỆU THỰC TẾ VÀ ĐỀ XUẤT:
   - Mọi số liệu, công việc, giao dịch, ghi chú, mục tiêu, thói quen và tỷ giá trích xuất từ ngữ cảnh tài khoản phải ghi rõ thuộc **[Dữ liệu thực tế]**.
   - Mọi lịch trình gợi ý, phân tích xu hướng, phương án tối ưu phải ghi rõ thuộc **[Gợi ý từ AI]**.
2. KHÔNG BỊA ĐẶT DỮ LIỆU:
   - Tuyệt đối không tự bịa ra giao dịch tài chính, số tiền, tỷ giá ngoại tệ hay công việc không có trong dữ liệu được cung cấp.
   - Chỉ nêu tỷ giá khi có sẵn trong trường \`exchangeRates\` của ngữ cảnh (kèm nguồn và ngày hiệu lực); nếu \`exchangeRates\` trống, hãy nhắc người dùng tải dữ liệu tại mục "Tỷ giá" và không ước đoán.
   - Nếu không có dữ liệu cho ngày/tháng được hỏi, hãy nói rõ hiện chưa có bản ghi nào được lưu.
3. KHÔNG TỰ Ý THAY ĐỔI DỮ LIỆU:
   - Bạn không tự ý tạo, sửa hoặc xóa dữ liệu.
   - Nếu người dùng yêu cầu tạo công việc mới, chuyển ngôn ngữ tự nhiên thành bản nháp công việc, đánh dấu hoàn thành công việc hoặc tạo ghi chú mới, hãy đề xuất trong trường \`proposedActions\` để người dùng tự nhấn nút xác nhận.
   - KHÔNG BAO GIỜ đề xuất tự tạo giao dịch thu/chi trong \`proposedActions\`; với giao dịch tài chính, hãy hướng dẫn người dùng nhập thủ công.
4. MÚI GIỜ & TIỀN TỆ:
   - Luôn dùng múi giờ Asia/Ho_Chi_Minh và định dạng tiền tệ VND (ví dụ: 150.000 ₫).`;

    const promptPayload = `USER WORKSPACE CONTEXT (Timezone Asia/Ho_Chi_Minh, today: ${safeContext.today}, responseLanguage: ${lang}):
${JSON.stringify(safeContext, null, 2)}

RECENT CONVERSATION:
${historyItems.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n')}

NEW REQUEST:
${userMessage}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptPayload,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description:
                lang === 'en'
                  ? 'Detailed English reply distinguishing [Actual Data] and [AI Suggestion].'
                  : 'Câu trả lời chi tiết bằng tiếng Việt, phân tách rõ [Dữ liệu thực tế] và [Gợi ý từ AI].',
            },
            proposedActions: {
              type: Type.ARRAY,
              description: 'Optional list of draft actions (create_task, complete_task, create_note) awaiting explicit user confirmation.',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  label: { type: Type.STRING },
                  taskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  estimatedMinutes: { type: Type.NUMBER },
                  timeBlockStart: { type: Type.STRING },
                },
                required: ['type', 'label'],
              },
            },
          },
          required: ['reply', 'proposedActions'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    const parsed = JSON.parse(rawText) as { reply?: string; proposedActions?: unknown[] };

    res.json({
      reply:
        typeof parsed.reply === 'string'
          ? parsed.reply
          : lang === 'en'
          ? 'Sorry, I could not generate a response right now.'
          : 'Xin lỗi, tôi chưa thể tổng hợp phản hồi lúc này.',
      proposedActions: Array.isArray(parsed.proposedActions)
        ? parsed.proposedActions.filter(
            (a) =>
              a &&
              typeof a === 'object' &&
              ['create_task', 'complete_task', 'create_note'].includes(String((a as { type?: string }).type))
          )
        : [],
    });
  } catch (err) {
    console.error('AI assistant error:', err);
    const message = err instanceof Error ? err.message : 'AI assistant server error.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/ai/report-insights', verifyFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as {
      language?: string;
      periodType?: string;
      periodLabel?: string;
      summary?: unknown;
    };

    const lang: 'vi' | 'en' = body.language === 'en' ? 'en' : 'vi';

    if (!body.summary || typeof body.summary !== 'object') {
      res.status(400).json({
        error: lang === 'en' ? 'Missing report summary data.' : 'Thiếu dữ liệu báo cáo để phân tích.',
      });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction =
      lang === 'en'
        ? `You are a personal productivity and financial analyst for Daily Hub 2.0.
Write concise, insightful analysis strictly in English for the ${body.periodType ?? 'daily'} report (${body.periodLabel ?? ''}).
Requirements:
- Clearly separate [Actual Data] from [Insights & Recommendations].
- Only use exact numbers provided in the input; never invent transactions, amounts, or exchange rates.
- Structure into 4 clear parts: 1) Task & Productivity Review, 2) Income, Expense & Budget Health, 3) Goals & Habits Progress, 4) Actionable Recommendations for the next period.`
        : `Bạn là chuyên gia phân tích năng suất và tài chính cá nhân cho ứng dụng Daily Hub 2.0.
Hãy viết nhận xét ngắn gọn, sâu sắc hoàn toàn bằng tiếng Việt cho báo cáo ${body.periodType ?? 'daily'} (${body.periodLabel ?? ''}).
Yêu cầu:
- Phân biệt rõ [Số liệu thực tế] và [Nhận xét & Đề xuất].
- Chỉ sử dụng đúng các con số có trong dữ liệu được cung cấp, tuyệt đối không bịa thêm giao dịch, số tiền hay tỷ giá.
- Gồm 4 phần rõ ràng: 1) Đánh giá hiệu suất công việc, 2) Đánh giá thu chi & ngân sách, 3) Tiến độ mục tiêu & thói quen, 4) Gợi ý cải thiện cho giai đoạn tiếp theo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Actual report summary (${lang}):\n${JSON.stringify(body.summary, null, 2)}`,
      config: {
        systemInstruction,
      },
    });

    res.json({
      insights:
        (response.text ?? '').trim() ||
        (lang === 'en' ? 'No insights generated yet.' : 'Chưa có nhận xét được tạo.'),
    });
  } catch (err) {
    console.error('AI report insights error:', err);
    const message = err instanceof Error ? err.message : 'Unable to generate AI insights right now.';
    res.status(500).json({ error: message });
  }
});

async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  startDailyRateScheduler();

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Daily Hub server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Daily Hub server:', err);
  process.exit(1);
});
