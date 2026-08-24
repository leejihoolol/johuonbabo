import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { AnvilView } from './components/AnvilView';
import { DungeonView } from './components/DungeonView';
import { RunesAndElementsView } from './components/RunesAndElementsView';
import { BlacksmithView } from './components/BlacksmithView';
import { CodexView } from './components/CodexView';
import { ShopView } from './components/ShopView';
import { AchievementsView } from './components/AchievementsView';
import { SaveModal } from './components/SaveModal';

import { Achievement, ElementType, GameLog, Monster, PlayerStats, Rune, Sword } from './types';
import { SWORDS_DATA } from './data/swords';
import { INITIAL_ACHIEVEMENTS, INITIAL_RUNES } from './data/research';
import { sound } from './utils/sound';

const STORAGE_KEY = 'PIXEL_SWORD_MASTER_SAVE_V1';

const DEFAULT_STATS: PlayerStats = {
  gold: 500,
  diamonds: 100,
  enhancementStones: 15,
  ancientScrolls: 2,
  luckyPotions: 1,
  swordShards: 0,

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
  const [isAutoEnhancing, setIsAutoEnhancing] = useState(false);
  const [logs, setLogs] = useState<GameLog[]>([
    {
      id: 'init_log',
      text: '[대장간] 픽셀 대장간에 오신 것을 환영합니다! 모루를 두드려 전설의 검을 제련하세요.',
      type: 'system',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Current and Next Sword Data
  const currentSword: Sword = SWORDS_DATA[stats.currentSwordLevel] || SWORDS_DATA[0];
  const nextSword: Sword | null = SWORDS_DATA[stats.currentSwordLevel + 1] || null;

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
      setStats((prev) => {
        const amount = autoMineLevel * 1;
        return {
          ...prev,
          enhancementStones: prev.enhancementStones + amount,
        };
      });
    }, 10000);

    return () => clearInterval(mineInterval);
  }, [stats.researches]);

  // Core Enhance Logic
  const handleEnhance = (useQteBonus = false): { success: boolean; resultType: 'success' | 'fail' | 'destroy' | 'drop' } => {
    if (currentSword.level >= 35) {
      setIsAutoEnhancing(false);
      return { success: false, resultType: 'fail' };
    }

    if (stats.gold < currentSword.costGold || stats.enhancementStones < currentSword.costStones) {
      addLog(`재화 부족: ${currentSword.costGold}G / ${currentSword.costStones}개 강화석 필요`, 'fail');
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
    }

    const qteBonus = useQteBonus ? 10 : 0;
    const totalSuccessChance = Math.min(100, Math.max(1, currentSword.successRate + researchSuccessBonus + runeLuckBonus + skinBonus + potionBonus + qteBonus));

    const roll = Math.random() * 100;
    const isSuccess = roll < totalSuccessChance;

    if (isSuccess) {
      // SUCCESS!
      const nextLvl = currentSword.level + 1;
      const nextSwordObj = SWORDS_DATA[nextLvl];
      const newMax = Math.max(stats.maxSwordLevelReached, nextLvl);
      const newCodex = stats.unlockedCodex.includes(nextLvl) ? stats.unlockedCodex : [...stats.unlockedCodex, nextLvl];

      sound.playSuccess(nextLvl >= 10);
      addLog(`[강화 성공!] +${currentSword.level} → +${nextLvl} [${nextSwordObj.name}] 달성!`, 'success');

      setStats((prev) => ({
        ...prev,
        gold: newGold,
        enhancementStones: newStones,
        ancientScrolls: newScrolls,
        luckyPotions: newPotions,
        currentSwordLevel: nextLvl,
        maxSwordLevelReached: newMax,
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
      const effectiveDestroyRate = Math.max(0, currentSword.destroyRate - researchDestroyReduce);

      if (effectiveDestroyRate > 0) {
        const destroyRoll = Math.random() * 100;
        if (destroyRoll < effectiveDestroyRate) {
          if (stats.useSafetyScrollAuto && newScrolls > 0) {
            newScrolls -= 1;
            addLog(`[보호서 발동] 파괴 위험을 막아냈습니다. (남은 보호서: ${newScrolls}장)`, 'system');
          } else {
            isDestroyed = true;
          }
        }
      }

      if (isDestroyed) {
        // Destroyed!
        sound.playDestroy();
        const shardsGained = Math.max(2, currentSword.level * 2);
        newShards += shardsGained;
        addLog(`[검 파괴] +${currentSword.level} ${currentSword.name}이(가) 산산조각났습니다! (파편 +${shardsGained}개 획득)`, 'destroy');
        setIsAutoEnhancing(false);

        setStats((prev) => ({
          ...prev,
          gold: newGold,
          enhancementStones: newStones,
          ancientScrolls: newScrolls,
          luckyPotions: newPotions,
          swordShards: newShards,
          currentSwordLevel: 0, // Reset to +0
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

          setStats((prev) => ({
            ...prev,
            gold: newGold,
            enhancementStones: newStones,
            ancientScrolls: newScrolls,
            luckyPotions: newPotions,
            currentSwordLevel: droppedLvl,
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
    const goldBonus = (stats.researches['res_gold_mult'] || 0) * 0.15;
    let runeGoldBonus = 0;
    stats.equippedRunes.forEach((r) => {
      if (r && r.type === 'goldBonus') runeGoldBonus += r.value / 100;
    });

    const finalGold = Math.floor(currentSword.sellPrice * (1 + goldBonus + runeGoldBonus));
    sound.playCoin();
    addLog(`[판매] +${currentSword.level} ${currentSword.name} 판매 완료 (+${finalGold.toLocaleString()} 골드 획득)`, 'loot');

    setStats((prev) => ({
      ...prev,
      gold: prev.gold + finalGold,
      currentSwordLevel: 0,
    }));
  };

  // Dismantle Current Sword into Shards
  const handleDismantleSword = () => {
    if (currentSword.level <= 0) return;
    const shardsGained = Math.max(1, currentSword.level * 2);
    sound.playCoin();
    addLog(`[분해] +${currentSword.level} ${currentSword.name} 분해 완료 (+${shardsGained}개 파편 획득)`, 'loot');

    setStats((prev) => ({
      ...prev,
      swordShards: prev.swordShards + shardsGained,
      currentSwordLevel: 0,
    }));
  };

  // Dungeon Monster Defeated Loot Handler
  const handleMonsterDefeated = (monster: Monster, stageId: number) => {
    const goldBonus = (stats.researches['res_gold_mult'] || 0) * 0.15;
    let runeGoldBonus = 0;
    stats.equippedRunes.forEach((r) => {
      if (r && r.type === 'goldBonus') runeGoldBonus += r.value / 100;
    });

    const earnedGold = Math.floor(monster.goldReward * (1 + goldBonus + runeGoldBonus));
    const earnedStones = monster.stoneReward;
    const earnedDiamonds = monster.isBoss ? 20 : 0;

    // 1% chance for protection scroll drop from boss
    let scrollDrop = false;
    if (monster.isBoss && Math.random() < 0.05) {
      scrollDrop = true;
      addLog(`[희귀 드랍] 보스로부터 파괴 방지 주문서 1장을 획득했습니다!`, 'loot');
    }

    setStats((prev) => ({
      ...prev,
      gold: prev.gold + earnedGold,
      enhancementStones: prev.enhancementStones + earnedStones,
      diamonds: prev.diamonds + earnedDiamonds,
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Header & Resources Navigation */}
      <Navbar
        stats={stats}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full pb-16">
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
              stats.autoEnhanceTarget = target;
              setIsAutoEnhancing(!isAutoEnhancing);
            }}
            isAutoEnhancing={isAutoEnhancing}
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
    </div>
  );
}
