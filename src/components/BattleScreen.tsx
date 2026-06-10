/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Swords, Shield, Heart, Zap, Timer, ChevronRight, HelpCircle, Skull, AlertTriangle, ShieldAlert, Award } from 'lucide-react';
import { BattleState, TermCard, RawProblem } from '../types';
import { TERM_CARDS } from '../data/problems';
import { getTermEmoji, getEnemyConfig } from '../utils/gameHelpers';

interface BattleScreenProps {
  battleState: BattleState;
  allProblems: RawProblem[];
  playerAttack: number;
  playerMaxHp: number; // 追加
  timerBonus: number; // カード効果による制限時間増加
  onAnswer: (isCorrect: boolean, isTimeout: boolean, elapsedSeconds: number, clickedIndex: number) => void;
  onNextQuestion: () => void;
  onFinishBattle: (droppedCard: TermCard | null, gainedXp: number) => void;
  onGameOver: () => void;
}

export default function BattleScreen({
  battleState,
  playerAttack,
  playerMaxHp, // 追加
  timerBonus,
  onAnswer,
  onNextQuestion,
  onFinishBattle,
  onGameOver
}: BattleScreenProps) {
  const {
    currentNode,
    activeProblem,
    playerHp,
    enemyHp,
    enemyMaxHp,
    enemyName,
    isAnswered,
    selectedAnswer,
    isCorrect
  } = battleState;

  // 制限時間は30秒。カード効果補正を追加。
  const maxTimer = 30 + timerBonus;
  const [timeLeft, setTimeLeft] = useState(maxTimer);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [nextActionCooldown, setNextActionCooldown] = useState(0);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

  // 「次のターンへすすむ」ボタンのクールダウン用（間違えた場合に5秒待たせる）
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (nextActionCooldown > 0) {
      intervalId = setInterval(() => {
        setNextActionCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [nextActionCooldown]);

  // 戦闘勝利オーバーレイ用ステート
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [deferredFinishArgs, setDeferredFinishArgs] = useState<{ dropped: TermCard | null, gainedXp: number } | null>(null);
  const victoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (victoryTimeoutRef.current) {
        clearTimeout(victoryTimeoutRef.current);
      }
    };
  }, []);
  
  // 視覚演出用フラッシュ、ブレ
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [screenAttackShake, setScreenAttackShake] = useState(false); // 攻撃用の揺れ
  const [screenDamageShake, setScreenDamageShake] = useState(false); // 被弾用の揺れ
  const [showStrikeSlash, setShowStrikeSlash] = useState(false);
  const [showBarrierCrack, setShowBarrierCrack] = useState(false);

  // ダメージ数字ポップアップ用ローカルステート
  const [enemyDamage, setEnemyDamage] = useState<{ amount: number; isCrit: boolean; id: number } | null>(null);
  const [playerDamage, setPlayerDamage] = useState<{ amount: number; id: number } | null>(null);

  // 解説モーダルで表示する直近の戦闘結果
  const [lastRoundResult, setLastRoundResult] = useState<{
    playerDamageDealt: number;
    playerDamageReceived: number;
    isCrit: boolean;
    isTimeout: boolean;
    elapsed: number;
  } | null>(null);

  // HPの変化を監視するためのRef
  const prevPlayerHpRef = useRef(playerHp);
  const prevEnemyHpRef = useRef(enemyHp);

  // タイマーのインターバル管理
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // プレイヤー画像：量子魔導ハッカー (仮画像: ./img/player/hero.jpg | フォールバック: Unsplash)
  const PLAYER_IMAGE = './img/player/hero.jpg';
  const FALLBACK_PLAYER_IMAGE = 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=400&q=80';

  // 敵のカテゴリに応じたUnsplashイラスト（戦闘画面専用：迫力がある攻撃的なグラフィック。すべて被りなしで別の画像を指定）
  const getEnemyImage = (name: string) => {
    if (name.includes('NEO-HYDRA')) {
      return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80'; // 量子コア・オメガ
    }
    if (name.includes('AEGIS_V2')) {
      return 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'; // 防衛セキュリティ盾
    }
    if (name.includes('LEPTO.java')) {
      return 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=400&q=80'; // 亡霊コードウィーバー
    }
    if (name.includes('BUG-GOBLIN')) {
      return 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=400&q=80'; // 微細バグウイルス
    }
    if (name.includes('DATA-LEAK SLIME')) {
      return 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'; // 液状エラー
    }
    return 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80'; // 汎用
  };

  // HP減少の監視を個別に。自動でダメージ消去をタイマー制御
  useEffect(() => {
    // プレイヤーHP減少検知
    if (playerHp < prevPlayerHpRef.current) {
      const diff = prevPlayerHpRef.current - playerHp;
      setPlayerDamage({ amount: diff, id: Date.now() });
      prevPlayerHpRef.current = playerHp;

      const timerId = setTimeout(() => {
        setPlayerDamage(null);
      }, 1500);
      return () => clearTimeout(timerId);
    } else {
      prevPlayerHpRef.current = playerHp; // 増加または同一
    }
  }, [playerHp]);

  useEffect(() => {
    // 敵HP減少検知
    if (enemyHp < prevEnemyHpRef.current) {
      const diff = prevEnemyHpRef.current - enemyHp;
      const isCrit = diff > playerAttack; 
      setEnemyDamage({ amount: diff, isCrit, id: Date.now() + 1 });
      prevEnemyHpRef.current = enemyHp;

      // エフェクト時間を短縮 (600ms)
      const timerId = setTimeout(() => {
        setEnemyDamage(null);
      }, 600);
      return () => clearTimeout(timerId);
    } else {
      prevEnemyHpRef.current = enemyHp; // 増加または同一
      if (enemyHp <= 0) {
        setEnemyDamage(null);
      }
    }
  }, [enemyHp, playerAttack]);

  // タイマー作動
  useEffect(() => {
    if (isAnswered || showExplanation) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(maxTimer);
    setElapsedTime(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const diff = (now - startTime) / 1000;
      const tLeft = Math.max(0, maxTimer - diff);
      setTimeLeft(tLeft);
      setElapsedTime(diff);

      // タイムアウト
      if (tLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSelection(-1, true);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeProblem, isAnswered, showExplanation]);

  // 回答処理
  const handleSelection = (index: number, isTimeout = false) => {
    if (isAnswered) return;

    let correct = false;
    if (!isTimeout && activeProblem) {
      correct = index === activeProblem.correctIndex;
    }

    let dealt = 0;
    let received = 0;
    let isCrit = false;
    const elapsed = isTimeout ? maxTimer : elapsedTime;

    if (correct) {
      let mult = 1.0;
      if (elapsed < 3.0) {
        mult = 2.0;
        isCrit = true;
      } else if (elapsed < 6.0) {
        mult = 1.5;
      }
      dealt = Math.round(playerAttack * mult);
    } else {
      // 敵 Config の設計された攻撃ダメージを正しく取得
      const enemyConfig = getEnemyConfig(currentNode.type as 'battle_easy' | 'battle_hard' | 'boss', currentNode.step);
      received = enemyConfig.damage;
    }

    setLastRoundResult({
      playerDamageDealt: dealt,
      playerDamageReceived: received,
      isCrit,
      isTimeout,
      elapsed
    });

    // 敵・プレイヤーへの被弾のビジュアルブレ＆フラッシュ
    if (correct) {
      setEnemyFlash(true);
      setShakeEnemy(true);
      setShowStrikeSlash(true);
      setScreenAttackShake(true); // 攻撃特有の激しい揺れ！
      setTimeout(() => {
        setEnemyFlash(false);
        setShakeEnemy(false);
        setShowStrikeSlash(false);
        setScreenAttackShake(false);
      }, 500);
    } else {
      setPlayerFlash(true);
      setShakePlayer(true);
      setShowBarrierCrack(true);
      setScreenDamageShake(true); // 被弾特有の重い揺れ！
      setTimeout(() => {
        setPlayerFlash(false);
        setShakePlayer(false);
        setShowBarrierCrack(false);
        setScreenDamageShake(false);
      }, 500);
    }

    onAnswer(correct, isTimeout, isTimeout ? maxTimer : elapsedTime, index);
    setTimeout(() => {
      setShowExplanation(true);
      if (!correct) {
        setNextActionCooldown(5);
      } else {
        setNextActionCooldown(0);
      }
    }, 500);
  };

  const enemyHpPercent = Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100));

  const handleVictoryClick = () => {
    if (victoryTimeoutRef.current) {
      clearTimeout(victoryTimeoutRef.current);
      victoryTimeoutRef.current = null;
    }
    if (deferredFinishArgs) {
      onFinishBattle(deferredFinishArgs.dropped, deferredFinishArgs.gainedXp);
    }
  };

  const handleNextAction = () => {
    setShowExplanation(false);
    
    // HP確認とゲームオーバー発動
    if (playerHp <= 0) {
      onGameOver();
      return;
    }

    // 敵HPが0になった場合のみ、勝利してマップに進める
    if (enemyHp <= 0) {
      const isBoss = currentNode.type === 'boss';
      let gainedXp = isBoss ? 60 : (currentNode.type === 'battle_hard' ? 35 : 20);
      
      const roll = Math.random() * 105;
      let dropped: TermCard | null = null;
      
      if (isBoss || roll < 80) {
        const unowned = TERM_CARDS.filter(c => c.id);
        dropped = unowned[Math.floor(Math.random() * unowned.length)];
      }

      setDeferredFinishArgs({ dropped, gainedXp });
      setShowVictoryOverlay(true);

      const timerId = setTimeout(() => {
        onFinishBattle(dropped, gainedXp);
      }, 1000);
      victoryTimeoutRef.current = timerId;
    } else {
      onNextQuestion();
    }
  };

  // 敵のシンボル・ベクターグラフィック (ライトファンタジー調)
  const renderEnemyVisual = () => {
    const isBoss = currentNode.type === 'boss';
    const isHard = currentNode.type === 'battle_hard';
    const bgImage = currentNode.monsterImagePath || getEnemyImage(enemyName);

    return (
      <div className="relative w-32 h-32 md:w-36 md:h-36 bg-slate-100 border-4 border-double border-white rounded-xl overflow-hidden shadow-md group">
        <img 
          referrerPolicy="no-referrer" 
          src={bgImage} 
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (currentNode.monsterFallbackImage) {
              e.currentTarget.src = currentNode.monsterFallbackImage;
            }
          }}
          alt={enemyName} 
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          {isBoss ? (
            <Skull className="text-red-500 animate-[bounce_1.5s_infinite] drop-shadow-[0_2px_8px_rgba(239,68,68,0.7)]" size={44} />
          ) : isHard ? (
            <ShieldAlert className="text-purple-500 animate-pulse" size={38} />
          ) : (
            <Swords className="text-blue-600 animate-pulse" size={36} />
          )}
        </div>

        {/* プレイヤーからの超電導スラッシュ攻撃エフェクト */}
        {showStrikeSlash && (
          <div className="absolute inset-0 z-40 bg-yellow-400/20 flex items-center justify-center pointer-events-none overflow-hidden animate-[pulse_0.15s_infinite]">
            {/* 閃光斜線1 */}
            <div className="absolute bg-white border-2 border-yellow-300 h-1.5 w-[160%] rotate-45 shadow-[0_0_12px_#fbbf24] animate-[ping_0.25s_ease-out_infinite]" />
            {/* 閃光斜線2 */}
            <div className="absolute bg-white border-2 border-yellow-300 h-1.5 w-[160%] -rotate-45 shadow-[0_0_12px_#fbbf24] animate-[ping_0.25s_ease-out_infinite]" />
            <div className="absolute text-yellow-100 drop-shadow-[0_4px_10px_#f59e0b] font-black text-3xl animate-bounce">⚡⚡</div>
          </div>
        )}
      </div>
    );
  };

   // プレイヤーアバター
  const renderPlayerVisual = () => {
    return (
      <div className="relative w-32 h-32 md:w-36 md:h-36 bg-slate-100 border-4 border-double border-white rounded-xl overflow-hidden shadow-md group">
        <img 
          referrerPolicy="no-referrer" 
          src={PLAYER_IMAGE} 
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_PLAYER_IMAGE;
          }}
          alt="聖騎士" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/40 via-transparent to-transparent"></div>
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <Heart className="text-emerald-500 fill-emerald-100/50 animate-pulse" size={38} />
        </div>

        {/* 敵からの痛恨のバリア破壊被弾エフェクト */}
        {showBarrierCrack && (
          <div className="absolute inset-0 z-40 bg-red-800/60 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
            {/* 水平の強サイバー警告グリッド線 */}
            <div className="absolute left-0 right-0 h-1 bg-red-400 opacity-80" style={{ top: '30%' }}></div>
            <div className="absolute left-0 right-0 h-1 bg-red-450 opacity-80" style={{ top: '65%' }}></div>
            <div className="text-white font-extrabold text-[11px] bg-red-900 border border-white px-2 py-0.5 rounded text-center shadow-md uppercase tracking-wider scale-110 animate-pulse">
              🛡️ BARRIER BREAK
            </div>
            {/* 血飛沫的な赤い網目のグリフ */}
            <div className="absolute inset-0 border-4 border-dashed border-red-500 opacity-60"></div>
          </div>
        )}
      </div>
    );
  };

  if (!activeProblem) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-sky-200 via-sky-50 to-emerald-50 text-slate-800 p-4 md:p-6 flex flex-col justify-between font-sans relative overflow-hidden border-t-8 border-blue-500 select-none transition-all duration-300 ${screenAttackShake ? 'animate-screen-attack-shake' : ''} ${screenDamageShake ? 'animate-screen-damage-shake' : ''}`}>
      
      {/* タイムアウト/被弾時の血湧きフラッシュ（赤） */}
      <div className={`absolute inset-0 bg-red-600/35 pointer-events-none transition-opacity duration-150 ${playerFlash ? 'opacity-100' : 'opacity-0'} z-50`}></div>
      {/* 攻撃成功時の聖なるフラッシュ（金）★さらにわかりやすく明るい黄色に！ */}
      <div className={`absolute inset-0 bg-yellow-400/45 pointer-events-none transition-opacity duration-150 ${enemyFlash ? 'opacity-100' : 'opacity-0'} z-50 mix-blend-screen`}></div>

      {/* トップ戦闘情報 */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-4 z-10 border-b border-blue-200 pb-3 text-xs font-bold text-blue-900 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-blue-600 animate-bounce" />
          <span>エンカウント: {currentNode.label.includes('・') ? currentNode.label.split('・')[0] : currentNode.label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* あきらめるボタン (出題中や戦闘中でも即座に撤退可能) */}
          <button
            onClick={() => setShowGiveUpConfirm(true)}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-300 rounded text-red-650 flex items-center gap-1 cursor-pointer transition-colors font-extrabold text-[10px]"
            id="battle-giveup-btn"
          >
            <span>あきらめる</span>
          </button>

          <div className="text-white tracking-wider bg-blue-700 px-3 py-1 rounded-full border border-blue-405 shadow text-[10px]">
            たたかいの段階: <span className="text-yellow-300 font-extrabold">{battleState.currentQuestionIndex + 1}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1 z-10">
        
        {/* ステータス窓エリア (左4列) - ドラクエ風ステータスウィンドウ */}
        <div className="md:col-span-4 flex flex-col gap-4">
          
          {/* 魔物のステータス窓 */}
          <div className={`p-4 bg-blue-900 border-4 border-double border-white rounded-2xl flex flex-col items-center gap-3 relative shadow-lg text-white transition-all duration-300 ${
            enemyHp <= 0 ? 'opacity-50 scale-95' : ''
          }`}>
            
            <div className="text-yellow-300 font-bold text-[10px] tracking-widest border-b border-blue-800 w-full text-center pb-1.5">
              ◆ MONSTER STATS (てきのじょうたい) ◆
            </div>

            {/* シンボル＆画像レンダラー：こちらの攻撃成功時は、敵の画像のみ揺れるエフェクトを適用 */}
            <div className={`my-1 relative transition-all duration-300 ${
              shakeEnemy ? 'animate-hit-shake animate-flash-gold' : ''
            }`}>
              {renderEnemyVisual()}
              
              {/* 敵への被弾フローティングダメージポップアップ */}
              {enemyDamage && (
                <div key={enemyDamage.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <span className="text-3xl font-extrabold tracking-wider text-red-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.6)] animate-bounce font-mono">
                    -{enemyDamage.amount.toFixed(1)} HP
                  </span>
                </div>
              )}
            </div>

            <h3 className="font-extrabold text-white text-base tracking-wider text-center">
              {enemyName}
            </h3>

            {/* 敵HPバー */}
            <div className="w-full">
              <div className="flex justify-between text-[11px] font-bold text-red-300 mb-1">
                <span>モンスターの HP</span>
                <span>{enemyHp.toFixed(1)} / {enemyMaxHp.toFixed(1)}</span>
              </div>
              <div className="w-full bg-blue-950 h-3 rounded-full border-2 border-white overflow-hidden p-[1px]">
                <div 
                  className="bg-gradient-to-r from-red-650 to-red-500 h-full rounded-full transition-all duration-350"
                  style={{ width: `${enemyHpPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 勇者のステータス窓 */}
          <div className={`p-4 bg-blue-950 border-4 border-double border-white rounded-2xl flex flex-col items-center gap-3 relative shadow-lg text-white transition-all duration-300 ${
            shakePlayer ? 'animate-hit-shake animate-flash-red' : ''
          }`}>
            <div className="text-yellow-300 font-bold text-[10px] tracking-widest border-b border-blue-900 w-full text-center pb-2">
              ◆ PARTY MEMBER (あなたのじょうたい) ◆
            </div>

            <div className="relative">
              {renderPlayerVisual()}

              {/* プレイヤーへのダメージポップアップ */}
              {playerDamage && (
                <div key={playerDamage.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <span className="text-4xl font-extrabold tracking-wider text-red-500 drop-shadow-[0_4px_12px_rgba(239,68,68,0.9)] animate-damage-float">
                    痛恨! -{playerDamage.amount.toFixed(1)} HP
                  </span>
                </div>
              )}
            </div>
            
            {/* プレイヤーHPバー */}
            <div className="w-full">
              <div className="flex justify-between text-[11px] font-bold text-emerald-300 mb-1">
                <span>あなたの HP</span>
                <span>{playerHp.toFixed(1)} / {playerMaxHp.toFixed(1)}</span>
              </div>
              <div className="w-full bg-blue-950 h-3 rounded-full border-2 border-white overflow-hidden p-[1px]">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-350 animate-pulse"
                  style={{ width: `${Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* プレイヤー攻撃力情報 */}
            <div className="flex justify-end items-center text-xs font-bold text-white mt-1 w-full border-t border-blue-900 pt-2 px-1">
              <span className="flex items-center gap-1 text-yellow-300">
                <Swords size={12} />
                <span>攻撃力: {playerAttack.toFixed(1)}</span>
              </span>
            </div>
          </div>

        </div>

        {/* 試煉の問題・回答カード (右8列) */}
        <div className="md:col-span-8 flex flex-col gap-4">
          
          {/* 魔導書の問題フレーム（問題文の表示） */}
          <div className="bg-amber-50 border-4 border-amber-900 rounded-3xl p-5 md:p-6 shadow-md relative flex flex-col gap-4 text-slate-900">
            {/* 装飾コーナー */}
            <div className="absolute top-3 left-3 text-amber-800/20 text-xs select-none">◆</div>
            <div className="absolute top-3 right-3 text-amber-800/20 text-xs select-none">◆</div>
            <div className="absolute bottom-3 left-3 text-amber-800/20 text-xs select-none">◆</div>
            <div className="absolute bottom-3 right-3 text-amber-800/20 text-xs select-none">◆</div>

            <div className="flex justify-between items-center border-b border-amber-900/10 pb-2 mb-1 w-full text-xs font-black text-amber-800/90 tracking-widest leading-none select-none">
              <span>✦ IT QUEST 詠唱試練 ✦</span>
              <span>{activeProblem.type === 'term_to_def' ? '用語の意味を詠唱せよ！' : '正しいIT用語を詠唱せよ！'}</span>
            </div>

            {/* 問題文表示 */}
            <div className="text-sm md:text-base font-black leading-relaxed tracking-wider py-1.5 whitespace-pre-wrap select-text">
              {activeProblem.questionText}
            </div>

            {/* 詠唱タイムゲージプログレスバー */}
            <div className="w-full mt-2">
              <div className="flex justify-between items-center text-[10px] font-extrabold mb-1">
                <span className="text-amber-800 flex items-center gap-1">
                  <Timer size={11} className="animate-spin text-red-500" />
                  <span>詠唱の制限時間 (残り {timeLeft.toFixed(1)}秒)</span>
                </span>
                <span className={`font-mono font-black ${timeLeft <= 8 ? 'text-red-150 animate-pulse text-xs text-red-650' : 'text-slate-600'}`}>
                  {timeLeft.toFixed(1)}/{maxTimer.toFixed(1)}s
                </span>
              </div>
              <div className="bg-amber-900/10 h-2.5 rounded-full border border-amber-900/30 overflow-hidden p-[1px]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    timeLeft <= 8 ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' :
                    timeLeft <= 15 ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                    'bg-gradient-to-r from-indigo-600 to-indigo-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / maxTimer) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 解答パネル (選択肢数が4枚以下の場合は1列で広くダイナミック、それ超は2列で折り返しを許容し、絶対に文字省略をしない) */}
          <div className={`grid gap-3 ${
            activeProblem.choices.length > 4 
              ? 'grid-cols-2' 
              : 'grid-cols-1'
          }`}>
            {activeProblem.choices.map((choice, index) => {
              const matchesSelected = selectedAnswer === index;
              const matchesCorrect = activeProblem.correctIndex === index;
              
              let choiceStyle = 'bg-white hover:bg-blue-50 border-blue-200 text-blue-950 hover:border-blue-400 active:scale-98 cursor-pointer shadow-md';

              if (isAnswered) {
                if (matchesCorrect) {
                  choiceStyle = 'bg-emerald-100 border-emerald-500 text-emerald-800 pointer-events-none font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]';
                } else if (matchesSelected) {
                  choiceStyle = 'bg-red-100 border-red-500 text-red-800 pointer-events-none font-bold';
                } else {
                  choiceStyle = 'bg-white border-slate-100 text-slate-300 pointer-events-none opacity-40';
                }
              }

              // 4択時のリッチで広大なデザインと、多択時のデザインの動的調整
              const btnPaddingClass = activeProblem.choices.length > 4 
                ? 'p-3 md:p-4.5 text-[12.5px] md:text-[14px]' 
                : 'p-5 md:p-6 text-[15px] md:text-[17px]';

              return (
                <button
                  key={index}
                  onClick={() => handleSelection(index)}
                  disabled={isAnswered}
                  className={`${btnPaddingClass} text-left rounded-2xl border-2 leading-relaxed transition-all flex justify-between items-center font-bold gap-3 ${choiceStyle}`}
                  id={`choice-btn-${index}`}
                >
                  <span className="break-words pr-1 leading-relaxed">{choice}</span>
                  {isAnswered && matchesCorrect && (
                    <span className="text-[10px] md:text-xs bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-full shadow-sm shrink-0 whitespace-nowrap">
                      せいかい！
                    </span>
                  )}
                  {isAnswered && matchesSelected && !matchesCorrect && (
                    <span className="text-[10px] md:text-xs bg-red-500 text-white font-extrabold px-3 py-1 rounded-full shadow-sm shrink-0 whitespace-nowrap">
                      ミス！
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* 試煉結果パネルモーダル (解説＆次ステップ - ドラクエ風ウィンドウ) */}
      {showExplanation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-blue-900 border-4 border-double border-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-4 text-center text-white">
            
            <div className="flex flex-col items-center gap-1">
              <div className={`p-3 rounded-full mb-1 border-2 ${
                isCorrect 
                  ? 'bg-yellow-300 border-white text-blue-900 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce' 
                  : 'bg-red-500 border-white text-white animate-bounce'
              }`}>
                {isCorrect ? <Zap size={28} /> : <AlertTriangle size={28} />}
              </div>
              
              <h3 className="text-base font-extrabold tracking-wider text-yellow-350">
                {isCorrect ? '★ 攻撃成功！ ★' : '★ 被弾！ ★'}
              </h3>
              <p className="text-xs text-blue-100 font-bold">
                {isCorrect ? `${enemyName} に ${lastRoundResult?.playerDamageDealt.toFixed(1)} ダメージを与えた！` : `プレイヤーが ${lastRoundResult?.playerDamageReceived.toFixed(1)} ダメージを受けた！`}
              </p>
            </div>

            {lastRoundResult && (
              <div className={`p-3.5 rounded-xl border-2 text-xs font-bold flex flex-col gap-1.5 shadow-inner text-center items-center justify-center ${
                isCorrect 
                  ? 'bg-blue-950/40 border-yellow-405/45 text-yellow-300' 
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}>
                {isCorrect ? (
                  <div className="text-white font-bold text-sm">
                    モンスターにあたえたダメージ: <span className="text-xl font-black text-yellow-300">-{lastRoundResult.playerDamageDealt}</span> HP
                  </div>
                ) : (
                  <div className="text-white font-bold text-sm">
                    うけたダメージ: <span className="text-xl font-black text-red-400">-{lastRoundResult.playerDamageReceived}</span> HP
                  </div>
                )}
                <span className="text-xs text-blue-200 font-semibold">
                  回答スピード: {lastRoundResult.elapsed.toFixed(1)}秒 / {maxTimer.toFixed(1)}秒
                </span>
              </div>
            )}

            {/* 用語名と定義 */}
            {(() => {
              return (
                <div className="bg-blue-950 p-4 rounded-xl border-2 border-blue-800 text-left flex flex-col gap-2.5">
                  <h4 className="font-extrabold text-lg md:text-xl text-yellow-300 flex items-center gap-2.5 mt-1 border-b border-blue-900 pb-2">
                    <span className="text-2xl md:text-3xl p-1 bg-blue-900/40 rounded-lg">{getTermEmoji(activeProblem.raw.id)}</span>
                    <span>{activeProblem.raw.termName}</span>
                  </h4>
                  <p className="text-xs md:text-sm text-blue-50 font-bold leading-relaxed bg-blue-900/40 p-3 rounded-lg border border-blue-800/60">
                    {activeProblem.raw.definition}
                  </p>
                  {activeProblem.raw.explanation && (
                    <div className="pt-2 border-t border-blue-900/40">
                      <p className="text-[10.5px] text-emerald-400 italic font-semibold leading-relaxed pl-1">
                        &ldquo;{activeProblem.raw.explanation}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            <button
              onClick={nextActionCooldown > 0 ? undefined : handleNextAction}
              disabled={nextActionCooldown > 0}
              className={`w-full py-3 text-white font-extrabold rounded-xl border-2 transition-all flex items-center justify-center gap-1.5 text-xs tracking-wider ${
                nextActionCooldown > 0 
                  ? 'bg-slate-500 border-slate-600 opacity-60 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:-translate-y-0.5 border-yellow-300 cursor-pointer shadow-md active:scale-95'
              }`}
              id="next-action-btn"
            >
              <span>{enemyHp <= 0 ? 'モンスターを倒してお宝を手に入れる！' : '次のターンへすすむ'}</span>
              {nextActionCooldown === 0 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* あきらめる（退却）確認ダイアログ */}
      {showGiveUpConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-blue-900 border-4 border-double border-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative flex flex-col gap-4 text-center text-white select-none">
            <div className="flex flex-col items-center gap-1">
              <div className="p-3 rounded-full mb-1 bg-red-500 border-2 border-white text-white animate-bounce">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-base font-extrabold tracking-wider text-yellow-350">
                本当に退却しますか？
              </h3>
              <p className="text-xs text-blue-105 font-medium leading-relaxed px-2 mt-1">
                これまでの経験値や、この冒険中に獲得したバフカード、現在の進行度はリセットされます。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => {
                  setShowGiveUpConfirm(false);
                  onGameOver();
                }}
                className="py-2.5 bg-red-600 hover:bg-red-700 hover:-translate-y-0.5 text-white font-extrabold rounded-xl border border-red-400 cursor-pointer shadow-md active:scale-95 transition-all text-xs"
                id="giveup-confirm-yes"
              >
                退却する
              </button>
              <button
                onClick={() => setShowGiveUpConfirm(false)}
                className="py-2.5 bg-blue-950 hover:bg-blue-900 hover:-translate-y-0.5 text-white font-extrabold rounded-xl border border-blue-800 cursor-pointer shadow-md active:scale-95 transition-all text-xs"
                id="giveup-confirm-no"
              >
                続ける
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 戦闘勝利オーバーレイ (1秒後に自動遷移 or クリック) */}
      {showVictoryOverlay && (
        <div 
          onClick={handleVictoryClick}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in cursor-pointer select-none"
          id="victory-overlay-modal"
        >
          <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-scale-up">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-4 border-white flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.65)] animate-bounce text-white">
              <Award size={48} className="stroke-white" />
            </div>

            <div className="space-y-2 mt-4">
              <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]">
                戦闘に勝利した！
              </h2>
              <p className="text-xs text-slate-300 tracking-wider font-bold">
                モンスターの消去に成功しました！
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4 w-full flex flex-col items-center gap-1.5 opacity-80">
              <span className="text-[10px] text-yellow-305 font-extrabold animate-pulse uppercase tracking-widest">
                CARD_DECRYPTOR_LAUNCHING
              </span>
              <span className="text-[9px] text-slate-400 font-medium font-semibold">
                画面をタップして IT用語カード 選択画面へ進む...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
