import {
    collection,
    getDocs,
    deleteDoc,
    doc as firestoreDoc,
    updateDoc,
    writeBatch,
    query,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import { cleanPhone } from '../utils/phoneUtils';

/**
 * Account Deletion Service - GDPR Compliant
 * 
 * Strategy:
 * 1. Anonymize user profile (Redact PII)
 * 2. Delete private contacts and their internal transactions
 * 3. Anonymize shared debts (names/notes) but keep financial records for counterparties
 * 4. Anonymize shared ledger transactions and logs
 * 5. Delete phone registry entry
 */

export interface DeletionResult {
  success: boolean;
  message: string;
  counts: {
    contacts: number;
    subTransactions: number;
    anonymizedDebts: number;
    anonymizedLogs: number;
  };
}

/**
 * Delete user account while preserving counterparty data integrity
 */
export async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  const result: DeletionResult = {
    success: false,
    message: '',
    counts: {
      contacts: 0,
      subTransactions: 0,
      anonymizedDebts: 0,
      anonymizedLogs: 0
    }
  };

  try {
    // 0. Get user data for phone registry deletion
    const userDocSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
    const userData = !userDocSnap.empty ? userDocSnap.docs[0].data() : null;

    // 1. Anonymize User Profile
    const userRef = firestoreDoc(db, 'users', userId);
    await updateDoc(userRef, {
      displayName: '[Silinmiş Kullanıcı]',
      email: null,
      photoURL: null,
      phoneNumber: '[REDACTED]',
      phoneNumbers: [],
      deletedAt: new Date(),
      isAnonymized: true,
      userType: 'INDIVIDUAL' // Reset to default
    });

    // 2. Process Contacts and their sub-transactions
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));

    if (!contactsSnapshot.empty) {
      let batch = writeBatch(db);
      let count = 0;

      for (const contactDoc of contactsSnapshot.docs) {
        // Recursive delete transactions under this contact
        const txSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contactDoc.id}/transactions`));
        for (const txDoc of txSnapshot.docs) {
          batch.delete(txDoc.ref);
          result.counts.subTransactions++;
          count++;
          if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }

        batch.delete(contactDoc.ref);
        result.counts.contacts++;
        count++;
        if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    }

    // 3. Anonymize Shared Debts and their Ledger Transactions
    const debtsQuery = query(collection(db, 'debts'), where('participants', 'array-contains', userId));
    const debtsSnapshot = await getDocs(debtsQuery);

    if (!debtsSnapshot.empty) {
      let batch = writeBatch(db);
      let count = 0;

      for (const debtDoc of debtsSnapshot.docs) {
        const data = debtDoc.data();
        const updates: Record<string, unknown> = {};
        
        if (data.borrowerId === userId) updates.borrowerName = '[Silinmiş Kullanıcı]';
        if (data.lenderId === userId) updates.lenderName = '[Silinmiş Kullanıcı]';

        // Redact private notes if the user was the creator
        if (data.createdBy === userId) {
          updates.note = '[NOT SİLİNDİ]';
        }

        if (Object.keys(updates).length > 0) {
          batch.update(debtDoc.ref, updates);
          result.counts.anonymizedDebts++;
          count++;
        }

        // Anonymize shared ledger transactions
        const ledgerTxSnapshot = await getDocs(collection(db, `debts/${debtDoc.id}/transactions`));
        for (const txDoc of ledgerTxSnapshot.docs) {
          const txData = txDoc.data();
          if (txData.createdBy === userId) {
            batch.update(txDoc.ref, {
              description: '[NOT SİLİNDİ]',
              createdBy: userId // Keep ID for participant logic but redact text
            });
            result.counts.subTransactions++;
            count++;
          }
          if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }

        // Anonymize logs
        const logsSnapshot = await getDocs(collection(db, `debts/${debtDoc.id}/logs`));
        for (const logDoc of logsSnapshot.docs) {
          const logData = logDoc.data();
          if (logData.performedBy === userId) {
            batch.update(logDoc.ref, {
              note: '[NOT SİLİNDİ]'
            });
            result.counts.anonymizedLogs++;
            count++;
          }
          if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
        }

        if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
    }

    // 4. Delete Phone Registry
    if (userData && userData.phoneNumber) {
      const phone = cleanPhone(userData.phoneNumber);
      if (phone) {
        const registryRef = firestoreDoc(db, 'phone_registry', phone);
        await deleteDoc(registryRef).catch(() => {}); // Best effort
      }
    }

    result.success = true;
    result.message = 'Hesabınız başarıyla silindi. Verileriniz anonimleştirildi.';
    return result;

  } catch (error) {
    console.error('Account deletion failed:', error);
    result.message = 'Hesap silme işlemi başarısız oldu.';
    throw error;
  }
}

/**
 * High-level trigger for account deletion
 */
export async function initiateAccountDeletion(userId: string): Promise<void> {
  await deleteUserAccount(userId);
}
