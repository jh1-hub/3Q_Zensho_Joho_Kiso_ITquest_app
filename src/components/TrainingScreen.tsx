/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Flame, Compass, Swords, Trophy, Sparkles } from 'lucide-react';
import { quizCategories } from '../data/problems';

interface TrainingScreenProps {
  onBack: () => void;
  onStartCategoryTraining: (categoryId: string) => void;
  onStartSubcategoryTraining: (subcategoryId: string) => void;
  onStartDrillTraining: () => void;
}

export default function TrainingScreen({ 
  onBack, 
  onStartCategoryTraining, 
  onStartSubcategoryTraining,
  onStartDrillTraining 
}: TrainingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-100 to-sky-100 text-slate-900 p-4 md:p-8 flex flex-col font-sans select-none relative overflow-auto border-t-8 border-emerald-600">
      
      {/* 優しい王道ファンタジーを感じる陽光 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.73)_0%,transparent_85%)] pointer-events-none"></div>
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-teal-200/35 rounded-full blur-3xl pointer-events-none"></div>
 
      {/* 画面を囲う枠線 */}
      <div className="absolute inset-3 border border-emerald-300/40 pointer-events-none rounded-2xl"></div>

      {/* ヘッダー */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-6 z-10 border-b-2 border-emerald-200/60 pb-4 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-100 font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
          id="training-back-btn"
        >
          <ArrowLeft size={15} />
          <span> もどる </span>
        </button>
        <h1 className="text-xl md:text-2xl font-black tracking-wider flex items-center gap-2.5 text-emerald-950 font-sans">
          <Flame className="text-emerald-600 animate-pulse" size={26} />
          <span>しゅぎょう場</span>
        </h1>
        <div className="text-xs font-bold text-emerald-950 bg-emerald-100/90 border-2 border-emerald-200 px-3.5 py-1.5 rounded-full shadow-sm">
          特別修練所
        </div>
      </div>

      {/* メイン ギルドコンテナ */}
      <div className="max-w-3xl w-full mx-auto bg-white/95 backdrop-blur-md border-3 border-emerald-600 rounded-3xl p-6 md:p-8 shadow-xl z-10 flex flex-col gap-8">
        
        {/* たんれんセクション（苦手克服） */}
        <div className="bg-indigo-50/90 border-3 border-indigo-200 p-5 md:p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-150 border-2 border-indigo-300 rounded-xl flex items-center justify-center text-indigo-700 shrink-0 shadow-md">
              <Trophy size={20} className="animate-bounce text-indigo-650" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-indigo-950 leading-none">たんれん（苦手克服・弱点修練）</h3>
                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-red-400 animate-pulse tracking-wide select-none">推奨</span>
              </div>
              <span className="text-[8.5px] text-indigo-650 font-mono font-black block mt-1 uppercase tracking-wider">// SYSTEMATIC DRILL TRAINING</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-bold">
            まだ解いていない問題、間違えた問題から優先して出題される特訓モードです。
          </p>

          <button
            onClick={onStartDrillTraining}
            className="w-full py-4.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-705 text-white font-black rounded-xl border-2 border-indigo-400 shadow-md hover:shadow-lg active:scale-98 cursor-pointer transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base tracking-wide"
            id="start-drill-btn"
          >
            <Swords size={18} className="fill-white animate-pulse text-yellow-300" />
            <span>「たんれん」する</span>
          </button>
        </div>

        {/* 区切り線（ビジュアル） */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t-2 border-emerald-150"></div>
          <span className="flex-shrink mx-4 text-xs text-emerald-800 font-mono font-black uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
            <Sparkles size={12} className="text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>カテゴリ別の修行</span>
          </span>
          <div className="flex-grow border-t-2 border-emerald-150"></div>
        </div>

        {/* しゅぎょうカテゴリ一覧 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-emerald-100 border-2 border-emerald-300 rounded-xl flex items-center justify-center text-emerald-700 shrink-0 shadow-sm animate-none">
              <Compass size={20} className="animate-spin text-emerald-800" style={{ animationDuration: '30s' }} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-emerald-950 leading-none font-sans">分野別しゅぎょう場</h3>
              <span className="text-[8.5px] text-emerald-700 font-mono font-black block mt-1 uppercase tracking-wider">// DISCIPLINE BY TOPIC</span>
            </div>
          </div>

          {/* カテゴリ選択リスト */}
          <div className="space-y-5">
            {quizCategories.map(cat => {
              const cleanedTitle = cat.title.replace(/^[⑴⑵⑶]\s*/, '');
              return (
                <div
                  key={cat.id}
                  className="p-5 md:p-6 bg-gradient-to-br from-emerald-50/45 to-teal-50/35 border-2 border-emerald-250 rounded-2xl transition-all shadow-xs flex flex-col gap-4"
                  id={`start-cat-panel-${cat.id}`}
                >
                  {/* カテゴリヘッダー */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-6.5 h-6.5 rounded-lg bg-emerald-700 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md">
                      {cat.id}
                    </div>
                    <span className="text-sm sm:text-base font-black text-emerald-950 truncate block">
                      {cleanedTitle}
                    </span>
                  </div>

                  {/* 大カテゴリボタン */}
                  <button
                    onClick={() => onStartCategoryTraining(cat.id)}
                    className="w-full text-left py-3.5 px-4.5 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer shadow-md active:scale-98 text-xs sm:text-sm"
                    id={`start-cat-btn-${cat.id}`}
                  >
                    <span className="font-extrabold flex items-center gap-2 text-white">
                      ⚔️ 「しゅぎょう」する
                    </span>
                    <span className="bg-emerald-800 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-500/30">挑戦する ⚡</span>
                  </button>

                  {/* 小カテゴリボタン群 */}
                  <div className="pt-3.5 border-t border-emerald-200/50 flex flex-col gap-2.5">
                    <div className="text-[10px] text-emerald-800 font-black flex items-center gap-1 uppercase tracking-wider leading-none">
                      <span>細分化された小カテゴリを選択して修行:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.subcategories.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => onStartSubcategoryTraining(sub.id)}
                          className="w-full text-left py-3.5 px-4 bg-white hover:bg-emerald-50/70 border-2 border-slate-200 hover:border-emerald-400 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                          id={`start-sub-btn-${sub.id}`}
                        >
                          <span className="text-slate-800 group-hover:text-emerald-950 font-extrabold text-[11.5px] sm:text-xs truncate mr-2 flex-grow">
                            {sub.title}
                          </span>
                          <span className="text-[10px] font-bold font-mono text-emerald-600 shrink-0 bg-emerald-50/80 group-hover:bg-emerald-100/90 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            Go ⚡
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="text-[10px] text-slate-550 border-t border-slate-150 pt-4 font-bold text-center shrink-0">
          ※ ここでIT用語の基本概念を繰り返し特訓し、基礎力を高めましょう。
        </div>
      </div>

      {/* フッター */}
      <div className="max-w-3xl w-full mx-auto flex justify-center py-6 border-t border-emerald-200/40 z-10 text-emerald-800/40 font-mono font-black text-[9px] tracking-wider uppercase mt-6 shrink-0">
        IT QUEST // TRAINING GROUND AP-STUDY SYSTEMS
      </div>
    </div>
  );
}
