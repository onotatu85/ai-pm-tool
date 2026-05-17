-- ============================================================
-- 004_fix_assignee_fk.sql
-- contents.assignee_id の参照先を auth.users → profiles に変更
-- PostgREST でのリレーション JOIN を可能にする
-- ============================================================

-- 既存の FK を削除（auth.users を参照していた）
ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_assignee_id_fkey;

-- profiles を参照する FK を追加
ALTER TABLE public.contents
  ADD CONSTRAINT contents_assignee_id_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
