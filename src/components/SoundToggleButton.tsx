import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, toggleSound } from '../utils/sound';

export const SoundToggleButton: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md border select-none ${
        enabled
          ? 'bg-amber-500/90 text-slate-950 border-amber-300 hover:bg-amber-400 active:scale-95'
          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700/80 hover:text-slate-200 active:scale-95'
      }`}
      title={enabled ? 'SE (効果音): ON (クリックでOFF)' : 'SE (効果音): OFF (クリックでON)'}
      aria-label="SE Toggle"
    >
      {enabled ? (
        <>
          <Volume2 size={15} className="animate-pulse text-slate-950" />
          <span>SE: ON</span>
        </>
      ) : (
        <>
          <VolumeX size={15} />
          <span>SE: OFF</span>
        </>
      )}
    </button>
  );
};
