import React from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { AcademicTask } from '@/types';
import UrgencyBadge from '@/components/notifications/UrgencyBadge';

interface DailyPanelProps {
  selectedDate: string | null;
  tasks: AcademicTask[];
}

export function DailyPanel({ selectedDate, tasks }: DailyPanelProps) {
  if (!selectedDate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
        <div className="w-16 h-16 rounded-full bg-[#1A1D27] flex items-center justify-center mb-4">
          <CalendarDays size={24} className="text-[#636A7E]" />
        </div>
        <h3 className="text-white font-medium mb-1">Nenhum dia selecionado</h3>
        <p className="text-sm text-[#8E95A5]">
          Selecione um dia no calendário para ver a programação.
        </p>
      </div>
    );
  }

  const dateObj = new Date(`${selectedDate}T12:00:00`);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      {/* Panel Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Programado</h2>
          <p className="text-sm text-[#8E95A5] capitalize mt-0.5">
            {formattedDate}
          </p>
        </div>
        
        {/* Navigation placeholder for visual similarity with the image */}
        <div className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
          <div className="p-1.5 rounded-lg bg-[#1A1D27] text-[#8E95A5]">
            <CalendarDays size={16} />
          </div>
          <div className="flex items-center bg-[#1A1D27] rounded-lg p-0.5">
            <div className="p-1 text-[#8E95A5]">
              <ChevronLeft size={16} />
            </div>
            <div className="p-1 text-[#8E95A5]">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
          <p className="text-[#8E95A5] text-sm">Nenhuma atividade para este dia.</p>
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto pr-2 pb-8 flex-1 custom-scrollbar">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: AcademicTask }) {
  const isCompleted = task.status === 'completed';
  const isOverdue = task.status === 'overdue';
  
  const getTypeColor = (type?: string) => {
    if (type === 'peer_review') return '#7C5CFC'; // Marca/Roxo
    if (type === 'exam') return '#3B82F6';       // Azul
    if (type === 'reading') return '#10B981';    // Verde
    return '#F43F5E';                            // Vermelho (Prazos/Default)
  };

  const colorHex = getTypeColor(task.task_type);

  return (
    <div className="flex flex-col gap-2">
      {/* Time Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#D1D5DB]">
          {task.due_date ? new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia todo'}
        </span>
      </div>

      {/* Card Body */}
      <div 
        className={clsx(
          "rounded-2xl bg-[#1A1D27] border border-[#282E42] overflow-hidden transition-all",
          isCompleted && "opacity-60 grayscale-[30%]"
        )}
      >
        {/* Top thick border line */}
        <div className="h-1.5 w-full" style={{ backgroundColor: colorHex }} />
        
        <div className="p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={clsx("font-semibold text-[15px] text-white leading-snug", isCompleted && "line-through text-[#8E95A5]")}>
                {task.title}
              </h3>
              <span className="text-xs text-[#8E95A5] font-medium mt-0.5 block">
                {task.course_code || task.course}
              </span>
            </div>
            
            {isCompleted ? (
              <CheckCircle2 size={18} className="text-[#10B981] shrink-0" />
            ) : isOverdue ? (
              <AlertCircle size={18} className="text-[#F43F5E] shrink-0" />
            ) : null}
          </div>

          {/* Details (Duration / Description) */}
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-[#8E95A5]">
              <Clock size={14} className="text-[#636A7E]" />
              <span>{task.due_date ? new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'S/ horário'}</span>
            </div>
            
            {task.task_type && (
              <div className="text-xs text-[#8E95A5] capitalize flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#636A7E]" />
                {task.task_type.replace('_', ' ')}
              </div>
            )}
          </div>
          
          {/* Action Button & Badges */}
          <div className="mt-2 flex items-center justify-between">
            {task.ava_url && !isCompleted ? (
              <a
                href={task.ava_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2A2F42] hover:bg-[#384058] text-xs font-semibold text-white transition-colors"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: colorHex }}
                />
                Acessar AVA
                <ExternalLink size={12} className="ml-0.5 opacity-70" />
              </a>
            ) : <div />}
            
            <UrgencyBadge dueDate={task.due_date} status={task.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
