importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Declare Firebase variable
const firebase = self.firebase;

// My App's specific Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCm830gKeBqM9HMF942FsmhOn_zzTbEsXk",
  authDomain: "skl-app-e6f9d.firebaseapp.com",
  projectId: "skl-app-e6f9d",
  storageBucket: "skl-app-e6f9d.firebasestorage.app",
  messagingSenderId: "604250488195",
  appId: "1:604250488195:web:a6314d38f37e229301cab6",
  measurementId: "G-6VDH67LMF5"
};

// Initialize Firebase in the Service Worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handler for background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/images/logo.png',
    requireInteraction: true,
    tag: 'notification',
    renotify: true,
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler for notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = new URL('/dashboard', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if the app is already open in a window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
