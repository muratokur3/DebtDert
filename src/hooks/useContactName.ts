import { useContacts } from './useContacts';
import { formatPhoneForDisplay as formatPhoneNumber } from '../utils/phoneUtils';

interface ContactNameResult {
    displayName: string; // The best name found
    source: 'contact' | 'user' | 'phone';
    originalName?: string; // If 'contact', this is the contact name. If 'user', display name.
}

export const useContactName = () => {
    const { contacts } = useContacts();

    const resolveName = (identifier: string, fallbackName?: string): ContactNameResult => {
        // 1. Check Local Contacts (My Address Book)
        // Identifier could be a Phone or a UID. 
        // Contacts are stored with 'phoneNumber' (cleaned) and 'linkedUserId'.

        const cleanIdentifier = identifier.replace(/\s/g, ''); // Simple cleanup for comparison if not already clean
        const contactMatch = contacts.find(c =>
            c.phoneNumber === identifier || c.phoneNumber === cleanIdentifier || c.linkedUserId === identifier
        );

        if (contactMatch) {
            return {
                displayName: contactMatch.name,
                source: 'contact',
                originalName: contactMatch.name
            };
        }

        // 2. Check fallbackName (Snapshot Name from Debt/User)
        // If we have a fallback name that is NOT just the phone number itself, use it.
        // This fixes the issue where "Ahmet" is passed as fallback, but the function sees a phone ID and returns formatted phone.
        if (fallbackName && fallbackName !== identifier && fallbackName.replace(/\D/g, '').length !== identifier.replace(/\D/g, '').length) {
            return {
                displayName: fallbackName,
                source: 'user', // Technically 'snapshot' or 'user' provided
                originalName: fallbackName
            };
        }

        // 3. Fallback to Phone
        // If identifier looks like a phone, format it.
        if (identifier.replace(/\D/g, '').length >= 10) {
            return {
                displayName: formatPhoneNumber(identifier),
                source: 'phone'
            };
        }

        return {
            displayName: fallbackName || identifier,
            source: 'user'
        };
    };

    return { resolveName };
};
