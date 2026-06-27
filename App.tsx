import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { useAdmin } from './src/hooks/useAdmin';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { withTimeout } from './src/lib/async';
import { initializeAds } from './src/lib/ads';
import { createSessionFromAuthUrl } from './src/lib/authLinking';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';
import { LanguageProvider } from './src/i18n';

const BOOT_SESSION_TIMEOUT_MS = 7000;

SplashScreen.setOptions({
  duration: 200,
  fade: true,
});

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const admin = useAdmin(session);

  useEffect(() => {
    if (isAppReady) {
      void initializeAds();
    }
  }, [isAppReady]);

  useEffect(() => {
    const handleAuthUrl = async (url: string | null) => {
      if (!url || !isSupabaseConfigured) {
        return;
      }

      try {
        await createSessionFromAuthUrl(url);
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to restore session from auth callback URL', error);
        }
      }
    };

    void Linking.getInitialURL().then(handleAuthUrl);

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      if (!isSupabaseConfigured) {
        if (mounted) {
          setSession(null);
          setIsAppReady(true);
          await SplashScreen.hideAsync();
        }
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
          setIsAppReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        if (nextSession) {
          setIsGuest(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isAppReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#34d399" size="large" />
        <StatusBar style="light" />
      </View>
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
      ) : isGuest ? (
        <BudgetScreen session={null} isGuest onExitGuest={() => setIsGuest(false)} />
      ) : (
        <AuthScreen onContinueAsGuest={() => setIsGuest(true)} />
      )}
      <StatusBar style="light" />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#020617',
    flex: 1,
    justifyContent: 'center',
  },
});
