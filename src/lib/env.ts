const readPublicEnv = (key: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY' | 'EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID') =>
  process.env[key]?.trim() || null;

export const publicEnv = {
  supabaseUrl: readPublicEnv('EXPO_PUBLIC_SUPABASE_URL'),
  supabasePublishableKey: readPublicEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  admobIosBannerAdUnitId: readPublicEnv('EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID'),
} as const;
