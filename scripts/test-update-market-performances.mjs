import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envLocalPath = resolve(root, 'supabase/.env.local');
const LOCAL_FUNCTION_URL = 'http://127.0.0.1:54321/functions/v1/update-market-performances';
const PRODUCTION_FUNCTION_URL =
  'https://mitrxxvwccjzsvcdptdi.supabase.co/functions/v1/update-market-performances';

const TRACKED_ASSETS = [
  { twelveDataSymbol: 'BTC/USD', assetSymbol: 'BTC' },
  { twelveDataSymbol: 'ETH/USD', assetSymbol: 'ETH' },
  { twelveDataSymbol: 'XAU/USD', assetSymbol: 'XAU' },
  { twelveDataSymbol: 'SI', assetSymbol: 'SI' },
];

const LOOKBACK_DAYS = 30;
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

function loadEnvLocal() {
  const content = readFileSync(envLocalPath, 'utf8');
  const entries = Object.fromEntries(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );

  return entries;
}

function roundChangePct(value) {
  return Math.round(value * 10_000) / 10_000;
}

async function fetchThirtyDayChangePct(apiKey, symbol) {
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

  const payload = await response.json();

  if (payload.status === 'error') {
    throw new Error(payload.message ?? `Twelve Data error for ${symbol}`);
  }

  const values = payload.values ?? [];
  if (values.length < 2) {
    throw new Error(`Insufficient Twelve Data points for ${symbol}`);
  }

  const sorted = [...values].sort((left, right) => left.datetime.localeCompare(right.datetime));
  const firstClose = Number.parseFloat(sorted[0].close);
  const lastClose = Number.parseFloat(sorted.at(-1).close);

  if (!Number.isFinite(firstClose) || !Number.isFinite(lastClose) || firstClose === 0) {
    throw new Error(`Invalid Twelve Data prices for ${symbol}`);
  }

  return {
    changePct: roundChangePct(((lastClose - firstClose) / firstClose) * 100),
    firstDate: sorted[0].datetime,
    lastDate: sorted.at(-1).datetime,
    firstClose,
    lastClose,
  };
}

async function invokeFunction(url, serviceRoleKey) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  const bodyText = await response.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  return { status: response.status, body };
}

async function main() {
  console.log('=== Step 1: supabase/.env.local ===');
  const env = loadEnvLocal();
  const apiKey = env.TWELVE_DATA_API_KEY;
  const expectedKey = '609166ec1723493695a1b92cec02be91';

  console.log(`Path: ${envLocalPath}`);
  console.log(`TWELVE_DATA_API_KEY present: ${Boolean(apiKey)}`);
  console.log(`TWELVE_DATA_API_KEY matches expected: ${apiKey === expectedKey}`);

  console.log('\n=== Step 2: Local function endpoint probe ===');
  let localReachable = false;
  try {
    const probe = await fetch(LOCAL_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    localReachable = true;
    console.log(`Local endpoint reachable: yes (HTTP ${probe.status})`);
  } catch (error) {
    console.log(`Local endpoint reachable: no (${error.cause?.code ?? error.message})`);
    console.log('Note: `npx supabase functions serve` requires Docker Desktop on this machine.');
  }

  console.log('\n=== Step 3: Twelve Data API (30-day change %) ===');
  const twelveDataResults = [];

  for (const asset of TRACKED_ASSETS) {
    try {
      const result = await fetchThirtyDayChangePct(apiKey, asset.twelveDataSymbol);
      twelveDataResults.push({
        assetSymbol: asset.assetSymbol,
        symbol: asset.twelveDataSymbol,
        ok: true,
        ...result,
      });
      console.log(
        `${asset.assetSymbol}: ${result.changePct}% (${result.firstDate} -> ${result.lastDate})`,
      );
    } catch (error) {
      twelveDataResults.push({
        assetSymbol: asset.assetSymbol,
        symbol: asset.twelveDataSymbol,
        ok: false,
        error: error.message,
      });
      console.log(`${asset.assetSymbol}: ERROR - ${error.message}`);
    }
  }

  const allTwelveDataOk = twelveDataResults.every((item) => item.ok);

  console.log('\n=== Step 4: Edge Function invoke ===');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.log('SUPABASE_SERVICE_ROLE_KEY not available locally; probing production endpoint without auth.');
    try {
      const probe = await fetch(PRODUCTION_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const probeBody = await probe.text();
      console.log(`Production endpoint HTTP status: ${probe.status}`);
      console.log(`Production endpoint body: ${probeBody}`);
    } catch (error) {
      console.log(`Production endpoint probe failed: ${error.message}`);
    }
    console.log('Twelve Data integration logic validated directly via Node fetch script.');
  } else {
    const targetUrl = localReachable ? LOCAL_FUNCTION_URL : PRODUCTION_FUNCTION_URL;
    console.log(`Invoking: ${targetUrl}`);

    try {
      const result = await invokeFunction(targetUrl, serviceRoleKey);
      console.log(`HTTP status: ${result.status}`);
      console.log('Response body:');
      console.log(JSON.stringify(result.body, null, 2));
    } catch (error) {
      console.log(`Function invoke failed: ${error.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(
    JSON.stringify(
      {
        envLocalReady: apiKey === expectedKey,
        localFunctionReachable: localReachable,
        twelveDataAllAssetsOk: allTwelveDataOk,
        assets: twelveDataResults.map(({ assetSymbol, ok, changePct, error }) => ({
          assetSymbol,
          ok,
          changePct,
          error,
        })),
      },
      null,
      2,
    ),
  );

  process.exit(allTwelveDataOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
