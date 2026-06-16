import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { useAdmin } from './src/hooks/useAdmin';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { initializeAds } from './src/lib/ads';
import { supabase } from './src/lib/supabase';
import { LanguageProvider } from './src/i18n';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const admin = useAdmin(session);

  useEffect(() => {
    void initializeAds();
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setIsBooting(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isBooting || (session && (admin.isLoading || admin.role === null))) {
    return (
      <LanguageProvider>
        <View style={styles.bootScreen}>
          <ActivityIndicator color="#34d399" />
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
  },
});
