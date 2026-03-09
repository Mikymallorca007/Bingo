self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Esto responde con los archivos de la red, 
    // cumpliendo el requisito para ser una PWA instalable.
    e.respondWith(fetch(e.request));
});
