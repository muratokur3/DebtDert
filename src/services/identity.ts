import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { cleanPhone, formatPhoneForDisplay } from '../utils/phoneUtils';
import { claimLegacyDebts } from './db';
import type { Debt, DisplayProfile, Contact, User } from '../types';

const REGISTRY_COLLECTION = 'phone_registry';
const USERS_COLLECTION = 'users';

interface RegistryEntry {
    uid: string;
    verifiedAt: any; // Timestamp
}

/**
 * Checks if a phone number is already registered to ANY user.
 */
export const isPhoneRegistered = async (phoneNumber: string): Promise<boolean> => {
    const clean = cleanPhone(phoneNumber);
    const docRef = doc(db, REGISTRY_COLLECTION, clean);
    const snapshot = await getDoc(docRef);
    return snapshot.exists();
};

/**
 * Resolves a phone number to a User UID using the Registry.
 * Returns null if not found.
 */
export const resolvePhoneToUid = async (phoneNumber: string): Promise<string | null> => {
    const clean = cleanPhone(phoneNumber);
    const docRef = doc(db, REGISTRY_COLLECTION, clean);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        const data = snapshot.data() as RegistryEntry;
        return data.uid;
    }
    return null;
};

/**
 * Adds a secondary phone number to the current user.
 * Requires SMS verification to prove ownership.
 * Returns the confirmationResult which contains verificationId.
 */
export const startAddPhoneVerification = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    const clean = cleanPhone(phoneNumber);

    // 1. Check Registry
    const isTaken = await isPhoneRegistered(clean);
    if (isTaken) {
        throw new Error("Bu numara zaten başka bir hesaba kayıtlı.");
    }

    // 2. Send SMS
    if (!auth.currentUser) throw new Error("Kullanıcı oturumu açık değil.");

    try {
        const confirmationResult = await linkWithPhoneNumber(auth.currentUser, clean, appVerifier);
        return confirmationResult;
    } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
            throw new Error("Bu numara zaten başka bir hesaba bağlı (Auth).");
        }
        throw error;
    }
};

/**
 * Sends the SMS code for linking a phone number.
 * Basically an alias for startAddPhoneVerification but emphasizes the intent.
 */
export const sendLinkPhoneCode = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    return await startAddPhoneVerification(phoneNumber, appVerifier);
};


/**
 * Confirms OTP and finalizes adding the phone number.
 * Can take either confirmationResult (from startAddPhoneVerification) OR verificationId + code.
 */
export const confirmAddPhone = async (confirmationResult: any, verificationCode: string) => {
    if (!auth.currentUser) throw new Error("No user");

    // 1. Verify OTP via Firebase Auth Link
    await confirmationResult.confirm(verificationCode);

    // We assume if it succeeds, the number is verified.
    return true;
};

/**
 * Links a secondary phone number using verification ID and SMS code.
 * Implements the specific requirement for manual linking handling.
 */
export const linkSecondaryPhone = async (phoneNumber: string, smsCode: string, verificationId: string) => {
    if (!auth.currentUser) throw new Error("Kullanıcı oturumu açık değil.");

    const clean = cleanPhone(phoneNumber);

    try {
        const credential = PhoneAuthProvider.credential(verificationId, smsCode);
        await linkWithCredential(auth.currentUser, credential);

        // Success: Update Firestore
        await finalizeAddPhone(clean);

    } catch (error: any) {
        console.error("Link phone error:", error);
        if (error.code === 'auth/credential-already-in-use') {
             throw new Error("Bu telefon numarası zaten başka bir hesaba kayıtlı.");
        } else if (error.code === 'auth/invalid-verification-code') {
            throw new Error("Hatalı doğrulama kodu.");
        } else if (error.code === 'auth/code-expired') {
            throw new Error("Doğrulama kodunun süresi dolmuş.");
        }
        throw error;
    }
}

/**
 * Simplified Wrapper: Takes the verified phone number (after UI handles confirm) and updates DB.
 * This is called internally by linkSecondaryPhone, or can be called if using confirmationResult.confirm() flow manually.
 */
export const finalizeAddPhone = async (phoneNumber: string) => {
    const clean = cleanPhone(phoneNumber);
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No user");

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User profile not found");

        const userData = userDoc.data() as User;
        const currentPhones = userData.phoneNumbers || [];

        if (currentPhones.includes(clean)) return; // Already added

        // Update Registry
        const regRef = doc(db, REGISTRY_COLLECTION, clean);
        const regDoc = await transaction.get(regRef);
        if (regDoc.exists() && regDoc.data().uid !== uid) {
             // This theoretically shouldn't happen if linkWithCredential succeeded,
             // unless database is out of sync with Auth.
             // We will assume Auth is truth and overwrite registry if Auth succeeded.
             // Or we should throw?
             // If Auth succeeded, it means we own the number now.
             // So we update registry.
        }

        transaction.set(regRef, {
            uid,
            verifiedAt: serverTimestamp()
        });

        // Update User Profile
        transaction.update(userRef, {
            phoneNumbers: [...currentPhones, clean],
            ...(currentPhones.length === 0 ? { primaryPhoneNumber: clean } : {})
        });
    });

    // Post-Transaction: Claim Debts
    await claimLegacyDebts(uid, clean);
};

export const removePhone = async (phoneNumber: string) => {
    const clean = cleanPhone(phoneNumber);
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No user");

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User profile not found");

        const userData = userDoc.data() as User;
        const currentPhones = userData.phoneNumbers || [];

        if (!currentPhones.includes(clean)) throw new Error("Number not linked to this account.");
        if (currentPhones.length <= 1) throw new Error("En az bir telefon numarası kalmalıdır.");

        const newPhones = currentPhones.filter(p => p !== clean);

        let newPrimary = userData.primaryPhoneNumber;
        if (userData.primaryPhoneNumber === clean) {
            newPrimary = newPhones[0];
        }

        // Update User
        // Use direct array update logic within transaction context
        // We use full replace because we calculated new list
        transaction.update(userRef, {
            phoneNumbers: newPhones,
            primaryPhoneNumber: newPrimary
        });

        // Remove from Registry
        const regRef = doc(db, REGISTRY_COLLECTION, clean);
        transaction.delete(regRef);
    });
};

export const setPrimaryPhone = async (phoneNumber: string) => {
    const clean = cleanPhone(phoneNumber);
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("No user");

    await updateDoc(doc(db, USERS_COLLECTION, uid), {
        primaryPhoneNumber: clean
    });
};

/**
 * Resolves the display profile for a user based on the "Golden Rule":
 * 1. Contact (Nickname)
 * 2. System User (Real Name)
 * 3. Debt Snapshot (Ghost Name)
 * 3. Debt Snapshot (Ghost Name)
 * 4. Phone Number (Fallback)
 */

export const resolveUserDisplay = async (
    currentUserId: string,
    targetIdentifier: string, // uid OR phoneNumber
    debtContext?: Debt
): Promise<DisplayProfile> => {
    let targetUid: string | null = null;
    let targetPhone: string | null = null;

    // 1. Normalize Inputs
    if (targetIdentifier.startsWith('+') || targetIdentifier.length < 20) {
        // It's a phone number
        targetPhone = cleanPhone(targetIdentifier);
        // Try to find UID if not known
        targetUid = await resolvePhoneToUid(targetPhone); // Using existing function
    } else if (targetIdentifier.startsWith('phone:')) {
        // Shadow User UID "phone:+90555..."
        targetPhone = cleanPhone(targetIdentifier.replace('phone:', ''));
        targetUid = null;
    } else {
        // It's a standard UID
        targetUid = targetIdentifier;
        // We might not know phone yet, will fetch from User if needed
    }

    // Fallback Phone from Debt Context if we still don't have it and it's relevant
    if (!targetPhone && debtContext && debtContext.lockedPhoneNumber) {
        // Verify this debt is actually relevant to the target
        const isTargetBorrower = debtContext.borrowerId === targetIdentifier || (debtContext.borrowerId.startsWith('phone:') && debtContext.borrowerId.includes(String(targetIdentifier)));
        const isTargetLender = debtContext.lenderId === targetIdentifier || (debtContext.lenderId.startsWith('phone:') && debtContext.lenderId.includes(String(targetIdentifier)));

        if (isTargetBorrower || isTargetLender) {
            targetPhone = debtContext.lockedPhoneNumber;
        }
    }

    // --- PRIORITY 1: PRIVATE CONTACT ---
    // Check Address Book
    let contact: Contact | null = null;

    if (currentUserId) {
        const contactsRef = collection(db, 'users', currentUserId, 'contacts');

        // Strategy A: By UID (most accurate linkage)
        // Only queries if we have a resolved UID
        if (targetUid) {
            const q = query(contactsRef, where('linkedUserId', '==', targetUid));
            const snap = await getDocs(q);
            if (!snap.empty) contact = snap.docs[0].data() as Contact;
        }

        // Strategy B: By Phone (if A failed and we have phone)
        if (!contact && targetPhone) {
            const q = query(contactsRef, where('phoneNumber', '==', targetPhone));
            const snap = await getDocs(q);
            if (!snap.empty) contact = snap.docs[0].data() as Contact;
        }
    }

    // --- PRIORITY 2: SYSTEM PROFILE ---
    let systemUser: User | null = null;
    if (targetUid) {
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
            systemUser = userDoc.data() as User;
            // Backfill phone if we didn't have it
            if (!targetPhone) targetPhone = systemUser.primaryPhoneNumber;
        }
    }

    // DECISION LOGIC

    // Is it a Contact? (Priority 1)
    if (contact) {
        // If system user found, link details
        const realName = systemUser?.displayName || '';
        const displayPhone = contact.phoneNumber || targetPhone || '';

        return {
            displayName: contact.name,
            secondaryText: systemUser ? `App User: ${realName}` : displayPhone,
            photoURL: systemUser?.photoURL, // Always show real avatar if linked
            initials: getInitials(contact.name),
            isSystemUser: !!systemUser,
            isContact: true,
            phoneNumber: displayPhone,
            uid: systemUser?.uid
        };
    }

    // Is it a System User? (Priority 2)
    if (systemUser) {
        return {
            displayName: systemUser.displayName,
            secondaryText: systemUser.primaryPhoneNumber,
            photoURL: systemUser.photoURL,
            initials: getInitials(systemUser.displayName),
            isSystemUser: true,
            isContact: false,
            phoneNumber: systemUser.primaryPhoneNumber,
            uid: systemUser.uid
        };
    }

    // --- PRIORITY 3: DEBT SNAPSHOT ---
    if (debtContext) {
        // Determine which side of the debt serves as the name source
        let snapshotName = '';

        // Check if target is borrower
        if (debtContext.borrowerId === targetIdentifier || (targetPhone && debtContext.borrowerId === `phone:${targetPhone}`)) {
            snapshotName = debtContext.borrowerName;
        }
        // Check if target is lender
        else if (debtContext.lenderId === targetIdentifier || (targetPhone && debtContext.lenderId === `phone:${targetPhone}`)) {
            snapshotName = debtContext.lenderName;
        }

        if (snapshotName) {
            const finalPhone = targetPhone || debtContext.lockedPhoneNumber || '';
            return {
                displayName: snapshotName,
                secondaryText: finalPhone,
                photoURL: undefined,
                initials: getInitials(snapshotName),
                isSystemUser: false,
                isContact: false,
                phoneNumber: finalPhone
            };
        }
    }

    // --- PRIORITY 4: RAW FALLBACK ---
    const finalFallback = targetPhone || targetIdentifier || "Unknown";
    return {
        displayName: formatPhoneForDisplay(finalFallback),
        secondaryText: "Bilinmeyen Kullanıcı",
        photoURL: undefined,
        initials: "?",
        isSystemUser: false,
        isContact: false,
        phoneNumber: finalFallback
    };
};

// Helper for Initials
const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};
