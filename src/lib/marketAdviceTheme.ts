import type { LucideIcon } from 'lucide-react-native';
import { Bitcoin, Coins, Gem, Sparkles } from 'lucide-react-native';

export type AssetVisualTheme = {
  accent: string;
  accentMuted: string;
  border: string;
  glow: string;
  icon: LucideIcon;
};

const ASSET_THEMES: Record<string, AssetVisualTheme> = {
  BTC: {
    accent: '#F7931A',
    accentMuted: 'rgba(247, 147, 26, 0.16)',
    border: 'rgba(247, 147, 26, 0.35)',
    glow: 'rgba(247, 147, 26, 0.12)',
    icon: Bitcoin,
  },
  ETH: {
    accent: '#818CF8',
    accentMuted: 'rgba(129, 140, 248, 0.16)',
    border: 'rgba(129, 140, 248, 0.35)',
    glow: 'rgba(129, 140, 248, 0.12)',
    icon: Gem,
  },
  XAU: {
    accent: '#FBBF24',
    accentMuted: 'rgba(251, 191, 36, 0.16)',
    border: 'rgba(251, 191, 36, 0.35)',
    glow: 'rgba(251, 191, 36, 0.12)',
    icon: Coins,
  },
  SI: {
    accent: '#CBD5E1',
    accentMuted: 'rgba(203, 213, 225, 0.14)',
    border: 'rgba(203, 213, 225, 0.28)',
    glow: 'rgba(203, 213, 225, 0.1)',
    icon: Sparkles,
  },
  XAG: {
    accent: '#CBD5E1',
    accentMuted: 'rgba(203, 213, 225, 0.14)',
    border: 'rgba(203, 213, 225, 0.28)',
    glow: 'rgba(203, 213, 225, 0.1)',
    icon: Sparkles,
  },
};

const NAME_THEMES: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  altın: 'XAU',
  altin: 'XAU',
  gold: 'XAU',
  gümüş: 'SI',
  gumus: 'SI',
  silver: 'SI',
};

const DEFAULT_THEME: AssetVisualTheme = {
  accent: '#34D399',
  accentMuted: 'rgba(52, 211, 153, 0.14)',
  border: 'rgba(52, 211, 153, 0.28)',
  glow: 'rgba(52, 211, 153, 0.1)',
  icon: Sparkles,
};

export const getAssetTheme = (assetSymbol: string, assetName?: string): AssetVisualTheme => {
  const symbolKey = assetSymbol.trim().toUpperCase();
  if (ASSET_THEMES[symbolKey]) {
    return ASSET_THEMES[symbolKey];
  }

  const nameKey = assetName?.trim().toLocaleLowerCase('tr-TR') ?? '';
  const mappedSymbol = NAME_THEMES[nameKey];
  if (mappedSymbol && ASSET_THEMES[mappedSymbol]) {
    return ASSET_THEMES[mappedSymbol];
  }

  return DEFAULT_THEME;
};

export const getChangeToneColor = (changePct: number) => {
  if (changePct > 0) {
    return '#4ADE80';
  }

  if (changePct < 0) {
    return '#F87171';
  }

  return '#94A3B8';
};

export const formatSignedPercent = (changePct: number, locale: string) => {
  const formatted = Math.abs(changePct).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  if (changePct > 0) {
    return `+%${formatted}`;
  }

  if (changePct < 0) {
    return `-%${formatted}`;
  }

  return `%${formatted}`;
};
