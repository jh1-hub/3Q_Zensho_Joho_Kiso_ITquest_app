import { createClient } from '@supabase/supabase-js';
import type { UserProfile, GameSaveRow, SaveData, StudentOverview } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oeutpjgtfztqfcocqtcf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldXRwamd0Znp0cWZjb2NxdGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTU1OTgsImV4cCI6MjEwNDI3MTU5OH0.FyxN2db_TvPd54PbklXxd6NX2LSBotcw99c2Vy_MAVs';

// 管理者メールアドレスのリスト（環境変数 VITE_ADMIN_EMAILS から取得）
const ADMIN_EMAILS: string[] = (
  import.meta.env.VITE_ADMIN_EMAILS
    ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((e: string) => e.trim().toLowerCase())
    : []
);

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

    if (!data && !meta && !user) {
      return null;
    }

    const email = (data?.email || user?.email || '').toLowerCase();
    const year = data?.student_year ?? meta?.student_year ?? '';
    const cls = data?.student_class ?? meta?.student_class ?? '';
    const no = data?.student_no ?? meta?.student_no ?? '';
    const name = data?.student_name ?? meta?.student_name ?? '';

    // display_name の組み立て（年組番氏名、または指定された表示名）
    let formattedDisplayName = data?.display_name || meta?.display_name || '';
    if (!formattedDisplayName && name) {
      formattedDisplayName = year && cls && no ? `${year}年${cls}組${no}番 ${name}` : name;
    }

    // 管理者判定:
    // 1. profiles テーブルで role === 'admin'
    // 2. ユーザーメタデータで role === 'admin'
    // 3. ADMIN_EMAILS に登録されているメールアドレス
    // 4. ローカル管理者フラグが立っている場合
    const isExplicitAdmin = data?.role === 'admin' || meta?.role === 'admin';
    const isEmailAdmin = email ? ADMIN_EMAILS.includes(email) : false;
    const isLocalAdmin = localStorage.getItem(`admin_mode_${userId}`) === 'true';

    const role = (isExplicitAdmin || isEmailAdmin || isLocalAdmin) ? 'admin' : 'student';

    const profile: UserProfile = {
      id: userId,
      email: email || null,
      display_name: formattedDisplayName,
      role,
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
  ユーザーを管理者（先生）に昇格させる
 */
export async function promoteToAdmin(userId: string): Promise<boolean> {
  try {
    localStorage.setItem(`admin_mode_${userId}`, 'true');

    // 1. auth の user_metadata を更新
    await supabase.auth.updateUser({
      data: { role: 'admin' }
    });

    // 2. profiles テーブルの更新を試みる
    await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    return true;
  } catch (err) {
    console.error('Failed to promote to admin:', err);
    return false;
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
  2つのセーブデータを進捗を失わないようインテリジェントにマージする
 */
export function mergeSaveData(a: SaveData | null, b: SaveData | null, ownerId?: string | null): SaveData | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  const collected = Array.from(new Set([...(a.collectedCards || []), ...(b.collectedCards || [])]));
  const wrong = Array.from(new Set([...(a.wrongTerms || []), ...(b.wrongTerms || [])]));

  let bestTime: number | null = null;
  if (a.bestTimeSeconds !== null && b.bestTimeSeconds !== null) {
    bestTime = Math.min(a.bestTimeSeconds, b.bestTimeSeconds);
  } else {
    bestTime = a.bestTimeSeconds ?? b.bestTimeSeconds ?? null;
  }

  const mergedStats = {
    attempts: Math.max(a.stats?.attempts || 0, b.stats?.attempts || 0),
    wins: Math.max(a.stats?.wins || 0, b.stats?.wins || 0),
    termStats: {
      ...(a.stats?.termStats || {}),
      ...(b.stats?.termStats || {}),
    },
    timeAttackHighScore: Math.max(a.stats?.timeAttackHighScore || 0, b.stats?.timeAttackHighScore || 0) || undefined,
    timeAttackMaxCombo: Math.max(a.stats?.timeAttackMaxCombo || 0, b.stats?.timeAttackMaxCombo || 0) || undefined,
  };

  return {
    ownerUserId: ownerId ?? a.ownerUserId ?? b.ownerUserId ?? null,
    level: Math.max(a.level || 1, b.level || 1),
    xp: Math.max(a.xp || 0, b.xp || 0),
    collectedCards: collected,
    bestTimeSeconds: bestTime,
    wrongTerms: wrong,
    stats: mergedStats,
    updated_at: new Date().toISOString(),
  };
}

/**
  ユーザーのセーブデータを取得する (game_savesテーブル + 認証user_metadataのデュアル復元)
 */
export async function getGameSave(userId: string): Promise<GameSaveRow | null> {
  let tableSave: GameSaveRow | null = null;
  let metaSave: SaveData | null = null;

  // 1. Supabaseの game_saves テーブルから取得試行
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      tableSave = data as GameSaveRow;
    } else if (error) {
      console.warn('game_saves table query warning (falling back to user_metadata):', error);
    }
  } catch (err) {
    console.warn('Failed to get game save from table:', err);
  }

  // 2. Supabase Auth の user_metadata から取得試行 (RLSエラー時や別ブラウザでの最速復元)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId && user.user_metadata?.game_save) {
      metaSave = user.user_metadata.game_save as SaveData;
    }
  } catch (err) {
    console.warn('Failed to get game save from user_metadata:', err);
  }

  // 3. 両方からデータが取得できた場合は、双方のカード・進捗を合算して最善のデータを返す
  if (tableSave && metaSave) {
    const tableAsSaveData: SaveData = {
      level: tableSave.level,
      xp: tableSave.xp,
      collectedCards: tableSave.collected_cards || [],
      bestTimeSeconds: tableSave.best_time_seconds,
      wrongTerms: tableSave.wrong_terms || [],
      stats: tableSave.stats,
      updated_at: tableSave.updated_at,
    };
    const merged = mergeSaveData(tableAsSaveData, metaSave, userId);
    if (merged) {
      return {
        user_id: userId,
        level: merged.level,
        xp: merged.xp,
        collected_cards: merged.collectedCards,
        best_time_seconds: merged.bestTimeSeconds,
        wrong_terms: merged.wrongTerms,
        stats: merged.stats || { attempts: 0, wins: 0, termStats: {} },
        updated_at: merged.updated_at || new Date().toISOString(),
      };
    }
  }

  if (tableSave) return tableSave;

  if (metaSave) {
    return {
      user_id: userId,
      level: metaSave.level || 1,
      xp: metaSave.xp || 0,
      collected_cards: metaSave.collectedCards || [],
      best_time_seconds: metaSave.bestTimeSeconds ?? null,
      wrong_terms: metaSave.wrongTerms || [],
      stats: metaSave.stats || { attempts: 0, wins: 0, termStats: {} },
      updated_at: metaSave.updated_at || new Date().toISOString(),
    };
  }

  return null;
}

/**
  ユーザーのセーブデータを保存・更新する (Upsert & user_metadata デュアル永続化)
 */
export async function upsertGameSave(userId: string, saveData: SaveData): Promise<boolean> {
  const nowIso = new Date().toISOString();
  let metaSuccess = false;
  let tableSuccess = false;

  // 1. Supabase Auth の user_metadata に直接保存
  // ※ RLSポリシーやPostgresテーブル再帰エラーの影響を一切受けず、
  //    別のブラウザや端末でログインした際にも確実に即時引き継がれます
  try {
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        game_save: {
          level: saveData.level,
          xp: saveData.xp,
          collectedCards: saveData.collectedCards || [],
          bestTimeSeconds: saveData.bestTimeSeconds,
          wrongTerms: saveData.wrongTerms || [],
          stats: saveData.stats || { attempts: 0, wins: 0, termStats: {} },
          ownerUserId: userId,
          updated_at: nowIso,
        }
      }
    });

    if (!metaError) {
      metaSuccess = true;
    } else {
      console.warn('user_metadata game_save update warning:', metaError);
    }
  } catch (err) {
    console.warn('Exception updating user_metadata game_save:', err);
  }

  // 2. game_saves テーブルへの保存 (管理者・先生の一覧画面用)
  try {
    const row: Partial<GameSaveRow> = {
      user_id: userId,
      level: saveData.level,
      xp: saveData.xp,
      collected_cards: saveData.collectedCards || [],
      best_time_seconds: saveData.bestTimeSeconds,
      wrong_terms: saveData.wrongTerms || [],
      stats: saveData.stats || { attempts: 0, wins: 0, termStats: {} },
      updated_at: nowIso,
    };

    const { error } = await supabase
      .from('game_saves')
      .upsert(row, { onConflict: 'user_id' });

    if (!error) {
      tableSuccess = true;
    } else {
      console.warn('game_saves table upsert warning (user_metadata fallback saved successfully):', error);
    }
  } catch (err) {
    console.warn('Exception upserting to game_saves table:', err);
  }

  return metaSuccess || tableSuccess;
}

/**
  管理者（先生）向け：全生徒のプロフィールと成績一覧を取得
 */
export async function fetchAllStudentsOverview(): Promise<StudentOverview[]> {
  try {
    // 1. 全プロフィールの取得
    let profiles: any[] = [];
    const { data: pData, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) {
      console.warn('Warning fetching student profiles (possibly RLS restriction):', pError);
    } else if (pData) {
      profiles = pData;
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

    // もし profiles が取得できた場合は profiles をベースに結合
    if (profiles.length > 0) {
      const overviews: StudentOverview[] = profiles.map((p: any) => ({
        profile: p as UserProfile,
        saveData: saveMap.get(p.id) || null,
      }));
      return overviews;
    }

    // もし profiles が RLS 等で取得できなかったが saves がある場合、saves から一覧を生成
    if (saves && saves.length > 0) {
      const overviews: StudentOverview[] = saves.map((s: any) => ({
        profile: {
          id: s.user_id,
          email: null,
          display_name: `生徒 (${s.user_id.slice(0, 6)})`,
          role: 'student',
          student_year: null,
          student_class: null,
          student_no: null,
          student_name: null,
          created_at: s.updated_at,
        },
        saveData: s as GameSaveRow,
      }));
      return overviews;
    }

    return [];
  } catch (err) {
    console.error('Failed to fetch all students overview:', err);
    return [];
  }
}
