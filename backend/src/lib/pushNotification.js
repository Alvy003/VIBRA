// lib/pushNotification.js
import webpush from 'web-push';

export const sendPushNotification = async (subscription, message) => {
  const payload = JSON.stringify({
    title: "Vibra",
    body: message,
    icon: "/vibra.png", // Customize the icon
    badge: "/vibra.png",  // Customize the badge
  });

  try {
    // Send the push notification
    await webpush.sendNotification(subscription, payload);
    // console.log("Push notification sent");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};
