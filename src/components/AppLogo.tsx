import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

const logoSource = require('../../assets/icon.png');

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 48, style, imageStyle }: Props) {
  const borderRadius = Math.round(size * 0.22);

  return (
    <View style={[styles.container, { borderRadius, height: size, width: size }, style]}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={logoSource}
        style={[styles.image, { borderRadius, height: size, width: size }, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#1f242e',
  },
});
