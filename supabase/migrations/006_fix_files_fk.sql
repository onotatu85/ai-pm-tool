-- ============================================================
-- 006_fix_files_fk.sql
-- project_files.uploaded_by の参照先を
-- auth.users → profiles に変更し PostgREST の JOIN を可能にする
-- ============================================================

ALTER TABLE public.project_files
  DROP CONSTRAINT IF EXISTS project_files_uploaded_by_fkey;

ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
