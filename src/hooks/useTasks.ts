import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority | null;
  category: string | null;
  is_completed: boolean;
  notify: boolean;
  created_at: string;
}

export type TaskFilter = 'all' | 'pending' | 'completed';

export type TaskGroupKind = 'overdue' | 'today' | 'tomorrow' | 'day' | 'no_date';

export interface TaskGroup {
  kind: TaskGroupKind;
  /** Only set for kind === 'day': the exact due_date (YYYY-MM-DD). */
  date?: string;
  /** True when this group starts a new calendar month relative to the previous group (kind === 'day' only). */
  isNewMonth?: boolean;
  tasks: TaskItem[];
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().substring(0, 10);
}

function monthKey(dateStr: string) {
  return dateStr.substring(0, 7); // YYYY-MM
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks((data as TaskItem[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (taskData: {
    title: string;
    description?: string | null;
    due_date?: string | null;
    priority?: TaskPriority | null;
    category?: string | null;
    notify?: boolean;
  }) => {
    if (!taskData.title.trim() || !user) return;
    const { error: insertError } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: taskData.title.trim(),
      description: taskData.description || null,
      due_date: taskData.due_date || null,
      priority: taskData.priority || null,
      category: taskData.category || null,
      notify: taskData.notify || false,
      is_completed: false,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    await fetchTasks();
  };

  const updateTask = async (id: string, updates: Partial<TaskItem>) => {
    const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await fetchTasks();
  };

  const toggleTask = async (id: string, isCompleted: boolean) => {
    return updateTask(id, { is_completed: isCompleted });
  };

  const deleteTask = async (id: string) => {
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await fetchTasks();
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.category && set.add(t.category));
    return Array.from(set);
  }, [tasks]);

  const pendingToday = useMemo(
    () => tasks.filter((t) => !t.is_completed && t.due_date?.substring(0, 10) === todayStr()),
    [tasks]
  );

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.due_date?.substring(0, 10) === todayStr()),
    [tasks]
  );
  const allTodayDone = todayTasks.length > 0 && todayTasks.every((t) => t.is_completed);

  const searchedTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'pending':
        return searchedTasks.filter((t) => !t.is_completed);
      case 'completed':
        return searchedTasks.filter((t) => t.is_completed);
      default:
        return searchedTasks;
    }
  }, [searchedTasks, filter]);

  const tasksByDate = useMemo<TaskGroup[]>(() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();

    const overdue: TaskItem[] = [];
    const todayGroup: TaskItem[] = [];
    const tomorrowGroup: TaskItem[] = [];
    const noDate: TaskItem[] = [];
    const byDay = new Map<string, TaskItem[]>();

    filteredTasks.forEach((task) => {
      const date = task.due_date?.substring(0, 10);
      if (!date) {
        noDate.push(task);
        return;
      }
      if (date < today && !task.is_completed) {
        overdue.push(task);
        return;
      }
      if (date === today) {
        todayGroup.push(task);
        return;
      }
      if (date === tomorrow) {
        tomorrowGroup.push(task);
        return;
      }
      // Overdue-but-completed tasks and any other date fall into the "day" buckets.
      const key = date < today ? today : date;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(task);
    });

    const sortedDays = Array.from(byDay.keys()).sort();

    const groups: TaskGroup[] = [];
    if (overdue.length > 0) groups.push({ kind: 'overdue', tasks: overdue });
    if (todayGroup.length > 0) groups.push({ kind: 'today', tasks: todayGroup });
    if (tomorrowGroup.length > 0) groups.push({ kind: 'tomorrow', tasks: tomorrowGroup });

    let prevMonth: string | null = null;
    sortedDays.forEach((date) => {
      const dayTasks = byDay.get(date)!;
      if (dayTasks.length === 0) return;
      const month = monthKey(date);
      groups.push({ kind: 'day', date, isNewMonth: prevMonth !== null && month !== prevMonth, tasks: dayTasks });
      prevMonth = month;
    });

    if (noDate.length > 0) groups.push({ kind: 'no_date', tasks: noDate });

    return groups;
  }, [filteredTasks]);

  return {
    tasks,
    loading,
    error,
    filter,
    setFilter,
    search,
    setSearch,
    categories,
    pendingToday,
    allTodayDone,
    filteredTasks,
    tasksByDate,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    refresh: fetchTasks,
  };
}
