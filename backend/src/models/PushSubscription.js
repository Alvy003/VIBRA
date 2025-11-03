// models/PushSubscription.js
import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    origin: { type: String, required: true },
    subscription: {
      endpoint: { type: String, required: true },
      expirationTime: { type: Number, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

// Unique per user+origin so dev/preview/prod don't fight
PushSubscriptionSchema.index({ userId: 1, origin: 1 }, { unique: true });

const PushSubscription = mongoose.model('PushSubscription', PushSubscriptionSchema);
export default PushSubscription;