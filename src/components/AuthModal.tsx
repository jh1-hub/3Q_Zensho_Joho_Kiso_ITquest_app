import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, X, AlertCircle, CheckCircle2, Shield, School, Hash, BookOpen } from 'lucide-react';
import { supabase, updateUserProfile, getUserProfile } from '../lib/supabaseClient';
import { secureStorage } from '../utils/secureStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'login' | 'signup';
  isFirstLaunch?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signup',
  isFirstLaunch = false
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // 生徒情報（新規登録時に使用）
  const [studentYear, setStudentYear] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [studentName, setStudentName] = useState('');

  // 認証情報（ログイン時はこの2つのみ使用）
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 初期化時に既存のローカルストレージ情報があればセット
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const saved = secureStorage.getItem('it-rogue-student-info');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.year) setStudentYear(parsed.year);
          if (parsed.class) setStudentClass(parsed.class);
          if (parsed.no) setStudentNo(parsed.no);
          if (parsed.name) setStudentName(parsed.name);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        // 次回以降：メールアドレス（ユーザID）とパスワードのみでログイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('メールアドレス（ユーザID）またはパスワードが正しくありません。');
          }
          throw error;
        }

        // ログインしたユーザーの生徒情報をローカルストレージへ同期
        if (data.user) {
          const profile = await getUserProfile(data.user.id);
          if (profile) {
            const studentInfo = {
              year: profile.student_year || studentYear || '',
              class: profile.student_class || studentClass || '',
              no: profile.student_no || studentNo || '',
              name: profile.student_name || profile.display_name || studentName || ''
            };
            if (studentInfo.name) {
              secureStorage.setItem('it-rogue-student-info', JSON.stringify(studentInfo));
            }
          }
        }

        setSuccessMessage('ログインに成功しました！');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        // 初回新規登録：年・組・番・氏名 + メールアドレス（ユーザID） + パスワード
        if (!studentYear.trim() || !studentClass.trim() || !studentNo.trim() || !studentName.trim()) {
          throw new Error('【学年・組・番号・氏名】のすべての項目を入力してください。');
        }

        const formattedDisplayName = `${studentYear.trim()}年${studentClass.trim()}組${studentNo.trim()}番 ${studentName.trim()}`;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              student_year: studentYear.trim(),
              student_class: studentClass.trim(),
              student_no: studentNo.trim(),
              student_name: studentName.trim(),
              display_name: formattedDisplayName,
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('このメールアドレス（ユーザID）はすでに登録されています。「ログイン」タブからログインしてください。');
          }
          throw error;
        }

        // プロフィールテーブルとローカルストレージの両方に生徒情報を保存
        const studentInfo = {
          year: studentYear.trim(),
          class: studentClass.trim(),
          no: studentNo.trim(),
          name: studentName.trim()
        };
        secureStorage.setItem('it-rogue-student-info', JSON.stringify(studentInfo));

        if (data.user) {
          await updateUserProfile(data.user.id, {
            student_year: studentInfo.year,
            student_class: studentInfo.class,
            student_no: studentInfo.no,
            student_name: studentInfo.name,
            display_name: formattedDisplayName
          });
        }

        setSuccessMessage('ユーザー登録が完了しました！クラウド同期が有効になりました。');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || '処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl p-6 shadow-2xl text-slate-100 my-8">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'login' ? 'プレイヤーログイン' : '冒険者（生徒）の新規登録'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'login' 
              ? 'メールアドレス（ユーザID）とパスワードでログインしてください'
              : '年組番・氏名を登録すると、「提出画面」や先生の成績管理と自動連携されます'}
          </p>
        </div>

        {/* 初回起動時のご案内バナー */}
        {isFirstLaunch && (
          <div className="mb-4 p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-blue-300 mb-1">
              <School className="w-4 h-4 text-blue-400" />
              <span>はじめに：冒険者の登録をお願いします</span>
            </div>
            登録した【年・組・番・氏名】は、課題提出レポート（画像生成）に自動反映され、先生の管理画面で進捗や学習履歴が記録されます。
          </div>
        )}

        {/* タブ切り替え */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            初回・新規登録
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            登録済みの方（ログイン）
          </button>
        </div>

        {/* メッセージ */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 pb-1 border-b border-slate-800">
                <BookOpen className="w-4 h-4" />
                <span>学校・生徒情報（提出用レポートに反映）</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    学年 <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={studentYear}
                      onChange={(e) => setStudentYear(e.target.value)}
                      placeholder="例) 1"
                      className="w-full pl-2.5 pr-6 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-2.5 text-[11px] text-slate-400">年</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    組 (クラス) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      placeholder="例) 2"
                      className="w-full pl-2.5 pr-6 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-2.5 text-[11px] text-slate-400">組</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    出席番号 <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={studentNo}
                      onChange={(e) => setStudentNo(e.target.value)}
                      placeholder="例) 15"
                      className="w-full pl-2.5 pr-6 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-2.5 text-[11px] text-slate-400">番</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  氏名 (フルネーム) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="例) 冒険 太郎"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* メールアドレス（ユーザID） */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                メールアドレス <span className="text-amber-400 font-bold">（※ユーザIDとして利用します）</span>
              </label>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.ed.jp"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              次回以降、このメールアドレスがログイン用の【ユーザID】になります。
            </p>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上のパスワード"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>メールアドレスとパスワードでログイン</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>年組番・氏名を登録して冒険を始める</span>
              </>
            )}
          </button>
        </form>

        {/* 閉じる / ゲストスキップ案内 */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 underline transition text-[11px]"
          >
            登録せずにゲストとして遊ぶ（ローカル保存）
          </button>

          <div className="flex items-center gap-1 text-[10.5px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>RLS安全暗号化</span>
          </div>
        </div>
      </div>
    </div>
  );
};

