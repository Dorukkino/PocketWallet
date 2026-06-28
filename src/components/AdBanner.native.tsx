import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const PRODUCTION_IOS_BANNER_AD_UNIT_ID = 'ca-app-pub-9076740570868318/6405353759';

const productionBannerAdUnitId =
  process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID?.trim() ||
  process.env.EXPO_PUBLIC_ADMOB_BANNER_ID?.trim() ||
  PRODUCTION_IOS_BANNER_AD_UNIT_ID;

const bannerAdUnitId = __DEV__ ? TestIds.BANNER : productionBannerAdUnitId;

export function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} unitId={bannerAdUnitId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minHeight: 60,
  },
});
