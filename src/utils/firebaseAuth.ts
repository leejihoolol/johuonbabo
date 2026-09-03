import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { auth, googleProvider, isUserAdmin } from './firebase';
import {
  AppUser,
  subscribeToCustomAuth,
  getCurrentUser,
  logout as logoutCustom,
  loginWithEmail,
  registerWithEmail,
  loginWithCode,
  requestVerificationCode,
  updateCustomUserProfile,
  resetAllStoredAccounts,
} from './customEmailAuth';

export { isUserAdmin };
export type { AppUser };
export {
  loginWithEmail,
  registerWithEmail,
  loginWithCode,
  requestVerificationCode,
  updateCustomUserProfile,
  resetAllStoredAccounts,
};

export async function loginWithGoogle(): Promise<{ user: AppUser | null; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const appUser: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAdmin: isUserAdmin(result.user.email),
      };
      return { user: appUser };
    }
    return { user: null };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (error?.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'swordupgrade.vercel.app';
      return {
        user: null,
        error: `[승인되지 않은 도메인] 현재 접속 도메인('${host}')이 Firebase 승인된 도메인에 등록되어 있지 않습니다. Firebase 콘솔(Authentication > 설정 > 승인된 도메인)에 '${host}'를 추가해주세요.`,
      };
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      return { user: null, error: '구글 로그인 팝업 창이 닫혔습니다. 다시 시도해주세요.' };
    }
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null };
      } catch (redirectErr: any) {
        return { user: null, error: '구글 로그인 팝업이 브라우저에서 차단되었습니다. 팝업 허용 후 다시 시도해주세요.' };
      }
    }
    return { user: null, error: error?.message || '구글 로그인에 실패했습니다.' };
  }
}

export async function checkRedirectResult(): Promise<AppUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAdmin: isUserAdmin(result.user.email),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Firebase sign out error:', err);
  }
  await logoutCustom();
}

/**
 * Unified auth subscriber: listens to either Custom Email Auth or Firebase Auth
 */
export function subscribeToAuth(callback: (user: AppUser | null) => void): () => void {
  let lastCustomUser: AppUser | null = getCurrentUser();
  let lastFbUser: User | null = null;

  const notify = () => {
    if (lastCustomUser) {
      callback(lastCustomUser);
    } else if (lastFbUser) {
      callback({
        uid: lastFbUser.uid,
        email: lastFbUser.email,
        displayName: lastFbUser.displayName,
        photoURL: lastFbUser.photoURL,
        isAdmin: isUserAdmin(lastFbUser.email),
      });
    } else {
      callback(null);
    }
  };

  const unsubCustom = subscribeToCustomAuth((user) => {
    lastCustomUser = user;
    notify();
  });

  const unsubFb = onAuthStateChanged(auth, (user) => {
    lastFbUser = user;
    notify();
  });

  return () => {
    unsubCustom();
    unsubFb();
  };
}
