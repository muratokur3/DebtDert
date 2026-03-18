import { collection, getDocs, query, where, writeBatch, type WriteBatch, doc as firestoreDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Account Deletion Service - GDPR Compliant
 * 
 * Strategy: Anonymize user but keep debt records for counterparty integrity.
 * Version: 1.1 (Optimized for Scalability & Subcollections)
 */

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedItems: {
    user: boolean;
    contacts: number;
    ownTransactions: number;
    subTransactions: number; // For subcollection transactions
  };
  anonymizedDebts: number;
}

/**
 * Helper to commit a batch and start a new one if it reaches the limit
 */
async function commitBatchIfNeeded(batch: WriteBatch, count: number, limit: number = 450): Promise<{ batch: WriteBatch; count: number }> {
  if (count >= limit) {
    await batch.commit();
    return { batch: writeBatch(db), count: 0 };
  }
  return { batch, count };
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
      ownTransactions: 0,
      subTransactions: 0
    },
    anonymizedDebts: 0
  };

  try {
    let currentBatch = writeBatch(db);
    let batchCount = 0;

    // 1. Anonymize user in main users collection
    const userRef = firestoreDoc(db, 'users', userId);
    currentBatch.update(userRef, {
      displayName: '[Silinmiş Kullanıcı]',
      email: null,
      photoURL: null,
      phoneNumber: '[REDACTED]',
      phoneNumbers: [],
      deletedAt: new Date(),
      isAnonymized: true
    });
    batchCount++;
    result.deletedItems.user = true;

    // 2. Delete user's contacts and their private transactions
    const contactsRef = collection(db, 'users', userId, 'contacts');
    const contactsSnapshot = await getDocs(contactsRef);

    for (const contactDoc of contactsSnapshot.docs) {
      // Delete private transactions under this contact
      const txsRef = collection(db, 'users', userId, 'contacts', contactDoc.id, 'transactions');
      const txsSnapshot = await getDocs(txsRef);
      for (const txDoc of txsSnapshot.docs) {
        currentBatch.delete(txDoc.ref);
        batchCount++;
        result.deletedItems.subTransactions++;
        const res = await commitBatchIfNeeded(currentBatch, batchCount);
        currentBatch = res.batch;
        batchCount = res.count;
      }

      // Delete the contact itself
      currentBatch.delete(contactDoc.ref);
      batchCount++;
      result.deletedItems.contacts++;
      const res = await commitBatchIfNeeded(currentBatch, batchCount);
      currentBatch = res.batch;
      batchCount = res.count;
    }

    // 3. Anonymize debts where user is involved (Targeted Query)
    const debtsRef = collection(db, 'debts');
    const debtsQuery = query(debtsRef, where('participants', 'array-contains', userId));
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

      // Only update if there's something to change (Redundancy check)
      if (Object.keys(updates).length > 0) {
        currentBatch.update(debtDoc.ref, updates);
        batchCount++;
        result.anonymizedDebts++;
        const res = await commitBatchIfNeeded(currentBatch, batchCount);
        currentBatch = res.batch;
        batchCount = res.count;
      }

      // Special handling for LEDGER transactions
      if (data.type === 'LEDGER') {
        const ledgerTxsRef = collection(db, 'debts', debtDoc.id, 'transactions');
        // We only delete transactions created BY this user in the shared ledger
        const ledgerTxsQuery = query(ledgerTxsRef, where('createdBy', '==', userId));
        const ledgerTxsSnapshot = await getDocs(ledgerTxsQuery);
        
        for (const txDoc of ledgerTxsSnapshot.docs) {
          currentBatch.delete(txDoc.ref);
          batchCount++;
          result.deletedItems.subTransactions++;
          const res = await commitBatchIfNeeded(currentBatch, batchCount);
          currentBatch = res.batch;
          batchCount = res.count;
        }
      }
    }

    // 4. Final Commit
    if (batchCount > 0) {
      await currentBatch.commit();
    }

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
 * IMPORTANT: This should be called after user confirms deletion.
 */
export async function initiateAccountDeletion(userId: string): Promise<void> {
  await deleteUserAccount(userId);
}
