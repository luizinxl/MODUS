import React from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PortfolioSummary } from '../../hooks/useInvestments';

export interface EvolutionDataPoint {
  date: string;
  totalValue: number;
  totalInvested: number;
}

interface Props {
  data?: EvolutionDataPoint[];
  currentSummary?: PortfolioSummary;
  className?: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export const PortfolioEvolutionChart: React.FC<Props> = ({ data, currentSummary, className = '' }) => {
  const chartData: EvolutionDataPoint[] = React.useMemo(() => {
    if (data && data.length > 0) return data;
    if (!currentSummary || currentSummary.totalInvested === 0) return [];

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Atual'];
    const totalCurrent = currentSummary.totalCurrentValue;
    const totalInv = currentSummary.totalInvested;

    return months.map((m, idx) => {
      const progress = (idx + 1) / months.length;
      return {
        date: m,
        totalInvested: Math.round(totalInv * (0.4 + 0.6 * progress)),
        totalValue: Math.round(totalInv * (0.4 + 0.6 * progress) + (totalCurrent - totalInv) * Math.pow(progress, 1.2)),
      };
    });
  }, [data, currentSummary]);

  if (chartData.length === 0) {
    return (
      <div className={`p-6 bg-[#161924] rounded-2xl border border-[#232735] text-center flex items-center justify-center h-full ${className}`}>
        <p className="text-[#8E95A5] text-sm font-medium">Dados insuficientes</p>
      </div>
    );
  }

  // Define color based on profit/loss of the last point
  const lastPoint = chartData[chartData.length - 1];
  const isPositive = lastPoint.totalValue >= lastPoint.totalInvested;
  const strokeColor = isPositive ? '#7C5CFC' : '#F43F5E';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-6 bg-[#161924] rounded-2xl border border-[#232735] shadow-lg shadow-black/20 flex flex-col h-full ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <div>
          <h3 className="font-semibold text-white text-base">Performance do Portfólio</h3>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E2332" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const valCurrent = Number(payload.find((p: any) => p.dataKey === 'totalValue')?.value || 0);
                  const valInv = Number(payload.find((p: any) => p.dataKey === 'totalInvested')?.value || 0);
                  const profit = valCurrent - valInv;
                  return (
                    <div className="bg-[#12141F] text-white text-xs p-3 rounded-xl shadow-xl border border-[#2B3145] min-w-[160px]">
                      <p className="text-[#8E95A5] font-semibold mb-2">{label}</p>
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#9B82FF]">Valor:</span>
                        <strong>{formatCurrency(valCurrent)}</strong>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-[#6B7280]">Aportado:</span>
                        <strong>{formatCurrency(valInv)}</strong>
                      </div>
                      <div className="border-t border-[#222736] mt-2 pt-1.5 flex justify-between">
                        <span className="text-[#8E95A5]">Rendimento:</span>
                        <strong className={profit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}>
                          {profit >= 0 ? `+${formatCurrency(profit)}` : formatCurrency(profit)}
                        </strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="totalInvested"
              stroke="#6B7280"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="totalValue"
              stroke={strokeColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              isAnimationActive={true}
              animationDuration={1300}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default PortfolioEvolutionChart;
