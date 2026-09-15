import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign,
  RefreshCw, Wallet, ChevronLeft, ChevronRight,
  Filter, ArrowUpCircle, ArrowDownCircle, Circle,
  Link as LinkIcon, AlertTriangle, Edit2, X, Check,
  Upload, FileText, Eye,
} from 'lucide-react';
import supabase from '@/config/supabase';
import {
  useTransactions,
  useMonthlyChart,
  usePluggyConnections,
  FilterType,
  Transaction,
} from '@/hooks/useTransactions';
import { getConnectToken, savePluggyConnection, syncPluggyItem } from '@/services/integrations/pluggyClient';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Moradia', 'Lazer',
  'Compras', 'Educação', 'Viagem', 'Receita', 'Tarifas Bancárias',
  'Outros / A revisar',
];

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
  manual: 'Manual',
  gmail:  'Gmail',
};

const SOURCE_COLORS: Record<string, string> = {
  pluggy: 'bg-violet-500/20 text-violet-300',
  manual: 'bg-gray-500/20 text-gray-300',
  gmail:  'bg-blue-500/20 text-blue-300',
};

// ----------------------------------------------------------------
// Pequenos componentes
// ----------------------------------------------------------------
function CategoryChip({ category, onClick }: { category: string; onClick?: () => void }) {
  const cls = CATEGORY_COLORS[category] ?? 'bg-[#2A2D3E] text-[#8E95A5]';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${cls} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {category}
      {onClick && <Edit2 size={9} className="opacity-60" />}
    </button>
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
        <span className={`p-2 rounded-xl bg-white/10 ${iconColor}`}>
          <Icon size={16} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
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
// Gráfico de gastos mensais
// ----------------------------------------------------------------
function SpendingChart({ monthOffset }: { monthOffset: number }) {
  const { data, loading } = useMonthlyChart(monthOffset);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1D2029] border border-[#2A2D3E] rounded-xl px-3 py-2 text-xs shadow-xl">
        <p className="text-[#8E95A5] mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className={p.dataKey === 'expenses' ? 'text-[#F43F5E]' : 'text-[#2ECC71]'}>
            {p.dataKey === 'expenses' ? 'Despesas' : 'Receitas'}: {BRL(p.value)}
          </p>
        ))}
      </div>
    );
  };

  // Mostrar só os dias que têm dados ou a cada 5 dias
  const ticks = data.filter((d) => d.day % 5 === 0 || d.day === 1).map((d) => d.label);

  return (
    <div className="rounded-2xl bg-[#171A24] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">Gastos do mês</p>
        <span className="text-xs text-[#8E95A5]">Despesas vs Receitas</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#8E95A5] text-sm">Carregando…</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2ECC71" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2ECC71" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1D2029" vertical={false} />
            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: 10, fill: '#8E95A5' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8E95A5' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#F43F5E"
              strokeWidth={2}
              fill="url(#gradExpenses)"
              dot={false}
              activeDot={{ r: 4, fill: '#F43F5E', stroke: '#171A24', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#2ECC71"
              strokeWidth={2}
              fill="url(#gradIncome)"
              dot={false}
              activeDot={{ r: 4, fill: '#2ECC71', stroke: '#171A24', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-[#8E95A5]">
          <span className="w-3 h-0.5 rounded bg-[#F43F5E]" /> Despesas
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#8E95A5]">
          <span className="w-3 h-0.5 rounded bg-[#2ECC71]" /> Receitas
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Modal edição de categoria
// ----------------------------------------------------------------
function CategoryEditModal({
  tx,
  onSave,
  onClose,
}: {
  tx: Transaction;
  onSave: (id: string, cat: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(tx.category);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(tx.id, selected);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-[#171A24] border border-[#2A2D3E] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Editar categoria</p>
          <button onClick={onClose} className="text-[#8E95A5] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[#8E95A5] mb-3 truncate">{tx.description_original ?? tx.description}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelected(cat)}
              className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                selected === cat
                  ? 'border-[#7C5CFC] bg-[#7C5CFC]/20 text-white'
                  : 'border-[#2A2D3E] bg-[#12141C] text-[#8E95A5] hover:border-[#7C5CFC]/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || selected === tx.category}
          className="w-full py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FD8] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Salvando…' : 'Salvar categoria'}
        </button>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------
// Modal upload CSV
// ----------------------------------------------------------------
interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['"]/g, ''));

  const colIdx = (aliases: string[]) =>
    aliases.reduce<number>((found, a) => found >= 0 ? found : header.indexOf(a), -1);

  const dateIdx   = colIdx(['data', 'date', 'dt lancamento', 'data lancamento', 'data operacao']);
  const descIdx   = colIdx(['descricao', 'description', 'historico', 'lancamento', 'estabelecimento', 'memo']);
  const amtIdx    = colIdx(['valor', 'amount', 'value', 'vlr lancamento', 'credito/debito']);
  const typeIdx   = colIdx(['tipo', 'type', 'natureza', 'operacao']);

  if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < Math.max(dateIdx, descIdx, amtIdx) + 1) continue;

    const rawAmt = cols[amtIdx].replace(/[R$\s.]/g, '').replace(',', '.');
    const amount = Math.abs(parseFloat(rawAmt));
    if (isNaN(amount) || amount === 0) continue;

    // Detect type: negative = expense, type column, or amount sign
    const rawType = typeIdx >= 0 ? cols[typeIdx].toLowerCase() : '';
    const negative = cols[amtIdx].trim().startsWith('-') || rawType.includes('deb');
    const type: 'income' | 'expense' = negative ? 'expense' : 'income';

    // Normalize date: handles dd/mm/yyyy, yyyy-mm-dd
    const rawDate = cols[dateIdx];
    let date = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/');
      date = `${y}-${m}-${d}`;
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split('/');
      date = `20${y}-${m}-${d}`;
    }

    rows.push({ date, description: cols[descIdx], amount, type });
  }
  return rows;
}

function CsvUploadModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setError('Não consegui detectar as colunas. O CSV precisa ter pelo menos: data, descrição e valor.');
        setPreview([]);
      } else {
        setPreview(rows);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const rows = preview.map((r) => ({
        user_id: user.id,
        description: r.description,
        description_original: r.description,
        amount: r.amount,
        transaction_type: r.type,
        transaction_date: r.date,
        source: 'manual' as const,
        category: 'Outros / A revisar',
        category_confidence: 0,
        reviewed: false,
        status: 'completed',
      }));

      // Insert in batches of 50, ignoring duplicates via import_hash when possible
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error: insErr } = await supabase.from('transactions').insert(batch);
        if (insErr) throw insErr;
      }
      setDone(true);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-[#171A24] border border-[#2A2D3E] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Importar CSV</p>
          <button onClick={onClose} className="text-[#8E95A5] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <Check size={32} className="mx-auto mb-3 text-[#2ECC71]" />
            <p className="text-white font-medium">{preview.length} transações importadas!</p>
            <p className="text-[#8E95A5] text-xs mt-1">Revise as categorias na tabela de extrato.</p>
            <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl bg-[#7C5CFC] text-white text-sm font-medium">
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-[#2A2D3E] hover:border-[#7C5CFC] rounded-xl p-6 text-center cursor-pointer transition-colors mb-4"
            >
              <FileText size={24} className="mx-auto mb-2 text-[#3D4152]" />
              <p className="text-sm text-[#8E95A5]">
                {fileName ? fileName : 'Clique para escolher um arquivo CSV'}
              </p>
              <p className="text-xs text-[#3D4152] mt-1">Extrato bancário ou de cartão em formato CSV</p>
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 mb-3">{error}</p>
            )}

            {preview.length > 0 && (
              <>
                <p className="text-xs text-[#8E95A5] mb-2">
                  <span className="text-white font-medium">{preview.length}</span> transações detectadas — primeiras 5:
                </p>
                <div className="rounded-xl bg-[#12141C] overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1D2029]">
                        <th className="px-3 py-2 text-left text-[#8E95A5]">Data</th>
                        <th className="px-3 py-2 text-left text-[#8E95A5]">Descrição</th>
                        <th className="px-3 py-2 text-right text-[#8E95A5]">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b border-[#1D2029] last:border-0">
                          <td className="px-3 py-2 text-[#8E95A5] whitespace-nowrap">{r.date}</td>
                          <td className="px-3 py-2 text-white truncate max-w-[160px]">{r.description}</td>
                          <td className={`px-3 py-2 text-right font-medium ${r.type === 'income' ? 'text-[#2ECC71]' : 'text-[#F43F5E]'}`}>
                            {r.type === 'income' ? '+' : '-'}{BRL(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full py-2.5 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FD8] text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importing ? 'Importando…' : `Importar ${preview.length} transações`}
                </button>
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
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
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const PAGE_SIZE = 10;
  const { transactions, summary, total, totalPages, loading, error, refetch, updateCategory } =
    useTransactions({ filter, page, pageSize: PAGE_SIZE, monthOffset });
  const { connections } = usePluggyConnections();

  const monthLabel = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [monthOffset]);

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

  async function handleConnect(itemId?: string) {
    setSyncMsg(null);
    try {
      const token = await getConnectToken(itemId);
      const openWidget = () => {
        // @ts-expect-error — SDK do Pluggy injetado no window
        window.PluggyConnect({
          connectToken: token,
          onSuccess: async (data: { item: { id: string; connector?: { name?: string; type?: string; id?: number }; status?: string } }) => {
            setSyncMsg('Conexão estabelecida! Sincronizando transações…');
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('Não autenticado');
              const connectionId = await savePluggyConnection(data.item.id, data.item);
              const result = await syncPluggyItem(user.id, connectionId, data.item.id);
              setSyncMsg(`✓ Sincronizado! ${result.transactions.created} transações importadas.`);
              refetch();
            } catch (e) {
              setSyncMsg(`Erro ao sincronizar: ${e instanceof Error ? e.message : 'falha'}`);
            }
          },
          onError: (err: { message?: string }) => {
            setSyncMsg(`Erro na conexão: ${err?.message ?? 'falha no widget'}`);
          },
        });
      };
      // @ts-expect-error — SDK do Pluggy injetado no window
      if (typeof window.PluggyConnect === 'function') { openWidget(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.js';
      script.onload = openWidget;
      script.onerror = () => setSyncMsg('Erro ao carregar widget do Pluggy.');
      document.head.appendChild(script);
    } catch (e) {
      setSyncMsg(`Erro: ${e instanceof Error ? e.message : 'falha ao conectar'}`);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2ECC71]">Finanças</h1>
          <p className="text-[#8E95A5] text-sm mt-1">Contas, cartões, orçamento e fluxo de caixa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171A24] border border-[#2A2D3E] hover:border-[#7C5CFC]/50 text-[#8E95A5] hover:text-white text-sm font-medium transition-colors"
          >
            <Upload size={14} />
            Importar CSV
          </button>
          {hasConnections && (
            <>
              <button
                onClick={() => void handleConnect()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171A24] border border-[#2A2D3E] hover:border-[#7C5CFC] text-[#7C5CFC] text-sm font-medium transition-colors"
              >
                <LinkIcon size={14} />
                + Conta
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FD8] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando…' : 'Sincronizar'}
              </button>
            </>
          )}
          {!hasConnections && (
            <button
              onClick={() => void handleConnect()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FD8] text-white text-sm font-medium transition-colors"
            >
              <LinkIcon size={14} />
              Conectar conta bancária
            </button>
          )}
        </div>
      </div>

      {syncMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm px-4 py-2 rounded-xl ${syncMsg.startsWith('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}
        >
          {syncMsg}
        </motion.div>
      )}

      {/* Contas conectadas */}
      {hasConnections && (
        <div className="flex flex-wrap gap-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#171A24] border border-[#2A2D3E]">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                conn.status === 'UPDATED' ? 'bg-[#2ECC71]'
                : conn.status === 'LOGIN_ERROR' ? 'bg-[#F43F5E]'
                : 'bg-yellow-400'
              }`} />
              <span className="text-xs text-white font-medium">{conn.institution_name}</span>
              {conn.status === 'LOGIN_ERROR' && (
                <button onClick={() => handleConnect(conn.pluggy_item_id)} className="text-[10px] text-[#7C5CFC] hover:underline">
                  Reconectar
                </button>
              )}
              {conn.last_sync_at && (
                <span className="text-[10px] text-[#8E95A5]">
                  {new Date(conn.last_sync_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Estado sem conexão */}
      {!hasConnections && (
        <div className="rounded-2xl bg-[#171A24] border border-dashed border-[#2A2D3E] p-8 text-center">
          <Wallet size={32} className="mx-auto mb-3 text-[#3D4152]" />
          <p className="text-[#8E95A5] text-sm">
            Conta bancária não conectada — conecte via Pluggy para sincronização automática.
          </p>
          <p className="text-[#3D4152] text-xs mt-1">Ou importe um extrato em CSV manualmente.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => void handleConnect()}
              className="px-5 py-2 rounded-xl bg-[#7C5CFC] text-white text-sm font-medium hover:bg-[#6B4FD8] transition-colors"
            >
              Conectar agora
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="px-5 py-2 rounded-xl bg-[#171A24] border border-[#2A2D3E] text-[#8E95A5] text-sm font-medium hover:text-white hover:border-[#7C5CFC]/50 transition-colors"
            >
              Importar CSV
            </button>
          </div>
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

      {/* Gráfico */}
      <SpendingChart monthOffset={monthOffset} />

      {/* Extrato */}
      <div className="rounded-2xl bg-[#171A24] overflow-hidden">
        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1D2029]">
          <div className="flex items-center gap-2">
            <div className="flex bg-[#12141C] rounded-xl p-1 gap-1">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setFilter(opt.value); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt.value ? 'bg-[#7C5CFC] text-white' : 'text-[#8E95A5] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
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
            <div className="flex items-center justify-center py-16 text-[#8E95A5] text-sm">Carregando transações…</div>
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
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide">Origem</th>
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide text-right">Valor</th>
                  <th className="py-3 px-4 text-xs text-[#8E95A5] font-medium uppercase tracking-wide text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {transactions.map((tx, i) => {
                    const needsReview = !tx.reviewed && (tx.category === 'Outros / A revisar' || (tx.category_confidence ?? 1) < 0.5);
                    const isIncome = tx.transaction_type === 'income';
                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="border-b border-[#1D2029] hover:bg-[#1D2029]/50 transition-colors"
                        style={needsReview ? { borderLeft: '2px solid #F59E0B' } : {}}
                      >
                        {/* Transação */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`p-1.5 rounded-lg flex-shrink-0 ${isIncome ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              {isIncome
                                ? <ArrowUpCircle size={14} className="text-[#2ECC71]" />
                                : <ArrowDownCircle size={14} className="text-[#F43F5E]" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate max-w-[160px]">
                                {tx.description_original ?? tx.description}
                              </p>
                              {needsReview && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 mt-0.5">
                                  <AlertTriangle size={9} /> A revisar
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Categoria */}
                        <td className="py-3 px-4">
                          <CategoryChip category={tx.category} onClick={() => setEditingTx(tx)} />
                        </td>
                        {/* Data */}
                        <td className="py-3 px-4 text-sm text-[#8E95A5] whitespace-nowrap">
                          {formatDate(tx.transaction_date)}
                        </td>
                        {/* Origem */}
                        <td className="py-3 px-4">
                          <SourceBadge source={tx.source} />
                        </td>
                        {/* Valor */}
                        <td className={`py-3 px-4 text-sm font-semibold text-right whitespace-nowrap ${isIncome ? 'text-[#2ECC71]' : 'text-[#F43F5E]'}`}>
                          {isIncome ? '+' : '-'}{BRL(Number(tx.amount))}
                        </td>
                        {/* Ações */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingTx(tx)}
                              title="Editar categoria"
                              className="p-1.5 rounded-lg text-[#8E95A5] hover:text-[#7C5CFC] hover:bg-[#7C5CFC]/10 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              title="Ver detalhes"
                              className="p-1.5 rounded-lg text-[#8E95A5] hover:text-white hover:bg-[#2A2D3E] transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
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
                      page === p ? 'bg-[#7C5CFC] text-white' : 'text-[#8E95A5] hover:bg-[#1D2029] hover:text-white'
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

      {/* Modals */}
      <AnimatePresence>
        {editingTx && (
          <CategoryEditModal
            tx={editingTx}
            onSave={updateCategory}
            onClose={() => setEditingTx(null)}
          />
        )}
        {showCsvModal && (
          <CsvUploadModal
            onClose={() => setShowCsvModal(false)}
            onImported={() => { refetch(); setTimeout(() => setShowCsvModal(false), 2000); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
