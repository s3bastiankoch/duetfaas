import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { cpuUsage } from "process";
import { handler as lambda } from "./lambda";
import { randomUUID } from "crypto";

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

const machineId = randomUUID();
let isColdStart = true;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const requestReceivedAt = new Date().toISOString();
  const temp = isColdStart;
  isColdStart = false;

  const start = performance.now();
  const cpuStart = cpuUsage();
  const result = await lambda(event, context);
  const cpu = cpuUsage(cpuStart);
  const duration = (cpu.user + cpu.system) / 1000;
  const wallTime = performance.now() - start;

  waitedForResponse = 0;

  return {
    statusCode: 200,
    body: JSON.stringify({
      requestReceivedAt,
      machineId,
      isColdStart: temp,
      processId: process.pid,
      //  result,
      cpuTime: duration,
      wallTime,
      waitedForNetwork: waitedForResponse,
      user: cpu.user,
      system: cpu.system,
    }),
  };
};
