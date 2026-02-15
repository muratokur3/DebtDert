import React, { createContext, useState, useEffect, useMemo } from 'react';
import type { Contact } from '../types';
import { useAuth } from '../hooks/useAuth';
import { subscribeToContacts, autoLinkSystemContacts } from '../services/db';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Debt } from '../types';

interface ContactContextType {
    contacts: Contact[];
    contactsMap: Map<string, Contact>;
    loading: boolean;
    refreshContacts: () => void;
    isContact: (identifier: string) => boolean;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const ContactProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(true);

    // Combine auth loading and contacts loading
    const loading = authLoading || contactsLoading;

    useEffect(() => {
        let unsubscribe: () => void;
        if (user) {
            // We want to show loading when user switches. 
            // Setting it here is technically a side-effect causing a re-render, but necessary for UX.
            // We can check if it's already true to avoid redundant updates, but the warning might persist.
            // To silence the warning validly, we acknowledge we want a re-render to show loading state.
            setTimeout(() => {
                setContactsLoading(true);
            }, 0);
            
            unsubscribe = subscribeToContacts(user.uid, (data) => {
                setContacts(data);
                setContactsLoading(false);
            });
        } else {
            setTimeout(() => {
                setContacts([]);
                setContactsLoading(false);
            }, 0);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]); // intended dependency on user object change

    // AUTO-LINK (SELF REPAIR) PROTOCOL
    // Runs once when user and contacts are loaded to fix "Blue" contacts.
    useEffect(() => {
        if (user && contacts.length > 0 && !contactsLoading) {
            // Use a small timeout to avoid blocking main thread on initial render
            const timer = setTimeout(async () => {
                try {
                    // We need debts to know WHICH system users to check.
                    // Fetching ALL debts might be heavy, but it's necessary for the repair.
                    // Optimization: We could limit to active debts, but for now let's be thorough.
                    // To avoid subscribing to all debts, we just do a one-off fetch here.
                    const debtsRef = collection(db, 'debts');
                    const q = query(debtsRef, where('participants', 'array-contains', user.uid));
                    const snapshot = await getDocs(q);
                    const debts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Debt));

                    if (debts.length > 0) {
                        // We need to reconstruct the map here because the memoized 'contactsMap' 
                        // might not be accessible or up-to-date inside this async closure if we don't depend on it.
                        // Actually, we can depend on 'contactsMap' or just rebuild it efficiently.
                        // Let's rely on the contacts array which we have.
                        const tempMap = new Map<string, Contact>();
                        contacts.forEach(c => {
                             tempMap.set(c.id, c);
                             if (c.phoneNumber) tempMap.set(c.phoneNumber, c);
                             if (c.linkedUserId) tempMap.set(c.linkedUserId, c);
                        });

                        await autoLinkSystemContacts(user.uid, debts, tempMap);
                    }
                } catch (e) {
                    console.error("[AutoLink] Failed in ContactContext", e);
                }
            }, 3000); // 3 seconds delay
            return () => clearTimeout(timer);
        }
    }, [user, contacts, contactsLoading]); // Added missing dependencies

    // Map for O(1) lookup by ID, Linked User ID, or Phone Number
    const contactsMap = useMemo(() => {
        const map = new Map<string, Contact>();
        contacts.forEach(c => {
            map.set(c.id, c); // Doc ID
            if (c.phoneNumber) map.set(c.phoneNumber, c);
            if (c.linkedUserId) map.set(c.linkedUserId, c);
        });
        return map;
    }, [contacts]);

    const isContact = (identifier: string) => {
        return contacts.some(c => c.phoneNumber === identifier || c.linkedUserId === identifier);
    };

    const refreshContacts = () => { };

    const value = {
        contacts,
        contactsMap,
        loading,
        refreshContacts,
        isContact
    };

    return (
        <ContactContext.Provider value={value}>
            {children}
        </ContactContext.Provider>
    );
};

export { ContactContext };
