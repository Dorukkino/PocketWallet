import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { publicEnv } from '../lib/env';

const bannerAdUnitId = __DEV__ ? TestIds.BANNER : publicEnv.admobIosBannerAdUnitId || TestIds.BANNER;

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
