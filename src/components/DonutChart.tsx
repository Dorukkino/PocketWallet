import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatCurrencyValue } from '../lib/currency';
import type { CategoryStat, CurrencyCode, ExchangeRates } from '../types/budget';

type Props = {
  stats: CategoryStat[];
  totalExpense: number;
  currency: CurrencyCode;
  exchangeRates: ExchangeRates;
};

const center = 60;
const radius = 50;

const polarToCartesian = (angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const createPieSlicePath = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
};

export function DonutChart({ stats, totalExpense, currency, exchangeRates }: Props) {
  let accumulatedAngle = 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Harcama Analizi</Text>
      <Text style={styles.subtitle}>Bu ayki kategorisel gider dağılımı</Text>

      {stats.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Henüz harcama yok</Text>
          <Text style={styles.emptyText}>Gider eklediğinde grafik otomatik oluşacak.</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartPanel}>
            <View style={styles.chartWrap}>
              <Svg width={220} height={220} viewBox="0 0 120 120">
              {stats.map((stat) => {
                const sliceAngle = (stat.total / totalExpense) * 360;
                const startAngle = accumulatedAngle;
                const endAngle = accumulatedAngle + sliceAngle;
                accumulatedAngle = endAngle;

                return (
                  <Path
                    key={stat.name}
                    d={createPieSlicePath(startAngle, endAngle)}
                    fill={stat.color}
                  />
                );
              })}
              </Svg>
            </View>

            <Text style={styles.totalLabel}>Toplam: {formatCurrencyValue(totalExpense, currency, exchangeRates)}</Text>

            <View style={styles.compactLegend}>
              {stats.map((stat) => (
                <View key={`compact-${stat.name}`} style={styles.compactLegendItem}>
                  <View style={[styles.legendDot, { backgroundColor: stat.color }]} />
                  <Text style={styles.compactLegendText}>{stat.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.legend}>
            {stats.map((stat) => (
              <View key={stat.name} style={styles.legendItem}>
                <View style={styles.legendContent}>
                  <View style={styles.legendTop}>
                    <View style={styles.legendNameRow}>
                      <View style={[styles.legendDot, { backgroundColor: stat.color }]} />
                      <Text style={styles.legendName}>{stat.name}</Text>
                    </View>
                    <Text style={styles.legendPercent}>%{stat.percentage}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${stat.percentage}%`, backgroundColor: stat.color }]} />
                  </View>
                </View>
                <Text style={styles.legendAmount}>{formatCurrencyValue(stat.total, currency, exchangeRates)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(51, 65, 85, 0.78)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  emptyBox: {
    alignItems: 'center',
    borderColor: '#1e293b',
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 18,
    padding: 28,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  chartPanel: {
    alignItems: 'center',
    borderRadius: 24,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '900',
    marginTop: -4,
  },
  compactLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    justifyContent: 'center',
    marginTop: 12,
  },
  compactLegendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  compactLegendText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  legend: {
    gap: 13,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  legendContent: {
    flex: 1,
    gap: 7,
  },
  legendTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  legendDot: {
    borderRadius: 3,
    height: 8,
    width: 8,
  },
  legendName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
  },
  legendPercent: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#020617',
    borderRadius: 999,
    height: 5,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  legendAmount: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 58,
    textAlign: 'right',
  },
});
