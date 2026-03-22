importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase using the configuration passed via URL params during registration.
const urlParams = new URL(location).searchParams;
const configParam = urlParams.get('config');

if (configParam) {
    try {
        const config = JSON.parse(decodeURIComponent(configParam));

        if (!self.firebase.apps.length) {
            self.firebase.initializeApp(config);
            const messaging = self.firebase.messaging();

            // Background message handler
            // When the server payload contains a "notification" object, Firebase automatically
            // displays a notification and we don't need to manually call showNotification here
            // unless we receive a data-only payload.
            messaging.onBackgroundMessage((payload) => {
                console.log('[firebase-messaging-sw.js] Received background message ', payload);
            });
        }
    } catch (error) {
        console.error('Failed to initialize Firebase in service worker from URL config:', error);
    }
} else {
    console.warn('No Firebase config provided in service worker URL.');
}
