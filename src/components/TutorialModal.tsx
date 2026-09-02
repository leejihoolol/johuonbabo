import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  BookOpen, ChevronLeft, ChevronRight, Check, Sparkles, 
  HelpCircle, Lightbulb, Zap, ArrowRight, ShieldCheck, Flame
} from 'lucide-react';
import { TUTORIAL_STEPS } from '../data/tutorialData';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteTutorial: () => void;
  onNavigateTab?: (tab: string) => void;
  isFromSettings?: boolean;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onCompleteTutorial,
  onNavigateTab,
  isFromSettings = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    sound.playClick();
    if (isLastStep) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#a855f7'],
      });
      sound.playSuccess(true);
      onCompleteTutorial();
      onClose();
    } else {
      setCurrentStepIndex((prev) => Math.min(TUTORIAL_STEPS.length - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    sound.playClick();
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelectStep = (index: number) => {
    sound.playClick();
    setCurrentStepIndex(index);
  };

  const handleJumpToTab = (tab: string) => {
    sound.playClick();
    if (onNavigateTab) {
      onNavigateTab(tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 font-pixel animate-fadeIn">
      <div className="bg-neutral-900 border-4 border-amber-500/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-neutral-950 via-purple-950/60 to-neutral-950 p-4 sm:p-5 border-b-2 border-amber-600/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300">
              <BookOpen size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${currentStep.badgeColor}`}>
                  {currentStep.badge}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
                </span>
                {isFromSettings && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                    설정 가이드
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-300 drop-shadow">
                {isFromSettings ? '픽셀 검 강화하기 완벽 가이드' : '신규 대장장이 입문 튜토리얼'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onCompleteTutorial();
              onClose();
            }}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer text-sm"
            title="튜토리얼 닫기"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {TUTORIAL_STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => handleSelectStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 font-bold shadow'
                    : isDone
                    ? 'bg-neutral-900 text-emerald-400 border border-emerald-800/60'
                    : 'bg-neutral-900/60 text-neutral-500 border border-neutral-800 hover:text-neutral-300'
                }`}
              >
                {isDone ? (
                  <Check size={12} className="text-emerald-400 font-bold" />
                ) : (
                  <span className="text-[10px]">{idx + 1}</span>
                )}
                <span className="hidden sm:inline">{step.category}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-4">
          {/* Step Main Banner */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 shrink-0 text-amber-400">
              <PixelIcon name={currentStep.icon as PixelIconName} size={36} />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-300" />
                <span>{currentStep.category}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100 leading-snug">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-sans">
                {currentStep.subtitle}
              </p>
            </div>
          </div>

          {/* Core Bullet Points */}
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80 flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 font-mono">
              <Zap size={14} className="text-amber-400" />
              <span>핵심 시스템 안내</span>
            </h4>

            <div className="flex flex-col gap-2">
              {currentStep.content.map((text, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-200 font-sans leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tips Box */}
          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono">
                <Lightbulb size={14} className="text-amber-400" />
                <span>대장장이의 특급 비결 (PRO TIP)</span>
              </div>
              {currentStep.tips.map((tip, i) => (
                <p key={i} className="text-xs text-neutral-300 font-sans leading-relaxed pl-1">
                  💡 {tip}
                </p>
              ))}
            </div>
          )}

          {/* Direct Jump to Feature Button */}
          {currentStep.highlightTab && onNavigateTab && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => handleJumpToTab(currentStep.highlightTab!)}
                className="text-xs text-amber-400 hover:text-amber-300 font-mono flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>해당 메뉴로 바로 이동해보기</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              isFirstStep
                ? 'opacity-40 border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
            }`}
          >
            <ChevronLeft size={16} />
            <span>이전</span>
          </button>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <button
                onClick={() => {
                  sound.playClick();
                  onCompleteTutorial();
                  onClose();
                }}
                className="px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer font-sans"
              >
                건너뛰기
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer transition-all active:scale-95"
            >
              <span>{isLastStep ? '가이드 완료 & 게임 시작!' : '다음 단계'}</span>
              {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
