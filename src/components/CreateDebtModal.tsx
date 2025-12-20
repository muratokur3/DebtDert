import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Ban } from 'lucide-react';
import { SelectedUserCard } from './SelectedUserCard';
import { UserSelector } from './UserSelector';
import { searchUserByPhone, searchContacts, fetchLastUsedName } from '../services/db';
import { formatCurrency } from '../utils/format';
import { formatPhoneForDisplay } from '../utils/phoneUtils';
import type { User, Contact, Installment } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Toggle } from './Toggle';
import { Timestamp } from 'firebase/firestore';
import clsx from 'clsx';
import { useModal } from '../context/ModalContext';

interface CreateDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (
        borrowerId: string,
        borrowerName: string,
        amount: number,
        type: 'LENDING' | 'BORROWING',
        currency: string,
        note?: string,
        dueDate?: Date,
        installments?: Installment[],
        canBorrowerAddPayment?: boolean,
        requestApproval?: boolean,
        initialPayment?: number
    ) => Promise<void>;
    initialPhoneNumber?: string;
    targetUser?: User | Contact | null;
    initialName?: string;
}

export const CreateDebtModal: React.FC<CreateDebtModalProps> = ({ isOpen, onClose, onSubmit, initialPhoneNumber, targetUser, initialName: propInitialName }) => {
    const { user, blockedUsers } = useAuth();
    const { showAlert } = useModal();

    // Derived state for initialization
    const derivedInitialName = targetUser
        ? ('displayName' in targetUser ? targetUser.displayName : targetUser.name)
        : (propInitialName || '');

    const initialPhone = targetUser
        ? ('uid' in targetUser
            ? (targetUser.primaryPhoneNumber || targetUser.phoneNumbers?.[0] || targetUser.phoneNumber || '')
            : targetUser.phoneNumber)
        : (initialPhoneNumber || '');

    const [phoneNumber, setPhoneNumber] = useState(initialPhone);
    const [amount, setAmount] = useState('');
    const [borrowerName, setBorrowerName] = useState(derivedInitialName);

    // Search State
    const [foundUser, setFoundUser] = useState<User | null>(
        targetUser && 'uid' in targetUser ? (targetUser as User) : null
    );
    const [foundContact, setFoundContact] = useState<Contact | null>(
        targetUser && !('uid' in targetUser) ? (targetUser as Contact) : null
    );
    const [searchResults, setSearchResults] = useState<Contact[]>([]);

    const [loading, setLoading] = useState(false);

    // Flow State
    const [step, setStep] = useState<'SEARCH' | 'DETAILS'>('SEARCH');
    const [isShadowUser, setIsShadowUser] = useState(false);

    // New Fields
    const [type, setType] = useState<'LENDING' | 'BORROWING'>('LENDING');
    const [currency, setCurrency] = useState('TRY');
    const [note, setNote] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [canBorrowerAddPayment, setCanBorrowerAddPayment] = useState(false);

    // Installment State
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(1);
    const [downPayment, setDownPayment] = useState('');

    // Blocked check
    const [isTargetBlocked, setIsTargetBlocked] = useState(false);

    // Reset/Init when opening
    useEffect(() => {
        if (isOpen) {
            setPhoneNumber(initialPhone);
            setBorrowerName(derivedInitialName);

            if (targetUser) {
                setStep('DETAILS');
                setIsShadowUser(false);
                if ('uid' in targetUser) {
                    setFoundUser(targetUser as User);
                    setFoundContact(null);
                } else {
                    setFoundContact(targetUser as Contact);
                    setFoundUser(null);
                }
            } else if (propInitialName && initialPhone) {
                // Shadow User Case from PersonDetail (Raw Phone)
                setStep('DETAILS');
                setIsShadowUser(true);
                setFoundContact(null);
                setFoundUser(null);
            } else {
                setStep('SEARCH');
                setIsShadowUser(false);
            }

            // Initialize canBorrowerAddPayment from preference
            if (user?.preferences?.defaultAllowPaymentAddition) {
                setCanBorrowerAddPayment(true);
            } else {
                setCanBorrowerAddPayment(false);
            }
            setDownPayment('');
        }
    }, [isOpen, initialPhoneNumber, targetUser, user, propInitialName]);

    // Check blocked status whenever foundUser or foundContact changes
    useEffect(() => {
        let targetUid = '';
        if (foundUser) {
            targetUid = foundUser.uid;
        } else if (foundContact && foundContact.linkedUserId) {
            targetUid = foundContact.linkedUserId;
        }

        if (targetUid && blockedUsers.some(b => b.blockedUid === targetUid)) {
            setIsTargetBlocked(true);
        } else {
            setIsTargetBlocked(false);
        }
    }, [foundUser, foundContact, blockedUsers]);


    // Search Effect - Disable if NOT in SEARCH step
    useEffect(() => {
        if (step !== 'SEARCH') return;

        const search = async () => {
            if (!user || !phoneNumber || phoneNumber.length < 3) {
                setSearchResults([]);
                setFoundUser(null);

                return;
            }

            try {
                // 1. Search Contacts
                const contacts = await searchContacts(user.uid, phoneNumber);
                const filteredContacts = contacts.filter(c =>
                    !c.linkedUserId || !blockedUsers.some(b => b.blockedUid === c.linkedUserId)
                );

                setSearchResults(filteredContacts);

                // 2. Search System Users (only if full phone number)
                if (phoneNumber.length >= 10) {
                    const sysUser = await searchUserByPhone(phoneNumber);
                    if (sysUser && sysUser.uid !== user.uid) {
                        // Check if blocked
                        if (blockedUsers.some(b => b.blockedUid === sysUser.uid)) {
                            setFoundUser(null); // Don't show blocked system users
                        } else {
                            setFoundUser(sysUser);
                        }
                    } else {
                        setFoundUser(null);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        };

        const timeoutId = setTimeout(search, 500);
        return () => clearTimeout(timeoutId);
    }, [phoneNumber, user, targetUser, blockedUsers]);

    if (!isOpen) return null;

    const handleSelectContact = (contact: Contact) => {
        setFoundContact(contact);
        setPhoneNumber(contact.phoneNumber);
        setBorrowerName(contact.name);
        setSearchResults([]);
        setFoundUser(null);
        setStep('DETAILS');
        setIsShadowUser(false);
    };

    const handleSelectUser = (sysUser: User) => {
        setFoundUser(sysUser);
        setPhoneNumber(sysUser.primaryPhoneNumber || sysUser.phoneNumbers?.[0] || sysUser.phoneNumber || '');
        setBorrowerName(sysUser.displayName || '');
        setSearchResults([]);
        setFoundContact(null);
        setStep('DETAILS');
        setIsShadowUser(false);
    };

    const handleSelectNewNumber = async (rawPhone: string) => {
        setPhoneNumber(rawPhone);
        setFoundContact(null);
        setFoundUser(null);
        setSearchResults([]);

        setStep('DETAILS');
        setIsShadowUser(true);
        setLoading(true);

        // Fetch Last Used Name
        if (user) {
            const ghostName = await fetchLastUsedName(user.uid, rawPhone);
            if (ghostName) {
                setBorrowerName(ghostName);
            } else {
                setBorrowerName('');
            }
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (isTargetBlocked) {
            showAlert("Engellendi", "Engellediğiniz bir kullanıcıya işlem yapamazsınız.", "error");
            return;
        }

        const numAmount = parseFloat(amount);
        const numDownPayment = parseFloat(downPayment) || 0;

        if (isNaN(numAmount) || numAmount <= 0) return;
        if (numDownPayment >= numAmount) {
            showAlert("Hata", "Peşinat tutarı toplam tutardan büyük veya eşit olamaz.", "error");
            return;
        }

        let finalBorrowerId: string = phoneNumber || '';
        let finalBorrowerName = borrowerName;

        if (foundContact) {
            finalBorrowerId = foundContact.linkedUserId || foundContact.phoneNumber;
            finalBorrowerName = borrowerName || foundContact.name;
        } else if (foundUser) {
            finalBorrowerId = foundUser.uid;
            finalBorrowerName = borrowerName || foundUser.displayName;
        }

        if (!finalBorrowerName) {
            finalBorrowerName = formatPhoneForDisplay(finalBorrowerId);
        }

        setLoading(true);
        try {
            // Generate Installments
            let generatedInstallments: Installment[] | undefined;
            if (isInstallment && installmentCount > 1) {
                generatedInstallments = [];
                const remainingToInstallment = numAmount - numDownPayment;
                const perAmount = remainingToInstallment / installmentCount;
                const startDate = dueDate ? new Date(dueDate) : new Date();

                for (let i = 0; i < installmentCount; i++) {
                    const date = new Date(startDate);
                    date.setMonth(date.getMonth() + i);
                    generatedInstallments.push({
                        id: crypto.randomUUID(),
                        dueDate: Timestamp.fromDate(date),
                        amount: perAmount,
                        isPaid: false
                    });
                }
            }

            await onSubmit(
                finalBorrowerId,
                finalBorrowerName,
                numAmount,
                type,
                currency,
                note,
                dueDate ? new Date(dueDate) : undefined,
                generatedInstallments,
                canBorrowerAddPayment,
                true, // Always request approval
                numDownPayment
            );

            onClose();
            // Reset form
            setPhoneNumber('');
            setAmount('');
            setBorrowerName('');
            setFoundUser(null);
            setFoundContact(null);
            setSearchResults([]);
            setNote('');
            setDueDate('');
            setType('LENDING');
            setCurrency('TRY');
            setShowDetails(false);
            setIsInstallment(false);
            setInstallmentCount(1);
            setCanBorrowerAddPayment(false);
            setDownPayment('');

        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                if (error.message.includes("blocked")) {
                    showAlert("İşlem Başarısız", "Bu kullanıcı gizlilik ayarları nedeniyle işlem kabul etmiyor.", "error");
                } else {
                    showAlert("Hata", "İşlem kaydedilirken bir hata oluştu.", "error");
                }
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pb-20 md:pb-4">
            <div className="bg-surface rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200 h-auto max-h-[80dvh] flex flex-col border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-800 flex-none">
                    <h2 className="text-lg font-bold text-text-primary">Yeni İşlem Ekle</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-full">
                        <X size={20} className="text-text-secondary" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                    {/* Blocked Warning */}
                    {isTargetBlocked && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                            <Ban className="text-red-600" size={18} />
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Bu kullanıcı engellendiği için işlem yapılamaz.</p>
                        </div>
                    )}

                    <form id="create-debt-form" onSubmit={handleSubmit} className="space-y-3">
                        {/* 1. Transaction Type (Top Row) */}
                        <div className="flex p-1 bg-background rounded-xl border border-slate-700 mb-3">
                            <button
                                type="button"
                                onClick={() => setType('LENDING')}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                    type === 'LENDING' ? "bg-surface text-green-500 shadow-sm" : "text-text-secondary hover:text-text-primary"
                                )}
                            >
                                Borç Verdim (Alacaklıyım)
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('BORROWING')}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                    type === 'BORROWING' ? "bg-surface text-red-500 shadow-sm" : "text-text-secondary hover:text-text-primary"
                                )}
                            >
                                Borçlandım (Vereceğim)
                            </button>
                        </div>

                        {/* 2. User Selection (Row 2) */}
                        {step === 'DETAILS' ? (
                            <SelectedUserCard
                                name={foundContact?.name || foundUser?.displayName || (isShadowUser ? borrowerName : '')}
                                phoneNumber={phoneNumber}
                                status={foundUser ? 'system' : (foundContact ? 'contact' : 'none')}
                                uid={foundUser ? foundUser.uid : foundContact?.linkedUserId}
                                onClear={() => {
                                    setFoundContact(null);
                                    setFoundUser(null);
                                    setPhoneNumber('');
                                    setBorrowerName('');
                                    setStep('SEARCH');
                                    setIsShadowUser(false);
                                }}
                            />
                        ) : (
                            <UserSelector
                                phoneNumber={phoneNumber}
                                onPhoneChange={(val) => {
                                    setPhoneNumber(val);
                                    setFoundContact(null);
                                    setFoundUser(null);
                                }}
                                searchResults={searchResults}
                                foundUser={foundUser}
                                onSelectContact={handleSelectContact}
                                onSelectUser={handleSelectUser}
                                onSelectNewNumber={handleSelectNewNumber}
                                autoFocus
                            />
                        )}

                        {/* 3. Amount & Currency (Row 3) */}
                        <div className="grid grid-cols-[7fr_3fr] gap-3 mt-3">
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-text-secondary mb-1 ml-1">Tutar</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min={0}
                                    step="0.01"
                                    disabled={isTargetBlocked}
                                    className="w-full px-4 h-14 rounded-xl border border-slate-700 bg-background text-text-primary focus:border-primary focus:ring-2 focus:ring-blue-900/50 outline-none transition-all text-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-text-secondary mb-1 ml-1">Birim</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    disabled={isTargetBlocked}
                                    className="w-full px-2 h-14 rounded-xl border border-slate-700 bg-background text-text-primary focus:border-primary focus:ring-2 focus:ring-blue-900/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    <option value="TRY">TRY</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GOLD">Altın</option>
                                </select>
                            </div>
                        </div>

                        {/* 4. Collapsible Details */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                disabled={isTargetBlocked}
                                className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors w-full justify-center py-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-50/50 dark:bg-blue-900/10 rounded-lg"
                            >
                                {showDetails ? (
                                    <>Daha Az Detay <ChevronUp size={16} /></>
                                ) : (
                                    <>Detaylar & Taksit Seçenekleri 🔽</>
                                )}
                            </button>

                            {showDetails && (
                                <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Note */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">Not (Opsiyonel)</label>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            rows={2}
                                            disabled={isTargetBlocked}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-background text-text-primary focus:border-primary focus:ring-2 focus:ring-blue-900/50 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Açıklama giriniz..."
                                        />
                                    </div>

                                    {/* Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">
                                            {isInstallment ? 'İlk Taksit Tarihi' : 'Vade Tarihi (Opsiyonel)'}
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-background text-text-primary focus:border-primary focus:ring-2 focus:ring-blue-900/50 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Installment Toggle */}
                                    <div className={clsx(
                                        "p-4 rounded-xl border transition-all",
                                        isInstallment ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800" : "bg-background border-slate-700"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-text-primary">Taksitlendir</span>
                                            <Toggle
                                                checked={isInstallment}
                                                onChange={(val) => {
                                                    setIsInstallment(val);
                                                    if (val) setInstallmentCount(2);
                                                    else setInstallmentCount(1);
                                                }}
                                                label=""
                                            />
                                        </div>

                                        {isInstallment && (
                                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-1 border-t border-slate-200 dark:border-slate-700 pt-3">
                                                {/* Down Payment */}
                                                <div>
                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Peşinat (Opsiyonel)</label>
                                                    <input
                                                        type="number"
                                                        value={downPayment}
                                                        onChange={(e) => setDownPayment(e.target.value)}
                                                        min={0}
                                                        max={parseFloat(amount) || 0}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-surface/50 text-text-primary text-sm focus:border-primary outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-text-secondary mb-1">Taksit Sayısı</label>
                                                    <input
                                                        type="number"
                                                        value={installmentCount}
                                                        onChange={(e) => setInstallmentCount(parseInt(e.target.value))}
                                                        min={2}
                                                        max={24}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-surface/50 text-text-primary text-sm focus:border-primary outline-none"
                                                    />
                                                </div>

                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                    <p className="text-xs text-blue-800 dark:text-blue-200 flex justify-between">
                                                        <span>Kalan Tutar:</span>
                                                        <span className="font-bold">{formatCurrency(parseFloat(amount || '0') - (parseFloat(downPayment) || 0), currency)}</span>
                                                    </p>
                                                    <p className="text-xs text-blue-800 dark:text-blue-200 flex justify-between mt-1">
                                                        <span>Aylık Taksit:</span>
                                                        <span className="font-bold">{formatCurrency(((parseFloat(amount || '0') - (parseFloat(downPayment) || 0)) / installmentCount) || 0, currency)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Permission Toggle */}
                                    <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-slate-700">
                                        <span className="text-sm font-medium text-text-primary">Karşı taraf ödeme ekleyebilsin</span>
                                        <Toggle
                                            checked={canBorrowerAddPayment}
                                            onChange={setCanBorrowerAddPayment}
                                            label=""
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Sticky Footer */}
                <div className="p-4 border-t border-slate-800 bg-surface rounded-b-2xl flex-none z-10 w-full">
                    <button
                        type="submit"
                        form="create-debt-form"
                        disabled={loading || !amount || (!foundUser && !foundContact && !borrowerName) || isTargetBlocked}
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'İşleniyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};
