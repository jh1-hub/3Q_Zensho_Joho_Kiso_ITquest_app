-- ==============================================================================
-- IT Rogue: セキュリティ強化・生徒データ保護スクリプト (任意・推奨)
-- ==============================================================================
-- 【目的】
-- 1. 生徒がブラウザのコンソール等から他人の氏名・成績・メールを閲覧できないように制限
-- 2. 生徒自身が勝手に「role = 'admin'」に書き換えて先生権限を取得するのを完全に防ぐ
-- 3. 全生徒取得関数 (get_all_students_data) に先生権限チェックを付与
-- ==============================================================================

-- 1. profiles の更新時に role の不正書き換えを防止するトリガー
CREATE OR REPLACE FUNCTION public.protect_user_role()
RETURNS trigger AS $$
BEGIN
  -- ロールを変更しようとした場合
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 呼び出し元が既に admin でない場合はロール変更を無効化（元のロールを維持）
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'admin')
    ) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_user_role ON public.profiles;
CREATE TRIGGER tr_protect_user_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_user_role();

-- 2. get_all_students_data() を先生（admin）のみが実行できるように厳格化
CREATE OR REPLACE FUNCTION public.get_all_students_data()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  student_year TEXT,
  student_class TEXT,
  student_no TEXT,
  student_name TEXT,
  created_at TIMESTAMPTZ,
  level INT,
  xp INT,
  collected_cards TEXT[],
  best_time_seconds INT,
  wrong_terms TEXT[],
  stats JSONB,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION '認証セッションが必要です。';
  END IF;

  -- 先生（admin）であるかチェック
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_caller_id AND (raw_user_meta_data->>'role' = 'admin')
  ) THEN
    RAISE EXCEPTION 'このデータにアクセスする権限がありません（管理者のみ閲覧可能）。';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.role,
    p.student_year,
    p.student_class,
    p.student_no,
    p.student_name,
    p.created_at,
    COALESCE(g.level, 1) as level,
    COALESCE(g.xp, 0) as xp,
    COALESCE(g.collected_cards, '{}'::TEXT[]) as collected_cards,
    g.best_time_seconds,
    COALESCE(g.wrong_terms, '{}'::TEXT[]) as wrong_terms,
    COALESCE(g.stats, '{"attempts":0,"wins":0,"termStats":{}}'::jsonb) as stats,
    g.updated_at
  FROM public.profiles p
  LEFT JOIN public.game_saves g ON p.id = g.user_id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- anon（未ログイン）からの実行権限を剥奪し、ログイン済みのみに限定
REVOKE EXECUTE ON FUNCTION public.get_all_students_data() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_students_data() TO authenticated;
