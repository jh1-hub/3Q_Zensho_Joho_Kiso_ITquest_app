/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Zap, RotateCcw, Home, Award, AlertCircle, Sparkles, Swords, Heart, Shield, HelpCircle, ArrowRight } from 'lucide-react';
import { RawProblem, ActiveProblem, GameStats, TermCard } from '../types';
import { RAW_PROBLEMS, TERM_CARDS, CLUSTERS } from '../data/problems';
import { generateActiveProblem, shuffleArray, drawCard, getTermEmoji } from '../utils/gameHelpers';

interface TimeAttackScreenProps {
  onClose: () => void;
  gameStats: GameStats;
  collectedCardIds: string[];
  onUpdateStats: (updatedStats: GameStats) => void;
  onAcquireCards: (cardIds: string[]) => void;
}

export default function TimeAttackScreen({ onClose, gameStats, collectedCardIds, onUpdateStats, onAcquireCards }: TimeAttackScreenProps) {
  // ゲームの状態: 'intro' | 'playing' | 'looting' | 'result'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'looting' | 'result'>('intro');

  // お宝クリスタル選択（Loot Phase）関連の状態
  const [lootRound, setLootRound] = useState<number>(0);
  const [lootOptions, setLootOptions] = useState<TermCard[]>([]);
  const [selectedLootIndex, setSelectedLootIndex] = useState<number | null>(null);
  const [lootRevealed, setLootRevealed] = useState<boolean>(false);
  const [draftedCardsList, setDraftedCardsList] = useState<TermCard[]>([]);

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

  // 敵（己の幻影）のHP (要望により、最初の幻影はHP 500からスタート)
  const [enemyHp, setEnemyHp] = useState<number>(500);
  const [enemyMaxHp, setEnemyMaxHp] = useState<number>(500);
  const [playerHp, setPlayerHp] = useState<number>(500);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(500);
  const [defeatedCount, setDefeatedCount] = useState<number>(0);

  // 二重トリガーを完全に防ぐ防衛ガード
  const hasCompletedTimeAttackRef = useRef<boolean>(false);

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
  // 獲得カード詳細表示ポップアップ用
  const [selectedDetailCard, setSelectedDetailCard] = useState<TermCard | null>(null);

  // ハイスコア通知
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // プレイヤー画像（hero.jpg）をそのまま己の幻影として立ち上がらせる
  const PLAYER_IMAGE = './img/player/hero.jpg';

  // メッセージ表示用
  const [gameMessage, setGameMessage] = useState<string>('おのれの幻影が たちふさがった！');

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 効果音・BGMは冒険の仕様に合わせて完全無効化（パフォーマンス優先で動作軽量化）
  const playSound = (type: 'correct' | 'wrong' | 'comboUp' | 'superCombo' | 'tick' | 'timesUp' | 'start' | 'damage' | 'victory') => {
    // 完全に無効化（空関数）
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
    setPlayerHp(100);
    setPlayerMaxHp(100);
    setDefeatedCount(0);
    setGainedCards([]);
    setGameState('intro');
    setGameMessage('おのれの幻影が たちふさがった！');
    hasCompletedTimeAttackRef.current = false;
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

  // 時間カウント監視 (非ネスト構成で安定した時間毎の秒数減少処理)
  useEffect(() => {
    if (gameState === 'playing') {
      const timerInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          const nextVal = prev - 1;
          if (nextVal <= 0) {
            clearInterval(timerInterval);
            return 0;
          }
          if (nextVal <= 6) {
            playSound('tick');
          }
          return nextVal;
        });
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [gameState]);

  // 時間残量が0になった場合のトリガーをReactライフサイクル外に完全配置し、高負荷時の画面ロック/無限再更新を完全に撲滅
  useEffect(() => {
    if (gameState === 'playing' && timeRemaining <= 0) {
      handleTimesUp();
    }
  }, [timeRemaining, gameState]);

  // 時間切れ判定と報酬獲得フェーズの初期化
  const handleTimesUp = () => {
    if (hasCompletedTimeAttackRef.current) return;
    hasCompletedTimeAttackRef.current = true;

    playSound('timesUp');

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

    // 幻影を1体以上討伐した場合は「いつものカード選択画面(Loot Phase)」に移る。
    // そうでなければ直接リザルト判定へ移動
    if (defeatedCount > 0) {
      setGameState('looting');
      setLootRound(0);
      setDraftedCardsList([]);
      generateLootOptions([]);
    } else {
      setGainedCards([]);
      setGameState('result');
    }
  };

  // 報酬お宝カードの抽選オプション作成、未所持を優先
  const generateLootOptions = (gainedSoFar: TermCard[]) => {
    const pool = TERM_CARDS;
    const tempSelected: TermCard[] = [];
    const collectedAndGained = [...collectedCardIds, ...gainedSoFar.map(c => c.id)];

    const getTargetRarity = () => {
      const r = Math.random() * 100;
      if (r < 35) return 'C';
      if (r < 65) return 'UC';
      if (r < 85) return 'SR';
      if (r < 96) return 'UR';
      return 'LG';
    };

    let tries = 0;
    while (tempSelected.length < 3 && tries < 200) {
      tries++;
      const targetRarity = getTargetRarity();
      let candidates = pool.filter(c => c.rarity === targetRarity || (targetRarity === 'UC' && c.rarity === 'R'));
      if (candidates.length === 0) candidates = pool;
      
      const uncollected = candidates.filter(c => !collectedAndGained.includes(c.id));
      let finalPool = uncollected.length > 0 ? uncollected : candidates;
      finalPool = finalPool.filter(c => !tempSelected.some(ts => ts.id === c.id));
      
      if (finalPool.length > 0) {
        const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
        tempSelected.push(picked);
      }
    }

    while (tempSelected.length < 3) {
      const additional = pool.filter(c => !tempSelected.some(ts => ts.id === c.id));
      if (additional.length === 0) {
        tempSelected.push(pool[0]);
      } else {
        tempSelected.push(additional[Math.floor(Math.random() * additional.length)]);
      }
    }

    setLootOptions(shuffleArray(tempSelected).slice(0, 3));
    setSelectedLootIndex(null);
    setLootRevealed(false);
  };

  const handleLootCardClick = (idx: number) => {
    if (lootRevealed) return;
    setSelectedLootIndex(idx);
    setLootRevealed(true);
    playSound('correct');
  };

  const handleLootConfirm = () => {
    if (selectedLootIndex === null) return;
    const chosenCard = lootOptions[selectedLootIndex];
    const newDrafted = [...draftedCardsList, chosenCard];
    setDraftedCardsList(newDrafted);
    
    playSound('victory');

    const nextRound = lootRound + 1;
    if (nextRound < defeatedCount) {
      setLootRound(nextRound);
      generateLootOptions(newDrafted);
    } else {
      // 討伐数分すべての選択ドロップを完了し、リザルト画面に引き渡す
      setGainedCards(newDrafted);
      setGameState('result');
    }
  };

  // 各種レアリティバッジ/スタイルのヘルパー群
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

  const getMysticalCardStyle = (rarity: string, isFaceDown: boolean) => {
    return getMysticalCardStyleForLoot(rarity);
  };

  const getMysticalCardStyleForLoot = (rarity: string) => {
    switch (rarity) {
      case 'C': 
        return 'bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-slate-300 text-slate-955 shadow-[0_4px_12px_rgba(148,163,184,0.1)] hover:shadow-[0_12px_24px_rgba(148,163,184,0.25)]';
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

      // HP回復
      setPlayerHp((prev) => Math.min(playerMaxHp, prev + 10));

      // タイム増（最大30sリミット）
      setTimeRemaining((prev) => {
        const nextTime = prev + 3; // 正解時ボーナスを3秒に増加
        const boundedTime = nextTime > 45 ? 45 : nextTime;
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

      // 自爆ダメージ (しれんのほこらでは敵からのダメージを1に固定し、タイムアップのみで実質敗北するように変更)
      const selfDmg = 1;
      setDamagePopup({ amount: selfDmg, isCrit: false, isPlayer: true, visible: true });
      setTimeout(() => setDamagePopup(null), 850);
      
      const nextPlayerHp = Math.max(0, playerHp - selfDmg);
      setPlayerHp(nextPlayerHp);
      
      if (nextPlayerHp <= 0) {
        setGameMessage(`あなたの勇者は 力尽きた！`);
        setTimeout(() => {
          handleTimesUp();
        }, 1200);
      } else {
        setGameMessage(`詠唱失敗！ 呪文が 逆流した！`);
      }

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
      case 0: return 'ア';
      case 1: return 'イ';
      case 2: return 'ウ';
      case 3: return 'エ';
      default: return '▶';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 text-white flex flex-col justify-between items-center relative select-none font-sans py-4 px-3 md:px-6 overflow-x-hidden border-t-8 border-indigo-500">
      
      {/* 幻想的な神聖さを醸し出すグラデーション光 */}
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-550/5 via-transparent to-purple-550/10 pointer-events-none z-0" />
      
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
      <div className="w-full max-w-4xl flex-1 flex flex-col justify-center items-center z-10 p-1">
        
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
                    id="start-trial-btn"
                  >
                    ▶ 試練に いどむ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==============================================
            A2. プレイ試練進行中 (Side-by-Side 12-Column Grid Layout)
           ============================================== */}
        {gameState === 'playing' && (
          <div className={`w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center flex-1 min-h-[550px] ${
            screenAttackShake ? 'animate-screen-attack-shake' : ''
          } ${
            screenDamageShake ? 'animate-screen-damage-shake' : ''
          }`} id="timeattack-play-arena">
            {activeProblem ? (
              <>
            
            {/* 左4列: ドラクエ風ステータス・グラフィック窓 */}
            <div className="md:col-span-4 flex flex-col gap-3 w-full">
              
              {/* 魔物（幻影）のステータス窓 */}
              <div className="p-3 bg-slate-900 border-4 border-double border-blue-500 rounded-2xl flex flex-col items-center gap-2 relative shadow-lg text-white">
                <div className="text-cyan-400 font-bold text-[9px] tracking-widest border-b border-slate-800 w-full text-center pb-1">
                  ◆ ILLUSION STATS (てきのじょうたい) ◆
                </div>

                <div className="relative my-0.5">
                  {/* アバター画像 */}
                  <div className={`relative w-24 h-24 bg-slate-950 border-4 border-double border-cyan-400 rounded-xl overflow-hidden shadow-md transition-all duration-300 ${
                    enemyFlash ? 'animate-hit-shake' : ''
                  }`}>
                    <img 
                      referrerPolicy="no-referrer" 
                      src={PLAYER_IMAGE} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80';
                      }}
                      alt="おのれの幻影" 
                      className="absolute inset-0 w-full h-full object-cover opacity-80 invert hue-rotate-180 brightness-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-25">
                      <Swords className="text-cyan-500 animate-pulse" size={24} />
                    </div>

                    {showStrikeSlash && (
                      <div className="absolute inset-0 z-45 bg-yellow-400/25 flex items-center justify-center pointer-events-none overflow-hidden animate-pulse">
                        <div className="absolute bg-white border h-1 w-[150%] rotate-45 shadow-[0_0_8px_#fbbf24]" />
                        <div className="absolute bg-white border h-1 w-[150%] -rotate-45 shadow-[0_0_8px_#fbbf24]" />
                      </div>
                    )}
                  </div>

                  {/* ダメージポップアップ */}
                  {damagePopup && damagePopup.visible && !damagePopup.isPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <span className="text-2xl font-extrabold tracking-wider text-red-500 drop-shadow-[0_2px_6px_rgba(239,68,68,0.8)] animate-bounce font-mono">
                        -{damagePopup.amount} HP
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="font-extrabold text-cyan-300 text-xs tracking-wider text-center flex items-center gap-1">
                  <span>おのれの幻影</span>
                  <span className="text-[9px] bg-cyan-900/60 text-cyan-200 border border-cyan-500/50 px-1.5 py-0.2 rounded font-mono">Lv.99</span>
                </h3>

                {/* HPバー */}
                <div className="w-full">
                  <div className="flex justify-between text-[9px] font-bold text-cyan-300 mb-0.5">
                    <span>まものの HP</span>
                    <span>{enemyHp} / {enemyMaxHp}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full border border-slate-700 overflow-hidden p-[1px]">
                    <div 
                      className="bg-gradient-to-r from-cyan-650 to-cyan-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 勇者（自分）のステータス窓 */}
              <div className="p-3 bg-slate-900 border-4 border-double border-white rounded-2xl flex flex-col items-center gap-2 relative shadow-lg text-white">
                <div className="text-yellow-300 font-bold text-[9px] tracking-widest border-b border-slate-800 w-full text-center pb-1">
                  ◆ HERO STATS (あなたのじょうたい) ◆
                </div>

                <div className="relative my-0.5">
                  <div className="relative w-24 h-24 bg-slate-950 border-4 border-double border-white rounded-xl overflow-hidden shadow-md">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={PLAYER_IMAGE} 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80';
                      }}
                      alt="聖騎士" 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <Heart className="text-emerald-500 fill-emerald-100/50 animate-pulse" size={24} />
                    </div>

                    {showBarrierCrack && (
                      <div className="absolute inset-0 z-45 bg-red-800/60 flex flex-col items-center justify-center pointer-events-none">
                        <div className="text-white font-extrabold text-[8px] bg-red-900 border border-white px-1 py-0.5 rounded text-center animate-pulse tracking-wider">
                          🛡️ BREAK
                        </div>
                      </div>
                    )}
                  </div>

                  {damagePopup && damagePopup.visible && damagePopup.isPlayer && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-bounce">
                      <span className="text-2xl font-extrabold tracking-wider text-red-500 drop-shadow-[0_2px_6px_rgba(239,68,68,0.8)] font-mono">
                        自爆! -{damagePopup.amount}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="font-extrabold text-white text-xs tracking-wider text-center">
                  あなた (勇者)
                </h3>

                {/* プレイヤーHPバー */}
                <div className="w-full">
                  <div className="flex justify-between text-[9px] font-bold text-emerald-300 mb-0.5">
                    <span>あなたの HP</span>
                    <span>{playerHp} / {playerMaxHp}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full border border-slate-700 overflow-hidden p-[1px]">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右8列: 問題・詠唱＆コマンドカード */}
            <div className="md:col-span-8 flex flex-col gap-3 w-full">
              
              {/* 1) えいしょう残り時間メーター */}
              <div className="w-full bg-slate-950 border-4 border-yellow-405 rounded-xl p-4 shadow-[0_0_22px_rgba(234,179,8,0.35)] relative overflow-hidden flex flex-col gap-1.5 z-10">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-1.5">
                    <Timer className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`} />
                    <span className="text-xs font-black text-yellow-300 tracking-wider mb-[-1px]">えいしょう残り時間</span>
                  </div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                    {timeRemaining.toFixed(1)} <span className="text-xs text-slate-400">秒</span>
                  </div>
                </div>
                
                <div className="w-full bg-black border-2 border-yellow-500/60 h-10 rounded-lg overflow-hidden p-[2px] relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]">
                  {/* スタイリッシュな5秒ごとのグリッド目盛り(視認性強化) */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none z-20">
                    {[...Array(7)].map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-full w-0.5 ${idx === 0 || idx === 6 ? 'bg-transparent' : 'bg-white/20 border-r border-slate-950/40'}`} 
                        style={{ left: `${(idx / 6) * 100}%` }}
                      />
                    ))}
                  </div>

                  <div 
                    className={`h-full rounded-md transition-all duration-300 relative z-10 flex items-center justify-end shadow-[0_0_15px_rgba(234,179,8,0.5)] ${
                      timeRemaining <= 10 
                        ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 animate-pulse' 
                        : 'bg-gradient-to-r from-emerald-500 via-green-400 to-yellow-300'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / 30) * 100))}%` }}
                  >
                    {/* 進捗バーの先端にある高輝度の発光体（視認性の大幅アップ） */}
                    <div className="h-full w-3 bg-white rounded-r shadow-[0_0_12px_rgba(255,255,255,1),0_0_20px_rgba(234,179,8,1)]" />
                  </div>
                </div>

              </div>

              {/* 2) 詠唱中のコマンドカード */}
              <div className="w-full bg-slate-100 border-2 border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden shadow-sm">
                <div className="w-full text-center">
                  <span className="text-[10px] text-blue-800 font-mono font-black tracking-widest block uppercase mb-1">
                    // 詠唱スペル:
                  </span>
                  <p className="text-base font-extrabold text-slate-800 leading-normal font-sans">
                    {activeProblem.questionText}
                  </p>
                </div>
              </div>

              {/* 3) 解答パネル */}
              <div className="w-full grid grid-cols-1 gap-3 pt-1">
                {activeProblem.choices.map((choice, index) => {
                  const isSelected = selectedAnswer === index;
                  const isThisChoiceCorrect = index === activeProblem.correctIndex;
                  
                  let btnStyle = 'border-slate-750 bg-slate-900 text-slate-100 hover:border-yellow-400 hover:bg-slate-850 active:scale-[0.99] hover:shadow-md transition-all duration-150';
                  
                  if (isAnswered) {
                    if (isThisChoiceCorrect) {
                       btnStyle = 'border-emerald-450 bg-emerald-950 text-emerald-300 font-extrabold shadow-md scale-[1.01]';
                    } else if (isSelected) {
                       btnStyle = 'border-red-500 bg-red-950 text-red-300 font-bold';
                    } else {
                       btnStyle = 'border-slate-950 opacity-15 bg-slate-950 text-slate-850 scale-[0.98] pointer-events-none';
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isAnswered}
                      className={`w-full p-4 sm:p-5 rounded-xl border-2 text-left flex items-center gap-3.5 transition-all outline-none leading-relaxed text-xs sm:text-sm md:text-base cursor-pointer select-none font-black ${btnStyle}`}
                      id={`timeattack-choice-${index}`}
                    >
                      <span className="font-mono bg-black border border-slate-700 text-yellow-405 font-extrabold w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] shadow-inner font-black">
                        {getChoiceLabel(index)}
                      </span>
                      <span className="flex-1 leading-snug break-words">
                        {choice}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 4) 情報パネル & ログ */}
              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs relative overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-black/60 pointer-events-none" />

                <div className="flex-1 min-w-[120px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded relative z-10 h-8 flex items-center">
                  <p className="text-slate-300 font-mono text-[9px] sm:text-[10px] leading-tight line-clamp-1 select-text font-bold">
                    {gameMessage}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 relative z-10 text-[9px] font-mono shrink-0 select-none bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                  <div>れんげき: <span className={`font-black ${combo >= 5 ? 'text-yellow-400 animate-pulse text-xs' : 'text-slate-200'}`}>{combo}</span></div>
                  <div className="w-px bg-slate-800 h-3" />
                  <div>スコア: <span className="text-yellow-400 font-bold">{score} G</span></div>
                  <div className="w-px bg-slate-800 h-3" />
                  <div>撃破: <span className="text-cyan-400 font-bold">{defeatedCount}</span></div>
                </div>
              </div>

            </div>

              </>
            ) : (
              <div className="col-span-12 flex flex-col items-center justify-center py-20 gap-3" id="timeattack-spell-shuffle">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-cyan-405 font-mono text-xs font-black tracking-widest animate-pulse">// LOADING NEXT SPELL...</span>
              </div>
            )}
          </div>
        )}

        {/* ==============================================
            B. ほうしゅうお宝選択（Loot Phase）
           ============================================== */}
        {gameState === 'looting' && (
          <div className="w-full max-w-4xl bg-gradient-to-b from-sky-300 via-sky-50 to-emerald-100 text-slate-900 p-6 md:p-8 rounded-2xl flex flex-col items-center gap-6 shadow-2xl border-t-8 border-blue-600 relative overflow-hidden my-6 animate-fade-in z-50">
            {/* 優しい王道ファンタジーを感じる陽光 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none"></div>

            <div className="text-center space-y-1 z-10">
              <div className="flex items-center justify-center gap-1.5 bg-blue-600 px-4 py-1.5 rounded-full text-xs text-white font-extrabold uppercase tracking-wider shadow-md w-fit mx-auto">
                <Sparkles size={11} className="text-yellow-350 animate-bounce" />
                <span>お宝報酬カードの選択 ({lootRound + 1} / {defeatedCount} 枚目)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-blue-900 tracking-wider mt-2 font-sans">
                【 獲得するカードの選択 】
              </h2>
              <p className="text-xs text-slate-605 max-w-sm mx-auto font-bold mt-1">
                幻影を撃破した報酬として、実用カードを永続装備に加えることができます。
              </p>
            </div>

            {/* 3つの選択肢 */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-8 justify-center items-stretch my-2 z-10">
              {lootOptions.map((card, idx) => {
                const isSelected = selectedLootIndex === idx;
                return (
                  <div
                    key={card.id + '_' + idx}
                    onClick={() => setSelectedLootIndex(idx)}
                    className={`relative min-h-[340px] rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between p-5 bg-white shadow-md text-left font-sans ${
                      isSelected 
                        ? 'border-4 border-yellow-500 ring-4 ring-yellow-405/40 scale-102 shadow-2xl' 
                        : 'border-2 border-slate-300/80 hover:-translate-y-1 hover:border-blue-400'
                    }`}
                    id={`timeattack-loot-card-${idx}`}
                  >
                    {/* カードヘッダー */}
                    <div className="w-full border-b border-slate-205 pb-2 flex justify-between items-center text-[10px] font-bold text-slate-500 gap-2">
                      <span className={getRarityBadgeColor(card.rarity) + " shrink-0"}>
                        {getRarityName(card.rarity)}
                      </span>
                    </div>

                    {/* メイン絵文字枠と見出し */}
                    <div className="flex items-center gap-3.5 my-3 font-sans">
                      <span className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl select-none text-3xl leading-none shrink-0">{getTermEmoji(card.id)}</span>
                      <div className="flex flex-col text-left min-w-0 font-sans">
                        <h4 className="text-base font-black text-slate-900 leading-tight truncate group-hover:text-blue-705 transition-colors font-sans">
                          {card.name}
                        </h4>
                        {collectedCardIds.includes(card.id) ? (
                          <span className="text-[10px] bg-slate-200/60 text-slate-705 border border-slate-300 font-extrabold px-1.5 py-0.5 rounded shadow-3xs uppercase tracking-wider font-sans mt-1 self-start">
                            所持: {collectedCardIds.filter(id => id === card.id).length}枚
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-250/20 text-red-650 border border-rose-350 font-extrabold px-1.5 py-0.5 rounded shadow-3xs uppercase tracking-wider animate-pulse font-sans mt-0.5 self-start">
                            ★ 未所持
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 用語の定義 */}
                    <p className="text-xs sm:text-sm font-bold text-slate-800 text-left bg-slate-50/50 border border-slate-200 p-3 rounded-xl line-clamp-4 leading-relaxed flex-1 flex items-center font-sans">
                      {card.definition}
                    </p>

                    {/* 効果バフ */}
                    <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] sm:text-xs font-bold flex justify-between items-center text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded shadow-3xs font-sans">
                      <span>永続効果:</span>
                      <span className="text-blue-950 font-mono text-[10px] font-extrabold">
                        {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                        {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                        {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                        {card.statsBonus.timerBonus ? `Time +${(card.statsBonus.timerBonus * 0.5).toFixed(1)}秒` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 直接配置された決定ボタンエリア */}
            <div className="flex gap-4 w-full max-w-sm mt-4 justify-center z-10 font-sans">
              <button
                onClick={handleLootConfirm}
                disabled={selectedLootIndex === null}
                className={`flex-1 flex items-center justify-center gap-1.5 px-6 py-4 text-slate-950 font-black rounded-xl border transition-all text-sm tracking-wider shadow-lg ${
                  selectedLootIndex === null
                    ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-450 hover:to-amber-450 border-yellow-300 hover:scale-102 active:scale-95 cursor-pointer shadow-lg'
                }`}
                id="loot-confirm-btn"
              >
                <span>[ そうびする ]</span>
                <ArrowRight size={15} className="stroke-[3px]" />
              </button>
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
                TIME'S UP
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
                      <div 
                        key={idx} 
                        onClick={() => setSelectedDetailCard(card)}
                        className="flex justify-between items-center bg-slate-900 hover:bg-slate-850 hover:border-cyan-500/50 border border-slate-800 p-2 rounded-lg text-xs shadow-sm cursor-pointer transition-all active:scale-98 group"
                        title="タップでカード詳細を確認"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded bg-slate-855 border border-slate-800 flex items-center justify-center text-xs shrink-0 select-none">
                            {getTermEmoji(card.id)}
                          </span>
                          <span className={`text-[9px] font-black px-1 rounded shrink-0 ${
                            card.rarity === 'UR' ? 'bg-purple-900/60 text-purple-200 border border-purple-500/30' :
                            card.rarity === 'SR' ? 'bg-red-950/60 text-red-200 border border-red-500/30' :
                            card.rarity === 'UC' || card.rarity === 'R' ? 'bg-blue-950/60 text-blue-200 border border-blue-500/30' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {card.rarity}
                          </span>
                          <span className="font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">{card.name}</span>
                        </div>
                        <span className="text-[9.5px] font-mono text-cyan-400 font-bold shrink-0 ml-1.5">
                          {card.statsBonus.hp ? `HP +${(card.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                          {card.statsBonus.attack ? `ATK +${(card.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                          {card.statsBonus.xpBonus ? `XP +${(card.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
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

      {/* 獲得カード詳細表示ポップアップモーダル */}
      {selectedDetailCard && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 cursor-pointer animate-fade-in"
          onClick={() => setSelectedDetailCard(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-slate-900 border-4 rounded-2xl max-w-sm md:max-w-md w-full p-6 md:p-8 relative flex flex-col gap-5 text-left text-slate-100 overflow-hidden font-sans m-auto animate-scale-up ${
              selectedDetailCard.rarity === 'LG' ? 'border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.55)]' :
              selectedDetailCard.rarity === 'UR' ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.55)]' :
              selectedDetailCard.rarity === 'SR' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.55)]' :
              selectedDetailCard.rarity === 'UC' || selectedDetailCard.rarity === 'R' ? 'border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.55)]' :
              'border-slate-750 shadow-2xl'
            }`}
          >
            {/* 装飾コーナー */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <button 
              onClick={() => setSelectedDetailCard(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-full cursor-pointer z-50"
              aria-label="閉じる"
            >
              <Zap size={16} className="rotate-45" />
            </button>

            {/* ヘッダーエリア */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4 z-10 font-sans">
              <span className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl select-none text-4xl leading-none shadow-inner animate-[pulse_3s_infinite]">
                {getTermEmoji(selectedDetailCard.id)}
              </span>
              <div className="flex flex-col min-w-0 font-sans">
                <div className="flex items-center gap-2 mb-1.5 font-sans">
                  <span className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded border ${
                    selectedDetailCard.rarity === 'LG' ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 text-[10px] animate-pulse' :
                    selectedDetailCard.rarity === 'UR' ? 'bg-purple-950/90 text-purple-300 border-purple-500/50' :
                    selectedDetailCard.rarity === 'SR' ? 'bg-red-950/90 text-red-300 border-red-500/50' :
                    selectedDetailCard.rarity === 'UC' || selectedDetailCard.rarity === 'R' ? 'bg-blue-950/90 text-blue-300 border-blue-500/50' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {selectedDetailCard.rarity === 'LG' ? 'LEGENDARY' :
                     selectedDetailCard.rarity === 'UR' ? 'ULTRA RARE' :
                     selectedDetailCard.rarity === 'SR' ? 'SUPER RARE' :
                     selectedDetailCard.rarity === 'UC' || selectedDetailCard.rarity === 'R' ? 'UNCOMMON' : 'COMMON'}
                  </span>
                  <span className="text-[10.5px] text-slate-450 font-mono font-bold tracking-tight">ID: {selectedDetailCard.id}</span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-wide truncate leading-tight font-sans">
                  {selectedDetailCard.name}
                </h3>
              </div>
            </div>

            {/* カード説明内容 */}
            <div className="space-y-4 font-sans text-xs sm:text-sm leading-relaxed z-10 flex-1 overflow-y-auto max-h-60 pr-1 select-text custom-scrollbar font-sans border-b border-slate-800 pb-4">
              <div className="font-bold text-slate-200">
                <span className="text-cyan-400 font-bold mr-1 bg-cyan-950/30 px-1.5 py-0.5 rounded text-[11px] font-sans">定義</span>
                {(selectedDetailCard.descriptions && selectedDetailCard.descriptions[0]) || selectedDetailCard.definition}
              </div>
              
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 text-slate-300 text-[11px] sm:text-xs leading-normal">
                <span className="block text-purple-400 font-extrabold text-[10px] uppercase tracking-widest mb-1.5 font-sans">試験対策知識 (解説フレーバー)</span>
                <p className="whitespace-pre-line leading-relaxed font-sans font-semibold">
                  {(selectedDetailCard.flavorTexts && selectedDetailCard.flavorTexts[0]) || selectedDetailCard.flavorText}
                </p>
              </div>
            </div>

            {/* 統一されたバフ効果 */}
            <div className="text-xs font-bold text-yellow-350 bg-slate-950 p-3.5 rounded-xl border border-slate-850/60 flex flex-col gap-2 font-mono">
              <div className="flex justify-between items-center text-blue-300 border-b border-slate-900 pb-1.5 text-[11px]">
                <span className="font-sans font-bold">常時図鑑ボーナス (パッシブ効果):</span>
                <span className="font-mono text-blue-400 font-extrabold animate-[pulse_4s_infinite]">
                  {selectedDetailCard.statsBonus.hp ? `HP +${(selectedDetailCard.statsBonus.hp * 0.5).toFixed(1)} ` : ''}
                  {selectedDetailCard.statsBonus.attack ? `ATK +${(selectedDetailCard.statsBonus.attack * 0.5).toFixed(1)} ` : ''}
                  {selectedDetailCard.statsBonus.xpBonus ? `XP +${(selectedDetailCard.statsBonus.xpBonus * 0.5).toFixed(1)}% ` : ''}
                  {selectedDetailCard.statsBonus.timerBonus ? `Time +${(selectedDetailCard.statsBonus.timerBonus * 0.5).toFixed(1)}s` : ''}
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
              onClick={() => setSelectedDetailCard(null)}
              className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-750 hover:from-slate-700 hover:to-slate-650 rounded-xl text-white font-extrabold select-none transition-all cursor-pointer text-xs active:scale-97 border border-slate-700/50 shadow-md font-sans animate-pulse"
            >
              [ とじる ]
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
