import {
  collection,
  getDocs,
  doc as firestoreDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  getDoc,
  deleteDoc,
  WriteBatch,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Account Deletion Service - GDPR Compliant
 * 
 * Strategy: Anonymize user but keep debt records for counterparties to maintain financial integrity.
 * Cleans up all PII (Personally Identifiable Information).
 */

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedItems: {
    user: boolean;
    contacts: number;
    sessions: number;
    notifications: number;
    ownTransactions: number;
  };
  anonymizedDebts: number;
}

/**
 * Helper to commit batches in chunks of 500
 */
async function commitInChunks(
  items: QueryDocumentSnapshot[],
  operation: (batch: WriteBatch, item: QueryDocumentSnapshot) => void
) {
  const CHUNK_SIZE = 450; // Safety margin below 500
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + CHUNK_SIZE);
    chunk.forEach(item => operation(batch, item));
    await batch.commit();
  }
}

/**
 * Delete user account while preserving counterparty data integrity
 */
export async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  const result: DeletionResult = {
    success: false,
    message: '',
    deletedItems: {
      user: false,
      contacts: 0,
      sessions: 0,
      notifications: 0,
      ownTransactions: 0
    },
    anonymizedDebts: 0
  };

  try {
    // 0. Fetch User Data for phone number (registry cleanup)
    const userRef = firestoreDoc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const phoneNumber = userData?.phoneNumber;
    const phoneNumbers = (userData?.phoneNumbers as string[]) || [];

    // 1. Anonymize user in main users collection (PII Redaction)
    await updateDoc(userRef, {
      displayName: '[Silinmiş Kullanıcı]',
      email: null,
      photoURL: null,
      phoneNumber: '[REDACTED]',
      phoneNumbers: [],
      deletedAt: new Date(),
      isAnonymized: true,
      preferences: {},
      settings: {},
      userType: 'INDIVIDUAL' // Reset to default
    });
    result.deletedItems.user = true;

    // 2. Delete Phone Registry Entries
    const registriesToClear = [...new Set([phoneNumber, ...phoneNumbers])].filter(Boolean);
    for (const phone of registriesToClear) {
      const regRef = firestoreDoc(db, 'phone_registry', phone);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists() && regSnap.data()?.uid === userId) {
        await deleteDoc(regRef);
      }
    }

    // 3. Delete user's private subcollections (Contacts, Sessions, NotificationReadStatus)
    const subcollections = ['contacts', 'sessions', 'notificationReadStatus'];
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, `users/${userId}/${sub}`));
      await commitInChunks(snap.docs as QueryDocumentSnapshot[], (batch, docSnap) => {
        batch.delete(docSnap.ref);
        if (sub === 'contacts') result.deletedItems.contacts++;
        if (sub === 'sessions') result.deletedItems.sessions++;
      });
    }

    // 4. Delete Notifications (where user is recipient)
    const notifQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const notifSnap = await getDocs(notifQuery);
    await commitInChunks(notifSnap.docs as QueryDocumentSnapshot[], (batch, docSnap) => {
      batch.delete(docSnap.ref);
      result.deletedItems.notifications++;
    });

    // 5. Anonymize Debts (Targeted Query)
    const debtsQuery = query(collection(db, 'debts'), where('participants', 'array-contains', userId));
    const debtsSnap = await getDocs(debtsQuery);
    await commitInChunks(debtsSnap.docs as QueryDocumentSnapshot[], (batch, docSnap) => {
      const data = docSnap.data();
      const updates: Record<string, string> = {};

      if (data.borrowerId === userId) {
        updates.borrowerName = '[Silinmiş Kullanıcı]';
      }
      if (data.lenderId === userId) {
        updates.lenderName = '[Silinmiş Kullanıcı]';
      }

      if (Object.keys(updates).length > 0) {
        batch.update(docSnap.ref, updates);
        result.anonymizedDebts++;
      }
    });

    // 6. Delete user's own global transactions (Self-transactions)
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('fromUserId', '==', userId),
      where('toUserId', '==', userId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    await commitInChunks(transactionsSnapshot.docs as QueryDocumentSnapshot[], (batch, docSnap) => {
      batch.delete(docSnap.ref);
      result.deletedItems.ownTransactions++;
    });

    result.success = true;
    result.message = 'Hesabınız başarıyla silindi. Borç kayıtlarınız karşı taraflar için anonimleştirildi.';
    return result;

  } catch (error) {
    console.error('Account deletion failed:', error);
    result.message = 'Hesap silme işlemi başarısız oldu. Lütfen tekrar deneyin.';
    throw error;
  }
}

/**
 * Initiates the account deletion process.
 */
export async function initiateAccountDeletion(userId: string): Promise<void> {
  // In a real production app, we might add a 30-day grace period here.
  // For now, we perform immediate deletion as requested.
  await deleteUserAccount(userId);
}
