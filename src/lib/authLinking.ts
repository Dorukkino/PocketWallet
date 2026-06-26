import { supabase } from './supabase';

const extractUrlParams = (url: string) => {
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};

export const authRedirectUrl = 'pocketwallet://auth/callback';

export async function createSessionFromAuthUrl(url: string) {
  if (!url.includes('auth/callback') && !url.includes('access_token') && !url.includes('code=')) {
    return false;
  }

  if (url.includes('code=')) {
    const { error } = await supabase.auth.exchangeCodeForSession(url);
    return !error;
  }

  const params = extractUrlParams(url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return !error;
}
