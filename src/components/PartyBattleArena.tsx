import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PlayerStats,
  Sword,
  PartyRoom,
  PartyMember,
  PartyChatMessage,
  Monster,
  ElementType,
  MonsterSpriteType,
} from '../types';
import { sound } from '../utils/sound';
import { calculateTotalMultipliers } from '../utils/worldSwordHelper';
import { drawPixelMonster } from '../utils/pixelMonsterRenderer';
import {
  dealPartyBossDamage,
  resetPartyRoomToLobby,
  leavePartyRoom,
  sendPartyMessage,
  subscribeToPartyMessages,
  getOrCreatePlayerId,
} from '../utils/firebaseParty';
import { COSMIC_RELICS_DATA } from '../data/contentsData';

interface PartyBattleArenaProps {
  room: PartyRoom;
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onCloseArena: () => void;
  onOpenLobby: () => void;
  addLog: (text: string, type: 'system' | 'forge' | 'loot' | 'rebirth' | 'boss' | 'drop' | 'fail') => void;
}

interface FloatingDamage {
  id: number;
  damage: number;
  isCrit: boolean;
  element?: ElementType;
  x: number;
  y: number;
  color?: string;
  attackerName?: string;
}

interface AttackEffect {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  progress: number;
}

export const PartyBattleArena: React.FC<PartyBattleArenaProps> = ({
  room,
  stats,
  currentSword,
  onUpdateStats,
  onCloseArena,
  onOpenLobby,
  addLog,
}) => {
  const playerUid = getOrCreatePlayerId();
  const isHost = room.hostUid === playerUid;

  // Boss & Battle States
  const [bossHp, setBossHp] = useState<number>(room.bossHp ?? room.bossMaxHp);
  const [bossMaxHp] = useState<number>(room.bossMaxHp || 100000);
  const [isHit, setIsHit] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [battleTimeRemaining, setBattleTimeRemaining] = useState<number>(90);
  const [damageNumbers, setDamageNumbers] = useState<FloatingDamage[]>([]);
  const [attackEffects, setAttackEffects] = useState<AttackEffect[]>([]);
  const [myTotalDamage, setMyTotalDamage] = useState<number>(0);

  // Rewards Claimed Flag
  const [rewardsClaimed, setRewardsClaimed] = useState<boolean>(false);
  const [calculatedRewards, setCalculatedRewards] = useState<{
    gold: number;
    diamonds: number;
    spiritDust: number;
    rebirthPoints: number;
    bossTokens: number;
  } | null>(null);

  // Chat & Emotes
  const [messages, setMessages] = useState<PartyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [floatingEmotes, setFloatingEmotes] = useState<
    { id: string; senderUid: string; text: string; timestamp: number }[]
  >([]);

  // Canvas & Game Loop Refs
  const bossCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const damageBufferRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const memberDamageHistoryRef = useRef<Record<string, number>>({});

  // Construct synthetic Monster object for pixelMonsterRenderer
  const bossMonsterObj: Monster = useMemo(() => {
    return {
      id: `party_boss_${room.id}`,
      name: room.bossName || room.targetTitle || '보스',
      maxHp: bossMaxHp,
      currentHp: bossHp,
      atk: 250,
      defense: 40,
      goldReward: 50000,
      expReward: 10000,
      spriteType: (room.bossSpriteType as MonsterSpriteType) || 'dragon',
      color: room.bossColor || '#ef4444',
      isBoss: true,
      elementWeakness: stats.elementInfusion !== 'none' ? stats.elementInfusion : 'fire',
    };
  }, [room.id, room.bossName, room.targetTitle, bossMaxHp, bossHp, room.bossSpriteType, room.bossColor, stats.elementInfusion]);

  // Sync Room Boss HP & Status
  useEffect(() => {
    if (room.bossHp !== undefined) {
      setBossHp(room.bossHp);
    }
  }, [room.bossHp]);

  // Subscribe to Live Party Chat & Emotes
  useEffect(() => {
    const unsub = subscribeToPartyMessages(room.id, (msgs) => {
      setMessages(msgs);
      // Check latest message for floating bubble
      if (msgs.length > 0) {
        const latest = msgs[msgs.length - 1];
        if (Date.now() - latest.timestamp < 3500) {
          setFloatingEmotes((prev) => {
            const exists = prev.some((e) => e.id === latest.id);
            if (!exists) {
              return [...prev.slice(-3), { id: latest.id, senderUid: latest.senderUid, text: latest.text, timestamp: latest.timestamp }];
            }
            return prev;
          });
        }
      }
    });
    return () => unsub();
  }, [room.id]);

  // Clean expired floating bubbles
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setFloatingEmotes((prev) => prev.filter((e) => now - e.timestamp < 4000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to other party members' damage dealt to trigger visual sword attacks
  useEffect(() => {
    if (!room.members) return;
    Object.values(room.members).forEach((member: PartyMember) => {
      if (member.uid === playerUid) return; // ignore self
      const prevDmg = memberDamageHistoryRef.current[member.uid] || 0;
      const currentDmg = member.totalDamage || 0;
      if (currentDmg > prevDmg) {
        const delta = currentDmg - prevDmg;
        memberDamageHistoryRef.current[member.uid] = currentDmg;

        // Trigger visual attack slash from teammate towards boss
        triggerTeammateSlash(member, delta);
      } else {
        memberDamageHistoryRef.current[member.uid] = currentDmg;
      }
    });
  }, [room.members, playerUid]);

  // Teammate Attack Visual Trigger
  const triggerTeammateSlash = (member: PartyMember, damageDealt: number) => {
    setIsHit(true);
    setTimeout(() => setIsHit(false), 90);

    const dmgId = Date.now() + Math.random();
    setDamageNumbers((prev) => [
      ...prev.slice(-10),
      {
        id: dmgId,
        damage: damageDealt,
        isCrit: Math.random() < 0.3,
        x: 42 + Math.random() * 16 - 8,
        y: 28 + Math.random() * 16 - 8,
        color: '#60a5fa',
        attackerName: member.name,
      },
    ]);

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== dmgId));
    }, 850);
  };

  // Battle Timer (Countdown from 90s)
  useEffect(() => {
    if (room.status !== 'battling') return;
    const timer = setInterval(() => {
      setBattleTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [room.status]);

  // Flush batched damage to Firestore periodically (every 450ms)
  const flushDamageBuffer = async () => {
    const pendingDmg = damageBufferRef.current;
    if (pendingDmg > 0 && room.status === 'battling') {
      damageBufferRef.current = 0;
      lastSyncTimeRef.current = Date.now();
      await dealPartyBossDamage(room.id, playerUid, pendingDmg, stats.hp || 1000);
    }
  };

  useEffect(() => {
    const flushInterval = setInterval(() => {
      flushDamageBuffer();
    }, 450);
    return () => {
      clearInterval(flushInterval);
      flushDamageBuffer();
    };
  }, [room.id, room.status, playerUid]);

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

    // Party Co-op Multiplier (+25% party synergy bonus)
    baseAtk *= 1.25;

    // Critical Hit
    const isCrit = Math.random() * 100 < currentSword.critRate;
    if (isCrit) {
      baseAtk *= currentSword.critDmg / 100;
    }

    // Combo multiplier (+1% per 10 combo)
    const comboMult = 1 + combo / 1000;
    baseAtk *= comboMult;

    // Element Bonus
    if (stats.elementInfusion && stats.elementInfusion !== 'none') {
      baseAtk *= 1.2;
    }

    const finalDmg = Math.max(1, Math.floor(baseAtk - 25));
    return { finalDmg, isCrit };
  };

  // Perform Local Attack Hit (instant responsive visual & queued for sync)
  const executeAttack = (isManual = false) => {
    if (room.status !== 'battling' || bossHp <= 0) return;

    const { finalDmg, isCrit } = computeDamage();
    const damageDealt = isManual ? Math.floor(finalDmg * 1.5) : finalDmg;

    // Trigger Hit FX & Sound
    setIsHit(true);
    setTimeout(() => setIsHit(false), 90);

    if (isManual) {
      sound.playCritHit();
      setCombo((c) => Math.min(999, c + 2));
    } else {
      sound.playSlash();
      setCombo((c) => Math.min(999, c + 1));
    }

    // Add to Local My Total & Buffer
    setMyTotalDamage((prev) => prev + damageDealt);
    damageBufferRef.current += damageDealt;

    // Instant local boss HP feedback
    setBossHp((prev) => Math.max(0, prev - damageDealt));

    // Floating Damage Number
    const dId = Date.now() + Math.random();
    setDamageNumbers((prev) => [
      ...prev.slice(-10),
      {
        id: dId,
        damage: damageDealt,
        isCrit: isManual ? true : isCrit,
        element: stats.elementInfusion,
        x: 48 + Math.random() * 16 - 8,
        y: 26 + Math.random() * 16 - 8,
        color: isManual ? '#f59e0b' : isCrit ? '#ef4444' : '#e2e8f0',
        attackerName: stats.playerName || '나',
      },
    ]);

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== dId));
    }, 850);

    // If manual attack or high burst, flush immediately
    if (isManual || damageBufferRef.current > 50000) {
      flushDamageBuffer();
    }
  };

  // Auto Attack Loop based on Sword Attack Speed
  useEffect(() => {
    if (room.status !== 'battling') return;
    const attackSpeed = currentSword.atkSpeed || 1.0;
    const intervalMs = Math.max(160, Math.floor(1000 / attackSpeed));

    const autoTimer = setInterval(() => {
      executeAttack(false);
    }, intervalMs);

    return () => clearInterval(autoTimer);
  }, [room.status, currentSword, stats, combo, bossHp]);

  // Keyboard Shortcuts (Space / Z / J to manual slash)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        executeAttack(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [room.status, bossHp, currentSword, stats]);

  // Boss Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = bossCanvasRef.current;
    if (!canvas) return;

    const render = () => {
      frameRef.current += 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPixelMonster(
          ctx,
          bossMonsterObj,
          canvas.width,
          canvas.height,
          frameRef.current,
          isHit
        );
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [bossMonsterObj, isHit]);

  // Calculate Rewards on Victory
  const membersList = useMemo(() => {
    return Object.values(room.members || {}) as PartyMember[];
  }, [room.members]);

  const sortedMembersByDamage = useMemo(() => {
    return [...membersList].sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0));
  }, [membersList]);

  const mvpMember = sortedMembersByDamage[0];
  const isMvp = mvpMember && mvpMember.uid === playerUid;

  useEffect(() => {
    if (room.status === 'victory' && !calculatedRewards) {
      sound.playSuccess(true);

      const baseGold = 100000;
      const baseDia = 250;
      const baseDust = 150;
      const baseRP = 5;
      const baseTokens = 20;

      // 1.5x Party Bonus + Extra MVP bonus
      const multiplier = isMvp ? 2.0 : 1.5;

      const rewards = {
        gold: Math.floor(baseGold * multiplier),
        diamonds: Math.floor(baseDia * multiplier),
        spiritDust: Math.floor(baseDust * multiplier),
        rebirthPoints: Math.floor(baseRP * multiplier),
        bossTokens: Math.floor(baseTokens * multiplier),
      };

      setCalculatedRewards(rewards);

      if (!rewardsClaimed) {
        setRewardsClaimed(true);
        onUpdateStats((prev) => ({
          ...prev,
          gold: prev.gold + rewards.gold,
          diamonds: prev.diamonds + rewards.diamonds,
          spiritDust: (prev.spiritDust || 0) + rewards.spiritDust,
          rebirthPoints: (prev.rebirthPoints || 0) + rewards.rebirthPoints,
          worldBossTokens: (prev.worldBossTokens || 0) + rewards.bossTokens,
        }));

        addLog(
          `🎉 [파티 레이드 승리] ${room.targetTitle} 격파 완료! 1.5배 파티 보상 지급: 다이아 +${rewards.diamonds}, 영혼가루 +${rewards.spiritDust}, 골드 +${rewards.gold.toLocaleString()}${
            isMvp ? ' 👑 MVP 특별 보너스 포함!' : ''
          }`,
          'boss'
        );
      }
    }
  }, [room.status, calculatedRewards, isMvp, rewardsClaimed]);

  // Handle Send Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    await sendPartyMessage(room.id, playerUid, stats.playerName || '용사', text);
  };

  const handleSendQuickEmote = async (emote: string) => {
    await sendPartyMessage(room.id, playerUid, stats.playerName || '용사', emote);
    sound.playClick();
  };

  // Host Rematch Action
  const handleRematch = async () => {
    if (!isHost) return;
    sound.playClick();
    await resetPartyRoomToLobby(room.id);
    onOpenLobby();
  };

  // Leave Party Action
  const handleLeaveParty = async () => {
    sound.playClick();
    await leavePartyRoom(room.id, playerUid);
    onCloseArena();
  };

  const bossHpPercentage = Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none overflow-y-auto">
      {/* Top Header: Target Info & Live Boss HP Bar */}
      <div className="w-full max-w-5xl bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold font-mono uppercase animate-pulse">
              👥 실시간 파티 협동 토벌
            </span>
            <h2 className="text-base sm:text-xl font-black text-neutral-100 flex items-center gap-2">
              <span>{room.targetTitle}</span>
              <span className="text-xs text-neutral-400 font-mono font-normal">
                [{room.roomCode}]
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs font-mono font-bold">
              <span className="text-neutral-400">⏱️ 제한시간:</span>
              <span className={battleTimeRemaining <= 20 ? 'text-rose-400 animate-ping font-black' : 'text-amber-400'}>
                {battleTimeRemaining}초
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-600/40 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300">
              <span>🔥 콤보: {combo}</span>
            </div>

            <button
              onClick={handleLeaveParty}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              포기 및 나가기
            </button>
          </div>
        </div>

        {/* Big Boss HP Gauge Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold font-mono">
            <span className="text-rose-400 flex items-center gap-1.5">
              <span>👑 {bossMonsterObj.name}</span>
              <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800">
                BOSS
              </span>
            </span>
            <span className="text-neutral-300">
              {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()} (
              {bossHpPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full h-4 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-500 transition-all duration-150 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.6)]"
              style={{ width: `${bossHpPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Battle Canvas Stage Area */}
      <div className="w-full max-w-5xl my-3 flex-1 min-h-[360px] bg-gradient-to-b from-neutral-900/60 to-neutral-950/90 border border-neutral-800/80 rounded-2xl p-4 relative flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden shadow-2xl">
        {/* Arena Background Grid and Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-neutral-950/60 to-neutral-950 pointer-events-none" />

        {/* Floating Floating Damage Numbers Layer */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {damageNumbers.map((d) => (
            <div
              key={d.id}
              className="absolute font-black animate-bounce flex flex-col items-center"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {d.attackerName && (
                <span className="text-[10px] text-neutral-400 font-mono bg-neutral-950/80 px-1 rounded">
                  {d.attackerName}
                </span>
              )}
              <span
                className={`font-mono text-sm sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                  d.isCrit ? 'text-amber-300 scale-125' : 'text-neutral-100'
                }`}
                style={{ color: d.color }}
              >
                -{d.damage.toLocaleString()}
                {d.isCrit ? '💥 CRIT!' : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Left Side: Party Formation (Up to 4 Players) */}
        <div className="w-full md:w-5/12 z-20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-1">
            <span>🛡️ 파티원 대형 (Formation)</span>
            <span className="text-emerald-400 font-mono">
              동시 타격 중 ({membersList.length}/4)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2.5">
            {membersList.map((member) => {
              const isMe = member.uid === playerUid;
              const activeEmote = floatingEmotes.find((e) => e.senderUid === member.uid);

              return (
                <div
                  key={member.uid}
                  className={`p-3 rounded-xl border transition-all relative flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Floating Bubble over player */}
                  {activeEmote && (
                    <div className="absolute -top-7 left-3 z-40 bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-lg border border-indigo-400 animate-bounce">
                      {activeEmote.text}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-700 flex items-center justify-center text-2xl relative shadow-inner">
                      <span>{member.avatar || '⚔️'}</span>
                      {member.isHost && (
                        <span className="absolute -top-1.5 -right-1.5 text-xs">👑</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-neutral-200">
                          {member.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-amber-500 text-neutral-950 font-black px-1.5 rounded">
                            ME
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-400 font-mono">
                        +{member.swordLevel} {member.swordName}
                      </div>
                    </div>
                  </div>

                  {/* Member Real-time Damage Contribution */}
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {(member.totalDamage || 0).toLocaleString()} DMG
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      점유율:{' '}
                      {bossMaxHp > 0
                        ? (((member.totalDamage || 0) / bossMaxHp) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Emote Reactions Bar */}
          <div className="flex items-center gap-1.5 mt-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80">
            <span className="text-[11px] text-neutral-400 font-bold mr-1">핑:</span>
            {['⚔️ 극딜!', '🔥 폭딜!', '💖 나이스!', '🛡️ 조심해!'].map((emote) => (
              <button
                key={emote}
                onClick={() => handleSendQuickEmote(emote)}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 font-bold rounded-lg border border-neutral-700 transition-colors cursor-pointer active:scale-95"
              >
                {emote}
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Giant Boss Sprite & Click Area */}
        <div
          onClick={() => executeAttack(true)}
          className="w-full md:w-7/12 flex flex-col items-center justify-center relative cursor-crosshair group py-4"
          title="클릭하여 참격 공격 (150% 보너스 대미지)"
        >
          {/* Boss Canvas */}
          <div className="relative">
            <canvas
              ref={bossCanvasRef}
              width={260}
              height={260}
              className={`transition-transform duration-100 ${
                isHit ? 'scale-95 filter brightness-150' : 'group-hover:scale-105'
              }`}
            />
            {/* Click Hit Spark Indicator */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/40 backdrop-blur-sm shadow-lg">
                ⚔️ 클릭하여 추가 참격 발동! (Space / Z)
              </span>
            </div>
          </div>

          {/* Manual Slash Button for Mobile */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                executeAttack(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>⚔️ 수동 참격 공격 (Space / Z)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Area: Live Damage Ranking Meter & Chat */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Damage Contribution Meter */}
        <div className="md:col-span-2 bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-300 mb-2">
            <span className="flex items-center gap-1.5">
              <span>📊 파티 기여도 순위 (Damage Contribution)</span>
              {mvpMember && (
                <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-700">
                  1위: {mvpMember.name}
                </span>
              )}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              내 누적 딜: {myTotalDamage.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            {sortedMembersByDamage.map((m, idx) => {
              const share = bossMaxHp > 0 ? ((m.totalDamage || 0) / bossMaxHp) * 100 : 0;
              const isMe = m.uid === playerUid;

              return (
                <div key={m.uid} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1">
                      <span className="font-bold text-amber-400">{idx + 1}위</span>
                      <span className={isMe ? 'text-amber-300 font-bold' : 'text-neutral-300'}>
                        {m.name} {isMe ? '(나)' : ''}
                      </span>
                    </span>
                    <span className="text-neutral-400">
                      {(m.totalDamage || 0).toLocaleString()} ({share.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, share)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Party Chat Box */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 shadow-xl flex flex-col justify-between h-[125px]">
          <div className="overflow-y-auto space-y-1 text-xs pr-1 flex-1">
            {messages.length === 0 ? (
              <div className="text-[11px] text-neutral-500 text-center py-4">
                파티 채팅에 메시지를 남겨보세요.
              </div>
            ) : (
              messages.slice(-5).map((msg) => (
                <div key={msg.id} className="leading-tight">
                  <span className="text-neutral-400 font-bold font-mono text-[10px]">
                    {msg.senderName}:
                  </span>{' '}
                  <span className="text-neutral-200">{msg.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-1.5 pt-1 border-t border-neutral-800">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="파티 메시지..."
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-bold cursor-pointer"
            >
              전송
            </button>
          </form>
        </div>
      </div>

      {/* Victory Celebration Modal Overlay */}
      {room.status === 'victory' && (
        <div className="fixed inset-0 z-60 bg-neutral-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gradient-to-b from-neutral-900 to-neutral-950 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in fade-in zoom-in duration-300">
            <div className="text-5xl mb-2 animate-bounce">🏆</div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 mb-1">
              파티 토벌 대성공! (VICTORY)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mb-5">
              파티원 전원이 힘을 합쳐 <span className="text-amber-400 font-bold">{room.targetTitle}</span>을 완벽하게 정복했습니다!
            </p>

            {/* MVP Highlight Box */}
            {mvpMember && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl">
                    👑
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-amber-400 font-bold font-mono">
                      파티 MVP 최다 딜러
                    </div>
                    <div className="text-sm font-black text-neutral-100">
                      {mvpMember.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-300">
                    {(mvpMember.totalDamage || 0).toLocaleString()} DMG
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    기여도:{' '}
                    {bossMaxHp > 0
                      ? (((mvpMember.totalDamage || 0) / bossMaxHp) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Rewards Box */}
            {calculatedRewards && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6 text-left">
                <div className="text-xs font-bold text-amber-400 font-mono mb-2 flex items-center justify-between">
                  <span>🎁 1.5배 파티 보너스 정산</span>
                  <span className="text-[10px] text-emerald-400">자동 지급 완료</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">골드</span>
                    <span className="text-amber-400 font-bold">
                      +{calculatedRewards.gold.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">다이아</span>
                    <span className="text-cyan-400 font-bold">
                      +{calculatedRewards.diamonds.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">영혼의 가루</span>
                    <span className="text-purple-400 font-bold">
                      +{calculatedRewards.spiritDust.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isHost ? (
                <button
                  onClick={handleRematch}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  🔄 같은 파티로 다시하기 (대기실)
                </button>
              ) : (
                <button
                  onClick={onOpenLobby}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  👥 파티 로비로 가기
                </button>
              )}

              <button
                onClick={handleLeaveParty}
                className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-sm rounded-xl border border-neutral-700 transition-colors cursor-pointer"
              >
                파티 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
