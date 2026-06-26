export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = 'MissingEnvError';
  }
}

export function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new MissingEnvError(name);
  }

  return value;
}

export function getOptionalEnv(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

/** Server-only secrets (e.g. TWELVE_DATA_API_KEY) must be read here — never from the Expo client. */
export const serverSecrets = {
  get twelveDataApiKey() {
    return getRequiredEnv('TWELVE_DATA_API_KEY');
  },
  get supabaseUrl() {
    return getRequiredEnv('SUPABASE_URL');
  },
  get supabaseServiceRoleKey() {
    return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  },
} as const;
