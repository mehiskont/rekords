import { createClient } from "redis"
import { log } from "./logger"

// Check if Redis is enabled via environment variable (default: true)
const REDIS_ENABLED = process.env.REDIS_ENABLED !== "false"

// Get Redis URL from environment variable, fall back to localhost in development
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Only create Redis client if enabled
const redisClient = REDIS_ENABLED 
  ? createClient({
      url: REDIS_URL,
    })
  : null

// Set up error handling if Redis is enabled
if (redisClient) {
  redisClient.on("error", (err) => {
    log("Redis Client Error", err, "error")
  })
}

// Initialize connection only once and reuse
let connectionPromise: Promise<void> | null = null;

export function ensureConnection() {
  // If Redis is disabled or client not created, return immediately
  if (!redisClient) {
    return Promise.resolve();
  }
  
  // Only connect if we haven't tried yet and aren't already connected
  if (!connectionPromise && !redisClient.isReady) {
    log(`Connecting to Redis at ${REDIS_URL}`, {}, "info");
    connectionPromise = redisClient.connect()
      .then(() => {
        log("Successfully connected to Redis", {}, "info");
      })
      .catch((err) => {
        log("Failed to connect to Redis", err, "error");
        // Continue without Redis
        log("Continuing without Redis caching...", {}, "warn");
      });
  }
  return connectionPromise || Promise.resolve();
}

// Connect on module initialization
ensureConnection();

export async function getCachedData(key: string) {
  try {
    // If Redis is disabled, return null immediately
    if (!redisClient) return null;
    
    await ensureConnection();
    if (!redisClient.isReady) return null;
    
    return await redisClient.get(key);
  } catch (error) {
    log("Error getting cached data", error, "warn");
    return null;
  }
}

export async function setCachedData(key: string, value: string, ttl: number) {
  try {
    // If Redis is disabled, return immediately
    if (!redisClient) return;
    
    await ensureConnection();
    if (!redisClient.isReady) return;
    
    await redisClient.set(key, value, { EX: ttl });
  } catch (error) {
    log("Error setting cached data", error, "warn");
    // Silently fail on cache errors
  }
}

export async function clearCachedData(pattern: string = "*") {
  try {
    // If Redis is disabled, return 0 immediately
    if (!redisClient) return 0;
    
    await ensureConnection();
    if (!redisClient.isReady) return 0;
    
    // Handle single specific keys directly
    if (!pattern.includes('*')) {
      // This is a specific key, not a pattern
      const exists = await redisClient.exists(pattern);
      if (exists) {
        await redisClient.del(pattern);
        return 1;
      }
      return 0;
    }
    
    // Get all keys matching the pattern
    const keys = await redisClient.keys(pattern);
    
    // Delete all matching keys
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    
    return keys.length;
  } catch (error) {
    log("Error clearing cached data", error, "warn");
    return 0;
  }
}

export default redisClient

