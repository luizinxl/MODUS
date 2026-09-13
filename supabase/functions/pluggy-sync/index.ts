// Edge Function: pluggy-sync
// Sincroniza contas, cartoes, transacoes e investimentos de um Item Pluggy para o Supabase.
// Usa service_role key (backend) para gravar.
//
// Deploy: supabase functions deploy pluggy-sync
// Chamada: POST { userId, connectionId, pluggyItemId }

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getPluggyApiKey, pluggyFetch, pluggyFetchAll } from '../_shared/pluggy.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ============================================================
// CATEGORIZAÇÃO AUTOMÁTICA
// ============================================================
const CATEGORY_RULES: Array<{ pattern: RegExp; category: string; confidence: number }> = [
  { pattern: /ifood|rappi|ubereats|delivery|restaurante|lanchonete|padaria|supermercado|mercado|atacadao|extra|carrefour|pao de acucar|hortifruti/i, category: 'Alimentação', confidence: 0.85 },
  { pattern: /uber|99|cabify|lyft|onibus|metro|trem|combustivel|gasolina|etanol|shell|ipiranga|posto/i, category: 'Transporte', confidence: 0.85 },
  { pattern: /farmacia|drogaria|raia|pacheco|ultrafarma|hospital|clinica|medico|drogasil|consulta|laboratorio/i, category: 'Saúde', confidence: 0.85 },
  { pattern: /netflix|spotify|amazon prime|hbo|disney|globoplay|deezer|youtube premium|assinatura/i, category: 'Lazer', confidence: 0.85 },
  { pattern: /aluguel|condominio|iptu|agua|luz|energia|gas|internet|tim|vivo|claro|oi|telefone|celular/i, category: 'Moradia', confidence: 0.85 },
  { pattern: /amazon|americanas|shopee|magazine|mercado livre|mercadolivre|aliexpress/i, category: 'Compras', confidence: 0.75 },
  { pattern: /academia|crossfit|smartfit|bio ritmo|pilates|natacao|esporte/i, category: 'Saúde', confidence: 0.80 },
  { pattern: /escola|faculdade|univesp|coursera|udemy|alura|curso/i, category: 'Educação', confidence: 0.85 },
  { pattern: /salario|holerite|pagamento|prolabore|freelan|pix recebido/i, category: 'Receita', confidence: 0.75 },
  { pattern: /tarifa|taxa|juros|multa|iof/i, category: 'Tarifas Bancárias', confidence: 0.80 },
  { pattern: /viagem|hotel|airbnb|booking|latam|gol|azul|aeroporto/i, category: 'Viagem', confidence: 0.80 },
];

function categorize(description: string): { category: string; confidence: number } {
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(normalized)) {
      return { category: rule.category, confidence: rule.confidence };
    }
  }
  return { category: 'Outros / A revisar', confidence: 0.0 };
}

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove acentos
    .replace(/[^a-z0-9 ]/g, ' ')       // só alfanumérico
    .replace(/\s+/g, ' ')              // colapsa espaços
    .trim();
}

function mapInvestmentType(t: string): string {
  const map: Record<string, string> = {
    EQUITY: 'STOCK', FUND: 'FUND', FIXED_INCOME: 'FIXED_INCOME',
    ETF: 'ETF', SECURITY: 'FIXED_INCOME', COE: 'FIXED_INCOME',
  };
  return map[t] ?? 'FUND';
}

async function upsertByKey(
  table: string,
  keyCol: string,
  keyVal: string,
  payload: Record<string, unknown>
): Promise<'created' | 'updated'> {
  const { data: existing } = await supabase
    .from(table).select('id').eq(keyCol, keyVal).maybeSingle();
  if (existing) {
    await supabase.from(table).update(payload).eq('id', (existing as { id: string }).id);
    return 'updated';
  }
  await supabase.from(table).insert([payload]);
  return 'created';
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  let txCreated = 0, txSkipped = 0, invCreated = 0, invUpdated = 0;

  try {
    const { userId, connectionId, pluggyItemId } = await req.json();
    if (!userId || !pluggyItemId) {
      throw new Error('userId e pluggyItemId sao obrigatorios');
    }

    // Auth: valida JWT do usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header ausente.');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) throw new Error('Token JWT invalido.');
    if (authUser.id !== userId) throw new Error('Usuario nao autorizado para este userId.');

    const apiKey = await getPluggyApiKey();

    // ----------------------------------------------------------
    // 1. Contas bancarias
    // ----------------------------------------------------------
    const accounts = await pluggyFetchAll(`/accounts?itemId=${pluggyItemId}`, apiKey);

    for (const acc of accounts as Array<Record<string, unknown>>) {
      const r = await upsertByKey('bank_accounts', 'pluggy_account_id', acc.id as string, {
        user_id: userId,
        connection_id: connectionId ?? null,
        pluggy_account_id: acc.id,
        account_type: acc.type,
        account_subtype: acc.subtype,
        name: acc.name,
        marketing_name: acc.marketingName,
        number: acc.number,
        balance: acc.balance,
        currency: (acc.currencyCode as string) ?? 'BRL',
        updated_at: new Date().toISOString(),
      });
      console.log(`[pluggy-sync] bank_account ${acc.id}: ${r}`);

      // 1b. Cartao de credito
      if (acc.type === 'CREDIT') {
        const cd = acc.creditData as Record<string, unknown> | undefined;
        if (cd) {
          await upsertByKey('credit_cards', 'pluggy_account_id', acc.id as string, {
            user_id: userId,
            pluggy_account_id: acc.id,
            name: (acc.name ?? acc.marketingName) as string,
            brand: cd.brand,
            level: cd.level,
            last_four_digits: acc.number ? String(acc.number).slice(-4) : null,
            credit_limit: cd.creditLimit,
            available_limit: cd.availableCreditLimit,
            current_bill_amount: acc.balance,
            minimum_payment: cd.minimumPayment,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // 1c. Transacoes da conta (paginadas)
      const txs = await pluggyFetchAll(`/transactions?accountId=${acc.id}`, apiKey);
      for (const tx of txs as Array<Record<string, unknown>>) {
        // Dedupe: pluggy_id e chave primaria
        const { data: exists } = await supabase
          .from('transactions')
          .select('id')
          .eq('pluggy_id', tx.id as string)
          .maybeSingle();

        if (exists) {
          txSkipped++;
          continue;
        }

        const descOrig = (tx.description as string) ?? '';
        const descNorm = normalizeDescription(descOrig);
        const amount = tx.amount as number;
        const { category, confidence } = categorize(descOrig);

        await supabase.from('transactions').insert([{
          user_id: userId,
          // Dedupe Pluggy
          pluggy_id: tx.id,
          source: 'pluggy',
          // Descricoes
          description: descOrig,                         // campo legado (compatibilidade)
          description_original: descOrig,
          description_normalized: descNorm,
          // Valor
          amount: Math.abs(amount),
          transaction_type: amount < 0 ? 'expense' : 'income',
          // Categoria automatica
          category,
          category_auto: category,
          category_confidence: confidence,
          reviewed: false,
          // Datas
          transaction_date: tx.date,
          // Pagamento
          payment_method: (tx.paymentData as Record<string, unknown> | undefined)?.paymentMethod ?? 'card',
          status: 'completed',
          // Origem
          notes: `Importado via Open Finance (Pluggy) — conta ${acc.name ?? acc.id}`,
        }]);
        txCreated++;
      }
    }

    // ----------------------------------------------------------
    // 2. Investimentos
    // ----------------------------------------------------------
    const investments = await pluggyFetchAll(`/investments?itemId=${pluggyItemId}`, apiKey);
    for (const inv of investments as Array<Record<string, unknown>>) {
      const r = await upsertByKey('investments', 'pluggy_investment_id', inv.id as string, {
        user_id: userId,
        connection_id: connectionId ?? null,
        pluggy_investment_id: inv.id,
        ticker: inv.code,
        name: inv.name,
        investment_type: mapInvestmentType(inv.type as string),
        quantity: inv.quantity,
        average_price: inv.value,
        current_value: inv.balance,
        invested_amount: inv.amount,
        broker: inv.issuer,
        currency: (inv.currencyCode as string) ?? 'BRL',
        updated_at: new Date().toISOString(),
      });
      r === 'created' ? invCreated++ : invUpdated++;
    }

    // ----------------------------------------------------------
    // 3. Atualiza status da conexao
    // ----------------------------------------------------------
    if (connectionId) {
      await supabase.from('pluggy_connections').update({
        status: 'UPDATED',
        last_sync_at: new Date().toISOString(),
      }).eq('id', connectionId);
    }

    // ----------------------------------------------------------
    // 4. Log de sincronizacao
    // ----------------------------------------------------------
    await supabase.from('sync_logs').insert([{
      user_id: userId,
      source: 'pluggy',
      module: 'financial',
      sync_type: 'full',
      status: 'success',
      items_created: txCreated + invCreated,
      items_updated: invUpdated,
      items_processed: txCreated + txSkipped + invCreated + invUpdated,
      duration_seconds: Math.round((Date.now() - started) / 1000),
    }]);

    return new Response(
      JSON.stringify({
        transactions: { created: txCreated, skipped: txSkipped },
        investments: { created: invCreated, updated: invUpdated },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[pluggy-sync] erro:', msg);

    // Registra falha no log
    try {
      const { userId } = await req.clone().json().catch(() => ({ userId: null }));
      if (userId) {
        await supabase.from('sync_logs').insert([{
          user_id: userId,
          source: 'pluggy',
          module: 'financial',
          sync_type: 'full',
          status: 'error',
          error_message: msg,
          duration_seconds: Math.round((Date.now() - started) / 1000),
        }]);
      }
    } catch { /* ignora erro no log de erro */ }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
