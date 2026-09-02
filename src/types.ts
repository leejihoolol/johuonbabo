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

export type MonsterSpriteType = 
  | 'slime' 
  | 'goblin' 
  | 'skeleton' 
  | 'orc' 
  | 'golem' 
  | 'wyrm' 
  | 'dragon' 
  | 'demon_lord' 
  | 'void_god'
  | 'elemental'
  | 'machine'
  | 'angel'
  | 'tentacle_abyss'
  | 'celestial_dragon';

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
  spriteType: MonsterSpriteType;
  color: string;
  worldId?: number;
}

export interface DungeonStage {
  id: number;
  worldId: number;
  name: string;
  description: string;
  recommendedAtk: number;
  monsterCount: number;
  boss: Monster;
  monsters: Omit<Monster, 'currentHp'>[];
  background: string;
  unlockRequirementLevel: number;
  firstClearReward?: {
    diamonds: number;
    scrolls?: number;
    spiritDust?: number;
  };
}

// 1. World Boss Raid Types
export interface WorldBoss {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  currentHp: number;
  defense: number;
  element: ElementType;
  weakness: ElementType;
  spriteType: MonsterSpriteType;
  color: string;
  bgGradient: string;
  timeLimit: number; // in seconds
  description: string;
  phases: number;
}

export interface CosmicRelic {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  effectDescription: string;
  atkBonusPercent: number;
  goldBonusPercent: number;
  enhanceSuccessPercent: number;
  bossDamagePercent: number;
  icon: string;
  unlocked: boolean;
}

// 2. Spire of Trials (무한의 검탑) Types
export interface SpireFloor {
  floor: number;
  name: string;
  modifierText: string;
  modifierType: 'none' | 'fire_boost' | 'crit_immune' | 'fast_attack' | 'mirror_dmg' | 'heavy_armor';
  monster: Monster;
  rewardDiamonds: number;
  rewardGem?: SocketGem;
  rewardDust: number;
}

export interface SocketGem {
  id: string;
  name: string;
  type: 'ruby' | 'sapphire' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
  tier: number; // 1 ~ 5
  statType: 'atk' | 'critDmg' | 'enhanceRate' | 'gold' | 'speed' | 'all';
  statValue: number;
  icon: string;
  color: string;
  isEquipped?: boolean;
}

// 3. Unique Signature Content: Sword Spirits (검령의 연성 공방 & 소울 링크)
export interface SwordSpirit {
  id: string;
  name: string;
  title: string;
  element: ElementType;
  avatarColor: string;
  personality: string;
  catchphrase: string;
  dialogue: string[];
  level: number; // 1 ~ 50
  stars: number; // 1 ~ 5
  affection: number; // 0 ~ 100
  mood: 'ecstatic' | 'happy' | 'normal' | 'sleepy';
  atkMultiplier: number; // e.g. 1.3 (+30%)
  critBonus: number;
  goldMultiplier: number;
  specialSkillName: string;
  specialSkillDesc: string;
  unlocked: boolean;
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

export interface StoredSword {
  id: string;
  worldId: number;
  name: string;
  level: number;
  rarity: Rarity;
  atkBonus: number;
  goldBonus: number;
  colorTheme: Sword['colorTheme'];
  description: string;
  storedAt: number;
}

export interface WorldInfo {
  id: number;
  name: string;
  subTitle: string;
  theme: string;
  color: string;
  bgGradient: string;
  requiredSuperRebirth: number;
  swordPrefix: string;
  baseMultiplier: number;
  description: string;
}

export interface TierStaircase {
  tier: number;
  name: string;
  requiredGold: number;
  requiredWorldId: number;
  requiredSwordLevel: number;
  unlocked: boolean;
  rewardDescription: string;
  multiplierWorld: number;
  multiplierValue: number;
}

export interface SwordAwakeningStage {
  stage: number; // 1, 2, 3
  name: string; // "심연 각성", "천상 각성", "태초·창세 각성"
  subTitle: string;
  maxLevel: number; // 45, 56, 67
  requiredPreviousLevel: number; // 35, 45, 56
  requiredShards: number;
  requiredStones: number;
  requiredDust: number;
  requiredRP: number;
  requiredGold: number;
  requiredDiamonds: number;
  requiredScrolls: number;
  atkBonusMultiplier: number;
  description: string;
  benefits: string[];
  themeColor: string;
  auraEffectName: string;
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
  swordAwakeningLevel?: number; // 0 = none, 1 = abyssal (max 45), 2 = celestial (max 56), 3 = primordial (max 67)
  
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
  
  // Rebirth & Prestige System
  rebirthCount: number;
  superRebirthCount: number;
  rebirthPoints: number;
  rebirthStats: Record<string, number>;
  
  // Multi-World System
  currentWorldId: number;
  worldProgress: Record<number, {
    currentSwordLevel: number;
    maxSwordLevelReached: number;
    highestStageCleared: number;
  }>;
  
  // Sword Vault (Unlocked after 10 Rebirths)
  swordVault: StoredSword[];
  
  // Tier Staircase (Unlocked after 10 Super Rebirths)
  unlockedTiers: number[];
  
  // Sword Spirits (검령의 연성 공방)
  swordSpirits?: SwordSpirit[];
  activeSpiritId?: string | null;
  spiritDust?: number; // Used for spirit leveling & fusion
  
  // Infinite Spire (무한의 검탑)
  towerFloor?: number;
  towerHighestFloor?: number;
  spireCurrentFloor?: number;
  spireMaxFloor?: number;
  socketGems?: SocketGem[];
  equippedGemIds?: string[];
  
  // World Boss & Cosmic Relics (월드 보스 대토벌)
  worldBossHighScore?: number;
  worldBossRaidTokens?: number;
  cosmicRelics?: CosmicRelic[];
  
  // The End & Cheat Mode & Admin Console
  theEndCompleted?: boolean;
  cheatUnlocked?: boolean;
  adminUnlocked?: boolean;
  unlockedCheatMode?: boolean;
  cheatSuccessRate100?: boolean;
  cheatDmg1000x?: boolean;
  cheatDmg1M?: boolean;
  cheatInstantAuto?: boolean;
  
  soundEnabled: boolean;
  musicEnabled: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  tutorialCompleted?: boolean;
  tutorialStep?: number;
  tutorialActive?: boolean;

  // Player Profile & Party
  playerName?: string;
  playerAvatar?: string;
  activePartyRoomId?: string | null;
}

export type PartyTargetType = 'dungeon' | 'world_boss' | 'spire';

export interface PartyMember {
  uid: string;
  name: string;
  avatar: string;
  swordName: string;
  swordLevel: number;
  swordAtk: number;
  isHost: boolean;
  isReady: boolean;
  currentHp: number;
  maxHp: number;
  totalDamage: number;
  lastActive: number;
}

export interface PartyChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface PartyRoom {
  id: string;
  roomCode: string;
  roomName: string;
  targetType: PartyTargetType;
  targetId: string | number;
  targetTitle: string;
  hostUid: string;
  hostName: string;
  status: 'waiting' | 'battling' | 'victory' | 'defeat';
  maxMembers: number;
  members: Record<string, PartyMember>;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  bossSpriteType?: MonsterSpriteType;
  bossColor?: string;
  createdAt: number;
  startedAt?: number;
  clearedAt?: number;
}

// Speedrun Mode Types
export interface SpeedrunGoal {
  targetRebirths: number | null; // null = ignore, 0 = 0 rebirths condition, N = reach N rebirths
  targetSuperRebirths: number | null; // null = ignore, 0 = 0 SR, N = reach N SR
  targetTier: number | null; // null = ignore, 1~5 = reach Tier N
  targetEnding: boolean; // true = clear THE END
  targetSwordLevel: number | null; // null = ignore, 1~35 = reach +N level
  presetName?: string;
}

export interface SpeedrunSplit {
  name: string;
  timestampMs: number;
  details: string;
}

export interface SpeedrunState {
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  startedAt: number;
  elapsedMs: number;
  pausedAt?: number;
  goal: SpeedrunGoal;
  splits: SpeedrunSplit[];
  startRebirthCount: number;
  startSuperRebirthCount: number;
  startSwordLevel: number;
  startEnhanceAttempts: number;
  startMode: 'clean' | 'continuous';
}

export interface SpeedrunRecord {
  id: string;
  title: string;
  goal: SpeedrunGoal;
  timeFormatted: string;
  elapsedMs: number;
  clearedAt: number;
  splits: SpeedrunSplit[];
  enhanceAttempts: number;
  finalSwordLevel: number;
  startMode: 'clean' | 'continuous';
}

// ----------------------------------------------------
// Player-to-Player Trading & Marketplace Types
// ----------------------------------------------------

export type TradeItemType = 
  | 'sword' 
  | 'gold' 
  | 'diamonds' 
  | 'stones' 
  | 'scrolls' 
  | 'potions' 
  | 'spirit_dust' 
  | 'rune' 
  | 'gem' 
  | 'shards' 
  | 'raid_tokens'
  | 'rebirth'
  | 'super_rebirth'
  | 'rebirth_points'
  | 'cheat_menu_pass';

export type TradePriceType = 
  | 'gold' 
  | 'diamonds' 
  | 'stones' 
  | 'scrolls' 
  | 'potions' 
  | 'spirit_dust'
  | 'rebirth'
  | 'super_rebirth'
  | 'rebirth_points';

export interface TradeListing {
  id: string;
  sellerUid: string;
  sellerName: string;
  sellerAvatar: string;
  itemType: TradeItemType;
  itemTitle: string;
  itemAmount: number;
  itemData?: {
    storedSword?: StoredSword;
    rune?: Rune;
    socketGem?: SocketGem;
    rebirthAmount?: number;
    superRebirthAmount?: number;
    rebirthPointsAmount?: number;
    isCheatPass?: boolean;
  };
  priceType: TradePriceType;
  priceAmount: number;
  status: 'active' | 'sold' | 'cancelled';
  buyerUid?: string;
  buyerName?: string;
  createdAt: number;
  soldAt?: number;
}

export interface TradeOffer {
  gold: number;
  diamonds: number;
  stones: number;
  scrolls: number;
  potions: number;
  spiritDust: number;
  shards: number;
  raidTokens: number;
  rebirths?: number;
  superRebirths?: number;
  rebirthPoints?: number;
  cheatPass?: boolean;
  storedSwords: StoredSword[];
  runes: Rune[];
  gems: SocketGem[];
}

export interface TradeRoom {
  id: string;
  roomCode: string;
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  guestUid: string | null;
  guestName: string | null;
  guestAvatar: string | null;
  status: 'waiting' | 'offering' | 'locked' | 'completed' | 'cancelled';
  hostOffer: TradeOffer;
  guestOffer: TradeOffer;
  hostLocked: boolean;
  guestLocked: boolean;
  hostConfirmed: boolean;
  guestConfirmed: boolean;
  createdAt: number;
  completedAt?: number;
  cancelledReason?: string;
}

export interface TradeChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// ----------------------------------------------------
// Google Auth & Global Leaderboard Types
// ----------------------------------------------------

export type LeaderboardCategory = 'swordLevel' | 'combatPower' | 'gold' | 'rebirth' | 'tower' | 'stage';

export interface LeaderboardEntry {
  uid: string;
  name: string;
  avatar: string;
  email?: string;
  isAdmin?: boolean;
  maxSwordLevel: number;
  currentSwordLevel: number;
  swordAwakeningLevel: number;
  swordName: string;
  combatPower: number;
  gold: number;
  diamonds: number;
  rebirthCount: number;
  superRebirthCount: number;
  towerFloor: number;
  highestStage: number;
  worldId: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  playerName: string;
  playerAvatar: string;
  isAdmin: boolean;
  createdAt: number;
  lastLoginAt: number;
}



