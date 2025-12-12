import webpush from 'web-push';

// Retrieve VAPID keys from environment
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Ensure that keys exist in the environment
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("VAPID keys are missing in the environment variables.");
} else {
  // Set VAPID details for web-push
  webpush.setVapidDetails(
    'mailto:alvyshajan@gmail.com',  // Your contact email (or use a generic one)
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Endpoint to send the VAPID Public Key to frontend
app.get('/vapid-key', (req, res) => {
  res.json({ vapidPublicKey });
});
