const APP_VERSION = '2.0.0';
const CACHE_NAME = `vibra-cache-${APP_VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("vibra-cache").then((cache) =>
      cache.addAll([
        "/vibra-192.png",
        "/vibra-512.png",
        "/index.html",
        "/manifest.json",
        "/ringtone.mp3",
        "/vibra.png",
        "/google.png",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Notification", body: event.data.text() };
  }

  const title = data.title || "Vibra";
  const isCall = data.data?.type === "incoming_call";
  
  // ✅ Use different tags for notification channels
  const options = {
    body: data.body || "",
    icon: data.icon || "/vibra.png",
    badge: data.badge || "/vibra.png",
    data: data.data || {},
    
    // ✅ KEY: Use 'call' or 'message' tag for Android notification channels
    tag: isCall ? "call" : "message",
    
    renotify: true,
    requireInteraction: isCall,
    actions: data.actions || [],
    silent: false,
    
    // ✅ Different vibration patterns
    vibrate: isCall 
      ? [500, 250, 500, 250, 500, 250, 500] // Long for calls
      : [200, 100, 200], // Short for messages
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification?.data || {};
  const action = event.action;

  const urlForCall = () => {
    const base = "/chat";
    if (d.type === "incoming_call") {
      const u = new URL(base, self.location.origin);
      u.searchParams.set("callId", d.callId || "");
      u.searchParams.set("fromId", d.fromId || "");
      u.searchParams.set("callAction", action || "open");
      return u.toString();
    }
    return d.url || "/";
  };

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = urlForCall();
      
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          client.navigate(target);
          return;
        }
      }
      await clients.openWindow(target);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/uploads/voice/") || url.pathname.startsWith("/sounds/")) {
    event.respondWith(fetch(event.request));
  }
});