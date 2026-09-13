// Supabase Edge Function: google-finance
// Busca dados de mercado global via Yahoo Finance (endpoint v8/chart — mais estável).
// Roda no servidor — evita CORS e expõe apenas o necessário ao frontend.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INDICES = ['^GSPC', '^IXIC', '^DJI', '^FTSE', '^N225'];
const CURRENCIES = ['USDBRL=X', 'EURBRL=X', 'BTC-USD'];

interface Quote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  marketState: string;
}

async function fetchQuote(symbol: string): Promise<Quote | null> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
    const price = meta.regularMarketPrice ?? 0;
    const change = price - previousClose;
    const changePct = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: symbol,
      shortName: meta.shortName ?? symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePct,
      currency: meta.currency ?? 'USD',
      marketState: meta.marketState ?? 'CLOSED',
    };
  } catch (e) {
    console.error(`Error fetching ${symbol}:`, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const allSymbols = [...INDICES, ...CURRENCIES];

    // Fetch all in parallel
    const results = await Promise.all(allSymbols.map(fetchQuote));

    const quoteMap = new Map<string, Quote>();
    results.forEach((q) => { if (q) quoteMap.set(q.symbol, q); });

    const indices = INDICES.map((s) => quoteMap.get(s)).filter(Boolean) as Quote[];
    const currencies = CURRENCIES.map((s) => {
      // BTC-USD é retornado como BTC-USD mas a gente busca BTC-USD
      const q = quoteMap.get(s);
      return q;
    }).filter(Boolean) as Quote[];

    const payload = {
      indices,
      currencies,
      fetchedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('Edge Function error:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Erro interno' }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
