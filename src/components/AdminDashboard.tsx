import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, ArrowLeft, RefreshCw, Download, 
  Award, Clock, AlertTriangle, ShieldCheck, BookOpen, 
  CheckCircle2, X, ChevronRight, BarChart3, Filter, Copy, Key, UserCheck, Flame, Trophy, Swords, Cloud,
  Mail, Send, Lock, Check
} from 'lucide-react';
import type { StudentOverview, UserProfile, GameSaveRow, SaveData } from '../types';
import { 
  fetchAllStudentsOverview, 
  promoteToAdmin, 
  upsertGameSave, 
  mergeSaveData,
  adminResetUserPassword,
  sendPasswordResetEmail
} from '../lib/supabaseClient';
import { secureStorage } from '../utils/secureStorage';
import { TERM_CARDS } from '../data/problems';
import { calculateCollectorLevel } from '../utils/gameHelpers';

export interface StudentMetrics {
  bookLevel: number;
  cardsCount: number;
  uniqueCount: number;
  collectionRate: number;
  attempts: number;
  wins: number;
  winRate: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  grade: 'S' | 'A' | 'B' | 'C';
  bestTimeSeconds: number | null;
  wrongTermsCount: number;
}

export function getStudentMetrics(save?: GameSaveRow | null): StudentMetrics {
  const cards = Array.isArray(save?.collected_cards) ? save.collected_cards : [];
  const bookLevel = calculateCollectorLevel(cards);
  const attempts = save?.stats?.attempts || 0;
  const wins = save?.stats?.wins || 0;
  const winRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0;

  let totalQuestions = 0;
  let totalCorrect = 0;
  Object.values(save?.stats?.termStats || {}).forEach((t: any) => {
    totalQuestions += (t.attemptCount || 0);
    totalCorrect += (t.correctCount || 0);
  });
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const totalCardsCount = TERM_CARDS.length;
  const uniqueCount = Array.from(new Set(cards)).length;
  const collectionRate = totalCardsCount > 0 ? Math.round((uniqueCount / totalCardsCount) * 100) : 0;

  let grade: 'S' | 'A' | 'B' | 'C' = 'C';
  if (collectionRate >= 90 && accuracy >= 85) {
    grade = 'S';
  } else if (collectionRate >= 70 || accuracy >= 80) {
    grade = 'A';
  } else if (collectionRate >= 40 || accuracy >= 60) {
    grade = 'B';
  }

  return {
    bookLevel,
    cardsCount: cards.length,
    uniqueCount,
    collectionRate,
    attempts,
    wins,
    winRate,
    totalQuestions,
    totalCorrect,
    accuracy,
    grade,
    bestTimeSeconds: save?.best_time_seconds ?? null,
    wrongTermsCount: Array.isArray(save?.wrong_terms) ? save.wrong_terms.length : 0,
  };
}

export function getGradeBadgeStyle(grade: 'S' | 'A' | 'B' | 'C') {
  switch (grade) {
    case 'S':
      return 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-xs shadow-amber-400/20';
    case 'A':
      return 'bg-blue-500/20 text-blue-300 border-blue-400/50';
    case 'B':
      return 'bg-purple-500/20 text-purple-300 border-purple-400/50';
    case 'C':
    default:
      return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
  }
}

interface AdminDashboardProps {
  currentUserProfile: UserProfile | null;
  currentSaveData?: SaveData | null;
  onBackToGame: () => void;
  onManualSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUserProfile, 
  currentSaveData,
  onBackToGame,
  onManualSync,
  isSyncing = false
}) => {
  const [students, setStudents] = useState<StudentOverview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOverview | null>(null);
  const [sortBy, setSortBy] = useState<'bookLevel' | 'cards' | 'attempts' | 'wins' | 'accuracy' | 'time' | 'updated' | 'name'>('updated');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'teacher'>('all');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [promoteSuccess, setPromoteSuccess] = useState<boolean>(false);

  // パスワード再発行用ステート
  const [resetPasswordTarget, setResetPasswordTarget] = useState<StudentOverview | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [resetResult, setResetResult] = useState<{
    type: 'success' | 'error' | null;
    message?: string;
    copyText?: string;
    isRpcMissing?: boolean;
  }>({ type: null });
  const [copiedGuide, setCopiedGuide] = useState<boolean>(false);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'temp';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenPasswordReset = (student: StudentOverview) => {
    setResetPasswordTarget(student);
    setTempPasswordInput(generateRandomPassword());
    setResetResult({ type: null });
    setCopiedGuide(false);
  };

  const handleExecuteResetPassword = async () => {
    if (!resetPasswordTarget) return;
    if (!tempPasswordInput || tempPasswordInput.length < 6) {
      setResetResult({
        type: 'error',
        message: '一時パスワードは6文字以上で入力してください。',
      });
      return;
    }

    setIsResettingPassword(true);
    setResetResult({ type: null });

    const res = await adminResetUserPassword(resetPasswordTarget.profile.id, tempPasswordInput);
    setIsResettingPassword(false);

    if (res.success) {
      const studentLabel = resetPasswordTarget.profile.student_year && resetPasswordTarget.profile.student_name
        ? `${resetPasswordTarget.profile.student_year}年${resetPasswordTarget.profile.student_class}組${resetPasswordTarget.profile.student_no}番 ${resetPasswordTarget.profile.student_name}`
        : (resetPasswordTarget.profile.display_name || '生徒');

      const guideText = `【ITローグ ログイン一時パスワードのご案内】\n生徒氏名: ${studentLabel}\nログインID（メール）: ${resetPasswordTarget.profile.email || '未設定'}\n一時パスワード: ${tempPasswordInput}\n※ログインすると自動的に新パスワード設定画面が開きます。`;

      setResetResult({
        type: 'success',
        message: `ワンタイム一時パスワード（${tempPasswordInput}）を発行しました！\n生徒がこのパスワードでログインすると、初回に新しいパスワードへの変更画面が表示されます。`,
        copyText: guideText,
      });
    } else {
      const isMissing = res.error?.includes('RPC_NOT_INSTALLED');
      setResetResult({
        type: 'error',
        message: res.error || 'パスワードの再発行に失敗しました。',
        isRpcMissing: isMissing,
      });
    }
  };

  const handleSendResetEmail = async () => {
    if (!resetPasswordTarget?.profile.email) {
      setResetResult({
        type: 'error',
        message: 'このユーザーにはメールアドレスが登録されていません。',
      });
      return;
    }

    setIsSendingEmail(true);
    setResetResult({ type: null });

    const res = await sendPasswordResetEmail(resetPasswordTarget.profile.email);
    setIsSendingEmail(false);

    if (res.success) {
      setResetResult({
        type: 'success',
        message: `${resetPasswordTarget.profile.email} 宛にパスワード再設定メールを送信しました。メール内のリンクから再設定を行ってください。`,
      });
    } else {
      setResetResult({
        type: 'error',
        message: res.error || 'メール送信に失敗しました。',
      });
    }
  };

  const handleCopyGuide = () => {
    if (resetResult.copyText) {
      navigator.clipboard.writeText(resetResult.copyText);
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2500);
    }
  };

  const isAdmin = currentUserProfile?.role === 'admin';

  const loadStudents = async () => {
    setLoading(true);
    try {
      // 先生自身の端末にカード・戦績データがある場合、Supabaseへ自動アップロード・同期
      if (currentUserProfile?.id) {
        let localSaved: SaveData | null = null;
        try {
          const localStr = secureStorage.getItem('it-rogue-save-data');
          if (localStr) localSaved = JSON.parse(localStr);
        } catch {}

        const bestTeacherSave = mergeSaveData(currentSaveData || null, localSaved, currentUserProfile.id);
        const hasTeacherProgress = (bestTeacherSave?.collectedCards?.length || 0) > 0 || (bestTeacherSave?.stats?.attempts || 0) > 0;
        
        if (hasTeacherProgress && bestTeacherSave) {
          try {
            await upsertGameSave(currentUserProfile.id, bestTeacherSave);
          } catch (e) {
            console.warn('Auto-upsert teacher save failed:', e);
          }
        }
      }

      const data = await fetchAllStudentsOverview();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadStudents();
    } else {
      setLoading(false);
    }
  }, [isAdmin, currentUserProfile]);

  const handlePromoteSelf = async () => {
    if (!currentUserProfile?.id) return;
    setIsPromoting(true);
    try {
      await promoteToAdmin(currentUserProfile.id);
      setPromoteSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPromoting(false);
    }
  };

  // 先生自身（ログイン中のアカウント）のセーブデータ行（クラウドとローカルの両方から最善状態を自動マージ）
  const teacherSaveDataRow = useMemo<GameSaveRow | null>(() => {
    if (!currentUserProfile?.id) return null;
    const remoteTeacher = students.find(s => s.profile.id === currentUserProfile.id)?.saveData;

    let localSaved: SaveData | null = null;
    try {
      const localStr = secureStorage.getItem('it-rogue-save-data');
      if (localStr) localSaved = JSON.parse(localStr);
    } catch {}

    let remoteAsSaveData: SaveData | null = null;
    if (remoteTeacher) {
      remoteAsSaveData = {
        ownerUserId: currentUserProfile.id,
        level: remoteTeacher.level,
        xp: remoteTeacher.xp,
        collectedCards: Array.isArray(remoteTeacher.collected_cards) ? remoteTeacher.collected_cards : [],
        bestTimeSeconds: remoteTeacher.best_time_seconds,
        wrongTerms: Array.isArray(remoteTeacher.wrong_terms) ? remoteTeacher.wrong_terms : [],
        stats: remoteTeacher.stats || { attempts: 0, wins: 0, termStats: {} },
        updated_at: remoteTeacher.updated_at,
      };
    }

    // ローカル（メモリ＋ローカルストレージ）の最善実績
    const localBest = mergeSaveData(currentSaveData || null, localSaved, currentUserProfile.id);

    // クラウド側とローカル実績を統合（クラウド側が0枚でもローカル実績が引き継がれる）
    const bestMerged = mergeSaveData(remoteAsSaveData, localBest, currentUserProfile.id);

    if (bestMerged) {
      return {
        user_id: currentUserProfile.id,
        level: bestMerged.level,
        xp: bestMerged.xp,
        collected_cards: bestMerged.collectedCards || [],
        best_time_seconds: bestMerged.bestTimeSeconds ?? null,
        wrong_terms: bestMerged.wrongTerms || [],
        stats: bestMerged.stats || { attempts: 0, wins: 0, termStats: {} },
        updated_at: bestMerged.updated_at || remoteTeacher?.updated_at || new Date().toISOString(),
      };
    }

    if (remoteTeacher) return remoteTeacher;
    return null;
  }, [students, currentUserProfile, currentSaveData]);

  // 先生自身の Overview オブジェクト
  const teacherOverview = useMemo<StudentOverview | null>(() => {
    if (!currentUserProfile) return null;
    return {
      profile: {
        ...currentUserProfile,
        role: 'admin',
      },
      saveData: teacherSaveDataRow,
    };
  }, [currentUserProfile, teacherSaveDataRow]);

  // 先生自身のデータを含む全リスト
  const studentsWithTeacher = useMemo<StudentOverview[]>(() => {
    if (!teacherOverview) return students;
    const exists = students.some(s => s.profile.id === teacherOverview.profile.id);
    if (!exists) {
      return [teacherOverview, ...students];
    }
    // 既に存在する場合は最新のセーブデータで上書き
    return students.map(s => s.profile.id === teacherOverview.profile.id ? teacherOverview : s);
  }, [students, teacherOverview]);

  // 権限チェック
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-lg w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-100">先生・管理者ダッシュボード</h1>
            <p className="text-xs text-slate-400 mt-1">
              学習進捗の把握・生徒データの管理画面です
            </p>
          </div>

          {currentUserProfile ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-left space-y-3 font-sans">
              <div className="text-xs text-slate-300">
                現在ログイン中のアカウント: <br />
                <span className="font-bold text-amber-300 font-mono text-sm">{currentUserProfile.email}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                このアカウントを先生（管理者）として有効化すると、生徒一覧や学習レポートの閲覧が可能になります。
              </p>

              <button
                onClick={handlePromoteSelf}
                disabled={isPromoting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPromoting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : promoteSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>{promoteSuccess ? '有効化しました！更新中...' : '先生（管理者）として今すぐ有効化する'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/60 p-4 rounded-xl text-xs text-slate-400">
              ログインしていません。タイトル画面の「ログイン」から先生のアカウントでログインしてください。
            </div>
          )}

          <button
            onClick={onBackToGame}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            タイトル画面へ戻る
          </button>
        </div>
      </div>
    );
  }

  // 検索・フィルタリング・ソート
  const filteredStudents = useMemo(() => {
    let result = studentsWithTeacher.filter(item => {
      // 区分フィルター
      const isTeacher = item.profile.id === currentUserProfile?.id || item.profile.role === 'admin';
      if (roleFilter === 'students' && isTeacher) return false;
      if (roleFilter === 'teacher' && !isTeacher) return false;

      // 検索クエリ
      const name = (item.profile.display_name || '').toLowerCase();
      const email = (item.profile.email || '').toLowerCase();
      const sName = (item.profile.student_name || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return !q || name.includes(q) || email.includes(q) || sName.includes(q);
    });

    result.sort((a, b) => {
      // 先生自身（ログイン中のアカウント）を最優先にする場合、またはソート基準
      if (a.profile.id === currentUserProfile?.id && roleFilter === 'all') return -1;
      if (b.profile.id === currentUserProfile?.id && roleFilter === 'all') return 1;

      const metA = getStudentMetrics(a.saveData);
      const metB = getStudentMetrics(b.saveData);

      let valA = 0;
      let valB = 0;

      if (sortBy === 'bookLevel') {
        valA = metA.bookLevel;
        valB = metB.bookLevel;
      } else if (sortBy === 'cards') {
        valA = metA.cardsCount;
        valB = metB.cardsCount;
      } else if (sortBy === 'attempts') {
        valA = metA.attempts;
        valB = metB.attempts;
      } else if (sortBy === 'wins') {
        valA = metA.wins;
        valB = metB.wins;
      } else if (sortBy === 'accuracy') {
        valA = metA.accuracy;
        valB = metB.accuracy;
      } else if (sortBy === 'time') {
        const timeA = metA.bestTimeSeconds !== null ? metA.bestTimeSeconds : 999999;
        const timeB = metB.bestTimeSeconds !== null ? metB.bestTimeSeconds : 999999;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else if (sortBy === 'updated') {
        valA = a.saveData?.updated_at ? new Date(a.saveData.updated_at).getTime() : 0;
        valB = b.saveData?.updated_at ? new Date(b.saveData.updated_at).getTime() : 0;
      } else if (sortBy === 'name') {
        const nameA = a.profile.student_name || a.profile.display_name || a.profile.email || '';
        const nameB = b.profile.student_name || b.profile.display_name || b.profile.email || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [studentsWithTeacher, searchQuery, sortBy, sortOrder, roleFilter, currentUserProfile]);

  // CSVエクスポート
  const handleExportCSV = () => {
    const headers = [
      '学年', '組', '番号', '氏名', '表示名', 'メールアドレス（ユーザID）', '区分',
      '魔導書レベル', '収集カード数', 'カード収集率(%)', '挑戦回数', 'クリア回数',
      'クリア勝率(%)', '解答問題数', '総合正答率(%)', '最速クリア秒', '復習用語数',
      '学修評価グレード', '最終更新日時'
    ];
    const rows = filteredStudents.map(s => {
      const met = getStudentMetrics(s.saveData);
      return [
        `"${s.profile.student_year || ''}"`,
        `"${s.profile.student_class || ''}"`,
        `"${s.profile.student_no || ''}"`,
        `"${s.profile.student_name || ''}"`,
        `"${s.profile.display_name || '未設定'}"`,
        `"${s.profile.email || ''}"`,
        `"${s.profile.id === currentUserProfile?.id ? '先生（ログイン中）' : s.profile.role}"`,
        met.bookLevel,
        met.cardsCount,
        `"${met.collectionRate}%"`,
        met.attempts,
        met.wins,
        `"${met.winRate}%"`,
        met.totalQuestions,
        `"${met.accuracy}%"`,
        met.bestTimeSeconds != null ? met.bestTimeSeconds : '未記録',
        met.wrongTermsCount,
        `"${met.grade}"`,
        `"${s.saveData?.updated_at ? new Date(s.saveData.updated_at).toLocaleString('ja-JP') : '未プレイ'}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `学習進捗データ_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* トップナビゲーションバー */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToGame}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ゲームへ戻る</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-none">先生用 管理ダッシュボード</h1>
              <span className="text-[10px] text-slate-400">学習進捗・成績・先生ご自身のデータ閲覧</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200">{currentUserProfile?.display_name || '管理者（先生）'}</div>
            <div className="text-[10px] text-amber-400/90 font-mono">{currentUserProfile?.email} (admin)</div>
          </div>
          {onManualSync && (
            <button
              onClick={async () => {
                await onManualSync();
                await loadStudents();
              }}
              disabled={loading || isSyncing}
              className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl transition flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
              title="先生自身のプレイ実績をSupabaseへ送信し、全生徒のデータも最新化"
            >
              <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse text-blue-400' : ''}`} />
              <span className="hidden md:inline">{isSyncing ? '同期送信中...' : 'クラウド同期'}</span>
            </button>
          )}
          <button
            onClick={loadStudents}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-1 text-xs"
            title="最新データに更新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">更新</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 text-xs shadow-md shadow-amber-500/10"
          >
            <Download className="w-4 h-4" />
            <span>CSV出力</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* 先生（あなた自身）のアカウント＆プレイデータ カード */}
        {teacherOverview && (
          <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/40 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-100">
                      {teacherOverview.profile.student_year && teacherOverview.profile.student_name
                        ? `${teacherOverview.profile.student_year}年${teacherOverview.profile.student_class}組${teacherOverview.profile.student_no}番 ${teacherOverview.profile.student_name}`
                        : teacherOverview.profile.display_name || '先生のアカウント'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider uppercase">
                      先生（あなた）のデータ
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {teacherOverview.profile.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onManualSync && (
                  <button
                    onClick={async () => {
                      await onManualSync();
                      await loadStudents();
                    }}
                    disabled={loading || isSyncing}
                    className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="先生自身のカード・戦績データをクラウドへ送信し、最新化"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isSyncing ? '送信中...' : '先生データをクラウド送信'}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudent(teacherOverview)}
                  className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>自分の詳細データ・カード一覧を見る</span>
                </button>
              </div>
            </div>

            {/* 先生の学習・プレイ状況ステータスグリッド */}
            {(() => {
              const tm = getStudentMetrics(teacherOverview.saveData);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-amber-500/20">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">評価 / 魔導書Lv</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${getGradeBadgeStyle(tm.grade)}`}>
                        {tm.grade}
                      </span>
                      <span className="text-base font-bold text-amber-400">
                        Lv.{tm.bookLevel}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">カード収集率</span>
                    <span className="text-base font-bold text-emerald-400">
                      {tm.collectionRate}%
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">({tm.uniqueCount}種)</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">挑戦 / クリア</span>
                    <span className="text-base font-bold text-purple-400">
                      {tm.wins}勝 / {tm.attempts}戦
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">({tm.winRate}%)</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">正答率 / 最速タイム</span>
                    <div className="text-sm font-bold text-cyan-400 font-mono">
                      {tm.totalQuestions > 0 ? `${tm.accuracy}%` : '-'}
                      <span className="text-[11px] text-slate-400 font-sans ml-1">
                        ({tm.bestTimeSeconds != null ? `${Math.floor(tm.bestTimeSeconds / 60)}分${tm.bestTimeSeconds % 60}秒` : '-'})
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block mb-0.5">復習用語（誤答）</span>
                    <span className="text-base font-bold text-red-400">
                      {tm.wrongTermsCount}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">件</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 概要カード群 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>登録生徒数</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {students.filter(s => s.profile.id !== currentUserProfile?.id && s.profile.role !== 'admin').length}
              <span className="text-xs font-normal text-slate-500 ml-1">名</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>平均魔導書レベル</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {students.length > 0 
                ? (students.reduce((acc, s) => acc + getStudentMetrics(s.saveData).bookLevel, 0) / students.length).toFixed(1)
                : '1.0'}
              <span className="text-xs font-normal text-slate-500 ml-1">Lv</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>平均カード収集率</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {students.length > 0 
                ? (students.reduce((acc, s) => acc + getStudentMetrics(s.saveData).collectionRate, 0) / students.length).toFixed(0)
                : 0}
              <span className="text-xs font-normal text-slate-500 ml-1">%</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>総冒険クリア回数</span>
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {students.reduce((acc, s) => acc + (s.saveData?.stats?.wins || 0), 0)}
              <span className="text-xs font-normal text-slate-500 ml-1">勝</span>
            </div>
          </div>
        </div>

        {/* コントロールバー（検索・ソート・タブフィルター） */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          {/* タブ切り替え（全員・生徒のみ・先生自身） */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                roleFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全員を表示 ({studentsWithTeacher.length})
            </button>
            <button
              onClick={() => setRoleFilter('students')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                roleFilter === 'students'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              生徒のみ ({studentsWithTeacher.filter(s => s.profile.id !== currentUserProfile?.id && s.profile.role !== 'admin').length})
            </button>
            <button
              onClick={() => setRoleFilter('teacher')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                roleFilter === 'teacher'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              先生（あなた）
            </button>
          </div>

          {/* 検索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="表示名またはメールアドレスで検索..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ソート設定 */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">並び順:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="updated">最終更新日時</option>
              <option value="bookLevel">魔導書レベル</option>
              <option value="cards">収集カード数</option>
              <option value="attempts">挑戦回数</option>
              <option value="wins">クリア回数</option>
              <option value="accuracy">問題正答率</option>
              <option value="time">最速クリアタイム</option>
              <option value="name">生徒氏名</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-300 hover:text-white"
              title={sortOrder === 'desc' ? '降順' : '昇順'}
            >
              {sortOrder === 'desc' ? '↓ 降順' : '↑ 昇順'}
            </button>
          </div>
        </div>

        {/* 生徒一覧テーブル */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">年組番・氏名 / メール</th>
                  <th className="py-3.5 px-4 text-center">区分</th>
                  <th className="py-3.5 px-4 text-center">評価</th>
                  <th className="py-3.5 px-4 text-center">魔導書Lv</th>
                  <th className="py-3.5 px-4 text-center">収集カード</th>
                  <th className="py-3.5 px-4 text-center">挑戦 / クリア</th>
                  <th className="py-3.5 px-4 text-center">正答率</th>
                  <th className="py-3.5 px-4 text-center">最速タイム</th>
                  <th className="py-3.5 px-4 text-right">最終更新</th>
                  <th className="py-3.5 px-4 text-center">操作 / 詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>データを読み込み中...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      該当する生徒が見つかりませんでした。
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((item) => {
                    const save = item.saveData;
                    const met = getStudentMetrics(save);
                    const isSelf = item.profile.id === currentUserProfile?.id;

                    return (
                      <tr
                        key={item.profile.id}
                        onClick={() => setSelectedStudent(item)}
                        className={`cursor-pointer transition ${
                          isSelf 
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span>
                              {item.profile.student_year && item.profile.student_name
                                ? `${item.profile.student_year}年${item.profile.student_class}組${item.profile.student_no}番 ${item.profile.student_name}`
                                : item.profile.display_name || '（名前未設定）'}
                            </span>
                            {isSelf && (
                              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black tracking-wide">
                                ⭐ あなた（先生）
                              </span>
                            )}
                            {!isSelf && item.profile.role === 'admin' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                                先生
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.profile.email}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.profile.role === 'admin' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {item.profile.role === 'admin' ? '管理者' : '生徒'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${getGradeBadgeStyle(met.grade)}`}>
                            {met.grade}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-amber-400 text-sm">
                            Lv.{met.bookLevel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-emerald-400">
                            {met.uniqueCount}
                          </span>
                          <span className="text-slate-500 text-[10px]">種 ({met.collectionRate}%)</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-medium text-slate-200">
                            {met.wins}勝 / {met.attempts}戦
                          </div>
                          <div className="text-[10px] text-purple-400 font-bold">
                            勝率 {met.winRate}%
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-semibold text-blue-400">
                            {met.totalQuestions > 0 ? `${met.accuracy}%` : '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ({met.totalCorrect}/{met.totalQuestions})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {met.bestTimeSeconds != null ? (
                            <span className="text-cyan-400 font-medium">
                              {Math.floor(met.bestTimeSeconds / 60)}分{(met.bestTimeSeconds % 60).toString().padStart(2, '0')}秒
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                          {save?.updated_at 
                            ? new Date(save.updated_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '未プレイ'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenPasswordReset(item)}
                              title="パスワード再発行（ワンタイム設定）"
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Key className="w-3 h-3" />
                              <span className="hidden sm:inline">再発行</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(item)}
                              title="詳細分析"
                              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 個別生徒の詳細分析モーダル */}
      {selectedStudent && (() => {
        const studentMet = getStudentMetrics(selectedStudent.saveData);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* ヘッダー情報 */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`px-3 py-2 rounded-2xl flex flex-col items-center justify-center border font-black ${getGradeBadgeStyle(studentMet.grade)}`}>
                  <span className="text-[10px] uppercase tracking-wider font-semibold">評価</span>
                  <span className="text-xl leading-none font-black">GRADE {studentMet.grade}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>
                      {selectedStudent.profile.student_year && selectedStudent.profile.student_name
                        ? `${selectedStudent.profile.student_year}年${selectedStudent.profile.student_class}組${selectedStudent.profile.student_no}番 ${selectedStudent.profile.student_name}`
                        : selectedStudent.profile.display_name || '名前未設定'}
                    </span>
                    {selectedStudent.profile.id === currentUserProfile?.id ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                        ⭐ あなた（先生）
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {selectedStudent.profile.role === 'admin' ? '先生' : '生徒'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedStudent.profile.email} (ID: {selectedStudent.profile.id.slice(0, 8)}...)
                  </p>
                </div>
              </div>

              {/* パスワード再発行・アカウント管理セクション */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>パスワード再発行（ワンタイム一時パスワード）</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    生徒がパスワードを忘れた場合、一時パスワードを発行して次回ログイン時に新パスワードを設定させることができます。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPasswordReset(selectedStudent)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>パスワードを再発行する</span>
                </button>
              </div>

              {/* 進捗ステータス（ていしゅつ画面相当の学習記録） */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">魔導書レベル</span>
                  <span className="text-base font-bold text-amber-400 font-mono">
                    Lv.{studentMet.bookLevel}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    ({studentMet.uniqueCount}種収集)
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">カード収集率</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {studentMet.collectionRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    ({studentMet.uniqueCount} / {TERM_CARDS.length}種)
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">挑戦 / クリア</span>
                  <span className="text-base font-bold text-purple-400 font-mono">
                    {studentMet.wins}勝 / {studentMet.attempts}戦
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    (勝率: {studentMet.winRate}%)
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">問題総合正答率</span>
                  <span className="text-base font-bold text-blue-400 font-mono">
                    {studentMet.totalQuestions > 0 ? `${studentMet.accuracy}%` : '-'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    ({studentMet.totalCorrect}/{studentMet.totalQuestions}問)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">最速クリアタイム</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">
                    {studentMet.bestTimeSeconds != null
                      ? `${Math.floor(studentMet.bestTimeSeconds / 60)}分${studentMet.bestTimeSeconds % 60}秒`
                      : '未達成'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">復習優先用語（誤答）</span>
                  <span className="text-base font-bold text-red-400 font-mono">
                    {studentMet.wrongTermsCount} 件
                  </span>
                </div>
              </div>

            {/* 苦手な用語（誤答リスト） */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>苦手な用語（復習優先リスト）: {selectedStudent.saveData?.wrong_terms?.length || 0}件</span>
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 min-h-[60px] max-h-40 overflow-y-auto">
                {selectedStudent.saveData?.wrong_terms && selectedStudent.saveData.wrong_terms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStudent.saveData.wrong_terms.map((term, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-3">誤答用語はありません（全問クリアまたは未記録）</p>
                )}
              </div>
            </div>

            {/* カテゴリ別学習データ */}
            {selectedStudent.saveData?.stats?.trainingStats && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>カテゴリ別学習状況</span>
                </h4>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(selectedStudent.saveData.stats.trainingStats.categoryAttempts || {}).map(([cat, rawAtt]) => {
                    const att = Number(rawAtt) || 0;
                    const corrects = Number(selectedStudent.saveData?.stats?.trainingStats?.categoryCorrects?.[cat]) || 0;
                    const rate = att > 0 ? Math.round((corrects / att) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{cat}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-[11px] font-mono w-16 text-right">
                            {corrects}/{att} ({rate}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 収集済み魔導書カード一覧 */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>収集した魔導書カード: {selectedStudent.saveData?.collected_cards?.length || 0}枚</span>
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-52 overflow-y-auto">
                {selectedStudent.saveData?.collected_cards && selectedStudent.saveData.collected_cards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedStudent.saveData.collected_cards.map((cardId) => {
                      const card = TERM_CARDS.find(c => c.id === cardId);
                      const rarity = card?.rarity || 'C';
                      const rarityColors: Record<string, string> = {
                        C: 'bg-slate-800 text-slate-300 border-slate-700',
                        UC: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
                        R: 'bg-blue-950/80 text-blue-300 border-blue-700/50',
                        SR: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
                        UR: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
                        LG: 'bg-yellow-400 text-slate-950 font-black border-yellow-300',
                      };
                      return (
                        <div
                          key={cardId}
                          className="flex items-center gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${rarityColors[rarity] || rarityColors.C}`}>
                            {rarity}
                          </span>
                          <span className="font-semibold text-slate-200 truncate">
                            {card?.name || cardId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-3">収集したカードはまだありません</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* パスワード再発行モーダル */}
    {resetPasswordTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => {
              setResetPasswordTarget(null);
              setResetResult({ type: null });
            }}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                パスワード再発行・ワンタイム設定
              </h3>
              <p className="text-xs text-slate-400">
                生徒の一時パスワードを発行し、次回ログイン時に新パスワードを設定させます
              </p>
            </div>
          </div>

          {/* 対象生徒情報カード */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-5 space-y-1 text-xs">
            <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <span>
                {resetPasswordTarget.profile.student_year && resetPasswordTarget.profile.student_name
                  ? `${resetPasswordTarget.profile.student_year}年${resetPasswordTarget.profile.student_class}組${resetPasswordTarget.profile.student_no}番 ${resetPasswordTarget.profile.student_name}`
                  : (resetPasswordTarget.profile.display_name || '名前未設定')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {resetPasswordTarget.profile.role === 'admin' ? '先生' : '生徒'}
              </span>
            </div>
            <div className="text-slate-400 font-mono">
              ログインID: {resetPasswordTarget.profile.email || 'メール未設定'}
            </div>
          </div>

          {/* 結果メッセージ表示 */}
          {resetResult.type === 'success' && (
            <div className="mb-5 p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium whitespace-pre-line">
                  {resetResult.message}
                </div>
              </div>

              {resetResult.copyText && (
                <div className="space-y-2 pt-1 border-t border-emerald-500/30">
                  <div className="text-[11px] font-bold text-emerald-300">
                    生徒への連絡用テキスト:
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-lg text-slate-200 font-mono text-[11px] whitespace-pre-wrap select-all border border-slate-800">
                    {resetResult.copyText}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyGuide}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedGuide ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>コピーしました！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>生徒への案内文をコピー</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {resetResult.type === 'error' && (
            <div className="mb-5 p-4 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 whitespace-pre-line">{resetResult.message}</div>
              </div>

              {resetResult.isRpcMissing && (
                <div className="pt-2 border-t border-red-500/30">
                  <p className="text-[11px] text-red-300 leading-relaxed">
                    ※Supabaseプロジェクトに再発行用関数（<code>admin_reset_user_password</code>）が登録されていないため発生しています。
                    プロジェクト管理者に連絡の上、<code>supabase_setup.sql</code> の実行をご確認ください。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 再発行フォーム */}
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ワンタイム一時パスワード（6文字以上）</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTempPasswordInput(generateRandomPassword())}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ランダム再生成</span>
                </button>
              </div>

              <input
                type="text"
                value={tempPasswordInput}
                onChange={(e) => setTempPasswordInput(e.target.value)}
                placeholder="一時パスワード"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-mono tracking-wider focus:border-amber-400 focus:outline-hidden"
              />

              <p className="text-[11px] text-slate-400 leading-relaxed">
                ※この一時パスワードで生徒がログインすると、初回に必ず生徒自身の「新しいパスワード設定」画面が開きます。
              </p>

              <button
                type="button"
                disabled={isResettingPassword || !tempPasswordInput || tempPasswordInput.length < 6}
                onClick={handleExecuteResetPassword}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResettingPassword ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>ワンタイム一時パスワードを発行する</span>
                  </>
                )}
              </button>
            </div>

            {/* 補助機能: メール送信 */}
            {resetPasswordTarget.profile.email && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-300">メールで再設定リンクを送る場合</div>
                  <div>生徒のメールアドレス宛に再設定URLを送信します</div>
                </div>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleSendResetEmail}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>再設定メール送信</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                setResetPasswordTarget(null);
                setResetResult({ type: null });
              }}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
