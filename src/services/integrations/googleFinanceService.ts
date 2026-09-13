// Serviço frontend para consumir a Edge Function google-finance.
// Busca índices globais (S&P 500, Nasdaq, etc.) e moedas via proxy seguro no Supabase.

import { supabase } from '@/config/supabase';

export interface GlobalQuote {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  marketState: string;
}

export interface GlobalMarketOverview {
  indices: GlobalQuote[];
  currencies: GlobalQuote[];
  fetchedAt: string;
}

// Nomes amigáveis para os símbolos
export const SYMBOL_LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'Nasdaq',
  '^DJI': 'Dow Jones',
  '^FTSE': 'FTSE 100',
  '^N225': 'Nikkei 225',
  'USDBRL=X': 'USD/BRL',
  'EURBRL=X': 'EUR/BRL',
  'BTC-USD': 'Bitcoin',
};

export async function getGlobalMarketOverview(): Promise<GlobalMarketOverview> {
  const { data, error } = await supabase.functions.invoke('google-finance');

  if (error) {
    throw new Error(`Erro ao buscar mercado global: ${error.message}`);
  }

  return data as GlobalMarketOverview;
}
