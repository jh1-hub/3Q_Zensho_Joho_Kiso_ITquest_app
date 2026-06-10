/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Skull, Award, Play, Library, Zap, BookOpen, Swords, Flame, Download, Timer } from 'lucide-react';
import { TERM_CARDS } from '../data/problems';

interface TitleScreenProps {
  collectedCardIds: string[];
  bestTime: number | null;
  onStartGame: () => void;
  onOpenTraining: () => void;
  onOpenCollection: () => void;
  onOpenStats: () => void;
  onOpenTimeAttack: () => void;
  installPrompt?: any;
  onInstallApp?: () => void;
}

export default function TitleScreen({
  collectedCardIds,
  bestTime,
  onStartGame,
  onOpenTraining,
  onOpenCollection,
  onOpenStats,
  onOpenTimeAttack,
  installPrompt,
  onInstallApp
}: TitleScreenProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}分 ${secs}秒`;
  };

  const [showDetails, setShowDetails] = React.useState(false);

  const toggleDetails = () => {
    setShowDetails(prev => !prev);
  };

  const uniqueCollectedCount = Array.from(new Set(collectedCardIds)).length;
  const totalUniqueCards = TERM_CARDS.length;

  const totalPossible = TERM_CARDS.length * 3;
  const collectedCount = collectedCardIds.length;

  // Exponential collector rank table: rising easily at first, progressively steeper later
  const totalRanks = ['Z', 'Y', 'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  
  const getThresholdForIndex = (index: number, total: number): number => {
    if (index <= 0) return 0;
    if (index >= 26) return total;
    const p = 1.8; // Exponent for curved progression (easy at start, demanding at end)
    return Math.max(index, Math.round(total * Math.pow(index / 25, p)));
  };

  let currentRankIndex = 0;
  for (let i = 0; i < totalRanks.length; i++) {
    if (collectedCount >= getThresholdForIndex(i, totalPossible)) {
      currentRankIndex = i;
    } else {
      break;
    }
  }

  const currentRank = (collectedCount >= totalPossible) ? 'SS' : totalRanks[currentRankIndex];

  // Progress to next rank
  let nextRankName = '';
  let currentRankThreshold = 0;
  let nextRankThreshold = 0;

  if (currentRank === 'SS') {
    nextRankName = 'MAX';
    currentRankThreshold = totalPossible;
    nextRankThreshold = totalPossible;
  } else {
    currentRankThreshold = getThresholdForIndex(currentRankIndex, totalPossible);
    if (currentRankIndex === totalRanks.length - 1) { // Current is 'A', next is 'SS'
      nextRankName = 'SS';
      nextRankThreshold = totalPossible;
    } else {
      nextRankName = totalRanks[currentRankIndex + 1];
      nextRankThreshold = getThresholdForIndex(currentRankIndex + 1, totalPossible);
    }
  }

  const progressInCurrentRank = collectedCount - currentRankThreshold;
  const widthInCurrentRank = nextRankThreshold - currentRankThreshold;
  const rankUpRatio = widthInCurrentRank > 0 ? Math.min(100, Math.max(0, (progressInCurrentRank / widthInCurrentRank) * 100)) : 100;
  const cardsNeededForNext = nextRankThreshold - collectedCount;

  // Rarity Breakdown: Separating unique count from 2nd/3rd card unlocked count
  const raritiesToShow = ['C', 'R', 'SR', 'UR'];
  const rarityBreakdown = raritiesToShow.map(rarity => {
    const cardsOfRarity = TERM_CARDS.filter(c => c.rarity === rarity);
    const totalOfRarity = cardsOfRarity.length;
    
    let firstCount = 0;
    let secondCount = 0;
    let thirdCount = 0;
    
    cardsOfRarity.forEach(card => {
      const count = collectedCardIds.filter(id => id === card.id).length;
      if (count >= 1) firstCount++;
      if (count >= 2) secondCount++;
      if (count >= 3) thirdCount++;
    });
    
    return {
      rarity,
      total: totalOfRarity,
      firstCount,
      secondCount,
      thirdCount
    };
  });

  const getRankBadgeStyle = (rank: string) => {
    if (rank === 'SS') {
      return 'bg-gradient-to-r from-red-500 via-amber-500 to-rose-650 text-white border-2 border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse font-black text-2xl px-5 py-2 rounded-2xl';
    }
    if (['A', 'B', 'C', 'S'].includes(rank)) {
      return 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-900 border-2 border-amber-400 font-extrabold text-xl px-4 py-1.5 rounded-xl shadow-sm';
    }
    if (['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(rank)) {
      return 'bg-gradient-to-r from-purple-200 to-fuchsia-200 text-purple-900 border-2 border-purple-300 font-extrabold text-xl px-4 py-1.5 rounded-xl shadow-sm';
    }
    return 'bg-slate-100 text-slate-700 border-2 border-slate-300 font-extrabold text-xl px-4 py-1.5 rounded-xl shadow-sm';
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'text-slate-650 bg-slate-100 border border-slate-300';
      case 'UC': return 'text-cyan-700 bg-cyan-50 border border-cyan-300';
      case 'R': return 'text-blue-700 bg-blue-55 border border-blue-300';
      case 'SR': return 'text-purple-700 bg-purple-55 border border-purple-300';
      case 'UR': return 'text-amber-700 bg-amber-55 border border-amber-305';
      case 'LG': return 'text-red-650 bg-red-55 border border-red-300 animate-pulse';
      default: return 'text-slate-550 bg-slate-105';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-100 text-slate-800 flex flex-col justify-between p-4 sm:p-6 pb-12 relative font-sans select-none border-t-8 border-blue-600">
      
      {/* 優しい王道ファンタジーを感じる陽光 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none"></div>
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* トップレール */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center z-10 border-b border-blue-200 pb-3">
        <div className="flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 rounded-full text-xs text-white font-bold tracking-wide shadow-md">
          <Zap size={13} className="animate-bounce text-yellow-300" />
          <span>IT QUEST // 冒険の準備完了</span>
        </div>
        <div className="flex items-center gap-3">
          {installPrompt && onInstallApp && (
            <button
              onClick={onInstallApp}
              className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-black text-[11px] px-2.5 py-1 rounded-lg border border-yellow-300 shadow-md hover:scale-[1.03] active:scale-95 transition-all cursor-pointer select-none"
              id="pwa-install-header-btn"
            >
              <Download size={11} className="animate-bounce" />
              <span>アプリをインストール</span>
            </button>
          )}
          <div className="text-xs text-blue-800 font-bold tracking-wider">
            ★ 王道IT用語ファンタジーRPG ★
          </div>
        </div>
      </div>

      {/* メインヒーロー領域 */}
      <div className="max-w-4xl w-full mx-auto flex flex-col items-center text-center my-auto py-8 z-10 gap-6">
        
        {/* ロゴ */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-300/40 blur-2xl rounded-full scale-125"></div>
            <div className="relative bg-gradient-to-br from-yellow-100 to-yellow-300 w-24 h-24 rounded-full border-4 border-yellow-500 flex items-center justify-center shadow-lg mb-2">
              <Swords className="text-blue-700 animate-pulse" size={44} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-wider text-blue-900 drop-shadow-sm select-none">
            IT QUEST
          </h1>
          <p className="text-sm text-yellow-950 font-extrabold tracking-widest mt-1.5 max-w-lg bg-yellow-300/80 border-2 border-yellow-400 px-5 py-2 rounded-2xl shadow-3xs">
            〜 情報基礎の魔導書 〜
          </p>
          <p className="text-[10px] text-slate-600 font-bold tracking-wider mt-1.5">
            IT用語を詠唱して魔物から平和を取り戻せ！
          </p>
        </div>

        {/* コンセプト文・解説 */}
        <div className="bg-blue-900 border-4 border-double border-white p-5 rounded-xl max-w-lg text-white leading-relaxed shadow-xl flex flex-col gap-3 font-sans relative">
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>

          <p className="border-b border-blue-700 pb-2.5 font-bold text-center text-yellow-300 text-sm">
            【あそびかた】 クイズに答えて魔物をやっつけよう！
          </p>
          <div className="text-left space-y-2 text-xs font-semibold">
            <div className="flex items-start gap-2 text-blue-105">
              <span className="text-yellow-350 font-bold shrink-0">▶ たたかう:</span>
              <span>出題されるIT用語の意味を正確に解答してください。正解でモンスターに大ダメージ！</span>
            </div>
            <div className="flex items-start gap-2 text-blue-105">
              <span className="text-yellow-350 font-bold shrink-0">▶ おたから:</span>
              <span>勝利すると、ステータスが永続アップする『IT用語カード』を3枚の伏せカードから1枚選んでゲットできます。</span>
            </div>
          </div>
        </div>

        {/* プレイヤーの進捗状況概要 */}
        <div className="flex flex-col gap-4 max-w-2xl w-full bg-white/90 backdrop-blur-xs border-2 border-blue-400 p-5 rounded-2xl text-blue-950 shadow-lg z-10 font-sans">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-blue-150 items-center text-center">
            
            {/* コレクション */}
            <div className="flex flex-col items-center py-2 sm:py-0">
              <span className="text-blue-600 text-[10.5px] uppercase tracking-wider font-extrabold mb-1">コレクション</span>
              <span className="text-blue-900 text-2xl font-black font-mono">
                {uniqueCollectedCount} <span className="text-blue-400 text-sm font-bold">/ {totalUniqueCards}</span>
              </span>
            </div>

            {/* ランク */}
            <div className="flex flex-col items-center py-2 sm:py-0 sm:px-4">
              <span className="text-blue-600 text-[10.5px] uppercase tracking-wider font-extrabold mb-1.5 select-none">コレクターランク</span>
              <div className="flex flex-col items-center gap-1.5 w-full min-w-[125px]">
                <div className={getRankBadgeStyle(currentRank)}>
                  {currentRank}
                </div>
                {/* ランクアップバー */}
                {currentRank !== 'SS' && (
                  <div className="w-full flex flex-col items-center mt-1">
                    <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden border border-slate-300">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, rankUpRatio)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {currentRank === 'SS' && (
                  <span className="text-[8.5px] font-black text-amber-600 animate-pulse mt-0.5 leading-none">
                     極限伝説コレクター 
                  </span>
                )}
              </div>
            </div>

            {/* 最短クリア記録 */}
            <div className="flex flex-col items-center py-2 sm:py-0">
              <span className="text-blue-600 text-[10.5px] uppercase tracking-wider font-extrabold mb-1">最短クリア記録</span>
              <span className="text-emerald-700 text-2xl font-black">
                {bestTime ? formatTime(bestTime) : '未挑戦'}
              </span>
            </div>

          </div>

          {/* レア度別のコレクション状況 */}
          <div className="border-t border-blue-100 pt-3.5 mt-2.5 flex flex-col items-center w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-center w-full">
              {rarityBreakdown.map((item) => {
                return (
                  <div 
                    key={item.rarity} 
                    onClick={toggleDetails}
                    className={`flex flex-col p-3 rounded-xl border-2 font-sans shadow-xs cursor-pointer hover:scale-[1.03] active:scale-98 transition-all duration-200 select-none ${getRarityBadgeColor(item.rarity)}`}
                    title="クリックですべての詳細進捗を一括開閉"
                  >
                    <div className="text-[12px] font-black tracking-wider text-center border-b border-current/25 pb-1 mb-2">
                      {item.rarity}
                    </div>
                    
                    {/* 基本（1枚目）の開放数 */}
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-800 leading-none">
                      <span>開放状況</span>
                      <span className="font-mono font-black text-slate-905">{item.firstCount}<span className="text-[7.5px] font-normal text-slate-400">/{item.total}</span></span>
                    </div>
                    {item.total > 0 && (
                      <div className="w-full bg-black/10 dark:bg-white/20 h-1.5 rounded-full overflow-hidden mt-1.5 mb-1.5">
                        <div 
                          className="bg-current h-full rounded-full transition-all duration-350" 
                          style={{ width: `${Math.min(100, (item.firstCount / item.total) * 100)}%` }}
                        ></div>
                      </div>
                    )}

                    {/* ２，３枚目の開放状況（タップ・クリックで一括で開く） */}
                    {showDetails && (
                      <div className="grid grid-cols-2 gap-1 pt-1.5 mt-1 bg-black/5 rounded p-1 text-[9px] font-bold text-slate-700 animate-fade-in">
                        <div className="text-center">
                          <span className="block text-[7.5px] text-slate-400 font-sans leading-none mb-0.5">2枚目</span>
                          <span className="font-mono font-black text-slate-800">{item.secondCount}<span className="text-[7px] font-normal text-slate-400">/{item.total}</span></span>
                        </div>
                        <div className="text-center border-l border-current/20">
                          <span className="block text-[7.5px] text-slate-400 font-sans leading-none mb-0.5">3枚目</span>
                          <span className="font-mono font-black text-slate-800">{item.thirdCount}<span className="text-[7px] font-normal text-slate-400">/{item.total}</span></span>
                        </div>
                      </div>
                    )}

                    {/* 展開インジケータ（シンプルに▼ / ▲のみ） */}
                    <div className="text-center text-[10px] font-black mt-1.5 text-slate-500 border-t border-dashed border-current/15 pt-1.5 leading-none">
                      {showDetails ? '▲' : '▼'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* メインアクションボタン */}
        <div className="flex flex-col gap-4 w-full justify-center max-w-2xl mt-2 text-xs font-bold font-sans">
          <button
            onClick={onOpenTimeAttack}
            className="w-full py-4.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-600 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-indigo-400 uppercase tracking-wider text-sm"
            id="open-timeattack-btn"
          >
            <Timer size={16} className="animate-spin text-cyan-300" style={{ animationDuration: '4s' }} />
            <span>ときのかいろう（タイムアタック）</span>
          </button>

          <button
            onClick={onStartGame}
            className="w-full py-4.5 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-300 uppercase tracking-wider text-sm animation-delay-0"
            id="start-game-btn"
          >
            <Play size={16} className="fill-white animate-pulse" />
            <span>ぼうけんにでる</span>
          </button>
          
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <button
              onClick={onOpenTraining}
              className="py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl border-2 border-emerald-450 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
              id="open-training-btn"
            >
              <Flame size={16} className="text-emerald-250 animate-pulse" />
              <span>しゅぎょう</span>
            </button>

            <button
              onClick={onOpenCollection}
              className="py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl border-2 border-blue-400 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
              id="view-collection-btn"
            >
              <Library size={16} className="text-blue-200" />
              <span>ずかんをひらく</span>
            </button>

            <button
              onClick={onOpenStats}
              className="py-4 px-4 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl border-2 border-purple-400 shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
              id="view-stats-btn"
            >
              <Award size={16} className="text-purple-200 animate-bounce" />
              <span>せんせき</span>
            </button>
          </div>
        </div>

      </div>

      {/* フッター */}
      <div className="max-w-4xl w-full mx-auto flex justify-center py-4 border-t border-blue-200 z-10 text-blue-600 font-extrabold text-[10px] tracking-wider uppercase">
        © 2026 IT QUEST. WITH LOVE FROM SAVANNAH LANDS.
      </div>
    </div>
  );
}
