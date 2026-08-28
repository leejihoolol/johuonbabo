import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  TradeListing,
  TradeRoom,
  TradeOffer,
  TradeChatMessage,
  TradeItemType,
  TradePriceType,
  StoredSword,
  Rune,
  SocketGem,
} from '../types';

// Generate a memorable 6-character trade room code (e.g. TR-7821)
export function generateTradeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'TR-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const EMPTY_OFFER: TradeOffer = {
  gold: 0,
  diamonds: 0,
  stones: 0,
  scrolls: 0,
  potions: 0,
  spiritDust: 0,
  shards: 0,
  raidTokens: 0,
  rebirths: 0,
  superRebirths: 0,
  rebirthPoints: 0,
  cheatPass: false,
  storedSwords: [],
  runes: [],
  gems: [],
};

// ==========================================
// 1. Marketplace Listings (자유 거래소)
// ==========================================

export async function createMarketListing(params: {
  sellerUid: string;
  sellerName: string;
  sellerAvatar: string;
  itemType: TradeItemType;
  itemTitle: string;
  itemAmount: number;
  itemData?: {
    storedSword?: StoredSword;
    rune?: Rune;
    socketGem?: SocketGem;
    rebirthAmount?: number;
    superRebirthAmount?: number;
    rebirthPointsAmount?: number;
    isCheatPass?: boolean;
  };
  priceType: TradePriceType;
  priceAmount: number;
}): Promise<string> {
  const listingRef = doc(collection(db, 'trade_listings'));
  const newListing: TradeListing = {
    id: listingRef.id,
    sellerUid: params.sellerUid,
    sellerName: params.sellerName,
    sellerAvatar: params.sellerAvatar || '⚔️',
    itemType: params.itemType,
    itemTitle: params.itemTitle,
    itemAmount: Math.max(1, params.itemAmount || 1),
    itemData: params.itemData || {},
    priceType: params.priceType,
    priceAmount: Math.max(1, params.priceAmount),
    status: 'active',
    createdAt: Date.now(),
  };

  await setDoc(listingRef, newListing);
  return listingRef.id;
}

// Subscribe to Active Marketplace Listings (Real User Items Only)
export function subscribeToMarketListings(
  onUpdate: (listings: TradeListing[]) => void,
  onError?: (err: Error) => void
) {
  const listingsColl = collection(db, 'trade_listings');
  const q = query(listingsColl, where('status', '==', 'active'), limit(50));

  // Purge any legacy bot listings immediately
  purgeBotListings();

  return onSnapshot(
    q,
    (snap) => {
      const list: TradeListing[] = [];
      snap.forEach((d) => {
        const data = d.data() as TradeListing;
        // Ignore any bot listings
        if (data.sellerUid && data.sellerUid.startsWith('bot_')) {
          deleteDoc(doc(db, 'trade_listings', d.id)).catch(() => {});
          return;
        }
        list.push({ id: d.id, ...data });
      });

      // Sort in memory by createdAt desc
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.error('Market listings snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Purge any bot seed listings from Firestore
export async function purgeBotListings(): Promise<void> {
  try {
    const listingsColl = collection(db, 'trade_listings');
    const snap = await getDocs(listingsColl);
    const botDeletions: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.sellerUid && (data.sellerUid.startsWith('bot_') || data.sellerUid.startsWith('bot_seller_'))) {
        botDeletions.push(deleteDoc(doc(db, 'trade_listings', d.id)));
      }
    });
    if (botDeletions.length > 0) {
      await Promise.all(botDeletions);
    }
  } catch (e) {
    console.warn('Purge bot listings error:', e);
  }
}

// Subscribe to My Listings (both active and sold)
export function subscribeToMyMarketListings(
  myUid: string,
  onUpdate: (listings: TradeListing[]) => void
) {
  const listingsColl = collection(db, 'trade_listings');
  const q = query(listingsColl, where('sellerUid', '==', myUid), limit(30));
  return onSnapshot(q, (snap) => {
    const list: TradeListing[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as TradeListing);
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onUpdate(list);
  });
}

// Buy an Active Listing Atomically
export async function buyMarketListing(params: {
  listingId: string;
  buyerUid: string;
  buyerName: string;
}): Promise<TradeListing> {
  const listingRef = doc(db, 'trade_listings', params.listingId);
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(listingRef);
    if (!snap.exists()) {
      throw new Error('해당 거래소 등록 물품이 존재하지 않습니다.');
    }
    const listing = snap.data() as TradeListing;
    if (listing.status !== 'active') {
      throw new Error('이미 판매되었거나 취소된 거래 품목입니다.');
    }
    if (listing.sellerUid === params.buyerUid) {
      throw new Error('자신이 등록한 물품은 직접 구매할 수 없습니다.');
    }

    transaction.update(listingRef, {
      status: 'sold',
      buyerUid: params.buyerUid,
      buyerName: params.buyerName,
      soldAt: Date.now(),
    });

    return {
      ...listing,
      status: 'sold',
      buyerUid: params.buyerUid,
      buyerName: params.buyerName,
      soldAt: Date.now(),
    };
  });
}

// Cancel Active Listing
export async function cancelMarketListing(listingId: string, sellerUid: string): Promise<TradeListing> {
  const listingRef = doc(db, 'trade_listings', listingId);
  const snap = await getDoc(listingRef);
  if (!snap.exists()) {
    throw new Error('물품을 찾을 수 없습니다.');
  }
  const listing = snap.data() as TradeListing;
  if (listing.sellerUid !== sellerUid) {
    throw new Error('자신의 등록 물품만 취소할 수 있습니다.');
  }
  if (listing.status !== 'active') {
    throw new Error('이미 판매되었거나 취소된 물품입니다.');
  }

  await updateDoc(listingRef, {
    status: 'cancelled',
  });

  return { ...listing, status: 'cancelled' };
}

// Delete / Acknowledge Settled Listing
export async function deleteMarketListing(listingId: string): Promise<void> {
  try {
    const listingRef = doc(db, 'trade_listings', listingId);
    await deleteDoc(listingRef);
  } catch (err) {
    console.error('Error deleting listing:', err);
  }
}

// ==========================================
// 2. Real-time 1:1 P2P Direct Trade Rooms
// ==========================================

export async function createDirectTradeRoom(params: {
  hostUid: string;
  hostName: string;
  hostAvatar?: string;
}): Promise<string> {
  const roomCode = generateTradeRoomCode();
  const roomRef = doc(collection(db, 'trade_rooms'));
  const roomId = roomRef.id;

  const newRoom: TradeRoom = {
    id: roomId,
    roomCode,
    hostUid: params.hostUid,
    hostName: params.hostName,
    hostAvatar: params.hostAvatar || '⚔️',
    guestUid: null,
    guestName: null,
    guestAvatar: null,
    status: 'waiting',
    hostOffer: { ...EMPTY_OFFER },
    guestOffer: { ...EMPTY_OFFER },
    hostLocked: false,
    guestLocked: false,
    hostConfirmed: false,
    guestConfirmed: false,
    createdAt: Date.now(),
  };

  await setDoc(roomRef, newRoom);
  return roomId;
}

// Join Direct Trade Room by Room ID or Code
export async function joinDirectTradeRoom(params: {
  roomIdOrCode: string;
  guestUid: string;
  guestName: string;
  guestAvatar?: string;
}): Promise<string> {
  let targetDocRef = doc(db, 'trade_rooms', params.roomIdOrCode);
  let snap = await getDoc(targetDocRef);

  if (!snap.exists()) {
    // Try finding by roomCode
    const q = query(
      collection(db, 'trade_rooms'),
      where('roomCode', '==', params.roomIdOrCode.toUpperCase().trim())
    );
    const querySnap = await getDocs(q);
    if (querySnap.empty) {
      throw new Error('존재하지 않는 거래 방 코드입니다.');
    }
    targetDocRef = querySnap.docs[0].ref;
    snap = querySnap.docs[0];
  }

  const room = snap.data() as TradeRoom;
  if (room.status === 'completed' || room.status === 'cancelled') {
    throw new Error('이미 종료되었거나 취소된 거래 방입니다.');
  }

  if (room.hostUid === params.guestUid) {
    // Re-joining as host
    return targetDocRef.id;
  }

  if (room.guestUid && room.guestUid !== params.guestUid) {
    throw new Error('이미 다른 플레이어가 참여 중인 거래 방입니다.');
  }

  await updateDoc(targetDocRef, {
    guestUid: params.guestUid,
    guestName: params.guestName,
    guestAvatar: params.guestAvatar || '🛡️',
    status: 'offering',
  });

  return targetDocRef.id;
}

// Leave / Cancel Direct Trade Room
export async function leaveDirectTradeRoom(roomId: string, userUid: string, reason = '거래가 취소되었습니다.'): Promise<void> {
  try {
    const roomRef = doc(db, 'trade_rooms', roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as TradeRoom;
    if (room.status === 'completed') return;

    await updateDoc(roomRef, {
      status: 'cancelled',
      cancelledReason: reason,
    });
  } catch (err) {
    console.error('Error leaving trade room:', err);
  }
}

// Update Trade Offer (modifying offer unlocks both players for safety)
export async function updateDirectTradeOffer(params: {
  roomId: string;
  isHost: boolean;
  offer: TradeOffer;
}): Promise<void> {
  const roomRef = doc(db, 'trade_rooms', params.roomId);
  const updatePayload: any = {
    [params.isHost ? 'hostOffer' : 'guestOffer']: params.offer,
    hostLocked: false,
    guestLocked: false,
    hostConfirmed: false,
    guestConfirmed: false,
    status: 'offering',
  };
  await updateDoc(roomRef, updatePayload);
}

// Lock / Unlock Offer
export async function setDirectTradeLock(params: {
  roomId: string;
  isHost: boolean;
  locked: boolean;
}): Promise<void> {
  const roomRef = doc(db, 'trade_rooms', params.roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;
  const room = snap.data() as TradeRoom;

  const nextHostLocked = params.isHost ? params.locked : room.hostLocked;
  const nextGuestLocked = !params.isHost ? params.locked : room.guestLocked;

  const nextStatus = nextHostLocked && nextGuestLocked ? 'locked' : 'offering';

  await updateDoc(roomRef, {
    [params.isHost ? 'hostLocked' : 'guestLocked']: params.locked,
    hostConfirmed: false,
    guestConfirmed: false,
    status: nextStatus,
  });
}

// Final Confirm Exchange
export async function confirmDirectTradeExchange(params: {
  roomId: string;
  isHost: boolean;
}): Promise<boolean> {
  const roomRef = doc(db, 'trade_rooms', params.roomId);
  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) throw new Error('거래 방이 존재하지 않습니다.');

    const room = snap.data() as TradeRoom;
    if (!room.hostLocked || !room.guestLocked) {
      throw new Error('양쪽 플레이어 모두 거래 내용을 먼저 잠금 확정해야 합니다.');
    }

    const nextHostConfirmed = params.isHost ? true : room.hostConfirmed;
    const nextGuestConfirmed = !params.isHost ? true : room.guestConfirmed;

    const isFullyCompleted = nextHostConfirmed && nextGuestConfirmed;

    const updatePayload: any = {
      [params.isHost ? 'hostConfirmed' : 'guestConfirmed']: true,
    };

    if (isFullyCompleted) {
      updatePayload.status = 'completed';
      updatePayload.completedAt = Date.now();
    }

    transaction.update(roomRef, updatePayload);
    return isFullyCompleted;
  });
}

// Subscribe to Trade Room
export function subscribeToTradeRoom(
  roomId: string,
  onUpdate: (room: TradeRoom | null) => void,
  onError?: (err: Error) => void
) {
  const roomRef = doc(db, 'trade_rooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as TradeRoom);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Trade room snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to Active Public Trade Rooms
export function subscribeToPublicTradeRooms(onUpdate: (rooms: TradeRoom[]) => void) {
  const coll = collection(db, 'trade_rooms');
  const q = query(coll, where('status', 'in', ['waiting', 'offering', 'locked']), limit(20));
  return onSnapshot(q, (snap) => {
    const list: TradeRoom[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as TradeRoom);
    });
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onUpdate(list);
  });
}

// Send Trade Chat Message
export async function sendTradeChatMessage(params: {
  roomId: string;
  senderUid: string;
  senderName: string;
  text: string;
  isSystem?: boolean;
}): Promise<void> {
  try {
    const chatColl = collection(db, 'trade_rooms', params.roomId, 'messages');
    await addDoc(chatColl, {
      senderUid: params.senderUid,
      senderName: params.senderName,
      text: params.text,
      timestamp: Date.now(),
      isSystem: params.isSystem || false,
    });
  } catch (err) {
    console.error('Error sending trade message:', err);
  }
}

// Subscribe to Trade Chat Messages
export function subscribeToTradeChatMessages(
  roomId: string,
  onUpdate: (messages: TradeChatMessage[]) => void
) {
  const chatColl = collection(db, 'trade_rooms', roomId, 'messages');
  const q = query(chatColl, orderBy('timestamp', 'asc'), limit(50));
  return onSnapshot(q, (snap) => {
    const list: TradeChatMessage[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as TradeChatMessage);
    });
    onUpdate(list);
  });
}
