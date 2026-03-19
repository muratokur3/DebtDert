import {
    collection,
    getDocs,
    getDoc,
    doc as firestoreDoc,
    query,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import type { Debt, Transaction, User, Contact, PaymentLog } from '../types';

/**
 * Export Service - GDPR Compliant Data Export
 */

export interface ExportData {
  user: User;
  contacts: (Contact & { transactions: Transaction[] })[];
  debts: (Debt & { transactions: Transaction[]; logs: PaymentLog[] })[];
  exportDate: string;
  version: string;
}

/**
 * Export all user data as JSON
 */
export async function exportUserDataAsJSON(userId: string): Promise<string> {
  try {
    // 1. Fetch User Profile
    const userDoc = await getDoc(firestoreDoc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('Kullanıcı profili bulunamadı.');
    }
    const userData = { ...userDoc.data(), uid: userId } as User;

    // 2. Fetch Contacts and their Transactions
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    const contactsWithTransactions = await Promise.all(
      contactsSnapshot.docs.map(async (contactDoc) => {
        const contactData = { id: contactDoc.id, ...contactDoc.data() } as Contact;

        // Fetch sub-transactions for each contact
        const txSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contactDoc.id}/transactions`));
        const transactions = txSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

        return { ...contactData, transactions };
      })
    );

    // 3. Fetch Debts (where user is participant) and their Sub-data
    const debtsQuery = query(
      collection(db, 'debts'),
      where('participants', 'array-contains', userId)
    );
    const debtsSnapshot = await getDocs(debtsQuery);

    const debtsWithDetails = await Promise.all(
      debtsSnapshot.docs.map(async (debtDoc) => {
        const debtData = { id: debtDoc.id, ...debtDoc.data() } as Debt;

        // Fetch ledger transactions (if LEDGER type)
        const txSnapshot = await getDocs(collection(db, `debts/${debtDoc.id}/transactions`));
        const transactions = txSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));

        // Fetch logs
        const logsSnapshot = await getDocs(collection(db, `debts/${debtDoc.id}/logs`));
        const logs = logsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentLog));

        return { ...debtData, transactions, logs };
      })
    );

    const exportData: ExportData = {
      user: userData,
      contacts: contactsWithTransactions,
      debts: debtsWithDetails,
      exportDate: new Date().toISOString(),
      version: '1.1'
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Veri dışa aktarılamadı. Lütfen tekrar deneyin.');
  }
}

/**
 * Download JSON export as file
 */
export function downloadJSON(jsonString: string, filename: string = 'debtdert_export.json') {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  if (link.download !== undefined) {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Export user data and trigger download
 */
export async function exportAndDownloadUserData(userId: string) {
  const jsonData = await exportUserDataAsJSON(userId);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadJSON(jsonData, `debtdert_export_${timestamp}.json`);
}
