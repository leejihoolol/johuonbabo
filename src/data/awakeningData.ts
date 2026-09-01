import { SwordAwakeningStage } from '../types';

export const AWAKENING_STAGES: SwordAwakeningStage[] = [
  {
    stage: 1,
    name: '심연 각성 (Abyssal Surge)',
    subTitle: '제 1단계 한계돌파: 심연의 어둠과 공허의 힘',
    maxLevel: 45,
    requiredPreviousLevel: 35,
    requiredShards: 150,
    requiredStones: 5000,
    requiredDust: 100,
    requiredRP: 0,
    requiredGold: 10_000_000, // 1000만G
    requiredDiamonds: 500,
    requiredScrolls: 0,
    atkBonusMultiplier: 3.0, // +300%
    description: '우주 정점의 검을 심연의 제단에 바쳐 공허와 암흑의 심연력을 칼날에 주입합니다. 최대 강화 한계가 +45강으로 대폭 확장됩니다.',
    benefits: [
      '최대 강화 수치 +35강 → +45강으로 확장 (+36 ~ +45강 해금)',
      '기본 공격력 +300% 영구 증폭',
      '치명타 확률 +10% & 치명타 데미지 +150% 보너스',
      '심연 흑자색 흑요석 광휘 칼날 & 암흑 오라 파티클 비주얼 해금',
      '소울 가루 및 검 파편 획득량 +50% 증가',
    ],
    themeColor: '#a855f7',
    auraEffectName: '심연의 공허 오라 (Abyssal Void Aura)',
  },
  {
    stage: 2,
    name: '천상 각성 (Celestial Radiance)',
    subTitle: '제 2단계 한계돌파: 신성한 에테르와 천상의 광휘',
    maxLevel: 56,
    requiredPreviousLevel: 45,
    requiredShards: 400,
    requiredStones: 25000,
    requiredDust: 350,
    requiredRP: 20,
    requiredGold: 100_000_000, // 1억G
    requiredDiamonds: 2000,
    requiredScrolls: 0,
    atkBonusMultiplier: 8.0, // +800%
    description: '심연을 딛고 일어선 검에 천사의 축복과 천상의 에테르를 깃들입니다. 황금빛 날개 가드와 성스러운 빛이 칼날을 감싸며 최대 강화 한계가 +56강으로 확장됩니다.',
    benefits: [
      '최대 강화 수치 +45강 → +56강으로 확장 (+46 ~ +56강 해금)',
      '기본 공격력 +800% & 골드 획득량 +400% 대폭 증폭',
      '강화 성공 확률 보정 +3.0% 영구 가산',
      '천상 황금 에테르 날개 & 십자 광채 젬스톤 비주얼 해금',
      '모든 던전 및 월드 보스 대상 추가 피해 +500%',
    ],
    themeColor: '#fbbf24',
    auraEffectName: '천상의 성광 오라 (Celestial Seraphim Aura)',
  },
  {
    stage: 3,
    name: '태초·창세 각성 (Primordial Genesis)',
    subTitle: '최종 제 3단계 한계돌파: 시공간 초월과 무한의 신검',
    maxLevel: 67,
    requiredPreviousLevel: 56,
    requiredShards: 1000,
    requiredStones: 100000,
    requiredDust: 1000,
    requiredRP: 100,
    requiredGold: 1_000_000_000, // 10억G
    requiredDiamonds: 8000,
    requiredScrolls: 10,
    atkBonusMultiplier: 25.0, // +2,500%
    description: '모든 차원과 시공간, 태초의 빅뱅 특이점을 하나로 융합하여 절대의 신검을 완성합니다. 전 우주의 섭리를 뛰어넘어 최대 강화 한계가 궁극의 +67강까지 도달합니다.',
    benefits: [
      '최대 강화 수치 +56강 → 최종 +67강 극의 한계돌파!! (+57 ~ +67강 해금)',
      '기본 공격력 +2,500% & 모든 재화 배수 3배 극대화',
      '초환생(SR) 배수 효율 2배로 영구 강화',
      '무지갯빛 프리즘 크리스탈 & 회전하는 차원 링 궤도 파티클 비주얼 해금',
      '+67강 달성 시 "신검의 지배자(Lord of Godblades)" 전용 칭호 및 이펙트 수여',
    ],
    themeColor: '#38bdf8',
    auraEffectName: '태초 창세의 프리즘 링 오라 (Primordial Genesis Halo)',
  },
];

export function getAwakeningMaxLevel(awakeningLevel: number = 0): number {
  if (awakeningLevel >= 3) return 67;
  if (awakeningLevel === 2) return 56;
  if (awakeningLevel === 1) return 45;
  return 35; // default unawakened base max
}

export function getAwakeningTitle(awakeningLevel: number = 0): string {
  if (awakeningLevel >= 3) return '제3각성: 태초·창세 (3rd Genesis)';
  if (awakeningLevel === 2) return '제2각성: 천상 광휘 (2nd Celestial)';
  if (awakeningLevel === 1) return '제1각성: 심연 각성 (1st Abyssal)';
  return '미각성 (Unawakened)';
}
