/**
 * BatchQueue — enqueues Excel processing jobs using BullMQ.
 *
 * When an institution uploads an Excel file, the file buffer is stored
 * temporarily in Redis and a job is enqueued. The batch.processor.ts worker
 * picks up the job, validates each row, computes Poseidon commitments and
 * nullifiers, writes results to Postgres, and triggers the on-chain registration.
 */

import { Queue } from "bullmq"

export type BatchJobData = {
  institutionId: string
  // The file buffer encoded as base64 to pass through Redis
  fileBuffer: string
}

export class BatchQueue {
  private queue: Queue<BatchJobData>

  constructor(redisUrl: string) {
    const url = new URL(redisUrl)
    const connection = {
      host: url.hostname,
      port: Number(url.port || "6379"),
      password: url.password || undefined,
    }
    this.queue = new Queue("batch-processing", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })
  }

  async enqueue(data: BatchJobData) {
    return this.queue.add("process-batch", data, {
      // Jobs older than 30 minutes are considered stale and moved to failed
      delay: 0,
    })
  }
}
