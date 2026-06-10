/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Swords, Trophy, ShieldAlert, Skull, Compass, Award } from 'lucide-react';
import { PlayerState, MapNode } from '../types';
import { calculatePlayerBonus, getXpToNextLevel } from '../utils/gameHelpers';

interface MapScreenProps {
  player: PlayerState;
  selectedRoute: 'easy' | 'hard' | null;
  currentStep: number;
  nodes: MapNode[];
  onSelectRoute: (route: 'easy' | 'hard') => void;
  onEnterBattle: (node: MapNode) => void;
  onViewCollection: () => void;
}

export default function MapScreen({
  player,
  currentStep,
  nodes,
  onEnterBattle,
  onViewCollection
}: MapScreenProps) {
  const bonus = calculatePlayerBonus(player.collectedCards);
  const maxHpWithBonus = player.maxHp + bonus.hp;
  
  // 次のレベルへの割合
  const xpNeeded = getXpToNextLevel(player.level);
  const xpProgress = Math.min(100, (player.xp / xpNeeded) * 100);

  // ステップ毎にノードを振り分け
  const step0Nodes = nodes.filter(n => n.step === 0);
  const step1Nodes = nodes.filter(n => n.step === 1);
  const step2Nodes = nodes.filter(n => n.step === 2);
  const step3Nodes = nodes.filter(n => n.step === 3);
  const bossNode = nodes.find(n => n.type === 'boss');

  // ノードの個別レンダラ
  const renderNodeButton = (node: MapNode) => {
    if (!node) return null;

    const isCurrent = node.step === currentStep && !node.completed && node.accessible;
    const isAccessible = node.accessible && node.step === currentStep;
    const isBypassed = !node.completed && !isCurrent && !isAccessible && node.step < currentStep;

    let buttonClass = '';
    let iconColor = '';
    let badgeClass = '';
    let badgeLabel = '';

    if (node.completed) {
      // 攻略済み
      buttonClass = 'border-amber-600 bg-amber-950/40 text-amber-500 shadow-md scale-95 opacity-80';
      iconColor = 'text-amber-500';
      badgeClass = 'bg-amber-950 text-amber-400 border-amber-850';
      badgeLabel = 'RESOLVED';
    } else if (isCurrent) {
      // 現在挑戦可能
      buttonClass = 'border-rose-500 bg-rose-950 text-rose-450 shadow-[0_0_20px_rgba(244,63,94,0.7)] scale-110 animate-pulse cursor-pointer';
      iconColor = 'text-rose-400';
      badgeClass = 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse';
      badgeLabel = 'CHALLENGE';
    } else if (isAccessible) {
      // 挑戦可能
      buttonClass = 'border-rose-700 bg-[#251515] text-rose-350 hover:border-rose-500 hover:scale-105 cursor-pointer';
      iconColor = 'text-rose-300';
      badgeClass = 'bg-[#1a1111] text-rose-350 border-rose-800';
      badgeLabel = 'READY';
    } else if (isBypassed) {
      // 迂回されたノード
      buttonClass = 'border-stone-800 bg-stone-950/60 text-stone-750 opacity-40 pointer-events-none';
      iconColor = 'text-stone-700';
      badgeClass = 'bg-stone-950 text-stone-700 border-transparent';
      badgeLabel = 'BYPASSED';
    } else {
      // ロック状態
      buttonClass = 'border-stone-850 bg-stone-950/80 text-stone-700 opacity-60 pointer-events-none';
      iconColor = 'text-stone-800';
      badgeClass = 'bg-stone-950 text-stone-800 border-transparent';
      badgeLabel = 'LOCKED';
    }

    return (
      <div 
        key={node.id} 
        className="flex flex-col items-center justify-center p-3 bg-stone-950/80 rounded-md border border-stone-800 w-44 hover:bg-stone-950/90 transition-all shadow-inner relative"
      >
        <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded uppercase tracking-widest ${badgeClass} mb-2`}>
          {badgeLabel}
        </span>

        <button
          onClick={() => isAccessible && !node.completed && onEnterBattle(node)}
          disabled={node.completed || !isAccessible}
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${buttonClass}`}
          id={`map-node-${node.id}`}
        >
          {node.type === 'battle_hard' ? (
            <ShieldAlert size={24} className={iconColor} />
          ) : (
            <Swords size={24} className={iconColor} />
          )}
        </button>

        <span className="text-[10.5px] text-stone-200 font-sans text-center mt-2 font-semibold break-words px-1 max-w-full block leading-tight">
          {node.label}
        </span>
        <span className="text-[8px] text-stone-500 font-mono tracking-wider mt-0.5 uppercase">
          {node.type === 'battle_hard' ? 'Hard • ATK 20' : 'Easy • ATK 15'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-950 text-amber-100/90 p-4 md:p-6 flex flex-col font-sans select-none relative border-4 border-amber-950/80">
      
      {/* 荘厳なファンタジー・スレイザスパイア風背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(40,15,10,0.4)_0%,transparent_75%)] pointer-events-none"></div>

      {/* プレイヤー情報バー（アンティーク・ステータスパネル） */}
      <div className="max-w-4xl w-full mx-auto bg-[#1b1010] border-2 border-amber-800/80 p-5 rounded-md mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative shadow-[0_0_15px_rgba(239,68,68,0.15)] z-10">
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
          {/* レベル・アバター */}
          <div>
            <div className="text-[10px] text-amber-600/80 font-mono tracking-widest uppercase">CHALLENGER_VITALITY</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-amber-200">LV.{player.level.toString().padStart(2, '0')}</span>
              <span className="text-[10px] font-mono bg-stone-950 px-2 py-0.5 rounded border border-amber-900/40 text-amber-400 uppercase">勇者</span>
            </div>
          </div>

          <div className="border-r border-amber-950 self-stretch hidden md:block"></div>

          {/* 経験値バー */}
          <div className="flex-1 w-full">
            <div className="flex justify-between text-[11px] font-mono text-amber-500/80 mb-1 tracking-wider uppercase">
              <span>EXP BAR (決戦への刻印)</span>
              <span>{player.xp} / {xpNeeded}</span>
            </div>
            <div className="w-full bg-stone-950 h-3 rounded overflow-hidden border border-amber-950 p-[1px]">
              <div 
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* HPと攻撃力 */}
        <div className="flex gap-5 text-sm font-mono self-stretch md:self-auto shrink-0 bg-stone-950/80 border border-amber-950 p-3 rounded-md">
          <div className="w-28">
            <div className="text-red-500/80 text-[10px] font-mono uppercase tracking-wider mb-1">HEALTH_VAL</div>
            <div className="w-full bg-stone-900 h-2 rounded overflow-hidden mb-1">
              <div 
                className="bg-red-700 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (player.hp / maxHpWithBonus) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-red-400 font-bold">
              <span>HP</span>
              <span>{player.hp} / {maxHpWithBonus}</span>
            </div>
          </div>
          
          <div className="border-r border-amber-950"></div>

          <div className="flex flex-col justify-center">
            <span className="text-amber-550 text-[10px] font-mono uppercase tracking-wider">SWORD_ATK</span>
            <div className="text-amber-400 font-bold text-base font-mono">
              {player.attack} <span className="text-amber-600/70 text-[10px] font-normal">(+ATK)</span>
            </div>
          </div>
        </div>

        {/* 図鑑呼び出し */}
        <button
          onClick={onViewCollection}
          className="px-4 py-2 bg-[#2d1212] hover:bg-[#3d1a1a] border-2 border-amber-700/80 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-widest"
          id="map-view-collection-btn"
        >
          <Award size={14} className="text-amber-400" />
          <span>RELICS_DATABASE</span>
        </button>
      </div>

      {/* マップメインコンテンツ */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center items-center gap-6 z-10">
        
        {/* ルート選択後：マップノード進行UI */}
        <div className="w-full flex flex-col gap-4 text-center animate-fade-in max-w-2xl">
          <div className="mb-1">
            <div className="inline-flex py-1 px-4 bg-rose-950 border-2 border-rose-705/55 rounded text-rose-400 text-xs font-mono font-bold tracking-widest uppercase">
              <Compass size={13} className="animate-spin text-rose-450 mr-1.5 inline" /> CLIMBING THE SPIRE OF TERMS
            </div>
            <h2 className="text-2xl font-black tracking-wider text-amber-200 mt-2 font-mono">
              魔導の尖塔: IT_DREAD_DUNGEON
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-lg mx-auto">
              上部へと進み、頂上に君臨する「魔王」を屠りなさい。<br />各階層（Floor）ではお好みの試煉を任意に選択可能です。
            </p>
          </div>

          {/* Slay the Spireタワーマップ */}
          <div className="bg-[#120a0a] border-2 border-amber-900/60 p-6 md:p-8 rounded-md relative shadow-2xl flex flex-col items-center gap-6 overflow-hidden">
            
            {/* 装飾用の光ライン背景 */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-dashed bg-rose-950 opacity-40 pointer-events-none z-0"></div>

            {/* F4 (BOSS) */}
            {bossNode && (
              <div className="flex flex-col items-center relative z-10 w-full">
                <div className="text-[10px] text-rose-500 font-mono tracking-widest mb-2 font-bold flex items-center gap-1">
                  <Skull size={11} /> FINAL FLOOR (BOSS)
                </div>
                {(() => {
                  const isCurrent = bossNode.step === currentStep && !bossNode.completed && bossNode.accessible;
                  const isAccessible = bossNode.accessible && bossNode.step === currentStep;

                  let buttonClass = '';
                  let iconColor = '';
                  let badgeLabel = 'LOCKED';
                  let badgeClass = 'text-stone-800 bg-stone-950 border-transparent';

                  if (bossNode.completed) {
                    buttonClass = 'border-amber-600 bg-amber-950/40 text-amber-500 shadow-md scale-95 opacity-80';
                    iconColor = 'text-amber-500';
                    badgeLabel = 'RESOLVED';
                    badgeClass = 'bg-amber-950 text-amber-400 border-amber-850';
                  } else if (isCurrent) {
                    buttonClass = 'border-red-500 bg-red-950 text-red-405 shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-110 animate-pulse cursor-pointer';
                    iconColor = 'text-red-400';
                    badgeLabel = 'DECISIVE_CRITICAL';
                    badgeClass = 'bg-red-950 text-red-400 border-red-800';
                  } else if (isAccessible) {
                    buttonClass = 'border-red-700 bg-[#2b1010] text-red-350 hover:border-red-500 hover:scale-105 cursor-pointer';
                    iconColor = 'text-red-300';
                    badgeLabel = 'READY';
                    badgeClass = 'bg-[#1b0a0a] text-red-350 border-red-850';
                  } else {
                    buttonClass = 'border-stone-850 bg-stone-950/80 text-stone-700 opacity-60 pointer-events-none';
                    iconColor = 'text-stone-850';
                  }

                  return (
                    <div className="flex flex-col items-center justify-center p-4 bg-[#230f0f] border-2 border-red-900/60 rounded-md w-72 hover:bg-[#341616] transition-all shadow-2xl relative">
                      <span className={`text-[9px] font-mono border px-2 py-0.5 rounded uppercase tracking-widest ${badgeClass} mb-2 font-extrabold`}>
                        {badgeLabel}
                      </span>
                      <button
                        onClick={() => isAccessible && !bossNode.completed && onEnterBattle(bossNode)}
                        disabled={bossNode.completed || !isAccessible}
                        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${buttonClass}`}
                        id={`map-node-${bossNode.id}`}
                      >
                        <Trophy size={32} className={`${iconColor} ${isCurrent ? 'animate-bounce' : ''}`} />
                      </button>
                      <span className="text-xs text-amber-200 mt-2 font-black font-mono tracking-wider">
                        {bossNode.label}
                      </span>
                      <span className="text-[10px] text-rose-450 font-mono tracking-widest mt-1 font-bold">
                        BOSS • HP 50 ATK 25
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 連接線デコ */}
            <div className="w-16 border-t-2 border-dashed border-amber-900/30"></div>

            {/* F3 (Battle Hard) */}
            <div className="flex flex-col items-center relative z-10 w-full">
              <div className="text-[9px] text-amber-600/70 font-mono tracking-widest mb-1">FLOOR 3 (THE CHASM)</div>
              <div className="flex gap-4 justify-center w-full">
                {step3Nodes.map(node => renderNodeButton(node))}
              </div>
            </div>

            {/* 連接線デコ */}
            <div className="w-16 border-t-2 border-dashed border-amber-900/30"></div>

            {/* F2 (Elites) */}
            <div className="flex flex-col items-center relative z-10 w-full">
              <div className="text-[9px] text-amber-600/70 font-mono tracking-widest mb-1 font-semibold">FLOOR 2 (ELITE OUTPOSTS)</div>
              <div className="flex gap-4 justify-center w-full">
                {step2Nodes.map(node => renderNodeButton(node))}
              </div>
            </div>

            {/* 連接線デコ */}
            <div className="w-16 border-t-2 border-dashed border-amber-900/30"></div>

            {/* F1 (Encounters) */}
            <div className="flex flex-col items-center relative z-10 w-full">
              <div className="text-[9px] text-amber-600/70 font-mono tracking-widest mb-1">FLOOR 1 (THE SHADOW RUINS)</div>
              <div className="flex gap-4 justify-center w-full">
                {step1Nodes.map(node => renderNodeButton(node))}
              </div>
            </div>

            {/* 連接線デコ */}
            <div className="w-16 border-t-2 border-dashed border-amber-900/30"></div>

            {/* F0 (Arrival) */}
            <div className="flex flex-col items-center relative z-10 w-full">
              <div className="text-[9px] text-amber-600/70 font-mono tracking-widest mb-1 font-semibold">FLOOR 0 (THE CROSSROAD)</div>
              <div className="flex gap-4 justify-center w-full">
                {step0Nodes.map(node => renderNodeButton(node))}
              </div>
            </div>

          </div>

          <p className="text-xs text-amber-600/50 leading-relaxed font-mono mt-2 uppercase tracking-widest">
            SYSTEM_GOAL: TERM_DUNGEON_CONQUER_PROCEDURE
          </p>
        </div>

      </div>
    </div>
  );
}
