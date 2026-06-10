/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Zap, RotateCcw, Home, Award, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Volume2, Sparkles, Flame, Check, X } from 'lucide-react';
import { RawProblem, ActiveProblem, GameStats } from '../types';
import { RAW_PROBLEMS } from '../data/problems';
import { generateActiveProblem, shuffleArray } from '../utils/gameHelpers';
import { motion, AnimatePresence } from 'motion/react';

interface TimeAttackScreenProps {
  onClose: () => void;
  gameStats: GameStats;
  onUpdateStats: (updatedStats: GameStats) => void;
}

export default function TimeAttackScreen({ onClose, gameStats, onUpdateStats }: TimeAttackScreenProps) {
  // ゲームのサブステート: 'intro' | 'playing' | 'result'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');

  // 開始前カウントダウン (3, 2, 1, START!)
  const [startCountdown, setStartCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  // 主要メトリクス
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);

  // 時間増減のエフェクト用ステート
  const [timeBonusEffect, setTimeBonusEffect] = useState<{ amount: number; key: number } | null>(null);
  
  // スコア倍率表示用
  const [scoreNotification, setScoreNotification] = useState<{ amount: number; comboBonus: number; key: number } | null>(null);

  // 問題管理
  const [problemPool, setProblemPool] = useState<RawProblem[]>([]);
  const [currentPoolIndex, setCurrentPoolIndex] = useState<number>(0);
  const [activeProblem, setActiveProblem] = useState<ActiveProblem | null>(null);

  // 回答アニメーション管理
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // ハイスコア通知用
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // BGM/効果音的なテンション維持のためのオーディオ・フィードバック用（合成音声などの実装も検討できますが、今回はシンプルな音響API Web Audio APIでビープ音を作成して楽しさを引き立てます）
  const playSound = (type: 'correct' | 'wrong' | 'comboUp' | 'superCombo' | 'tick' | 'timesUp' | 'start') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime); 
        osc.frequency.setValueAtTime(130, ctx.currentTime + 0.15); 
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'comboUp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'superCombo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.06);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.18); // C6
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'timesUp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(165, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // AudioContext is blocked or not supported
    }
  };

  // 1. カウントダウンでスタートする
  const startTimerAndGame = () => {
    setIsCounting(true);
    setStartCountdown(3);
    setProblemPool(shuffleArray([...RAW_PROBLEMS]));
    setCurrentPoolIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCombo(0);
    setMaxCombo(0);
    setTotalAnswered(0);
    setTimeRemaining(30);
    setGameState('intro');
  };

  useEffect(() => {
    if (gameState === 'intro' && isCounting) {
      const interval = setInterval(() => {
        setStartCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsCounting(false);
            setGameState('playing');
            playSound('start');
            return 0;
          }
          playSound('tick');
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, isCounting]);

  // 2. クイズの問題を設定・生成する
  useEffect(() => {
    if (gameState === 'playing' && problemPool.length > 0 && activeProblem === null) {
      const rawProblem = problemPool[currentPoolIndex];
      // 50% の確率で 'term_to_def' または 'def_to_term'
      const type = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term';
      const prob = generateActiveProblem(rawProblem, type, 4, RAW_PROBLEMS);
      setActiveProblem(prob);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
    }
  }, [gameState, problemPool, currentPoolIndex, activeProblem]);

  // 3. ゲーム本編の残り時間監視
  useEffect(() => {
    if (gameState === 'playing') {
      const timerInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            handleTimesUp();
            return 0;
          }
          if (prev <= 6) {
            playSound('tick');
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [gameState]);

  // 時間切れ終了
  const handleTimesUp = () => {
    playSound('timesUp');
    setGameState('result');
    
    // スコアの保存判定
    const currentHighScore = gameStats.timeAttackHighScore || 0;
    const currentMaxCombo = gameStats.timeAttackMaxCombo || 0;
    
    let isNew = false;
    let updatedHighScore = currentHighScore;
    let updatedMaxCombo = currentMaxCombo;

    if (score > currentHighScore) {
      updatedHighScore = score;
      isNew = true;
      setIsNewRecord(true);
    }

    if (maxCombo > currentMaxCombo) {
      updatedMaxCombo = maxCombo;
    }

    // ゲーム全体の統計データをアップデート
    const newStats: GameStats = {
      ...gameStats,
      timeAttackHighScore: updatedHighScore,
      timeAttackMaxCombo: updatedMaxCombo,
      attempts: gameStats.attempts + 1,
    };

    onUpdateStats(newStats);
  };

  // 4. 解答選択肢がクリックされた時記述。
  const handleAnswerSelect = (index: number) => {
    if (isAnswered || activeProblem === null) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isAnsCorrect = index === activeProblem.correctIndex;
    setIsCorrect(isAnsCorrect);

    if (isAnsCorrect) {
      playSound('correct');
      // 残り時間追加最大30s
      setTimeRemaining((prev) => {
        const nextTime = prev + 2;
        const boundedTime = nextTime > 30 ? 30 : nextTime;
        const gained = boundedTime - prev;
        if (gained > 0) {
          setTimeBonusEffect({ amount: gained, key: Date.now() });
        }
        return boundedTime;
      });

      // コンボアップ
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) {
        setMaxCombo(nextCombo);
      }

      // テンションごとの通知音
      if (nextCombo % 10 === 0) {
        playSound('superCombo');
      } else if (nextCombo % 5 === 0) {
        playSound('comboUp');
      }

      // スコア計算
      // ベース 100
      let multiplier = 1.0;
      if (nextCombo >= 10) {
        multiplier = 2.0;
      } else if (nextCombo >= 5) {
        multiplier = 1.5;
      }

      const pointsGained = Math.round(100 * multiplier);
      setScore((prev) => prev + pointsGained);
      setScoreNotification({ amount: pointsGained, comboBonus: multiplier, key: Date.now() });
      setCorrectCount((prev) => prev + 1);

    } else {
      playSound('wrong');
      // ペナルティ時間減少
      setTimeRemaining((prev) => {
        const nextTime = prev - 5;
        const boundedTime = nextTime < 0 ? 0 : nextTime;
        setTimeBonusEffect({ amount: -5, key: Date.now() });
        return boundedTime;
      });

      // コンボ撃沈
      setCombo(0);
      setWrongCount((prev) => prev + 1);
    }

    setTotalAnswered((prev) => prev + 1);

    // 1.2秒後に次の問題に進む
    setTimeout(() => {
      // 全ての問題を使い果たした、または残り時間が 0 になっているか判定
      const nextIdx = currentPoolIndex + 1;
      if (nextIdx >= problemPool.length) {
        // 全問消化
        handleTimesUp();
      } else {
        setCurrentPoolIndex(nextIdx);
        setActiveProblem(null);
      }
    }, 1100);
  };

  // コンボベースの表示演出
  const getTensionStyle = () => {
    if (combo >= 10) {
      return {
        bg: 'bg-gradient-to-r from-red-650/40 via-purple-700/50 to-orange-600/40 border-orange-500 text-orange-200 animate-pulse',
        label: '🔥 SUPER TENSION [倍率: 2.0x] 🔥',
        textShadow: 'shadow-orange-500/50',
      };
    } else if (combo >= 5) {
      return {
        bg: 'bg-gradient-to-r from-cyan-650/35 via-blue-700/40 to-indigo-600/35 border-cyan-400 text-cyan-200',
        label: '⚡ TENSION UP [倍率: 1.5x] ⚡',
        textShadow: 'shadow-cyan-405/40',
      };
    } else {
      return {
        bg: 'bg-black/40 border-slate-700 text-slate-400',
        label: 'NORMAL SPEED (1.0x)',
        textShadow: '',
      };
    }
  };

  const tension = getTensionStyle();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center relative overflow-hidden select-none font-sans py-4 px-3 md:px-6">
      
      {/* 宇宙的な背景グリッド & パーティクル */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* 輝く色のぼかし */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] md:w-[600px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      {combo >= 5 && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[700px] h-[400px] rounded-full blur-[120px] transition-all duration-700 pointer-events-none ${combo >= 10 ? 'bg-orange-500/15' : 'bg-cyan-500/10'}`} />
      )}

      {/* ヘッダーエリア */}
      <div className="w-full max-w-3xl flex justify-between items-center z-10 border-b border-white/5 pb-2.5 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 rounded bg-indigo-900/30 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-black tracking-widest uppercase">
            CHRONO PASSAGE
          </div>
          <h1 className="text-sm md:text-base font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 flex items-center gap-1">
            <span>ときのかいろう</span>
          </h1>
        </div>
        <button
          onClick={onClose}
          disabled={gameState === 'playing' && timeRemaining > 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] transition-all border shrink-0 ${
            gameState === 'playing' && timeRemaining > 0
              ? 'opacity-30 border-white/5 text-slate-500 cursor-not-allowed'
              : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/5 active:scale-95 text-slate-350 hover:text-white cursor-pointer'
          }`}
        >
          <Home size={11} />
          <span>タイトルへ</span>
        </button>
      </div>

      {/* メインステージ */}
      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center items-center z-10 p-1">
        
        {/* ==============================================
            A. イントロ・ロビー画面
           ============================================== */}
        {gameState === 'intro' && (
          <div className="w-full bg-slate-900/85 backdrop-blur-md rounded-2xl border-2 border-indigo-500/40 shadow-2xl p-6 md:p-8 text-center space-y-6 max-w-lg my-auto animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-500" />
            
            {/* カウントダウン表示 */}
            {isCounting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <div className="text-[10px] font-black tracking-widest text-indigo-400 animate-pulse uppercase">
                  READY FOR TIME ATTACK...
                </div>
                <motion.div
                  key={startCountdown}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  exit={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-7xl font-sans font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 tracking-tight"
                >
                  {startCountdown}
                </motion.div>
                <div className="text-[11px] font-bold text-slate-400">
                  精神を集中させてください
                </div>
              </div>
            ) : (
              // モード準備ロビー
              <div className="space-y-5">
                <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border-2 border-indigo-400 rounded-full flex items-center justify-center mx-auto text-cyan-300 animate-pulse shadow-lg shadow-indigo-500/10">
                  <Timer size={30} className="stroke-[2.5]" />
                </div>
                
                <div className="space-y-1.5">
                  <h2 className="text-xl font-extrabold tracking-widest text-cyan-300">制限時間30秒の速解き試練</h2>
                  <p className="text-xs text-slate-350 leading-relaxed max-w-md mx-auto">
                    ゲーム内の全問題プール（IT用語）からランダムに出題される4択テスト！時間が切れるか、全問完走するまで終わりはありません。
                  </p>
                </div>

                {/* ルール解説リスト */}
                <div className="bg-black/35 border border-slate-800 rounded-xl p-4 text-left text-[11px] space-y-2.5 max-w-sm mx-auto font-medium text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 bg-cyan-950 text-cyan-400 rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center border border-cyan-800">⏱</span>
                    <span><strong>持ち時間 30秒</strong> からカウントダウンが始まります。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 bg-emerald-950 text-emerald-400 rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center border border-emerald-800">＋</span>
                    <span>1問正解ごとに <strong>残り時間が +2秒 追加</strong>されます（最大30s）。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 bg-red-950 text-red-400 rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center border border-red-800">ー</span>
                    <span>誤答するとペナルティとして <strong>残り時間が -5秒 減少</strong>。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 bg-amber-950 text-amber-400 rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center border border-amber-800">🔥</span>
                    <span>連続正解（コンボ）で <strong>倍率（5コンボ 1.5x、10コンボ 2.0x）</strong>！</span>
                  </div>
                </div>

                {/* ハイスコア表示 */}
                <div className="flex justify-center gap-6 py-1 bg-white/5 rounded-xl max-w-sm mx-auto border border-white/5 font-mono text-center">
                  <div>
                    <span className="block text-[8.5px] text-slate-400 uppercase tracking-widest font-sans font-bold">HIGH SCORE</span>
                    <span className="text-sm font-black text-cyan-300">{gameStats.timeAttackHighScore || 0} pts</span>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <span className="block text-[8.5px] text-slate-400 uppercase tracking-widest font-sans font-bold">MAX COMBO</span>
                    <span className="text-sm font-black text-purple-300">{gameStats.timeAttackMaxCombo || 0} 連撃</span>
                  </div>
                </div>

                {/* 開始ボタン */}
                <button
                  onClick={startTimerAndGame}
                  className="w-full max-w-sm py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:brightness-110 active:scale-95 text-cyan-950 font-black text-sm rounded-xl tracking-widest border border-cyan-300 shadow-xl shadow-cyan-500/10 transition-all cursor-pointer select-none uppercase"
                >
                  回廊の門をひらく （挑戦開始）
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==============================================
            B. クイズプレイ中
           ============================================== */}
        {gameState === 'playing' && activeProblem && (
          <div className="w-full flex flex-col items-center space-y-4 animate-fade-in">
            
            {/* 上部ステータスバー（タイマー、スコア、現在の連撃） */}
            <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 flex items-center justify-between shadow-lg relative overflow-hidden gap-3 font-mono">
              
              {/* 背景の残り時間ゲージ */}
              <div className="absolute bottom-0 left-0 h-1 bg-slate-850 w-full">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    timeRemaining <= 10 
                      ? 'bg-gradient-to-r from-red-650 to-orange-500 animate-pulse' 
                      : 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                  }`}
                  style={{ width: `${(timeRemaining / 30) * 100}%` }}
                />
              </div>

              {/* タイマー表示 */}
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all duration-300 ${
                  timeRemaining <= 10 
                    ? 'bg-red-950/40 border-red-500 text-red-300 animate-pulse scale-105' 
                    : 'bg-black/35 border-slate-700 text-cyan-300'
                }`}>
                  <Timer size={14} className={timeRemaining <= 10 ? 'animate-spin' : ''} />
                  <span className="text-lg font-black tracking-tight leading-none">
                    {timeRemaining}
                    <span className="text-[10px] font-bold text-slate-400 ml-0.5">s</span>
                  </span>
                </div>
                
                {/* タイム増減アニメーション */}
                <AnimatePresence>
                  {timeBonusEffect && (
                    <motion.div
                      key={timeBonusEffect.key}
                      initial={{ opacity: 0, y: 15, scale: 0.7 }}
                      animate={{ opacity: 1, y: 0, scale: 1.15 }}
                      exit={{ opacity: 0, y: -20, scale: 0.9 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className={`absolute left-10 -top-5 text-[11px] font-black tracking-wider py-0.5 px-2 rounded-full border shadow-md flex items-center gap-0.5 ${
                        timeBonusEffect.amount > 0 
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' 
                          : 'bg-red-950 text-red-400 border-red-500/30'
                      }`}
                    >
                      {timeBonusEffect.amount > 0 ? `+${timeBonusEffect.amount}s` : `${timeBonusEffect.amount}s`}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 獲得スコア */}
              <div className="text-right flex flex-col justify-center items-end relative min-w-[70px]">
                <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-sans font-extrabold leading-none">SCORE</span>
                <span className="text-lg font-black text-yellow-300 tracking-tight leading-none mt-1">
                  {score}
                </span>

                {/* スコア増分ポップアップ */}
                <AnimatePresence>
                  {scoreNotification && (
                    <motion.div
                      key={scoreNotification.key}
                      initial={{ opacity: 0, x: -10, y: -10, scale: 0.8 }}
                      animate={{ opacity: 1, x: -35, y: -15, scale: 1.2 }}
                      exit={{ opacity: 0, x: -50, y: -30, scale: 0.8 }}
                      className="absolute text-[10px] font-black text-yellow-300 bg-yellow-950/90 border border-yellow-500/30 py-0.5 px-1.5 rounded"
                    >
                      +{scoreNotification.amount}
                      {scoreNotification.comboBonus > 1.0 && (
                        <span className="text-[8px] font-black text-amber-400 ml-1">({scoreNotification.comboBonus}x)</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 連撃コンボ数（テンション） */}
              <div className="flex flex-col items-center">
                <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-sans font-extrabold leading-none mb-1">COMBO</span>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-black min-w-[36px] text-center transition-all ${
                  combo >= 10 
                    ? 'bg-orange-500 text-orange-950 shadow-md shadow-orange-500/20' 
                    : combo >= 5 
                      ? 'bg-cyan-400 text-cyan-950 shadow-md shadow-cyan-400/20' 
                      : 'bg-slate-800 text-slate-350'
                }`}>
                  {combo} <span className="text-[8px] font-bold">連撃</span>
                </div>
              </div>

            </div>

            {/* テンションステータスバー */}
            <div className={`w-full py-1.5 px-3 rounded-lg border text-center text-[10px] font-black transition-all font-mono tracking-widest ${tension.bg}`}>
              {tension.label}
            </div>

            {/* 用語名/説明文のカード表示 */}
            <div className={`w-full bg-slate-900/40 rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xl min-h-[160px] relative overflow-hidden transition-all duration-300 ${isAnswered ? (isCorrect ? 'border-emerald-500/50 bg-emerald-950/5' : 'border-red-500/50 bg-red-950/5') : 'border-indigo-500/25 bg-slate-900/60'}`}>
              
              {/* 問題数インジケータ */}
              <div className="absolute top-2 left-3 text-[8.5px] text-slate-500 font-bold font-mono uppercase tracking-widest">
                STAGE PROBLEM // #{currentPoolIndex + 1}
              </div>

              {/* クイズの出題形式スタンプ */}
              <div className="absolute top-2 right-3 text-[8.5px] text-indigo-400 font-extrabold tracking-widest uppercase">
                {activeProblem.type === 'term_to_def' ? '💡 用語の意味は？' : '🔍 この意味を指す用語は？'}
              </div>

              <div className="my-auto py-3 text-center">
                <h3 className={`font-extrabold text-slate-150 leading-relaxed tracking-wide select-text ${activeProblem.type === 'term_to_def' ? 'text-lg md:text-xl text-cyan-200' : 'text-xs md:text-sm text-slate-200'}`}>
                  {activeProblem.type === 'term_to_def' ? (
                    <span>「 <strong className="text-white text-xl md:text-2xl underline decoration-cyan-400/35 underline-offset-4">{activeProblem.raw.termName}</strong> 」</span>
                  ) : (
                    <span>{activeProblem.raw.definition}</span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {activeProblem.type === 'term_to_def' ? '上のIT用語を表す、最も正しい定義を選んでください。' : '上の定義説明に最も当てはまる用語を選択肢から選んでください。'}
                </p>
              </div>

              {/* 正解・不正解時の特大スタンプ */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1.0, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs rounded-xl z-20 pointer-events-none"
                  >
                    {isCorrect ? (
                      <div className="flex flex-col items-center text-emerald-400 gap-1 animate-pulse">
                        <CheckCircle2 size={54} className="stroke-[2.5]" />
                        <span className="text-xs font-black tracking-widest font-mono uppercase">EXCELLENT!! (+2s)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-red-405 gap-1 animate-bounce">
                        <AlertCircle size={54} className="stroke-[2.5]" />
                        <span className="text-xs font-black tracking-widest font-mono uppercase">PENALTY (-5s)</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* 4つの解答ボタン（タップしやすいようにグリッド） */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {activeProblem.choices.map((choice, index) => {
                const isSelected = selectedAnswer === index;
                const isThisChoiceCorrect = index === activeProblem.correctIndex;
                
                let btnStyle = 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-indigo-500/40 hover:bg-slate-800/60 active:scale-[0.99]';
                
                if (isAnswered) {
                  if (isThisChoiceCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-300 scale-[1.01] font-black shadow-lg shadow-emerald-500/10';
                  } else if (isSelected) {
                    btnStyle = 'border-red-500 bg-red-950/40 text-red-300 scale-[0.98]';
                  } else {
                    btnStyle = 'border-slate-900 opacity-30 bg-slate-950 text-slate-600 scale-[0.98] pointer-events-none';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                    className={`w-full min-h-[58px] p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all outline-none leading-relaxed text-xs cursor-pointer select-none font-semibold ${btnStyle}`}
                  >
                    <span className="font-mono bg-white/5 border border-white/10 text-slate-400 font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[9.5px]">
                      {index + 1}
                    </span>
                    <span className="flex-1 leading-snug break-words">
                      {choice}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 進行中のインジケータ */}
            <div className="text-[9px] font-mono text-slate-500 tracking-wider">
              全問完走、またはカウントが 0 でリザルトへ移行します。現在：{correctCount} / {currentPoolIndex + 1} 正解
            </div>

          </div>
        )}

        {/* ==============================================
            C. ゲーム終了判定＆リザルト画面
           ============================================== */}
        {gameState === 'result' && (
          <div className="w-full bg-slate-900/85 backdrop-blur-md rounded-2xl border-2 border-indigo-500/45 shadow-2xl p-6 md:p-8 text-center space-y-6 max-w-lg my-auto animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-indigo-600 to-cyan-500" />
            
            {/* 動的な終了スタンプ */}
            <div className="space-y-1">
              <span className="bg-red-500/15 text-red-450 border border-red-500/30 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase">
                TIME LIMIT EXCEEDED
              </span>
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-indigo-200 to-cyan-400 tracking-wider">
                時の回廊 終着・判定完了
              </h2>
            </div>

            {/* ハイスコア更新！お祝いエフェクト */}
            {isNewRecord && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-gradient-to-r from-yellow-500/25 to-amber-500/25 border border-yellow-400 text-yellow-200 text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
              >
                <Sparkles size={14} className="animate-spin text-yellow-300" />
                <span>🎉 NEW HIGH-SCORE!! 自己新記録を達成しました！</span>
              </motion.div>
            )}

            {/* スコア・戦績コンテナ */}
            <div className="bg-black/45 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-sm mx-auto font-mono">
              
              {/* 最終得点 */}
              <div className="border-b border-white/5 pb-3">
                <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-sans font-bold">FINAL SCORE</span>
                <span className="text-4xl font-extrabold text-yellow-300 leading-none">
                  {score}
                  <span className="text-xs text-slate-400 font-normal font-sans ml-1">pts</span>
                </span>
              </div>

              {/* 各種メトリクスリスト */}
              <div className="grid grid-cols-2 gap-y-3.5 text-left text-xs bg-slate-900/40 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="block text-[8px] text-slate-400 tracking-wider font-sans font-bold">解答問題数</span>
                  <span className="text-sm font-bold text-slate-200">{totalAnswered} 問</span>
                </div>
                <div className="border-l border-white/10 pl-4">
                  <span className="block text-[8px] text-slate-400 tracking-wider font-sans font-bold">正解数</span>
                  <span className="text-sm font-bold text-emerald-400">{correctCount} 問</span>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <span className="block text-[8px] text-slate-400 tracking-wider font-sans font-bold">最大連撃（COMBO）</span>
                  <span className="text-sm font-bold text-purple-300">{maxCombo} 連撃</span>
                </div>
                <div className="border-t border-white/5 border-l border-white/10 pl-4 pt-3">
                  <span className="block text-[8px] text-slate-400 tracking-wider font-sans font-bold">誤答数 / ペナルティ</span>
                  <span className="text-sm font-bold text-red-400">{wrongCount} 回</span>
                </div>
              </div>

            </div>

            {/* この挑戦を受けたハイスコア記録状態 */}
            <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-mono">
              <div>
                <span>ハイスコア：</span>
                <span className="text-slate-250 font-bold">{gameStats.timeAttackHighScore || score} pts</span>
              </div>
              <div className="w-px bg-slate-800" />
              <div>
                <span>最大連撃：</span>
                <span className="text-slate-250 font-bold">{gameStats.timeAttackMaxCombo || maxCombo} 連撃</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2 text-xs font-bold font-sans">
              <button
                onClick={startTimerAndGame}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 active:scale-95 text-cyan-950 font-black rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase border border-cyan-300"
              >
                <RotateCcw size={14} className="stroke-[2.5]" />
                <span>もういちど挑戦する</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-extrabold rounded-lg border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home size={14} />
                <span>タイトルへもどる</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* チップアドバイス */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-center gap-1.5 z-10 text-[9.5px] text-slate-500 leading-snug tracking-wide text-center shrink-0 select-text bg-white/2 p-2 rounded-xl border border-white/5 mt-2">
        <Sparkles size={11} className="text-cyan-500" />
        <span>【攻略のコツ】正解よりも「コンボを切らさない」ことが超ハイスコアへの唯一無二の鍵。確実な解答リズムが勝利を招きます！</span>
      </div>

    </div>
  );
}
