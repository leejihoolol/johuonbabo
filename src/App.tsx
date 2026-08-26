import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AnvilView } from './components/AnvilView';
import { DungeonView } from './components/DungeonView';
import { PrestigeView } from './components/PrestigeView';
import { TierStaircaseView } from './components/TierStaircaseView';
import { RunesAndElementsView } from './components/RunesAndElementsView';
import { BlacksmithView } from './components/BlacksmithView';
import { CodexView } from './components/CodexView';
import { ShopView } from './components/ShopView';
import { AchievementsView } from './components/AchievementsView';
import { SaveModal } from './components/SaveModal';
import { CheatModal } from './components/CheatModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { EndingCinematicModal } from './components/EndingCinematicModal';
import { PartyLobbyModal } from './components/PartyLobbyModal';
import { PartyBattleArena } from './components/PartyBattleArena';
import { SpeedrunHUD } from './components/SpeedrunHUD';
import { SpeedrunSetupModal } from './components/SpeedrunSetupModal';
import { SpeedrunVictoryModal } from './components/SpeedrunVictoryModal';

import { Achievement, ElementType, GameLog, Monster, PartyRoom, PlayerStats, Rune, StoredSword, Sword, SpeedrunGoal, SpeedrunState, SpeedrunRecord } from './types';
import { SWORDS_DATA } from './data/swords';
import { WORLDS_DATA, TIER_STAIRCASES_DATA } from './data/worlds';
import { INITIAL_ACHIEVEMENTS, INITIAL_RUNES } from './data/research';
import { COSMIC_RELICS_DATA, INITIAL_SWORD_SPIRITS } from './data/contentsData';
import { WorldBossView } from './components/WorldBossView';
import { SwordTowerView } from './components/SwordTowerView';
import { SwordSpiritView } from './components/SwordSpiritView';
import { sound } from './utils/sound';
import { getWorldSword, calculateTotalMultipliers } from './utils/worldSwordHelper';
import { subscribeToPartyRoom } from './utils/firebaseParty';

const STORAGE_KEY = 'PIXEL_SWORD_MASTER_SAVE_V2';

const DEFAULT_STATS: PlayerStats = {
  gold: 500,
  diamonds: 100,
  enhancementStones: 15,
  ancientScrolls: 2,
  luckyPotions: 1,
  swordShards: 0,
  spiritDust: 50,

  currentSwordLevel: 0,
  maxSwordLevelReached: 0,

  totalEnhanceAttempts: 0,
  totalEnhanceSuccess: 0,
  totalEnhanceFails: 0,
  totalSwordsDestroyed: 0,

  currentStageId: 1,
  highestStageCleared: 0,
  currentMonsterIndex: 0,

  elementInfusion: 'none',
  elementLevel: {
    none: 0,
    fire: 0,
    ice: 0,
    lightning: 0,
    holy: 0,
    dark: 0,
  },

  equippedRunes: [null, null, null],
  inventoryRunes: INITIAL_RUNES,

  researches: {
    res_success: 0,
    res_destroy_reduce: 0,
    res_gold_mult: 0,
    res_auto_mine: 0,
    res_crit_boost: 0,
    res_qte_window: 0,
  },
  completedAchievements: [],
  unlockedCodex: [0],

  activeAnvilSkin: 'basic',

  autoEnhanceTarget: 10,
  autoEnhanceActive: false,
  useSafetyScrollAuto: true,
  useLuckyPotionAuto: false,

  soundEnabled: true,
  musicEnabled: false,
  screenShake: true,
  damageNumbers: true,

  // Prestige & World Stats
  rebirthCount: 0,
  rebirthPoints: 0,
  rebirthStats: {
    atk_mult: 0,
    gold_mult: 0,
    enhance_rate: 0,
    stone_drop: 0,
    crit_rate: 0,
    crit_dmg: 0,
  },

  superRebirthCount: 0,
  currentWorldId: 1,
  worldProgress: {
    1: { currentSwordLevel: 0, maxSwordLevelReached: 0, highestStageCleared: 0 },
  },
  swordVault: [],
  unlockedTiers: [],

  // New Content Stats
  worldBossHighScore: 0,
  worldBossRaidTokens: 100,
  cosmicRelics: COSMIC_RELICS_DATA,
  spireCurrentFloor: 1,
  spireMaxFloor: 0,
  socketGems: [],
  swordSpirits: INITIAL_SWORD_SPIRITS,
  activeSpiritId: 'spirit_igna',

  // Cheat Mode & Admin
  cheatUnlocked: false,
  adminUnlocked: false,
  unlockedCheatMode: false,
  cheatSuccessRate100: false,
  cheatDmg1000x: false,
};

export default function App() {
  // Load saved state or default
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATS, ...parsed };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_STATS;
  });

  const [activeTab, setActiveTab] = useState<string>('anvil');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCheatModalOpen, setIsCheatModalOpen] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [activePartyRoom, setActivePartyRoom] = useState<PartyRoom | null>(null);
  const [partyPresetTarget, setPartyPresetTarget] = useState<any>(null);
  const [isEndingActive, setIsEndingActive] = useState(false);
  const [isAutoEnhancing, setIsAutoEnhancing] = useState(false);

  // Version 3-click trigger state
  const [versionClicks, setVersionClicks] = useState(0);
  const clickTimeoutRef = useRef<number | null>(null);

  const handleVersionClick = () => {
    sound.playClick();
    const nextCount = versionClicks + 1;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (nextCount >= 3) {
      setVersionClicks(0);
      sound.playLevelUp();
      setIsAdminPasswordModalOpen(true);
    } else {
      setVersionClicks(nextCount);
      clickTimeoutRef.current = window.setTimeout(() => {
        setVersionClicks(0);
      }, 2500);
    }
  };

  const handleAdminSuccess = () => {
    setIsAdminPasswordModalOpen(false);
    setStats((prev) => {
      const updated = {
        ...prev,
        adminUnlocked: true,
        cheatUnlocked: true,
        unlockedCheatMode: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsCheatModalOpen(true);
    addLog('[어드민] 보안 인증 성공! 최고 관리자 치트 콘솔이 영구 개방되었습니다.', 'boss');
  };

  // Speedrun State
  const [speedrunState, setSpeedrunState] = useState<SpeedrunState>({
    isActive: false,
    isPaused: false,
    isCompleted: false,
    startedAt: 0,
    elapsedMs: 0,
    goal: {
      presetName: '0환생 +20강',
      targetRebirths: null,
      targetSuperRebirths: null,
      targetTier: null,
      targetEnding: false,
      targetSwordLevel: 20,
    },
    splits: [],
    startRebirthCount: 0,
    startSuperRebirthCount: 0,
    startSwordLevel: 0,
    startEnhanceAttempts: 0,
    startMode: 'clean',
  });
  const [isSpeedrunSetupModalOpen, setIsSpeedrunSetupModalOpen] = useState(false);
  const [isSpeedrunVictoryModalOpen, setIsSpeedrunVictoryModalOpen] = useState(false);
  const [speedrunFinalTimeFormatted, setSpeedrunFinalTimeFormatted] = useState('00:00:00.00');

  const [logs, setLogs] = useState<GameLog[]>([
    {
      id: 'init_log',
      text: '[대장간] 픽셀 대장간에 오신 것을 환영합니다! 모루를 두드려 전설의 검을 제련하세요.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Current and Next Sword Data for Current World
  const currentWorldId = stats.currentWorldId || 1;
  const currentSword: Sword = getWorldSword(currentWorldId, stats.currentSwordLevel || 0);
  const nextSword: Sword | null =
    (stats.currentSwordLevel || 0) < 35 ? getWorldSword(currentWorldId, (stats.currentSwordLevel || 0) + 1) : null;

  // Add Log Helper
  const addLog = (text: string, type: GameLog['type']) => {
    const newLog: GameLog = {
      id: `${Date.now()}_${Math.random()}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 24)]);
  };

  // Real-time Firestore Active Party Room Sync
  useEffect(() => {
    if (!activePartyRoom?.id) return;
    const unsub = subscribeToPartyRoom(activePartyRoom.id, (room) => {
      if (room) {
        setActivePartyRoom(room);
        if (room.status === 'victory') {
          addLog(`🎉 [파티 승리] 파티원들과 함께 ${room.targetTitle} 레이드를 완벽하게 정복했습니다! (보상 1.5배 적용)`, 'boss');
        }
      }
    });
    return () => unsub();
  }, [activePartyRoom?.id]);

  // Auto-Save interval (Every 5 seconds)
  useEffect(() => {
    const saveTimer = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
      } catch {
        // Ignored
      }
    }, 5000);
    return () => clearInterval(saveTimer);
  }, [stats]);

  // Auto-Mine Stones Research Timer (Every 10 seconds)
  useEffect(() => {
    const autoMineLevel = stats.researches['res_auto_mine'] || 0;
    if (autoMineLevel <= 0) return;

    const mineInterval = setInterval(() => {
      const multipliers = calculateTotalMultipliers(stats);
      const stoneBonus = multipliers.rpStoneBonus || 1;
      const amount = Math.floor(autoMineLevel * 1 * stoneBonus);
      setStats((prev) => ({
        ...prev,
        enhancementStones: prev.enhancementStones + amount,
      }));
    }, 10000);

    return () => clearInterval(mineInterval);
  }, [stats.researches, stats.rebirthStats]);

  // Speedrun Goal Completion Watcher
  useEffect(() => {
    if (!speedrunState.isActive || speedrunState.isCompleted) return;

    const { goal } = speedrunState;

    const currentSwordLevel = stats.currentSwordLevel || 0;
    const currentRebirths = stats.rebirthCount || 0;
    const currentSuperRebirths = stats.superRebirthCount || 0;
    const unlockedTiers = stats.unlockedTiers || [];

    const rebirthGoalMet = goal.targetRebirths !== null ? currentRebirths >= goal.targetRebirths : true;
    const superRebirthGoalMet = goal.targetSuperRebirths !== null ? currentSuperRebirths >= goal.targetSuperRebirths : true;
    const tierGoalMet = goal.targetTier !== null ? unlockedTiers.includes(goal.targetTier) : true;
    const swordLevelGoalMet = goal.targetSwordLevel !== null ? currentSwordLevel >= goal.targetSwordLevel : true;
    const endingGoalMet = goal.targetEnding ? Boolean(stats.theEndCompleted || isEndingActive) : true;

    const hasAnyGoal =
      goal.targetRebirths !== null ||
      goal.targetSuperRebirths !== null ||
      goal.targetTier !== null ||
      goal.targetEnding ||
      goal.targetSwordLevel !== null;

    if (hasAnyGoal && rebirthGoalMet && superRebirthGoalMet && tierGoalMet && swordLevelGoalMet && endingGoalMet) {
      // Goal accomplished! Stop stopwatch immediately!
      const finalElapsed =
        speedrunState.elapsedMs + (speedrunState.isPaused ? 0 : Date.now() - speedrunState.startedAt);

      const totalMs = finalElapsed;
      const ms = Math.floor((totalMs % 1000) / 10);
      const totalSec = Math.floor(totalMs / 1000);
      const sec = totalSec % 60;
      const totalMin = Math.floor(totalSec / 60);
      const min = totalMin % 60;
      const hrs = Math.floor(totalMin / 60);

      const formatted = `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec
        .toString()
        .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

      setSpeedrunFinalTimeFormatted(formatted);
      setSpeedrunState((prev) => ({
        ...prev,
        isCompleted: true,
        elapsedMs: finalElapsed,
      }));

      // Save to Record storage
      const newRecord: SpeedrunRecord = {
        id: `${Date.now()}_${Math.random()}`,
        title: goal.presetName || '커스텀 목표 스피드런',
        goal,
        timeFormatted: formatted,
        elapsedMs: finalElapsed,
        clearedAt: Date.now(),
        splits: speedrunState.splits,
        enhanceAttempts: Math.max(0, stats.totalEnhanceAttempts - speedrunState.startEnhanceAttempts),
        finalSwordLevel: currentSwordLevel,
        startMode: speedrunState.startMode,
      };

      try {
        const saved = localStorage.getItem('PIXEL_SWORD_SPEEDRUN_RECORDS');
        const list: SpeedrunRecord[] = saved ? JSON.parse(saved) : [];
        const updated = [newRecord, ...list];
        localStorage.setItem('PIXEL_SWORD_SPEEDRUN_RECORDS', JSON.stringify(updated));
      } catch {
        // Ignored
      }

      sound.playSuccess(true);
      setIsSpeedrunVictoryModalOpen(true);
      addLog(`🏆 [스피드런 정복!] 설정한 목표를 ${formatted} 기록으로 달성하여 타이머가 정지되었습니다!`, 'boss');
    }
  }, [
    stats.currentSwordLevel,
    stats.rebirthCount,
    stats.superRebirthCount,
    stats.unlockedTiers,
    stats.theEndCompleted,
    isEndingActive,
    speedrunState.isActive,
    speedrunState.isCompleted,
    speedrunState.goal,
  ]);

  // Speedrun Action Handlers
  const handleStartSpeedrun = (goal: SpeedrunGoal, mode: 'clean' | 'continuous') => {
    if (mode === 'clean') {
      try {
        localStorage.setItem('SPEEDRUN_CLEAN_BACKUP_SAVE', JSON.stringify(stats));
      } catch {
        // Ignored
      }
      setStats(DEFAULT_STATS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATS));
    }

    setSpeedrunState({
      isActive: true,
      isPaused: false,
      isCompleted: false,
      startedAt: Date.now(),
      elapsedMs: 0,
      goal,
      splits: [],
      startRebirthCount: mode === 'clean' ? 0 : stats.rebirthCount || 0,
      startSuperRebirthCount: mode === 'clean' ? 0 : stats.superRebirthCount || 0,
      startSwordLevel: mode === 'clean' ? 0 : stats.currentSwordLevel || 0,
      startEnhanceAttempts: mode === 'clean' ? 0 : stats.totalEnhanceAttempts || 0,
      startMode: mode,
    });

    setIsSpeedrunSetupModalOpen(false);
    addLog(`[스피드런 시작!] '${goal.presetName || '커스텀 목표'}' 챌린지가 시작되었습니다! 상단 타이머가 작동합니다.`, 'boss');
  };

  const handlePauseSpeedrun = () => {
    setSpeedrunState((prev) => {
      if (!prev.isActive || prev.isPaused) return prev;
      return {
        ...prev,
        isPaused: true,
        elapsedMs: prev.elapsedMs + (Date.now() - prev.startedAt),
      };
    });
    addLog('[스피드런] 타이머가 일시정지되었습니다.', 'system');
  };

  const handleResumeSpeedrun = () => {
    setSpeedrunState((prev) => {
      if (!prev.isActive || !prev.isPaused) return prev;
      return {
        ...prev,
        isPaused: false,
        startedAt: Date.now(),
      };
    });
    addLog('[스피드런] 타이머가 다시 시작되었습니다.', 'system');
  };

  const handleAbortSpeedrun = () => {
    setSpeedrunState({
      isActive: false,
      isPaused: false,
      isCompleted: false,
      startedAt: 0,
      elapsedMs: 0,
      goal: {
        presetName: '0환생 +20강',
        targetRebirths: null,
        targetSuperRebirths: null,
        targetTier: null,
        targetEnding: false,
        targetSwordLevel: 20,
      },
      splits: [],
      startRebirthCount: 0,
      startSuperRebirthCount: 0,
      startSwordLevel: 0,
      startEnhanceAttempts: 0,
      startMode: 'clean',
    });
    addLog('[스피드런 중단] 진행 중이던 스피드런을 종료했습니다.', 'system');
  };

  // Core Enhance Logic with Guaranteed Safety Scroll Consumption & Protection
  const handleEnhance = (useQteBonus = false): { success: boolean; resultType: 'success' | 'fail' | 'destroy' | 'drop' } => {
    if (currentSword.level >= 35) {
      setIsAutoEnhancing(false);
      return { success: false, resultType: 'fail' };
    }

    if (stats.gold < currentSword.costGold || stats.enhancementStones < currentSword.costStones) {
      addLog(`재화 부족: ${currentSword.costGold.toLocaleString()}G / ${currentSword.costStones}개 강화석 필요`, 'fail');
      setIsAutoEnhancing(false);
      return { success: false, resultType: 'fail' };
    }

    // Deduct cost
    let newGold = stats.gold - currentSword.costGold;
    let newStones = stats.enhancementStones - currentSword.costStones;
    let newScrolls = stats.ancientScrolls;
    let newPotions = stats.luckyPotions;
    let newShards = stats.swordShards;

    // Calculate bonuses
    const researchSuccessBonus = (stats.researches['res_success'] || 0) * 0.5;
    const researchDestroyReduce = (stats.researches['res_destroy_reduce'] || 0) * 1.0;
    const multipliers = calculateTotalMultipliers(stats);
    const rebirthSuccessBonus = multipliers.rpSuccessBonus || 0;

    // Rune luck bonus
    let runeLuckBonus = 0;
    stats.equippedRunes.forEach((r) => {
      if (r && r.type === 'enhanceLuck') runeLuckBonus += r.value;
    });

    // Anvil Skin Bonus
    let skinBonus = 0;
    if (stats.activeAnvilSkin === 'iron') skinBonus = 1;
    if (stats.activeAnvilSkin === 'flame') skinBonus = 2;
    if (stats.activeAnvilSkin === 'cyber') skinBonus = 3;
    if (stats.activeAnvilSkin === 'divine') skinBonus = 5;

    // Lucky potion use
    let potionBonus = 0;
    if (stats.useLuckyPotionAuto && newPotions > 0) {
      potionBonus = 10;
      newPotions -= 1;
      addLog(`[행운의 영약] 강화 성공 확률 +10% 적용 (남은 비약: ${newPotions}개)`, 'system');
    }

    // Safety scroll consumption for guaranteed 0% destruction at dangerous stages
    let effectiveDestroyRate = Math.max(0, currentSword.destroyRate - researchDestroyReduce);
    if (currentSword.destroyRate > 0) {
      if (stats.useSafetyScrollAuto && newScrolls > 0) {
        newScrolls -= 1;
        effectiveDestroyRate = 0; // 100% destruction immunity!
        addLog(`[보호서 소모] 파괴 방지 주문서 1장을 사용하여 파괴 위험을 차단했습니다. (남은 보호서: ${newScrolls}장)`, 'system');
      } else if (stats.useSafetyScrollAuto && newScrolls <= 0) {
        addLog(`[경고] 보호서가 소진되어 파괴 위험이 존재합니다!`, 'destroy');
      }
    }

    const qteBonus = useQteBonus ? 10 : 0;
    let totalSuccessChance = Math.min(
      100,
      Math.max(1, currentSword.successRate + researchSuccessBonus + rebirthSuccessBonus + runeLuckBonus + skinBonus + potionBonus + qteBonus)
    );

    // 100% Cheat Mode
    if (stats.cheatSuccessRate100) {
      totalSuccessChance = 100;
      effectiveDestroyRate = 0;
    }

    const roll = Math.random() * 100;
    const isSuccess = roll < totalSuccessChance;

    if (isSuccess) {
      // SUCCESS!
      const nextLvl = currentSword.level + 1;
      const nextSwordObj = getWorldSword(currentWorldId, nextLvl);
      const newMax = Math.max(stats.maxSwordLevelReached, nextLvl);
      const newCodex = stats.unlockedCodex.includes(nextLvl) ? stats.unlockedCodex : [...stats.unlockedCodex, nextLvl];

      sound.playSuccess(nextLvl >= 10);
      addLog(`[강화 성공!] +${currentSword.level} → +${nextLvl} [${nextSwordObj.name}] 달성!`, 'success');

      // Update world progress
      const updatedWorldProgress = {
        ...stats.worldProgress,
        [currentWorldId]: {
          currentSwordLevel: nextLvl,
          maxSwordLevelReached: Math.max(stats.worldProgress?.[currentWorldId]?.maxSwordLevelReached || 0, nextLvl),
        },
      };

      setStats((prev) => ({
        ...prev,
        gold: newGold,
        enhancementStones: newStones,
        ancientScrolls: newScrolls,
        luckyPotions: newPotions,
        currentSwordLevel: nextLvl,
        maxSwordLevelReached: newMax,
        worldProgress: updatedWorldProgress,
        totalEnhanceAttempts: prev.totalEnhanceAttempts + 1,
        totalEnhanceSuccess: prev.totalEnhanceSuccess + 1,
        unlockedCodex: newCodex,
      }));

      // Check if auto-enhance target achieved
      if (nextLvl >= stats.autoEnhanceTarget) {
        setIsAutoEnhancing(false);
        addLog(`[자동] 목표 강화 수치(+${stats.autoEnhanceTarget})를 달성하여 자동 강화를 종료합니다.`, 'system');
      }

      return { success: true, resultType: 'success' };
    } else {
      // FAIL!
      sound.playFail();

      // Check Destruction
      let isDestroyed = false;
      if (effectiveDestroyRate > 0) {
        const destroyRoll = Math.random() * 100;
        if (destroyRoll < effectiveDestroyRate) {
          isDestroyed = true;
        }
      }

      if (isDestroyed) {
        // Destroyed!
        sound.playDestroy();
        const shardsGained = Math.max(2, currentSword.level * 2);
        newShards += shardsGained;
        addLog(`[검 파괴] +${currentSword.level} ${currentSword.name}이(가) 산산조각났습니다! (파편 +${shardsGained}개 획득)`, 'destroy');
        setIsAutoEnhancing(false);

        const updatedWorldProgress = {
          ...stats.worldProgress,
          [currentWorldId]: {
            ...stats.worldProgress?.[currentWorldId],
            currentSwordLevel: 0,
          },
        };

        setStats((prev) => ({
          ...prev,
          gold: newGold,
          enhancementStones: newStones,
          ancientScrolls: newScrolls,
          luckyPotions: newPotions,
          swordShards: newShards,
          currentSwordLevel: 0, // Reset to +0
          worldProgress: updatedWorldProgress,
          totalEnhanceAttempts: prev.totalEnhanceAttempts + 1,
          totalEnhanceFails: prev.totalEnhanceFails + 1,
          totalSwordsDestroyed: prev.totalSwordsDestroyed + 1,
        }));

        return { success: false, resultType: 'destroy' };
      }

      // Check Drop
      if (currentSword.dropRate > 0) {
        const dropRoll = Math.random() * 100;
        if (dropRoll < currentSword.dropRate) {
          const droppedLvl = Math.max(0, currentSword.level - 1);
          addLog(`[강화 실패] 단계 하락: +${currentSword.level} → +${droppedLvl}`, 'drop');

          const updatedWorldProgress = {
            ...stats.worldProgress,
            [currentWorldId]: {
              ...stats.worldProgress?.[currentWorldId],
              currentSwordLevel: droppedLvl,
            },
          };

          setStats((prev) => ({
            ...prev,
            gold: newGold,
            enhancementStones: newStones,
            ancientScrolls: newScrolls,
            luckyPotions: newPotions,
            currentSwordLevel: droppedLvl,
            worldProgress: updatedWorldProgress,
            totalEnhanceAttempts: prev.totalEnhanceAttempts + 1,
            totalEnhanceFails: prev.totalEnhanceFails + 1,
          }));

          return { success: false, resultType: 'drop' };
        }
      }

      // Retain level
      addLog(`[강화 실패] 단계 유지 (+${currentSword.level})`, 'fail');

      setStats((prev) => ({
        ...prev,
        gold: newGold,
        enhancementStones: newStones,
        ancientScrolls: newScrolls,
        luckyPotions: newPotions,
        totalEnhanceAttempts: prev.totalEnhanceAttempts + 1,
        totalEnhanceFails: prev.totalEnhanceFails + 1,
      }));

      return { success: false, resultType: 'fail' };
    }
  };

  // Auto-Enhance Loop Ticker
  useEffect(() => {
    if (!isAutoEnhancing) return;

    const timer = setTimeout(() => {
      if (stats.currentSwordLevel >= stats.autoEnhanceTarget) {
        setIsAutoEnhancing(false);
        return;
      }
      handleEnhance(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [isAutoEnhancing, stats.currentSwordLevel, stats.gold, stats.enhancementStones]);

  // Sell Current Sword
  const handleSellSword = () => {
    if (currentSword.level <= 0) return;
    const multipliers = calculateTotalMultipliers(stats);
    const goldBonus = (stats.researches['res_gold_mult'] || 0) * 0.15;
    let runeGoldBonus = 0;
    stats.equippedRunes.forEach((r) => {
      if (r && r.type === 'goldBonus') runeGoldBonus += r.value / 100;
    });

    const finalGold = Math.floor(currentSword.sellPrice * (1 + goldBonus + runeGoldBonus) * multipliers.totalGoldMult);
    sound.playCoin();
    addLog(`[판매] +${currentSword.level} ${currentSword.name} 판매 완료 (+${finalGold.toLocaleString()} 골드 획득)`, 'loot');

    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        ...stats.worldProgress?.[currentWorldId],
        currentSwordLevel: 0,
      },
    };

    setStats((prev) => ({
      ...prev,
      gold: prev.gold + finalGold,
      currentSwordLevel: 0,
      worldProgress: updatedWorldProgress,
    }));
  };

  // Dismantle Current Sword into Shards
  const handleDismantleSword = () => {
    if (currentSword.level <= 0) return;
    const shardsGained = Math.max(1, currentSword.level * 2);
    sound.playCoin();
    addLog(`[분해] +${currentSword.level} ${currentSword.name} 분해 완료 (+${shardsGained}개 파편 획득)`, 'loot');

    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        ...stats.worldProgress?.[currentWorldId],
        currentSwordLevel: 0,
      },
    };

    setStats((prev) => ({
      ...prev,
      swordShards: prev.swordShards + shardsGained,
      currentSwordLevel: 0,
      worldProgress: updatedWorldProgress,
    }));
  };

  // Dungeon Monster Defeated Loot Handler
  const handleMonsterDefeated = (monster: Monster, stageId: number) => {
    const multipliers = calculateTotalMultipliers(stats);
    const goldBonus = (stats.researches['res_gold_mult'] || 0) * 0.15;
    let runeGoldBonus = 0;
    stats.equippedRunes.forEach((r) => {
      if (r && r.type === 'goldBonus') runeGoldBonus += r.value / 100;
    });

    const earnedGold = Math.floor(monster.goldReward * (1 + goldBonus + runeGoldBonus) * multipliers.totalGoldMult);
    const earnedStones = Math.floor(monster.stoneReward * (multipliers.rpStoneBonus || 1));
    const earnedDiamonds = monster.isBoss ? 20 : 0;

    // Rare drop protection scroll from boss
    let scrollDrop = false;
    if (monster.isBoss && Math.random() < 0.08) {
      scrollDrop = true;
      addLog(`[희귀 드랍] 보스로부터 파괴 방지 주문서 1장을 획득했습니다!`, 'loot');
    }

    const earnedDust = monster.isBoss ? Math.floor(Math.random() * 20) + 15 : (Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0);

    setStats((prev) => ({
      ...prev,
      gold: prev.gold + earnedGold,
      enhancementStones: prev.enhancementStones + earnedStones,
      diamonds: prev.diamonds + earnedDiamonds,
      spiritDust: (prev.spiritDust || 0) + earnedDust,
      ancientScrolls: scrollDrop ? prev.ancientScrolls + 1 : prev.ancientScrolls,
    }));
  };

  // Stage Clear Handler
  const handleStageClear = (stageId: number) => {
    addLog(`[던전 정복] ${stageId}단계 보스를 처치하고 스테이지를 클리어했습니다!`, 'boss');
    setStats((prev) => ({
      ...prev,
      highestStageCleared: Math.max(prev.highestStageCleared, stageId),
      diamonds: prev.diamonds + 50,
    }));
  };

  // Research Upgrade Handler
  const handleUpgradeResearch = (researchId: string, cost: number) => {
    if (stats.gold < cost) return;
    sound.playLevelUp();
    setStats((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      researches: {
        ...prev.researches,
        [researchId]: (prev.researches[researchId] || 0) + 1,
      },
    }));
    addLog(`[연구 완료] 대장간 연구 [${researchId}] 레벨업 완료!`, 'system');
  };

  // Rebirth Handler (Unlocked at 100k Gold)
  const handleRebirth = () => {
    if (stats.gold < 100000) return;

    sound.playSuccess(true);
    const newRebirthCount = (stats.rebirthCount || 0) + 1;

    // RP calculated from Rebirth 10+
    let pointsGained = 0;
    if (newRebirthCount >= 10) {
      pointsGained = Math.max(1, Math.floor(Math.log10(Math.max(1, stats.gold / 10000)))) + 1;
    }

    addLog(
      `[환생 완료] ${newRebirthCount}회차 환생 성공! (영구 골드 획득량 +100% 누적${pointsGained > 0 ? `, +${pointsGained} RP 획득` : ''})`,
      'boss'
    );

    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        ...stats.worldProgress?.[currentWorldId],
        currentSwordLevel: 0,
      },
    };

    setStats((prev) => ({
      ...prev,
      gold: 0,
      currentSwordLevel: 0,
      currentStageId: 1,
      rebirthCount: newRebirthCount,
      rebirthPoints: (prev.rebirthPoints || 0) + pointsGained,
      worldProgress: updatedWorldProgress,
    }));
  };

  // Super Rebirth Handler (Unlocked at 100 Rebirths)
  const handleSuperRebirth = () => {
    if ((stats.rebirthCount || 0) < 100) return;

    sound.playSuccess(true);
    const newSuperRebirthCount = (stats.superRebirthCount || 0) + 1;

    addLog(
      `[초환생 완료] 초환생 ${newSuperRebirthCount}회 달성! (모든 월드 전 능력치 x3배 및 골드 x5배 증폭, 상위 월드 포탈 개방!)`,
      'boss'
    );

    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        ...stats.worldProgress?.[currentWorldId],
        currentSwordLevel: 0,
      },
    };

    setStats((prev) => ({
      ...prev,
      gold: 0,
      currentSwordLevel: 0,
      currentStageId: 1,
      rebirthCount: 0, // Resets standard rebirth count
      superRebirthCount: newSuperRebirthCount,
      worldProgress: updatedWorldProgress,
    }));
  };

  // Upgrade Rebirth Stat
  const handleUpgradeRebirthStat = (statKey: string, cost: number) => {
    if ((stats.rebirthPoints || 0) < cost) return;
    setStats((prev) => ({
      ...prev,
      rebirthPoints: (prev.rebirthPoints || 0) - cost,
      rebirthStats: {
        ...prev.rebirthStats,
        [statKey]: (prev.rebirthStats?.[statKey] || 0) + 1,
      },
    }));
    addLog(`[환생 스탯] [${statKey}] 연구 레벨업 완료!`, 'system');
  };

  // Switch Multi-World
  const handleSwitchWorld = (targetWorldId: number) => {
    const targetWorld = WORLDS_DATA.find((w) => w.id === targetWorldId);
    if (!targetWorld || stats.superRebirthCount < targetWorld.requiredSuperRebirth) return;

    // Save current world progress
    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        currentSwordLevel: stats.currentSwordLevel || 0,
        maxSwordLevelReached: Math.max(stats.worldProgress?.[currentWorldId]?.maxSwordLevelReached || 0, stats.currentSwordLevel || 0),
      },
    };

    const targetSavedLevel = updatedWorldProgress[targetWorldId]?.currentSwordLevel || 0;

    setStats((prev) => ({
      ...prev,
      currentWorldId: targetWorldId,
      currentSwordLevel: targetSavedLevel,
      worldProgress: updatedWorldProgress,
    }));

    addLog(`[차원 전이] World ${targetWorldId} [${targetWorld.name}] 차원으로 이동했습니다. (장착 검: +${targetSavedLevel}강)`, 'system');
  };

  // Store Current Sword in Vault
  const handleStoreSwordInVault = (sword: Sword) => {
    const vaultMaxSlots = 3 + (stats.superRebirthCount || 0) * 2;
    if ((stats.swordVault?.length || 0) >= vaultMaxSlots) return;

    const newStoredSword: StoredSword = {
      id: `${Date.now()}_${Math.random()}`,
      worldId: stats.currentWorldId || 1,
      name: sword.name,
      level: sword.level,
      rarity: sword.rarity,
      atkBonus: Math.floor(sword.atk * 0.1),
      goldBonus: Math.floor(sword.sellPrice * 0.05),
      colorTheme: sword.colorTheme,
      description: sword.description,
      storedAt: Date.now(),
    };

    setStats((prev) => ({
      ...prev,
      swordVault: [...(prev.swordVault || []), newStoredSword],
    }));

    addLog(`[보관함 등록] +${sword.level} [${sword.name}]을 검 보관함에 영구 패시브로 등록했습니다!`, 'loot');
  };

  // Remove Sword from Vault
  const handleRemoveSwordFromVault = (id: string) => {
    setStats((prev) => ({
      ...prev,
      swordVault: (prev.swordVault || []).filter((s) => s.id !== id),
    }));
    addLog('[보관함] 검을 보관함에서 제거했습니다.', 'system');
  };

  // Unlock Tier Staircase
  const handleUnlockTier = (tier: number, costGold: number) => {
    if (stats.gold < costGold) return;

    setStats((prev) => ({
      ...prev,
      gold: prev.gold - costGold,
      unlockedTiers: [...(prev.unlockedTiers || []), tier],
    }));

    addLog(`[티어 계단 각성] Tier ${tier} 계단을 정복했습니다! 해당 월드의 모든 배수가 천문학적으로 증폭됩니다!`, 'boss');
  };

  // Trigger THE END True Ending
  const handleTriggerTheEnd = () => {
    setIsEndingActive(true);
  };

  // Complete THE END Ending sequence
  const handleEndingComplete = () => {
    setIsEndingActive(false);
    // Reset to fresh start, but with cheat mode unlocked!
    setStats({
      ...DEFAULT_STATS,
      cheatUnlocked: true,
    });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_STATS,
        cheatUnlocked: true,
      })
    );
    setIsCheatModalOpen(true);
    addLog('[THE END] 세계의 끝에 도달하여 창조주의 치트 권능(God Mode)을 획득했습니다!', 'boss');
  };

  // Cheat & Admin Handlers
  const handleCheatAddResources = (
    gold: number,
    diamonds: number,
    stones: number,
    scrolls: number,
    potions: number,
    shards: number = 0
  ) => {
    setStats((prev) => {
      // Also add all runes x99 if scrolls & potions are added in bulk
      let nextRunes = [...prev.inventoryRunes];
      INITIAL_RUNES.forEach((baseRune) => {
        const existing = nextRunes.find((r) => r.id === baseRune.id);
        if (existing) {
          existing.count = Math.max(existing.count, 99);
        } else {
          nextRunes.push({ ...baseRune, count: 99 });
        }
      });

      return {
        ...prev,
        gold: prev.gold + gold,
        diamonds: prev.diamonds + diamonds,
        enhancementStones: prev.enhancementStones + stones,
        ancientScrolls: prev.ancientScrolls + scrolls,
        luckyPotions: prev.luckyPotions + potions,
        swordShards: prev.swordShards + shards,
        inventoryRunes: nextRunes,
      };
    });
    addLog(`[치트] 초월급 재화 및 신화 룬 팩이 대량 지급되었습니다.`, 'loot');
  };

  const handleCheatSetSwordLevel = (lvl: number) => {
    const updatedWorldProgress = {
      ...stats.worldProgress,
      [currentWorldId]: {
        ...stats.worldProgress?.[currentWorldId],
        currentSwordLevel: lvl,
        maxSwordLevelReached: Math.max(stats.worldProgress?.[currentWorldId]?.maxSwordLevelReached || 0, lvl),
      },
    };
    const nextCodex = Array.from(new Set([...stats.unlockedCodex, lvl]));
    setStats((prev) => ({
      ...prev,
      currentSwordLevel: lvl,
      unlockedCodex: nextCodex,
      worldProgress: updatedWorldProgress,
    }));
    addLog(`[치트] 현재 월드의 검이 +${lvl}강으로 즉시 설정되었습니다.`, 'success');
  };

  const handleCheatAddRebirths = (rebirth: number, superRebirth: number, rp: number = 0) => {
    setStats((prev) => ({
      ...prev,
      rebirthCount: prev.rebirthCount + rebirth,
      superRebirthCount: prev.superRebirthCount + superRebirth,
      rebirthPoints: (prev.rebirthPoints || 0) + (rp || rebirth * 5),
    }));
    addLog(`[치트] 환생 +${rebirth}, 초환생 +${superRebirth}, RP +${rp || rebirth * 5} 지급 완료!`, 'boss');
  };

  const handleToggleCheatSuccess100 = () => {
    setStats((prev) => ({
      ...prev,
      cheatSuccessRate100: !prev.cheatSuccessRate100,
    }));
  };

  const handleToggleCheatDmg1000x = () => {
    setStats((prev) => ({
      ...prev,
      cheatDmg1000x: !prev.cheatDmg1000x,
    }));
  };

  // 1. Force Unlock All Ascension, Super Rebirth, All 10 Worlds & All 5 Tier Staircases
  const handleForceUnlockAscensionAll = () => {
    const populatedWorldProgress = { ...stats.worldProgress };
    WORLDS_DATA.forEach((w) => {
      if (!populatedWorldProgress[w.id]) {
        populatedWorldProgress[w.id] = {
          currentSwordLevel: 0,
          maxSwordLevelReached: 0,
          highestStageCleared: 0,
        };
      }
    });

    setStats((prev) => ({
      ...prev,
      rebirthCount: Math.max(prev.rebirthCount, 100),
      superRebirthCount: Math.max(prev.superRebirthCount, 10),
      rebirthPoints: Math.max(prev.rebirthPoints, 10000),
      gold: Math.max(prev.gold, 100_000_000_000_000_000),
      unlockedTiers: [1, 2, 3, 4, 5],
      worldProgress: populatedWorldProgress,
    }));
    addLog('[👑 어드민 특권] 환생 100회, 초환생 10회, 10대 월드 차원 포탈 및 5대 티어 계단이 강제 전면 해금되었습니다!', 'boss');
  };

  // 2. Max Out All 5 Elements & Blacksmith Research
  const handleMaxOutAllElementsAndResearch = () => {
    setStats((prev) => ({
      ...prev,
      elementLevel: {
        none: 100,
        fire: 100,
        ice: 100,
        lightning: 100,
        holy: 100,
        dark: 100,
      },
      researches: {
        res_success: 50,
        res_destroy_reduce: 50,
        res_gold_mult: 50,
        res_auto_mine: 50,
        res_crit_boost: 50,
        res_qte_window: 50,
      },
    }));
    addLog('[👑 어드민 특권] 불·얼음·번개·신성·암흑 5대 속성 Lv.100 및 대장간 모든 연구가 MAX로 마스터되었습니다!', 'boss');
  };

  // 3. Instant Clear All Dungeon Stages & 100% Codex / Achievements
  const handleInstaClearDungeonsAndCodex = () => {
    const allCodex = Array.from({ length: 36 }, (_, i) => i);
    const allAchievements = INITIAL_ACHIEVEMENTS.map((a) => a.id);

    setStats((prev) => ({
      ...prev,
      highestStageCleared: 100,
      currentStageId: 100,
      unlockedCodex: allCodex,
      completedAchievements: allAchievements,
      diamonds: prev.diamonds + 100000,
    }));
    addLog('[👑 어드민 특권] 던전 1~100 스테이지 올 클리어, 35종 전설 검 도감 100% 완성 및 모든 업적이 달성되었습니다!', 'boss');
  };

  // 4. Instant Direct True Ending Cinematic Trigger
  const handleTriggerTheEndDirectly = () => {
    setIsCheatModalOpen(false);
    setIsEndingActive(true);
    addLog('[👑 어드민 특권] THE END 시네마틱 진엔딩 연출을 즉시 실행합니다.', 'boss');
  };

  // 5. Custom Numerical Rebirth Injector
  const handleCustomInjectRebirth = (rebirth: number, superRebirth: number, rp: number) => {
    setStats((prev) => ({
      ...prev,
      rebirthCount: prev.rebirthCount + rebirth,
      superRebirthCount: prev.superRebirthCount + superRebirth,
      rebirthPoints: (prev.rebirthPoints || 0) + rp,
    }));
    addLog(`[👑 어드민] 환생 +${rebirth}회, 초환생 +${superRebirth}회, 환생포인트 +${rp} RP가 정밀 주입되었습니다.`, 'boss');
  };

  const handleUnlockAllTiersAndWorlds = () => {
    handleForceUnlockAscensionAll();
  };

  // Anvil Skin Select
  const handleSelectAnvilSkin = (skinId: 'basic' | 'iron' | 'flame' | 'cyber' | 'divine') => {
    setStats((prev) => ({
      ...prev,
      activeAnvilSkin: skinId,
    }));
  };

  // Rune Equip / Unequip
  const handleEquipRune = (slotIndex: number, rune: Rune) => {
    setStats((prev) => {
      const nextEquipped = [...prev.equippedRunes];
      const nextInventory = [...prev.inventoryRunes];

      // Unequip existing in slot
      const existing = nextEquipped[slotIndex];
      if (existing) {
        const invItem = nextInventory.find((i) => i.id === existing.id);
        if (invItem) invItem.count += 1;
        else nextInventory.push({ ...existing, count: 1 });
      }

      // Equip target rune
      const targetInvItem = nextInventory.find((i) => i.id === rune.id);
      if (targetInvItem) {
        targetInvItem.count -= 1;
        if (targetInvItem.count <= 0) {
          const idx = nextInventory.indexOf(targetInvItem);
          nextInventory.splice(idx, 1);
        }
      }

      nextEquipped[slotIndex] = { ...rune, count: 1 };

      return {
        ...prev,
        equippedRunes: nextEquipped,
        inventoryRunes: nextInventory,
      };
    });
  };

  const handleUnequipRune = (slotIndex: number) => {
    setStats((prev) => {
      const nextEquipped = [...prev.equippedRunes];
      const nextInventory = [...prev.inventoryRunes];
      const existing = nextEquipped[slotIndex];
      if (!existing) return prev;

      nextEquipped[slotIndex] = null;
      const invItem = nextInventory.find((i) => i.id === existing.id);
      if (invItem) invItem.count += 1;
      else nextInventory.push({ ...existing, count: 1 });

      return {
        ...prev,
        equippedRunes: nextEquipped,
        inventoryRunes: nextInventory,
      };
    });
  };

  // Element Infuse & Upgrade
  const handleInfuseElement = (element: ElementType) => {
    setStats((prev) => ({
      ...prev,
      elementInfusion: element,
    }));
  };

  const handleUpgradeElement = (element: ElementType) => {
    const cur = stats.elementLevel[element] || 0;
    const cost = 100 * (cur + 1);
    if (stats.diamonds < cost) return;

    sound.playLevelUp();
    setStats((prev) => ({
      ...prev,
      diamonds: prev.diamonds - cost,
      elementLevel: {
        ...prev.elementLevel,
        [element]: cur + 1,
      },
    }));
  };

  // Shop Buy Handler
  const handleBuyItem = (type: string) => {
    setStats((prev) => {
      let g = prev.gold;
      let d = prev.diamonds;
      let s = prev.enhancementStones;
      let sc = prev.ancientScrolls;
      let p = prev.luckyPotions;
      let inv = [...prev.inventoryRunes];

      if (type === 'stones_10' && g >= 1000) {
        g -= 1000;
        s += 10;
      } else if (type === 'stones_100' && g >= 9000) {
        g -= 9000;
        s += 100;
      } else if (type === 'stones_1000' && g >= 80000) {
        g -= 80000;
        s += 1000;
      } else if (type === 'scroll' && d >= 300) {
        d -= 300;
        sc += 1;
      } else if (type === 'scroll_gold' && g >= 500000) {
        g -= 500000;
        sc += 1;
      } else if (type === 'potion' && d >= 100) {
        d -= 100;
        p += 1;
      } else if (type === 'potion_gold' && g >= 150000) {
        g -= 150000;
        p += 1;
      } else if (type === 'rune_box' && d >= 250) {
        d -= 250;
        const randomRune = INITIAL_RUNES[Math.floor(Math.random() * INITIAL_RUNES.length)];
        const existing = inv.find((r) => r.id === randomRune.id);
        if (existing) existing.count += 1;
        else inv.push({ ...randomRune, count: 1 });
        addLog(`[룬 획득] 룬 상자에서 [${randomRune.name}]을 획득했습니다!`, 'loot');
      }

      sound.playCoin();
      return {
        ...prev,
        gold: g,
        diamonds: d,
        enhancementStones: s,
        ancientScrolls: sc,
        luckyPotions: p,
        inventoryRunes: inv,
      };
    });
  };

  // Craft Shards Handler
  const handleCraftShards = (type: 'stones' | 'scroll' | 'diamonds') => {
    setStats((prev) => {
      let sh = prev.swordShards;
      let s = prev.enhancementStones;
      let sc = prev.ancientScrolls;
      let d = prev.diamonds;

      if (type === 'stones' && sh >= 10) {
        sh -= 10;
        s += 20;
      } else if (type === 'scroll' && sh >= 50) {
        sh -= 50;
        sc += 1;
      } else if (type === 'diamonds' && sh >= 100) {
        sh -= 100;
        d += 500;
      }

      sound.playSuccess();
      return {
        ...prev,
        swordShards: sh,
        enhancementStones: s,
        ancientScrolls: sc,
        diamonds: d,
      };
    });
  };

  // Claim Achievement
  const handleClaimAchievement = (ach: Achievement) => {
    if (stats.completedAchievements.includes(ach.id)) return;
    setStats((prev) => ({
      ...prev,
      diamonds: prev.diamonds + ach.rewardDiamonds,
      enhancementStones: prev.enhancementStones + (ach.rewardStones || 0),
      completedAchievements: [...prev.completedAchievements, ach.id],
    }));
    addLog(`[업적 달성] 업적 [${ach.title}] 완료 보상 수령! (+${ach.rewardDiamonds} 다이아몬드)`, 'loot');
  };

  // Import Save Code
  const handleImportSave = (code: string): boolean => {
    try {
      const decoded = decodeURIComponent(escape(atob(code)));
      const parsed = JSON.parse(decoded);
      if (typeof parsed.gold === 'number' && typeof parsed.currentSwordLevel === 'number') {
        setStats({ ...DEFAULT_STATS, ...parsed });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        addLog('[저장] 세이브 데이터를 성공적으로 복구했습니다.', 'system');
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  };

  // Reset Game Data
  const handleResetData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStats(DEFAULT_STATS);
    addLog('[초기화] 모든 게임 데이터가 초기화되었습니다.', 'system');
  };

  const handleOpenPartyModal = (presetTarget?: any) => {
    if (presetTarget) {
      setPartyPresetTarget(presetTarget);
    } else {
      setPartyPresetTarget(null);
    }
    setIsPartyModalOpen(true);
  };

  const handleStartPartyBattle = (room: PartyRoom) => {
    setActivePartyRoom(room);
    setIsPartyModalOpen(false);

    if (room.targetType === 'spire') {
      setActiveTab('spire');
      addLog(`[파티 레이드] '${room.targetTitle}' 파티 전투에 돌입합니다!`, 'boss');
    } else if (room.targetType === 'world_boss') {
      setActiveTab('world_boss');
      addLog(`[파티 레이드] 월드 보스 '${room.targetTitle}' 파티 토벌에 돌입합니다!`, 'boss');
    } else if (room.targetType === 'dungeon') {
      setActiveTab('dungeon');
      addLog(`[파티 레이드] '${room.targetTitle}' 파티 원정에 돌입합니다!`, 'boss');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-neutral-950">
      {/* Real-time Floating Speedrun HUD */}
      {speedrunState.isActive && (
        <SpeedrunHUD
          speedrunState={speedrunState}
          stats={stats}
          onPause={handlePauseSpeedrun}
          onResume={handleResumeSpeedrun}
          onAbort={handleAbortSpeedrun}
          onOpenRecords={() => setIsSpeedrunSetupModalOpen(true)}
          onOpenDetails={() => setIsSpeedrunSetupModalOpen(true)}
        />
      )}

      {/* Top Header & Resources Navigation */}
      <Navbar
        stats={stats}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenCheatModal={() => setIsCheatModalOpen(true)}
        onOpenPartyModal={() => handleOpenPartyModal()}
        onOpenSpeedrunModal={() => setIsSpeedrunSetupModalOpen(true)}
        isSpeedrunActive={speedrunState.isActive}
        onVersionClick={handleVersionClick}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full pb-10">
        {activeTab === 'anvil' && (
          <AnvilView
            stats={stats}
            currentSword={currentSword}
            nextSword={nextSword}
            onEnhance={handleEnhance}
            onSellSword={handleSellSword}
            onDismantleSword={handleDismantleSword}
            logs={logs}
            researches={stats.researches}
            onToggleAutoEnhance={(target) => {
              setStats((prev) => ({ ...prev, autoEnhanceTarget: target }));
              setIsAutoEnhancing(!isAutoEnhancing);
            }}
            isAutoEnhancing={isAutoEnhancing}
            onToggleSafetyScroll={(enabled) => {
              setStats((prev) => ({ ...prev, useSafetyScrollAuto: enabled }));
            }}
            onToggleLuckyPotion={(enabled) => {
              setStats((prev) => ({ ...prev, useLuckyPotionAuto: enabled }));
            }}
          />
        )}

        {activeTab === 'dungeon' && (
          <DungeonView
            stats={stats}
            currentSword={currentSword}
            onMonsterDefeated={handleMonsterDefeated}
            onStageClear={handleStageClear}
            researches={stats.researches}
          />
        )}

        {activeTab === 'world_boss' && (
          <WorldBossView
            stats={stats}
            currentSword={currentSword}
            onUpdateStats={setStats}
            addLog={addLog}
            onOpenPartyModal={handleOpenPartyModal}
            activePartyRoom={activePartyRoom}
          />
        )}

        {activeTab === 'spire' && (
          <SwordTowerView
            stats={stats}
            currentSword={currentSword}
            onUpdateStats={setStats}
            addLog={addLog}
            onOpenPartyModal={handleOpenPartyModal}
            activePartyRoom={activePartyRoom}
          />
        )}

        {activeTab === 'sword_spirit' && (
          <SwordSpiritView
            stats={stats}
            currentSword={currentSword}
            onUpdateStats={setStats}
            addLog={addLog}
          />
        )}

        {activeTab === 'prestige' && (
          <PrestigeView
            stats={stats}
            currentSword={currentSword}
            onRebirth={handleRebirth}
            onSuperRebirth={handleSuperRebirth}
            onUpgradeRebirthStat={handleUpgradeRebirthStat}
            onSwitchWorld={handleSwitchWorld}
            onStoreSwordInVault={handleStoreSwordInVault}
            onRemoveSwordFromVault={handleRemoveSwordFromVault}
          />
        )}

        {activeTab === 'tier_staircase' && (
          <TierStaircaseView
            stats={stats}
            currentSword={currentSword}
            onUnlockTier={handleUnlockTier}
            onTriggerTheEnd={handleTriggerTheEnd}
          />
        )}

        {activeTab === 'runes' && (
          <RunesAndElementsView
            stats={stats}
            currentSword={currentSword}
            onEquipRune={handleEquipRune}
            onUnequipRune={handleUnequipRune}
            onInfuseElement={handleInfuseElement}
            onUpgradeElement={handleUpgradeElement}
          />
        )}

        {activeTab === 'blacksmith' && (
          <BlacksmithView
            stats={stats}
            onUpgradeResearch={handleUpgradeResearch}
            onSelectAnvilSkin={handleSelectAnvilSkin}
          />
        )}

        {activeTab === 'codex' && <CodexView stats={stats} />}

        {activeTab === 'shop' && (
          <ShopView
            stats={stats}
            onBuyItem={handleBuyItem}
            onCraftShards={handleCraftShards}
          />
        )}

        {activeTab === 'achievements' && (
          <AchievementsView
            stats={stats}
            onClaimAchievement={handleClaimAchievement}
          />
        )}
      </main>

      {/* Page Bottom Footer with Version Click Trigger */}
      <footer className="w-full bg-neutral-950 border-t border-neutral-800/80 py-3 px-4 text-xs font-mono text-neutral-400 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleVersionClick}
              className={`px-2.5 py-1 rounded border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                versionClicks > 0
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200'
              }`}
              title="버전 버튼 (3회 연속 클릭 시 어드민 인증 창 오픈)"
            >
              <span>Pixel Sword Master v1.3.0</span>
              {versionClicks > 0 && versionClicks < 3 && (
                <span className="text-amber-400 text-[10px] bg-amber-900/60 px-1 py-0.2 rounded font-bold animate-pulse">
                  클릭 {versionClicks}/3
                </span>
              )}
              {stats.adminUnlocked && (
                <span className="text-rose-400 text-[10px] bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-700">
                  👑 ADMIN
                </span>
              )}
            </button>
            <span className="text-neutral-700 hidden sm:inline">•</span>
            <span className="text-[11px] text-neutral-500">픽셀 검 강화하기 방치형 RPG</span>
          </div>

          <div className="flex items-center gap-3">
            {(stats.adminUnlocked || stats.cheatUnlocked) && (
              <button
                onClick={() => {
                  sound.playSuccess();
                  setIsCheatModalOpen(true);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer bg-neutral-900 px-2.5 py-1 rounded border border-amber-500/50 hover:bg-neutral-800 transition-colors"
              >
                <span>👑 어드민 치트 메뉴 열기</span>
              </button>
            )}
            <span className="text-[11px] text-neutral-600 font-mono">
              비밀번호 인증 모드 지원
            </span>
          </div>
        </div>
      </footer>

      {/* Admin Password Verification Modal */}
      <AdminPasswordModal
        isOpen={isAdminPasswordModalOpen}
        onClose={() => setIsAdminPasswordModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />

      {/* Ending Cinematic Modal (THE END) */}
      {isEndingActive && <EndingCinematicModal onComplete={handleEndingComplete} />}

      {/* Enhanced God Mode / Admin Cheat Modal */}
      {isCheatModalOpen && (
        <CheatModal
          stats={stats}
          onClose={() => setIsCheatModalOpen(false)}
          onAddResources={handleCheatAddResources}
          onSetSwordLevel={handleCheatSetSwordLevel}
          onAddRebirths={handleCheatAddRebirths}
          onToggleCheatSuccess100={handleToggleCheatSuccess100}
          onToggleCheatDmg1000x={handleToggleCheatDmg1000x}
          onUnlockAllTiersAndWorlds={handleUnlockAllTiersAndWorlds}
          onForceUnlockAscensionAll={handleForceUnlockAscensionAll}
          onMaxOutAllElementsAndResearch={handleMaxOutAllElementsAndResearch}
          onInstaClearDungeonsAndCodex={handleInstaClearDungeonsAndCodex}
          onTriggerTheEndDirectly={handleTriggerTheEndDirectly}
          onCustomInjectRebirth={handleCustomInjectRebirth}
          onCustomSetSwordLevelDirect={handleCheatSetSwordLevel}
        />
      )}

      {/* Real-time Firebase Party Lobby Modal */}
      {isPartyModalOpen && (
        <PartyLobbyModal
          stats={stats}
          currentSword={currentSword}
          isOpen={isPartyModalOpen}
          onClose={() => setIsPartyModalOpen(false)}
          onStartBattle={handleStartPartyBattle}
          onStartPartyCombat={handleStartPartyBattle}
          onUpdateStats={setStats}
          presetTarget={partyPresetTarget}
        />
      )}

      {/* Real-time Party Co-op Battle Arena */}
      {activePartyRoom && (activePartyRoom.status === 'battling' || activePartyRoom.status === 'victory') && (
        <PartyBattleArena
          room={activePartyRoom}
          stats={stats}
          currentSword={currentSword}
          onUpdateStats={setStats}
          onCloseArena={() => setActivePartyRoom(null)}
          onOpenLobby={() => {
            setActivePartyRoom(null);
            setIsPartyModalOpen(true);
          }}
          addLog={addLog}
        />
      )}

      {/* Save & Backup Modal */}
      {isSaveModalOpen && (
        <SaveModal
          stats={stats}
          onClose={() => setIsSaveModalOpen(false)}
          onImportSave={handleImportSave}
          onResetData={handleResetData}
          onManualSave={() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
            addLog('[저장] 로컬 저장소에 수동 저장을 완료했습니다.', 'system');
          }}
        />
      )}

      {/* Speedrun Setup & Records Modal */}
      {isSpeedrunSetupModalOpen && (
        <SpeedrunSetupModal
          stats={stats}
          onStartSpeedrun={handleStartSpeedrun}
          onClose={() => setIsSpeedrunSetupModalOpen(false)}
        />
      )}

      {/* Speedrun Goal Accomplished Victory Modal */}
      {isSpeedrunVictoryModalOpen && (
        <SpeedrunVictoryModal
          speedrunState={speedrunState}
          stats={stats}
          finalTimeFormatted={speedrunFinalTimeFormatted}
          onClose={() => setIsSpeedrunVictoryModalOpen(false)}
          onRestartNewRun={() => {
            setIsSpeedrunVictoryModalOpen(false);
            setIsSpeedrunSetupModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

