import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { TranslationKey } from '../i18n';
import {
  MARKET_STALE_RETRY_DELAY_MS,
  StaleMarketDataError,
  buildMarketInvestmentAdvice,
} from '../lib/marketService';
import type { MarketInvestmentAdvice } from '../types/market';

const MARKET_ADVICE_RETRY_INTERVAL_MS = 30 * 60 * 1000;

export function useMarketAdvice(
  totalExpenses: number,
  period: string,
  enabled = true,
  ratesSignal = '',
) {
  const [advice, setAdvice] = useState<MarketInvestmentAdvice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAdvice = useCallback(async (allowStaleRetry = true) => {
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
    } catch (caughtError) {
      if (caughtError instanceof StaleMarketDataError) {
        setAdvice(null);
        setError('marketAdviceLoadFailed');

        if (allowStaleRetry) {
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          retryTimeoutRef.current = setTimeout(() => {
            void refreshAdvice(false);
          }, MARKET_STALE_RETRY_DELAY_MS);
        }

        return;
      }

      setAdvice(null);
      setError('marketAdviceLoadFailed');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, period, totalExpenses]);

  useEffect(() => {
    void refreshAdvice();
  }, [refreshAdvice, ratesSignal]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void refreshAdvice();
      }
    });

    const retryInterval = setInterval(() => {
      void refreshAdvice(false);
    }, MARKET_ADVICE_RETRY_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(retryInterval);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [refreshAdvice]);

  return { advice, isLoading, error, refreshAdvice };
}
