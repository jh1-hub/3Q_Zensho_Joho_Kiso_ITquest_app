/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'UR' | 'LG';

export interface PracticalQuestion {
  id: string;
  categoryId: string;
  description: string;
  subDescriptions?: string[];
  options: string[];
  correctAnswer: string | string[];
  displayType: 'single' | 'multiple';
}

export interface TermCard {
  id: string;
  name: string;
  definition: string;
  flavorText: string;
  descriptions?: string[];
  flavorTexts?: string[];
  rarity: Rarity;
  clusterId: string;
  statsBonus: {
    hp?: number;
    attack?: number;
    xpBonus?: number; // xp獲得ボーナス%
    timerBonus?: number; // 制限時間ボーナス（秒）
  };
}

export interface Cluster {
  id: string;
  name: string;
  description: string;
  bonusText: string;
  cardIds: string[];
}

export interface RawProblem {
  id: string;
  termName: string;      // 正解の用語名
  definition: string;    // 問題文（説明（意味）から答える場合）または正解の意味（用語から意味を答える場合）
  explanation: string;   // 解説
  category: string;      // カテゴリ (e.g., 'ネットワーク', 'セキュリティ')
  clusterId: string;     // クラスタID
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ActiveProblem {
  raw: RawProblem;
  questionText: string;  // 画面に表示される問題文
  choices: string[];     // シャッフルされた選択肢
  correctIndex: number;  // 正答のインデックス
  type: 'term_to_def' | 'def_to_term'; // 問題形式
}

export type NodeType = 'battle_easy' | 'battle_hard' | 'boss' | 'start';

export interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  completed: boolean;
  accessible: boolean;
  step: number; // 何番目の戦闘か (基礎なら0~5、応用なら0~2)
  route: 'easy' | 'hard' | 'common';
  
  // 個別ランダム魔物情報
  locationName?: string;
  monsterName?: string;
  monsterMaxHp?: number;
  monsterDamage?: number;
  monsterQuestions?: number;
  monsterImagePath?: string;
  monsterThumbnailPath?: string;
  monsterFallbackImage?: string;
  monsterFallbackThumbnail?: string;
  monsterExplanation?: string;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  collectedCards: string[]; // 収集したカードのIDリスト
  activeRunCardIds: string[]; // この冒険中に獲得したカードのIDリスト
  totalTimeSeconds: number; // 実時間秒数
  penaltySeconds: number;   // ペナルティ秒数 (誤答など)
  history: {
    termId: string;
    correct: boolean;
    timestamp: number;
  }[];
}

export interface BattleState {
  currentNode: MapNode;
  questionsLeft: number;
  totalQuestionsInBattle: number;
  currentQuestionIndex: number;
  activeProblem: ActiveProblem | null;
  playerHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  timer: number; // 秒
  maxTimer: number; // 秒
  isAnswered: boolean;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  damageEffect: {
    target: 'player' | 'enemy' | null;
    amount: number;
  };
  battleLog: string;
}

export interface TermStat {
  correctCount: number;
  attemptCount: number;
}

export interface TrainingStats {
  categoryAttempts: Record<string, number>;
  categoryCorrects: Record<string, number>;
  categoryWins: Record<string, number>;
  subcategoryAttempts?: Record<string, number>;
  subcategoryCorrects?: Record<string, number>;
  subcategoryWins?: Record<string, number>;
  drillAttempts?: number;
  drillCorrects?: number;
  drillWins?: number;
}

export interface GameStats {
  attempts: number;
  wins: number;
  termStats: Record<string, TermStat>;
  timeAttackHighScore?: number;
  timeAttackMaxCombo?: number;
  trainingStats?: TrainingStats;
  dailyChallengeAttempts?: number;
  dailyChallengeWins?: number;
}

