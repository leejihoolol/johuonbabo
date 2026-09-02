import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, CheckCircle2, ArrowRight, Award, 
  ChevronUp, ChevronDown, X, Gift, Zap
} from 'lucide-react';
import { INTERACTIVE_TUTORIAL_MISSIONS, InteractiveMission } from '../data/interactiveTutorialData';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface InteractiveTutorialBannerProps {
  currentStepIndex: number;
  onNavigateTab: (tab: string) => void;
  onSkipTutorial: () => void;
  onOpenFullGuide: () => void;
  activeTab: string;
}

export const InteractiveTutorialBanner: React.FC<InteractiveTutorialBannerProps> = ({
  currentStepIndex,
  onNavigateTab,
  onSkipTutorial,
  onOpenFullGuide,
  activeTab,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (currentStepIndex >= INTERACTIVE_TUTORIAL_MISSIONS.length) return null;

  const mission: InteractiveMission = INTERACTIVE_TUTORIAL_MISSIONS[currentStepIndex];
  const totalMissions = INTERACTIVE_TUTORIAL_MISSIONS.length;
  const isCorrectTab = activeTab === mission.targetTab;

  return (
    <aside aria-label="입문 튜토리얼 퀘스트" className="w-full bg-gradient-to-r from-neutral-950 via-amber-950/60 to-neutral-950 border-b-2 border-amber-500/80 px-3 py-2 text-xs font-pixel shadow-lg z-30 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-mono font-bold text-[10px] flex items-center gap-1 shrink-0">
              <Sparkles size={11} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>실전 튜토리얼 #{mission.stepNumber}/{totalMissions}</span>
            </div>

            <span className="font-bold text-amber-300 text-xs sm:text-sm truncate">
              {mission.title}
            </span>

            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/60 font-mono">
              <Gift size={11} />
              <span>보상: {mission.rewardText}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onOpenFullGuide}
              className="text-[10px] px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-600/60 rounded font-mono cursor-pointer transition-colors"
            >
              📖 전체 가이드
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 cursor-pointer"
              title={isMinimized ? '펼치기' : '접기'}
            >
              {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onSkipTutorial();
              }}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 px-1.5 py-0.5 rounded hover:bg-neutral-900 cursor-pointer font-sans"
              title="튜토리얼 건너뛰기"
            >
              건너뛰기
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {!isMinimized && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-amber-500/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded bg-neutral-900 border border-amber-500/40 text-amber-400 shrink-0">
                <PixelIcon name={mission.icon as PixelIconName} size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-200 font-sans font-medium">
                  👉 <strong>미션:</strong> {mission.instruction}
                </span>
                <span className="text-[11px] text-amber-300/80 font-mono">
                  {mission.detailGuide}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {!isCorrectTab ? (
                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigateTab(mission.targetTab);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all animate-bounce"
                >
                  <span>해당 탭으로 이동 ({mission.category})</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <div className="px-3 py-1 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow animate-pulse">
                  <Zap size={13} className="text-yellow-400" />
                  <span>현재 화면에서 직접 미션을 실행하세요!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
