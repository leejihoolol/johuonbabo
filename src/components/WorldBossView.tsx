import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Skull, Zap, Flame, Sparkles, Play, Square, Award, Clock, 
  RotateCcw, Shield, Swords, Star, ChevronRight, Users, Compass,
  Move, Radio, Heart, ShieldAlert, AlertTriangle, Eye
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
  type: 'circle' | 'line_h' | 'line_v' | 'rotating_beam' | 'nova_ring' | 'blackhole' | 'bullet' | 'safe_zone_qte';
  name: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  vx?: number;
  vy?: number;
  radius: number;
  maxRadius?: number;
  angle?: number;
  rotSpeed?: number;
  length?: number;
  thickness?: number;
  durationMs: number;
  createdAt: number;
  isExploded?: boolean;
  damage: number;
  color?: string;
}

interface DamageNumber {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
  isCrit?: boolean;
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

  // Boss Break (Groggy) & Phase 2 System
  const [breakGauge, setBreakGauge] = useState(0);
  const [isBossGroggy, setIsBossGroggy] = useState(false);
  const [isPhase2, setIsPhase2] = useState(false);

  // Ultimate Sword Burst Gauge (0 ~ 100)
  const [ultimateGauge, setUltimateGauge] = useState(0);
  const [isUltimateActive, setIsUltimateActive] = useState(false);

  // Time Stop QTE for Chronos
  const [timeStopQteActive, setTimeStopQteActive] = useState(false);
  const [timeStopQteEnd, setTimeStopQteEnd] = useState(0);

  // Player in-arena stats
  const [playerHp, setPlayerHp] = useState(1000);
  const [playerMaxHp] = useState(1000);
  const [potionsCount, setPotionsCount] = useState(3);
  const [playerPos, setPlayerPos] = useState({ x: 350, y: 340 });
  const [isDashing, setIsDashing] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const [dashCooldown, setDashCooldown] = useState(0);
  const [slashCooldown, setSlashCooldown] = useState(0);
  const [screenShake, setScreenShake] = useState(0);

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
  const damageNumbersRef = useRef<DamageNumber[]>([]);
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
      setBreakGauge(0);
      setIsBossGroggy(false);
      setIsPhase2(false);
      setUltimateGauge(0);
      setPotionsCount(3);
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

  // Keyboard Controller (WASD & Arrow Keys & Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;

      // Dash / Parry
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleDash();
      }
      // Manual Slash
      if (key === 'j' || key === 'z') {
        handleManualSlash();
      }
      // Ultimate Burst
      if (key === 'r' || key === 'x') {
        handleUltimateBurst();
      }
      // Health Potion
      if (key === 'q' || key === 'c') {
        handleUsePotion();
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
  }, [dashCooldown, slashCooldown, isRaidActive, ultimateGauge, potionsCount, timeStopQteActive]);

  // Spawn Floating Damage Text
  const spawnDamageNumber = (text: string, x: number, y: number, color: string, isCrit = false) => {
    damageNumbersRef.current.push({
      id: Date.now() + Math.random(),
      text,
      x: x + (Math.random() * 30 - 15),
      y: y + (Math.random() * 20 - 10),
      color,
      createdAt: Date.now(),
      isCrit,
    });
  };

  // Phase 2 Enrage Check
  useEffect(() => {
    if (isRaidActive && !isPhase2 && currentBossHp <= bossData.maxHp * 0.5) {
      setIsPhase2(true);
      sound.playBossRoar?.();
      setScreenShake(15);
      addLog(`🔥 [광폭화 각성] '${bossData.name}'이(가) 분노하여 공격 패턴이 대폭 강화됩니다!`, 'boss');
    }
  }, [currentBossHp, isRaidActive, isPhase2, bossData]);

  // Movement & Game Loop (60 FPS)
  useEffect(() => {
    if (!isRaidActive) return;

    let animId: number;
    const canvas = canvasRef.current;

    const gameLoop = () => {
      frameRef.current += 1;
      const now = Date.now();
      const isSlowMotion = timeStopQteActive;

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
      const baseSpeed = isDashing ? 9 : 4.5;
      const finalSpeed = isSlowMotion ? baseSpeed * 0.3 : baseSpeed;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        dx = (dx / length) * finalSpeed;
        dy = (dy / length) * finalSpeed;
      }

      // Update player position with boundaries
      setPlayerPos((prev) => {
        const maxX = canvas ? canvas.width - 30 : 670;
        const maxY = canvas ? canvas.height - 30 : 390;
        const nextX = Math.max(30, Math.min(maxX, prev.x + dx));
        const nextY = Math.max(140, Math.min(maxY, prev.y + dy));
        return { x: nextX, y: nextY };
      });

      // 2. Boss Attack Pattern Generator (Every 2.0 ~ 3.5s, faster in Phase 2)
      const patternInterval = isPhase2 ? 80 : 120;
      if (frameRef.current % patternInterval === 0 && canvas && !isBossGroggy && !timeStopQteActive) {
        sound.playWarning?.();
        const bossId = bossData.id;

        // ================= A. SOLARIS PATTERNS =================
        if (bossId === 'wb_solaris') {
          const rand = Math.random();
          if (rand < 0.35) {
            // 1. Solar Flare Beams (Rotating 3-beam star)
            telegraphsRef.current.push({
              id: ++nextPatternId.current,
              type: 'rotating_beam',
              name: '초열의 플레어 회전 빔',
              x: canvas.width / 2,
              y: 110,
              radius: 20,
              angle: 0,
              rotSpeed: 0.025,
              length: canvas.width * 0.7,
              thickness: 24,
              durationMs: 2200,
              createdAt: now,
              damage: 220,
              color: '#ea580c',
            });
          } else if (rand < 0.7) {
            // 2. Sunspot Eruptions (Multiple Ground explosions)
            for (let i = 0; i < (isPhase2 ? 4 : 3); i++) {
              telegraphsRef.current.push({
                id: ++nextPatternId.current,
                type: 'circle',
                name: '태양 흑점 폭발',
                x: Math.random() * (canvas.width - 120) + 60,
                y: Math.random() * (canvas.height - 180) + 150,
                radius: 48,
                durationMs: 1500 + i * 200,
                createdAt: now,
                damage: 200,
                color: '#ef4444',
              });
            }
          } else {
            // 3. Solar Meteors Targetting Player
            for (let m = 0; m < (isPhase2 ? 3 : 2); m++) {
              setTimeout(() => {
                if (!canvasRef.current) return;
                telegraphsRef.current.push({
                  id: ++nextPatternId.current,
                  type: 'circle',
                  name: '태양 운석 투하',
                  x: playerPos.x + (Math.random() * 40 - 20),
                  y: playerPos.y + (Math.random() * 40 - 20),
                  radius: 42,
                  durationMs: 1200,
                  createdAt: Date.now(),
                  damage: 250,
                  color: '#f59e0b',
                });
              }, m * 400);
            }
          }
        }

        // ================= B. LEVIATHAN PATTERNS =================
        else if (bossId === 'wb_leviathan') {
          const rand = Math.random();
          if (rand < 0.35) {
            // 1. Abyssal Tentacle Slams (Horizontal / Vertical Bars)
            const isHoriz = Math.random() > 0.5;
            telegraphsRef.current.push({
              id: ++nextPatternId.current,
              type: isHoriz ? 'line_h' : 'line_v',
              name: '심연의 거대 촉수 강타',
              x: isHoriz ? canvas.width / 2 : playerPos.x,
              y: isHoriz ? playerPos.y : canvas.height / 2,
              radius: 20,
              thickness: 55,
              durationMs: 1400,
              createdAt: now,
              damage: 240,
              color: '#9333ea',
            });
          } else if (rand < 0.7) {
            // 2. Void Black Hole Pull
            telegraphsRef.current.push({
              id: ++nextPatternId.current,
              type: 'blackhole',
              name: '공허의 블랙홀 중력장',
              x: canvas.width / 2,
              y: canvas.height / 2 + 50,
              radius: 90,
              durationMs: 3000,
              createdAt: now,
              damage: 180,
              color: '#3b0764',
            });
          } else {
            // 3. Void Nova Waves
            telegraphsRef.current.push({
              id: ++nextPatternId.current,
              type: 'nova_ring',
              name: '차원 분열 암흑 파동',
              x: canvas.width / 2,
              y: 110,
              radius: 20,
              maxRadius: canvas.width * 0.75,
              thickness: 28,
              durationMs: 1800,
              createdAt: now,
              damage: 220,
              color: '#7e22ce',
            });
          }
        }

        // ================= C. CHRONOS PATTERNS =================
        else {
          const rand = Math.random();
          if (rand < 0.3) {
            // 1. Chronos Blade Cross (4-way rotating laser)
            telegraphsRef.current.push({
              id: ++nextPatternId.current,
              type: 'rotating_beam',
              name: '시공간 십자 참격 레이저',
              x: canvas.width / 2,
              y: canvas.height / 2 + 30,
              radius: 20,
              angle: 0,
              rotSpeed: 0.035,
              length: canvas.width * 0.65,
              thickness: 22,
              durationMs: 2500,
              createdAt: now,
              damage: 260,
              color: '#d97706',
            });
          } else if (rand < 0.65) {
            // 2. Gear Barrage Bullets
            for (let g = 0; g < 8; g++) {
              const ang = (g * Math.PI * 2) / 8 + (frameRef.current * 0.05);
              telegraphsRef.current.push({
                id: ++nextPatternId.current,
                type: 'bullet',
                name: '운명의 톱니바퀴 탄막',
                x: canvas.width / 2,
                y: 120,
                vx: Math.cos(ang) * 3.5,
                vy: Math.sin(ang) * 3.5,
                radius: 14,
                durationMs: 2800,
                createdAt: now,
                damage: 160,
                color: '#fbbf24',
              });
            }
          } else {
            // 3. Time Stop QTE Event! (Exciting Counter Trigger)
            if (!timeStopQteActive) {
              setTimeStopQteActive(true);
              setTimeStopQteEnd(now + 900);
              sound.playBossRoar?.();
              setScreenShake(8);
            }
          }
        }
      }

      // Check Time Stop QTE Expiry
      if (timeStopQteActive && now > timeStopQteEnd) {
        setTimeStopQteActive(false);
        // Failed QTE -> Player Takes Big Hit!
        if (!isInvincible && !isDashing) {
          sound.playFail?.();
          setPlayerHp((hp) => Math.max(10, hp - 300));
          setCombo(0);
          setScreenShake(12);
          spawnDamageNumber('TIME STOP HIT! -300', playerPos.x, playerPos.y, '#ef4444');
        }
      }

      // 3. Update Telegraphs & Hitbox Collision Math
      const activeTelegraphs: AttackTelegraph[] = [];
      telegraphsRef.current.forEach((tel) => {
        const age = now - tel.createdAt;

        // Update Moving Bullets
        if (tel.type === 'bullet' && tel.vx && tel.vy) {
          tel.x += tel.vx;
          tel.y += tel.vy;
        }

        // Update Rotating Beams
        if (tel.type === 'rotating_beam' && tel.rotSpeed) {
          tel.angle = (tel.angle || 0) + tel.rotSpeed;
        }

        // Handle Blackhole Pull
        if (tel.type === 'blackhole') {
          const bdx = tel.x - playerPos.x;
          const bdy = tel.y - playerPos.y;
          const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bDist < tel.radius * 2 && bDist > 10) {
            // Pull player towards blackhole
            setPlayerPos((p) => ({
              x: p.x + (bdx / bDist) * 1.5,
              y: p.y + (bdy / bDist) * 1.5,
            }));
          }
        }

        if (age < tel.durationMs + 200) {
          activeTelegraphs.push(tel);

          // Check Collision when active or exploding
          const isExploding = age >= tel.durationMs * 0.75;
          if (isExploding && !tel.isExploded) {
            let isPlayerHit = false;

            if (!isInvincible && !isDashing) {
              if (tel.type === 'circle') {
                const dist = Math.sqrt(Math.pow(playerPos.x - tel.x, 2) + Math.pow(playerPos.y - tel.y, 2));
                if (dist <= tel.radius + 14) isPlayerHit = true;
              } else if (tel.type === 'line_h') {
                if (Math.abs(playerPos.y - tel.y) <= (tel.thickness || 50) / 2 + 10) isPlayerHit = true;
              } else if (tel.type === 'line_v') {
                if (Math.abs(playerPos.x - tel.x) <= (tel.thickness || 50) / 2 + 10) isPlayerHit = true;
              } else if (tel.type === 'nova_ring') {
                const progress = age / tel.durationMs;
                const currentRad = (tel.maxRadius || 200) * progress;
                const dist = Math.sqrt(Math.pow(playerPos.x - tel.x, 2) + Math.pow(playerPos.y - tel.y, 2));
                if (Math.abs(dist - currentRad) <= (tel.thickness || 28) / 2 + 10) isPlayerHit = true;
              } else if (tel.type === 'rotating_beam') {
                const bdx = playerPos.x - tel.x;
                const bdy = playerPos.y - tel.y;
                const dist = Math.sqrt(bdx * bdx + bdy * bdy);
                if (dist <= (tel.length || 300)) {
                  const pAngle = Math.atan2(bdy, bdx);
                  const angleDiff = Math.abs(Math.sin(pAngle - (tel.angle || 0)));
                  if (angleDiff < 0.18) isPlayerHit = true;
                }
              } else if (tel.type === 'bullet') {
                const dist = Math.sqrt(Math.pow(playerPos.x - tel.x, 2) + Math.pow(playerPos.y - tel.y, 2));
                if (dist <= tel.radius + 12) isPlayerHit = true;
              } else if (tel.type === 'blackhole') {
                const dist = Math.sqrt(Math.pow(playerPos.x - tel.x, 2) + Math.pow(playerPos.y - tel.y, 2));
                if (dist <= tel.radius * 0.6) isPlayerHit = true;
              }
            }

            if (isPlayerHit) {
              tel.isExploded = true;
              sound.playFail?.();
              setPlayerHp((hp) => Math.max(10, hp - tel.damage));
              setCombo(0);
              setScreenShake(8);
              spawnDamageNumber(`-${tel.damage}`, playerPos.x, playerPos.y, '#ef4444');
            } else if (age >= tel.durationMs) {
              tel.isExploded = true;
              // Clean Dodge Bonus!
              setCombo((c) => Math.min(999, c + 5));
              setUltimateGauge((g) => Math.min(100, g + 8));
            }
          }
        }
      });
      telegraphsRef.current = activeTelegraphs;

      // 4. Render Arena Canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Screen Shake Transform
          if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
            setScreenShake((s) => Math.max(0, s - 1));
          }

          // Slow Motion / Time Stop Visual Grayscale overlay
          if (timeStopQteActive) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Cosmic Floor Grid
          ctx.strokeStyle = isPhase2 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1;
          const gridSize = 35;
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

          // Draw Attack Telegraphs
          telegraphsRef.current.forEach((tel) => {
            const progress = Math.min(1, (now - tel.createdAt) / tel.durationMs);
            ctx.save();

            const fillColor = tel.color || '#ef4444';

            if (tel.type === 'circle') {
              // Danger Circle
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
              ctx.fillStyle = tel.isExploded ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.2)';
              ctx.fill();
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = 2;
              ctx.stroke();

              // Charging Inner Circle
              if (!tel.isExploded) {
                ctx.beginPath();
                ctx.arc(tel.x, tel.y, tel.radius * progress, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.fill();
              }
            } else if (tel.type === 'line_h') {
              const th = tel.thickness || 50;
              ctx.fillStyle = tel.isExploded ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.25)';
              ctx.fillRect(0, tel.y - th / 2, canvas.width, th);
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = 2;
              ctx.strokeRect(0, tel.y - th / 2, canvas.width, th);
            } else if (tel.type === 'line_v') {
              const th = tel.thickness || 50;
              ctx.fillStyle = tel.isExploded ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.25)';
              ctx.fillRect(tel.x - th / 2, 0, th, canvas.height);
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = 2;
              ctx.strokeRect(tel.x - th / 2, 0, th, canvas.height);
            } else if (tel.type === 'nova_ring') {
              const curRad = (tel.maxRadius || 200) * progress;
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, curRad, 0, Math.PI * 2);
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = tel.thickness || 24;
              ctx.globalAlpha = 0.75;
              ctx.stroke();
            } else if (tel.type === 'rotating_beam') {
              const ang = tel.angle || 0;
              const len = tel.length || 300;
              const th = tel.thickness || 22;

              ctx.translate(tel.x, tel.y);
              ctx.rotate(ang);

              // 4 Beam Arms
              for (let b = 0; b < 4; b++) {
                ctx.rotate(Math.PI / 2);
                ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
                ctx.fillRect(0, -th / 2, len, th);
                ctx.strokeStyle = fillColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(0, -th / 2, len, th);
              }
              ctx.rotate(-ang - 4 * (Math.PI / 2));
              ctx.translate(-tel.x, -tel.y);
            } else if (tel.type === 'bullet') {
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
              ctx.fillStyle = fillColor;
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (tel.type === 'blackhole') {
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(59, 7, 100, 0.4)';
              ctx.fill();
              ctx.strokeStyle = '#a855f7';
              ctx.lineWidth = 3;
              ctx.stroke();

              // Swirling Vortex Core
              const vRot = frameRef.current * 0.1;
              ctx.beginPath();
              ctx.arc(tel.x, tel.y, tel.radius * 0.4, 0, Math.PI * 2);
              ctx.fillStyle = '#000000';
              ctx.fill();
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
            color: isPhase2 ? '#ef4444' : bossData.color,
          };
          drawPixelMonster(ctx, fakeBossMonster, canvas.width, 170, frameRef.current, isHitRef.current, isBossGroggy);

          // Draw Player in Arena
          ctx.save();
          ctx.translate(playerPos.x, playerPos.y);

          // Dash / Invincible Aura
          if (isDashing || isInvincible) {
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Player Sword Circle Aura
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fillStyle = currentSword.colorTheme?.blade || '#60a5fa';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Player Avatar Icon
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stats.playerAvatar || '⚔️', 0, 0);

          // Player Name & Level Tag
          ctx.font = '10px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`+${stats.currentSwordLevel}`, 0, -22);

          ctx.restore();

          // Draw Damage Numbers
          const curTime = Date.now();
          const activeDmgNumbers: DamageNumber[] = [];
          damageNumbersRef.current.forEach((d) => {
            const age = curTime - d.createdAt;
            if (age < 900) {
              activeDmgNumbers.push(d);
              ctx.save();
              ctx.font = d.isCrit ? 'bold 16px monospace' : 'bold 12px monospace';
              ctx.fillStyle = d.color;
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 3;
              ctx.strokeText(d.text, d.x, d.y - (age * 0.05));
              ctx.fillText(d.text, d.x, d.y - (age * 0.05));
              ctx.restore();
            }
          });
          damageNumbersRef.current = activeDmgNumbers;

          // Time Stop QTE Banner on Canvas
          if (timeStopQteActive) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
            ctx.fillRect(canvas.width / 2 - 160, canvas.height / 2 - 30, 320, 60);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.strokeRect(canvas.width / 2 - 160, canvas.height / 2 - 30, 320, 60);

            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡ [SPACE / 패링] 지금 카운터 슬래시!', canvas.width / 2, canvas.height / 2);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isRaidActive, isDashing, isInvincible, currentSword, bossData, currentBossHp, playerPos, isPhase2, isBossGroggy, timeStopQteActive, screenShake]);

  // Dash & Perfect Parry Action
  const handleDash = () => {
    if (dashCooldown > 0 || isDashing || !isRaidActive) return;

    // Time Stop QTE Successful Parry!
    if (timeStopQteActive) {
      setTimeStopQteActive(false);
      sound.playSuccess?.(true);
      setScreenShake(14);

      // Trigger Huge Counter Attack!
      const { finalDmg } = computeDamage();
      const counterDmg = finalDmg * 3.5;
      damageTrackerRef.current.push(counterDmg);
      setTotalDamageDealt((prev) => prev + counterDmg);
      setCombo((c) => c + 25);
      setUltimateGauge((g) => Math.min(100, g + 30));

      spawnDamageNumber(`🔥 PERFECT PARRY! ${counterDmg.toLocaleString()}`, 350, 150, '#fbbf24', true);

      // Groggy Stun Boss for 3.5s
      setIsBossGroggy(true);
      setTimeout(() => setIsBossGroggy(false), 3500);

      setCurrentBossHp((prev) => {
        const next = Math.max(0, prev - counterDmg);
        if (next <= 0) {
          finishRaid(true);
          return 0;
        }
        return next;
      });
      return;
    }

    setIsDashing(true);
    setIsInvincible(true);
    setDashCooldown(1.2);
    sound.playSuccess();

    setTimeout(() => {
      setIsDashing(false);
      setIsInvincible(false);
    }, 380);

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
    const emberRelic = relics.find((r) => r.id === 'relic_sun_shard' || r.id === 'relic_sun_ember');
    if (emberRelic && emberRelic.level > 0) {
      baseAtk *= 1 + (emberRelic.atkBonusPercent || 25) / 100;
    }

    // Critical Hit calculation
    const isCrit = Math.random() * 100 < currentSword.critRate;
    if (isCrit) {
      baseAtk *= currentSword.critDmg / 100;
    }

    // Combo multiplier (+1% per 10 combo)
    const comboMult = 1 + (combo / 1000);
    baseAtk *= comboMult;

    // Groggy Break multiplier (2.5x dmg)
    if (isBossGroggy) {
      baseAtk *= 2.5;
    }

    // Defense reduction
    const finalDmg = Math.max(1, Math.floor(baseAtk - bossData.defense * 0.2));
    return { finalDmg, isCrit };
  };

  // Manual Slash Button Attack
  const handleManualSlash = () => {
    if (!isRaidActive) return;
    const { finalDmg, isCrit } = computeDamage();
    const bonusSlashDmg = Math.floor(finalDmg * 1.6);

    setIsHit(true);
    setTimeout(() => setIsHit(false), 90);
    sound.playSlash();

    damageTrackerRef.current.push(bonusSlashDmg);
    setTotalDamageDealt((prev) => prev + bonusSlashDmg);
    setCombo((c) => c + 1);
    setUltimateGauge((g) => Math.min(100, g + 3));

    // Increase Break Gauge
    setBreakGauge((bg) => {
      const next = bg + 4;
      if (next >= 100 && !isBossGroggy) {
        setIsBossGroggy(true);
        sound.playSuccess?.(true);
        addLog(`💥 [BREAK!] '${bossData.name}'이(가) 그로기 상태에 빠져 방어력이 무력화됩니다!`, 'boss');
        setTimeout(() => {
          setIsBossGroggy(false);
          setBreakGauge(0);
        }, 4500);
        return 100;
      }
      return next;
    });

    spawnDamageNumber(bonusSlashDmg.toLocaleString(), 350, 140, isCrit ? '#f59e0b' : '#ffffff', isCrit);

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

  // Ultimate Sword Burst Skill [R]
  const handleUltimateBurst = () => {
    if (ultimateGauge < 100 || !isRaidActive || isUltimateActive) return;

    setIsUltimateActive(true);
    setUltimateGauge(0);
    sound.playSuccess?.(true);
    setScreenShake(20);

    const { finalDmg } = computeDamage();
    const ultDmg = finalDmg * 6;

    spawnDamageNumber(`⚔️ ULTIMATE BURST! ${ultDmg.toLocaleString()}`, 350, 120, '#a855f7', true);
    damageTrackerRef.current.push(ultDmg);
    setTotalDamageDealt((prev) => prev + ultDmg);
    setCombo((c) => c + 50);

    setCurrentBossHp((prev) => {
      const next = Math.max(0, prev - ultDmg);
      if (next <= 0) {
        finishRaid(true);
        return 0;
      }
      return next;
    });

    if (activePartyRoom && activePartyRoom.status === 'battling') {
      dealPartyBossDamage(activePartyRoom.id, playerUid, ultDmg, playerHp);
    }

    setTimeout(() => {
      setIsUltimateActive(false);
    }, 1200);
  };

  // Health Potion Action [Q]
  const handleUsePotion = () => {
    if (potionsCount <= 0 || !isRaidActive) return;
    setPotionsCount((p) => p - 1);
    setPlayerHp((hp) => Math.min(playerMaxHp, hp + 450));
    sound.playSuccess?.();
    spawnDamageNumber('+450 HP', playerPos.x, playerPos.y, '#22c55e');
  };

  // Auto Attack Loop (Tick based on attack speed)
  useEffect(() => {
    if (!isRaidActive) return;
    const attackSpeed = currentSword.atkSpeed;
    const intervalMs = Math.max(160, Math.floor(1000 / attackSpeed));

    const combatTimer = setInterval(() => {
      const { finalDmg, isCrit } = computeDamage();

      setIsHit(true);
      setTimeout(() => setIsHit(false), 90);
      sound.playSlash();

      damageTrackerRef.current.push(finalDmg);
      setTotalDamageDealt((prev) => prev + finalDmg);
      setUltimateGauge((g) => Math.min(100, g + 1.5));

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
  }, [isRaidActive, currentSword, stats, bossData, activePartyRoom, combo, isBossGroggy]);

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
    setBreakGauge(0);
    setIsBossGroggy(false);
    setIsPhase2(false);
    setUltimateGauge(0);
    setPotionsCount(3);
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
    const costTokens = relic.costTokens || 100 * relic.level;
    if (currentTokens < costTokens) {
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
            atkBonusPercent: r.atkBonusPercent ? r.atkBonusPercent + 15 : 0,
            goldBonusPercent: r.goldBonusPercent ? r.goldBonusPercent + 25 : 0,
            bossDamagePercent: r.bossDamagePercent ? r.bossDamagePercent + 20 : 0,
          };
        }
        return r;
      });

      return {
        ...prev,
        worldBossRaidTokens: (prev.worldBossRaidTokens || 0) - costTokens,
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
          description={`${bossData.description} — 조이스틱 또는 WASD로 보스의 고유 패턴을 회피하며 퍼펙트 패링과 초필살 참격을 가하세요!`}
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
              각 보스별 고유 기믹 & 탄막을 회피하고, 퍼펙트 패링(Space)과 필살 검무(R)를 연계하세요!
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
                    <span className="text-[10px] text-red-400 font-mono">신화급</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    HP: {boss.maxHp.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Battle Controller Help / PC Controls */}
            <div className="mt-auto bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[11px] text-neutral-400 font-sans space-y-1.5">
              <div className="font-bold text-neutral-200 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>아레나 조작 & 특수 기믹:</span>
              </div>
              <div>• <strong>WASD / 조이스틱</strong>: 이동 & 탄막 회피</div>
              <div>• <strong>Space / 회피</strong>: 0.38초 무적 대시 & 패링</div>
              <div>• <strong>Z / J / 참격</strong>: 1.6배 위력의 수동 강참격</div>
              <div>• <strong>R / 궁극기</strong>: 게이지 100% 시 6배 폭딜 검무</div>
              <div>• <strong>Q / 포션</strong>: 체력 +450 긴급 회복 (잔여 {potionsCount}개)</div>
              <div className="text-amber-400 font-bold">• 50% 체력 이하 시 2페이즈 광폭화!</div>
            </div>
          </div>

          {/* Large Screen Arena Field (9 cols on PC, full on mobile) */}
          <div
            ref={arenaRef}
            className={`lg:col-span-9 bg-neutral-950 border-2 ${
              isPhase2 ? 'border-red-500 ring-2 ring-red-600/30' : 'border-red-600/60'
            } rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 shadow-2xl relative overflow-hidden min-h-[540px]`}
          >
            {/* Top HUD: Boss Health & Time & Combo */}
            <div className="flex flex-col gap-2 z-10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-red-950 border border-red-600 text-red-300 px-2 py-0.5 rounded font-mono font-bold">
                    {bossData.name} {isPhase2 && '🔥 [2페이즈 광폭화]'}
                  </span>
                  {isBossGroggy && (
                    <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded font-bold animate-bounce">
                      💥 GROGGY BREAK (2.5x 대미지!)
                    </span>
                  )}
                  <span className="text-xs text-amber-400 font-bold font-mono">
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
              <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">보스 잔여 체력</span>
                  <span className="text-red-400 font-bold">
                    {currentBossHp.toLocaleString()} / {bossData.maxHp.toLocaleString()} ({Math.round(hpPercent)}%)
                  </span>
                </div>
                <div className="w-full h-3.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 relative">
                  <div
                    className={`h-full ${
                      isPhase2
                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 animate-pulse'
                        : 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400'
                    } transition-all duration-100`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>

                {/* Boss Break (Groggy) Gauge */}
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-amber-400">그로기 게이지:</span>
                  <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-amber-400 transition-all duration-150"
                      style={{ width: `${breakGauge}%` }}
                    />
                  </div>
                  <span className="text-amber-300 font-bold">{breakGauge}%</span>
                </div>
              </div>
            </div>

            {/* Arena Canvas (Big Immersive Battlefield) */}
            <div className="relative flex-1 w-full min-h-[350px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={430}
                className="w-full h-full object-cover"
              />

              {!isRaidActive && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
                  <Skull className="w-16 h-16 text-red-500 mb-3 animate-pulse" />
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {bossData.name} 결전 준비 완료
                  </h2>
                  <p className="text-xs text-neutral-400 max-w-md mb-6 font-sans">
                    60초 동안 보스의 고유 패턴과 탄막을 회피하며 퍼펙트 패링과 참격을 가하세요.
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
                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 z-30">
                  {/* Potion Button (Top row) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUsePotion}
                      disabled={potionsCount <= 0}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>포션 [Q] ({potionsCount})</span>
                    </button>

                    {/* Ultimate Burst Button */}
                    <button
                      onClick={handleUltimateBurst}
                      disabled={ultimateGauge < 100}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        ultimateGauge >= 100
                          ? 'bg-purple-600 text-white border-purple-300 animate-pulse ring-2 ring-purple-400'
                          : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>초필살기 [R] ({Math.floor(ultimateGauge)}%)</span>
                    </button>
                  </div>

                  {/* Main Action Buttons */}
                  <div className="flex items-center gap-3">
                    {/* Dash / Parry Button */}
                    <button
                      onClick={handleDash}
                      disabled={dashCooldown > 0}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-bold text-xs sm:text-sm flex flex-col items-center justify-center border-2 shadow-xl cursor-pointer transition-all active:scale-90 ${
                        timeStopQteActive
                          ? 'bg-yellow-500 text-black border-white animate-bounce ring-4 ring-yellow-400'
                          : dashCooldown > 0
                          ? 'bg-neutral-800 text-neutral-500 border-neutral-700'
                          : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-300 shadow-blue-950'
                      }`}
                    >
                      <Shield className="w-5 h-5 mb-0.5" />
                      <span>{timeStopQteActive ? '패링!' : dashCooldown > 0 ? `${dashCooldown.toFixed(1)}s` : '회피'}</span>
                    </button>

                    {/* Manual Slash Attack Button */}
                    <button
                      onClick={handleManualSlash}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center border-2 border-amber-300 shadow-2xl shadow-red-950 cursor-pointer transition-all active:scale-90"
                    >
                      <Swords className="w-6 h-6 mb-0.5 animate-pulse" />
                      <span>강참격!</span>
                    </button>
                  </div>
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
              const costTokens = (relic as any).costTokens || 100 * relic.level;
              const canAfford = currentTokens >= costTokens && relic.level < relic.maxLevel;

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
                      <p className="text-xs text-neutral-400 font-sans">{relic.effectDescription}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <div className="text-xs font-mono">
                      <span className="text-neutral-400">보너스: </span>
                      <strong className="text-amber-400">
                        공격력 +{relic.atkBonusPercent}% / 보스 +{relic.bossDamagePercent}%
                      </strong>
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
                          : `승급 (${costTokens.toLocaleString()} 토큰)`}
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
