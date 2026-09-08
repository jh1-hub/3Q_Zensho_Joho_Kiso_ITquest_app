import { createClient } from '@supabase/supabase-js';
import type { UserProfile, GameSaveRow, SaveData, StudentOverview, GameStats, TermStat, TrainingStats } from '../types';

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

    const { data: { user } } = await supabase.auth.getUser();

    // 2. profiles テーブルへの upsert（行が存在しなければ確実に新規作成）
    const profilePayload: any = {
      id: userId,
      email: user?.email || null,
      display_name: dispName,
      updated_at: new Date().toISOString(),
    };
    if (year !== undefined) profilePayload.student_year = year;
    if (cls !== undefined) profilePayload.student_class = cls;
    if (no !== undefined) profilePayload.student_no = no;
    if (name !== undefined) profilePayload.student_name = name;

    const { error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (error) {
      console.warn('profiles table upsert warning (fallback to basic columns):', error);
      // profilesのカラム定義にstudent_year等がない場合はidとdisplay_nameだけupsertを試行
      await supabase
        .from('profiles')
        .upsert({ id: userId, email: user?.email || null, display_name: dispName }, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.error('Failed to update user profile:', err);
    return false;
  }
}

/**
  ユーザーの初期レコード（profiles および game_saves）がDBに存在することを保証する
 */
export async function ensureUserRecordExists(
  userId: string,
  email?: string | null,
  meta?: any
): Promise<void> {
  try {
    const year = meta?.student_year ?? '';
    const cls = meta?.student_class ?? '';
    const no = meta?.student_no ?? '';
    const name = meta?.student_name ?? '';
    let dispName = meta?.display_name ?? '';
    if (!dispName && name) {
      dispName = year && cls && no ? `${year}年${cls}組${no}番 ${name}` : name;
    }
    const role = meta?.role || 'student';

    // 1. profiles への upsert
    const profilePayload: any = {
      id: userId,
      email: email || null,
      display_name: dispName || null,
      role,
      updated_at: new Date().toISOString(),
    };
    if (year) profilePayload.student_year = year;
    if (cls) profilePayload.student_class = cls;
    if (no) profilePayload.student_no = no;
    if (name) profilePayload.student_name = name;

    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (pErr) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, email: email || null, display_name: dispName || null, role }, { onConflict: 'id' });
    }

    // 2. game_saves への初期レコード保証（既存データが無ければ初期作成）
    const { data: existingSave } = await supabase
      .from('game_saves')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingSave) {
      const initialStats: GameStats = {
        attempts: 0,
        wins: 0,
        termStats: {},
        trainingStats: {
          categoryAttempts: { '1': 0, '2': 0, '3': 0 },
          categoryCorrects: { '1': 0, '2': 0, '3': 0 },
          categoryWins: { '1': 0, '2': 0, '3': 0, 'drill': 0 },
          subcategoryAttempts: {},
          subcategoryCorrects: {},
          subcategoryWins: {},
          drillAttempts: 0,
          drillCorrects: 0,
          drillWins: 0,
        }
      };

      await supabase
        .from('game_saves')
        .upsert({
          user_id: userId,
          level: 1,
          xp: 0,
          collected_cards: [],
          best_time_seconds: null,
          wrong_terms: [],
          stats: initialStats,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }
  } catch (err) {
    console.warn('ensureUserRecordExists warning:', err);
  }
}

/**
  2つのセーブデータを進捗を失わないようインテリジェントにマージする
 */
export function mergeSaveData(a: SaveData | null, b: SaveData | null, ownerId?: string | null): SaveData | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  const aCards = Array.isArray(a.collectedCards) ? a.collectedCards : [];
  const bCards = Array.isArray(b.collectedCards) ? b.collectedCards : [];
  const collected = Array.from(new Set([...aCards, ...bCards]));

  const aWrong = Array.isArray(a.wrongTerms) ? a.wrongTerms : [];
  const bWrong = Array.isArray(b.wrongTerms) ? b.wrongTerms : [];
  const wrong = Array.from(new Set([...aWrong, ...bWrong]));

  let bestTime: number | null = null;
  if (a.bestTimeSeconds !== null && b.bestTimeSeconds !== null) {
    bestTime = Math.min(a.bestTimeSeconds, b.bestTimeSeconds);
  } else {
    bestTime = a.bestTimeSeconds ?? b.bestTimeSeconds ?? null;
  }

  // 挑戦回数 & クリア回数（ていしゅつ画面で重要な総合記録）
  const attempts = Math.max(a.stats?.attempts || 0, b.stats?.attempts || 0);
  const wins = Math.max(a.stats?.wins || 0, b.stats?.wins || 0);

  // 用語別正誤統計（回答数と正解数の深いマージ）
  const mergedTermStats: Record<string, TermStat> = {};
  const allTermIds = new Set([
    ...Object.keys(a.stats?.termStats || {}),
    ...Object.keys(b.stats?.termStats || {})
  ]);
  for (const tid of allTermIds) {
    const statA = a.stats?.termStats?.[tid];
    const statB = b.stats?.termStats?.[tid];
    mergedTermStats[tid] = {
      attemptCount: Math.max(statA?.attemptCount || 0, statB?.attemptCount || 0),
      correctCount: Math.max(statA?.correctCount || 0, statB?.correctCount || 0),
    };
  }

  // シラバス大分類・小分類別マスタリー統計の深いマージ
  const trA = a.stats?.trainingStats;
  const trB = b.stats?.trainingStats;
  const mergedTrainingStats: TrainingStats = {
    categoryAttempts: {
      '1': Math.max(trA?.categoryAttempts?.['1'] || 0, trB?.categoryAttempts?.['1'] || 0),
      '2': Math.max(trA?.categoryAttempts?.['2'] || 0, trB?.categoryAttempts?.['2'] || 0),
      '3': Math.max(trA?.categoryAttempts?.['3'] || 0, trB?.categoryAttempts?.['3'] || 0),
    },
    categoryCorrects: {
      '1': Math.max(trA?.categoryCorrects?.['1'] || 0, trB?.categoryCorrects?.['1'] || 0),
      '2': Math.max(trA?.categoryCorrects?.['2'] || 0, trB?.categoryCorrects?.['2'] || 0),
      '3': Math.max(trA?.categoryCorrects?.['3'] || 0, trB?.categoryCorrects?.['3'] || 0),
    },
    categoryWins: {
      '1': Math.max(trA?.categoryWins?.['1'] || 0, trB?.categoryWins?.['1'] || 0),
      '2': Math.max(trA?.categoryWins?.['2'] || 0, trB?.categoryWins?.['2'] || 0),
      '3': Math.max(trA?.categoryWins?.['3'] || 0, trB?.categoryWins?.['3'] || 0),
      'drill': Math.max(trA?.categoryWins?.['drill'] || 0, trB?.categoryWins?.['drill'] || 0),
    },
    subcategoryAttempts: {},
    subcategoryCorrects: {},
    subcategoryWins: {},
    drillAttempts: Math.max(trA?.drillAttempts || 0, trB?.drillAttempts || 0),
    drillCorrects: Math.max(trA?.drillCorrects || 0, trB?.drillCorrects || 0),
    drillWins: Math.max(trA?.drillWins || 0, trB?.drillWins || 0),
  };

  const allSubIds = new Set([
    ...Object.keys(trA?.subcategoryAttempts || {}),
    ...Object.keys(trB?.subcategoryAttempts || {})
  ]);
  for (const sid of allSubIds) {
    if (mergedTrainingStats.subcategoryAttempts) {
      mergedTrainingStats.subcategoryAttempts[sid] = Math.max(
        trA?.subcategoryAttempts?.[sid] || 0,
        trB?.subcategoryAttempts?.[sid] || 0
      );
    }
    if (mergedTrainingStats.subcategoryCorrects) {
      mergedTrainingStats.subcategoryCorrects[sid] = Math.max(
        trA?.subcategoryCorrects?.[sid] || 0,
        trB?.subcategoryCorrects?.[sid] || 0
      );
    }
  }

  const mergedStats: GameStats = {
    attempts,
    wins,
    termStats: mergedTermStats,
    trainingStats: mergedTrainingStats,
    dailyChallengeAttempts: Math.max(a.stats?.dailyChallengeAttempts || 0, b.stats?.dailyChallengeAttempts || 0) || undefined,
    dailyChallengeWins: Math.max(a.stats?.dailyChallengeWins || 0, b.stats?.dailyChallengeWins || 0) || undefined,
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
      collectedCards: Array.isArray(tableSave.collected_cards) ? tableSave.collected_cards : [],
      bestTimeSeconds: tableSave.best_time_seconds,
      wrongTerms: Array.isArray(tableSave.wrong_terms) ? tableSave.wrong_terms : [],
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

  if (tableSave) {
    return {
      ...tableSave,
      collected_cards: Array.isArray(tableSave.collected_cards) ? tableSave.collected_cards : [],
      wrong_terms: Array.isArray(tableSave.wrong_terms) ? tableSave.wrong_terms : [],
    };
  }

  if (metaSave) {
    return {
      user_id: userId,
      level: metaSave.level || 1,
      xp: metaSave.xp || 0,
      collected_cards: Array.isArray(metaSave.collectedCards) ? metaSave.collectedCards : [],
      best_time_seconds: metaSave.bestTimeSeconds ?? null,
      wrong_terms: Array.isArray(metaSave.wrongTerms) ? metaSave.wrongTerms : [],
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

  const cards = Array.isArray(saveData.collectedCards) ? saveData.collectedCards : [];
  const wrong = Array.isArray(saveData.wrongTerms) ? saveData.wrongTerms : [];
  const stats = saveData.stats || { attempts: 0, wins: 0, termStats: {} };

  // 1. Supabase Auth の user_metadata に直接保存
  try {
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        game_save: {
          level: saveData.level ?? 1,
          xp: saveData.xp ?? 0,
          collectedCards: cards,
          bestTimeSeconds: saveData.bestTimeSeconds ?? null,
          wrongTerms: wrong,
          stats: stats,
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

  // 2. game_saves テーブルへの直接保存 (管理者・先生の一覧画面用)
  try {
    const row: Partial<GameSaveRow> = {
      user_id: userId,
      level: saveData.level ?? 1,
      xp: saveData.xp ?? 0,
      collected_cards: cards,
      best_time_seconds: saveData.bestTimeSeconds ?? null,
      wrong_terms: wrong,
      stats: stats,
      updated_at: nowIso,
    };

    const { error: directError } = await supabase
      .from('game_saves')
      .upsert(row, { onConflict: 'user_id' });

    if (!directError) {
      tableSuccess = true;
    } else {
      console.warn('Direct game_saves upsert warning, attempting RPC fallback:', directError);
      const { data: rpcData, error: rpcError } = await supabase.rpc('save_game_save', {
        p_level: saveData.level ?? 1,
        p_xp: saveData.xp ?? 0,
        p_collected_cards: cards,
        p_best_time_seconds: saveData.bestTimeSeconds ?? null,
        p_wrong_terms: wrong,
        p_stats: stats,
      });
      if (!rpcError && rpcData === true) {
        tableSuccess = true;
      }
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
    // 1. まず SECURITY DEFINER RPC get_all_students_data を試みる（RLS再帰エラー・権限問題を完全回避）
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_students_data');
    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData.map((row: any) => ({
        profile: {
          id: row.id,
          email: row.email,
          display_name: row.display_name,
          role: row.role || 'student',
          student_year: row.student_year,
          student_class: row.student_class,
          student_no: row.student_no,
          student_name: row.student_name,
          created_at: row.created_at,
        },
        saveData: {
          user_id: row.id,
          level: row.level ?? 1,
          xp: row.xp ?? 0,
          collected_cards: Array.isArray(row.collected_cards) ? row.collected_cards : [],
          best_time_seconds: row.best_time_seconds,
          wrong_terms: Array.isArray(row.wrong_terms) ? row.wrong_terms : [],
          stats: row.stats || { attempts: 0, wins: 0, termStats: {} },
          updated_at: row.updated_at,
        }
      }));
    }

    if (rpcError) {
      console.warn('RPC get_all_students_data not available, falling back to direct table select:', rpcError);
    }

    // 2. フォールバック：全プロフィールの直接取得
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

    // profiles が取得できた場合は profiles をベースに結合 + profiles に未登録の saves も合算
    const profileIds = new Set(profiles.map((p: any) => p.id));
    const overviews: StudentOverview[] = profiles.map((p: any) => ({
      profile: p as UserProfile,
      saveData: saveMap.get(p.id) || null,
    }));

    if (saves) {
      saves.forEach((s: any) => {
        if (!profileIds.has(s.user_id)) {
          overviews.push({
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
          });
        }
      });
    }

    return overviews;
  } catch (err) {
    console.error('Failed to fetch all students overview:', err);
    return [];
  }
}
