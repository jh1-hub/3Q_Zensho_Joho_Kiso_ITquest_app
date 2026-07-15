/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Award, Flame, HelpCircle } from 'lucide-react';
import { TermCard } from '../types';
import { TERM_CARDS, CLUSTERS, quizCategories } from '../data/problems';
import { calculatePlayerBonus, getTermEmoji } from '../utils/gameHelpers';
import { STORY_CARDS, StoryCard } from '../data/stories';

interface CardCollectionProps {
  collectedIds: string[];
  onBack: () => void;
  playerLevel: number;
}

export default function CardCollection({ collectedIds, onBack, playerLevel }: CardCollectionProps) {
  const [selectedCard, setSelectedCard] = React.useState<TermCard | null>(null);
  const [selectedStoryCard, setSelectedStoryCard] = React.useState<StoryCard | null>(null);
  const [versionIndex, setVersionIndex] = React.useState<number>(0);
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const [activeSubTab, setActiveSubTab] = React.useState<string>('all');
  const bonus = calculatePlayerBonus(collectedIds);
  const uniqueCollectedCount = React.useMemo(() => Array.from(new Set(collectedIds)).length, [collectedIds]);

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'text-slate-650 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'UC': return 'text-cyan-705 bg-cyan-50 border border-cyan-300 px-1.5 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'SR': return 'text-purple-700 bg-purple-55 border border-purple-300 px-1.5 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'UR': return 'text-amber-700 bg-amber-55 border border-amber-305 px-1.5 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold';
      case 'LG': return 'text-red-650 bg-red-55 border border-red-300 px-1.5 py-0.5 rounded shadow-sm font-mono text-[9px] uppercase tracking-wider font-extrabold font-black animate-pulse';
      default: return 'text-slate-550 bg-slate-105 px-1.5 py-0.5 rounded font-mono text-[9px]';
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'C': return '◆ C ◆';
      case 'UC': return '◆ UC ◆';
      case 'SR': return '◆ SR ◆';
      case 'UR': return '◆ UR ◆';
      case 'LG': return '◆ LG ◆';
      default: return `◆ ${rarity} ◆`;
    }
  };

  const getRarityCardStyle = (rarity: string) => {
    switch (rarity) {
      case 'C':
        return 'bg-white border-2 border-slate-300 text-slate-900 font-sans shadow-md';
      case 'UC':
        return 'bg-white border-2 border-cyan-300 text-slate-900 font-sans shadow-md';
      case 'SR':
        return 'bg-white border-2 border-purple-300 text-slate-900 font-sans shadow-md';
      case 'UR':
        return 'bg-white border-3 border-amber-400 text-slate-950 font-sans shadow-lg';
      case 'LG':
        return 'bg-white border-3 border-rose-400 text-slate-955 font-sans shadow-xl';
      default:
        return 'bg-white border-2 border-slate-300 text-slate-900 font-sans';
    }
  };

  const getRarityBackgroundEffect = (rarity: string) => {
    switch (rarity) {
      case 'C':
        return (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] animate-pulse pointer-events-none rounded-3xl"></div>
        );
      case 'UC':
        return (
          <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.22)_0%,transparent_70%)] animate-pulse"></div>
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

  // 大カテゴリ切り替え時に小カテゴリ選択をリセット
  const handleSetMainTab = (tabId: string) => {
    setActiveTab(tabId);
    setActiveSubTab('all');
  };

  // 大カテゴリに属する小カテゴリの決定
  const activeSubcategories = React.useMemo(() => {
    if (activeTab === 'all') {
      return CLUSTERS;
    }
    const mainCat = quizCategories.find(c => c.id === activeTab);
    const subIds = mainCat?.subcategories.map(s => s.id) || [];
    return CLUSTERS.filter(c => subIds.includes(c.id));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-101 to-emerald-100 text-slate-800 p-4 md:p-6 flex flex-col font-sans select-none relative overflow-hidden border-t-8 border-blue-600">
      
      {/* 優しい王道ファンタジーを感じる陽光 (トップページと統一) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none"></div>
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-200/50 rounded-full blur-3xl pointer-events-none"></div>

      {/* 画面を囲う枠線 */}
      <div className="absolute inset-3 border border-blue-200/50 pointer-events-none rounded-sm"></div>

      {/* ヘッダー */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between mb-5 z-10 border-b border-blue-205 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl text-slate-100 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
          id="collection-back-btn"
        >
          <ArrowLeft size={14} />
          <span>[ もどる ]</span>
        </button>
        <h1 className="text-xl md:text-2xl font-black tracking-wider flex items-center gap-2 text-blue-900 drop-shadow-sm font-sans">
          <Award className="text-blue-700 animate-bounce" size={22} />
          <span>魔導書（カード図鑑）</span>
        </h1>
        <div className="text-xs font-mono text-slate-100 bg-blue-900 px-3.5 py-1.5 rounded-full border border-blue-800 shadow-sm font-extrabold flex gap-1 items-center animate-none">
          収集率: <span className="font-black text-yellow-300 text-sm">{uniqueCollectedCount}</span> / {TERM_CARDS.length}
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto flex flex-col gap-5 flex-1 z-10">
        
        {/* 上部エリア（バフと用語部門別コレクション率の横並び統合パネル） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
          
          {/* 左：バフ合計パネル */}
          <div className="lg:col-span-4 bg-blue-950 p-4 rounded-2xl border-2 border-blue-800 shadow-md text-slate-200 font-sans flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-extrabold tracking-wider text-yellow-300 mb-2.5 flex items-center gap-1.5 border-b border-blue-900 pb-2 uppercase">
                <Flame className="text-orange-500 animate-pulse animate-bounce" size={14} />
                <span>現在の永続効果合計バフ</span>
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-100">
                <div className="flex justify-between p-2 bg-blue-955 text-slate-200 rounded-lg border border-blue-900/80">
                  <span className="text-slate-400 font-extrabold">HP</span>
                  <span className="text-emerald-400 font-black">+{bonus.hp.toFixed(1)}</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-955 text-slate-200 rounded-lg border border-blue-900/80">
                  <span className="text-slate-400 font-extrabold">ATK</span>
                  <span className="text-amber-450 font-black">+{bonus.attack.toFixed(1)}</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-955 text-slate-200 rounded-lg border border-blue-900/80">
                  <span className="text-slate-400 font-bold">XP加算</span>
                  <span className="text-cyan-400 font-black">+{((bonus.xpBonus - 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-955 text-slate-200 rounded-lg border border-blue-900/80">
                  <span className="text-slate-400 font-bold">時間</span>
                  <span className="text-yellow-300 font-black font-mono">+{bonus.timerBonus.toFixed(1)}秒</span>
                </div>
              </div>
            </div>
            <p className="text-[8.5px] text-slate-400 mt-2 leading-none font-mono">
              * カード収集でステータスが永続加算されます。
            </p>
          </div>

          {/* 右：部門別コレクション率兼小カテゴリフィルター */}
          {activeTab === 'story' ? (
            <div className="lg:col-span-8 bg-[#2d1b11] p-5 border-2 border-amber-800 rounded-2xl shadow-lg flex flex-col justify-between text-amber-100">
              <div>
                <h2 className="text-xs font-black tracking-wider text-amber-200 uppercase flex items-center gap-1.5 border-b border-amber-800/40 pb-2 mb-3">
                  <span>📖</span>
                  <span>魔導書の記憶（ストーリーの解放状況）</span>
                </h2>
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-amber-300">
                    現在のプレイヤーレベル: <span className="text-yellow-400 font-black text-sm">Lv {playerLevel}</span>
                  </p>
                  <p className="leading-relaxed text-[11px] text-amber-200/90">
                    魔導書に刻まれた失われた記憶は、あなたのレベルが上がるごとに1頁ずつ解放されていきます。<br />
                    第1頁は <span className="text-yellow-400 font-bold">Lv 2</span> で解放され、最終的に <span className="text-yellow-400 font-bold">Lv 99</span> ですべての頁（全98頁）が紡がれます。
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-[#1d110a] p-3 rounded-xl border border-amber-900/60 mt-3">
                <span className="text-[10px] font-black text-amber-400">解放済みストーリー数</span>
                <span className="text-xs font-mono font-black text-yellow-300 bg-[#28180f] px-3 py-1 rounded-full border border-amber-850">
                  {STORY_CARDS.filter(s => playerLevel >= s.unlockLevel).length} / {STORY_CARDS.length} 頁
                </span>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 bg-white/90 p-4 border border-blue-200 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-blue-100 pb-2 mb-2">
                  <h2 className="text-xs font-black tracking-wider text-blue-900 uppercase flex items-center gap-1.5">
                    <span>✦</span>
                    <span>小カテゴリ進捗（クリックして絞り込み）</span>
                  </h2>
                  {activeSubTab !== 'all' && (
                    <button
                      onClick={() => setActiveSubTab('all')}
                      className="text-[9.5px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200 font-extrabold transition-colors cursor-pointer"
                    >
                      フィルター解除 ✕
                    </button>
                  )}
                </div>

                {/* 横スクロールまたはラップする小カテゴリ進捗バッジ */}
                <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto pr-1">
                  {activeSubcategories.map(cluster => {
                    const totalCards = cluster.cardIds.length;
                    const collectedInCluster = cluster.cardIds.filter(id => collectedIds.includes(id)).length;
                    const completed = totalCards === collectedInCluster;
                    const isSelected = activeSubTab === cluster.id;

                    return (
                      <button
                        key={cluster.id}
                        onClick={() => setActiveSubTab(isSelected ? 'all' : cluster.id)}
                        className={`text-left p-1.5 px-3 rounded-xl border text-[10.5px] transition-all cursor-pointer flex-1 min-w-[130px] max-w-[210px] ${
                          isSelected
                            ? 'bg-blue-600 border-blue-700 text-white font-extrabold shadow-sm'
                            : completed
                            ? 'bg-blue-50 border-blue-300 text-slate-900 font-bold hover:bg-blue-105'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1.5">
                          <span className="truncate font-black max-w-[110px]">{cluster.name}</span>
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-black font-mono ${
                            isSelected 
                              ? 'bg-blue-800 text-yellow-300' 
                              : completed 
                              ? 'bg-blue-200 text-blue-850' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {collectedInCluster}/{totalCards}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-[8.5px] text-slate-450 mt-1.5 font-bold leading-none">
                * 部門バッジをタップすると、その小カテゴリの用語カードだけを素早くグリッドにフィルタ表示します。
              </p>
            </div>
          )}

        </div>

        {/* コレクションカード表示領域（フル幅） */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          
          {/* 大カテゴリ切り替えタブ */}
          <div className="bg-white/95 border border-blue-200 rounded-xl flex overflow-x-auto p-1 shrink-0 shadow-sm select-none">
            <button
              onClick={() => handleSetMainTab('all')}
              className={`py-2 px-5 rounded-lg font-black text-[10.5px] uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-650 hover:bg-slate-100'
              }`}
            >
              すべて表示
            </button>
            {quizCategories.map(cat => {
              const cleanedTitle = cat.title.replace(/^[⑴⑵⑶]\s*/, '');
              const isSelected = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSetMainTab(cat.id)}
                  className={`py-2 px-4 rounded-lg font-black text-[10.5px] shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-650 hover:bg-slate-100'
                  }`}
                >
                  {cleanedTitle}
                </button>
              );
            })}
            <button
              onClick={() => handleSetMainTab('story')}
              className={`py-2 px-4 rounded-lg font-black text-[10.5px] shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'story'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-650 hover:bg-amber-55 hover:text-amber-800'
              }`}
            >
              📖 ストーリー
            </button>
          </div>

          {/* 広範なカードグリッドエリア */}
          <div className="bg-white/45 backdrop-blur-xs p-4 border border-blue-200/50 rounded-2xl flex-1 shadow-inner relative overflow-y-auto scrollbar-thin space-y-6">
            
            {activeTab === 'story' ? (
              /* ================== ストーリー表示 ================== */
              <div className="space-y-4">
                <div className="border-b-2 border-amber-700/80 pb-1.5 flex items-center justify-between">
                  <h3 className="text-xs md:text-[13px] font-black text-amber-950 tracking-wider">
                    📖 魔導書ストーリー（レベルアップで解放）
                  </h3>
                  <span className="text-[10px] font-mono font-extrabold bg-amber-150 text-amber-850 px-2.5 py-0.5 rounded-full shrink-0">
                    解放: {STORY_CARDS.filter(s => playerLevel >= s.unlockLevel).length} / {STORY_CARDS.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                  {STORY_CARDS.map(story => {
                    const unlocked = playerLevel >= story.unlockLevel;

                    return (
                      <button
                        key={story.id}
                        onClick={() => {
                          if (unlocked) {
                            setSelectedStoryCard(story);
                          }
                        }}
                        className={`group relative rounded-2xl border text-left p-5 flex flex-col justify-between transition-all duration-300 min-h-[225px] shadow-sm select-none ${
                          unlocked
                            ? 'bg-gradient-to-br from-amber-55 to-orange-100/60 border-2 border-amber-600/80 text-amber-950 hover:-translate-y-1.5 hover:shadow-xl hover:border-amber-500 cursor-pointer'
                            : 'bg-slate-100/55 border-dashed border-slate-300 border-2 text-slate-400'
                        }`}
                        id={`story-card-${story.id}`}
                      >
                        {!unlocked ? (
                          <div className="absolute inset-0 bg-slate-100/50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 rounded-2xl">
                            <span className="text-lg mb-1">🔒</span>
                            <span className="text-xs font-mono text-slate-400 font-black tracking-widest">第 {story.page} 頁</span>
                            <span className="text-[10px] font-extrabold text-amber-700 mt-2 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 text-center">
                              Lv {story.unlockLevel} で解放
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col h-full w-full justify-between gap-3 z-10 font-sans">
                            {/* 上段：魔導書デザインヘッダー */}
                            <div className="flex justify-between items-center w-full pb-1.5 border-b border-amber-300/60 text-[10px] font-mono tracking-wide">
                              <span className="text-amber-850 font-black px-1.5 py-0.5 bg-amber-100 border border-amber-200 rounded">
                                📖 第 {story.page} 頁
                              </span>
                              <span className="text-amber-700/80 font-bold">ストーリー</span>
                            </div>

                            {/* メイン部分：本をモチーフにしたデザイン */}
                            <div className="flex items-center gap-3 my-0.5">
                              <span className="text-3xl text-amber-700">📜</span>
                              <div className="flex flex-col min-w-0">
                                <h4 className="font-extrabold text-[13.5px] text-amber-950 group-hover:text-amber-800 transition-colors leading-tight tracking-wide truncate">
                                  {story.title}
                                </h4>
                              </div>
                            </div>

                            {/* 中段：本文の一部 */}
                            <p className="text-[11px] text-amber-900/95 font-medium leading-relaxed line-clamp-4 bg-amber-50/50 border border-amber-250 p-3 rounded-xl font-serif flex-1 whitespace-pre-line">
                              {story.content}
                            </p>

                            {/* 下段：タップ案内 */}
                            <div className="text-[9px] font-sans bg-amber-100/40 border border-amber-200/40 px-2 py-1 rounded-lg text-center text-amber-800 font-black w-full shadow-inner leading-none">
                              タップして全文を読む
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ================== 通常の用語カード表示（ストーリーは除外） ================== */
              quizCategories
                .filter(cat => activeTab === 'all' || activeTab === cat.id)
                .map(cat => {
                  // サブカテゴリフィルタ適用
                  const targetSubs = cat.subcategories.filter(sub => activeSubTab === 'all' || sub.id === activeSubTab);
                  if (targetSubs.length === 0) return null;

                  const catCompleteTotal = cat.subcategories.reduce((acc, sub) => acc + TERM_CARDS.filter(c => c.clusterId === sub.id && collectedIds.includes(c.id)).length, 0);
                  const catCardsTotal = cat.subcategories.reduce((acc, sub) => acc + TERM_CARDS.filter(c => c.clusterId === sub.id).length, 0);

                  return (
                    <div key={cat.id} className="space-y-3.5">
                      {/* 大カテゴリ見だし */}
                      <div className="border-b-2 border-blue-700/80 pb-1.5 flex items-center justify-between">
                        <h3 className="text-xs md:text-[13px] font-black text-blue-950 tracking-wider">
                          📂 {cat.title}
                        </h3>
                        <span className="text-[10px] font-mono font-extrabold bg-blue-150 text-blue-850 px-2.5 py-0.5 rounded-full shrink-0">
                          収集: {catCompleteTotal} / {catCardsTotal}
                        </span>
                      </div>

                      {/* サブカテゴリごとのカード一覧 */}
                      <div className="space-y-4">
                        {targetSubs.map(sub => {
                          const subCards = TERM_CARDS.filter(card => card.clusterId === sub.id);
                          if (subCards.length === 0) return null;

                          const subCollectedCount = subCards.filter(c => collectedIds.includes(c.id)).length;

                          return (
                            <div key={sub.id} className="bg-white/90 border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h4 className="font-extrabold text-[11.5px] md:text-xs tracking-wider text-blue-905 flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-md bg-blue-105 text-blue-800 flex items-center justify-center font-mono text-[9px] font-black">{sub.id}</span>
                                  <span>{sub.title}</span>
                                </h4>
                                <span className="text-[9.5px] font-bold text-slate-500 font-mono">
                                  (収集: {subCollectedCount} / {subCards.length})
                                </span>
                              </div>

                              {/* 極めて見やすいフルサイズグリッド。サイズを大きく拡大 */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
                                {subCards.map(card => {
                                  const collected = collectedIds.includes(card.id);
                                  const count = collectedIds.filter(id => id === card.id).length;
                                  const rarityStyle = getRarityCardStyle(card.rarity);

                                  return (
                                    <button
                                      key={card.id}
                                      onClick={() => {
                                        if (collected) {
                                          setSelectedCard(card);
                                          setVersionIndex(0); // Reset switcher to stage 1
                                        }
                                      }}
                                      className={`group relative rounded-2xl border text-left p-5 flex flex-col justify-between transition-all duration-300 min-h-[225px] shadow-sm select-none ${
                                        collected
                                          ? `${rarityStyle} hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-500 cursor-pointer`
                                          : 'bg-slate-100/55 border-dashed border-slate-300 border-2 text-slate-400'
                                      }`}
                                      id={`collect-card-${card.id}`}
                                    >
                                      {!collected ? (
                                        <div className="absolute inset-0 bg-slate-100/50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 rounded-2xl">
                                          <HelpCircle size={22} className="text-slate-300 animate-pulse mb-1.5" />
                                          <span className="text-sm font-mono text-slate-400 font-black tracking-widest">？？？？</span>
                                          <span className="text-[10px] font-semibold text-slate-400 mt-1.5 text-center leading-tight">
                                            バトルに勝利すると開放
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col h-full w-full justify-between gap-3 z-10 font-sans">
                                          {/* 上段：レア度 & 部門 */}
                                          <div className="flex justify-between items-center w-full pb-1.5 border-b border-slate-150 text-[10px] font-mono tracking-wide">
                                            <span className={getRarityBadgeColor(card.rarity)}>
                                              {getRarityText(card.rarity)}
                                            </span>
                                            <div className="text-slate-500 font-bold text-[9.5px] flex items-center gap-1 max-w-[100px] sm:max-w-[125px] min-w-0 shrink-0 justify-end select-none">
                                              {count > 1 && (
                                                <span className="px-1 py-0.5 bg-yellow-400 text-slate-950 border border-yellow-500 font-black rounded text-[8px] scale-90 shrink-0">
                                                  x{count}
                                                </span>
                                              )}
                                              <span className="truncate block font-sans">
                                                {CLUSTERS.find(c => c.id === card.clusterId)?.name}
                                              </span>
                                            </div>
                                          </div>

                                          {/* メイン部分：絵文字枠と見出しを大きく */}
                                          <div className="flex items-center gap-3.5 my-0.5">
                                            <div className="w-18 h-18 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-4.5xl shrink-0 font-mono shadow-inner">
                                              {getTermEmoji(card.id)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <h4 className="font-extrabold text-[14.5px] text-slate-950 group-hover:text-blue-900 transition-colors leading-tight font-sans tracking-wide">
                                                {card.name}
                                              </h4>

                                            </div>
                                          </div>

                                          {/* 中段：勉強のための用語定義の視認性向上 */}
                                          <p className="text-[11.5px] text-slate-750 font-bold leading-relaxed line-clamp-3 bg-slate-100 border border-slate-200/60 p-3 rounded-xl font-sans flex-1">
                                            {card.definition}
                                          </p>

                                          {/* 下段：バフ 表記を「永続効果」に統一 */}
                                          <div className="text-[9.5px] font-mono bg-slate-100 border border-slate-205 px-2.5 py-1 rounded-lg flex justify-between items-center mt-auto w-full shadow-inner">
                                            <span className="text-slate-500 font-sans font-black">永続効果:</span>
                                            <span className="text-indigo-850 font-black flex gap-1 flex-wrap justify-end">
                                              {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 0.5).toFixed(1)}` : ''}
                                              {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 0.5).toFixed(1)}` : ''}
                                              {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 0.5).toFixed(1)}%` : ''}
                                              {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* モーダル：カード詳細ビュー（全画面全体に超大きく＆極めて視認性の高いダイナミック仕様） */}
      {selectedCard && (() => {
        const modalCount = collectedIds.filter(id => id === selectedCard.id).length;
        const displayDef = (selectedCard.descriptions && selectedCard.descriptions[versionIndex]) || selectedCard.definition;
        const displayFlavor = (selectedCard.flavorTexts && selectedCard.flavorTexts[versionIndex]) || selectedCard.flavorText;

        const shadowEffect = 
          selectedCard.rarity === 'LG' ? 'border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.85)]' :
          selectedCard.rarity === 'UR' ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.75)]' :
          selectedCard.rarity === 'SR' ? 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.65)]' :
          selectedCard.rarity === 'UC' ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.55)]' :
          'border-indigo-200 shadow-md';

        return (
          <div 
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fade-in cursor-pointer"
            onClick={() => setSelectedCard(null)}
          >
            {/* レアリティに応じた極上の美麗背景エフェクト */}
            <div className={`absolute inset-0 pointer-events-none mix-blend-screen opacity-50 ${
              selectedCard.rarity === 'LG' ? 'bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedCard.rarity === 'UR' ? 'bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedCard.rarity === 'SR' ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.5)_0%,transparent_75%)] animate-pulse' :
              selectedCard.rarity === 'UC' ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.5)_0%,transparent_75%)] animate-pulse' :
              ''
            }`} />

            <div 
              className={`bg-white border-8 ${shadowEffect} rounded-2xl max-w-sm md:max-w-md w-full p-6 md:p-8 relative flex flex-col gap-5 text-left text-slate-900 overflow-hidden font-sans m-auto animate-scale-up`}
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* 装飾コーナー */}
              <div className="absolute top-0 left-0 w-2 h-16 bg-gradient-to-b from-blue-500 to-transparent"></div>
              <div className="absolute top-0 left-0 h-2.5 w-16 bg-gradient-to-r from-blue-500 to-transparent"></div>
              <div className="absolute bottom-0 right-0 w-2 h-16 bg-gradient-to-t from-blue-500 to-transparent"></div>
              <div className="absolute bottom-0 right-0 h-2.5 w-16 bg-gradient-to-l from-blue-500 to-transparent"></div>

              <div className="flex flex-col items-center gap-1.5 z-10 text-center">
                <span className={`text-xs font-black py-1 px-4 bg-indigo-50 border border-indigo-200 text-indigo-750 rounded-full shadow-xs tracking-wider uppercase flex items-center gap-2`}>
                  <span>{getRarityText(selectedCard.rarity)}</span>
                  {modalCount > 1 && (
                    <span className="px-2 py-0.5 bg-yellow-405 text-slate-900 font-extrabold text-[10px] rounded-md shadow-xs animate-bounce">
                      x{modalCount}枚所持
                    </span>
                  )}
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-wider flex items-center gap-4 justify-center mt-3">
                  <span className="p-3.5 bg-slate-50 border-2 border-slate-205 rounded-2xl select-none shadow-md text-5xl md:text-6xl leading-none shrink-0">{getTermEmoji(selectedCard.id)}</span>
                  <span className="text-blue-900 font-extrabold">{selectedCard.name}</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold pb-2 border-b border-slate-100 w-full mt-2 uppercase tracking-widest">
                  分類: {CLUSTERS.find(c => c.id === selectedCard.clusterId)?.name}
                </p>
              </div>

              {/* 3つの説明文ビジュアルタブ・スイッチャー */}
              <div className="flex flex-col gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[1, 2, 3].map((vNum) => {
                    const isUnlocked = modalCount >= vNum;
                    const isSelected = versionIndex === vNum - 1;
                    return (
                      <button
                        key={vNum}
                        onClick={() => isUnlocked && setVersionIndex(vNum - 1)}
                        disabled={!isUnlocked}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-black transition-all flex items-center justify-center gap-1 ${
                          isSelected
                             ? 'bg-blue-650 text-white shadow-md border border-blue-700'
                            : isUnlocked
                            ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 cursor-pointer shadow-xs'
                            : 'bg-slate-200 text-slate-405 cursor-not-allowed border border-transparent'
                        }`}
                        title={isUnlocked ? `詳細情報 Ver.${vNum} を切り替えます` : `同名カードが ${vNum} 枚になると解放されます`}
                      >
                        <span>Ver.{vNum}</span>
                        {!isUnlocked && <span>🔒</span>}
                      </button>
                    );
                  })}
                </div>
                {modalCount < 3 && (
                  <p className="text-[9.5px] text-blue-600 font-bold text-center animate-pulse">
                    ※ 同名カードをさらに獲得すると、Ver.2 / Ver.3 のデータが解放！
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-left flex flex-col gap-3.5 z-10 shadow-inner">
                <span className="text-[10px] md:text-xs text-indigo-600 font-bold tracking-wider uppercase flex items-center gap-1 font-sans">
                  <span>◆ DATA [Ver.{versionIndex + 1}] ◆</span>
                </span>
                <p className="text-sm md:text-base text-slate-800 leading-relaxed font-bold font-sans">
                  {displayDef}
                </p>
                
                {/* 補足解説などの不要なラベルを除き、フレーバー定義を美しく見せる */}
                {displayFlavor && (
                  <div className="text-[10px] text-slate-405 italic leading-relaxed border-t border-slate-200 pt-3 mt-1 flex flex-col gap-1 inline-block font-sans">
                    <span className="text-xs text-slate-500 font-semibold leading-relaxed not-italic font-sans">{displayFlavor}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-4 z-10 font-sans">
                <div className="text-xs font-bold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2 font-mono">
                  <div className="flex justify-between items-center text-blue-800 border-b border-slate-200 pb-1.5 text-[11px]">
                    <span className="font-sans font-bold">常時図鑑ボーナス (パッシブ効果):</span>
                    <span className="font-mono text-blue-900 font-extrabold text-[10px]">
                      {selectedCard.statsBonus.hp ? `HP +${(selectedCard.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                      {selectedCard.statsBonus.attack ? `ATK +${(selectedCard.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                      {selectedCard.statsBonus.xpBonus ? `XP +${(selectedCard.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                      {selectedCard.statsBonus.timerBonus ? `Time +${(selectedCard.statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 text-[11px]">
                    <span className="font-sans font-bold">アクティブ装備時効果 (冒険中のみ):</span>
                    <span className="font-mono text-emerald-600 font-bold text-[10px]">
                      {selectedCard.statsBonus.hp ? `HP +${(selectedCard.statsBonus.hp * 15).toFixed(0)} ` : ''}
                      {selectedCard.statsBonus.attack ? `ATK +${(selectedCard.statsBonus.attack * 15).toFixed(1)} ` : ''}
                      {selectedCard.statsBonus.xpBonus ? `XP +${(selectedCard.statsBonus.xpBonus * 15).toFixed(0)}% ` : ''}
                      {selectedCard.statsBonus.timerBonus ? `Time +${(selectedCard.statsBonus.timerBonus * 15).toFixed(0)}秒` : ''}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:brightness-110 text-white font-extrabold rounded-xl shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider text-center border border-blue-400"
                  id="close-detail-modal"
                >
                  [ 閉じる ]
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* モーダル：ストーリーカード詳細ビュー（魔導書専用の美しいデザイン） */}
      {selectedStoryCard && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fade-in cursor-pointer"
          onClick={() => setSelectedStoryCard(null)}
        >
          {/* 美しい魔導書を思わせる背景エフェクト */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.25)_0%,transparent_75%)] pointer-events-none mix-blend-screen opacity-60" />

          <div 
            className="bg-[#faf6ee] border-8 border-amber-800 shadow-[0_0_50px_rgba(139,94,26,0.6)] rounded-3xl max-w-sm md:max-w-md w-full p-6 md:p-8 relative flex flex-col gap-6 text-left text-amber-950 overflow-hidden font-serif m-auto animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 装飾コーナー */}
            <div className="absolute top-2 left-2 text-amber-800/40 text-xl pointer-events-none">✦</div>
            <div className="absolute top-2 right-2 text-amber-800/40 text-xl pointer-events-none">✦</div>
            <div className="absolute bottom-2 left-2 text-amber-800/40 text-xl pointer-events-none">✦</div>
            <div className="absolute bottom-2 right-2 text-amber-800/40 text-xl pointer-events-none">✦</div>

            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b-2 border-amber-800/40 pb-2">
              <span className="text-xs font-bold font-sans tracking-widest text-amber-850 px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-lg shadow-inner">
                📖 第 {selectedStoryCard.page} 頁
              </span>
              <span className="text-xs font-mono text-amber-700/80 font-bold uppercase tracking-widest font-sans">
                Ancient Story
              </span>
            </div>

            {/* タイトル */}
            <div className="text-center py-1">
              <h2 className="text-lg md:text-xl font-black text-amber-950 font-serif tracking-wider leading-relaxed border-b border-amber-800/20 pb-2">
                {selectedStoryCard.title}
              </h2>
            </div>

            {/* 本文エリア */}
            <div className="bg-[#fcfaf2] border border-amber-900/10 p-5 md:p-6 rounded-2xl shadow-inner min-h-[160px] flex items-center justify-center">
              <p className="text-[13px] md:text-sm text-amber-900 font-medium leading-loose tracking-wide whitespace-pre-line text-justify font-serif">
                {selectedStoryCard.content}
              </p>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={() => setSelectedStoryCard(null)}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-extrabold rounded-xl border-2 border-amber-900/60 shadow-md active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-widest text-center font-sans"
            >
              [ 魔導書を閉じる ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
