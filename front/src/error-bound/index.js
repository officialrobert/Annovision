import React, { Component } from 'react';
import Logger from 'src/lib/Logger';

class ErrorBound extends Component {
  state = {
    hasErr: false,
  };

  componentDidCatch(err, errInfo) {
    Logger.info(`Error: ErrorBound component: ${errInfo}`);
  }

  static getDerivedStateFromError(error) {
    return { hasErr: true };
  }

  render() {
    if (this.state.hasErr) {
      return <></>;
    }

    return this.props.children;
  }
}

export default ErrorBound;
