import React, { useState } from 'react';
import { Trash2, ArrowUpCircle } from 'lucide-react';
import { ElementType, PlayerStats, Rune, Sword } from '../types';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface RunesAndElementsProps {
  stats: PlayerStats;
  currentSword: Sword;
  onEquipRune: (slotIndex: number, rune: Rune) => void;
  onUnequipRune: (slotIndex: number) => void;
  onInfuseElement: (element: ElementType) => void;
  onUpgradeElement: (element: ElementType) => void;
}

export const RunesAndElementsView: React.FC<RunesAndElementsProps> = ({
  stats,
  currentSword,
  onEquipRune,
  onUnequipRune,
  onInfuseElement,
  onUpgradeElement,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'runes'>('elements');

  const elementsList: { type: ElementType; name: string; iconName: PixelIconName; desc: string; color: string; bg: string; border: string }[] = [
    { type: 'none', name: '무속성 (Pure Steel)', iconName: 'sword', desc: '기본 순수 강철 칼날. 추가 속성 효과 없음.', color: 'text-neutral-300', bg: 'bg-neutral-900', border: 'border-neutral-700' },
    { type: 'fire', name: '화염 속성 (Flame Aura)', iconName: 'fire', desc: '불꽃 오라 방출. 숲/야수/언데드 계열 몬스터에게 +50% 추가 피해.', color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-600' },
    { type: 'ice', name: '빙결 속성 (Frost Shiver)', iconName: 'ice', desc: '서리꽃 한기 오라. 골렘/화염룡 계열 몬스터에게 +50% 추가 피해.', color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-600' },
    { type: 'lightning', name: '뇌전 속성 (Thunder Surge)', iconName: 'lightning', desc: '황금 번개 스파크. 기계/고블린/수룡 몬스터에게 +50% 추가 피해.', color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-600' },
    { type: 'holy', name: '신성 속성 (Holy Radiance)', iconName: 'holy', desc: '찬란한 천상계 광채. 해골/마왕/암흑 군단 몬스터에게 +50% 추가 피해.', color: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-500' },
    { type: 'dark', name: '암흑 속성 (Abyssal Void)', iconName: 'dark', desc: '칠흑의 공허 안개. 신성 수호자 및 차원 왜곡체에게 +50% 추가 피해.', color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b-2 border-neutral-800 pb-2">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('elements');
          }}
          className={`px-4 py-2 rounded-t font-bold text-xs sm:text-sm cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'elements'
              ? 'bg-neutral-900 text-amber-400 border-amber-400'
              : 'text-neutral-500 hover:text-neutral-300 border-transparent'
          }`}
        >
          <PixelIcon name="fire" size={16} />
          <span>원소 속성 부여 (Element Infusion)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('runes');
          }}
          className={`px-4 py-2 rounded-t font-bold text-xs sm:text-sm cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'runes'
              ? 'bg-neutral-900 text-cyan-400 border-cyan-400'
              : 'text-neutral-500 hover:text-neutral-300 border-transparent'
          }`}
        >
          <PixelIcon name="rune" size={16} />
          <span>마법 룬 장착 (Rune Sockets)</span>
        </button>
      </div>

      {/* 1. ELEMENTS TAB */}
      {activeTab === 'elements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {elementsList.map((elm) => {
            const isEquipped = stats.elementInfusion === elm.type;
            const lvl = stats.elementLevel[elm.type] || 0;
            const upgradeCostDiamonds = 100 * (lvl + 1);

            return (
              <div
                key={elm.type}
                className={`p-4 rounded-lg border-2 ${elm.border} ${elm.bg} flex flex-col justify-between gap-3 shadow transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800">
                      <PixelIcon name={elm.iconName} size={20} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm sm:text-base ${elm.color}`}>{elm.name}</h3>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        숙련도 Lv.{lvl} (추가 피해 +{lvl * 5}%)
                      </span>
                    </div>
                  </div>

                  {isEquipped && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-neutral-950">
                      장착중
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  {elm.desc}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    onClick={() => {
                      sound.playSkill(elm.type);
                      onInfuseElement(elm.type);
                    }}
                    className={`flex-1 py-1.5 rounded text-xs font-bold border cursor-pointer ${
                      isEquipped
                        ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-default'
                        : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-neutral-950 border-amber-400 shadow'
                    }`}
                  >
                    {isEquipped ? '활성화됨' : '칼날에 깃들게 하기'}
                  </button>

                  {elm.type !== 'none' && (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onUpgradeElement(elm.type);
                      }}
                      disabled={stats.diamonds < upgradeCostDiamonds}
                      className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 disabled:opacity-50 border border-cyan-500 rounded text-cyan-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      title="속성 숙련도 강화"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span className="flex items-center gap-1">
                        {upgradeCostDiamonds} <PixelIcon name="diamond" size={12} />
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. RUNES TAB */}
      {activeTab === 'runes' && (
        <div className="flex flex-col gap-4">
          {/* Sockets section (3 slots) */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-3 shadow">
            <h3 className="text-sm font-bold text-amber-300 flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="flex items-center gap-1.5">
                <PixelIcon name="rune" size={16} /> 검 룬 소켓 (총 3개)
              </span>
              <span className="text-xs text-neutral-400 font-mono">+{currentSword.level} {currentSword.name}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((slotIdx) => {
                const rune = stats.equippedRunes[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    className="p-3 bg-neutral-950 border-2 border-neutral-800 rounded-lg flex flex-col justify-between gap-2 min-h-28"
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-neutral-400 border-b border-neutral-800 pb-1">
                      <span>소켓 #{slotIdx + 1}</span>
                      {rune && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onUnequipRune(slotIdx);
                          }}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer flex items-center gap-0.5 text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" /> 해제
                        </button>
                      )}
                    </div>

                    {rune ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold" style={{ color: rune.color }}>
                          {rune.name}
                        </span>
                        <span className="text-xs text-neutral-300 font-mono">
                          {rune.type === 'atk' && `공격력 +${rune.value}`}
                          {rune.type === 'critRate' && `치명타 확률 +${rune.value}%`}
                          {rune.type === 'critDmg' && `치명타 피해 +${rune.value}%`}
                          {rune.type === 'goldBonus' && `골드 획득 +${rune.value}%`}
                          {rune.type === 'enhanceLuck' && `강화 확률 +${rune.value}%`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-neutral-600 text-xs">
                        <span>[ 빈 소켓 ]</span>
                        <span className="text-[10px] text-neutral-500">인벤토리에서 룬 장착</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rune Inventory */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-3 shadow">
            <h3 className="text-sm font-bold text-cyan-300 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
              <PixelIcon name="rune" size={16} /> 보유 마법 룬 인벤토리
            </h3>

            {stats.inventoryRunes.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-500">
                보유한 룬이 없습니다. 던전 사냥 또는 암시장 상점에서 룬을 획득하세요!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {stats.inventoryRunes.map((rune) => (
                  <div
                    key={rune.id}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col justify-between gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm" style={{ color: rune.color }}>
                          {rune.name}
                        </h4>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          수량: {rune.count}개
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-300 font-mono">
                      {rune.type === 'atk' && `공격력 +${rune.value}`}
                      {rune.type === 'critRate' && `치명타 확률 +${rune.value}%`}
                      {rune.type === 'critDmg' && `치명타 피해 +${rune.value}%`}
                      {rune.type === 'goldBonus' && `골드 획득 +${rune.value}%`}
                      {rune.type === 'enhanceLuck' && `강화 성공률 +${rune.value}%`}
                    </div>

                    <div className="flex gap-1 pt-1">
                      {[0, 1, 2].map((slot) => (
                        <button
                          key={slot}
                          onClick={() => {
                            sound.playClick();
                            onEquipRune(slot, rune);
                          }}
                          className="flex-1 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[10px] font-bold border border-neutral-700 cursor-pointer"
                        >
                          #{slot + 1} 소켓
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
