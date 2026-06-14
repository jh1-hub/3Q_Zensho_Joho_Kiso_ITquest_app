/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Swords, Heart, Shield, Award, HelpCircle, ArrowRight, Library, RefreshCw, Star } from 'lucide-react';
import { PlayerState, MapNode, TermCard } from '../types';
import { CLUSTERS, TERM_CARDS } from '../data/problems';
import { getEnemyConfig, getTermEmoji } from '../utils/gameHelpers';

interface ExploreScreenProps {
  player: PlayerState;
  nodes: MapNode[];
  currentStep: number;
  onSelectNode: (node: MapNode) => void;
  onViewCollection: () => void;
  onRestart: () => void;
  onGiveUp: () => void;
}

export default function ExploreScreen({
  player,
  nodes,
  currentStep,
  onSelectNode,
  onViewCollection,
  onRestart,
  onGiveUp
}: ExploreScreenProps) {
  const [showEquipped, setShowEquipped] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TermCard | null>(null);

  // 撃破戻り時（画面 remount 時）のスクロール位置復旧と保存
  useEffect(() => {
    const savedY = sessionStorage.getItem('explore_scroll_y');
    if (savedY) {
      const timer = setTimeout(() => {
        window.scrollTo(0, parseInt(savedY, 10));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('explore_scroll_y', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 次の進路を選択するために、該当ステップのノードを抽出
  // step は 0 〜 4 (4がボス)
  const availableNodes = nodes.filter(n => n.step === currentStep);

  // Unsplashから探索用の敵の極上イメージ（戦闘画面とは完全に異なる画像を指定！）
  const getEnemyThumbnail = (name: string) => {
    if (name.includes('NEO-HYDRA')) {
      return 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80'; // 量子コア・オメガ (抽象的な量子ネットワーク)
    }
    if (name.includes('AEGIS_V2')) {
      return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80'; // 防衛セキュリティ盾 (青く光る防御サーバー)
    }
    if (name.includes('LEPTO.java')) {
      return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'; // 亡霊コードウィーバー (エラーコード画面)
    }
    if (name.includes('BUG-GOBLIN')) {
      return 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80'; // 微細バグウイルス (電子回路基板)
    }
    if (name.includes('DATA-LEAK SLIME')) {
      return 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=400&q=80'; // 液状エラー (サイケデリックデジタル)
    }
    return 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80'; // 汎用
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'bg-slate-100 border-slate-300 text-slate-700';
      case 'UC': return 'bg-blue-50 border-blue-300 text-blue-700';
      case 'SR': return 'bg-purple-50 border-purple-300 text-purple-700';
      case 'UR': return 'bg-yellow-50 border-yellow-300 text-amber-700';
      case 'LG': return 'bg-rose-50 border-rose-300 text-rose-700 font-bold';
      default: return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  // XP進捗率の計算
  const xpPercent = Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-sky-50 to-emerald-50 text-slate-800 p-4 md:p-6 flex flex-col justify-between font-sans relative overflow-hidden select-none border-t-8 border-blue-500">
      
      {/* 優しい草原のきらめき */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,transparent_85%)] pointer-events-none"></div>

      {/* トップHUD: 勇者ステータス (ドラクエ風ステータス窓) */}
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center z-10 border-b border-blue-200 pb-4 font-sans">
        <div className="md:col-span-4 flex items-center gap-3">
          <div className="bg-blue-900 border-2 border-white text-white px-3 py-2 rounded-lg flex flex-col shadow-md shrink-0">
            <span className="text-[9px] text-yellow-300 font-extrabold uppercase tracking-wider">たびのレベル</span>
            <span className="text-white font-black text-base">LV {player.level}</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            {/* 経験値進捗 */}
            <div>
              <div className="flex justify-between text-[10px] text-blue-900 font-bold mb-0.5 leading-tight">
                <span>つぎのレベルまで (EXP)</span>
                <span>{player.xp}/{player.xpToNextLevel} PT</span>
              </div>
              <div className="w-full h-2.5 bg-white border border-blue-300 rounded-full p-[1px] overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                ></div>
              </div>
            </div>
            {/* HP進捗（ヘッダーに配置） */}
            <div>
              <div className="flex justify-between text-[10px] text-red-950 font-bold mb-0.5 leading-tight">
                <span>あなたの HP</span>
                <span className="text-red-700 font-extrabold">{player.hp.toFixed(1)} / {player.maxHp.toFixed(1)}</span>
              </div>
              <div className="w-full h-2.5 bg-white border border-red-300 rounded-full p-[1px] overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (player.hp / player.maxHp) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 進行度ステッパー */}
        <div className="md:col-span-5 flex justify-center items-center gap-1.5 md:gap-3 my-2 md:my-0">
          {[0, 1, 2, 3, 4].map((step) => {
            const isCurrent = step === currentStep;
            const isCompleted = step < currentStep;
            
            let circleColor = 'border-blue-200 bg-white text-slate-400 shadow-sm';
            let lineCol = 'bg-blue-200';

            if (isCurrent) {
              circleColor = 'border-yellow-400 bg-yellow-300 text-blue-900 shadow-md font-bold scale-110';
            } else if (isCompleted) {
              circleColor = 'border-emerald-300 bg-emerald-100 text-emerald-700';
            }

            return (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${circleColor}`}>
                  {step === 4 ? 'ボス' : `${step + 1}`}
                </div>
                {step < 4 && (
                  <div className={`h-1 w-4 md:w-6 rounded-full ${
                    step < currentStep ? 'bg-emerald-400' : 'bg-blue-200'
                  }`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 右アクションボタン */}
        <div className="md:col-span-3 flex justify-end gap-2 text-xs font-bold">
          <button
            onClick={onGiveUp}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border-2 border-red-300 rounded-lg text-red-600 tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            id="explore-giveup-btn"
          >
            <RefreshCw size={12} className="text-red-500 animate-spin-slow" />
            <span>あきらめる</span>
          </button>

          <button
            onClick={onViewCollection}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 border-2 border-blue-400 rounded-lg text-white tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            id="explore-collection-btn"
          >
            <Library size={13} className="text-blue-200" />
            <span>コレクション</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center items-center py-6 md:py-8 z-10 gap-6">
        <div className="text-center font-sans">
          <h2 className="text-lg md:text-xl font-extrabold text-blue-900 tracking-wide uppercase mb-1 flex items-center justify-center gap-2">
            <Swords className="text-red-500" size={20} />
            <span>{currentStep === 4 ? '【最終試練】 終極の大魔王に挑む！' : `【戦域】 第 ${currentStep + 1} のエリアを調査中...`}</span>
          </h2>
          <p className="text-xs text-blue-700 font-bold max-w-xs mx-auto border-b border-blue-200 pb-2">
            {currentStep === 4 ? '目の前に巨大な魔王が立ち塞がった！' : '次にたたかうモンスターを選択してください。'}
          </p>
        </div>

        {/* 分岐路カード群 */}
        <div className={`grid grid-cols-1 ${availableNodes.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'} gap-6 w-full max-w-2xl px-2`}>
          {availableNodes.map((node) => {
            const isHard = node.type === 'battle_hard';
            const isBoss = node.type === 'boss';
            const nodeImg = node.monsterThumbnailPath || getEnemyThumbnail(node.label);

            return (
              <button
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`group relative rounded-2xl border-4 overflow-hidden text-left bg-white flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] cursor-pointer shadow-md hover:shadow-xl ${
                  isBoss
                    ? 'border-red-500 hover:border-red-650'
                    : isHard
                    ? 'border-purple-400 hover:border-purple-600'
                    : 'border-blue-300 hover:border-yellow-400'
                }`}
                id={`explore-node-btn-${node.id}`}
              >
                {/* 敵サムネイルアート */}
                <div className="relative w-full h-36 border-b border-blue-100 overflow-hidden bg-slate-100">
                  <img 
                    referrerPolicy="no-referrer" 
                    src={nodeImg} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      if (node.monsterFallbackThumbnail) {
                        e.currentTarget.src = node.monsterFallbackThumbnail;
                      }
                    }}
                    alt={node.label} 
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                  
                  {/* おおよその報酬プレビューマーク (お宝＆経験値) */}
                  <div className="absolute top-2 right-2 bg-yellow-400 text-blue-900 border-2 border-white rounded-full px-3 py-0.5 text-[10px] font-black shadow-md">
                    {isBoss ? '究極のお宝 + 60 XP' : isHard ? 'レアお宝 + 35 XP' : 'ノーマルお宝 + 20 XP'}
                  </div>

                  {/* 難易度タグ */}
                  <div className={`absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border-2 border-white shadow-sm ${
                    isBoss
                      ? 'bg-red-500 text-white'
                      : isHard
                      ? 'bg-purple-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}>
                    {isBoss ? '大ボス魔王' : isHard ? 'つよい魔物' : 'ふつうの魔物'}
                  </div>
                </div>

                {/* 敵情報テキスト */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white">
                  <div>
                    <h3 className="font-extrabold text-sm text-blue-950 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                      {node.label.includes('・') ? node.label.split('・')[0] : node.label}
                    </h3>
                    <p className="text-xs text-blue-600 font-bold mt-1">
                      {node.label.includes('・') ? node.label.split('・')[1] : 'IT用語の門番'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-slate-105 pt-2.5">
                    <div className="flex flex-col gap-0.5 text-[10px] font-bold text-slate-500">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>てきの最大HP:</span>
                        <span className="text-red-500 font-extrabold">{node.monsterMaxHp} HP</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>てきのこうげき力:</span>
                        <span className="text-amber-500 font-extrabold">{node.monsterDamage} ATK</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-50 pt-1.5">
                      <span className="flex items-center gap-1 text-blue-800">
                        <Swords size={12} className="text-blue-600 animate-bounce" />
                        <span>バトル突入</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-black group-hover:translate-x-1 transition-transform">
                        <span>たたかう！</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* そうびカードボタン */}
        <div className="w-full max-w-2xl flex flex-col items-center mt-2">
          <button
            onClick={() => setShowEquipped(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:brightness-105 text-white font-black rounded-xl border-2 border-blue-400 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
            id="explore-equipped-btn"
          >
            <Star size={13} className="text-yellow-300 fill-yellow-300 animate-bounce" />
            <span>[ そうびカード ({player.activeRunCardIds?.length || 0}枚) をみる ]</span>
          </button>
        </div>
      </div>

      {/* そうびカードポップアップモーダル */}
      {showEquipped && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-4 border-indigo-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4 text-center text-slate-100 font-sans animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 text-sm font-black text-indigo-400">
                <Star size={16} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />
                <span>そうびカード一覧</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">// 冒険中効果</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              {!player.activeRunCardIds || player.activeRunCardIds.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-8 font-medium">
                  まだこの冒険で獲得したカード（そうびカード）はありません。<br />門番を倒して用語カードを入手しましょう！
                </p>
              ) : (
                player.activeRunCardIds.map(cid => {
                  const card = TERM_CARDS.find(c => c.id === cid);
                  if (!card) return null;
                  const emoji = getTermEmoji(cid);
                  
                  return (
                    <div
                      key={cid}
                      onClick={() => setSelectedCard(card)}
                      className="p-3 bg-slate-850/90 hover:bg-slate-800 border-2 border-indigo-500/30 hover:border-indigo-400 rounded-xl flex items-center gap-3 text-left shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                    >
                      <span className="text-3xl select-none shrink-0 p-2 bg-slate-800 border border-indigo-500/20 rounded-lg group-hover:scale-105 transition-transform">{emoji}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-white truncate group-hover:text-yellow-300 transition-colors">{card.name}</span>
                          <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider">
                            {card.rarity === 'C' ? 'Common' : card.rarity === 'UC' ? 'Uncommon' : card.rarity === 'SR' ? 'Rare' : card.rarity === 'UR' ? 'SuperRare' : 'Legendary'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 font-semibold line-clamp-1 leading-tight mt-0.5">
                          {card.definition}
                        </p>
                        <div className="flex justify-between items-center text-[9px] font-extrabold text-indigo-300 font-mono border-t border-slate-850 pt-1.5 mt-1.5">
                          <span>冒険中効果:</span>
                          <span className="text-yellow-400 font-black flex gap-1.5 flex-wrap">
                            {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 15).toFixed(0)}` : ''}
                            {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 15).toFixed(1)}` : ''}
                            {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 15).toFixed(0)}%` : ''}
                            {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 15).toFixed(0)}秒` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-850 pt-3 flex flex-col gap-1 text-[9px] text-slate-450 font-bold leading-relaxed">
              <span>※ 装備カードを選択すると詳細を拡大表示できます</span>
              <button
                onClick={() => setShowEquipped(false)}
                className="w-full mt-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs tracking-wider uppercase"
                id="close-equipped-modal"
              >
                [ 閉じる ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 選択したそうびカードの拡大モーダル */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-center items-center z-50 p-4 animate-fade-in cursor-pointer"
          onClick={() => setSelectedCard(null)}
        >
          {/* レアリティに応じた美しい背景エフェクト */}
          <div className={`absolute inset-0 pointer-events-none mix-blend-screen opacity-40 ${
            selectedCard.rarity === 'LG' ? 'bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.5)_0%,transparent_75%)] animate-pulse' :
            selectedCard.rarity === 'UR' ? 'bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.5)_0%,transparent_75%)] animate-pulse' :
            selectedCard.rarity === 'SR' ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.5)_0%,transparent_75%)] animate-pulse' :
            selectedCard.rarity === 'UC' || selectedCard.rarity === 'R' ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5)_0%,transparent_75%)] animate-pulse' :
            ''
          }`} />

          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-slate-900 border-4 ${
              selectedCard.rarity === 'LG' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.55)]' :
              selectedCard.rarity === 'UR' ? 'border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.55)]' :
              selectedCard.rarity === 'SR' ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.55)]' :
              selectedCard.rarity === 'UC' || selectedCard.rarity === 'R' ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.45)]' :
              'border-slate-500 shadow-2xl'
            } p-6 md:p-8 rounded-3xl relative max-w-sm md:max-w-md w-full flex flex-col gap-4 animate-scale-up text-left text-slate-100 font-sans`}
          >
            <div className="flex justify-between items-center">
              <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                selectedCard.rarity === 'LG' ? 'bg-red-955 border-red-500 text-red-200' :
                selectedCard.rarity === 'UR' ? 'bg-yellow-955 border-amber-550 text-yellow-250 animate-pulse' :
                selectedCard.rarity === 'SR' ? 'bg-purple-955 border-purple-500 text-purple-200' :
                selectedCard.rarity === 'UC' || selectedCard.rarity === 'R' ? 'bg-blue-955 border-blue-500 text-blue-200' :
                'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {selectedCard.rarity === 'LG' ? 'LEGEND' :
                 selectedCard.rarity === 'UR' ? 'ULTRA RARE' :
                 selectedCard.rarity === 'SR' ? 'SUPER RARE' :
                 selectedCard.rarity === 'R' ? 'RARE' :
                 selectedCard.rarity === 'UC' ? 'UNCOMMON' : 'COMMON'}
              </span>
              <span className="text-[10px] text-yellow-350 font-mono uppercase tracking-widest font-extrabold animate-pulse">
                EQUIPPED CARD DETAIL
              </span>
            </div>

            <div className="border-b border-slate-800 pb-3 mt-1">
              <h3 className="font-black text-2xl md:text-3xl text-yellow-300 tracking-wider flex items-center gap-3">
                <span className="text-4xl md:text-5xl shrink-0 mr-1">{getTermEmoji(selectedCard.id)}</span>
                <span className="truncate">{selectedCard.name}</span>
              </h3>
            </div>

            <div>
              <span className="text-[10px] text-yellow-400/80 font-bold block mb-1 uppercase tracking-wider">// IT 用語定義:</span>
              <p className="text-sm md:text-base text-slate-100 leading-relaxed font-semibold">
                {selectedCard.definition}
              </p>
            </div>

            {selectedCard.flavorText && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-850">
                <span className="text-[9px] text-slate-455 font-bold block mb-1 uppercase tracking-wider">// 解説・豆知識:</span>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  {selectedCard.flavorText}
                </p>
              </div>
            )}

            {/* 一体化されたバフ効果 */}
            <div className="text-xs font-bold text-yellow-350 bg-slate-950 p-3.5 rounded-xl border border-slate-850/60 flex flex-col gap-2 font-mono">
              <div className="flex justify-between items-center text-blue-300 border-b border-slate-900 pb-1.5 text-[11px]">
                <span className="font-sans font-bold">常時図鑑ボーナス (パッシブ効果):</span>
                <span className="font-mono text-blue-400 font-extrabold">
                  {selectedCard.statsBonus.hp ? `HP +${(selectedCard.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                  {selectedCard.statsBonus.attack ? `ATK +${(selectedCard.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                  {selectedCard.statsBonus.xpBonus ? `XP +${(selectedCard.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                  {selectedCard.statsBonus.timerBonus ? `Time +${(selectedCard.statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-300 text-[11px] font-black">
                <span className="font-sans font-bold">アクティブ装備時効果 (冒険中のみ):</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {selectedCard.statsBonus.hp ? `HP +${(selectedCard.statsBonus.hp * 15).toFixed(0)} ` : ''}
                  {selectedCard.statsBonus.attack ? `ATK +${(selectedCard.statsBonus.attack * 15).toFixed(1)} ` : ''}
                  {selectedCard.statsBonus.xpBonus ? `XP +${(selectedCard.statsBonus.xpBonus * 15).toFixed(0)}% ` : ''}
                  {selectedCard.statsBonus.timerBonus ? `Time +${(selectedCard.statsBonus.timerBonus * 15).toFixed(0)}秒` : ''}
                </span>
              </div>
            </div>

            <button 
              className="mt-2 w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl border border-indigo-500 transition-all text-sm tracking-wider cursor-pointer text-center"
              onClick={() => setSelectedCard(null)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* フッター */}
      <div className="max-w-5xl w-full mx-auto flex justify-center py-2.5 border-t border-blue-200 z-10 text-blue-400 font-bold text-[10px] tracking-wider">
        IT QUEST ADVENTURE COG • LINK ACTIVE
      </div>
    </div>
  );
}
