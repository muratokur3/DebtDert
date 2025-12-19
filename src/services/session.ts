import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';

const DEVICE_ID_KEY = 'debt_app_device_uuid';
const ACTIVE_USER_KEY = 'active_user_id';
const KNOWN_ACCOUNTS_KEY = 'known_accounts';

/**
 * Gets or creates a persistent device ID.
 * This ID is tied to the browser/hardware, not the user.
 */
export const getSystemDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  // TODO: In React Native, replace this with react-native-device-info.getUniqueId()
  return deviceId;
};

/**
 * Registers the current session in Firestore.
 * This should be called when a user logs in.
 */
export const registerSession = async (userId: string): Promise<void> => {
  const deviceId = getSystemDeviceId();
  const parser = new UAParser();
  const result = parser.getResult();

  // Create readable device name
  // e.g. "Chrome on Windows", "Safari on iOS"
  const browserName = result.browser.name || 'Unknown Browser';
  const osName = result.os.name || 'Unknown OS';
  const deviceName = `${browserName} on ${osName}`;

  // Determine platform
  let platform = 'web';
  const os = result.os.name?.toLowerCase() || '';
  if (os.includes('ios')) platform = 'ios';
  if (os.includes('android')) platform = 'android';

  const sessionRef = doc(db, `users/${userId}/sessions/${deviceId}`);

  // Non-blocking write
  setDoc(sessionRef, {
    deviceId,
    platform,
    deviceName,
    lastActiveAt: serverTimestamp(),
    appVersion: '0.1.0', // TODO: Get this from package.json or environment
    // pushToken: "..." // Placeholder for future Notifications
  }, { merge: true }).catch(err => {
    console.error("Failed to register session:", err);
  });

  // Update local account management
  updateLocalAccount(userId);
};

/**
 * Updates local storage with the active user and known accounts.
 */
const updateLocalAccount = (userId: string) => {
  localStorage.setItem(ACTIVE_USER_KEY, userId);

  const knownAccountsJson = localStorage.getItem(KNOWN_ACCOUNTS_KEY);
  let knownAccounts: string[] = [];

  if (knownAccountsJson) {
    try {
      knownAccounts = JSON.parse(knownAccountsJson);
    } catch (e) {
      console.warn("Failed to parse known_accounts", e);
    }
  }

  if (!knownAccounts.includes(userId)) {
    knownAccounts.push(userId);
    localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(knownAccounts));
  }
};

/**
 * Monitors the current session for revocation.
 * If the session document is deleted, calls the onRevoked callback.
 * Returns an unsubscribe function.
 */
export const monitorSession = (
  userId: string,
  onRevoked: () => void
): () => void => {
  const deviceId = getSystemDeviceId();
  const sessionRef = doc(db, `users/${userId}/sessions/${deviceId}`);

  const unsubscribe = onSnapshot(sessionRef, (docSnapshot) => {
    // If the document does not exist, it means the session was revoked
    // We only trigger if we are authenticated (which is implied if we are monitoring)
    // Note: onSnapshot fires immediately with the current state.
    // If the doc doesn't exist *initially*, it might be a race condition or actual revocation.
    // However, since we call registerSession right before or in parallel,
    // it's tricky. But usually registerSession is fire-and-forget.
    // If we are logged in but session doc is gone, it's a revocation.

    // To avoid immediate logout if registerSession hasn't finished writing:
    // This logic relies on the fact that registerSession is called on login.
    // But if we monitor *before* write completes, we might see no doc.
    // Standard approach: Listen. If doc removed (type === 'removed') or just !exists after being established.
    // Simple check: if !docSnapshot.exists(), revoke.
    // We might need to handle the initial empty state if write is slow?
    // Actually, registerSession is called when Auth state changes to logged in.
    // monitorSession is called at the same time.

    // Let's rely on the backend behavior. If the user is logged in, they should have a session.
    // If they don't, it might be revoked.
    // CAUTION: If registerSession fails or is slow, this might logout the user immediately.
    // But since we want to be secure, if the session is gone, we logout.

    // To be safe, we can check if source is 'local' vs 'server' or just accept that
    // there might be a split second where it doesn't exist?
    // Actually, setDoc happens asynchronously.
    // Ideally we should wait for registerSession to complete before monitoring,
    // but the requirement says "non-blocking".

    // Strategy: onSnapshot emits immediately. If it doesn't exist, strictly speaking it's revoked or never existed.
    // But we just started the session.
    // Maybe we should only trigger if we knew it existed before?
    // Or maybe we can rely on the fact that we just called setDoc.
    // Local writes in Firestore SDK are visible immediately in snapshots even before network.
    // So if we call registerSession (which calls setDoc), the local cache should show it exists immediately.

    if (!docSnapshot.exists()) {
       // Check if we are actually currently logged in according to Firebase Auth
       // (which we are, if this hook is running).
       // Using a small delay or check might be wise, but purely based on Firestore local cache behavior,
       // setDoc updates cache immediately.
       onRevoked();
    }
  });

  return unsubscribe;
};

/**
 * Signs out the current user and clears active user from local storage (optional).
 */
export const signOutUser = async () => {
    try {
        await auth.signOut();
        localStorage.removeItem(ACTIVE_USER_KEY);
        // We keep KNOWN_ACCOUNTS_KEY and DEVICE_ID_KEY
    } catch (error) {
        console.error("Error signing out:", error);
    }
}
