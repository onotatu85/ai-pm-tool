-- ============================================================
-- Migration 007: ai_sessions RAG 対応カラム追加
-- ============================================================

-- prompt_type の CHECK 制約に 'tone' を追加（既存の 'style' も残す）
ALTER TABLE ai_sessions
  DROP CONSTRAINT IF EXISTS ai_sessions_prompt_type_check;

ALTER TABLE ai_sessions
  ADD CONSTRAINT ai_sessions_prompt_type_check
  CHECK (prompt_type IN ('improve', 'summarize', 'seo', 'tone', 'style'));

-- RAG 関連カラム
ALTER TABLE ai_sessions
  ADD COLUMN IF NOT EXISTS use_project_files BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE ai_sessions
  ADD COLUMN IF NOT EXISTS files_used TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE ai_sessions
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER;
