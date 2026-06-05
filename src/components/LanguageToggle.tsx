import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useI18n } from '../i18n';

type Props = {
  style?: StyleProp<ViewStyle>;
};

const segmentWidth = 42;

export function LanguageToggle({ style }: Props) {
  const { language, setLanguage, t } = useI18n();
  const slide = useRef(new Animated.Value(language === 'tr' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: language === 'tr' ? 0 : 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [language, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.indicator, { transform: [{ translateX }] }]} />
      <Pressable onPress={() => setLanguage('tr')} style={styles.segment} hitSlop={6}>
        <Text style={[styles.label, language === 'tr' && styles.activeLabel]}>{t('languageTurkish')}</Text>
      </Pressable>
      <Pressable onPress={() => setLanguage('en')} style={styles.segment} hitSlop={6}>
        <Text style={[styles.label, language === 'en' && styles.activeLabel]}>{t('languageEnglish')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
    overflow: 'hidden',
    padding: 3,
    width: 90,
  },
  indicator: {
    backgroundColor: '#34d399',
    borderRadius: 999,
    bottom: 3,
    left: 3,
    position: 'absolute',
    top: 3,
    width: segmentWidth,
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
  },
  activeLabel: {
    color: '#022c22',
  },
});
