/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { StoryCard } from '../data/stories';

interface StoryUnlockModalProps {
  unlockedStories: StoryCard[];
  currentLevel: number;
  onClose: () => void;
}

export default function StoryUnlockModal({
  unlockedStories,
  currentLevel,
  onClose
}: StoryUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  if (unlockedStories.length === 0) return null;

  const currentStory = unlockedStories[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < unlockedStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 z-50 select-none overflow-y-auto">
      {/* Backlight effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)] pointer-events-none mix-blend-screen" />

      {/* Sparkling particle effects around */}
      <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-amber-400 rounded-full animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white rounded-full animate-ping pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-orange-400 rounded-full animate-pulse pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="relative max-w-lg w-full flex flex-col gap-6 text-center my-auto px-1"
      >
        {/* Main Level Up Header */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-500 via-yellow-405 to-orange-500 p-0.5 rounded-full shadow-lg"
          >
            <span className="bg-slate-950 text-yellow-300 font-mono font-black text-[10px] md:text-xs px-4 py-1 rounded-full tracking-widest uppercase flex items-center gap-1.5">
              <Sparkles className="text-yellow-300 animate-spin" size={13} />
              COLLECTOR LEVEL UP!
            </span>
          </motion.div>

          <motion.h2
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)] tracking-wider mt-1"
          >
            コレクターレベル Lv.{currentLevel}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-amber-200 text-xs md:text-sm font-bold tracking-wide"
          >
            魔導書に新たな記憶が {unlockedStories.length} 頁刻まれました！
          </motion.p>
        </div>

        {/* Parchment Book Layout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStory.id}
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-[#faf6ee] border-8 border-amber-800 shadow-[0_0_60px_rgba(139,94,26,0.7)] rounded-3xl p-6 md:p-8 relative flex flex-col gap-5 text-left text-amber-950 font-serif overflow-hidden w-full select-none"
            style={{ perspective: 1000 }}
          >
            {/* Decors */}
            <div className="absolute top-2.5 left-2.5 text-amber-800/40 text-xs select-none">✦</div>
            <div className="absolute top-2.5 right-2.5 text-amber-800/40 text-xs select-none">✦</div>
            <div className="absolute bottom-2.5 left-2.5 text-amber-800/40 text-xs select-none">✦</div>
            <div className="absolute bottom-2.5 right-2.5 text-amber-800/40 text-xs select-none">✦</div>

            {/* Header inside grimoire */}
            <div className="flex justify-between items-center border-b-2 border-amber-800/40 pb-2">
              <span className="text-[10px] md:text-xs font-bold font-sans tracking-widest text-amber-850 px-3 py-1 bg-amber-100 border border-amber-200 rounded-lg shadow-inner">
                📖 第 {currentStory.page} 頁
              </span>
              <span className="text-[10px] font-mono text-amber-700/80 font-extrabold uppercase tracking-widest font-sans">
                Lost Memory
              </span>
            </div>

            {/* Title inside grimoire */}
            <div className="text-center py-1">
              <h3 className="text-base md:text-lg font-black text-amber-950 tracking-wider leading-relaxed border-b border-amber-800/20 pb-2.5">
                {currentStory.title.replace(/^第\d+頁\s*　?/, '')}
              </h3>
            </div>

            {/* Story Text Area inside grimoire */}
            <div className="bg-[#fcfaf2] border border-amber-900/10 p-5 md:p-6 rounded-2xl shadow-inner min-h-[160px] flex items-center justify-center">
              <p className="text-[12.5px] md:text-sm text-amber-900 font-medium leading-loose tracking-wide whitespace-pre-line text-justify font-serif">
                {currentStory.content}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pager controls (if multiple stories are unlocked) */}
        {unlockedStories.length > 1 && (
          <div className="flex justify-center items-center gap-4 text-white">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`p-2 rounded-full border bg-slate-900/80 transition-all ${
                currentIndex === 0
                  ? 'opacity-30 cursor-not-allowed border-slate-700 text-slate-500'
                  : 'hover:bg-slate-800 border-amber-500 text-amber-400 active:scale-90 cursor-pointer'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs md:text-sm font-mono font-bold text-amber-200">
              {currentIndex + 1} / {unlockedStories.length} 頁
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === unlockedStories.length - 1}
              className={`p-2 rounded-full border bg-slate-900/80 transition-all ${
                currentIndex === unlockedStories.length - 1
                  ? 'opacity-30 cursor-not-allowed border-slate-700 text-slate-500'
                  : 'hover:bg-slate-800 border-amber-500 text-amber-400 active:scale-90 cursor-pointer'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-2xl hover:brightness-110 active:scale-95 transition-all cursor-pointer text-xs md:text-sm uppercase tracking-widest text-center border-2 border-amber-500 font-sans flex items-center justify-center gap-2"
        >
          <BookOpen size={16} />
          <span>[ 記憶を心に刻み、冒険を続ける ]</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
