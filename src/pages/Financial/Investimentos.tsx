import { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { useInvestments } from '../../hooks/useInvestments';
import { useMarketOverview } from '../../hooks/useMarketOverview';
import { useGlobalMarket } from '../../hooks/useGlobalMarket';
import { SYMBOL_LABELS } from '../../services/integrations/googleFinanceService';
import { useModuleColors, defaultModuleColors } from '@/hooks/useModuleColors';
import { PortfolioAllocationChart } from '../../components/financial/PortfolioAllocationChart';
import { PortfolioEvolutionChart } from '../../components/financial/PortfolioEvolutionChart';
import { Wallet, TrendingUp, DollarSign, ArrowRightLeft, Calendar, PieChart } from 'lucide-react';

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Page() {
  const { positions, portfolioSummary, loading, error, refresh } = useInvestments();
  const { overview, loading: overviewLoading, refresh: refreshOverview } = useMarketOverview();
  const { overview: globalOverview, loading: globalLoading, refresh: refreshGlobal } = useGlobalMarket();

  const { colors } = useModuleColors();
  const themeColor = colors['investimentos'] || defaultModuleColors['investimentos'] || '#3B82F6';

  const handleRefresh = () => {
    refresh();
    refreshOverview();
    refreshGlobal();
  };

  const totalProfitPercent = portfolioSummary.totalInvested > 0 
    ? (portfolioSummary.totalProfit / portfolioSummary.totalInvested) * 100 
    : 0;

  const topHoldings = useMemo(() => {
    return [...positions].sort((a, b) => b.current_value - a.current_value).slice(0, 5);
  }, [positions]);

  const marketWatchItems = useMemo(() => {
    const items = [];
    if (globalOverview) {
      globalOverview.indices.forEach(idx => {
        items.push({
          label: SYMBOL_LABELS[idx.symbol] ?? idx.shortName,
          price: idx.regularMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          percent: idx.regularMarketChangePercent,
          currency: ''
        });
      });
      globalOverview.currencies.forEach(cur => {
        items.push({
          label: SYMBOL_LABELS[cur.symbol] ?? cur.shortName,
          price: cur.regularMarketPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          percent: cur.regularMarketChangePercent,
          currency: ''
        });
      });
    }
    if (overview) {
      if (overview.index) {
        items.push({
          label: 'Ibovespa',
          price: overview.index.regularMarketPrice.toLocaleString('pt-BR'),
          percent: overview.index.regularMarketChangePercent,
          currency: 'pts'
        });
      }
      if (overview.usdBrl) {
        items.push({
          label: 'Dólar',
          price: `R$ ${overview.usdBrl.regularMarketPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          percent: overview.usdBrl.regularMarketChangePercent,
          currency: ''
        });
      }
    }
    return items;
  }, [overview, globalOverview]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
            Investimentos
          </h1>
          <p className="text-[#8E95A5] text-sm mt-1">Visão geral do seu patrimônio e mercados</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || overviewLoading || globalLoading}
          className="px-4 py-2 rounded-xl disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg active:scale-95"
          style={{ backgroundColor: themeColor, boxShadow: `0 4px 14px -4px ${themeColor}80` }}
        >
          {(loading || overviewLoading || globalLoading) ? 'Atualizando...' : 'Atualizar cotações'}
        </button>
      </div>

      {error && (
        <Card variant="financial" className="p-4">
          <p className="text-sm text-[#F43F5E]">{error}</p>
        </Card>
      )}

      {/* 1. Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Portfolio Value */}
        <Card variant="financial" className="p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-[#7C5CFC]/10 p-2.5 rounded-xl">
              <Wallet className="w-5 h-5 text-[#7C5CFC]" />
            </div>
          </div>
          <div>
            <p className="text-[#8E95A5] text-sm font-medium">Patrimônio Total</p>
            <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(portfolioSummary.totalCurrentValue)}</h3>
          </div>
        </Card>

        {/* Total Gains */}
        <Card variant="financial" className="p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2.5 rounded-xl ${portfolioSummary.totalProfit >= 0 ? 'bg-[#10B981]/10' : 'bg-[#F43F5E]/10'}`}>
              <TrendingUp className={`w-5 h-5 ${portfolioSummary.totalProfit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`} />
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${portfolioSummary.totalProfit >= 0 ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#F43F5E]/10 text-[#F43F5E]'}`}>
              {formatPercent(totalProfitPercent)}
            </span>
          </div>
          <div>
            <p className="text-[#8E95A5] text-sm font-medium">Lucro/Prejuízo Total</p>
            <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(portfolioSummary.totalProfit)}</h3>
          </div>
        </Card>

        {/* Total Invested */}
        <Card variant="financial" className="p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-[#06B6D4]/10 p-2.5 rounded-xl">
              <DollarSign className="w-5 h-5 text-[#06B6D4]" />
            </div>
          </div>
          <div>
            <p className="text-[#8E95A5] text-sm font-medium">Total Aportado</p>
            <h3 className="text-3xl font-bold text-white mt-1">{formatPrice(portfolioSummary.totalInvested)}</h3>
          </div>
        </Card>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[340px]">
        <div className="lg:col-span-2 h-[340px] lg:h-full">
           <PortfolioEvolutionChart currentSummary={portfolioSummary} />
        </div>
        <div className="lg:col-span-1 h-[340px] lg:h-full">
           <PortfolioAllocationChart summary={portfolioSummary} />
        </div>
      </div>

      {/* 3. Market Watch */}
      <Card variant="financial" className="p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Market Watch</h2>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {marketWatchItems.length === 0 && (
            <p className="text-sm text-[#8E95A5]">Carregando cotações do mercado...</p>
          )}
          {marketWatchItems.map((item, idx) => (
             <div key={idx} className="shrink-0 min-w-[150px] bg-[#12141F] border border-[#232735] rounded-xl p-3 hover:border-[#3B82F6]/30 transition-colors">
               <p className="text-xs text-[#8E95A5] mb-1 font-medium">{item.label}</p>
               <p className="text-lg font-bold text-white leading-tight">
                 {item.price} <span className="text-[10px] font-normal text-[#6B7280]">{item.currency}</span>
               </p>
               <p className={`text-xs font-semibold mt-1 ${item.percent >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                 {formatPercent(item.percent)}
               </p>
             </div>
          ))}
        </div>
      </Card>

      {/* 4. Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card variant="financial" className="p-5 h-[280px] flex flex-col">
           <div className="flex items-center gap-2 mb-4 text-white font-medium">
             <ArrowRightLeft className="w-4 h-4 text-[#8E95A5]" />
             Transações Recentes
           </div>
           <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#232735] rounded-xl bg-[#12141F]/50">
             <ArrowRightLeft className="w-8 h-8 text-[#334155] mb-2" />
             <p className="text-sm text-[#8E95A5]">Nenhuma transação recente</p>
             <span className="text-xs text-[#475569] mt-1">Em breve</span>
           </div>
        </Card>

        {/* Top Holdings */}
        <Card variant="financial" className="p-5 h-[280px] flex flex-col">
           <div className="flex items-center gap-2 mb-4 text-white font-medium">
             <PieChart className="w-4 h-4 text-[#8E95A5]" />
             Maiores Posições
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
             {topHoldings.length === 0 ? (
               <div className="h-full flex items-center justify-center">
                 <p className="text-sm text-[#8E95A5]">Nenhuma posição encontrada</p>
               </div>
             ) : (
               topHoldings.map((p) => (
                 <div key={p.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-[#12141F] transition-colors border border-transparent hover:border-[#232735]">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded bg-[#1D2029] flex items-center justify-center border border-[#232735] shrink-0">
                       <span className="text-xs font-bold text-white">{p.ticker.substring(0, 2)}</span>
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-white">{p.ticker}</p>
                       <p className="text-[10px] text-[#8E95A5] uppercase">{p.type}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-medium text-white">{formatPrice(p.current_value)}</p>
                     <p className={`text-xs font-medium ${p.profit_percentage >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                       {formatPercent(p.profit_percentage)}
                     </p>
                   </div>
                 </div>
               ))
             )}
           </div>
        </Card>

        {/* Upcoming Events */}
        <Card variant="financial" className="p-5 h-[280px] flex flex-col">
           <div className="flex items-center gap-2 mb-4 text-white font-medium">
             <Calendar className="w-4 h-4 text-[#8E95A5]" />
             Eventos (Proventos)
           </div>
           <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#232735] rounded-xl bg-[#12141F]/50">
             <Calendar className="w-8 h-8 text-[#334155] mb-2" />
             <p className="text-sm text-[#8E95A5]">Nenhum evento próximo</p>
             <span className="text-xs text-[#475569] mt-1">Em breve</span>
           </div>
        </Card>
      </div>

    </div>
  );
}
