-- ==============================================================================
-- IT Rogue: Supabase データベース完全セットアップ & 修復スクリプト
-- ==============================================================================
-- 【実行方法】
-- 1. Supabaseのダッシュボード (https://supabase.com/dashboard) にログイン
-- 2. 左サイドバーの「SQL Editor」をクリック
-- 3. 「+ New query」を押して、このスクリプトの内容をすべて貼り付け
-- 4. 画面右下の緑色の「▶ Run」をクリック
--
-- ※ 何度実行しても安全な「CREATE OR REPLACE / IF NOT EXISTS」形式です。
-- ==============================================================================

-- 1. profiles テーブル（生徒・先生のプロフィール管理）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'student',
  student_year TEXT,
  student_class TEXT,
  student_no TEXT,
  student_name TEXT,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 既存テーブルがある場合の不足カラム自動追加
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_class TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. game_saves テーブル（生徒の永続学習統計・カード・クリア記録）
CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  collected_cards TEXT[] DEFAULT '{}',
  best_time_seconds INT,
  wrong_terms TEXT[] DEFAULT '{}',
  stats JSONB DEFAULT '{"attempts":0,"wins":0,"termStats":{}}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 既存テーブルがある場合の不足カラム自動追加
ALTER TABLE public.game_saves ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"attempts":0,"wins":0,"termStats":{}}'::jsonb;
ALTER TABLE public.game_saves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. 自動連携トリガー：auth.users にアカウント作成された瞬間、自動で public.profiles と game_saves に登録
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, student_year, student_class, student_no, student_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'student_year',
    new.raw_user_meta_data->>'student_class',
    new.raw_user_meta_data->>'student_no',
    new.raw_user_meta_data->>'student_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    student_year = COALESCE(EXCLUDED.student_year, profiles.student_year),
    student_class = COALESCE(EXCLUDED.student_class, profiles.student_class),
    student_no = COALESCE(EXCLUDED.student_no, profiles.student_no),
    student_name = COALESCE(EXCLUDED.student_name, profiles.student_name);

  INSERT INTO public.game_saves (user_id, collected_cards, stats)
  VALUES (new.id, '{}', '{"attempts":0,"wins":0,"termStats":{}}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. 既存の「無限再帰エラー (42P17)」を引き起こす古いRLSポリシーを全自動で完全消去
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;

  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'game_saves' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.game_saves', pol.policyname);
  END LOOP;
END $$;

-- 5. RLSの有効化とクリーンなポリシーの再設定（再帰参照を一切含まない安全な設定）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_profiles" ON public.profiles FOR SELECT TO authenticated, anon USING ( true );
CREATE POLICY "allow_insert_profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ( auth.uid() = id );
CREATE POLICY "allow_update_profiles" ON public.profiles FOR UPDATE TO authenticated USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );

CREATE POLICY "allow_read_game_saves" ON public.game_saves FOR SELECT TO authenticated, anon USING ( true );
CREATE POLICY "allow_insert_game_saves" ON public.game_saves FOR INSERT TO authenticated WITH CHECK ( auth.uid() = user_id );
CREATE POLICY "allow_update_game_saves" ON public.game_saves FOR UPDATE TO authenticated USING ( auth.uid() = user_id ) WITH CHECK ( auth.uid() = user_id );

-- 6. 既存ユーザーの救済一括インポート（過去に登録された全生徒を即座に profiles & game_saves へ反映）
INSERT INTO public.profiles (id, email, display_name, role, student_year, student_class, student_no, student_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', email),
  COALESCE(raw_user_meta_data->>'role', 'student'),
  raw_user_meta_data->>'student_year',
  raw_user_meta_data->>'student_class',
  raw_user_meta_data->>'student_no',
  raw_user_meta_data->>'student_name'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
  student_year = COALESCE(profiles.student_year, EXCLUDED.student_year),
  student_class = COALESCE(profiles.student_class, EXCLUDED.student_class),
  student_no = COALESCE(profiles.student_no, EXCLUDED.student_no),
  student_name = COALESCE(profiles.student_name, EXCLUDED.student_name);

INSERT INTO public.game_saves (user_id, level, xp, collected_cards, stats)
SELECT id, 1, 0, '{}', '{"attempts":0,"wins":0,"termStats":{}}'::jsonb
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 7. ★既存の重複・オーバーロードされた古い関数を安全に一掃★
-- （"function name is not unique" エラー 42725 の完全防止）
DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN (
    SELECT oid::regprocedure::text AS func_sig
    FROM pg_proc
    WHERE proname IN ('save_game_save', 'get_all_students_data', 'admin_reset_user_password')
      AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func.func_sig || ' CASCADE';
  END LOOP;
END $$;

-- 8. セーブデータ保存用の SECURITY DEFINER RPC 関数（引数定義を明確化）
CREATE OR REPLACE FUNCTION public.save_game_save(
  p_level INT,
  p_xp INT,
  p_collected_cards TEXT[],
  p_best_time_seconds INT,
  p_wrong_terms TEXT[],
  p_stats JSONB
)
RETURNS boolean AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.game_saves (
    user_id, level, xp, collected_cards, best_time_seconds, wrong_terms, stats, updated_at
  ) VALUES (
    v_uid, p_level, p_xp, p_collected_cards, p_best_time_seconds, p_wrong_terms, p_stats, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level,
    xp = EXCLUDED.xp,
    collected_cards = EXCLUDED.collected_cards,
    best_time_seconds = EXCLUDED.best_time_seconds,
    wrong_terms = EXCLUDED.wrong_terms,
    stats = EXCLUDED.stats,
    updated_at = now();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.save_game_save(INT, INT, TEXT[], INT, TEXT[], JSONB) TO authenticated;

-- 9. 管理者向け全生徒データ取得用の SECURITY DEFINER RPC 関数
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
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_all_students_data() TO authenticated, anon;

-- 10. ★先生・管理者による生徒パスワード再発行（ワンタイム一時パスワード化）RPC関数★
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_user_id UUID,
  p_temp_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_encrypted_pw TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '認証セッションが必要です。');
  END IF;

  -- 呼び出し元が先生（admin）であることを確認
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = v_caller_id AND (raw_user_meta_data->>'role' = 'admin')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', '管理者（先生）権限が必要です。');
    END IF;
  END IF;

  -- 対象生徒の存在確認
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '指定された生徒アカウントが見つかりません。');
  END IF;

  -- pgcrypto拡張機能によりbcrypt暗号化ハッシュを生成
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  v_encrypted_pw := crypt(p_temp_password, gen_salt('bf'));

  -- auth.users のパスワードと must_change_password メタデータを更新
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_pw,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{must_change_password}',
      'true'::jsonb
    ),
    updated_at = now()
  WHERE id = p_target_user_id;

  -- public.profiles のフラグ更新
  UPDATE public.profiles
  SET must_change_password = true, updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;
