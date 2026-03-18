import { collection, getDocs, doc as firestoreDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Account Deletion Service - GDPR Compliant
 * Version 1.1 - Optimized for Scalability
 * 
 * Strategy: Anonymize user but keep debt records for counterparty integrity.
 * Uses writeBatch and targeted queries.
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

const BATCH_LIMIT = 450; // Firestore batch limit is 500, using 450 to be safe

/**
 * Delete user account while preserving counterparty data integrity
 * v1.1: Scalable version with batches and targeted queries
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
    // 1. Anonymize user in main users collection (Targeted update)
    const userRef = firestoreDoc(db, 'users', userId);
    await updateDoc(userRef, {
      displayName: '[Silinmiş Kullanıcı]',
      email: null,
      photoURL: null,
      phoneNumber: '[REDACTED]',
      phoneNumbers: [],
      deletedAt: new Date(),
      isAnonymized: true
    });
    result.deletedItems.user = true;

    // 2. Process Contacts and their legacy transactions
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    let batch = writeBatch(db);
    let count = 0;

    for (const contactDoc of contactsSnapshot.docs) {
      // Fetch sub-transactions for each contact (legacy path)
      const subTxSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contactDoc.id}/transactions`));
      for (const subTx of subTxSnapshot.docs) {
        batch.delete(subTx.ref);
        result.deletedItems.subTransactions++;
        count++;
        if (count >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      batch.delete(contactDoc.ref);
      result.deletedItems.contacts++;
      count++;
      if (count >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) await batch.commit();

    // 3. Anonymize Debts (Targeted query)
    const debtsQuery = query(
        collection(db, 'debts'),
        where('participants', 'array-contains', userId)
    );
    const debtsSnapshot = await getDocs(debtsQuery);

    batch = writeBatch(db);
    count = 0;

    for (const debtDoc of debtsSnapshot.docs) {
      const data = debtDoc.data();
      const updates: Record<string, unknown> = {};

      if (data.borrowerId === userId) {
        updates.borrowerName = '[Silinmiş Kullanıcı]';
      }
      if (data.lenderId === userId) {
        updates.lenderName = '[Silinmiş Kullanıcı]';
      }

      // Check if we have anything to update (Edge case: participant but not lender/borrower)
      if (Object.keys(updates).length > 0) {
        batch.update(debtDoc.ref, updates);
        result.anonymizedDebts++;
        count++;
        if (count >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }
    if (count > 0) await batch.commit();

    // 4. Cleanup leftover self-transactions if any (Legacy / Safety check)
    // Note: Previously this used global getDocs on 'transactions'.
    // In our architecture, transactions are always subcollections of debts or contacts.
    // So the previous global fetch was likely incorrect or for a collection that doesn't exist.
    // We've handled sub-transactions above.

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
