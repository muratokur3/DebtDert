/**
 * Platform-Aware Contacts Service
 * Web: Contact Picker API (navigator.contacts)
 * Native (Capacitor): @capacitor-community/contacts plugin
 */

import { Capacitor } from '@capacitor/core';

export interface DeviceContact {
    name: string;
    phones: string[];
}

/**
 * Cihaz rehberinden kişileri al.
 * Platform'a göre doğru API'yi kullanır.
 */
export async function getDeviceContacts(): Promise<DeviceContact[]> {
    try {
        if (Capacitor.isNativePlatform()) {
            return await getNativeContacts();
        } else {
            return await getWebContacts();
        }
    } catch (error) {
        console.error('[Contacts] Rehber erişim hatası:', error);
        throw error;
    }
}

/**
 * Platform'da rehber erişiminin desteklenip desteklenmediğini kontrol eder.
 */
export function isContactsSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
        return true;
    }
    try {
        return 'contacts' in navigator && 'ContactsManager' in window;
    } catch {
        return false;
    }
}

// --- Native (Capacitor) ---

async function getNativeContacts(): Promise<DeviceContact[]> {
    try {
        const { Contacts } = await import('@capacitor-community/contacts');

        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted') {
            throw new Error('Rehber erişim izni reddedildi.');
        }

        const result = await Contacts.getContacts({
            projection: {
                name: true,
                phones: true
            }
        });

        return (result.contacts || [])
            .filter(c => c.phones && c.phones.length > 0)
            .map(c => ({
                name: c.name?.display || c.name?.given || '',
                phones: (c.phones || []).map(p => p.number || '').filter(Boolean)
            }));
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Contacts] Native rehber hatası:', msg);
        // Plugin yüklü değilse veya hata oluştuysa Web fallback dene
        if (msg.includes('not implemented') || msg.includes('not available')) {
            console.warn('[Contacts] Native plugin yok, web fallback deneniyor...');
            return getWebContacts();
        }
        throw new Error(`Rehber erişiminde hata: ${msg}`);
    }
}

// --- Web (Contact Picker API) ---

async function getWebContacts(): Promise<DeviceContact[]> {
    if (!('contacts' in navigator) || !('ContactsManager' in window)) {
        throw new Error('Bu cihazda rehber erişimi desteklenmiyor. Lütfen kişileri manuel olarak ekleyin.');
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        const contacts = await nav.contacts.select(['name', 'tel'], { multiple: true });

        if (!contacts || contacts.length === 0) {
            return [];
        }

        return contacts.map((c: { name?: string[]; tel?: string[] }) => ({
            name: c.name?.[0] || '',
            phones: c.tel || []
        }));
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        // Kullanıcı iptal etti ise boş dön (hata değil)
        if (msg.includes('abort') || msg.includes('cancel')) {
            return [];
        }
        throw new Error(`Rehber erişiminde hata: ${msg}`);
    }
}
