/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, Timer, CheckCircle2, RefreshCw, Star, Home, AlertOctagon } from 'lucide-react';
import { PlayerState, TermCard } from '../types';
import { TERM_CARDS } from '../data/problems';
import { getTermEmoji } from '../utils/gameHelpers';

interface ResultScreenProps {
  isWin: boolean;
  playerState: PlayerState;
  finalQuestionsCount: number;
  correctAnswersCount: number;
  droppedCard: TermCard | null;
  runCardIds?: string[]; // この冒険中に獲得した全カードのIDリスト
  wrongTerms: string[]; // このプレイで誤答した用語のリスト
  noDamageClear?: boolean; // ノーミスクリア
  onRestart: () => void;
  onBackToTitle: () => void; // タイトルに戻る
}

export default function ResultScreen({
  isWin,
  playerState,
  finalQuestionsCount,
  correctAnswersCount,
  droppedCard,
  runCardIds = [],
  wrongTerms,
  noDamageClear = false,
  onRestart,
  onBackToTitle
}: ResultScreenProps) {
  const [selectedDetailCard, setSelectedDetailCard] = useState<TermCard | null>(null);

  // 実時間、ペナルティ時間、総計算時間
  const realTime = playerState.totalTimeSeconds || 0;
  const penalty = playerState.penaltySeconds || 0;
  const totalScoreTime = realTime + penalty;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}分 ${secs}秒`;
  };

  const correctRate = finalQuestionsCount > 0 
    ? Math.round((correctAnswersCount / finalQuestionsCount) * 100) 
    : 0;

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'bg-slate-705 text-slate-100 border-slate-500';
      case 'UC': return 'bg-emerald-850 text-emerald-105 border-emerald-500';
      case 'R': return 'bg-blue-805 text-blue-105 border-blue-400';
      case 'SR': return 'bg-purple-800 text-purple-105 border-purple-400';
      case 'UR': return 'bg-yellow-650 text-yellow-105 border-yellow-300';
      case 'LG': return 'bg-red-800 text-red-105 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      default: return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  // Generate particles for completion victory celebration (confetti & fireworks)
  const [particles] = useState(() => {
    if (!isWin) return [];
    return Array.from({ length: 45 }).map((_, i) => {
      const left = Math.random() * 100;
      const top = Math.random() * 85 + 5;
      const size = Math.random() * 10 + 4;
      const delay = Math.random() * 3.5;
      const duration = Math.random() * 3.5 + 2.5;
      const colors = [
        'bg-yellow-400 shadw-[0_0_8px_#facc15]',
        'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        'bg-red-500 shadow-[0_0_8px_#ef4444]',
        'bg-indigo-400 shadow-[0_0_8px_#818cf8]',
        'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        'bg-pink-400 shadow-[0_0_8px_#f472b6]'
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return { id: i, left, top, size, delay, duration, color };
    });
  });

  // Calculate customized final rank titles to award catharsis and promote replayability
  const getHeroTitleAndGrade = (time: number) => {
    if (time <= 240 || noDamageClear) return { 
      title: '伝説のはじまり (Rank SSS)', 
      style: 'bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 text-slate-950 border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.65)]',
      image: '/img/player/rank_sss.jpg',
      message: 'あなたの物語は魔導書に記され、時代を越えて語り継がれます。魔導書は今、来るべき時に向けて眠りにつきました。',
      header: '👑 神話創生！',
      subHeader: '◇ 永遠に語り継がれる魔導書の英雄 ◇'
    };
    if (time <= 360) return { 
      title: '終焉を断つ者 (Rank SS)', 
      style: 'bg-gradient-to-r from-amber-400 to-yellow-600 text-white border-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.55)] animate-pulse',
      image: '/img/player/rank_ss.jpg',
      message: 'あなたの選択と覚悟が、闇の時代に終止符を打ちました。魔王の手から落ちた魔導書に差し込む光が、新たな歴史 of 始まりを告げています。',
      header: '👑 魔王討伐！',
      subHeader: '◇ 闇を打ち破りし救世主 ◇'
    };
    if (time <= 540) return { 
      title: '世界の代行者 (Rank A)', 
      style: 'bg-indigo-800 text-white border-indigo-400',
      image: '/img/player/rank_a.jpg',
      message: '剣戟は雷鳴となり、想いは光となって激突します。人々の願いを背負ったあなたの一撃が、滅びそのものとぶつかります。',
      header: '👑 死闘の先へ',
      subHeader: '◇ 終焉と剣を交えし勇者 ◇'
    };
    if (time <= 720) return { 
      title: '終焉へ歩む者 (Rank B)', 
      style: 'bg-teal-800 text-indigo-50 border-teal-500',
      image: '/img/player/rank_b.jpg',
      message: '無数の出会いと別れが力となり、あなたは世界の果てへと辿り着きました。運命の歯車は回り始め、誰も知らぬ最終章の幕が上がろうとしています。',
      header: '👑 死闘へ',
      subHeader: '◇ 運命の決戦に挑む英雄 ◇'
    };
    return { 
      title: '宿命を背負う者 (Rank C)', 
      style: 'bg-slate-700 text-slate-100 border-slate-500',
      image: '/img/player/rank_c.jpg',
      message: '長き旅路で積み重ねた決意が、ついに魔王城の門前へとあなたを導きました。世界の命運は今、ただ一振りの剣と、その歩みに託されています。',
      header: '👑 長き旅の終着',
      subHeader: '◇ 世界の命運を託された戦士 ◇'
    };
  };

  const heroRank = getHeroTitleAndGrade(totalScoreTime);

  return (
    <div className={`min-h-screen w-full ${
      isWin 
        ? 'bg-black bg-gradient-to-b from-black via-slate-950 to-black' 
        : 'bg-slate-900 bg-gradient-to-b from-slate-900 to-slate-950'
      } text-slate-100 p-4 md:p-8 flex flex-col justify-center items-center relative font-sans overflow-hidden select-none border-t-8 ${
        isWin ? 'border-yellow-400' : 'border-red-650'
      }`}
    >
      
      {/* Local interactive/celebratory animation rule injection */}
      {isWin && (
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes floating-particle {
            0% {
              transform: translateY(110vh) rotate(0deg) scale(0.2);
              opacity: 0;
            }
            10% {
              opacity: 0.95;
            }
            70% {
              opacity: 0.95;
            }
            100% {
              transform: translateY(-20vh) rotate(360deg) scale(1.1);
              opacity: 0;
            }
          }
          .custom-spark {
            animation-name: floating-particle;
            animation-iteration-count: infinite;
            animation-timing-function: cubic-bezier(0.12, 0.85, 0.35, 1);
          }
        `}} />
      )}

      {/* Floating particles background when clearing boss */}
      {isWin && particles.map(p => (
        <div
          key={p.id}
          className={`absolute rounded-full custom-spark ${p.color}`}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            top: '100vh',
            pointerEvents: 'none',
            zIndex: 1
          }}
        />
      ))}

      {/* 優しいファンタジー感の演出 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12)_0%,transparent_85%)] pointer-events-none"></div>

      <div className={`w-full ${
        isWin 
          ? 'max-w-3xl bg-black/95 border-4 border-yellow-400 ring-8 ring-yellow-400/10 shadow-[0_0_60px_rgba(234,179,8,0.45)]' 
          : 'max-w-xl bg-slate-900/90 border-4 border-red-900 shadow-2xl'
        } p-6 md:p-8 rounded-3xl relative text-center flex flex-col gap-6 z-10 transition-all`}
      >
        
        {/* ヘッダー・結果ステータス */}
        <div className="flex flex-col items-center">
          {isWin ? (
            <div className="relative">
              {/* 光線エフェクト */}
              <div className="absolute inset-0 bg-yellow-400/25 blur-xl rounded-full scale-150 animate-pulse"></div>
              <div className="relative inline-flex p-4.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 border-2 border-white text-slate-950 rounded-full mb-4 shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-bounce">
                <Award size={42} />
              </div>
            </div>
          ) : (
            <div className="inline-flex p-3.5 bg-red-600 border-2 border-white text-white rounded-full mb-3.5 shadow-md animate-pulse">
              <AlertOctagon size={36} />
            </div>
          )}

          <h1 className={`text-2xl md:text-4xl font-black tracking-widest leading-tight ${
            isWin ? 'text-yellow-300 drop-shadow-[0_3px_5px_rgba(0,0,0,0.75)]' : 'text-red-500'
          }`}>
            {isWin ? (heroRank.header || '👑 魔王討伐！') : '全滅してしまった…'}
          </h1>
          <p className="text-xs text-blue-200 font-bold mt-2 uppercase tracking-widest border-y border-slate-800 py-2 w-full max-w-sm block mx-auto leading-none">
            {isWin ? (heroRank.subHeader || '◇ 世界に平和を呼び戻した伝説の勇者 ◇') : '◇ 諦めぬ心こそが最強の武器 ◇'}
          </p>
        </div>

        {isWin && (
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-yellow-500/20 text-yellow-100 p-4 rounded-2xl text-xs leading-relaxed font-bold shadow-3xs max-w-2xl mx-auto w-full">
              🛡️ {heroRank.message || 'あなたの詠唱したIT用語の言葉の力が、魔界の魔王封印に成功し、IT魔導界に太陽と輝かしい平穏を取り戻しました。すべての知識が力となって脈動しています！'}
            </div>
            
            {/* 討伐記念クリアグラフィック画像 */}
            <div className="w-full overflow-hidden rounded-2xl border border-slate-850 bg-black flex justify-center items-center p-1.5 max-w-2xl mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.95)]">
              <img 
                src={heroRank.image} 
                alt={heroRank.title} 
                className="w-full h-auto rounded-xl object-contain max-h-[320px] md:max-h-[500px] transition-transform duration-500 hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* タイム・スコア指標 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-left font-sans text-xs">
          
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold block mb-1">実走時間 (Time)</span>
            <div className="text-white font-black text-sm flex items-center gap-1">
              <Timer size={14} className="text-blue-400" />
              <span>{formatTime(realTime)}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-805">
            <span className="text-red-400 text-[10px] uppercase tracking-wider font-extrabold block mb-1">ペナルティ (Penalty)</span>
            <div className="text-red-400 font-black text-sm flex items-center gap-1">
              <Timer size={14} className="text-red-400" />
              <span>+{formatTime(penalty)}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-805 col-span-2 md:col-span-1">
            <span className="text-yellow-400 text-[10px] uppercase tracking-wider font-extrabold block mb-1">総合評価タイム</span>
            <div className="text-yellow-350 font-black text-sm flex items-center gap-1 pt-1 md:pt-0">
              <Timer size={14} className="text-yellow-400 animate-pulse" />
              <span>{formatTime(totalScoreTime)}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 col-span-2">
            <span className="text-emerald-400 text-[10px] uppercase tracking-wider font-extrabold block mb-1">ハックの正解精度</span>
            <div className="text-white font-black text-sm flex justify-between items-center mt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{correctAnswersCount} / {finalQuestionsCount} 問せいかい</span>
              </div>
              <span className="text-yellow-350 font-black text-base">{correctRate}%</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-805 text-center flex flex-col justify-center">
            <span className="text-slate-400 text-[9px] uppercase tracking-wider font-extrabold">勇者レベル</span>
            <div className="text-yellow-350 font-black text-base mt-0.5">
              Lv.{playerState.level.toString().padStart(2, '0')}
            </div>
          </div>

          {/* 偉大なカタルシス：称号プレート */}
          {isWin && (
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-yellow-450/45 text-center flex flex-col items-center gap-1 w-full col-span-2 md:col-span-3 mt-1.5 shadow-md">
              <span className="text-yellow-400 text-[9.5px] uppercase tracking-widest font-black block">👑 世界に轟きし至高 of 栄誉称号 👑</span>
              <div className={`px-4.5 py-2.5 rounded-xl border font-black text-xs uppercase tracking-wider font-sans mt-1 shadow-sm ${heroRank.style}`}>
                {heroRank.title}
              </div>
              {noDamageClear && (
                <div className="mt-2 bg-gradient-to-r from-red-500/30 to-amber-500/30 border border-amber-400/50 text-yellow-300 text-[10px] font-black px-3 py-1 rounded-full animate-bounce tracking-widest">
                  ⭐ NO DAMAGE CLEAR (ノーミスクリア) ⭐
                </div>
              )}
            </div>
          )}
        </div>

        {/* のれん/戦利品＆そうびカードの全件確認エリア */}
        <div className="border-t border-b border-slate-800 py-5 text-left font-sans">
          <h3 className="text-sm font-black text-yellow-350 tracking-wider mb-3 flex items-center gap-2">
            <Star size={16} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            <span>🏆 今回の冒険で獲得した戦利品そうび ({runCardIds.map(cid => TERM_CARDS.find(c => c.id === cid)).filter(Boolean).length}枚) 🏆</span>
          </h3>
          
          {(() => {
            const collectedCardsInRun = runCardIds
              .map(cid => TERM_CARDS.find(c => c.id === cid))
              .filter((c): c is TermCard => !!c);

            if (collectedCardsInRun.length === 0) {
              return (
                <div className="text-slate-450 italic p-6 border border-slate-800 bg-slate-950/40 rounded-2xl text-xs text-center font-bold">
                  今回の冒険では獲得した戦利品（そうびカード）はありませんでした。
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {collectedCardsInRun.map(card => {
                  const emoji = getTermEmoji(card.id);
                  const isNewLastDropped = droppedCard && card.id === droppedCard.id;
                  
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedDetailCard(card)}
                      className={`relative p-3 bg-slate-950/70 hover:bg-slate-900 border text-left rounded-xl flex gap-3 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] transition-all ${
                        isNewLastDropped 
                          ? 'border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.25)] ring-1 ring-yellow-400/30' 
                          : 'border-slate-800 hover:border-indigo-500/50'
                      }`}
                      id={`result-loot-card-${card.id}`}
                    >
                      {isNewLastDropped && (
                        <span className="absolute -top-2 -right-1 bg-red-650 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md border border-red-500/50 shadow-xs uppercase tracking-widest animate-pulse z-10">
                          LAST LOOT ⚡
                        </span>
                      )}

                      <span className="text-3xl select-none shrink-0 p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
                        {emoji}
                      </span>

                      <div className="flex flex-col min-w-0 flex-1 justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-black text-slate-100 truncate group-hover:text-yellow-300 transition-colors">
                              {card.name}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono font-bold leading-none shrink-0 uppercase">
                              {card.rarity}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-tight mt-0.5">
                            {card.definition}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[8.5px] font-black text-indigo-300 font-mono border-t border-slate-800/40 pt-1 mt-1">
                          <span>冒険中効果:</span>
                          <span className="text-yellow-400 font-bold flex gap-1 flex-wrap justify-end">
                            {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 15).toFixed(0)}` : ''}
                            {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 15).toFixed(1)}` : ''}
                            {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 15).toFixed(0)}%` : ''}
                            {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 15).toFixed(0)}s` : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          
          <p className="text-[9px] text-slate-500 font-bold italic mt-2.5 text-center select-none">
            ※各カードを選択すると、用語の意味や永続バフ効果などの詳細情報が拡大表示されます。
          </p>
        </div>

        {/* 全画面大カード拡大表示オーバーレイ */}
        {selectedDetailCard && (
          <div 
            className="fixed inset-0 bg-slate-950/95 flex flex-col justify-center items-center z-50 p-4 backdrop-blur-lg animate-fade-in cursor-pointer"
            onClick={() => setSelectedDetailCard(null)}
          >
            {/* レアリティに応じた美麗背景エフェクト */}
            <div className={`absolute inset-0 pointer-events-none mix-blend-screen opacity-50 ${
              selectedDetailCard.rarity === 'LG' ? 'bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedDetailCard.rarity === 'UR' ? 'bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedDetailCard.rarity === 'SR' ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedDetailCard.rarity === 'R' ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedDetailCard.rarity === 'UC' ? 'bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.5)_0%,transparent_75%)] animate-pulse' :
              ''
            }`} />

            <div 
              onClick={(e) => e.stopPropagation()}
              className={`bg-slate-900 border-4 ${
                selectedDetailCard.rarity === 'LG' ? 'border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.55)]' :
                selectedDetailCard.rarity === 'UR' ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.55)]' :
                selectedDetailCard.rarity === 'SR' ? 'border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.55)]' :
                selectedDetailCard.rarity === 'R' ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.55)]' :
                selectedDetailCard.rarity === 'UC' ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.45)]' :
                'border-slate-500 shadow-2xl'
              } p-6 md:p-8 rounded-3xl relative max-w-sm md:max-w-md w-full flex flex-col gap-4 animate-scale-up text-left`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${getRarityBadgeColor(selectedDetailCard.rarity)}`}>
                  {selectedDetailCard.rarity === 'LG' ? 'LEGEND' :
                   selectedDetailCard.rarity === 'UR' ? 'ULTRA RARE' :
                   selectedDetailCard.rarity === 'SR' ? 'SUPER RARE' :
                   selectedDetailCard.rarity === 'R' ? 'RARE' :
                   selectedDetailCard.rarity === 'UC' ? 'UNCOMMON' : 'COMMON'}
                </span>
                <span className="text-[10px] text-yellow-350 font-mono uppercase tracking-widest font-extrabold animate-pulse">
                  LOOT DETAILS
                </span>
              </div>

              <div className="border-b border-slate-800 pb-3 mt-1">
                <h3 className="font-black text-2xl md:text-3xl text-yellow-350 tracking-wider font-sans flex items-center gap-3">
                  <span className="text-4xl md:text-5xl shrink-0 mr-1">{getTermEmoji(selectedDetailCard.id)}</span>
                  <span className="truncate">{selectedDetailCard.name}</span>
                </h3>
              </div>

              <div>
                <span className="text-[10px] text-yellow-400/80 font-bold block mb-1 uppercase tracking-wider">IT Definition (定義):</span>
                <p className="text-sm md:text-base text-slate-100 leading-relaxed font-semibold">
                  {selectedDetailCard.definition}
                </p>
              </div>

              {selectedDetailCard.flavorText && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Lore (解説):</span>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    {selectedDetailCard.flavorText}
                  </p>
                </div>
              )}

              {/* 統一されたバフ効果 */}
              <div className="text-xs font-bold text-yellow-350 bg-slate-950 p-3.5 rounded-xl border border-slate-850/60 flex flex-col gap-2 font-mono">
                <div className="flex justify-between items-center text-blue-300 border-b border-slate-900 pb-1.5 text-[11px]">
                  <span className="font-sans font-bold">常時図鑑ボーナス (パッシブ効果):</span>
                  <span className="font-mono text-blue-400 font-extrabold">
                    {selectedDetailCard.statsBonus.hp ? `HP +${(selectedDetailCard.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                    {selectedDetailCard.statsBonus.attack ? `ATK +${(selectedDetailCard.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                    {selectedDetailCard.statsBonus.xpBonus ? `XP +${(selectedDetailCard.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                    {selectedDetailCard.statsBonus.timerBonus ? `Time +${(selectedDetailCard.statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-300 text-[11px] font-black">
                  <span className="font-sans font-bold">アクティブ装備時効果 (冒険中のみ):</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedDetailCard.statsBonus.hp ? `HP +${(selectedDetailCard.statsBonus.hp * 15).toFixed(0)} ` : ''}
                    {selectedDetailCard.statsBonus.attack ? `ATK +${(selectedDetailCard.statsBonus.attack * 15).toFixed(1)} ` : ''}
                    {selectedDetailCard.statsBonus.xpBonus ? `XP +${(selectedDetailCard.statsBonus.xpBonus * 15).toFixed(0)}% ` : ''}
                    {selectedDetailCard.statsBonus.timerBonus ? `Time +${(selectedDetailCard.statsBonus.timerBonus * 15).toFixed(0)}秒` : ''}
                  </span>
                </div>
              </div>

              <button 
                className="mt-2 w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-755 hover:to-slate-855 text-white font-bold rounded-xl border border-slate-700 transition-all text-sm tracking-wider cursor-pointer text-center"
                onClick={() => setSelectedDetailCard(null)}
              >
                了解（とじる）
              </button>
            </div>

            <div className="mt-4 text-xs text-yellow-350/90 bg-slate-900/80 px-4 py-2 rounded-full border border-yellow-500/20 animate-pulse font-semibold">
              画面のどこかをクリックして閉じる
            </div>
          </div>
        )}

        {/* 間違えた用語（要復習ヒント） */}
        {wrongTerms.length > 0 && (
          <div className="border-t border-slate-800 pt-4 text-left font-sans col-span-1">
            <h3 className="text-xs font-black text-yellow-350 tracking-widest mb-2 flex items-center gap-1.5">
              <span>📖 IT用語ミス復習リスト ({wrongTerms.length})</span>
            </h3>
            <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
              {wrongTerms.map(termName => {
                const termCard = TERM_CARDS.find(c => c.name === termName);
                return (
                  <div key={termName} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex flex-col gap-1">
                     <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-red-405 font-sans flex items-center gap-1.5">
                        {termCard ? <span>{getTermEmoji(termCard.id)}</span> : null}
                        <span>{termName}</span>
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        IT GLOSSARY
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed font-semibold">
                      {termCard ? termCard.definition : '次回は正しい定義を選べるようにしましょう！'}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed mt-2 italic text-center font-bold">
              * ミスした用語は、次回の冒険で優先的に出現するよう学習帳に登録されました。
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex flex-col gap-3 w-full mt-2 font-sans text-xs">
          <button
            onClick={onRestart}
            className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-extrabold rounded-xl border-2 border-yellow-300 shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider animate-pulse hover:animate-none"
            id="restart-game-btn"
          >
            <RefreshCw size={15} />
            <span>新たな冒険の旅に出る (マップ再生成)</span>
          </button>
          
          <button
            onClick={onBackToTitle}
            className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-extrabold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            id="back-to-title-btn"
          >
            <Home size={15} />
            <span>トップページ（タイトル）にもどる</span>
          </button>
        </div>

      </div>
    </div>
  );
}
