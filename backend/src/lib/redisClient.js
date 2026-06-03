// backend/src/lib/redisClient.js
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

let redis = null;
let isConfigured = false;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token && url !== "placeholder_url" && token !== "placeholder_token") {
  try {
    redis = new Redis({
      url,
      token,
    });
    isConfigured = true;
    console.log("[Redis] Client initialized successfully.");
  } catch (error) {
    console.error("[Redis] Initialization failed:", error.message);
  }
} else {
  console.warn("[Redis] Credentials missing or using placeholders. Redis caching is disabled.");
}

export { redis, isConfigured };
