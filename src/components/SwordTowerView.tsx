import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Shield, Zap, Sparkles, Trophy, ChevronRight, Play, 
  RotateCcw, Gem, Award, CheckCircle2, Lock, Plus, Trash2, ArrowUpRight,
  Swords, Flame, Skull, Users, Maximize2, Minimize2, MousePointerClick
} from 'lucide-react';
import { PartyRoom, PlayerStats, SocketGem, SpireFloor, Sword } from '../types';
import { SPIRE_FLOORS_DATA } from '../data/contentsData';
import { drawPixelMonster } from '../utils/pixelMonsterRenderer';
import { sound } from '../utils/sound';
import { calculateTotalMultipliers } from '../utils/worldSwordHelper';
import { CinematicCutscene } from './CinematicCutscene';
import { dealPartyBossDamage, getOrCreatePlayerId } from '../utils/firebaseParty';

interface SwordTowerViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  addLog: (text: string, type: 'success' | 'fail' | 'destroy' | 'drop' | 'loot' | 'system' | 'boss') => void;
  onOpenPartyModal?: (target: {
    type: 'spire';
    id: number;
    title: string;
    bossHp: number;
    bossMaxHp: number;
    bossName: string;
    bossSpriteType?: any;
    bossColor?: string;
  }) => void;
  activePartyRoom?: PartyRoom | null;
}

export const SwordTowerView: React.FC<SwordTowerViewProps> = ({
  stats,
  currentSword,
  onUpdateStats,
  addLog,
  onOpenPartyModal,
  activePartyRoom,
}) => {
  const maxClearedFloor = stats.spireMaxFloor || 0;
  
  // Strict progression: default to maxClearedFloor + 1 (min 1, max 50)
  const [selectedFloor, setSelectedFloor] = useState<number>(() => {
    return Math.min(50, Math.max(1, maxClearedFloor + 1));
  });

  const floorData = SPIRE_FLOORS_DATA[selectedFloor - 1] || SPIRE_FLOORS_DATA[0];
  const isMilestoneBoss = selectedFloor % 10 === 0;

  // Battle State
  const [isBattling, setIsBattling] = useState(false);
  const [monsterHp, setMonsterHp] = useState(floorData.monster.maxHp);
  const [isHit, setIsHit] = useState(false);
  const [battleTimer, setBattleTimer] = useState(isMilestoneBoss ? 45 : 30);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number; text: string; x: number; y: number; isCrit: boolean }[]>([]);
  const [clickCount, setClickCount] = useState(0);

  // Cutscenes
  const [showIntroCutscene, setShowIntroCutscene] = useState(false);
  const [showVictoryCutscene, setShowVictoryCutscene] = useState(false);
  const [lastClearedFloorData, setLastClearedFloorData] = useState<SpireFloor | null>(null);

  // Sub Tab
  const [activeTab, setActiveTab] = useState<'tower' | 'socket'>('tower');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const isHitRef = useRef(false);
  const nextDmgId = useRef(0);
  const playerUid = getOrCreatePlayerId();

  useEffect(() => {
    isHitRef.current = isHit;
  }, [isHit]);

  // Sync Monster HP on Floor Change
  useEffect(() => {
    if (!isBattling) {
      setMonsterHp(floorData.monster.maxHp);
      setBattleTimer(isMilestoneBoss ? 45 : 30);
    }
  }, [selectedFloor, isBattling, floorData, isMilestoneBoss]);

  // Sync Party Boss HP if in active party
  useEffect(() => {
    if (activePartyRoom && activePartyRoom.status === 'battling') {
      if (activePartyRoom.targetType === 'spire') {
        setSelectedFloor(Number(activePartyRoom.targetId) || 10);
        setMonsterHp(activePartyRoom.bossHp);
        setIsBattling(true);

        if (activePartyRoom.bossHp <= 0) {
          handleFloorClear();
        }
      }
    }
  }, [activePartyRoom]);

  // Monster Animation Loop
  useEffect(() => {
    let animId: number;
    const render = () => {
      frameRef.current += 1;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const m = { ...floorData.monster, currentHp: monsterHp };
          drawPixelMonster(ctx, m, canvas.width, canvas.height, frameRef.current, isHitRef.current);
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [floorData, monsterHp]);

  // Compute single hit damage
  const computeDamage = () => {
    const multipliers = calculateTotalMultipliers(stats);
    let baseAtk = currentSword.atk * multipliers.totalAtkMult;

    // Spire Modifiers
    let isCrit = false;
    if (floorData.modifierType !== 'crit_immune') {
      isCrit = Math.random() * 100 < currentSword.critRate;
      if (isCrit) baseAtk *= currentSword.critDmg / 100;
    }

    if (floorData.modifierType === 'fire_boost' && stats.elementInfusion === 'fire') {
      baseAtk *= 2.0;
    }

    let def = floorData.monster.defense;
    if (floorData.modifierType === 'heavy_armor') {
      def *= 3;
    }

    const finalDmg = Math.max(1, Math.floor(baseAtk - def * 0.3));
    return { finalDmg, isCrit };
  };

  // Add floating damage indicator
  const addDamageNumber = (dmg: number, isCrit: boolean, clientX?: number, clientY?: number) => {
    const id = ++nextDmgId.current;
    const randomOffset = (Math.random() - 0.5) * 40;
    setDamageNumbers((prev) => [
      ...prev.slice(-10),
      {
        id,
        text: `${isCrit ? '💥 CRIT! ' : ''}-${dmg.toLocaleString()}`,
        x: clientX ? clientX + randomOffset : 50 + (Math.random() - 0.5) * 20,
        y: clientY ? clientY - 10 : 50,
        isCrit,
      },
    ]);

    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.id !== id));
    }, 800);
  };

  // Manual Click Attack (검탑 클릭 공격)
  const handleClickAttack = (e?: React.MouseEvent) => {
    if (!isBattling) {
      startChallenge();
      return;
    }

    const { finalDmg, isCrit } = computeDamage();
    // Manual click bonus +15%
    const clickDmg = Math.floor(finalDmg * 1.15);

    setIsHit(true);
    setTimeout(() => setIsHit(false), 80);
    sound.playSlash();
    setClickCount((c) => c + 1);

    addDamageNumber(clickDmg, isCrit);

    setMonsterHp((prev) => {
      const next = Math.max(0, prev - clickDmg);
      if (next <= 0) {
        handleFloorClear();
        return 0;
      }
      return next;
    });

    // If in party room, sync damage to firestore
    if (activePartyRoom && activePartyRoom.status === 'battling') {
      dealPartyBossDamage(activePartyRoom.id, playerUid, clickDmg);
    }
  };

  // Start Floor Challenge Trigger
  const handleInitiateFloor = () => {
    // 10th milestone floors trigger cinematic intro cutscene
    if (isMilestoneBoss) {
      setShowIntroCutscene(true);
    } else {
      startChallenge();
    }
  };

  // Start Actual Battle
  const startChallenge = () => {
    sound.playBossRoar();
    setMonsterHp(floorData.monster.maxHp);
    setBattleTimer(isMilestoneBoss ? 45 : 30);
    setIsBattling(true);
    addLog(`[무한의 검탑] 제 ${selectedFloor}층 시련에 도전합니다!`, 'boss');
  };

  // Win Floor Challenge
  const handleFloorClear = () => {
    setIsBattling(false);
    sound.playSuccess(true);

    const isFirstClear = selectedFloor > maxClearedFloor;
    const nextMax = Math.max(maxClearedFloor, selectedFloor);
    setLastClearedFloorData(floorData);

    onUpdateStats((prev) => {
      const nextGems = [...(prev.socketGems || [])];
      if (isFirstClear && floorData.rewardGem) {
        nextGems.push(floorData.rewardGem);
      }

      return {
        ...prev,
        spireMaxFloor: nextMax,
        spireCurrentFloor: Math.min(50, selectedFloor + 1),
        diamonds: prev.diamonds + floorData.rewardDiamonds,
        spiritDust: (prev.spiritDust || 0) + floorData.rewardDust,
        gold: prev.gold + floorData.monster.goldReward,
        socketGems: nextGems,
      };
    });

    addLog(
      `[무한의 검탑] 제 ${selectedFloor}층 정복 완료! 다이아 +${floorData.rewardDiamonds}, 영혼가루 +${floorData.rewardDust}`,
      'loot'
    );

    if (isFirstClear && floorData.rewardGem) {
      addLog(`[보석 획득] 💎 '${floorData.rewardGem.name}' 획득!`, 'drop');
    }

    // Trigger Victory Cutscene for 10-floor milestones or first clear
    if (isMilestoneBoss || isFirstClear) {
      setShowVictoryCutscene(true);
    } else {
      if (selectedFloor < 50) {
        setSelectedFloor(selectedFloor + 1);
      }
    }
  };

  // Sweep (소탕) all cleared floors
  const handleSweep = () => {
    if (maxClearedFloor <= 0) {
      sound.playFail();
      addLog('[무한의 검탑] 1개 이상의 층을 클리어해야 소탕할 수 있습니다.', 'fail');
      return;
    }

    sound.playSuccess(true);
    const sweepDust = maxClearedFloor * 15;
    const sweepDiamonds = maxClearedFloor * 25;
    const sweepGold = maxClearedFloor * 2000;

    onUpdateStats((prev) => ({
      ...prev,
      spiritDust: (prev.spiritDust || 0) + sweepDust,
      diamonds: prev.diamonds + sweepDiamonds,
      gold: prev.gold + sweepGold,
    }));

    addLog(
      `[소탕 완료] ${maxClearedFloor}개 층 즉시 소탕! 다이아 +${sweepDiamonds}, 영혼가루 +${sweepDust}, 골드 +${sweepGold.toLocaleString()}`,
      'loot'
    );
  };

  // Battle Timer
  useEffect(() => {
    if (!isBattling) return;
    const interval = setInterval(() => {
      setBattleTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsBattling(false);
          sound.playFail();
          addLog(`[무한의 검탑] 제 ${selectedFloor}층 도전 실패 (시간 초과)`, 'fail');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isBattling, selectedFloor]);

  // Auto Combat Execution
  useEffect(() => {
    if (!isBattling) return;
    const attackSpeed = currentSword.atkSpeed;
    const intervalMs = Math.max(120, Math.floor(1000 / attackSpeed));

    const combatTimer = setInterval(() => {
      const { finalDmg, isCrit } = computeDamage();

      setIsHit(true);
      setTimeout(() => setIsHit(false), 90);
      sound.playSlash();

      addDamageNumber(finalDmg, isCrit);

      setMonsterHp((prev) => {
        const next = Math.max(0, prev - finalDmg);
        if (next <= 0) {
          clearInterval(combatTimer);
          handleFloorClear();
          return 0;
        }
        return next;
      });

      if (activePartyRoom && activePartyRoom.status === 'battling') {
        dealPartyBossDamage(activePartyRoom.id, playerUid, finalDmg);
      }
    }, intervalMs);

    return () => clearInterval(combatTimer);
  }, [isBattling, currentSword, stats, floorData, activePartyRoom]);

  // Socket Gem Equip / Unequip
  const handleToggleEquipGem = (gemId: string) => {
    const gems = stats.socketGems || [];
    const targetGem = gems.find((g) => g.id === gemId);
    if (!targetGem) return;

    const equippedCount = gems.filter((g) => g.isEquipped).length;
    if (!targetGem.isEquipped && equippedCount >= 4) {
      sound.playFail();
      addLog('[소켓 관리소] 최대 4개의 보석까지만 장착할 수 있습니다.', 'fail');
      return;
    }

    sound.playSuccess();
    onUpdateStats((prev) => ({
      ...prev,
      socketGems: (prev.socketGems || []).map((g) =>
        g.id === gemId ? { ...g, isEquipped: !g.isEquipped } : g
      ),
    }));
    addLog(`[소켓 관리소] '${targetGem.name}' ${targetGem.isEquipped ? '해제' : '장착'} 완료!`, 'system');
  };

  // Synthesize 3 identical tier gems into 1 higher tier gem
  const handleSynthesizeGems = (type: SocketGem['type'], tier: number) => {
    const gems = stats.socketGems || [];
    const matching = gems.filter((g) => g.type === type && g.tier === tier && !g.isEquipped);

    if (matching.length < 3) {
      sound.playFail();
      addLog('[보석 합성] 동일한 종류 및 티어의 미장착 보석이 3개 이상 필요합니다.', 'fail');
      return;
    }

    sound.playSuccess(true);
    const consumedIds = matching.slice(0, 3).map((g) => g.id);
    const newTier = tier + 1;
    const newGem: SocketGem = {
      id: `gem_synth_${Date.now()}`,
      name: `${newTier}티어 합성 ${matching[0].name.split(' ')[1]}`,
      type,
      tier: newTier,
      statType: matching[0].statType,
      statValue: newTier * (matching[0].statType === 'emerald' ? 1.5 : 25),
      icon: 'Sparkles',
      color: matching[0].color,
      isEquipped: false,
    };

    onUpdateStats((prev) => ({
      ...prev,
      socketGems: [...(prev.socketGems || []).filter((g) => !consumedIds.includes(g.id)), newGem],
    }));

    addLog(`[보석 합성 성공] ✨ 3개의 보석을 융합하여 '${newGem.name}'을(를) 연성했습니다!`, 'loot');
  };

  const hpPercent = Math.max(0, Math.min(100, (monsterHp / floorData.monster.maxHp) * 100));
  const equippedGems = (stats.socketGems || []).filter((g) => g.isEquipped);

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Intro Cutscene */}
      {showIntroCutscene && (
        <CinematicCutscene
          type="intro"
          title={`무한의 검탑 제 ${selectedFloor}층 대결전`}
          bossName={floorData.monster.name}
          bossThemeColor={floorData.monster.color}
          floor={selectedFloor}
          description={`10층 단위 고대 군주가 당신의 검을 가로막습니다. ${floorData.modifierText}`}
          onComplete={() => {
            setShowIntroCutscene(false);
            startChallenge();
          }}
          onSkip={() => {
            setShowIntroCutscene(false);
            startChallenge();
          }}
        />
      )}

      {/* Victory Cutscene */}
      {showVictoryCutscene && (
        <CinematicCutscene
          type="victory"
          title={`제 ${selectedFloor}층 시련 정복!`}
          subtitle={`위대한 검사의 영웅적인 공격으로 ${lastClearedFloorData?.monster.name || '보스'}을(를) 격파했습니다!`}
          floor={selectedFloor}
          rewards={{
            diamonds: lastClearedFloorData?.rewardDiamonds,
            dust: lastClearedFloorData?.rewardDust,
            gold: lastClearedFloorData?.monster.goldReward,
            gemName: lastClearedFloorData?.rewardGem?.name,
            partyBonus: !!activePartyRoom,
          }}
          partyMembers={activePartyRoom ? Object.values(activePartyRoom.members) : undefined}
          onComplete={() => {
            setShowVictoryCutscene(false);
            if (selectedFloor < 50) {
              setSelectedFloor(selectedFloor + 1);
            }
          }}
        />
      )}

      {/* Top Header */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-500 flex items-center justify-center text-indigo-400">
            <Building2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-2">
              <span>무한의 검탑 & 보석 소켓 (Infinite Spire)</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500 font-mono">
                최고 기록: {maxClearedFloor}층
              </span>
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              1층부터 차례대로 도전하여 보스를 처치하고 소켓 보석을 획득하세요!
            </p>
          </div>
        </div>

        {/* Tab & Sweep Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPartyModal && (
            <button
              onClick={() =>
                onOpenPartyModal({
                  type: 'spire',
                  id: selectedFloor,
                  title: `무한의 검탑 ${selectedFloor}층`,
                  bossHp: floorData.monster.maxHp,
                  bossMaxHp: floorData.monster.maxHp,
                  bossName: floorData.monster.name,
                  bossSpriteType: floorData.monster.spriteType,
                  bossColor: floorData.monster.color,
                })
              }
              className="px-3.5 py-1.5 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500 text-xs font-bold rounded-lg text-indigo-200 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              <span>파티 매칭 (Co-op)</span>
            </button>
          )}

          <button
            onClick={handleSweep}
            className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-xs font-bold rounded-lg text-emerald-300 cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>일일 즉시 소탕 ({maxClearedFloor}개 층)</span>
          </button>

          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setActiveTab('tower')}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                activeTab === 'tower' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              검탑 시련
            </button>
            <button
              onClick={() => setActiveTab('socket')}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                activeTab === 'socket' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              보석 장착/합성
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab: Infinite Spire Combat */}
      {activeTab === 'tower' && (
        <div className={`grid grid-cols-1 ${isMilestoneBoss ? 'lg:grid-cols-12' : 'lg:grid-cols-3'} gap-4`}>
          {/* Floor Selection Grid (Scrollable) */}
          <div className={`${isMilestoneBoss ? 'lg:col-span-4' : 'lg:col-span-1'} bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 sm:p-4 flex flex-col gap-3 max-h-[600px] overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-neutral-300">도전 가능한 층수 (1층~50층)</span>
              <span className="text-[10px] text-neutral-500 font-mono">1층부터 순차 도전</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {SPIRE_FLOORS_DATA.map((fl) => {
                const isCleared = fl.floor <= maxClearedFloor;
                const isUnlocked = fl.floor <= maxClearedFloor + 1;
                const isSelected = fl.floor === selectedFloor;
                const isBoss10 = fl.floor % 10 === 0;

                return (
                  <button
                    key={fl.floor}
                    disabled={!isUnlocked || isBattling}
                    onClick={() => setSelectedFloor(fl.floor)}
                    className={`w-full text-left p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/70 text-indigo-200 ring-2 ring-indigo-500/50'
                        : isCleared
                        ? 'border-emerald-800/60 bg-neutral-950 text-neutral-300 hover:bg-neutral-800'
                        : isUnlocked
                        ? 'border-amber-800/80 bg-neutral-950 text-amber-300 hover:bg-neutral-800 font-bold'
                        : 'border-neutral-900 bg-neutral-950/40 text-neutral-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-[11px] ${
                        isBoss10
                          ? 'bg-red-950 text-red-300 border border-red-600'
                          : isCleared
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-neutral-900 text-neutral-400'
                      }`}>
                        {fl.floor}
                      </span>
                      <div>
                        <div className="font-bold flex items-center gap-1">
                          <span>{fl.monster.name}</span>
                          {isBoss10 && <span className="text-[9px] bg-red-950 text-red-400 px-1 rounded">👑 대보스</span>}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          HP: {fl.monster.maxHp.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {fl.rewardGem && (
                        <span className="text-[10px] text-pink-400 font-bold">💎 보석</span>
                      )}
                      {isCleared ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : !isUnlocked ? (
                        <Lock className="w-3.5 h-3.5 text-neutral-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combat Stage (Big Screen Mode for 10-floor Bosses) */}
          <div className={`${isMilestoneBoss ? 'lg:col-span-8' : 'lg:col-span-2'} bg-neutral-900 border-2 ${isMilestoneBoss ? 'border-red-600/80 shadow-2xl shadow-red-950' : 'border-neutral-800'} rounded-xl p-4 flex flex-col justify-between gap-4 relative overflow-hidden`}>
            {/* Top Battle Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-indigo-950 border border-indigo-600 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                    제 {selectedFloor}층 {isMilestoneBoss && '👑 대보스 컷씬 전장'}
                  </span>
                  <span className="text-xs text-amber-400 font-bold">{floorData.modifierText}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {floorData.monster.name}
                </h3>
              </div>

              {isBattling && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">남은 시간:</span>
                  <span className={`text-base font-mono font-bold px-3 py-1 rounded-lg border ${
                    battleTimer <= 10 ? 'bg-red-950 text-red-400 border-red-600 animate-ping' : 'bg-neutral-950 text-yellow-300 border-neutral-700'
                  }`}>
                    ⏱️ {battleTimer}s
                  </span>
                </div>
              )}
            </div>

            {/* Boss HP Bar */}
            <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Skull className="w-4 h-4 text-red-400" />
                  <span>몬스터 체력</span>
                </span>
                <span className="text-red-400 font-bold">
                  {monsterHp.toLocaleString()} / {floorData.monster.maxHp.toLocaleString()} ({Math.round(hpPercent)}%)
                </span>
              </div>
              <div className="w-full h-3.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700 relative">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 transition-all duration-100"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* Interactive Clickable Canvas Area */}
            <div
              onClick={handleClickAttack}
              className={`relative w-full ${isMilestoneBoss ? 'h-72 sm:h-96' : 'h-64 sm:h-80'} bg-gradient-to-b from-neutral-950 to-neutral-900 border-2 ${
                isHit ? 'border-red-500 scale-[0.99]' : 'border-neutral-800'
              } rounded-xl flex items-center justify-center cursor-crosshair overflow-hidden select-none transition-all active:scale-95 shadow-inner`}
            >
              {/* Monster Pixel Canvas */}
              <canvas
                ref={canvasRef}
                width={isMilestoneBoss ? 480 : 360}
                height={isMilestoneBoss ? 360 : 280}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />

              {/* Floating Damage Numbers */}
              {damageNumbers.map((d) => (
                <div
                  key={d.id}
                  className={`absolute pointer-events-none font-mono font-black text-sm sm:text-base animate-bounce ${
                    d.isCrit ? 'text-amber-300 scale-125 drop-shadow-[0_0_8px_#f59e0b]' : 'text-red-400'
                  }`}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                >
                  {d.text}
                </div>
              ))}

              {/* Click Hint Overlay */}
              <div className="absolute bottom-3 right-3 bg-neutral-950/80 border border-neutral-700 px-3 py-1.5 rounded-lg text-[11px] text-amber-300 flex items-center gap-1.5 pointer-events-none font-bold">
                <MousePointerClick className="w-4 h-4 animate-bounce" />
                <span>화면 클릭 시 즉시 참격 공격!</span>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-neutral-400 flex items-center gap-3">
                <span>보상: <strong className="text-cyan-300">💎 다이아 +{floorData.rewardDiamonds}</strong>, <strong className="text-pink-300">가루 +{floorData.rewardDust}</strong></span>
                {floorData.rewardGem && (
                  <span className="text-amber-400 font-bold">★ 최초 클리어 시 100% 보석 드랍!</span>
                )}
              </div>

              {!isBattling ? (
                <button
                  onClick={handleInitiateFloor}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4" />
                  <span>제 {selectedFloor}층 도전 시작 (START)</span>
                </button>
              ) : (
                <button
                  onClick={handleClickAttack}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm sm:text-base rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950 transition-all hover:scale-105 active:scale-95"
                >
                  <Swords className="w-5 h-5 animate-pulse" />
                  <span>연속 참격 공격! (Click Attack)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Gem Sockets & Synthesis */}
      {activeTab === 'socket' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Equipped Sockets (Max 4) */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-amber-400" />
                <span>검 소켓 보석 장착소 (최대 4개)</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {equippedGems.length} / 4개 장착 중
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, idx) => {
                const gem = equippedGems[idx];
                return (
                  <div
                    key={`slot-${idx}`}
                    className={`h-28 rounded-xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
                      gem
                        ? 'border-indigo-500 bg-indigo-950/40 text-neutral-200'
                        : 'border-dashed border-neutral-800 bg-neutral-950/60 text-neutral-600'
                    }`}
                  >
                    {gem ? (
                      <div className="flex flex-col items-center justify-between h-full w-full">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                        <div className="text-[11px] font-bold line-clamp-1">{gem.name}</div>
                        <div className="text-[10px] text-amber-300 font-mono">+{gem.statValue}%</div>
                        <button
                          onClick={() => handleToggleEquipGem(gem.id)}
                          className="text-[9px] bg-red-950 text-red-300 px-2 py-0.5 rounded hover:bg-red-900 cursor-pointer"
                        >
                          해제
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Plus className="w-5 h-5 opacity-40" />
                        <span className="text-[10px]">빈 슬롯</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              장착된 보석은 모든 던전, 월드 보스, 검탑 전투에서 공격력 및 추가 스탯을 대폭 증가시킵니다.
            </p>
          </div>

          {/* Right: Gem Inventory & 3-to-1 Synthesis */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>보유한 보석 인벤토리 및 3합 1성 연성</span>
            </h3>

            {(stats.socketGems || []).length === 0 ? (
              <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 text-xs">
                보유한 보석이 없습니다. 무한의 검탑 5층 단위 보스를 정복하여 보석을 획득하세요!
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {(stats.socketGems || []).map((gem) => (
                  <div
                    key={gem.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                        <Gem className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-200">{gem.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {gem.statType === 'emerald' ? `강화 성공률 +${gem.statValue}%` : `공격력 증폭 +${gem.statValue}%`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleEquipGem(gem.id)}
                        className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                          gem.isEquipped
                            ? 'bg-neutral-800 text-neutral-400 hover:bg-red-950 hover:text-red-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                      >
                        {gem.isEquipped ? '장착 중' : '장착'}
                      </button>

                      <button
                        onClick={() => handleSynthesizeGems(gem.type, gem.tier)}
                        className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-600 text-[10px] font-bold text-amber-300 rounded cursor-pointer"
                        title="동일 티어 3개로 상위 티어 합성"
                      >
                        3합 합성
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
