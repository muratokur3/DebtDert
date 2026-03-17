import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc as firestoreDoc
} from 'firebase/firestore';
import { db } from './firebase';
import type { Debt, Transaction, User, Contact } from '../types';

/**
 * Export Service - GDPR Compliant Data Export
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
 * Optimised for scalability using targeted queries
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
    // 1. Fetch user profile data
    const userRef = firestoreDoc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      exportData.user = { ...userSnap.data(), uid: userId } as User;
    }

    // 2. Fetch contacts (subcollection is already targeted)
    const contactsSnapshot = await getDocs(collection(db, `users/${userId}/contacts`));
    exportData.contacts = contactsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));

    // 3. Fetch debts (Targeted query using participants)
    const debtsQuery = query(
      collection(db, 'debts'),
      where('participants', 'array-contains', userId)
    );
    const debtsSnapshot = await getDocs(debtsQuery);
    exportData.debts = debtsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Debt));

    // 4. Fetch global transactions (where user is sender or receiver)
    // Note: We perform two queries because Firestore doesn't support 'OR' queries on different fields easily
    // without composite indexes, but 'where' combined with in-memory merging is efficient here.
    const txFromQuery = query(collection(db, 'transactions'), where('fromUserId', '==', userId));
    const txToQuery = query(collection(db, 'transactions'), where('toUserId', '==', userId));

    const [txFromSnap, txToSnap] = await Promise.all([
      getDocs(txFromQuery),
      getDocs(txToQuery)
    ]);

    const txMap = new Map<string, Transaction>();

    txFromSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
    txToSnap.docs.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));

    exportData.transactions = Array.from(txMap.values());

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
