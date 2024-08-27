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
      filename: `./logs/rmit_${windowsFriendlyNow}.log`,
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
    empiris_0: { results: results1 },
    empiris_1: { results: results2 },
  } = JSON.parse(res.body);

  const matches = results1.map((result1, index) => [result1, results2[index]]);

  const { machine, cpus } = JSON.parse(res.body).metaInfo;

  for (const [empiris0, empiris1] of matches) {
    logger.info(`Machine: ${machine}, CPUs: ${cpus}`);
    logger.info(
      `A - Response Time: ${empiris0.cpuTime}ms, machineId: ${empiris0.machineId}, processId: ${empiris0.processId}, isColdStart: ${empiris0.isColdStart}, requestReceivedAt: ${empiris0.requestReceivedAt}, wallTime: ${empiris0.wallTime} | B - Response Time: ${empiris1.cpuTime}ms, machineId: ${empiris1.machineId}, processId: ${empiris1.processId}, isColdStart: ${empiris1.isColdStart}, requestReceivedAt: ${empiris1.requestReceivedAt}, wallTime: ${empiris1.wallTime}`
    );
  }

  return done();
}

module.exports = { trackResponseTimeWithoutQueueTime, setBody };
