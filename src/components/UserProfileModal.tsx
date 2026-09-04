import React, { useState } from 'react';
import {
  X,
  Check,
  LogOut,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  Crown,
  RefreshCw,
  Mail,
  Lock,
  KeyRound,
  Copy,
  CheckCheck,
  ArrowRight,
  UserPlus,
  LogIn,
  Trash2,
} from 'lucide-react';
import { PlayerStats, Sword } from '../types';
import {
  AppUser,
  loginWithEmail,
  registerWithEmail,
  loginWithCode,
  requestVerificationCode,
  logoutUser,
  loginWithGoogle,
  isUserAdmin,
  resetAllStoredAccounts,
} from '../utils/firebaseAuth';
import { syncPlayerToLeaderboard } from '../utils/firebaseLeaderboard';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
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
  // Tabs: 'login' | 'register'
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');

  // Input states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [nickname, setNickname] = useState(stats.playerName || user?.displayName || '픽셀 대장장이');
  const [selectedAvatar, setSelectedAvatar] = useState(stats.playerAvatar || 'anvil');

  // Verification code feedback
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState('');
  const [realEmailSent, setRealEmailSent] = useState(false);
  const [sentTargetEmail, setSentTargetEmail] = useState('');

  // Form submission status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isResettingAccounts, setIsResettingAccounts] = useState(false);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(user?.email);

  // 1. Request 6-digit verification code
  const handleRequestCode = async (purpose: 'signup' | 'login') => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('올바른 이메일 주소를 먼저 입력해주세요.');
      sound.playFail();
      return;
    }

    setIsSendingCode(true);
    setErrorMessage('');
    sound.playClick();

    const res = await requestVerificationCode(cleanEmail, purpose);
    setIsSendingCode(false);

    if (res.success) {
      sound.playLevelUp();
      setCodeSentMessage(res.message);
      if (res.realEmailSent) {
        setRealEmailSent(true);
        setSentTargetEmail(cleanEmail);
        setGeneratedCode(null);
        setCodeInput(''); // Player enters code from their real email inbox
      } else {
        setRealEmailSent(false);
        setGeneratedCode(res.code || null);
        if (res.code) {
          setCodeInput(res.code);
        }
      }
    } else {
      sound.playFail();
      setErrorMessage(res.message || '인증 코드 생성에 실패했습니다.');
    }
  };

  // 2. Register with Email + Password + Code
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage('이메일을 입력해주세요.');
      return;
    }
    if (!passwordInput || passwordInput.length < 4) {
      setErrorMessage('비밀번호를 최소 4자 이상 입력해주세요.');
      return;
    }
    if (!codeInput.trim() || codeInput.trim().length !== 6) {
      setErrorMessage('6자리 인증 코드를 발급받아 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    sound.playClick();

    const res = await registerWithEmail(
      emailInput.trim(),
      passwordInput,
      codeInput.trim(),
      nickname.trim()
    );

    setIsLoading(false);

    if (res.error) {
      sound.playFail();
      setErrorMessage(res.error);
    } else if (res.user) {
      sound.playSuccess(true);
      const isAdm = isUserAdmin(res.user.email);
      onUpdateStats((prev) => ({
        ...prev,
        playerName: res.user?.displayName || prev.playerName,
        adminUnlocked: isAdm,
        cheatUnlocked: isAdm,
        unlockedCheatMode: isAdm ? true : prev.unlockedCheatMode,
      }));
      await syncPlayerToLeaderboard(res.user.uid, res.user, stats, currentSword, nickname, selectedAvatar);
      setSuccessMessage('계정 생성이 완료되어 로그인되었습니다!');
    }
  };

  // 3. Login with Email + Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage('이메일을 입력해주세요.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    sound.playClick();

    const res = await loginWithEmail(emailInput.trim(), passwordInput);
    setIsLoading(false);

    if (res.error) {
      sound.playFail();
      setErrorMessage(res.error);
    } else if (res.user) {
      sound.playSuccess(true);
      const isAdm = isUserAdmin(res.user.email);
      onUpdateStats((prev) => ({
        ...prev,
        playerName: res.user?.displayName || prev.playerName,
        adminUnlocked: isAdm,
        cheatUnlocked: isAdm,
        unlockedCheatMode: isAdm ? true : prev.unlockedCheatMode,
      }));
      await syncPlayerToLeaderboard(res.user.uid, res.user, stats, currentSword, res.user.displayName || nickname, selectedAvatar);
      setSuccessMessage('로그인에 성공했습니다!');
    }
  };

  // 4. Quick Login with Code (for code login alternative)
  const handleLoginWithCode = async () => {
    if (!emailInput.trim()) {
      setErrorMessage('이메일을 입력해주세요.');
      return;
    }
    if (!codeInput.trim() || codeInput.trim().length !== 6) {
      setErrorMessage('6자리 인증 코드를 먼저 발급받아 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    sound.playClick();

    const res = await loginWithCode(emailInput.trim(), codeInput.trim());
    setIsLoading(false);

    if (res.error) {
      sound.playFail();
      setErrorMessage(res.error);
    } else if (res.user) {
      sound.playSuccess(true);
      const isAdm = isUserAdmin(res.user.email);
      onUpdateStats((prev) => ({
        ...prev,
        playerName: res.user?.displayName || prev.playerName,
        adminUnlocked: isAdm,
        cheatUnlocked: isAdm,
        unlockedCheatMode: isAdm ? true : prev.unlockedCheatMode,
      }));
      await syncPlayerToLeaderboard(res.user.uid, res.user, stats, currentSword, res.user.displayName || nickname, selectedAvatar);
      setSuccessMessage('인증 코드로 로그인되었습니다!');
    }
  };

  // 5. Google Login Fallback
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    sound.playClick();
    const res = await loginWithGoogle();
    setIsLoading(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.user) {
      sound.playSuccess(true);
      const isAdm = isUserAdmin(res.user.email);
      onUpdateStats((prev) => ({
        ...prev,
        playerName: res.user?.displayName || prev.playerName,
        adminUnlocked: isAdm,
        cheatUnlocked: isAdm,
        unlockedCheatMode: isAdm ? true : prev.unlockedCheatMode,
      }));
      await syncPlayerToLeaderboard(res.user.uid, res.user, stats, currentSword, res.user.displayName || nickname, selectedAvatar);
    }
  };

  // 6. Logout
  const handleLogout = async () => {
    sound.playClick();
    await logoutUser();
    onUpdateStats((prev) => ({
      ...prev,
      adminUnlocked: false,
      cheatUnlocked: false,
      unlockedCheatMode: false,
    }));
    setSuccessMessage('');
  };

  // 6-1. Reset all accounts & force re-login
  const handleResetAllAccounts = async () => {
    const ok = window.confirm(
      '정말로 보관된 모든 계정 정보와 인증 코드를 데이터베이스에서 초기화하시겠습니까?\n모든 계정 세션이 삭제되며 다시 처음부터 회원가입 및 로그인을 진행할 수 있습니다.'
    );
    if (!ok) return;

    try {
      setIsResettingAccounts(true);
      sound.playFail();
      await logoutUser();
      const res = await resetAllStoredAccounts();
      onUpdateStats((prev) => ({
        ...prev,
        adminUnlocked: false,
        cheatUnlocked: false,
        unlockedCheatMode: false,
      }));
      setEmailInput('');
      setPasswordInput('');
      setCodeInput('');
      setGeneratedCode(null);
      setRealEmailSent(false);
      setSuccessMessage(`모든 계정 데이터가 초기화되었습니다. (${res.deletedCount}개 항목 삭제) 이제 새 계정으로 가입 또는 로그인할 수 있습니다.`);
      sound.playLevelUp();
    } catch (err: any) {
      console.error('Reset all accounts error:', err);
      setErrorMessage('계정 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResettingAccounts(false);
    }
  };

  // 7. Save Nickname & Avatar
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
    setIsSavingProfile(true);

    onUpdateStats((prev) => ({
      ...prev,
      playerName: trimmed,
      playerAvatar: selectedAvatar,
    }));

    if (user) {
      await syncPlayerToLeaderboard(user.uid, user, stats, currentSword, trimmed, selectedAvatar);
    }

    setIsSavingProfile(false);
    setSuccessMessage('프로필이 성공적으로 저장 및 랭킹에 동기화되었습니다!');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      sound.playClick();
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-neutral-900 border-2 border-amber-600/80 rounded-xl w-full max-w-md max-h-[94vh] overflow-y-auto shadow-2xl p-5 relative text-neutral-200">
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

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-400">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-300 font-pixel">대장장이 계정 & 프로필</h2>
            <p className="text-xs text-neutral-400">이메일 계정 생성, 코드 인증 로그인 및 전역 랭킹 연동</p>
          </div>
        </div>

        {/* If User is Logged In */}
        {user ? (
          <div className="space-y-4">
            {/* Account Status Card */}
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
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
                      {user.displayName || stats.playerName || '대장장이'}
                    </span>
                    {isAdmin && (
                      <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                        <Crown className="w-3 h-3 text-neutral-950" />
                        <span>관리자</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate font-mono">{user.email || '연동 계정'}</p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>계정 연동 활성화 (실시간 랭킹 자동 등록)</span>
                  </p>
                </div>
              </div>

              {/* Admin Special Quick Access (Only if Admin) */}
              {isAdmin && (
                <div className="p-2.5 rounded bg-gradient-to-r from-amber-950/80 to-neutral-900 border border-amber-500/60 flex items-center justify-between">
                  <div className="text-xs">
                    <p className="font-bold text-amber-300 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>관리자 권한 확인됨</span>
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleLogout}
                  className="py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>로그아웃</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllAccounts}
                  disabled={isResettingAccounts}
                  className="py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="모든 저장된 계정 데이터를 지우고 처음부터 새로 가입/로그인합니다"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isResettingAccounts ? '삭제 중...' : '계정 전체 초기화'}</span>
                </button>
              </div>
            </div>

            {/* Profile Customization Section */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center justify-between">
                  <span>🏷️ 대장장이 닉네임 변경</span>
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

              {successMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-neutral-950 font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>저장 및 동기화 중...</span>
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
        ) : (
          /* If User is NOT Logged In: Registration / Login Forms */
          <div className="space-y-4">
            {/* Tab Selection: 계정 생성 vs 로그인 */}
            <div className="grid grid-cols-2 p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setAuthTab('register');
                  setErrorMessage('');
                }}
                className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>계정 생성 (회원가입)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setAuthTab('login');
                  setErrorMessage('');
                }}
                className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>기존 계정 로그인</span>
              </button>
            </div>

            {/* Real Email Sent Banner */}
            {realEmailSent && (
              <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500/80 rounded-lg animate-fade-in text-emerald-200">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 mt-0.5 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <span>실제 이메일 발송 완료!</span>
                    </span>
                    <p className="text-xs text-emerald-100 font-medium mt-0.5 break-all">
                      <strong className="text-emerald-300">{sentTargetEmail}</strong> 메일함으로 6자리 인증 코드가 발송되었습니다.
                    </p>
                    <p className="text-[10px] text-emerald-400/80 mt-1">
                      메일함(또는 스팸함)에 수신된 코드를 확인하신 후 아래에 입력해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Code Notification Banner (When real email provider not yet connected) */}
            {!realEmailSent && generatedCode && (
              <div className="p-3 bg-amber-950/80 border-2 border-amber-400/80 rounded-lg animate-fade-in text-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1 text-amber-300">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>보안 인증코드 (자동 입력 완료)</span>
                  </span>
                  <button
                    type="button"
                    onClick={copyCodeToClipboard}
                    className="flex items-center gap-1 text-[11px] bg-amber-500 text-neutral-950 font-bold px-2 py-0.5 rounded hover:bg-amber-400 cursor-pointer"
                  >
                    {codeCopied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{codeCopied ? '복사됨!' : '코드 복사'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-center py-1.5 bg-neutral-950/80 rounded border border-amber-500/50">
                  <span className="text-xl font-mono font-black tracking-widest text-amber-300">
                    {generatedCode}
                  </span>
                </div>
                <p className="text-[10px] text-amber-300/90 mt-1.5 text-center leading-relaxed">
                  💡 발급된 6자리 인증코드가 아래 입력란에 자동 적용되었습니다. 비밀번호를 입력하고 완료를 누르면 바로 가입/로그인됩니다!
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={authTab === 'register' ? handleRegister : handleLogin} className="space-y-3">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>이메일 주소</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="이메일 입력 (예: player@test.com)"
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="button"
                    disabled={isSendingCode}
                    onClick={() => handleRequestCode(authTab === 'register' ? 'signup' : 'login')}
                    className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 text-xs font-black rounded-lg cursor-pointer transition-all shrink-0 disabled:opacity-50 shadow active:scale-95 flex items-center gap-1"
                  >
                    {isSendingCode ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>전송 중...</span>
                      </>
                    ) : realEmailSent ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>코드 재전송</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>인증코드 받기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>비밀번호</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="비밀번호 (최소 4자 이상)"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* Verification Code Input (Required for register, optional for login) */}
              {authTab === 'register' ? (
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>6자리 인증 코드 (필수)</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      {realEmailSent ? '수신된 메일함의 6자리 코드 입력' : '[인증코드 받기] 클릭 후 입력'}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="6자리 숫자 입력"
                    className="w-full px-3 py-2 bg-neutral-950 border border-amber-500/70 rounded-lg text-sm text-center tracking-widest text-amber-300 placeholder-neutral-600 focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>
              ) : (
                /* Login Tab: Direct Code Login Option */
                codeInput && (
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>6자리 인증 코드 (간편 로그인 시 사용)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="6자리 숫자"
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-center tracking-widest text-amber-300 placeholder-neutral-600 focus:outline-none focus:border-amber-400 font-mono font-bold"
                    />
                  </div>
                )
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-1 space-y-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authTab === 'register' ? (
                    <UserPlus className="w-4 h-4" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {isLoading
                      ? '처리 중...'
                      : authTab === 'register'
                      ? '인증 코드 확인 및 계정 생성'
                      : '이메일 계정 로그인'}
                  </span>
                </button>

                {authTab === 'login' && codeInput.length === 6 && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleLoginWithCode}
                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>인증 코드로 원클릭 로그인</span>
                  </button>
                )}
              </div>
            </form>

            {/* Google Login Alternative */}
            <div className="pt-3 border-t border-neutral-800">
              <div className="text-center mb-2">
                <span className="text-[11px] text-neutral-500">또는 구글 계정으로 로그인</span>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>Google 계정으로 계속하기</span>
              </button>

              {/* Reset Stored Accounts link */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={handleResetAllAccounts}
                  disabled={isResettingAccounts}
                  className="text-[10px] text-neutral-500 hover:text-rose-400 underline cursor-pointer transition-colors disabled:opacity-50"
                  title="데이터베이스 및 로컬에 저장된 모든 계정 기록을 지우고 처음부터 다시 시작합니다"
                >
                  {isResettingAccounts ? '계정 초기화 진행 중...' : '🗑️ 저장된 모든 계정 정보 완전히 초기화하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
