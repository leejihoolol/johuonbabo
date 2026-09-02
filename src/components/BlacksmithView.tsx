import React from 'react';
import { Hammer, Shield, Coins, Gem, Zap, Target } from 'lucide-react';
import { BlacksmithResearch, PlayerStats } from '../types';
import { RESEARCH_LIST } from '../data/research';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface BlacksmithViewProps {
  stats: PlayerStats;
  onUpgradeResearch: (researchId: string, cost: number) => void;
  onSelectAnvilSkin: (skinId: 'basic' | 'iron' | 'flame' | 'cyber' | 'divine') => void;
}

export const BlacksmithView: React.FC<BlacksmithViewProps> = ({
  stats,
  onUpgradeResearch,
  onSelectAnvilSkin,
}) => {
  const getResearchCost = (res: BlacksmithResearch) => {
    const curLevel = stats.researches[res.id] || 0;
    return Math.floor(res.baseCost * Math.pow(res.costMultiplier, curLevel));
  };

  const anvilSkins: {
    id: 'basic' | 'iron' | 'flame' | 'cyber' | 'divine';
    name: string;
    iconName: PixelIconName;
    desc: string;
    unlockReq: string;
    unlocked: boolean;
  }[] = [
    { id: 'basic', name: '녹슨 무쇠 모루', iconName: 'anvil', desc: '표준 대장간 모루. 특별한 보너스 없음.', unlockReq: '기본 지급', unlocked: true },
    { id: 'iron', name: '단단한 강철 모루', iconName: 'shield', desc: '강화 성공 확률 +1% 영구 추가.', unlockReq: '10강 검 달성', unlocked: (stats.maxSwordLevelReached || 0) >= 10 },
    { id: 'flame', name: '화염의 용광로 모루', iconName: 'fire', desc: '강화 성공 확률 +2%, 던전 골드 +10%.', unlockReq: '15강 검 달성', unlocked: (stats.maxSwordLevelReached || 0) >= 15 },
    { id: 'cyber', name: '네온 사이버 모루', iconName: 'lightning', desc: '강화 성공 확률 +3%, 크리티컬 확률 +5%.', unlockReq: '20강 검 달성', unlocked: (stats.maxSwordLevelReached || 0) >= 20 },
    { id: 'divine', name: '천상계 황금 모루', iconName: 'holy', desc: '강화 성공 확률 +5%, 골드 +25%, 파괴 확률 -5%.', unlockReq: '25강 검 달성', unlocked: (stats.maxSwordLevelReached || 0) >= 25 },
  ];

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Header banner */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-950 rounded border border-neutral-700">
            <PixelIcon name="anvil" size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              대장간 연구소 & 마스터리
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              골드를 투자하여 강화 성공률, 파괴 완화, 골드 채굴 능력을 영구적으로 증폭시키세요.
            </p>
          </div>
        </div>

        {/* Auto Stone Furnace Indicator */}
        <div className="bg-neutral-950 px-3 py-2 rounded border border-purple-600/60 flex items-center gap-2 text-xs font-mono">
          <PixelIcon name="stone" size={16} />
          <span className="text-neutral-400">자동 강화석 연성:</span>
          <span className="text-purple-300 font-bold">
            +{(stats.researches['res_auto_mine'] || 0)}개 / 10초
          </span>
        </div>
      </div>

      {/* Research Perks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {RESEARCH_LIST.map((res, index) => {
          const curLevel = stats.researches[res.id] || 0;
          const isMax = curLevel >= res.maxLevel;
          const cost = getResearchCost(res);
          const canAfford = stats.gold >= cost;

          return (
            <div
              key={res.id}
              className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-700 text-amber-400">
                    {res.icon === 'Hammer' && <Hammer className="w-4 h-4" />}
                    {res.icon === 'Shield' && <Shield className="w-4 h-4" />}
                    {res.icon === 'Coins' && <Coins className="w-4 h-4" />}
                    {res.icon === 'Gem' && <Gem className="w-4 h-4" />}
                    {res.icon === 'Zap' && <Zap className="w-4 h-4" />}
                    {res.icon === 'Target' && <Target className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-neutral-100">{res.name}</h3>
                    <span className="text-[11px] text-amber-400 font-mono">
                      Lv.{curLevel} / {res.maxLevel}
                    </span>
                  </div>
                </div>

                {isMax && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-600">
                    MAX
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                {res.description}
              </p>

              {/* Current effect summary */}
              <div className="bg-neutral-950 p-2 rounded text-[11px] font-mono text-emerald-400 flex justify-between">
                <span>현재 누적 효과:</span>
                <span className="font-bold">
                  {res.effectType === 'success_boost' && `+${(curLevel * res.effectPerLevel).toFixed(1)}%`}
                  {res.effectType === 'destroy_reduction' && `-${(curLevel * res.effectPerLevel).toFixed(1)}%`}
                  {res.effectType === 'gold_boost' && `+${curLevel * res.effectPerLevel}%`}
                  {res.effectType === 'stone_auto_mine' && `+${curLevel * res.effectPerLevel}개/10s`}
                  {res.effectType === 'crit_boost' && `+${(curLevel * res.effectPerLevel).toFixed(1)}%`}
                  {res.effectType === 'qte_window_boost' && `+${curLevel * res.effectPerLevel}% 폭`}
                </span>
              </div>

              {/* Upgrade Button */}
              <button
                disabled={isMax || !canAfford}
                onClick={() => {
                  sound.playClick();
                  onUpgradeResearch(res.id, cost);
                }}
                className={`w-full py-2 rounded text-xs font-bold font-mono flex items-center justify-center gap-1.5 border cursor-pointer transition-all ${
                  isMax
                    ? 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-default'
                    : canAfford
                    ? `bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-neutral-950 border-amber-400 shadow ${
                        stats.tutorialActive && stats.tutorialStep === 3 && index === 0 ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                      }`
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800 cursor-not-allowed opacity-60'
                }`}
              >
                {isMax ? (
                  '연구 완료'
                ) : (
                  <>
                    <PixelIcon name="gold" size={14} />
                    <span>{cost.toLocaleString()} 골드로 연구하기 {stats.tutorialActive && stats.tutorialStep === 3 && index === 0 ? '👉 [미션]' : ''}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Anvil Skins Selection */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-3 shadow mt-2">
        <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2 border-b border-neutral-800 pb-2">
          <span className="flex items-center gap-1.5">
            <PixelIcon name="anvil" size={16} /> 대장장이 모루 스킨 (Anvil Skins)
          </span>
          <span className="text-xs text-neutral-400 font-sans font-normal">
            높은 등급의 검을 달성하여 전설의 모루를 해금하세요!
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {anvilSkins.map((skin) => {
            const isEquipped = stats.activeAnvilSkin === skin.id;

            return (
              <div
                key={skin.id}
                className={`p-3 rounded-lg border-2 flex flex-col justify-between gap-2 text-xs ${
                  isEquipped
                    ? 'bg-neutral-950 border-amber-400 shadow-md'
                    : skin.unlocked
                    ? 'bg-neutral-950/80 border-neutral-700'
                    : 'bg-neutral-950/40 border-neutral-900 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1 bg-neutral-900 rounded border border-neutral-800">
                    <PixelIcon name={skin.iconName} size={22} />
                  </div>
                  {isEquipped && (
                    <span className="text-[10px] bg-amber-500 text-neutral-950 font-bold px-1.5 py-0.5 rounded">
                      사용중
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-neutral-200">{skin.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-sans mt-0.5">{skin.desc}</p>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  {skin.unlocked ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectAnvilSkin(skin.id);
                      }}
                      disabled={isEquipped}
                      className={`w-full py-1 rounded text-[11px] font-bold cursor-pointer ${
                        isEquipped
                          ? 'bg-neutral-800 text-neutral-500 cursor-default'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      {isEquipped ? '장착됨' : '선택'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-rose-400 block text-center">
                      잠김: {skin.unlockReq}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
