import React from 'react';
import { UserPlus, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { Avatar } from './Avatar';
import type { DisplayProfile } from '../types';

interface UserAvatarItemProps {
    profile: DisplayProfile;
    onClick?: () => void;
    actionButton?: React.ReactNode;
    className?: string;
    isUnread?: boolean; // NEW PROP
}

export const UserAvatarItem: React.FC<UserAvatarItemProps> = React.memo(({ profile, onClick, actionButton, className, isUnread }) => {
    const { isSystemUser, isContact, displayName, secondaryText, photoURL, uid } = profile;

    // determine visual status
    const status = isSystemUser ? 'system' : isContact ? 'contact' : 'none';
    const opacityClass = (isSystemUser || isContact) ? 'opacity-100' : 'opacity-80';

    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer relative group",
                !isSystemUser && !isContact && "hover:opacity-100",
                className
            )}
        >
            {/* SMART AVATAR (Handles Fetch, Colors, Icons) */}
            <div className={clsx("relative", opacityClass)}>
                <Avatar
                    name={displayName}
                    photoURL={photoURL}
                    uid={uid}
                    size="lg" // UserAvatarItem uses Lg (12/12 = 3rem = 48px)
                    status={status}
                    className=""
                />
                {isUnread && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white dark:border-slate-800"></span>
                    </span>
                )}
            </div>

            {/* TEXT CONTENT */}
            <div className={clsx("flex-1 min-w-0 flex flex-col justify-center", opacityClass)}>
                <div className="flex items-center gap-1.5">
                    <h4 className={clsx("font-semibold text-gray-900 dark:text-gray-100 truncate text-base leading-tight", isUnread && "font-bold text-gray-950 dark:text-white")}>
                        {displayName}
                    </h4>
                    {/* Inline Verification Check for System Users */}
                    {isSystemUser && (
                        <ShieldCheck size={14} className="text-blue-500 shrink-0" fill="currentColor" stroke="white" />
                    )}
                </div>

                <p className={clsx("text-xs truncate font-medium", isUnread ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400")}>
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
});

// Add display name for debugging
UserAvatarItem.displayName = 'UserAvatarItem';
