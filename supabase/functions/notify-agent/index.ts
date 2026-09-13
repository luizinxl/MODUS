import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar tarefas não concluídas e não canceladas
    const { data: tasks, error: tasksError } = await supabase
      .from('academic_tasks')
      .select('id, user_id, title, due_date, status, alerted_48h, days_remaining')
      .not('status', 'in', '("completed","cancelled")');

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: "No tasks to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Agrupar por usuário
    const userTasks = tasks.reduce((acc, task) => {
      if (!acc[task.user_id]) acc[task.user_id] = [];
      acc[task.user_id].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    for (const [userId, uTasks] of Object.entries(userTasks)) {
      const overdue = uTasks.filter(t => t.days_remaining != null && t.days_remaining < 0);
      const dueToday = uTasks.filter(t => t.days_remaining === 0);
      const due48hUnalerted = uTasks.filter(t => t.days_remaining === 1 || t.days_remaining === 2).filter(t => !t.alerted_48h);

      let pushBody = [];
      const inAppInserts = [];

      // 48h Alerts
      if (due48hUnalerted.length > 0) {
        pushBody.push(`${due48hUnalerted.length} tarefa(s) vencendo em até 48h.`);
        
        for (const t of due48hUnalerted) {
          inAppInserts.push({
            user_id: userId,
            type: 'deadline_48h',
            urgency: 'normal',
            title: 'Prazo se aproximando',
            body: `A tarefa "${t.title}" vence em menos de 48h.`,
            reference_id: t.id
          });
        }
        
        // Atualizar alerted_48h
        await supabase
          .from('academic_tasks')
          .update({ alerted_48h: true })
          .in('id', due48hUnalerted.map(t => t.id));
      }

      // Se houver overdue ou dueToday que o usuário precisa lembrar? 
      // O prompt não especificou enviar push todo o dia para overdue, mas o painel mostra os badges em tempo real.
      // Podemos mandar um Daily Summary push de manhã se tiver atrasadas ou pra hoje,
      // deduplicado usando notification_history.
      const todayString = new Date().toISOString().split('T')[0];
      const summaryHistoryId = `summary_${userId}_${todayString}`;
      
      const { data: history } = await supabase
        .from('notification_history')
        .select('id')
        .eq('type', 'daily_summary')
        .eq('reference_id', summaryHistoryId)
        .single();

      if (!history && (overdue.length > 0 || dueToday.length > 0)) {
        if (dueToday.length > 0) pushBody.push(`${dueToday.length} para HOJE.`);
        if (overdue.length > 0) pushBody.push(`${overdue.length} ATRASADAS.`);

        await supabase.from('notification_history').insert({
          type: 'daily_summary',
          reference_id: summaryHistoryId
        });
      }

      if (pushBody.length > 0) {
        // Enviar Push (Notification Queue)
        await supabase.from('notification_queue').insert({
          user_id: userId,
          type: 'daily_summary',
          payload: {
            title: "Resumo Acadêmico",
            body: pushBody.join(' ')
          }
        });
      }

      if (inAppInserts.length > 0) {
        await supabase.from('in_app_notifications').insert(inAppInserts);
      }
    }

    // Após processar tudo, chama o webhook do send-notification assíncronamente
    const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
    fetch(sendNotificationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    }).catch(e => console.error("Error triggering send-notification:", e));

    return new Response(JSON.stringify({ message: "Processed successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in notify-agent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
