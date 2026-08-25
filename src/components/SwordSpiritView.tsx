import React, { useState } from 'react';
import { 
  Sparkles, Heart, Star, Zap, Flame, Shield, Award, MessageSquare, 
  Smile, CheckCircle2, Lock, FlameKindling, Swords, Crown, Wand2
} from 'lucide-react';
import { PlayerStats, Sword, SwordSpirit } from '../types';
import { INITIAL_SWORD_SPIRITS } from '../data/contentsData';
import { sound } from '../utils/sound';

interface SwordSpiritViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  addLog: (text: string, type: 'success' | 'fail' | 'destroy' | 'drop' | 'loot' | 'system' | 'boss') => void;
}

export const SwordSpiritView: React.FC<SwordSpiritViewProps> = ({
  stats,
  currentSword,
  onUpdateStats,
  addLog,
}) => {
  const spirits = stats.swordSpirits || INITIAL_SWORD_SPIRITS;
  const [selectedSpiritId, setSelectedSpiritId] = useState<string>(
    stats.activeSpiritId || spirits[0].id
  );

  const selectedSpirit = spirits.find((s) => s.id === selectedSpiritId) || spirits[0];
  const [dialogueBubble, setDialogueBubble] = useState<string>(selectedSpirit.catchphrase);
  const [heartAnim, setHeartAnim] = useState(false);
  const [burstAnim, setBurstAnim] = useState(false);

  // Switch Spirit Tab
  const handleSelectSpirit = (spirit: SwordSpirit) => {
    sound.playClick();
    setSelectedSpiritId(spirit.id);
    setDialogueBubble(spirit.catchphrase);
  };

  // Pet / Interact with Spirit
  const handlePetSpirit = () => {
    sound.playSuccess();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);

    const randomDialogue =
      selectedSpirit.dialogue[Math.floor(Math.random() * selectedSpirit.dialogue.length)];
    setDialogueBubble(randomDialogue);

    onUpdateStats((prev) => {
      const currentList = prev.swordSpirits || INITIAL_SWORD_SPIRITS;
      const updated = currentList.map((s) => {
        if (s.id === selectedSpirit.id) {
          const nextAffection = Math.min(100, s.affection + 5);
          const nextMood: SwordSpirit['mood'] = nextAffection >= 80 ? 'ecstatic' : 'happy';
          return {
            ...s,
            affection: nextAffection,
            mood: nextMood,
          };
        }
        return s;
      });
      return { ...prev, swordSpirits: updated };
    });

    addLog(`[검령 교감] ${selectedSpirit.name}을(를) 다정하게 쓰다듬었습니다. (친밀도 +5)`, 'system');
  };

  // Feed Spirit Dust
  const handleFeedDust = () => {
    const cost = selectedSpirit.level * 30;
    if ((stats.spiritDust || 0) < cost) {
      sound.playFail();
      addLog(`[검령 성장] 영혼의 가루가 부족합니다. (필요: ${cost} 가루)`, 'fail');
      return;
    }

    sound.playSuccess(true);
    onUpdateStats((prev) => {
      const currentList = prev.swordSpirits || INITIAL_SWORD_SPIRITS;
      const updated = currentList.map((s) => {
        if (s.id === selectedSpirit.id) {
          return {
            ...s,
            level: s.level + 1,
            atkMultiplier: Number((s.atkMultiplier + 0.05).toFixed(2)),
            goldMultiplier: Number((s.goldMultiplier + 0.05).toFixed(2)),
            affection: Math.min(100, s.affection + 10),
          };
        }
        return s;
      });

      return {
        ...prev,
        spiritDust: (prev.spiritDust || 0) - cost,
        swordSpirits: updated,
      };
    });

    addLog(
      `[검령 성장] ${selectedSpirit.name}에게 영혼의 가루를 먹여 Lv.${selectedSpirit.level + 1}로 성장했습니다!`,
      'loot'
    );
  };

  // Star Promotion (1성 -> 2성 -> 3성 -> 4성 -> 5성)
  const handlePromoteStar = () => {
    const starCost = selectedSpirit.stars * 1000;
    if (stats.diamonds < starCost) {
      sound.playFail();
      addLog(`[검령 진화] 다이아가 부족합니다. (필요: ${starCost} 다이아)`, 'fail');
      return;
    }

    if (selectedSpirit.stars >= 5) {
      addLog('[검령 진화] 이미 최고 성급(5성)에 도달했습니다.', 'fail');
      return;
    }

    sound.playSuccess(true);
    onUpdateStats((prev) => {
      const currentList = prev.swordSpirits || INITIAL_SWORD_SPIRITS;
      const updated = currentList.map((s) => {
        if (s.id === selectedSpirit.id) {
          return {
            ...s,
            stars: s.stars + 1,
            critBonus: s.critBonus + 5,
            atkMultiplier: Number((s.atkMultiplier + 0.25).toFixed(2)),
          };
        }
        return s;
      });

      return {
        ...prev,
        diamonds: prev.diamonds - starCost,
        swordSpirits: updated,
      };
    });

    addLog(
      `[검령 진화 성공] 🌟 ${selectedSpirit.name}이(가) ${selectedSpirit.stars + 1}성으로 각성했습니다!`,
      'success'
    );
  };

  // Unlock Spirit
  const handleUnlockSpirit = () => {
    const unlockCostDust = 300;
    const unlockCostDia = 500;

    if ((stats.spiritDust || 0) < unlockCostDust || stats.diamonds < unlockCostDia) {
      sound.playFail();
      addLog(`[검령 해금] 영혼의 가루(${unlockCostDust}) 및 다이아(${unlockCostDia})가 부족합니다.`, 'fail');
      return;
    }

    sound.playSuccess(true);
    onUpdateStats((prev) => {
      const currentList = prev.swordSpirits || INITIAL_SWORD_SPIRITS;
      const updated = currentList.map((s) => {
        if (s.id === selectedSpirit.id) {
          return { ...s, unlocked: true };
        }
        return s;
      });

      return {
        ...prev,
        spiritDust: (prev.spiritDust || 0) - unlockCostDust,
        diamonds: prev.diamonds - unlockCostDia,
        swordSpirits: updated,
      };
    });

    addLog(`[검령 소환 성공] ✨ 새로운 검령 '${selectedSpirit.name}'과 소울 서약을 맺었습니다!`, 'loot');
  };

  // Set Active Soul Link
  const handleSetActiveSpirit = () => {
    if (!selectedSpirit.unlocked) return;
    sound.playSuccess(true);
    onUpdateStats((prev) => ({
      ...prev,
      activeSpiritId: selectedSpirit.id,
    }));
    addLog(`[소울 링크] '${selectedSpirit.name}'과 소울 링크가 활성화되었습니다!`, 'boss');
  };

  // Trigger Soul Burst Ultimate Skill Action
  const handleSoulBurst = () => {
    if (!selectedSpirit.unlocked) return;
    sound.playBossRoar();
    setBurstAnim(true);
    setTimeout(() => setBurstAnim(false), 1200);

    addLog(`[검령 궁극기 발동!] 💥 ${selectedSpirit.name}의 '${selectedSpirit.specialSkillName}'!`, 'boss');
  };

  const isActive = stats.activeSpiritId === selectedSpirit.id;

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Top Header */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-950 border border-pink-500 flex items-center justify-center text-pink-400">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-pink-300 flex items-center gap-2">
              <span>검령의 연성 공방 & 소울 링크 (Sword Spirits & Soul Link)</span>
              <span className="text-[10px] bg-pink-950 text-pink-300 px-2 py-0.5 rounded border border-pink-500 font-mono">
                시그니처 시스템
              </span>
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              검에 깃든 살아있는 정령과 교감하고, 소울 링크를 통해 파괴적인 필살기와 버프를 해방하세요!
            </p>
          </div>
        </div>

        {/* Currency Display */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3.5 py-1.5 rounded-lg border border-neutral-800 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-neutral-400">영혼의 가루:</span>
          <span className="text-purple-300 font-bold text-sm">
            {(stats.spiritDust || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Spirit Roster, Right Spirit Interaction & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Spirit Roster List */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-3 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-neutral-300 font-mono flex items-center justify-between">
            <span>6대 검령 라인업</span>
            <span className="text-pink-400 text-[11px]">
              링크 중: {spirits.find((s) => s.id === stats.activeSpiritId)?.name || '없음'}
            </span>
          </h3>

          <div className="flex flex-col gap-2">
            {spirits.map((spirit) => {
              const isSelected = selectedSpiritId === spirit.id;
              const isCurrentActive = stats.activeSpiritId === spirit.id;

              return (
                <button
                  key={spirit.id}
                  onClick={() => handleSelectSpirit(spirit)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-pink-950/80 border-pink-400 shadow-md text-pink-200'
                      : spirit.unlocked
                      ? 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                      : 'bg-neutral-950/40 border-neutral-900 text-neutral-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Circle */}
                    <div
                      style={{ backgroundColor: spirit.avatarColor }}
                      className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center font-bold text-neutral-950 text-sm shadow-md"
                    >
                      ✨
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{spirit.name}</span>
                        {isCurrentActive && (
                          <span className="text-[9px] bg-amber-400 text-neutral-950 px-1 rounded font-mono font-bold">
                            LINK
                          </span>
                        )}
                        {!spirit.unlocked && <Lock className="w-3 h-3 text-neutral-500" />}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-sans">{spirit.title}</span>
                    </div>
                  </div>

                  {/* Stars Display */}
                  <div className="flex items-center text-amber-400 text-xs">
                    {Array.from({ length: spirit.stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center / Right: Spirit Chamber & Interaction Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Spirit Interactive Chamber Card */}
          <div className="relative rounded-2xl border-4 border-neutral-800 bg-gradient-to-b from-neutral-950 via-slate-900 to-neutral-950 p-6 flex flex-col items-center justify-between min-h-96 shadow-2xl overflow-hidden">
            {/* Soul Burst Screen Flash Animation */}
            {burstAnim && (
              <div className="absolute inset-0 bg-pink-500/30 backdrop-blur-sm z-30 flex items-center justify-center animate-ping">
                <div className="text-2xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,1)]">
                  ⚡ {selectedSpirit.specialSkillName} ⚡
                </div>
              </div>
            )}

            {/* Top Status & Mood */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-700">
                <Smile className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono text-neutral-300">
                  기분: <span className="font-bold text-amber-300">{selectedSpirit.mood.toUpperCase()}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-700">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-mono text-neutral-300">
                  친밀도: <span className="font-bold text-rose-300">{selectedSpirit.affection}/100</span>
                </span>
              </div>
            </div>

            {/* Center Interactive Spirit Avatar */}
            <div className="relative flex flex-col items-center gap-3 my-4 z-10">
              {/* Dialogue Bubble */}
              <div className="relative bg-neutral-900 border-2 border-pink-400/80 text-pink-200 text-xs px-4 py-2.5 rounded-2xl shadow-xl max-w-sm text-center font-sans">
                {dialogueBubble}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-neutral-900 border-r-2 border-b-2 border-pink-400 rotate-45" />
              </div>

              {/* Glowing Spirit Core */}
              <div
                onClick={handlePetSpirit}
                style={{
                  boxShadow: `0 0 35px ${selectedSpirit.avatarColor}`,
                  backgroundColor: selectedSpirit.avatarColor,
                }}
                className="w-28 h-28 rounded-full border-4 border-white flex items-center justify-center text-4xl cursor-pointer transform hover:scale-110 active:scale-95 transition-all shadow-2xl relative"
                title="클릭하여 쓰다듬기!"
              >
                🧚
                {heartAnim && (
                  <div className="absolute -top-8 text-3xl animate-bounce pointer-events-none">
                    💖
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSpirit.name}</span>
                  <span className="text-xs font-mono text-amber-400">Lv.{selectedSpirit.level}</span>
                </h2>
                <div className="flex items-center text-amber-400 text-xs mt-0.5">
                  {Array.from({ length: selectedSpirit.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Pet, Feed, Link, Burst */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 z-10 pt-3 border-t border-neutral-800">
              <button
                onClick={handlePetSpirit}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold rounded-lg text-neutral-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>쓰다듬기</span>
              </button>

              <button
                onClick={handleFeedDust}
                className="py-2 px-3 bg-purple-950 hover:bg-purple-900 border border-purple-600 text-xs font-bold rounded-lg text-purple-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>가루 먹이기 ({selectedSpirit.level * 30})</span>
              </button>

              <button
                onClick={handlePromoteStar}
                disabled={selectedSpirit.stars >= 5}
                className="py-2 px-3 bg-amber-950 hover:bg-amber-900 border border-amber-600 text-xs font-bold rounded-lg text-amber-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>성급 진화</span>
              </button>

              {!selectedSpirit.unlocked ? (
                <button
                  onClick={handleUnlockSpirit}
                  className="py-2 px-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white text-xs font-extrabold rounded-lg cursor-pointer"
                >
                  소울 소환 계약
                </button>
              ) : (
                <button
                  onClick={handleSetActiveSpirit}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-indigo-950 hover:bg-indigo-900 border-indigo-500 text-indigo-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isActive ? '소울 링크 중' : '소울 링크 연결'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Spirit Stat Boost & Ultimate Skill Card */}
          <div className="bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <span>소울 링크 제공 버프 & 궁극기</span>
              </h3>

              {selectedSpirit.unlocked && (
                <button
                  onClick={handleSoulBurst}
                  className="px-3 py-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-neutral-950 font-extrabold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md transform active:scale-95 transition-transform"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>궁극기 필살기 발동!</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex flex-col gap-0.5">
                <span className="text-neutral-400">공격력 증폭:</span>
                <span className="text-rose-400 font-bold text-sm">
                  +{( (selectedSpirit.atkMultiplier - 1) * 100 ).toFixed(0)}%
                </span>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex flex-col gap-0.5">
                <span className="text-neutral-400">치명타 확률:</span>
                <span className="text-yellow-400 font-bold text-sm">+{selectedSpirit.critBonus}%</span>
              </div>

              <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex flex-col gap-0.5">
                <span className="text-neutral-400">골드 획득:</span>
                <span className="text-amber-400 font-bold text-sm">
                  +{( (selectedSpirit.goldMultiplier - 1) * 100 ).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Special Skill Description */}
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex flex-col gap-1">
              <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                <span>💥 전용 필살기: {selectedSpirit.specialSkillName}</span>
              </div>
              <p className="text-xs text-neutral-400 font-sans">{selectedSpirit.specialSkillDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
