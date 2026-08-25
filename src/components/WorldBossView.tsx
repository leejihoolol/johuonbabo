import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Skull, Zap, Flame, Sparkles, Play, Square, Award, Clock, 
  RotateCcw, Shield, Swords, Star, ChevronRight, Users, Compass,
  Move, Radio, Heart
} from 'lucide-react';
import { CosmicRelic, Monster, PartyRoom, PlayerStats, Sword, WorldBoss } from '../types';
import { WORLD_BOSSES_DATA, COSMIC_RELICS_DATA } from '../data/contentsData';
import { drawPixelMonster } from '../utils/pixelMonsterRenderer';
import { sound } from '../utils/sound';
import { calculateTotalMultipliers } from '../utils/worldSwordHelper';
import { PixelIcon } from './PixelIcon';
import { CinematicCutscene } from './CinematicCutscene';
import { dealPartyBossDamage, getOrCreatePlayerId } from '../utils/firebaseParty';

interface WorldBossViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  addLog: (text: string, type: 'success' | 'fail' | 'destroy' | 'drop' | 'loot' | 'system' | 'boss') => void;
  onOpenPartyModal?: (target: {
    type: 'world_boss';
    id: string;
    title: string;
    bossHp: number;
    bossMaxHp: number;
    bossName: string;
    bossSpriteType?: any;
    bossColor?: string;
  }) => void;
  activePartyRoom?: PartyRoom | null;
}

interface AttackTelegraph {
  id: number;
  type: 'circle' | 'line' | 'nova' | 'orb';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  maxRadius?: number;
  durationMs: number;
  createdAt: number;
  isExploded?: boolean;
  damage: number;
}

export const WorldBossView: React.FC<WorldBossViewProps> = ({
  stats,
  currentSword,
  onUpdateStats,
  addLog,
  onOpenPartyModal,
  activePartyRoom,
}) => {
  const [selectedBossIndex, setSelectedBossIndex] = useState(0);
  const bossData = WORLD_BOSSES_DATA[selectedBossIndex] || WORLD_BOSSES_DATA[0];

  // Raid Active States
  const [isRaidActive, setIsRaidActive] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [raidTimeRemaining, setRaidTimeRemaining] = useState(60);
  const [currentBossHp, setCurrentBossHp] = useState(bossData.maxHp);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [dps, setDps] = useState(0);
  const [combo, setCombo] = useState(0);

  // Player in-arena stats
  const [playerHp, setPlayerHp] = useState(1000);
  const [playerMaxHp] = useState(1000);
  const [playerPos, setPlayerPos] = useState({ x: 250, y: 360 });
  const [isDashing, setIsDashing] = useState(false);
  const [dashCooldown, setDashCooldown] = useState(0);
  const [slashCooldown, setSlashCooldown] = useState(0);

  // Cutscenes
  const [showIntroCutscene, setShowIntroCutscene] = useState(false);
  const [showVictoryCutscene, setShowVictoryCutscene] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState<any>(null);

  // Sub Tabs
  const [activeTab, setActiveTab] = useState<'raid' | 'relics'>('raid');

  // Virtual Joystick & Input Refs
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const isHitRef = useRef(false);
  const damageTrackerRef = useRef<number[]>([]);
  const nextPatternId = useRef(0);
  const telegraphsRef = useRef<AttackTelegraph[]>([]);
  const moveDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const playerUid = getOrCreatePlayerId();

  useEffect(() => {
    isHitRef.current = isHit;
  }, [isHit]);

  // Joystick touch tracking
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isTouchActive, setIsTouchActive] = useState(false);
  const joystickBaseRef = useRef<{ startX: number; startY: number } | null>(null);

  // Sync boss HP on selection
  useEffect(() => {
    if (!isRaidActive) {
      setCurrentBossHp(bossData.maxHp);
      setPlayerHp(playerMaxHp);
    }
  }, [selectedBossIndex, isRaidActive, playerMaxHp]);

  // Sync Party Boss HP if in active party
  useEffect(() => {
    if (activePartyRoom && activePartyRoom.status === 'battling') {
      if (activePartyRoom.targetType === 'world_boss') {
        const foundIdx = WORLD_BOSSES_DATA.findIndex((b) => b.id === activePartyRoom.targetId);
        if (foundIdx >= 0) setSelectedBossIndex(foundIdx);
        setCurrentBossHp(activePartyRoom.bossHp);
        setIsRaidActive(true);

        if (activePartyRoom.bossHp <= 0) {
          finishRaid(true);
        }
      }
    }
  }, [activePartyRoom]);

  // Keyboard Controller (WASD & Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleDash();
      }
      if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'z') {
        handleManualSlash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dashCooldown, slashCooldown, isRaidActive]);

  // Movement & Game Loop (60 FPS)
  useEffect(() => {
    if (!isRaidActive) return;

    let animId: number;
    const canvas = canvasRef.current;
    const arena = arenaRef.current;

    const gameLoop = () => {
      frameRef.current += 1;
      const now = Date.now();

      // 1. Calculate keyboard movement
      let dx = 0;
      let dy = 0;
      const keys = keysPressedRef.current;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      // Add joystick input
      if (moveDirectionRef.current.x !== 0 || moveDirectionRef.current.y !== 0) {
        dx += moveDirectionRef.current.x;
        dy += moveDirectionRef.current.y;
      }

      // Normalize speed
      const speed = isDashing ? 8 : 4;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        dx = (dx / length) * speed;
        dy = (dy / length) * speed;
      }

      // Update player position with boundaries
      setPlayerPos((prev) => {
        const maxX = canvas ? canvas.width - 24 : 500;
        const maxY = canvas ? canvas.height - 24 : 450;
        const nextX = Math.max(24, Math.min(maxX, prev.x + dx));
        const nextY = Math.max(120, Math.min(maxY, prev.y + dy));
        return { x: nextX, y: nextY };
      });

      // 2. Boss Attack Pattern Generator (Every 2.5 ~ 4 seconds)
      if (frameRef.current % 120 === 0 && canvas) {
        sound.playWarning?.();
        const patternType = Math.random() < 0.4 ? 'circle' : Math.random() < 0.7 ? 'line' : 'nova';
        const newTelegraph: AttackTelegraph = {
          id: ++nextPatternId.current,
          type: patternType,
          x: patternType === 'circle' ? Math.random() * (canvas.width - 80) + 40 : canvas.width / 2,
          y: patternType === 'circle' ? Math.random() * (canvas.height - 180) + 140 : canvas.height / 2,
          radius: patternType === 'circle' ? 45 : 20,
          maxRadius: patternType === 'nova' ? canvas.width * 0.6 : 50,
          durationMs: 1400,
          createdAt: now,
          damage: 180,
        };
        telegraphsRef.current.push(newTelegraph);
      }

      // 3. Update Telegraphs & Check Collision
      const activeTelegraphs: AttackTelegraph[] = [];
      telegraphsRef.current.forEach((tel) => {
        const age = now - tel.createdAt;
        if (age < tel.durationMs + 300) {
          activeTelegraphs.push(tel);

          // Check if exploding
          if (age >= tel.durationMs && !tel.isExploded) {
            tel.isExploded = true;
            sound.playWarning();

            // Collision check with player
            if (!isDashing) {
              const dist = Math.sqrt(Math.pow(playerPos.x - tel.x, 2) + Math.pow(playerPos.y - tel.y, 2));
              if (dist <= tel.radius + 15) {
                // Player hit!
                sound.playFail();
                setPlayerHp((hp) => Math.max(10, hp - tel.damage));
                setCombo(0);
              } else {
                // Successfully dodged!
                setCombo((c) => Math.min(999, c + 10));
              }
            }
          }
        }
      });
      telegraphsRef.current = activeTelegraphs;

      // 4. Render Arena Canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw Arena Grid / Cosmic Floor
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          const gridSize = 40;
          for (let gx = 0; gx < canvas.width; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, canvas.height);
            ctx.stroke();
          }
          for (let gy = 0; gy < canvas.height; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(canvas.width, gy);
            ctx.stroke();
          }

          // Draw Telegraph Danger Zones
          telegraphsRef.current.forEach((tel) => {
            const progress = Math.min(1, (now - tel.createdAt) / tel.durationMs);

            ctx.save();
            if (tel.type === 'circle') {
              // Red warning circle
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
              ctx.fillStyle = tel.isExploded ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.25)';
              ctx.fill();
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Expanding charge inner circle
              if (!tel.isExploded) {
                ctx.beginPath();
                ctx.arc(tel.x, tel.y, tel.radius * progress, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.fill();
              }
            } else if (tel.type === 'line') {
              // Sweeping horizontal danger beam
              const beamY = tel.y;
              ctx.fillStyle = tel.isExploded ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.25)';
              ctx.fillRect(0, beamY - 25, canvas.width, 50);
              ctx.strokeStyle = '#f59e0b';
              ctx.strokeRect(0, beamY - 25, canvas.width, 50);
            } else if (tel.type === 'nova') {
              // Expanding Nova Ring
              const currentRadius = (tel.maxRadius || 100) * progress;
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, currentRadius, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
              ctx.lineWidth = 4;
              ctx.stroke();
            }
            ctx.restore();
          });

          // Draw Boss Sprite at top center
          const fakeBossMonster: Monster = {
            id: bossData.id,
            name: bossData.name,
            maxHp: bossData.maxHp,
            currentHp: currentBossHp,
            atk: 999999,
            defense: bossData.defense,
            goldReward: 0,
            stoneReward: 0,
            expReward: 0,
            isBoss: true,
            spriteType: bossData.spriteType,
            color: bossData.color,
          };
          drawPixelMonster(ctx, fakeBossMonster, canvas.width, 160, frameRef.current, isHitRef.current);

          // Draw Player Pixel Character in Arena
          ctx.save();
          ctx.translate(playerPos.x, playerPos.y);

          // Dash Afterimage or Aura
          if (isDashing) {
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.fill();
          }

          // Player Sword Aura
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fillStyle = currentSword.colorTheme?.blade || '#60a5fa';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Player Head / Emoji
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stats.playerAvatar || '⚔️', 0, 0);

          // Player Name Tag & Sword Level
          ctx.font = '10px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`+${stats.currentSwordLevel}`, 0, -22);

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isRaidActive, isDashing, currentSword, bossData, currentBossHp, playerPos]);

  // Dash Action (회피 대시)
  const handleDash = () => {
    if (dashCooldown > 0 || isDashing || !isRaidActive) return;
    setIsDashing(true);
    setDashCooldown(1.5);
    sound.playSuccess();

    setTimeout(() => {
      setIsDashing(false);
    }, 350);

    const cdInterval = setInterval(() => {
      setDashCooldown((cd) => {
        if (cd <= 0.1) {
          clearInterval(cdInterval);
          return 0;
        }
        return cd - 0.1;
      });
    }, 100);
  };

  // Compute Attack Damage
  const computeDamage = () => {
    const multipliers = calculateTotalMultipliers(stats);
    let baseAtk = currentSword.atk * multipliers.totalAtkMult;

    // Relic Bonuses
    const relics = stats.cosmicRelics || COSMIC_RELICS_DATA;
    const emberRelic = relics.find((r) => r.id === 'relic_sun_ember');
    if (emberRelic && emberRelic.level > 0) {
      baseAtk *= 1 + (emberRelic.currentValue || 0) / 100;
    }

    // Critical Hit calculation
    const isCrit = Math.random() * 100 < currentSword.critRate;
    if (isCrit) {
      baseAtk *= currentSword.critDmg / 100;
    }

    // Combo multiplier (+1% per 10 combo)
    const comboMult = 1 + (combo / 1000);
    baseAtk *= comboMult;

    // Defense reduction
    const finalDmg = Math.max(1, Math.floor(baseAtk - bossData.defense * 0.3));
    return { finalDmg, isCrit };
  };

  // Manual Slash Button Attack
  const handleManualSlash = () => {
    if (!isRaidActive) return;
    const { finalDmg } = computeDamage();
    const bonusSlashDmg = Math.floor(finalDmg * 1.5);

    setIsHit(true);
    setTimeout(() => setIsHit(false), 90);
    sound.playSlash();

    damageTrackerRef.current.push(bonusSlashDmg);
    setTotalDamageDealt((prev) => prev + bonusSlashDmg);
    setCombo((c) => c + 1);

    setCurrentBossHp((prev) => {
      const next = Math.max(0, prev - bonusSlashDmg);
      if (next <= 0) {
        finishRaid(true);
        return 0;
      }
      return next;
    });

    if (activePartyRoom && activePartyRoom.status === 'battling') {
      dealPartyBossDamage(activePartyRoom.id, playerUid, bonusSlashDmg, playerHp);
    }
  };

  // Auto Attack Loop (Tick based on attack speed)
  useEffect(() => {
    if (!isRaidActive) return;
    const attackSpeed = currentSword.atkSpeed;
    const intervalMs = Math.max(150, Math.floor(1000 / attackSpeed));

    const combatTimer = setInterval(() => {
      const { finalDmg } = computeDamage();

      setIsHit(true);
      setTimeout(() => setIsHit(false), 90);
      sound.playSlash();

      damageTrackerRef.current.push(finalDmg);
      setTotalDamageDealt((prev) => prev + finalDmg);

      setCurrentBossHp((prev) => {
        const next = Math.max(0, prev - finalDmg);
        if (next <= 0) {
          clearInterval(combatTimer);
          finishRaid(true);
          return 0;
        }
        return next;
      });

      if (activePartyRoom && activePartyRoom.status === 'battling') {
        dealPartyBossDamage(activePartyRoom.id, playerUid, finalDmg, playerHp);
      }
    }, intervalMs);

    return () => clearInterval(combatTimer);
  }, [isRaidActive, currentSword, stats, bossData, activePartyRoom, combo]);

  // Raid Countdown Timer
  useEffect(() => {
    if (!isRaidActive) return;
    const timer = setInterval(() => {
      setRaidTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishRaid(false);
          return 0;
        }
        return prev - 1;
      });

      // Calculate DPS
      const recentDmgs = damageTrackerRef.current;
      const sum = recentDmgs.reduce((a, b) => a + b, 0);
      setDps(sum);
      damageTrackerRef.current = [];
    }, 1000);

    return () => clearInterval(timer);
  }, [isRaidActive]);

  // Start Raid Trigger (Shows Intro Cutscene first)
  const handleInitiateRaid = () => {
    setShowIntroCutscene(true);
  };

  const startActualRaid = () => {
    sound.playBossRoar();
    setCurrentBossHp(bossData.maxHp);
    setPlayerHp(playerMaxHp);
    setTotalDamageDealt(0);
    setRaidTimeRemaining(bossData.timeLimit);
    setIsRaidActive(true);
    setCombo(0);
    damageTrackerRef.current = [];
    telegraphsRef.current = [];
    addLog(`[월드 보스] '${bossData.name}' 대토벌 레이드가 시작되었습니다!`, 'boss');
  };

  // Finish Raid & Trigger Victory Cutscene
  const finishRaid = (isBossSlain = false) => {
    setIsRaidActive(false);
    sound.playSuccess(true);

    let tokens = 100;
    let dust = 200;
    const hpDmgRatio = (bossData.maxHp - currentBossHp) / bossData.maxHp;

    if (isBossSlain || hpDmgRatio >= 1.0) {
      tokens = 600;
      dust = 1200;
    } else if (hpDmgRatio >= 0.7) {
      tokens = 400;
      dust = 700;
    } else if (hpDmgRatio >= 0.4) {
      tokens = 250;
      dust = 450;
    } else {
      tokens = 150;
      dust = 250;
    }

    if (activePartyRoom) {
      tokens = Math.floor(tokens * 1.5);
      dust = Math.floor(dust * 1.5);
    }

    onUpdateStats((prev) => ({
      ...prev,
      worldBossHighScore: Math.max(prev.worldBossHighScore || 0, totalDamageDealt),
      worldBossRaidTokens: (prev.worldBossRaidTokens || 0) + tokens,
      spiritDust: (prev.spiritDust || 0) + dust,
      diamonds: prev.diamonds + tokens * 10,
    }));

    setVictoryRewards({
      tokens,
      dust,
      diamonds: tokens * 10,
      gold: tokens * 5000,
      partyBonus: !!activePartyRoom,
    });

    setShowVictoryCutscene(true);
  };

  // Touch Virtual Joystick Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickBaseRef.current = { startX: touch.clientX, startY: touch.clientY };
    setIsTouchActive(true);
    setJoystickPos({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickBaseRef.current.startX;
    const dy = touch.clientY - joystickBaseRef.current.startY;
    const maxDist = 45;
    const dist = Math.min(maxDist, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * dist;
    const clampedY = Math.sin(angle) * dist;

    setJoystickPos({ x: clampedX, y: clampedY });
    moveDirectionRef.current = {
      x: clampedX / maxDist,
      y: clampedY / maxDist,
    };
  };

  const handleTouchEnd = () => {
    joystickBaseRef.current = null;
    setIsTouchActive(false);
    setJoystickPos({ x: 0, y: 0 });
    moveDirectionRef.current = { x: 0, y: 0 };
  };

  // Upgrade Cosmic Relic
  const handleUpgradeRelic = (relicId: string) => {
    const relics = stats.cosmicRelics || COSMIC_RELICS_DATA;
    const relic = relics.find((r) => r.id === relicId);
    if (!relic) return;

    const currentTokens = stats.worldBossRaidTokens || 0;
    if (currentTokens < relic.costTokens) {
      sound.playFail();
      addLog('[성유물 연성] 레이드 토큰이 부족합니다.', 'fail');
      return;
    }

    if (relic.level >= relic.maxLevel) {
      addLog('[성유물 연성] 이미 최대 레벨에 도달한 성유물입니다.', 'fail');
      return;
    }

    sound.playSuccess(true);
    onUpdateStats((prev) => {
      const updatedRelics = (prev.cosmicRelics || COSMIC_RELICS_DATA).map((r) => {
        if (r.id === relicId) {
          const nextLevel = r.level + 1;
          return {
            ...r,
            level: nextLevel,
            currentValue: nextLevel * r.baseValue,
            costTokens: Math.floor(r.costTokens * 1.6),
          };
        }
        return r;
      });

      return {
        ...prev,
        worldBossRaidTokens: (prev.worldBossRaidTokens || 0) - relic.costTokens,
        cosmicRelics: updatedRelics,
      };
    });

    addLog(`[성유물 승급] ✨ '${relic.name}'이(가) Lv.${relic.level + 1}로 각성하였습니다!`, 'loot');
  };

  const hpPercent = Math.max(0, Math.min(100, (currentBossHp / bossData.maxHp) * 100));

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Intro Cutscene */}
      {showIntroCutscene && (
        <CinematicCutscene
          type="intro"
          title="월드 보스 코스믹 대토벌"
          bossName={bossData.name}
          bossThemeColor={bossData.color}
          description={`${bossData.description} — 조이스틱으로 보스의 장판 공격을 회피하며 참격을 가하세요!`}
          onComplete={() => {
            setShowIntroCutscene(false);
            startActualRaid();
          }}
          onSkip={() => {
            setShowIntroCutscene(false);
            startActualRaid();
          }}
        />
      )}

      {/* Victory Cutscene */}
      {showVictoryCutscene && (
        <CinematicCutscene
          type="victory"
          title={`월드 보스 [${bossData.name}] 토벌 완수!`}
          subtitle="모든 공격 패턴을 극복하고 초월적 신성을 물리쳐 막대한 보상을 거두었습니다."
          rewards={victoryRewards}
          partyMembers={activePartyRoom ? Object.values(activePartyRoom.members) : undefined}
          onComplete={() => {
            setShowVictoryCutscene(false);
          }}
        />
      )}

      {/* Top Header */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-500 flex items-center justify-center text-red-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-red-400 flex items-center gap-2">
              <span>월드 보스 대토벌 (World Boss Raid Arena)</span>
              <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-600 font-mono">
                토큰: {(stats.worldBossRaidTokens || 0).toLocaleString()}개
              </span>
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              화면의 조이스틱 또는 키보드(WASD/방향키)로 보스 공격을 피하며 참격을 가하세요!
            </p>
          </div>
        </div>

        {/* Subtab Toggle & Party Matching Button */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPartyModal && (
            <button
              onClick={() =>
                onOpenPartyModal({
                  type: 'world_boss',
                  id: bossData.id,
                  title: `월드 보스 [${bossData.name}]`,
                  bossHp: bossData.maxHp,
                  bossMaxHp: bossData.maxHp,
                  bossName: bossData.name,
                  bossSpriteType: bossData.spriteType,
                  bossColor: bossData.color,
                })
              }
              className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500 text-xs font-bold rounded-lg text-red-200 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>파티 매칭 (Co-op)</span>
            </button>
          )}

          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setActiveTab('raid')}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                activeTab === 'raid' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              보스 전투 아레나
            </button>
            <button
              onClick={() => setActiveTab('relics')}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                activeTab === 'relics' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              고대 성유물
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab: Real-time Arena Battle */}
      {activeTab === 'raid' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Boss Select List (Left 3 cols on PC) */}
          <div className="lg:col-span-3 bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-neutral-300 border-b border-neutral-800 pb-2">
              초월적 월드 보스 선택
            </h3>
            <div className="flex flex-col gap-2">
              {WORLD_BOSSES_DATA.map((boss, idx) => (
                <button
                  key={boss.id}
                  disabled={isRaidActive}
                  onClick={() => setSelectedBossIndex(idx)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    selectedBossIndex === idx
                      ? 'border-red-500 bg-red-950/60 ring-2 ring-red-500/40'
                      : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{boss.name}</span>
                    <span className="text-[10px] text-red-400 font-mono">Lv.???</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    HP: {boss.maxHp.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Battle Controller Help / PC Controls */}
            <div className="mt-auto bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[11px] text-neutral-400 font-sans space-y-1">
              <div className="font-bold text-neutral-300 text-xs mb-1">🎮 조작 가이드:</div>
              <div>• <strong>PC</strong>: WASD 또는 방향키 이동, Space 회피, Z/J 참격</div>
              <div>• <strong>모바일</strong>: 하단 좌측 조이스틱 + 우측 회피/공격 버튼</div>
              <div>• 장판 위험 구역에서 벗어나면 콤보 상승!</div>
            </div>
          </div>

          {/* Large Screen Arena Field (9 cols on PC, full on mobile) */}
          <div
            ref={arenaRef}
            className="lg:col-span-9 bg-neutral-950 border-2 border-red-600/60 rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 shadow-2xl relative overflow-hidden min-h-[520px]"
          >
            {/* Top HUD: Boss Health & Time & Combo */}
            <div className="flex flex-col gap-2 z-10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs bg-red-950 border border-red-600 text-red-300 px-2 py-0.5 rounded font-mono font-bold">
                    {bossData.name}
                  </span>
                  <span className="text-xs text-amber-400 font-bold ml-2 font-mono">
                    DPS: {dps.toLocaleString()} | 콤보: {combo} Hit
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Player HP */}
                  <div className="flex items-center gap-1.5 text-xs bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-700">
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                    <span className="font-mono text-neutral-200">{playerHp} / {playerMaxHp}</span>
                  </div>

                  {isRaidActive && (
                    <div className="text-xs font-mono font-bold bg-red-950 text-yellow-300 border border-red-600 px-3 py-1 rounded-lg">
                      ⏱️ {raidTimeRemaining}s
                    </div>
                  )}
                </div>
              </div>

              {/* Boss HP Bar */}
              <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">보스 잔여 체력</span>
                  <span className="text-red-400 font-bold">
                    {currentBossHp.toLocaleString()} / {bossData.maxHp.toLocaleString()} ({Math.round(hpPercent)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-100"
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Arena Canvas (Big Immersive Battlefield) */}
            <div className="relative flex-1 w-full min-h-[340px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={420}
                className="w-full h-full object-cover"
              />

              {!isRaidActive && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
                  <Skull className="w-16 h-16 text-red-500 mb-3 animate-pulse" />
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {bossData.name} 결전 준비 완료
                  </h2>
                  <p className="text-xs text-neutral-400 max-w-md mb-6 font-sans">
                    60초 동안 보스의 패턴을 회피하며 최대 피해를 누적시키세요.
                  </p>
                  <button
                    onClick={handleInitiateRaid}
                    className="px-8 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm sm:text-base rounded-xl border-2 border-amber-400 shadow-xl shadow-red-950 cursor-pointer flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <Play className="w-5 h-5" />
                    <span>레이드 아레나 입장 (START RAID)</span>
                  </button>
                </div>
              )}

              {/* On-Screen Mobile Virtual Joystick Area */}
              {isRaidActive && (
                <div
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="absolute bottom-4 left-4 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-neutral-900/60 border-2 border-neutral-700/80 flex items-center justify-center select-none touch-none z-30"
                >
                  <div
                    className="w-12 h-12 rounded-full bg-red-600/80 border-2 border-amber-400 shadow-lg flex items-center justify-center pointer-events-none transition-transform"
                    style={{
                      transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    }}
                  >
                    <Move className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              {/* On-Screen Action Buttons (Right side) */}
              {isRaidActive && (
                <div className="absolute bottom-4 right-4 flex items-center gap-3 z-30">
                  {/* Dash Button */}
                  <button
                    onClick={handleDash}
                    disabled={dashCooldown > 0}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-bold text-xs sm:text-sm flex flex-col items-center justify-center border-2 shadow-xl cursor-pointer transition-all active:scale-90 ${
                      dashCooldown > 0
                        ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                        : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-300 shadow-blue-950'
                    }`}
                  >
                    <Shield className="w-5 h-5 mb-0.5" />
                    <span>{dashCooldown > 0 ? `${dashCooldown.toFixed(1)}s` : '회피'}</span>
                  </button>

                  {/* Manual Slash Attack Button */}
                  <button
                    onClick={handleManualSlash}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center border-2 border-amber-300 shadow-2xl shadow-red-950 cursor-pointer transition-all active:scale-90"
                  >
                    <Swords className="w-6 h-6 mb-0.5 animate-pulse" />
                    <span>참격!</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Cosmic Relics */}
      {activeTab === 'relics' && (
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>고대 성유물 보관소 (Cosmic Relics)</span>
              </h3>
              <p className="text-xs text-neutral-400 font-sans">
                월드 보스 토벌을 통해 획득한 레이드 토큰으로 성유물을 승급하여 영구적인 능력치를 개방하세요!
              </p>
            </div>
            <div className="text-xs bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg text-amber-300 font-bold font-mono">
              보유 토큰: {(stats.worldBossRaidTokens || 0).toLocaleString()}개
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(stats.cosmicRelics || COSMIC_RELICS_DATA).map((relic) => {
              const currentTokens = stats.worldBossRaidTokens || 0;
              const canAfford = currentTokens >= relic.costTokens && relic.level < relic.maxLevel;

              return (
                <div
                  key={relic.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{relic.name}</span>
                        <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-600 font-mono">
                          Lv.{relic.level} / {relic.maxLevel}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-sans">{relic.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <div className="text-xs font-mono">
                      <span className="text-neutral-400">현재 효과: </span>
                      <strong className="text-amber-400">+{relic.currentValue || 0}%</strong>
                    </div>

                    <button
                      onClick={() => handleUpgradeRelic(relic.id)}
                      disabled={!canAfford}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {relic.level >= relic.maxLevel
                          ? '최대 레벨'
                          : `승급 (${relic.costTokens.toLocaleString()} 토큰)`}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
