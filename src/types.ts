export type Rarity = '일반' | '고급' | '희귀' | '영웅' | '전설' | '신화' | '태초' | '초월' | '우주';

export type ElementType = 'none' | 'fire' | 'ice' | 'lightning' | 'holy' | 'dark';

export interface Sword {
  level: number;
  name: string;
  rarity: Rarity;
  atk: number;
  atkSpeed: number; // attacks per second
  critRate: number; // percentage (e.g. 5 = 5%)
  critDmg: number; // percentage multiplier (e.g. 150 = 150%)
  successRate: number; // percentage (e.g. 95)
  dropRate: number; // drop on failure rate
  destroyRate: number; // destroy on failure rate
  costGold: number;
  costStones: number;
  sellPrice: number;
  description: string;
  element: ElementType;
  colorTheme: {
    blade: string;
    bladeLight: string;
    bladeDark: string;
    guard: string;
    hilt: string;
    gem?: string;
    aura?: string;
  };
  specialEffect?: string;
}

export interface Rune {
  id: string;
  name: string;
  type: 'atk' | 'critRate' | 'critDmg' | 'goldBonus' | 'enhanceLuck';
  tier: number;
  value: number;
  color: string;
  icon: string;
  count: number;
}

export interface Monster {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  atk: number;
  defense: number;
  goldReward: number;
  stoneReward: number;
  expReward: number;
  isBoss?: boolean;
  elementWeakness?: ElementType;
  spriteType: 'slime' | 'goblin' | 'skeleton' | 'orc' | 'golem' | 'wyrm' | 'dragon' | 'demon_lord' | 'void_god';
  color: string;
}

export interface DungeonStage {
  id: number;
  name: string;
  description: string;
  recommendedAtk: number;
  monsterCount: number;
  boss: Monster;
  monsters: Omit<Monster, 'currentHp'>[];
  background: string;
  unlockRequirementLevel: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  lastUsedTime: number;
  damageMultiplier: number;
  element: ElementType;
  icon: string;
  unlockedAtLevel: number;
}

export interface BlacksmithResearch {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effectType: 'success_boost' | 'destroy_reduction' | 'gold_boost' | 'stone_auto_mine' | 'crit_boost' | 'qte_window_boost';
  effectPerLevel: number;
  icon: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'enhance' | 'combat' | 'gold' | 'codex';
  target: number;
  current: number;
  completed: boolean;
  rewardDiamonds: number;
  rewardStones?: number;
  icon: string;
}

export interface GameLog {
  id: string;
  text: string;
  type: 'success' | 'fail' | 'destroy' | 'drop' | 'loot' | 'system' | 'boss';
  timestamp: string;
}

export interface PlayerStats {
  gold: number;
  diamonds: number;
  enhancementStones: number;
  ancientScrolls: number; // Prevents destruction on fail
  luckyPotions: number; // +10% enhance rate
  swordShards: number; // From destroyed swords, used to craft stones/scrolls
  
  currentSwordLevel: number;
  maxSwordLevelReached: number;
  
  totalEnhanceAttempts: number;
  totalEnhanceSuccess: number;
  totalEnhanceFails: number;
  totalSwordsDestroyed: number;
  
  currentStageId: number;
  highestStageCleared: number;
  currentMonsterIndex: number;
  
  elementInfusion: ElementType;
  elementLevel: Record<ElementType, number>;
  
  equippedRunes: (Rune | null)[];
  inventoryRunes: Rune[];
  
  researches: Record<string, number>;
  completedAchievements: string[];
  unlockedCodex: number[]; // Sword levels discovered
  
  activeAnvilSkin: 'basic' | 'iron' | 'flame' | 'cyber' | 'divine';
  
  autoEnhanceTarget: number;
  autoEnhanceActive: boolean;
  useSafetyScrollAuto: boolean;
  useLuckyPotionAuto: boolean;
  
  soundEnabled: boolean;
  musicEnabled: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
}
