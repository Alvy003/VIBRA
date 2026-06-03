import rateLimit from 'express-rate-limit';
import { clerkClient } from "@clerk/express";

/**
 * AI Rate Limiter
 * Limits requests to the AI endpoints to prevent misuse and control costs.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  skip: async (req) => {
    // Skip rate limiting for the admin user
    try {
      if (req.auth?.userId) {
        const currentUser = await clerkClient.users.getUser(req.auth.userId);
        return process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;
      }
    } catch (e) {
      // ignore — not admin or clerk error
    }
    return false;
  },
  message: {
    success: false,
    message: "You've sent too many requests to Vibra AI. Please wait 15 minutes and try again.",
    intent: 'chat'
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

/**
 * Global API Rate Limiter
 * Safety net for all API endpoints.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search Rate Limiter
 * Specifically protects external JioSaavn/YouTube search calls.
 */
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute is plenty for a human
  message: {
    success: false,
    message: "Search limit reached. Please wait a moment.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
