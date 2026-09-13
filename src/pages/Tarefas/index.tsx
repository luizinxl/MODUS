import React, { useState } from 'react';
import { Search, SlidersHorizontal, Plus, PartyPopper, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useTasks, TaskFilter, TaskGroup } from '@/hooks/useTasks';
import { useModuleColors, defaultModuleColors } from '@/hooks/useModuleColors';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';
import { Confetti } from './components/Confetti';

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'completed', label: 'Concluídas' },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function dayHeaderLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].substring(0, 3)} · ${WEEKDAY_SHORT[date.getDay()]}`;
}

function groupTitle(group: TaskGroup) {
  if (group.kind === 'overdue') return 'Vencidas';
  if (group.kind === 'today') return 'Hoje';
  if (group.kind === 'tomorrow') return 'Amanhã';
  if (group.kind === 'no_date') return 'Sem data';
  return dayHeaderLabel(group.date!);
}

export default function TarefasDashboard() {
  const {
    loading,
    error,
    filter,
    setFilter,
    search,
    setSearch,
    categories,
    pendingToday,
    allTodayDone,
    tasksByDate,
    addTask,
    toggleTask,
    deleteTask,
  } = useTasks();

  const { colors } = useModuleColors();
  const themeColor = colors['tarefas'] || defaultModuleColors['tarefas'] || '#7C5CFC';

  const [showSearch, setShowSearch] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const openAddForm = (date?: string) => {
    setPrefillDate(date || null);
    setShowAddForm(true);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{greeting}</h1>
          <p className="text-[#8E95A5] text-sm mt-1">
            {pendingToday.length > 0
              ? `${pendingToday.length} tarefa${pendingToday.length > 1 ? 's' : ''} pendente${pendingToday.length > 1 ? 's' : ''} hoje`
              : 'Nenhuma tarefa pendente hoje'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showSearch ? (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setShowSearch(false)}
              placeholder="Buscar tarefa..."
              className="bg-[#1A1D27] border border-[#282E42] text-white text-sm rounded-full px-4 py-2 w-40 sm:w-56 focus:outline-none focus:border-[#7C5CFC]"
            />
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 rounded-full bg-[#1A1D27] border border-[#282E42] flex items-center justify-center text-[#8E95A5] hover:text-white transition-colors"
            >
              <Search size={16} />
            </button>
          )}
          <button className="w-9 h-9 rounded-full bg-[#1A1D27] border border-[#282E42] flex items-center justify-center text-[#8E95A5] hover:text-white transition-colors">
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Segmented control */}
      <div className="flex items-center gap-1 bg-[#1A1D27] border border-[#282E42] rounded-full p-1 mb-6 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
              filter === f.id ? 'bg-white text-black' : 'text-[#8E95A5] hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/20 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#F43F5E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#F43F5E] leading-relaxed">{error}</p>
        </div>
      )}

      {/* Grouped list */}
      <div className="space-y-6 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: themeColor }} />
          </div>
        ) : tasksByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-70 h-40">
            <p className="text-[#8E95A5]">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          tasksByDate.map((group) => {
            const isCelebration = group.kind === 'today' && allTodayDone;

            return (
              <React.Fragment key={`${group.kind}-${group.date || ''}`}>
                {group.isNewMonth && group.date && (
                  <h2 className="text-2xl font-bold text-[#384058] pt-2">
                    {MONTH_NAMES[new Date(`${group.date}T12:00:00`).getMonth()]}
                  </h2>
                )}

                <div
                  className={clsx(
                    'relative rounded-3xl p-4',
                    group.kind === 'overdue' && 'border border-[#F43F5E]/30',
                    group.kind === 'today' && !isCelebration && 'bg-[#161924] border border-[#282E42]',
                    isCelebration && 'bg-[#A3E635]/10 border border-[#A3E635]/40 overflow-hidden'
                  )}
                >
                  {isCelebration && <Confetti />}

                  <div className="flex items-center justify-between mb-3 relative">
                    {isCelebration ? (
                      <h3 className="text-lg font-bold text-[#A3E635] flex items-center gap-2">
                        <PartyPopper size={18} /> Tudo concluído hoje! 🎉
                      </h3>
                    ) : (
                      <h3
                        className={clsx(
                          'font-semibold flex items-center gap-2',
                          group.kind === 'overdue' ? 'text-[#F43F5E]' : group.kind === 'today' ? 'text-lg text-white' : 'text-sm text-[#8E95A5]'
                        )}
                      >
                        {group.kind === 'today'
                          ? `${group.tasks.length} tarefa${group.tasks.length > 1 ? 's' : ''} para hoje`
                          : groupTitle(group)}
                        {group.kind === 'overdue' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F43F5E]/15 text-[#F43F5E]">
                            Atrasada{group.tasks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </h3>
                    )}

                    {group.kind !== 'no_date' && group.kind !== 'overdue' && (
                      <button
                        onClick={() =>
                          openAddForm(
                            group.kind === 'today'
                              ? new Date().toISOString().substring(0, 10)
                              : group.kind === 'tomorrow'
                              ? (() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  return d.toISOString().substring(0, 10);
                                })()
                              : group.date
                          )
                        }
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#8E95A5] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5 relative">
                    {group.tasks.map((task) => (
                      <TaskCard key={task.id} task={task} categories={categories} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => openAddForm()}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-black shadow-lg transition-transform active:scale-95 z-20"
        style={{ backgroundColor: '#A3E635', boxShadow: '0 4px 20px -4px #A3E63590' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TaskModal
              themeColor={themeColor}
              categories={categories}
              initialDate={prefillDate}
              onClose={() => setShowAddForm(false)}
              onSubmit={async (data) => {
                await addTask(data);
                setShowAddForm(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
