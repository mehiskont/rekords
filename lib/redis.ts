import { createClient } from "redis"
import { log } from "./logger"

// Get Redis URL from environment variable, fall back to localhost in development
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

// Create Redis client with connection from environment
const redisClient = createClient({
  url: REDIS_URL,
})

redisClient.on("error", (err) => {
  log("Redis Client Error", err, "error")
})

// Initialize connection only once and reuse
let connectionPromise: Promise<void> | null = null;

export function ensureConnection() {
  if (!connectionPromise && !redisClient.isReady) {
    log(`Connecting to Redis at ${REDIS_URL}`, {}, "info");
    connectionPromise = redisClient.connect()
      .then(() => {
        log("Successfully connected to Redis", {}, "info");
      })
      .catch((err) => {
        log("Failed to connect to Redis", err, "error");
        // Continue without Redis in development
        log("Continuing without Redis caching...", {}, "warn");
      });
  }
  return connectionPromise || Promise.resolve();
}

// Connect on module initialization
ensureConnection();

export async function getCachedData(key: string) {
  try {
    await ensureConnection();
    if (!redisClient.isReady) return null
    return await redisClient.get(key)
  } catch (error) {
    return null
  }
}

export async function setCachedData(key: string, value: string, ttl: number) {
  try {
    await ensureConnection();
    if (!redisClient.isReady) return
    await redisClient.set(key, value, { EX: ttl })
  } catch (error) {
    // Silently fail on cache errors
  }
}

export async function clearCachedData(pattern: string = "*") {
  try {
    await ensureConnection();
    if (!redisClient.isReady) return 0
    
    // Handle single specific keys directly
    if (!pattern.includes('*')) {
      // This is a specific key, not a pattern
      const exists = await redisClient.exists(pattern)
      if (exists) {
        await redisClient.del(pattern)
        return 1
      }
      return 0
    }
    
    // Get all keys matching the pattern
    const keys = await redisClient.keys(pattern)
    
    // Delete all matching keys
    if (keys.length > 0) {
      await redisClient.del(keys)
    }
    
    return keys.length
  } catch (error) {
    return 0
  }
}

export default redisClient

