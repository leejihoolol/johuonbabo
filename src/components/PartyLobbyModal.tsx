import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, Play, LogIn, LogOut, Check, X, Shield, Swords, Sparkles,
  MessageSquare, Send, Crown, RefreshCw, KeyRound, Globe, Flame, Building2, Skull
} from 'lucide-react';
import { PartyChatMessage, PartyMember, PartyRoom, PartyTargetType, PlayerStats, Sword } from '../types';
import {
  createPartyRoom,
  joinPartyRoom,
  leavePartyRoom,
  togglePlayerReady,
  startPartyBattle,
  sendPartyMessage,
  subscribeToPartyRoom,
  subscribeToPartyMessages,
  subscribeToPublicParties,
  getOrCreatePlayerId,
} from '../utils/firebaseParty';
import { sound } from '../utils/sound';
import { WORLDS_DATA } from '../data/worlds';
import { DUNGEON_STAGES } from '../data/dungeons';
import { WORLD_BOSSES_DATA, SPIRE_FLOORS_DATA } from '../data/contentsData';

interface PartyLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  currentSword: Sword;
  onUpdateStats?: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onStartPartyCombat?: (room: PartyRoom) => void;
  onStartBattle?: (room: PartyRoom) => void;
  initialTarget?: {
    type: PartyTargetType;
    id: string | number;
    title: string;
    bossHp: number;
    bossMaxHp: number;
    bossName: string;
    bossSpriteType?: any;
    bossColor?: string;
  };
  presetTarget?: {
    type: PartyTargetType;
    id: string | number;
    title: string;
    bossHp: number;
    bossMaxHp: number;
    bossName: string;
    bossSpriteType?: any;
    bossColor?: string;
  };
}

export const PartyLobbyModal: React.FC<PartyLobbyModalProps> = ({
  isOpen,
  onClose,
  stats,
  currentSword,
  onUpdateStats,
  onStartPartyCombat,
  onStartBattle,
  initialTarget,
  presetTarget,
}) => {
  const targetConfig = presetTarget || initialTarget;
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'room'>('browse');
  const [publicRooms, setPublicRooms] = useState<PartyRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<PartyRoom | null>(null);
  const [messages, setMessages] = useState<PartyChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [codeJoinInput, setCodeJoinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Player identity
  const [playerName, setPlayerName] = useState(stats.playerName || `검사_${Math.floor(Math.random() * 900 + 100)}`);
  const [playerAvatar, setPlayerAvatar] = useState(stats.playerAvatar || '⚔️');

  // Room Creation Options
  const [createTargetType, setCreateTargetType] = useState<PartyTargetType>(targetConfig?.type || 'world_boss');
  const [createTargetId, setCreateTargetId] = useState<string | number>(targetConfig?.id || 'boss_solaris');
  const [customRoomName, setCustomRoomName] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const playerUid = getOrCreatePlayerId();

  // Save profile name
  const saveProfile = (newName: string, newAvatar: string) => {
    setPlayerName(newName);
    setPlayerAvatar(newAvatar);
    onUpdateStats((prev) => ({
      ...prev,
      playerName: newName,
      playerAvatar: newAvatar,
    }));
  };

  // Build my party member payload
  const buildMyMemberInfo = (): PartyMember => ({
    uid: playerUid,
    name: playerName,
    avatar: playerAvatar,
    swordName: currentSword.name,
    swordLevel: stats.currentSwordLevel,
    swordAtk: currentSword.atk,
    isHost: false,
    isReady: false,
    currentHp: 1000,
    maxHp: 1000,
    totalDamage: 0,
    lastActive: Date.now(),
  });

  // Subscribe to public rooms when in browse tab
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToPublicParties((rooms) => {
      setPublicRooms(rooms);
    });
    return () => unsub();
  }, [isOpen]);

  // Subscribe to active room
  useEffect(() => {
    if (!activeRoomId) {
      setCurrentRoom(null);
      return;
    }
    const unsubRoom = subscribeToPartyRoom(
      activeRoomId,
      (room) => {
        if (!room) {
          setActiveRoomId(null);
          setCurrentRoom(null);
          setActiveTab('browse');
          setErrorMessage('파티 방이 해산되었거나 종료되었습니다.');
          return;
        }
        setCurrentRoom(room);
        setActiveTab('room');

        // If battle started, notify parent to switch to party combat mode!
        if (room.status === 'battling') {
          onStartPartyCombat(room);
        }
      },
      (err) => {
        setErrorMessage('파티 통신 오류가 발생했습니다.');
      }
    );

    const unsubMsgs = subscribeToPartyMessages(activeRoomId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      unsubRoom();
      unsubMsgs();
    };
  }, [activeRoomId]);

  // Create Room Handler
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let title = '';
      let bossHp = 1000000;
      let bossMaxHp = 1000000;
      let bossName = '보스';
      let bossSpriteType: any = 'dragon';
      let bossColor = '#ef4444';

      if (createTargetType === 'world_boss') {
        const wb = WORLD_BOSSES_DATA.find((b) => b.id === createTargetId) || WORLD_BOSSES_DATA[0];
        title = `월드 보스 [${wb.name}]`;
        bossHp = wb.maxHp;
        bossMaxHp = wb.maxHp;
        bossName = wb.name;
        bossSpriteType = wb.spriteType;
        bossColor = wb.color;
      } else if (createTargetType === 'dungeon') {
        const world = WORLDS_DATA.find((w) => w.id === Number(createTargetId)) || WORLDS_DATA[0];
        const worldStages = DUNGEON_STAGES.filter((s) => s.worldId === world.id);
        const lastStage = worldStages[worldStages.length - 1] || DUNGEON_STAGES[0];
        title = `${world.name} [${lastStage.name}]`;
        bossHp = lastStage.boss.maxHp;
        bossMaxHp = lastStage.boss.maxHp;
        bossName = lastStage.boss.name;
        bossSpriteType = lastStage.boss.spriteType;
        bossColor = lastStage.boss.color;
      } else {
        const floorNum = Number(createTargetId) || 10;
        const fl = SPIRE_FLOORS_DATA[floorNum - 1] || SPIRE_FLOORS_DATA[9];
        title = `무한의 검탑 [${floorNum}층]`;
        bossHp = fl.monster.maxHp;
        bossMaxHp = fl.monster.maxHp;
        bossName = fl.monster.name;
        bossSpriteType = fl.monster.spriteType;
        bossColor = fl.monster.color;
      }

      const myInfo = { ...buildMyMemberInfo(), isHost: true, isReady: true };
      const roomId = await createPartyRoom({
        roomName: customRoomName.trim() || `${playerName}의 ${title} 공략대`,
        targetType: createTargetType,
        targetId: createTargetId,
        targetTitle: title,
        host: myInfo,
        bossHp,
        bossMaxHp,
        bossName,
        bossSpriteType,
        bossColor,
      });

      setActiveRoomId(roomId);
      sound.playSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '방 생성에 실패했습니다.');
      sound.playFail();
    } finally {
      setIsLoading(false);
    }
  };

  // Join Room Handler
  const handleJoinRoom = async (roomIdOrCode: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const myInfo = buildMyMemberInfo();
      const roomId = await joinPartyRoom(roomIdOrCode, myInfo);
      setActiveRoomId(roomId);
      sound.playSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '방 입장에 실패했습니다.');
      sound.playFail();
    } finally {
      setIsLoading(false);
    }
  };

  // Leave Room Handler
  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    try {
      await leavePartyRoom(activeRoomId, playerUid);
      setActiveRoomId(null);
      setCurrentRoom(null);
      setActiveTab('browse');
    } catch (err) {
      console.error(err);
    }
  };

  // Ready / Unready
  const handleToggleReady = async () => {
    if (!activeRoomId || !currentRoom) return;
    const myMember = currentRoom.members[playerUid];
    if (!myMember) return;
    await togglePlayerReady(activeRoomId, playerUid, !myMember.isReady);
  };

  // Start Battle (Host Only)
  const handleStartBattle = async () => {
    if (!activeRoomId || !currentRoom) return;
    const members = Object.values(currentRoom.members) as PartyMember[];
    const unready = members.find((m) => !m.isReady);
    if (unready) {
      setErrorMessage(`${unready.name}님이 아직 준비(Ready)하지 않았습니다.`);
      sound.playFail();
      return;
    }
    sound.playBossRoar();
    await startPartyBattle(activeRoomId);
  };

  // Chat / Emote Send
  const handleSendMessage = async (text: string) => {
    if (!activeRoomId || !text.trim()) return;
    await sendPartyMessage(activeRoomId, playerUid, playerName, text.trim());
    setChatInput('');
  };

  if (!isOpen) return null;

  const isHost = currentRoom?.hostUid === playerUid;
  const myMember = currentRoom?.members[playerUid];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-pixel p-2 sm:p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-neutral-950 border-2 border-indigo-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-500 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-2">
                <span>실시간 멀티 파티 레이드 (Firebase Co-op)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500 font-mono">
                  LIVE SYNC ON
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                다른 검사들과 실시간으로 파티를 결성하여 던전, 월드보스, 검탑을 함께 정복하세요!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile / Nickname Bar */}
        <div className="bg-neutral-900/60 border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">내 헌터 프로필:</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => saveProfile(e.target.value, playerAvatar)}
              placeholder="닉네임 입력"
              maxLength={12}
              className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-amber-300 font-bold w-28 sm:w-36 focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center gap-1">
              {['⚔️', '🧙', '🥷', '👑', '🔥', '⚡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => saveProfile(playerName, emoji)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer border ${
                    playerAvatar === emoji ? 'border-amber-400 bg-amber-950' : 'border-transparent hover:bg-neutral-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2">
            <span>현재 검: <strong className="text-amber-300">+{stats.currentSwordLevel} {currentSword.name}</strong></span>
            <span className="text-neutral-600">|</span>
            <span>공격력: <strong className="text-red-400">{currentSword.atk.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Navigation Tabs (if not inside room) */}
        {!currentRoom && (
          <div className="flex border-b border-neutral-800 bg-neutral-900">
            <button
              onClick={() => { setActiveTab('browse'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
                activeTab === 'browse'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-950/40'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>공개 파티 목록 ({publicRooms.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('create'); setErrorMessage(null); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
                activeTab === 'create'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-950/40'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>새 파티방 개설하기</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-red-950/80 border-b border-red-800 text-red-300 text-xs px-4 py-2 flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* TAB 1: BROWSE ROOMS & CODE JOIN */}
          {activeTab === 'browse' && !currentRoom && (
            <div className="flex flex-col gap-5">
              {/* Quick Code Join Box */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-200">초대 코드로 직접 입장:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={codeJoinInput}
                    onChange={(e) => setCodeJoinInput(e.target.value.toUpperCase())}
                    placeholder="예: SW-A9B2"
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 tracking-wider uppercase focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handleJoinRoom(codeJoinInput)}
                    disabled={isLoading || !codeJoinInput.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>입장</span>
                  </button>
                </div>
              </div>

              {/* Public Rooms List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                    <span>현재 모집 중인 실시간 파티</span>
                    <span className="text-[10px] text-neutral-500 font-mono">자동 갱신 중</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>직접 방 만들기</span>
                  </button>
                </div>

                {publicRooms.length === 0 ? (
                  <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>현재 모집 중인 파티가 없습니다.</p>
                    <p className="mt-1 text-[11px] text-neutral-600">첫 번째 파티 방을 만들어 동료 검사들을 모집해보세요!</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>파티방 개설하기</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {publicRooms.map((r) => {
                      const memberCount = Object.keys(r.members || {}).length;
                      const isFull = memberCount >= (r.maxMembers || 4);
                      return (
                        <div
                          key={r.id}
                          className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] bg-neutral-950 border border-neutral-700 px-1.5 py-0.5 rounded font-mono text-amber-300">
                                  {r.roomCode}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  r.status === 'battling' ? 'bg-red-950 text-red-300 border border-red-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                }`}>
                                  {r.status === 'battling' ? '🔥 전투 진행중' : '대기중'}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{r.roomName}</h4>
                              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                                <span>타겟: <strong className="text-indigo-300">{r.targetTitle}</strong></span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono text-neutral-300 font-bold bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                                {memberCount} / {r.maxMembers || 4}명
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                            <span className="text-[10px] text-neutral-500">방장: {r.hostName}</span>
                            <button
                              onClick={() => handleJoinRoom(r.id)}
                              disabled={isFull && !r.members[playerUid]}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1 transition-all"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{r.members[playerUid] ? '재입장' : isFull ? '정원 초과' : '참여하기'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ROOM */}
          {activeTab === 'create' && !currentRoom && (
            <div className="max-w-xl mx-auto flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>새로운 파티 레이드 방 설정</span>
              </h3>

              {/* Target Type Selector */}
              <div>
                <label className="text-xs text-neutral-400 block mb-1.5 font-bold">1. 도전할 컨텐츠 선택:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateTargetType('world_boss');
                      setCreateTargetId('boss_solaris');
                    }}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      createTargetType === 'world_boss'
                        ? 'border-red-500 bg-red-950/60 text-red-200'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-5 h-5 text-red-400" />
                    <span>월드 보스 토벌</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateTargetType('spire');
                      setCreateTargetId(10);
                    }}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      createTargetType === 'spire'
                        ? 'border-indigo-500 bg-indigo-950/60 text-indigo-200'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    <span>무한의 검탑</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateTargetType('dungeon');
                      setCreateTargetId(1);
                    }}
                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      createTargetType === 'dungeon'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Skull className="w-5 h-5 text-emerald-400" />
                    <span>10대 월드 던전</span>
                  </button>
                </div>
              </div>

              {/* Sub Target Detailed Selector */}
              <div>
                <label className="text-xs text-neutral-400 block mb-1.5 font-bold">2. 세부 보스 / 층수 선택:</label>
                {createTargetType === 'world_boss' && (
                  <select
                    value={createTargetId}
                    onChange={(e) => setCreateTargetId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-200 font-bold focus:outline-none focus:border-indigo-400"
                  >
                    {WORLD_BOSSES_DATA.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (HP: {b.maxHp.toLocaleString()} / 제한시간 60초)
                      </option>
                    ))}
                  </select>
                )}

                {createTargetType === 'spire' && (
                  <select
                    value={createTargetId}
                    onChange={(e) => setCreateTargetId(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-200 font-bold focus:outline-none focus:border-indigo-400"
                  >
                    {[10, 20, 30, 40, 50].map((f) => (
                      <option key={f} value={f}>
                        제 {f}층 보스 ({SPIRE_FLOORS_DATA[f - 1]?.monster.name})
                      </option>
                    ))}
                  </select>
                )}

                {createTargetType === 'dungeon' && (
                  <select
                    value={createTargetId}
                    onChange={(e) => setCreateTargetId(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-200 font-bold focus:outline-none focus:border-indigo-400"
                  >
                    {WORLDS_DATA.map((w) => {
                      const worldStages = DUNGEON_STAGES.filter((s) => s.worldId === w.id);
                      const lastStage = worldStages[worldStages.length - 1] || DUNGEON_STAGES[0];
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} (최종 보스: {lastStage.boss.name})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Custom Room Name */}
              <div>
                <label className="text-xs text-neutral-400 block mb-1.5 font-bold">3. 파티방 제목 (선택):</label>
                <input
                  type="text"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  placeholder="예: 초보 환영! 10층 보스 함께 깰 파티원 구해요"
                  maxLength={30}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-lg cursor-pointer transition-all"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="flex-2 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isLoading ? '방 개설 중...' : '파티방 개설 및 대기실 입장'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: INSIDE PARTY ROOM LOBBY */}
          {currentRoom && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column: Room Info & Member Slots */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Room Info Header */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-600 font-mono font-bold">
                        코드: {currentRoom.roomCode}
                      </span>
                      <span className="text-xs text-indigo-400 font-bold">
                        {currentRoom.targetTitle}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{currentRoom.roomName}</h3>
                  </div>

                  <button
                    onClick={handleLeaveRoom}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-red-950 hover:text-red-300 text-neutral-400 text-xs rounded-lg font-bold flex items-center gap-1.5 cursor-pointer border border-neutral-700 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>파티 나가기</span>
                  </button>
                </div>

                {/* Member Slots (4 Slots) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: currentRoom.maxMembers || 4 }).map((_, idx) => {
                    const memberList = (Object.values(currentRoom.members || {})) as PartyMember[];
                    const member = memberList[idx];

                    if (!member) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-neutral-600 min-h-[110px]"
                        >
                          <Users className="w-6 h-6 opacity-30" />
                          <span className="text-xs">빈 슬롯 (파티원 대기 중)</span>
                          <span className="text-[10px] text-neutral-700 font-mono">코드 {currentRoom.roomCode} 공유</span>
                        </div>
                      );
                    }

                    const isMe = member.uid === playerUid;
                    return (
                      <div
                        key={member.uid}
                        className={`bg-neutral-900 border-2 rounded-xl p-3.5 flex flex-col justify-between gap-2 transition-all ${
                          member.isReady ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{member.avatar || '⚔️'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{member.name}</span>
                                {isMe && <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 rounded font-mono">ME</span>}
                                {member.isHost && (
                                  <span className="text-[9px] bg-amber-950 text-amber-300 px-1 rounded font-bold border border-amber-600 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> 방장
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono">
                                +{member.swordLevel} {member.swordName}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-1 rounded font-bold border ${
                              member.isReady
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : 'bg-neutral-950 text-neutral-500 border-neutral-700'
                            }`}>
                              {member.isReady ? 'READY ✓' : '준비중...'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-neutral-400 pt-1.5 border-t border-neutral-800 flex items-center justify-between">
                          <span>공격력: <strong className="text-red-400">{member.swordAtk.toLocaleString()}</strong></span>
                          <span className="text-neutral-500 font-mono">{member.currentHp} / {member.maxHp} HP</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Control Action Buttons */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-neutral-400">
                    {isHost
                      ? '모든 파티원이 READY 상태가 되면 결전을 시작할 수 있습니다.'
                      : '준비가 완료되면 [준비 완료] 버튼을 눌러주세요.'}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isHost && (
                      <button
                        onClick={handleToggleReady}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                          myMember?.isReady
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{myMember?.isReady ? '준비 해제' : '준비 완료 (READY)'}</span>
                      </button>
                    )}

                    {isHost && (
                      <button
                        onClick={handleStartBattle}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950 transition-all hover:scale-105"
                      >
                        <Play className="w-4 h-4" />
                        <span>파티 레이드 시작 (START)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Chat & Emotes */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex flex-col h-80 lg:h-auto">
                <div className="text-xs font-bold text-neutral-300 flex items-center gap-1.5 pb-2 border-b border-neutral-800 mb-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>실시간 파티 챗 & 빠른 감정표현</span>
                </div>

                {/* Quick Emote Bar */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {['⚔️ 딜 집중!', '💨 피하세요!', '🔥 가자!', '👍 나이스!', '💖 파이팅!', '🎉 승리!'].map((emote) => (
                    <button
                      key={emote}
                      onClick={() => handleSendMessage(emote)}
                      className="text-[10px] bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1 px-1.5 rounded border border-neutral-800 cursor-pointer truncate"
                    >
                      {emote}
                    </button>
                  ))}
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs mb-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-[11px] text-neutral-600 py-8">
                      파티원들과 대화를 시작해보세요!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-1.5 rounded text-[11px] ${
                          msg.senderUid === playerUid
                            ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-900/60 ml-3'
                            : 'bg-neutral-950 text-neutral-300 border border-neutral-800 mr-3'
                        }`}
                      >
                        <div className="text-[9px] text-neutral-500 font-bold mb-0.5">
                          {msg.senderName}
                        </div>
                        <div className="break-words">{msg.text}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(chatInput);
                  }}
                  className="flex items-center gap-1.5 pt-2 border-t border-neutral-800"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="메시지 입력..."
                    maxLength={50}
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
