import React, { useState } from 'react';
import { CheckCircle, X, Lock, Crown, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { sound } from '../utils/sound';
import { isUserAdmin, loginWithGoogle } from '../utils/firebaseAuth';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: User | null;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [authCode, setAuthCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const isAdminLoggedIn = isUserAdmin(currentUser?.email);

  const handleCodeAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playFail();
    setErrorMsg('인증 정보가 일치하지 않습니다.');
    setAuthCode('');
  };

  const handleGoogleAdminLogin = async () => {
    sound.playClick();
    setIsLoggingIn(true);
    setErrorMsg('');

    const res = await loginWithGoogle();
    setIsLoggingIn(false);

    if (res.user) {
      if (isUserAdmin(res.user.email)) {
        sound.playSuccess(true);
        onSuccess();
      } else {
        sound.playFail();
        setErrorMsg('지정된 관리자 권한이 확인되지 않았습니다.');
      }
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-neutral-900 border-2 border-neutral-700 rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-800 rounded-lg border border-neutral-700 shadow">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-1.5">
                <span>시스템 관리자 인증</span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                보안 계정 확인 및 개발자 콘솔 접근
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

        {/* Current Auth Status */}
        <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-neutral-400">연동 계정: </span>
                <span className="font-bold text-neutral-200 font-mono">{currentUser.displayName || currentUser.email}</span>
              </div>
              {isAdminLoggedIn ? (
                <span className="bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold">
                  권한 확인됨
                </span>
              ) : (
                <span className="bg-neutral-800 text-neutral-400 text-[10px] px-2 py-0.5 rounded font-bold">
                  일반 유저
                </span>
              )}
            </div>
          ) : (
            <p className="text-neutral-400">
              로그인 후 관리자 권한을 인증할 수 있습니다.
            </p>
          )}
        </div>

        {/* Main Action */}
        <div className="space-y-2">
          {isAdminLoggedIn ? (
            <button
              onClick={() => {
                sound.playSuccess(true);
                onSuccess();
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm rounded-lg shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-amber-300"
            >
              <Crown className="w-5 h-5 text-neutral-950" />
              <span>관리자 콘솔 열기</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleAdminLogin}
              disabled={isLoggingIn}
              className="w-full py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs rounded-lg shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
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
              <span>{isLoggingIn ? '인증 진행 중...' : 'Google 계정으로 관리자 권한 확인'}</span>
            </button>
          )}
        </div>

        {/* Security Code Verification Input */}
        <div className="pt-2 border-t border-neutral-800">
          <form onSubmit={handleCodeAttempt} className="space-y-1.5">
            <label className="text-[11px] text-neutral-400 flex items-center gap-1 font-bold">
              <Lock className="w-3 h-3 text-neutral-500" />
              <span>보안 코드 직접 입력</span>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="보안 코드를 입력하세요"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded border border-neutral-700 cursor-pointer"
              >
                인증
              </button>
            </div>
          </form>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

