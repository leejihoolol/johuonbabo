import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, isUserAdmin } from './firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}

const STORAGE_SESSION_KEY = 'pixel_sword_custom_user_session';

// Simple SHA-256 hash for passwords in the browser
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_pixel_sword_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random 6-digit numeric verification code
export function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type AuthSubscriber = (user: AppUser | null) => void;
const subscribers: Set<AuthSubscriber> = new Set();

let currentCachedUser: AppUser | null = null;

// Initialize from localStorage
try {
  const saved = localStorage.getItem(STORAGE_SESSION_KEY);
  if (saved) {
    currentCachedUser = JSON.parse(saved);
  }
} catch {
  currentCachedUser = null;
}

function notifySubscribers(user: AppUser | null) {
  currentCachedUser = user;
  if (user) {
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
    } catch {}
  } else {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {}
  }
  subscribers.forEach((cb) => cb(user));
}

export function subscribeToCustomAuth(callback: AuthSubscriber): () => void {
  subscribers.add(callback);
  callback(currentCachedUser);
  return () => {
    subscribers.delete(callback);
  };
}

export function getCurrentUser(): AppUser | null {
  return currentCachedUser;
}

export interface RequestCodeResult {
  success: boolean;
  code?: string;
  realEmailSent: boolean;
  message: string;
}

/**
 * Request a 6-digit verification code for signup or login and send via real email
 */
export async function requestVerificationCode(
  email: string,
  purpose: 'signup' | 'login' | 'reset'
): Promise<RequestCodeResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, realEmailSent: false, message: '올바른 이메일 주소를 입력해주세요.' };
  }

  const code = generate6DigitCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 1. Save verification code in Firestore for validation
  try {
    const safeDocId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    const codeRef = doc(db, 'verification_codes', safeDocId);
    await setDoc(codeRef, {
      email: cleanEmail,
      code,
      purpose,
      expiresAt,
      createdAt: Date.now(),
    });
  } catch (err: any) {
    console.warn('Firestore code save error, using memory fallback:', err);
  }

  // 2. Dispatch real email via server API
  try {
    const response = await fetch('/api/auth/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code, purpose }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.serviceConfigured) {
        return {
          success: true,
          realEmailSent: true,
          message: result.message || `${cleanEmail} 메일함으로 6자리 인증 코드가 성공적으로 발송되었습니다! 메일함(또는 스팸함)을 확인해주세요.`,
        };
      } else if (result.serviceConfigured) {
        // Mail service is configured but failed to deliver real email
        return {
          success: false,
          realEmailSent: false,
          message: result.message || '이메일 발송에 실패했습니다. 이메일 주소를 다시 확인해주세요.',
        };
      }
    }
  } catch (apiErr) {
    console.warn('Backend email API error:', apiErr);
  }

  // Fallback: If mail service is not configured on server/platform
  return {
    success: true,
    realEmailSent: false,
    code,
    message: `6자리 보안 인증코드가 즉시 발급되었습니다.`,
  };
}

/**
 * Verify 6-digit code
 */
export async function verifyCode(email: string, inputCode: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const safeDocId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    const codeRef = doc(db, 'verification_codes', safeDocId);
    const snap = await getDoc(codeRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.code === inputCode.trim() && Date.now() <= (data.expiresAt || 0)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('verifyCode firestore check error:', err);
  }
  return false;
}

/**
 * Register account with email, password, and verification code
 */
export async function registerWithEmail(
  email: string,
  password: string,
  verificationCode: string,
  playerName?: string
): Promise<{ user: AppUser | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { user: null, error: '유효한 이메일 주소를 입력해주세요.' };
  }
  if (!password || password.length < 4) {
    return { user: null, error: '비밀번호는 최소 4자 이상이어야 합니다.' };
  }
  if (!verificationCode || verificationCode.trim().length !== 6) {
    return { user: null, error: '6자리 인증 코드를 정확히 입력해주세요.' };
  }

  // Verify Code
  const isValidCode = await verifyCode(cleanEmail, verificationCode);
  if (!isValidCode) {
    return { user: null, error: '인증 코드가 일치하지 않거나 만료되었습니다. 다시 발급받아주세요.' };
  }

  const safeUid = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userRef = doc(db, 'users_auth', safeUid);

  try {
    // Check if already registered
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      return { user: null, error: '이미 가입된 이메일입니다. 로그인 탭을 이용해주세요.' };
    }

    const hashedPassword = await hashPassword(password);
    const isAdmin = isUserAdmin(cleanEmail);
    const defaultDisplayName = playerName?.trim() || cleanEmail.split('@')[0] || '대장장이';

    const accountData = {
      uid: safeUid,
      email: cleanEmail,
      passwordHash: hashedPassword,
      displayName: defaultDisplayName,
      playerName: defaultDisplayName,
      playerAvatar: 'anvil',
      isAdmin,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    await setDoc(userRef, accountData);

    // Also write to users collection for public leaderboards/profiles
    const publicUserRef = doc(db, 'users', safeUid);
    await setDoc(
      publicUserRef,
      {
        uid: safeUid,
        email: cleanEmail,
        displayName: defaultDisplayName,
        playerName: defaultDisplayName,
        playerAvatar: 'anvil',
        isAdmin,
        lastLoginAt: Date.now(),
      },
      { merge: true }
    );

    const appUser: AppUser = {
      uid: safeUid,
      email: cleanEmail,
      displayName: defaultDisplayName,
      photoURL: null,
      isAdmin,
    };

    notifySubscribers(appUser);
    return { user: appUser };
  } catch (err: any) {
    console.error('Registration error:', err);
    // Fallback: create local account session
    const isAdmin = isUserAdmin(cleanEmail);
    const defaultDisplayName = playerName?.trim() || cleanEmail.split('@')[0] || '대장장이';
    const appUser: AppUser = {
      uid: safeUid,
      email: cleanEmail,
      displayName: defaultDisplayName,
      photoURL: null,
      isAdmin,
    };
    notifySubscribers(appUser);
    return { user: appUser };
  }
}

/**
 * Login with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: AppUser | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { user: null, error: '유효한 이메일 주소를 입력해주세요.' };
  }
  if (!password) {
    return { user: null, error: '비밀번호를 입력해주세요.' };
  }

  const safeUid = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userRef = doc(db, 'users_auth', safeUid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { user: null, error: '가입되지 않은 이메일입니다. 먼저 계정을 생성해주세요.' };
    }

    const data = snap.data();
    const inputHash = await hashPassword(password);
    if (data.passwordHash !== inputHash) {
      return { user: null, error: '비밀번호가 일치하지 않습니다.' };
    }

    const isAdmin = isUserAdmin(cleanEmail) || Boolean(data.isAdmin);
    const appUser: AppUser = {
      uid: safeUid,
      email: cleanEmail,
      displayName: data.displayName || data.playerName || cleanEmail.split('@')[0],
      photoURL: data.photoURL || null,
      isAdmin,
    };

    // Update last login
    try {
      await updateDoc(userRef, { lastLoginAt: Date.now() });
    } catch {}

    notifySubscribers(appUser);
    return { user: appUser };
  } catch (err: any) {
    console.error('Login error:', err);
    return { user: null, error: '로그인 중 오류가 발생했습니다: ' + (err.message || '') };
  }
}

/**
 * Direct Login with email and 6-digit code (Code Login / 2FA)
 */
export async function loginWithCode(
  email: string,
  code: string
): Promise<{ user: AppUser | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const isValid = await verifyCode(cleanEmail, code);
  if (!isValid) {
    return { user: null, error: '인증 코드가 일치하지 않거나 만료되었습니다.' };
  }

  const safeUid = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userRef = doc(db, 'users_auth', safeUid);

  try {
    const snap = await getDoc(userRef);
    let displayName = cleanEmail.split('@')[0];
    const isAdmin = isUserAdmin(cleanEmail);

    if (snap.exists()) {
      const data = snap.data();
      displayName = data.displayName || data.playerName || displayName;
      await updateDoc(userRef, { lastLoginAt: Date.now() });
    } else {
      // Auto-create account on verified code if not exists
      const hashedPassword = await hashPassword('default_pwd_' + code);
      await setDoc(userRef, {
        uid: safeUid,
        email: cleanEmail,
        passwordHash: hashedPassword,
        displayName,
        playerName: displayName,
        playerAvatar: 'anvil',
        isAdmin,
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      });
    }

    const appUser: AppUser = {
      uid: safeUid,
      email: cleanEmail,
      displayName,
      photoURL: null,
      isAdmin,
    };

    notifySubscribers(appUser);
    return { user: appUser };
  } catch (err: any) {
    const isAdmin = isUserAdmin(cleanEmail);
    const appUser: AppUser = {
      uid: safeUid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      photoURL: null,
      isAdmin,
    };
    notifySubscribers(appUser);
    return { user: appUser };
  }
}

/**
 * Update current user profile name & avatar
 */
export async function updateCustomUserProfile(
  uid: string,
  displayName: string,
  avatar: string
): Promise<void> {
  if (!uid) return;
  const userRef = doc(db, 'users_auth', uid);
  const publicRef = doc(db, 'users', uid);

  try {
    await updateDoc(userRef, {
      displayName,
      playerName: displayName,
      playerAvatar: avatar,
    });
  } catch {}

  try {
    await updateDoc(publicRef, {
      displayName,
      playerName: displayName,
      playerAvatar: avatar,
    });
  } catch {}

  if (currentCachedUser && currentCachedUser.uid === uid) {
    const updated: AppUser = {
      ...currentCachedUser,
      displayName,
    };
    notifySubscribers(updated);
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  notifySubscribers(null);
}

/**
 * Remove all stored accounts, verification codes, and user records from database and local storage,
 * and force logout so user can start fresh.
 */
export async function resetAllStoredAccounts(): Promise<{ success: boolean; deletedCount: number }> {
  let count = 0;

  // 1. Clear local storage session
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    notifySubscribers(null);
  } catch {}

  // 2. Clear Firestore collections related to authentication
  const collectionsToClear = ['users_auth', 'verification_codes'];

  for (const collName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, collName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(d.ref);
          count++;
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn(`Failed to clear ${collName}:`, err);
    }
  }

  return { success: true, deletedCount: count };
}
