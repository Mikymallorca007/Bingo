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

// Esto se dispara cuando llega el mensaje con la pantalla apagada
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://via.placeholder.com/192/00d4ff/ffffff?text=M',
    vibrate: [500, 200, 500],
    tag: 'nueva-tarea',
    data: { url: '/trabajadores.html' }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
