import { memo, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, Sparkles } from 'lucide-react-native';

import { TranslationKey, useI18n } from '../i18n';
import {
  formatSignedPercent,
  getAssetTheme,
  getChangeToneColor,
} from '../lib/marketAdviceTheme';
import type { MarketInvestmentAdvice } from '../types/market';

type Props = {
  showMarketAdvice: boolean;
  isLoading: boolean;
  errorKey: TranslationKey | null;
  advice: MarketInvestmentAdvice | null;
  fallbackText: string;
  locale: string;
};

function MarketAdviceCardComponent({
  showMarketAdvice,
  isLoading,
  errorKey,
  advice,
  fallbackText,
  locale,
}: Props) {
  const { t } = useI18n();

  const assetTheme = useMemo(
    () => (advice ? getAssetTheme(advice.assetSymbol, advice.assetName) : null),
    [advice],
  );

  const formattedNetGain = useMemo(
    () =>
      advice
        ? advice.netGain.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : null,
    [advice, locale],
  );

  const formattedGainAmount = formattedNetGain ? `${formattedNetGain} TL` : null;

  const formattedChange = useMemo(
    () => (advice ? formatSignedPercent(advice.changePct, locale) : null),
    [advice, locale],
  );

  const changeColor = advice ? getChangeToneColor(advice.changePct) : '#94A3B8';
  const AssetIcon = assetTheme?.icon ?? Sparkles;
  const showSimulation = showMarketAdvice && Boolean(advice) && Boolean(assetTheme);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.card, showSimulation && { borderColor: assetTheme?.border }]}>
        <LinearGradient
          colors={
            showSimulation
              ? ['rgba(255,255,255,0.08)', 'rgba(15,23,42,0.45)', 'rgba(2,6,23,0.72)']
              : ['rgba(255,255,255,0.06)', 'rgba(15,23,42,0.52)', 'rgba(2,6,23,0.78)']
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {showSimulation ? (
          <View
            pointerEvents="none"
            style={[styles.assetGlow, { backgroundColor: assetTheme?.glow }]}
          />
        ) : null}

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleBadge}>
              <LineChart color="#5EEAD4" size={16} strokeWidth={2.2} />
              <Text style={styles.title}>{t('financialAdvice')}</Text>
            </View>
            {showSimulation ? (
              <View style={[styles.symbolPill, { backgroundColor: assetTheme?.accentMuted, borderColor: assetTheme?.border }]}>
                <AssetIcon color={assetTheme?.accent ?? '#34D399'} size={14} strokeWidth={2.2} />
                <Text style={[styles.symbolText, { color: assetTheme?.accent }]}>
                  {advice?.assetSymbol}
                </Text>
              </View>
            ) : null}
          </View>

          {showMarketAdvice && isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#34D399" size="small" />
              <Text style={styles.loadingText}>{t('marketAdviceLoading')}</Text>
            </View>
          ) : showSimulation ? (
            <>
              <View style={styles.assetHeader}>
                <View style={[styles.assetIconWrap, { backgroundColor: assetTheme?.accentMuted, borderColor: assetTheme?.border }]}>
                  <AssetIcon color={assetTheme?.accent ?? '#34D399'} size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.assetCopy}>
                  <Text style={[styles.assetName, { color: assetTheme?.accent }]}>{advice?.assetName}</Text>
                  <Text style={[styles.changeValue, { color: changeColor }]}>{formattedChange}</Text>
                </View>
              </View>

              <Text style={styles.simulationText}>
                {t('marketAdviceSimulationLead')}
                <Text style={[styles.highlight, { color: assetTheme?.accent }]}>{advice?.assetName}</Text>
                {t('marketAdviceSimulationMid')}
                <Text style={[styles.highlight, { color: changeColor }]}>
                  {formattedChange}
                </Text>
                {t('marketAdviceSimulationBeforeGain')}
                <Text style={[styles.highlight, { color: changeColor }]}>
                  {formattedGainAmount}
                </Text>
                {t('marketAdviceSimulationAfterGain')}
              </Text>
            </>
          ) : (
            <>
              {showMarketAdvice && errorKey ? (
                <Text style={styles.errorHint}>{t(errorKey)}</Text>
              ) : null}
              <Text style={styles.fallbackText}>{fallbackText}</Text>
            </>
          )}
        </View>
      </View>

      {showSimulation ? <Text style={styles.disclaimer}>{t('marketAdviceDisclaimer')}</Text> : null}
    </View>
  );
}

export const MarketAdviceCard = memo(MarketAdviceCardComponent);

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  card: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  assetGlow: {
    borderRadius: 999,
    height: 120,
    position: 'absolute',
    right: -28,
    top: -36,
    width: 120,
  },
  content: {
    gap: 14,
    padding: 18,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  symbolPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  symbolText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  assetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  assetIconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  assetCopy: {
    flex: 1,
    gap: 4,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  simulationText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 21,
  },
  highlight: {
    fontWeight: '900',
  },
  errorHint: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  fallbackText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 21,
  },
  disclaimer: {
    color: 'rgba(251, 113, 133, 0.72)',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
    paddingHorizontal: 4,
  },
});
