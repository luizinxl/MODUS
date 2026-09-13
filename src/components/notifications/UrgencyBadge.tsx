import { differenceInHours, isToday, isPast } from 'date-fns';
import clsx from 'clsx';
import { AlertCircle, Clock } from 'lucide-react';

interface UrgencyBadgeProps {
  dueDate: string | null;
  status: string;
}

export default function UrgencyBadge({ dueDate, status }: UrgencyBadgeProps) {
  if (!dueDate || status === 'completed' || status === 'cancelled') return null;

  const date = new Date(dueDate);
  const hoursRemaining = differenceInHours(date, new Date());
  
  const isTaskOverdue = isPast(date) && !isToday(date);
  const isTaskToday = isToday(date);
  const isTask48h = hoursRemaining > 0 && hoursRemaining <= 48;

  if (isTaskOverdue) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] text-xs font-bold">
        <AlertCircle size={14} />
        ATRASADA
      </div>
    );
  }

  if (isTaskToday) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F97316]/10 border border-[#F97316]/20 text-[#F97316] text-xs font-bold">
        <Clock size={14} />
        HOJE
      </div>
    );
  }

  if (isTask48h) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/20 text-[#EAB308] text-xs font-bold">
        <Clock size={14} />
        {hoursRemaining}h restantes
      </div>
    );
  }

  return null;
}
