/**
 * Stats Streaming Route — Platform-level statistics via Server-Sent Events (SSE).
 *
 * GET /api/stats/streaming
 */

import type { FastifyPluginAsync } from "fastify"
import fastifySSE from "fastify-sse-v2"
import { AdminService } from "../services/admin.service.js"

export const statsRoutes: FastifyPluginAsync = async (app) => {
  await app.register(fastifySSE as unknown as FastifyPluginAsync)

  const adminSvc = new AdminService(app.prisma)

  app.get("/", async () => {
    return adminSvc.getPlatformStats()
  })

  app.get("/streaming", async function (req, res) {
    // Determine how often we poll internally to push the SSE to the client
    const POLL_INTERVAL_MS = 10000
    let active = true

    req.socket.on("close", () => {
      active = false
    })

    // Establish the SSE pipe
    res.sse(
      (async function* () {
        while (active) {
          try {
            // Re-fetch the live metrics
            const stats = await adminSvc.getPlatformStats()

            yield {
              id: String(Date.now()),
              event: "stats_update",
              data: JSON.stringify(stats),
            }
          } catch (e: any) {
            app.log.error(e, "Failed to generate SSE stats_update")
          }

          // Delay
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        }
      })()
    )
  })
}
