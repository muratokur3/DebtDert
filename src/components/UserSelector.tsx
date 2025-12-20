import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Avatar } from './Avatar';
import { formatPhoneForDisplay } from '../utils/phoneUtils';
import type { User, Contact } from '../types';

interface UserSelectorProps {
    phoneNumber: string;
    onPhoneChange: (value: string) => void;
    searchResults: Contact[];
    foundUser: User | null;
    onSelectContact: (contact: Contact) => void;
    onSelectUser: (user: User) => void;
    onSelectNewNumber: (phone: string) => void;
    autoFocus?: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
    phoneNumber,
    onPhoneChange,
    searchResults,
    foundUser,
    onSelectContact,
    onSelectUser,
    onSelectNewNumber,
    autoFocus = false
}) => {
    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
            </div>
            <input
                type="text"
                value={phoneNumber}
                onChange={(e) => onPhoneChange(e.target.value)}
                className="w-full pl-10 pr-12 h-12 rounded-xl border border-slate-700 bg-background text-text-primary focus:border-primary focus:ring-2 focus:ring-blue-900/50 outline-none transition-all"
                placeholder="İsim veya Telefon Ara..."
                autoFocus={autoFocus}
            />

            {/* Search Results Dropdown */}
            {(searchResults.length > 0 || foundUser || (phoneNumber.replace(/\D/g, '').length >= 3)) && (
                <div className="mt-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto absolute w-full z-20">
                    {/* Contacts */}
                    {searchResults.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => onSelectContact(contact)}
                            className="p-3 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-gray-50 dark:border-slate-800 last:border-0"
                        >
                            <Avatar
                                name={contact.name}
                                size="sm"
                                status={contact.linkedUserId ? 'system' : 'contact'}
                                uid={contact.linkedUserId}
                            />
                            <div>
                                <p className="text-sm font-semibold text-text-primary">{contact.name}</p>
                                <p className="text-xs text-text-secondary">{contact.phoneNumber} (Rehber)</p>
                            </div>
                        </div>
                    ))}

                    {/* System User Match */}
                    {foundUser && !searchResults.some(c => c.phoneNumber === (foundUser.primaryPhoneNumber || foundUser.phoneNumber)) && (
                        <div
                            onClick={() => onSelectUser(foundUser)}
                            className="p-3 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer flex items-center gap-3 border-t border-gray-100 dark:border-slate-800"
                        >
                            <Avatar
                                name={foundUser.displayName || ''}
                                photoURL={foundUser.photoURL || undefined}
                                size="sm"
                                status="system"
                            />
                            <div>
                                <p className="text-sm font-semibold text-text-primary">{foundUser.displayName}</p>
                                <p className="text-xs text-green-600 dark:text-green-400">Sistem Kullanıcısı</p>
                            </div>
                        </div>
                    )}

                    {/* Create New Entry Row */}
                    {phoneNumber.replace(/\D/g, '').length >= 10 && !foundUser && !searchResults.some(c => c.phoneNumber.includes(phoneNumber.replace(/\D/g, ''))) && (
                        <div
                            onClick={() => onSelectNewNumber(phoneNumber)}
                            className="p-3 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-t border-gray-100 dark:border-slate-800"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-secondary">
                                <Plus size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Yeni Kişi Oluştur</p>
                                <p className="text-xs text-text-secondary">{formatPhoneForDisplay(phoneNumber)}</p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {searchResults.length === 0 && !foundUser && phoneNumber.length > 0 && phoneNumber.replace(/\D/g, '').length < 10 && (
                        <div className="p-4 text-center text-text-secondary text-sm">
                            Sonuç bulunamadı. Yeni numara için en az 10 hane girin.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
