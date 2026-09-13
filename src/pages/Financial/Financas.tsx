import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign,
  RefreshCw, Wallet, ChevronLeft, ChevronRight,
  Filter, ArrowUpCircle, ArrowDownCircle, Circle,
  Link as LinkIcon, AlertTriangle,
} from 'lucide-react';
import supabase from '@/config/supabase';
import {
  useTransactions,
  usePluggyConnections,
  FilterType,
  Transaction,
} from '@/hooks/useTransactions';
import { getConnectToken, syncPluggyItem } from '@/services/integrations/pluggyClient';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação':        'bg-orange-500/20 text-orange-300',
  'Transporte':         'bg-blue-500/20 text-blue-300',
  'Saúde':              'bg-red-500/20 text-red-300',
  'Moradia':            'bg-yellow-500/20 text-yellow-300',
  'Lazer':              'bg-purple-500/20 text-purple-300',
  'Compras':            'bg-pink-500/20 text-pink-300',
  'Educação':           'bg-cyan-500/20 text-cyan-300',
  'Viagem':             'bg-sky-500/20 text-sky-300',
  'Receita':            'bg-green-500/20 text-green-300',
  'Tarifas Bancárias':  'bg-gray-500/20 text-gray-300',
  'Outros / A revisar': 'bg-yellow-400/20 text-yellow-300',
};

const SOURCE_LABELS: Record<string, string> = {
  pluggy: 'Pluggy',
  gmail:  'Gmail',
  manual: 'Manual',
};

const SOURCE_COLORS: Record<string, string> = {
  pluggy: 'bg-violet-500/20 text-violet-300',
  gmail:  'bg-blue-500/20 text-blue-300',
  manual: 'bg-gray-500/20 text-gray-300',
};

function CategoryChip({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-[#2A2D3E] text-[#8E95A5]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {category}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_COLORS[source] ?? 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

// ----------------------------------------------------------------
// KPI Card
// ----------------------------------------------------------------
function KPICard({
  label, value, icon: Icon, iconColor, filled, change,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  filled?: boolean;
  change?: { value: string; positive: boolean };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl p-5 flex flex-col gap-3 ${filled ? 'bg-[#7C5CFC]' : 'bg-[#171A24]'}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-wide ${filled ? 'text-violet-200' : 'text-[#8E95A5]'}`}>
          {label}
        </span>
        <span className={`p-2 rounded-xl ${iconColor} bg-white/10`}>
          <Icon size={16} />
        </span>
      </div>
      <div>
        <p className={`text-2xl font-bold ${filled ? 'text-white' : 'text-white'}`}>{value}</p>
        {change && (
          <p className={`text-xs mt-1 ${change.positive ? 'text-[#2ECC71]' : 'text-[#F43F5E]'}`}>
            {change.positive ? '▲' : '▼'} {change.value} vs mês anterior
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------------
// Linha da tabela
// ----------------------------------------------------------------
function TxRow({ tx, onReviewCategory }: { tx: Transaction; onReviewCategory: (id: string, cat: string) => void }) {
  const needsReview = !tx.reviewed && (tx.category === 'Outros / A revisar' || (tx.category_confidence ?? 1) < 0.5);
  const isIncome = tx.transaction_type === 'income';

  return (
    <tr className={`border-b border-[#1D2029] hover:bg-[#1D2029]/50 transition-colors ${needsReview ? 'border-l-2 border-l-yellow-500' : ''}`}>
      {/* Transação */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className={`p-1.5 rounded-lg ${isIncome ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {isIncome
              ? <ArrowUpCircle size={14} className="text-[#2ECC71]" />
              : <ArrowDownCircle size={14} className="text-[#F43F5E]" />}
          </span>
          <div>
            <p className="text-sm font-medium text-white truncate max-w-[180px]">
              {tx.description_original ?? tx.description}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <SourceBadge source={tx.source} />
              {needsReview && (
                <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                  <AlertTriangle size={10} /> A revisar
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      {/* Categoria */}
      <td className="py-3 px-4">
        <CategoryChip category={tx.category} />
      </td>
      {/* Data */}
      <td className="py-3 px-4 text-sm text-[#8E95A5] whitespace-nowrap">
        {formatDate(tx.transaction_date)}
      </td>
      {/* Valor */}
      <td className={`py-3 px-4 text-sm font-semibold text-right ${isIncome ? 'text-[#2ECC71]' : 'text-[#F43F5E]'}`}>
        {isIncome ? '+' : '-'}{BRL(Number(tx.amount))}
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------
export default function Financas() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [monthOffset, setMonthOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const { transactions, summary, total, totalPages, loading, error, refetch, updateCategory } =
    useTransactions({ filter, page, pageSize: PAGE_SIZE, monthOffset });
  const { connections } = usePluggyConnections();

  // Label do mes
  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthOffset]);

  // Sincronia Pluggy
  async function handleSync() {
    if (connections.length === 0) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      for (const conn of connections) {
        await syncPluggyItem(user.id, conn.id, conn.pluggy_item_id);
      }
      setSyncMsg('Sincronizado com sucesso!');
      refetch();
    } catch (e) {
      setSyncMsg(`Erro: ${e instanceof Error ? e.message : 'falha na sincronização'}`);
    } finally {
      setSyncing(false);
    }
  }

  // Conectar Pluggy Widget
  async function handleConnect() {
    try {
      const token = await getConnectToken();
      // Abre o widget do Pluggy via CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.js';
      script.onload = () => {
        // @ts-expect-error — SDK do Pluggy injetado no window
        window.PluggyConnect({
          connectToken: token,
          onSuccess: () => { refetch(); },
        });
      };
      document.head.appendChild(script);
    } catch (e) {
      console.error('Erro ao abrir widget Pluggy:', e);
    }
  }

  const hasConnections = connections.length > 0;
  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Receitas', value: 'income' },
    { label: 'Despesas', value: 'expense' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2ECC71]">Finanças</h1>
          <p className="text-[#8E95A5] text-sm mt-1">Contas, cartões, orçamento e fluxo de caixa.</p>
        </div>
        <div className="flex gap-2">
          {hasConnections ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FD8] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171A24] border border-[#2A2D3E] hover:border-[#7C5CFC] text-[#7C5CFC] text-sm font-medium transition-colors"
            >
              <LinkIcon size={14} />
              Conectar conta bancária
            </button>
          )}
        </div>
      </div>

      {syncMsg && (
        <div className={`text-sm px-4 py-2 rounded-xl ${syncMsg.startsWith('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {syncMsg}
        </div>
      )}

      {/* Estado sem conexão */}
      {!hasConnections && (
        <div className="rounded-2xl bg-[#171A24] border border-dashed border-[#2A2D3E] p-8 text-center">
          <Wallet size={32} className="mx-auto mb-3 text-[#3D4152]" />
          <p className="text-[#8E95A5] text-sm">
            Conta bancária não conectada — conecte via Pluggy para sincronização automática de transações.
          </p>
          <button
            onClick={handleConnect}
            className="mt-4 px-5 py-2 rounded-xl bg-[#7C5CFC] text-white text-sm font-medium hover:bg-[#6B4FD8] transition-colors"
          >
            Conectar agora
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Saldo total"
          value={BRL(summary.totalBalance)}
          icon={DollarSign}
          iconColor="text-white"
          filled
        />
        <KPICard
          label="Receitas do mês"
          value={BRL(summary.monthIncome)}
          icon={TrendingUp}
          iconColor="text-[#2ECC71]"
        />
        <KPICard
          label="Despesas do mês"
          value={BRL(summary.monthExpenses)}
          icon={TrendingDown}
          iconColor="text-[#F43F5E]"
        />
      </div>

      {/* Extrato */}
      <div className="rounded-2xl bg-[#171A24] overflow-hidden">
        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1D2029]">
          <div className="flex items-center gap-2">
            {/* Segmented control */}
            <div className="flex bg-[#12141C] rounded-xl p-1 gap-1">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilter(opt.value); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-[#7C5CFC] text-white'
                      : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seletor de mês */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMonthOffset((m) => m - 1); setPage(1); }}
              className="p-1.5 rounded-lg bg-[#12141C] hover:bg-[#1D2029] text-[#8E95A5] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-white capitalize min-w-[120px] text-center">{monthLabel}</span>
            <button
              onClick={() => { setMonthOffset((m) => Math.min(m + 1, 0)); setPage(1); }}
              disabled={monthOffset >= 0}
              className="p-1.5 rounded-lg bg-[#12141C] hover:bg-[#1D2029] text-[#8E95A5] disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button className="p-1.5 rounded-lg bg-[#12141C] hover:bg-[#1D2029] text-[#8E95A5] transition-colors">
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#8E95A5] text-sm">
              Carregando transações…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-400 text-sm">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#8E95A5] gap-2">
              <Circle size={32} className="text-[#3D4152]" />
              <p className="text-sm">Nenhuma transação {filter !== 'all' ? `de ${filter === 'income' ? 'receita' : 'despesa'} ` : ''}neste mês.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1D2029]">
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide">Transação</th>
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide">Categoria</th>
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide">Data</th>
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {transactions.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-[#1D2029] hover:bg-[#1D2029]/50 transition-colors"
                      style={
                        !tx.reviewed && (tx.category === 'Outros / A revisar' || (tx.category_confidence ?? 1) < 0.5)
                          ? { borderLeft: '2px solid #F59E0B' }
                          : {}
                      }
                    >
                      {/* Transação */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className={`p-1.5 rounded-lg ${tx.transaction_type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {tx.transaction_type === 'income'
                              ? <ArrowUpCircle size={14} className="text-[#2ECC71]" />
                              : <ArrowDownCircle size={14} className="text-[#F43F5E]" />}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white truncate max-w-[180px]">
                              {tx.description_original ?? tx.description}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <SourceBadge source={tx.source} />
                              {!tx.reviewed && tx.category === 'Outros / A revisar' && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                                  <AlertTriangle size={10} /> A revisar
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Categoria */}
                      <td className="py-3 px-4">
                        <CategoryChip category={tx.category} />
                      </td>
                      {/* Data */}
                      <td className="py-3 px-4 text-sm text-[#8E95A5] whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      {/* Valor */}
                      <td className={`py-3 px-4 text-sm font-semibold text-right ${tx.transaction_type === 'income' ? 'text-[#2ECC71]' : 'text-[#F43F5E]'}`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{BRL(Number(tx.amount))}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer paginação */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#1D2029]">
            <span className="text-xs text-[#8E95A5]">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} transações
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-[#1D2029] text-[#8E95A5] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      page === p
                        ? 'bg-[#7C5CFC] text-white'
                        : 'text-[#8E95A5] hover:bg-[#1D2029] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-[#1D2029] text-[#8E95A5] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
