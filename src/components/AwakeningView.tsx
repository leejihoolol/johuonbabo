import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Shield, Zap, CheckCircle2, Lock, ArrowRight,
  Flame, Crown, Star, Layers, HelpCircle, AlertCircle, ChevronRight, Gem
} from 'lucide-react';
import { PlayerStats, Sword } from '../types';
import { AWAKENING_STAGES, getAwakeningMaxLevel, getAwakeningTitle } from '../data/awakeningData';
import { SWORDS_DATA } from '../data/swords';
import { drawPixelSword } from '../utils/pixelSwordRenderer';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface AwakeningViewProps {
  stats: PlayerStats;
  onAwaken: (stage: number) => boolean;
  onNavigateToAnvil: () => void;
}

export const AwakeningView: React.FC<AwakeningViewProps> = ({
  stats,
  onAwaken,
  onNavigateToAnvil,
}) => {
  const currentAwkLevel = stats.swordAwakeningLevel || 0;
  const currentMaxLevel = getAwakeningMaxLevel(currentAwkLevel);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(Math.min(2, currentAwkLevel));
  const [isRitualActive, setIsRitualActive] = useState(false);
  const [ritualStage, setRitualStage] = useState<number | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frame, setFrame] = useState(0);

  const selectedStage = AWAKENING_STAGES[selectedStageIndex];

  // Pick sample representative sword for preview
  const previewSwordLevel = selectedStage.stage === 1 ? 40 : selectedStage.stage === 2 ? 50 : 67;
  const previewSword: Sword = SWORDS_DATA[Math.min(SWORDS_DATA.length - 1, previewSwordLevel)] || SWORDS_DATA[0];

  // Canvas animation for selected stage preview
  useEffect(() => {
    let animId: number;
    const render = () => {
      setFrame((f) => f + 1);
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPixelSword(
            ctx,
            previewSword,
            canvas.width,
            canvas.height,
            'none',
            frame,
            false,
            selectedStage.stage
          );
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [previewSword, selectedStage.stage, frame]);

  // Check material requirements
  const checkRequirements = (stageObj: typeof selectedStage) => {
    const levelMet = stats.currentSwordLevel >= stageObj.requiredPreviousLevel;
    const shardsMet = (stats.swordShards || 0) >= stageObj.requiredShards;
    const stonesMet = (stats.enhancementStones || 0) >= stageObj.requiredStones;
    const dustMet = (stats.spiritDust || 0) >= stageObj.requiredDust;
    const rpMet = (stats.rebirthPoints || 0) >= stageObj.requiredRP;
    const goldMet = (stats.gold || 0) >= stageObj.requiredGold;
    const diaMet = (stats.diamonds || 0) >= stageObj.requiredDiamonds;
    const scrollsMet = (stats.ancientScrolls || 0) >= stageObj.requiredScrolls;
    const prevStageMet = currentAwkLevel >= stageObj.stage - 1;

    const allMet = levelMet && shardsMet && stonesMet && dustMet && rpMet && goldMet && diaMet && scrollsMet && prevStageMet;

    return {
      levelMet,
      shardsMet,
      stonesMet,
      dustMet,
      rpMet,
      goldMet,
      diaMet,
      scrollsMet,
      prevStageMet,
      allMet,
    };
  };

  const handlePerformRitual = (stageNum: number) => {
    if (isRitualActive) return;
    const stageObj = AWAKENING_STAGES.find((s) => s.stage === stageNum);
    if (!stageObj) return;

    const { allMet } = checkRequirements(stageObj);
    if (!allMet) return;

    setIsRitualActive(true);
    setRitualStage(stageNum);
    sound.playHammerHit();

    setTimeout(() => {
      const ok = onAwaken(stageNum);
      if (ok) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: stageNum === 1 ? ['#a855f7', '#d946ef', '#3b0764'] : stageNum === 2 ? ['#fbbf24', '#f59e0b', '#ffffff'] : ['#38bdf8', '#a855f7', '#f43f5e', '#ffd700'],
        });
        sound.playSuccess(true);
      }
      setIsRitualActive(false);
      setRitualStage(null);
    }, 1200);
  };

  // Format large numbers
  const formatNum = (num: number) => {
    if (num >= 1e18) return (num / 1e18).toFixed(2) + 'Qi';
    if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Qa';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e4) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-5 font-pixel">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-neutral-900 via-purple-950/40 to-neutral-900 border-4 border-purple-800/80 rounded-xl p-4 sm:p-6 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <PixelIcon name="sword" size={180} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-purple-900/80 border border-purple-500 text-purple-200 text-xs font-mono font-bold flex items-center gap-1">
                <Sparkles size={13} className="text-purple-400 animate-spin" />
                신검 승천 시스템 (Godblade Transcendence)
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500 text-amber-300 text-xs font-mono font-bold">
                최대 한계: +{currentMaxLevel}강 돌파 가능
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-300 to-sky-300">
              초월 각성: 신검의 극점 (Transcendence Awakening)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-sans mt-1 max-w-2xl">
              검의 잠재력을 한계까지 끌어올려 최대 강화 수치를 <strong className="text-amber-400">+35강 → +45강 → +56강 → 최종 +67강</strong>까지 
              확장하고, 각 단계마다 고유한 신검 외형과 파괴적인 스탯 배수를 각성하세요.
            </p>
          </div>

          {/* Current Status Badge Card */}
          <div className="bg-neutral-950/90 border-2 border-purple-600/60 rounded-lg p-3.5 flex flex-col gap-1.5 min-w-[240px]">
            <div className="text-[11px] text-neutral-400 font-mono flex items-center justify-between">
              <span>현재 각성 단계:</span>
              <span className="text-purple-300 font-bold">{getAwakeningTitle(currentAwkLevel)}</span>
            </div>
            <div className="text-sm font-bold text-amber-400 flex items-center justify-between">
              <span>검 강화 최대치:</span>
              <span className="text-base text-amber-300 font-mono">+{currentMaxLevel}강</span>
            </div>
            <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700 mt-1">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-sky-400 transition-all duration-500"
                style={{ width: `${(currentAwkLevel / 3) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-0.5">
              <span>0각 (+35강)</span>
              <span>1각 (+45강)</span>
              <span>2각 (+56강)</span>
              <span>3각 (+67강)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AWAKENING_STAGES.map((stageObj, idx) => {
          const isCompleted = currentAwkLevel >= stageObj.stage;
          const isSelected = selectedStageIndex === idx;
          const { allMet } = checkRequirements(stageObj);
          const isReady = !isCompleted && allMet;

          return (
            <button
              key={stageObj.stage}
              onClick={() => {
                setSelectedStageIndex(idx);
                sound.playClick();
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex flex-col gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 border-purple-500 shadow-lg shadow-purple-950/50 ring-2 ring-purple-500/30'
                  : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  stageObj.stage === 1 
                    ? 'bg-purple-950 text-purple-300 border-purple-700' 
                    : stageObj.stage === 2 
                    ? 'bg-amber-950 text-amber-300 border-amber-700' 
                    : 'bg-sky-950 text-sky-300 border-sky-700'
                }`}>
                  제 {stageObj.stage} 각성
                </span>

                {isCompleted ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> 각성 완료
                  </span>
                ) : isReady ? (
                  <span className="text-xs text-amber-300 font-bold animate-pulse flex items-center gap-1">
                    <Sparkles size={14} /> 각성 가능!
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                    <Lock size={12} /> 잠김
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm sm:text-base text-neutral-100">{stageObj.name}</h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5">최대 강화: +{stageObj.maxLevel}강 확장</p>
              </div>

              <div className="text-[11px] text-neutral-400 font-sans line-clamp-2">
                {stageObj.subTitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Selected Stage Ritual & Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5 Cols: Visual Preview & Ritual Action */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-neutral-900 border-4 border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-xl min-h-[320px]">
            {/* Ambient Background Glow */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none blur-2xl"
              style={{
                background: selectedStage.stage === 1 ? 'radial-gradient(circle, #a855f7 0%, transparent 70%)' : selectedStage.stage === 2 ? 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' : 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
              }}
            />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-950/80 border border-neutral-700 text-[11px] font-mono text-neutral-300 z-10">
              <Sparkles size={12} className="text-amber-400" />
              <span>신검 외형 프리뷰: +{previewSwordLevel}강 예시</span>
            </div>

            <canvas
              ref={previewCanvasRef}
              width={260}
              height={260}
              className="relative z-10 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            />

            <div className="mt-2 text-center relative z-10">
              <h4 className="font-bold text-sm sm:text-base text-neutral-100">{selectedStage.auraEffectName}</h4>
              <p className="text-xs text-purple-300 font-sans mt-0.5">
                {selectedStage.stage === 1 && '심연 흑자색 흑요석 광휘 칼날 & 암흑 오라 파티클'}
                {selectedStage.stage === 2 && '천상 황금 에테르 날개 & 십자 광채 젬스톤 가드'}
                {selectedStage.stage === 3 && '무지갯빛 프리즘 크리스탈 & 회전하는 차원 링 궤도'}
              </p>
            </div>
          </div>

          {/* Awakening Action Button */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
            {currentAwkLevel >= selectedStage.stage ? (
              <div className="p-3 bg-emerald-950/50 border border-emerald-600 rounded-lg text-center flex flex-col items-center justify-center gap-1">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <span className="font-bold text-emerald-300 text-sm">이미 각성을 완수했습니다!</span>
                <span className="text-xs text-neutral-300 font-sans">최대 +{selectedStage.maxLevel}강까지 자유롭게 강화할 수 있습니다.</span>
                <button
                  onClick={onNavigateToAnvil}
                  className="mt-2 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-pixel flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                >
                  <PixelIcon name="anvil" size={16} /> 모루에서 +{selectedStage.maxLevel}강 도전하기
                </button>
              </div>
            ) : (
              (() => {
                const reqs = checkRequirements(selectedStage);
                return (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handlePerformRitual(selectedStage.stage)}
                      disabled={!reqs.allMet || isRitualActive}
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base font-pixel flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        reqs.allMet && !isRitualActive
                          ? 'bg-gradient-to-r from-purple-600 via-amber-500 to-sky-500 hover:from-purple-500 hover:to-sky-400 text-neutral-950 shadow-purple-900/40 hover:scale-[1.02]'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isRitualActive ? (
                        <>
                          <Sparkles size={18} className="animate-spin text-amber-300" />
                          <span>신검 각성 의식 거행 중...</span>
                        </>
                      ) : reqs.allMet ? (
                        <>
                          <Zap size={18} className="text-neutral-950" />
                          <span>제 {selectedStage.stage} 각성 의식 거행하기 (+{selectedStage.maxLevel}강 한계돌파)</span>
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          <span>각성 재료 및 조건 부족</span>
                        </>
                      )}
                    </button>

                    {!reqs.allMet && (
                      <p className="text-[11px] text-rose-400 text-center font-sans">
                        {!reqs.prevStageMet 
                          ? `이전 단계 (제 ${selectedStage.stage - 1} 각성)를 먼저 완료해야 합니다.`
                          : !reqs.levelMet
                          ? `현재 검 강화 수치가 +${selectedStage.requiredPreviousLevel}강에 도달해야 합니다. (현재: +${stats.currentSwordLevel}강)`
                          : '아래 재료 요구 조건을 충족해야 각성을 거행할 수 있습니다.'}
                      </p>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Right 7 Cols: Material Requirements & Benefits */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* 1. Requirements Checklist Card */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 shadow">
            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3">
              <span className="flex items-center gap-2">
                <Layers size={16} className="text-amber-400" /> 각성 필요 재료 및 달성 조건
              </span>
              <span className="text-xs text-neutral-400 font-mono font-normal">
                (보유량 / 필요량)
              </span>
            </h3>

            {(() => {
              const reqs = checkRequirements(selectedStage);
              const items = [
                {
                  label: `기본 검 강화 수치 (+${selectedStage.requiredPreviousLevel}강 달성)`,
                  current: stats.currentSwordLevel,
                  required: selectedStage.requiredPreviousLevel,
                  met: reqs.levelMet,
                  unit: '강',
                  icon: <PixelIcon name="sword" size={18} />,
                },
                {
                  label: '검 파편 (Sword Shards)',
                  current: stats.swordShards || 0,
                  required: selectedStage.requiredShards,
                  met: reqs.shardsMet,
                  unit: '개',
                  icon: <span className="text-base">🗡️</span>,
                },
                {
                  label: '강화석 (Enhancement Stones)',
                  current: stats.enhancementStones || 0,
                  required: selectedStage.requiredStones,
                  met: reqs.stonesMet,
                  unit: '개',
                  icon: <PixelIcon name="stone" size={18} />,
                },
                {
                  label: '소울 가루 (Spirit Dust)',
                  current: stats.spiritDust || 0,
                  required: selectedStage.requiredDust,
                  met: reqs.dustMet,
                  unit: '개',
                  icon: <Sparkles size={16} className="text-purple-400" />,
                },
                ...(selectedStage.requiredRP > 0 ? [{
                  label: '환생 포인트 (Rebirth Points RP)',
                  current: stats.rebirthPoints || 0,
                  required: selectedStage.requiredRP,
                  met: reqs.rpMet,
                  unit: 'RP',
                  icon: <Zap size={16} className="text-amber-400" />,
                }] : []),
                ...(selectedStage.requiredScrolls > 0 ? [{
                  label: '고대 보호 주문서 (Ancient Scrolls)',
                  current: stats.ancientScrolls || 0,
                  required: selectedStage.requiredScrolls,
                  met: reqs.scrollsMet,
                  unit: '장',
                  icon: <Shield size={16} className="text-sky-400" />,
                }] : []),
                {
                  label: '골드 (Gold)',
                  current: stats.gold || 0,
                  required: selectedStage.requiredGold,
                  met: reqs.goldMet,
                  unit: 'G',
                  icon: <PixelIcon name="gold" size={18} />,
                },
                {
                  label: '다이아몬드 (Diamonds)',
                  current: stats.diamonds || 0,
                  required: selectedStage.requiredDiamonds,
                  met: reqs.diaMet,
                  unit: 'D',
                  icon: <PixelIcon name="diamond" size={18} />,
                },
              ];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                        item.met
                          ? 'bg-neutral-950 border-emerald-800/60 text-emerald-300'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0">{item.icon}</div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-sans truncate text-neutral-200">{item.label}</span>
                          <span className="text-[11px] font-mono">
                            {formatNum(item.current)} / {formatNum(item.required)} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.met ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-700 font-bold">
                            충족 ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-mono border border-rose-800">
                            부족
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 2. Unlocked Awakening Benefits */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 shadow flex flex-col gap-3">
            <h3 className="text-sm sm:text-base font-bold text-purple-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
              <Crown size={16} className="text-purple-400" />
              <span>제 {selectedStage.stage} 각성 완료 시 활성화되는 영구 특권</span>
            </h3>

            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              {selectedStage.description}
            </p>

            <div className="flex flex-col gap-2 mt-1">
              {selectedStage.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-sans text-neutral-200 bg-neutral-950 p-2.5 rounded border border-neutral-800/80">
                  <Star size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
