import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useI18n } from '../i18n';
import {
  fetchExchangeRates,
  getCachedExchangeRates,
  getFallbackExchangeRates,
  isExchangeRatesExpired,
} from '../lib/currency';
import type { ExchangeRates } from '../types/budget';

const EXCHANGE_RATE_RETRY_INTERVAL_MS = 30 * 60 * 1000;
const STALE_EXCHANGE_RATE_RETRY_INTERVAL_MS = 5 * 60 * 1000;

export function useExchangeRates() {
  const { t } = useI18n();
  const [rates, setRates] = useState<ExchangeRates>(getFallbackExchangeRates());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const cachedRates = await getCachedExchangeRates().catch(() => null);
    const cachedRatesAreFresh = cachedRates ? !isExchangeRatesExpired(cachedRates) : false;

    if (cachedRatesAreFresh) {
      setRates(cachedRates);
    } else if (cachedRates) {
      setRates({ ...cachedRates, isStale: true });
    }

    try {
      const freshRates = await fetchExchangeRates();
      setRates(freshRates);
      setError(null);
    } catch {
      if (cachedRatesAreFresh) {
        setRates({ ...cachedRates, isStale: true });
      } else {
        setRates((currentRates) => ({ ...(cachedRates ?? currentRates), isStale: true }));
      }
      setError(t('currencyFetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshRates();
  }, [refreshRates]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void refreshRates();
      }
    });

    const retryInterval = setInterval(
      () => {
        void refreshRates();
      },
      rates.isStale ? STALE_EXCHANGE_RATE_RETRY_INTERVAL_MS : EXCHANGE_RATE_RETRY_INTERVAL_MS,
    );

    return () => {
      subscription.remove();
      clearInterval(retryInterval);
    };
  }, [rates.isStale, refreshRates]);

  return { rates, isLoading, error, refreshRates };
};
