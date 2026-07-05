const CACHE_NAME = 'masjid-absensi-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

// 1. Install Event - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'sholat-schedules-cache') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local assets
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* Ignore offline fetch errors */ });
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// Helper to convert HH:mm string to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
};

// Main prayer times checking function
const checkPrayerSchedules = async () => {
  try {
    const cache = await caches.open('sholat-schedules-cache');
    const response = await cache.match('/schedules.json');
    if (!response) return;

    const { schedules } = await response.json();
    if (!schedules || !Array.isArray(schedules)) return;

    const now = new Date();
    // Use Indonesia/Jakarta or local time minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    for (const schedule of schedules) {
      const prayerMinutes = timeToMinutes(schedule.start);
      if (prayerMinutes === -1) continue;

      const diff = prayerMinutes - currentMinutes;

      // Check if it's exactly 5 minutes before the sholat time
      if (diff === 5) {
        // Use caches to check if we already notified for this prayer today
        const cacheKey = `/notified_${todayStr}_${schedule.name}.txt`;
        const notifiedResponse = await cache.match(cacheKey);

        if (!notifiedResponse) {
          // Store notification flag in cache to prevent duplicate alerts
          await cache.put(cacheKey, new Response('true'));

          // Trigger a beautiful push-style system notification
          self.registration.showNotification(`Panggilan Sholat ${schedule.name}`, {
            body: `5 menit lagi memasuki waktu sholat ${schedule.name}. Mari bersiap-siap menuju masjid.`,
            icon: '/logo.jpg',
            badge: '/logo.jpg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: `sholat-reminder-${schedule.name}-${todayStr}`,
            actions: [
              { action: 'open_app', title: 'Buka Aplikasi Masjid' }
            ]
          });
        }
      }
    }
  } catch (err) {
    console.error('Service worker background check failed:', err);
  }
};

// 4. Handle incoming messages from the frontend (for syncing schedules)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_SCHEDULES') {
    event.waitUntil(
      caches.open('sholat-schedules-cache').then((cache) => {
        return cache.put('/schedules.json', new Response(JSON.stringify({ schedules: event.data.schedules })));
      }).then(() => {
        // Immediate check after receiving schedules
        return checkPrayerSchedules();
      })
    );
  }
});

// 5. Periodic background checking timer (runs as long as SW is active)
setInterval(() => {
  checkPrayerSchedules();
}, 25000);

// 6. Support Periodic Sync API (Allows modern browsers to wake up SW in background)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'prayer-reminder') {
    event.waitUntil(checkPrayerSchedules());
  }
});

// 7. Notification Click Handler - Open or focus the application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' || client.url.startsWith(self.location.origin)) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
