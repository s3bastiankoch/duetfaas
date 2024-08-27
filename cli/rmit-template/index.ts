import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { cpuUsage } from "process";
import { machine, cpus, arch, platform, release } from "os";
import { handler as handlerV1 } from "./lambda_a";
import { handler as handlerV2 } from "./lambda_b";
import { randomUUID } from "crypto";

const ITERATIONS = 5;
const machineId = randomUUID();
let isColdStart = true;

let waitedForResponse = 0;

// Store the original fetch implementation
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

    waitedForResponse += duration;

    return response;
  } catch (error) {
    const duration = performance.now() - start;

    waitedForResponse += duration;

    throw error;
  }
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const results: {
    version: number;
    result: unknown;
    duration: number;
    wallTime: number;
    waitedForNetwork: number;
    machineId: string;
    processId: number;
    isColdStart: boolean;
    requestReceivedAt: string;
    requestFinishedAt: string;
  }[] = [];
  const temp = isColdStart;
  if (isColdStart) {
    isColdStart = false;
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const order = Math.random() > 0.5 ? [1, 2] : [2, 1];

    for (const version of order) {
      const requestReceivedAt = new Date().toISOString();

      const start = performance.now();
      const cpuStart = cpuUsage();

      const result =
        version === 1
          ? await handlerV1(event, context)
          : await handlerV2(event, context);
      const cpu = cpuUsage(cpuStart);
      const duration = (cpu.user + cpu.system) / 1000;
      const wallTime = performance.now() - start;

      const requestFinishedAt = new Date().toISOString();

      results.push({
        version,
        // result,
        result: {},
        duration,
        wallTime,
        waitedForNetwork: waitedForResponse,
        machineId,
        processId: process.pid,
        isColdStart: temp,
        requestReceivedAt,
        requestFinishedAt,
      });

      waitedForResponse = 0;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      results,
      metaInfo: {
        machine:
          machine() + ", " + arch() + ", " + platform() + ", " + release(),
        cpus: cpus()
          .map((cpu) => cpu.model)
          .join(", "),
      },
    }),
  };
};
