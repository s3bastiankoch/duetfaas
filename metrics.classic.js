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

  const { cpuTime, wallTime } = JSON.parse(res.body);

  // Idling in milliseconds
  // const idlingInQueue = parseFloat(res.headers["idling-in-queue"]);

  events.emit("histogram", `empiris_response_time`, cpuTime);

  logger.info(`Response Time: ${cpuTime}ms, wallTime: ${wallTime}`);

  return done();
}

module.exports = { trackResponseTimeWithoutQueueTime, setBody };
