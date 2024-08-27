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
      filename: `./logs/duet_${windowsFriendlyNow}.log`,
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

function trackResponseTimeWithoutQueueTime(req, res, context, events, done) {
  const {
    machineId: empiris0MachineId,
    processId: empiris0ProcessId,
    isColdStart: empiris0IsColdStart,
    cpuTime: empiris0Duration,
    requestReceivedAt: empiris0RequestReceivedAt,
    wallTime: empiris0WallTime,
  } = JSON.parse(res.body).empiris_0;

  const {
    machineId: empiris1MachineId,
    processId: empiris1ProcessId,
    isColdStart: empiris1IsColdStart,
    cpuTime: empiris1Duration,
    requestReceivedAt: empiris1RequestReceivedAt,
    wallTime: empiris1WallTime,
  } = JSON.parse(res.body).empiris_1;

  const { machine, cpus } = JSON.parse(res.body).metaInfo;

  // Idling in milliseconds
  // const idlingInQueue = parseFloat(res.headers["idling-in-queue"]);

  events.emit("histogram", `empiris_0_response_time`, empiris0Duration);
  // events.emit("histogram", `empiris_0_idling_queue`, idlingInQueue);

  logger.info(`Machine: ${machine}, CPUs: ${cpus}`);
  logger.info(
    `A - Response Time: ${empiris0Duration}ms, machineId: ${empiris0MachineId}, processId: ${empiris0ProcessId}, isColdStart: ${empiris0IsColdStart}, requestReceivedAt: ${empiris0RequestReceivedAt}, wallTime: ${empiris0WallTime} | B - Response Time: ${empiris1Duration}ms, machineId: ${empiris1MachineId}, processId: ${empiris1ProcessId}, isColdStart: ${empiris1IsColdStart}, requestReceivedAt: ${empiris1RequestReceivedAt}, wallTime: ${empiris1WallTime}`
  );

  events.emit("histogram", `empiris_1_response_time`, empiris1Duration);
  // events.emit("histogram", `empiris_1_idling_queue`, idlingInQueue);

  return done();
}

module.exports = { trackResponseTimeWithoutQueueTime, setBody };
