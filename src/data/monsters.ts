/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// モンスターの定義インターフェース
export interface MonsterTemplate {
  name: string;
  explanation: string;
  minHp: number;
  maxHp: number;
  minDamage: number;
  maxDamage: number;
  questions: number;
  thumbnailPath: string; // サムネイル画像サイズ: 80x85 px想定
  imagePath: string;     // 戦闘画面用画像サイズ: 400x400 px想定
  fallbackUnsplashThumb: string; // ロード失敗時・画像未配置時の極上Unsplashフォールバック
  fallbackUnsplashBattle: string;
}

// エリア（階層）ごとの場所名の候補一覧（ドラクエ風ライトファンタジー調）
export const AREA_LOCATIONS: Record<number, string[]> = {
  0: ['はじまりの丘', '旅立ちの広場'],
  1: ['接続の平原', 'パケットの森'],
  2: ['記憶の遺跡', 'セキュアな城'],
  3: ['論理の塔', 'バックアップの谷'],
  4: ['マスターの祭壇']
};

// 難易度・階層ごとの魔物プール
export const MONSTER_POOLS: Record<number, { easy: MonsterTemplate[]; hard: MonsterTemplate[] }> = {
  // FLOOR 0 (Step 0)
  0: {
    easy: [
      {
        name: 'ITスライム',
        explanation: '青くてプルプルしたIT世界の最も基本的なスライム。時折「hello world」と鳴く。',
        minHp: 40,
        maxHp: 46,
        minDamage: 6,
        maxDamage: 8,
        questions: 6,
        thumbnailPath: './img/monsters/it_slime_thumb.jpg',
        imagePath: './img/monsters/it_slime_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'バグドラキー',
        explanation: '夜な夜なコードをいじるプログラマーの周りを飛びまわるコウモリ。タイポを引き起こす。',
        minHp: 42,
        maxHp: 48,
        minDamage: 7,
        maxDamage: 9,
        questions: 6,
        thumbnailPath: './img/monsters/bug_dracky_thumb.jpg',
        imagePath: './img/monsters/bug_dracky_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'コンパイルキャット',
        explanation: 'ビルドボタンの上を歩いてエラーをはき出させるいたずら者の子猫。',
        minHp: 38,
        maxHp: 44,
        minDamage: 6,
        maxDamage: 7,
        questions: 6,
        thumbnailPath: './img/monsters/compile_cat_thumb.jpg',
        imagePath: './img/monsters/compile_cat_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'
      }
    ],
    hard: [
      {
        name: 'マンププ・ルーター',
        explanation: '怒ると一帯のWi-Fi電波をすべて切断してしまう横暴な魔物。',
        minHp: 75,
        maxHp: 85,
        minDamage: 11,
        maxDamage: 13,
        questions: 8,
        thumbnailPath: './img/monsters/router_thumb.jpg',
        imagePath: './img/monsters/router_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'ハッカーおやじ',
        explanation: '初心者にむずかしいコマンドを教えて困らせる、ヒゲの長い怪しい魔法使い。',
        minHp: 80,
        maxHp: 90,
        minDamage: 12,
        maxDamage: 14,
        questions: 8,
        thumbnailPath: './img/monsters/hacker_man_thumb.jpg',
        imagePath: './img/monsters/hacker_man_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  // FLOOR 1 (Step 1)
  1: {
    easy: [
      {
        name: 'おどるLANケーブル',
        explanation: '机の裏でひとりでにクネクネと絡まり合い、外れなくなるいたずらケーブル。',
        minHp: 65,
        maxHp: 72,
        minDamage: 9,
        maxDamage: 11,
        questions: 8,
        thumbnailPath: './img/monsters/lan_cable_thumb.jpg',
        imagePath: './img/monsters/lan_cable_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'ぬすっとパケット',
        explanation: '通信ネットワークのすき間を走り、お宝データの断片を盗むドロボウ。',
        minHp: 62,
        maxHp: 70,
        minDamage: 10,
        maxDamage: 12,
        questions: 8,
        thumbnailPath: './img/monsters/packet_thumb.jpg',
        imagePath: './img/monsters/packet_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'ノイズきのこ',
        explanation: '胞子のなかに高周波ノイズが混ざっており、近付くとPCの音がギーギー鳴る。',
        minHp: 66,
        maxHp: 74,
        minDamage: 9,
        maxDamage: 11,
        questions: 8,
        thumbnailPath: './img/monsters/noise_shroom_thumb.jpg',
        imagePath: './img/monsters/noise_shroom_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'
      }
    ],
    hard: [
      {
        name: 'キラー・ハードディスク',
        explanation: '高速でプラッタ（鋭い金属円盤）をブンブン回して襲ってくる戦闘マシン。',
        minHp: 110,
        maxHp: 125,
        minDamage: 15,
        maxDamage: 18,
        questions: 10,
        thumbnailPath: './img/monsters/killer_hdd_thumb.jpg',
        imagePath: './img/monsters/killer_hdd_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'はぐれポート',
        explanation: '世界中にひっそりと逃げ隠れる、開放状態のポート。勝手に怪しい電波を通勤させる。',
        minHp: 105,
        maxHp: 120,
        minDamage: 16,
        maxDamage: 19,
        questions: 10,
        thumbnailPath: './img/monsters/stray_port_thumb.jpg',
        imagePath: './img/monsters/stray_port_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  // FLOOR 2 (Step 2)
  2: {
    easy: [
      {
        name: 'おおさそりパケット',
        explanation: '鋭いハサミで暗号化されていないデータをチョキチョキと切り裂き食べる。',
        minHp: 85,
        maxHp: 95,
        minDamage: 11,
        maxDamage: 13,
        questions: 8,
        thumbnailPath: './img/monsters/scorpion_thumb.jpg',
        imagePath: './img/monsters/scorpion_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'クッキー・マッド',
        explanation: 'セッションデータを主食とする泥の魔物。べったりと相手をトラッキングする。',
        minHp: 90,
        maxHp: 100,
        minDamage: 10,
        maxDamage: 12,
        questions: 8,
        thumbnailPath: './img/monsters/cookie_mud_thumb.jpg',
        imagePath: './img/monsters/cookie_mud_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'デス・メモリボム',
        explanation: 'メモリを限界まで詰め込み、最終的にはメモリリークの爆風をおこす恐ろしい爆弾。',
        minHp: 80,
        maxHp: 90,
        minDamage: 12,
        maxDamage: 14,
        questions: 8,
        thumbnailPath: './img/monsters/memory_bomb_thumb.jpg',
        imagePath: './img/monsters/memory_bomb_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80'
      }
    ],
    hard: [
      {
        name: 'ウイルスゴーレム',
        explanation: '怪しげな木馬（トロイ）の形をした強固なゴーレム。セキュリティを力ずくでこじ開ける。',
        minHp: 140,
        maxHp: 160,
        minDamage: 17,
        maxDamage: 20,
        questions: 10,
        thumbnailPath: './img/monsters/virus_golem_thumb.jpg',
        imagePath: './img/monsters/virus_golem_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'セキュリティサタン',
        explanation: 'ガチガチの防御ルールを相手に突きつけて行動不全にする悪魔の看守。',
        minHp: 145,
        maxHp: 165,
        minDamage: 18,
        maxDamage: 21,
        questions: 10,
        thumbnailPath: './img/monsters/security_satan_thumb.jpg',
        imagePath: './img/monsters/security_satan_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  // FLOOR 3 (Step 3)
  3: {
    easy: [
      {
        name: 'ゾンビサーバー',
        explanation: '役目を終えてシャットダウンされたはずのサーバーが、ゴーストプロセスによって蘇った姿。',
        minHp: 110,
        maxHp: 125,
        minDamage: 14,
        maxDamage: 16,
        questions: 10,
        thumbnailPath: './img/monsters/zombie_server_thumb.jpg',
        imagePath: './img/monsters/zombie_server_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'ヒートアップ・ゲート',
        explanation: '排熱が間に合わず、回路が真っ赤に焼けこげた論理ゲートの魔物。常時ループ熱風を吐く。',
        minHp: 115,
        maxHp: 130,
        minDamage: 13,
        maxDamage: 15,
        questions: 10,
        thumbnailPath: './img/monsters/logic_gate_thumb.jpg',
        imagePath: './img/monsters/logic_gate_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80'
      }
    ],
    hard: [
      {
        name: 'ヘルバスター・ランサム',
        explanation: '勇者の頭脳データをガチガチに暗号化ロックし、ゴールド（身代金）を要求する極悪獣。',
        minHp: 185,
        maxHp: 205,
        minDamage: 22,
        maxDamage: 25,
        questions: 10,
        thumbnailPath: './img/monsters/ransomware_beast_thumb.jpg',
        imagePath: './img/monsters/ransomware_beast_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=400&q=80'
      },
      {
        name: 'ギガデス・データベース',
        explanation: '膨大なエラーログが沈殿してできた巨大火山岩の魔物。おそろしい全ロールバック攻撃を行う。',
        minHp: 195,
        maxHp: 215,
        minDamage: 21,
        maxDamage: 24,
        questions: 10,
        thumbnailPath: './img/monsters/gigadeath_db_thumb.jpg',
        imagePath: './img/monsters/gigadeath_db_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  // FLOOR 4 (BOSS - Step 4)
  4: {
    easy: [], // なし
    hard: [
      {
        name: '魔王コード・マスター',
        explanation: '世界中にバグ呪文を放ち、すべてのITシステムを暴走させている絶対魔王。無秩序なスパゲッティコードが体を這う。',
        minHp: 320,
        maxHp: 360,
        minDamage: 30,
        maxDamage: 34,
        questions: 15,
        thumbnailPath: './img/monsters/code_master_thumb.jpg',
        imagePath: './img/monsters/code_master_battle.jpg',
        fallbackUnsplashThumb: 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&w=400&q=80',
        fallbackUnsplashBattle: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80'
      }
    ]
  }
};
