/* eslint-disable no-undef */
self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/logo192.png', // Fallback to common React icon
            badge: '/logo192.png',
            vibrate: [100, 50, 200],
            data: {
                url: data.data?.url || '/'
            },
            actions: [
                { action: 'open', title: 'View Details' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
