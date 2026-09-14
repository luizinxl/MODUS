// Client-side: fala com as Edge Functions (nunca com a Pluggy direto).
// O CLIENT_SECRET fica só no backend. Aqui só chamamos nossas functions.

import supabase from '@/config/supabase';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Gera o connectToken para abrir o widget do Pluggy
export async function getConnectToken(itemId?: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/pluggy-connect-token`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ itemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Falha ao gerar connect token');
  }
  const data = await res.json();
  return data.connectToken;
}

// Salva a conexão no Supabase após sucesso do widget
export async function savePluggyConnection(itemId: string, item: {
  connector?: { name?: string; type?: string; id?: number };
  status?: string;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Upsert por pluggy_item_id (pode ser uma reconexão)
  const { data, error } = await supabase
    .from('pluggy_connections')
    .upsert({
      user_id: user.id,
      pluggy_item_id: itemId,
      connector_id: item.connector?.id ?? null,
      institution_name: item.connector?.name ?? 'Instituição desconhecida',
      institution_type: item.connector?.type ?? 'PERSONAL_BANK',
      status: item.status ?? 'UPDATING',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'pluggy_item_id',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Erro ao salvar conexão: ${error.message}`);
  return data.id;
}

// Dispara a sincronização completa de um Item
export async function syncPluggyItem(
  userId: string,
  connectionId: string,
  pluggyItemId: string,
): Promise<{ transactions: { created: number; skipped: number }; investments: { created: number; updated: number } }> {
  const res = await fetch(`${FUNCTIONS_URL}/pluggy-sync`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ userId, connectionId, pluggyItemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Falha na sincronização Pluggy');
  }
  return res.json();
}
