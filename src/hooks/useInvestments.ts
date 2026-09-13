import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export type AssetType = 'STOCK' | 'FII' | 'FIXED_INCOME' | 'CRYPTO' | 'BDR' | 'ETF' | 'FUND';

export interface RawInvestment {
  id: string;
  ticker: string;
  name: string;
  investment_type: AssetType;
  quantity: number;
  average_price: number;
}

export interface InvestmentPosition extends RawInvestment {
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  dailyChangePercent: number;
  allocationPercent: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfit: number;
  totalProfitPercent: number;
  dailyChangePercent: number;
  allocationByType: Record<string, { value: number; percent: number }>;
}

const B3_TYPES: AssetType[] = ['STOCK', 'FII', 'BDR', 'ETF'];

const emptySummary: PortfolioSummary = {
  totalInvested: 0,
  totalCurrentValue: 0,
  totalProfit: 0,
  totalProfitPercent: 0,
  dailyChangePercent: 0,
  allocationByType: {},
};

export function useInvestments() {
  const [positions, setPositions] = useState<InvestmentPosition[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase.from('investments').select('*');
      if (dbError) throw new Error(dbError.message);

      const items = (data ?? []) as RawInvestment[];
      if (items.length === 0) {
        setPositions([]);
        setPortfolioSummary(emptySummary);
        return;
      }

      let totalValue = 0;
      let totalInvested = 0;

      const withPrices = items.map((item) => {
        const currentPrice = Number(item.average_price);
        const quantity = Number(item.quantity) || 0;
        const avgPrice = Number(item.average_price) || 0;
        const totalCost = quantity * avgPrice;
        const currentValue = quantity * currentPrice;
        totalValue += currentValue;
        totalInvested += totalCost;
        return {
          ...item,
          currentPrice,
          currentValue,
          totalCost,
          profit: currentValue - totalCost,
          profitPercent: totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0,
          dailyChangePercent: 0,
          allocationPercent: 0,
        };
      });

      const allocationByType: Record<string, { value: number; percent: number }> = {};
      withPrices.forEach((p) => {
        const key = p.investment_type || 'OTHER';
        if (!allocationByType[key]) allocationByType[key] = { value: 0, percent: 0 };
        allocationByType[key].value += p.currentValue;
      });
      Object.keys(allocationByType).forEach((k) => {
        allocationByType[k].percent = totalValue > 0 ? (allocationByType[k].value / totalValue) * 100 : 0;
      });

      const enriched = withPrices.map((p) => ({
        ...p,
        allocationPercent: totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0,
      }));

      const totalProfit = totalValue - totalInvested;
      setPositions(enriched);
      setPortfolioSummary({
        totalInvested,
        totalCurrentValue: totalValue,
        totalProfit,
        totalProfitPercent: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
        dailyChangePercent:
          withPrices.length > 0
            ? withPrices.reduce((s, p) => s + p.dailyChangePercent, 0) / withPrices.length
            : 0,
        allocationByType,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return { positions, portfolioSummary, loading, error, refresh: fetchPortfolio };
}
