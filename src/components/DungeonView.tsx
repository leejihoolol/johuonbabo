import React, { useEffect, useRef, useState } from 'react';
import { 
  Sword as SwordIcon, Zap, Flame, Sparkles, ChevronLeft, ChevronRight, 
  Play, Square, Skull
} from 'lucide-react';
import { DungeonStage, ElementType, Monster, PlayerStats, Skill, Sword } from '../types';
import { DUNGEON_STAGES, PLAYER_SKILLS } from '../data/dungeons';
import { drawPixelMonster } from '../utils/pixelMonsterRenderer';
import { sound } from '../utils/sound';
import { PixelIcon } from './PixelIcon';
import { calculateTotalMultipliers } from '../utils/worldSwordHelper';

interface DungeonViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onMonsterDefeated: (monster: Monster, stageId: number) => void;
  onStageClear: (stageId: number) => void;
  researches: Record<string, number>;
}

interface DamageNumber {
  id: number;
  damage: number;
  isCrit: boolean;
  element?: ElementType;
  x: number;
  y: number;
}

export const DungeonView: React.FC<DungeonViewProps> = ({
  stats,
  currentSword,
  onMonsterDefeated,
  onStageClear,
  researches,
}) => {
  const [selectedStageId, setSelectedStageId] = useState(stats.currentStageId || 1);
  const currentStage = DUNGEON_STAGES.find((s) => s.id === selectedStageId) || DUNGEON_STAGES[0];
  
  const [monsterIndex, setMonsterIndex] = useState(0);
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [isHit, setIsHit] = useState(false);
  const [isAutoHunting, setIsAutoHunting] = useState(true);
  const [damageList, setDamageList] = useState<DamageNumber[]>([]);
  const [skills, setSkills] = useState<Skill[]>(PLAYER_SKILLS);
  const [heroAttackAnim, setHeroAttackAnim] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const isHitRef = useRef(false);

  useEffect(() => {
    isHitRef.current = isHit;
  }, [isHit]);

  // Initialize or reset monster on stage or monster index change
  useEffect(() => {
    const isBoss = monsterIndex >= currentStage.monsterCount;
    if (isBoss) {
      setCurrentMonster({ ...currentStage.boss, currentHp: currentStage.boss.maxHp });
      sound.playBossRoar();
    } else {
      const template = currentStage.monsters[monsterIndex % currentStage.monsters.length];
      setCurrentMonster({
        ...template,
        currentHp: template.maxHp,
      });
    }
  }, [selectedStageId, monsterIndex]);

  // Monster Canvas Animation Frame (smooth RAF loop without triggering React component re-renders)
  useEffect(() => {
    let animId: number;
    const render = () => {
      frameRef.current += 1;
      const canvas = canvasRef.current;
      if (canvas && currentMonster) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPixelMonster(ctx, currentMonster, canvas.width, canvas.height, frameRef.current, isHitRef.current);
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [currentMonster]);

  // Player Attack Logic
  const performAttack = (damageMultiplier = 1.0, skillElement: ElementType = 'none', isSkill = false) => {
    if (!currentMonster || currentMonster.currentHp <= 0) return;

    setHeroAttackAnim(true);
    setTimeout(() => setHeroAttackAnim(false), 120);

    const multipliers = calculateTotalMultipliers(stats);

    // Calculate Damage
    const baseAtk = currentSword.atk * multipliers.totalAtkMult;
    
    // Rune / Research / Rebirth crit bonus
    const critBonus = (researches['res_crit_boost'] || 0) * 1.5 + (multipliers.rpCritBonus || 0);
    const totalCritRate = currentSword.critRate + critBonus;
    const isCrit = Math.random() * 100 < totalCritRate;
    
    let dmg = baseAtk * damageMultiplier;
    if (isCrit) {
      dmg *= ((currentSword.critDmg + (multipliers.rpCritDmgBonus || 0)) / 100);
    }

    // Element bonus: +50% if matching monster weakness
    const activeElement = isSkill ? skillElement : stats.elementInfusion;
    if (currentMonster.elementWeakness && currentMonster.elementWeakness === activeElement) {
      dmg *= 1.5;
    }

    // Subtract Defense (minimum 1 damage)
    const finalDamage = Math.max(1, Math.floor(dmg - currentMonster.defense * 0.5));

    // Flash monster
    setIsHit(true);
    setTimeout(() => setIsHit(false), 100);

    // Sound
    if (isSkill) {
      sound.playSkill(activeElement);
    } else if (isCrit) {
      sound.playCritHit();
    } else {
      sound.playSlash();
    }

    // Floating Damage Number
    const dId = Date.now() + Math.random();
    setDamageList((prev) => [
      ...prev.slice(-6),
      {
        id: dId,
        damage: finalDamage,
        isCrit,
        element: activeElement !== 'none' ? activeElement : undefined,
        x: 45 + (Math.random() * 20 - 10),
        y: 40 + (Math.random() * 20 - 10),
      },
    ]);
    setTimeout(() => {
      setDamageList((prev) => prev.filter((d) => d.id !== dId));
    }, 800);

    // Apply Damage to Monster
    const nextHp = Math.max(0, currentMonster.currentHp - finalDamage);
    setCurrentMonster({ ...currentMonster, currentHp: nextHp });

    // Check Death
    if (nextHp <= 0) {
      handleMonsterDefeated();
    }
  };

  // Monster Defeated Handler
  const handleMonsterDefeated = () => {
    if (!currentMonster) return;
    sound.playCoin();
    onMonsterDefeated(currentMonster, selectedStageId);

    const isBoss = monsterIndex >= currentStage.monsterCount;
    if (isBoss) {
      sound.playSuccess(true);
      onStageClear(selectedStageId);
      // Loop back or stay on boss
      setMonsterIndex(0);
    } else {
      setMonsterIndex((prev) => prev + 1);
    }
  };

  // Auto-Attack Interval
  useEffect(() => {
    if (!isAutoHunting) return;
    const intervalMs = Math.max(250, Math.floor(1000 / currentSword.atkSpeed));
    const timer = setInterval(() => {
      performAttack(1.0, 'none', false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isAutoHunting, currentSword, currentMonster]);

  // Handle Active Skill Cast
  const useSkill = (skill: Skill) => {
    const now = Date.now();
    const elapsed = (now - skill.lastUsedTime) / 1000;
    if (elapsed < skill.cooldown) return;

    skill.lastUsedTime = now;
    setSkills([...skills]);
    performAttack(skill.damageMultiplier, skill.element, true);
  };

  const hpPercent = currentMonster ? (currentMonster.currentHp / currentMonster.maxHp) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Top Stage Selector & Info */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedStageId > 1) {
                sound.playClick();
                setSelectedStageId((prev) => prev - 1);
                setMonsterIndex(0);
              }
            }}
            disabled={selectedStageId <= 1}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 border-2 border-neutral-700 rounded text-neutral-200 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
              <span>{currentStage.name}</span>
              {stats.highestStageCleared >= currentStage.id && (
                <span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  클리어 완료
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400 font-sans">{currentStage.description}</p>
          </div>

          <button
            onClick={() => {
              if (selectedStageId < DUNGEON_STAGES.length) {
                sound.playClick();
                setSelectedStageId((prev) => prev + 1);
                setMonsterIndex(0);
              }
            }}
            disabled={selectedStageId >= DUNGEON_STAGES.length}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 border-2 border-neutral-700 rounded text-neutral-200 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Recommended ATK & Auto Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800 flex items-center gap-1.5">
            <span className="text-neutral-400">권장 공격력:</span>
            <span className="font-bold text-amber-400">{currentStage.recommendedAtk.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setIsAutoHunting(!isAutoHunting);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
              isAutoHunting
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            {isAutoHunting ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoHunting ? '자동 사냥 ON' : '수동 사냥'}</span>
          </button>
        </div>
      </div>

      {/* Main Battle Arena */}
      <div className={`relative w-full h-80 sm:h-96 rounded-xl border-4 border-neutral-800 bg-gradient-to-b ${currentStage.background} overflow-hidden shadow-2xl flex flex-col justify-between p-4`}>
        {/* Top Battle HUD (Monster HP, Stage Progress) */}
        <div className="relative z-10 w-full flex flex-col gap-2">
          {/* Stage Progress Bar (1/5 mobs -> BOSS) */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Skull className="w-4 h-4 text-rose-400" />
              <span>진행도: {monsterIndex < currentStage.monsterCount ? `${monsterIndex + 1} / ${currentStage.monsterCount}` : 'BOSS 레이드'}</span>
            </span>

            {currentMonster?.elementWeakness && (
              <span className="text-[11px] bg-neutral-950/80 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300">
                약점 속성: {currentMonster.elementWeakness.toUpperCase()} (+50% 피해)
              </span>
            )}
          </div>

          {/* Monster HP Bar */}
          {currentMonster && (
            <div className="flex flex-col gap-1 bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-700 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-rose-300 flex items-center gap-1.5">
                  {currentMonster.isBoss && <PixelIcon name="boss" size={16} className="animate-bounce" />}
                  {currentMonster.name}
                </span>
                <span className="text-neutral-300 font-mono">
                  {currentMonster.currentHp.toLocaleString()} / {currentMonster.maxHp.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-4 bg-neutral-900 rounded-full border border-neutral-700 overflow-hidden">
                <div
                  style={{ width: `${hpPercent}%` }}
                  className={`h-full transition-all duration-150 ${
                    currentMonster.isBoss
                      ? 'bg-gradient-to-r from-purple-600 via-rose-500 to-amber-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-400'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center Arena (Hero & Monster Canvas) */}
        <div className="relative flex-1 flex items-center justify-around">
          {/* Hero Pixel Character */}
          <div className={`relative flex flex-col items-center transition-transform ${heroAttackAnim ? 'translate-x-6 scale-110' : ''}`}>
            {/* Pixel knight representation */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-950 border-2 border-amber-400 rounded flex flex-col items-center justify-center shadow-lg relative">
              <PixelIcon name="shield" size={24} />
              {/* Equipped Sword icon floating */}
              <div className="absolute -top-2 -right-2">
                <PixelIcon name="sword" size={18} className="animate-pulse" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-300 mt-1 font-mono">
              +{currentSword.level} {currentSword.name}
            </span>
          </div>

          {/* Monster Canvas */}
          <div className="relative flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="w-48 h-48 sm:w-56 sm:h-56 cursor-pointer"
              onClick={() => performAttack(1.0, 'none', false)}
              title="클릭하여 수동 공격!"
            />

            {/* Floating Damage Text */}
            {damageList.map((dmg) => (
              <div
                key={dmg.id}
                style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
                className={`absolute font-bold pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-ping font-mono text-sm sm:text-base ${
                  dmg.isCrit
                    ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,1)] text-lg'
                    : dmg.element
                    ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,1)]'
                    : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                }`}
              >
                {dmg.isCrit ? `CRIT -${dmg.damage.toLocaleString()}` : `-${dmg.damage.toLocaleString()}`}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Active Skills Control Bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 bg-neutral-950/60 p-2 rounded-lg backdrop-blur">
          {skills.map((skill) => {
            const now = Date.now();
            const elapsed = (now - skill.lastUsedTime) / 1000;
            const remaining = Math.max(0, Math.ceil(skill.cooldown - elapsed));
            const isReady = remaining === 0;
            const isSkillUnlocked = currentSword.level >= skill.unlockedAtLevel;

            return (
              <button
                key={skill.id}
                disabled={!isReady || !isSkillUnlocked}
                onClick={() => {
                  useSkill(skill);
                }}
                className={`relative py-2 px-2.5 rounded border-2 flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  !isSkillUnlocked
                    ? 'bg-neutral-950 border-neutral-800 text-neutral-600 cursor-not-allowed'
                    : isReady
                    ? 'bg-indigo-950 hover:bg-indigo-900 active:bg-indigo-800 border-indigo-500 text-indigo-200 shadow-md'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {skill.icon === 'Sword' && <SwordIcon className="w-4 h-4 text-cyan-400" />}
                  {skill.icon === 'Zap' && <Zap className="w-4 h-4 text-yellow-400" />}
                  {skill.icon === 'Flame' && <Flame className="w-4 h-4 text-orange-400" />}
                  {skill.icon === 'Sparkles' && <Sparkles className="w-4 h-4 text-pink-400" />}
                  <span className="truncate">{skill.name.split(' ')[0]}</span>
                </div>

                {/* Cooldown Number */}
                {!isSkillUnlocked ? (
                  <span className="text-[10px] text-neutral-500">+{skill.unlockedAtLevel}강 해금</span>
                ) : !isReady ? (
                  <span className="font-mono text-rose-400 text-xs font-bold">{remaining}s</span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono">READY</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rewards & Stage Info Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center gap-2">
          <PixelIcon name="gold" size={16} />
          <span className="text-neutral-400">처치 시 보상:</span>
          <span className="text-amber-300 font-bold">골드 + 강화석 드랍</span>
        </div>

        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center gap-2">
          <PixelIcon name="scroll" size={16} />
          <span className="text-neutral-400">보스 처치:</span>
          <span className="text-purple-300 font-bold">다이아 및 보호서 희귀 드랍</span>
        </div>

        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center gap-2">
          <PixelIcon name="sword" size={16} />
          <span className="text-neutral-400">현재 사냥 속도:</span>
          <span className="text-cyan-300 font-bold">{currentSword.atkSpeed} 회/초</span>
        </div>
      </div>
    </div>
  );
};
