/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import TitleScreen from './components/TitleScreen';
import ExploreScreen from './components/ExploreScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';
import CardCollection from './components/CardCollection';
import LootScreen from './components/LootScreen';
import StatsScreen from './components/StatsScreen';
import TrainingScreen from './components/TrainingScreen';
import TimeAttackScreen from './components/TimeAttackScreen';
import StoryUnlockModal from './components/StoryUnlockModal';
import { SoundToggleButton } from './components/SoundToggleButton';
import { AuthModal } from './components/AuthModal';
import { ForcePasswordChangeModal } from './components/ForcePasswordChangeModal';
import { AdminDashboard } from './components/AdminDashboard';
import { secureStorage } from './utils/secureStorage';
import { STORY_CARDS, StoryCard } from './data/stories';
import { supabase, getUserProfile, getGameSave, upsertGameSave, mergeSaveData, ensureUserRecordExists } from './lib/supabaseClient';

import { PlayerState, BattleState, MapNode, NodeType, RawProblem, TermCard, ActiveProblem, GameStats, SaveData, UserProfile } from './types';
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
  calculateCollectorLevel,
  drawCard,
  shuffleArray,
  getDailySeed,
  shuffleArrayWithSeed
} from './utils/gameHelpers';

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
  // ユーザー認証・管理者ステート (Supabase)
  // ----------------------------------------------------
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isFirstLaunchPrompt, setIsFirstLaunchPrompt] = useState<boolean>(false);

  // ----------------------------------------------------
  // ゲームのメインステート
  // ----------------------------------------------------
  const [screen, setScreen] = useState<'title' | 'battle' | 'result' | 'collection' | 'loot' | 'stats' | 'training-hub' | 'time-attack' | 'admin'>('title');
  const [activeTrainingMode, setActiveTrainingMode] = useState<'category' | 'subcategory' | 'drill' | 'daily_challenge' | null>(null);
  const [dailyChallengeLootCount, setDailyChallengeLootCount] = useState<number>(1);
  const [trainingClusterId, setTrainingClusterId] = useState<string | null>(null);
  const [overrideCardsPool, setOverrideCardsPool] = useState<TermCard[] | undefined>(undefined);
  const [forceFullyRandom, setForceFullyRandom] = useState<boolean>(false);
  const [player, setPlayer] = useState<PlayerState>({
    hp: 100,
    maxHp: 100,
    attack: 100,
    level: 1,
    xp: 0,
    xpToNextLevel: 10,
    collectedCards: [],
    activeRunCardIds: [],
    totalTimeSeconds: 0,
    penaltySeconds: 0,
    history: []
  });

  // プレイヤーの最大HP（ベース ＋ カードボーナス）を安全に計算する
  const getPlayerMaxHp = (lvl: number, collected: string[], activeRun: string[]) => {
    const base = 500 + (lvl - 1) * 75;
    const bonus = calculatePlayerBonus(collected, activeRun);
    return base + bonus.hp;
  };

  // プレイヤーの攻撃力（ベース ＋ カードボーナス）を安全に計算する
  const getPlayerAttack = (lvl: number, collected: string[], activeRun: string[]) => {
    const base = 100 + (lvl - 1) * 15;
    const bonus = calculatePlayerBonus(collected, activeRun);
    return base + bonus.attack;
  };

  const [bestTime, setBestTime] = useState<number | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<'easy' | 'hard' | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [wrongTerms, setWrongTerms] = useState<string[]>([]); // 今回プレイで間違えた単語（リザルト表示用・以降の優先出題用）
  const [tookDamageThisRun, setTookDamageThisRun] = useState<boolean>(false); // ノーミスクリア追跡用

  // 魔導書レベルアップ・ストーリーカード解放用の状態
  const [unlockedStories, setUnlockedStories] = useState<StoryCard[] | null>(null);
  const [currentCollectorLevel, setCurrentCollectorLevel] = useState<number>(1);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const prevCollectorLevelRef = React.useRef<number | null>(null);

  // 前回の戦闘の報酬追跡用
  const [lastDroppedCard, setLastDroppedCard] = useState<TermCard | null>(null);
  const [lastGainedXp, setLastGainedXp] = useState<number>(0);
  const [pendingXp, setPendingXp] = useState<number>(0); // Loot選択時に獲得予定のXP量

  // 収集・キャリア統計情報
  const [gameStats, setGameStats] = useState<GameStats>({
    attempts: 0,
    wins: 0,
    termStats: {},
    trainingStats: {
      categoryAttempts: { '1': 0, '2': 0, '3': 0 },
      categoryCorrects: { '1': 0, '2': 0, '3': 0 },
      categoryWins: { '1': 0, '2': 0, '3': 0, 'drill': 0 },
      subcategoryAttempts: {},
      subcategoryCorrects: {},
      subcategoryWins: {},
      drillAttempts: 0,
      drillCorrects: 0,
      drillWins: 0
    },
    dailyChallengeAttempts: 0,
    dailyChallengeWins: 0
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

  // 冒険中に過去に出題した問題IDを追跡（重複出題防止）
  const [askedProblemIds, setAskedProblemIds] = useState<string[]>([]);

  // デイリーチャレンジ・タイムアタック（ときのかいろう）開放状態
  const [isDailyChallengeCompleted, setIsDailyChallengeCompleted] = useState<boolean>(false);
  const [isTimeAttackUnlocked, setIsTimeAttackUnlocked] = useState<boolean>(false);

  const rollTimeAttackUnlock = () => {
    if (isTimeAttackUnlocked) return;
    // 約33.3%の確率（3回に1回）で出現
    if (Math.random() < 0.334) {
      setIsTimeAttackUnlocked(true);
      secureStorage.setItem('it-rogue-time-attack-unlocked', 'true');
    }
  };

  // ----------------------------------------------------
  // ルーティング（/admin URL直接アクセス検知）
  // ----------------------------------------------------
  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        if (currentUserProfile && currentUserProfile.role !== 'admin') {
          // 生徒アカウントの場合はタイトル画面へリダイレクト
          setScreen('title');
          window.history.replaceState({}, '', '/');
        } else {
          setScreen('admin');
        }
      }
    };
    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, [currentUserProfile]);

  // 生徒アカウントが admin 画面に遷移した場合はタイトルへ戻す
  useEffect(() => {
    if (screen === 'admin' && currentUserProfile && currentUserProfile.role !== 'admin') {
      setScreen('title');
      window.history.replaceState({}, '', '/');
    }
  }, [screen, currentUserProfile]);

  // 先生自身・現在のセーブデータ
  const currentSaveData: SaveData = useMemo(() => ({
    level: player.level,
    xp: player.xp,
    collectedCards: player.collectedCards,
    bestTimeSeconds: bestTime,
    wrongTerms: wrongTerms,
    stats: gameStats,
  }), [player.level, player.xp, player.collectedCards, bestTime, wrongTerms, gameStats]);

  // クラウド同期中ステート
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // ----------------------------------------------------
  // セーブデータ（Supabaseクラウド同期 & ローカルキャッシュ）
  // ----------------------------------------------------
  const loadSaveData = async (targetUserId?: string | null) => {
    try {
      setIsSyncing(true);
      const uid = targetUserId !== undefined ? targetUserId : currentUser?.id;

      // 1. ローカルキャッシュの取得
      let localData: SaveData | null = null;
      const localStr = secureStorage.getItem('it-rogue-save-data');
      if (localStr) {
        try {
          localData = JSON.parse(localStr) as SaveData;
        } catch (e) {
          console.error('Error parsing local save:', e);
        }
      }

      // 2. ログイン中の場合：Supabase（テーブル + user_metadata）から取得
      let cloudData: SaveData | null = null;
      if (uid) {
        const cloudSave = await getGameSave(uid);
        if (cloudSave) {
          cloudData = {
            ownerUserId: uid,
            level: cloudSave.level || 1,
            xp: cloudSave.xp || 0,
            collectedCards: Array.isArray(cloudSave.collected_cards) ? cloudSave.collected_cards : [],
            bestTimeSeconds: cloudSave.best_time_seconds,
            wrongTerms: Array.isArray(cloudSave.wrong_terms) ? cloudSave.wrong_terms : [],
            stats: cloudSave.stats || { attempts: 0, wins: 0, termStats: {} },
            updated_at: cloudSave.updated_at,
          };
        }
      }

      let dataToApply: SaveData | null = null;

      if (uid) {
        // ログイン中の場合
        if (cloudData && localData) {
          // ローカルが別のユーザーIDのデータであれば、他生徒のデータを混入させずクラウド側を採用
          if (localData.ownerUserId && localData.ownerUserId !== uid) {
            // ただし、クラウド側がまだ空（新規作成直後）でローカルに実績がある場合は、ローカル実績を引き継ぐ
            const cloudHasProgress = (cloudData.collectedCards?.length || 0) > 0 || (cloudData.stats?.attempts || 0) > 0;
            if (!cloudHasProgress) {
              dataToApply = mergeSaveData(cloudData, localData, uid);
              if (dataToApply) {
                await upsertGameSave(uid, dataToApply);
              }
            } else {
              dataToApply = cloudData;
            }
          } else {
            // 同一ユーザー、または未ログイン（ゲスト）時のプレイデータを引き継ぐマージ
            dataToApply = mergeSaveData(cloudData, localData, uid);
            // 統合した最善データをクラウドへもバックアップ同期
            if (dataToApply) {
              await upsertGameSave(uid, dataToApply);
            }
          }
        } else if (cloudData) {
          // 別のブラウザや端末から初めてログインしたケース：クラウドのセーブデータをそのまま適用
          dataToApply = cloudData;
        } else if (localData) {
          // クラウドがまだ空でローカルにデータがあるケース：ローカルデータをクラウドへアップロード
          dataToApply = { ...localData, ownerUserId: uid };
          await upsertGameSave(uid, dataToApply);
        }
      } else {
        // 未ログイン（ゲスト）の場合：ローカルキャッシュから復元
        dataToApply = localData;
      }

      if (dataToApply) {
        const collected = dataToApply.collectedCards || [];
        const mhp = getPlayerMaxHp(1, collected, []);
        const atk = getPlayerAttack(1, collected, []);
        setPlayer(prev => ({
          ...prev,
          level: 1,
          xp: 0,
          xpToNextLevel: getXpToNextLevel(1),
          collectedCards: collected,
          activeRunCardIds: [],
          maxHp: mhp,
          hp: mhp,
          attack: atk
        }));
        setBestTime(dataToApply.bestTimeSeconds || null);
        setWrongTerms(dataToApply.wrongTerms || []);
        if (dataToApply.stats) {
          setGameStats(dataToApply.stats);
        }

        // ローカルキャッシュも最新のデータで更新
        secureStorage.setItem('it-rogue-save-data', JSON.stringify(dataToApply));

        // 魔導書レベルの参照値を同期（ログイン直後にストーリー解放モーダルが誤爆するのを防止）
        const initialLvl = calculateCollectorLevel(collected);
        prevCollectorLevelRef.current = initialLvl;
      } else if (uid) {
        // クラウドもローカルも完全に新規の場合
        setPlayer(prev => ({
          ...prev,
          level: 1,
          xp: 0,
          xpToNextLevel: getXpToNextLevel(1),
          collectedCards: [],
          activeRunCardIds: [],
          maxHp: 100,
          hp: 100,
          attack: 10
        }));
        setBestTime(null);
        setWrongTerms([]);
        setGameStats({ attempts: 0, wins: 0, termStats: {} });
        prevCollectorLevelRef.current = 1;
      }

      // デイリーチャレンジ・タイムアタック開放状態の復元
      const lastDate = secureStorage.getItem('it-rogue-last-daily-date');
      const todayStr = new Date().toISOString().split('T')[0];
      setIsDailyChallengeCompleted(lastDate === todayStr);

      const taUnlocked = secureStorage.getItem('it-rogue-time-attack-unlocked') === 'true';
      setIsTimeAttackUnlocked(taUnlocked);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Error loading save data:', e);
    } finally {
      setIsSyncing(false);
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
        ownerUserId: currentUser?.id || null,
        level: currentLevel ?? player.level,
        xp: currentXp ?? player.xp,
        collectedCards: updatedCollected,
        bestTimeSeconds: updatedBest,
        wrongTerms: updatedWrong,
        stats: statsOverride ?? gameStats,
        updated_at: new Date().toISOString(),
      };

      // 1. ローカルキャッシュに即時保存（オフラインでもゲームが継続可能）
      secureStorage.setItem('it-rogue-save-data', JSON.stringify(dataToSave));

      // 2. ログインユーザーが存在する場合はSupabaseクラウドへ非同期同期 (user_metadata + game_saves)
      if (currentUser?.id) {
        setIsSyncing(true);
        upsertGameSave(currentUser.id, dataToSave).then(() => {
          setLastSyncTime(new Date().toLocaleTimeString());
        }).catch(err => {
          console.error('Failed to sync save data to Supabase:', err);
        }).finally(() => {
          setIsSyncing(false);
        });
      }
    } catch (e) {
      console.error('Error saving data:', e);
    }
  };

  /**
   * 手動同期ボタン（現在の画面・端末の成績データをSupabaseへ確実にアップロードし、最新化）
   */
  const handleManualSync = async () => {
    if (!currentUser?.id) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setIsSyncing(true);

      // 1. 現在の画面・メモリ上の最新成績データを構築
      const currentMemorySave: SaveData = {
        ownerUserId: currentUser.id,
        level: player.level,
        xp: player.xp,
        collectedCards: player.collectedCards,
        bestTimeSeconds: bestTime,
        wrongTerms: wrongTerms,
        stats: gameStats,
        updated_at: new Date().toISOString(),
      };

      // 2. ローカルストレージ内のセーブデータとも最善マージ
      let localSaved: SaveData | null = null;
      try {
        const localStr = secureStorage.getItem('it-rogue-save-data');
        if (localStr) localSaved = JSON.parse(localStr);
      } catch {}

      const localBest = mergeSaveData(currentMemorySave, localSaved, currentUser.id) || currentMemorySave;

      // 3. Supabase クラウド (game_saves テーブル + user_metadata) へ確実にアップロード送信
      await upsertGameSave(currentUser.id, localBest);

      // 4. クラウド側のデータ（他端末や過去のデータ）ともマージして最新状態を同期
      await loadSaveData(currentUser.id);

      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ----------------------------------------------------
  // 認証セッション監視 & 初期データロード
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // 初期セッションチェック & 初回起動時の新規登録モーダル判定
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      let loadedProfile: UserProfile | null = null;
      if (session?.user) {
        setCurrentUser(session.user);
        // DB上のプロフィール＆初期セーブレコードの存在を確実に保証
        await ensureUserRecordExists(session.user.id, session.user.email, session.user.user_metadata);
        loadedProfile = await getUserProfile(session.user.id);
        if (isMounted) setCurrentUserProfile(loadedProfile);
        await loadSaveData(session.user.id);
      } else {
        await loadSaveData(null);
      }
      setHasLoaded(true);

      // 初回起動時のチェック：
      // はじめてのユーザ（未ログイン）またはプレイしているがまだ生徒データ未登録のユーザの場合、新規登録画面を開く
      const alreadyPrompted = sessionStorage.getItem('it-rogue-first-auth-prompted');
      if (!alreadyPrompted && isMounted) {
        sessionStorage.setItem('it-rogue-first-auth-prompted', 'true');
        if (!session?.user) {
          // 未ログイン・初回ユーザー：まずはログイン画面を表示（未登録者向け案内カード付き）
          setAuthModalMode('login');
          setIsFirstLaunchPrompt(true);
          setIsAuthModalOpen(true);
        } else if (loadedProfile && (!loadedProfile.student_year || !loadedProfile.student_class || !loadedProfile.student_no || !loadedProfile.student_name)) {
          // ログイン中だが生徒情報（年組番氏名）が未登録のユーザー
          setAuthModalMode('signup');
          setIsFirstLaunchPrompt(true);
          setIsAuthModalOpen(true);
        }
      }
    });

    // 認証ステートの変更リスナー
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setCurrentUser(session.user);
        await ensureUserRecordExists(session.user.id, session.user.email, session.user.user_metadata);
        const profile = await getUserProfile(session.user.id);
        if (isMounted) setCurrentUserProfile(profile);
        await loadSaveData(session.user.id);
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        await loadSaveData(null);
      }
    });

    // アプリ起動時の魔導書レベル初期値を計算してセット
    try {
      const dataStr = secureStorage.getItem('it-rogue-save-data');
      let collected: string[] = [];
      if (dataStr) {
        const parsed = JSON.parse(dataStr) as SaveData;
        collected = parsed.collectedCards || [];
      }
      const initialLvl = calculateCollectorLevel(collected);
      prevCollectorLevelRef.current = initialLvl;
    } catch (e) {
      prevCollectorLevelRef.current = 1;
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setCurrentUserProfile(null);
      // 共有端末・別アカウント利用時のデータ混入を防ぐため、ローカルキャッシュをクリア
      secureStorage.removeItem('it-rogue-save-data');
      setPlayer(prev => ({
        ...prev,
        level: 1,
        xp: 0,
        xpToNextLevel: getXpToNextLevel(1),
        collectedCards: [],
        activeRunCardIds: [],
        maxHp: 100,
        hp: 100,
        attack: 10
      }));
      setBestTime(null);
      setWrongTerms([]);
      setGameStats({ attempts: 0, wins: 0, termStats: {} });
      prevCollectorLevelRef.current = 1;
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // 魔導書レベルアップ時のストーリーカード解放検知
  useEffect(() => {
    if (!hasLoaded) return;

    const currentLvl = calculateCollectorLevel(player.collectedCards);

    if (prevCollectorLevelRef.current === null) {
      prevCollectorLevelRef.current = currentLvl;
      return;
    }

    if (currentLvl > prevCollectorLevelRef.current) {
      const hasSSClear = secureStorage.getItem('it-rogue-ss-clear-achieved') === 'true';
      const hasNoDamageClear = secureStorage.getItem('it-rogue-nodamage-clear-achieved') === 'true';
      const isSecretUnlocked = hasSSClear && hasNoDamageClear && currentLvl >= 99;

      // 新しく解放されたストーリーカード（unlockLevelが前回レベルより大きく今回レベル以下）を特定
      const newlyUnlocked = STORY_CARDS.filter(
        s => s.unlockLevel > prevCollectorLevelRef.current! && s.unlockLevel <= currentLvl
      ).filter(s => s.page <= 98 || (s.page === 99 && isSecretUnlocked));
      if (newlyUnlocked.length > 0) {
        setUnlockedStories(newlyUnlocked);
        setCurrentCollectorLevel(currentLvl);
      }
      prevCollectorLevelRef.current = currentLvl;
    } else if (currentLvl < prevCollectorLevelRef.current) {
      // データ削除や初期化によるレベル減少時は参照値をシンク
      prevCollectorLevelRef.current = currentLvl;
    }
  }, [player.collectedCards, hasLoaded]);

  // 画面遷移時にスクロール位置を最上部にリセット
  useEffect(() => {
    if (screen === 'battle' || screen === 'map' || screen === 'loot') {
      return;
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    const timer = setTimeout(scrollToTop, 30);
    return () => clearTimeout(timer);
  }, [screen]);

  // ----------------------------------------------------
  // 修行（しゅぎょう・たんれん）の開始
  // ----------------------------------------------------
  const startTrainingBattle = (mode: 'category' | 'subcategory' | 'drill', clusterId: string | null = null) => {
    setAskedProblemIds([]);
    setActiveTrainingMode(mode);
    setTrainingClusterId(clusterId);
    
    // 修行用プレイヤーHP等の構成（王道のカード補正のみを適用。冒険中カードactiveRunCardIdsは修行では無効）
    const mhp = getPlayerMaxHp(player.level, player.collectedCards, []);
    const atk = getPlayerAttack(player.level, player.collectedCards, []);

    setPlayer(prev => ({
      ...prev,
      hp: mhp,
      maxHp: mhp,
      attack: atk,
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
      ? 500 
      : mode === 'subcategory' 
        ? 450 
        : 550;

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
      monsterDamage: (mode === 'category' || mode === 'subcategory') ? 120 : 160,
      monsterQuestions,
      monsterImagePath: (mode === 'category' || mode === 'subcategory')
        ? './img/monsters/training_slime_battle.jpg'
        : './img/monsters/drill_golem_battle.jpg',
      monsterFallbackImage: (mode === 'category' || mode === 'subcategory')
        ? 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'
        : 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'
    };

    const choiceCount = 4;
    const poolItems = battleProblems.map(p => ({
      isPractical: false,
      raw: p,
      practical: undefined as any
    }));

    const firstItem = poolItems[0];
    let activeProg: ActiveProblem;
    if (firstItem.isPractical && firstItem.practical) {
      activeProg = generateActivePracticalProblem(firstItem.practical);
    } else {
      const firstRaw = firstItem.raw;
      const typeDecision = Math.random() < 0.5 ? 'term_to_def' : 'def_to_term';
      activeProg = generateActiveProblem(firstRaw, typeDecision, choiceCount, RAW_PROBLEMS);
    }

    const initialBattle: BattleState = {
      currentNode: mockNode,
      questionsLeft: monsterQuestions,
      totalQuestionsInBattle: monsterQuestions,
      currentQuestionIndex: 0,
      activeProblem: activeProg,
      playerHp: mhp,
      enemyHp: monsterMaxHp,
      enemyMaxHp: monsterMaxHp,
      enemyName: monsterName,
      timer: 45,
      maxTimer: 45,
      isAnswered: false,
      selectedAnswer: null,
      isCorrect: null,
      damageEffect: { target: null, amount: 0 },
      battleLog: `${monsterName}が勝負を仕掛けてきた！修行開始！`
    };

    (initialBattle as any)._problemPool = poolItems;

    setOverrideCardsPool(rewardsPool || TERM_CARDS);
    setForceFullyRandom(isFullyRandom);

    setBattleState(initialBattle);
    setScreen('battle');
  };

  const startDailyChallenge = () => {
    setAskedProblemIds([]);
    // 毎日異なるが、同じ日であれば一意に固定されるデイリーシードを使用
    const seed = getDailySeed();

    // 全階層（Floor 4を除く）から魔物を抽出
    const availableMonsters: any[] = [];
    [0, 1, 2, 3].forEach(floor => {
      const p = MONSTER_POOLS[floor];
      if (p) {
        if (p.easy) availableMonsters.push(...p.easy);
        if (p.hard) availableMonsters.push(...p.hard);
      }
    });

    // 対戦相手を決定
    const monsterTemplate = availableMonsters[seed % availableMonsters.length];

    // 「同じような問題ばかり出る」のを防ぐため、全10個の小カテゴリから異なる3つのカテゴリを選択して、
    // それぞれから1問ずつ（合計3問）を抽出する総合試練形式にする。
    const allSubcategories = quizCategories.flatMap(c => c.subcategories);
    const shuffledSubcategories = shuffleArrayWithSeed(allSubcategories, seed);

    const battleProblems: any[] = [];
    const selectedSubcategoryTitles: string[] = [];
    const selectedSubIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const subcategoryObj = shuffledSubcategories[i % shuffledSubcategories.length];
      selectedSubcategoryTitles.push(subcategoryObj.title);
      selectedSubIds.push(subcategoryObj.id);

      const matchingProblems = RAW_PROBLEMS.filter(p => p.clusterId === subcategoryObj.id);
      if (matchingProblems.length > 0) {
        // 各サブカテゴリ内の問題を、その日のシード + インデックスでシャッフルして最初の1問を採用
        const subProblemsShuffled = shuffleArrayWithSeed(matchingProblems, seed + i);
        battleProblems.push(subProblemsShuffled[0]);
      } else {
        // フォールバック
        const fallbackShuffled = shuffleArrayWithSeed(RAW_PROBLEMS, seed + i);
        battleProblems.push(fallbackShuffled[0]);
      }
    }

    const representativeSubId = selectedSubIds[0];
    const monsterName = `幻影の${monsterTemplate.name}`;
    const baseConfig = getEnemyConfig('battle_easy', 0);
    const monsterMaxHp = baseConfig.maxHp;
    const monsterDamage = baseConfig.damage;
    const monsterQuestions = 3;

    const mockNode: MapNode = {
      id: `daily_${representativeSubId}`,
      type: 'battle_easy',
      label: `【しれんのほこら】日替わりの総合幻魔（${selectedSubcategoryTitles.slice(0, 2).join('・')}他）`,
      completed: false,
      accessible: true,
      step: 0,
      route: 'easy',
      monsterName,
      monsterMaxHp,
      monsterDamage,
      monsterQuestions,
      monsterImagePath: monsterTemplate.imagePath,
      monsterThumbnailPath: monsterTemplate.thumbnailPath,
    };

    const poolItems = battleProblems.map(p => ({
      isPractical: false,
      raw: p
    }));

    const firstRaw = poolItems[0].raw;
    const typeDecision = (seed % 2 === 0) ? 'term_to_def' : 'def_to_term';
    const activeProg = generateActiveProblem(firstRaw, typeDecision, 4, RAW_PROBLEMS);

    const mhp = getPlayerMaxHp(player.level, player.collectedCards, player.activeRunCardIds);
    const atk = getPlayerAttack(player.level, player.collectedCards, player.activeRunCardIds);

    const initialBattle: BattleState = {
      currentNode: mockNode,
      questionsLeft: monsterQuestions,
      totalQuestionsInBattle: monsterQuestions,
      currentQuestionIndex: 0,
      activeProblem: activeProg,
      playerHp: mhp,
      enemyHp: monsterMaxHp,
      enemyMaxHp: monsterMaxHp,
      enemyName: monsterName,
      timer: 45,
      maxTimer: 45,
      isAnswered: false,
      selectedAnswer: null,
      isCorrect: null,
      damageEffect: { target: null, amount: 0 },
      battleLog: '時の狭間より、幻影の魔物が現れた！'
    };

    (initialBattle as any)._problemPool = poolItems;

    // 今回の試練で出題されたサブカテゴリのカードを報酬プールとする
    const rewardsPool = TERM_CARDS.filter(c => selectedSubIds.includes(c.clusterId));
    setOverrideCardsPool(rewardsPool.length > 0 ? rewardsPool : TERM_CARDS);
    setForceFullyRandom(false);

    setActiveTrainingMode('daily_challenge');
    setTrainingClusterId(representativeSubId);
    setBattleState(initialBattle);

    // プレイヤーのステータスをオーバーライドして開始
    setPlayer(prev => ({
      ...prev,
      hp: mhp,
      maxHp: mhp,
      attack: atk,
      activeRunCardIds: []
    }));

    setScreen('battle');
  };




  // ----------------------------------------------------
  // ゲーム初期化 & 構築
  // ----------------------------------------------------
  const handleStartGame = () => {
    setAskedProblemIds([]);
    // タイム計測開始
    setPlayStartTime(Date.now());
    setRunCardIdsForResults([]);
    setTookDamageThisRun(false);
    setIsGameClear(false); // 確実にリセット！
    
    // 挑戦回数アップ
    let nextStats = gameStats;
    setGameStats(prev => {
      const updated = { ...prev, attempts: prev.attempts + 1 };
      nextStats = updated;
      saveToStorage(player.collectedCards, bestTime, wrongTerms, 1, 0, updated);
      return updated;
    });
    
    // レベルを毎回1に、XPを0にリセットしてゲーム開始
    const mhp = getPlayerMaxHp(1, player.collectedCards, []);
    const atk = getPlayerAttack(1, player.collectedCards, []);

    setPlayer(prev => ({
      ...prev,
      level: 1,
      xp: 0,
      xpToNextLevel: getXpToNextLevel(1),
      hp: mhp,
      maxHp: mhp,
      attack: atk,
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
      
      const baseConfig = getEnemyConfig(type, step);
      const hp = Math.floor(baseConfig.maxHp * (0.95 + Math.random() * 0.1));
      const dmg = Math.floor(baseConfig.damage * (0.95 + Math.random() * 0.1));
      
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
    
    // 戦闘開始前にプレイヤーのHPを「動的に計算した最新の最大HPバフ込み」の全回復に同期させます
    const currentMaxHp = getPlayerMaxHp(player.level, player.collectedCards, player.activeRunCardIds);
    const currentAttack = getPlayerAttack(player.level, player.collectedCards, player.activeRunCardIds);
    const bonus = calculatePlayerBonus(player.collectedCards, player.activeRunCardIds);

    setPlayer(prev => ({
      ...prev,
      hp: currentMaxHp,
      maxHp: currentMaxHp,
      attack: currentAttack
    }));

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
        const unusedOthers = RAW_PROBLEMS.filter(p => !wrongList.some(wl => wl.id === p.id) && !askedProblemIds.includes(p.id));
        const fallbackOthers = RAW_PROBLEMS.filter(p => !wrongList.some(wl => wl.id === p.id));
        const candidates = unusedOthers.length >= remainingCount ? unusedOthers : fallbackOthers;
        battleProblems = [...wrongList, ...shuffleArray(candidates).slice(0, remainingCount)];
      } else {
        battleProblems = wrongList.slice(0, 8);
      }
    } else {
      // 通常戦：階層や難易度に合わせて出題（未出題を優先）
      const targetDiffs = node.type === 'battle_hard' ? ['medium', 'hard'] : ['easy', 'medium'];
      const matchingProblems = RAW_PROBLEMS.filter(p => targetDiffs.includes(p.difficulty));
      
      const unusedMatching = matchingProblems.filter(p => !askedProblemIds.includes(p.id));
      const candidates = unusedMatching.length >= enemyQuestions ? unusedMatching : matchingProblems;
      
      battleProblems = shuffleArray(candidates).slice(0, enemyQuestions);
    }

    // 選ばれた問題のIDを出題済みリストに記録
    const newlyAskedIds = battleProblems.map(p => p.id);
    setAskedProblemIds(prev => Array.from(new Set([...prev, ...newlyAskedIds])));

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
      playerHp: currentMaxHp,
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

    if (playerHpDamage > 0) {
      setTookDamageThisRun(true);
    }

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

      // 修行用の統計情報も更新！
      let updatedTrainingStats = prev.trainingStats || {
        categoryAttempts: { '1': 0, '2': 0, '3': 0 },
        categoryCorrects: { '1': 0, '2': 0, '3': 0 },
        categoryWins: { '1': 0, '2': 0, '3': 0, 'drill': 0 },
        subcategoryAttempts: {},
        subcategoryCorrects: {},
        subcategoryWins: {},
        drillAttempts: 0,
        drillCorrects: 0,
        drillWins: 0
      };

      if (activeTrainingMode) {
        if (activeTrainingMode === 'drill') {
          updatedTrainingStats = {
            ...updatedTrainingStats,
            drillAttempts: (updatedTrainingStats.drillAttempts || 0) + 1,
            drillCorrects: (updatedTrainingStats.drillCorrects || 0) + (isCorrect ? 1 : 0)
          };
        }

        const catId = activeRaw.clusterId ? activeRaw.clusterId.split('-')[0] : '';
        if (['1', '2', '3'].includes(catId)) {
          const catAttempts = { ...updatedTrainingStats.categoryAttempts };
          const catCorrects = { ...updatedTrainingStats.categoryCorrects };
          
          catAttempts[catId] = (catAttempts[catId] || 0) + 1;
          if (isCorrect) {
            catCorrects[catId] = (catCorrects[catId] || 0) + 1;
          }

          const subId = activeRaw.clusterId || '';
          const subAttempts = { ...(updatedTrainingStats.subcategoryAttempts || {}) };
          const subCorrects = { ...(updatedTrainingStats.subcategoryCorrects || {}) };
          
          if (subId) {
            subAttempts[subId] = (subAttempts[subId] || 0) + 1;
            if (isCorrect) {
              subCorrects[subId] = (subCorrects[subId] || 0) + 1;
            }
          }

          updatedTrainingStats = {
            ...updatedTrainingStats,
            categoryAttempts: catAttempts,
            categoryCorrects: catCorrects,
            subcategoryAttempts: subAttempts,
            subcategoryCorrects: subCorrects
          };
        }
      }

      const nextStats = { 
        ...prev, 
        termStats: nextTermStats,
        trainingStats: updatedTrainingStats
      };
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

    if (activeTrainingMode === 'daily_challenge') {
      // デイリーチャレンジ勝利！
      const todayStr = new Date().toISOString().split('T')[0];
      secureStorage.setItem('it-rogue-last-daily-date', todayStr);
      setIsDailyChallengeCompleted(true);

      const nextStats = {
        ...gameStats,
        dailyChallengeAttempts: (gameStats.dailyChallengeAttempts || 0) + 1,
        dailyChallengeWins: (gameStats.dailyChallengeWins || 0) + 1
      };
      setGameStats(nextStats);

      // 勝利時はカード2枚選択可能
      setPendingXp(0); // 参加＆勝利ボーナス 0 XP
      setDailyChallengeLootCount(2); // 勝利時は2枚！
      setScreen('loot');
      return;
    }

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
      if (activeTrainingMode === 'daily_challenge') {
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

        const nextLootCount = dailyChallengeLootCount - 1;
        setDailyChallengeLootCount(nextLootCount);

        saveToStorage(updatedCollected, bestTime, wrongTerms, player.level, player.xp, gameStats);

        if (nextLootCount > 0) {
          // まだ選択回数が残っている場合はLoot画面に残る
          return;
        }

        // デイリーチャレンジ完了、タイトルへ戻る
        setScreen('title');
        setActiveTrainingMode(null);
        setTrainingClusterId(null);
        setOverrideCardsPool(undefined);
        setForceFullyRandom(false);
        setBattleState(null);
        return;
      }

      // 完了した修行カテゴリID
      let trainingCatKey = 'drill';
      if (activeTrainingMode === 'category' && trainingClusterId) {
        trainingCatKey = trainingClusterId; // '1', '2', '3'
      } else if (activeTrainingMode === 'subcategory' && trainingClusterId) {
        trainingCatKey = trainingClusterId.split('-')[0]; // '1-a' -> '1'
      }

      // 修行カテゴリーの勝利(Wins)数をインクリメント
      const currentTrainingStats = gameStats.trainingStats || {
        categoryAttempts: { '1': 0, '2': 0, '3': 0 },
        categoryCorrects: { '1': 0, '2': 0, '3': 0 },
        categoryWins: { '1': 0, '2': 0, '3': 0, 'drill': 0 },
        subcategoryAttempts: {},
        subcategoryCorrects: {},
        subcategoryWins: {},
        drillAttempts: 0,
        drillCorrects: 0,
        drillWins: 0
      };

      const nextCategoryWins = {
        ...currentTrainingStats.categoryWins,
        [trainingCatKey]: (currentTrainingStats.categoryWins[trainingCatKey] || 0) + 1
      };

      const nextSubcategoryWins = { ...(currentTrainingStats.subcategoryWins || {}) };
      if (activeTrainingMode === 'subcategory' && trainingClusterId) {
        nextSubcategoryWins[trainingClusterId] = (nextSubcategoryWins[trainingClusterId] || 0) + 1;
      }

      let nextDrillWins = currentTrainingStats.drillWins || 0;
      if (activeTrainingMode === 'drill') {
        nextDrillWins += 1;
      }

      const nextTrainingStats = {
        ...currentTrainingStats,
        categoryWins: nextCategoryWins,
        subcategoryWins: nextSubcategoryWins,
        drillWins: nextDrillWins
      };

      const nextStats = {
        ...gameStats,
        trainingStats: nextTrainingStats
      };

      setGameStats(nextStats);

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

      saveToStorage(updatedCollected, bestTime, wrongTerms, player.level, player.xp, nextStats);
      rollTimeAttackUnlock();

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
      let isSSorAbove = false;
      if (playStartTime) {
        runSeconds = (Date.now() - playStartTime) / 1000;
        const totalEvaluationTime = runSeconds + player.penaltySeconds;
        if (bestTime === null || totalEvaluationTime < bestTime) {
          newBest = totalEvaluationTime;
          setBestTime(newBest);
        }
        isSSorAbove = totalEvaluationTime <= 360 || !tookDamageThisRun;
      } else {
        isSSorAbove = !tookDamageThisRun;
      }

      if (isSSorAbove) {
        secureStorage.setItem('it-rogue-ss-clear-achieved', 'true');
      }
      if (!tookDamageThisRun) {
        secureStorage.setItem('it-rogue-nodamage-clear-achieved', 'true');
      }

      // ボス撃破時はクリア数winsを追加加算
      const nextStats = { ...gameStats, wins: gameStats.wins + 1 };
      setGameStats(nextStats);

      // ボス撃破後はセーブデータ上のステータスをレベル1、XP 0に初期化して保存
      saveToStorage(updatedCollected, newBest, [...new Set([...wrongTerms])], 1, 0, nextStats);
      rollTimeAttackUnlock();

      // リザルト画面で今回の冒険で到達した強さ（レベルなど）を表示するため、
      // プレイヤー状態の初期化は次のゲーム開始時（handleStartGame）に行います。
      setPlayer(prev => ({
        ...prev,
        collectedCards: updatedCollected,
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

    // レベルアップした場合は基本ステータスを上げる（共通ヘルパーにより上限値を一貫）
    const mhp = getPlayerMaxHp(nextLvl, updatedCollected, updatedRunCards);
    const atk = getPlayerAttack(nextLvl, updatedCollected, updatedRunCards);

    // 前回の戦果報酬をステートに記録
    setLastDroppedCard(selectedCard);
    setLastGainedXp(actualXp);

    setPlayer(prev => ({
      ...prev,
      level: nextLvl,
      xp: nextXp,
      xpToNextLevel: required,
      maxHp: mhp,
      hp: mhp, // 新たな補正カード装着時、全回復・同期します
      attack: atk,
      collectedCards: updatedCollected,
      activeRunCardIds: updatedRunCards
    }));

    // 保存
    saveToStorage(updatedCollected, bestTime, [...new Set([...wrongTerms])], nextLvl, nextXp);
    rollTimeAttackUnlock();

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
  const handleGameOver = (isGiveUp?: boolean) => {
    if (activeTrainingMode) {
      if (activeTrainingMode === 'daily_challenge') {
        // デイリーチャレンジ敗北：カード1枚選択のLootへ移行！
        const todayStr = new Date().toISOString().split('T')[0];
        secureStorage.setItem('it-rogue-last-daily-date', todayStr);
        setIsDailyChallengeCompleted(true);

        const nextStats = {
          ...gameStats,
          dailyChallengeAttempts: (gameStats.dailyChallengeAttempts || 0) + 1
        };
        setGameStats(nextStats);

        if (isGiveUp) {
          // あきらめるで終了した場合はカードは引けない（LootScreenをスキップしてタイトルへ戻る）
          setScreen('title');
          setActiveTrainingMode(null);
          setTrainingClusterId(null);
          setBattleState(null);
          return;
        }

        setPendingXp(0); // 敗北でも参加賞 0 XP
        setDailyChallengeLootCount(1); // 敗北時は1枚！
        setScreen('loot');
        return;
      }

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
    
    // 敗北時も、リザルト画面に今回の最終ステータス（レベルなど）を表示させるため、
    // プレイヤー状態の初期化は次のゲーム開始時（handleStartGame）に行います。
    setPlayer(prev => ({
      ...prev,
      totalTimeSeconds: runSeconds
    }));

    // 保存 (レベル1、XP0として保存)
    saveToStorage(player.collectedCards, bestTime, [...new Set([...wrongTerms])], 1, 0);

    setSelectedRoute(null);
    setCurrentStep(0);
    setScreen('result');
    setBattleState(null);
  };

  /**
   * 全部のセーブデータリセット
   */
  const handleResetAllData = () => {
    secureStorage.removeItem('it-rogue-save-data');
    secureStorage.removeItem('it-rogue-last-daily-date');
    secureStorage.removeItem('it-rogue-time-attack-unlocked');
    secureStorage.removeItem('it-rogue-ss-clear-achieved');
    secureStorage.removeItem('it-rogue-nodamage-clear-achieved');
    setIsDailyChallengeCompleted(false);
    setIsTimeAttackUnlocked(false);
    
    setPlayer({
      hp: 100,
      maxHp: 100,
      attack: 100,
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
      termStats: {},
      trainingStats: {
        categoryAttempts: { '1': 0, '2': 0, '3': 0 },
        categoryCorrects: { '1': 0, '2': 0, '3': 0 },
        categoryWins: { '1': 0, '2': 0, '3': 0, 'drill': 0 },
        subcategoryAttempts: {},
        subcategoryCorrects: {},
        subcategoryWins: {},
        drillAttempts: 0,
        drillCorrects: 0,
        drillWins: 0
      }
    });
    setScreen('title');
  };

  /**
   * デバッグ用クリア画面遷移
   */
  const handleDebugGoToResult = (
    isWin: boolean,
    totalTimeSeconds: number,
    penaltySeconds: number,
    finalQuestions: number,
    correctAnswers: number,
    card: any,
    runCards: string[],
    wrongs: string[],
    noDamageClear?: boolean
  ) => {
    setIsGameClear(isWin);
    setFinalQuestionsCount(finalQuestions);
    setCorrectAnswersCount(correctAnswers);
    setDroppedCard(card);
    setRunCardIdsForResults(runCards);
    setWrongTerms(wrongs);
    setTookDamageThisRun(noDamageClear !== undefined ? !noDamageClear : false);
    setPlayer(prev => ({
      ...prev,
      totalTimeSeconds,
      penaltySeconds
    }));
    setScreen('result');
  };

  /**
   * デバッグ用：すべてのカードをフルコンプリート（3枚ずつ所持）
   */
  const handleDebugUnlockAllCards = () => {
    const fullCompleteList: string[] = [];
    TERM_CARDS.forEach(card => {
      fullCompleteList.push(card.id, card.id, card.id);
    });

    setPlayer(prev => {
      const updated = {
        ...prev,
        collectedCards: fullCompleteList,
      };
      saveToStorage(fullCompleteList, bestTime, wrongTerms, prev.level, prev.xp, gameStats);
      return updated;
    });
  };

  // ----------------------------------------------------
  // レンダリング処理
  // ----------------------------------------------------
  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 flex flex-col justify-between relative">
      {screen === 'title' && (
        <TitleScreen
          collectedCardIds={player.collectedCards}
          bestTime={bestTime}
          onStartGame={handleStartGame}
          onOpenCollection={() => setScreen('collection')}
          onOpenStats={() => setScreen('stats')}
          onOpenTraining={() => setScreen('training-hub')}
          onOpenTimeAttack={() => {
            setScreen('time-attack');
            setIsTimeAttackUnlocked(false);
            secureStorage.setItem('it-rogue-time-attack-unlocked', 'false');
          }}
          onStartDailyChallenge={startDailyChallenge}
          installPrompt={deferredPrompt}
          onInstallApp={handleInstallApp}
          isDailyDone={isDailyChallengeCompleted}
          isTimeAttackUnlocked={isTimeAttackUnlocked}
          userProfile={currentUserProfile}
          onOpenAuth={() => {
            if (currentUserProfile && (!currentUserProfile.student_year || !currentUserProfile.student_name)) {
              setAuthModalMode('signup');
            } else {
              setAuthModalMode('login');
            }
            setIsFirstLaunchPrompt(false);
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onOpenAdmin={currentUserProfile?.role === 'admin' ? () => {
            setScreen('admin');
            window.history.pushState({}, '', '/admin');
          } : undefined}
          isSyncing={isSyncing}
          onManualSync={handleManualSync}
        />
      )}

      {screen === 'admin' && (
        <AdminDashboard
          currentUserProfile={currentUserProfile}
          currentSaveData={currentSaveData}
          onBackToGame={() => {
            setScreen('title');
            if (window.location.pathname === '/admin') {
              window.history.pushState({}, '', '/');
            }
          }}
          onManualSync={handleManualSync}
          isSyncing={isSyncing}
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
          key={`loot_${dailyChallengeLootCount}`}
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
          playerMaxHp={getPlayerMaxHp(player.level, player.collectedCards, player.activeRunCardIds)}
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
          noDamageClear={isGameClear && !tookDamageThisRun}
          onRestart={handleStartGame}
          onBackToTitle={() => setScreen('title')}
        />
      )}

      {screen === 'collection' && (
        <CardCollection
          collectedIds={player.collectedCards}
          playerLevel={calculateCollectorLevel(player.collectedCards)}
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
          userProfile={currentUserProfile}
          onDebugGoToResult={handleDebugGoToResult}
          onManualSync={handleManualSync}
          isSyncing={isSyncing}
        />
      )}

      {screen === 'time-attack' && (
        <TimeAttackScreen
          onClose={() => setScreen('title')}
          gameStats={gameStats}
          collectedCardIds={player.collectedCards}
          onUpdateStats={(updatedStats) => {
            setGameStats(updatedStats);
            saveToStorage(player.collectedCards, bestTime, wrongTerms, player.level, player.xp, updatedStats);
          }}
          onAcquireCards={(newCardIds) => {
            const updatedCollected = [...player.collectedCards, ...newCardIds];
            setPlayer(prev => ({
              ...prev,
              collectedCards: updatedCollected
            }));
            saveToStorage(updatedCollected, bestTime, wrongTerms, player.level, player.xp, gameStats);
          }}
        />
      )}

      {unlockedStories && (
        <StoryUnlockModal
          unlockedStories={unlockedStories}
          currentLevel={currentCollectorLevel}
          onClose={() => setUnlockedStories(null)}
        />
      )}

      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        isFirstLaunch={isFirstLaunchPrompt}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setCurrentUser(session.user);
            const profile = await getUserProfile(session.user.id);
            setCurrentUserProfile(profile);
            await loadSaveData(session.user.id);
          }
        }}
      />

      {/* ワンタイムパスワード変更（強制）モーダル */}
      {currentUser && currentUserProfile?.must_change_password && (
        <ForcePasswordChangeModal
          isOpen={Boolean(currentUserProfile?.must_change_password)}
          userId={currentUser.id}
          userEmail={currentUser.email || null}
          onSuccess={async () => {
            const updated = await getUserProfile(currentUser.id);
            setCurrentUserProfile(updated);
          }}
        />
      )}
    </div>
  );
}
