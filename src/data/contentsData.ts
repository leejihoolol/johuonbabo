import { CosmicRelic, SocketGem, SpireFloor, SwordSpirit, WorldBoss } from '../types';

// ==========================================
// 1. World Bosses & Cosmic Relics Data
// ==========================================
export const WORLD_BOSSES_DATA: WorldBoss[] = [
  {
    id: 'wb_solaris',
    name: '태양의 거신 솔라리스 (Solaris)',
    title: '타오르는 불꽃의 태양신',
    maxHp: 100_000_000_000,
    currentHp: 100_000_000_000,
    defense: 50_000_000,
    element: 'fire',
    weakness: 'ice',
    spriteType: 'elemental',
    color: '#ea580c',
    bgGradient: 'from-amber-950 via-red-950 to-neutral-950',
    timeLimit: 60,
    phases: 3,
    description: '타오르는 초열의 태양 에너지를 내뿜으며 침입자를 잿더미로 만드는 고대 태양신.',
  },
  {
    id: 'wb_leviathan',
    name: '심연의 포식자 레비아탄 (Leviathan)',
    title: '차원을 삼키는 공허의 바다 괴수',
    maxHp: 500_000_000_000,
    currentHp: 500_000_000_000,
    defense: 250_000_000,
    element: 'dark',
    weakness: 'holy',
    spriteType: 'tentacle_abyss',
    color: '#7e22ce',
    bgGradient: 'from-purple-950 via-indigo-950 to-neutral-950',
    timeLimit: 60,
    phases: 3,
    description: '빛과 시간마저 집어삼키는 심연의 심장에서 올라온 거대한 공허의 촉수 괴수.',
  },
  {
    id: 'wb_chronos_titan',
    name: '시공의 지배자 오메가 크로노스 (Omega Chronos)',
    title: '모든 평행우주의 시공간 집행자',
    maxHp: 2_500_000_000_000,
    currentHp: 2_500_000_000_000,
    defense: 1_200_000_000,
    element: 'lightning',
    weakness: 'dark',
    spriteType: 'machine',
    color: '#d97706',
    bgGradient: 'from-stone-900 via-amber-950 to-neutral-950',
    timeLimit: 60,
    phases: 3,
    description: '시공간 톱니바퀴를 회전시켜 모든 물리 법칙을 재편하는 전지전능한 기계 신.',
  },
];

export const COSMIC_RELICS_DATA: CosmicRelic[] = [
  {
    id: 'relic_sun_shard',
    name: '태양신의 불씨 (Sun Ember)',
    rarity: '전설',
    level: 1,
    maxLevel: 20,
    effectDescription: '모든 월드 검 공격력 +25% 및 보스 추가 데미지 +40%',
    atkBonusPercent: 25,
    goldBonusPercent: 0,
    enhanceSuccessPercent: 0,
    bossDamagePercent: 40,
    icon: 'Flame',
    unlocked: true,
  },
  {
    id: 'relic_chronos_hourglass',
    name: '크로노스의 영겁 모래시계',
    rarity: '신화',
    level: 1,
    maxLevel: 20,
    effectDescription: '강화 성공 확률 영구 +3% 및 골드 획득량 +100%',
    atkBonusPercent: 0,
    goldBonusPercent: 100,
    enhanceSuccessPercent: 3,
    bossDamagePercent: 0,
    icon: 'Sparkles',
    unlocked: false,
  },
  {
    id: 'relic_abyss_heart',
    name: '심연의 블랙홀 코어',
    rarity: '신화',
    level: 1,
    maxLevel: 20,
    effectDescription: '공격력 +150% 및 몬스터 처치 시 영혼의 가루 획득량 +100%',
    atkBonusPercent: 150,
    goldBonusPercent: 50,
    enhanceSuccessPercent: 0,
    bossDamagePercent: 80,
    icon: 'Zap',
    unlocked: false,
  },
  {
    id: 'relic_genesis_crown',
    name: '창세신의 왕관 (Genesis Crown)',
    rarity: '우주',
    level: 1,
    maxLevel: 20,
    effectDescription: '모든 스탯 +500% & 강화 파괴 방어율 +10%',
    atkBonusPercent: 500,
    goldBonusPercent: 500,
    enhanceSuccessPercent: 5,
    bossDamagePercent: 200,
    icon: 'Sword',
    unlocked: false,
  },
];

// ==========================================
// 2. Infinite Sword Spire (무한의 검탑) Floors Data
// ==========================================
export const SPIRE_FLOORS_DATA: SpireFloor[] = Array.from({ length: 50 }, (_, i) => {
  const floor = i + 1;
  const isBossFloor = floor % 5 === 0;
  const baseHp = Math.floor(5000 * Math.pow(1.35, floor));
  const baseAtk = Math.floor(100 * Math.pow(1.32, floor));
  const baseDef = Math.floor(20 * Math.pow(1.28, floor));

  let modifierType: SpireFloor['modifierType'] = 'none';
  let modifierText = '특수 제약 없음';

  if (floor % 4 === 1 && floor > 1) {
    modifierType = 'fire_boost';
    modifierText = '🔥 화염 속성 공격 200% 증폭';
  } else if (floor % 4 === 2) {
    modifierType = 'crit_immune';
    modifierText = '🛡️ 적 치명타 면역 (순수 기본 피해만 적용)';
  } else if (floor % 4 === 3) {
    modifierType = 'fast_attack';
    modifierText = '⚡ 적 공격속도 2배 광폭화';
  } else if (floor % 4 === 0) {
    modifierType = 'heavy_armor';
    modifierText = '🧱 적 방어력 300% 철벽 무장';
  }

  const gemTypes: SocketGem['type'][] = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'diamond'];
  const gemType = gemTypes[floor % gemTypes.length];
  const gemTier = Math.min(5, Math.floor(floor / 10) + 1);

  const rewardGem: SocketGem | undefined = isBossFloor
    ? {
        id: `gem_fl_${floor}`,
        name: `${gemTier}티어 ${
          gemType === 'ruby'
            ? '루비 (공격력)'
            : gemType === 'sapphire'
            ? '사파이어 (크리티컬)'
            : gemType === 'emerald'
            ? '에메랄드 (강화확률)'
            : gemType === 'topaz'
            ? '토파즈 (골드)'
            : gemType === 'amethyst'
            ? '자수정 (속도)'
            : '다이아몬드 (올스탯)'
        }`,
        type: gemType,
        tier: gemTier,
        statType:
          gemType === 'ruby'
            ? 'atk'
            : gemType === 'sapphire'
            ? 'critDmg'
            : gemType === 'emerald'
            ? 'enhanceRate'
            : gemType === 'topaz'
            ? 'gold'
            : gemType === 'amethyst'
            ? 'speed'
            : 'all',
        statValue: gemTier * (gemType === 'emerald' ? 1 : 15),
        icon: 'Sparkles',
        color:
          gemType === 'ruby'
            ? '#ef4444'
            : gemType === 'sapphire'
            ? '#3b82f6'
            : gemType === 'emerald'
            ? '#10b981'
            : gemType === 'topaz'
            ? '#f59e0b'
            : gemType === 'amethyst'
            ? '#a855f7'
            : '#06b6d4',
      }
    : undefined;

  return {
    floor,
    name: `${floor}층 : ${isBossFloor ? '👑 수호자 ' : '시련의 '}${floor}단계`,
    modifierText,
    modifierType,
    rewardDiamonds: floor * 50,
    rewardDust: floor * 20,
    rewardGem,
    monster: {
      id: `spire_m_${floor}`,
      name: isBossFloor ? `👑 검탑 제${floor}층 지배자` : `검탑 제${floor}층 환영`,
      maxHp: baseHp,
      currentHp: baseHp,
      atk: baseAtk,
      defense: baseDef,
      goldReward: floor * 500,
      stoneReward: Math.floor(floor / 2) + 1,
      expReward: floor * 100,
      isBoss: isBossFloor,
      spriteType: isBossFloor ? 'demon_lord' : 'golem',
      color: isBossFloor ? '#ef4444' : '#38bdf8',
    },
  };
});

// ==========================================
// 3. Sword Spirits (검령의 연성 공방 & 소울 링크) Data
// ==========================================
export const INITIAL_SWORD_SPIRITS: SwordSpirit[] = [
  {
    id: 'spirit_igna',
    name: '이그나 (Igna)',
    title: '타오르는 홍염의 검령',
    element: 'fire',
    avatarColor: '#ef4444',
    personality: '열정적이고 솔직한 츤데레',
    catchphrase: '"흥, 내 불꽃으로 다 태워버려줄 테니까 감사히 여기라고!"',
    dialogue: [
      '대장장이님! 오늘도 멋진 불꽃검으로 벼려주실 거죠?',
      '헤헷, 모루 소리가 경쾌하네! 내 칼날도 뜨겁게 달아올랐어!',
      '방심하지 마! 내 불길은 아무도 막을 수 없다고!',
    ],
    level: 1,
    stars: 1,
    affection: 30,
    mood: 'happy',
    atkMultiplier: 1.25, // +25%
    critBonus: 8, // +8%
    goldMultiplier: 1.2,
    specialSkillName: '홍련 폭쇄참 (Crimson Burst)',
    specialSkillDesc: '적 전체에 공격력의 800% 화염 폭발 피해를 입히고 5초간 화상 부여',
    unlocked: true,
  },
  {
    id: 'spirit_frostia',
    name: '프로스티아 (Frostia)',
    title: '절대영도의 빙설검령',
    element: 'ice',
    avatarColor: '#06b6d4',
    personality: '냉철하고 신비로운 쿨뷰티',
    catchphrase: '"차가운 칼날 끝에서 적들에게 영원한 안식을 선물합니다."',
    dialogue: [
      '대장장이님의 손길은... 언제나 따뜻하군요.',
      '얼어붙은 시간 속에서도 당신을 지키겠습니다.',
      '침착하게 호흡을 가다듬으세요. 승리는 이미 정해져 있습니다.',
    ],
    level: 1,
    stars: 1,
    affection: 20,
    mood: 'normal',
    atkMultiplier: 1.2,
    critBonus: 15,
    goldMultiplier: 1.15,
    specialSkillName: '영구동토의 결정 (Absolute Freeze)',
    specialSkillDesc: '적 전체를 3초간 완전 빙결시키고 공격력의 600% 피해',
    unlocked: false,
  },
  {
    id: 'spirit_volt',
    name: '볼트 (Volt)',
    title: '질풍노도의 전광검령',
    element: 'lightning',
    avatarColor: '#eab308',
    personality: '장난기 넘치고 활발한 개구쟁이',
    catchphrase: '"찌릿찌릿 100만 볼트 벼락 맛 좀 볼래?! 번개처럼 베어줄게!"',
    dialogue: [
      '야호! 빨리 모험 가자! 내 전기 게이지 100% 충전 완료야!',
      '찌릿찌릿! 대장장이님 손 잡으면 정전기 날지도 몰라~!',
      '헤헤, 누구보다 빠르게 베고 돌아올 테니까 지켜봐!',
    ],
    level: 1,
    stars: 1,
    affection: 15,
    mood: 'ecstatic',
    atkMultiplier: 1.3,
    critBonus: 10,
    goldMultiplier: 1.4,
    specialSkillName: '천둥의 연쇄 벼락 (Thunder Chain)',
    specialSkillDesc: '공격속도 200% 증가 & 10연타 연쇄 벼락 공격력의 1200% 타격',
    unlocked: false,
  },
  {
    id: 'spirit_shadow',
    name: '섀도우 (Shadow)',
    title: '심연과 공허의 암영검령',
    element: 'dark',
    avatarColor: '#a855f7',
    personality: '과묵하지만 든든한 그림자 수호자',
    catchphrase: '"그림자 속에서 당신의 적을 조용히 소멸시키겠습니다."',
    dialogue: [
      '심연을 들여다보는 자... 오직 당신만을 나의 주인으로 섬깁니다.',
      '어둠은 두려움이 아닌, 가장 날카로운 무기입니다.',
      '칼날의 무게가 느껴지는군... 좋은 제련이다.',
    ],
    level: 1,
    stars: 1,
    affection: 10,
    mood: 'normal',
    atkMultiplier: 1.45,
    critBonus: 12,
    goldMultiplier: 1.2,
    specialSkillName: '심연의 일섬 (Abyssal Slash)',
    specialSkillDesc: '적의 방어력을 100% 무시하고 공격력의 1500% 치명타 일격',
    unlocked: false,
  },
  {
    id: 'spirit_seraphina',
    name: '세라피나 (Seraphina)',
    title: '성스러운 천상의 성광검령',
    element: 'holy',
    avatarColor: '#fbbf24',
    personality: '자애롭고 성스러운 치유의 천사',
    catchphrase: '"대장장이님의 모든 제련과 발걸음에 신성한 가호가 깃들기를..."',
    dialogue: [
      '당신의 검에서 맑고 순수한 영혼의 빛이 느껴집니다.',
      '강화에 실패하더라도 실망하지 마세요, 제가 항상 곁에 있을 테니까요.',
      '빛이여, 우리의 칼날을 축복하소서...',
    ],
    level: 1,
    stars: 1,
    affection: 25,
    mood: 'happy',
    atkMultiplier: 1.35,
    critBonus: 10,
    goldMultiplier: 2.0,
    specialSkillName: '성천사의 가호 (Divine Blessing)',
    specialSkillDesc: '30초간 강화 성공률 +5% 증가 및 골드/강화석 획득 2배 버프',
    unlocked: false,
  },
  {
    id: 'spirit_omega',
    name: '오메가 (Omega)',
    title: '창세와 시공의 코스모스검령',
    element: 'none',
    avatarColor: '#6366f1',
    personality: '전지전능한 창세의 수호신',
    catchphrase: '"우주의 섭리와 모든 검의 기원이 나의 검날 안에 존재한다."',
    dialogue: [
      '너와 내가 맺은 소울 링크는 시공간을 초월한 기적이다.',
      '모든 차원의 검들이여, 내 부름에 응답하라.',
      '세계의 끝을 넘어, 우리는 영원에 도달할 것이다.',
    ],
    level: 1,
    stars: 1,
    affection: 10,
    mood: 'normal',
    atkMultiplier: 3.0, // +200%
    critBonus: 25,
    goldMultiplier: 5.0,
    specialSkillName: '빅뱅 코스믹 제네시스 (Cosmic Genesis)',
    specialSkillDesc: '화면 전체를 가르는 궁극의 창세 일격! 공격력의 5000% 우주 폭발',
    unlocked: false,
  },
];
