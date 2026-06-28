import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PRODUCTION_SUPABASE_URL = 'https://mitrxxvwccjzsvcdptdi.supabase.co';
const PRODUCTION_SUPABASE_ANON_KEY = 'sb_publishable_xRoapJcIuumULBDNG6sRBw_71sPisBb';

const authOptions = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
} as const;

const normalizeSupabaseUrl = (value?: string | null) => {
  try {
    const parsedUrl = new URL(value ?? '');
    return parsedUrl.protocol === 'https:' ? parsedUrl.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
};

const supabaseUrl =
  normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? PRODUCTION_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  PRODUCTION_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are completely missing!');
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigurationError = isSupabaseConfigured ? null : 'Supabase environment variables are missing.';

let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, authOptions);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabase = createClient(PRODUCTION_SUPABASE_URL, PRODUCTION_SUPABASE_ANON_KEY, authOptions);
}

export { supabase };
