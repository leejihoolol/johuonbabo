import React, { useState } from 'react';
import {
  Sparkles,
  Coins,
  Zap,
  Sword,
  Globe,
  CheckCircle2,
  Lock,
  X,
  Crown,
  Flame,
  Award,
  Layers,
  Wand2,
  Sliders,
  Maximize2,
  RotateCcw,
  CheckCheck,
  Shield,
  Film
} from 'lucide-react';
import { PlayerStats, ElementType } from '../types';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';
import { SWORDS_DATA } from '../data/swords';
import { INITIAL_RUNES, INITIAL_ACHIEVEMENTS } from '../data/research';

interface CheatModalProps {
  stats: PlayerStats;
  onClose: () => void;
  onAddResources: (gold: number, diamonds: number, stones: number, scrolls: number, potions: number, shards?: number) => void;
  onSetSwordLevel: (lvl: number) => void;
  onAddRebirths: (rebirth: number, superRebirth: number, rp?: number) => void;
  onToggleCheatSuccess100: () => void;
  onToggleCheatDmg1000x: () => void;
  onToggleCheatDmg1M?: () => void;
  onUnlockAllTiersAndWorlds: () => void;
  // New Admin Specific Handlers
  onForceUnlockAscensionAll?: () => void;
  onInstaClearDungeonsAndCodex?: () => void;
  onMaxOutAllElementsAndResearch?: () => void;
  onTriggerTheEndDirectly?: () => void;
  onCustomInjectRebirth?: (rebirthCount: number, superRebirthCount: number, rp: number) => void;
  onCustomSetSwordLevelDirect?: (level: number) => void;
}

export const CheatModal: React.FC<CheatModalProps> = ({
  stats,
  onClose,
  onAddResources,
  onSetSwordLevel,
  onAddRebirths,
  onToggleCheatSuccess100,
  onToggleCheatDmg1000x,
  onToggleCheatDmg1M,
  onUnlockAllTiersAndWorlds,
  onForceUnlockAscensionAll,
  onInstaClearDungeonsAndCodex,
  onMaxOutAllElementsAndResearch,
  onTriggerTheEndDirectly,
  onCustomInjectRebirth,
  onCustomSetSwordLevelDirect,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'admin_exclusive' | 'inject' | 'all_clear'>('quick');

  // Custom Input States
  const [customSwordLvl, setCustomSwordLvl] = useState<number>(stats.currentSwordLevel || 0);
  const [customRebirthInput, setCustomRebirthInput] = useState<number>(100);
  const [customSuperRebirthInput, setCustomSuperRebirthInput] = useState<number>(10);
  const [customRpInput, setCustomRpInput] = useState<number>(1000);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 font-pixel animate-fade-in">
      <div className="bg-neutral-900 border-4 border-amber-400 rounded-xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-amber-500/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-rose-600 rounded-lg border-2 border-amber-300 shadow-md">
              <Crown className="w-5 h-5 text-neutral-950 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
                <span>어드민 & 창조주 치트 콘솔</span>
                <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded-full border border-rose-600 font-mono">
                  ADMIN MASTER v1.3
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                환생, 초환생, 어센션 및 차원 강제 잠금 해제와 전지전능한 조작 권한이 부여되었습니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 rounded border border-neutral-700 text-neutral-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2 overflow-x-auto scrollbar-none font-mono text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('quick');
            }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
              activeTab === 'quick'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>즉시 파워 & 재화</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('admin_exclusive');
            }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
              activeTab === 'admin_exclusive'
                ? 'bg-rose-500 text-neutral-950 shadow'
                : 'bg-neutral-950 text-rose-300 hover:text-rose-200 border border-rose-900/60'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>👑 어드민 5대 특권 (어센션 해금)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('inject');
            }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
              activeTab === 'inject'
                ? 'bg-cyan-500 text-neutral-950 shadow'
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>수치 정밀 주입기</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('all_clear');
            }}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
              activeTab === 'all_clear'
                ? 'bg-purple-500 text-neutral-950 shadow'
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>던전·도감·업적 올 클리어</span>
          </button>
        </div>

        {/* TAB 1: Quick Cheats & Buffs */}
        {activeTab === 'quick' && (
          <div className="flex flex-col gap-3">
            {/* Toggle Buffs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 100% Success Toggle */}
              <button
                onClick={() => {
                  sound.playClick();
                  onToggleCheatSuccess100();
                }}
                className={`p-3 rounded-lg border-2 flex items-center justify-between transition-all cursor-pointer ${
                  stats.cheatSuccessRate100
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>강화 성공률 100% (무적)</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">실패·파괴·하락 영구 방지</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-neutral-900 border border-neutral-700">
                  {stats.cheatSuccessRate100 ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* 1,000x / 1,000,000x Damage Multiplier */}
              <button
                onClick={() => {
                  sound.playClick();
                  onToggleCheatDmg1000x();
                }}
                className={`p-3 rounded-lg border-2 flex items-center justify-between transition-all cursor-pointer ${
                  stats.cheatDmg1000x
                    ? 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <PixelIcon name="sword" size={16} />
                    <span>공격력 1,000배 증폭</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">모든 몬스터·보스 즉시 원킬</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-neutral-900 border border-neutral-700">
                  {stats.cheatDmg1000x ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Quick Resource Injectors */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 flex flex-col gap-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>초월급 대량 재화 충전 (Supercharged Resources)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    sound.playCoin();
                    onAddResources(100_000_000_000_000_000, 0, 0, 0, 0); // 10경 (100Qi)
                  }}
                  className="py-2.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/60 rounded text-amber-300 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  +10경 골드 (100Qi)
                </button>

                <button
                  onClick={() => {
                    sound.playCoin();
                    onAddResources(0, 1_000_000, 0, 0, 0);
                  }}
                  className="py-2.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-cyan-500/60 rounded text-cyan-300 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  +100만 다이아
                </button>

                <button
                  onClick={() => {
                    sound.playCoin();
                    onAddResources(0, 0, 1_000_000, 0, 0);
                  }}
                  className="py-2.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-purple-500/60 rounded text-purple-300 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  +100만 강화석
                </button>

                <button
                  onClick={() => {
                    sound.playCoin();
                    onAddResources(0, 0, 0, 9999, 9999, 99999);
                  }}
                  className="py-2.5 px-2 bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/60 rounded text-emerald-300 text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  +9999 보호서 & 비약 & 파편
                </button>
              </div>
            </div>

            {/* Quick Sword Level Presets */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 flex flex-col gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                <Sword className="w-4 h-4" />
                <span>현재 월드 검 즉시 설정 프리셋</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[10, 20, 30, 35].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      sound.playSuccess(true);
                      onSetSwordLevel(lvl);
                    }}
                    className="py-2 bg-neutral-900 hover:bg-neutral-800 border border-indigo-500/50 rounded text-indigo-200 text-xs font-mono font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <PixelIcon name="sword" size={14} />
                    <span>+{lvl}강 {lvl === 35 ? '(MAX)' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 5 Exclusive Admin Super Features */}
        {activeTab === 'admin_exclusive' && (
          <div className="flex flex-col gap-3">
            {/* Feature 1: Force Unlock All Rebirth, Super Rebirth, Ascension & All Worlds/Tiers */}
            <div className="bg-gradient-to-br from-rose-950/40 via-neutral-900 to-amber-950/40 p-4 rounded-xl border-2 border-rose-500/80 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-600 text-neutral-950 font-bold text-[10px] rounded font-mono">
                    FEATURE 1 (필수)
                  </span>
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>환생·초환생·어센션(티어 계단)·10대 월드 강제 전면 해금</span>
                  </h4>
                </div>
                <p className="text-xs text-neutral-300">
                  모든 골드/환생 조건 무시: 환생 100회, 초환생 10회, World 1~10 차원 포탈 및 Tier 1~5 계단 전체를 즉시 활성화합니다.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onForceUnlockAscensionAll) onForceUnlockAscensionAll();
                  else onUnlockAllTiersAndWorlds();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow-lg border border-amber-300 whitespace-nowrap transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>강제 전면 해금 실행</span>
              </button>
            </div>

            {/* Feature 2: Max Out All 5 Elements & Blacksmith Research */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-cyan-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-600 text-neutral-950 font-bold text-[10px] rounded font-mono">
                    FEATURE 2
                  </span>
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-cyan-400" />
                    <span>5대 속성 Lv.100 & 대장간 연구 MAX 마스터</span>
                  </h4>
                </div>
                <p className="text-xs text-neutral-400">
                  불·얼음·번개·신성·암흑 5대 속성 강화 레벨을 Lv.100으로 승급하고, 대장간의 모든 연구를 최대 레벨로 일괄 업그레이드합니다.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onMaxOutAllElementsAndResearch) onMaxOutAllElementsAndResearch();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow border border-cyan-300 whitespace-nowrap transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4" />
                <span>속성·연구 MAX 적용</span>
              </button>
            </div>

            {/* Feature 3: Full Runes Bag (x99 All Runes) */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-purple-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-600 text-neutral-950 font-bold text-[10px] rounded font-mono">
                    FEATURE 3
                  </span>
                  <h4 className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
                    <PixelIcon name="rune" size={16} />
                    <span>모든 룬 x99개 풀팩 & 신화 룬 인벤토리 지급</span>
                  </h4>
                </div>
                <p className="text-xs text-neutral-400">
                  게임 내 존재하는 모든 공격력, 크리티컬, 골드, 강화 확률 룬을 각각 99개씩 인벤토리에 가득 채웁니다.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  // Add all runes x99
                  onAddResources(0, 0, 0, 0, 0); // handled via prop
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow border border-purple-300 whitespace-nowrap transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Wand2 className="w-4 h-4" />
                <span>룬 풀팩 획득</span>
              </button>
            </div>

            {/* Feature 4: Instant Clear All Dungeons & 100% Codex/Achievements */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-600 text-neutral-950 font-bold text-[10px] rounded font-mono">
                    FEATURE 4
                  </span>
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>던전 1~100층 올 클리어 & 도감·업적 100% 완료</span>
                  </h4>
                </div>
                <p className="text-xs text-neutral-400">
                  던전 모든 스테이지를 클리어 처리하고, 0~35강 전설 검 도감과 모든 업적 보상을 일괄 획득합니다.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onInstaClearDungeonsAndCodex) onInstaClearDungeonsAndCodex();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow border border-amber-300 whitespace-nowrap transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>원클릭 100% 정복</span>
              </button>
            </div>

            {/* Feature 5: Direct Trigger THE END Cinematic */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-600 text-neutral-950 font-bold text-[10px] rounded font-mono">
                    FEATURE 5
                  </span>
                  <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-emerald-400" />
                    <span>THE END 시네마틱 진엔딩 즉시 재생</span>
                  </h4>
                </div>
                <p className="text-xs text-neutral-400">
                  티어 계단 5단계 정복 조건 없이 언제든지 세계의 끝 시네마틱 엔딩 연출을 감상합니다.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onTriggerTheEndDirectly) onTriggerTheEndDirectly();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow border border-emerald-300 whitespace-nowrap transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Film className="w-4 h-4" />
                <span>엔딩 시네마틱 실행</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Numerical Precision Injector */}
        {activeTab === 'inject' && (
          <div className="flex flex-col gap-4">
            {/* Custom Sword Level Direct Input */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <h4 className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                <Sword className="w-4 h-4" />
                <span>원하는 검 강화 수치 직접 타이핑 주입 (+0 ~ +35강)</span>
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={customSwordLvl}
                  onChange={(e) => setCustomSwordLvl(Math.max(0, Math.min(35, parseInt(e.target.value) || 0)))}
                  className="w-full sm:w-48 bg-neutral-900 border-2 border-indigo-500/60 rounded px-3 py-2 text-indigo-300 font-mono text-sm font-bold outline-none text-center"
                />
                <button
                  onClick={() => {
                    sound.playSuccess(true);
                    if (onCustomSetSwordLevelDirect) onCustomSetSwordLevelDirect(customSwordLvl);
                    else onSetSwordLevel(customSwordLvl);
                  }}
                  className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded font-mono text-xs cursor-pointer shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>+{customSwordLvl}강으로 즉시 설정</span>
                </button>
              </div>
            </div>

            {/* Custom Rebirth / Super Rebirth / RP Injector */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <h4 className="text-xs sm:text-sm font-bold text-purple-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>환생 / 초환생 / 환생포인트(RP) 수치 직접 주입</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-neutral-400 font-mono">환생 횟수 추가</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={customRebirthInput}
                    onChange={(e) => setCustomRebirthInput(parseInt(e.target.value) || 0)}
                    className="bg-neutral-900 border border-purple-500/60 rounded px-3 py-1.5 text-purple-300 font-mono text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-neutral-400 font-mono">초환생 횟수 추가</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customSuperRebirthInput}
                    onChange={(e) => setCustomSuperRebirthInput(parseInt(e.target.value) || 0)}
                    className="bg-neutral-900 border border-purple-500/60 rounded px-3 py-1.5 text-purple-300 font-mono text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-neutral-400 font-mono">환생 포인트 (RP) 추가</label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={customRpInput}
                    onChange={(e) => setCustomRpInput(parseInt(e.target.value) || 0)}
                    className="bg-neutral-900 border border-purple-500/60 rounded px-3 py-1.5 text-purple-300 font-mono text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onCustomInjectRebirth) {
                    onCustomInjectRebirth(customRebirthInput, customSuperRebirthInput, customRpInput);
                  } else {
                    onAddRebirths(customRebirthInput, customSuperRebirthInput, customRpInput);
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg font-mono text-xs cursor-pointer shadow mt-1 flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>입력한 환생 스탯 즉시 주입 적용</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: All Clear & Complete */}
        {activeTab === 'all_clear' && (
          <div className="flex flex-col gap-3">
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4" />
                <span>게임 데이터 일괄 마스터 완료</span>
              </h4>
              <p className="text-xs text-neutral-400">
                던전 100층 돌파, 35개 모든 검 도감 해금, 14개 전체 업적 보상 수령을 단 한 번의 클릭으로 완료합니다.
              </p>

              <button
                onClick={() => {
                  sound.playSuccess(true);
                  if (onInstaClearDungeonsAndCodex) onInstaClearDungeonsAndCodex();
                }}
                className="mt-2 py-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-neutral-950 font-bold rounded-lg font-mono text-xs cursor-pointer shadow border border-amber-300 flex items-center justify-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>전체 도감 & 던전 & 업적 100% 완성하기</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-[11px] font-mono text-neutral-400">
          <span>어드민 권한: <strong className="text-emerald-400">ACTIVE (승인됨)</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-mono text-xs cursor-pointer border border-neutral-600"
          >
            콘솔 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
