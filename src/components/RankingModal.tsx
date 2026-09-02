import React, { useState, useEffect } from 'react';
import { X, Trophy, Swords, Zap, Coins, RotateCcw, Castle, RefreshCw, Crown, Sparkles, User as UserIcon, Shield, Search } from 'lucide-react';
import { User } from 'firebase/auth';
import { LeaderboardCategory, LeaderboardEntry, PlayerStats, Sword } from '../types';
import { subscribeToLeaderboard, syncPlayerToLeaderboard, calculateCombatPower } from '../utils/firebaseLeaderboard';
import { PixelIcon } from './PixelIcon';
import { sound } from '../utils/sound';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  stats: PlayerStats;
  currentSword: Sword;
  onOpenProfile: () => void;
}

const CATEGORY_TABS: { id: LeaderboardCategory; label: string; icon: string; desc: string }[] = [
  { id: 'swordLevel', label: '최고 강화', icon: 'sword', desc: '검의 최고 강화 레벨 및 초월 각성 단계 순위' },
  { id: 'combatPower', label: '총 전투력 (CP)', icon: 'fire', desc: '공격력, 각성, 환생 및 탑 진행도를 종합 집계한 전투력 순위' },
  { id: 'gold', label: '보유 골드', icon: 'gold', desc: '픽셀 대륙 최고 부호 대장장이 순위' },
  { id: 'rebirth', label: '환생 횟수', icon: 'star', desc: '초월 환생 및 일반 환생 누적 달성 순위' },
  { id: 'tower', label: '무한의 탑', icon: 'dragon', desc: '무한의 검탑 최고 돌파 층수 순위' },
];

export const RankingModal: React.FC<RankingModalProps> = ({
  isOpen,
  onClose,
  user,
  stats,
  currentSword,
  onOpenProfile,
}) => {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('swordLevel');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  // Subscribe to real-time rankings
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const unsubscribe = subscribeToLeaderboard(activeCategory, (data) => {
      setEntries(data);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, activeCategory]);

  if (!isOpen) return null;

  const currentCP = calculateCombatPower(stats, currentSword);
  const myUid = user?.uid || 'local_user';
  const myName = stats.playerName || user?.displayName || '나의 대장장이';

  // Find my current rank in the list
  const myIndex = entries.findIndex((e) => (user?.uid ? e.uid === user.uid : e.name === myName));
  const myRank = myIndex !== -1 ? myIndex + 1 : null;

  const handleManualSync = async () => {
    sound.playSuccess();
    setIsSyncing(true);
    setSyncNotice('');

    const targetUid = user?.uid || `guest_${Date.now()}`;
    await syncPlayerToLeaderboard(targetUid, user, stats, currentSword);

    setIsSyncing(false);
    setSyncNotice('내 최신 플레이 기록이 랭킹 서버에 성공적으로 동기화되었습니다!');
    setTimeout(() => setSyncNotice(''), 3500);
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return entry.name.toLowerCase().includes(q) || entry.swordName?.toLowerCase().includes(q);
  });

  const getAwakeningTitle = (lvl: number) => {
    if (lvl === 3) return '태초·창세 각성';
    if (lvl === 2) return '천상 각성';
    if (lvl === 1) return '심연 각성';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-neutral-900 border-2 border-amber-500/80 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/60 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-neutral-950 shadow-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-300 font-pixel tracking-wide flex items-center gap-1.5">
                  <span>전역 랭킹 / 명예의 전당</span>
                </h2>
                <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/60 font-bold animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400">전 세계 대장장이들의 실시간 최고 기록 순위표</p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-3 pt-2 bg-neutral-950 border-b border-neutral-800 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setActiveCategory(cat.id);
                }}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg flex items-center gap-1.5 whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-amber-300 border-amber-400 shadow'
                    : 'text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-neutral-900/50'
                }`}
              >
                <PixelIcon name={cat.icon} size={15} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* My Current Rank & Sync Bar */}
        <div className="p-3 bg-neutral-950/90 border-b border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-500/60 flex items-center justify-center font-bold text-amber-300 text-xs shrink-0">
              {myRank ? `#${myRank}` : '―'}
            </div>
            <div className="text-xs min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">내 현재 기록:</span>
                <span className="font-bold text-amber-200 truncate">{myName}</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                +<span className="text-amber-400 font-bold">{stats.currentSwordLevel}강</span> ({currentSword.name}) • CP:{' '}
                <span className="text-cyan-400 font-bold">{currentCP.toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '동기화 중...' : '내 기록 랭킹 등록'}</span>
            </button>

            {!user && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenProfile();
                }}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-lg border border-neutral-600 flex items-center gap-1 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>구글 로그인</span>
              </button>
            )}
          </div>
        </div>

        {syncNotice && (
          <div className="px-4 py-1.5 bg-emerald-950/90 border-b border-emerald-600 text-emerald-300 text-xs font-bold text-center animate-fade-in shrink-0">
            ✨ {syncNotice}
          </div>
        )}

        {/* Search Input Bar */}
        <div className="p-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대장장이 닉네임 또는 검 이름 검색..."
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
            />
          </div>
          <span className="text-[11px] text-neutral-400 font-mono shrink-0">
            총 {filteredEntries.length}명 등록됨
          </span>
        </div>

        {/* Rankings Table / List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5">
          {isLoading ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs font-bold">실시간 전역 랭킹을 불러오는 중입니다...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-neutral-600 opacity-50" />
              <p className="text-xs">아직 등록된 랭킹 데이터가 없습니다.</p>
              <p className="text-[11px] text-neutral-600">[내 기록 랭킹 등록] 버튼을 눌러 첫 번째 랭커가 되어보세요!</p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const rank = idx + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isMe = user?.uid ? entry.uid === user.uid : entry.name === myName;
              const awkTitle = getAwakeningTitle(entry.swordAwakeningLevel || 0);

              let rankBadgeClass = 'bg-neutral-800 text-neutral-400 border-neutral-700';
              if (isTop1) rankBadgeClass = 'bg-gradient-to-r from-amber-400 to-amber-600 text-neutral-950 font-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
              else if (isTop2) rankBadgeClass = 'bg-gradient-to-r from-slate-200 to-slate-400 text-neutral-950 font-black border-slate-100 shadow';
              else if (isTop3) rankBadgeClass = 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-black border-amber-600';

              return (
                <div
                  key={entry.uid || idx}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                    isMe
                      ? 'bg-amber-950/40 border-amber-400/80 shadow-md ring-1 ring-amber-400/50'
                      : isTop1
                      ? 'bg-gradient-to-r from-amber-950/60 to-neutral-900 border-amber-500/70'
                      : 'bg-neutral-950/70 hover:bg-neutral-950 border-neutral-800'
                  }`}
                >
                  {/* Rank & Profile */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs shrink-0 ${rankBadgeClass}`}
                    >
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : rank}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {entry.avatar && entry.avatar.startsWith('http') ? (
                        <img src={entry.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <PixelIcon name={entry.avatar || 'anvil'} size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold truncate ${isMe ? 'text-amber-300 font-black' : 'text-neutral-200'}`}>
                          {entry.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-amber-500 text-neutral-950 font-black px-1 rounded">
                            ME
                          </span>
                        )}
                        {awkTitle && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-700 px-1 py-0.2 rounded font-bold">
                            ✨ {awkTitle}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 truncate">
                        <span className="text-amber-400 font-bold">+{entry.currentSwordLevel || entry.maxSwordLevel}강</span>
                        <span className="truncate">{entry.swordName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Stat Metric according to tab */}
                  <div className="text-right shrink-0">
                    {activeCategory === 'swordLevel' && (
                      <div>
                        <div className="text-sm font-black text-amber-300 font-mono">
                          +{entry.maxSwordLevel || entry.currentSwordLevel}강
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          CP: {(entry.combatPower || 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {activeCategory === 'combatPower' && (
                      <div>
                        <div className="text-xs sm:text-sm font-black text-cyan-300 font-mono flex items-center justify-end gap-1">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{(entry.combatPower || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          +{entry.currentSwordLevel}강 검
                        </div>
                      </div>
                    )}
                    {activeCategory === 'gold' && (
                      <div>
                        <div className="text-xs sm:text-sm font-black text-amber-400 font-mono flex items-center justify-end gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span>{(entry.gold || 0).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          다이아: {(entry.diamonds || 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {activeCategory === 'rebirth' && (
                      <div>
                        <div className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                          초월 {entry.superRebirthCount || 0}회 / 환생 {entry.rebirthCount || 0}회
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          세계 #{entry.worldId || 1}
                        </div>
                      </div>
                    )}
                    {activeCategory === 'tower' && (
                      <div>
                        <div className="text-xs sm:text-sm font-black text-rose-300 font-mono flex items-center justify-end gap-1">
                          <Castle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{entry.towerFloor || 1}층 돌파</span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          던전 {entry.highestStage || 1}구역
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
          <span>* 랭킹은 30초마다 자동 갱신되며, [내 기록 랭킹 등록] 시 즉시 반영됩니다.</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded cursor-pointer transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
