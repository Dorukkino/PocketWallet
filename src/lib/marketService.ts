import { withTimeout } from './async';
import { supabase } from './supabase';
import type { MarketInvestmentAdvice, MarketPerformance, MarketPerformanceRow } from '../types/market';
import { fromMarketPerformanceRow } from '../types/market';

export const SAVINGS_ALLOCATION_RATE = 0.15;
export const MARKET_REQUEST_TIMEOUT_MS = 8000;
export const MAX_MARKET_DATA_AGE_MS = 36 * 60 * 60 * 1000;
export const MARKET_STALE_RETRY_DELAY_MS = 1500;

export class StaleMarketDataError extends Error {
  readonly updatedAt: string | null;
  readonly assetSymbol: string;

  constructor(updatedAt: string | null, assetSymbol: string) {
    super(`Market data for ${assetSymbol} is stale.`);
    this.name = 'StaleMarketDataError';
    this.updatedAt = updatedAt;
    this.assetSymbol = assetSymbol;
  }
}

export function getCurrentMarketPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isMarketPerformanceStale(
  updatedAt: string | null | undefined,
  maxAgeMs = MAX_MARKET_DATA_AGE_MS,
  now = Date.now(),
) {
  if (!updatedAt) {
    return true;
  }

  const updatedAtMs = new Date(updatedAt).getTime();
  return !Number.isFinite(updatedAtMs) || now - updatedAtMs > maxAgeMs;
}

export function assertMarketPerformanceIsFresh(performance: MarketPerformance) {
  if (isMarketPerformanceStale(performance.updatedAt)) {
    console.error(
      `[marketService] Stale market data for ${performance.assetSymbol}. Last updated: ${performance.updatedAt ?? 'unknown'}`,
    );
    throw new StaleMarketDataError(performance.updatedAt, performance.assetSymbol);
  }
}

export async function fetchTopMarketPerformance(period: string) {
  const { data, error } = await withTimeout(
    supabase
      .from('market_performances')
      .select('id, asset_name, asset_symbol, asset_type, change_pct, period, updated_at')
      .eq('period', period)
      .order('change_pct', { ascending: false })
      .limit(1)
      .maybeSingle(),
    MARKET_REQUEST_TIMEOUT_MS,
    'Market performance request timed out.',
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const performance = fromMarketPerformanceRow(data as MarketPerformanceRow);
  assertMarketPerformanceIsFresh(performance);

  return performance;
}

export async function buildMarketInvestmentAdvice(
  totalExpenses: number,
  period: string,
): Promise<MarketInvestmentAdvice | null> {
  if (totalExpenses <= 0) {
    return null;
  }

  const topAsset = await fetchTopMarketPerformance(period);
  if (!topAsset) {
    return null;
  }

  const savingsAmount = totalExpenses * SAVINGS_ALLOCATION_RATE;
  const netGain = savingsAmount * (topAsset.changePct / 100);

  return {
    assetName: topAsset.assetName,
    assetSymbol: topAsset.assetSymbol,
    changePct: topAsset.changePct,
    savingsAmount,
    netGain,
    updatedAt: topAsset.updatedAt,
  };
}
