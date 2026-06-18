import mobileAds from 'react-native-google-mobile-ads';

let adsInitializationPromise: Promise<unknown> | null = null;

export function initializeAds() {
  if (!adsInitializationPromise) {
    adsInitializationPromise = mobileAds()
      .initialize()
      .catch((error: unknown) => {
        adsInitializationPromise = null;

        if (__DEV__) {
          console.warn('AdMob initialization failed', error);
        }
      });
  }

  return adsInitializationPromise;
}
