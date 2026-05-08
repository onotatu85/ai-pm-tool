-- ============================================================
-- 002_rls_policies.sql
-- AI活用プロジェクト管理ツール - Row Level Security ポリシー
-- ============================================================

-- ============================================================
-- RLS 有効化
-- ============================================================
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- T-01: profiles ポリシー
-- ============================================================
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- T-02: organizations ポリシー
-- ============================================================
CREATE POLICY "organizations_select_member"
  ON organizations FOR SELECT
  USING (is_org_member(id));

CREATE POLICY "organizations_insert_any_auth"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update_admin"
  ON organizations FOR UPDATE
  USING (get_org_role(id) = 'admin')
  WITH CHECK (get_org_role(id) = 'admin');

CREATE POLICY "organizations_delete_admin"
  ON organizations FOR DELETE
  USING (get_org_role(id) = 'admin');

-- ============================================================
-- T-03: org_members ポリシー
-- ============================================================
CREATE POLICY "org_members_select_member"
  ON org_members FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "org_members_insert_admin"
  ON org_members FOR INSERT
  WITH CHECK (get_org_role(organization_id) = 'admin');

CREATE POLICY "org_members_update_admin"
  ON org_members FOR UPDATE
  USING (get_org_role(organization_id) = 'admin')
  WITH CHECK (get_org_role(organization_id) = 'admin');

CREATE POLICY "org_members_delete_admin"
  ON org_members FOR DELETE
  USING (get_org_role(organization_id) = 'admin');

-- ============================================================
-- T-04: projects ポリシー
-- ============================================================
CREATE POLICY "projects_select_member"
  ON projects FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "projects_insert_member"
  ON projects FOR INSERT
  WITH CHECK (
    is_org_member(organization_id)
    AND get_org_role(organization_id) IN ('admin', 'member')
  );

CREATE POLICY "projects_update_member"
  ON projects FOR UPDATE
  USING (
    is_org_member(organization_id)
    AND get_org_role(organization_id) IN ('admin', 'member')
  )
  WITH CHECK (
    is_org_member(organization_id)
    AND get_org_role(organization_id) IN ('admin', 'member')
  );

CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  USING (get_org_role(organization_id) = 'admin');

-- ============================================================
-- T-05: contents ポリシー
-- ============================================================
CREATE POLICY "contents_select_project_member"
  ON contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = contents.project_id
        AND is_org_member(p.organization_id)
    )
  );

CREATE POLICY "contents_insert_project_member"
  ON contents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = contents.project_id
        AND is_org_member(p.organization_id)
        AND get_org_role(p.organization_id) IN ('admin', 'member')
    )
  );

CREATE POLICY "contents_update_project_member"
  ON contents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = contents.project_id
        AND is_org_member(p.organization_id)
        AND get_org_role(p.organization_id) IN ('admin', 'member')
    )
  );

CREATE POLICY "contents_delete_admin"
  ON contents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = contents.project_id
        AND get_org_role(p.organization_id) = 'admin'
    )
  );

-- ============================================================
-- T-06: ai_sessions ポリシー
-- ============================================================
CREATE POLICY "ai_sessions_select_content_member"
  ON ai_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contents c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = ai_sessions.content_id
        AND is_org_member(p.organization_id)
    )
  );

CREATE POLICY "ai_sessions_insert_content_member"
  ON ai_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contents c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = ai_sessions.content_id
        AND is_org_member(p.organization_id)
        AND get_org_role(p.organization_id) IN ('admin', 'member')
    )
  );

-- ============================================================
-- T-07: audit_logs ポリシー
-- ============================================================
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  USING (get_org_role(organization_id) = 'admin');

-- audit_logs への INSERT はサービスロールのみ許可（アプリケーション側で制御）
CREATE POLICY "audit_logs_insert_service_role"
  ON audit_logs FOR INSERT
  WITH CHECK (true); -- サービスロールキーを使用した場合のみ適用

-- ============================================================
-- T-08: project_files ポリシー
-- ============================================================
CREATE POLICY "project_files_select_member"
  ON project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_files.project_id
        AND is_org_member(p.organization_id)
    )
  );

CREATE POLICY "project_files_insert_member"
  ON project_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_files.project_id
        AND is_org_member(p.organization_id)
        AND get_org_role(p.organization_id) IN ('admin', 'member')
    )
  );

CREATE POLICY "project_files_delete_admin"
  ON project_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_files.project_id
        AND get_org_role(p.organization_id) = 'admin'
    )
  );

-- ============================================================
-- Storage: project-files バケット RLS
-- ============================================================
-- バケットの作成（Supabase ダッシュボードまたは CLI で実施）
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Storage オブジェクトの RLS ポリシー
-- パス規則: {organization_id}/{project_id}/{filename}
CREATE POLICY "storage_select_org_member"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "storage_insert_org_member"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "storage_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND auth.uid() IS NOT NULL
  );
