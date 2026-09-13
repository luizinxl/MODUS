import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PortfolioSummary } from '../../hooks/useInvestments';

interface Props {
  summary: PortfolioSummary;
  className?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  STOCK: { label: 'Ações', color: '#7C5CFC' },
  FII: { label: 'FIIs', color: '#10B981' },
  FIXED_INCOME: { label: 'Renda Fixa', color: '#F59E0B' },
  CRYPTO: { label: 'Cripto', color: '#A855F7' },
  BDR: { label: 'BDRs', color: '#EC4899' },
  ETF: { label: 'ETFs', color: '#06B6D4' },
  FUND: { label: 'Fundos', color: '#6B7280' },
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export const PortfolioAllocationChart: React.FC<Props> = ({ summary, className = '' }) => {
  const chartData = useMemo(() => {
    return Object.entries(summary.allocationByType)
      .filter(([, data]) => data.value > 0)
      .map(([type, data]) => ({
        type,
        name: TYPE_CONFIG[type]?.label || type,
        value: data.value,
        percent: data.percent,
        color: TYPE_CONFIG[type]?.color || '#9CA3AF',
      }))
      .sort((a, b) => b.value - a.value); // Sort by highest allocation
  }, [summary]);

  if (summary.totalCurrentValue === 0 || chartData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-[#111319] rounded-xl border border-[#1E222D] h-full ${className}`}>
        <p className="text-[#8E95A5] text-xs font-medium">Nenhum ativo alocado</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-3 bg-[#111319] rounded-xl border border-[#1E222D] flex flex-col h-full ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-white text-sm">Asset Allocation</h3>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-4 mt-1">
        <div className="h-32 w-32 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: any = payload[0];
                    return (
                      <div className="bg-[#12141F] text-white text-xs p-2.5 rounded-xl shadow-xl border border-[#2B3145]">
                        <span className="text-[#8E95A5]">{data.payload.name}: </span>
                        <strong>{formatCurrency(data.value)}</strong>
                        <div className="text-[10px] text-[#9B82FF] mt-0.5">{data.payload.percent.toFixed(1)}% da carteira</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.type}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Valor centralizado opcional */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-white leading-tight">{formatCurrency(summary.totalCurrentValue)}</span>
            <span className="text-[10px] text-[#8E95A5] leading-tight">Total Value</span>
          </div>
        </div>

        {/* Legenda Lateral estilo FinSight */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-32 pr-1 custom-scrollbar">
          {chartData.map((item) => (
            <div key={item.type} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[#8E95A5] truncate max-w-[80px]" title={item.name}>{item.name}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-white text-xs">{item.percent.toFixed(1)}%</span>
                <span className="text-[#8E95A5] text-[10px] w-16">{formatCurrency(item.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PortfolioAllocationChart;
