import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(clientEmail: string, privateKey: string) {
  const alg = 'RS256';
  // Formata a chave privada (substitui \n literal caso venha das env vars de forma errada)
  const pkStr = privateKey.replace(/\\n/g, '\n');
  const pk = await importPKCS8(pkStr, alg);
  
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token'
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(pk);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const firebaseClientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const firebasePrivateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseKey || !firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch pending notifications from queue
    const { data: queue, error: queueError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('sent', false)
      .limit(50); // Processa em lotes de 50

    if (queueError) throw queueError;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fetch all user tokens needed
    const userIds = [...new Set(queue.map(q => q.user_id))];
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    if (tokenError) throw tokenError;

    // Se não há tokens para enviar, marcamos todas como sent pra não travar a fila
    if (!tokens || tokens.length === 0) {
      await supabase
        .from('notification_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .in('id', queue.map(q => q.id));
      
      return new Response(JSON.stringify({ message: "No tokens found, cleared queue" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Get Firebase OAuth Token
    const accessToken = await getAccessToken(firebaseClientEmail, firebasePrivateKey);
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`;

    let successCount = 0;
    let failCount = 0;
    const idsSent: string[] = [];

    // 4. Send messages
    for (const item of queue) {
      const userTokens = tokens.filter(t => t.user_id === item.user_id).map(t => t.token);
      
      let sentToAtLeastOne = false;

      for (const token of userTokens) {
        const payload = item.payload;
        
        const message = {
          message: {
            token: token,
            notification: {
              title: payload.title || "Modus Hub",
              body: payload.body || "Você tem uma nova notificação"
            },
            data: payload.data || {}
          }
        };

        const res = await fetch(fcmEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });

        if (res.ok) {
          sentToAtLeastOne = true;
        } else {
          const errData = await res.json();
          console.error("FCM Send Error:", errData);
        }
      }

      // Se falhou todos, a gente pode deixar pra retentar ou marcar como enviada dependendo da regra.
      // Vamos marcar como enviada para não travar a fila, pois token inválido gera erro 4xx constante.
      idsSent.push(item.id);
      if (sentToAtLeastOne) successCount++;
      else failCount++;
    }

    // 5. Marcar como sent
    if (idsSent.length > 0) {
      await supabase
        .from('notification_queue')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .in('id', idsSent);
    }

    return new Response(
      JSON.stringify({ message: "Processed", success: successCount, failed: failCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
