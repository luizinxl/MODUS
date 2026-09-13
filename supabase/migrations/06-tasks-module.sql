-- Migração 06-tasks-module.sql
-- Tabela dedicada do módulo Tarefas (to-do geral). Não confundir com
-- household_tasks (módulo Doméstico/Casa).

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  priority text CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  category text,
  is_completed boolean DEFAULT false,
  notify boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, is_completed);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
