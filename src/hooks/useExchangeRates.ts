import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '../i18n';
import { fetchExchangeRates, getCachedExchangeRates, getFallbackExchangeRates } from '../lib/currency';
import type { ExchangeRates } from '../types/budget';

export function useExchangeRates() {
  const { t } = useI18n();
  const [rates, setRates] = useState<ExchangeRates>(getFallbackExchangeRates());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRates = useCallback(async () => {
    setIsLoading(true);
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

  return { rates, isLoading, error, refreshRates };
}
