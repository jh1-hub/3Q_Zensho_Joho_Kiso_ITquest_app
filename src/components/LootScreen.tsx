/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { TermCard } from '../types';
import { TERM_CARDS, CLUSTERS } from '../data/problems';
import { shuffleArray, getTermEmoji } from '../utils/gameHelpers';

interface LootScreenProps {
  collectedCardIds: string[];
  gainedXp: number;
  onSelectCard: (selectedCard: TermCard) => void;
  overrideCardsPool?: TermCard[];
  forceFullyRandom?: boolean;
  currentNodeType?: 'battle_easy' | 'battle_hard' | 'boss';
}

export default function LootScreen({ 
  collectedCardIds, 
  gainedXp, 
  onSelectCard, 
  overrideCardsPool, 
  forceFullyRandom = false,
  currentNodeType
}: LootScreenProps) {
  const [options, setOptions] = useState<TermCard[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);

  // 初期化：未所持を優先しつつ、戦闘の難易度（つよい魔物＝より高レアリティ）に応じて3枚の選択肢を抽出 (修行/たんれんのプール変更に対応)
  useEffect(() => {
    const pool = overrideCardsPool || TERM_CARDS;
    let selectedChoices: TermCard[] = [];

    if (forceFullyRandom) {
      // 完全にランダム。所持・未所持を優先度から排斥し、全抽選プールから等価抽出する
      selectedChoices = shuffleArray(pool).slice(0, 3);
    } else {
      // 難易度（通常、強敵、ボス）に応じたレアリティ抽出重み
      const getTargetRarity = (nodeType?: string) => {
        const r = Math.random() * 100;
        if (nodeType === 'boss') {
          if (r < 10) return 'C';
          if (r < 25) return 'UC';
          if (r < 55) return 'SR';
          if (r < 85) return 'UR';
          return 'LG';
        } else if (nodeType === 'battle_hard') {
          // 強敵：コモン率引き下げ、SR/UR増大
          if (r < 25) return 'C';
          if (r < 55) return 'UC';
          if (r < 80) return 'SR';
          if (r < 94) return 'UR';
          return 'LG';
        } else {
          // 通常戦闘/修行：標準確率
          if (r < 55) return 'C';
          if (r < 85) return 'UC';
          if (r < 95) return 'SR';
          if (r < 99) return 'UR';
          return 'LG';
        }
      };

      // 3枚のユニークな候補を選択
      const tempSelected: TermCard[] = [];
      const maxTries = 150;
      let tries = 0;
      while (tempSelected.length < 3 && tries < maxTries) {
        tries++;
        const targetRarity = getTargetRarity(currentNodeType);
        
        // 該当レアリティ、またはRとUCは同等扱い
        let candidates = pool.filter(c => (c.rarity === targetRarity || (targetRarity === 'UC' && c.rarity === 'R')));
        if (candidates.length === 0) {
          candidates = pool;
        }

        // 未所持カードを優先
        const uncollectedCands = candidates.filter(c => !collectedCardIds.includes(c.id));
        let finalPool = uncollectedCands.length > 0 ? uncollectedCands : candidates;

        // 重複を除外
        finalPool = finalPool.filter(c => !tempSelected.some(sc => sc.id === c.id));

        if (finalPool.length > 0) {
          const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
          tempSelected.push(picked);
        }
      }

      // 3枚に満たない場合の確実なユニーク・フォールバック
      while (tempSelected.length < 3) {
        const needed = 3 - tempSelected.length;
        const additional = shuffleArray(pool).filter(c => !tempSelected.some(sc => sc.id === c.id)).slice(0, needed);
        if (additional.length === 0) {
          tempSelected.push(shuffleArray(pool)[0]);
        } else {
          tempSelected.push(...additional);
        }
      }

      selectedChoices = tempSelected;
    }

    setOptions(shuffleArray(selectedChoices).slice(0, 3));
  }, [collectedCardIds, overrideCardsPool, forceFullyRandom, currentNodeType]);

  const handleCardClick = (index: number) => {
    if (revealed) return;
    setSelectedIndex(index);
    setRevealed(true);
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'text-slate-650 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'UC': return 'text-cyan-700 bg-cyan-50 border border-cyan-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'R': return 'text-blue-750 bg-blue-50 border border-blue-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'SR': return 'text-purple-700 bg-purple-55 border border-purple-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'UR': return 'text-amber-700 bg-amber-55 border border-amber-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'LG': return 'text-red-650 bg-red-55 border border-red-300 px-2 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold font-black animate-pulse';
      default: return 'text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-[9px]';
    }
  };

  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'C': return '◆ C ◆';
      case 'UC': return '◆ UC ◆';
      case 'R': return '◆ R ◆';
      case 'SR': return '◆ SR ◆';
      case 'UR': return '◆ UR ◆';
      case 'LG': return '◆ LG ◆';
      default: return '◆ カード ◆';
    }
  };

  const getRarityCardStyle = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'bg-white border-2 border-slate-300 text-slate-900 shadow-md';
      case 'UC': return 'bg-white border-2 border-cyan-300 text-slate-900 shadow-md';
      case 'R': return 'bg-white border-2 border-blue-300 text-slate-900 shadow-md';
      case 'SR': return 'bg-white border-2 border-purple-300 text-slate-900 shadow-md';
      case 'UR': return 'bg-white border-3 border-amber-400 text-slate-900 shadow-lg';
      case 'LG': return 'bg-white border-3 border-rose-450 text-slate-950 shadow-xl';
      default: return 'bg-white border-2 border-slate-300 text-slate-900';
    }
  };

  const getMysticalCardStyle = (rarity: string) => {
    switch (rarity) {
      case 'C': 
        return 'bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-slate-300 text-slate-950 shadow-[0_4px_12px_rgba(148,163,184,0.1)] hover:shadow-[0_12px_24px_rgba(148,163,184,0.25)]';
      case 'UC': 
        return 'bg-gradient-to-b from-cyan-50/60 to-cyan-100/30 border-2 border-cyan-300 text-slate-955 shadow-[0_4px_15px_rgba(6,182,212,0.15)] hover:shadow-[0_12px_28px_rgba(6,182,212,0.3)] hover:border-cyan-400';
      case 'R': 
        return 'bg-gradient-to-b from-blue-50/60 to-blue-100/30 border-2 border-blue-300 text-slate-955 shadow-[0_5px_18px_rgba(59,130,246,0.18)] hover:shadow-[0_15px_32px_rgba(59,130,246,0.35)] hover:border-blue-400';
      case 'SR': 
        return 'bg-gradient-to-b from-purple-50 via-white to-purple-100/35 border-3 border-purple-300 text-slate-955 shadow-[0_6px_22px_rgba(168,85,247,0.25)] hover:shadow-[0_18px_40px_rgba(168,85,247,0.5)] hover:border-purple-400';
      case 'UR': 
        return 'bg-gradient-to-b from-amber-50 via-white to-amber-100/35 border-3 border-amber-400 text-slate-955 shadow-[0_8px_25px_rgba(245,158,11,0.35)] hover:shadow-[0_22px_50px_rgba(245,158,11,0.6)] hover:border-amber-500 animate-[pulse_4s_infinite]';
      case 'LG': 
        return 'bg-gradient-to-b from-rose-50 via-white to-rose-100/40 border-4 border-rose-500 text-slate-955 shadow-[0_10px_30px_rgba(244,63,94,0.45)] hover:shadow-[0_28px_60px_rgba(244,63,94,0.7)] hover:border-rose-600 animate-[pulse_2s_infinite]';
      default: 
        return 'bg-white border-2 border-slate-300 text-slate-900 shadow-md';
    }
  };

  const getRarityBackgroundEffect = (rarity: string) => {
    switch (rarity) {
      case 'C':
        return null;
      case 'UC':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.22)_0%,transparent_70%)] animate-pulse"></div>
            <div className="absolute -top-[10%] -left-[10%] w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,transparent_50%)] backdrop-blur-sm animate-[spin_12s_linear_infinite]"></div>
          </div>
        );
      case 'R':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22)_0%,transparent_70%)] animate-[pulse_3s_infinite]"></div>
          </div>
        );
      case 'SR':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.25)_0%,transparent_70%)] animate-[pulse_3s_infinite]"></div>
          </div>
        );
      case 'UR':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,transparent_70%)] animate-[pulse_2.5s_infinite]"></div>
            <div className="absolute w-[350px] h-[350px] border-4 border-amber-400/20 rounded-full animate-[ping_4s_linear_infinite] shrink-0"></div>
          </div>
        );
      case 'LG':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.35)_0%,transparent_75%)] animate-[pulse_1.8s_infinite]"></div>
            <div className="absolute w-[420px] h-[420px] border-4 border-rose-500/35 rounded-full animate-[ping_3s_linear_infinite] shrink-0"></div>
          </div>
        );
      default:
        return null;
    }
  };

  const findClusterName = (clusterId: string) => {
    return CLUSTERS.find(c => c.id === clusterId)?.name || 'IT分野';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-101 to-emerald-100 text-slate-800 p-4 md:p-6 flex flex-col items-center justify-center font-sans select-none relative overflow-hidden border-t-8 border-blue-600">
      
      {/* 優しい王道ファンタジーを感じる陽光 (トップページと統一) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none"></div>
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none"></div>

      {!revealed ? (
        <div className="max-w-4xl w-full flex flex-col items-center z-10 text-center gap-1 mb-6 mt-2 animate-fade-in">
          <div className="flex items-center gap-1.5 bg-blue-600 px-4 py-1.5 rounded-full text-xs text-white font-extrabold uppercase tracking-wider shadow-md">
            <Sparkles size={13} className="text-yellow-300 animate-bounce" />
            <span>IT QUEST // CARD REWARD</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider text-blue-900 drop-shadow-xs mt-1.5 font-sans">
            【 獲得するカードの選択 】
          </h1>
          <div className="w-full max-w-sm border-b border-blue-200/70 pb-2 mb-2" />
        </div>
      ) : (
        <div className="max-w-md w-full flex flex-col items-center z-10 text-center gap-1 mb-2 mt-1 animate-fade-in">
          <div className="flex items-center gap-1.5 bg-blue-600 px-3 py-1 rounded-full text-[10px] text-white font-extrabold uppercase tracking-wider shadow-md">
            <Sparkles size={11} className="text-yellow-300 animate-bounce" />
            <span>IT QUEST // CONFIRM EQUIPMENT</span>
          </div>
        </div>
      )}

      {/* 3つのカード表示エリア / 中央巨大カードエリア */}
      {!revealed ? (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-8 justify-center items-stretch z-10 mb-8 animate-fade-in">
          {options.map((card, idx) => (
            <div
              key={card.id + '_' + idx}
              onClick={() => handleCardClick(idx)}
              className={`relative min-h-[340px] rounded-2xl cursor-pointer transition-all duration-300 transform-gpu hover:-translate-y-2 flex flex-col justify-between ${getMysticalCardStyle(card.rarity)} border-4 p-5 shadow-lg group`}
              id={`loot-card-cardbg-${idx}`}
            >
              {/* カードヘッダー */}
              <div className="w-full border-b border-slate-205 pb-2 flex justify-between items-center text-[10px] font-bold text-slate-500 gap-2">
                <span className={getRarityBadgeColor(card.rarity) + " shrink-0"}>
                  {getRarityName(card.rarity)}
                </span>
                <span className="truncate max-w-[120px] text-right font-sans font-black tracking-wide text-slate-500" title={findClusterName(card.clusterId)}>
                  {findClusterName(card.clusterId)}
                </span>
              </div>

              {/* メイン絵文字枠と見出し */}
              <div className="flex items-center gap-4 my-3">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-250 flex items-center justify-center text-4.5xl shrink-0 shadow-inner">
                  {getTermEmoji(card.id)}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <h4 className="text-base md:text-lg font-black text-slate-900 leading-tight group-hover:text-blue-700 transition-colors truncate font-sans">
                    {card.name}
                  </h4>
                  {collectedCardIds.includes(card.id) ? (
                    <span className="text-[10px] bg-slate-200/60 text-slate-700 border border-slate-300 font-extrabold px-1.5 py-0.5 rounded shadow-3xs uppercase tracking-wider font-sans mt-1 self-start">
                      所持: {collectedCardIds.filter(id => id === card.id).length}枚
                    </span>
                  ) : (
                    <span className="text-[10px] bg-rose-200/60 text-red-750 border border-rose-300 font-extrabold px-1.5 py-0.5 rounded shadow-3xs uppercase tracking-wider animate-pulse font-sans mt-1 self-start">
                      ★ 未所持
                    </span>
                  )}
                </div>
              </div>

              {/* 簡易定義説明 (視認性大幅改良：太字化・コントラスト) */}
              <p className="text-sm font-bold text-slate-800 text-left bg-white/70 border border-slate-200 p-3.5 rounded-xl line-clamp-4 leading-relaxed flex-1 flex items-center font-sans">
                {card.definition}
              </p>

              {/* ステータスバフ行: 表記「冒険中効果:」に変更 */}
              <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] sm:text-xs font-bold flex justify-between items-center text-slate-655 bg-slate-100 px-2 py-1 rounded">
                <span className="font-sans">冒険中効果:</span>
                <span className="text-blue-900 font-mono text-[10px] font-extrabold">
                  {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 0.5 * 10).toFixed(0)}  ` : ''}
                  {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 0.5 * 10).toFixed(1)}  ` : ''}
                  {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 0.5 * 10).toFixed(0)}%  ` : ''}
                  {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 0.5 * 10).toFixed(0)}秒` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 開封後: 選択した1枚の特別仕様の神秘的な詳細プレビュー、縦スクロール一切なしで決定可能 */
        <div className="max-w-md w-full z-10 mb-2 animate-scale-up flex flex-col items-center px-4 relative">
          
          {/* レアリティに応じた背景エフェクトをカードの真後ろに配置！ */}
          {getRarityBackgroundEffect(options[selectedIndex!].rarity)}

          <div className="w-full text-center text-[10px] sm:text-xs font-black text-rose-800 mb-2 bg-white/90 px-3 py-1.5 rounded-full border border-rose-200 shadow-sm animate-pulse tracking-widest">
            ★ 神秘的な力が解き放たれました ★
          </div>

          <div className={`w-full rounded-2xl text-slate-900 transition-all duration-300 font-sans flex flex-col justify-between ${getMysticalCardStyle(options[selectedIndex!].rarity)} border-4 p-4 sm:p-5 shadow-2.5xl relative overflow-hidden bg-white`}>
            {/* 装飾コーナー */}
            <div className="absolute top-0 left-0 w-2 h-12 bg-gradient-to-b from-blue-500 to-transparent"></div>
            <div className="absolute top-0 left-0 h-2 w-12 bg-gradient-to-r from-blue-500 to-transparent"></div>

            {/* カードヘッダー */}
            <div className="border-b border-slate-200 pb-2 flex justify-between items-center text-[10px] sm:text-xs">
              <span className={getRarityBadgeColor(options[selectedIndex!].rarity)}>
                {getRarityName(options[selectedIndex!].rarity)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono font-bold tracking-wider max-w-[155px] truncate" title={findClusterName(options[selectedIndex!].clusterId)}>
                {findClusterName(options[selectedIndex!].clusterId)}
              </span>
            </div>

            {/* メイン部分：絵文字枠と見出し */}
            <div className="flex items-center gap-4 mt-3 font-sans">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border flex items-center justify-center text-3.5xl sm:text-4.5xl shrink-0 shadow-sm">
                {getTermEmoji(options[selectedIndex!].id)}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <h3 className="text-lg sm:text-xl font-black tracking-normal text-blue-900 leading-tight">
                  {options[selectedIndex!].name}
                </h3>
                {collectedCardIds.includes(options[selectedIndex!].id) ? (
                  <span className="text-[9px] sm:text-[10px] font-black tracking-wider mt-1 uppercase leading-none text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-3xs self-start">所持: {collectedCardIds.filter(id => id === options[selectedIndex!].id).length}枚</span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] bg-rose-200/80 text-rose-800 border border-rose-300 font-black px-1.5 py-0.5 rounded shadow-3xs tracking-wider mt-1 animate-pulse uppercase leading-none font-sans self-start">★ [ 新規カード解放 ! ]</span>
                )}
              </div>
            </div>

            {/* カード解説（文字サイズ最適化・余白最小限） */}
            <div className="my-3 text-left flex flex-col gap-2 font-sans">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl shadow-inner-sm">
                <span className="text-blue-750 text-[10px] font-black block mb-1 tracking-wider font-sans">// 用語の定義:</span>
                {options[selectedIndex!].definition}
              </div>
              {options[selectedIndex!].flavorText && (
                <div className="text-xs sm:text-sm text-slate-505 italic font-semibold leading-relaxed pl-2 bg-slate-50/50 p-2.5 border-l-4 border-slate-300 rounded-r-xl font-sans">
                  {options[selectedIndex!].flavorText}
                </div>
              )}
            </div>

            {/* カードボトム (表記変更: 「永続効果」「冒険中効果」へ) */}
            <div className="mt-1 border-t border-slate-101 pt-2 flex flex-col gap-1.5 font-sans">
              <div className="flex flex-col gap-1.5 text-[10px] sm:text-xs bg-blue-50/70 border border-blue-150 px-3 py-2 rounded-lg font-bold shadow-3xs">
                <div className="flex justify-between items-center text-blue-950 border-b border-blue-105 pb-1 text-[10px] sm:text-xs">
                  <span>永続効果:</span>
                  <span className="font-mono text-blue-800 font-black">
                    {options[selectedIndex!].statsBonus.hp ? `HP +${(options[selectedIndex!].statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                    {options[selectedIndex!].statsBonus.attack ? `ATK +${(options[selectedIndex!].statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                    {options[selectedIndex!].statsBonus.xpBonus ? `XP +${(options[selectedIndex!].statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                    {options[selectedIndex!].statsBonus.timerBonus ? `Time +${(options[selectedIndex!].statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-950 text-[10px] sm:text-[11px] font-black">
                  <span>冒険中効果:</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {options[selectedIndex!].statsBonus.hp ? `HP +${(options[selectedIndex!].statsBonus.hp * 0.5 * 10).toFixed(0)} ` : ''}
                    {options[selectedIndex!].statsBonus.attack ? `ATK +${(options[selectedIndex!].statsBonus.attack * 0.5 * 10).toFixed(1)} ` : ''}
                    {options[selectedIndex!].statsBonus.xpBonus ? `XP +${(options[selectedIndex!].statsBonus.xpBonus * 0.5 * 10).toFixed(0)}% ` : ''}
                    {options[selectedIndex!].statsBonus.timerBonus ? `Time +${(options[selectedIndex!].statsBonus.timerBonus * 0.5 * 10).toFixed(0)}秒` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 直接挿入された決定ボタン枠（スクロール撲滅・ファーストビュー完全保証！） */}
          <div className="flex gap-3 w-full mt-4 font-sans justify-center">
            <button
              onClick={() => {
                setRevealed(false);
                setSelectedIndex(null);
              }}
              className="px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-750 font-black rounded-xl border border-slate-350 shadow active:scale-95 transition-all cursor-pointer text-xs sm:text-sm font-sans"
              id="loot-cancel-btn"
            >
              [ やめる ]
            </button>
            <button
              onClick={() => onSelectCard(options[selectedIndex!])}
              className="flex-1 flex items-center justify-center gap-1.5 px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-405 hover:to-amber-405 text-slate-950 font-black rounded-xl border border-yellow-300 shadow-lg active:scale-95 transition-all cursor-pointer text-xs sm:text-sm tracking-wider font-sans"
              id="loot-confirm-btn"
            >
              <span>[ そうびする ]</span>
              <ArrowRight size={14} className="stroke-[3px]" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-blue-700 text-[9px] font-bold tracking-widest z-10 uppercase font-sans">
        IT QUEST // LOOT SELECTION COMPLETE
      </div>
    </div>
  );
}
