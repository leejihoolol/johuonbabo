import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, CheckCircle2, Share2, RotateCcw, X, Clock, Flame, Award } from 'lucide-react';
import { SpeedrunState, PlayerStats, SpeedrunRecord } from '../types';
import { sound } from '../utils/sound';

interface SpeedrunVictoryModalProps {
  speedrunState: SpeedrunState;
  stats: PlayerStats;
  finalTimeFormatted: string;
  onClose: () => void;
  onRestartNewRun: () => void;
}

export const SpeedrunVictoryModal: React.FC<SpeedrunVictoryModalProps> = ({
  speedrunState,
  stats,
  finalTimeFormatted,
  onClose,
  onRestartNewRun,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sound.playSuccess(true);
  }, []);

  const { goal } = speedrunState;

  const totalAttemptsInRun = Math.max(0, stats.totalEnhanceAttempts - speedrunState.startEnhanceAttempts);
  const currentSwordLevel = stats.currentSwordLevel || 0;
  const currentRebirths = stats.rebirthCount || 0;
  const currentSuperRebirths = stats.superRebirthCount || 0;

  const handleCopy = () => {
    const text = `🏆 [픽셀 검 강화하기] 스피드런 목표 클리어!\n🎯 달성 목표: ${goal.presetName || '커스텀 목표'}\n⏱️ 최종 기록: ${finalTimeFormatted}\n🔨 강화 시도: ${totalAttemptsInRun}회\n🗡️ 최종 검: +${currentSwordLevel}강\n🌀 환생: ${currentRebirths}회 / 초환생: ${currentSuperRebirths}회\n모드: ${speedrunState.startMode === 'clean' ? '공식 클린 런' : '컨티뉴 챌린지'}\n#PixelSwordMaster #Speedrun`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.playCoin();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-3 sm:p-4 font-pixel overflow-y-auto">
      <div className="bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 border-4 border-yellow-400 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(250,204,21,0.5)] p-5 sm:p-7 flex flex-col items-center gap-5 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glowing Background Particle Accents */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/80 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy Icon with Shimmer */}
        <div className="relative">
          <div className="p-4 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 rounded-2xl border-4 border-white shadow-2xl animate-bounce">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-950" />
          </div>
          <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono text-yellow-400 tracking-widest font-bold">
            🎉 SPEEDRUN GOAL ACCOMPLISHED! 🎉
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_10px_rgba(250,204,21,0.6)]">
            스피드런 목표 완벽 달성!
          </h2>
          <span className="text-xs text-neutral-300 font-mono">
            {goal.presetName ? `[${goal.presetName}]` : '커스텀 목표 스피드런'}
          </span>
        </div>

        {/* Big Stopwatch Clear Time Display */}
        <div className="w-full bg-neutral-950/90 border-3 border-yellow-400 rounded-xl p-4 flex flex-col items-center gap-1 shadow-inner">
          <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-yellow-400" /> 최종 클리어 타임 (OFFICIAL TIME)
          </span>
          <span className="text-3xl sm:text-4xl font-mono font-black text-yellow-300 tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
            {finalTimeFormatted}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            ✓ 명예의 전당 (Hall of Fame) 기록 저장 완료!
          </span>
        </div>

        {/* Accomplished Goals List */}
        <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2 text-xs font-mono text-left">
          <span className="text-[11px] font-bold text-neutral-400">달성한 조건:</span>

          {goal.targetSwordLevel !== null && (
            <div className="flex items-center justify-between text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>검 강화 목표 (+{goal.targetSwordLevel}강)</span>
              </span>
              <span className="text-emerald-400 font-bold">+{currentSwordLevel}강 달성</span>
            </div>
          )}

          {goal.targetRebirths !== null && (
            <div className="flex items-center justify-between text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>환생 횟수 ({goal.targetRebirths}회)</span>
              </span>
              <span className="text-emerald-400 font-bold">{currentRebirths}회</span>
            </div>
          )}

          {goal.targetSuperRebirths !== null && (
            <div className="flex items-center justify-between text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>초환생 횟수 ({goal.targetSuperRebirths}회)</span>
              </span>
              <span className="text-emerald-400 font-bold">{currentSuperRebirths}회</span>
            </div>
          )}

          {goal.targetTier !== null && (
            <div className="flex items-center justify-between text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>티어 계단 (Tier {goal.targetTier})</span>
              </span>
              <span className="text-emerald-400 font-bold">정복 완료</span>
            </div>
          )}

          {goal.targetEnding && (
            <div className="flex items-center justify-between text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>THE END 진 엔딩</span>
              </span>
              <span className="text-emerald-400 font-bold">세계의 끝 정복</span>
            </div>
          )}
        </div>

        {/* Run Metrics & Stats */}
        <div className="grid grid-cols-2 gap-2 w-full text-xs font-mono">
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex flex-col items-center">
            <span className="text-[10px] text-neutral-400">강화 시도 횟수</span>
            <span className="text-sm font-bold text-amber-300">{totalAttemptsInRun.toLocaleString()}회</span>
          </div>
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex flex-col items-center">
            <span className="text-[10px] text-neutral-400">시작 모드</span>
            <span className="text-sm font-bold text-cyan-300">
              {speedrunState.startMode === 'clean' ? '공식 클린 런' : '컨티뉴'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full font-mono text-xs mt-1">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold rounded-xl border border-neutral-600 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4 text-yellow-400" />
            <span>{copied ? '✓ 클립보드 복사 완료!' : '기록 복사하기'}</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onRestartNewRun();
            }}
            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold rounded-xl border-2 border-white shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>다시 도전하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
