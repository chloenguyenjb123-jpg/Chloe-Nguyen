import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CURRENCY_NAMES,
  TARGET_CURRENCIES,
  type CurrencyCode,
  type ExchangeRateSnapshot,
} from '../../types';
import { fetchExchangeRateHistory } from '../../services/apiService';
import { formatDateTime, formatRateVND, formatShortDate } from '../../utils/date';
import { useI18n } from '../../i18n/LanguageContext';

interface ExchangeRatesViewProps {
  snapshots: ExchangeRateSnapshot[];
  latestRate: ExchangeRateSnapshot | null;
  loading: boolean;
  error: string | null;
  preferredCurrency?: CurrencyCode;
  onRefresh: () => void;
}

export function ExchangeRatesView({
  snapshots,
  latestRate,
  loading,
  error,
  preferredCurrency = 'USD',
  onRefresh,
}: ExchangeRatesViewProps) {
  const { lang, t } = useI18n();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [historyPoints, setHistoryPoints] = useState<Array<{ date: string; rate: number | null }>>([]);
  const [historySource, setHistorySource] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Converter state
  const [amountInput, setAmountInput] = useState('100');
  const [fromCurr, setFromCurr] = useState<string>('USD');
  const [toCurr, setToCurr] = useState<string>('VND');

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const res = await fetchExchangeRateHistory(selectedCurrency, rangeDays);
        if (!active) return;
        setHistoryPoints(res.points);
        setHistorySource(res.source);
      } catch (err) {
        if (!active) return;
        setHistoryError(err instanceof Error ? err.message : t.exchangeRates.historyUnavailable);
        setHistoryPoints([]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    void loadHistory();
    return () => {
      active = false;
    };
  }, [selectedCurrency, rangeDays, t.exchangeRates.historyUnavailable]);

  const chartData = useMemo(
    () =>
      historyPoints
        .filter((p): p is { date: string; rate: number } => typeof p.rate === 'number')
        .map((p) => ({
          dateLabel: p.date.slice(5).split('-').reverse().join('/'),
          fullDate: p.date,
          rate: p.rate,
        })),
    [historyPoints]
  );

  const convertedAmount = useMemo(() => {
    const val = Number(amountInput);
    if (!Number.isFinite(val) || val < 0 || !latestRate) return null;
    if (fromCurr === toCurr) return val;
    const fromInVnd = fromCurr === 'VND' ? 1 : latestRate.rates[fromCurr];
    const toInVnd = toCurr === 'VND' ? 1 : latestRate.rates[toCurr];
    if (typeof fromInVnd !== 'number' || typeof toInVnd !== 'number' || toInVnd <= 0) return null;
    return (val * fromInVnd) / toInVnd;
  }, [amountInput, fromCurr, toCurr, latestRate]);

  const allCurrencyOptions = ['VND', ...TARGET_CURRENCIES];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#55443F]">{t.exchangeRates.title}</h2>
          <p className="text-xs text-[#7F6D67] mt-1">{t.exchangeRates.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="dh-btn-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t.exchangeRates.refreshing : t.exchangeRates.manualRefresh}
        </button>
      </div>

      {/* Metadata & 06:00 Schedule Status */}
      <div className="dh-card p-4 bg-[#FCF9F6] flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#55443F]">
          <Clock className="w-4 h-4 text-[#A77C78] shrink-0" />
          <span className="font-medium">{t.exchangeRates.scheduleBanner}</span>
        </div>
        {latestRate && (
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7F6D67]">
            <span>
              {t.exchangeRates.effectiveDate}:{' '}
              <strong className="font-mono text-[#55443F]">{formatShortDate(latestRate.date, lang)}</strong>
            </span>
            <span>
              {t.exchangeRates.lastUpdated}:{' '}
              <strong className="font-mono text-[#55443F]">{formatDateTime(latestRate.fetchedAt, lang)}</strong>
            </span>
            <span>
              {t.exchangeRates.sourceLabel}: <strong className="text-[#55443F]">{latestRate.source}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Stale / Unavailable Warning */}
      {(error || latestRate?.stale) && (
        <div className="p-4 rounded-2xl bg-[#F7ECEC] border border-[#EBCFD0] flex items-start gap-2.5 text-xs text-[#55443F]">
          <AlertTriangle className="w-4 h-4 text-[#A77C78] shrink-0 mt-0.5" />
          <span>{latestRate ? t.exchangeRates.staleWarning : error || t.exchangeRates.unavailableBanner}</span>
        </div>
      )}

      {/* 9 Currency Cards */}
      {latestRate && (
        <section>
          <p className="text-[11px] font-semibold text-[#7F6D67] mb-3">{t.exchangeRates.conversionDirection}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TARGET_CURRENCIES.map((code) => {
              const rate = latestRate.rates[code];
              const prev = latestRate.previousRates?.[code];
              const pct =
                typeof rate === 'number' && typeof prev === 'number' && prev > 0
                  ? ((rate - prev) / prev) * 100
                  : null;
              const isSelected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCurrency(code)}
                  className={`dh-card p-4 text-left transition-all ${
                    isSelected ? 'border-[#A77C78] bg-[#FCF9F6] ring-2 ring-[#EBCFD0]/60' : 'hover:border-[#D8C3B5]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-[#55443F]">{code}</p>
                      <p className="text-xs text-[#7F6D67]">{CURRENCY_NAMES[code][lang]}</p>
                    </div>
                    {pct !== null && (
                      <span
                        className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
                          pct >= 0 ? 'text-[#5B6B52]' : 'text-[#A77C78]'
                        }`}
                      >
                        {pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {pct >= 0 ? '+' : ''}
                        {pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-xl font-semibold text-[#55443F]">
                    {typeof rate === 'number' ? formatRateVND(rate, lang) : t.common.noData}
                  </p>
                  <p className="mt-1 text-[11px] text-[#7F6D67]">
                    {t.exchangeRates.previousDayRate}:{' '}
                    <span className="font-mono">
                      {typeof prev === 'number' ? formatRateVND(prev, lang) : t.common.noData}
                    </span>
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Historical Line Chart (7 / 30 / 90 days) + Currency Converter */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 dh-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[#55443F]">
                {t.exchangeRates.historyTitle}: {selectedCurrency} / VND
              </h3>
              {historySource && (
                <p className="text-[11px] text-[#7F6D67] mt-0.5">{historySource}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                className="dh-input px-2.5 py-1.5 text-xs font-mono"
              >
                {TARGET_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="inline-flex p-0.5 bg-[#F3EDE6] rounded-lg">
                {([7, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRangeDays(d)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      rangeDays === d ? 'bg-white text-[#55443F] shadow-xs' : 'text-[#7F6D67]'
                    }`}
                  >
                    {d === 7
                      ? t.exchangeRates.days7
                      : d === 30
                      ? t.exchangeRates.days30
                      : t.exchangeRates.days90}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#7F6D67]">
              {t.common.loading}
            </div>
          ) : historyError || chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#A77C78]">
              {historyError || t.exchangeRates.historyUnavailable}
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFE7DF" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#7F6D67' }} />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: '#7F6D67' }}
                    tickFormatter={(v) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN').format(Number(v))}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: '#E8DFD6', fontSize: 12 }}
                    formatter={(v) => formatRateVND(Number(v ?? 0), lang)}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#A77C78"
                    strokeWidth={2.5}
                    dot={rangeDays === 7}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Currency Converter Calculator */}
        <div className="lg:col-span-4 dh-card p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-[#55443F] flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#A77C78]" />
            {t.exchangeRates.converterTitle}
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
              {t.exchangeRates.amountInput}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="dh-input w-full px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.exchangeRates.fromCurrency}
              </label>
              <select
                value={fromCurr}
                onChange={(e) => setFromCurr(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              >
                {allCurrencyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7F6D67] mb-1">
                {t.exchangeRates.toCurrency}
              </label>
              <select
                value={toCurr}
                onChange={(e) => setToCurr(e.target.value)}
                className="dh-input w-full px-3 py-2 text-sm font-mono"
              >
                {allCurrencyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FCF9F6] border border-[#E8DFD6]">
            <p className="text-[11px] font-semibold text-[#7F6D67]">{t.exchangeRates.convertedResult}</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#55443F]">
              {convertedAmount === null
                ? t.common.noData
                : `${new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
                    maximumFractionDigits: toCurr === 'VND' ? 0 : 4,
                  }).format(convertedAmount)} ${toCurr}`}
            </p>
          </div>

          {snapshots.length > 0 && (
            <div className="pt-2 border-t border-[#EFE7DF]">
              <p className="text-[11px] font-semibold text-[#7F6D67] mb-1.5">
                {lang === 'en' ? 'Recent Saved Snapshots' : 'Các bản lưu gần đây'}
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto text-[11px] font-mono text-[#7F6D67]">
                {snapshots.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span>{formatShortDate(s.date, lang)}</span>
                    <span>USD: {typeof s.rates.USD === 'number' ? formatRateVND(s.rates.USD, lang) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
