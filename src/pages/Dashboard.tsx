import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import {
  BookOpen,
  Wallet,
  TrendUp,
  User,
  Robot,
  PaperPlaneRight,
  Sparkle,
  ArrowUpRight,
  TrendDown,
  CaretRight,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useModuleColors, defaultModuleColors } from '@/hooks/useModuleColors';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const quick = [
  {
    icon: BookOpen,
    label: 'Tarefas ativas',
    value: '—',
    variant: 'academic' as const,
    change: '+3 novas',
    positive: true,
  },
  {
    icon: Wallet,
    label: 'Saldo do mês',
    value: '—',
    variant: 'financial' as const,
    change: '+8.4%',
    positive: true,
  },
  {
    icon: TrendUp,
    label: 'Carteira',
    value: '—',
    variant: 'financial' as const,
    change: '+12.1%',
    positive: true,
  },
  {
    icon: User,
    label: 'Cursos em andamento',
    value: '—',
    variant: 'personal' as const,
    change: '2 em curso',
    positive: true,
  },
];

// Dados ilustrativos para o gráfico estilizado Monef de impacto/evolução
const performanceData = [
  { month: 'Jan', receitas: 14200, despesas: 9800 },
  { month: 'Fev', receitas: 18500, despesas: 11200 },
  { month: 'Mar', receitas: 16800, despesas: 10400 },
  { month: 'Abr', receitas: 22400, despesas: 13100 },
  { month: 'Mai', receitas: 27900, despesas: 15600 },
  { month: 'Jun', receitas: 24800, despesas: 14200 },
  { month: 'Jul', receitas: 31200, despesas: 16800 },
];

export default function Dashboard() {
  const { colors } = useModuleColors();
  const themeColor = colors['inicio'] || defaultModuleColors['inicio'] || '#7C5CFC';
  const shouldReduceMotion = useReducedMotion();
  const motionInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 };
  const motionAnimate = { opacity: 1, y: 0 };

  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    // Simular o delay da rede para envio do prompt
    setTimeout(() => {
      console.log('Enviado:', prompt);
      setPrompt('');
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: themeColor }}>
            Seu dia
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral de tudo em um lugar só.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-muted text-muted-foreground border-border px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-income animate-pulse mr-1" />
            Tempo Real
          </Badge>
          <div className="text-xs text-muted-foreground bg-muted border border-border px-3 py-1.5 rounded-xl">
            {new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Grid de Métricas Rápidas (Estilo Monef) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quick.map((q, idx) => (
          <motion.div
            key={q.label}
            initial={motionInitial}
            animate={motionAnimate}
            whileHover={{ y: shouldReduceMotion ? 0 : -4 }}
            transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
          >
            <Card
              variant={q.variant}
              className="p-5 flex flex-col justify-between h-full bg-card hover:border-primary transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-primary">
                  <q.icon size={20} weight="bold" />
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                    q.positive
                      ? 'bg-income/15 text-income border border-income/30'
                      : 'bg-destructive/15 text-destructive border border-destructive/30'
                  }`}
                >
                  {q.positive ? <ArrowUpRight size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                  {q.change}
                </span>
              </div>

              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{q.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{q.label}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Seção Principal: AI Assistant Card + Gráfico de Evolução (Monef Signature) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card AI Assistant estilo Monef com gradiente roxo */}
        <motion.div
          className="lg:col-span-5"
          initial={motionInitial}
          animate={motionAnimate}
          transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.15 }}
        >
          <div className="h-full rounded-2xl bg-gradient-to-b from-[#231A4A] via-[#181829] to-card border border-primary/30 p-6 flex flex-col justify-between shadow-[0_8px_32px_-4px_rgba(124,92,252,0.15)] relative overflow-hidden">
            {/* Efeito sutil de iluminação roxa */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

            <div>
              {/* Header do Assistant */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40">
                    <Robot size={18} weight="bold" />
                  </div>
                  <span className="text-sm font-bold text-white tracking-wide">AI Assistant</span>
                </div>
                <Badge className="bg-primary/20 text-primary-foreground border-primary/30 text-[10px]">
                  <Sparkle size={11} className="mr-1" weight="fill" />
                  Monef Intelligence
                </Badge>
              </div>

              {/* Chamada principal */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight mb-2">
                Como o Assistant pode te ajudar hoje?
              </h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Análise preditiva de saldo, priorização de tarefas acadêmicas e insights financeiros inteligentes.
              </p>

              {/* Pílulas de sugestões estilo Monef */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['Prever saldo do mês', 'Organizar tarefas urgentes', 'Evolução de investimentos'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-accent/80 text-foreground border border-border hover:border-primary/60 hover:bg-accent transition-all text-left min-h-[44px]"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Barra de input do AI Assistant estilo Monef */}
            <div className="mt-4">
              <form 
                className={`flex items-center gap-2 bg-input/40 border border-border rounded-xl p-1.5 transition-colors ${
                  isSubmitting ? 'opacity-70 pointer-events-none' : 'focus-within:border-primary/70'
                }`}
                onSubmit={handlePromptSubmit}
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Pergunte qualquer coisa ao MODUS..."
                  className="bg-transparent text-sm text-foreground placeholder-muted-foreground px-3 py-1.5 w-full outline-none"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  aria-label="Enviar prompt"
                  className="w-10 h-10 rounded-lg bg-primary hover:bg-brand-dark text-white flex items-center justify-center shadow-md shadow-primary/30 transition-transform active:scale-95 shrink-0 min-h-[44px] min-w-[44px]"
                  disabled={isSubmitting || !prompt.trim()}
                >
                  <PaperPlaneRight size={16} weight={isSubmitting ? "regular" : "bold"} className={isSubmitting ? "animate-pulse" : ""} />
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Gráfico Animado de Impacto Financeiro (Monef Style Recharts + Framer Motion) */}
        <motion.div
          className="lg:col-span-7"
          initial={motionInitial}
          animate={motionAnimate}
          transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.25 }}
        >
          <div className="h-full rounded-2xl bg-card border border-border p-6 flex flex-col justify-between shadow-lg shadow-black/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Impacto Financeiro</h3>
                <p className="text-xs text-muted-foreground">
                  Comparativo de fluxo e evolução patrimonial
                </p>
              </div>

              {/* Legenda estilizada Monef */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-income" />
                  <span className="text-muted-foreground font-medium">Receitas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground font-medium">Despesas</span>
                </div>
              </div>
            </div>

            {/* Área do Gráfico Animado Recharts */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="monefGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="monefPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C5CFC" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C5CFC" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E2332" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover text-popover-foreground text-xs p-3 rounded-xl shadow-xl border border-border">
                            <p className="text-muted-foreground font-semibold mb-1.5">{label}</p>
                            <div className="flex justify-between gap-4 py-0.5">
                              <span className="text-income">Receitas:</span>
                              <strong>R$ {payload[0]?.value?.toLocaleString('pt-BR')}</strong>
                            </div>
                            <div className="flex justify-between gap-4 py-0.5">
                              <span className="text-primary">Despesas:</span>
                              <strong>R$ {payload[1]?.value?.toLocaleString('pt-BR')}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#monefGreen)"
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="#7C5CFC"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#monefPurple)"
                    isAnimationActive={true}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cards Existentes preservados com o novo visual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="academic" className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>📚</span> Próximas tarefas
            </h2>
            <Badge className="text-[11px] bg-academic/15 text-academic border-academic/30">
              Acadêmico
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conecte o Supabase e sincronize suas tarefas para vê-las aqui.
          </p>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Sincronização pendente</span>
            <span className="text-primary font-medium flex items-center gap-0.5 hover:underline cursor-pointer min-h-[44px]">
              Configurar <CaretRight size={16} weight="bold" />
            </span>
          </div>
        </Card>

        <Card variant="financial" className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>💰</span> Resumo financeiro
            </h2>
            <Badge className="text-[11px] bg-financial/15 text-financial border-financial/30">
              Financeiro
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conecte o Pluggy para importar contas, cartões e transações.
          </p>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Open Finance</span>
            <span className="text-financial font-medium flex items-center gap-0.5 hover:underline cursor-pointer min-h-[44px]">
              Conectar <CaretRight size={16} weight="bold" />
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
