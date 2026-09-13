import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
export interface HistoryPoint {
  date: number;
  close: number;
  volume: number;
}
interface Props {
  ticker: string;
  averagePrice?: number;
  className?: string;
}

type RangeOption = '1mo' | '3mo' | '6mo' | '1y' | 'max';

const RANGE_LABELS: { label: string; value: RangeOption }[] = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1A', value: '1y' },
  { label: 'MAX', value: 'max' },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const PositionHistoryChart: React.FC<Props> = ({ ticker, averagePrice, className = '' }) => {
  const [range, setRange] = useState<RangeOption>('3mo');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!ticker) return;
      setLoading(true);
      const data: HistoryPoint[] = [];
      if (mounted) {
        setHistory(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [ticker, range]);

  const firstClose = history[0]?.close || 0;
  const lastClose = history[history.length - 1]?.close || 0;
  const periodReturn = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const isPositive = periodReturn >= 0;
  const chartColor = isPositive ? '#10B981' : '#F43F5E';

  const chartData = history.map((item) => ({
    date: new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    fullDate: new Date(item.date * 1000).toLocaleDateString('pt-BR'),
    close: item.close,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-6 bg-[#161924] rounded-2xl border border-[#222736] shadow-lg shadow-black/20 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">{ticker.toUpperCase()}</h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isPositive
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/30'
              }`}
            >
              {periodReturn > 0 ? `+${periodReturn.toFixed(2)}%` : `${periodReturn.toFixed(2)}%`}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-black text-white">
              {lastClose > 0 ? formatCurrency(lastClose) : '--'}
            </span>
            {!!averagePrice && averagePrice > 0 && (
              <span className="text-xs text-[#8E95A5]">
                PM: <strong className="text-zinc-300">{formatCurrency(averagePrice)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center bg-[#12141F] border border-[#222736] p-1 rounded-xl">
          {RANGE_LABELS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                range === r.value
                  ? 'bg-[#7C5CFC] text-white shadow-sm shadow-[#7C5CFC]/40'
                  : 'text-[#8E95A5] hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[#8E95A5] text-sm">Carregando…</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8E95A5] text-sm">
            Histórico não disponível para {ticker}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E2332" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <YAxis
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$${val.toFixed(0)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: any = payload[0].payload;
                    return (
                      <div className="bg-[#12141F] text-white text-xs p-3 rounded-xl shadow-xl border border-[#2B3145]">
                        <p className="text-[#8E95A5] mb-1">{d.fullDate}</p>
                        <p className="font-bold text-sm">{formatCurrency(d.close)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {!!averagePrice && averagePrice > 0 && (
                <ReferenceLine
                  y={averagePrice}
                  stroke="#7C5CFC"
                  strokeDasharray="4 4"
                  label={{ value: `PM ${formatCurrency(averagePrice)}`, fill: '#9B82FF', fontSize: 10, position: 'top' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${ticker})`}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default PositionHistoryChart;
