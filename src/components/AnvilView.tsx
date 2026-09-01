import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Hammer, Shield, Sparkles, AlertTriangle, Play, Square, 
  Coins, Layers, ArrowUpRight, CheckCircle2, XCircle, RotateCcw, Zap, ChevronRight
} from 'lucide-react';
import { GameLog, PlayerStats, Sword } from '../types';
import { PixelIcon } from './PixelIcon';
import { drawPixelSword } from '../utils/pixelSwordRenderer';
import { sound } from '../utils/sound';
import { getAwakeningMaxLevel, getAwakeningTitle } from '../data/awakeningData';

interface AnvilViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  nextSword: Sword | null;
  onEnhance: (useQteBonus?: boolean) => { success: boolean; resultType: 'success' | 'fail' | 'destroy' | 'drop' };
  onSellSword: () => void;
  onDismantleSword: () => void;
  logs: GameLog[];
  researches: Record<string, number>;
  onToggleAutoEnhance: (target: number) => void;
  isAutoEnhancing: boolean;
  onToggleSafetyScroll: (enabled: boolean) => void;
  onToggleLuckyPotion: (enabled: boolean) => void;
  onNavigateToAwakening?: () => void;
}

export const AnvilView: React.FC<AnvilViewProps> = ({
  stats,
  currentSword,
  nextSword,
  onEnhance,
  onSellSword,
  onDismantleSword,
  logs,
  researches,
  onToggleAutoEnhance,
  isAutoEnhancing,
  onToggleSafetyScroll,
  onToggleLuckyPotion,
  onNavigateToAwakening,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const isStrikingRef = useRef(false);
  const [isStriking, setIsStriking] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const maxSwordLevel = getAwakeningMaxLevel(stats.swordAwakeningLevel || 0);
  const [targetLevel, setTargetLevel] = useState(Math.min(maxSwordLevel, stats.autoEnhanceTarget || 10));
  const [qteActive, setQteActive] = useState(false);
  const [qteProgress, setQteProgress] = useState(0);
  const [qteDirection, setQteDirection] = useState(1);
  const [hammerSparkles, setHammerSparkles] = useState<{ id: number; x: number; y: number; text: string; color: string; iconName?: string }[]>([]);

  // QTE golden zone settings
  const qteBonusWindow = 15 + (researches['res_qte_window'] || 0) * 2; // e.g. 15% to 35% of bar width

  // Smooth Canvas Animation Loop without re-rendering React component
  useEffect(() => {
    let animationId: number;
    const render = () => {
      frameRef.current += 1;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPixelSword(
            ctx,
            currentSword,
            canvas.width,
            canvas.height,
            stats.elementInfusion,
            frameRef.current,
            isStrikingRef.current,
            stats.swordAwakeningLevel || 0
          );
        }
      }
      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [currentSword, stats.elementInfusion, stats.swordAwakeningLevel]);

  // Keep isStrikingRef in sync
  useEffect(() => {
    isStrikingRef.current = isStriking;
  }, [isStriking]);

  // QTE Bar Animation
  useEffect(() => {
    if (!qteActive) return;
    const interval = setInterval(() => {
      setQteProgress((prev) => {
        let next = prev + qteDirection * 3.5;
        if (next >= 100) {
          next = 100;
          setQteDirection(-1);
        } else if (next <= 0) {
          next = 0;
          setQteDirection(1);
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [qteActive, qteDirection]);

  // Effective Success / Destroy Rates calculation with researches & potions
  const successBonus = (researches['res_success'] || 0) * 0.5 + (stats.useLuckyPotionAuto ? 10 : 0);
  const destroyReduction = (researches['res_destroy_reduce'] || 0) * 1.0;
  
  const baseSuccess = currentSword.successRate;
  const effectiveSuccess = Math.min(100, Math.max(1, Number((baseSuccess + successBonus).toFixed(1))));
  
  const baseDestroy = currentSword.destroyRate;
  const effectiveDestroy = stats.useSafetyScrollAuto ? 0 : Math.max(0, Number((baseDestroy - destroyReduction).toFixed(1)));
  
  const effectiveDrop = currentSword.dropRate;

  // Handle Hammer Strike
  const handleHammerClick = () => {
    if (isAutoEnhancing) return;
    if (stats.gold < currentSword.costGold || stats.enhancementStones < currentSword.costStones) {
      sound.playFail();
      return;
    }

    setIsStriking(true);
    sound.playHammerHit();

    setTimeout(() => {
      const res = onEnhance(false);
      setIsStriking(false);

      if (res.resultType === 'success') {
        if (currentSword.level + 1 >= 10) {
          confetti({
            particleCount: currentSword.level >= 20 ? 120 : 60,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
        addSparkle('강화 성공!', '#4ade80');
      } else if (res.resultType === 'destroy') {
        addSparkle('검 파괴됨...', '#ef4444');
      } else if (res.resultType === 'drop') {
        addSparkle('단계 하락', '#f97316');
      } else {
        addSparkle('강화 실패', '#94a3b8');
      }
    }, 220);
  };

  // Handle QTE Trigger
  const startQteEnhance = () => {
    if (isAutoEnhancing || qteActive) return;
    if (stats.gold < currentSword.costGold || stats.enhancementStones < currentSword.costStones) {
      sound.playFail();
      return;
    }
    setQteProgress(0);
    setQteDirection(1);
    setQteActive(true);
    sound.playClick();
  };

  const confirmQteHit = () => {
    if (!qteActive) return;
    setQteActive(false);

    // Golden center is 50 +/- (qteBonusWindow / 2)
    const isHitGolden = Math.abs(qteProgress - 50) <= qteBonusWindow / 2;
    setIsStriking(true);

    if (isHitGolden) {
      sound.playCritHit();
      addSparkle('퍼펙트 타이밍! (+10%)', '#fbbf24');
    } else {
      sound.playHammerHit();
    }

    setTimeout(() => {
      const res = onEnhance(isHitGolden);
      setIsStriking(false);
      if (res.resultType === 'success') {
        if (currentSword.level + 1 >= 10) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
        addSparkle('강화 성공!', '#4ade80');
      } else if (res.resultType === 'destroy') {
        addSparkle('검 파괴됨...', '#ef4444');
      } else if (res.resultType === 'drop') {
        addSparkle('단계 하락', '#f97316');
      } else {
        addSparkle('강화 실패', '#94a3b8');
      }
    }, 220);
  };

  const addSparkle = (text: string, color: string) => {
    const id = Date.now() + Math.random();
    setHammerSparkles((prev) => [...prev.slice(-4), { id, x: 50, y: 40, text, color }]);
    setTimeout(() => {
      setHammerSparkles((prev) => prev.filter((s) => s.id !== id));
    }, 1200);
  };

  // Rarity color mappings
  const rarityColors: Record<string, string> = {
    일반: 'text-neutral-300 border-neutral-600 bg-neutral-800',
    고급: 'text-blue-400 border-blue-600 bg-blue-950/60',
    희귀: 'text-purple-400 border-purple-600 bg-purple-950/60',
    영웅: 'text-amber-400 border-amber-600 bg-amber-950/60',
    전설: 'text-orange-400 border-orange-600 bg-orange-950/60',
    신화: 'text-rose-400 border-rose-600 bg-rose-950/60',
    태초: 'text-cyan-400 border-cyan-600 bg-cyan-950/60',
    초월: 'text-fuchsia-400 border-fuchsia-600 bg-fuchsia-950/60',
    우주: 'text-emerald-300 border-emerald-500 bg-emerald-950/60 shadow-[0_0_15px_rgba(52,211,153,0.4)]',
  };

  const isMaxLevel = currentSword.level >= maxSwordLevel;
  const canAfford = stats.gold >= currentSword.costGold && stats.enhancementStones >= currentSword.costStones;

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 font-pixel">
      {/* Awakening Limit Banner if reached limit */}
      {isMaxLevel && (
        <div className="lg:col-span-12 bg-gradient-to-r from-purple-950/90 via-amber-950/80 to-purple-950/90 border-2 border-purple-500 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/80 border border-purple-400 rounded-lg text-purple-300">
              <Zap size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <span>현재 각성 한계 (+{maxSwordLevel}강)에 도달했습니다!</span>
                <span className="text-xs px-2 py-0.5 rounded bg-purple-900 text-purple-200 border border-purple-600 font-mono">
                  {getAwakeningTitle(stats.swordAwakeningLevel || 0)}
                </span>
              </div>
              <p className="text-xs text-neutral-300 font-sans mt-0.5">
                {(stats.swordAwakeningLevel || 0) < 3 
                  ? `[초월 각성] 메뉴에서 제 ${(stats.swordAwakeningLevel || 0) + 1}각성을 거행하여 최대 +${(stats.swordAwakeningLevel || 0) === 0 ? 45 : (stats.swordAwakeningLevel || 0) === 1 ? 56 : 67}강까지 한계돌파할 수 있습니다.`
                  : '축하합니다! 최종 제 3각성(태초·창세) 최고 한계 강화치 +67강에 도달했습니다!'}
              </p>
            </div>
          </div>

          {onNavigateToAwakening && (stats.swordAwakeningLevel || 0) < 3 && (
            <button
              onClick={() => {
                sound.playClick();
                onNavigateToAwakening();
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-neutral-950 font-bold rounded-lg text-xs font-pixel flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
            >
              <span>초월 각성 바로가기</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* LEFT / CENTER: The Anvil Stage & Sword Canvas */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Main Forge Box */}
        <div className="relative bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 shadow-2xl overflow-hidden flex flex-col items-center">
          {/* Anvil Atmosphere Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-amber-950/30 pointer-events-none" />
          
          {/* Top Title & Level Tag */}
          <div className="relative z-10 w-full flex items-center justify-between border-b-2 border-neutral-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${rarityColors[currentSword.rarity] || 'text-neutral-300'}`}>
                {currentSword.rarity}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-amber-300 drop-shadow">
                {currentSword.name}
              </h2>
            </div>
            <div className="bg-amber-500/20 border-2 border-amber-500 text-amber-300 font-bold px-3 py-1 rounded text-sm sm:text-base font-mono">
              +{currentSword.level} 강
            </div>
          </div>

          {/* Interactive Floating Feedback Overlays */}
          <div className="relative w-full flex items-center justify-center h-64 sm:h-72">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className={`w-64 h-64 sm:w-72 sm:h-72 transition-transform duration-100 ${
                isStriking ? 'scale-95 translate-y-2' : 'hover:scale-105'
              }`}
            />

            {/* Sparkle FX text */}
            {hammerSparkles.map((sp) => (
              <div
                key={sp.id}
                style={{ color: sp.color }}
                className="absolute font-bold text-base sm:text-lg animate-bounce drop-shadow-[0_2px_8px_rgba(0,0,0,1)] bg-neutral-950/90 px-3 py-1 rounded border border-neutral-700"
              >
                {sp.text}
              </div>
            ))}

            {/* Anvil Base Graphic */}
            <div className="absolute bottom-2 w-48 h-8 bg-neutral-800 border-2 border-neutral-700 rounded-t-lg shadow-inner flex items-center justify-center gap-1.5">
              <PixelIcon name="anvil" size={14} />
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase">
                MYTHIC FORGE ANVIL
              </span>
            </div>
          </div>

          {/* Sword Lore & Special Effect */}
          <div className="relative z-10 w-full mt-2 bg-neutral-950/80 border border-neutral-800 p-2.5 rounded text-xs text-neutral-300 leading-relaxed font-sans">
            <span className="text-amber-400 font-bold font-pixel flex items-center gap-1.5 mb-1">
              <PixelIcon name="codex" size={14} /> 도검 전설:
            </span>
            {currentSword.description}
          </div>

          {/* QTE Mini-Game Bar (When Active) */}
          {qteActive && (
            <div className="relative z-10 w-full mt-3 bg-neutral-950 border-2 border-amber-500 p-3 rounded-lg flex flex-col gap-2 animate-pulse font-pixel">
              <div className="flex justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <PixelIcon name="sparkle" size={14} /> 정밀 타격 미니게임
                </span>
                <span className="text-[11px] text-neutral-400">골든 구간에서 타격 버튼 클릭!</span>
              </div>
              <div className="relative w-full h-8 bg-neutral-800 rounded border border-neutral-700 overflow-hidden">
                {/* Golden Target Zone */}
                <div
                  style={{
                    left: `${50 - qteBonusWindow / 2}%`,
                    width: `${qteBonusWindow}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-amber-400/80 border-x-2 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.8)] flex items-center justify-center text-[10px] font-bold text-neutral-900"
                >
                  HIT!
                </div>
                {/* Moving Indicator */}
                <div
                  style={{ left: `${qteProgress}%` }}
                  className="absolute top-0 bottom-0 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] transform -translate-x-1/2"
                />
              </div>
              <button
                onClick={confirmQteHit}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded border-2 border-amber-300 shadow cursor-pointer text-sm"
              >
                지금 내려치기!
              </button>
            </div>
          )}

          {/* Enhancing Controls & Buttons */}
          <div className="relative z-10 w-full mt-4 flex flex-col gap-2">
            {/* Safety Options / Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950 p-2 rounded border border-neutral-800 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stats.useSafetyScrollAuto}
                  onChange={(e) => {
                    onToggleSafetyScroll(e.target.checked);
                    sound.playClick();
                  }}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <PixelIcon name="scroll" size={14} /> 파괴 방지 주문서 ({stats.ancientScrolls}장)
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stats.useLuckyPotionAuto}
                  onChange={(e) => {
                    onToggleLuckyPotion(e.target.checked);
                    sound.playClick();
                  }}
                  className="accent-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <PixelIcon name="potion" size={14} /> 행운의 영약 (+10% 확률, {stats.luckyPotions}개)
                </span>
              </label>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1-Click Instant Enhance */}
              <button
                disabled={isMaxLevel || isAutoEnhancing || qteActive || !canAfford}
                onClick={handleHammerClick}
                className={`py-3 px-2 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-4 transition-all cursor-pointer ${
                  isMaxLevel
                    ? 'bg-neutral-800 text-neutral-500 border-neutral-900 cursor-not-allowed'
                    : canAfford
                    ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 active:translate-y-0.5 text-neutral-950 border-amber-800 shadow-lg'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-900 cursor-not-allowed opacity-60'
                }`}
              >
                <PixelIcon name="hammer" size={18} className={isStriking ? 'animate-bounce' : ''} />
                <span>강화하기</span>
              </button>

              {/* QTE Precision Enhance */}
              <button
                disabled={isMaxLevel || isAutoEnhancing || qteActive || !canAfford}
                onClick={startQteEnhance}
                className="py-3 px-2 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 active:translate-y-0.5 text-indigo-100 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border-b-4 border-indigo-900 shadow cursor-pointer"
              >
                <PixelIcon name="sparkle" size={16} />
                <span>정밀 망치질 QTE</span>
              </button>

              {/* Auto Enhance Toggle */}
              <button
                disabled={isMaxLevel}
                onClick={() => {
                  sound.playClick();
                  if (isAutoEnhancing) {
                    onToggleAutoEnhance(targetLevel);
                  } else {
                    setShowAutoModal(true);
                  }
                }}
                className={`py-3 px-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border-b-4 transition-all cursor-pointer ${
                  isAutoEnhancing
                    ? 'bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white border-rose-900 animate-pulse'
                    : 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-neutral-200 border-neutral-900'
                }`}
              >
                {isAutoEnhancing ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>자동 중지 (+{targetLevel})</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>자동 강화 설정</span>
                  </>
                )}
              </button>
            </div>

            {/* Utility actions (Sell / Dismantle) */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800 text-xs font-pixel">
              <button
                onClick={() => {
                  sound.playClick();
                  onSellSword();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-amber-600/60 rounded text-amber-300 cursor-pointer font-mono"
              >
                <PixelIcon name="gold" size={14} />
                <span>검 판매 ({currentSword.sellPrice.toLocaleString()} G)</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onDismantleSword();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-slate-600/60 rounded text-slate-300 cursor-pointer font-mono"
              >
                <PixelIcon name="shard" size={14} />
                <span>검 분해 ({Math.max(1, currentSword.level * 2)}개 파편)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Stats Comparison & Probabilities & Live Log */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Cost & Requirements Card */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3 sm:p-4 flex flex-col gap-3 shadow">
          <h3 className="text-sm font-bold text-amber-400 flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <PixelIcon name="stone" size={14} /> 강화 비용 및 소모 재료
            </span>
            <span className="text-xs text-neutral-400 font-mono">+{currentSword.level} → +{currentSword.level + 1}</span>
          </h3>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:text-sm">
            <div className={`p-2 rounded border flex flex-col gap-0.5 ${stats.gold >= currentSword.costGold ? 'bg-neutral-950 border-amber-600/40 text-amber-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <PixelIcon name="gold" size={12} /> 필요 골드
              </span>
              <span className="font-bold">{currentSword.costGold.toLocaleString()} G</span>
            </div>

            <div className={`p-2 rounded border flex flex-col gap-0.5 ${stats.enhancementStones >= currentSword.costStones ? 'bg-neutral-950 border-purple-600/40 text-purple-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <PixelIcon name="stone" size={12} /> 필요 강화석
              </span>
              <span className="font-bold">{currentSword.costStones} 개</span>
            </div>
          </div>

          {/* Probability Breakdown Bar */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral-300">확률 정보</span>
              <span className="text-[11px] text-emerald-400 font-mono">
                연구 보너스: +{successBonus}%
              </span>
            </div>

            {/* Visual Probability Progress Bar */}
            <div className="w-full h-5 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden flex font-mono text-[10px] font-bold text-neutral-950">
              {/* Success segment */}
              <div
                style={{ width: `${effectiveSuccess}%` }}
                className="bg-emerald-500 flex items-center justify-center"
                title={`성공: ${effectiveSuccess}%`}
              >
                {effectiveSuccess > 15 ? `${effectiveSuccess}%` : ''}
              </div>
              {/* Drop segment */}
              {effectiveDrop > 0 && (
                <div
                  style={{ width: `${effectiveDrop}%` }}
                  className="bg-amber-500 flex items-center justify-center"
                  title={`실패 시 하락: ${effectiveDrop}%`}
                >
                  {effectiveDrop > 15 ? `${effectiveDrop}%` : ''}
                </div>
              )}
              {/* Destroy segment */}
              {effectiveDestroy > 0 && (
                <div
                  style={{ width: `${effectiveDestroy}%` }}
                  className="bg-rose-600 text-white flex items-center justify-center"
                  title={`실패 시 파괴: ${effectiveDestroy}%`}
                >
                  {effectiveDestroy > 10 ? `${effectiveDestroy}%` : ''}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono pt-1 text-neutral-400">
              <span className="text-emerald-400">● 성공 {effectiveSuccess}%</span>
              {effectiveDrop > 0 && <span className="text-amber-400">● 1단계 하락 {effectiveDrop}%</span>}
              <span className={effectiveDestroy > 0 ? 'text-rose-400 font-bold' : 'text-neutral-500'}>
                ● 파괴 {effectiveDestroy}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Preview & Difference Card */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3 sm:p-4 flex flex-col gap-2 shadow">
          <h3 className="text-sm font-bold text-cyan-400 flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <PixelIcon name="sword" size={14} /> 도검 스펙 비교
            </span>
            <span className="text-xs text-neutral-400">다음 단계 미리보기</span>
          </h3>

          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {/* ATK */}
            <div className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-400">공격력 (ATK)</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-neutral-200">{currentSword.atk.toLocaleString()}</span>
                {nextSword && (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{nextSword.atk.toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>

            {/* Attack Speed */}
            <div className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-400">공격 속도</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-neutral-200">{currentSword.atkSpeed} 회/초</span>
                {nextSword && (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{nextSword.atkSpeed} 회/초</span>
                  </>
                )}
              </div>
            </div>

            {/* Crit Rate & Dmg */}
            <div className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800">
              <span className="text-neutral-400">치명타 확률 / 피해</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-neutral-200">{currentSword.critRate}% ({currentSword.critDmg}%)</span>
                {nextSword && (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{nextSword.critRate}% ({nextSword.critDmg}%)</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Enhancement Event Log */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3 sm:p-4 flex flex-col gap-2 shadow h-48 sm:h-56">
          <h3 className="text-xs font-bold text-neutral-300 flex items-center justify-between border-b border-neutral-800 pb-1">
            <span className="flex items-center gap-1.5">
              <PixelIcon name="codex" size={12} /> 실시간 대장간 기록
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">최근 15건</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-neutral-500 text-center py-6 text-xs">
                망치질을 시작하면 기록이 표시됩니다.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`px-2 py-1 rounded border flex items-center justify-between text-[11px] ${
                    log.type === 'success'
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : log.type === 'destroy'
                      ? 'bg-rose-950/70 border-rose-800 text-rose-300 font-bold animate-pulse'
                      : log.type === 'drop'
                      ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {log.type === 'destroy' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {log.type === 'drop' && <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {log.type === 'fail' && <XCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />}
                    <span className="truncate">{log.text}</span>
                  </div>
                  <span className="text-[9px] text-neutral-500 shrink-0 ml-2">{log.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Auto Enhance Configuration Modal */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-4 border-amber-500 rounded-lg p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 font-pixel">
            <h3 className="text-base font-bold text-amber-300 border-b-2 border-neutral-800 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PixelIcon name="anvil" size={16} /> 자동 강화 설정
              </span>
              <button
                onClick={() => setShowAutoModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <label className="flex flex-col gap-1.5">
                <span className="text-neutral-300 font-bold">목표 강화 수치 (달성 시 자동 정지):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={currentSword.level + 1}
                    max={maxSwordLevel}
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <span className="w-16 text-center font-bold text-sm bg-neutral-950 border border-amber-500/60 py-1 rounded text-amber-300">
                    +{targetLevel} 강
                  </span>
                </div>
              </label>

              <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stats.useSafetyScrollAuto}
                    onChange={(e) => {
                      onToggleSafetyScroll(e.target.checked);
                      sound.playClick();
                    }}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <PixelIcon name="scroll" size={14} /> 파괴 위험 단계(11강+) 진입 시 보호서 자동 소모
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stats.useLuckyPotionAuto}
                    onChange={(e) => {
                      onToggleLuckyPotion(e.target.checked);
                      sound.playClick();
                    }}
                    className="accent-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-rose-300 font-bold flex items-center gap-1">
                    <PixelIcon name="potion" size={14} /> 행운의 영약(+10% 확률) 자동 소모
                  </span>
                </label>
              </div>

              <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded border border-neutral-800 leading-relaxed font-sans">
                [안내] 골드 또는 강화석이 부족하거나, 설정한 목표 레벨에 도달하면 자동으로 강화가 중단됩니다.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAutoModal(false);
                  onToggleAutoEnhance(targetLevel);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold rounded border-2 border-amber-300 cursor-pointer shadow text-xs sm:text-sm"
              >
                자동 강화 시작!
              </button>
              <button
                onClick={() => setShowAutoModal(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded border-2 border-neutral-700 cursor-pointer text-xs sm:text-sm"
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
