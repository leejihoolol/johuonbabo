import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { PartyChatMessage, PartyMember, PartyRoom, PartyTargetType } from '../types';

// Generate a memorable 6-character room code (e.g. SW-8942)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'SW-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random stable unique player ID if none exists in localStorage
export function getOrCreatePlayerId(): string {
  const key = 'pixel_sword_player_uid';
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem(key, uid);
  }
  return uid;
}

// Create a new Party Room
export async function createPartyRoom(params: {
  roomName: string;
  targetType: PartyTargetType;
  targetId: string | number;
  targetTitle: string;
  host: PartyMember;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  bossSpriteType?: any;
  bossColor?: string;
  maxMembers?: number;
}): Promise<string> {
  const roomCode = generateRoomCode();
  const partyRef = doc(collection(db, 'parties'));
  const roomId = partyRef.id;

  const newRoom: PartyRoom = {
    id: roomId,
    roomCode,
    roomName: params.roomName || `${params.host.name}의 ${params.targetTitle} 파티`,
    targetType: params.targetType,
    targetId: params.targetId,
    targetTitle: params.targetTitle,
    hostUid: params.host.uid,
    hostName: params.host.name,
    status: 'waiting',
    maxMembers: params.maxMembers || 4,
    members: {
      [params.host.uid]: {
        ...params.host,
        isHost: true,
        isReady: true,
      },
    },
    bossHp: params.bossHp,
    bossMaxHp: params.bossMaxHp,
    bossName: params.bossName,
    bossSpriteType: params.bossSpriteType,
    bossColor: params.bossColor,
    createdAt: Date.now(),
  };

  await setDoc(partyRef, newRoom);
  return roomId;
}

// Join Party Room by Room ID or Code
export async function joinPartyRoom(roomIdOrCode: string, member: PartyMember): Promise<string> {
  let targetDocRef = doc(db, 'parties', roomIdOrCode);
  let snap = await getDoc(targetDocRef);

  if (!snap.exists()) {
    // Search by code
    const q = query(collection(db, 'parties'), where('roomCode', '==', roomIdOrCode.toUpperCase().trim()));
    const querySnap = await (await import('firebase/firestore')).getDocs(q);
    if (querySnap.empty) {
      throw new Error('존재하지 않는 파티 방 코드입니다.');
    }
    targetDocRef = querySnap.docs[0].ref;
    snap = querySnap.docs[0];
  }

  const room = snap.data() as PartyRoom;
  const currentMembers = room.members || {};
  const memberKeys = Object.keys(currentMembers);

  if (!currentMembers[member.uid] && memberKeys.length >= (room.maxMembers || 4)) {
    throw new Error('파티 정원이 가득 찼습니다.');
  }

  if (room.status === 'victory') {
    throw new Error('이미 종료된 파티입니다.');
  }

  // Add or update member
  currentMembers[member.uid] = {
    ...member,
    isHost: room.hostUid === member.uid,
    isReady: room.hostUid === member.uid ? true : member.isReady,
    lastActive: Date.now(),
  };

  await updateDoc(targetDocRef, {
    members: currentMembers,
  });

  return targetDocRef.id;
}

// Leave Party Room
export async function leavePartyRoom(roomId: string, memberUid: string): Promise<void> {
  try {
    const roomRef = doc(db, 'parties', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as PartyRoom;
    const members = { ...room.members };
    delete members[memberUid];

    const remainingKeys = Object.keys(members);
    if (remainingKeys.length === 0) {
      // Delete empty room
      await deleteDoc(roomRef);
    } else {
      let nextHostUid = room.hostUid;
      let nextHostName = room.hostName;
      if (room.hostUid === memberUid) {
        nextHostUid = remainingKeys[0];
        nextHostName = members[nextHostUid].name;
        members[nextHostUid].isHost = true;
        members[nextHostUid].isReady = true;
      }
      await updateDoc(roomRef, {
        members,
        hostUid: nextHostUid,
        hostName: nextHostName,
      });
    }
  } catch (err) {
    console.error('Error leaving party room:', err);
  }
}

// Toggle Ready
export async function togglePlayerReady(roomId: string, memberUid: string, isReady: boolean): Promise<void> {
  const roomRef = doc(db, 'parties', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const room = snap.data() as PartyRoom;
  if (!room.members[memberUid]) return;

  const updatedMembers = {
    ...room.members,
    [memberUid]: {
      ...room.members[memberUid],
      isReady,
      lastActive: Date.now(),
    },
  };

  await updateDoc(roomRef, {
    members: updatedMembers,
  });
}

// Host Starts the Battle
export async function startPartyBattle(roomId: string): Promise<void> {
  const roomRef = doc(db, 'parties', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const room = snap.data() as PartyRoom;

  // Reset totalDamage for all members at battle start
  const members = { ...room.members };
  Object.keys(members).forEach((uid) => {
    members[uid] = {
      ...members[uid],
      totalDamage: 0,
      currentHp: members[uid].maxHp || 1000,
    };
  });

  await updateDoc(roomRef, {
    status: 'battling',
    bossHp: room.bossMaxHp,
    startedAt: Date.now(),
    members,
  });
}

// Reset Room back to Waiting Lobby for Rematch
export async function resetPartyRoomToLobby(roomId: string): Promise<void> {
  try {
    const roomRef = doc(db, 'parties', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const room = snap.data() as PartyRoom;

    const members = { ...room.members };
    Object.keys(members).forEach((uid) => {
      members[uid] = {
        ...members[uid],
        isReady: members[uid].isHost,
        totalDamage: 0,
        currentHp: members[uid].maxHp || 1000,
      };
    });

    await updateDoc(roomRef, {
      status: 'waiting',
      bossHp: room.bossMaxHp,
      startedAt: null,
      clearedAt: null,
      members,
    });
  } catch (err) {
    console.error('Error resetting party room:', err);
  }
}

// Sync Party Damage & Boss HP with atomic runTransaction
export async function dealPartyBossDamage(
  roomId: string,
  memberUid: string,
  damage: number,
  newPlayerHp?: number
): Promise<void> {
  if (damage <= 0) return;
  try {
    const roomRef = doc(db, 'parties', roomId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(roomRef);
      if (!snap.exists()) return;

      const room = snap.data() as PartyRoom;
      if (room.status !== 'battling') return;

      const currentMember = room.members?.[memberUid];
      if (!currentMember) return;

      const currentHp = room.bossHp ?? room.bossMaxHp;
      const nextBossHp = Math.max(0, currentHp - damage);
      const nextTotalDamage = (currentMember.totalDamage || 0) + damage;
      const isVictory = nextBossHp <= 0;

      const updatedMembers = {
        ...room.members,
        [memberUid]: {
          ...currentMember,
          totalDamage: nextTotalDamage,
          currentHp: newPlayerHp !== undefined ? newPlayerHp : currentMember.currentHp,
          lastActive: Date.now(),
        },
      };

      const updatePayload: any = {
        bossHp: nextBossHp,
        members: updatedMembers,
      };

      if (isVictory) {
        updatePayload.status = 'victory';
        updatePayload.clearedAt = Date.now();
      }

      transaction.update(roomRef, updatePayload);
    });
  } catch (err) {
    console.error('Error in dealPartyBossDamage transaction:', err);
  }
}

// Send Party Chat Message
export async function sendPartyMessage(
  roomId: string,
  senderUid: string,
  senderName: string,
  text: string,
  isSystem = false
): Promise<void> {
  try {
    const chatColl = collection(db, 'parties', roomId, 'messages');
    await addDoc(chatColl, {
      senderUid,
      senderName,
      text,
      timestamp: Date.now(),
      isSystem,
    });
  } catch (err) {
    console.error('Error sending party message:', err);
  }
}

// Subscribe to Live Party Room
export function subscribeToPartyRoom(
  roomId: string,
  onUpdate: (room: PartyRoom | null) => void,
  onError?: (err: Error) => void
) {
  const roomRef = doc(db, 'parties', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as PartyRoom);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Party room snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to Party Chat Messages
export function subscribeToPartyMessages(
  roomId: string,
  onUpdate: (messages: PartyChatMessage[]) => void
) {
  const chatColl = collection(db, 'parties', roomId, 'messages');
  const q = query(chatColl, orderBy('timestamp', 'asc'), limit(50));
  return onSnapshot(q, (snap) => {
    const msgs: PartyChatMessage[] = [];
    snap.forEach((d) => {
      msgs.push({ id: d.id, ...d.data() } as PartyChatMessage);
    });
    onUpdate(msgs);
  });
}

// Subscribe to Public Available Party Rooms
export function subscribeToPublicParties(
  onUpdate: (rooms: PartyRoom[]) => void
) {
  const partiesColl = collection(db, 'parties');
  const q = query(partiesColl, where('status', 'in', ['waiting', 'battling']), limit(20));
  return onSnapshot(q, (snap) => {
    const rooms: PartyRoom[] = [];
    snap.forEach((d) => {
      rooms.push({ id: d.id, ...d.data() } as PartyRoom);
    });
    // Sort in memory by createdAt desc
    rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onUpdate(rooms);
  });
}
