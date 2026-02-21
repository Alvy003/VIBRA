// ✅ Version control - increment this on each deployment
const APP_VERSION = '3.0.2';
const CACHE_NAME = `vibra-cache-${APP_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// ✅ Critical assets to cache for offline use
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/vibra.png",
  "/google.png",
  "/manifest.json",
  "/chat-pattern.svg",
  "/vibra-192.png",
  "/vibra-512.png",
  "/ringtone.mp3",
  "/offline.html",
];

// ===== INSTALL EVENT ===== 
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ===== ACTIVATE EVENT ===== 
self.addEventListener("activate", (event) => {
  // console.log(`✅ Activating Service Worker v${APP_VERSION}`);
  
  event.waitUntil(
    // ✅ Clean up old caches from previous versions
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete any cache that starts with 'vibra-cache-' but isn't current version
              return cacheName.startsWith('vibra-cache-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              // console.log(`🗑️ Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // console.log('🎯 Service Worker now controlling all pages');
        return self.clients.claim();
      })
  );
});

// ===== MESSAGE EVENT (for manual updates) ===== 
self.addEventListener('message', (event) => {
  // ✅ Handle skip waiting request from UpdateBanner
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // console.log('⚡ Received SKIP_WAITING message - activating new version');
    self.skipWaiting();
  }
  
  // ✅ Return current version when requested
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
  
  // ✅ Cache song for offline playback
  if (event.data && event.data.type === 'CACHE_SONG') {
    const { songUrl, songId } = event.data;
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.add(songUrl).then(() => {
          // console.log(`✅ Cached song for offline: ${songId}`);
        }).catch((err) => {
          console.error(`❌ Failed to cache song ${songId}:`, err);
        });
      })
    );
  }
});

// ===== PUSH NOTIFICATIONS ===== 
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Notification", body: event.data.text() };
  }

  const notifData = data.data || {};
  const type = notifData.type || "message";
  const isCall = type === "incoming_call";

  const title = data.title || "Vibra";
  
  const baseOptions = {
    body: data.body || "",
    icon: data.icon || "/vibra.png",
    badge: data.badge || "/vibra.png",
    data: notifData,
    image: data.image,
    timestamp: Date.now(),
  };

  let options;

  if (isCall) {
    // ✅ Call notifications - High priority, persistent
    options = {
      ...baseOptions,
      tag: "vibra-call",
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [500, 250, 500, 250, 500, 250, 500],
      actions: [
        { action: "accept", title: "Accept" },
        { action: "decline", title: "Decline" },
      ],
    };
  } else {
    // ✅ Message notifications - Normal priority
    options = {
      ...baseOptions,
      tag: "vibra-message",
      renotify: false,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      actions: data.actions || [
        { action: "reply_thumbsup", title: "👍" },
        { action: "reply_heart", title: "❤️" },
        { action: "open", title: "Open" },
      ],
    };
  }
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// ===== NOTIFICATION CLICK WITH QUICK REPLY ===== 
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const data = event.notification?.data || {};
  const action = event.action;

  // ✅ Handle quick reply actions
  if (action && action.startsWith("reply_")) {
    event.waitUntil(handleQuickReply(action, data));
    return;
  }

  const getTargetUrl = () => {
    const base = "/chat";

    // ✅ Handle incoming call actions
    if (data.type === "incoming_call") {
      const url = new URL(base, self.location.origin);
      url.searchParams.set("callId", data.callId || "");
      url.searchParams.set("fromId", data.fromId || "");
      url.searchParams.set("callAction", action || "open");
      return url.toString();
    }

    // ✅ Default: open chat with sender
    if (data.senderId) {
      const url = new URL(base, self.location.origin);
      url.searchParams.set("userId", data.senderId);
      return url.toString();
    }
    
    return data.url || "/"; // Default URL if nothing else
  };

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const target = getTargetUrl();

        // Try to focus an existing window
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus().then(() => {
              // Navigate the focused window
              if (client.navigate) {
                client.navigate(target);
              } else {
                // Fallback: send message to client to navigate
                client.postMessage({ 
                  type: "navigation", 
                  url: target,
                  action: action,
                  data: data
                });
              }
            });
          }
        }

        // No existing window, open new one
        return clients.openWindow(target);
      })
  );
});

// ✅ Helper: Handle quick reply
async function handleQuickReply(action, data) {
  const replyMap = {
    "reply_thumbsup": "👍",
    "reply_heart": "❤️",
    "reply_ok": "OK",
    "reply_thanks": "Thanks!",
    "reply_busy": "Busy, will reply later",
    "reply_yes": "Yes",
    "reply_no": "No",
  };

  const replyText = replyMap[action];
  
  if (!replyText || !data.senderId || !data.receiverId) {
    // Fallback: open chat
    return openOrFocusWindow(`/chat?userId=${data.senderId || ""}`, data);
  }

  try {
    // ✅ Get base URL dynamically
    const baseUrl = self.location.origin;
    
    const response = await fetch(`${baseUrl}/api/chat/quick-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        senderId: data.receiverId,  // Current user is replying
        receiverId: data.senderId,   // To the original sender
        content: replyText,
      }),
    });

    if (response.ok) {
      // ✅ Show success notification
      await self.registration.showNotification("Reply sent", {
        body: `You replied: ${replyText}`,
        icon: "/vibra.png",
        tag: "reply-sent",
        silent: true,
        requireInteraction: false,
      });
      
      // Auto-close success notification after 2 seconds
      setTimeout(async () => {
        const notifications = await self.registration.getNotifications({ tag: "reply-sent" });
        notifications.forEach(n => n.close());
      }, 2000);
    } else {
      throw new Error("Reply failed");
    }
  } catch (error) {
    console.error("Quick reply failed:", error);
    
    // ✅ Show error notification with option to open chat
    // await self.registration.showNotification("Reply failed", {
    //   body: "Tap to open chat and try again",
    //   icon: "/vibra.png",
    //   tag: "reply-failed",
    //   data: { url: `/chat?userId=${data.senderId}` },
    //   requireInteraction: true,
    // });
  }
}

// ✅ Helper: Open or focus window
async function openOrFocusWindow(targetUrl, data) {
  const clientList = await clients.matchAll({ 
    type: "window", 
    includeUncontrolled: true 
  });

  // Try to find and focus an existing window
  for (const client of clientList) {
    if ("focus" in client) {
      await client.focus();
      
      // Navigate or send message to navigate
      if (client.navigate) {
        await client.navigate(targetUrl);
      } else {
        client.postMessage({
          type: "navigation",
          url: targetUrl,
          data,
        });
      }
      return;
    }
  }

  // No existing window, open new one
  return clients.openWindow(targetUrl);
}


// ===== FETCH STRATEGY ===== 
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ✅ Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // ✅ Network-only for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline - API unavailable' }),
          { 
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }
  
  // ✅ Network-only for real-time data (voice, sounds, socket)
  if (
    url.pathname.startsWith("/uploads/voice/") || 
    url.pathname.startsWith("/sounds/") ||
    url.pathname.startsWith("/socket.io/")
  ) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ✅ Cache-first for static assets (images, fonts)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/) ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request).then((response) => {
            // Cache new assets automatically
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }
  
  // ✅ Network-first for HTML pages (with offline fallback)
  if (
    request.mode === 'navigate' ||
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with latest HTML
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try cached version first
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cached version, try to serve offline page
              return caches.match('/offline.html')
                .then((offlinePage) => {
                  return offlinePage || new Response(
                    '<h1>Offline</h1><p>No internet connection</p>',
                    { headers: { 'Content-Type': 'text/html' } }
                  );
                });
            });
        })
    );
    return;
  }
  
  // ✅ Stale-while-revalidate for JS/CSS bundles
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse); // Fallback to cache on network error
          
          // Return cached version immediately, update in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // ✅ Default: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ✅ Log version on startup
// console.log(`🎵 Vibra Music Service Worker v${APP_VERSION} loaded`);