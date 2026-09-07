import { createClient } from '@supabase/supabase-js';
import type { UserProfile, GameSaveRow, SaveData, StudentOverview } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oeutpjgtfztqfcocqtcf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldXRwamd0Znp0cWZjb2NxdGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTU1OTgsImV4cCI6MjEwNDI3MTU5OH0.FyxN2db_TvPd54PbklXxd6NX2LSBotcw99c2Vy_MAVs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
  ユーザーのプロフィール（role, display_name, student_year, student_class, student_no, student_name）を取得する
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
    }

    // 認証セッションの user_metadata も取得してフォールバック統合
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.id === userId ? user?.user_metadata : null;

    if (!data && !meta) {
      return null;
    }

    const year = data?.student_year ?? meta?.student_year ?? '';
    const cls = data?.student_class ?? meta?.student_class ?? '';
    const no = data?.student_no ?? meta?.student_no ?? '';
    const name = data?.student_name ?? meta?.student_name ?? '';

    // display_name の組み立て（年組番氏名、または指定された表示名）
    let formattedDisplayName = data?.display_name || meta?.display_name || '';
    if (!formattedDisplayName && name) {
      formattedDisplayName = year && cls && no ? `${year}年${cls}組${no}番 ${name}` : name;
    }

    const profile: UserProfile = {
      id: userId,
      email: data?.email || user?.email || null,
      display_name: formattedDisplayName,
      role: (data?.role as any) || (meta?.role as any) || 'student',
      student_year: year || null,
      student_class: cls || null,
      student_no: no || null,
      student_name: name || null,
      created_at: data?.created_at,
    };

    return profile;
  } catch (err) {
    console.error('Failed to get user profile:', err);
    return null;
  }
}

/**
  ユーザーのプロフィール（年組番氏名など）を更新する
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    student_year?: string;
    student_class?: string;
    student_no?: string;
    student_name?: string;
    display_name?: string;
  }
): Promise<boolean> {
  try {
    const year = updates.student_year ?? '';
    const cls = updates.student_class ?? '';
    const no = updates.student_no ?? '';
    const name = updates.student_name ?? '';
    const dispName = updates.display_name || (year && cls && no && name ? `${year}年${cls}組${no}番 ${name}` : name);

    // 1. Supabase auth user_metadata の更新
    await supabase.auth.updateUser({
      data: {
        student_year: year,
        student_class: cls,
        student_no: no,
        student_name: name,
        display_name: dispName,
      }
    });

    // 2. profiles テーブルの更新（カラムが存在する場合に備えて安全に更新）
    const profilePayload: any = {
      display_name: dispName,
    };
    if (year !== undefined) profilePayload.student_year = year;
    if (cls !== undefined) profilePayload.student_class = cls;
    if (no !== undefined) profilePayload.student_no = no;
    if (name !== undefined) profilePayload.student_name = name;

    const { error } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', userId);

    if (error) {
      console.warn('profiles table update warning (may lack custom columns, user_metadata saved):', error);
      // profilesのカラム定義にstudent_year等がない場合はdisplay_nameだけ更新を試行
      await supabase
        .from('profiles')
        .update({ display_name: dispName })
        .eq('id', userId);
    }

    return true;
  } catch (err) {
    console.error('Failed to update user profile:', err);
    return false;
  }
}

/**
  ユーザーのセーブデータを取得する
 */
export async function getGameSave(userId: string): Promise<GameSaveRow | null> {
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching game save:', error);
      return null;
    }
    return data as GameSaveRow | null;
  } catch (err) {
    console.error('Failed to get game save:', err);
    return null;
  }
}

/**
  ユーザーのセーブデータを保存・更新する (Upsert)
 */
export async function upsertGameSave(userId: string, saveData: SaveData): Promise<boolean> {
  try {
    const row: Partial<GameSaveRow> = {
      user_id: userId,
      level: saveData.level,
      xp: saveData.xp,
      collected_cards: saveData.collectedCards || [],
      best_time_seconds: saveData.bestTimeSeconds,
      wrong_terms: saveData.wrongTerms || [],
      stats: saveData.stats || { attempts: 0, wins: 0, termStats: {} },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('game_saves')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.error('Error upserting game save:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to upsert game save:', err);
    return false;
  }
}

/**
  管理者（先生）向け：全生徒のプロフィールと成績一覧を取得
 */
export async function fetchAllStudentsOverview(): Promise<StudentOverview[]> {
  try {
    // 1. 全プロフィールの取得
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError || !profiles) {
      console.error('Error fetching student profiles:', pError);
      return [];
    }

    // 2. 全セーブデータの取得
    const { data: saves, error: sError } = await supabase
      .from('game_saves')
      .select('*');

    if (sError) {
      console.error('Error fetching game saves:', sError);
    }

    const saveMap = new Map<string, GameSaveRow>();
    if (saves) {
      saves.forEach((s: any) => {
        saveMap.set(s.user_id, s as GameSaveRow);
      });
    }

    // 結合
    const overviews: StudentOverview[] = profiles.map((p: any) => ({
      profile: p as UserProfile,
      saveData: saveMap.get(p.id) || null,
    }));

    return overviews;
  } catch (err) {
    console.error('Failed to fetch all students overview:', err);
    return [];
  }
}
