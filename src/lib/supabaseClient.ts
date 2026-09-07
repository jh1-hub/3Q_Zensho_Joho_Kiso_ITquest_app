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
  ユーザーのプロフィール（role, display_name）を取得する
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
      return null;
    }
    return data as UserProfile | null;
  } catch (err) {
    console.error('Failed to get user profile:', err);
    return null;
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
