import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Search,
  CalendarDays,
  Sparkles,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAcademic } from '@/hooks/useAcademic';
import { AcademicTask } from '@/types';

// ─── Category colors (mapped from AcademicTask types) ────────
const categoryConfig: Record<string, { dot: string; bg: string; border: string; label: string }> = {
  assignment:     { dot: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', label: 'Atividade' },
  peer_review:    { dot: '#84CC16', bg: 'rgba(132,204,22,0.12)', border: 'rgba(132,204,22,0.25)', label: 'Revisão' },
  meeting:        { dot: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', label: 'Reunião' },
  quiz:           { dot: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', label: 'Quiz' },
  exam:           { dot: '#F43F5E', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.25)',  label: 'Prova' },
  reading:        { dot: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  label: 'Leitura' },
  project:        { dot: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', label: 'Projeto' },
  default:        { dot: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)', label: 'Tarefa' }
};

// ─── Helpers ────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ═══════════════════════════════════════════════════════════════
// Component: Academic Dashboard (New Calendar & Agenda)
// ═══════════════════════════════════════════════════════════════
export default function AcademicDashboard() {
  const {
    tasks,
    syncState,
    calendarDays: backendCalendarDays,
    selectedDayTasks,
    loading,
    error,
    refresh,
    selectDay,
    setCalendarMonth,
    counts,
  } = useAcademic();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);

  // Initialize selection
  useEffect(() => {
    const today = new Date();
    selectDay(format(today, 'yyyy-MM-dd'));
  }, [selectDay]);

  // Sync calendar month with backend
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
    setCalendarMonth(date.getFullYear(), date.getMonth() + 1);
  };

  const handlePrevMonth = () => handleMonthChange(subMonths(currentMonth, 1));
  const handleNextMonth = () => handleMonthChange(addMonths(currentMonth, 1));
  
  const handleToday = () => {
    const today = new Date();
    handleMonthChange(today);
    handleSelectDate(today);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    selectDay(format(date, 'yyyy-MM-dd'));
  };

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Filtered events for search
  const filteredDayEvents = useMemo(() => {
    if (!searchQuery.trim()) return selectedDayTasks;
    const q = searchQuery.toLowerCase();
    return selectedDayTasks.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        (e.course && e.course.toLowerCase().includes(q))
    );
  }, [selectedDayTasks, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Sparkles size={22} className="text-blue-400" />
            {getGreeting()}, Alex!
          </h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })} —{' '}
            <span className="text-[#9CA3AF]">{selectedDayTasks.length} tarefas hoje</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync Status */}
          {syncState && (
            <div className="hidden md:flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-[#131B2E] border border-[#1E293B]">
              <span className={clsx("w-2 h-2 rounded-full", syncState.last_login_success ? "bg-[#10B981]" : "bg-[#F43F5E]")} />
              <span className="text-[#8E95A5]">
                Sync: {syncState.last_morning_sync ? new Date(syncState.last_morning_sync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas…"
              className="bg-[#131B2E] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 w-56 transition-all"
            />
          </div>

          {/* New Event */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-[0_4px_16px_-4px_rgba(59,130,246,0.5)] transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nova Tarefa
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/20 flex items-start gap-3 shrink-0">
          <AlertCircle size={20} className="text-[#F43F5E] shrink-0 mt-0.5" />
          <p className="text-sm text-[#F43F5E] leading-relaxed">{error}</p>
        </div>
      )}

      {/* ─── Main Grid: Calendar + Agenda ──────────── */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* ═══ LEFT: Calendar Grid ═══ */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex-[2] bg-[#0D1320] border border-[#1A2236] rounded-2xl flex flex-col overflow-hidden"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <button
                onClick={handleToday}
                className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                Hoje
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#1A2236] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#1A2236] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 px-4 pb-2 shrink-0">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 flex-1 px-4 pb-4 auto-rows-fr">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, currentMonth);
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              
              const backendDay = backendCalendarDays.find(d => d.date === dateKey);

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectDate(day)}
                  className={clsx(
                    'relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 m-0.5 min-h-0',
                    inMonth ? 'text-white' : 'text-[#2A3348]',
                    selected
                      ? 'bg-blue-600/20 border-2 border-blue-500 shadow-[0_0_16px_-4px_rgba(59,130,246,0.4)]'
                      : 'border-2 border-transparent hover:bg-[#131B2E] hover:border-[#1E293B]',
                    today && !selected && 'ring-1 ring-blue-500/30'
                  )}
                >
                  <span
                    className={clsx(
                      'text-sm font-semibold leading-none',
                      selected && 'text-blue-400',
                      today && !selected && 'text-blue-300'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Event dots based on backend metadata */}
                  {backendDay && (
                    <div className="flex gap-[3px] mt-1.5 flex-wrap justify-center">
                      {backendDay.hasExam && <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: categoryConfig.exam.dot }} title="Prova" />}
                      {backendDay.hasDeadline && <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: categoryConfig.assignment.dot }} title="Prazo" />}
                      {backendDay.hasPeerReview && <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: categoryConfig.peer_review.dot }} title="Revisão" />}
                      {backendDay.hasStart && <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: categoryConfig.project.dot }} title="Início de Tarefa" />}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-6 py-3 border-t border-[#1A2236] shrink-0">
            {Object.entries(categoryConfig)
              .filter(([key]) => ['assignment', 'exam', 'peer_review', 'project'].includes(key))
              .map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                <span className="text-[11px] text-[#6B7280] font-medium">{cfg.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ RIGHT: Scheduled Panel ═══ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="flex-[1.1] bg-[#0D1320] border border-[#1A2236] rounded-2xl flex flex-col overflow-hidden min-w-[320px]"
        >
          {/* Panel Header */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays size={17} className="text-blue-400" />
                Tarefas
              </h3>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                {filteredDayEvents.length}
              </span>
            </div>
            <p className="text-xs text-[#4B5563]">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          {/* Events Stream */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar space-y-3">
            <AnimatePresence mode="popLayout">
              {loading && selectedDayTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </motion.div>
              ) : filteredDayEvents.length > 0 ? (
                filteredDayEvents.map((task, i) => {
                  const cfg = categoryConfig[task.task_type || 'default'] || categoryConfig['default'];
                  
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, delay: i * 0.05 }}
                      className="group rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]"
                      style={{
                        backgroundColor: cfg.bg,
                        borderColor: cfg.border,
                      }}
                    >
                      {/* Time & Duration */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-[#6B7280]" />
                          <span className="text-xs font-semibold text-[#9CA3AF]">
                            {task.due_date ? new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia todo'}
                          </span>
                        </div>
                        {task.estimated_hours && (
                          <span className="text-[10px] font-medium text-[#4B5563] bg-[#0D1320] px-2 py-0.5 rounded-md">
                            ~{task.estimated_hours}h
                          </span>
                        )}
                      </div>

                      {/* Title & Type */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <span
                          className="w-1 h-8 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: cfg.dot }}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-blue-100 transition-colors">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cfg.dot }}>
                              {cfg.label}
                            </span>
                            {task.course_code && (
                              <span className="text-[10px] font-medium text-[#6B7280] bg-[#131B2E] px-1.5 py-0.5 rounded">
                                {task.course_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-[#6B7280] leading-relaxed ml-3.5 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#131B2E] border border-[#1E293B] flex items-center justify-center mb-4">
                    <BookOpen size={24} className="text-[#2A3348]" />
                  </div>
                  <p className="text-sm font-medium text-[#4B5563] mb-1">Nenhuma tarefa</p>
                  <p className="text-xs text-[#2A3348]">
                    {searchQuery ? 'Tente outra busca' : 'Selecione uma data ou crie uma tarefa'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add Activity Footer */}
          <div className="px-4 py-3 border-t border-[#1A2236] shrink-0">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNewEvent(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#1E293B] text-[#4B5563] hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-sm font-medium"
            >
              <Plus size={15} />
              Agendar Tarefa
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ─── New Event Modal (placeholder) ─── */}
      <AnimatePresence>
        {showNewEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowNewEvent(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D1320] border border-[#1A2236] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-1">Nova Tarefa</h3>
                <p className="text-xs text-[#4B5563] mb-5">
                  Crie um novo compromisso para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Título</label>
                    <input
                      type="text"
                      placeholder="Ex: Trabalho de Física"
                      className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#2A3348] focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Data de Entrega</label>
                      <input
                        type="date"
                        defaultValue={format(selectedDate, 'yyyy-MM-dd')}
                        className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Tempo Estimado</label>
                      <input
                        type="number"
                        placeholder="Em horas"
                        className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#2A3348] focus:outline-none focus:border-blue-500/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(categoryConfig).map(([key, cfg]) => (
                        <button
                          key={key}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105"
                          style={{
                            backgroundColor: cfg.bg,
                            borderColor: cfg.border,
                            color: cfg.dot,
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Descrição</label>
                    <textarea
                      placeholder="Detalhes da tarefa…"
                      rows={2}
                      className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#2A3348] focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1A2236]">
                <button
                  onClick={() => setShowNewEvent(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#6B7280] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowNewEvent(false)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)] hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)] transition-all"
                >
                  Criar Tarefa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
