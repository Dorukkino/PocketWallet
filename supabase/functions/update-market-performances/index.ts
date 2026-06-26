import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { MissingEnvError, serverSecrets } from '../_shared/env.ts';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const LOOKBACK_DAYS = 30;
const REQUEST_DELAY_MS = 2500;

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

type TrackedAsset = {
  twelveDataSymbol: string;
  assetName: string;
  assetSymbol: string;
  assetType: 'commodity' | 'crypto';
};

const TRACKED_ASSETS: TrackedAsset[] = [
  {
    twelveDataSymbol: 'BTC/USD',
    assetName: 'Bitcoin',
    assetSymbol: 'BTC',
    assetType: 'crypto',
  },
  {
    twelveDataSymbol: 'ETH/USD',
    assetName: 'Ethereum',
    assetSymbol: 'ETH',
    assetType: 'crypto',
  },
  {
    twelveDataSymbol: 'XAU/USD',
    assetName: 'Altın',
    assetSymbol: 'XAU',
    assetType: 'commodity',
  },
  {
    twelveDataSymbol: 'SI',
    assetName: 'Gümüş',
    assetSymbol: 'SI',
    assetType: 'commodity',
  },
];

type TimeSeriesValue = {
  datetime: string;
  close: string;
};

type TimeSeriesResponse = {
  status?: string;
  message?: string;
  values?: TimeSeriesValue[];
};

type MarketPerformanceUpsertRow = {
  asset_name: string;
  asset_symbol: string;
  asset_type: TrackedAsset['assetType'];
  change_pct: number;
  period: string;
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });

const getCurrentPeriod = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const isServiceRoleRequest = (req: Request, serviceRoleKey: string) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.slice('Bearer '.length) === serviceRoleKey;
};

const roundChangePct = (value: number) => Math.round(value * 10_000) / 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchThirtyDayChangePct(apiKey: string, symbol: string): Promise<number> {
  const params = new URLSearchParams({
    symbol,
    interval: '1day',
    outputsize: String(LOOKBACK_DAYS + 1),
    order: 'asc',
    apikey: apiKey,
  });

  const response = await fetch(`${TWELVE_DATA_BASE_URL}/time_series?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Twelve Data request failed for ${symbol}: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as TimeSeriesResponse;

  if (payload.status === 'error') {
    throw new Error(payload.message ?? `Twelve Data error for ${symbol}`);
  }

  const values = payload.values ?? [];
  if (values.length < 2) {
    throw new Error(`Insufficient Twelve Data points for ${symbol}`);
  }

  const sorted = [...values].sort((left, right) => left.datetime.localeCompare(right.datetime));
  const firstClose = Number.parseFloat(sorted[0].close);
  const lastClose = Number.parseFloat(sorted.at(-1)?.close ?? '');

  if (!Number.isFinite(firstClose) || !Number.isFinite(lastClose) || firstClose === 0) {
    throw new Error(`Invalid Twelve Data prices for ${symbol}`);
  }

  return roundChangePct(((lastClose - firstClose) / firstClose) * 100);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const serviceRoleKey = serverSecrets.supabaseServiceRoleKey;

    if (!isServiceRoleRequest(req, serviceRoleKey)) {
      return jsonResponse(401, { error: 'Unauthorized.' });
    }

    const apiKey = serverSecrets.twelveDataApiKey;
    const period = getCurrentPeriod();
    const adminClient = createClient(serverSecrets.supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const performanceRows: MarketPerformanceUpsertRow[] = [];

    for (let index = 0; index < TRACKED_ASSETS.length; index++) {
      const asset = TRACKED_ASSETS[index];
      const changePct = await fetchThirtyDayChangePct(apiKey, asset.twelveDataSymbol);

      performanceRows.push({
        asset_name: asset.assetName,
        asset_symbol: asset.assetSymbol,
        asset_type: asset.assetType,
        change_pct: changePct,
        period,
      });

      if (index < TRACKED_ASSETS.length - 1) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    const { data, error } = await adminClient
      .from('market_performances')
      .upsert(performanceRows, { onConflict: 'asset_symbol,period' })
      .select('asset_symbol, change_pct');

    if (error) {
      return jsonResponse(500, { error: 'Market performances could not be saved.' });
    }

    return jsonResponse(200, {
      period,
      updated: data?.length ?? performanceRows.length,
      assets: data ?? performanceRows.map((row) => ({
        assetSymbol: row.asset_symbol,
        changePct: row.change_pct,
      })),
    });
  } catch (error) {
    if (error instanceof MissingEnvError) {
      return jsonResponse(500, { error: 'Supabase function environment is not configured.' });
    }

    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse(502, { error: message });
  }
});
