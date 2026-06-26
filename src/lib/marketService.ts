import { withTimeout } from './async';
import { supabase } from './supabase';
import type { MarketInvestmentAdvice, MarketPerformanceRow } from '../types/market';
import { fromMarketPerformanceRow } from '../types/market';

export const SAVINGS_ALLOCATION_RATE = 0.15;
export const MARKET_REQUEST_TIMEOUT_MS = 8000;

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

  return fromMarketPerformanceRow(data as MarketPerformanceRow);
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
  };
}
