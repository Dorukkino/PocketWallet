import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { publicEnv } from './env';

const fallbackSupabaseUrl = 'https://placeholder.supabase.co';
const fallbackSupabaseKey = 'missing-supabase-publishable-key';

const normalizeSupabaseUrl = (value?: string | null) => {
  try {
    const parsedUrl = new URL(value ?? '');
    return parsedUrl.protocol === 'https:' ? parsedUrl.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
};

const supabaseUrl = normalizeSupabaseUrl(publicEnv.supabaseUrl);
const supabaseKey = publicEnv.supabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabaseConfigurationError = isSupabaseConfigured ? null : 'Supabase environment variables are missing.';

export const supabase = createClient(supabaseUrl ?? fallbackSupabaseUrl, supabaseKey ?? fallbackSupabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
