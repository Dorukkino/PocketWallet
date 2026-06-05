import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { AuthScreen } from './src/screens/AuthScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { supabase } from './src/lib/supabase';
import { LanguageProvider } from './src/i18n';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
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

  if (isBooting) {
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
      {session ? <BudgetScreen session={session} /> : <AuthScreen />}
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
