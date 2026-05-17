-- ============================================================
-- 005_fix_user_fk_to_profiles.sql
-- org_members.user_id と audit_logs.user_id の参照先を
-- auth.users → profiles に変更し PostgREST の JOIN を可能にする
-- ============================================================

-- org_members.user_id FK を profiles に変更
ALTER TABLE public.org_members
  DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;

ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- audit_logs.user_id FK を profiles に変更
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
