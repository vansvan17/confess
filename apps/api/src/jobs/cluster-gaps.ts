import { Queue, Worker } from "bullmq";
import { logger } from "../lib/logger";
import { groupSimilarGaps } from "../services/gaps";

const connection = { connection: { host: "localhost", port: 6379 } };

export const clusterQueue = new Queue("cluster-gaps", connection);

export function startClusterWorker() {
  const worker = new Worker(
    "cluster-gaps",
    async (job) => {
      logger.info({ jobId: job.id }, "Clustering gaps");
      const { workspaceId } = job.data as { workspaceId: string };
      const clusters = await groupSimilarGaps(workspaceId);
      logger.info({ workspaceId, clusterCount: clusters.length }, "Gaps clustered");
    },
    connection,
  );

  return worker;
}
