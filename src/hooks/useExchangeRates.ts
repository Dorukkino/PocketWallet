import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useI18n } from '../i18n';
import { fetchExchangeRates, getCachedExchangeRates, getFallbackExchangeRates } from '../lib/currency';
import type { ExchangeRates } from '../types/budget';

const EXCHANGE_RATE_RETRY_INTERVAL_MS = 30 * 60 * 1000;

export function useExchangeRates() {
  const { t } = useI18n();
  const [rates, setRates] = useState<ExchangeRates>(getFallbackExchangeRates());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const cachedRates = await getCachedExchangeRates();
    if (cachedRates) {
      setRates(cachedRates);
    }

    try {
      const freshRates = await fetchExchangeRates();
      setRates(freshRates);
      setError(null);
    } catch {
      setRates((currentRates) => ({ ...(cachedRates ?? currentRates), isStale: true }));
      setError(t('currencyFetchFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;

    async function loadRates() {
      const cachedRates = await getCachedExchangeRates();
      if (mounted && cachedRates) {
        setRates(cachedRates);
      }

      try {
        const freshRates = await fetchExchangeRates();
        if (mounted) {
          setRates(freshRates);
          setError(null);
        }
      } catch {
        if (mounted) {
          setRates((currentRates) => ({ ...(cachedRates ?? currentRates), isStale: true }));
          setError(t('currencyFetchFailed'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRates();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void refreshRates();
      }
    });
    const retryInterval = setInterval(() => {
      void refreshRates();
    }, EXCHANGE_RATE_RETRY_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(retryInterval);
    };
  }, [refreshRates]);

  return { rates, isLoading, error, refreshRates };
}
