// routes/pushSubscription.route.js
import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get('/vapid-key', (req, res) => {
  res.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/save-subscription', protectRoute, async (req, res) => {
  const userId = req.auth.userId;
  const { subscription } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  // Derive origin: Origin header -> Referer -> host
  let origin = req.headers.origin;
  if (!origin) {
    const ref = req.get('referer');
    try {
      if (ref) origin = new URL(ref).origin;
    } catch {}
  }
  if (!origin) {
    origin = `${req.protocol}://${req.get('host')}`;
  }

  try {
    await PushSubscription.findOneAndUpdate(
      { userId, origin },
      { userId, origin, subscription },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ message: "Subscription saved" });
  } catch (err) {
    console.error("Failed to save subscription:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Duplicate subscription. Drop legacy 'endpoint_1' or 'subscription.endpoint_1' index and retry." });
    }
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.delete('/save-subscription', protectRoute, async (req, res) => {
  const userId = req.auth.userId;

  let origin = req.headers.origin;
  if (!origin) {
    const ref = req.get('referer');
    try {
      if (ref) origin = new URL(ref).origin;
    } catch {}
  }
  if (!origin) {
    origin = `${req.protocol}://${req.get('host')}`;
  }

  await PushSubscription.deleteOne({ userId, origin });
  res.json({ message: "Subscription removed" });
});

export default router;