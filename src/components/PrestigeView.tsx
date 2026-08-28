import React, { useState } from 'react';
import { Sparkles, RefreshCw, Zap, Globe, Shield, Lock, CheckCircle2, ArrowRight, Layers, Trophy } from 'lucide-react';
import { PlayerStats, StoredSword, Sword } from '../types';
import { WORLDS_DATA } from '../data/worlds';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';
import { calculateTotalMultipliers, getWorldSword } from '../utils/worldSwordHelper';

interface PrestigeViewProps {
  stats: PlayerStats;
  currentSword: Sword;
  onRebirth: () => void;
  onSuperRebirth: () => void;
  onUpgradeRebirthStat: (statKey: string, cost: number) => void;
  onMultiRebirthWithRP?: (count: number) => void;
  onSwitchWorld: (worldId: number) => void;
  onStoreSwordInVault: (sword: Sword) => void;
  onRemoveSwordFromVault: (id: string) => void;
}

export const PrestigeView: React.FC<PrestigeViewProps> = ({
  stats,
  currentSword,
  onRebirth,
  onSuperRebirth,
  onUpgradeRebirthStat,
  onMultiRebirthWithRP,
  onSwitchWorld,
  onStoreSwordInVault,
  onRemoveSwordFromVault,
}) => {
  const [subTab, setSubTab] = useState<'rebirth' | 'super_rebirth' | 'vault'>('rebirth');
  const [confirmRebirth, setConfirmRebirth] = useState(false);
  const [confirmSuperRebirth, setConfirmSuperRebirth] = useState(false);

  const multipliers = calculateTotalMultipliers(stats);

  const canRebirth = stats.gold >= 100000;
  const canSuperRebirth = stats.rebirthCount >= 100;

  // Vault Capacity: 3 slots base + 2 per super rebirth
  const vaultMaxSlots = 3 + (stats.superRebirthCount || 0) * 2;
  const isVaultUnlocked = stats.rebirthCount >= 10 || stats.superRebirthCount > 0;

  // Rebirth Stats definitions
  const rebirthStatList = [
    {
      id: 'atk_mult',
      name: '태초의 무력 (ATK Boost)',
      description: '모든 월드 영구 공격력 +30% 증가',
      currentLvl: stats.rebirthStats?.['atk_mult'] || 0,
      cost: ((stats.rebirthStats?.['atk_mult'] || 0) + 1) * 2,
      effectDisplay: `+${((stats.rebirthStats?.['atk_mult'] || 0) * 30)}%`,
    },
    {
      id: 'gold_mult',
      name: '황금의 축복 (Gold Boost)',
      description: '모든 월드 골드 획득량 +50% 증가',
      currentLvl: stats.rebirthStats?.['gold_mult'] || 0,
      cost: ((stats.rebirthStats?.['gold_mult'] || 0) + 1) * 2,
      effectDisplay: `+${((stats.rebirthStats?.['gold_mult'] || 0) * 50)}%`,
    },
    {
      id: 'enhance_rate',
      name: '대장장이의 신기 (Forge Luck)',
      description: '기본 강화 성공 확률 +0.5% (최대 +10%)',
      currentLvl: stats.rebirthStats?.['enhance_rate'] || 0,
      cost: ((stats.rebirthStats?.['enhance_rate'] || 0) + 1) * 3,
      effectDisplay: `+${Math.min(10, (stats.rebirthStats?.['enhance_rate'] || 0) * 0.5)}%`,
      maxLvl: 20,
    },
    {
      id: 'stone_drop',
      name: '강화석 채굴 마스터 (Stone Miner)',
      description: '몬스터 처치 시 강화석 드랍량 +25% 증가',
      currentLvl: stats.rebirthStats?.['stone_drop'] || 0,
      cost: ((stats.rebirthStats?.['stone_drop'] || 0) + 1) * 2,
      effectDisplay: `+${((stats.rebirthStats?.['stone_drop'] || 0) * 25)}%`,
    },
    {
      id: 'crit_rate',
      name: '예리한 칼날 (Crit Master)',
      description: '영구 치명타 확률 +1% & 피해량 +20%',
      currentLvl: stats.rebirthStats?.['crit_rate'] || 0,
      cost: ((stats.rebirthStats?.['crit_rate'] || 0) + 1) * 3,
      effectDisplay: `+${((stats.rebirthStats?.['crit_rate'] || 0) * 1)}% / +${((stats.rebirthStats?.['crit_rate'] || 0) * 20)}%`,
      maxLvl: 15,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 flex flex-col gap-4 font-pixel">
      {/* Top Banner */}
      <div className="bg-neutral-900 border-4 border-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-950 rounded-lg border-2 border-purple-500/60 shadow">
            <PixelIcon name="anvil" size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
              <span>환생 및 차원 전이소 (Prestige & Multi-World)</span>
            </h2>
            <p className="text-xs text-neutral-400 font-mono">
              영혼을 정제하여 영구 배수를 획득하고 새로운 10대 차원 월드로 전이하세요.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-neutral-950 px-3 py-1.5 rounded border border-amber-600/60 flex items-center gap-1.5">
            <span className="text-neutral-400">일반 환생:</span>
            <span className="text-amber-300 font-bold">{stats.rebirthCount}회</span>
          </div>
          <div className="bg-neutral-950 px-3 py-1.5 rounded border border-purple-600/60 flex items-center gap-1.5">
            <span className="text-neutral-400">초환생:</span>
            <span className="text-purple-300 font-bold">{stats.superRebirthCount}회</span>
          </div>
          {stats.rebirthCount >= 10 && (
            <div className="bg-neutral-950 px-3 py-1.5 rounded border border-cyan-600/60 flex items-center gap-1.5">
              <span className="text-neutral-400">환생 포인트(RP):</span>
              <span className="text-cyan-300 font-bold">{stats.rebirthPoints} P</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 border-b-2 border-neutral-800 pb-2">
        <button
          onClick={() => {
            sound.playClick();
            setSubTab('rebirth');
          }}
          className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            subTab === 'rebirth'
              ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <PixelIcon name="gold" size={16} />
          <span>일반 환생 (Rebirth)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setSubTab('super_rebirth');
          }}
          className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            subTab === 'super_rebirth'
              ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <PixelIcon name="rune" size={16} />
          <span>초환생 & 10대 월드 (Super Rebirth)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setSubTab('vault');
          }}
          className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 border transition-all cursor-pointer ${
            subTab === 'vault'
              ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <PixelIcon name="sword" size={16} />
          <span>검 보관함 ({stats.swordVault?.length || 0}/{vaultMaxSlots})</span>
          {!isVaultUnlocked && <Lock className="w-3.5 h-3.5 text-neutral-500 ml-1" />}
        </button>
      </div>

      {/* TAB 1: REBIRTH & REBIRTH STATS */}
      {subTab === 'rebirth' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Rebirth Action Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-4 shadow">
              <h3 className="text-sm font-bold text-amber-300 border-b border-neutral-800 pb-2 flex items-center gap-2">
                <PixelIcon name="gold" size={16} />
                <span>일반 환생 진행 (Rebirth)</span>
              </h3>

              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">환생 조건:</span>
                  <span className={canRebirth ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    100,000 G 필요 (현재: {stats.gold.toLocaleString()} G)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">환생 보상:</span>
                  <span className="text-amber-300 font-bold">골드 획득 배수 +100% 영구 누적</span>
                </div>
                {stats.rebirthCount >= 9 && (
                  <div className="flex items-center justify-between text-cyan-300">
                    <span>환생 포인트 지급:</span>
                    <span className="font-bold">+{Math.max(1, Math.floor(Math.log10(Math.max(1, stats.gold / 10000)))) + 1} RP</span>
                  </div>
                )}
              </div>

              {/* Reset Notice */}
              <div className="bg-amber-950/30 border border-amber-800/80 p-3 rounded-lg flex flex-col gap-1.5 text-[11px] text-amber-200/90 leading-relaxed font-sans">
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  [환생 시 보존 및 초기화 안내]
                </span>
                <p>• <strong>안전 보존</strong>: 파괴 방지 주문서, 행운의 비약, 강화석, 룬, 도감, 업적, 환생/초환생 수치</p>
                <p>• <strong>초기화 대상</strong>: 현재 골드, 현재 월드의 검 강화 수치(+0으로 초기화), 던전 진행도, 대장간 연구</p>
              </div>

              {/* Action Button */}
              {!confirmRebirth ? (
                <button
                  onClick={() => {
                    if (!canRebirth) {
                      sound.playFail();
                      return;
                    }
                    sound.playClick();
                    setConfirmRebirth(true);
                  }}
                  disabled={!canRebirth}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 font-bold rounded-lg border-2 border-amber-400 text-sm shadow cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>환생 실행하기 ({stats.rebirthCount}회 → {stats.rebirthCount + 1}회)</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2 bg-neutral-950 p-3 rounded-lg border border-amber-500">
                  <span className="text-xs text-amber-300 font-bold text-center">
                    정말 환생하시겠습니까? (골드와 검 레벨이 초기화됩니다)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onRebirth();
                        setConfirmRebirth(false);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold text-xs rounded border border-emerald-300 cursor-pointer"
                    >
                      확인 (환생 진행)
                    </button>
                    <button
                      onClick={() => setConfirmRebirth(false)}
                      className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded border border-neutral-600 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rebirth Stat Upgrades (RP) Card */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 flex flex-col gap-3 shadow">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>환생 스탯 연구소 (Rebirth Points Stats)</span>
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {stats.rebirthCount >= 10 ? `보유 RP: ${stats.rebirthPoints} P` : '환생 10회 달성 시 해금'}
                </span>
              </div>

              {stats.rebirthCount < 10 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-neutral-500">
                  <Lock className="w-8 h-8 text-neutral-600" />
                  <p className="text-xs font-mono">
                    일반 환생을 <strong>10회</strong> 이상 달성하면 환생 포인트를 획득하고<br />
                    영구 스탯 강화 및 <strong>RP 즉시 다중 환생</strong> 기능이 개방됩니다. (현재: {stats.rebirthCount}/10회)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* RP Instant Multi-Rebirth Panel */}
                  <div className="bg-gradient-to-r from-cyan-950/60 via-indigo-950/40 to-neutral-950 border-2 border-cyan-500/80 rounded-lg p-3.5 flex flex-col gap-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-cyan-300">
                            환생 포인트(RP)로 즉시 다중 환생 (Multi-Rebirth)
                          </h4>
                          <p className="text-[11px] text-neutral-300 font-sans">
                            골드/검 레벨 <strong>리셋 없이</strong> 보유 RP를 소모하여 환생 횟수와 골드 배수를 대량으로 즉시 축적합니다!
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-700">
                        보유 {stats.rebirthPoints} RP
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      <button
                        onClick={() => {
                          if (stats.rebirthPoints < 1) {
                            sound.playFail();
                            return;
                          }
                          sound.playSuccess(true);
                          onMultiRebirthWithRP?.(1);
                        }}
                        disabled={stats.rebirthPoints < 1}
                        className="py-2 px-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-neutral-950 font-bold rounded text-xs font-mono border border-cyan-300 shadow cursor-pointer transition-all active:scale-95 text-center"
                      >
                        +1회 (1 RP)
                      </button>

                      <button
                        onClick={() => {
                          if (stats.rebirthPoints < 10) {
                            sound.playFail();
                            return;
                          }
                          sound.playSuccess(true);
                          onMultiRebirthWithRP?.(10);
                        }}
                        disabled={stats.rebirthPoints < 10}
                        className="py-2 px-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold rounded text-xs font-mono border border-indigo-400 shadow cursor-pointer transition-all active:scale-95 text-center"
                      >
                        +10회 (10 RP)
                      </button>

                      <button
                        onClick={() => {
                          if (stats.rebirthPoints < 50) {
                            sound.playFail();
                            return;
                          }
                          sound.playSuccess(true);
                          onMultiRebirthWithRP?.(50);
                        }}
                        disabled={stats.rebirthPoints < 50}
                        className="py-2 px-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold rounded text-xs font-mono border border-purple-400 shadow cursor-pointer transition-all active:scale-95 text-center"
                      >
                        +50회 (50 RP)
                      </button>

                      <button
                        onClick={() => {
                          if (stats.rebirthPoints < 100) {
                            sound.playFail();
                            return;
                          }
                          sound.playSuccess(true);
                          onMultiRebirthWithRP?.(100);
                        }}
                        disabled={stats.rebirthPoints < 100}
                        className="py-2 px-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-neutral-950 font-bold rounded text-xs font-mono border border-amber-300 shadow cursor-pointer transition-all active:scale-95 text-center"
                      >
                        +100회 (100 RP)
                      </button>

                      <button
                        onClick={() => {
                          if (stats.rebirthPoints <= 0) {
                            sound.playFail();
                            return;
                          }
                          sound.playSuccess(true);
                          onMultiRebirthWithRP?.(stats.rebirthPoints);
                        }}
                        disabled={stats.rebirthPoints <= 0}
                        className="col-span-2 sm:col-span-1 py-2 px-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 text-neutral-950 font-bold rounded text-xs font-mono border border-emerald-200 shadow cursor-pointer transition-all active:scale-95 text-center animate-pulse"
                      >
                        MAX (전부 환생)
                      </button>
                    </div>
                  </div>

                  {/* Rebirth Stat List */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-neutral-300">영구 스탯 강화 항목:</span>
                    {rebirthStatList.map((stat) => {
                    const isMax = stat.maxLvl && stat.currentLvl >= stat.maxLvl;
                    const canAfford = stats.rebirthPoints >= stat.cost;

                    return (
                      <div
                        key={stat.id}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-neutral-100">{stat.name}</span>
                            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                              Lv.{stat.currentLvl} {isMax ? '(최대)' : ''}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-sans">{stat.description}</span>
                          <span className="text-[11px] text-cyan-400 font-mono">현재 효과: {stat.effectDisplay}</span>
                        </div>

                        <button
                          onClick={() => {
                            if (isMax || !canAfford) {
                              sound.playFail();
                              return;
                            }
                            sound.playSuccess();
                            onUpgradeRebirthStat(stat.id, stat.cost);
                          }}
                          disabled={isMax || !canAfford}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-neutral-950 font-bold rounded text-xs font-mono border border-cyan-300 shadow cursor-pointer whitespace-nowrap"
                        >
                          {isMax ? '최고 레벨' : `${stat.cost} RP 강화`}
                        </button>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPER REBIRTH & 10 WORLDS */}
      {subTab === 'super_rebirth' && (
        <div className="flex flex-col gap-4">
          {/* Super Rebirth Header Card */}
          <div className="bg-neutral-900 border-2 border-purple-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm sm:text-base font-bold text-purple-300 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <span>초환생 (Super Rebirth) — 차원의 문 개방</span>
              </h3>
              <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                일반 환생 100회 달성 시 가능! 초환생 1회당 전 스탯 x3배 & 골드 x5배 폭증 및 상위 월드(World 1~10) 접근 권한 부여!
              </p>
            </div>

            {/* Super Rebirth Button */}
            {!confirmSuperRebirth ? (
              <button
                onClick={() => {
                  if (!canSuperRebirth) {
                    sound.playFail();
                    return;
                  }
                  sound.playClick();
                  setConfirmSuperRebirth(true);
                }}
                disabled={!canSuperRebirth}
                className="py-3 px-5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-lg border-2 border-purple-300 text-xs sm:text-sm shadow-lg cursor-pointer whitespace-nowrap"
              >
                초환생 실행 ({stats.rebirthCount}/100 환생)
              </button>
            ) : (
              <div className="flex flex-col gap-2 bg-neutral-950 p-3 rounded-lg border border-purple-500">
                <span className="text-xs text-purple-300 font-bold text-center">
                  초환생 시 일반 환생 횟수가 0으로 리셋되며 차원 포탈이 열립니다.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSuperRebirth();
                      setConfirmSuperRebirth(false);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded border border-purple-300 cursor-pointer"
                  >
                    확인 (초환생)
                  </button>
                  <button
                    onClick={() => setConfirmSuperRebirth(false)}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded border border-neutral-600 cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 10 Multi-World Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {WORLDS_DATA.map((world) => {
              const isUnlocked = stats.superRebirthCount >= world.requiredSuperRebirth;
              const isCurrentWorld = stats.currentWorldId === world.id;
              const worldSavedProgress = stats.worldProgress?.[world.id] || { currentSwordLevel: 0, maxSwordLevelReached: 0 };

              return (
                <div
                  key={world.id}
                  style={{ borderColor: isCurrentWorld ? world.color : undefined }}
                  className={`bg-neutral-900 border-2 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow transition-all ${
                    isCurrentWorld
                      ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-gradient-to-b from-neutral-900 to-neutral-950'
                      : isUnlocked
                      ? 'border-neutral-700 hover:border-neutral-500'
                      : 'border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    {/* World Header */}
                    <div className="flex items-center justify-between">
                      <span
                        style={{ color: world.color }}
                        className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800"
                      >
                        World {world.id}
                      </span>
                      {isCurrentWorld ? (
                        <span className="text-[10px] bg-amber-500 text-neutral-950 font-bold px-1.5 py-0.5 rounded font-mono">
                          현재 월드
                        </span>
                      ) : isUnlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          초환생 {world.requiredSuperRebirth}회 필요
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-neutral-100">{world.name}</h4>
                    <span className="text-[10px] text-neutral-400 font-mono">{world.subTitle}</span>
                    <p className="text-[10px] text-neutral-300 font-sans leading-tight mt-1">{world.description}</p>
                  </div>

                  {/* World Progress Summary */}
                  <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex flex-col gap-1 text-[10px] font-mono">
                    <div className="flex justify-between text-neutral-400">
                      <span>검 강화도:</span>
                      <span className="text-amber-300 font-bold">+{worldSavedProgress.currentSwordLevel} 강</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>기본 배수:</span>
                      <span className="text-emerald-300 font-bold">x{world.baseMultiplier.toLocaleString()}배</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {isCurrentWorld ? (
                    <div className="py-2 text-center text-xs font-bold text-amber-300 bg-amber-950/40 rounded border border-amber-600/60 font-mono">
                      탐험 중인 차원
                    </div>
                  ) : isUnlocked ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSwitchWorld(world.id);
                      }}
                      className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-neutral-100 rounded text-xs font-bold font-mono border border-neutral-600 shadow cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>이 차원으로 이동</span>
                    </button>
                  ) : (
                    <div className="py-2 text-center text-xs text-neutral-500 bg-neutral-950 rounded border border-neutral-800 font-mono flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>잠김 (초환생 {world.requiredSuperRebirth}회)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SWORD VAULT */}
      {subTab === 'vault' && (
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-900 border-2 border-cyan-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <PixelIcon name="sword" size={20} />
                <span>검 보관함 (Sword Vault) — 전 차원 공용 버프</span>
              </h3>
              <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                환생 10회 이상 시 해금! 보관함에 저장된 각 월드의 명검들은 모든 차원에서 영구 패시브 공격력과 골드 배수를 제공합니다.
              </p>
            </div>

            {/* Store Current Sword Button */}
            {isVaultUnlocked && (
              <button
                onClick={() => {
                  if ((stats.swordVault?.length || 0) >= vaultMaxSlots) {
                    sound.playFail();
                    return;
                  }
                  sound.playSuccess();
                  onStoreSwordInVault(currentSword);
                }}
                disabled={(stats.swordVault?.length || 0) >= vaultMaxSlots}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-neutral-950 font-bold rounded-lg border border-cyan-300 text-xs font-mono shadow cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <PixelIcon name="sword" size={14} />
                <span>현재 장착 검 보관함에 복사 등록 (+{currentSword.level})</span>
              </button>
            )}
          </div>

          {!isVaultUnlocked ? (
            <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-12 flex flex-col items-center justify-center gap-3 text-center text-neutral-500">
              <Lock className="w-10 h-10 text-neutral-600" />
              <h4 className="font-bold text-sm text-neutral-300">검 보관함 잠김</h4>
              <p className="text-xs font-mono">
                일반 환생을 <strong>10회</strong> 이상 진행하면 검 보관함이 개방됩니다.<br />
                초환생을 1회 진행할 때마다 보관함 슬롯이 2칸씩 추가 확장됩니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(stats.swordVault || []).map((sv) => (
                <div
                  key={sv.id}
                  className="bg-neutral-900 border-2 border-cyan-900/60 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow hover:border-cyan-500 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-neutral-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                        World {sv.worldId}
                      </span>
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        +{sv.level} 강
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                        <PixelIcon name="sword" size={24} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100">{sv.name}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">{sv.rarity} 등급</span>
                      </div>
                    </div>

                    <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex flex-col gap-0.5 text-[11px] font-mono text-cyan-300">
                      <div>전 차원 공격력: +{sv.atkBonus}%</div>
                      <div>전 차원 골드 보너스: +{sv.goldBonus}%</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      onRemoveSwordFromVault(sv.id);
                    }}
                    className="w-full py-1.5 bg-neutral-950 hover:bg-rose-950 text-rose-300 rounded text-[11px] font-mono border border-rose-800/60 cursor-pointer"
                  >
                    보관함에서 회수/삭제
                  </button>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, vaultMaxSlots - (stats.swordVault?.length || 0)) }).map((_, idx) => (
                <div
                  key={`empty_${idx}`}
                  className="bg-neutral-950/40 border-2 border-dashed border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center text-neutral-600"
                >
                  <PixelIcon name="sword" size={20} className="opacity-30" />
                  <span className="text-xs font-mono">빈 보관 슬롯 #{ (stats.swordVault?.length || 0) + idx + 1 }</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
