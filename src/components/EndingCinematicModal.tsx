import React, { useEffect, useState } from 'react';
import { sound } from '../utils/sound';

interface EndingCinematicModalProps {
  onComplete: () => void;
}

export const EndingCinematicModal: React.FC<EndingCinematicModalProps> = ({ onComplete }) => {
  // Step 0: Initial White Glow Start
  // Step 1: "축하해 아이여."
  // Step 2: "결국에 여기 도달했군"
  // Step 3: "아마도 여기가 마지막일거야"
  // Step 4: "아 이제 갈시간이 됬네" (Screen turns whiter)
  // Step 5: "잘가게...." (Screen turns pure blinding white)
  // Step 6: Transition back to fresh reset & open Cheat Menu!
  const [step, setStep] = useState(0);
  const [whiteOpacity, setWhiteOpacity] = useState(0.2);

  useEffect(() => {
    // Sound effect or ambient chime
    sound.playSuccess(true);

    const timeouts: NodeJS.Timeout[] = [];

    // Step 1
    timeouts.push(
      setTimeout(() => {
        setStep(1);
        setWhiteOpacity(0.4);
      }, 2500)
    );

    // Step 2
    timeouts.push(
      setTimeout(() => {
        setStep(2);
        setWhiteOpacity(0.55);
      }, 5500)
    );

    // Step 3
    timeouts.push(
      setTimeout(() => {
        setStep(3);
        setWhiteOpacity(0.7);
      }, 8500)
    );

    // Step 4
    timeouts.push(
      setTimeout(() => {
        setStep(4);
        setWhiteOpacity(0.85);
      }, 11500)
    );

    // Step 5
    timeouts.push(
      setTimeout(() => {
        setStep(5);
        setWhiteOpacity(1.0);
      }, 14500)
    );

    // Step 6 (Complete & Reset)
    timeouts.push(
      setTimeout(() => {
        onComplete();
      }, 18000)
    );

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [onComplete]);

  const messages = [
    '',
    '축하해 아이여.',
    '결국에 여기 도달했군',
    '아마도 여기가 마지막일거야',
    '아 이제 갈시간이 됬네',
    '잘가게....',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-pixel select-none overflow-hidden">
      {/* Background with expanding white fade */}
      <div
        style={{
          opacity: whiteOpacity,
          transition: 'opacity 3000ms ease-in-out, background-color 3000ms ease-in-out',
        }}
        className="absolute inset-0 bg-white"
      />

      {/* Dark overlay backdrop behind dialogue during early steps */}
      <div
        style={{
          opacity: Math.max(0, 1 - whiteOpacity * 0.9),
          transition: 'opacity 2500ms ease-in-out',
        }}
        className="absolute inset-0 bg-black/60 pointer-events-none"
      />

      {/* Virtual Dialogue Chat Box */}
      {step >= 1 && (
        <div className="relative z-10 max-w-xl w-full mx-4 flex flex-col items-center gap-6">
          {/* Chat Window */}
          <div className="w-full bg-neutral-950/90 border-4 border-amber-400/80 rounded-xl p-6 sm:p-8 shadow-[0_0_50px_rgba(255,255,255,0.8)] backdrop-blur-md flex flex-col gap-4">
            {/* Header / Speaker Name */}
            <div className="flex items-center justify-between border-b border-amber-500/40 pb-2">
              <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-wider">
                [창조주의 목소리 — The Creator]
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">시공간의 끝자락</span>
            </div>

            {/* Narrative text stream */}
            <div className="flex flex-col gap-3 min-h-[140px] justify-center text-center">
              {messages.slice(1, step + 1).map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-base sm:text-xl font-bold tracking-wide transition-all duration-700 ${
                    idx === step - 1
                      ? 'text-white scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse'
                      : 'text-neutral-400 text-sm sm:text-base'
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>

            {/* Glowing Footer Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-neutral-800 text-[11px] text-amber-400/80 font-mono">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
