export interface InteractiveMission {
  id: string;
  stepNumber: number;
  category: '기본 강화' | '던전 전투' | '상점 이용' | '대장간 연구' | '초월 각성';
  title: string;
  instruction: string;
  actionText: string;
  targetTab: string;
  icon: string;
  rewardText: string;
  rewardGold: number;
  rewardStones: number;
  rewardDiamonds: number;
  rewardScrolls?: number;
  detailGuide: string;
}

export const INTERACTIVE_TUTORIAL_MISSIONS: InteractiveMission[] = [
  {
    id: 'mission_enhance',
    stepNumber: 1,
    category: '기본 강화',
    title: '첫 번째 검 강화하기',
    instruction: '모루 탭에서 [🔨 강화하기] 버튼을 눌러 검을 1회 이상 강화해보세요!',
    actionText: '모루 화면의 [강화하기] 버튼 클릭',
    targetTab: 'anvil',
    icon: 'hammer',
    rewardText: '골드 +2,000 & 강화석 +15개',
    rewardGold: 2000,
    rewardStones: 15,
    rewardDiamonds: 0,
    detailGuide: '모루에서 골드와 강화석을 소모해 검의 파괴력과 공격 속도를 올릴 수 있습니다. QTE 타이밍을 맞추면 추가 성공률을 얻습니다.'
  },
  {
    id: 'mission_dungeon',
    stepNumber: 2,
    category: '던전 전투',
    title: '던전 탐험 & 몬스터 사냥',
    instruction: '던전 탭으로 이동하여 몬스터를 처치하거나 공격하여 골드를 수급하세요!',
    actionText: '던전 탭 진입 후 몬스터 사냥',
    targetTab: 'dungeon',
    icon: 'dungeon',
    rewardText: '골드 +5,000 & 다이아 +100개',
    rewardGold: 5000,
    rewardStones: 20,
    rewardDiamonds: 100,
    detailGuide: '장착한 검의 공격력으로 몬스터를 자동/수동 사냥합니다. 몬스터 약점 속성을 공략하면 2배의 피해를 줍니다.'
  },
  {
    id: 'mission_shop',
    stepNumber: 3,
    category: '상점 이용',
    title: '암시장에서 필수 재료 구매하기',
    instruction: '상점 탭으로 이동하여 강화석 또는 주문서를 1회 구매해보세요!',
    actionText: '상점에서 아이템 1회 구매하기',
    targetTab: 'shop',
    icon: 'shop',
    rewardText: '다이아 +200 & 보호서 +1장',
    rewardGold: 3000,
    rewardStones: 30,
    rewardDiamonds: 200,
    rewardScrolls: 1,
    detailGuide: '상점에서는 골드와 다이아몬드로 강화석 벌크, 파괴 방지 주문서, 행운의 영약을 구매할 수 있습니다.'
  },
  {
    id: 'mission_blacksmith',
    stepNumber: 4,
    category: '대장간 연구',
    title: '대장간 연구로 대장장이 역량 강화',
    instruction: '대장간 탭으로 이동하여 [성공률 증가] 또는 [QTE 판정 확대] 연구를 1회 진행해보세요!',
    actionText: '대장간 연구 1회 업그레이드',
    targetTab: 'blacksmith',
    icon: 'anvil',
    rewardText: '골드 +10,000 & 강화석 +50개',
    rewardGold: 10000,
    rewardStones: 50,
    rewardDiamonds: 150,
    detailGuide: '대장간 연구를 통해 강화 성공률, 파괴율 감소, 자동 강화 속도, 골드 획득량을 영구적으로 높일 수 있습니다.'
  },
  {
    id: 'mission_awakening',
    stepNumber: 5,
    category: '초월 각성',
    title: '초월 각성 신전 둘러보기 (+67강 한계돌파)',
    instruction: '초월 각성 탭으로 이동하여 +67강까지 확장되는 3단계 각성 시스템을 확인하세요!',
    actionText: '초월 각성 탭 확인하기',
    targetTab: 'awakening',
    icon: 'sword',
    rewardText: '다이아 +500 & 보호서 +3장 & 수료 칭호',
    rewardGold: 30000,
    rewardStones: 100,
    rewardDiamonds: 500,
    rewardScrolls: 3,
    detailGuide: '기본 35강의 한계를 돌파하여 45강(심연) → 56강(천상) → 67강(태초·창세)까지 도달할 수 있는 최종 의식 신전입니다.'
  }
];
