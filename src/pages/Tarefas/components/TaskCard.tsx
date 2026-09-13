import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { TaskItem } from '@/hooks/useTasks';
import UrgencyBadge from '@/components/notifications/UrgencyBadge';
import { PRIORITY_COLORS } from './TaskModal';

const CATEGORY_PALETTE = ['#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#818CF8', '#F97316'];

function categoryColor(category: string, categories: string[]) {
  const idx = categories.indexOf(category);
  return CATEGORY_PALETTE[(idx < 0 ? 0 : idx) % CATEGORY_PALETTE.length];
}

interface TaskCardProps {
  task: TaskItem;
  categories: string[];
  onToggle: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, categories, onToggle, onDelete }: TaskCardProps) {
  const isOverdue = !task.is_completed && !!task.due_date && task.due_date.substring(0, 10) < new Date().toISOString().substring(0, 10);

  return (
    <div
      className={clsx(
        'group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200',
        task.is_completed
          ? 'bg-[#161924] border-[#1E2230] opacity-60'
          : isOverdue
          ? 'bg-[#1A1D27] border-[#F43F5E]/30 hover:border-[#F43F5E]/50'
          : 'bg-[#1A1D27] border-[#282E42] hover:border-[#384058]'
      )}
    >
      <button
        onClick={() => onToggle(task.id, !task.is_completed)}
        className={clsx(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
          task.is_completed ? 'bg-[#A3E635] border-[#A3E635]' : 'border-[#636A7E] hover:border-[#8E95A5]'
        )}
      >
        {task.is_completed && <Check size={14} className="text-black" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            'text-[15px] font-medium leading-snug break-words',
            task.is_completed ? 'text-[#8E95A5] line-through' : 'text-white'
          )}
        >
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {task.priority && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-black"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            >
              {task.priority}
            </span>
          )}

          {task.category && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${categoryColor(task.category, categories)}22`, color: categoryColor(task.category, categories) }}
            >
              {task.category}
            </span>
          )}

          <UrgencyBadge dueDate={task.due_date} status={task.is_completed ? 'completed' : 'pending'} />
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#636A7E] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
