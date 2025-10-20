// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'Новое уведомление',
    body: 'У вас новое уведомление',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
      
      // Add action buttons based on notification type
      const actions = [];
      if (data.data?.type) {
        actions.push({
          action: 'open',
          title: 'Открыть',
          icon: '/favicon.ico'
        });
      }
      notificationData.actions = actions;
      
    } catch (e) {
      console.error('Error parsing push data:', e);
      // If not JSON, try to use as plain text
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: notificationData.actions || [],
    vibrate: [200, 100, 200],
    tag: notificationData.data?.notificationId || 'notification-' + Date.now(),
    requireInteraction: false,
    silent: false,
  };

  // Try to add sound if supported (Safari/iOS)
  try {
    notificationOptions.sound = '/sounds/notification.mp3';
  } catch (e) {
    console.log('Sound not supported in notifications');
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions).then(() => {
      // Notify all clients to play sound
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND'
          });
        });
      });
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Determine URL based on notification data
  let targetUrl = '/';
  const notificationData = event.notification.data;
  
  if (notificationData) {
    // Route to specific pages based on notification type
    switch (notificationData.type) {
      case 'message':
        // Navigate to messages page with chat room ID if available
        if (notificationData.chat_room_id) {
          targetUrl = `/messages?chat=${notificationData.chat_room_id}`;
        } else {
          targetUrl = '/messages';
        }
        break;
      case 'transaction':
        targetUrl = '/finances';
        break;
      case 'salary':
        targetUrl = '/finances';
        break;
      case 'event':
        targetUrl = '/events';
        break;
      case 'vacation':
        targetUrl = '/vacations';
        break;
      case 'report':
        targetUrl = '/reports';
        break;
      case 'system':
        targetUrl = '/';
        break;
      default:
        targetUrl = '/';
    }
  }

  // Handle action buttons
  if (event.action === 'open') {
    // Same as clicking the notification
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If a window is already open, focus it and navigate
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});
