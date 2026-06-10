import React from 'react';
import {
  Database, Brain, Cloud, Smartphone, MessageSquare, MousePointerClick,
  Sparkles, Layers, Server, Network, Radio, MapPin, CreditCard, ShoppingCart,
  Truck, UserCheck, AlertTriangle, Fingerprint, Gavel, Copyright, CreativeCommons,
  Cpu, HardDrive, Camera, Wifi, Link, Binary, RefreshCw, Clock, Settings,
  Download, Trash2, BookOpen, PenTool, FileText, Archive, Globe, Upload,
  SearchCode, Shield, Box, Activity, Target, BarChart, PieChart, Zap,
  LineChart, Lightbulb, Monitor, Terminal, Code
} from 'lucide-react';

export const getTermIcon = (term: string, size: number = 32) => {
  const t = term.toLowerCase();
  let IconComponent = Code;

  if (t.includes('データ') || t.includes('標本') || t.includes('量的') || t.includes('質的')) IconComponent = Database;
  else if (t.includes('ai') || t.includes('人工知能') || t.includes('脳')) IconComponent = Brain;
  else if (t.includes('クラウド')) IconComponent = Cloud;
  else if (t.includes('iot') || t.includes('デバイス') || t.includes('スマート')) IconComponent = Smartphone;
  else if (t.includes('sns') || t.includes('メール') || t.includes('メーリング')) IconComponent = MessageSquare;
  else if (t.includes('インタフェース') || t.includes('マウス') || t.includes('クリック')) IconComponent = MousePointerClick;
  else if (t.includes('デザイン') || t.includes('ユニバーサル')) IconComponent = Sparkles;
  else if (t.includes('仮想') || t.includes('拡張') || t.includes('複合') || t.includes('vr') || t.includes('ar') || t.includes('mr')) IconComponent = Layers;
  else if (t.includes('サーバ')) IconComponent = Server;
  else if (t.includes('通信') || t.includes('ict') || t.includes('ネットワーク') || t.includes('lan') || t.includes('wan')) IconComponent = Network;
  else if (t.includes('ic') || t.includes('rfid') || t.includes('非接触')) IconComponent = Radio;
  else if (t.includes('gps') || t.includes('住所') || t.includes('ドメイン')) IconComponent = MapPin;
  else if (t.includes('銀行') || t.includes('決済') || t.includes('商取引') || t.includes('ec')) IconComponent = CreditCard;
  else if (t.includes('ショッピング')) IconComponent = ShoppingCart;
  else if (t.includes('発注') || t.includes('eos')) IconComponent = Truck;
  else if (t.includes('モラル') || t.includes('肖像') || t.includes('プライバシー')) IconComponent = UserCheck;
  else if (t.includes('詐欺') || t.includes('有害') || t.includes('攻撃') || t.includes('マルウェア') || t.includes('ウイルス')) IconComponent = AlertTriangle;
  else if (t.includes('id') || t.includes('パスワード') || t.includes('認証')) IconComponent = Fingerprint;
  else if (t.includes('法') || t.includes('権利') || t.includes('知的財産')) IconComponent = Gavel;
  else if (t.includes('著作権')) IconComponent = Copyright;
  else if (t.includes('クリエイティブ')) IconComponent = CreativeCommons;
  else if (t.includes('ハードウェア') || t.includes('装置') || t.includes('cpu')) IconComponent = Cpu;
  else if (t.includes('記憶') || t.includes('メモリ') || t.includes('hdd') || t.includes('ssd')) IconComponent = HardDrive;
  else if (t.includes('解像度') || t.includes('カメラ')) IconComponent = Camera;
  else if (t.includes('bluetooth') || t.includes('無線') || t.includes('wifi') || t.includes('wi-fi')) IconComponent = Wifi;
  else if (t.includes('アクセスポイント')) IconComponent = Radio;
  else if (t.includes('hdmi') || t.includes('usb') || t.includes('ケーブル')) IconComponent = Link;
  else if (t.includes('デジタル') || t.includes('アナログ') || t.includes('ビット') || t.includes('バイト') || t.includes('2進数') || t.includes('バイナリ')) IconComponent = Binary;
  else if (t.includes('変換') || t.includes('圧縮') || t.includes('解凍')) IconComponent = RefreshCw;
  else if (t.includes('ms') || t.includes('μs') || t.includes('ns') || t.includes('ps') || t.includes('fs') || t.includes('時間') || t.includes('時計')) IconComponent = Clock;
  else if (t.includes('ソフトウェア') || t.includes('os') || t.includes('アプリ')) IconComponent = Settings;
  else if (t.includes('インストール')) IconComponent = Download;
  else if (t.includes('アンインストール')) IconComponent = Trash2;
  else if (t.includes('オープンソース') || t.includes('フリー') || t.includes('シェア')) IconComponent = BookOpen;
  else if (t.includes('バグ') || t.includes('パッチ')) IconComponent = PenTool;
  else if (t.includes('ファイル') || t.includes('テキスト')) IconComponent = FileText;
  else if (t.includes('フォルダ')) IconComponent = Archive;
  else if (t.includes('インターネット') || t.includes('プロバイダ') || t.includes('web') || t.includes('ブラウザ') || t.includes('url') || t.includes('html')) IconComponent = Globe;
  else if (t.includes('アップロード')) IconComponent = Upload;
  else if (t.includes('ダウンロード')) IconComponent = Download;
  else if (t.includes('検索')) IconComponent = SearchCode;
  else if (t.includes('セキュリティ') || t.includes('暗号') || t.includes('盾')) IconComponent = Shield;
  else if (t.includes('バックアップ')) IconComponent = Box;
  else if (t.includes('統計') || t.includes('分散') || t.includes('偏差') || t.includes('相関')) IconComponent = Activity;
  else if (t.includes('平均') || t.includes('中央') || t.includes('最頻') || t.includes('代表')) IconComponent = Target;
  else if (t.includes('ヒストグラム') || t.includes('棒グラフ')) IconComponent = BarChart;
  else if (t.includes('円グラフ') || t.includes('割合')) IconComponent = PieChart;
  else if (t.includes('散布図') || t.includes('点')) IconComponent = Zap;
  else if (t.includes('折れ線') || t.includes('チャート') || t.includes('分析')) IconComponent = LineChart;
  else if (t.includes('ロジカル') || t.includes('思考') || t.includes('mece') || t.includes('swot') || t.includes('pdca')) IconComponent = Lightbulb;
  else if (t.includes('ガント') || t.includes('予定') || t.includes('進捗')) IconComponent = Clock;
  else if (t.includes('ブレーン') || t.includes('アイデア') || t.includes('kj')) IconComponent = Sparkles;
  else if (t.includes('シミュレーション')) IconComponent = Monitor;
  else if (t.includes('アルゴリズム') || t.includes('プログラム') || t.includes('流れ図')) IconComponent = Terminal;

  return <IconComponent size={size} />;
};

export const getTermEmoji = (term: string): string => {
  const t = term.trim();

  // Unified dictionary of all unique terms to completely eliminate duplicates
  const termEmojiMap: Record<string, string> = {
    // Enterprise & ICT
    "データ": "🗂️",
    "情報": "ℹ️",
    "情報処理": "⚙️",
    "情報通信技術（ICT）": "🛰️",
    "高度情報通信社会": "🏙️",
    "情報システム": "🏢",
    "サーバ": "🎛️",
    "データベース": "🗃️",
    "ビッグデータ": "🌪️",
    "クラウドコンピューティング": "☁️",
    "機械学習": "🦾",
    "人工知能（AI）": "🤖",
    "データマイニング": "⛏️",
    "バーコード": "⏸️",
    "非接触型 IC": "💳",
    "GPS": "📍",
    "インターネットバンキング": "🏦",
    "オンラインショッピング": "🛒",
    "電子発注システム（EOS）": "📦",
    "電子商取引（EC）": "🛍️",

    // VR, Interfaces & Elements
    "仮想現実（VR）": "🥽",
    "拡張現実（AR）": "🕶️",
    "複合現実（MR）": "🔮",
    "IoT": "⌚",
    "SNS": "🗣️",
    "メディアの特性": "📢",
    "ユーザインタフェース": "🖱️",
    "ユニバーサルデザイン": "♿",
    "ユーザビリティ": "👌",
    "アクセシビリティ": "🪜",
    "ピクトグラム": "🚹",
    "可読性": "📖",
    "視認性": "👀",
    "判読性": "🧐",
    "フォント": "🔤",
    "ポイント": "📌",
    "色相": "🌈",
    "明度": "☀️",
    "彩度": "🎨",
    "色彩": "🖌️",
    "色相環": "🎡",
    "補色": "☯️",
    "ドット": "🔵",
    "画素": "⬜",
    "dpi": "🖨️",
    "ppi": "🧿",
    "光の三原色": "🚥",
    "色の三原色": "🖍️",

    // Security, Ethics & Law
    "情報モラル": "🕊️",
    "フィッシング詐欺": "🎣",
    "ワンクリック詐欺": "💸",
    "有害サイト": "🔞",
    "ユーザ ID": "🆔",
    "パスワード": "🔑",
    "なりすまし": "👺",
    "不正アクセス禁止法": "🚧",
    "プライバシー": "🙈",
    "肖像権": "📸",
    "個人情報保護法": "📜",
    "個人識別符号": "🧬",
    "オプトイン": "➕",
    "オプトアウト": "➖",
    "知的財産権": "💎",
    "著作権": "©️",
    "著作権法": "⚖️",
    "クリエイティブ・コモンズ": "♻️",

    // Hardware
    "ハードウェア": "🧰",
    "五大装置": "🖐️",
    "入力装置": "⌨️",
    "制御装置": "🎚️",
    "記憶装置": "🔋",
    "演算装置": "🧮",
    "出力装置": "📺",
    "中央処理装置（CPU）": "🧠",
    "主記憶装置": "💾",
    "補助記憶装置": "💽",
    "HDD": "🗄️",
    "SSD": "🚀",
    "光学ドライブ": "📀",
    "USB メモリ": "🔦",
    "SD メモリカード": "🔖",
    "解像度": "🖼️",
    "デジタルカメラ": "📷",
    "スマートデバイス": "📱",
    "インタフェース": "🪢",
    "RFID": "🏷️",
    "Bluetooth": "🎧",
    "HDMI": "📽️",
    "USB": "🔱",
    "集積回路（IC）": " waffles", // Placeholder
    "RAM": "📟",
    "ROM": "🔒",
    "ビデオボード": "🎮",
    "VRAM": "🎞️",
    "フラッシュメモリ": "⚡",

    // Data representation & digital conversion
    "デジタル": "🔢",
    "アナログ": "🕰️",
    "ビット": "🟡",
    "バイト": "8️⃣",
    "2進数": "2️⃣",
    "基数変換": "🔄",
    "ms": "🕒",
    "μs": "🕑",
    "ns": "🕐",
    "ps": "🕛",
    "fs": "🕚",
    "KB": "📦",
    "MB": "🎒",
    "GB": "🚚",
    "TB": "🏠",
    "PB": "🏰",
    "標本化": "📌",
    "量子化": "🧱",
    "符号化": "🔣",

    // Software & File
    "ソフトウェア": "💿",
    "アイコン": "🎫",
    "オペレーティングシステム（OS）": "👑",
    "アプリケーションソフトウェア": "🛠️",
    "アンインストール": "🗑️",
    "インストール": "📥",
    "オープンソースソフトウェア（OSS）": "👐",
    "フリーウェア": "🎁",
    "シェアウェア": "💵",
    "サイトライセンス": "📃",
    "デバイスドライバ": "🚗",
    "バグ": "🐛",
    "パッチ": "🩹",
    "ファイル": "📄",
    "ファイル名": "📝",
    "テキストファイル": "🔤",
    "バイナリファイル": "📼",
    "フォーマット": "🧹",
    "フォルダ": "📂",
    "拡張子": "🧷",

    // Network & Protocols
    "情報通信ネットワーク": "🌉",
    "データ通信": "📳",
    "アナログ回線": "☎️",
    "デジタル回線": "📶",
    "LAN": "🏘️",
    "無線 LAN": "📡",
    "有線 LAN": "🔌",
    "WAN": "🌎",
    "光ファイバ": "✨",
    "Wi-Fi": "🛜",
    "アクセスポイント": "🗼",
    "インターネット": "🌐",
    "WWW": "🕸️",
    "プロバイダ": "🛎️",
    "サーバ名": "📛",
    "ドメイン名": "🏡",
    "IP アドレス": "📬",
    "DNS": "🪧",
    "Web ページ": "🪟",
    "ブラウザ": "🧭",
    "URL": "🔗",
    "Web サーバ": "🏪",
    "ハイパーリンク": "🦘",
    "HTML": "🧱",
    "電子メール": "✉️",
    "HTML メール": "💌",
    "Web メール": "📧",
    "メールサーバ": "📯",
    "メールボックス": "📭",
    "プロトコル": "📋",
    "アップロード": "🔼",
    "ダウンロード": "🔽",
    "検索エンジン": "🔍",
    "コンテンツフィルタリング": "🥅",
    "ブラックリスト方式": "⚫",
    "ホワイトリスト方式": "⚪",
    "メーリングリスト": "👥",
    "TO": "👉",
    "CC": "📣",
    "BCC": "🕵️",
    "添付ファイル": "📎",
    "圧縮": "🗜️",
    "解凍": "🧊",

    // Cyber attack & threat
    "サイバー攻撃": "💥",
    "マルウェア": "🦠",
    "コンピュータウイルス": "☣️",
    "セキュリティホール": "🕳️",
    "インシデント": "⚠️",
    "迷惑メール": "🚫",
    "スパムメール": "🥫",
    "スパイウェア": "🥷",
    "トロイの木馬": "🐴",
    "ワーム": "🪱",
    "ランサムウェア": "💰",
    "アドウェア": "📢",

    // Cyber security mgt
    "情報セキュリティ": "🛡️",
    "機密性": "🤐",
    "完全性": "💯",
    "可用性": "🟢",
    "バックアップ": "🥞",
    "ウイルス対策ソフトウェア": "🩺",
    "パターンファイル": "🧵",
    "アップデート": "🆙",
    "セキュリティパッチ": "🪡",
    "認証": "🪪",
    "ログイン": "🚪",
    "ログアウト": "🚶",
    "ワンタイムパスワード": "⏰",
    "アクセス権": "🛂",
    "暗号化": "🔐",
    "復号": "🔓",
    "暗号文": "㊙️",

    // Stats Analysis & Math
    "統計分析": "🔎",
    "量的データ": "📐",
    "質的データ": "🍎",
    "尺度水準": "🌡️",
    "全数調査": "🩻",
    "標本調査": "🧪",
    "母集団": "🏟️",
    "標本": "🦋",
    "標本誤差": "🏹",
    "外れ値": "🛸",
    "欠損値": "❓",
    "代表値": "🏆",
    "偏差": "📏",
    "分散": "🌌",
    "標準偏差": "🎚️",
    "度数分布表": "📋",
    "ヒストグラム": "📊",
    "箱ひげ図": "🗳️",
    "散布図": "🎇",
    "相関": "🤝",
    "ABC 分析": "🥇",
    "パレート図": "📉",
    "時系列分析": "⏳",
    "棒グラフ": "📊",
    "円グラフ": "🍕",
    "折れ線グラフ": "📈",
    "複合グラフ": "💹",
    "レーダーチャート": "🌀",
    "Ｚグラフ": "〽️",

    // Business strategy
    "ロジカルシンキング": "🧩",
    "ロジックツリー": "🌳",
    "MECE": "🍱",
    "デシジョンテーブル": "♟️",
    "ガントチャート": "📅",
    "SWOT 分析": "⚔️",
    "特性要因図": "🐟",
    "PDCA": "🔄",
    "ブレーンストーミング": "⛈️",
    "KJ 法": "🎴",
    "PPM 分析": "🌟",

    // Algorithms
    "シミュレーション": "🎲",
    "モデル化": "🏛️",
    "動的モデル": "🏃",
    "静的モデル": "🧍",
    "確定的モデル": "⚓",
    "確率的モデル": "🎰",
    "モンテカルロ法": "🃏",
    "アルゴリズム": "👣",
    "プログラム": "🖥️",
    "プログラム言語": "💬",
    "プログラミング": "💻",
    "順次構造": "⬇️",
    "選択構造": "🔀",
    "繰り返し構造": "🔁",
    "トレース": "🛤️",
    "流れ図": "🗺️"
  };

  termEmojiMap["集積回路（IC）"] = "🧇";
  termEmojiMap["円グラフ"] = "🍕";

  if (termEmojiMap[t]) {
    return termEmojiMap[t];
  }

  const lowerTerm = t.toLowerCase();
  for (const [key, val] of Object.entries(termEmojiMap)) {
    if (key.toLowerCase() === lowerTerm) {
      return val;
    }
  }

  if (lowerTerm.includes('情報通信技術') || lowerTerm.includes('ict')) return '📡';
  if (lowerTerm.includes('ai') || lowerTerm.includes('人工知能')) return '🧠';
  if (lowerTerm.includes('シミュレーション')) return '🎲';
  if (lowerTerm.includes('クラウド')) return '☁️';
  if (lowerTerm.includes('ウイルス') || lowerTerm.includes('マルウェア')) return '🦠';
  if (lowerTerm.includes('詐欺') || lowerTerm.includes('攻撃')) return '👾';
  if (lowerTerm.includes('セキュリティ') || lowerTerm.includes('暗号')) return '🔐';
  if (lowerTerm.includes('認証') || lowerTerm.includes('パスワード')) return '🔑';
  if (lowerTerm.includes('メモリ') || lowerTerm.includes('記憶')) return '💾';
  if (lowerTerm.includes('デバイス') || lowerTerm.includes('スマート')) return '📱';
  if (lowerTerm.includes('ファイル')) return '📄';
  if (lowerTerm.includes('フォルダ')) return '📂';
  if (lowerTerm.includes('回線') || lowerTerm.includes('接続') || lowerTerm.includes('ライン')) return '🔌';
  if (lowerTerm.includes('グラフ') || lowerTerm.includes('チャート') || lowerTerm.includes('分析')) return '📊';
  if (lowerTerm.includes('プログラム') || lowerTerm.includes('コード')) return '💻';

  return '💻';
};
