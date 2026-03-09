self.addEventListener('install', (e) => { 
    self.skipWaiting(); 
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Es vital que responda con algo para que se considere PWA válida
    e.respondWith(fetch(e.request));
});