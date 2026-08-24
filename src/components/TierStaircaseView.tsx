import React, { useState } from 'react';
import { Layers, Crown, Sparkles, AlertCircle, ArrowUpRight, Lock, CheckCircle2, Zap } from 'lucide-react';
import { PlayerStats, Sword } from '../types';
import { TIER_STAIRCASES_DATA, WORLDS_DATA } from '../data/worlds';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface TierStaircaseViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onUnlockTier: (tier: number, costGold: number) => void;
  onTriggerTheEnd: () => void;
}

export const TierStaircaseView: React.FC<TierStaircaseViewProps> = ({
  stats,
  currentSword,
  onUnlockTier,
  onTriggerTheEnd,
}) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [showTheEndConfirm, setShowTheEndConfirm] = useState(false);

  const unlockedTiers = stats.unlockedTiers || [];
  const allTiersUnlocked = [1, 2, 3, 4, 5].every((t) => unlockedTiers.includes(t));

  // Format large numbers
  const formatBigNum = (num: number) => {
    if (num >= 1e27) return (num / 1e27).toFixed(1) + ' Oc (양)';
    if (num >= 1e24) return (num / 1e24).toFixed(1) + ' Sp (자)';
    if (num >= 1e21) return (num / 1e21).toFixed(1) + ' Sx (해)';
    if (num >= 1e18) return (num / 1e18).toFixed(1) + ' Qi (경)';
    if (num >= 1e15) return (num / 1e15).toFixed(1) + ' Qa (조)';
    if (num >= 1e12) return (num / 1e12).toFixed(1) + ' T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + ' B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + ' M';
    return num.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-5 font-pixel">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-neutral-900 border-4 border-amber-500/80 rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-neutral-950 rounded-lg border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse">
            <Crown className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-amber-300 flex items-center gap-2">
              <span>티어 계단 (The Tier Staircase)</span>
            </h2>
            <p className="text-xs text-neutral-300 font-mono mt-0.5">
              초환생 10회 도달자만을 위한 궁극의 5단계 계단. 각 계단을 밟을 때마다 세계의 법칙이 뒤흔들립니다.
            </p>
          </div>
        </div>

        <div className="bg-neutral-950/90 px-4 py-2 rounded-lg border border-amber-500/60 text-xs font-mono text-amber-300 flex items-center gap-2">
          <span>계단 정복 진행도:</span>
          <span className="font-bold text-sm text-yellow-400">{unlockedTiers.length} / 5 계단</span>
        </div>
      </div>

      {/* The 5 Tiers Staircase Map (Ascending visual structure) */}
      <div className="flex flex-col gap-4">
        {/* Tier Staircase Visual list in reverse order (5 at top, 1 at bottom) */}
        {TIER_STAIRCASES_DATA.slice().reverse().map((tierData) => {
          const isUnlocked = unlockedTiers.includes(tierData.tier);
          const reqWorldProgress = stats.worldProgress?.[tierData.requiredWorldId] || { currentSwordLevel: 0 };
          const reqWorldInfo = WORLDS_DATA.find((w) => w.id === tierData.requiredWorldId) || WORLDS_DATA[0];
          
          const hasGold = stats.gold >= tierData.requiredGold;
          const hasSwordLevel = reqWorldProgress.currentSwordLevel >= tierData.requiredSwordLevel;
          const canUnlock = !isUnlocked && hasGold && hasSwordLevel;

          return (
            <div
              key={tierData.tier}
              className={`relative bg-neutral-900 border-3 rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                isUnlocked
                  ? 'border-amber-400 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-950 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Left Side: Tier Info & Requirements */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg border-2 font-mono font-bold text-sm sm:text-base shrink-0 ${
                  isUnlocked
                    ? 'bg-amber-500 text-neutral-950 border-amber-300'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                }`}>
                  T{tierData.tier}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-neutral-100">{tierData.name}</h3>
                    {isUnlocked && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono font-bold">
                        정복 완료
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-amber-300 font-mono font-bold">{tierData.rewardDescription}</p>

                  {/* Requirements Row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono mt-1">
                    <div className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
                      hasGold || isUnlocked ? 'bg-neutral-950 border-emerald-800 text-emerald-300' : 'bg-neutral-950 border-rose-800 text-rose-300'
                    }`}>
                      <PixelIcon name="gold" size={12} />
                      <span>필요 골드: {formatBigNum(tierData.requiredGold)} G</span>
                    </div>

                    <div className={`px-2.5 py-1 rounded border flex items-center gap-1 ${
                      hasSwordLevel || isUnlocked ? 'bg-neutral-950 border-emerald-800 text-emerald-300' : 'bg-neutral-950 border-rose-800 text-rose-300'
                    }`}>
                      <PixelIcon name="sword" size={12} />
                      <span>[World {tierData.requiredWorldId} {reqWorldInfo.name}] +{tierData.requiredSwordLevel}강 (현재: +{reqWorldProgress.currentSwordLevel}강)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Action Button */}
              <div className="shrink-0 flex items-center">
                {isUnlocked ? (
                  <div className="px-5 py-2.5 bg-neutral-950 border-2 border-emerald-600/80 rounded-lg text-emerald-300 font-bold text-xs sm:text-sm font-mono flex items-center gap-1.5 shadow">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>계단 각성 완료</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!canUnlock) {
                        sound.playFail();
                        return;
                      }
                      sound.playSuccess(true);
                      onUnlockTier(tierData.tier, tierData.requiredGold);
                    }}
                    disabled={!canUnlock}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-neutral-950 font-bold text-xs sm:text-sm rounded-lg border-2 border-amber-300 shadow cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>티어 {tierData.tier} 계단 개방하기</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* SUMMIT: THE END BUTTON (Visible at the very top of staircase when all 5 tiers are unlocked!) */}
        <div className={`mt-4 p-6 rounded-lg border-4 text-center flex flex-col items-center justify-center gap-3 transition-all ${
          allTiersUnlocked
            ? 'bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse'
            : 'bg-neutral-950 border-neutral-800 opacity-60'
        }`}>
          <div className="p-3 bg-neutral-950 rounded-full border-2 border-amber-400">
            <Crown className="w-8 h-8 text-amber-300" />
          </div>

          <h3 className="text-lg sm:text-2xl font-bold text-amber-300 tracking-wider">
            계단의 정상: THE END (세계의 끝)
          </h3>

          <p className="text-xs sm:text-sm text-neutral-300 font-mono max-w-xl leading-relaxed">
            모든 5단계 계단을 정복한 자만이 누를 수 있는 금단의 버튼입니다.<br />
            이 버튼을 누르면 세상이 최초의 상태로 회귀하지만, <strong>[창조주의 치트 권능]</strong>을 획득하게 됩니다.
          </p>

          {allTiersUnlocked ? (
            <button
              onClick={() => {
                sound.playSuccess(true);
                setShowTheEndConfirm(true);
              }}
              className="mt-2 px-8 py-3.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-90 text-neutral-950 font-bold text-sm sm:text-base rounded-lg border-2 border-white shadow-2xl cursor-pointer font-mono transform hover:scale-105 transition-all"
            >
              👑 THE END — 진 엔딩 실행하기
            </button>
          ) : (
            <div className="mt-2 text-xs text-neutral-500 font-mono flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>5개 티어 계단을 모두 개방해야 활성화됩니다 ({unlockedTiers.length}/5 완료)</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for THE END */}
      {showTheEndConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-4 border-amber-400 rounded-lg p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 font-pixel">
            <h3 className="text-base font-bold text-amber-300 border-b-2 border-neutral-800 pb-2 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>진 엔딩 (THE END) 진입 확인</span>
            </h3>

            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 flex flex-col gap-2 text-xs text-neutral-300 font-mono leading-relaxed">
              <p className="text-amber-300 font-bold">⚠️ 경고: 시공간의 법칙이 재구성됩니다!</p>
              <p>• 이 세계의 모든 모험 기록이 처음 상태로 완전 초기화됩니다.</p>
              <p>• 그 대가로 영구적인 <strong>[창조주 치트 메뉴 (God Mode Console)]</strong>가 해금됩니다.</p>
              <p className="mt-1 text-white">정말 진 엔딩을 맞이하고 세계의 끝으로 나아가시겠습니까?</p>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setShowTheEndConfirm(false);
                  onTriggerTheEnd();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs rounded border border-amber-300 cursor-pointer shadow-lg"
              >
                예, 세계의 끝으로 갑니다
              </button>
              <button
                onClick={() => setShowTheEndConfirm(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded border border-neutral-600 cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
