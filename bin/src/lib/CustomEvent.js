const EventEmitter = require('events');
const { debounce } = require('../helpers/util');
const Logger = require('../lib/Logger').default;

class CustomEvent extends EventEmitter {
  /**
   * A custom event class for named events deemed to occur once, not successively
   */

  callStack = [];
  name = '';

  constructor(name) {
    super();
    this.name = name;
    this.callStack = [];
  }

  callEvent = (name) => {
    if (!this.callStack.includes(name)) this.callStack.push(name);
    this.releaseCallStack();
  };

  releaseCallStack = debounce(() => {
    while (this.callStack.length > 0) {
      const cname = this.callStack.shift();
      this.emit(String(cname));
    }

    Logger.info(`${this.name} CustomEvent: call stack release`);
  }, 300);

  emptyCallStack = () => (this.callStack = []);
}

export default CustomEvent;
