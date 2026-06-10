/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Award, Trophy, TrendingUp, CheckCircle, HelpCircle, Swords, BookOpen, AlertCircle, FileText, Download, Printer, User, RefreshCw, X, Timer, Flame } from 'lucide-react';
import { GameStats, TermCard } from '../types';
import { TERM_CARDS, quizCategories, CLUSTERS } from '../data/problems';
import { getTermEmoji } from '../utils/gameHelpers';

interface StatsScreenProps {
  gameStats: GameStats;
  bestTime: number | null;
  collectedIds: string[];
  onBack: () => void;
  onResetData?: () => void;
  onUnlockAllAchievements?: () => void;
}

export default function StatsScreen({
  gameStats,
  bestTime,
  collectedIds,
  onBack,
  onResetData,
  onUnlockAllAchievements
}: StatsScreenProps) {
  // 大カテゴリ選択タブ (すべて, 1, 2, 3)
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'id' | 'accuracy_asc' | 'accuracy_desc' | 'attempts_desc'>('id');
  
  // 多段階リセットの状態管理
  const [confirmStep, setConfirmStep] = useState<number>(0); // 0 = 通常, 1 = 第一警告, 2 = 最終宣告
  const [countdown, setCountdown] = useState<number>(0);     // ボタンロック用のカウントダウン

  // 提出用レポート作成モーダルの状態
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  
  // 生徒情報入力フォーム
  const [studentYear, setStudentYear] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const [studentNo, setStudentNo] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 初回起動時に入力情報をローカルストレージから復元
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('it-rogue-student-info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        setStudentYear(parsed.year || '');
        setStudentClass(parsed.class || '');
        setStudentNo(parsed.no || '');
        setStudentName(parsed.name || '');
      }
    } catch (e) {
      console.error('Failed to load student info:', e);
    }
  }, []);

  // 警告用カウントダウンタイマーの処理
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // 時間のフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}分 ${secs}秒`;
  };

  // 統計概要を計算
  const totalAttempts = gameStats.attempts;
  const totalWins = gameStats.wins;
  
  let totalQuizAttempts = 0;
  let totalQuizCorrects = 0;
  
  Object.values(gameStats.termStats).forEach(stat => {
    totalQuizAttempts += stat.attemptCount;
    totalQuizCorrects += stat.correctCount;
  });

  const overallAccuracy = totalQuizAttempts > 0 
    ? Math.round((totalQuizCorrects / totalQuizAttempts) * 100) 
    : 0;

  // 各大カテゴリの情報
  const categoriesList = quizCategories.map(cat => {
    const subIds = cat.subcategories.map(sub => sub.id);
    const catCards = TERM_CARDS.filter(card => subIds.includes(card.clusterId));
    
    let catAttempts = 0;
    let catCorrects = 0;
    
    catCards.forEach(card => {
      const stat = gameStats.termStats[card.id];
      if (stat) {
        catAttempts += stat.attemptCount;
        catCorrects += stat.correctCount;
      }
    });

    const accuracy = catAttempts > 0 ? Math.round((catCorrects / catAttempts) * 100) : 0;

    return {
      id: cat.id,
      title: cat.title,
      subcategories: cat.subcategories,
      totalCards: catCards.length,
      attempts: catAttempts,
      corrects: catCorrects,
      accuracy
    };
  });

  // レア度バッジ
  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'C': return 'text-slate-600 bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-[8px] font-mono font-bold';
      case 'UC': return 'text-cyan-700 bg-cyan-50 border border-cyan-200 px-1 py-0.5 rounded text-[8px] font-mono font-bold';
      case 'SR': return 'text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.5 rounded text-[8px] font-mono font-bold';
      case 'UR': return 'text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded text-[8px] font-mono font-bold';
      case 'LG': return 'text-red-650 bg-red-50 border border-red-200 px-1 py-0.5 rounded text-[8px] font-black animate-pulse';
      default: return 'text-slate-500 bg-slate-100 px-1 py-0.5 rounded text-[8px]';
    }
  };

  // ----------------------------------------------------
  // リセット多段階フロー用
  // ----------------------------------------------------
  const triggerStep1 = () => {
    setConfirmStep(1);
    setCountdown(3); // 3秒間クリック禁止
  };

  const triggerStep2 = () => {
    if (countdown > 0) return;
    setConfirmStep(2);
    setCountdown(3); // 3秒間クリック禁止
  };

  const executeReset = () => {
    if (countdown > 0 || !onResetData) return;
    onResetData();
    setConfirmStep(0);
    setCountdown(0);
  };

  const cancelReset = () => {
    setConfirmStep(0);
    setCountdown(0);
  };

  // ----------------------------------------------------
  // HTML5 Canvas を用いたレポート画像の高精細レンダリング
  // ----------------------------------------------------
  const renderReportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高精度の論理サイズでセット (縦 1100, 横 800)
    const w = 800;
    const h = 1100;
    canvas.width = w;
    canvas.height = h;

    // --- 背景デザイン（王道ファンタジー風の上品な羊皮紙 or 高級ホワイト証書風）
    ctx.fillStyle = '#fcfbfa';
    ctx.fillRect(0, 0, w, h);

    // 高級感ある二重のボーダー
    ctx.strokeStyle = '#1e3a8a'; // 深紺
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, w - 30, h - 30);

    ctx.strokeStyle = '#b45309'; // 金茶
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, w - 44, h - 44);

    // --- 背景に透かし（Watermark grid）を斜めに敷き詰める（すかし入りで出力）
    ctx.save();
    ctx.rotate(-22 * Math.PI / 180);
    ctx.font = 'bold 15px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(30, 58, 138, 0.04)'; // 非常に淡いブルーインク
    for (let x = -600; x < w * 1.5; x += 320) {
      for (let y = -400; y < h * 1.5; y += 120) {
        ctx.fillText('IT ROGUE QUEST OFFICIAL REPORT', x, y);
        ctx.fillText('情報基礎学修成果証明書', x + 50, y + 50);
      }
    }
    ctx.restore();

    // --- ヘッダータイトル
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px "Inter", "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('ＩＴクエスト ＆ 学修成果報告書', w / 2, 75);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px "Inter", "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('情報基礎試験（シラバス準拠）トレーニング成果', w / 2, 102);

    // 二重下線
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 118);
    ctx.lineTo(w - 80, 118);
    ctx.stroke();

    // --- 生徒情報署名エリア (年・組・番・氏名)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px "Hiragino Kaku Gothic ProN", sans-serif';

    const infoY = 160;
    ctx.fillText('年・組・出席番号　及び 氏名', 60, infoY - 15);

    // 個人情報欄の背景枠
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(60, infoY, w - 120, 60);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, infoY, w - 120, 60);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 16px "Hiragino Kaku Gothic ProN", sans-serif';
    
    // 入力がない場合はプレースホルダ下線にする
    const displayYear = studentYear ? `${studentYear} 年` : '＿＿＿ 年';
    const displayClass = studentClass ? `${studentClass} 組` : '＿＿＿ 組';
    const displayNo = studentNo ? `${studentNo} 番` : '＿＿＿ 番';
    const displayName = studentName ? `${studentName}　殿` : '＿＿＿＿＿＿＿＿＿＿＿＿　殿';

    ctx.fillText(`${displayYear}  ${displayClass}  ${displayNo}`, 90, infoY + 36);
    ctx.font = '900 18px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText(`氏名:  ${displayName}`, 390, infoY + 36);

    // --- 総合評価グレード
    // 収集率と正答率からグレードを判定
    const uniqueCollected = Array.from(new Set(collectedIds)).length;
    const totalCardsCount = TERM_CARDS.length;
    const collectionRate = totalCardsCount > 0 ? Math.round((uniqueCollected / totalCardsCount) * 100) : 0;

    let grade = 'C';
    let gradeColor = '#94a3b8';
    let comment = '引き続きIT用語を学び、冒険を進めましょう！';
    
    if (collectionRate >= 90 && overallAccuracy >= 85) {
      grade = 'S';
      gradeColor = '#b45309'; // 黄金
      comment = '極めて優秀な成果です。情報基礎全分野の勇者として認定します！';
    } else if (collectionRate >= 70 || overallAccuracy >= 80) {
      grade = 'A';
      gradeColor = '#1d4ed8'; // 青
      comment = '優秀な知識を保持しています。本試験への合格力が十分に備わっています。';
    } else if (collectionRate >= 40 || overallAccuracy >= 60) {
      grade = 'B';
      gradeColor = '#a21caf'; // 紫
      comment = '基本知識が定着しています。さらにカードを揃えて実力をつけよう！';
    }

    // --- 総合実績ダッシュボードボックス
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(60, 250, w - 120, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('▼ 冒険アドベンチャー 総合成果の記録', 80, 271);

    // 進捗ボックス枠
    const boxY = 295;
    const boxH = 145;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(60, boxY, w - 120, boxH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, boxY, w - 120, boxH);

    // メトリックを2列3行で並べる
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px "Hiragino Kaku Gothic ProN", sans-serif';

    // 1列目
    ctx.fillText('挑戦(冒険)回数:', 100, boxY + 35);
    ctx.fillText('最後の強敵討伐(クリア)数:', 100, boxY + 70);
    ctx.fillText('最速クリア自己記録:', 100, boxY + 110);

    // 2列目
    ctx.fillText('総合解答問題数:', 430, boxY + 35);
    ctx.fillText('総合正答率 (正解割合):', 430, boxY + 70);
    ctx.fillText('図鑑カード収集率:', 430, boxY + 110);

    // 実績の値
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 15px "Inter", sans-serif';
    ctx.fillText(`${totalAttempts} 回`, 280, boxY + 35);
    ctx.fillText(`${totalWins} 回`, 280, boxY + 70);
    ctx.fillText(bestTime ? `${formatTime(bestTime)}` : '未クリア', 280, boxY + 110);

    ctx.fillText(`${totalQuizAttempts} 問`, 590, boxY + 35);
    ctx.fillStyle = overallAccuracy >= 80 ? '#10b981' : '#3b82f6';
    ctx.fillText(`${overallAccuracy} % (${totalQuizCorrects}問正解)`, 590, boxY + 70);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${collectionRate} % (${uniqueCollected} / ${totalCardsCount} 種)`, 590, boxY + 110);


    // --- 大カテゴリ別の詳細マスタリー評価
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(60, 470, w - 120, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('▼ シラバス大分類別 正答状況（分野別のマスタリー）', 80, 491);

    const catStartY = 515;
    categoriesList.forEach((cat, index) => {
      const y = catStartY + (index * 82);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, y, w - 120, 72);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, y, w - 120, 72);

      // カテゴリ見出し
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 13px "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillText(cat.title, 80, y + 26);

      // 解答進捗バー
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(80, y + 42, 350, 10);
      if (cat.attempts > 0) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(80, y + 42, Math.min(350, (cat.corrects / cat.attempts) * 350), 10);
      }

      // 正答率数値
      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px "Inter", "Hiragino Kaku Gothic ProN", sans-serif';
      ctx.fillText(`解答数: ${cat.attempts}問   正解数: ${cat.corrects}問`, w - 240, y + 36);

      ctx.fillStyle = cat.accuracy >= 80 ? '#10b981' : cat.accuracy >= 50 ? '#3b82f6' : '#94a3b8';
      ctx.font = '900 20px "Inter", sans-serif';
      ctx.fillText(cat.attempts > 0 ? `${cat.accuracy}%` : '未挑戦', w - 90, y + 46);
      ctx.textAlign = 'left';
    });


    // --- 教師コメント＆判定ギルドスタンプ
    const guildY = 795;
    ctx.fillStyle = '#fef3c7'; // 淡黄
    ctx.fillRect(60, guildY, w - 260, 100);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, guildY, w - 260, 100);

    ctx.fillStyle = '#b45309';
    ctx.font = '900 12px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('【 ギルド／授業者総合評定＆アドバイス 】', 80, guildY + 28);
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px "Hiragino Kaku Gothic ProN", sans-serif';
    // 複数行テキストの折り返し
    ctx.fillText(comment, 80, guildY + 54);
    ctx.font = '500 10px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('※IT用語は単なる暗記ではなく、概念のつながりを意識すると実務や試験でさらに活きます。', 80, guildY + 78);


    // --- 絢爛たる成績印鑑（Guild / School Stamp）の描画
    const stampX = 660;
    const stampY = 845;
    
    // 赤いスタンプサークルを描く
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate(5 * Math.PI / 180); // リアルにするために少し5度傾ける
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // 朱赤
    ctx.lineWidth = 3;
    
    // ２重の同心円
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 43, 0, Math.PI * 2);
    ctx.stroke();

    // 中央スタンプ文字
    ctx.font = 'bold 10px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('IT王立学院', 0, -26);
    
    ctx.font = '900 18px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('確認済', 0, 3);

    ctx.font = 'bold 9px "Hiragino Kaku Gothic ProN", sans-serif';
    ctx.fillText('学習用証明書', 0, 26);
    ctx.restore();


    // --- フッター認証情報
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 9px "Inter", "Hiragino Kaku Gothic ProN", sans-serif';
    const today = new Date();
    const dateStr = `${today.getFullYear()}年 ${(today.getMonth() + 1).toString().padStart(2, '0')}月 ${today.getDate().toString().padStart(2, '0')}日 証明発行`;
    ctx.fillText(dateStr, 60, h - 65);
    ctx.fillText('情報基礎魔導書クエスト運営 ギルド統括局', 60, h - 50);

    ctx.textAlign = 'right';
    ctx.fillText('IT ROGUE QUEST AP-STUDY SYSTEMS VER.2.0', w - 60, h - 50);
  };

  // 入力フォーム内容が変更されたら Canvas を再描画
  useEffect(() => {
    if (showSubmitModal) {
      // レンダリングまで若干ラグをおく（DOM描画完了のためフラッシュ）
      const t = setTimeout(() => {
        renderReportCanvas();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showSubmitModal, studentYear, studentClass, studentNo, studentName]);

  // ローカルストレージに入力情報を保存する
  const saveStudentInfoLocally = () => {
    try {
      const info = {
        year: studentYear,
        class: studentClass,
        no: studentNo,
        name: studentName
      };
      localStorage.setItem('it-rogue-student-info', JSON.stringify(info));
    } catch (e) {
      console.error(e);
    }
  };

  // PNG画像としてダウンロード
  const downloadReportImage = () => {
    saveStudentInfoLocally();
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ファイル名の生成
    const fileName = `ITQuest_Report_${studentYear || 'X'}年_${studentClass || 'X'}組_${studentNo || 'X'}番_${studentName || '名無し'}.png`;
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ----------------------------------------------------

  return (
    <div className="h-screen bg-gradient-to-b from-sky-300 via-sky-101 to-emerald-100 text-slate-800 p-4 md:p-6 flex flex-col font-sans select-none relative overflow-y-auto border-t-8 border-blue-600">
      
      {/* 優しい王道ファンタジーを感じる陽光 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.6)_0%,transparent_80%)] pointer-events-none"></div>
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* ヘッダー */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between mb-6 z-10 border-b border-blue-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 rounded-xl text-slate-100 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
          id="stats-back-btn"
        >
          <ArrowLeft size={14} />
          <span>[ もどる ]</span>
        </button>
        <h1 className="text-xl md:text-2xl font-black tracking-wider flex items-center gap-2 text-blue-900 drop-shadow-sm font-sans">
          <Trophy className="text-amber-500 animate-bounce" size={24} />
          <span>せんせき & 実績の記録（成績表）</span>
        </h1>
        
        {/* ていしゅつ（提出用レポート作成）ボタン */}
        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 border-2 border-emerald-400 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          id="trigger-report-btn"
        >
          <FileText size={15} className="animate-pulse" />
          <span>ていしゅつ</span>
        </button>
      </div>

      <div className="max-w-6xl w-full mx-auto flex flex-col gap-6 flex-1 z-10">
        
        {/* 上段：実績サマリーダッシュボード (Bento Grid) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* 1. 冒険回数 */}
          <div className="bg-white/95 p-4 rounded-xl border-2 border-indigo-150 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-2 right-2 p-1.5 bg-indigo-50 text-indigo-600 rounded-full">
              <Swords size={18} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-bold">挑戦（冒険）回数</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-900">{totalAttempts}</span>
              <span className="text-xs text-slate-500 font-bold">回</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-semibold">ITクエストへの挑戦回数</p>
          </div>

          {/* 2. 討伐クリア回数 */}
          <div className="bg-white/95 p-4 rounded-xl border-2 border-emerald-150 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-2 right-2 p-1.5 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle size={18} />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-bold">討伐クリア回数</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-700">{totalWins}</span>
              <span className="text-xs text-slate-500 font-bold">回</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-semibold">最後の強敵を撃破した証</p>
          </div>

          {/* 3. 最速クリア記録 */}
          <div className="bg-white/95 p-4 rounded-xl border-2 border-amber-150 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-2 right-2 p-1.5 bg-amber-50 text-amber-500 rounded-full">
              <Trophy size={18} />
            </div>
                      {/* 6. 時の回廊最大連撃 */}
          <div className="bg-white/95 p-4 rounded-xl border-2 border-orange-150 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-2 right-2 p-1.5 bg-orange-50 text-orange-600 rounded-full">
              <Flame size={18} className="animate-pulse text-orange-500" />
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-bold">回廊最大連撃</span>
            <div className="mt-2 flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-orange-950">{gameStats.timeAttackMaxCombo || 0}</span>
              <span className="text-xs text-slate-550 font-bold font-sans">連撃</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-semibold font-sans">ときのかいろうでの最多連続正解数</p>
          </div>

        </div>��ュ機能）。これにより、<strong>今後のゲームプレイ中の通信量をゼロ</strong>に抑え、オフライン地域や通信制限下でも一瞬で高画質にバトルが読み込めます！
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center justify-center bg-white/5 border border-white/10 p-3 rounded-xl min-w-[200px]">
              {precacheStatus === 'idle' && (
                <button
                  onClick={handlePrecacheAll}
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-cyan-950 font-black text-xs px-4 py-2.5 rounded-lg border border-cyan-300 shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Download size={13} className="animate-pulse" />
                  <span>一括保存を開始する</span>
                </button>
              )}

              {precacheStatus === 'loading' && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-cyan-300">
                    <span className="flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" />
                      読み込み中...
                    </span>
                    <span>{precacheProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all duration-150"
                      style={{ width: `${precacheProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {precacheStatus === 'success' && (
                <div className="text-center text-emerald-400 font-bold space-y-1">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <CheckCircle size={16} />
                    <span>ローカル保存が完了！</span>
                  </div>
                  <p className="text-[9px] text-slate-400">すべてのモンスターイラストが端末内に格納されました。今後の通信は発生しません。</p>
                </div>
              )}

              {precacheStatus === 'error' && (
                <div className="w-full text-center space-y-2">
                  <span className="text-xs text-red-400 font-bold block">エラーが発生しました</span>
                  <button
                    onClick={handlePrecacheAll}
                    className="w-full bg-red-650/20 hover:bg-red-650/30 text-red-300 border border-red-500/30 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    再試行する
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 大カテゴリ別 進捗セクション */}
        <div className="bg-white/70 p-4 border border-blue-150 rounded-xl shadow-xs">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
              <h2 className="text-sm font-black text-blue-900 tracking-wider flex items-center gap-1.5 uppercase">
                <BookOpen size={16} className="text-blue-700" />
                <span>大カテゴリ別解答スタッツ</span>
              </h2>
              <p className="text-[10px] text-slate-500 font-bold leading-normal mt-0.5">
                各大カテゴリに紐づくすべての用語の合計解答数と平均正答率です。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {categoriesList.map(cat => (
              <div key={cat.id} className="bg-white/90 p-3 rounded-lg border border-slate-200">
                <h3 className="text-xs font-black text-slate-800 line-clamp-1" title={cat.title}>
                  {cat.title}
                </h3>
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col text-[10px] text-slate-550 font-bold leading-tight">
                    <span>総解答数: {cat.attempts}問</span>
                    <span>正解数: {cat.corrects}問</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-mono block font-black">正答率</span>
                    <span className={`text-base font-black ${cat.accuracy >= 80 ? 'text-emerald-600' : cat.accuracy >= 50 ? 'text-blue-600' : cat.attempts > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {cat.attempts > 0 ? `${cat.accuracy}%` : '未挑戦'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 下段：詳細データグリッド */}
        <div className="bg-white border-2 border-blue-300 rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden min-h-[400px] md:min-h-[550px] max-h-[85vh]">
          
          {/* カテゴリ切り替えタブ */}
          <div className="bg-slate-50 border-b border-blue-200 flex overflow-x-auto select-none shrink-0">
            <button
              onClick={() => {
                setActiveTab('all');
                setActiveSubcategoryId('all');
              }}
              className={`py-3.5 px-5 font-black text-xs tracking-wider border-r border-slate-200 uppercase shrink-0 transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent'
              }`}
            >
              すべて表示
            </button>
            {quizCategories.map(cat => {
              const cleanedTitle = cat.title.replace(/^[⑴⑵⑶]\s*/, '');
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.id);
                    setActiveSubcategoryId('all');
                  }}
                  className={`py-3.5 px-4 font-black text-xs tracking-wider border-r border-slate-200 text-left shrink-0 transition-colors cursor-pointer ${
                    activeTab === cat.id
                      ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent'
                  }`}
                >
                  {cleanedTitle}
                </button>
              );
            })}
          </div>

          {/* フィルター＆ソートコントロールバー */}
          {(() => {
            // Filter candidate cards that fit activeTab and activeSubcategoryId
            const filteredCards = TERM_CARDS.filter(card => {
              // Category match
              if (activeTab !== 'all') {
                const catObj = quizCategories.find(c => c.id === activeTab);
                const subIds = catObj?.subcategories.map(s => s.id) || [];
                if (!subIds.includes(card.clusterId)) return false;
              }
              // Subcategory match
              if (activeSubcategoryId !== 'all') {
                if (card.clusterId !== activeSubcategoryId) return false;
              }
              return true;
            });

            const getAccuracyAndAttempts = (cardId: string) => {
              const stat = gameStats.termStats[cardId] || { correctCount: 0, attemptCount: 0 };
              const accuracy = stat.attemptCount > 0 ? (stat.correctCount / stat.attemptCount) : -1;
              return { accuracy, attemptCount: stat.attemptCount };
            };

            const sortedCards = [...filteredCards].sort((a, b) => {
              const statA = getAccuracyAndAttempts(a.id);
              const statB = getAccuracyAndAttempts(b.id);
              
              if (sortBy === 'accuracy_asc') {
                const accA = statA.attemptCount === 0 ? 0 : statA.accuracy;
                const accB = statB.attemptCount === 0 ? 0 : statB.accuracy;
                if (accA !== accB) return accA - accB;
                return a.id.localeCompare(b.id);
              }
              if (sortBy === 'accuracy_desc') {
                const accA = statA.attemptCount === 0 ? -1 : statA.accuracy;
                const accB = statB.attemptCount === 0 ? -1 : statB.accuracy;
                if (accA !== accB) return accB - accA;
                return a.id.localeCompare(b.id);
              }
              if (sortBy === 'attempts_desc') {
                if (statA.attemptCount !== statB.attemptCount) {
                  return statB.attemptCount - statA.attemptCount;
                }
                return a.id.localeCompare(b.id);
              }
              // Default sorting
              return a.id.localeCompare(b.id);
            });

            return (
              <>
                <div className="bg-blue-50/50 p-3 border-b border-blue-150 flex flex-col md:flex-row gap-3 items-center justify-between text-xs font-bold text-slate-700 select-none shrink-0 shadow-inner">
                  {/* サブカテゴリフィルタ */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-blue-900 uppercase tracking-wider shrink-0 font-extrabold flex items-center gap-1 font-sans">
                      <span>✦</span>
                      <span>小カテゴリ制限:</span>
                    </span>
                    <select
                      value={activeSubcategoryId}
                      onChange={(e) => setActiveSubcategoryId(e.target.value)}
                      className="bg-white border border-slate-350 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-hidden focus:border-blue-500 text-xs flex-1 md:w-56 cursor-pointer"
                    >
                      <option value="all">すべて表示</option>
                      {quizCategories
                        .filter(cat => activeTab === 'all' || cat.id === activeTab)
                        .flatMap(cat => cat.subcategories)
                        .map(sub => (
                          <option key={sub.id} value={sub.id}>
                            [{sub.id}] {sub.title}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {/* 並び替え */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-blue-900 uppercase tracking-wider shrink-0 font-extrabold flex items-center gap-1 font-sans">
                      <span>⚡</span>
                      <span>並び替え:</span>
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-white border border-slate-350 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 outline-hidden focus:border-blue-500 text-xs flex-1 md:w-52 cursor-pointer"
                    >
                      <option value="id">標準（ID順）</option>
                      <option value="accuracy_asc">正答率が低い順（苦手克服）</option>
                      <option value="accuracy_desc">正答率が高い順</option>
                      <option value="attempts_desc">出題数が多い順</option>
                    </select>

                    {/* 該当件数バッジ */}
                    <div className="shrink-0 text-[10.5px] bg-blue-100 text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 font-extrabold">
                      該当: <strong className="text-xs text-blue-850 font-black">{sortedCards.length}</strong> 件
                    </div>
                  </div>
                </div>

                {/* 各カテゴリの詳細リスト */}
                <div className="flex-1 overflow-y-auto p-4 bg-white space-y-3 scrollbar-thin">
                  {sortedCards.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold text-xs">
                      該当するIT用語は登録されていません。
                    </div>
                  ) : (
                    sortedCards.map(card => {
                      const stat = gameStats.termStats[card.id] || { correctCount: 0, attemptCount: 0 };
                      const accuracy = stat.attemptCount > 0 
                        ? Math.round((stat.correctCount / stat.attemptCount) * 100) 
                        : 0;

                      // 組織クラス特定
                      const foundSub = quizCategories.flatMap(c => c.subcategories).find(s => s.id === card.clusterId);
                      const foundCat = quizCategories.find(c => c.subcategories.some(s => s.id === card.clusterId));
                      const catTitle = foundCat ? foundCat.title.replace(/^[⑴⑵⑶]\s*/, '') : '';
                      const subTitle = foundSub ? foundSub.title : '';

                      return (
                        <div
                          key={card.id}
                          className="bg-slate-50 hover:bg-slate-100/75 border border-slate-200/90 rounded-xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:shadow-2xs transition-all"
                        >
                          {/* 用語名 & レア度 & 所属カテゴリ */}
                          <div className="flex items-center gap-2.5 min-w-[200px] shrink-0">
                            <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 select-none shadow-2xs">
                              {getTermEmoji(card.id)}
                            </div>
                            <div>
                              <h4 className="font-black text-xs text-slate-900 leading-tight font-sans">
                                {card.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-sans">
                                <span className={getRarityBadgeColor(card.rarity)}>
                                  {card.rarity}
                                </span>
                                <span className="text-[8px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-bold font-mono">
                                  {card.clusterId}
                                </span>
                                <span className="text-[8.5px] text-blue-900 font-bold truncate max-w-[110px]">
                                  {subTitle}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 用語の説明 */}
                          <div className="flex-1 text-[11px] text-slate-600 font-semibold leading-normal border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 font-sans">
                            <p className="line-clamp-2 md:line-clamp-none">
                              {card.definition}
                            </p>
                          </div>

                          {/* 正解数／出題数、正答率 */}
                          <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 text-[10.5px]">
                            <div className="flex flex-col text-left md:text-right text-slate-500 font-bold leading-tight font-sans">
                              <span>出題: <strong className="text-slate-800">{stat.attemptCount}</strong>回</span>
                              <span>正答: <strong className="text-emerald-600">{stat.correctCount}</strong>回</span>
                            </div>
                            
                            <div className="flex flex-col items-center min-w-[55px] text-center bg-white border border-slate-205 rounded-lg py-1 px-2 shrink-0 shadow-2xs">
                              <span className="text-[7.5px] text-slate-400 block font-bold uppercase font-mono">正答率</span>
                              <span className={`text-xs md:text-sm font-black ${
                                stat.attemptCount === 0
                                  ? 'text-slate-400'
                                  : accuracy >= 80
                                  ? 'text-emerald-600'
                                  : accuracy >= 50
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`}>
                                {stat.attemptCount > 0 ? `${accuracy}%` : '- %'}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* 最下部：データ削除・管理ブロック (オプション) */}
        {onResetData && (
          <div className="flex justify-end items-center gap-3 z-10">
            {confirmStep === 0 && (
              <>
                {onUnlockAllAchievements && (
                  <button
                    onClick={onUnlockAllAchievements}
                    className="text-[10px] text-emerald-600 hover:text-emerald-750 font-bold p-1 bg-white/50 hover:bg-emerald-55 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    【デバッグ：全実績の開放】
                  </button>
                )}
                <button
                  onClick={triggerStep1}
                  className="text-[10px] text-red-600 hover:text-red-750 font-bold p-1 bg-white/50 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  【セーブデータと全実績のリセット】
                </button>
              </>
            )}

            {confirmStep === 1 && (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-amber-50 border-2 border-amber-300 p-3 rounded-xl animate-bounce shadow-md">
                <span className="text-xs text-amber-800 font-bold flex items-center gap-1.5 leading-tight">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 animate-pulse" />
                  <span>[第一警告] これまでの冒険データ、図鑑カード、全ての戦績が完全に削除されます。よろしいですか？</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={countdown > 0}
                    onClick={triggerStep2}
                    className={`px-3 py-1.5 rounded-lg font-black text-xs cursor-pointer text-white shadow-xs transition-all ${
                      countdown > 0
                        ? 'bg-slate-400 cursor-not-allowed text-slate-200'
                        : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                    }`}
                  >
                    {countdown > 0 ? `しばらくお待ちください (${countdown})` : '内容を理解し、次へ進む'}
                  </button>
                  <button
                    onClick={cancelReset}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-lg font-black text-xs cursor-pointer"
                  >
                    やめる
                  </button>
                </div>
              </div>
            )}

            {confirmStep === 2 && (
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-red-50 border-2 border-red-350 p-3 rounded-xl shadow-lg ring-4 ring-red-100">
                <span className="text-xs text-red-700 font-extrabold flex items-center gap-1.5 leading-tight animate-pulse">
                  <AlertCircle size={15} className="text-red-600 shrink-0" />
                  <span>[最終宣告] こうかいしませんね？</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={countdown > 0}
                    onClick={executeReset}
                    className={`px-3 py-1.5 rounded-lg font-black text-xs cursor-pointer text-white shadow-md transition-all ${
                      countdown > 0
                        ? 'bg-slate-400 cursor-not-allowed text-slate-200'
                        : 'bg-red-650 hover:bg-red-700 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {countdown > 0 ? `安全装置ロック解除中... (${countdown})` : '完全にデータを消去する (取り消し不可)'}
                  </button>
                  <button
                    onClick={cancelReset}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-705 rounded-lg font-black text-xs cursor-pointer"
                  >
                    復元可能な状態で残す
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ----------------------------------------------------
          ていしゅつ（提出用成果証明書）作成モーダル
          ---------------------------------------------------- */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl border-2 border-teal-500 shadow-2xl max-w-5xl w-full flex flex-col lg:flex-row overflow-hidden max-h-[92vh]">
            
            {/* 左パネル: 入力フォームと指導案内 (1/3 幅) */}
            <div className="p-6 bg-slate-50 border-r border-slate-200 lg:w-80 flex flex-col justify-between shrink-0 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    <User size={16} className="text-teal-600" />
                    <span>報告者の情報入力</span>
                  </h3>
                  <button
                    onClick={() => {
                      saveStudentInfoLocally();
                      setShowSubmitModal(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 lg:hidden"
                  >
                    <X size={20} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">
                  学校やおうちの王立アカデミー、授業の先生に提出するための正式な「学修成果報告書」画像をすかし入りでエクスポートできます。
                </p>

                {/* 入力フォーム */}
                <div className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-650 mb-1">学年 (Year) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="例) 1"
                        value={studentYear}
                        onChange={(e) => setStudentYear(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-850 focus:outline-hidden focus:border-teal-500"
                      />
                      <span className="absolute right-3 top-2 text-[9px] text-slate-400 font-bold">年</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-650 mb-1">クラス組 (Class) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="例) A / 2"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-850 focus:outline-hidden focus:border-teal-500"
                      />
                      <span className="absolute right-3 top-2 text-[9px] text-slate-400 font-bold">組</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-650 mb-1">出席番号 (No) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="例) 24"
                        value={studentNo}
                        onChange={(e) => setStudentNo(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-850 focus:outline-hidden focus:border-teal-500"
                      />
                      <span className="absolute right-3 top-2 text-[9px] text-slate-400 font-bold">番</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-650 mb-1">氏名 (Full Name) *</label>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="例) 冒険 太郎"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-850 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10px] text-amber-800 leading-normal font-semibold">
                  🔹 <strong>ヒント：</strong>一度入力した氏名や年組は自動保存され、次回起動時も自動で読み込まれます。
                </div>
              </div>

              {/* 左側下部のアクション */}
              <div className="pt-4 border-t border-slate-200 space-y-2 mt-4 font-sans">
                {(!studentYear.trim() || !studentClass.trim() || !studentNo.trim() || !studentName.trim()) && (
                  <div className="bg-red-55 border border-red-200 text-red-700 text-[10px] p-2.5 rounded-lg leading-normal font-black animate-pulse">
                    ⚠️ 【年・組・番・氏名】のすべてを正しく入力してください。すべて入力されるまでダウンロードボタンは解除されません。
                  </div>
                )}
                <button
                  onClick={downloadReportImage}
                  disabled={!studentYear.trim() || !studentClass.trim() || !studentNo.trim() || !studentName.trim()}
                  className={`w-full py-2.5 px-4 font-black rounded-lg text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    (!studentYear.trim() || !studentClass.trim() || !studentNo.trim() || !studentName.trim())
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-200 shadow-none'
                      : 'bg-teal-600 hover:bg-teal-700 border border-teal-500 text-white cursor-pointer shadow-md hover:shadow-lg'
                  }`}
                >
                  <Download size={14} />
                  <span>PNG画像をダウンロード</span>
                </button>
                <p className="text-[8px] text-slate-400 text-center font-bold">
                  右クリックで画像の直接コピーも可能です。
                </p>
              </div>

            </div>

            {/* 右パネル: レポートのプレビュー/Canvas描画エリア (2/3 幅) */}
            <div className="flex-1 bg-slate-750 p-4 md:p-6 flex flex-col justify-between overflow-hidden relative">
              
              {/* PC用クローズボタン */}
              <button
                onClick={() => {
                  saveStudentInfoLocally();
                  setShowSubmitModal(false);
                }}
                className="absolute top-4 right-4 p-2 bg-slate-900/40 text-slate-200 hover:text-white hover:bg-slate-900/60 rounded-full transition-colors cursor-pointer hidden lg:block z-10"
              >
                <X size={18} />
              </button>

              <div className="flex items-center justify-between text-slate-250 mb-3 shrink-0">
                <span className="text-[11px] font-black tracking-widest uppercase text-white/80">◆ 提出レポートプレビュー ◆</span>
                <span className="text-[9px] text-slate-400 font-bold hidden sm:inline">解像度: 800 x 1100 (印刷推奨レイアウト)</span>
              </div>

              {/* スクロール可能なCanvasコンテナ */}
              <div className="flex-1 overflow-auto bg-slate-850 p-3 rounded-2xl flex justify-center items-start shadow-inner border border-slate-700 max-h-[60vh] lg:max-h-[70vh]">
                <div className="min-w-[400px] max-w-[550px] w-full aspect-[8/11] bg-white rounded-lg shadow-xl overflow-hidden scale-95 origin-top">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto block select-text bg-white"
                  />
                </div>
              </div>

              {/* モーダル下部案内 */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">
                  ※ ダウンロードボタンで保存したPNGを、印刷して提出するか、授業フォルダ、Google Classroomなどにアップロードしてください。
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      saveStudentInfoLocally();
                      setShowSubmitModal(false);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-xl font-bold text-xs cursor-pointer text-center"
                  >
                    閉じる
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
