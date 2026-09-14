// Edge Function: pluggy-connect-token
// Gera um connect_token para abrir o widget do Pluggy no frontend.
// O CLIENT_SECRET nunca sai do backend.
//
// Deploy: supabase functions deploy pluggy-connect-token
// Chamada: POST { itemId? } com header Authorization: Bearer <jwt> -> { connectToken }

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getPluggyApiKey, pluggyFetch } from '../_shared/pluggy.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Autenticacao: exige usuario Supabase valido antes de emitir o connect token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token JWT invalido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // itemId e opcional: passado ao reconectar um Item existente
    let itemId: string | undefined;
    try {
      const body = await req.json();
      itemId = body?.itemId;
    } catch {
      // sem body e ok (primeira conexao)
    }

    const apiKey = await getPluggyApiKey();

    const payload = itemId ? { itemId } : {};
    const data = await pluggyFetch('/connect_token', apiKey, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return new Response(
      JSON.stringify({ connectToken: data.accessToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[pluggy-connect-token] erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
