-- ============================================================
-- 003_auto_create_org.sql
-- サインアップ時に Organization + org_members を自動作成
-- ============================================================

-- トリガー関数を更新
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_display_name TEXT;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email);

  -- profiles を作成
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_display_name);

  -- 個人ワークスペース (organization) を自動作成
  INSERT INTO public.organizations (name, plan)
  VALUES (v_display_name || ' workspace', 'free')
  RETURNING id INTO v_org_id;

  -- org_members に admin として登録
  INSERT INTO public.org_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 既存ユーザーに遡及適用（org_members 未登録のユーザーにOrg作成）
DO $$
DECLARE
  v_user RECORD;
  v_org_id UUID;
BEGIN
  FOR v_user IN
    SELECT u.id, u.email, p.display_name
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_members om WHERE om.user_id = u.id
    )
  LOOP
    INSERT INTO public.organizations (name, plan)
    VALUES (v_user.display_name || ' workspace', 'free')
    RETURNING id INTO v_org_id;

    INSERT INTO public.org_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user.id, 'admin');

    RAISE NOTICE 'Created org for: %', v_user.email;
  END LOOP;
END;
$$;
