import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const SUCCESS_ACTIONS_STORAGE_KEY = 'pocketwallet_rate_app_success_count';
const REVIEW_REQUESTED_STORAGE_KEY = 'pocketwallet_rate_app_review_requested';
const MARKET_ADVICE_COUNTED_PERIOD_KEY = 'pocketwallet_rate_app_market_advice_period';

export const SUCCESS_ACTIONS_THRESHOLD = 5;

const readCount = async () => {
  const raw = await AsyncStorage.getItem(SUCCESS_ACTIONS_STORAGE_KEY);
  const parsed = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const writeCount = async (count: number) => {
  await AsyncStorage.setItem(SUCCESS_ACTIONS_STORAGE_KEY, String(count));
};

const hasRequestedReview = async () => {
  const value = await AsyncStorage.getItem(REVIEW_REQUESTED_STORAGE_KEY);
  return value === 'true';
};

const markReviewRequested = async () => {
  await AsyncStorage.setItem(REVIEW_REQUESTED_STORAGE_KEY, 'true');
};

export async function requestAppReviewIfAvailable() {
  const [isAvailable, hasAction] = await Promise.all([
    StoreReview.isAvailableAsync(),
    StoreReview.hasAction(),
  ]);

  if (!isAvailable || !hasAction) {
    return false;
  }

  await StoreReview.requestReview();
  return true;
}

export async function recordSuccessfulAction() {
  if (await hasRequestedReview()) {
    return;
  }

  const nextCount = (await readCount()) + 1;
  await writeCount(nextCount);

  if (nextCount < SUCCESS_ACTIONS_THRESHOLD) {
    return;
  }

  const requested = await requestAppReviewIfAvailable();
  if (requested) {
    await markReviewRequested();
  }
}

export async function recordMarketAdviceViewed(period: string) {
  if (await hasRequestedReview()) {
    return;
  }

  const countedPeriod = await AsyncStorage.getItem(MARKET_ADVICE_COUNTED_PERIOD_KEY);
  if (countedPeriod === period) {
    return;
  }

  await AsyncStorage.setItem(MARKET_ADVICE_COUNTED_PERIOD_KEY, period);
  await recordSuccessfulAction();
}
