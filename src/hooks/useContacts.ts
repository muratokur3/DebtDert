import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { subscribeToContacts } from '../services/db';
import type { Contact } from '../types';

export const useContacts = () => {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: () => void;
        if (user) {
            setLoading(true);
            unsubscribe = subscribeToContacts(user.uid, (data) => {
                setContacts(data);
                setLoading(false);
            });
        } else {
            setContacts([]);
            setLoading(false);
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user?.uid]);

    // Manual refresh is no longer needed but kept for API compatibility.
    const refreshContacts = () => { };

    const isContact = (identifier: string) => {
        // Identifier can be UID or Phone
        return contacts.some(c => c.phoneNumber === identifier || c.linkedUserId === identifier);
    };

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

    return { contacts, contactsMap, loading, refreshContacts, isContact };
};
