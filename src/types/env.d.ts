declare namespace NodeJS {
  interface ProcessEnv {
    /** Public Expo client variables only. Do not add private API keys here. */
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID?: string;
  }
}
