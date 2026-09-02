import React, { useState } from 'react';
import { Volume2, VolumeX, Music, HardDrive, Sparkles, Crown, Users, Timer, Settings, HelpCircle } from 'lucide-react';
import { PlayerStats } from '../types';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface NavbarProps {
  stats: PlayerStats;
  onOpenSaveModal: () => void;
  onOpenSettingsModal?: () => void;
  onOpenTutorialModal?: () => void;
  onOpenCheatModal?: () => void;
  onOpenPartyModal?: () => void;
  onOpenSpeedrunModal?: () => void;
  onQuickRebirth?: () => void;
  isSpeedrunActive?: boolean;
  onVersionClick?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  stats, 
  onOpenSaveModal, 
  onOpenSettingsModal,
  onOpenTutorialModal,
  onOpenCheatModal,
  onOpenPartyModal,
  onOpenSpeedrunModal,
  onQuickRebirth,
  isSpeedrunActive,
  onVersionClick,
  activeTab, 
  setActiveTab 
}) => {
  const [sfxOn, setSfxOn] = useState(stats.soundEnabled);
  const [bgmOn, setBgmOn] = useState(stats.musicEnabled);

  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    sound.sfxEnabled = next;
    stats.soundEnabled = next;
    sound.playClick();
  };

  const toggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    sound.toggleBGM(next);
    stats.musicEnabled = next;
  };

  // Format large numbers nicely (e.g. 1.2M, 5.4B, 10Qa)
  const formatNum = (num: number) => {
    if (num >= 1e18) return (num / 1e18).toFixed(2) + 'Qi';
    if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Qa';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e4) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const isCheatActive = Boolean(stats.adminUnlocked || stats.cheatUnlocked);

  const tabs: { id: string; label: string; icon: PixelIconName; highlight?: boolean }[] = [
    { id: 'anvil', label: '모루 강화', icon: 'anvil' },
    { id: 'awakening', label: '⚔️ 초월 각성 (+67강)', icon: 'sword' as PixelIconName, highlight: (stats.swordAwakeningLevel || 0) > 0 || stats.currentSwordLevel >= 35 },
    { id: 'dungeon', label: '10대 월드 던전', icon: 'dungeon' },
    { id: 'world_boss', label: '🔥 월드 보스 토벌', icon: 'boss' as PixelIconName, highlight: true },
    { id: 'trade', label: '🤝 자유 거래소·직거래', icon: 'shop' as PixelIconName, highlight: true },
    { id: 'spire', label: '⚡ 무한 검탑·보석', icon: 'trophy' as PixelIconName, highlight: true },
    { id: 'sword_spirit', label: '🧚 검령 공방·소울', icon: 'rune' as PixelIconName, highlight: true },
    { id: 'prestige', label: `환생·차원 (${stats.rebirthCount}R/${stats.superRebirthCount}SR)`, icon: 'gold', highlight: stats.gold >= 100000 || stats.rebirthCount >= 100 },
    ...(stats.superRebirthCount >= 10 || stats.adminUnlocked
      ? [{ id: 'tier_staircase', label: '👑 티어 계단 (T1~T5)', icon: 'trophy' as PixelIconName, highlight: true }]
      : []),
    { id: 'runes', label: '속성·룬', icon: 'rune' },
    { id: 'blacksmith', label: '대장간 연구', icon: 'blacksmith' },
    { id: 'codex', label: '도감 컬렉션', icon: 'codex' },
    { id: 'shop', label: '암시장 상점', icon: 'shop' },
    { id: 'achievements', label: '업적', icon: 'trophy' },
  ];

  return (
    <div className="w-full bg-neutral-900/95 backdrop-blur border-b-4 border-neutral-800 shadow-xl font-pixel">
      {/* Top Resource Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 text-xs sm:text-sm">
        {/* Title / Logo */}
        <div className="flex items-center gap-2">
          <PixelIcon name="sword" size={24} className="animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-bold text-amber-400 tracking-wider text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
              <span>픽셀 검 강화하기</span>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700 font-mono">
                W{stats.currentWorldId || 1}
              </span>
            </h1>
            <button
              onClick={onVersionClick}
              className="text-[10px] text-neutral-400 hover:text-amber-400 font-mono text-left cursor-pointer transition-colors select-none"
              title="클릭하여 버전 정보 확인 (3회 클릭 시 어드민 인증)"
            >
              Pixel Sword Master v1.3.0 {stats.adminUnlocked && <span className="text-rose-400 font-bold ml-1">[ADMIN]</span>}
            </button>
          </div>
        </div>

        {/* Resource Indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
          {/* Gold */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded border-2 border-amber-600/60 shadow-inner">
            <PixelIcon name="gold" size={16} />
            <span className="font-bold text-amber-300">{formatNum(stats.gold)}</span>
          </div>

          {/* Diamonds */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded border-2 border-cyan-600/60 shadow-inner">
            <PixelIcon name="diamond" size={16} />
            <span className="font-bold text-cyan-300">{formatNum(stats.diamonds)}</span>
          </div>

          {/* Enhancement Stones */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded border-2 border-purple-600/60 shadow-inner">
            <PixelIcon name="stone" size={16} />
            <span className="text-purple-300 font-bold">{formatNum(stats.enhancementStones)}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">강화석</span>
          </div>

          {/* Protection Scrolls */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border-2 border-emerald-600/60 shadow-inner">
            <PixelIcon name="scroll" size={16} />
            <span className="text-emerald-300 font-bold">{stats.ancientScrolls}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">보호서</span>
          </div>

          {/* Lucky Potions */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border-2 border-rose-600/60 shadow-inner">
            <PixelIcon name="potion" size={16} />
            <span className="text-rose-300 font-bold">{stats.luckyPotions}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">행운약</span>
          </div>

          {/* Spirit Dust */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border-2 border-pink-600/60 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-pink-300 font-bold">{formatNum(stats.spiritDust || 0)}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">가루</span>
          </div>

          {/* Sword Shards */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border-2 border-slate-600/60 shadow-inner">
            <PixelIcon name="shard" size={16} />
            <span className="text-slate-300 font-bold">{stats.swordShards}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">파편</span>
          </div>
        </div>

        {/* Settings & Save & Cheat Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick Rebirth Button for Rebirth 10+ players */}
          {(stats.rebirthCount >= 10 || (stats.superRebirthCount || 0) > 0) && onQuickRebirth && (
            <button
              onClick={() => {
                if (stats.gold < 100000) {
                  sound.playFail();
                  return;
                }
                sound.playSuccess(true);
                onQuickRebirth();
              }}
              disabled={stats.gold < 100000}
              title={stats.gold >= 100000 ? "클릭 시 즉시 100,000G를 소모하여 빠른 환생을 실행합니다 (+1 환생/RP 획득)" : "빠른 환생 불가: 100,000G가 필요합니다"}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs cursor-pointer shadow-md transition-all active:scale-95 border-2 ${
                stats.gold >= 100000
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-neutral-950 border-emerald-300 font-bold animate-pulse shadow-emerald-900/50'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${stats.gold >= 100000 ? 'text-neutral-950 animate-bounce' : 'text-neutral-600'}`} />
              <span>⚡ 빠른 환생</span>
            </button>
          )}

          {onOpenSpeedrunModal && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenSpeedrunModal();
              }}
              title="스피드런 모드 설정 및 도전"
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-xs cursor-pointer shadow-md transition-all active:scale-95 border-2 ${
                isSpeedrunActive
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 border-amber-200 font-bold animate-pulse'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-amber-500/60'
              }`}
            >
              <Timer className={`w-3.5 h-3.5 ${isSpeedrunActive ? 'text-neutral-950 animate-spin' : 'text-amber-400'}`} style={{ animationDuration: '3s' }} />
              <span className="font-bold">{isSpeedrunActive ? '스피드런 진행중' : '스피드런'}</span>
            </button>
          )}

          {onOpenPartyModal && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenPartyModal();
              }}
              title="실시간 멀티 파티 레이드"
              className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-900 to-purple-900 hover:from-indigo-800 hover:to-purple-800 border-2 border-indigo-400 text-indigo-200 rounded font-mono text-xs cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="font-bold">파티</span>
            </button>
          )}

          {isCheatActive && onOpenCheatModal && (
            <button
              onClick={() => {
                sound.playSuccess();
                onOpenCheatModal();
              }}
              title="어드민 치트 메뉴 열기"
              className={`flex items-center gap-1 px-2.5 py-1 text-neutral-950 font-bold border-2 rounded font-mono text-xs cursor-pointer shadow-lg animate-pulse transition-all ${
                stats.adminUnlocked
                  ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 border-amber-300 hover:brightness-110'
                  : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 border-amber-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{stats.adminUnlocked ? '어드민 치트' : '치트'}</span>
            </button>
          )}

          <button
            onClick={toggleSfx}
            title={sfxOn ? '효과음 끄기' : '효과음 켜기'}
            className={`p-1.5 rounded border-2 transition-all ${
              sfxOn ? 'bg-neutral-800 border-amber-500/60 text-amber-300' : 'bg-neutral-950 border-neutral-700 text-neutral-500'
            }`}
          >
            {sfxOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleBgm}
            title={bgmOn ? 'BGM 끄기' : 'BGM 켜기'}
            className={`p-1.5 rounded border-2 transition-all ${
              bgmOn ? 'bg-neutral-800 border-purple-500/60 text-purple-300 animate-pulse' : 'bg-neutral-950 border-neutral-700 text-neutral-500'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              if (onOpenTutorialModal) onOpenTutorialModal();
            }}
            title="초보자 튜토리얼 및 게임 가이드"
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border-2 border-amber-600/60 text-amber-300 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">가이드</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              if (onOpenSettingsModal) onOpenSettingsModal();
            }}
            title="게임 설정 (오디오, 이펙트, 튜토리얼 다시보기)"
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border-2 border-neutral-600 text-neutral-200 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">설정</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenSaveModal();
            }}
            title="저장 및 데이터 관리"
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 border-2 border-neutral-600 text-neutral-200 rounded font-mono text-xs cursor-pointer transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">저장</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 flex items-center overflow-x-auto scrollbar-none gap-1 sm:gap-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id);
              }}
              className={`px-3 py-1.5 rounded-t text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'bg-neutral-950 text-amber-400 border-amber-400 shadow-md transform -translate-y-0.5'
                  : tab.highlight
                  ? 'bg-neutral-900 text-amber-300 hover:text-amber-200 hover:bg-neutral-800/80 border-amber-600/40 animate-pulse'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 border-transparent'
              }`}
            >
              <PixelIcon name={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
