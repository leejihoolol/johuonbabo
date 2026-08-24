import React from 'react';
import { Achievement, PlayerStats } from '../types';
import { INITIAL_ACHIEVEMENTS } from '../data/research';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface AchievementsViewProps {
  stats: PlayerStats;
  onClaimAchievement: (ach: Achievement) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  stats,
  onClaimAchievement,
}) => {
  const getProgress = (ach: Achievement) => {
    let current = 0;
    if (ach.id === 'ach_1') current = stats.totalEnhanceSuccess;
    else if (ach.id === 'ach_5') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_10') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_15') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_20') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_25') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_30') current = stats.maxSwordLevelReached;
    else if (ach.id === 'ach_fail_10') current = stats.totalEnhanceFails;
    else if (ach.id === 'ach_fail_100') current = stats.totalEnhanceFails;
    else if (ach.id === 'ach_destroy_5') current = stats.totalSwordsDestroyed;
    else if (ach.id === 'ach_stage_1') current = stats.highestStageCleared >= 1 ? 1 : 0;
    else if (ach.id === 'ach_stage_5') current = stats.highestStageCleared >= 5 ? 5 : stats.highestStageCleared;
    else if (ach.id === 'ach_stage_10') current = stats.highestStageCleared >= 10 ? 10 : stats.highestStageCleared;
    else if (ach.id === 'ach_gold_10k') current = stats.gold;
    else if (ach.id === 'ach_gold_1m') current = stats.gold;
    else if (ach.id === 'ach_gold_100m') current = stats.gold;
    else if (ach.id === 'ach_codex_10') current = (stats.unlockedCodex || []).length;
    else if (ach.id === 'ach_codex_25') current = (stats.unlockedCodex || []).length;
    return current;
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Header Banner */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-950 rounded border border-neutral-700">
            <PixelIcon name="trophy" size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              도전 과제 및 업적 (Achievements)
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              각종 도전 과제를 완료하고 풍성한 다이아몬드와 강화석 보상을 수령하세요.
            </p>
          </div>
        </div>

        <div className="bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800 text-xs font-mono text-neutral-300">
          완료 업적: <span className="text-amber-400 font-bold">{stats.completedAchievements.length}</span> / {INITIAL_ACHIEVEMENTS.length}
        </div>
      </div>

      {/* Achievements List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INITIAL_ACHIEVEMENTS.map((ach) => {
          const isClaimed = stats.completedAchievements.includes(ach.id);
          const currentVal = getProgress(ach);
          const isCompleted = currentVal >= ach.target;
          const percent = Math.min(100, Math.floor((currentVal / ach.target) * 100));

          return (
            <div
              key={ach.id}
              className={`p-3.5 rounded-lg border-2 flex flex-col justify-between gap-2 shadow transition-all ${
                isClaimed
                  ? 'bg-neutral-950/60 border-neutral-800 opacity-60'
                  : isCompleted
                  ? 'bg-amber-950/40 border-amber-500 shadow-md animate-pulse'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-700 text-amber-400">
                    <PixelIcon name="trophy" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-neutral-100">{ach.title}</h3>
                    <p className="text-xs text-neutral-400 font-sans mt-0.5">{ach.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-300">
                  <PixelIcon name="diamond" size={14} />
                  <span>+{ach.rewardDiamonds}</span>
                </div>
              </div>

              {/* Progress Bar & Claim Button */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                    <span>진행도: {percent}%</span>
                    <span>{currentVal.toLocaleString()} / {ach.target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-300"
                    />
                  </div>
                </div>

                <button
                  disabled={isClaimed || !isCompleted}
                  onClick={() => {
                    sound.playSuccess();
                    onClaimAchievement(ach);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                    isClaimed
                      ? 'bg-neutral-800 text-neutral-500 cursor-default'
                      : isCompleted
                      ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 border border-amber-300 shadow font-bold'
                      : 'bg-neutral-950 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  {isClaimed ? '수령 완료' : isCompleted ? '보상 받기!' : '진행중'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
