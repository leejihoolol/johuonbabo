import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, Trophy, Sparkles, Swords, Zap, Crown, Flame, Shield, Play } from 'lucide-react';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';
import { PartyMember } from '../types';

export interface CinematicCutsceneProps {
  type: 'intro' | 'victory';
  title: string;
  subtitle?: string;
  bossName?: string;
  bossThemeColor?: string;
  description?: string;
  floor?: number;
  durationSeconds?: number;
  rewards?: {
    gold?: number;
    diamonds?: number;
    dust?: number;
    tokens?: number;
    gemName?: string;
    partyBonus?: boolean;
  };
  partyMembers?: PartyMember[];
  onComplete: () => void;
  onSkip?: () => void;
}

export const CinematicCutscene: React.FC<CinematicCutsceneProps> = ({
  type,
  title,
  subtitle,
  bossName,
  bossThemeColor = '#f59e0b',
  description,
  floor,
  rewards,
  partyMembers,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (type === 'intro') {
      sound.playBossRoar();
      const timer1 = setTimeout(() => setStep(1), 1200);
      const timer2 = setTimeout(() => setStep(2), 2600);
      const timer3 = setTimeout(() => {
        onComplete();
      }, 4200);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      // Victory
      sound.playSuccess(true);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#ffffff'],
        });
      } catch (e) {
        // ignore
      }

      const timer1 = setTimeout(() => setStep(1), 1000);
      const timer2 = setTimeout(() => setStep(2), 2200);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [type]);

  const sortedMembers = partyMembers
    ? [...partyMembers].sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0))
    : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md font-pixel p-4 select-none overflow-hidden"
      >
        {/* Ambient Animated Aura */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${bossThemeColor} 0%, transparent 70%)`,
          }}
        />

        {/* Cinematic Letterbox Bars */}
        <div className="absolute top-0 left-0 right-0 h-14 sm:h-20 bg-black border-b border-neutral-800 z-10 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono tracking-widest uppercase">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
            <span>CINEMATIC EVENT // LIVE COMBAT STREAM</span>
          </div>
          {onSkip && (
            <button
              onClick={onSkip || onComplete}
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 hover:border-neutral-500 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>스킵 (SKIP)</span>
              <Play className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-14 sm:h-20 bg-black border-t border-neutral-800 z-10 flex items-center justify-center px-6">
          <p className="text-[11px] text-neutral-500 font-sans tracking-wide">
            {type === 'intro' ? '⚔️ 위험 구역: 화면의 조이스틱 또는 방향키로 보스 공격을 회피하세요!' : '✨ 토벌 완료! 위대한 검사의 승리를 찬양하라.'}
          </p>
        </div>

        {/* INTRO CUTSCENE */}
        {type === 'intro' && (
          <div className="relative z-20 flex flex-col items-center text-center max-w-2xl mx-auto px-4">
            <motion.div
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-neutral-900 border-4 border-red-600 flex items-center justify-center shadow-2xl shadow-red-950 mb-6"
            >
              <Skull className="w-14 h-14 sm:w-20 sm:h-20 text-red-500 animate-pulse" />
            </motion.div>

            {floor && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-xs sm:text-sm font-mono tracking-widest text-amber-400 bg-amber-950/70 border border-amber-500/60 px-3 py-1 rounded-full mb-3 uppercase"
              >
                ★ INFINITE SPIRE FLOOR {floor} DEEP TRIAL ★
              </motion.div>
            )}

            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2"
              style={{
                textShadow: `0 0 20px ${bossThemeColor}, 0 0 40px ${bossThemeColor}`,
              }}
            >
              {title}
            </motion.h1>

            {bossName && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg sm:text-2xl font-bold text-red-400 mb-4"
              >
                「 {bossName} 」
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed max-w-lg mb-8"
            >
              {description || '고대의 차원을 찢고 깨어난 초월적 존재가 당신의 검을 시험합니다.'}
            </motion.p>

            {/* Countdown or Start Prompt */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.0, type: 'spring' }}
              className="flex items-center gap-3"
            >
              <button
                onClick={onComplete}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm sm:text-base rounded-xl border-2 border-amber-300 shadow-xl shadow-red-900/50 cursor-pointer flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Swords className="w-5 h-5 animate-bounce" />
                <span>결전 시작 (FIGHT NOW!)</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* VICTORY CUTSCENE */}
        {type === 'victory' && (
          <div className="relative z-20 flex flex-col items-center text-center max-w-2xl mx-auto px-4 py-8 max-h-[85vh] overflow-y-auto">
            <motion.div
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, type: 'spring', bounce: 0.5 }}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-amber-950 border-4 border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-4"
            >
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 animate-bounce" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xs sm:text-sm font-mono tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/60 px-3 py-1 rounded-full mb-2 uppercase"
            >
              ★ VICTORY CLEAR ★
            </motion.div>

            <motion.h1
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 mb-2"
            >
              {title || '보스 완벽 토벌!'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs sm:text-sm text-neutral-300 font-sans mb-6"
            >
              {subtitle || '강력한 적을 물리치고 막대한 영예와 전리품을 획득하였습니다!'}
            </motion.p>

            {/* Party Damage Contributions if Co-op */}
            {sortedMembers.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full bg-neutral-900/90 border border-neutral-700 rounded-xl p-3 sm:p-4 mb-5 text-left"
              >
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>파티원 기여도 & MVP 순위</span>
                </div>
                <div className="space-y-2">
                  {sortedMembers.map((m, idx) => {
                    const totalPartyDmg = sortedMembers.reduce((sum, item) => sum + (item.totalDamage || 0), 0);
                    const pct = totalPartyDmg > 0 ? Math.round(((m.totalDamage || 0) / totalPartyDmg) * 100) : 0;
                    return (
                      <div key={m.uid} className="flex items-center justify-between text-xs bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-amber-900 text-amber-200'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-neutral-200">{m.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">+{m.swordLevel}강</span>
                          {idx === 0 && <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-500 px-1 rounded font-bold">MVP 👑</span>}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-right">
                          <span className="text-neutral-400">{(m.totalDamage || 0).toLocaleString()} DMG</span>
                          <span className="text-amber-400 font-bold w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Rewards Card */}
            {rewards && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full bg-gradient-to-b from-amber-950/40 to-neutral-900/80 border border-amber-500/40 rounded-xl p-4 mb-6"
              >
                <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>전리품 보상 결산 {rewards.partyBonus && <span className="text-pink-400">(파티 보너스 +50% 적용!)</span>}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {rewards.gold !== undefined && (
                    <div className="bg-neutral-950/80 border border-yellow-800/60 p-2.5 rounded-lg">
                      <div className="text-[10px] text-neutral-400">골드</div>
                      <div className="text-yellow-400 font-bold font-mono">+{rewards.gold.toLocaleString()}</div>
                    </div>
                  )}
                  {rewards.diamonds !== undefined && (
                    <div className="bg-neutral-950/80 border border-cyan-800/60 p-2.5 rounded-lg">
                      <div className="text-[10px] text-neutral-400">다이아</div>
                      <div className="text-cyan-300 font-bold font-mono">+{rewards.diamonds.toLocaleString()}</div>
                    </div>
                  )}
                  {rewards.dust !== undefined && (
                    <div className="bg-neutral-950/80 border border-pink-800/60 p-2.5 rounded-lg">
                      <div className="text-[10px] text-neutral-400">영혼의 가루</div>
                      <div className="text-pink-300 font-bold font-mono">+{rewards.dust.toLocaleString()}</div>
                    </div>
                  )}
                  {rewards.tokens !== undefined && (
                    <div className="bg-neutral-950/80 border border-amber-800/60 p-2.5 rounded-lg">
                      <div className="text-[10px] text-neutral-400">레이드 토큰</div>
                      <div className="text-amber-300 font-bold font-mono">+{rewards.tokens.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {rewards.gemName && (
                  <div className="mt-3 bg-indigo-950/70 border border-indigo-500/70 p-2.5 rounded-lg text-indigo-300 font-bold text-xs flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>희귀 보석 획득: {rewards.gemName}</span>
                  </div>
                )}
              </motion.div>
            )}

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base rounded-xl border-2 border-emerald-300 shadow-xl shadow-emerald-950/50 cursor-pointer flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Trophy className="w-5 h-5" />
              <span>보상 수령 및 복귀</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
