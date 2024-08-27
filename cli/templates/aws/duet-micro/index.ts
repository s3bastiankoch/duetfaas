import cluster, { Worker } from "cluster";
import {
  availableParallelism,
  setPriority,
  machine,
  cpus,
  arch,
  platform,
  release,
} from "os";
import { randomUUID } from "crypto";
import express from "express";
import { scheduler } from "timers/promises";
import { execSync } from "child_process";

import { default as benchmarksV1 } from "./lambda_a";
import { default as benchmarksV2 } from "./lambda_b";
import { cpuUsage } from "process";
import { Bench } from "tinybench";

const INIT_BENCHMARK_ITERATIONS = 25;
const WARMUP_ITERATIONS = 5;
const ALLOWED_DURATION_DIFFERENCE = 0.02; // 2%

type InitBenchmarkPayload = {
  type: "init_benchmark";
};

type RequestPayload = {
  type: "request";
  version: 1 | 2;
  machineId: string;
  isColdStart: boolean;
};

type BenchmarkResult = {
  duration: number;
  cpuUser: number;
  cpuSystem: number;
};

type RequestResult = {
  version: 1 | 2;
  numCPUs: number;
  waitedForNetwork: number;
  requestReceivedAt: string;
  requestFinishedAt: string;
  processId: number;
  machineId: string;
  isColdStart: boolean;
};

const numCPUs = availableParallelism();

// Very simple function that adds the first 500000 numbers together
function gaussianSum() {
  let sum = 0;
  for (let i = 0; i < 500000; i++) {
    sum += i;
  }
  return sum;
}

function waitForWorker(worker: Worker) {
  return new Promise((resolve) => {
    worker.on("message", (msg) => {
      resolve(msg);
    });
  });
}

function waitForWorkers(workers: Worker[]) {
  return Promise.all(workers.map(waitForWorker));
}

async function initialBenchmark(workers: Worker[]) {
  for (const worker of workers) {
    worker.send({ type: "init_benchmark" });
  }

  const results = (await waitForWorkers(workers)) as {
    duration: number;
    cpuUser: number;
    cpuSystem: number;
  }[];

  // All workers should have approximately the same duration
  const minDuration = Math.min(...results.map((result) => result.duration));
  const maxDuration = Math.max(...results.map((result) => result.duration));

  if (maxDuration - minDuration > ALLOWED_DURATION_DIFFERENCE * minDuration) {
    return false;
  }

  return true;
}

function refreshTimeOnCPU() {
  return scheduler.wait(1000);
}

function forceTimeout() {
  while (true) {
    // Sleep for 1 second
    scheduler.wait(1000);
  }
}

function forceCrash() {
  process.exit(1);
}

class IncrementalMap<K> extends Map<K, number> {
  increment(key: K, value: number) {
    const current = this.get(key) || 0;
    this.set(key, current + value);
  }

  get(key: K) {
    return super.get(key) || 0;
  }
}

const waitedForResponse = new IncrementalMap<number>();

if (cluster.isPrimary) {
  const machineId = randomUUID();
  let isColdStart = true;
  let isBadInstance = false;
  console.log(`Master process ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();

    // Ugly but will do the job
    const cpuId = i % numCPUs;
    worker.on("online", () => {
      // Core pinning
      execSync(`taskset -cp ${cpuId} ${worker.process.pid}`);

      // Increase the priority of the worker
      setPriority(worker.process.pid as number, 0);
    });
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker process ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Decrease the priority of the master process
  setPriority(process.pid, 19);

  const app = express();

  app.get("/", async (req, res) => {
    res.json({
      message: "Hello from Duet Server",
      numCPUs,
      machineId,
    });
  });

  app.post("/invocations", async (req, res) => {
    const temp = isColdStart;

    if (!cluster.workers || Object.keys(cluster.workers).length < 2) {
      res.json({
        message: "Parallelism not available",
      });
      return;
    }

    const workers = Object.values(cluster.workers).filter(
      (w) => typeof w !== "undefined"
    );

    if (isColdStart) {
      const success = await initialBenchmark(workers);

      if (!success) {
        isBadInstance = true;
        // Make sure the instance stays alive and avoid repeated runs on a bad instance
        // TODO: Can we somehow enforce a new cold start?
        forceTimeout();
        // forceCrash();

        res.json({
          message: "Initial benchmark failed",
        });
      }
    }

    if (isBadInstance) {
      // We give the instance a new chance
      const success = await initialBenchmark(workers);

      if (!success) {
        // Make sure the instance stays alive and avoid repeated runs on a bad instance
        forceTimeout();
        // forceCrash();

        res.json({
          message: "Initial benchmark failed",
        });
      } else {
        isBadInstance = false;
      }
    }

    isColdStart = false;
    const resultByVersion: Record<1 | 2, any> = {
      1: null,
      2: null,
    };

    const [worker1, worker2] = workers;

    // Randomized interleaved trials
    const r = Math.random() < 0.5;

    // We refresh the time on the CPU to ensure that both workers have the needed CPU time to start at the same time
    await refreshTimeOnCPU();

    worker1.send({
      type: "request",
      version: r ? 1 : 2,
      machineId,
      isColdStart: temp,
    });
    worker2.send({
      type: "request",
      version: r ? 2 : 1,
      machineId,
      isColdStart: temp,
    });

    const results = (await waitForWorkers(workers)) as RequestResult[];

    for (const result of results) {
      resultByVersion[result.version] = result;
    }

    res.json({
      message: "Hello from Duet Server",
      numCPUs,
      machineId,
      processId: process.pid,
      empiris_0: resultByVersion[1],
      empiris_1: resultByVersion[2],
      cpu: execSync("taskset -cp " + process.pid, { encoding: "utf8" }),
      metaInfo: {
        machine:
          machine() + ", " + arch() + ", " + platform() + ", " + release(),
        cpus: cpus()
          .map((cpu) => cpu.model)
          .join(", "),
      },
    });
  });

  const port = process.env.PORT || 8080;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
} else {
  const originalFetch = global.fetch;

  // Overwrite fetch to intercept requests and deduct the latency from the duration
  global.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit | undefined
  ): Promise<Response> => {
    const start = performance.now();
    try {
      const response = await originalFetch(input, init);
      const duration = performance.now() - start;

      waitedForResponse.increment(process.pid, duration);

      return response;
    } catch (error) {
      const duration = performance.now() - start;

      waitedForResponse.increment(process.pid, duration);

      throw error;
    }
  };

  process.on(
    "message",
    async (event: InitBenchmarkPayload | RequestPayload) => {
      setImmediate(async () => {
        if (event.type === "init_benchmark") {
          for (let i = 0; i < WARMUP_ITERATIONS; i++) {
            gaussianSum();
          }

          const cpuStart = cpuUsage();
          for (let i = 0; i < INIT_BENCHMARK_ITERATIONS; i++) {
            gaussianSum();
          }
          const cpu = cpuUsage(cpuStart);

          process.send?.({
            duration: (cpu.user + cpu.system) / 1000,
            cpuUser: cpu.user,
            cpuSystem: cpu.system,
          } as BenchmarkResult);

          return;
        }

        const { version, machineId, isColdStart } = event;

        if (version === 1) {
          const requestReceivedAt = new Date().toISOString();
          console.log(`Worker process ${process.pid} is handling v1`);

          const bench = new Bench();

          for (const benchmark of benchmarksV1) {
            bench.add(benchmark.name, benchmark.handler);
          }

          await bench.warmup();
          await bench.run();

          const requestFinishedAt = new Date().toISOString();

          console.log(`Worker process ${process.pid} handled v1`);

          process.send?.({
            version,
            results: bench.results as any,
            numCPUs,
            waitedForNetwork: waitedForResponse.get(process.pid),
            requestReceivedAt,
            requestFinishedAt,
            processId: process.pid,
            machineId,
            isColdStart,
          } as RequestResult);

          waitedForResponse.set(process.pid, 0);
        } else if (version === 2) {
          const requestReceivedAt = new Date().toISOString();
          console.log(`Worker process ${process.pid} is handling v2`);

          const start = performance.now();
          const cpuStart = cpuUsage();

          const bench = new Bench();

          for (const benchmark of benchmarksV2) {
            bench.add(benchmark.name, benchmark.handler);
          }

          await bench.warmup();
          await bench.run();

          const cpu = cpuUsage(cpuStart);
          const duration = (cpu.user + cpu.system) / 1000;
          const wallTime = performance.now() - start;

          const requestFinishedAt = new Date().toISOString();

          console.log(`Worker process ${process.pid} handled v2`);

          process.send?.({
            version,
            results: bench.results as any,
            numCPUs,
            cpuTime: duration,
            wallTime,
            waitedForNetwork: waitedForResponse.get(process.pid),
            requestReceivedAt,
            requestFinishedAt,
            processId: process.pid,
            machineId,
            isColdStart,
            cpuUser: cpu.user,
            cpuSystem: cpu.system,
          } as RequestResult);

          waitedForResponse.set(process.pid, 0);
        }
      });
    }
  );
}
