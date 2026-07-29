import React, { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React App:', error, errorInfo);
  }

  handleReload = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-red-400 mb-2">エラーが発生しました</h1>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              画面の読み込み中に問題が発生しました。キャッシュデータが古くなっている可能性があります。
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left text-[11px] text-slate-400 font-mono mb-6 overflow-x-auto max-h-32">
              {this.state.error?.toString() || 'Unknown Error'}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all active:scale-98"
            >
              キャッシュを削除して再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
