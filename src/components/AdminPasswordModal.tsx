import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle, X, Eye, EyeOff, Lock } from 'lucide-react';
import { sound } from '../utils/sound';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ADMIN_SECRET = 'jihoo10101!@';

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [inputPw, setInputPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPw === ADMIN_SECRET) {
      setErrorMsg('');
      setIsSuccess(true);
      sound.playSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setInputPw('');
        onSuccess();
      }, 700);
    } else {
      sound.playFail();
      setErrorMsg('비밀번호가 일치하지 않습니다. 관리자 권한이 거부되었습니다.');
      setInputPw('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-pixel animate-fade-in">
      <div className="bg-neutral-900 border-4 border-rose-500/80 rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-950/80 rounded-lg border border-rose-500/60 shadow">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-1.5">
                <span>어드민 시스템 인증</span>
                <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800 font-mono">
                  SECURITY
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                관리자 전용 특수 치트 콘솔 접근 권한
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 rounded border border-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-neutral-300 font-bold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>어드민 비밀번호 입력</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={inputPw}
                onChange={(e) => {
                  setInputPw(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="비밀번호를 입력하세요..."
                autoFocus
                className="w-full bg-neutral-950 border-2 border-neutral-700 focus:border-rose-500 rounded px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 font-mono outline-none pr-10 tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <span className="text-[11px] text-rose-400 font-mono animate-bounce">
                ⚠️ {errorMsg}
              </span>
            )}
            {isSuccess && (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                인증 성공! 어드민 치트 메뉴를 해금합니다...
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-mono text-xs cursor-pointer border border-neutral-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!inputPw.trim() || isSuccess}
              className="px-4 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-neutral-950 font-bold rounded font-mono text-xs cursor-pointer shadow-lg border border-amber-300 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>권한 승인</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
