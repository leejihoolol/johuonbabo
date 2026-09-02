export interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  category: '기본 강화' | '던전 전투' | '환생 & 전직' | '주요 시스템' | '초월 각성';
  icon: string;
  badge: string;
  badgeColor: string;
  content: string[];
  tips?: string[];
  highlightTab?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro_enhance',
    title: '모루 강화의 기본 & 리듬 타이밍',
    subtitle: '픽셀 검을 두드려 전설의 신검으로 진화시키세요',
    category: '기본 강화',
    icon: 'anvil',
    badge: 'STEP 1',
    badgeColor: 'bg-amber-950 border-amber-500 text-amber-300',
    highlightTab: 'anvil',
    content: [
      '골드와 강화석을 소모하여 현재 검을 다음 단계로 강화할 수 있습니다.',
      '강화 시도 시 나타나는 타이밍 바(QTE)의 중앙 [황금 구간]에 맞추면 추가 강화 성공 확률 보너스를 획득합니다.',
      '+10강 이상부터는 강화 실패 시 검이 파괴되거나 등급이 하락할 수 있으니 [보호 주문서]를 활성화하세요.',
      '검이 파괴되면 [검 파편]을 획득하며, 이는 상점과 각성 의식에 유용하게 사용됩니다.'
    ],
    tips: [
      '대장간 연구에서 QTE 황금 판정 범위를 넓히거나 성공률을 영구 강화할 수 있습니다.',
      '자동 강화 슬라이더를 조절하여 원하는 목표 수치까지 연속 강화가 가능합니다.'
    ]
  },
  {
    id: 'dungeon_combat',
    title: '10대 월드 던전 탐험 & 자동 사냥',
    subtitle: '다양한 몬스터와 거대 보스를 처치하고 막대한 보상을 획득하세요',
    category: '던전 전투',
    icon: 'dungeon',
    badge: 'STEP 2',
    badgeColor: 'bg-emerald-950 border-emerald-500 text-emerald-300',
    highlightTab: 'dungeon',
    content: [
      '장착한 검의 공격력과 공격 속도에 따라 몬스터를 자동으로 공격합니다.',
      '스테이지 클리어 시 대량의 골드, 다이아몬드, 강화석을 전리품으로 얻습니다.',
      '각 월드의 보스는 고유한 속성 약점(화염, 냉기, 번개, 신성, 암흑)을 지니고 있어 약점 속성 룬을 장착하면 2배의 피해를 입힙니다.',
      '10대 월드를 차례대로 정복하며 더 높은 차원으로 나아가세요.'
    ],
    tips: [
      '강력한 보스에게 막힐 때는 속성 룬 부여 또는 환생을 통해 기본 스탯을 뻥튀기하세요.'
    ]
  },
  {
    id: 'rebirth_system',
    title: '환생(Rebirth) & 차원 도약(Super Rebirth)',
    subtitle: '골드를 축적하여 환생 포인트를 얻고 영구 스탯을 증폭하세요',
    category: '환생 & 전직',
    icon: 'gold',
    badge: 'STEP 3',
    badgeColor: 'bg-purple-950 border-purple-500 text-purple-300',
    highlightTab: 'prestige',
    content: [
      '100,000 골드 이상 달성 시 [환생]이 해금됩니다.',
      '환생 시 검 레벨과 골드는 초기화되지만, 환생 포인트(RP)를 얻어 공격력, 골드 획득량, 강화 성공률을 영구적으로 영구 업그레이드할 수 있습니다.',
      '100회 환생 달성 시 [초월 차원 환생 (Super Rebirth)]을 통해 새로운 10대 다중 우주 월드와 보관함을 개방할 수 있습니다.'
    ],
    tips: [
      '환생 10회 이상 달성 시 상단 바의 [⚡ 빠른 환생] 버튼으로 즉시 환생할 수 있습니다.'
    ]
  },
  {
    id: 'special_modes',
    title: '월드 보스 대토벌, 검탑 & 검령 공방',
    subtitle: '다채로운 엔드 콘텐츠로 한계 없는 성장을 경험하세요',
    category: '주요 시스템',
    icon: 'boss',
    badge: 'STEP 4',
    badgeColor: 'bg-sky-950 border-sky-500 text-sky-300',
    highlightTab: 'world_boss',
    content: [
      '🔥 월드 보스 토벌: 제한 시간 동안 거대 보스에게 입힌 피해량으로 랭킹에 도전하고 우주 유물을 수집하세요.',
      '⚡ 무한 검탑 & 보석: 층마다 특수 제약이 걸린 탑을 오르고 강력한 소켓 보석을 장착하세요.',
      '🧚 검령 공방: 개성 넘치는 검령들과 교감하고 소울 링크를 통해 파괴적인 고유 스킬을 발동하세요.',
      '🤝 자유 거래소 & 멀티 파티: 다른 플레이어들과 실시간 파티 레이드 및 직거래를 즐길 수 있습니다.'
    ],
    tips: [
      '스피드런 모드를 통해 0환생 +20강 등의 목표에 도전하고 기록을 세울 수도 있습니다.'
    ]
  },
  {
    id: 'awakening_transcend',
    title: '초월 각성: 신검의 극점 (+67강 한계돌파)',
    subtitle: '3단계 각성 의식을 통해 +35강 한계를 부수고 +67강까지 도달하세요',
    category: '초월 각성',
    icon: 'sword',
    badge: 'STEP 5',
    badgeColor: 'bg-rose-950 border-rose-500 text-rose-300',
    highlightTab: 'awakening',
    content: [
      '기본 강화는 +35강이 한계지만, [초월 각성]을 통해 +45강 → +56강 → +67강까지 한계를 돌파할 수 있습니다.',
      '제 1각성 (심연 각성): +45강 확장, 공격력 +300%, 크리티컬 강화, 흑요석 광휘 칼날.',
      '제 2각성 (천상 각성): +56강 확장, 공격력 +800%, 골드 +400%, 성공률 +3%, 세라핌 황금 날개 가드.',
      '제 3각성 (태초·창세 각성): +67강 확장, 공격력 +2500%, 골드 +1000%, 성공률 +5%, 무지개 프리즘 링 궤도.'
    ],
    tips: [
      '던전과 모루에서 획득한 검 파편, 강화석, 소울 가루, 환생 포인트 등을 모아 각성 의식을 거행하세요.'
    ]
  }
];
