// Placeholder for BullMQ worker
// Full implementation will use a separate worker process
// that processes jobs from the "ingestion" queue

import { Queue, Worker } from "bullmq";
import { logger } from "../lib/logger";

const connection = { connection: { host: "localhost", port: 6379 } };

export const ingestionQueue = new Queue("ingestion", connection);

export function startIngestionWorker() {
  const worker = new Worker(
    "ingestion",
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, "Processing ingestion job");
    },
    connection,
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Ingestion job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Ingestion job failed");
  });

  return worker;
}
