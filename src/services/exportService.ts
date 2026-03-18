import { collection, getDocs, getDoc, doc as firestoreDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Debt, Transaction, User, Contact } from '../types';

/**
 * Export Service - GDPR Compliant Data Export
 * Version 1.1 - Optimized for Scalability
 */

export interface ExportData {
  user: User;
  contacts: Contact[];
  debts: Debt[];
  transactions: Transaction[];
  exportDate: string;
  version: string;
}

/**
 * Export all user data as JSON
 * v1.1: Uses targeted queries instead of global collection fetches
 */
export async function exportUserDataAsJSON(userId: string): Promise<string> {
  const exportData: ExportData = {
    user: {} as User,
    contacts: [],
    debts: [],
    transactions: [],
    exportDate: new Date().toISOString(),
    version: '1.1'
  };

  try {
    // 1. Fetch user data (Targeted)
    const userDocRef = firestoreDoc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      exportData.user = { ...userSnap.data() as User, uid: userId };
    }

    // 2. Fetch contacts (Targeted)
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    exportData.contacts = contactsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));

    // 3. Fetch contact-based transactions (Deprecated but still used for old data)
    for (const contactDoc of exportData.contacts) {
      const contactTxSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contactDoc.id}/transactions`));
      const contactTxs = contactTxSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      exportData.transactions.push(...contactTxs);
    }

    // 4. Fetch debts (Targeted via participants query)
    const debtsQuery = query(
      collection(db, 'debts'),
      where('participants', 'array-contains', userId)
    );
    const debtsSnapshot = await getDocs(debtsQuery);

    exportData.debts = debtsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Debt));

    // 5. Fetch ledger-based transactions
    for (const debt of exportData.debts) {
      if (debt.type === 'LEDGER') {
        const ledgerTxSnapshot = await getDocs(collection(db, `debts/${debt.id}/transactions`));
        const ledgerTxs = ledgerTxSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Transaction));
        exportData.transactions.push(...ledgerTxs);
      }
    }

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
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export user data and trigger download
 */
export async function exportAndDownloadUserData(userId: string) {
  const jsonData = await exportUserDataAsJSON(userId);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadJSON(jsonData, `debtdert_export_${timestamp}.json`);
}
