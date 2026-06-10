/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Zap, RotateCcw, Home, Award, AlertCircle, Sparkles, Swords, Heart, Shield, HelpCircle } from 'lucide-react';
import { RawProblem, ActiveProblem, GameStats, TermCard } from '../types';
import { RAW_PROBLEMS, TERM_CARDS } from '../data/problems';
import { generateActiveProblem, shuffleArray, drawCard } from '../utils/gameHelpers';

interface TimeAttackScreenProps {
  onClose: () => void;
  gameStats: GameStats;
  collectedCardIds: string[];
  onUpdateStats: (updatedStats: GameStats) => void;
  onAcquireCards: (cardIds: string[]) => void;
}

export default function TimeAttackScreen({ onClose, gameStats, collectedCardIds, onUpdateStats, onAcquireCards }: TimeAttackScreenProps) {
  // ゲームの状態: 'intro' | 'playing' | 'result'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');

  // カウントダウン (3, 2, 1, 開始!)
  const [startCountdown, setStartCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  // ステータス
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);

  // タイム増減エフェクト表示用
  const [timeBonusState, setTimeBonusState] = useState<{ amount: number; visible: boolean; key: number }>({ amount: 0, visible: false, key: 0 });
  const [scoreBonusState, setScoreBonusState] = useState<{ amount: number; comboBonus: number; visible: boolean; key: number }>({ amount: 0, comboBonus: 1.0, visible: false, key: 0 });

  // 敵（己の幻影）のHP (要望により、最初の幻影はHP 50からスタート)
  const [enemyHp, setEnemyHp] = useState<number>(50);
  const [enemyMaxHp, setEnemyMaxHp] = useState<number>(50);
  const [defeatedCount, setDefeatedCount] = useState<number>(0);

  // クイズプール
  const [problemPool, setProblemPool] = useState<RawProblem[]>([]);
  const [currentPoolIndex, setCurrentPoolIndex] = useState<number>(0);
  const [activeProblem, setActiveProblem] = useState<ActiveProblem | null>(null);

  // 解答
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // エフェクト用 (通常戦闘のように極めて派手にする)
  const [enemyFlash, setEnemyFlash] = useState<boolean>(false);
  const [playerFlash, setPlayerFlash] = useState<boolean>(false);
  const [screenAttackShake, setScreenAttackShake] = useState<boolean>(false);
  const [screenDamageShake, setScreenDamageShake] = useState<boolean>(false);
  const [showStrikeSlash, setShowStrikeSlash] = useState<boolean>(false);
  const [showBarrierCrack, setShowBarrierCrack] = useState<boolean>(false);
  const [damagePopup, setDamagePopup] = useState<{ amount: number; isCrit: boolean; isPlayer: boolean; visible: boolean } | null>(null);

  // タイムアタック終了時の獲得お宝（カード一覧）
  const [gainedCards, setGainedCards] = useState<TermCard[]>([]);

  // ハイスコア通知
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // プレイヤー画像（hero.jpg）をそのまま己の幻影として立ち上がらせる
  const PLAYER_IMAGE = './img/player/hero.jpg';

  // メッセージ表示用
  const [gameMessage, setGameMessage] = useState<string>('おのれの幻影が たちふさがった！');

  // BGM / 効果音 Web Audio
  const playSound = (type: 'correct' | 'wrong' | 'comboUp' | 'superCombo' | 'tick' | 'timesUp' | 'start' | 'damage' | 'victory') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); 
        osc.frequency.setValueAtTime(147, ctx.currentTime + 0.15); 
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'comboUp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.06); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'superCombo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.15); // C6
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'timesUp') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(294, ctx.currentTime);
        osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(147, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'start') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.1);  // C5
        osc.frequency.setValueAtTime(698.46, ctx.currentTime + 0.2);  // F5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'victory') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime + 0.06);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(698.46, ctx.currentTime + 0.18);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // AudioContext blocks
    }
  };

  // カウントダウン開始
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
    setEnemyHp(50);
    setEnemyMaxHp(50);
    setDefeatedCount(0);
    setGainedCards([]);
    setGameState('intro');
    setGameMessage('おのれの幻影が たちふさがった！');
  };

  useEffect(() => {
    startTimerAndGame();
  }, []);

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

  // 新たなクイズを設定
  useEffect(() => {
    if (gameState === 'playing' && problemPool.length > 0 && activeProblem === null) {
      const rawProblem = problemPool[currentPoolIndex];
      const type = 'def_to_term';
      const prob = generateActiveProblem(rawProblem, type, 4, RAW_PROBLEMS);
      setActiveProblem(prob);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(null);
    }
  }, [gameState, problemPool, currentPoolIndex, activeProblem]);

  // 時間カウント監視
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

  // 時間切れ判定
  const handleTimesUp = () => {
    playSound('timesUp');
    setGameState('result');

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

    const newStats: GameStats = {
      ...gameStats,
      timeAttackHighScore: updatedHighScore,
      timeAttackMaxCombo: updatedMaxCombo,
      attempts: gameStats.attempts + 1,
    };

    onUpdateStats(newStats);

    // 幻影撃破数に応じたカード獲得を処理
    // drawCard を繰り返し呼ぶことで、各撃破数が完全にカード1枚の新規ドロップに該当
    const cardsGained: TermCard[] = [];
    const tempCollected = [...collectedCardIds];
    
    // 倒した幻影の数だけカードを獲得
    for (let i = 0; i < defeatedCount; i++) {
      const drawn = drawCard(tempCollected);
      if (drawn) {
        cardsGained.push(drawn);
        tempCollected.push(drawn.id); // 次回抽選に重複を反映できるようにする
      }
    }
    setGainedCards(cardsGained);
  };

  // 解答処理
  const handleAnswerSelect = (index: number) => {
    if (isAnswered || activeProblem === null) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isAnsCorrect = index === activeProblem.correctIndex;
    setIsCorrect(isAnsCorrect);

    if (isAnsCorrect) {
      // 成功時：通常スラッシュ効果＋揺れを適用して圧倒的なダメージ感！
      playSound('correct');
      setEnemyFlash(true);
      setShowStrikeSlash(true);
      setScreenAttackShake(true);

      setTimeout(() => {
        setEnemyFlash(false);
        setShowStrikeSlash(false);
        setScreenAttackShake(false);
      }, 500);

      // 敵へのダメージ計算
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) {
        setMaxCombo(nextCombo);
      }

      let multiplier = 1.0;
      if (nextCombo >= 10) {
        multiplier = 2.0;
      } else if (nextCombo >= 5) {
        multiplier = 1.5;
      }

      const pointsGained = Math.round(100 * multiplier);
      const enemyDmgAmount = Math.round(25 * multiplier);

      setScore((prev) => prev + pointsGained);
      setScoreBonusState({ amount: pointsGained, comboBonus: multiplier, visible: true, key: Date.now() });

      setDamagePopup({ amount: enemyDmgAmount, isCrit: nextCombo >= 5, isPlayer: false, visible: true });
      setTimeout(() => setDamagePopup(null), 850);

      // 敵のHP削減
      const nextHp = enemyHp - enemyDmgAmount;
      if (nextHp <= 0) {
        // 敵撃破！
        playSound('victory');
        const nextDefeated = defeatedCount + 1;
        setDefeatedCount(nextDefeated);
        setGameMessage('おのれの幻影を完全に撃破した！ 新たな幻影が現れる！');
        
        // 最初の50から、25ずつ敵最大HPが増加していく
        const nextMax = enemyMaxHp + 25;
        setEnemyMaxHp(nextMax);
        setEnemyHp(nextMax);
      } else {
        setEnemyHp(nextHp);
        setGameMessage(`幻影に ${enemyDmgAmount} の ハックダメージ！`);
      }

      // タイム増（最大30sリミット）
      setTimeRemaining((prev) => {
        const nextTime = prev + 2;
        const boundedTime = nextTime > 30 ? 30 : nextTime;
        const gained = boundedTime - prev;
        if (gained > 0) {
          setTimeBonusState({ amount: gained, visible: true, key: Date.now() });
        }
        return boundedTime;
      });

      setCorrectCount((prev) => prev + 1);

    } else {
      // 誤答時：激しい画面の赤フラッシュ＆被弾のブレ（ひび割れ）演出
      playSound('wrong');
      setPlayerFlash(true);
      setScreenDamageShake(true);
      setShowBarrierCrack(true);

      setTimeout(() => {
        setPlayerFlash(false);
        setScreenDamageShake(false);
        setShowBarrierCrack(false);
      }, 500);

      setCombo(0);
      setWrongCount((prev) => prev + 1);

      // 自爆ダメージ
      const selfDmg = 15;
      setDamagePopup({ amount: selfDmg, isCrit: false, isPlayer: true, visible: true });
      setTimeout(() => setDamagePopup(null), 850);
      
      setGameMessage(`詠唱失敗！ 呪文が 逆流した！`);

      // 残り時間減少
      setTimeRemaining((prev) => {
        const nextTime = prev - 5;
        const boundedTime = nextTime < 0 ? 0 : nextTime;
        setTimeBonusState({ amount: -5, visible: true, key: Date.now() });
        return boundedTime;
      });
    }

    setTotalAnswered((prev) => prev + 1);

    // テンポの良さは引き継いで、解答後すぐに次の問題へスライド
    setTimeout(() => {
      const nextIdx = currentPoolIndex + 1;
      if (nextIdx >= problemPool.length) {
        handleTimesUp();
      } else {
        setCurrentPoolIndex(nextIdx);
        setActiveProblem(null);
      }
    }, 280);
  };

  // コマンド選択肢のカーソル表示用
  const getChoiceLabel = (index: number) => {
    switch (index) {
      case 0: return 'A';
      case 1: return 'B';
      case 2: return 'C';
      case 3: return 'D';
      default: return '▶';
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-white flex flex-col justify-between items-center relative select-none font-sans py-4 px-3 md:px-6 overflow-x-hidden ${
      screenAttackShake ? 'animate-screen-attack-shake' : ''
    } ${
      screenDamageShake ? 'animate-screen-damage-shake' : ''
    }`}>
      
      {/* タイムアウト/被弾時の血湧きフラッシュ（赤） */}
      <div className={`absolute inset-0 bg-red-650/40 pointer-events-none transition-opacity duration-150 ${playerFlash ? 'opacity-100' : 'opacity-0'} z-50`} />
      {/* 攻撃成功時の聖なるフラッシュ（金） */}
      <div className={`absolute inset-0 bg-yellow-405/40 pointer-events-none transition-opacity duration-150 ${enemyFlash ? 'opacity-100' : 'opacity-0'} z-50 mix-blend-screen`} />

      {/* ドラクエ風走査線エフェクト */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(0,0,0,0.3)_95%)] bg-[size:100%_4px] pointer-events-none opacity-40 z-40" />

      {/* ヘッダーエリア */}
      <div className="w-full max-w-3xl flex justify-between items-center border-b-4 border-double border-blue-500 pb-2 mb-3 shrink-0 z-10">
        <div className="flex items-center gap-1.5 py-1 px-3 bg-blue-900/60 border-2 border-blue-400 rounded-md">
          <span className="text-yellow-400 font-extrabold text-xs tracking-widest font-mono">ときの かいろう</span>
        </div>
        <button
          onClick={onClose}
          disabled={gameState === 'playing' && timeRemaining > 0}
          className={`flex items-center gap-1 py-1 px-3 rounded text-[11px] font-bold border-2 transition-all shrink-0 ${
            gameState === 'playing' && timeRemaining > 0
              ? 'opacity-20 border-slate-800 text-slate-500 cursor-not-allowed'
              : 'border-white bg-slate-900 text-white hover:bg-white hover:text-slate-950 cursor-pointer'
          }`}
        >
          <Home size={12} />
          <span>タイトル</span>
        </button>
      </div>

      {/* メインステージ */}
      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center items-center z-10 p-1">
        
        {/* ==============================================
            A. イントロ 勇者の決意
           ============================================== */}
        {gameState === 'intro' && (
          <div className="w-full bg-slate-900 border-4 border-double border-white rounded-lg shadow-2xl p-6 md:p-8 text-center space-y-6 max-w-lg my-auto relative">
            
            {isCounting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="text-xs font-bold tracking-widest text-amber-400 animate-pulse">
                  せいしん を しゅうちゅう している
                </div>
                <div className="text-6xl font-black text-white tracking-widest font-mono select-none animate-ping">
                  {startCountdown}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-900 to-indigo-900 border-4 border-double border-white rounded-full flex items-center justify-center mx-auto text-yellow-501 shadow-md">
                  <Swords size={28} className="animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-widest text-yellow-300">鏡の試練『ときのかいろう』</h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    己自身の「心の迷い」が生み出した幻影との最速対決。<br />
                    制限時間は30秒。ミスなくIT用語ハックを詠唱し、己を超えよ。
                  </p>
                </div>

                {/* DQ風の解説リスト */}
                <div className="bg-black border-2 border-slate-700 rounded-lg p-4 text-left text-xs space-y-2 max-w-sm mx-auto leading-relaxed text-slate-200">
                  <div className="flex items-start gap-1">
                    <span className="text-yellow-400 font-bold shrink-0">・持ち時間:</span>
                    <span>30秒。0になると試練は終了する。</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-emerald-400 font-bold shrink-0">・ハック正解:</span>
                    <span>幻影に大ダメージを与え、<strong>時間が2秒回復</strong>。</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-red-400 font-bold shrink-0">・詠唱しっぱい:</span>
                    <span>呪文が逆流し自爆、<strong>時間が5秒減少</strong>。</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-purple-400 font-bold shrink-0">・れんげき:</span>
                    <span>連続正解（コンボ）で会心の一撃！スコア倍率もアップ。</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-cyan-405 font-bold shrink-0">・撃破ほうしゅう:</span>
                    <span>幻影をはらいのけた数だけ、実用カードを試練終了時に持ち帰れる！</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsCounting(true);
                      setStartCountdown(3);
                    }}
                    disabled={isCounting}
                    className="w-full py-3 bg-blue-900 border-2 border-white rounded-md text-white font-bold select-none hover:bg-white hover:text-slate-950 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    ▶ 試練に いどむ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'playing' && activeProblem && (
          <div className="w-full flex flex-col items-center gap-5 md:gap-6 flex-1">
            
            {/* 1) 巨大えいしょう残り時間メーター (ヘッダー近くで圧倒的に目立たせる構成) */}
            <div className="w-full bg-slate-900 border-4 border-cyan-500 rounded-xl p-3.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] relative overflow-hidden flex flex-col gap-2 z-10">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2 align-middle">
                  <Timer className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-cyan-405'}`} />
                  <span className="text-xs font-black text-cyan-200 tracking-wider uppercase mb-[-1px]">えいしょう残り時間 (REMAINING TIME)</span>
                </div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                  {timeRemaining.toFixed(1)} <span className="text-xs text-slate-400">秒</span>
                </div>
              </div>
              
              {/* 高い視認性の太い残り時間プログレスバー */}
              <div className="w-full bg-slate-950 border border-slate-800 h-5.5 rounded-full overflow-hidden p-[1px] relative">
                <div 
                  className={`h-full rounded-full transition-all duration-300 relative ${
                    timeRemaining <= 10 
                      ? 'bg-gradient-to-r from-red-650 via-rose-500 to-red-650 animate-pulse' 
                      : 'bg-gradient-to-r from-cyan-500 via-sky-450 to-cyan-550'
                  }`}
                  style={{ width: `${Math.min(100, (timeRemaining / 30) * 100)}%` }}
                >
                  {/* 流れるグロー光沢エフェクト */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-30 animate-[shimmer_2s_infinite]" />
                </div>
              </div>

              {/* タイム増減アニメーションインジケータ */}
              {timeBonusState.visible && (
                <div key={timeBonusState.key + '_header'} className={`absolute right-4 top-2 text-[10.5px] font-black px-2.5 py-0.5 border rounded shadow-lg z-30 animate-scale-up ${
                  timeBonusState.amount > 0 ? 'bg-emerald-950 text-emerald-350 border-emerald-400/50' : 'bg-red-955 text-red-305 border-red-500/40'
                }`}>
                  {timeBonusState.amount > 0 ? `+${timeBonusState.amount}s!` : `${timeBonusState.amount}s!`}
                </div>
              )}
            </div>

            {/* 2) 超巨大・超鮮明な問題文表示（詠唱）パネル (要望に合わせ構成：余計な説明文は完全カットして最大可読性) */}
            <div className={`w-full bg-slate-900 border-4 p-6 sm:p-8 md:p-10 rounded-2xl flex flex-col justify-between relative shadow-[0_12px_24px_rgba(0,0,0,0.55)] transition-all duration-300 ${
              isAnswered ? (isCorrect ? 'border-emerald-500 bg-emerald-950/20' : 'border-red-500 bg-red-950/20') : 'border-slate-800'
            }`}>
              <div className="absolute top-2.5 left-4 text-[9px] text-slate-450 font-black font-mono tracking-widest uppercase select-none">
                🛡️ 鏡の試練 // QUESTION STAGE #{currentPoolIndex + 1}
              </div>

              <div className="my-auto py-5 text-center">
                {/* 非常に大きく読みやすい問題文 */}
                <h3 className="font-sans font-black text-slate-100 select-text text-lg sm:text-2xl md:text-3xl lg:text-3.5xl leading-relaxed tracking-wider px-2 break-words">
                  『 {activeProblem.raw.definition} 』
                </h3>
              </div>
            </div>

            {/* 3) クイズ用の解答パネル [要望により選択肢が押しやすく・大きく表示されるようにサイズアップ] */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {activeProblem.choices.map((choice, index) => {
                const isSelected = selectedAnswer === index;
                const isThisChoiceCorrect = index === activeProblem.correctIndex;
                
                let btnStyle = 'border-slate-700 bg-slate-900 text-slate-100 hover:border-yellow-400 hover:bg-slate-850 active:scale-[0.99] hover:shadow-lg transition-all duration-150';
                
                if (isAnswered) {
                  if (isThisChoiceCorrect) {
                     btnStyle = 'border-emerald-450 bg-emerald-950 text-emerald-300 font-extrabold shadow-lg scale-[1.015]';
                  } else if (isSelected) {
                     btnStyle = 'border-red-500 bg-red-950 text-red-300 font-bold';
                  } else {
                     btnStyle = 'border-slate-950 opacity-15 bg-slate-950 text-slate-800 scale-[0.98] pointer-events-none';
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                    className={`w-full min-h-[82px] p-5 sm:p-6 rounded-2xl border-3 text-left flex items-center gap-4 transition-all outline-none leading-relaxed text-sm sm:text-base md:text-lg cursor-pointer select-none font-black ${btnStyle}`}
                    id={`timeattack-choice-${index}`}
                  >
                    {/* コマンドカーソルラベル */}
                    <span className="font-mono bg-black border border-slate-600 text-yellow-405 font-extrabold w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs shadow-inner">
                      {getChoiceLabel(index)}
                    </span>
                    <span className="flex-1 leading-snug break-words">
                      {choice}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4) DQ風おまけHUD (戦闘状態・グラフィック・アクティビティログをコンパクトに下部にまとめる) */}
            <div className="w-full mt-auto bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs relative overflow-hidden shadow-md">
              {/* 薄暗い背景 */}
              <div className="absolute inset-0 bg-[#000000]/60 pointer-events-none" />

              {/* 幻影グラフィック (控えめ。おまけ) */}
              <div className="flex items-center gap-2.5 relative z-10 shrink-0">
                <div className="relative">
                  <img
                    src={PLAYER_IMAGE}
                    alt="おのれの幻影"
                    referrerPolicy="no-referrer"
                    className={`w-9 h-9 object-cover rounded border border-slate-700 transition-all ${
                      enemyFlash ? 'animate-hit-shake' : ''
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {showStrikeSlash && (
                    <div className="absolute inset-0 z-40 bg-yellow-400/20 flex items-center justify-center pointer-events-none">
                      <div className="absolute bg-white h-0.5 w-[140%] rotate-45 shadow-[0_0_8px_#fbbf24]" />
                      <div className="absolute bg-white h-0.5 w-[140%] -rotate-45 shadow-[0_0_8px_#fbbf24]" />
                    </div>
                  )}
                  {showBarrierCrack && (
                    <div className="absolute inset-0 z-40 bg-red-600/30 flex items-center justify-center pointer-events-none">
                      <div className="absolute border border-red-500 w-full h-full rotate-12" />
                    </div>
                  )}
                  {damagePopup && damagePopup.visible && (
                    <div className={`absolute top-0 left-0 font-mono font-black text-[10px] z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-scale-up ${
                      damagePopup.isPlayer ? 'text-red-500' : 'text-yellow-405'
                    }`}>
                      -{damagePopup.amount} HP
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-bold leading-none">おのれの幻影</span>
                  <span className="text-[10px] text-slate-350 font-mono font-bold mt-1">HP {enemyHp}/{enemyMaxHp}</span>
                </div>
              </div>

              {/* ログ部分 (コンパクトにおまけ表示) */}
              <div className="flex-1 min-w-[120px] bg-slate-950 border border-slate-800 px-2.5 py-1 rounded relative z-10 h-8 flex items-center">
                <p className="text-slate-300 font-mono text-[9.5px] sm:text-[10.5px] leading-tight line-clamp-1 select-text font-bold">
                  {gameMessage}
                </p>
              </div>

              {/* ステータス & 数値カウンター */}
              <div className="flex items-center gap-3 relative z-10 text-[10px] font-mono shrink-0 select-none bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                <div>れんげき: <span className={`font-black ${combo >= 5 ? 'text-yellow-405 animate-pulse text-xs' : 'text-slate-200'}`}>{combo}</span></div>
                <div className="w-px bg-slate-800 h-3" />
                <div>スコア: <span className="text-yellow-400 font-bold">{score} G</span></div>
                <div className="w-px bg-slate-800 h-3" />
                <div>撃破: <span className="text-cyan-405 font-bold">{defeatedCount}</span></div>
              </div>

            </div>

          </div>
        )}

        {/* ==============================================
            C. 試練終了 判定ウィンドウ
           ============================================== */}
        {gameState === 'result' && (
          <div className="w-full bg-slate-900 border-4 border-double border-white rounded-lg shadow-2xl p-6 md:p-8 text-center space-y-5 max-w-lg my-auto relative">
            
            <div className="space-y-1">
              <span className="bg-red-950 text-red-400 border border-red-500/35 text-[9px] font-black tracking-widest px-3 py-1 rounded inline-block uppercase font-mono">
                TIME LIMIT EXCEEDED
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-yellow-300 tracking-wider">
                ときのかいろう 試練終了
              </h2>
            </div>

            {/* 自己新記録のお祝い */}
            {isNewRecord && (
              <div className="bg-yellow-950/60 border-2 border-yellow-400 text-yellow-200 text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 shadow-md">
                <Sparkles size={13} className="animate-spin text-yellow-300 shrink-0" />
                <span>🎉 自己ハイスコア記録を 更新しました！ 🎉</span>
              </div>
            )}

            {/* 報告書（スコアボード） */}
            <div className="bg-black border-2 border-slate-850 rounded-lg p-4 space-y-3 max-w-sm mx-auto font-mono">
              <div className="border-b border-slate-800 pb-2">
                <span className="block text-[8.5px] text-slate-450 tracking-wider font-sans font-bold">獲得ゴールド（SCORE）</span>
                <span className="text-4xl font-extrabold text-yellow-300 leading-none block mt-1">
                  {score}
                  <span className="text-xs text-slate-450 font-normal font-sans ml-1">pts</span>
                </span>
              </div>

              {/* メトリクスの一覧 */}
              <div className="grid grid-cols-2 gap-y-3 text-left text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="block text-[8px] text-slate-450 tracking-wider font-sans font-bold">回答問題数</span>
                  <span className="text-sm font-bold text-slate-200">{totalAnswered} 問</span>
                </div>
                <div className="border-l border-slate-800 pl-3">
                  <span className="block text-[8px] text-slate-450 tracking-wider font-sans font-bold">正解数</span>
                  <span className="text-sm font-bold text-emerald-400">{correctCount} 問</span>
                </div>
                <div className="border-t border-slate-800 pt-2">
                  <span className="block text-[8px] text-slate-450 tracking-wider font-sans font-bold">最大連撃数</span>
                  <span className="text-sm font-bold text-purple-400">{maxCombo} 連撃</span>
                </div>
                <div className="border-t border-slate-800 border-l border-slate-800 pl-3 pt-2">
                  <span className="block text-[8px] text-slate-450 tracking-wider font-sans font-bold">幻影撃破数</span>
                  <span className="text-sm font-bold text-cyan-300">{defeatedCount} 体</span>
                </div>
              </div>
            </div>

            {/* 獲得した用語カードの表示（要望「幻影を倒した数だけカード獲得」） */}
            <div className="bg-slate-950 border-2 border-dashed border-cyan-500/70 p-4 rounded-xl max-w-sm mx-auto text-left shadow-inner space-y-2.5">
              <span className="block text-[9.5px] text-cyan-400 font-black tracking-widest text-center uppercase font-mono">
                ✨ ほうしゅうの おたからカード ✨
              </span>
              
              {gainedCards.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-300 text-center leading-normal">
                    幻影を <span className="text-cyan-305 font-extrabold text-xs">{defeatedCount}体</span> はらいのけた報酬として、<br />
                    実用カードを <span className="text-yellow-405 font-extrabold text-xs">{gainedCards.length}枚</span> 連れて帰ることができた！
                  </p>
                  
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 py-1 custom-scrollbar">
                    {gainedCards.map((card, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black px-1 rounded ${
                            card.rarity === 'UR' ? 'bg-purple-900 text-purple-200' :
                            card.rarity === 'SR' ? 'bg-red-950 text-red-200' :
                            card.rarity === 'UC' || card.rarity === 'R' ? 'bg-blue-950 text-blue-200' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {card.rarity}
                          </span>
                          <span className="font-bold text-slate-200 truncate max-w-[120px]">{card.name}</span>
                        </div>
                        <span className="text-[9.5px] font-mono text-cyan-455 font-bold shrink-0">
                          {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 0.5).toFixed(1)}` : ''}
                          {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 0.5).toFixed(1)}` : ''}
                          {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 0.5).toFixed(1)}%` : ''}
                          {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 0.5).toFixed(1)}s` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10.5px] text-slate-400 text-center py-2.5 leading-relaxed">
                  幻影を1人でも倒せば、報酬として<br />
                  用語カードがその場で持ち帰れます……！
                </p>
              )}
            </div>

            {/* この挑戦を受けたハイスコア記録・連撃状態 */}
            <div className="flex justify-center gap-6 text-[10px] text-slate-450 font-mono">
              <div>
                <span>ハイスコア：</span>
                <span className="text-slate-100 font-bold">{gameStats.timeAttackHighScore || score} pts</span>
              </div>
              <div className="w-px bg-slate-850" />
              <div>
                <span>最大連撃：</span>
                <span className="text-slate-100 font-bold">{gameStats.timeAttackMaxCombo || maxCombo} 連撃</span>
              </div>
            </div>

            {/* アクションコマンド */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2 text-xs font-bold font-sans">
              <button
                onClick={() => {
                  if (gainedCards.length > 0) {
                    onAcquireCards(gainedCards.map(c => c.id));
                  }
                  onClose();
                }}
                className="w-full py-3.5 bg-blue-900 border-2 border-white rounded-md text-white font-bold select-none hover:bg-white hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Home size={13} />
                <span>▶ ほうしゅうを受け取り、タイトルへ</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
