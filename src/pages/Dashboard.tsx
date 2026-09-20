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
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3" style={{ color: themeColor }}>
            Seu dia
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium tracking-tight">
            Visão geral de tudo em um lugar só.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-white/5 backdrop-blur-md text-foreground border-white/10 px-4 py-1.5 rounded-full shadow-inner font-medium">
            <span className="w-2 h-2 rounded-full bg-income animate-pulse mr-2 shadow-[0_0_8px_var(--income)]" />
            Tempo Real
          </Badge>
          <div className="text-xs font-semibold text-muted-foreground bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full shadow-inner">
            {new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Grid de Métricas Rápidas (Bento Grid Premium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {quick.map((q, idx) => (
          <motion.div
            key={q.label}
            initial={motionInitial}
            animate={motionAnimate}
            whileHover={{ y: shouldReduceMotion ? 0 : -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
          >
            <Card
              variant={q.variant}
              className="p-6 md:p-8 flex flex-col justify-between h-full bg-card/60 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all rounded-[2rem] shadow-2xl relative overflow-hidden group"
            >
              {/* Inner glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
                  <q.icon size={24} weight="duotone" />
                </div>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-md shadow-inner ${
                    q.positive
                      ? 'bg-income/10 text-income border border-income/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {q.positive ? <ArrowUpRight size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                  {q.change}
                </span>
              </div>

              <div className="relative z-10">
                <div className="text-3xl font-black tracking-tighter text-foreground drop-shadow-sm">{q.value}</div>
                <div className="text-sm text-muted-foreground mt-1.5 font-semibold tracking-tight">{q.label}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Seção Principal: AI Assistant Card + Gráfico de Evolução (Monef Signature) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card AI Assistant (Apple Intelligence Style) */}
        <motion.div
          className="lg:col-span-5"
          initial={motionInitial}
          animate={motionAnimate}
          transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.15 }}
        >
          <div className="h-full rounded-[2.5rem] bg-[#09090b]/80 backdrop-blur-3xl border border-white/10 p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            {/* Efeito sutil de iluminação inteligente */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-80" />
            
            {/* Grain overlay for texture */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

            <div className="relative z-10">
              {/* Header do Assistant */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-inner backdrop-blur-md border border-white/20">
                    <Sparkle size={20} weight="fill" className="text-primary-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  </div>
                  <span className="text-sm font-bold text-foreground tracking-widest uppercase opacity-80">MODUS Intelligence</span>
                </div>
              </div>

              {/* Chamada principal */}
              <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground leading-tight mb-3">
                Como posso ajudar hoje?
              </h3>
              <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed max-w-sm">
                Análise preditiva de saldo, priorização de tarefas ou insights inteligentes baseados nos seus dados.
              </p>

              {/* Pílulas de sugestões Premium */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['Prever saldo', 'Priorizar tarefas', 'Análise de gastos'].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="text-xs font-semibold px-4 py-2.5 rounded-full bg-white/5 text-foreground border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all shadow-inner backdrop-blur-sm"
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Barra de input do AI Assistant flutuante */}
            <div className="relative z-10 mt-auto">
              <form 
                className={`flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-4 transition-all duration-300 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] ${
                  isSubmitting ? 'opacity-70 pointer-events-none' : 'focus-within:border-primary/50 focus-within:shadow-[0_8px_32px_-4px_rgba(124,92,252,0.3)] focus-within:bg-black/60'
                }`}
                onSubmit={handlePromptSubmit}
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Pergunte qualquer coisa ao MODUS..."
                  className="bg-transparent text-sm font-medium text-foreground placeholder-muted-foreground/50 w-full outline-none"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  aria-label="Enviar prompt"
                  className="w-10 h-10 rounded-full bg-primary hover:bg-brand-light text-white flex items-center justify-center shadow-inner transition-transform active:scale-95 shrink-0"
                  disabled={isSubmitting || !prompt.trim()}
                >
                  <PaperPlaneRight size={18} weight={isSubmitting ? "regular" : "fill"} className={isSubmitting ? "animate-pulse" : ""} />
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Gráfico Animado de Impacto Financeiro (Bento Grid Premium) */}
        <motion.div
          className="lg:col-span-7"
          initial={motionInitial}
          animate={motionAnimate}
          transition={{ duration: 0.45, delay: shouldReduceMotion ? 0 : 0.25 }}
        >
          <div className="h-full rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-white/5 p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
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
