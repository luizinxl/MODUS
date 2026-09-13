-- ============================================================
-- Migration 05: Corrige schema de transactions para suportar
-- Pluggy (Open Finance) corretamente.
-- Adiciona pluggy_id, source, description_original/normalized,
-- category_confidence, import_hash, reviewed.
-- ============================================================

-- 1. Novos campos na tabela transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS pluggy_id VARCHAR(255),          -- ID da transação no Pluggy (dedupe)
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual', -- 'pluggy' | 'gmail' | 'manual'
  ADD COLUMN IF NOT EXISTS import_hash VARCHAR(64),          -- SHA-256 de date+amount+desc_norm (dedupe não-Pluggy)
  ADD COLUMN IF NOT EXISTS description_original TEXT,        -- descrição exatamente como veio da fonte
  ADD COLUMN IF NOT EXISTS description_normalized TEXT,      -- após limpeza/normalização
  ADD COLUMN IF NOT EXISTS category_auto VARCHAR(100),       -- categoria automática (para auditoria)
  ADD COLUMN IF NOT EXISTS category_confidence FLOAT,        -- confiança da categorização (0-1)
  ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE;   -- usuário revisou categoria?

-- 2. Constraints de unicidade (dedupe correto)
ALTER TABLE transactions
  ADD CONSTRAINT uq_transactions_pluggy_id UNIQUE (pluggy_id),
  ADD CONSTRAINT uq_transactions_import_hash UNIQUE (import_hash);

-- 3. Preencher description_original com description existente (retroativo)
UPDATE transactions
SET description_original = description,
    description_normalized = lower(regexp_replace(description, '[^a-záàãâéêíóôõúüç0-9 ]', '', 'g'))
WHERE description_original IS NULL;

-- 4. Marcar transações existentes importadas via gmail_message_id
UPDATE transactions
SET source = 'gmail'
WHERE gmail_message_id IS NOT NULL
  AND gmail_message_id NOT LIKE 'pluggy_%'
  AND source = 'manual';

-- 5. Migrar registros com gmail_message_id = 'pluggy_...' para source = 'pluggy' + pluggy_id
UPDATE transactions
SET source = 'pluggy',
    pluggy_id = SUBSTRING(gmail_message_id FROM 8)   -- remove prefixo 'pluggy_'
WHERE gmail_message_id LIKE 'pluggy_%'
  AND pluggy_id IS NULL;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_pluggy_id  ON transactions(pluggy_id)   WHERE pluggy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_source     ON transactions(user_id, source);
CREATE INDEX IF NOT EXISTS idx_transactions_import_hash ON transactions(import_hash) WHERE import_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_reviewed   ON transactions(user_id, reviewed) WHERE reviewed = FALSE;
