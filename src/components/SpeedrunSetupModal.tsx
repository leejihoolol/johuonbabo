import React, { useState, useEffect } from 'react';
import {
  Timer,
  Trophy,
  Zap,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  Flame,
  Award,
  Crown,
  Share2,
  Trash2,
  AlertTriangle,
  History,
} from 'lucide-react';
import { SpeedrunGoal, SpeedrunRecord, PlayerStats } from '../types';
import { sound } from '../utils/sound';

interface SpeedrunSetupModalProps {
  stats: PlayerStats;
  onStartSpeedrun: (goal: SpeedrunGoal, mode: 'clean' | 'continuous') => void;
  onClose: () => void;
}

const STORAGE_SPEEDRUN_RECORDS_KEY = 'PIXEL_SWORD_SPEEDRUN_RECORDS';

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  goal: SpeedrunGoal;
}

const SPEEDRUN_PRESETS: PresetItem[] = [
  {
    id: 'zero_rebirth_20',
    name: '⚡ 0환생 +20강 런',
    desc: '환생 없이 오직 1회차 안에서 +20강 검을 달성하는 클래식 스피드런',
    icon: '🗡️',
    color: 'from-amber-600 to-yellow-600',
    goal: {
      presetName: '0환생 +20강',
      targetRebirths: null,
      targetSuperRebirths: null,
      targetTier: null,
      targetEnding: false,
      targetSwordLevel: 20,
    },
  },
  {
    id: 'first_rebirth',
    name: '🚀 1회 환생 런 (Any%)',
    desc: '10만 골드를 모아 가장 빠른 시간 안에 첫 환생에 도달하는 모드',
    icon: '🌀',
    color: 'from-cyan-600 to-blue-600',
    goal: {
      presetName: '1회 환생 (Any%)',
      targetRebirths: 1,
      targetSuperRebirths: null,
      targetTier: null,
      targetEnding: false,
      targetSwordLevel: null,
    },
  },
  {
    id: 'first_super_rebirth',
    name: '👑 1회 초환생 런',
    desc: '환생 100회를 돌파하여 초환생을 달성하는 심화 스피드런',
    icon: '👑',
    color: 'from-purple-600 to-pink-600',
    goal: {
      presetName: '1회 초환생',
      targetRebirths: null,
      targetSuperRebirths: 1,
      targetTier: null,
      targetEnding: false,
      targetSwordLevel: null,
    },
  },
  {
    id: 'tier_1_conquest',
    name: '🪜 티어 1 계단 런',
    desc: '초환생 10회 및 월드 1 20강을 달성하여 첫 티어 계단을 정복하는 런',
    icon: '🏛️',
    color: 'from-indigo-600 to-purple-600',
    goal: {
      presetName: '티어 1 계단',
      targetRebirths: null,
      targetSuperRebirths: null,
      targetTier: 1,
      targetEnding: false,
      targetSwordLevel: null,
    },
  },
  {
    id: 'tier_5_conquest',
    name: '🏆 티어 5 궁극 계단 런',
    desc: '모든 티어 계단 5단계를 완벽하게 정복하는 마스터 스피드런',
    icon: '🔱',
    color: 'from-rose-600 to-amber-600',
    goal: {
      presetName: '티어 5 궁극 계단',
      targetRebirths: null,
      targetSuperRebirths: null,
      targetTier: 5,
      targetEnding: false,
      targetSwordLevel: null,
    },
  },
  {
    id: 'the_end_run',
    name: '🌟 THE END 진 엔딩 런 (100%)',
    desc: '세계의 끝에 도달하여 진 엔딩을 맞이하는 궁극의 100% 클리어 런',
    icon: '🌌',
    color: 'from-amber-400 via-rose-500 to-purple-600',
    goal: {
      presetName: 'THE END 진 엔딩',
      targetRebirths: null,
      targetSuperRebirths: null,
      targetTier: null,
      targetEnding: true,
      targetSwordLevel: null,
    },
  },
];

export const SpeedrunSetupModal: React.FC<SpeedrunSetupModalProps> = ({
  stats,
  onStartSpeedrun,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'records'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('zero_rebirth_20');

  // Custom Goal Form States
  const [enableRebirthGoal, setEnableRebirthGoal] = useState<boolean>(true);
  const [targetRebirths, setTargetRebirths] = useState<number>(0);

  const [enableSuperRebirthGoal, setEnableSuperRebirthGoal] = useState<boolean>(false);
  const [targetSuperRebirths, setTargetSuperRebirths] = useState<number>(0);

  const [enableTierGoal, setEnableTierGoal] = useState<boolean>(false);
  const [targetTier, setTargetTier] = useState<number>(1);

  const [enableEndingGoal, setEnableEndingGoal] = useState<boolean>(false);

  const [enableSwordLevelGoal, setEnableSwordLevelGoal] = useState<boolean>(true);
  const [targetSwordLevel, setTargetSwordLevel] = useState<number>(20);

  const [records, setRecords] = useState<SpeedrunRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Saved Records
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SPEEDRUN_RECORDS_KEY);
      if (saved) {
        setRecords(JSON.parse(saved));
      }
    } catch {
      // Ignored
    }
  }, []);

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm('이 스피드런 기록을 삭제하시겠습니까?')) return;
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem(STORAGE_SPEEDRUN_RECORDS_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
    sound.playClick();
  };

  const handleCopyRecord = (rec: SpeedrunRecord) => {
    const text = `🏆 [픽셀 검 강화하기] 스피드런 달성!\n🎯 목표: ${rec.title}\n⏱️ 클리어 타임: ${rec.timeFormatted}\n🔨 강화 시도: ${rec.enhanceAttempts}회\n🗡️ 최종 검: +${rec.finalSwordLevel}강\n모드: ${rec.startMode === 'clean' ? '공식 클린 런' : '컨티뉴 챌린지'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(rec.id);
    sound.playCoin();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Build Final Goal based on active tab
  const getSelectedGoal = (): SpeedrunGoal => {
    if (activeTab === 'presets') {
      const preset = SPEEDRUN_PRESETS.find((p) => p.id === selectedPresetId);
      return preset ? preset.goal : SPEEDRUN_PRESETS[0].goal;
    }

    // Custom Goal
    return {
      presetName: '사용자 커스텀',
      targetRebirths: enableRebirthGoal ? targetRebirths : null,
      targetSuperRebirths: enableSuperRebirthGoal ? targetSuperRebirths : null,
      targetTier: enableTierGoal ? targetTier : null,
      targetEnding: enableEndingGoal,
      targetSwordLevel: enableSwordLevelGoal ? targetSwordLevel : null,
    };
  };

  const handleLaunch = (mode: 'clean' | 'continuous') => {
    const goal = getSelectedGoal();

    // Validation: at least one goal condition must be active!
    const hasAnyGoal =
      goal.targetRebirths !== null ||
      goal.targetSuperRebirths !== null ||
      goal.targetTier !== null ||
      goal.targetEnding ||
      goal.targetSwordLevel !== null;

    if (!hasAnyGoal) {
      alert('적어도 하나 이상의 클리어 목표(환생, 초환생, 티어, 엔딩, 검 강화)를 설정해야 합니다!');
      return;
    }

    sound.playSuccess(true);
    onStartSpeedrun(goal, mode);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 font-pixel overflow-y-auto">
      <div className="bg-neutral-900 border-4 border-amber-500 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-neutral-900 to-purple-950 px-4 sm:px-6 py-3 border-b-2 border-amber-500/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-950 rounded-lg border-2 border-amber-400">
              <Timer className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
                <span>스피드런 모드 (Speedrun Challenge)</span>
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                자유로운 목표를 설정하고 가장 빠른 클리어 타임에 도전하세요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-neutral-800 bg-neutral-950 text-xs font-mono">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('presets');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-300 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>추천 프리셋 (Presets)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('custom');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === 'custom'
                ? 'border-amber-400 text-amber-300 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>커스텀 목표 설정</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('records');
            }}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all border-b-2 ${
              activeTab === 'records'
                ? 'border-amber-400 text-amber-300 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>명예의 전당 ({records.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs font-mono">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-3">
              <span className="text-neutral-300 text-xs">도전할 추천 스피드런 카테고리를 선택하세요:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SPEEDRUN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedPresetId(preset.id);
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex flex-col gap-1.5 relative ${
                        isSelected
                          ? 'border-amber-400 bg-neutral-800/90 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-[1.02]'
                          : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100 flex items-center gap-1.5">
                          <span>{preset.icon}</span>
                          <span>{preset.name}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">{preset.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM GOALS */}
          {activeTab === 'custom' && (
            <div className="flex flex-col gap-4">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  환생/초환생 횟수(0개 가능), 티어 계단, 엔딩 등 원하는 조건을 조합하여 나만의 스피드런 룰을 만드세요.
                  선택한 모든 목표를 달성하는 순간 타이머가 자동으로 정지합니다.
                </span>
              </div>

              {/* Goal 1: Rebirth Count (환생) */}
              <div className="bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableRebirthGoal}
                      onChange={(e) => setEnableRebirthGoal(e.target.checked)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-neutral-200">🌀 환생 횟수 목표 (0회 가능)</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">0회 = 환생 없이 클리어</span>
                </div>

                {enableRebirthGoal && (
                  <div className="flex items-center gap-2 pl-6 pt-1">
                    <span className="text-neutral-400">목표 환생 횟수:</span>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={targetRebirths}
                      onChange={(e) => setTargetRebirths(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 bg-neutral-900 border border-amber-500/60 rounded px-2 py-1 text-amber-300 font-bold font-mono text-center"
                    />
                    <span className="text-neutral-300 font-bold">회 달성</span>
                    <div className="flex gap-1 ml-auto">
                      {[0, 1, 5, 10, 50, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetRebirths(val)}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            targetRebirths === val
                              ? 'bg-amber-500 text-neutral-950 border-amber-300 font-bold'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                        >
                          {val}회
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Goal 2: Super Rebirth Count (초환생) */}
              <div className="bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableSuperRebirthGoal}
                      onChange={(e) => setEnableSuperRebirthGoal(e.target.checked)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-neutral-200">👑 초환생 횟수 목표 (0회 가능)</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">100회 환생 후 가능</span>
                </div>

                {enableSuperRebirthGoal && (
                  <div className="flex items-center gap-2 pl-6 pt-1">
                    <span className="text-neutral-400">목표 초환생 횟수:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={targetSuperRebirths}
                      onChange={(e) => setTargetSuperRebirths(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 bg-neutral-900 border border-purple-500/60 rounded px-2 py-1 text-purple-300 font-bold font-mono text-center"
                    />
                    <span className="text-neutral-300 font-bold">회 달성</span>
                    <div className="flex gap-1 ml-auto">
                      {[0, 1, 2, 5, 10].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetSuperRebirths(val)}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            targetSuperRebirths === val
                              ? 'bg-purple-500 text-neutral-950 border-purple-300 font-bold'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                        >
                          {val}회
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Goal 3: Tier Staircase (티어 계단) */}
              <div className="bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableTierGoal}
                      onChange={(e) => setEnableTierGoal(e.target.checked)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-neutral-200">🪜 티어 계단 정복 목표 (T1 ~ T5)</span>
                  </label>
                </div>

                {enableTierGoal && (
                  <div className="flex items-center gap-2 pl-6 pt-1 flex-wrap">
                    <span className="text-neutral-400">목표 계단:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setTargetTier(tier)}
                          className={`px-3 py-1 rounded border text-xs font-bold ${
                            targetTier === tier
                              ? 'bg-amber-500 text-neutral-950 border-amber-300'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                        >
                          T{tier} 정복
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Goal 4: True Ending (진 엔딩 THE END) */}
              <div className="bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableEndingGoal}
                    onChange={(e) => setEnableEndingGoal(e.target.checked)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <span className="font-bold text-amber-300">🌟 THE END 진 엔딩 클리어</span>
                </label>
                <span className="text-[10px] text-neutral-400">계단 5단계 후 엔딩 트리거</span>
              </div>

              {/* Goal 5: Sword Level (검 강화) */}
              <div className="bg-neutral-950/90 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableSwordLevelGoal}
                      onChange={(e) => setEnableSwordLevelGoal(e.target.checked)}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span className="font-bold text-neutral-200">🗡️ 검 강화 레벨 목표</span>
                  </label>
                </div>

                {enableSwordLevelGoal && (
                  <div className="flex items-center gap-2 pl-6 pt-1">
                    <span className="text-neutral-400">목표 검 레벨:</span>
                    <input
                      type="number"
                      min="1"
                      max="35"
                      value={targetSwordLevel}
                      onChange={(e) => setTargetSwordLevel(Math.min(35, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-24 bg-neutral-900 border border-emerald-500/60 rounded px-2 py-1 text-emerald-300 font-bold font-mono text-center"
                    />
                    <span className="text-neutral-300 font-bold">강 달성</span>
                    <div className="flex gap-1 ml-auto">
                      {[10, 15, 20, 25, 30, 35].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setTargetSwordLevel(val)}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            targetSwordLevel === val
                              ? 'bg-emerald-500 text-neutral-950 border-emerald-300 font-bold'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                        >
                          +{val}강
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RECORDS (HALL OF FAME) */}
          {activeTab === 'records' && (
            <div className="flex flex-col gap-3">
              {records.length === 0 ? (
                <div className="bg-neutral-950 p-8 rounded-lg border border-neutral-800 text-center flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <History className="w-8 h-8 text-neutral-600" />
                  <p className="text-sm font-bold text-neutral-300">아직 저장된 스피드런 기록이 없습니다.</p>
                  <p className="text-xs text-neutral-500">목표를 설정하고 스피드런을 완료하여 명예의 전당에 첫 기록을 남기세요!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {records.map((rec, index) => (
                    <div
                      key={rec.id}
                      className="bg-neutral-950 p-3.5 rounded-lg border-2 border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-950 rounded-lg border border-amber-400 text-amber-300 font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-100 text-sm">{rec.title}</span>
                            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">
                              {rec.startMode === 'clean' ? '공식 클린 런' : '이어하기'}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 flex gap-2">
                            <span>🔨 시도: {rec.enhanceAttempts}회</span>
                            <span>🗡️ 최종: +{rec.finalSwordLevel}강</span>
                            <span>📅 {new Date(rec.clearedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        <div className="bg-neutral-900 px-3 py-1 rounded border border-amber-400/70 text-amber-300 font-bold text-base tracking-widest font-mono">
                          {rec.timeFormatted}
                        </div>
                        <button
                          onClick={() => handleCopyRecord(rec)}
                          title="기록 텍스트 복사"
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-600 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          title="기록 삭제"
                          className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded border border-rose-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Launch Buttons */}
        {activeTab !== 'records' && (
          <div className="bg-neutral-950 px-4 sm:px-6 py-3 border-t-2 border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>클린 런 시작 시 현재 세이브는 안전하게 자동 백업됩니다.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleLaunch('continuous')}
                title="현재 진행 상태 그대로 타이머만 켜고 챌린지 시작"
                className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg border border-neutral-600 cursor-pointer text-xs transition-colors"
              >
                ⏩ 현재 상태로 시작
              </button>

              <button
                onClick={() => handleLaunch('clean')}
                title="처음부터 시작하는 표준 공식 스피드런"
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold rounded-lg border-2 border-amber-300 shadow-lg cursor-pointer text-xs flex items-center justify-center gap-1.5 transform hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>공식 클린 런 시작!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
