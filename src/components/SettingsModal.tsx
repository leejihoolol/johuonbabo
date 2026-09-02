import React, { useState } from 'react';
import { 
  Settings, Volume2, VolumeX, Music, HardDrive, 
  HelpCircle, RotateCcw, AlertTriangle, Check, ShieldAlert, Sparkles, Smartphone, Eye
} from 'lucide-react';
import { PlayerStats } from '../types';
import { sound } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onOpenTutorial: () => void;
  onRestartInteractiveTutorial?: () => void;
  onOpenSaveModal: () => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onUpdateStats,
  onOpenTutorial,
  onRestartInteractiveTutorial,
  onOpenSaveModal,
  onResetData,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const toggleSfx = () => {
    sound.playClick();
    const next = !stats.soundEnabled;
    sound.sfxEnabled = next;
    onUpdateStats((prev) => ({ ...prev, soundEnabled: next }));
  };

  const toggleBgm = () => {
    sound.playClick();
    const next = !stats.musicEnabled;
    sound.toggleBGM(next);
    onUpdateStats((prev) => ({ ...prev, musicEnabled: next }));
  };

  const toggleScreenShake = () => {
    sound.playClick();
    onUpdateStats((prev) => ({ ...prev, screenShake: !prev.screenShake }));
  };

  const toggleDamageNumbers = () => {
    sound.playClick();
    onUpdateStats((prev) => ({ ...prev, damageNumbers: !prev.damageNumbers }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 font-pixel animate-fadeIn">
      <div className="bg-neutral-900 border-4 border-neutral-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>게임 환경 설정 & 가이드</span>
          </h3>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* 1. Tutorial Replay Section (Highlight) */}
        <div className="bg-gradient-to-r from-amber-950/50 via-purple-950/40 to-neutral-950 p-4 rounded-xl border-2 border-amber-500/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>초보자 완벽 가이드 & 튜토리얼</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
              언제든 다시보기
            </span>
          </div>

          <p className="text-xs text-neutral-300 font-sans">
            강화 리듬 타이밍, 10대 던전 속성 공략, 환생 시스템, 초월 각성(+67강) 등 전체 핵심 가이드를 다시 확인합니다.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => {
                sound.playClick();
                onOpenTutorial();
              }}
              className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-neutral-950" />
              <span>📖 전체 가이드 열기</span>
            </button>

            {onRestartInteractiveTutorial && (
              <button
                onClick={() => {
                  sound.playSuccess();
                  onRestartInteractiveTutorial();
                }}
                className="py-2.5 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border-2 border-amber-500/80 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>⚡ 실전 튜토리얼 다시 시작</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Audio & Visual Settings */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-neutral-300 font-mono border-b border-neutral-800 pb-1.5 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>오디오 & 연출 이펙트 설정</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* SFX Toggle */}
            <button
              onClick={toggleSfx}
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                stats.soundEnabled
                  ? 'bg-neutral-900 border-amber-500/60 text-amber-300'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                {stats.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>효과음 (SFX)</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${stats.soundEnabled ? 'bg-amber-950 text-amber-300' : 'bg-neutral-800 text-neutral-500'}`}>
                {stats.soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* BGM Toggle */}
            <button
              onClick={toggleBgm}
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                stats.musicEnabled
                  ? 'bg-neutral-900 border-purple-500/60 text-purple-300'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Music size={16} />
                <span>배경음악 (BGM)</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${stats.musicEnabled ? 'bg-purple-950 text-purple-300' : 'bg-neutral-800 text-neutral-500'}`}>
                {stats.musicEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Screen Shake Toggle */}
            <button
              onClick={toggleScreenShake}
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                stats.screenShake
                  ? 'bg-neutral-900 border-sky-500/60 text-sky-300'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Smartphone size={16} />
                <span>화면 흔들림</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${stats.screenShake ? 'bg-sky-950 text-sky-300' : 'bg-neutral-800 text-neutral-500'}`}>
                {stats.screenShake ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Damage Numbers Toggle */}
            <button
              onClick={toggleDamageNumbers}
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                stats.damageNumbers
                  ? 'bg-neutral-900 border-emerald-500/60 text-emerald-300'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Eye size={16} />
                <span>데미지 폰트 표시</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${stats.damageNumbers ? 'bg-emerald-950 text-emerald-300' : 'bg-neutral-800 text-neutral-500'}`}>
                {stats.damageNumbers ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Data Backup & Storage Management */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-2.5">
          <h4 className="text-xs font-bold text-neutral-300 font-mono border-b border-neutral-800 pb-1.5 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>데이터 세이브 & 백업 관리</span>
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onOpenSaveModal();
              }}
              className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <HardDrive size={14} className="text-blue-400" />
              <span>세이브 코드 내보내기 / 불러오기</span>
            </button>
          </div>
        </div>

        {/* 4. Danger Zone: Reset Game Data */}
        <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <AlertTriangle size={14} />
              <span>데이터 초기화 (주의)</span>
            </span>
          </div>

          {!showResetConfirm ? (
            <button
              onClick={() => {
                sound.playFail();
                setShowResetConfirm(true);
              }}
              className="py-2 px-3 bg-neutral-900 hover:bg-rose-950 text-rose-300 border border-rose-800/60 rounded-lg text-xs cursor-pointer transition-colors"
            >
              게임 데이터 전체 초기화...
            </button>
          ) : (
            <div className="bg-rose-950/60 border border-rose-600 p-3 rounded-lg flex flex-col gap-2">
              <p className="text-[11px] text-rose-200 font-sans leading-relaxed">
                모든 도검 레벨, 골드, 환생 수치, 업적, 유물이 영구 삭제됩니다. 정말 초기화하시겠습니까?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sound.playFail();
                    onResetData();
                    setShowResetConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs cursor-pointer shadow"
                >
                  확인 (영구 삭제)
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowResetConfirm(false);
                  }}
                  className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded text-xs cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold cursor-pointer border border-neutral-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
