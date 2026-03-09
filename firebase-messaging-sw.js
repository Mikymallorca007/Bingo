importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDhO3xeBoLKe3ZEEOUl-T-vpPZXT2yI9X8",
  authDomain: "tokentest-87f09.firebaseapp.com",
  databaseURL: "https://tokentest-87f09-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tokentest-87f09",
  storageBucket: "tokentest-87f09.firebasestorage.app",
  messagingSenderId: "973211096919",
  appId: "1:973211096919:web:0140870d7fe8d86539d012"
});

const messaging = firebase.messaging();

// ESTO ES LO QUE SE EJECUTA CUANDO EL MÓVIL ESTÁ BLOQUEADO
messaging.onBackgroundMessage((payload) => {
  console.log('NOTIFICACIÓN RECIBIDA EN SEGUNDO PLANO:', payload);

  const notificationTitle = payload.notification.title || "⚠️ NUEVA TAREA";
  const notificationOptions = {
    body: payload.notification.body || "REVISA LA APLICACIÓN PARA VER LOS DETALLES",
    icon: 'https://via.placeholder.com/192/00d4ff/ffffff?text=M',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'nueva-tarea' // EVITA QUE SE AMONTONEN MIL AVISOS
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ESCUCHADOR PARA QUE AL TOCAR LA NOTIFICACIÓN SE ABRA LA APP
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/trabajadores.html');
    })
  );
});