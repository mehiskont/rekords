import { createClient } from "redis"

const redisClient = createClient({
  url: "redis://localhost:6379",
})

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err)
})

// Connect to redis
redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err)
  // Continue without Redis in development
  console.warn("Continuing without Redis caching...")
})

export async function getCachedData(key: string) {
  try {
    if (!redisClient.isReady) return null
    return await redisClient.get(key)
  } catch (error) {
    console.error("Redis get error:", error)
    return null
  }
}

export async function setCachedData(key: string, value: string, ttl: number) {
  try {
    if (!redisClient.isReady) return
    await redisClient.set(key, value, { EX: ttl })
  } catch (error) {
    console.error("Redis set error:", error)
  }
}

export default redisClient

