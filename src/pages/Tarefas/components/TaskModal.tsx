import React, { useState } from 'react';
import { X, Calendar, Bell, Flag, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { messaging } from '@/lib/firebase';
import type { TaskPriority } from '@/hooks/useTasks';

interface TaskModalProps {
  themeColor: string;
  categories: string[];
  initialDate?: string | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    due_date: string | null;
    category: string | null;
    priority: TaskPriority | null;
    notify: boolean;
  }) => Promise<void>;
}

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];

export function TaskModal({ themeColor, categories, initialDate, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(initialDate || '');
  const [category, setCategory] = useState('');
  const [notify, setNotify] = useState(false);
  const [priorityEnabled, setPriorityEnabled] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>('P1');
  const [saving, setSaving] = useState(false);

  const notificationsBlocked = !messaging;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSubmit({
      title: title.trim(),
      due_date: dueDate || null,
      category: category.trim() || null,
      priority: priorityEnabled ? priority : null,
      notify,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6">
      <div className="bg-[#12141C] border border-[#1E2230] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Nova Tarefa</h3>
          <button type="button" onClick={onClose} className="text-[#8E95A5] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="O que precisa ser feito?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1A1D27] border border-[#282E42] text-white text-base rounded-2xl px-4 py-3 focus:outline-none transition-colors"
            style={{ borderColor: title ? themeColor : undefined }}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8E95A5] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} /> Data
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[#1A1D27] border border-[#282E42] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8E95A5] uppercase tracking-wider">Categoria</label>
              <input
                type="text"
                list="task-categories"
                placeholder="Ex: trabalho"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-[#1A1D27] border border-[#282E42] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#7C5CFC]"
              />
              <datalist id="task-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setNotify((v) => !v)}
              className={clsx(
                'flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-colors',
                notify ? 'bg-[#7C5CFC]/10 border-[#7C5CFC] text-white' : 'bg-[#1A1D27] border-[#282E42] text-[#8E95A5]'
              )}
            >
              <span className="flex items-center gap-2">
                <Bell size={16} /> Notificar
              </span>
              <span
                className={clsx('w-9 h-5 rounded-full relative transition-colors shrink-0', notify ? 'bg-[#7C5CFC]' : 'bg-[#282E42]')}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    notify ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPriorityEnabled((v) => !v)}
              className={clsx(
                'flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-colors',
                priorityEnabled ? 'bg-[#7C5CFC]/10 border-[#7C5CFC] text-white' : 'bg-[#1A1D27] border-[#282E42] text-[#8E95A5]'
              )}
            >
              <span className="flex items-center gap-2">
                <Flag size={16} /> Prioridade
              </span>
              <span
                className={clsx('w-9 h-5 rounded-full relative transition-colors shrink-0', priorityEnabled ? 'bg-[#7C5CFC]' : 'bg-[#282E42]')}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    priorityEnabled ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </span>
            </button>
          </div>

          {priorityEnabled && (
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={clsx(
                    'flex-1 py-2 rounded-xl text-sm font-bold border transition-all',
                    priority === p ? 'text-black border-transparent' : 'text-[#8E95A5] border-[#282E42] bg-[#1A1D27]'
                  )}
                  style={priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {notify && notificationsBlocked && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/20 text-xs text-[#EAB308]">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Notificação pendente de configuração — a intenção será salva, mas ainda não é possível enviar notificações.</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-[#8E95A5] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: themeColor, boxShadow: title.trim() ? `0 4px 14px -4px ${themeColor}80` : 'none' }}
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P1: '#FF6B6B',
  P2: '#FFA94D',
  P3: '#FFD93D',
  P4: '#6BCB77',
};
