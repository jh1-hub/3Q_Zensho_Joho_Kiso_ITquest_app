/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import TitleScreen from './components/TitleScreen';
import ExploreScreen from './components/ExploreScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';
import CardCollection from './components/CardCollection';
import LootScreen from './components/LootScreen';
import StatsScreen from './components/StatsScreen';
import TrainingScreen from './components/TrainingScreen';
import TimeAttackScreen from './components/TimeAttackScreen';

import { PlayerState, BattleState, MapNode, NodeType, RawProblem, TermCard, ActiveProblem, GameStats } from './types';
import { quizCategories, RAW_PROBLEMS, TERM_CARDS } from './data/problems';
import { AREA_LOCATIONS, MONSTER_POOLS } from './data/monsters';
import { practicalQuestions } from './data/practicalQuestions';
import { 
  calculatePlayerBonus, 
  generateActiveProblem, 
  generateActivePracticalProblem,
  getChoiceCountForStep, 
  getEnemyConfig, 
  getXpToNextLevel,
  drawCard,
  shuffleArray
} from './utils/gameHelpers';

interface SaveData {
  level: number;
  xp: number;
  collectedCards: string[];
  bestTimeSeconds: number | null;
  wrongTerms: string[]; // 優先習得用の誤答リスト
  stats?: GameStats;
}

export default function App() {
  // ----------------------------------------------------
  // PWA関連のステート & インストール処理
  // ----------------------------------------------------
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice: ${outcome}`);
    setDeferredPrompt(null);
  };

  // ----------------------------------------------------
  // ゲームのメインステート
  // ----------------------------------------------------
  const [screen, setScreen] = useState<'title' | 'battle' | 'result' | 'collection' | 'loot' | 'stats' | 'training-hub' | 'time-attack'>('title');
  const [activeTrainingMode, setActiveTrainingMode] = useState<'category' | 'subcategory' | 'drill' | null>(null);
  const [trainingClusterId, setTrainingClusterId] = useState<string | null>(null);
  const [overrideCardsPool, setOverrideCardsPool] = useState<TermCard[] | undefined>(undefined);
  const [forceFullyRandom, setForceFullyRandom] = useState<boolean>(false);
  const [player, setPlayer] = useState<PlayerState>({
    hp: 100,
    maxHp: 100,
    attack: 10,
    level: 1,
    xp: 0,
    xpToNextLevel: 10,
    collectedCards: [],
    activeRunCardIds: [],
    totalTimeSeconds: 0,
    penaltySeconds: 0,
    history: []
  });

  const [bestTime, setBestTime] = useState<number | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<'easy' | 'hard' | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [wrongTerms, setWrongTerms] = useState<string[]>([]); // 今回プレイで間違えた単語（リザルト表示用・以降の優先出題用）

  // 前回の戦闘の報酬追跡用
  const [lastDroppedCard, setLastDroppedCard] = useState<TermCard | null>(null);
  const [lastGainedXp, setLastGainedXp] = useState<number>(0);
  const [pendingXp, setPendingXp] = useState<number>(0); // Loot選択時に獲得予定のXP量

  // 収集・キャリア統計情報
  const [gameStats, setGameStats] = useState<GameStats>({
    attempts: 0,
    wins: 0,
    termStats: {}
  });

  // バトルの進行中ステート
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  // リザルト表示用
  const [isGameClear, setIsGameClear] = useState<boolean>(false);
  const [finalQuestionsCount, setFinalQuestionsCount] = useState<number>(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [droppedCard, setDroppedCard] = useState<TermCard | null>(null);
  const [runCardIdsForResults, setRunCardIdsForResults] = useState<string[]>([]);

  // タイムアタック用計測用インスタントタイマー
  const [playStartTime, setPlayStartTime] = useState<number | null>(null);

  // ----------------------------------------------------
  // ローカルストレージバインド
  // ----------------------------------------------------
  const loadSaveData = () => {
    try {
      const dataStr = localStorage.getItem('it-rogue-save-data');
      if (dataStr) {
        const parsed = JSON.parse(dataStr) as SaveData;
        const bonus = calculatePlayerBonus(parsed.collectedCards || [], []);
        setPlayer(prev => ({
          ...prev,
          level: 1,
          xp: 0,
          xpToNextLevel: getXpToNextLevel(1),
          collectedCards: parsed.collectedCards || [],
          activeRunCardIds: [],
          maxHp: 100, // レベル1＋ボーナスの最大HP
          hp: 100 + bonus.hp,
          attack: 10 + bonus.attack
        }));
        setBestTime(parsed.bestTimeSeconds || null);
        setWrongTerms(parsed.wrongTerms || []);
        if (parsed.stats) {
          setGameStats(parsed.stats);
        }
      }
    } catch (e) {
      console.error('Error loading save data:', e);
    }
  };

  const saveToStorage = (
    updatedCollected: string[], 
    updatedBest: number | null, 
    updatedWrong: string[], 
    currentLevel?: number, 
    currentXp?: number,
    statsOverride?: GameStats
  ) => {
    try {
      const dataToSave: SaveData = {
        level: currentLevel ?? player.level,
        xp: currentXp ?? player.xp,
        collectedCards: updatedCollected,
        bestTimeSeconds: updatedBest,
        wrongTerms: updatedWrong,
        stats: statsOverride ?? gameStats
      };
      localStorage.setItem('it-rogue-save-data', JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  };

  useEffect(() => {
    loadSaveData();
  }, []);

  // ----------------------------------------------------
  // 修行（しゅぎょう・たんれん）の開始
  // ----------------------------------------------------
  const startTrainingBattle = (mode: 'category' | 'subcategory' | 'drill', clusterId: string | null = null) => {
    setActiveTrainingMode(mode);
    setTrainingClusterId(clusterId);
    
    // 修行用プレイヤーHP等の構成（王道のカード補正のみを適用。冒険中カードactiveRunCardIdsは修行では無効）
    const bonus = calculatePlayerBonus(player.collectedCards, []);
    const maxHpWithBonus = 100 + bonus.hp;
    const currentAttack = 10 + bonus.attack;

    setPlayer(prev => ({
      ...prev,
      hp: maxHpWithBonus,
      maxHp: 100,
      attack: currentAttack,
      activeRunCardIds: [], // 修行中の冒険内カードバフは初期化
      penaltySeconds: 0
    }));

    let battleProblems: RawProblem[] = [];
    let rewardsPool: TermCard[] | undefined = undefined;
    let isFullyRandom = false;

    if (mode === 'category') {
      const catId = clusterId || "1";
      const subIds = quizCategories.find(c => c.id === catId)?.subcategories.map(s => s.id) || [];
      const matchingProblems = RAW_PROBLEMS.filter(p => subIds.includes(p.clusterId));
      
      battleProblems = shuffleArray(matchingProblems).slice(0, 5);
      
      // 大区分：制限なし（全レア度が出現可能）
      rewardsPool = TERM_CARDS.filter(c => subIds.includes(c.clusterId));
      isFullyRandom = false; // 未所持優先
    } else if (mode === 'subcategory') {
      const subId = clusterId || "1-a";
      const matchingProblems = RAW_PROBLEMS.filter(p => p.clusterId === subId);
      
      if (matchingProblems.length >= 5) {
        battleProblems = shuffleArray(matchingProblems).slice(0, 5);
      } else {
        // もし問題数が5問に満たない場合は、同一親カテゴリから補う
        const parentCatId = subId.split('-')[0];
        const siblingSubIds = quizCategories.find(c => c.id === parentCatId)?.subcategories.map(s => s.id) || [];
        const fallbackProblems = RAW_PROBLEMS.filter(p => siblingSubIds.includes(p.clusterId) && p.clusterId !== subId);
        const combined = [...matchingProblems, ...shuffleArray(fallbackProblems)];
        battleProblems = combined.slice(0, 5);
      }
      
      // 小区分：SRカードまで（C, UC, R, SR）
      rewardsPool = TERM_CARDS.filter(c => c.clusterId === subId && ['C', 'UC', 'R', 'SR'].includes(c.rarity));
      if (rewardsPool.length === 0) {
        const parentCatId = subId.split('-')[0];
        const siblingSubIds = quizCategories.find(c => c.id === parentCatId)?.subcategories.map(s => s.id) || [];
        rewardsPool = TERM_CARDS.filter(c => siblingSubIds.includes(c.clusterId) && ['C', 'UC', 'R', 'SR'].includes(c.rarity));
      }
      isFullyRandom = false; 
    } else {
      // 鍛錬モード。出題優先度：
      // 「まだ一度も出題されていない問題 ＞ 正答率の低い問題 ＞ 正答率の高い問題」
      const sortedProblems = [...RAW_PROBLEMS].sort((a, b) => {
        const statA = gameStats.termStats[a.id];
        const statB = gameStats.termStats[b.id];

        const scoreA = (!statA || statA.attemptCount === 0) ? -2.0 : (statA.correctCount / statA.attemptCount);
        const scoreB = (!statB || statB.attemptCount === 0) ? -2.0 : (statB.correctCount / statB.attemptCount);

        return scoreA - scoreB; // 昇順（未出題 -> 低正答率 -> 高正答率）
      });

      // 鍛錬は5問
      battleProblems = sortedProblems.slice(0, 5);

      // 全体から完全にランダム
      rewardsPool = TERM_CARDS;
      isFullyRandom = true; // 完全にランダム（未所持優先なし）
    }

    const monsterQuestions = 5;
    const monsterName = mode === 'category' 
      ? '修行の木偶スライム' 
      : mode === 'subcategory'
        ? '小修行のプチスライム'
        : '鍛錬のごうがんゴーレム';
    const monsterMaxHp = mode === 'category' 
      ? 50 
      : mode === 'subcategory'
        ? 45 
        : 55;

    const subcategoryObj = quizCategories.flatMap(c => c.subcategories).find(s => s.id === clusterId);
    const subTitle = subcategoryObj ? subcategoryObj.title : '';

    const labelStr = mode === 'category' 
      ? '【しゅぎょう】 カテゴリ選択クイズ' 
      : mode === 'subcategory'
        ? `【小カテゴリしゅぎょう】 ${subTitle}`
        : '【たんれん】 出題度優先クイズ';

    const mockNode: MapNode = {
      id: mode === 'category' ? `training_cat_${clusterId}` : mode === 'subcategory' ? `training_sub_${clusterId}` : 'training_drill',
      type: 'battle_easy',
      label: labelStr,
      completed: false,
      accessible: true,
      step: 0,
      route: 'easy',
      monsterName,
      monsterMaxHp,
      monsterDamage: (mode === 'category' || mode === 'subcategory') ? 4 : 8,
      monsterQuestions,
      monsterImagePath: (mode === 'category' || mode === 'subcategory')
        ? "./img/monsters/training_slime_battle.jpg" 
        : "./img/monsters/drill_golem_battle.jpg",
      monsterThumbnailPath: (mode === 'category' || mode === 'subcategory')
        ? "./img/monsters/training_slime_thumb.jpg" 
        : "./img/monsters/drill_golem_thumb.jpg"
    };

    const choiceCount = (mode === 'category' || mode === 'subcategory') ? 4 : 6;

    // 出題される問題プールを用意（カテゴリ修行（大区分）では3問に1問は模擬試験にちかい実践問題を設定する）
    const poolItems: any[] = [];
    const catId = mode === 'category' ? (clusterId || "1") : "1";
    const subIdsForCat = quizCategories.find(c => c.id === catId)?.subcategories.map(s => s.id) || [];
    const parentPQs = shuffleArray(practicalQuestions.filter(pq => subIdsForCat.includes(pq.categoryId)));
    let pqIdx = 0;

    for (let i = 0; i < monsterQuestions; i++) {
      if (mode === 'category' && i % 3 === 2 && pqIdx < parentPQs.length) {
        poolItems.push({
          isPractical: true,
          practical: parentPQs[pqIdx++]
        });
      } else {
        const stdProblem = battleProblems[i % battleProblems.length];
        poolItems.push({
          isPractical: false,
          raw: stdProblem
        });
      }
    }

    const firstItem = poolItems[0];
    let activeProg: ActiveProblem;
    if (firstItem.isPractical && firstItem.practical) {
      activeProg = generateActivePracticalProblem(firstItem.practical);
    } else {
      const firstRaw = firstItem.raw;
      const typeDecision = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term';
      activeProg = generateActiveProblem(firstRaw, typeDecision, choiceCount, RAW_PROBLEMS);
    }

    // バトルステート作成
    const initialBattle: BattleState = {
      currentNode: mockNode,
      questionsLeft: monsterQuestions,
      totalQuestionsInBattle: monsterQuestions,
      currentQuestionIndex: 0,
      activeProblem: activeProg,
      playerHp: maxHpWithBonus,
      enemyHp: monsterMaxHp,
      enemyMaxHp: monsterMaxHp,
      enemyName: monsterName,
      timer: 45,
      maxTimer: 45,
      isAnswered: false,
      selectedAnswer: null,
      isCorrect: null,
      damageEffect: { target: null, amount: 0 },
      battleLog: 'しゅぎょうバトルが開始された！'
    };

    // 内部的な _problemPool をセット（ handleNextQuestion で使う）
    (initialBattle as any)._problemPool = poolItems;

    setOverrideCardsPool(rewardsPool);
    setForceFullyRandom(isFullyRandom);

    setBattleState(initialBattle);
    setScreen('battle');
  };

  // ----------------------------------------------------
  // ゲーム初期化 & 構築
  // ----------------------------------------------------
  const handleStartGame = () => {
    // タイム計測開始
    setPlayStartTime(Date.now());
    setRunCardIdsForResults([]);
    
    // 挑戦回数アップ
    let nextStats = gameStats;
    setGameStats(prev => {
      const updated = { ...prev, attempts: prev.attempts + 1 };
      nextStats = updated;
      saveToStorage(player.collectedCards, bestTime, [], 1, 0, updated);
      return updated;
    });
    
    // レベルを毎回1に、XPを0にリセットしてゲーム開始
    const bonus = calculatePlayerBonus(player.collectedCards, []);
    const maxHpWithBonus = 100 + bonus.hp;
    const currentAttack = 10 + bonus.attack;

    setPlayer(prev => ({
      ...prev,
      level: 1,
      xp: 0,
      xpToNextLevel: getXpToNextLevel(1),
      hp: maxHpWithBonus,
      maxHp: 100,
      attack: currentAttack,
      activeRunCardIds: [], // Reset run cards
      totalTimeSeconds: 0,
      penaltySeconds: 0
    }));

    // Slay the Spire風の分岐型ダンジョンマップを作成
    const generateNodeData = (step: number, routeType: 'easy' | 'hard' | 'common' | 'boss', id: string, completed = false, accessible = false): MapNode => {
      const isBoss = routeType === 'boss' || id === 'boss';
      let type: 'battle_easy' | 'battle_hard' | 'boss' = isBoss ? 'boss' : (routeType === 'easy' ? 'battle_easy' : 'battle_hard');
      
      const locations = AREA_LOCATIONS[step] || ['未知の領域'];
      const locationName = locations[Math.floor(Math.random() * locations.length)];
      
      const pool = MONSTER_POOLS[step];
      const templates = isBoss ? pool.hard : (type === 'battle_easy' ? pool.easy : pool.hard);
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      const hp = Math.floor(Math.random() * (template.maxHp - template.minHp + 1)) + template.minHp;
      const dmg = Math.floor(Math.random() * (template.maxDamage - template.minDamage + 1)) + template.minDamage;
      
      return {
        id,
        type,
        label: `${locationName}・${template.name}`,
        completed,
        accessible,
        step,
        route: isBoss ? 'common' as const : (routeType === 'easy' ? 'easy' : 'hard' as const),
        locationName,
        monsterName: template.name,
        monsterMaxHp: hp,
        monsterDamage: dmg,
        monsterQuestions: template.questions,
        monsterImagePath: template.imagePath,
        monsterThumbnailPath: template.thumbnailPath,
        monsterFallbackImage: template.fallbackUnsplashBattle,
        monsterFallbackThumbnail: template.fallbackUnsplashThumb,
        monsterExplanation: template.explanation,
      };
    };

    const stepNodes: MapNode[] = [
      // Floor 0
      generateNodeData(0, 'easy', '0_A', false, true),
      generateNodeData(0, 'hard', '0_B', false, true),
      // Floor 1
      generateNodeData(1, 'easy', '1_A', false, false),
      generateNodeData(1, 'hard', '1_B', false, false),
      // Floor 2
      generateNodeData(2, 'easy', '2_A', false, false),
      generateNodeData(2, 'hard', '2_B', false, false),
      // Floor 3
      generateNodeData(3, 'easy', '3_A', false, false),
      generateNodeData(3, 'hard', '3_B', false, false),
      // Floor 4 (BOSS)
      generateNodeData(4, 'boss', 'boss', false, false)
    ];

    setNodes(stepNodes);
    setSelectedRoute('easy'); // By default we mark route selected as initialized to bypass choosing
    setCurrentStep(0);
    setWrongTerms([]);
    setFinalQuestionsCount(0);
    setCorrectAnswersCount(0);
    setDroppedCard(null);
    setLastDroppedCard(null);
    setLastGainedXp(0);

    setScreen('battle');
  };

  /**
   * 分岐ルートが選択されたとき（古い仕様の互換用として残す）
   */
  const handleSelectRoute = (route: 'easy' | 'hard') => {
    setSelectedRoute(route);
  };

  // ----------------------------------------------------
  // バトルのセットアップ
  // ----------------------------------------------------
  const handleEnterBattle = (node: MapNode) => {
    if (node.type === 'start') return;
    const enemyConfig = getEnemyConfig(node.type, currentStep);
    
    // ランダム生成された魔物のステータスを優先して読み出し
    const enemyName = node.monsterName || enemyConfig.name;
    const enemyMaxHp = node.monsterMaxHp || enemyConfig.maxHp;
    const enemyDamage = node.monsterDamage || enemyConfig.damage;
    const enemyQuestions = node.monsterQuestions || enemyConfig.questions;

    const choiceCount = getChoiceCountForStep(node.type === 'boss' ? 'boss' : currentStep);
    const bonus = calculatePlayerBonus(player.collectedCards, player.activeRunCardIds);

    // バトルに出題する問題群をインテリジェントにフィルタリング
    // 1. ボス戦：過去の間間違えた問題、または同一クラスタ問題を優先的に8問集める
    // 2. 通常戦：現在の進行ステップの難易度（easy, medium, hard）に近いものを集める
    let battleProblems: RawProblem[] = [];

    const isBoss = node.type === 'boss';
    if (isBoss) {
      // 過去に間違えた問題（ローカルストレージ情報など）を優先抽出
      const wrongList = wrongTerms.map(name => RAW_PROBLEMS.find(p => p.termName === name)).filter(Boolean) as RawProblem[];
      const remainingCount = 8 - wrongList.length;

      if (remainingCount > 0) {
        const others = RAW_PROBLEMS.filter(p => !wrongList.some(wl => wl.id === p.id));
        battleProblems = [...wrongList, ...shuffleArray(others).slice(0, remainingCount)];
      } else {
        battleProblems = wrongList.slice(0, 8);
      }
    } else {
      // 通常戦
      // 階層や難易度に合わせて出題
      const targetDiffs = node.type === 'battle_hard' ? ['medium', 'hard'] : ['easy', 'medium'];
      const matchingProblems = RAW_PROBLEMS.filter(p => targetDiffs.includes(p.difficulty));
      
      battleProblems = shuffleArray(matchingProblems).slice(0, enemyQuestions);
    }

    // ----------------------------------------------------
    // 実践問題（模擬試験）の抽選処理の設定
    // 最後のボス（step === 4 または type === 'boss'）: 2回に1回（50％）
    // 最後から1個前の敵（step === 3）: 3回に1回（33％）
    // 最後から2個前の敵（step === 2）: 4回に1回（25％）
    // ----------------------------------------------------
    let practicalChance = 0;
    if (node.type === 'boss') {
      practicalChance = 0.50; // 最後のボスは 2回に1回 (50%)
    } else if (node.step === 3) {
      practicalChance = 1 / 3; // 最後から1個前の敵は 3回に1回
    } else if (node.step === 2) {
      practicalChance = 0.25; // 最後から2個前の敵は 4回に1回
    }

    const shuffledPQs = shuffleArray([...practicalQuestions]);
    let pqIdx = 0;

    const poolItems: any[] = [];
    for (let i = 0; i < enemyQuestions; i++) {
      if (practicalChance > 0 && Math.random() < practicalChance && pqIdx < shuffledPQs.length) {
        poolItems.push({
          isPractical: true,
          practical: shuffledPQs[pqIdx++]
        });
      } else {
        // 通常問題
        const stdProblem = battleProblems[i % battleProblems.length];
        poolItems.push({
          isPractical: false,
          raw: stdProblem
        });
      }
    }

    // 最初の問題をアクティブ化
    const firstItem = poolItems[0];
    let activeProg: ActiveProblem;
    if (firstItem.isPractical && firstItem.practical) {
      activeProg = generateActivePracticalProblem(firstItem.practical);
    } else {
      const firstRaw = firstItem.raw;
      const typeDecision = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term'; // 用語・意味を相互回答
      activeProg = generateActiveProblem(firstRaw, typeDecision, choiceCount, RAW_PROBLEMS);
    }

    // バトルステート作成
    const initialBattle: BattleState = {
      currentNode: node,
      questionsLeft: enemyQuestions,
      totalQuestionsInBattle: enemyQuestions,
      currentQuestionIndex: 0,
      activeProblem: activeProg,
      playerHp: player.hp,
      enemyHp: enemyMaxHp,
      enemyMaxHp: enemyMaxHp,
      enemyName: enemyName,
      timer: 30 + bonus.timerBonus, // 制限時間を5秒から30秒に変更
      maxTimer: 30 + bonus.timerBonus, // 制限時間を5秒から30秒に変更
      isAnswered: false,
      selectedAnswer: null,
      isCorrect: null,
      damageEffect: { target: null, amount: 0 },
      battleLog: `${enemyName}が立ち塞がった！一触即発！`
    };

    // 出題用配列を一時的に持たせるためにバトルステートの管理に少し工夫する
    // バトル内での出題履歴
    (initialBattle as any)._problemPool = poolItems;

    setBattleState(initialBattle);
    setScreen('battle');
  };

  // ----------------------------------------------------
  // バトルの戦闘回答（アクション）
  // ----------------------------------------------------
  const handleAnswer = (isCorrect: boolean, isTimeout: boolean, elapsedSeconds: number, clickedIndex: number) => {
    if (!battleState || !battleState.activeProblem) return;

    let playerHpDamage = 0;
    let enemyHpDamage = 0;
    let log = '';

    const isBoss = battleState.currentNode.type === 'boss';

    if (isCorrect) {
      // プレイヤーが正解
      // ダメージ = プレイヤーの攻撃力。解答速度ボーナスをかける
      let mult = 1.0;
      if (elapsedSeconds < 3.0) {
        mult = 2.0;
        log = '会心のハック！ 魔物に2倍のダメージ！';
      } else if (elapsedSeconds < 6.0) {
        mult = 1.5;
        log = '迅速なるハック！ 魔物に1.5倍のダメージ！';
      } else {
        log = '正解！ 剣攻撃が命中した！';
      }

      enemyHpDamage = Math.round(player.attack * mult);
    } else {
      // プレイヤーが不正解/タイムアウト
      const enemyDamageVal = battleState.currentNode.monsterDamage ?? getEnemyConfig(battleState.currentNode.type, currentStep).damage;
      playerHpDamage = enemyDamageVal;
      
      // タイムペナルティの蓄積
      const penaltyAmt = isTimeout ? 20 : 10; // タイムアウトは20秒、誤答は10秒のペナルティ加算
      setPlayer(prev => ({
        ...prev,
        penaltySeconds: prev.penaltySeconds + penaltyAmt
      }));

      log = isTimeout 
        ? `時間切れ！ 魔物から痛烈な打撃(${playerHpDamage}補正HP)を受けました。` 
        : `誤答！ 防壁からの反射呪文を受け、手痛い深手(${playerHpDamage}補正HP)を負いました。`;

      // 誤答した用語の蓄積
      const termName = battleState.activeProblem.raw.termName;
      if (!wrongTerms.includes(termName)) {
        setWrongTerms(prev => [...prev, termName]);
      }
    }

    // 反帰
    const nextEnemyHp = Math.max(0, battleState.enemyHp - enemyHpDamage);
    const nextPlayerHp = Math.max(0, battleState.playerHp - playerHpDamage);

    setFinalQuestionsCount(prev => prev + 1);
    if (isCorrect) setCorrectAnswersCount(prev => prev + 1);

    setBattleState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        playerHp: nextPlayerHp,
        enemyHp: nextEnemyHp,
        isAnswered: true,
        isCorrect,
        battleLog: log,
        selectedAnswer: clickedIndex
      };
    });

    // プレイヤー側のリアルHPと同期
    setPlayer(prev => ({
      ...prev,
      hp: nextPlayerHp
    }));

    // 用語ごとの正誤統計を記録・保存
    const activeRaw = battleState.activeProblem.raw;
    const termId = activeRaw.id;
    setGameStats(prev => {
      const termStat = prev.termStats[termId] || { correctCount: 0, attemptCount: 0 };
      const nextTermStats = {
        ...prev.termStats,
        [termId]: {
          attemptCount: termStat.attemptCount + 1,
          correctCount: termStat.correctCount + (isCorrect ? 1 : 0)
        }
      };
      const nextStats = { ...prev, termStats: nextTermStats };
      saveToStorage(player.collectedCards, bestTime, wrongTerms, player.level, player.xp, nextStats);
      return nextStats;
    });
  };

  /**
   * 次の問題へ
   */
  const handleNextQuestion = () => {
    if (!battleState) return;

    const nextIndex = battleState.currentQuestionIndex + 1;
    const pool = (battleState as any)._problemPool as any[];
    const nextItem = pool[nextIndex % pool.length]; // 問題プールを循環させることで無限ループの対戦に対応！
    const choiceCount = getChoiceCountForStep(battleState.currentNode.type === 'boss' ? 'boss' : currentStep);
    
    let activeProg: ActiveProblem;
    if (nextItem && typeof nextItem === 'object' && 'isPractical' in nextItem) {
      if (nextItem.isPractical && nextItem.practical) {
        activeProg = generateActivePracticalProblem(nextItem.practical);
      } else {
        const nextRaw = nextItem.raw;
        const typeDecision = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term';
        activeProg = generateActiveProblem(nextRaw, typeDecision, choiceCount, RAW_PROBLEMS);
      }
    } else {
      // トレーニングモードなどの後方互換用
      const nextRaw = nextItem as RawProblem;
      const typeDecision = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term';
      activeProg = generateActiveProblem(nextRaw, typeDecision, choiceCount, RAW_PROBLEMS);
    }

    setBattleState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentQuestionIndex: nextIndex,
        isAnswered: false,
        selectedAnswer: null,
        isCorrect: null,
        activeProblem: activeProg
      };
    });
  };

  // ----------------------------------------------------
  // 戦闘終了とドロップ・経験値授与
  // ----------------------------------------------------
  const handleFinishBattle = (dropped: TermCard | null, gainedXp: number) => {
    if (!battleState) return;

    const isBoss = battleState.currentNode.type === 'boss';

    if (isBoss) {
      // ボス撃破時も、通常戦闘と同様にカード抽せん(Loot)をしてからリザルト画面に遷移するように変更
      setPendingXp(60); // ボス撃破の特別固定 60 XP
      setScreen('loot');
    } else {
      // 通常戦闘終了：Loot screen へリダイレクトして、3つの裏返しカードから選ばせる
      setPendingXp(gainedXp);
      setScreen('loot');
    }
  };

  /**
   * LootScreen でカードが選択されたあ後の完了イベント
   */
  const handleCompleteLoot = (selectedCard: TermCard) => {
    if (!battleState) return;

    if (activeTrainingMode) {
      let updatedCollected = [...player.collectedCards];
      const count = updatedCollected.filter(id => id === selectedCard.id).length;
      if (count < 3) {
        updatedCollected.push(selectedCard.id);
      }
      setDroppedCard(selectedCard);

      setPlayer(prev => ({
        ...prev,
        collectedCards: updatedCollected,
        activeRunCardIds: []
      }));

      saveToStorage(updatedCollected, bestTime, wrongTerms);

      setScreen('training-hub');
      setActiveTrainingMode(null);
      setTrainingClusterId(null);
      setOverrideCardsPool(undefined);
      setForceFullyRandom(false);
      setBattleState(null);
      return;
    }

    const isBoss = battleState.currentNode.type === 'boss';

    // 新たなカードの取得 (全期間: 最大3枚まで重複可能にする)
    let updatedCollected = [...player.collectedCards];
    const count = updatedCollected.filter(id => id === selectedCard.id).length;
    if (count < 3) {
      updatedCollected.push(selectedCard.id);
    }
    setDroppedCard(selectedCard); // 既に最大枚数持っている場合もクリアの戦利品としてリザルト等へ渡す

    if (isBoss) {
      // 【大ボス（NEO-HYDRA）討伐の完結処理】
      setIsGameClear(true);
      
      const bossRunCards = [...(player.activeRunCardIds || [])];
      if (!bossRunCards.includes(selectedCard.id)) {
        bossRunCards.push(selectedCard.id);
      }
      setRunCardIdsForResults(bossRunCards);
      
      let newBest = bestTime;
      let runSeconds = 0;
      if (playStartTime) {
        runSeconds = (Date.now() - playStartTime) / 1000;
        const totalEvaluationTime = runSeconds + player.penaltySeconds;
        if (bestTime === null || totalEvaluationTime < bestTime) {
          newBest = totalEvaluationTime;
          setBestTime(newBest);
        }
      }

      // ボス撃破時はクリア数winsを追加加算
      const nextStats = { ...gameStats, wins: gameStats.wins + 1 };
      setGameStats(nextStats);

      // ボス撃破後はレベル1、XP 0に初期化してセーブ、冒険中カードはリセット
      saveToStorage(updatedCollected, newBest, [...new Set([...wrongTerms])], 1, 0, nextStats);

      const freshBonus = calculatePlayerBonus(updatedCollected, []);
      setPlayer(prev => ({
        ...prev,
        level: 1,
        xp: 0,
        xpToNextLevel: getXpToNextLevel(1),
        maxHp: 100,
        hp: 100 + freshBonus.hp,
        attack: 10 + freshBonus.attack,
        collectedCards: updatedCollected,
        activeRunCardIds: [], // Reset run cards
        totalTimeSeconds: runSeconds
      }));

      // ここで勝利クリアのリザルト画面を表示する！
      setScreen('result');
      setSelectedRoute(null);
      setCurrentStep(0);
      setBattleState(null);
      return;
    }

    // この冒険中で獲得したカードの取得 (冒険限定 10倍)
    let updatedRunCards = [...(player.activeRunCardIds || [])];
    if (!updatedRunCards.includes(selectedCard.id)) {
      updatedRunCards.push(selectedCard.id);
    }
    setRunCardIdsForResults(updatedRunCards);

    // 両方のカードプールを元にバフ量を累積再構成する
    const statsBonus = calculatePlayerBonus(updatedCollected, updatedRunCards);
    const actualXp = Math.round(pendingXp * statsBonus.xpBonus);

    // 獲得XP、レベルアップ演算
    let nextXp = player.xp + actualXp;
    let nextLvl = player.level;
    let required = getXpToNextLevel(nextLvl);
    let levelUpFlag = false;

    while (nextXp >= required) {
      nextXp -= required;
      nextLvl += 1;
      required = getXpToNextLevel(nextLvl);
      levelUpFlag = true;
    }

    // レベルアップした場合は基本ステータスを上げる
    const nextMaxHp = 100 + (nextLvl - 1) * 15;
    const nextPlayerAttack = 10 + (nextLvl - 1) * 3;

    // 前回の戦果報酬をステートに記録
    setLastDroppedCard(selectedCard);
    setLastGainedXp(actualXp);

    setPlayer(prev => ({
      ...prev,
      level: nextLvl,
      xp: nextXp,
      xpToNextLevel: required,
      maxHp: nextMaxHp,
      hp: levelUpFlag ? Math.min(prev.hp + (nextMaxHp - prev.maxHp), nextMaxHp + statsBonus.hp) : prev.hp, // レベルアップで全快しない
      attack: nextPlayerAttack + statsBonus.attack,
      collectedCards: updatedCollected,
      activeRunCardIds: updatedRunCards
    }));

    // 保存
    saveToStorage(updatedCollected, bestTime, [...new Set([...wrongTerms])], nextLvl, nextXp);

    // 通常の次のステップへ
    const nextStepIdx = currentStep + 1;
    setCurrentStep(nextStepIdx);

    // マップデータの構築を更新（選択されたノードのみを完了状態にし、同一ステップの他ノードは無効化、次のステップを解放）
    const updatedNodes = nodes.map(node => {
      if (node.id === battleState.currentNode.id) {
        return { ...node, completed: true, accessible: false };
      }
      // 同じ階層（floor）の選ばれなかったノードは未完了だが選択不能にして進路を固定
      if (node.step === currentStep && node.id !== battleState.currentNode.id) {
        return { ...node, completed: false, accessible: false };
      }
      // 次のステップをアクティブかつ解放
      if (node.step === nextStepIdx) {
        return { ...node, accessible: true };
      }
      // ボスノード。Floor 4 (Boss)
      if (node.type === 'boss' && nextStepIdx === 4) {
        return { ...node, accessible: true };
      }
      return node;
    });

    setNodes(updatedNodes);
    setScreen('battle'); // マップ表示画面に戻す
    setBattleState(null); // 選択した戦闘情報をクリア
  };

  /**
   * ゲームオーバー（HP が 0 になったとき）
   */
  const handleGameOver = () => {
    if (activeTrainingMode) {
      setScreen('training-hub');
      setActiveTrainingMode(null);
      setTrainingClusterId(null);
      setOverrideCardsPool(undefined);
      setForceFullyRandom(false);
      setBattleState(null);
      return;
    }

    setIsGameClear(false);
    setRunCardIdsForResults([...(player.activeRunCardIds || [])]);
    let runSeconds = 0;
    if (playStartTime) {
      runSeconds = (Date.now() - playStartTime) / 1000;
    }
    
    // 敗北後もレベル1、XP 0に常にリセット、冒険中カードは空に
    const bonus = calculatePlayerBonus(player.collectedCards, []);
    setPlayer(prev => ({
      ...prev,
      level: 1,
      xp: 0,
      xpToNextLevel: getXpToNextLevel(1),
      maxHp: 100,
      hp: 100 + bonus.hp,
      attack: 10 + bonus.attack,
      activeRunCardIds: [], // Clear run cards!
      totalTimeSeconds: runSeconds
    }));

    // 保存 (レベル1、XP0として保存)
    saveToStorage(player.collectedCards, bestTime, [...new Set([...wrongTerms])], 1, 0);

    setScreen('result');
    setBattleState(null);
  };

  /**
   * 全部のセーブデータリセット
   */
  const handleResetAllData = () => {
    localStorage.removeItem('it-rogue-save-data');
    setPlayer({
      hp: 100,
      maxHp: 100,
      attack: 10,
      level: 1,
      xp: 0,
      xpToNextLevel: 10,
      collectedCards: [],
      activeRunCardIds: [],
      totalTimeSeconds: 0,
      penaltySeconds: 0,
      history: []
    });
    setBestTime(null);
    setWrongTerms([]);
    setGameStats({
      attempts: 0,
      wins: 0,
      termStats: {}
    });
    setScreen('title');
  };

  // ----------------------------------------------------
  // レンダリング処理
  // ----------------------------------------------------
  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 flex flex-col justify-between">
      {screen === 'title' && (
        <TitleScreen
          collectedCardIds={player.collectedCards}
          bestTime={bestTime}
          onStartGame={handleStartGame}
          onOpenCollection={() => setScreen('collection')}
          onOpenStats={() => setScreen('stats')}
          onOpenTraining={() => setScreen('training-hub')}
          onOpenTimeAttack={() => setScreen('time-attack')}
          installPrompt={deferredPrompt}
          onInstallApp={handleInstallApp}
        />
      )}

      {screen === 'training-hub' && (
        <TrainingScreen
          onBack={() => setScreen('title')}
          onStartCategoryTraining={(catId) => startTrainingBattle('category', catId)}
          onStartSubcategoryTraining={(subId) => startTrainingBattle('subcategory', subId)}
          onStartDrillTraining={() => startTrainingBattle('drill')}
        />
      )}

      {screen === 'battle' && !battleState && (
        <ExploreScreen
          player={player}
          nodes={nodes}
          currentStep={currentStep}
          onSelectNode={handleEnterBattle}
          onViewCollection={() => setScreen('collection')}
          onRestart={handleStartGame}
          onGiveUp={handleGameOver}
        />
      )}

      {screen === 'loot' && (
        <LootScreen
          collectedCardIds={player.collectedCards}
          gainedXp={pendingXp}
          onSelectCard={handleCompleteLoot}
          overrideCardsPool={overrideCardsPool}
          forceFullyRandom={forceFullyRandom}
          currentNodeType={battleState?.currentNode?.type}
        />
      )}

      {screen === 'battle' && battleState && (
        <BattleScreen
          battleState={battleState}
          allProblems={RAW_PROBLEMS}
          playerAttack={player.attack}
          playerMaxHp={100 + calculatePlayerBonus(player.collectedCards, player.activeRunCardIds).hp}
          timerBonus={calculatePlayerBonus(player.collectedCards, player.activeRunCardIds).timerBonus}
          onAnswer={handleAnswer}
          onNextQuestion={handleNextQuestion}
          onFinishBattle={handleFinishBattle}
          onGameOver={handleGameOver}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          isWin={isGameClear}
          playerState={player}
          finalQuestionsCount={finalQuestionsCount}
          correctAnswersCount={correctAnswersCount}
          droppedCard={droppedCard}
          runCardIds={runCardIdsForResults}
          wrongTerms={wrongTerms}
          onRestart={handleStartGame}
          onBackToTitle={() => setScreen('title')}
        />
      )}

      {screen === 'collection' && (
        <CardCollection
          collectedIds={player.collectedCards}
          onBack={() => {
            // タイトル画面または、ゲーム中の場合は、戦闘画面の中（Explore）に帰す
            if (selectedRoute) {
              setScreen('battle');
            } else {
              setScreen('title');
            }
          }}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen
          gameStats={gameStats}
          bestTime={bestTime}
          collectedIds={player.collectedCards}
          onBack={() => setScreen('title')}
          onResetData={handleResetAllData}
        />
      )}

      {screen === 'time-attack' && (
        <TimeAttackScreen
          onClose={() => setScreen('title')}
          gameStats={gameStats}
          onUpdateStats={(updatedStats) => {
            setGameStats(updatedStats);
            saveToStorage(player.collectedCards, bestTime, wrongTerms, player.level, player.xp, updatedStats);
          }}
        />
      )}
    </div>
  );
}
