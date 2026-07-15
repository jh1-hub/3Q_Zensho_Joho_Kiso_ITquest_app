/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawProblem, ActiveProblem, PlayerState, TermCard, Rarity, PracticalQuestion } from '../types';
import { RAW_PROBLEMS, CLUSTERS, TERM_CARDS, LEGENDARY_COMPLETION_CARD } from '../data/problems';
import { getTermEmoji as importedGetTermEmoji } from './termIcon';

/**
 * 経験値テーブル
 */
export function getXpToNextLevel(level: number): number {
  return 10 + (level - 1) * 15; // 1: 10, 2: 25, 3: 40, 4: 55, ...
}

/**
 * 獲得カード数から魔導書レベル (1〜99) を計算する
 */
export function calculateCollectorLevel(collectedCardIds: string[]): number {
  const totalPossible = TERM_CARDS.length * 3;
  const collectedCount = collectedCardIds.length;

  const levelRequirements: number[] = [0];
  for (let lvl = 1; lvl <= 99; lvl++) {
    if (lvl === 1) {
      levelRequirements.push(0);
      continue;
    }
    if (lvl === 99) {
      levelRequirements.push(totalPossible);
      continue;
    }
    const norm = (lvl - 1) / 98;
    const curveValue = totalPossible * Math.pow(norm, 2.8);
    const linearValue = lvl - 1;
    const blended = linearValue * (1 - norm) + curveValue * norm;
    
    let req = Math.round(blended);
    const prevReq = levelRequirements[lvl - 1];
    
    if (req <= prevReq) {
      req = prevReq + 1;
    }
    
    const remainingLevels = 99 - lvl;
    if (req > totalPossible - remainingLevels) {
      req = totalPossible - remainingLevels;
    }
    
    levelRequirements.push(req);
  }

  let currentLevel = 1;
  for (let lvl = 1; lvl <= 99; lvl++) {
    if (collectedCount >= levelRequirements[lvl]) {
      currentLevel = lvl;
    } else {
      break;
    }
  }
  return currentLevel;
}

/**
 * プレイヤーのカード効果を累積計算する
 */
export interface PlayerBonus {
  hp: number;
  attack: number;
  xpBonus: number; // 割合 (e.g. 1.15)
  timerBonus: number; // 秒数
  activeClusters: string[];
}

export function calculatePlayerBonus(collectedIds: string[], runCardIds: string[] = []): PlayerBonus {
  let hp = 0;
  let attack = 0;
  let xpBonus = 1.0;
  let timerBonus = 0;
  const activeClusters: string[] = [];

  // 1. 各カードの各永続個別ボーナス (これまでに獲得したカードすべて：重複も含めて単純累積)
  // 表示されている「statsBonus * 0.5」の効果がそのまま、被り枚数分だけ累積されます。
  let rawCollectedHp = 0;
  let rawCollectedAttack = 0;
  let rawCollectedXpBonus = 0;
  let rawCollectedTimerBonus = 0;

  collectedIds.forEach(id => {
    const card = TERM_CARDS.find(c => c.id === id);
    if (card) {
      rawCollectedHp += (card.statsBonus.hp || 0) * 0.5;
      rawCollectedAttack += (card.statsBonus.attack || 0) * 0.5;
      rawCollectedXpBonus += (card.statsBonus.xpBonus || 0) * 0.5;
      rawCollectedTimerBonus += (card.statsBonus.timerBonus || 0) * 0.5;
    }
  });

  hp += rawCollectedHp;
  attack += rawCollectedAttack;
  xpBonus += rawCollectedXpBonus / 100;
  timerBonus += rawCollectedTimerBonus;

  // 2. この冒険中に獲得したカードの個別ボーナス（こちらは一時的なシナジー快感のため、元々の強さを保つ。ただしゲーム崩壊を防ぐためマイルドにする -> 30倍へ増加）
  runCardIds.forEach(id => {
    const card = TERM_CARDS.find(c => c.id === id);
    if (card) {
      const runHp = (card.statsBonus.hp || 0) * 0.5 * 30;
      const runAttack = (card.statsBonus.attack || 0) * 0.5 * 30;
      const runXpBonus = (card.statsBonus.xpBonus || 0) * 0.5 * 30;
      const runTimerBonus = (card.statsBonus.timerBonus || 0) * 0.5 * 30;

      hp += runHp;
      attack += runAttack;
      xpBonus += runXpBonus / 100;
      timerBonus += runTimerBonus;
    }
  });

  // クラスタ完成ボーナス (マイルドかつバランスよく - HP10倍、ATK50倍)
  CLUSTERS.forEach(cluster => {
    const isCompleted = cluster.cardIds.length > 0 && cluster.cardIds.every(cid => collectedIds.includes(cid));
    if (isCompleted) {
      activeClusters.push(cluster.id);
      if (cluster.id === '1-a') {
        hp += 0.1 * 10;
      } else if (cluster.id === '1-b') {
        attack += 0.02 * 50;
      } else if (cluster.id === '1-c') {
        hp += 0.05 * 10;
      } else if (cluster.id === '2-a') {
        timerBonus += 0.05;
      } else if (cluster.id === '2-b') {
        attack += 0.02 * 50;
      } else if (cluster.id === '2-c') {
        hp += 0.05 * 10;
      } else if (cluster.id === '2-d') {
        attack += 0.04 * 50;
      } else if (cluster.id === '3-a') {
        xpBonus += 0.002;
      } else if (cluster.id === '3-b') {
        timerBonus += 0.05;
      } else if (cluster.id === '3-c') {
        attack += 0.04 * 50;
      }
    }
  });

  // 全クラスタを完成させていたらレジェンドカードも解放・マージ (極めてマイルドに：0.05倍)
  const totalBaseClusters = CLUSTERS.length;
  if (activeClusters.length === totalBaseClusters && totalBaseClusters > 0) {
    hp += (LEGENDARY_COMPLETION_CARD.statsBonus.hp || 0) * 0.05;
    attack += (LEGENDARY_COMPLETION_CARD.statsBonus.attack || 0) * 0.05;
    xpBonus += ((LEGENDARY_COMPLETION_CARD.statsBonus.xpBonus || 0) * 0.05) / 100;
  }

  return { hp, attack, xpBonus, timerBonus, activeClusters };
}

/**
 * 配列シャッフル (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 実践模擬問題を ActiveProblem に変換
 */
export function generateActivePracticalProblem(pq: PracticalQuestion): ActiveProblem {
  let questionText = pq.description;
  if (pq.subDescriptions && pq.subDescriptions.length > 0) {
    questionText += '\n\n' + pq.subDescriptions.join('\n');
  }

  // 選択肢をシャッフルしてコピー
  const shuffledChoices = shuffleArray(pq.options);

  // シャッフル後の正解の位置を検出。見つからない場合は0番目をデフォルトとする
  const correctText = pq.correctAnswer as string;
  let correctIndex = shuffledChoices.indexOf(correctText);
  if (correctIndex === -1) {
    correctIndex = 0;
  }

  // 汎用のダミーのRawProblemを作成して問題ないようにする
  const mockRaw: RawProblem = {
    id: pq.id,
    termName: pq.id, // ID
    definition: correctText,
    explanation: `（情報基礎・検定形式問題）\n正解は「${correctText}」です。\n問題の文言や構成を正しく捉えましょう。`,
    category: '実践・模擬問題',
    clusterId: 'practical',
    difficulty: 'hard'
  };

  return {
    raw: mockRaw,
    questionText,
    choices: shuffledChoices, // シャッフルした選択肢を使用
    correctIndex,
    type: 'term_to_def'
  };
}

/**
 * 動的な選択肢生成と問題オブジェクトの作成
 * 同一クラスタ→同一カテゴリ→全体の優先順位でダミーを集める
 */
export function generateActiveProblem(
  raw: RawProblem,
  type: 'term_to_def' | 'def_to_term',
  choiceCount: number,
  allProblems: RawProblem[]
): ActiveProblem {
  // まず正解の定義
  const correctText = type === 'term_to_def' ? raw.definition : raw.termName;

  // ダミー選択肢候補を集める
  let dummyCandidates = allProblems.filter(p => p.id !== raw.id);

  // 1. 同一クラスタのダミー
  let clusterDummies = dummyCandidates.filter(p => p.clusterId === raw.clusterId);
  // 2. 同一カテゴリのダミー（もしクラスタだけで足りなければ）
  let categoryDummies = dummyCandidates.filter(p => p.category === raw.category && p.clusterId !== raw.clusterId);
  // 3. その他のダミー
  let otherDummies = dummyCandidates.filter(p => p.category !== raw.category && p.clusterId !== raw.clusterId);

  // 優先順位に従って結合
  const sortedDummies = [...clusterDummies, ...categoryDummies, ...otherDummies];

  // ダミーの実際の表示用文字列に変換
  const dummyStrings = sortedDummies.map(p => (type === 'term_to_def' ? p.definition : p.termName));

  // ユニークにする
  const uniqueDummies = Array.from(new Set(dummyStrings));

  // 必要数（choiceCount - 1）だけ抽出
  const chosenDummies = uniqueDummies.slice(0, choiceCount - 1);

  // 正解と混ぜてシャッフル
  const finalChoices = shuffleArray([correctText, ...chosenDummies]);
  const correctIndex = finalChoices.indexOf(correctText);

  // 問題文の作成
  let questionText = '';
  if (type === 'term_to_def') {
    questionText = `「 ${raw.termName} 」の正しい意味として当てはまるものはどれですか？`;
  } else {
    questionText = `「 ${raw.definition} 」という説明に最も当てはまる用語を選択してください。`;
  }

  return {
    raw,
    questionText,
    choices: finalChoices,
    correctIndex,
    type
  };
}

/**
 * 難易度(段階)に基づく選択肢数の決定
 * 序盤（stepが0~2）: 4択
 * 中盤（stepが3~4）: 6択
 * 終盤およびボス戦（stepが5以降 / boss）: 8〜10択
 */
export function getChoiceCountForStep(step: number | 'boss'): number {
  if (step === 'boss') {
    return 10; // ボスは10択
  }
  if (step <= 1) {
    return 4; // 3択から4択へ引き上げ
  }
  if (step <= 3) {
    return 6; // 5択から6択へ
  }
  return 8; // 7択から8択へ
}

/**
 * プレイ進行度に応じた敵の基本ステータス設定
 * Slay the Spire風のファンタジー魔物にカスタマイズ
 */
export function getEnemyConfig(type: 'battle_easy' | 'battle_hard' | 'boss', step: number) {
  const scale = 1.0 + step * 0.15;
  if (type === 'boss') {
    return {
      name: '量子コア・オメガ「NEO-HYDRA」 (Quantum Core "NEO-HYDRA")',
      maxHp: Math.round(1500 * scale), // HP: 1500 scale
      damage: Math.round(210 * scale),  // Damage: 210 scale scaled for 500 base HP (3 mistakes allowed)
      questions: 15
    };
  }

  if (type === 'battle_hard') {
    return {
      name: step === 1 ? '防衛セキュリティ「AEGIS_V2」 (Sentinel Defense "AEGIS_V2")' : '亡霊コードウィーバー「LEPTO.java」 (Call-Weaver "LEPTO.java")',
      maxHp: Math.round(750 * scale),   // HP: 750 scale
      damage: Math.round(160 * scale),  // Damage: 160 scale scaled for 500 base HP (3-4 mistakes allowed)
      questions: 10
    };
  }

  // battle_easy
  return {
    name: step === 0 ? '微細バグウイルス「BUG-GOBLIN」 (Micro-Virus "BUG-GOBLIN")' : '液状エラー「DATA-LEAK SLIME」 (Leaking Core "DATA-LEAK SLIME")',
    maxHp: Math.round(400 * scale),    // HP: 400 scale (3-4 hits to defeat at default ATK 100)
    damage: Math.round(150 * scale),   // Damage: 150 scale (3.3 mistakes allowed at 500 HP)
    questions: 8
  };
}

/**
 * カードガチャ
 * 戦闘勝利時にカードをドロップする
 */
export function drawCard(collectedIds: string[]): TermCard {
  // レアリティ確率
  const roll = Math.random() * 100;
  let targetRarity: Rarity = 'C';

  if (roll < 55) {
    targetRarity = 'C';
  } else if (roll < 85) {
    targetRarity = 'UC';
  } else if (roll < 97) {
    targetRarity = 'SR';
  } else {
    targetRarity = 'UR';
  }

  // 該当するレアリティの未所有カードを優先
  let candidates = TERM_CARDS.filter(c => c.rarity === targetRarity);
  const unowned = candidates.filter(c => !collectedIds.includes(c.id));

  if (unowned.length > 0) {
    candidates = unowned;
  } else {
    // 3枚未満（1〜2枚）しか持っていないカードを優先
    const lessThanThree = candidates.filter(c => collectedIds.filter(id => id === c.id).length < 3);
    if (lessThanThree.length > 0) {
      candidates = lessThanThree;
    } else if (candidates.length === 0) {
      // 全て所得済みで、かつ全て3枚揃っている場合はそのレアリティの候補から選ぶ
      candidates = TERM_CARDS.filter(c => c.rarity === targetRarity);
      if (candidates.length === 0) {
        candidates = TERM_CARDS;
      }
    }
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return picked;
}

const EMOJI_MAP: Record<string, string> = {
  "IoT": "📡",
  "クラウドコンピューティング": "☁️",
  "クラウド": "☁️",
  "フィッシング詐欺": "🎣",
  "フィッシング": "🎣",
  "データ": "📊",
  "情報": "ℹ️",
  "情報処理": "⚙️",
  "情報通信技術（ICT）": "🌐",
  "高度情報通信社会": "🏙️",
  "情報システム": "🕸️",
  "サーバ": "🖥️",
  "データベース": "🗄️",
  "ビジネス": "💼",
  "企業活動": "🏢",
  "経営資源": "💎",
  "パレートの法則": "📉",
  "ロングテール": "🦒",
  "著作権法": "©️",
  "NDA": "🤫",
  "不正アクセス禁止法": "🚫",
  "個人情報保護法": "👤",
  "PL法": "⚠️",
  "個人情報": "🆔",
  "プライバシーマーク": "❇️",
  "知的財産権": "💡",
  "産業財産権": "⚙️",
  "特許権": "📜",
  "実用新案権": "🔧",
  "意匠権": "🎨",
  "商標権": "™️",
  "著作物": "📚",
  "デジタル著作権管理（DRM）": "🔐",
  "著作権法による保護の例外": "🆓",
  "肖像権": "📸",
  "パブリシティ権": "🌟",
  "知的財産権の侵害": "🔥",
  "ライセンス": "🎫",
  "基本合意書": "🤝",
  "契約": "✒️",
  "機密保持契約（NDA）": "🤐",
  "サイバー犯罪": "🕵️",
  "不正アクセス": "🚷",
  "電子消費者契約法": "🛒",
  "特定商取引法": "📬",
  "個人情報の定義": "🧑",
  "要配慮個人情報": "🩺",
  "仮名加工情報": "🎭",
  "匿名加工情報": "👥",
  "製造物責任法（PL法）": "🔨",
  "欠陥": "❌",
  "損害賠償": "💸",
  "中央処理装置（CPU）": "🧠",
  "主記憶装置": "💾",
  "補助記憶装置": "📦",
  "HDD": "📀",
  "SSD": "⚡",
  "光学ドライブ": "💿",
  "USB メモリ": "🔌",
  "SD メモリカード": "🃏",
  "解像度": "📺",
  "デジタルカメラ": "📷",
  "スマートデバイス": "📱",
  "インタフェース": "🔌",
  "RFID": "🏷️",
  "Bluetooth": "📶",
  "HDMI": "📺",
  "USB": "⚡",
  "集積回路（IC）": "🎛️",
  "RAM": "🧠",
  "ROM": "🔒",
  "ビデオボード": "🎮",
  "VRAM": "📹",
  "フラッシュメモリ": "⚡",
  "デジタル": "🔢",
  "アナログ": "📻",
  "ビット": "⚪",
  "バイト": "◼️",
  "2進数": "🔢",
  "基数変換": "🧮",
  "ms": "⏱️",
  "μs": "⏲️",
  "ns": "⏱️",
  "ps": "🕒",
  "fs": "⏳",
  "KB": "📄",
  "MB": "📁",
  "GB": "🗂️",
  "TB": "🗄️",
  "PB": "🏢",
  "標本化": "✂️",
  "量子化": "🧮",
  "符号化": "📝",
  "ソフトウェア": "💿",
  "アイコン": "🖼️",
  "オペレーティングシステム（OS）": "💻",
  "アプリケーションソフトウェア": "📱",
  "アンインストール": "🗑️",
  "インストール": "📥",
  "オープンソースソフトウェア（OSS）": "👐",
  "フリーウェア": "🎁",
  "シェアウェア": "🪙",
  "サイトライセンス": "🏢",
  "デバイスドライバ": "⚙️",
  "バグ": "🐛",
  "パッチ": "🩹",
  "ファイル": "📄",
  "ファイル名": "✏️",
  "テキストファイル": "📝",
  "バイナリファイル": "🧩",
  "フォーマット": "🧹",
  "フォルダ": "📁",
  "拡張子": "🏷️",
  "情報通信ネットワーク": "🌐",
  "データ通信": "📡",
  "アナログ回線": "📞",
  "デジタル回線": "⚡",
  "LAN": "🏠",
  "無線 LAN": "📶",
  "有線 LAN": "🔌",
  "WAN": "🌍",
  "光ファイバ": "✨",
  "Wi-Fi": "📶",
  "アクセスポイント": "📡",
  "インターネット": "🌐",
  "WWW": "🕸️",
  "プロバイダ": "🔌",
  "サーバ名": "🏷️",
  "ドメイン名": "🏷️",
  "IP アドレス": "📍",
  "DNS": "📖",
  "Web ページ": "📄",
  "ブラウザ": "🧭",
  "URL": "🔗",
  "Web サーバ": "🖥️",
  "ハイパーリンク": "⚓",
  "HTML": "📄",
  "電子メール": "📧",
  "HTML メール": "🖼️",
  "Web メール": "✉️",
  "メールサーバ": "📬",
  "メールボックス": "📫",
  "プロトコル": "🤝",
  "アップロード": "📤",
  "ダウンロード": "📥",
  "検索エンジン": "🔍",
  "コンテンツフィルタリング": "🛡️",
  "ブラックリスト方式": "🚫",
  "ホワイトリスト方式": "✅",
  "メーリングリスト": "👥",
  "TO": "👤",
  "CC": "👥",
  "BCC": "🕶️",
  "添付ファイル": "📎",
  "圧縮": "🤐",
  "解凍": "📦",
  "サイバー攻撃": "💥",
  "マルウェア": "👾",
  "コンピュータウイルス": "🦠",
  "セキュリティホール": "🕳️",
  "インシデント": "🚨",
  "迷惑メール": "🗑️",
  "スパムメール": "🥫",
  "スパイウェア": "🕵️",
  "トロイの木馬": "🐴",
  "ワーム": "🐛",
  "ランサムウェア": "🔐",
  "アドウェア": "📢",
  "情報セキュリティ": "🛡️",
  "機密性": "🔒",
  "完全性": "💎",
  "可用性": "🔋",
  "バックアップ": "🗃️",
  "ウイルス対策ソフトウェア": "🛡️",
  "パターンファイル": "📜",
  "アップデート": "🔄",
  "セキュリティパッチ": "🧱",
  "認証": "🔑",
  "ログイン": "🚪",
  "ログアウト": "🚶",
  "ワンタイムパスワード": "⏳",
  "アクセス権": "🎟️",
  "暗号化": "🔐",
  "復号": "🔓",
  "暗号文": "📜",
  "統計分析": "📈",
  "量的データ": "🔢",
  "質的データ": "🏷️",
  "尺度水準": "📏",
  "全数調査": "👥",
  "標本調査": "🧑‍🤝‍🧑",
  "母集団": "👨‍👩‍👧‍👦",
  "標本": "🧪",
  "標本誤差": "🎯",
  "外れ値": "☄️",
  "欠損値": "❓",
  "代表値": "🥇",
  "偏差": "📐",
  "分散": "📊",
  "標準偏差": "📈",
  "度数分布表": "📋",
  "ヒストグラム": "📊",
  "箱ひげ図": "📦",
  "散布図": "🌌",
  "相関": "🔄",
  "ABC 分析": "🅰️",
  "パレート図": "📊",
  "時系列分析": "📅",
  "棒グラフ": "📊",
  "円グラフ": "🍕",
  "折れ線グラフ": "📈",
  "レーダーチャート": "🕸️",
  "Ｚグラフ": "📈",
  "ロジカルシンキング": "🧠",
  "ロジックツリー": "🌳",
  "MECE": "🧩",
  "デシジョンテーブル": "📋",
  "ガントチャート": "📅",
  "SWOT 分析": "⚔️",
  "特性要因図": "🐟",
  "PDCA": "🔄",
  "ブレーンストーミング": "⚡",
  "KJ 法": "🗂️",
  "PPM 分析": "🌟",
  "シミュレーション": "🧪",
  "モデル化": "🗿",
  "動的モデル": "🏃",
  "静的モデル": "🧍",
  "確定的モデル": "🎯",
  "確率的モデル": "🎲",
  "モンテカルロ法": "🎰",
  "アルゴリズム": "🧮",
  "プログラム": "💻",
  "プログラム言語": "🗣️",
  "プログラミング": "⌨️",
  "順次構造": "⬇️",
  "選択構造": "🔀",
  "繰り返し構造": "🔄",
  "トレース": "👣",
  "流れ図": "🗺️"
};

/**
 * 用語に関連したUnicode絵文字を取得する
 */
export function getTermEmoji(id: string): string {
  if (id === 'legend_master') return '👑';

  // TERM_CARDS から該当するカードを検索してその name で絵文字を割り振る
  const found = TERM_CARDS.find(c => c.id === id);
  const name = found ? found.name : id.replace('term_', '');

  return importedGetTermEmoji(name);
}

/**
 * 毎日異なるが、同じ日であれば一意に固定されるデイリーシード値を返す (YYYYMMDD形式)
 */
export function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * シード付きの疑似乱数生成器 (Mulberry32)
 */
function sfc32(a: number) {
  return function() {
    a >>>= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * シード値を元に、配列を決定論的にシャッフルする
 */
export function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
  const copy = [...array];
  const rand = sfc32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

