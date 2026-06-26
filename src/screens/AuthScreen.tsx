import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LockKeyhole, Mail, UserRound } from 'lucide-react-native';

import { AppLogo } from '../components/AppLogo';
import { LanguageToggle } from '../components/LanguageToggle';
import { useI18n } from '../i18n';
import { authRedirectUrl } from '../lib/authLinking';
import { withTimeout } from '../lib/async';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AUTH_REQUEST_TIMEOUT_MS = 10000;

type Props = {
  onContinueAsGuest: () => void;
};

export function AuthScreen({ onContinueAsGuest }: Props) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const configurationMessage = isSupabaseConfigured ? '' : t('authServiceUnavailable');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Keyboard.dismiss();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const submit = async () => {
    if (!isSupabaseConfigured) {
      setMessage(t('authServiceUnavailable'));
      return;
    }

    if (!email.trim()) {
      setMessage(t('authEmailRequired'));
      return;
    }

    if (password.length < 6) {
      setMessage(t('authPasswordMin'));
      return;
    }

    if (mode === 'sign-up' && fullName.trim().length < 2) {
      setMessage(t('authFullNameError'));
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await withTimeout(
        mode === 'sign-in'
          ? supabase.auth.signInWithPassword({ email: email.trim(), password })
          : supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: authRedirectUrl,
                data: {
                  full_name: fullName.trim(),
                },
              },
            }),
        AUTH_REQUEST_TIMEOUT_MS,
        'Authentication request timed out.',
      );

      if (result.error) {
        setMessage(result.error.message || t('authGenericError'));
        return;
      }

      if (mode === 'sign-up') {
        setMessage(t('authCreated'));
      }
    } catch {
      setMessage(t('authGenericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.screen}
      >
        <LinearGradient colors={['#020617', '#08111f', '#020617']} style={StyleSheet.absoluteFill} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
        <LanguageToggle style={styles.languageToggle} />
        <AppLogo size={68} style={styles.logo} />
        <Text style={styles.title}>PocketWallet</Text>
        <Text style={styles.subtitle}>{t('authSubtitle')}</Text>

        {mode === 'sign-up' ? (
          <View style={styles.field}>
            <UserRound color="#64748b" size={18} />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder={t('fullNamePlaceholder')}
              placeholderTextColor="#475569"
              style={styles.input}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Mail color="#64748b" size={18} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('emailPlaceholder')}
            placeholderTextColor="#475569"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <LockKeyhole color="#64748b" size={18} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('passwordPlaceholder')}
            placeholderTextColor="#475569"
            style={styles.input}
          />
        </View>

        {configurationMessage || message ? <Text style={styles.message}>{configurationMessage || message}</Text> : null}

        <Pressable
          onPress={submit}
          disabled={isLoading || !isSupabaseConfigured}
          style={[styles.submit, !isSupabaseConfigured && styles.submitDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color="#022c22" />
          ) : (
            <Text style={styles.submitText}>{mode === 'sign-in' ? t('signIn') : t('signUp')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setMessage('');
          }}
          style={styles.switchMode}
        >
          <Text style={styles.switchText}>
            {mode === 'sign-in' ? t('switchToSignUp') : t('switchToSignIn')}
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable onPress={onContinueAsGuest} style={styles.guestButton}>
          <UserRound color="#94a3b8" size={18} />
          <Text style={styles.guestButtonText}>{t('continueAsGuest')}</Text>
        </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#020617',
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  glowTop: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderRadius: 180,
    height: 300,
    position: 'absolute',
    right: -90,
    top: -80,
    width: 300,
  },
  glowBottom: {
    backgroundColor: 'rgba(139, 92, 246, 0.13)',
    borderRadius: 170,
    bottom: -80,
    height: 280,
    left: -90,
    position: 'absolute',
    width: 280,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(51, 65, 85, 0.82)',
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    width: '100%',
  },
  languageToggle: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  logo: {
    marginBottom: 18,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 22,
    marginTop: 8,
  },
  field: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  input: {
    color: '#f8fafc',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 14,
  },
  message: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 12,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '900',
  },
  switchMode: {
    alignItems: 'center',
    paddingTop: 18,
  },
  switchText: {
    color: '#5eead4',
    fontSize: 13,
    fontWeight: '800',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dividerLine: {
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  guestButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    borderColor: 'rgba(100, 116, 139, 0.55)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  guestButtonText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800',
  },
});
