import { createClient } from "redis"

const redisClient = createClient({
  url: "redis://localhost:6379",
})

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err)
})

// Initialize connection only once and reuse
let connectionPromise: Promise<void> | null = null;

export function ensureConnection() {
  if (!connectionPromise && !redisClient.isReady) {
    connectionPromise = redisClient.connect()
      .catch((err) => {
        console.error("Failed to connect to Redis:", err)
        // Continue without Redis in development
        console.warn("Continuing without Redis caching...")
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

