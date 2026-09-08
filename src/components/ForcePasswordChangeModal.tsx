import React, { useState } from 'react';
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase, updateUserProfile } from '../lib/supabaseClient';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  userId: string;
  userEmail: string | null;
  onSuccess: () => void;
}

export const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  isOpen,
  userId,
  userEmail,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('確認用パスワードが一致しません。もう一度お確かめください。');
      return;
    }

    setLoading(true);

    try {
      // 1. Supabase Authのパスワード更新 & must_change_password フラグの解除
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. profiles テーブル側の must_change_password フラグも解除
      try {
        await updateUserProfile(userId, {
          must_change_password: false,
        });
      } catch (profErr) {
        console.warn('profiles update warning:', profErr);
      }

      setSuccessMessage('新しいパスワードを設定しました！');
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setErrorMessage(err.message || 'パスワードの変更に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl text-slate-100">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-inner">
            <Key className="w-6 h-6 animate-pulse" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-1">
            初回セキュリティ設定
          </div>
          <h2 className="text-lg font-bold text-slate-100">
            新しいパスワードを設定してください
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            先生（管理者）により一時パスワードが発行されました。<br />
            これは初回ログイン専用のワンタイムパスワードです。安全のため、あなた専用の新しいパスワードを設定してください。
          </p>
          {userEmail && (
            <div className="mt-2 text-xs font-mono text-blue-300 bg-blue-950/40 py-1 px-2.5 rounded-lg inline-block border border-blue-500/30">
              対象アカウント: {userEmail}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>新しいパスワード</span>
                <span className="text-red-400">*</span>
              </span>
              <span className="text-[10px] text-slate-400">6文字以上</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワード（6文字以上）"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
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

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>新しいパスワード（確認用）</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="確認のためもう一度入力"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || Boolean(successMessage)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>新しいパスワードを設定して開始</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
