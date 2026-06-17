import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { useAdmin } from './src/hooks/useAdmin';
import { AppLogo } from './src/components/AppLogo';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { withTimeout } from './src/lib/async';
import { initializeAds } from './src/lib/ads';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import { LanguageProvider } from './src/i18n';

const BOOT_SESSION_TIMEOUT_MS = 7000;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const admin = useAdmin(session);

  useEffect(() => {
    if (!isBooting) {
      void initializeAds();
    }
  }, [isBooting]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      if (!isSupabaseConfigured) {
        setSession(null);
        setIsBooting(false);
        return;
      }

      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          BOOT_SESSION_TIMEOUT_MS,
          'Initial Supabase session restore timed out.',
        );

        if (mounted) {
          setSession(data.session);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Initial Supabase session restore failed', error);
        }

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setIsBooting(false);
        }
      }
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isBooting || (session && (admin.isLoading || admin.role === null))) {
    return (
      <LanguageProvider>
        <View style={styles.bootScreen}>
          <AppLogo size={72} style={styles.bootLogo} />
          <Text style={styles.bootTitle}>PocketWallet</Text>
          <Text style={styles.bootText}>Loading your wallet...</Text>
          <ActivityIndicator color="#34d399" style={styles.bootSpinner} />
          <StatusBar style="light" />
        </View>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      {session ? (
        admin.isAdmin ? (
          <AdminScreen
            session={session}
            stats={admin.stats}
            users={admin.users}
            isRefreshing={admin.isRefreshing}
            errorKey={admin.errorKey}
            onRefresh={admin.refreshAdmin}
          />
        ) : (
          <BudgetScreen session={session} />
        )
      ) : (
        <AuthScreen />
      )}
      <StatusBar style="light" />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bootLogo: {
    marginBottom: 18,
  },
  bootTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  bootText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  bootSpinner: {
    marginTop: 22,
  },
});
