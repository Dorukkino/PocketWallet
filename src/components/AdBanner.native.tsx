import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID || TestIds.BANNER;

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
