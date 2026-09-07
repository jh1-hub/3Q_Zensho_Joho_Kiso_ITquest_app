import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, X, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('メールアドレスまたはパスワードが正しくありません。');
          }
          throw error;
        }

        setSuccessMessage('ログインに成功しました！');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        // サインアップ
        if (!displayName.trim()) {
          throw new Error('表示名（お名前や出席番号）を入力してください。');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        // profilesテーブルにdisplay_nameを直接設定（トリガー補完または明示的更新）
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ display_name: displayName.trim() })
            .eq('id', data.user.id);
        }

        setSuccessMessage('アカウントの登録が完了しました！');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(err.message || '認証中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'login' ? 'プレイヤーログイン' : '冒険者の新規登録'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            クラウド保存により、他の端末でも同じ成績・カードでプレイできます
          </p>
        </div>

        {/* タブ切り替え */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            新規登録
          </button>
        </div>

        {/* メッセージ */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                表示名（お名前 / 出席番号など）
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: 山田太郎 / 2年3組15番"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                ※ 先生のダッシュボードに表示される名前です
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                <span>ログインして冒険を続ける</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>登録してクラウド保存を開始</span>
              </>
            )}
          </button>
        </form>

        {/* 補足・セキュリティ情報 */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>RLS（行レベルセキュリティ）により生徒本人のデータのみ安全に保護されます</span>
        </div>
      </div>
    </div>
  );
};
