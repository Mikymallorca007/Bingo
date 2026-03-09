self.addEventListener('fetch', function(event) {
  // Este código permite que la app cargue rápido
  event.respondWith(fetch(event.request));
});