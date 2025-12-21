import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';
import { doc, setDoc, serverTimestamp, onSnapshot, collection, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

const DEVICE_ID_KEY = 'debt_app_device_uuid';
const ACTIVE_USER_KEY = 'active_user_id';
const KNOWN_ACCOUNTS_KEY = 'known_accounts';
const SESSION_EXPIRY_DAYS = 90;

export interface SessionData {
  deviceId: string;
  platform: string;
  deviceName: string;
  lastActiveAt: Timestamp;
  appVersion: string;
  isCurrent?: boolean;
}

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
 * Monitors the current session for revocation or expiration.
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
    // 1. Check existence (Revoked)
    if (!docSnapshot.exists()) {
      onRevoked();
      return;
    }

    // 2. Check Expiration
    const data = docSnapshot.data();
    if (data && data.lastActiveAt) {
      const lastActive = (data.lastActiveAt as Timestamp).toDate();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > SESSION_EXPIRY_DAYS) {
        console.warn(`Session expired. Inactive for ${diffDays} days.`);
        // Delete locally (cleanup) and logout
        deleteDoc(sessionRef).catch(console.error); // Clean up server if we can
        onRevoked();
      } else {
        // Valid session. 
        // Optional: If it's been more than X hours, maybe update heartbeat? 
        // For now, registerSession handles login time. 
        // If we wanted rolling window on *every* app open, we should call registerSession on app init (which we do in useAuth).
      }
    }
  });

  return unsubscribe;
};

/**
 * Fetches all active sessions for the user.
 * Performs lazy deletion of expired sessions.
 */
export const getSessions = async (userId: string): Promise<SessionData[]> => {
  const sessionsRef = collection(db, `users/${userId}/sessions`);
  const snapshot = await getDocs(sessionsRef);
  const validSessions: SessionData[] = [];
  const expiredDocs: string[] = [];
  const currentDeviceId = getSystemDeviceId();
  const now = new Date();

  snapshot.forEach(docSnap => {
    const data = docSnap.data() as SessionData;

    // Expiration Check
    if (data.lastActiveAt) {
      const lastActive = data.lastActiveAt.toDate();
      const diffTime = Math.abs(now.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > SESSION_EXPIRY_DAYS) {
        expiredDocs.push(docSnap.id);
        return; // Skip adding to valid list
      }
    }

    // Mark current
    if (data.deviceId === currentDeviceId) {
      data.isCurrent = true;
    }

    validSessions.push(data);
  });

  // Lazy Delete in Background
  if (expiredDocs.length > 0) {
    Promise.all(expiredDocs.map(id => deleteDoc(doc(db, `users/${userId}/sessions/${id}`))))
      .catch(e => console.error("Lazy delete failed", e));
  }

  // Sort: Current first, then by date desc
  return validSessions.sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    return b.lastActiveAt.toMillis() - a.lastActiveAt.toMillis();
  });
};

/**
 * Revokes (deletes) a specific session.
 */
export const revokeSession = async (userId: string, deviceId: string): Promise<void> => {
  await deleteDoc(doc(db, `users/${userId}/sessions/${deviceId}`));
};

/**
 * Signs out the current user and clears active user from local storage.
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

