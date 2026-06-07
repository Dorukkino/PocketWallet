import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENCIES } from '../constants/categories';
import type { CurrencyCode, ExchangeRates } from '../types/budget';

const CACHE_KEY = 'pocketwallet_exchange_rates_v1';
const RATE_API_URL = 'https://api.frankfurter.app/latest?from=TRY&to=USD,EUR,GBP';
const MAX_EXCHANGE_RATE_AGE_MS = 2 * 24 * 60 * 60 * 1000;

const fallbackRates: ExchangeRates = {
  base: 'TRY',
  rates: {
    TRY: 1,
    USD: 0.0217,
    EUR: 0.0188,
    GBP: 0.016,
  },
  sourceDate: new Date().toISOString().slice(0, 10),
  fetchedAt: new Date().toISOString(),
  isStale: true,
};

export async function getCachedExchangeRates() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return withExchangeRatesFreshness(JSON.parse(raw) as ExchangeRates);
  } catch {
    await AsyncStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function isExchangeRatesExpired(rates: ExchangeRates, now = Date.now()) {
  const fetchedAt = new Date(rates.fetchedAt).getTime();
  return !Number.isFinite(fetchedAt) || now - fetchedAt > MAX_EXCHANGE_RATE_AGE_MS;
}

export function withExchangeRatesFreshness(rates: ExchangeRates) {
  return {
    ...rates,
    isStale: rates.isStale || isExchangeRatesExpired(rates),
  };
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const response = await fetch(RATE_API_URL);

  if (!response.ok) {
    throw new Error('Exchange rate request failed.');
  }

  const payload = (await response.json()) as {
    date?: string;
    rates?: Partial<Record<CurrencyCode, number>>;
  };

  const nextRates: ExchangeRates = {
    base: 'TRY',
    rates: {
      TRY: 1,
      USD: Number(payload.rates?.USD ?? fallbackRates.rates.USD),
      EUR: Number(payload.rates?.EUR ?? fallbackRates.rates.EUR),
      GBP: Number(payload.rates?.GBP ?? fallbackRates.rates.GBP),
    },
    sourceDate: payload.date ?? new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    isStale: false,
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(nextRates));
  return nextRates;
}

export function getFallbackExchangeRates() {
  return fallbackRates;
}

export function convertFromTry(amountTry: number, currency: CurrencyCode, rates: ExchangeRates) {
  return amountTry * rates.rates[currency];
}

export function formatCurrencyValue(amountTry: number, currency: CurrencyCode, rates: ExchangeRates, locale = 'tr-TR') {
  const symbol = CURRENCIES.find((item) => item.code === currency)?.symbol ?? '₺';
  const converted = convertFromTry(amountTry, currency, rates);
  const sign = converted < 0 ? '-' : '';
  const absoluteValue = Math.abs(converted);

  return `${sign}${symbol}${absoluteValue.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
