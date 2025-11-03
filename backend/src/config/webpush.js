// config/webpush.js
import 'dotenv/config';
import webpush from 'web-push';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.error('VAPID keys are missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
} else {
  webpush.setVapidDetails('mailto:alvyshajan@gmail.com', PUBLIC_KEY, PRIVATE_KEY);
}

export default webpush;