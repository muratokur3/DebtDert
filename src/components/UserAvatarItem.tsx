
import { ShieldCheck, BookUser, UserPlus, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import type { DisplayProfile } from '../types';

interface UserAvatarItemProps {
    profile: DisplayProfile;
    onClick?: () => void;
    actionButton?: React.ReactNode;
    className?: string;
}

export const UserAvatarItem: React.FC<UserAvatarItemProps> = ({ profile, onClick, actionButton, className }) => {
    const { isSystemUser, isContact, displayName, secondaryText, photoURL } = profile;

    // 1. DETERMINING THE USER TYPE & STYLES
    let borderClass = '';
    let opacityClass = 'opacity-100';
    let BadgeIcon = null;
    let badgeColorClass = '';
    let defaultAvatarClass = 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500'; // Default Gray (WhatsApp style)

    if (isSystemUser) {
        // TYPE 1: SYSTEM USER (Verified)
        borderClass = 'border-2 border-white ring-2 ring-blue-500 dark:ring-blue-400';
        BadgeIcon = ShieldCheck;
        badgeColorClass = 'bg-blue-600 text-white border-white dark:border-slate-800';
        defaultAvatarClass = 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-300';
    } else if (isContact) {
        // TYPE 2: SAVED CONTACT (Trusted)
        borderClass = 'border-2 border-white ring-2 ring-orange-500 dark:ring-orange-400';
        BadgeIcon = BookUser;
        badgeColorClass = 'bg-orange-500 text-white border-white dark:border-slate-800';
        defaultAvatarClass = 'bg-orange-100 dark:bg-orange-900/50 text-orange-500 dark:text-orange-300';
    } else {
        // TYPE 3: SHADOW USER (Ghost)
        borderClass = 'border-2 border-dashed border-slate-300 dark:border-slate-600';
        opacityClass = 'opacity-80';
        // No Badge for Shadow
    }

    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer relative group",
                !isSystemUser && !isContact && "hover:opacity-100",
                className
            )}
        >
            {/* AVATAR CONTAINER */}
            <div className={clsx("relative shrink-0", opacityClass)}>
                <div className={clsx(
                    "w-12 h-12 rounded-full overflow-hidden shadow-sm flex items-center justify-center",
                    borderClass,
                    !photoURL && defaultAvatarClass
                )}>
                    {photoURL ? (
                        <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={24} strokeWidth={2.5} fill="currentColor" className="opacity-70" />
                    )}
                </div>

                {/* BADGE (Absolute Positioned) */}
                {BadgeIcon && (
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-sm text-[10px]",
                        badgeColorClass
                    )}>
                        <BadgeIcon size={12} strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* TEXT CONTENT */}
            <div className={clsx("flex-1 min-w-0 flex flex-col justify-center", opacityClass)}>
                <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base leading-tight">
                        {displayName}
                    </h4>
                    {/* Inline Verification Check for System Users */}
                    {isSystemUser && (
                        <ShieldCheck size={14} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
                    )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">
                    {secondaryText}
                </p>
            </div>

            {/* ACTION BUTTON / STATUS TEXT */}
            <div className="shrink-0">
                {actionButton ? (
                    actionButton
                ) : (
                    // Default Actions based on state
                    !isSystemUser && !isContact && (
                        <button className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                            <UserPlus size={18} />
                        </button>
                    )
                )}
            </div>
        </div>
    );
};
