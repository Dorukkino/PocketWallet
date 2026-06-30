export type MarketAssetType = 'commodity' | 'crypto' | 'forex' | 'stock';

export type MarketPerformance = {
  id: string;
  assetName: string;
  assetSymbol: string;
  assetType: MarketAssetType;
  changePct: number;
  period: string;
  updatedAt: string;
};

export type MarketPerformanceRow = {
  id: string;
  asset_name: string;
  asset_symbol: string;
  asset_type: MarketAssetType;
  change_pct: number;
  period: string;
  updated_at: string;
};

export const fromMarketPerformanceRow = (row: MarketPerformanceRow): MarketPerformance => ({
  id: row.id,
  assetName: row.asset_name,
  assetSymbol: row.asset_symbol,
  assetType: row.asset_type,
  changePct: row.change_pct,
  period: row.period,
  updatedAt: row.updated_at,
});

export type MarketInvestmentAdvice = {
  assetName: string;
  assetSymbol: string;
  changePct: number;
  savingsAmount: number;
  netGain: number;
  updatedAt: string;
};
