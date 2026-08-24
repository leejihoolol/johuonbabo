import React, { useState } from 'react';
import { HardDrive, Copy, Check, Download, Upload, AlertTriangle, RefreshCcw } from 'lucide-react';
import { PlayerStats } from '../types';
import { sound } from '../utils/sound';

interface SaveModalProps {
  stats: PlayerStats;
  onClose: () => void;
  onImportSave: (saveCode: string) => boolean;
  onResetData: () => void;
  onManualSave: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  stats,
  onClose,
  onImportSave,
  onResetData,
  onManualSave,
}) => {
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Generate Base64 save code
  const getSaveCode = () => {
    try {
      const json = JSON.stringify(stats);
      return btoa(unescape(encodeURIComponent(json)));
    } catch {
      return '';
    }
  };

  const handleCopyCode = () => {
    const code = getSaveCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    sound.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importCode.trim()) return;
    const ok = onImportSave(importCode.trim());
    if (ok) {
      sound.playSuccess();
      setImportSuccess(true);
      setImportError('');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      sound.playFail();
      setImportError('올바르지 않은 세이브 코드입니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-pixel">
      <div className="bg-neutral-900 border-4 border-neutral-700 rounded-lg p-5 max-w-lg w-full shadow-2xl flex flex-col gap-4">
        {/* Title */}
        <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-2">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <span>데이터 저장 & 백업 관리</span>
          </h3>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-neutral-400 hover:text-white cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Instant Auto-Save Status */}
        <div className="bg-neutral-950 p-3 rounded border border-neutral-800 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-neutral-300 block font-bold">로컬 브라우저 자동 저장</span>
            <span className="text-neutral-500 text-[10px]">매 5초마다 자동 저장됩니다.</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onManualSave();
            }}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-600/60 rounded font-bold cursor-pointer text-xs"
          >
            수동 즉시 저장
          </button>
        </div>

        {/* Export Save Code */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-neutral-300 font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-emerald-400" /> 세이브 코드 내보내기 (백업):
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={getSaveCode()}
              className="flex-1 bg-neutral-950 border border-neutral-800 px-2 py-1.5 rounded text-neutral-400 font-mono text-[11px] select-all truncate"
            />
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold flex items-center gap-1 cursor-pointer text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨!' : '코드 복사'}</span>
            </button>
          </div>
        </div>

        {/* Import Save Code */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-neutral-300 font-bold flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-cyan-400" /> 세이브 코드 불러오기 (복구):
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="여기에 복사한 세이브 코드를 붙여넣으세요..."
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-800 px-2 py-1.5 rounded text-neutral-200 font-mono text-[11px]"
            />
            <button
              onClick={handleImport}
              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold cursor-pointer text-xs"
            >
              불러오기
            </button>
          </div>
          {importError && <span className="text-rose-400 text-[11px] font-sans">{importError}</span>}
          {importSuccess && <span className="text-emerald-400 text-[11px] font-sans">성공적으로 데이터를 불러왔습니다!</span>}
        </div>

        {/* Danger Zone: Reset Data */}
        <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="py-1.5 text-rose-400 hover:text-rose-300 text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>데이터 초기화 (처음부터 다시하기)</span>
            </button>
          ) : (
            <div className="bg-rose-950/60 border border-rose-800 p-3 rounded flex flex-col gap-2 text-xs">
              <span className="text-rose-300 font-bold">
                [경고] 정말 모든 게임 데이터를 초기화하시겠습니까? (되돌릴 수 없습니다)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sound.playDestroy();
                    onResetData();
                    setShowResetConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold cursor-pointer"
                >
                  네, 초기화합니다
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-bold cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
