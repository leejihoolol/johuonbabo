import { collection, doc, setDoc, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, isUserAdmin } from './firebase';
import { LeaderboardCategory, LeaderboardEntry, PlayerStats, Sword } from '../types';
import { User } from 'firebase/auth';

export function calculateCombatPower(stats: PlayerStats, currentSword: Sword): number {
  const baseAtk = currentSword.atk || 10;
  const swordLvl = stats.currentSwordLevel || 0;
  const awakeningMultiplier = 1 + (stats.swordAwakeningLevel || 0) * 1.5;
  const rebirthMult = 1 + (stats.rebirthCount || 0) * 0.5 + (stats.superRebirthCount || 0) * 5;
  const towerFloor = stats.spireMaxFloor || stats.towerHighestFloor || stats.towerFloor || 1;
  const stage = stats.highestStageCleared || 1;

  const cp = Math.floor(
    (baseAtk * (1 + swordLvl * 0.2) + towerFloor * 2500 + stage * 1000) * awakeningMultiplier * rebirthMult
  );
  return Math.max(10, cp);
}

export async function syncPlayerToLeaderboard(
  uid: string,
  user: User | null,
  stats: PlayerStats,
  currentSword: Sword,
  overrideName?: string,
  overrideAvatar?: string
): Promise<LeaderboardEntry | null> {
  if (!uid) return null;

  const combatPower = calculateCombatPower(stats, currentSword);
  const email = user?.email || '';
  const isAdmin = isUserAdmin(email);

  const entry: LeaderboardEntry = {
    uid,
    name: overrideName || stats.playerName || user?.displayName || '픽셀 대장장이',
    avatar: overrideAvatar || stats.playerAvatar || user?.photoURL || 'anvil',
    email,
    isAdmin,
    maxSwordLevel: Math.max(stats.maxSwordLevelReached || 0, stats.currentSwordLevel || 0),
    currentSwordLevel: stats.currentSwordLevel || 0,
    swordAwakeningLevel: stats.swordAwakeningLevel || 0,
    swordName: currentSword.name || '기본 픽셀 단검',
    combatPower,
    gold: stats.gold || 0,
    diamonds: stats.diamonds || 0,
    rebirthCount: stats.rebirthCount || 0,
    superRebirthCount: stats.superRebirthCount || 0,
    towerFloor: stats.spireMaxFloor || stats.towerHighestFloor || stats.towerFloor || 1,
    highestStage: stats.highestStageCleared || stats.currentStageId || 1,
    worldId: stats.currentWorldId || 1,
    updatedAt: Date.now(),
  };

  try {
    const leaderDocRef = doc(db, 'leaderboard', uid);
    await setDoc(leaderDocRef, entry, { merge: true });

    // Also update users collection
    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        uid,
        email,
        displayName: user?.displayName || entry.name,
        playerName: entry.name,
        playerAvatar: entry.avatar,
        isAdmin,
        lastLoginAt: Date.now(),
      },
      { merge: true }
    );

    return entry;
  } catch (err) {
    console.warn('Leaderboard sync error (using local state fallback):', err);
    return entry;
  }
}

export function subscribeToLeaderboard(
  category: LeaderboardCategory,
  callback: (entries: LeaderboardEntry[]) => void,
  limitCount = 100
): () => void {
  try {
    const leaderboardCol = collection(db, 'leaderboard');
    let q;

    switch (category) {
      case 'combatPower':
        q = query(leaderboardCol, orderBy('combatPower', 'desc'), limit(limitCount));
        break;
      case 'gold':
        q = query(leaderboardCol, orderBy('gold', 'desc'), limit(limitCount));
        break;
      case 'rebirth':
        q = query(leaderboardCol, orderBy('superRebirthCount', 'desc'), orderBy('rebirthCount', 'desc'), limit(limitCount));
        break;
      case 'tower':
        q = query(leaderboardCol, orderBy('towerFloor', 'desc'), limit(limitCount));
        break;
      case 'stage':
        q = query(leaderboardCol, orderBy('highestStage', 'desc'), limit(limitCount));
        break;
      case 'swordLevel':
      default:
        q = query(leaderboardCol, orderBy('maxSwordLevel', 'desc'), orderBy('swordAwakeningLevel', 'desc'), limit(limitCount));
        break;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LeaderboardEntry[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as LeaderboardEntry);
        });

        // Client-side fallback sort to guarantee perfect ordering
        sortEntries(list, category);
        callback(list);
      },
      (error) => {
        console.warn('Snapshot listener error, falling back to simple query:', error);
        // Fallback simple fetch without complex compound index
        const simpleQ = query(leaderboardCol, limit(limitCount));
        getDocs(simpleQ)
          .then((snap) => {
            const list: LeaderboardEntry[] = [];
            snap.forEach((doc) => list.push(doc.data() as LeaderboardEntry));
            sortEntries(list, category);
            callback(list);
          })
          .catch((e) => console.error('Leaderboard fallback error:', e));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to leaderboard:', err);
    return () => {};
  }
}

function sortEntries(list: LeaderboardEntry[], category: LeaderboardCategory) {
  list.sort((a, b) => {
    switch (category) {
      case 'combatPower':
        return b.combatPower - a.combatPower;
      case 'gold':
        return b.gold - a.gold;
      case 'rebirth':
        if (b.superRebirthCount !== a.superRebirthCount) {
          return b.superRebirthCount - a.superRebirthCount;
        }
        return b.rebirthCount - a.rebirthCount;
      case 'tower':
        return b.towerFloor - a.towerFloor;
      case 'stage':
        return b.highestStage - a.highestStage;
      case 'swordLevel':
      default:
        if (b.swordAwakeningLevel !== a.swordAwakeningLevel) {
          return (b.swordAwakeningLevel || 0) - (a.swordAwakeningLevel || 0);
        }
        return (b.maxSwordLevel || 0) - (a.maxSwordLevel || 0);
    }
  });
}
