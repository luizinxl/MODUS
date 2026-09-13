-- Migração 05-notifications.sql

-- 1. Token Push FCM
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

-- 2. Fila de Notificações Push
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_sent ON notification_queue(sent) WHERE sent = false;

-- 3. Notificações In-App
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- 'deadline_48h', 'overdue', 'due_today', 'professor_message', 'ava_login_failed', 'daily_summary', 'change'
  urgency text NOT NULL, -- 'critical', 'high', 'normal', 'info'
  title text NOT NULL,
  body text NOT NULL,
  reference_id text,
  read boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_unread ON in_app_notifications(user_id) WHERE read = false;

-- 4. Histórico para deduplicação
CREATE TABLE IF NOT EXISTS notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  reference_id text,
  sent_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_history_type_ref ON notification_history(type, reference_id);

-- 5. Atualizar tabela de tarefas acadêmicas
ALTER TABLE academic_tasks ADD COLUMN IF NOT EXISTS alerted_48h boolean DEFAULT false;

-- Habilitar RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- FCM Tokens: usuário insere o seu e pode ver o seu
CREATE POLICY "Users can manage their own FCM tokens" ON fcm_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- In-App Notifications: usuário pode ler e atualizar (marcar como lida) as suas
CREATE POLICY "Users can read own in-app notifications" ON in_app_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own in-app notifications" ON in_app_notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Queue and History: normalmente manipulados por Edge Functions (via service_role, que ignora RLS),
-- então podemos negar tudo para os usuários autenticados padrão.
CREATE POLICY "Deny all access to queue for public" ON notification_queue FOR ALL USING (false);
CREATE POLICY "Deny all access to history for public" ON notification_history FOR ALL USING (false);

-- Habilitar o Supabase Realtime para a tabela in_app_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'in_app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;
  END IF;
END $$;
