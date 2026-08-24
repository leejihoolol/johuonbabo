import React from 'react';
import { Volume2, VolumeX, Music, HardDrive } from 'lucide-react';
import { PlayerStats } from '../types';
import { PixelIcon, PixelIconName } from './PixelIcon';
import { sound } from '../utils/sound';

interface NavbarProps {
  stats: PlayerStats;
  onOpenSaveModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ stats, onOpenSaveModal, activeTab, setActiveTab }) => {
  const [sfxOn, setSfxOn] = React.useState(stats.soundEnabled);
  const [bgmOn, setBgmOn] = React.useState(stats.musicEnabled);

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

  // Format large numbers nicely (e.g. 1.2M, 5.4B)
  const formatNum = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e4) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const tabs: { id: string; label: string; icon: PixelIconName }[] = [
    { id: 'anvil', label: '모루 강화', icon: 'anvil' },
    { id: 'dungeon', label: '던전 사냥', icon: 'dungeon' },
    { id: 'runes', label: '속성·룬', icon: 'rune' },
    { id: 'blacksmith', label: '대장간 연구', icon: 'blacksmith' },
    { id: 'codex', label: '도감 컬렉션', icon: 'codex' },
    { id: 'shop', label: '암시장 상점', icon: 'shop' },
    { id: 'achievements', label: '업적', icon: 'trophy' },
  ];

  return (
    <header className="w-full bg-neutral-900/95 backdrop-blur border-b-4 border-neutral-800 sticky top-0 z-40 shadow-xl font-pixel">
      {/* Top Resource Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 text-xs sm:text-sm">
        {/* Title / Logo */}
        <div className="flex items-center gap-2">
          <PixelIcon name="sword" size={24} className="animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-bold text-amber-400 tracking-wider text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              픽셀 검 강화하기
            </h1>
            <span className="text-[10px] text-neutral-400 font-mono">Pixel Sword Master v1.2</span>
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

          {/* Sword Shards */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border-2 border-slate-600/60 shadow-inner">
            <PixelIcon name="shard" size={16} />
            <span className="text-slate-300 font-bold">{stats.swordShards}</span>
            <span className="text-[10px] text-neutral-400 hidden md:inline">파편</span>
          </div>
        </div>

        {/* Settings & Save Controls */}
        <div className="flex items-center gap-1.5">
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
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 border-transparent'
              }`}
            >
              <PixelIcon name={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
