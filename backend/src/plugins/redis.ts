import fp from "fastify-plugin"
import { Redis } from "ioredis"
import { config } from "../config/index.js"

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis
  }
}

export const redisPlugin = fp(async (app) => {
  const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 })
  await redis.connect()
  app.decorate("redis", redis)
  app.addHook("onClose", async () => redis.quit())
})
