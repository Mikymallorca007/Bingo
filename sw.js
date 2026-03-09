const CACHE_NAME = 'bingo-v1';

// Instalación: Se activa al cargar la web
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

// Activación: Toma el control inmediatamente
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

// Fetch: OBLIGATORIO para que Chrome permita la instalación
self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request));
});
