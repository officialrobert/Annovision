('use strict');

const winston = require('winston');
const path = require('path');
const moment = require('moment');

const options = {
  file: {
    level: 'info',
    filename: path.resolve(__dirname, '../logs/app.log'),
    handleExceptions: true,
    json: true,
    maxsize: 10000000,
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

class Logger {
  winstonLog = null;

  constructor() {
    this.winstonLog = new winston.createLogger({
      transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console),
      ],
      format: winston.format.printf((info) => {
        var date = new Date();
        var formattedDate = moment(date).format('YYYY-MM-DD HH:mm:ss.SSSZ');
        return formattedDate + ', ' + info.message;
      }),
      exitOnError: false,
    });
  }

  serialize = (args) => {
    const str = args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
      else return String(arg);
    });

    return str.join(' ');
  };

  info = (...args) => {
    const res = this.serialize(args);
    this.winstonLog.info(res);
  };

  error = (...args) => {
    const res = this.serialize(args);
    this.winstonLog.info(`Error => ${res}`);
  };
}

export default new Logger();
