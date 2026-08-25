import React, { useEffect, useRef, useState } from 'react';
import { 
  Sword as SwordIcon, Zap, Flame, Sparkles, ChevronLeft, ChevronRight, 
  Play, Square, Skull, ShieldAlert, Heart, Trophy, Globe
} from 'lucide-react';
import { DungeonStage, ElementType, Monster, PlayerStats, Skill, Sword } from '../types';
import { DUNGEON_STAGES, PLAYER_SKILLS } from '../data/dungeons';
import { WORLDS_DATA } from '../data/worlds';
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
  // World filtering
  const [selectedWorldTab, setSelectedWorldTab] = useState<number>(stats.currentWorldId || 1);
  const worldStages = DUNGEON_STAGES.filter((s) => s.worldId === selectedWorldTab);
  
  const [selectedStageId, setSelectedStageId] = useState(
    worldStages.length > 0 ? worldStages[0].id : (stats.currentStageId || 1)
  );
  
  const currentStage = DUNGEON_STAGES.find((s) => s.id === selectedStageId) || DUNGEON_STAGES[0];
  const currentWorldInfo = WORLDS_DATA.find((w) => w.id === currentStage.worldId) || WORLDS_DATA[0];

  const [monsterIndex, setMonsterIndex] = useState(0);
  const [currentMonster, setCurrentMonster] = useState<Monster | null>(null);
  const [isHit, setIsHit] = useState(false);
  const [isAutoHunting, setIsAutoHunting] = useState(true);
  const [autoSkillEnabled, setAutoSkillEnabled] = useState(true);
  const [damageList, setDamageList] = useState<DamageNumber[]>([]);
  const [skills, setSkills] = useState<Skill[]>(PLAYER_SKILLS);
  const [heroAttackAnim, setHeroAttackAnim] = useState(false);

  // Combo & Fever System
  const [comboCount, setComboCount] = useState(0);
  const [isFeverMode, setIsFeverMode] = useState(false);
  const [feverTimer, setFeverTimer] = useState(0);

  // Boss QTE Break System
  const [bossQteActive, setBossQteActive] = useState(false);
  const [bossQteTimer, setBossQteTimer] = useState(0);
  const [isBossStunned, setIsBossStunned] = useState(false);

  // Active Spirit Dialogue Bubble
  const activeSpirit = stats.swordSpirits?.find((s) => s.id === stats.activeSpiritId && s.unlocked);
  const [spiritSpeech, setSpiritSpeech] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const isHitRef = useRef(false);
  const isStunnedRef = useRef(false);

  useEffect(() => {
    isHitRef.current = isHit;
    isStunnedRef.current = isBossStunned;
  }, [isHit, isBossStunned]);

  // Sync selected stage when world tab changes
  useEffect(() => {
    const matchingStages = DUNGEON_STAGES.filter((s) => s.worldId === selectedWorldTab);
    if (matchingStages.length > 0) {
      setSelectedStageId(matchingStages[0].id);
      setMonsterIndex(0);
    }
  }, [selectedWorldTab]);

  // Initialize monster
  useEffect(() => {
    const isBoss = monsterIndex >= currentStage.monsterCount;
    if (isBoss) {
      setCurrentMonster({ ...currentStage.boss, currentHp: currentStage.boss.maxHp });
      sound.playBossRoar();
      // Chance to trigger QTE shield break during boss fight
      if (Math.random() < 0.8) {
        setTimeout(() => {
          triggerBossQte();
        }, 3000);
      }
    } else {
      const template = currentStage.monsters[monsterIndex % currentStage.monsters.length];
      setCurrentMonster({
        ...template,
        currentHp: template.maxHp,
      });
      setBossQteActive(false);
      setIsBossStunned(false);
    }
  }, [selectedStageId, monsterIndex]);

  // Boss QTE Trigger
  const triggerBossQte = () => {
    if (!currentMonster || !currentMonster.isBoss) return;
    setBossQteActive(true);
    setBossQteTimer(3.5);
    sound.playWarning();
  };

  // QTE Timer Tick
  useEffect(() => {
    if (!bossQteActive) return;
    const interval = setInterval(() => {
      setBossQteTimer((prev) => {
        if (prev <= 0.1) {
          setBossQteActive(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [bossQteActive]);

  // Boss Break Success Action
  const handleBossBreakClick = () => {
    if (!bossQteActive || !currentMonster) return;
    sound.playCritHit();
    setBossQteActive(false);
    setIsBossStunned(true);
    setTimeout(() => setIsBossStunned(false), 3000);

    // Deal 500% break burst damage
    performAttack(5.0, 'holy', true);
    if (activeSpirit) {
      setSpiritSpeech(`${activeSpirit.name}: "나이스 쉴드 브레이크! 지금 마구 공격해!"`);
      setTimeout(() => setSpiritSpeech(''), 3000);
    }
  };

  // Fever Mode Timer Tick
  useEffect(() => {
    if (!isFeverMode) return;
    const interval = setInterval(() => {
      setFeverTimer((prev) => {
        if (prev <= 0.5) {
          setIsFeverMode(false);
          setComboCount(0);
          return 0;
        }
        return prev - 0.5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isFeverMode]);

  // Canvas Animation Frame (smooth RAF loop)
  useEffect(() => {
    let animId: number;
    const render = () => {
      frameRef.current += 1;
      const canvas = canvasRef.current;
      if (canvas && currentMonster) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPixelMonster(
            ctx, 
            currentMonster, 
            canvas.width, 
            canvas.height, 
            frameRef.current, 
            isHitRef.current,
            isStunnedRef.current
          );
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
    setTimeout(() => setHeroAttackAnim(false), 100);

    const multipliers = calculateTotalMultipliers(stats);

    // Fever mode boost
    const feverMult = isFeverMode ? 2.5 : 1.0;
    const baseAtk = currentSword.atk * multipliers.totalAtkMult * feverMult;
    
    // Rune / Research / Rebirth crit bonus
    const critBonus = (researches['res_crit_boost'] || 0) * 1.5 + (multipliers.rpCritBonus || 0);
    const totalCritRate = isFeverMode ? 100 : (currentSword.critRate + critBonus);
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

    // Stunned monster takes 2x extra damage
    if (isBossStunned) {
      dmg *= 2.0;
    }

    // Subtract Defense (minimum 1 damage)
    const finalDamage = Math.max(1, Math.floor(dmg - currentMonster.defense * 0.3));

    // Flash monster
    setIsHit(true);
    setTimeout(() => setIsHit(false), 90);

    // Sound
    if (isSkill) {
      sound.playSkill(activeElement);
    } else if (isCrit) {
      sound.playCritHit();
    } else {
      sound.playSlash();
    }

    // Combo increment
    if (!isFeverMode) {
      setComboCount((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          setIsFeverMode(true);
          setFeverTimer(10);
          sound.playSuccess(true);
          return 100;
        }
        return next;
      });
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
        y: 35 + (Math.random() * 20 - 10),
      },
    ]);
    setTimeout(() => {
      setDamageList((prev) => prev.filter((d) => d.id !== dId));
    }, 750);

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
      setMonsterIndex(0);
      setBossQteActive(false);
      setIsBossStunned(false);
    } else {
      setMonsterIndex((prev) => prev + 1);
    }
  };

  // Auto-Attack Interval
  useEffect(() => {
    if (!isAutoHunting) return;
    const baseSpeed = currentSword.atkSpeed * (isFeverMode ? 2.5 : 1.0);
    const intervalMs = Math.max(120, Math.floor(1000 / baseSpeed));
    const timer = setInterval(() => {
      performAttack(1.0, 'none', false);

      // Auto skill cast
      if (autoSkillEnabled) {
        skills.forEach((sk) => {
          const now = Date.now();
          if (now - sk.lastUsedTime >= sk.cooldown * 1000 && currentSword.level >= sk.unlockedAtLevel) {
            useSkill(sk);
          }
        });
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isAutoHunting, currentSword, currentMonster, isFeverMode, autoSkillEnabled, skills]);

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
      {/* 10 Worlds Navigation Tabs */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-amber-400 flex items-center gap-1.5 font-mono">
            <Globe className="w-4 h-4" />
            <span>10대 월드별 전용 던전 선택</span>
          </span>
          <span className="text-neutral-500 text-[11px]">
            현재 월드: {currentWorldInfo.name} ({currentWorldInfo.subTitle})
          </span>
        </div>

        {/* World Tabs Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {WORLDS_DATA.map((w) => {
            const isSelected = selectedWorldTab === w.id;
            const isUnlocked = (stats.superRebirthCount || 0) >= w.requiredSuperRebirth;

            return (
              <button
                key={w.id}
                disabled={!isUnlocked}
                onClick={() => {
                  sound.playClick();
                  setSelectedWorldTab(w.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : isUnlocked
                    ? 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-50'
                }`}
              >
                <span>W{w.id}</span>
                <span>{w.name.split(' ')[0]}</span>
                {!isUnlocked && <span className="text-[10px] text-rose-500">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Selector & Auto Hunt Controls */}
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

        {/* Recommended ATK & Controls */}
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono bg-neutral-950 px-2.5 py-1.5 rounded border border-neutral-800 flex items-center gap-1">
            <span className="text-neutral-400">권장:</span>
            <span className="font-bold text-amber-400">{currentStage.recommendedAtk.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setAutoSkillEnabled(!autoSkillEnabled);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
              autoSkillEnabled
                ? 'bg-purple-950 border-purple-500 text-purple-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
            title="스킬 자동 시전 토글"
          >
            <span>스킬 자동: {autoSkillEnabled ? 'ON' : 'OFF'}</span>
          </button>

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

      {/* Main Battle Arena with Fever & Break Effects */}
      <div 
        className={`relative w-full h-84 sm:h-96 rounded-xl border-4 ${
          isFeverMode ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-pulse' : 'border-neutral-800'
        } bg-gradient-to-b ${currentStage.background} overflow-hidden shadow-2xl flex flex-col justify-between p-4 transition-all`}
      >
        {/* Fever Banner Overlay */}
        {isFeverMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500/90 text-neutral-950 font-extrabold px-4 py-0.5 rounded-full text-xs font-mono tracking-widest shadow-lg flex items-center gap-1.5 z-30 animate-bounce">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>🔥 FEVER MODE ON! (+300% 속도 & 100% 치명타) {feverTimer}s</span>
          </div>
        )}

        {/* Top Battle HUD */}
        <div className="relative z-10 w-full flex flex-col gap-2">
          {/* Progress & Weakness & Combo */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
            <span className="flex items-center gap-1.5 font-bold">
              <Skull className="w-4 h-4 text-rose-400" />
              <span>진행도: {monsterIndex < currentStage.monsterCount ? `${monsterIndex + 1} / ${currentStage.monsterCount}` : '👑 BOSS 레이드'}</span>
            </span>

            {/* Combo Gauge */}
            <div className="flex items-center gap-2 bg-neutral-950/80 px-2.5 py-1 rounded border border-neutral-700">
              <span className="text-[11px] text-amber-400 font-bold">COMBO: {comboCount}/100</span>
              <div className="w-16 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700">
                <div 
                  style={{ width: `${comboCount}%` }} 
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
                />
              </div>
            </div>

            {currentMonster?.elementWeakness && (
              <span className="text-[11px] bg-neutral-950/80 px-2 py-0.5 rounded border border-amber-500/60 text-amber-300">
                약점: {currentMonster.elementWeakness.toUpperCase()} (+50% 피해)
              </span>
            )}
          </div>

          {/* Monster HP Bar */}
          {currentMonster && (
            <div className="flex flex-col gap-1 bg-neutral-950/85 p-2.5 rounded-lg border border-neutral-700 backdrop-blur-sm">
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                <span className="text-rose-300 flex items-center gap-1.5">
                  {currentMonster.isBoss && <PixelIcon name="boss" size={16} className="animate-bounce" />}
                  {currentMonster.name}
                  {isBossStunned && (
                    <span className="text-[10px] bg-amber-400 text-neutral-950 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">
                      ⚡ STUN BREAK (피해 2배)
                    </span>
                  )}
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

        {/* Center Battle Field */}
        <div className="relative flex-1 flex items-center justify-around">
          {/* Hero Character with Equipped Sword & Active Sword Spirit Companion */}
          <div className={`relative flex flex-col items-center transition-transform ${heroAttackAnim ? 'translate-x-6 scale-110' : ''}`}>
            {/* Active Sword Spirit Companion Floating beside hero */}
            {activeSpirit && (
              <div className="absolute -top-12 -left-6 flex flex-col items-center animate-bounce z-20">
                <div 
                  style={{ backgroundColor: activeSpirit.avatarColor }}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-neutral-950 shadow-md"
                  title={activeSpirit.name}
                >
                  ✨
                </div>
                {spiritSpeech && (
                  <div className="absolute -top-8 left-6 bg-neutral-900 border border-amber-400 text-amber-200 text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-30 font-sans animate-fade-in">
                    {spiritSpeech}
                  </div>
                )}
              </div>
            )}

            {/* Pixel Knight */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-950 border-2 border-amber-400 rounded flex flex-col items-center justify-center shadow-lg relative">
              <PixelIcon name="shield" size={24} />
              <div className="absolute -top-2 -right-2">
                <PixelIcon name="sword" size={18} className="animate-pulse" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-300 mt-1 font-mono">
              +{currentSword.level} {currentSword.name}
            </span>
          </div>

          {/* Monster Canvas & Boss QTE Button */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Boss QTE Shield Break Interactive Button */}
            {bossQteActive && (
              <div className="absolute -top-10 z-30 flex flex-col items-center animate-bounce">
                <button
                  onClick={handleBossBreakClick}
                  className="bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-white cursor-pointer flex items-center gap-1.5 transform hover:scale-105 transition-transform"
                >
                  <ShieldAlert className="w-4 h-4 text-yellow-300 animate-spin" />
                  <span>⚡ [CRITICAL BREAK] 쉴드 파괴! ({bossQteTimer.toFixed(1)}s)</span>
                </button>
              </div>
            )}

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
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 bg-neutral-950/70 p-2 rounded-lg backdrop-blur">
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
          <span className="text-neutral-400">처치 보상:</span>
          <span className="text-amber-300 font-bold">골드 + 강화석 + 영혼의 가루</span>
        </div>

        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center gap-2">
          <PixelIcon name="scroll" size={16} />
          <span className="text-neutral-400">보스 레이드:</span>
          <span className="text-purple-300 font-bold">다이아 + 보호서 + 성유물 파편</span>
        </div>

        <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex items-center gap-2">
          <PixelIcon name="sword" size={16} />
          <span className="text-neutral-400">현재 사냥 속도:</span>
          <span className="text-cyan-300 font-bold">
            {(currentSword.atkSpeed * (isFeverMode ? 2.5 : 1.0)).toFixed(1)} 회/초
          </span>
        </div>
      </div>
    </div>
  );
};
