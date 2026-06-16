import mobileAds from 'react-native-google-mobile-ads';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

let adsInitializationPromise: Promise<unknown> | null = null;

async function requestTrackingAuthorization() {
  const { status } = await getTrackingPermissionsAsync();

  if (status === 'undetermined') {
    await requestTrackingPermissionsAsync();
  }
}

export function initializeAds() {
  if (!adsInitializationPromise) {
    adsInitializationPromise = requestTrackingAuthorization()
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('Tracking permission request failed', error);
        }
      })
      .then(() => mobileAds().initialize())
      .catch((error: unknown) => {
        adsInitializationPromise = null;

        if (__DEV__) {
          console.warn('AdMob initialization failed', error);
        }
      });
  }

  return adsInitializationPromise;
}
