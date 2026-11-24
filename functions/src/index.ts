import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

const TARGET_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'AUD', 'SGD', 'THB'] as const;

function getTodayVN(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getYesterdayVN(todayStr: string): string {
  const [y, m, d] = todayStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d - 1));
  return utc.toISOString().slice(0, 10);
}

function computeVndRates(usdRates: Record<string, number>): Record<string, number> | null {
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

/**
 * Scheduled Cloud Function running daily at 06:00 Asia/Ho_Chi_Minh
 * Fetches live VND exchange rates + previous day's rates and persists an idempotent
 * snapshot per user keyed by YYYY-MM-DD so duplicate records are never created.
 */
export const scheduledDailyExchangeRates = onSchedule(
  {
    schedule: '0 6 * * *',
    timeZone: 'Asia/Ho_Chi_Minh',
    retryCount: 3,
  },
  async () => {
    const today = getTodayVN();
    const yesterday = getYesterdayVN(today);
    const fetchedAt = new Date().toISOString();

    const liveResp = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!liveResp.ok) {
      throw new Error(`Upstream exchange rate API returned HTTP ${liveResp.status}`);
    }
    const liveData = (await liveResp.json()) as { result?: string; rates?: Record<string, number> };
    const rates = liveData.rates ? computeVndRates(liveData.rates) : null;
    if (!rates) {
      throw new Error('Failed to parse VND rates from upstream response');
    }

    let previousRates: Record<string, number> | null = null;
    try {
      const prevResp = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yesterday}/v1/currencies/usd.json`
      );
      if (prevResp.ok) {
        const prevJson = (await prevResp.json()) as { usd?: Record<string, number> };
        if (prevJson.usd) {
          previousRates = computeVndRates(prevJson.usd);
        }
      }
    } catch {
      // Previous day rates are optional when upstream historical archive is temporarily unavailable
    }

    const db = getFirestore();
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    for (const userDoc of usersSnap.docs) {
      const snapRef = db.collection('users').doc(userDoc.id).collection('exchangeRates').doc(today);
      const payload: Record<string, unknown> = {
        userId: userDoc.id,
        date: today,
        baseCurrency: 'VND',
        rates,
        source: 'Open Exchange Rates API (Cloud Scheduler 06:00 VN)',
        fetchedAt,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (previousRates) {
        payload.previousRates = previousRates;
      }
      batch.set(snapRef, payload, { merge: true });
    }

    await batch.commit();
  }
);
