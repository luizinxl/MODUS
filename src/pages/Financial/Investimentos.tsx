import { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { useInvestments } from '../../hooks/useInvestments';
import { useGlobalMarket } from '../../hooks/useGlobalMarket';
import { SYMBOL_LABELS } from '../../services/integrations/googleFinanceService';
import { useModuleColors, defaultModuleColors } from '@/hooks/useModuleColors';
import { PortfolioAllocationChart } from '../../components/financial/PortfolioAllocationChart';
import { PortfolioEvolutionChart } from '../../components/financial/PortfolioEvolutionChart';
import { Wallet, TrendingUp, DollarSign, ArrowRightLeft, Calendar, PieChart, Briefcase, Activity } from 'lucide-react';

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Mock Data to match FinSight design
const MOCK_TRANSACTIONS = [
  { id: 1, name: 'Apple Inc. (AAPL)', action: 'Buy 2 Shares', date: 'May 18, 2025', amount: -382.90, icon: '🍎' },
  { id: 2, name: 'Dividend from Microsoft', action: 'May 17, 2025', date: '', amount: 50.25, icon: '🪟' },
  { id: 3, name: 'Vanguard S&P 500 ETF', action: 'Buy 1 Share', date: 'May 16, 2025', amount: -410.50, icon: 'V' },
  { id: 4, name: 'Interest from Savings', action: 'May 15, 2025', date: '', amount: 12.35, icon: '💰' },
];

const MOCK_EVENTS = [
  { id: 1, title: 'Fed Interest Rate Decision', date: 'May 21, 2025', icon: <Calendar className="w-4 h-4 text-[#A855F7]" /> },
  { id: 2, title: 'Earnings Report - NVIDIA', date: 'May 28, 2025', icon: <Calendar className="w-4 h-4 text-[#10B981]" /> },
  { id: 3, title: 'Jobs Report', date: 'June 6, 2025', icon: <Calendar className="w-4 h-4 text-[#F59E0B]" /> },
];

export default function Page() {
  const { positions, portfolioSummary, loading, error, refresh } = useInvestments();
  const { overview: globalOverview, loading: globalLoading, refresh: refreshGlobal } = useGlobalMarket();

  const { colors } = useModuleColors();
  const themeColor = colors['investimentos'] || defaultModuleColors['investimentos'] || '#3B82F6';

  const handleRefresh = () => {
    refresh();
    refreshGlobal();
  };

  const totalProfitPercent = portfolioSummary.totalInvested > 0 
    ? (portfolioSummary.totalProfit / portfolioSummary.totalInvested) * 100 
    : 0;

  // Emulate FinSight design with user data if available, else placeholders
  const topHoldings = useMemo(() => {
    return [...positions].sort((a, b) => b.currentValue - a.currentValue).slice(0, 4);
  }, [positions]);

  const marketWatchItems = useMemo(() => {
    const items: any[] = [];
    if (globalOverview?.indices && globalOverview?.currencies) {
      globalOverview.indices.forEach(quote => {
        items.push({
          label: SYMBOL_LABELS[quote.symbol] || quote.symbol,
          price: quote.regularMarketPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00',
          percent: quote.regularMarketChangePercent ?? 0,
          currency: ''
        });
      });
      globalOverview.currencies.forEach(quote => {
        items.push({
          label: SYMBOL_LABELS[quote.symbol] || quote.symbol,
          price: quote.regularMarketPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00',
          percent: quote.regularMarketChangePercent ?? 0,
          currency: ''
        });
      });
    }
    return items;
  }, [globalOverview]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-3 overflow-hidden">
      {/* Header compact */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Dashboard Overview
          </h1>
          <p className="text-[#8E95A5] text-xs">Here's what's happening with your investments today.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || globalLoading}
          className="px-3 py-1.5 rounded-lg disabled:opacity-50 text-white text-xs font-medium transition-all"
          style={{ backgroundColor: '#1D2029', border: '1px solid #232735' }}
        >
          {(loading || globalLoading) ? 'Updating...' : 'Update Data'}
        </button>
      </div>

      {/* 1. Dashboard Overview (4 Cards) */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {/* Total Portfolio Value */}
        <Card variant="financial" className="p-3 flex flex-col justify-between bg-[#111319] border-[#1E222D]">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[#8E95A5] text-xs font-medium">Total Portfolio Value</p>
            <div className="bg-[#10B981]/10 p-1.5 rounded-lg">
              <Wallet className="w-3.5 h-3.5 text-[#10B981]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white leading-tight">{formatBRL(portfolioSummary.totalCurrentValue || 128750.60)}</h3>
            <p className="text-[10px] text-[#10B981] font-semibold mt-1">↑ 5.21% <span className="text-[#6B7280] font-normal">vs last week</span></p>
          </div>
        </Card>

        {/* Total Gains */}
        <Card variant="financial" className="p-3 flex flex-col justify-between bg-[#111319] border-[#1E222D]">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[#8E95A5] text-xs font-medium">Total Gains</p>
            <div className="bg-[#3B82F6]/10 p-1.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white leading-tight">{formatBRL(portfolioSummary.totalProfit || 12540.75)}</h3>
            <p className={`text-[10px] font-semibold mt-1 ${portfolioSummary.totalProfit >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
              {formatPercent(totalProfitPercent || 8.75)} <span className="text-[#6B7280] font-normal">vs last week</span>
            </p>
          </div>
        </Card>

        {/* Total Income */}
        <Card variant="financial" className="p-3 flex flex-col justify-between bg-[#111319] border-[#1E222D]">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[#8E95A5] text-xs font-medium">Total Income</p>
            <div className="bg-[#A855F7]/10 p-1.5 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-[#A855F7]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white leading-tight">{formatBRL(portfolioSummary.totalInvested || 2340.50)}</h3>
            <p className="text-[10px] text-[#10B981] font-semibold mt-1">↑ 3.18% <span className="text-[#6B7280] font-normal">vs last week</span></p>
          </div>
        </Card>

        {/* Cash Balance */}
        <Card variant="financial" className="p-3 flex flex-col justify-between bg-[#111319] border-[#1E222D]">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[#8E95A5] text-xs font-medium">Cash Balance</p>
            <div className="bg-[#F59E0B]/10 p-1.5 rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-[#F59E0B]" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white leading-tight">{formatBRL(8954.30)}</h3>
            <p className="text-[10px] text-[#F43F5E] font-semibold mt-1">↓ 1.23% <span className="text-[#6B7280] font-normal">vs last week</span></p>
          </div>
        </Card>
      </div>

      {/* 2. Charts Section */}
      <div className="flex gap-3 h-[240px] shrink-0">
        <div className="w-[65%] h-full">
           <PortfolioEvolutionChart currentSummary={portfolioSummary} className="bg-[#111319] border-[#1E222D] p-3" />
        </div>
        <div className="w-[35%] h-full">
           <PortfolioAllocationChart summary={portfolioSummary} className="bg-[#111319] border-[#1E222D] p-3" />
        </div>
      </div>

      {/* 3. Market Watch */}
      <Card variant="financial" className="p-3 bg-[#111319] border-[#1E222D] shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-[#8E95A5]" />
          <h2 className="text-xs font-medium text-[#8E95A5]">Altas e Baixas do Dia</h2>
        </div>
        
        <div className="relative w-full overflow-hidden h-[36px] flex items-center">
          {marketWatchItems.length === 0 ? (
            <p className="text-[10px] text-[#6B7280]">Carregando altas e baixas...</p>
          ) : (
            <div className="animate-marquee hover:animation-paused flex gap-6 px-3">
              {[...marketWatchItems, ...marketWatchItems, ...marketWatchItems].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 shrink-0 min-w-[140px] bg-transparent rounded cursor-default">
                  <div className="w-6 h-6 rounded-full bg-[#1D2029] flex items-center justify-center shrink-0 border border-[#232735]">
                    <span className="text-[10px] font-bold text-white">{item.label.substring(0,1)}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-white font-bold mb-0.5 leading-none">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white leading-none">R$ {item.price}</span>
                      <span className={`text-[10px] font-semibold leading-none ${item.percent >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                        {item.percent >= 0 ? '↑' : '↓'} {Math.abs(item.percent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 4. Bottom Grid */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Recent Transactions */}
        <Card variant="financial" className="w-1/3 p-4 bg-[#111319] border-[#1E222D] flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-3 shrink-0">
             <h3 className="text-sm text-white font-semibold">Recent Transactions</h3>
             <span className="text-[10px] text-[#8E95A5] cursor-pointer hover:text-white transition-colors bg-[#1A1D26] px-2 py-1 rounded">View All</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
             {MOCK_TRANSACTIONS.map((t) => (
               <div key={t.id} className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-7 h-7 rounded-full bg-[#1D2029] border border-[#232735] flex items-center justify-center text-sm">
                     {t.icon}
                   </div>
                   <div>
                     <p className="text-xs font-medium text-white">{t.name}</p>
                     <p className="text-[10px] text-[#8E95A5]">{t.action} {t.date ? ` • ${t.date}` : ''}</p>
                   </div>
                 </div>
                 <span className={`text-xs font-semibold ${t.amount >= 0 ? 'text-[#10B981]' : 'text-white'}`}>
                   {t.amount >= 0 ? `+${formatPrice(t.amount)}` : formatPrice(t.amount)}
                 </span>
               </div>
             ))}
           </div>
        </Card>

        {/* Top Holdings */}
        <Card variant="financial" className="w-1/3 p-4 bg-[#111319] border-[#1E222D] flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-3 shrink-0">
             <h3 className="text-sm text-white font-semibold">Top Holdings</h3>
             <span className="text-[10px] text-[#8E95A5] cursor-pointer hover:text-white transition-colors bg-[#1A1D26] px-2 py-1 rounded">View All</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
             {topHoldings.length === 0 ? (
               <div className="flex items-center justify-center h-full">
                 <p className="text-[10px] text-[#6B7280]">No holdings.</p>
               </div>
             ) : (
               topHoldings.map((p) => {
                 const pct = portfolioSummary.totalCurrentValue > 0 ? (p.currentValue / portfolioSummary.totalCurrentValue) * 100 : 0;
                 return (
                 <div key={p.id} className="flex justify-between items-center group">
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full bg-[#1D2029] flex items-center justify-center border border-[#232735] shrink-0 text-[8px] font-bold text-white">
                       {p.ticker.substring(0, 1)}
                     </div>
                     <p className="text-xs font-medium text-white truncate max-w-[90px]">{p.ticker}</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="w-16 h-1 bg-[#1A1D26] rounded-full overflow-hidden hidden xl:block">
                        <div className="h-full bg-[#10B981]" style={{ width: `${pct}%` }}></div>
                     </div>
                     <span className="text-[10px] text-[#8E95A5] w-8 text-right">{pct.toFixed(1)}%</span>
                     <span className="text-xs font-semibold text-white w-16 text-right">{formatBRL(p.currentValue)}</span>
                   </div>
                 </div>
               )})
             )}
           </div>
        </Card>

        {/* Upcoming Events */}
        <Card variant="financial" className="w-1/3 p-4 bg-[#111319] border-[#1E222D] flex flex-col overflow-hidden">
           <div className="flex items-center justify-between mb-3 shrink-0">
             <h3 className="text-sm text-white font-semibold">Upcoming Events</h3>
             <span className="text-[10px] text-[#8E95A5] cursor-pointer hover:text-white transition-colors bg-[#1A1D26] px-2 py-1 rounded">View Calendar</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
             {MOCK_EVENTS.map((e) => (
               <div key={e.id} className="flex items-center gap-3 bg-[#161924] p-2 rounded-lg border border-[#1E222D]">
                 <div className="w-8 h-8 rounded bg-[#1D2029] border border-[#2B3145] flex items-center justify-center shrink-0">
                   {e.icon}
                 </div>
                 <div>
                   <p className="text-xs font-medium text-white">{e.title}</p>
                   <p className="text-[10px] text-[#8E95A5] mt-0.5">{e.date}</p>
                 </div>
               </div>
             ))}
           </div>
        </Card>
      </div>

    </div>
  );
}
