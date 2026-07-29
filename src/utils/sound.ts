// Sound Effects Utility using Web Audio API

let soundEnabled = false;
let audioCtx: AudioContext | null = null;

// ストレージから初期状態を復元（デフォルトはOFF）
try {
  const saved = localStorage.getItem('it-rogue-se-enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  } else {
    soundEnabled = false;
  }
} catch {
  soundEnabled = false;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem('it-rogue-se-enabled', String(enabled));
  } catch {
    // ignore
  }
}

export function toggleSound(): boolean {
  setSoundEnabled(!soundEnabled);
  if (soundEnabled) {
    // ONにした際にお試しで短い確認音を鳴らす
    playSE('click');
  }
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SEType =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'attack'
  | 'playerDamage'
  | 'victory'
  | 'defeat'
  | 'cardGet'
  | 'rareGet'
  | 'levelUp'
  | 'tick'
  | 'timesUp';

export function playSE(type: SEType): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (type) {
      case 'click': {
        // ピッ（短音）
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'correct': {
        // ポンポン！（高音の2連音：ピンポン）
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        playTone(523.25, now, 0.12); // C5
        playTone(659.25, now + 0.1, 0.25); // E5
        break;
      }

      case 'wrong': {
        // ブブー（低音の2連音）
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        playTone(180, now, 0.15);
        playTone(140, now + 0.15, 0.25);
        break;
      }

      case 'attack': {
        // 斬撃SE（シャキーン！風切り音＋高音金属音）
        // 1. ノイズによる刃物の切り裂き音（シュッ）
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.Q.value = 3;
        noiseFilter.frequency.setValueAtTime(4500, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(800, now + 0.12);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        // 2. 金属の擦れ・キーンという高音（シャキーン）
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        oscGain.gain.setValueAtTime(0.25, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'playerDamage': {
        // 打撃SE（ドカッ！重低音インパクト＋衝撃波ノイズ）
        // 1. 重厚なボディーインパクト（ドスッ）
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);

        // 2. 鈍い破壊・殴打ノイズ（バシッ/ドカッ）
        const bufferSize = ctx.sampleRate * 0.18;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1500, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.18);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        break;
      }

      case 'cardGet': {
        // カード獲得（ピロリーン：アルペジオ）
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const startTime = now + idx * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });
        break;
      }

      case 'rareGet': {
        // レアカード獲得（和音ファンファーレ）
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const startTime = now + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.22, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
        break;
      }

      case 'victory': {
        // 勝利（ファンファーレ）
        const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
        // 締めの高音 C6
        const highOsc = ctx.createOscillator();
        const highGain = ctx.createGain();
        highOsc.type = 'sine';
        highOsc.frequency.setValueAtTime(1046.50, now + 0.2);
        highGain.gain.setValueAtTime(0.25, now + 0.2);
        highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        highOsc.connect(highGain);
        highGain.connect(ctx.destination);
        highOsc.start(now + 0.2);
        highOsc.stop(now + 0.8);
        break;
      }

      case 'defeat': {
        // 敗北（下降音）
        const freqs = [350, 280, 220, 160];
        freqs.forEach((freq, idx) => {
          const startTime = now + idx * 0.12;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.18, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
        break;
      }

      case 'levelUp': {
        // レベルアップ（音階上昇）
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, idx) => {
          const startTime = now + idx * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;
      }

      case 'tick': {
        // カウントダウンピッ
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }

      case 'timesUp': {
        // タイムアップピー！
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch {
    // サウンド再生エラー時は無視
  }
}
