self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Esto permite que la app funcione en modo standalone
    e.respondWith(fetch(e.request));
});
