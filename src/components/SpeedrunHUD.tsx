import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, XCircle, Trophy, Flag, Eye, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { SpeedrunState, PlayerStats } from '../types';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface SpeedrunHUDProps {
  speedrunState: SpeedrunState;
  stats: PlayerStats;
  onPause: () => void;
  onResume: () => void;
  onAbort: () => void;
  onOpenRecords: () => void;
  onOpenDetails: () => void;
}

// Format numbers nicely for compact speedrun HUD
const formatNum = (num: number) => {
  if (!num || isNaN(num)) return '0';
  if (num >= 1e18) return (num / 1e18).toFixed(2) + 'Qi';
  if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Qa';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e4) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
};

export const SpeedrunHUD: React.FC<SpeedrunHUDProps> = ({
  speedrunState,
  stats,
  onPause,
  onResume,
  onAbort,
  onOpenRecords,
  onOpenDetails,
}) => {
  const [displayTime, setDisplayTime] = useState('00:00:00.00');
  const [isExpanded, setIsExpanded] = useState(true);
  const animFrameRef = useRef<number | null>(null);

  // Live Stopwatch calculation with requestAnimationFrame
  useEffect(() => {
    if (!speedrunState.isActive) return;

    const updateTimer = () => {
      let currentElapsed = speedrunState.elapsedMs;
      if (!speedrunState.isPaused && !speedrunState.isCompleted) {
        currentElapsed += Date.now() - speedrunState.startedAt;
      }

      const totalMs = currentElapsed;
      const ms = Math.floor((totalMs % 1000) / 10);
      const totalSec = Math.floor(totalMs / 1000);
      const sec = totalSec % 60;
      const totalMin = Math.floor(totalSec / 60);
      const min = totalMin % 60;
      const hrs = Math.floor(totalMin / 60);

      const formatted = `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec
        .toString()
        .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
      setDisplayTime(formatted);

      if (!speedrunState.isPaused && !speedrunState.isCompleted) {
        animFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    updateTimer();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [speedrunState.isActive, speedrunState.isPaused, speedrunState.isCompleted, speedrunState.startedAt, speedrunState.elapsedMs]);

  if (!speedrunState.isActive) return null;

  const { goal } = speedrunState;

  // Evaluate Live Goals
  const currentSwordLevel = stats.currentSwordLevel || 0;
  const currentRebirths = stats.rebirthCount || 0;
  const currentSuperRebirths = stats.superRebirthCount || 0;
  const unlockedTiers = stats.unlockedTiers || [];

  const rebirthGoalMet = goal.targetRebirths !== null ? currentRebirths >= goal.targetRebirths : true;
  const superRebirthGoalMet = goal.targetSuperRebirths !== null ? currentSuperRebirths >= goal.targetSuperRebirths : true;
  const tierGoalMet = goal.targetTier !== null ? unlockedTiers.includes(goal.targetTier) : true;
  const swordLevelGoalMet = goal.targetSwordLevel !== null ? currentSwordLevel >= goal.targetSwordLevel : true;
  const endingGoalMet = goal.targetEnding ? stats.theEndCompleted || false : true;

  return (
    <aside aria-label="스피드런 타이머 및 실시간 재화" className="w-full bg-neutral-950 border-b-4 border-amber-500 shadow-[0_4px_30px_rgba(245,158,11,0.35)] px-2 sm:px-4 py-2 font-pixel sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Main Row: Mode Badge, Live Stopwatch, Live Resources, Action Controls */}
        <div className="w-full flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Left: Speedrun Badge & Mode */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center justify-center p-1.5 bg-amber-950 rounded-lg border-2 border-amber-400">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              {speedrunState.isPaused && (
                <div className="absolute inset-0 bg-red-950/90 rounded-lg flex items-center justify-center text-[10px] text-rose-400 font-bold">
                  PAUSE
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide flex items-center gap-1">
                  ⚡ SPEEDRUN
                  {goal.presetName && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono">
                      {goal.presetName}
                    </span>
                  )}
                </span>
                {speedrunState.isCompleted && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-2 py-0.5 rounded font-bold animate-pulse">
                    🏆 CLEAR!
                  </span>
                )}
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {speedrunState.startMode === 'clean' ? '공식 클린 런' : '컨티뉴 챌린지'}
              </span>
            </div>
          </div>

          {/* Center Left: High-Precision Glowing Stopwatch */}
          <div className="flex items-center gap-2 bg-neutral-900 px-3 sm:px-4 py-1 rounded-lg border-2 border-amber-400/80 shadow-inner shrink-0">
            <span
              className={`font-mono font-black tracking-widest text-lg sm:text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.7)] ${
                speedrunState.isCompleted
                  ? 'text-emerald-400'
                  : speedrunState.isPaused
                  ? 'text-amber-500 animate-pulse'
                  : 'text-yellow-300'
              }`}
            >
              {displayTime}
            </span>
          </div>

          {/* Center Right: Real-time Resources Live Bar (재화 현황) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 text-xs font-mono scrollbar-none">
            {/* Gold */}
            <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-amber-500/60 shadow-sm shrink-0">
              <PixelIcon name="gold" size={15} />
              <span className="font-bold text-amber-300">{formatNum(stats.gold)}</span>
            </div>

            {/* Diamonds */}
            <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-cyan-500/60 shadow-sm shrink-0">
              <PixelIcon name="diamond" size={15} />
              <span className="font-bold text-cyan-300">{formatNum(stats.diamonds)}</span>
            </div>

            {/* Enhancement Stones */}
            <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-purple-500/60 shadow-sm shrink-0">
              <PixelIcon name="stone" size={15} />
              <span className="font-bold text-purple-300">{formatNum(stats.enhancementStones)}</span>
            </div>

            {/* Protection Scrolls */}
            <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-emerald-500/60 shadow-sm shrink-0" title="파괴 방지 보호 주문서">
              <PixelIcon name="scroll" size={15} />
              <span className="font-bold text-emerald-300">{stats.ancientScrolls}</span>
            </div>

            {/* Lucky Potions */}
            <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-rose-500/60 shadow-sm shrink-0" title="강화 성공률 증가 행운의 물약">
              <PixelIcon name="potion" size={15} />
              <span className="font-bold text-rose-300">{stats.luckyPotions}</span>
            </div>

            {/* Spirit Dust */}
            {(stats.spiritDust || 0) > 0 && (
              <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-pink-500/60 shadow-sm shrink-0" title="검령 소울 가루">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-bold text-pink-300">{formatNum(stats.spiritDust || 0)}</span>
              </div>
            )}

            {/* Rebirth Points */}
            {(stats.rebirthPoints || 0) > 0 && (
              <div className="flex items-center gap-1 bg-neutral-900/90 px-2 py-1 rounded border border-indigo-500/60 shadow-sm shrink-0" title="환생 포인트">
                <span className="text-indigo-400">🌀</span>
                <span className="font-bold text-indigo-300">{formatNum(stats.rebirthPoints || 0)}</span>
              </div>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 font-mono shrink-0">
            {/* Pause / Resume */}
            {!speedrunState.isCompleted && (
              <button
                onClick={() => {
                  sound.playClick();
                  if (speedrunState.isPaused) {
                    onResume();
                  } else {
                    onPause();
                  }
                }}
                title={speedrunState.isPaused ? '스피드런 재개' : '스피드런 일시정지'}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-bold cursor-pointer transition-transform active:scale-95 ${
                  speedrunState.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-neutral-950 border-emerald-300'
                    : 'bg-amber-600 hover:bg-amber-500 text-neutral-950 border-amber-300'
                }`}
              >
                {speedrunState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{speedrunState.isPaused ? '재개' : '정지'}</span>
              </button>
            )}

            {/* View Records */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenRecords();
              }}
              title="스피드런 기록실"
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-600 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">기록실</span>
            </button>

            {/* Abort / Give Up */}
            <button
              onClick={() => {
                sound.playClick();
                if (window.confirm('현재 진행 중인 스피드런을 중단하시겠습니까?')) {
                  onAbort();
                }
              }}
              title="스피드런 포기 및 종료"
              className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">포기</span>
            </button>

            {/* Toggle Expand */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 cursor-pointer"
              title={isExpanded ? '목표 접기' : '목표 펼치기'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Goals Tracking Chips */}
        {isExpanded && (
          <div className="w-full pt-1.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-neutral-400 mr-1 flex items-center gap-1 text-[10px]">
                <Flag className="w-3 h-3 text-amber-400" /> 클리어 목표:
              </span>

              {/* Sword Level Goal */}
              {goal.targetSwordLevel !== null && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    swordLevelGoalMet
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {swordLevelGoalMet ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>🗡️</span>}
                  <span>검 강화: +{currentSwordLevel} / +{goal.targetSwordLevel}강</span>
                </div>
              )}

              {/* Rebirth Goal */}
              {goal.targetRebirths !== null && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    rebirthGoalMet
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {rebirthGoalMet ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>🌀</span>}
                  <span>환생: {currentRebirths} / {goal.targetRebirths}회</span>
                </div>
              )}

              {/* Super Rebirth Goal */}
              {goal.targetSuperRebirths !== null && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    superRebirthGoalMet
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {superRebirthGoalMet ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>👑</span>}
                  <span>초환생: {currentSuperRebirths} / {goal.targetSuperRebirths}회</span>
                </div>
              )}

              {/* Tier Staircase Goal */}
              {goal.targetTier !== null && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    tierGoalMet
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {tierGoalMet ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>🪜</span>}
                  <span>티어 계단: T{goal.targetTier} 도달 {tierGoalMet ? '(완료)' : '(미도달)'}</span>
                </div>
              )}

              {/* True Ending Goal */}
              {goal.targetEnding && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    endingGoalMet
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  {endingGoalMet ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span>🌟</span>}
                  <span>THE END 진 엔딩 {endingGoalMet ? '(완료)' : '(미완료)'}</span>
                </div>
              )}
            </div>

            {/* Quick Live Stats: Attempts */}
            <div className="text-[10px] text-neutral-400 flex items-center gap-2">
              <span>🔨 시도: {(stats.totalEnhanceAttempts - speedrunState.startEnhanceAttempts).toLocaleString()}회</span>
              <span>🗡️ 현재 검: +{currentSwordLevel}강</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

