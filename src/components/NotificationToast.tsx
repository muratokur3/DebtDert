import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export interface ToastNotification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    duration?: number;
}

interface NotificationToastProps {
    notification: ToastNotification | null;
    onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    const iconMap = {
        success: <CheckCircle2 size={20} className="text-emerald-500" />,
        warning: <AlertTriangle size={20} className="text-amber-500" />,
        error: <AlertCircle size={20} className="text-rose-500" />,
        info: <Info size={20} className="text-blue-500" />
    };

    const typeStyles = {
        success: 'border-emerald-500/20 bg-emerald-500/5',
        warning: 'border-amber-500/20 bg-amber-500/5',
        error: 'border-rose-500/20 bg-rose-500/5',
        info: 'border-blue-500/20 bg-blue-500/5'
    };

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-[9999]"
                >
                    <div className={clsx(
                        'bg-surface border rounded-2xl p-4 shadow-xl flex items-start gap-3 backdrop-blur-md',
                        typeStyles[notification.type]
                    )}>
                        <div className="flex-shrink-0 mt-0.5">
                            {iconMap[notification.type]}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-text-primary text-sm leading-tight">
                                {notification.title}
                            </h3>
                            <p className="text-text-secondary text-xs mt-1 line-clamp-2 leading-relaxed">
                                {notification.message}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="flex-shrink-0 -mt-1 -mr-1 p-1 text-text-secondary hover:text-text-primary hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
