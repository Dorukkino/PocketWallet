import { useCallback, useEffect, useState } from 'react';

import type { TranslationKey } from '../i18n';
import { buildMarketInvestmentAdvice } from '../lib/marketService';
import type { MarketInvestmentAdvice } from '../types/market';

export function useMarketAdvice(totalExpenses: number, period: string, enabled = true) {
  const [advice, setAdvice] = useState<MarketInvestmentAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const refreshAdvice = useCallback(async () => {
    if (!enabled || totalExpenses <= 0) {
      setAdvice(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextAdvice = await buildMarketInvestmentAdvice(totalExpenses, period);
      setAdvice(nextAdvice);
    } catch {
      setAdvice(null);
      setError('marketAdviceLoadFailed');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, period, totalExpenses]);

  useEffect(() => {
    void refreshAdvice();
  }, [refreshAdvice]);

  return { advice, isLoading, error, refreshAdvice };
};
