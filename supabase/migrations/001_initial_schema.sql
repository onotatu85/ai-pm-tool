-- ============================================================
-- 001_initial_schema.sql
-- AI活用プロジェクト管理ツール - 初期スキーマ
-- ============================================================

-- ヘルパー関数: updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ヘルパー関数: 組織メンバーシップ確認
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE org_members.organization_id = org_id
      AND org_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ヘルパー関数: 組織ロール取得
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM org_members
  WHERE org_members.organization_id = org_id
    AND org_members.user_id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- T-01: profiles（ユーザープロフィール）
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        NOT NULL DEFAULT auth.uid() PRIMARY KEY,
  display_name TEXT       NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth.users 新規登録時に profiles レコードを自動作成
-- SET search_path = public, auth が必要（PostgreSQL 17 の SECURITY DEFINER セキュリティ強化対応）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- T-02: organizations（組織）
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  plan        TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- ============================================================
-- T-03: org_members（組織メンバー）
-- ============================================================
CREATE TABLE IF NOT EXISTS org_members (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);

-- ============================================================
-- T-04: projects（プロジェクト）
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_org_id    ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated   ON projects(updated_at DESC);

-- ============================================================
-- T-05: contents（コンテンツ）
-- ============================================================
CREATE TABLE IF NOT EXISTS contents (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  assignee_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contents_project_id  ON contents(project_id);
CREATE INDEX IF NOT EXISTS idx_contents_status       ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_assignee_id  ON contents(assignee_id);
CREATE INDEX IF NOT EXISTS idx_contents_updated      ON contents(updated_at DESC);

-- ============================================================
-- T-06: ai_sessions（AI セッション）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_sessions (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id   UUID        NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  prompt_type  TEXT        NOT NULL CHECK (prompt_type IN ('improve', 'summarize', 'seo', 'style')),
  prompt_text  TEXT        NOT NULL,
  response     TEXT,
  model        TEXT        NOT NULL DEFAULT 'claude-haiku-4-5',
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ai_sessions_updated_at
  BEFORE UPDATE ON ai_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_sessions_content_id ON ai_sessions(content_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created_at ON ai_sessions(created_at DESC);

-- ============================================================
-- T-07: audit_logs（監査ログ）
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action          TEXT        NOT NULL,
  resource_type   TEXT        NOT NULL,
  resource_id     UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id     ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- T-08: project_files（プロジェクトファイル）
-- ============================================================
CREATE TABLE IF NOT EXISTS project_files (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  storage_path    TEXT        NOT NULL,
  mime_type       TEXT        NOT NULL,
  size_bytes      BIGINT      NOT NULL,
  extracted_text  TEXT,
  uploaded_by     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON project_files(created_at DESC);
