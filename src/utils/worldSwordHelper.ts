import { SWORDS_DATA } from '../data/swords';
import { WORLDS_DATA, TIER_STAIRCASES_DATA } from '../data/worlds';
import { PlayerStats, Sword } from '../types';

export function getWorldSword(worldId: number, level: number): Sword {
  const base = SWORDS_DATA[Math.min(SWORDS_DATA.length - 1, Math.max(0, level))];
  const world = WORLDS_DATA.find((w) => w.id === worldId) || WORLDS_DATA[0];

  if (worldId === 1) {
    return base;
  }

  // Generate world-themed sword
  const worldThemeColors: Record<number, Sword['colorTheme']> = {
    2: {
      blade: '#ef4444',
      bladeLight: '#fca5a5',
      bladeDark: '#991b1b',
      guard: '#7f1d1d',
      hilt: '#450a0a',
      gem: '#fbbf24',
      aura: '#ff4500',
    },
    3: {
      blade: '#06b6d4',
      bladeLight: '#a5f3fc',
      bladeDark: '#155e75',
      guard: '#0e7490',
      hilt: '#083344',
      gem: '#38bdf8',
      aura: '#00ffff',
    },
    4: {
      blade: '#eab308',
      bladeLight: '#fef08a',
      bladeDark: '#854d0e',
      guard: '#713f12',
      hilt: '#422006',
      gem: '#fbbf24',
      aura: '#ffff00',
    },
    5: {
      blade: '#a855f7',
      bladeLight: '#e9d5ff',
      bladeDark: '#581c87',
      guard: '#6b21a8',
      hilt: '#3b0764',
      gem: '#c084fc',
      aura: '#9333ea',
    },
    6: {
      blade: '#fbbf24',
      bladeLight: '#fef3c7',
      bladeDark: '#b45309',
      guard: '#92400e',
      hilt: '#451a03',
      gem: '#ffffff',
      aura: '#ffd700',
    },
    7: {
      blade: '#10b981',
      bladeLight: '#a7f3d0',
      bladeDark: '#065f46',
      guard: '#047857',
      hilt: '#022c22',
      gem: '#34d399',
      aura: '#059669',
    },
    8: {
      blade: '#f97316',
      bladeLight: '#fed7aa',
      bladeDark: '#9a3412',
      guard: '#7c2d12',
      hilt: '#431407',
      gem: '#ef4444',
      aura: '#ea580c',
    },
    9: {
      blade: '#ec4899',
      bladeLight: '#fbcfe8',
      bladeDark: '#9d174d',
      guard: '#831843',
      hilt: '#500724',
      gem: '#f472b6',
      aura: '#db2777',
    },
    10: {
      blade: '#818cf8',
      bladeLight: '#e0e7ff',
      bladeDark: '#3730a3',
      guard: '#312e81',
      hilt: '#1e1b4b',
      gem: '#c084fc',
      aura: '#4f46e5',
    },
  };

  const theme = worldThemeColors[worldId] || base.colorTheme;
  const atkMult = world.baseMultiplier;

  return {
    ...base,
    name: `${world.swordPrefix} ${base.name}`,
    atk: Math.floor(base.atk * atkMult),
    sellPrice: Math.floor(base.sellPrice * atkMult),
    description: `[${world.name}] ${world.description} (기본 공격력 x${atkMult.toLocaleString()}배)`,
    colorTheme: theme,
    element: worldId === 2 ? 'fire' : worldId === 3 ? 'ice' : worldId === 4 ? 'lightning' : worldId === 5 ? 'dark' : worldId === 6 ? 'holy' : 'none',
  };
}

export function calculateTotalMultipliers(stats: PlayerStats) {
  // 1. Rebirth multiplier: +100% gold per rebirth
  const rebirthGoldMult = 1 + (stats.rebirthCount || 0) * 1.0;
  
  // 2. Rebirth Stat upgrades
  const rpAtkLevel = stats.rebirthStats?.['atk_mult'] || 0;
  const rpGoldLevel = stats.rebirthStats?.['gold_mult'] || 0;
  const rpSuccessLevel = stats.rebirthStats?.['enhance_rate'] || 0;
  const rpStoneLevel = stats.rebirthStats?.['stone_drop'] || 0;
  const rpCritLevel = stats.rebirthStats?.['crit_rate'] || 0;
  const rpCritDmgLevel = stats.rebirthStats?.['crit_dmg'] || 0;

  const rpAtkMult = 1 + rpAtkLevel * 0.3;
  const rpGoldMult = 1 + rpGoldLevel * 0.5;
  const rpSuccessBonus = Math.min(10, rpSuccessLevel * 0.5);
  const rpStoneBonus = 1 + rpStoneLevel * 0.25;
  const rpCritBonus = Math.min(15, rpCritLevel * 1.0);
  const rpCritDmgBonus = rpCritDmgLevel * 20;

  // 3. Super Rebirth Multiplier: x3 ATK and x5 Gold per super rebirth
  const superRebirthAtkMult = Math.pow(3, stats.superRebirthCount || 0);
  const superRebirthGoldMult = Math.pow(5, stats.superRebirthCount || 0);

  // 4. Sword Vault Bonuses
  let vaultAtkBonusPercent = 0;
  let vaultGoldBonusPercent = 0;
  (stats.swordVault || []).forEach((sv) => {
    vaultAtkBonusPercent += sv.atkBonus || 0;
    vaultGoldBonusPercent += sv.goldBonus || 0;
  });
  const vaultAtkMult = 1 + vaultAtkBonusPercent / 100;
  const vaultGoldMult = 1 + vaultGoldBonusPercent / 100;

  // 5. Tier Staircases Multipliers for current world
  let staircaseWorldAtkMult = 1;
  let staircaseWorldGoldMult = 1;
  const unlockedTiers = stats.unlockedTiers || [];

  if (unlockedTiers.includes(1) && stats.currentWorldId === 1) {
    staircaseWorldAtkMult *= 1000;
    staircaseWorldGoldMult *= 1000;
  }
  if (unlockedTiers.includes(2) && (stats.currentWorldId === 2 || stats.currentWorldId === 3)) {
    staircaseWorldAtkMult *= 5000;
    staircaseWorldGoldMult *= 5000;
  }
  if (unlockedTiers.includes(3) && (stats.currentWorldId >= 4 && stats.currentWorldId <= 6)) {
    staircaseWorldAtkMult *= 25000;
    staircaseWorldGoldMult *= 25000;
  }
  if (unlockedTiers.includes(4) && (stats.currentWorldId >= 7 && stats.currentWorldId <= 8)) {
    staircaseWorldAtkMult *= 100000;
    staircaseWorldGoldMult *= 100000;
  }
  if (unlockedTiers.includes(5)) {
    // Tier 5 boosts ALL worlds by 1,000,000x!
    staircaseWorldAtkMult *= 1000000;
    staircaseWorldGoldMult *= 1000000;
  }

  // 6. Active Sword Spirit Multipliers (검령 소울 링크)
  let spiritAtkMult = 1;
  let spiritGoldMult = 1;
  let spiritCritBonus = 0;
  if (stats.activeSpiritId && stats.swordSpirits) {
    const activeSpirit = stats.swordSpirits.find((s) => s.id === stats.activeSpiritId && s.unlocked);
    if (activeSpirit) {
      const moodBonus = activeSpirit.mood === 'ecstatic' ? 1.5 : activeSpirit.mood === 'happy' ? 1.2 : 1.0;
      const starBonus = 1 + (activeSpirit.stars - 1) * 0.25;
      const levelBonus = 1 + (activeSpirit.level - 1) * 0.05;
      spiritAtkMult = 1 + (activeSpirit.atkMultiplier - 1) * starBonus * levelBonus * moodBonus;
      spiritGoldMult = 1 + (activeSpirit.goldMultiplier - 1) * starBonus * levelBonus * moodBonus;
      spiritCritBonus = activeSpirit.critBonus * starBonus;
    }
  }

  // 7. Cosmic Relics Multipliers (성유물)
  let relicAtkBonus = 0;
  let relicGoldBonus = 0;
  let relicEnhanceBonus = 0;
  let relicBossDamageBonus = 0;
  (stats.cosmicRelics || []).forEach((r) => {
    if (r.unlocked) {
      relicAtkBonus += r.atkBonusPercent * (1 + (r.level - 1) * 0.2);
      relicGoldBonus += r.goldBonusPercent * (1 + (r.level - 1) * 0.2);
      relicEnhanceBonus += r.enhanceSuccessPercent * (1 + (r.level - 1) * 0.1);
      relicBossDamageBonus += r.bossDamagePercent * (1 + (r.level - 1) * 0.2);
    }
  });
  const relicAtkMult = 1 + relicAtkBonus / 100;
  const relicGoldMult = 1 + relicGoldBonus / 100;

  // 8. Socket Gems Multipliers (소켓 보석)
  let gemAtkBonus = 0;
  let gemGoldBonus = 0;
  let gemCritDmgBonus = 0;
  let gemEnhanceBonus = 0;
  (stats.socketGems || []).forEach((g) => {
    if (g.isEquipped) {
      if (g.statType === 'atk' || g.statType === 'all') gemAtkBonus += g.statValue;
      if (g.statType === 'gold' || g.statType === 'all') gemGoldBonus += g.statValue;
      if (g.statType === 'critDmg' || g.statType === 'all') gemCritDmgBonus += g.statValue * 2;
      if (g.statType === 'enhanceRate') gemEnhanceBonus += g.statValue;
    }
  });
  const gemAtkMult = 1 + gemAtkBonus / 100;
  const gemGoldMult = 1 + gemGoldBonus / 100;

  // 9. Awakening Multipliers (초월 각성: 심연, 천상, 태초·창세)
  const awkLevel = stats.swordAwakeningLevel || 0;
  let awakeningAtkMult = 1;
  let awakeningGoldMult = 1;
  let awakeningSuccessBonus = 0;
  let awakeningCritBonus = 0;
  let awakeningCritDmgBonus = 0;
  let awakeningBossDmgBonus = 0;

  if (awkLevel >= 1) {
    awakeningAtkMult *= 4.0; // +300%
    awakeningCritBonus += 10;
    awakeningCritDmgBonus += 150;
  }
  if (awkLevel >= 2) {
    awakeningAtkMult *= 2.25; // cumulative 9.0x (+800%)
    awakeningGoldMult *= 5.0; // +400%
    awakeningSuccessBonus += 3.0; // +3% success
    awakeningBossDmgBonus += 500;
  }
  if (awkLevel >= 3) {
    awakeningAtkMult *= 2.9; // cumulative ~26x (+2,500%)
    awakeningGoldMult *= 2.5; // cumulative 12.5x
    awakeningSuccessBonus += 2.0; // cumulative +5%
    awakeningCritBonus += 15;
    awakeningCritDmgBonus += 1000;
    awakeningBossDmgBonus += 1500;
  }

  // 10. Cheat Mode Multiplier
  const cheatAtkMult = stats.cheatDmg1000x ? 1000 : 1;

  // Final combined multipliers
  const totalAtkMult =
    rpAtkMult *
    superRebirthAtkMult *
    vaultAtkMult *
    staircaseWorldAtkMult *
    spiritAtkMult *
    relicAtkMult *
    gemAtkMult *
    awakeningAtkMult *
    cheatAtkMult;

  const totalGoldMult =
    rebirthGoldMult *
    rpGoldMult *
    superRebirthGoldMult *
    vaultGoldMult *
    staircaseWorldGoldMult *
    spiritGoldMult *
    relicGoldMult *
    gemGoldMult *
    awakeningGoldMult;

  return {
    rebirthGoldMult,
    rpAtkMult,
    rpGoldMult,
    rpSuccessBonus: rpSuccessBonus + relicEnhanceBonus + gemEnhanceBonus + awakeningSuccessBonus,
    rpStoneBonus,
    rpCritBonus: rpCritBonus + spiritCritBonus + awakeningCritBonus,
    rpCritDmgBonus: rpCritDmgBonus + gemCritDmgBonus + awakeningCritDmgBonus,
    superRebirthAtkMult,
    superRebirthGoldMult,
    vaultAtkMult,
    vaultGoldMult,
    staircaseWorldAtkMult,
    staircaseWorldGoldMult,
    spiritAtkMult,
    spiritGoldMult,
    relicAtkMult,
    relicGoldMult,
    relicBossDamageBonus: relicBossDamageBonus + awakeningBossDmgBonus,
    gemAtkMult,
    gemGoldMult,
    awakeningAtkMult,
    awakeningGoldMult,
    awakeningSuccessBonus,
    cheatAtkMult,
    totalAtkMult,
    totalGoldMult,
  };
}
