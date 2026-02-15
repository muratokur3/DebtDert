import { useContext } from 'react';
import { ContactContext } from '../context/ContactContext';

export const useContacts = () => {
    const context = useContext(ContactContext);
    if (context === undefined) {
        throw new Error('useContacts must be used within a ContactProvider');
    }
    return context;
};
