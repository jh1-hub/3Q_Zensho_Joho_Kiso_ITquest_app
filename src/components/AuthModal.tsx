import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, X, AlertCircle, CheckCircle2, Shield, School, Hash, BookOpen, Eye, EyeOff, RefreshCw, HelpCircle, Send } from 'lucide-react';
import { supabase, updateUserProfile, getUserProfile, ensureUserRecordExists } from '../lib/supabaseClient';
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
  initialMode = 'login',
  isFirstLaunch = false
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // 生徒情報（新規登録時に使用）
  const [studentYear, setStudentYear] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [studentName, setStudentName] = useState('');

  // 認証情報（ログイン時はこの2つのみ使用、新規登録時は確認用も使用）
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 状態管理
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // メール確認待ちステート
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // 初期化時に既存のローカルストレージ情報があればセット
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setPasswordConfirm('');
      setWaitingForConfirmation(false);
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

  // 確認メールの再送信
  const handleResendConfirmation = async () => {
    const targetEmail = (registeredEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage('メールアドレスを入力してください。');
      return;
    }

    setResendingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('メール送信の制限に達しました。数分後に再度お試しいただくか、先生（管理者）にお知らせください。');
        }
        throw error;
      }

      setSuccessMessage(`【${targetEmail}】宛に確認メールを再送信しました。受信トレイまたは迷惑メールフォルダをご確認ください。`);
    } catch (err: any) {
      console.error('Resend error:', err);
      setErrorMessage(err.message || '確認メールの再送に失敗しました。');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'login') {
        // 次回以降：メールアドレス（ユーザID）とパスワードのみでログイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          console.error('Login error:', error);
          if (error.message.includes('Invalid login credentials') || (error as any).code === 'invalid_credentials') {
            throw new Error(
              'メールアドレス（ユーザID）またはパスワードが正しくありません。\n' +
              '※新規登録直後の場合、ご登録時の【確認メール】内のリンクをクリックしていない可能性があります。'
            );
          }
          if (error.message.includes('Email not confirmed')) {
            setWaitingForConfirmation(true);
            setRegisteredEmail(cleanEmail);
            throw new Error('メールアドレスの確認が完了していません。届いた確認メールのリンクをクリックしてください。');
          }
          throw error;
        }

        // ログインしたユーザーの生徒情報をローカルストレージへ同期 & DBレコードを確実に保証
        if (data.user) {
          await ensureUserRecordExists(data.user.id, data.user.email, data.user.user_metadata);
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

        if (password.length < 6) {
          throw new Error('パスワードは6文字以上で入力してください。');
        }

        if (password !== passwordConfirm) {
          throw new Error('パスワード（確認用）が一致しません。もう一度お確かめください。');
        }

        const formattedDisplayName = `${studentYear.trim()}年${studentClass.trim()}組${studentNo.trim()}番 ${studentName.trim()}`;

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
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
          if (error.message.includes('rate limit')) {
            throw new Error('メール送信の制限に達しました。しばらく時間をおいてから再度お試しください。');
          }
          throw error;
        }

        // 入力した生徒情報をローカルストレージに即時キャッシュ
        const studentInfo = {
          year: studentYear.trim(),
          class: studentClass.trim(),
          no: studentNo.trim(),
          name: studentName.trim()
        };
        secureStorage.setItem('it-rogue-student-info', JSON.stringify(studentInfo));

        // もしすでにセッションがある場合（メール確認不要の環境、またはAuto-confirm）
        if (data.session && data.user) {
          await updateUserProfile(data.user.id, {
            student_year: studentInfo.year,
            student_class: studentInfo.class,
            student_no: studentInfo.no,
            student_name: studentInfo.name,
            display_name: formattedDisplayName
          });
          await ensureUserRecordExists(data.user.id, data.user.email, {
            student_year: studentInfo.year,
            student_class: studentInfo.class,
            student_no: studentInfo.no,
            student_name: studentInfo.name,
            display_name: formattedDisplayName,
          });

          setSuccessMessage('ユーザー登録が完了しました！自動ログインしました。');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 800);
        } else {
          // メール確認が必要な環境（data.session が null）
          // ユーザーに確認メールが送信されたことを明確に提示する
          setRegisteredEmail(cleanEmail);
          setWaitingForConfirmation(true);
        }
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
            {waitingForConfirmation ? <Mail className="w-6 h-6 animate-pulse" /> : mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">
            {waitingForConfirmation
              ? 'メールアドレスの確認が必要です'
              : isFirstLaunch && mode === 'signup'
              ? '冒険者登録（初回セットアップ）'
              : mode === 'login'
              ? '冒険者ログイン'
              : '冒険者新規登録'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {waitingForConfirmation
              ? '確認メール内のリンクをクリックするとログインできるようになります'
              : mode === 'login'
              ? 'メールアドレス（ユーザID）とパスワードを入力してください'
              : '生徒情報とログイン用アカウントを作成してクラウド保存を開始します'}
          </p>
        </div>

        {/* メール確認待ちの特設案内画面 */}
        {waitingForConfirmation ? (
          <div className="space-y-4 font-sans">
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-200 leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>確認メールを送信しました</span>
              </div>
              <p>
                <strong>【{registeredEmail || email}】</strong> 宛に確認メールを送信しました。
              </p>
              <p className="text-slate-300">
                メール本文内のリンク（Confirm your email / 確認）をクリックすると、アカウントが有効化されてログインできるようになります。
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-start gap-2 whitespace-pre-line">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWaitingForConfirmation(false);
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>メール確認が完了したためログインする</span>
              </button>

              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendingEmail}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendingEmail ? 'animate-spin' : ''}`} />
                <span>{resendingEmail ? '再送信中...' : '確認メールを再送信する'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                閉じる（あとで確認する）
              </button>
            </div>

            {/* 先生・管理者向けヒント */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>メールが届かない場合・授業でのご利用時</span>
              </div>
              <p>
                迷惑メールフォルダをご確認ください。また、Supabase管理画面の「Authentication → Providers → Email」で『Confirm email』をOFFに設定すると、メール確認なしで登録後即座にログイン可能になります。
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* タブ切り替え（ログインを先頭、新規登録を2番目に配置） */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-700/50">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setPasswordConfirm('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ログイン</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setPasswordConfirm('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>新規登録（はじめての方）</span>
              </button>
            </div>

            {/* メッセージ表示 */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-start gap-2 whitespace-pre-line">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div>{errorMessage}</div>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail}
                      className="mt-1 text-[11px] text-amber-400 hover:text-amber-300 underline font-bold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>確認メールを再送信する</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 新規登録時のみ：生徒情報（学年・組・番号・氏名） */}
              {mode === 'signup' && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 space-y-3 font-sans">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 border-b border-slate-700/80 pb-1.5">
                    <School className="w-3.5 h-3.5 text-amber-400" />
                    <span>生徒情報（年・組・番・氏名）</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">学年 <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="例) 1"
                        value={studentYear}
                        onChange={(e) => setStudentYear(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">組 <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        placeholder="例) 2"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">出席番号 <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="例) 15"
                        value={studentNo}
                        onChange={(e) => setStudentNo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">生徒氏名 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={20}
                        placeholder="例) 冒険 太郎"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 認証アカウント情報 */}
              <div className="space-y-3 font-sans">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>メールアドレス（※ユーザIDとして利用）</span>
                      <span className="text-red-400">*</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="例) student@school.ed.jp"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="text-[10px] text-amber-300/90 mt-1">
                      💡 次回以降のログイン時は、このメールアドレスが【ユーザID】になります。
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span>パスワード</span>
                      <span className="text-red-400">*</span>
                    </span>
                    {mode === 'signup' && <span className="text-[10px] text-slate-400">6文字以上</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      aria-label="パスワードを表示"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 新規登録時のみ：パスワードの再入力（確認） */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>パスワード（確認用）</span>
                        <span className="text-red-400">*</span>
                      </span>
                      {passwordConfirm && password && (
                        <span className={`text-[10px] font-bold ${password === passwordConfirm ? 'text-emerald-400' : 'text-red-400'}`}>
                          {password === passwordConfirm ? '✓ 一致しています' : '✕ 一致していません'}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="もう一度同じパスワードを入力"
                        className={`w-full bg-slate-800/90 border rounded-xl px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden font-mono ${
                          passwordConfirm && password !== passwordConfirm 
                            ? 'border-red-500/80 focus:border-red-400' 
                            : passwordConfirm && password === passwordConfirm
                            ? 'border-emerald-500/80 focus:border-emerald-400'
                            : 'border-slate-700 focus:border-amber-400'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 送信ボタン */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ログインする</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>新規登録して始める</span>
                    </>
                  )}
                </button>

                {/* スキップ / ゲスト利用ボタン */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
                >
                  {isFirstLaunch ? 'いまは登録せずにゲームを遊ぶ（オフライン）' : 'キャンセル'}
                </button>

                {/* ログイン・新規登録の切り替えリンク */}
                {mode === 'login' ? (
                  <div className="text-center pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                    >
                      未登録の方はこちらから新規登録を行ってください ➔
                    </button>
                  </div>
                ) : (
                  <div className="text-center pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                    >
                      すでにアカウントをお持ちの方はこちら（ログイン） ➔
                    </button>
                  </div>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
