import { useState, useEffect } from 'react';
import { Calculator, ArrowRightLeft, Delete } from 'lucide-react';
import { fetchRates, convertToTRY, type CurrencyRates } from '../services/currency';
import { formatCurrency } from '../utils/format';
import { clsx } from 'clsx';

export const Tools = () => {
    const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'CONVERTER'>('CALCULATOR');

    return (
        <div className="min-h-full bg-background pb-6 px-4 pt-4">
            {/* Segmented Control */}
            <div className="bg-surface p-0.5 rounded-xl flex mb-4 border border-border">
                <button
                    onClick={() => setActiveTab('CALCULATOR')}
                    className={clsx(
                        "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                        activeTab === 'CALCULATOR' ? "bg-background text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    )}
                >
                    <Calculator size={16} />
                    Hesapla
                </button>
                <button
                    onClick={() => setActiveTab('CONVERTER')}
                    className={clsx(
                        "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                        activeTab === 'CONVERTER' ? "bg-background text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    )}
                >
                    <ArrowRightLeft size={16} />
                    Çevirici
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'CALCULATOR' ? <CalculatorView /> : <ConverterView />}
            </div>
        </div>
    );
};

const CalculatorView = () => {
    const [display, setDisplay] = useState('0');
    const [prevValue, setPrevValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(true);

    const clear = () => {
        setDisplay('0');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    };

    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const inputDot = () => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
            return;
        }
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const backspace = () => {
        if (waitingForOperand) return;
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };

    const calculate = (prev: number, next: number, op: string): number => {
        switch (op) {
            case '+': return prev + next;
            case '-': return prev - next;
            case '*': return prev * next;
            case '/': return prev / next;
            default: return next;
        }
    };

    const performOperation = (nextOperator: string) => {
        const inputValue = parseFloat(display);

        if (operator && waitingForOperand) {
            setOperator(nextOperator);
            return;
        }

        if (prevValue === null) {
            setPrevValue(inputValue);
        } else if (operator) {
            const result = calculate(prevValue, inputValue, operator);
            setDisplay(String(result));
            setPrevValue(result);
        }

        setWaitingForOperand(true);
        setOperator(nextOperator === '=' ? null : nextOperator);
    };


    const CalcButton = ({ children, type = 'default', className, ...props }: { children: React.ReactNode, type?: 'default' | 'operator' | 'action', className?: string, [key: string]: any }) => {
        let baseClass = "h-14 sm:h-16 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-medium shadow-sm active:scale-95 transition-all flex items-center justify-center";

        let typeClass = "bg-surface text-text-primary hover:bg-slate-100 dark:hover:bg-slate-700";
        if (type === 'operator') typeClass = "bg-orange-500 text-white hover:bg-orange-600";
        if (type === 'action') typeClass = "bg-gray-300 dark:bg-slate-600 text-text-primary hover:bg-gray-400 dark:hover:bg-slate-500";

        return (
            <button
                className={clsx(baseClass, typeClass, className)}
                {...props}
            >
                {children}
            </button>
        );
    };

    return (
        <div className="max-w-xs mx-auto">
            <div className="bg-surface text-right p-4 sm:p-6 rounded-2xl mb-4 border border-border min-h-[4rem] sm:min-h-[5rem] flex items-end justify-end">
                <span className="text-3xl sm:text-4xl font-bold text-text-primary break-all line-clamp-1">{display}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <CalcButton type="action" onClick={clear}>C</CalcButton>
                <CalcButton type="action" onClick={backspace}><Delete size={24} /></CalcButton>
                <CalcButton type="action" onClick={() => performOperation('%')}>%</CalcButton>
                <CalcButton type="operator" onClick={() => performOperation('/')}>÷</CalcButton>

                <CalcButton onClick={() => inputDigit('7')}>7</CalcButton>
                <CalcButton onClick={() => inputDigit('8')}>8</CalcButton>
                <CalcButton onClick={() => inputDigit('9')}>9</CalcButton>
                <CalcButton type="operator" onClick={() => performOperation('*')}>×</CalcButton>

                <CalcButton onClick={() => inputDigit('4')}>4</CalcButton>
                <CalcButton onClick={() => inputDigit('5')}>5</CalcButton>
                <CalcButton onClick={() => inputDigit('6')}>6</CalcButton>
                <CalcButton type="operator" onClick={() => performOperation('-')}>-</CalcButton>

                <CalcButton onClick={() => inputDigit('1')}>1</CalcButton>
                <CalcButton onClick={() => inputDigit('2')}>2</CalcButton>
                <CalcButton onClick={() => inputDigit('3')}>3</CalcButton>
                <CalcButton type="operator" onClick={() => performOperation('+')}>+</CalcButton>

                <CalcButton className="col-span-2" onClick={() => inputDigit('0')}>0</CalcButton>
                <CalcButton onClick={inputDot}>.</CalcButton>
                <CalcButton type="operator" onClick={() => performOperation('=')}>=</CalcButton>
            </div>
        </div>
    );
};

const ConverterView = () => {
    const [amount, setAmount] = useState<string>('1');
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('TRY');
    const [rates, setRates] = useState<CurrencyRates | null>(null);
    const [result, setResult] = useState<number | null>(null);

    useEffect(() => {
        fetchRates().then(setRates);
    }, []);

    useEffect(() => {
        if (rates && amount) {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount)) return;

            const amountInTry = convertToTRY(numAmount, fromCurrency, rates);
            const oneUnitToInTry = convertToTRY(1, toCurrency, rates);
            
            if (oneUnitToInTry > 0) {
                setResult(amountInTry / oneUnitToInTry);
            }
        }
    }, [amount, fromCurrency, toCurrency, rates]);

    return (
        <div className="max-w-sm mx-auto space-y-6">
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                <label className="block text-sm font-medium text-text-secondary mb-2">Miktar</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-3xl font-bold bg-transparent border-b border-border focus:border-primary outline-none py-2 text-text-primary"
                    placeholder="0.00"
                />
            </div>

            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                <div className="bg-surface p-4 rounded-xl border border-border">
                    <label className="block text-xs text-text-secondary mb-1">Para Birimi</label>
                    <select
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className="w-full bg-transparent font-semibold text-text-primary outline-none"
                    >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GOLD">Altın</option>
                    </select>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={() => {
                            setFromCurrency(toCurrency);
                            setToCurrency(fromCurrency);
                        }}
                        className="p-3 rounded-full bg-surface border border-border hover:bg-background text-primary transition-colors"
                    >
                        <ArrowRightLeft size={20} />
                    </button>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-border">
                    <label className="block text-xs text-text-secondary mb-1">Hedef</label>
                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        className="w-full bg-transparent font-semibold text-text-primary outline-none"
                    >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GOLD">Altın</option>
                    </select>
                </div>
            </div>

            <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20 text-center">
                <p className="text-sm text-text-secondary mb-1">Sonuç</p>
                <h2 className="text-4xl font-bold text-primary">
                    {formatCurrency(result || 0, toCurrency)}
                </h2>
                <p className="text-xs text-text-secondary mt-2 opacity-70">
                    * Kurlar yaklaşık değerlerdir.
                </p>
            </div>
        </div>
    );
};
