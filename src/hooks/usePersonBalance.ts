import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useLedger } from './useLedger';
import { calculateLedgerBalance } from '../services/transactionService';
import type { Debt } from '../types';

interface CurrencyBalance {
    currency: string;
    amount: number;
    direction: 'receivable' | 'payable' | 'neutral';
    debtsAmount: number;
    ledgerAmount: number;
}

interface PersonBalanceResult {
    /** Primary balance (TRY or first available currency) */
    totalAmount: number;
    currency: string;
    direction: 'receivable' | 'payable' | 'neutral';
    debtsAmount: number;
    ledgerAmount: number;
    /** All currency balances for multi-currency display */
    balancesByCurrency: CurrencyBalance[];
}

/**
 * Custom hook to calculate total balance with a person
 * Combines regular debts + ledger transactions
 * Supports multi-currency (TRY, USD, EUR, GOLD, SILVER)
 */
export const usePersonBalance = (
    personId: string,
    personName: string,
    debts: Debt[]
) => {
    const { user } = useAuth();
    const { transactions } = useLedger(
        user?.uid,
        user?.displayName,
        personId,
        personName
    );

    const balance = useMemo<PersonBalanceResult>(() => {
        if (!user) {
            return {
                totalAmount: 0,
                currency: 'TRY',
                direction: 'neutral',
                debtsAmount: 0,
                ledgerAmount: 0,
                balancesByCurrency: []
            };
        }

        // Calculate regular debts balance per currency
        const currencyMap = new Map<string, { debtsBalance: number }>();

        debts.forEach(debt => {
            let currency = debt.currency || 'TRY';
            // Gold sub-types share the same currency key for balance purposes
            if (currency === 'GOLD' && debt.goldDetail?.type) {
                currency = `GOLD:${debt.goldDetail.type}`;
            }

            if (!currencyMap.has(currency)) {
                currencyMap.set(currency, { debtsBalance: 0 });
            }

            const entry = currencyMap.get(currency)!;
            const isLender = debt.lenderId === user.uid;
            const amount = debt.remainingAmount || 0;

            if (isLender) {
                entry.debtsBalance += amount; // They owe me
            } else {
                entry.debtsBalance -= amount; // I owe them
            }
        });

        // Calculate ledger balance (ledger is always single-currency per ledger)
        const ledgerBalance = calculateLedgerBalance(transactions, user.uid);

        // Add ledger balance to TRY (ledger default currency)
        if (!currencyMap.has('TRY')) {
            currencyMap.set('TRY', { debtsBalance: 0 });
        }

        // Build balancesByCurrency array
        const balancesByCurrency: CurrencyBalance[] = [];

        currencyMap.forEach((entry, currency) => {
            const ledgerAmount = currency === 'TRY' ? ledgerBalance : 0;
            const total = entry.debtsBalance + ledgerAmount;

            balancesByCurrency.push({
                currency,
                amount: total,
                direction: total > 0.001 ? 'receivable' : total < -0.001 ? 'payable' : 'neutral',
                debtsAmount: entry.debtsBalance,
                ledgerAmount
            });
        });

        // Sort: TRY first, then others
        balancesByCurrency.sort((a, b) => {
            if (a.currency === 'TRY') return -1;
            if (b.currency === 'TRY') return 1;
            return a.currency.localeCompare(b.currency);
        });

        // Primary balance = TRY (backward compatible)
        const tryBalance = balancesByCurrency.find(b => b.currency === 'TRY');
        const primary = tryBalance || balancesByCurrency[0] || {
            currency: 'TRY', amount: 0, direction: 'neutral' as const, debtsAmount: 0, ledgerAmount: 0
        };

        return {
            totalAmount: primary.amount,
            currency: primary.currency,
            direction: primary.direction,
            debtsAmount: primary.debtsAmount,
            ledgerAmount: primary.ledgerAmount,
            balancesByCurrency
        };
    }, [user, debts, transactions]);

    return balance;
};
