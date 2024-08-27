const winston = require("winston");

const now = new Date().toISOString();

// Turn into windows friendly file name
// 2021-06-30T15:00:00.000Z -> 2021-06-30T15-00-00-000Z
const windowsFriendlyNow = now.replace(/:/g, "-").replace(".", "-");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: `./logs/${windowsFriendlyNow}.log`,
    }),
  ],
});

function setBody(req, res, context, next) {
  req.body = JSON.stringify({
    empiris_0: {},
    empiris_1: {},
  });

  return next();
}

let i = 0;

function trackResponseTimeWithoutQueueTime(req, res, context, events, done) {
  // Ignore the first 50 requests as warm-up
  //   if (i++ < 50) {
  //     return done();
  //   }

  const {
    machineId: empiris0MachineId,
    processId: empiris0ProcessId,
    isColdStart: empiris0IsColdStart,
    cpuTime: empiris0Duration,
    requestReceivedAt: empiris0RequestReceivedAt,
    wallTime: empiris0WallTime,
    cpuUser: empiris0CpuUser,
    cpuSystem: empiris0CpuSystem,
  } = JSON.parse(res.body).empiris_0;

  const {
    machineId: empiris1MachineId,
    processId: empiris1ProcessId,
    isColdStart: empiris1IsColdStart,
    cpuTime: empiris1Duration,
    requestReceivedAt: empiris1RequestReceivedAt,
    wallTime: empiris1WallTime,
    cpuUser: empiris1CpuUser,
    cpuSystem: empiris1CpuSystem,
  } = JSON.parse(res.body).empiris_1;

  // Idling in milliseconds
  // const idlingInQueue = parseFloat(res.headers["idling-in-queue"]);

  events.emit("histogram", `empiris_0_response_time`, empiris0Duration);
  // events.emit("histogram", `empiris_0_idling_queue`, idlingInQueue);

  logger.info(
    `A - Response Time: ${empiris0Duration}ms, machineId: ${empiris0MachineId}, processId: ${empiris0ProcessId}, isColdStart: ${empiris0IsColdStart}, requestReceivedAt: ${empiris0RequestReceivedAt}, wallTime: ${empiris0WallTime}, cpuUser: ${empiris0CpuUser}, cpuSystem: ${empiris0CpuSystem} | B - Response Time: ${empiris1Duration}ms, machineId: ${empiris1MachineId}, processId: ${empiris1ProcessId}, isColdStart: ${empiris1IsColdStart}, requestReceivedAt: ${empiris1RequestReceivedAt}, wallTime: ${empiris1WallTime}, cpuUser: ${empiris1CpuUser}, cpuSystem: ${empiris1CpuSystem}`
  );

  events.emit("histogram", `empiris_1_response_time`, empiris1Duration);
  // events.emit("histogram", `empiris_1_idling_queue`, idlingInQueue);

  return done();
}

module.exports = { trackResponseTimeWithoutQueueTime, setBody };
