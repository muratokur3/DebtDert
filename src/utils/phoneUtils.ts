import { parsePhoneNumber, isValidPhoneNumber as isValidLibPhone } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

/**
 * Standardizes a phone number to E.164 format.
 * Rules:
 * - Must start with +
 * - Only digits after +
 * - Length 8-15 digits
 * 
 * @param input The raw input from UI or system
 * @param defaultRegion? Optional region to try if + is missing (e.g. 'TR')
 */
export const formatToE164 = (input: string, defaultRegion?: string): string | null => {
    if (!input) return null;

    // Remove everything except digits and the leading +
    const clean = input.trim();
    
    try {
        const phoneNumber = parsePhoneNumber(clean, defaultRegion as CountryCode);
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
    } catch {
        // Fallback to manual cleanup if libphone fails but format looks okay
    }

    // Manual fallback: string starts with +, has 8-15 digits total
    const digitsOnly = input.replace(/\D/g, '');
    if (input.includes('+') && digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        return '+' + digitsOnly;
    }

    return null;
};

/**
 * Strict E.164 Validation
 * Format: +[CountryCode][Number] (e.g., +905551234567)
 */
export const isValidPhone = (number: string): boolean => {
    if (!number) return false;
    // E.164 Regex: Starts with +, followed by 7 to 15 digits
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(number)) return false;
    
    // Validate with libphonenumber as second layer if possible
    try {
        return isValidLibPhone(number);
    } catch {
        return true; 
    }
};

/**
 * Formats a phone number for display.
 * @param e164Number The clean E.164 number
 */
export const formatPhoneForDisplay = (e164Number: string): string => {
    if (!e164Number) return '';
    try {
        const phoneNumber = parsePhoneNumber(e164Number);
        if (phoneNumber) {
            return phoneNumber.format('INTERNATIONAL');
        }
    } catch {
        // ignore
    }
    return e164Number;
};

// Legacy alias for gradual migration
export const cleanPhone = (input: string): string => {
    return formatToE164(input, 'TR') || '';
};

/**
 * Standardizes a raw search term into a potential phone number.
 * Handles cases like:
 * - 0551... -> +90551...
 * - 90551... -> +90551...
 * - +90551... -> +90551...
 */
export const standardizeRawPhone = (input: string): string => {
    const raw = input.replace(/\s/g, '');
    if (!raw) return '';

    // If starts with +, it's already a candidate E.164
    if (raw.startsWith('+')) return raw;

    // If starts with 0 and has 11 digits (Turkey local format)
    if (raw.startsWith('0') && raw.length === 11) {
        return '+90' + raw.substring(1);
    }

    // If starts with 90 and has 12 digits (Turkey code without +)
    if (raw.startsWith('90') && raw.length === 12) {
        return '+' + raw;
    }

    // If it's a 10 digit number, assume TR (+90)
    if (raw.length === 10 && /^\d+$/.test(raw)) {
        return '+90' + raw;
    }

    // Otherwise, if it has digits, just prefix with + to trigger E.164 parsing in components
    if (/^\d+$/.test(raw) && raw.length > 5) {
        return '+' + raw;
    }

    return raw;
};
