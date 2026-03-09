self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Esto es lo que "engaña" al navegador para permitir la instalación
    e.respondWith(fetch(e.request).catch(() => {}));
});
