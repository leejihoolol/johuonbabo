import React, { useState } from 'react';
import { X, Check, LogOut, ShieldAlert, Sparkles, User as UserIcon, Crown, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';
import { PlayerStats, Sword } from '../types';
import { loginWithGoogle, logoutUser, isUserAdmin } from '../utils/firebaseAuth';
import { syncPlayerToLeaderboard } from '../utils/firebaseLeaderboard';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onOpenCheatModal?: () => void;
}

const AVATAR_PRESETS = [
  { id: 'anvil', name: '모루 장인', icon: 'anvil' },
  { id: 'sword', name: '검사', icon: 'sword' },
  { id: 'dragon', name: '드래곤', icon: 'dragon' },
  { id: 'fire', name: '불꽃 대장장이', icon: 'fire' },
  { id: 'star', name: '초월자', icon: 'star' },
  { id: 'diamond', name: '다이아 광부', icon: 'diamond' },
  { id: 'scroll', name: '고대 마법사', icon: 'scroll' },
  { id: 'potion', name: '연금술사', icon: 'potion' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  stats,
  currentSword,
  onUpdateStats,
  onOpenCheatModal,
}) => {
  const [nickname, setNickname] = useState(stats.playerName || user?.displayName || '픽셀 대장장이');
  const [selectedAvatar, setSelectedAvatar] = useState(stats.playerAvatar || 'anvil');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(user?.email);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');
    sound.playClick();
    const res = await loginWithGoogle();
    setIsLoggingIn(false);
    if (res.error) {
      setLoginError(res.error);
    } else if (res.user) {
      sound.playLevelUp();
      const newName = stats.playerName || res.user.displayName || '구글 대장장이';
      setNickname(newName);
      const isAdm = isUserAdmin(res.user.email);
      onUpdateStats((prev) => ({
        ...prev,
        playerName: newName,
        adminUnlocked: isAdm,
        cheatUnlocked: isAdm,
        unlockedCheatMode: isAdm ? true : prev.unlockedCheatMode,
      }));
      await syncPlayerToLeaderboard(res.user.uid, res.user, stats, currentSword, newName, selectedAvatar);
    }
  };

  const handleLogout = async () => {
    sound.playClick();
    await logoutUser();
    onUpdateStats((prev) => ({
      ...prev,
      adminUnlocked: false,
      cheatUnlocked: false,
      unlockedCheatMode: false,
    }));
  };

  const handleSaveProfile = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      alert('닉네임을 1글자 이상 입력해주세요.');
      return;
    }
    if (trimmed.length > 14) {
      alert('닉네임은 최대 14자까지 가능합니다.');
      return;
    }

    sound.playSuccess();
    setIsSaving(true);
    setSaveSuccessMsg('');

    onUpdateStats((prev) => ({
      ...prev,
      playerName: trimmed,
      playerAvatar: selectedAvatar,
    }));

    if (user) {
      await syncPlayerToLeaderboard(user.uid, user, stats, currentSword, trimmed, selectedAvatar);
    }

    setIsSaving(false);
    setSaveSuccessMsg('대장장이 닉네임과 프로필이 성공적으로 저장 및 랭킹에 동기화되었습니다!');
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border-2 border-amber-600/80 rounded-xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-5 relative text-neutral-200">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-400">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-300 font-pixel">대장장이 계정 & 프로필</h2>
            <p className="text-xs text-neutral-400">구글 계정 연동, 닉네임 설정 및 전역 랭킹 기록 동기화</p>
          </div>
        </div>

        {/* 1. Google Auth Section */}
        <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 mb-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-amber-400 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-amber-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-neutral-100 truncate">
                      {user.displayName || '구글 계정 유저'}
                    </span>
                    {isAdmin && (
                      <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-neutral-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                        <Crown className="w-3 h-3 text-neutral-950" />
                        <span>👑 최고 관리자</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate font-mono">{user.email}</p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>구글 연동 완료 (실시간 랭킹 자동 등록)</span>
                  </p>
                </div>
              </div>

              {/* Admin Special Quick Access */}
              {isAdmin && (
                <div className="p-2.5 rounded bg-gradient-to-r from-amber-950/90 to-rose-950/90 border border-amber-500/80 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-amber-300 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>관리자 권한 활성화</span>
                    </p>
                  </div>
                  {onOpenCheatModal && (
                    <button
                      onClick={() => {
                        sound.playSuccess();
                        onClose();
                        onOpenCheatModal();
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded shadow cursor-pointer transition-all active:scale-95"
                    >
                      콘솔 열기
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>구글 계정 로그아웃</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 text-center">
              <p className="text-xs text-neutral-300">
                구글 계정으로 로그인하면 <span className="text-amber-400 font-bold">전역 랭킹(명예의 전당)</span>에
                내 최고 기록이 실시간으로 등록됩니다!
              </p>
              {loginError && (
                <p className="text-xs text-rose-400 bg-rose-950/50 p-2 rounded border border-rose-800 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </p>
              )}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-900 rounded-lg font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoggingIn ? '구글 인증 진행 중...' : 'Google 계정으로 로그인'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Nickname & Avatar Setting Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center justify-between">
              <span>🏷️ 대장장이 닉네임 설정</span>
              <span className="text-[10px] text-neutral-500 font-normal">랭킹 및 멀티플레이에 표시됨</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={14}
              placeholder="표시될 닉네임 입력 (1~14자)"
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-amber-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-400 mb-1.5">
              🎭 픽셀 대표 아바타 선택
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((p) => {
                const isSel = selectedAvatar === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedAvatar(p.id);
                    }}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow ring-1 ring-amber-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <PixelIcon name={p.icon} size={22} />
                    <span className="text-[10px] font-bold truncate max-w-full">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>동기화 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-neutral-950" />
                  <span>프로필 저장 & 랭킹 동기화</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
