class Logger {
  doLog = process.env.NODE_ENV === 'development' || window.annovisionLog;

  enable = () => {
    this.doLog = true;
  };

  serializeData = (args) => {
    const res = args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
      return String(arg);
    });

    return res.join(' ');
  };

  log = (...args) => {
    if (this.doLog) {
      const str = this.serializeData(args);
      console.log(str);
    }
  };

  error = (...args) => {
    if (this.doLog) {
      const str = this.serializeData(args);
      console.error(str);
    }
  };

  info = (...args) => {
    if (this.doLog) {
      const str = this.serializeData(args);
      window.ipc.send('main:logInfo', str);
      console.log(str);
    }
  };
}

export default new Logger();
