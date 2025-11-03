// src/components/RequestNotificationPermission.tsx
import { useEffect } from "react";
import { axiosInstance } from "@/lib/axios";
import { useUser } from "@clerk/clerk-react";

const RequestNotificationPermission = () => {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const registration = await navigator.serviceWorker.ready;

        // If already subscribed, upsert to backend to be safe
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await axiosInstance.post("/push/save-subscription", { subscription: existing });
          return;
        }

        // Get VAPID key
        const { data } = await axiosInstance.get("/push/vapid-key");
        const vapidPublicKey = data?.vapidPublicKey;
        if (!vapidPublicKey) {
          console.error("Missing VAPID public key");
          return;
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
        });

        // Save
        await axiosInstance.post("/push/save-subscription", { subscription });
      } catch (err) {
        console.error("Push setup error:", err);
      }
    };

    setup();
  }, [user?.id]);

  return null;
};

export default RequestNotificationPermission;

function urlB64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}