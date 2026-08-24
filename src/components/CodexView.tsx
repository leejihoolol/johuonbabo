import React, { useState, useRef, useEffect } from 'react';
import { Trophy, Lock } from 'lucide-react';
import { PlayerStats, Sword } from '../types';
import { SWORDS_DATA } from '../data/swords';
import { drawPixelSword } from '../utils/pixelSwordRenderer';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface CodexViewProps {
  stats: PlayerStats;
}

export const CodexView: React.FC<CodexViewProps> = ({ stats }) => {
  const [selectedSword, setSelectedSword] = useState<Sword>(SWORDS_DATA[stats.currentSwordLevel] || SWORDS_DATA[0]);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frame, setFrame] = useState(0);

  const unlockedCount = (stats.unlockedCodex || []).length;
  const totalCount = SWORDS_DATA.length;
  const progressPercent = ((unlockedCount / totalCount) * 100).toFixed(0);

  // Canvas animation for selected sword
  useEffect(() => {
    let animId: number;
    const render = () => {
      setFrame((f) => f + 1);
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPixelSword(ctx, selectedSword, canvas.width, canvas.height, 'none', frame, false);
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedSword, frame]);

  const milestones = [
    { count: 5, reward: '영구 공격력 +10%', unlocked: unlockedCount >= 5 },
    { count: 10, reward: '골드 획득량 +20%', unlocked: unlockedCount >= 10 },
    { count: 15, reward: '강화 성공 확률 +1.5%', unlocked: unlockedCount >= 15 },
    { count: 20, reward: '치명타 확률 +5%', unlocked: unlockedCount >= 20 },
    { count: 25, reward: '강화 성공 확률 +3%', unlocked: unlockedCount >= 25 },
    { count: 30, reward: '영구 공격력 +100%', unlocked: unlockedCount >= 30 },
    { count: 35, reward: '우주 정점의 칭호 & 전 스탯 +200%', unlocked: unlockedCount >= 35 },
  ];

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Top Banner & Progress */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-950 rounded border border-neutral-700">
            <PixelIcon name="codex" size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              전설의 도검 도감 (Sword Codex)
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              강화를 통해 도검을 해금하고 도감 수집 보너스 효과를 활성화하세요.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full sm:w-64 flex flex-col gap-1 bg-neutral-950 p-2.5 rounded border border-neutral-800">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neutral-400">수집 진행도:</span>
            <span className="text-amber-400 font-bold">{unlockedCount} / {totalCount} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
            />
          </div>
        </div>
      </div>

      {/* Collection Milestones Bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3 shadow flex flex-wrap items-center gap-2 text-xs">
        <span className="text-amber-400 font-bold flex items-center gap-1.5">
          <PixelIcon name="codex" size={14} /> 수집 달성 보너스:
        </span>
        {milestones.map((m) => (
          <span
            key={m.count}
            className={`px-2 py-1 rounded text-[11px] font-mono border ${
              m.unlocked
                ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                : 'bg-neutral-950 border-neutral-800 text-neutral-500'
            }`}
          >
            {m.count}종: {m.reward} {m.unlocked ? '✓' : '[잠김]'}
          </span>
        ))}
      </div>

      {/* Main Grid & Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: 36 Sword Grid */}
        <div className="lg:col-span-8 bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 shadow">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {SWORDS_DATA.map((sword) => {
              const isUnlocked = (stats.unlockedCodex || []).includes(sword.level);
              const isSelected = selectedSword.level === sword.level;

              return (
                <button
                  key={sword.level}
                  onClick={() => {
                    sound.playClick();
                    setSelectedSword(sword);
                  }}
                  className={`p-2 rounded-lg border-2 flex flex-col items-center justify-between gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-950 border-amber-400 shadow-md scale-105'
                      : isUnlocked
                      ? 'bg-neutral-950/80 border-neutral-700 hover:border-neutral-500'
                      : 'bg-neutral-950/30 border-neutral-900 opacity-40 hover:opacity-60'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{sword.level}
                  </span>

                  <div className="w-10 h-10 flex items-center justify-center">
                    {isUnlocked ? (
                      <PixelIcon name="sword" size={22} />
                    ) : (
                      <Lock className="w-4 h-4 text-neutral-600" />
                    )}
                  </div>

                  <span className="text-[10px] font-mono truncate w-full text-center text-neutral-300">
                    {isUnlocked ? sword.name.split(' ')[0] : '???'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Selected Sword Showcase Preview */}
        <div className="lg:col-span-4 bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 shadow flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold">
              +{selectedSword.level} 강
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {(stats.unlockedCodex || []).includes(selectedSword.level) ? '해금 완료' : '미발견'}
            </span>
          </div>

          {/* Canvas Preview */}
          <div className="w-full h-44 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-center relative overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              width={200}
              height={200}
              className="w-40 h-40"
            />
          </div>

          <div>
            <h3 className="text-base font-bold text-amber-300">{selectedSword.name}</h3>
            <span className="text-xs text-neutral-400 font-mono">희귀도: {selectedSword.rarity}</span>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 text-xs font-sans text-neutral-300 leading-relaxed">
            {selectedSword.description}
          </div>

          {/* Stats breakdown */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">기본 공격력</span>
              <span className="font-bold text-neutral-200">{selectedSword.atk.toLocaleString()}</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">공격 속도</span>
              <span className="font-bold text-neutral-200">{selectedSword.atkSpeed} 회/초</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">치명타 확률 / 피해</span>
              <span className="font-bold text-neutral-200">{selectedSword.critRate}% / {selectedSword.critDmg}%</span>
            </div>

            <div className="bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-500 text-[10px] block">판매 가치</span>
              <span className="font-bold text-amber-400">{selectedSword.sellPrice.toLocaleString()} G</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
