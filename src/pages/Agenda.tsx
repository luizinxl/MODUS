import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Clock,
  Search,
  CalendarDays,
  Sparkles,
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
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Types ──────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'class' | 'interview' | 'deadline' | 'personal';
  description?: string;
  date: string; // ISO date string
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  meetLink?: string;
  participants?: { name: string; avatar: string }[];
}

// ─── Category colors ────────────────────────────────────────
const categoryConfig: Record<CalendarEvent['type'], { dot: string; bg: string; border: string; label: string }> = {
  class:     { dot: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', label: 'Aula' },
  interview: { dot: '#84CC16', bg: 'rgba(132,204,22,0.12)', border: 'rgba(132,204,22,0.25)', label: 'Entrevista' },
  meeting:   { dot: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', label: 'Reunião' },
  deadline:  { dot: '#A855F7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', label: 'Deadline' },
  personal:  { dot: '#06B6D4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)',  label: 'Pessoal' },
};

// ─── Mock events ────────────────────────────────────────────
function generateMockEvents(): CalendarEvent[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = (day: number) => `${y}-${pad(m + 1)}-${pad(day)}`;

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=julia',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=pedro',
  ];

  return [
    {
      id: '1', title: 'Team Sync Call', type: 'meeting',
      description: 'Alinhamento semanal do time de engenharia',
      date: dateStr(d), startTime: '09:00', endTime: '10:15',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      participants: [
        { name: 'Maria', avatar: avatars[1] },
        { name: 'Carlos', avatar: avatars[2] },
        { name: 'Julia', avatar: avatars[3] },
      ],
    },
    {
      id: '2', title: 'Computação e Sociedade', type: 'class',
      description: 'Atividade Semana 12 — Entregas e revisão',
      date: dateStr(d), startTime: '14:00', endTime: '15:30',
      participants: [
        { name: 'Prof. Santos', avatar: avatars[4] },
      ],
    },
    {
      id: '3', title: 'Job Interview — TechCorp', type: 'interview',
      description: 'Entrevista técnica — React + System Design',
      date: dateStr(d), startTime: '16:00', endTime: '17:00',
      meetLink: 'https://meet.google.com/xyz-uvwx-rst',
      participants: [
        { name: 'Alex', avatar: avatars[0] },
        { name: 'Julia', avatar: avatars[3] },
      ],
    },
    {
      id: '4', title: 'Product Roadmap Sync', type: 'meeting',
      description: 'Planejamento de sprints — Q4 prioridades',
      date: dateStr(d + 1 <= 28 ? d + 1 : d), startTime: '10:00', endTime: '11:30',
      meetLink: 'https://meet.google.com/pqr-stuv-wxy',
      participants: [
        { name: 'Maria', avatar: avatars[1] },
        { name: 'Pedro', avatar: avatars[4] },
      ],
    },
    {
      id: '5', title: 'Projeto Integrador — Deadline', type: 'deadline',
      description: 'Entrega final do Projeto Integrador II',
      date: dateStr(d + 3 <= 28 ? d + 3 : d), startTime: '23:59', endTime: '23:59',
    },
    {
      id: '6', title: 'Pensamento Computacional', type: 'class',
      description: 'Semana 11 — Lógica de programação avançada',
      date: dateStr(d + 2 <= 28 ? d + 2 : d), startTime: '08:30', endTime: '10:00',
    },
    {
      id: '7', title: 'Design Review', type: 'meeting',
      description: 'Revisão de protótipos e feedback do time',
      date: dateStr(d + 2 <= 28 ? d + 2 : d), startTime: '14:00', endTime: '15:00',
      meetLink: 'https://meet.google.com/lmn-opqr-stu',
      participants: [
        { name: 'Carlos', avatar: avatars[2] },
        { name: 'Julia', avatar: avatars[3] },
      ],
    },
    {
      id: '8', title: 'Treino — Academia', type: 'personal',
      description: 'Treino de peito e costas',
      date: dateStr(d), startTime: '06:00', endTime: '07:30',
    },
    {
      id: '9', title: 'Sprint Planning', type: 'meeting',
      description: 'Planejamento sprint 23 — frontend + backend',
      date: dateStr(d - 1 >= 1 ? d - 1 : d), startTime: '09:00', endTime: '10:00',
      participants: [
        { name: 'Maria', avatar: avatars[1] },
        { name: 'Carlos', avatar: avatars[2] },
      ],
    },
    {
      id: '10', title: 'Matemática Discreta', type: 'class',
      description: 'Atividade avaliativa — Grafos e árvores',
      date: dateStr(d - 2 >= 1 ? d - 2 : d), startTime: '19:00', endTime: '20:30',
    },
  ];
}

// ─── Helpers ────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return '';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ═══════════════════════════════════════════════════════════════
// Component: Agenda Page
// ═══════════════════════════════════════════════════════════════
export default function Agenda() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);

  const events = useMemo(() => generateMockEvents(), []);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Events for selected day
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => isSameDay(parseISO(e.date), selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDate]);

  // Events by date for dot indicators
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent['type'][]>();
    for (const e of events) {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      const types = map.get(key)!;
      if (!types.includes(e.type)) types.push(e.type);
    }
    return map;
  }, [events]);

  const handlePrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const handleNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Filtered events for search
  const filteredDayEvents = useMemo(() => {
    if (!searchQuery.trim()) return dayEvents;
    const q = searchQuery.toLowerCase();
    return dayEvents.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        categoryConfig[e.type].label.toLowerCase().includes(q)
    );
  }, [dayEvents, searchQuery]);

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
            <span className="text-[#9CA3AF]">{dayEvents.length} compromissos hoje</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar eventos…"
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
            Novo Evento
          </motion.button>
        </div>
      </div>

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
              const dayTypes = eventsByDate.get(dateKey) || [];

              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
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

                  {/* Event dots */}
                  {dayTypes.length > 0 && (
                    <div className="flex gap-[3px] mt-1.5">
                      {dayTypes.slice(0, 3).map((type) => (
                        <span
                          key={type}
                          className="w-[5px] h-[5px] rounded-full"
                          style={{ backgroundColor: categoryConfig[type].dot }}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-6 py-3 border-t border-[#1A2236] shrink-0">
            {Object.entries(categoryConfig).map(([key, cfg]) => (
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
                Scheduled
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
              {filteredDayEvents.length > 0 ? (
                filteredDayEvents.map((event, i) => {
                  const cfg = categoryConfig[event.type];
                  const duration = formatDuration(event.startTime, event.endTime);

                  return (
                    <motion.div
                      key={event.id}
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
                            {event.startTime} — {event.endTime}
                          </span>
                        </div>
                        {duration && (
                          <span className="text-[10px] font-medium text-[#4B5563] bg-[#0D1320] px-2 py-0.5 rounded-md">
                            {duration}
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
                          <h4 className="text-sm font-bold text-white leading-tight truncate group-hover:text-blue-100 transition-colors">
                            {event.title}
                          </h4>
                          <span className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: cfg.dot }}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-xs text-[#6B7280] leading-relaxed ml-3.5 mb-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Footer: Participants + Meet link */}
                      <div className="flex items-center justify-between ml-3.5">
                        {/* Avatars */}
                        {event.participants && event.participants.length > 0 && (
                          <div className="flex -space-x-2">
                            {event.participants.slice(0, 4).map((p, j) => (
                              <img
                                key={j}
                                src={p.avatar}
                                alt={p.name}
                                title={p.name}
                                className="w-6 h-6 rounded-full border-2 object-cover"
                                style={{ borderColor: '#0D1320' }}
                              />
                            ))}
                            {event.participants.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-[#1E293B] border-2 border-[#0D1320] flex items-center justify-center">
                                <span className="text-[9px] font-bold text-[#9CA3AF]">
                                  +{event.participants.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Meet Link */}
                        {event.meetLink && (
                          <a
                            href={event.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Video size={12} />
                            Meet
                          </a>
                        )}
                      </div>
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
                    <CalendarDays size={24} className="text-[#2A3348]" />
                  </div>
                  <p className="text-sm font-medium text-[#4B5563] mb-1">Nenhum compromisso</p>
                  <p className="text-xs text-[#2A3348]">
                    {searchQuery ? 'Tente outra busca' : 'Selecione uma data ou crie um evento'}
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
              Agendar Atividade
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
                <h3 className="text-lg font-bold text-white mb-1">Novo Evento</h3>
                <p className="text-xs text-[#4B5563] mb-5">
                  Crie um novo compromisso para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Título</label>
                    <input
                      type="text"
                      placeholder="Ex: Team Sync Call"
                      className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#2A3348] focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Início</label>
                      <input
                        type="time"
                        className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Término</label>
                      <input
                        type="time"
                        className="w-full bg-[#131B2E] border border-[#1E293B] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors [color-scheme:dark]"
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
                      placeholder="Detalhes do evento…"
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
                  Criar Evento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
