import { collection, getDocs, doc as firestoreDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Debt, Transaction, User, Contact } from '../types';

/**
 * Export Service - GDPR Compliant Data Export
 * Version: 1.1 (Targeted Queries & Full Transaction Aggregation)
 */

export interface ExportData {
  user: User;
  contacts: Contact[];
  debts: Debt[];
  transactions: {
    ledger: Record<string, Transaction[]>; // Key: Ledger ID
    private: Record<string, Transaction[]>; // Key: Contact ID
  };
  exportDate: string;
  version: string;
}

/**
 * Export all user data as JSON
 */
export async function exportUserDataAsJSON(userId: string): Promise<string> {
  const exportData: ExportData = {
    user: {} as User,
    contacts: [],
    debts: [],
    transactions: {
      ledger: {},
      private: {}
    },
    exportDate: new Date().toISOString(),
    version: '1.1'
  };

  try {
    // 1. Fetch user data directly
    const userDoc = await getDoc(firestoreDoc(db, 'users', userId));
    if (userDoc.exists()) {
      exportData.user = { ...userDoc.data(), uid: userId } as User;
    }

    // 2. Fetch contacts (Targeted Subcollection)
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    exportData.contacts = contactsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));

    // Fetch private transactions for each contact
    for (const contact of exportData.contacts) {
        const txsSnapshot = await getDocs(collection(db, `users/${userId}/contacts/${contact.id}/transactions`));
        if (!txsSnapshot.empty) {
            exportData.transactions.private[contact.id] = txsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Transaction));
        }
    }

    // 3. Fetch debts (Targeted Query via participants)
    const debtsRef = collection(db, 'debts');
    const debtsQuery = query(debtsRef, where('participants', 'array-contains', userId));
    const debtsSnapshot = await getDocs(debtsQuery);

    exportData.debts = debtsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Debt));

    // Fetch transactions for each LEDGER debt
    for (const debt of exportData.debts) {
        if (debt.type === 'LEDGER') {
            const txsSnapshot = await getDocs(collection(db, `debts/${debt.id}/transactions`));
            if (!txsSnapshot.empty) {
                exportData.transactions.ledger[debt.id] = txsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Transaction));
            }
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
  if (link.download !== undefined) {
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
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
