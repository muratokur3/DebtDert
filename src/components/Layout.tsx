import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { NotificationToast } from './NotificationToast';
import { NotificationsModal } from './NotificationsModal';
import { useNotificationContext } from '../context/NotificationContext';

export const Layout = () => {
    const {
        isModalOpen,
        closeModal,
        notifications,
        markAsRead,
        deleteNotification,
        markAllAsRead,
        clearAll,
        currentToast,
        closeToast
    } = useNotificationContext();
    const location = useLocation();
    // Hide nav ONLY on:
    // 1. Debt Details (/debt/...)
    // 2. Stream History (/person/.../history)
    const hideNav = location.pathname.startsWith('/debt/') || location.pathname.endsWith('/history');

    return (
        <div className="min-h-screen bg-background text-text-primary font-sans relative">
            <main className={`w-full ${hideNav ? '' : 'pb-24'}`}>
                <Outlet />
            </main>
            {!hideNav && <BottomNav />}

            <NotificationToast
                notification={currentToast}
                onClose={closeToast}
            />

            <NotificationsModal
                isOpen={isModalOpen}
                onClose={closeModal}
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
            />
        </div>
    );
};
