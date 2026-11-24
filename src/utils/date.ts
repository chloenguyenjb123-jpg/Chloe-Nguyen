import type { LanguageCode } from '../types';

export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getTodayVN(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getCurrentMonthVN(): string {
  return getTodayVN().slice(0, 7);
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function addMonthsToDateStr(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

export function getHourVN(): number {
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: VN_TIMEZONE,
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return Number(hourStr);
}

export function getGreeting(displayName?: string | null, lang: LanguageCode = 'vi'): string {
  const hour = getHourVN();
  const name = displayName?.trim() || (lang === 'en' ? 'there' : 'bạn');
  if (lang === 'en') {
    if (hour >= 5 && hour < 12) return `Good morning, ${name}`;
    if (hour >= 12 && hour < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }
  if (hour >= 5 && hour < 12) return `Chào buổi sáng, ${name}`;
  if (hour >= 12 && hour < 18) return `Chào buổi chiều, ${name}`;
  return `Chào buổi tối, ${name}`;
}

export function formatLongDate(dateStr?: string, lang: LanguageCode = 'vi'): string {
  const target = dateStr ? new Date(`${dateStr}T12:00:00+07:00`) : new Date();
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    timeZone: VN_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(target);
}

export function formatShortDate(dateStr: string, lang: LanguageCode = 'vi'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-');
  return lang === 'en' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

export function formatDateTime(isoStr: string, lang: LanguageCode = 'vi'): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    timeZone: VN_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getWeekRangeVN(anchorDateStr: string): { start: string; end: string } {
  const [y, m, d] = anchorDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startDt = new Date(Date.UTC(y, m - 1, d + diffToMonday));
  const endDt = new Date(Date.UTC(y, m - 1, d + diffToMonday + 6));
  return {
    start: startDt.toISOString().slice(0, 10),
    end: endDt.toISOString().slice(0, 10),
  };
}

export function getMonthRangeVN(anchorDateStr: string): { start: string; end: string; monthKey: string } {
  const monthKey = anchorDateStr.slice(0, 7);
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    monthKey,
  };
}

export function formatVND(amount: number, lang: LanguageCode = 'vi'): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN').format(rounded);
  return lang === 'en' ? `${formatted} VND` : `${formatted} ₫`;
}

export function formatRateVND(amount: number, lang: LanguageCode = 'vi'): string {
  const formatted = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
    minimumFractionDigits: amount < 1000 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return lang === 'en' ? `${formatted} VND` : `${formatted} ₫`;
}

export function isTaskOverdue(deadline: string, status: string, today: string): boolean {
  if (status === 'completed') return false;
  return deadline < today;
}

export function calculateHabitStreak(completedDates: string[], today: string): number {
  const set = new Set(completedDates);
  let cursor = set.has(today) ? today : addDaysToDateStr(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysToDateStr(cursor, -1);
  }
  return streak;
}
