const winston = require('winston');
const { format } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const transportConsole = new winston.transports.Console({
  format: format.combine(
    format.colorize(),
    format.simple()
  )
});

const transportFile = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  maxFiles: '14d' // Keep logs for 14 days
});

// Create a Winston logger instance
const logger = winston.createLogger({
  level: 'info',
  transports: [
    transportConsole,
    transportFile
  ],
});

module.exports = logger;
