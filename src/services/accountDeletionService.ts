import { collection, getDocs, doc as firestoreDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Account Deletion Service - GDPR Compliant
 * 
 * Strategy: Anonymize user but keep debt records for counterparties.
 * Scalability: Uses targeted queries and batched writes.
 */

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedItems: {
    user: boolean;
    contacts: number;
    subTransactions: number;
  };
  anonymizedDebts: number;
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
      subTransactions: 0
    },
    anonymizedDebts: 0
  };

  try {
    let batch = writeBatch(db);
    let batchSize = 0;
    const MAX_BATCH_SIZE = 450; // Safety margin for Firestore's 500 limit

    const commitIfReady = async (force = false) => {
      if (batchSize >= MAX_BATCH_SIZE || (force && batchSize > 0)) {
        await batch.commit();
        batch = writeBatch(db); // Important: Create a new batch after commit
        batchSize = 0;
        return true;
      }
      return false;
    };

    // 1. Anonymize user in main users collection
    const userRef = firestoreDoc(db, 'users', userId);
    batch.update(userRef, {
      displayName: '[Silinmiş Kullanıcı]',
      email: null,
      photoURL: null,
      phoneNumber: '[REDACTED]',
      phoneNumbers: [],
      deletedAt: new Date(),
      isAnonymized: true
    });
    batchSize++;
    result.deletedItems.user = true;

    // 2. Delete user's contacts subcollection and their transactions
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    for (const contactDoc of contactsSnapshot.docs) {
      // Delete subcollection transactions for each contact
      const txSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contactDoc.id}/transactions`));
      for (const txDoc of txSnapshot.docs) {
        batch.delete(txDoc.ref);
        batchSize++;
        result.deletedItems.subTransactions++;
        await commitIfReady();
      }

      batch.delete(contactDoc.ref);
      batchSize++;
      result.deletedItems.contacts++;
      await commitIfReady();
    }

    // 3. Anonymize debts where user is involved
    const debtsQuery = query(collection(db, 'debts'), where('participants', 'array-contains', userId));
    const debtsSnapshot = await getDocs(debtsQuery);

    for (const debtDoc of debtsSnapshot.docs) {
      const data = debtDoc.data();
      const updates: Record<string, string> = {};

      if (data.borrowerId === userId) {
        updates.borrowerName = '[Silinmiş Kullanıcı]';
      }
      if (data.lenderId === userId) {
        updates.lenderName = '[Silinmiş Kullanıcı]';
      }

      if (Object.keys(updates).length > 0) {
        batch.update(debtDoc.ref, updates);
        batchSize++;
        result.anonymizedDebts++;
        await commitIfReady();
      }

      // Also handle shared ledger transactions if it's a LEDGER type debt
      if (data.type === 'LEDGER') {
        const sharedTxQuery = collection(db, `debts/${debtDoc.id}/transactions`);
        const sharedTxSnapshot = await getDocs(sharedTxQuery);
        for (const txDoc of sharedTxSnapshot.docs) {
          const txData = txDoc.data();
          // Redact PII from shared transactions
          if (txData.createdBy === userId) {
            batch.update(txDoc.ref, {
               createdBy: '[REDACTED]',
               note: txData.note ? '[REDACTED]' : null
            });
            batchSize++;
            result.deletedItems.subTransactions++;
            await commitIfReady();
          }
        }
      }
    }

    // Final commit
    await commitIfReady(true);

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
 * IMPORTANT: This should be called after user confirms deletion
 */
export async function initiateAccountDeletion(userId: string): Promise<void> {
  await deleteUserAccount(userId);
}
