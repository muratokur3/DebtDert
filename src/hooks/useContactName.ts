import { useCallback } from 'react';
import { useContacts } from './useContacts';
import { formatPhoneForDisplay as formatPhoneNumber } from '../utils/phoneUtils';

interface ContactNameResult {
    displayName: string; // The best name found
    source: 'contact' | 'user' | 'phone';
    status: 'contact' | 'system' | 'none'; // Standardized status for UI (Avatar color)
    originalName?: string; // If 'contact', this is the contact name. If 'user', display name.
    linkedUserId?: string;
}

export const useContactName = () => {
    const { contacts, contactsMap } = useContacts();

    const resolveName = useCallback((identifier: string, fallbackName?: string, phoneNumber?: string): ContactNameResult => {
        // 1. Check Local Contacts (My Address Book) via Identifier
        // Identifier could be a Phone (E.164) or a UID. 
        // contactsMap is keyed by E.164 phone number.
        
        // A. Primary Match (If identifier IS the phone number key)
        let contactMatch = contactsMap.get(identifier);

        // B. Secondary Match via Phone Hint (If identifier is UID but we know the phone)
        if (!contactMatch && phoneNumber) {
            contactMatch = contactsMap.get(phoneNumber);
        }

        if (contactMatch) {
            return {
                displayName: contactMatch.name,
                source: 'contact',
                status: 'contact',
                originalName: contactMatch.name,
                linkedUserId: contactMatch.linkedUserId
            };
        }

        // 2. Check by UID (Reverse Lookup in Array)
        // If identifier is a UID, it won't be in the phone map key unless we map UIDs too.
        if (identifier.length > 20) {
            const uidMatch = contacts.find(c => c.linkedUserId === identifier);
            if (uidMatch) {
                return {
                    displayName: uidMatch.name,
                    source: 'contact',
                    status: 'contact',
                    originalName: uidMatch.name,
                    linkedUserId: uidMatch.linkedUserId
                };
            }
        }

        // 3. Fallback to Fallback Name (System Name or Debt Snapshot)
        // If we have a fallback name that is NOT just the phone number itself, use it.
        if (fallbackName && fallbackName !== identifier && fallbackName.replace(/\D/g, '').length !== identifier.replace(/\D/g, '').length) {
            
            // If the identifier is long (UID) and we have a fallback name, it's likely a System User Name
            // In this case, source is 'user' (System)
            const source = identifier.length > 20 ? 'user' : 'user';
            
            // Status Logic: If Source is 'user' AND Identifier is UID -> System (Blue)
            const status = (source === 'user' && identifier.length > 20) ? 'system' : 'none';

            return {
                displayName: fallbackName,
                source: source, 
                status: status,
                originalName: fallbackName
            };
        }

        // 4. Fallback to Phone Format
        const phoneToFormat = phoneNumber || (identifier.replace(/\D/g, '').length >= 10 ? identifier : null);

        if (phoneToFormat) {
            return {
                displayName: formatPhoneNumber(phoneToFormat),
                source: 'phone',
                status: 'none'
            };
        }

        return {
            displayName: fallbackName || identifier,
            source: 'user',
            status: identifier.length > 20 ? 'system' : 'none'
        };
    }, [contacts, contactsMap]);

    return { resolveName };
};
