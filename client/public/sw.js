/* eslint-disable no-undef */
const CACHE_NAME = 'gatekeeper-shell-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo192.png',
    '/logo512.png',
    '/favicon.ico'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // 1. API Requests: Network First (Critical Data)
    if (event.request.url.includes('/api/')) {
        return; // Let browser handle (or add custom logic if needed)
    }

    // 2. Static Assets: Stale-While-Revalidate (Fast Load + Update)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json();
        const data = payload.data || {};

        // Define actions based on category or type in payload
        const actions = [];
        if (data.type === 'request') {
            actions.push({ action: 'view', title: 'View Request' });
        } else if (data.category === 'approval_pending') {
            actions.push({ action: 'approve', title: 'Approve' });
            actions.push({ action: 'reject', title: 'Reject' });
        } else {
            actions.push({ action: 'open', title: 'Open App' });
        }

        const options = {
            body: payload.body,
            icon: '/logo192.png',
            badge: '/logo192.png', // Small monochrome icon for status bar
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/',
                id: data.id // Request ID etc
            },
            actions: actions,
            tag: data.tag || 'general', // Group notifications
            renotify: true,
            requireInteraction: true // Keep it until user interacts
        };

        event.waitUntil(
            self.registration.showNotification(payload.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Handle Actions
    if (event.action === 'approve' || event.action === 'reject') {
        const requestId = event.notification.data.id;
        const actionUrl = `/action/${event.action}/${requestId}`;
        event.waitUntil(clients.openWindow(actionUrl));
        return;
    }

    // Default Click: Focus or Open Window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            const urlToOpen = event.notification.data.url || '/';

            // 1. Try to find existing window
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // basic match, can be improved
                if (client.url.includes('localhost') || client.url.includes(self.location.hostname)) {
                    return client.focus().then(c => {
                        // Optional: Tell client to navigate
                        if (c.navigate) return c.navigate(urlToOpen);
                        return c;
                    });
                }
            }
            // 2. Open new if none found
            return clients.openWindow(urlToOpen);
        })
    );
});
