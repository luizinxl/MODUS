import { useEffect, useState, useCallback } from 'react';
import supabase from '@/config/supabase';

// ----------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------
export type TransactionSource = 'pluggy' | 'gmail' | 'manual';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'saving';

export interface Transaction {
  id: string;
  pluggy_id: string | null;
  source: TransactionSource;
  description: string;
  description_original: string | null;
  description_normalized: string | null;
  amount: number;
  transaction_type: TransactionType;
  category: string;
  category_auto: string | null;
  category_confidence: number | null;
  reviewed: boolean;
  transaction_date: string; // ISO date string
  payment_method: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface TransactionSummary {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  transactionCount: number;
}

export type FilterType = 'all' | 'income' | 'expense';

interface UseTransactionsOptions {
  filter?: FilterType;
  page?: number;
  pageSize?: number;
  monthOffset?: number; // 0 = mes atual, -1 = mes anterior, etc
}

// ----------------------------------------------------------------
// Hook principal
// ----------------------------------------------------------------
export function useTransactions(options: UseTransactionsOptions = {}) {
  const { filter = 'all', page = 1, pageSize = 10, monthOffset = 0 } = options;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalBalance: 0,
    monthIncome: 0,
    monthExpenses: 0,
    transactionCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Intervalo de datas para o mes selecionado
  const getMonthRange = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const start = new Date(target.getFullYear(), target.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];
    return { start, end };
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { start, end } = getMonthRange();

      // Query principal (paginada + filtrada)
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filter !== 'all') {
        query = query.eq('transaction_type', filter === 'income' ? 'income' : 'expense');
      }

      const { data, count, error: qErr } = await query;
      if (qErr) throw qErr;

      setTransactions((data ?? []) as Transaction[]);
      setTotal(count ?? 0);

      // Resumo do mes (sem filtro de tipo para ter os dois lados)
      const { data: summaryData, error: sErr } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (sErr) throw sErr;

      const monthIncome = (summaryData ?? [])
        .filter((t) => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthExpenses = (summaryData ?? [])
        .filter((t) => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Saldo geral do usuario (todas as transacoes)
      const { data: allData } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', user.id);

      const totalBalance = (allData ?? []).reduce((sum, t) => {
        return t.transaction_type === 'income'
          ? sum + Number(t.amount)
          : sum - Number(t.amount);
      }, 0);

      setSummary({
        totalBalance,
        monthIncome,
        monthExpenses,
        transactionCount: count ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize, monthOffset]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Atualizar categoria de uma transacao manualmente
  const updateCategory = useCallback(async (id: string, category: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ category, reviewed: true })
      .eq('id', id);
    if (!error) fetchTransactions();
    return !error;
  }, [fetchTransactions]);

  // Transacoes "a revisar" (confianca baixa)
  const pendingReview = transactions.filter(
    (t) => !t.reviewed && (t.category === 'Outros / A revisar' || (t.category_confidence ?? 1) < 0.5)
  );

  return {
    transactions,
    summary,
    total,
    totalPages: Math.ceil(total / pageSize),
    pendingReview,
    loading,
    error,
    refetch: fetchTransactions,
    updateCategory,
  };
}

// ----------------------------------------------------------------
// Hook de conexoes Pluggy
// ----------------------------------------------------------------
export interface PluggyConnection {
  id: string;
  pluggy_item_id: string;
  institution_name: string;
  institution_type: string;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function usePluggyConnections() {
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error: qErr } = await supabase
        .from('pluggy_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (qErr) throw qErr;
      setConnections((data ?? []) as PluggyConnection[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conexões');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { connections, loading, error, refetch: fetchConnections };
}
