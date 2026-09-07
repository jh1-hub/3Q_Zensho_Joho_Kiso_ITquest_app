import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, ArrowLeft, RefreshCw, Download, 
  Award, Clock, AlertTriangle, ShieldCheck, BookOpen, 
  CheckCircle2, X, ChevronRight, BarChart3, Filter, Copy, Key
} from 'lucide-react';
import type { StudentOverview, UserProfile, GameSaveRow } from '../types';
import { fetchAllStudentsOverview, promoteToAdmin } from '../lib/supabaseClient';

interface AdminDashboardProps {
  currentUserProfile: UserProfile | null;
  onBackToGame: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  currentUserProfile, 
  onBackToGame 
}) => {
  const [students, setStudents] = useState<StudentOverview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOverview | null>(null);
  const [sortBy, setSortBy] = useState<'level' | 'cards' | 'updated' | 'name'>('updated');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [promoteSuccess, setPromoteSuccess] = useState<boolean>(false);
  const [copiedSQL, setCopiedSQL] = useState<boolean>(false);

  const isAdmin = currentUserProfile?.role === 'admin' || (currentUserProfile?.id && localStorage.getItem(`admin_mode_${currentUserProfile.id}`) === 'true');

  const loadStudents = async () => {
    setLoading(true);
    try {
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

  const rlsFixSQL = `-- Supabase SQL Editorで実行してください（無限再帰エラー解消用）
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all authenticated to read profiles" ON profiles;

-- 認証済みユーザーにprofilesの閲覧を許可（無限再帰防止）
CREATE POLICY "Allow all authenticated to read profiles"
ON profiles FOR SELECT
TO authenticated
USING ( true );`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(rlsFixSQL);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

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

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-left text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>💡 Supabase設定ヒント（RLSエラーが出ている場合）</span>
              <button
                type="button"
                onClick={handleCopySQL}
                className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedSQL ? 'コピー完了！' : 'SQLをコピー'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Supabaseの「SQL Editor」で上記SQLを実行すると、profilesテーブルの無限再帰エラーが解消され、全生徒一覧がスムーズに読み込めるようになります。
            </p>
          </div>

          <button
            onClick={onBackToGame}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs"
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
    let result = students.filter(item => {
      const name = (item.profile.display_name || '').toLowerCase();
      const email = (item.profile.email || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return !q || name.includes(q) || email.includes(q);
    });

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === 'level') {
        valA = a.saveData?.level || 1;
        valB = b.saveData?.level || 1;
      } else if (sortBy === 'cards') {
        valA = a.saveData?.collected_cards?.length || 0;
        valB = b.saveData?.collected_cards?.length || 0;
      } else if (sortBy === 'updated') {
        valA = a.saveData?.updated_at ? new Date(a.saveData.updated_at).getTime() : 0;
        valB = b.saveData?.updated_at ? new Date(b.saveData.updated_at).getTime() : 0;
      } else if (sortBy === 'name') {
        const nameA = a.profile.display_name || a.profile.email || '';
        const nameB = b.profile.display_name || b.profile.email || '';
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [students, searchQuery, sortBy, sortOrder]);

  // CSVエクスポート
  const handleExportCSV = () => {
    const headers = ['学年', '組', '番号', '氏名', '表示名', 'メールアドレス（ユーザID）', '区分', 'レベル', '経験値', '収集カード数', '最速クリア秒', '総挑戦数', '総勝利数', '最終更新日時'];
    const rows = filteredStudents.map(s => {
      return [
        `"${s.profile.student_year || ''}"`,
        `"${s.profile.student_class || ''}"`,
        `"${s.profile.student_no || ''}"`,
        `"${s.profile.student_name || ''}"`,
        `"${s.profile.display_name || '未設定'}"`,
        `"${s.profile.email || ''}"`,
        `"${s.profile.role}"`,
        s.saveData?.level || 1,
        s.saveData?.xp || 0,
        s.saveData?.collected_cards?.length || 0,
        s.saveData?.best_time_seconds != null ? s.saveData.best_time_seconds : '未記録',
        s.saveData?.stats?.attempts || 0,
        s.saveData?.stats?.wins || 0,
        `"${s.saveData?.updated_at ? new Date(s.saveData.updated_at).toLocaleString('ja-JP') : '未プレイ'}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `生徒学習データ一覧_${new Date().toISOString().split('T')[0]}.csv`);
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
              <span className="text-[10px] text-slate-400">全生徒の学習進捗・成績の閲覧・分析</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-slate-200">{currentUserProfile.display_name || '管理者'}</div>
            <div className="text-[10px] text-amber-400/90 font-mono">{currentUserProfile.email} (admin)</div>
          </div>
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
        {/* 概要カード群 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>登録生徒数</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{students.length}<span className="text-xs font-normal text-slate-500 ml-1">名</span></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>平均レベル</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {students.length > 0 
                ? (students.reduce((acc, s) => acc + (s.saveData?.level || 1), 0) / students.length).toFixed(1)
                : 0}
              <span className="text-xs font-normal text-slate-500 ml-1">Lv</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>平均カード収集数</span>
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {students.length > 0 
                ? (students.reduce((acc, s) => acc + (s.saveData?.collected_cards?.length || 0), 0) / students.length).toFixed(1)
                : 0}
              <span className="text-xs font-normal text-slate-500 ml-1">種</span>
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

        {/* コントロールバー（検索・ソート） */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          {/* 検索 */}
          <div className="relative flex-1 min-w-[240px]">
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
              <option value="level">レベル</option>
              <option value="cards">収集カード数</option>
              <option value="name">表示名</option>
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
                  <th className="py-3.5 px-4">表示名 / メール</th>
                  <th className="py-3.5 px-4 text-center">区分</th>
                  <th className="py-3.5 px-4 text-center">レベル</th>
                  <th className="py-3.5 px-4 text-center">収集カード</th>
                  <th className="py-3.5 px-4 text-center">最速クリア</th>
                  <th className="py-3.5 px-4 text-center">勝率 (勝利/挑戦)</th>
                  <th className="py-3.5 px-4 text-right">最終更新</th>
                  <th className="py-3.5 px-4 text-center">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>データを読み込み中...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      該当する生徒が見つかりませんでした。
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((item) => {
                    const save = item.saveData;
                    const attempts = save?.stats?.attempts || 0;
                    const wins = save?.stats?.wins || 0;
                    const winRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0;

                    return (
                      <tr
                        key={item.profile.id}
                        onClick={() => setSelectedStudent(item)}
                        className="hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            {item.profile.display_name || '（名前未設定）'}
                            {item.profile.role === 'admin' && (
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
                          <span className="font-bold text-amber-400 text-sm">
                            Lv.{save?.level || 1}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-emerald-400">
                            {save?.collected_cards?.length || 0}
                          </span>
                          <span className="text-slate-500 text-[10px]"> 枚</span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {save?.best_time_seconds != null ? (
                            <span className="text-cyan-400 font-medium">
                              {Math.floor(save.best_time_seconds / 60)}分{(save.best_time_seconds % 60).toString().padStart(2, '0')}秒
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-medium text-slate-200">
                            {attempts > 0 ? `${winRate}%` : '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ({wins} / {attempts})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                          {save?.updated_at 
                            ? new Date(save.updated_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '未プレイ'}
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-500">
                          <ChevronRight className="w-4 h-4 mx-auto" />
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
      {selectedStudent && (
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
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                Lv.{selectedStudent.saveData?.level || 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  {selectedStudent.profile.display_name || '名前未設定'}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {selectedStudent.profile.role}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedStudent.profile.email} (ID: {selectedStudent.profile.id.slice(0, 8)}...)
                </p>
              </div>
            </div>

            {/* 進捗ステータス */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">獲得経験値</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {selectedStudent.saveData?.xp || 0} XP
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">収集カード</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {selectedStudent.saveData?.collected_cards?.length || 0} 枚
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">最速クリアタイム</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {selectedStudent.saveData?.best_time_seconds != null
                    ? `${Math.floor(selectedStudent.saveData.best_time_seconds / 60)}分${selectedStudent.saveData.best_time_seconds % 60}秒`
                    : '未達成'}
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
      )}
    </div>
  );
};
