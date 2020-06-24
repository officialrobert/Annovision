import React, { createContext } from 'react';

const { Provider, Consumer } = createContext();

function withModalSettings(WrappedComponent) {
  return React.forwardRef((props, ref) => (
    <Consumer>
      {(value) => <WrappedComponent {...props} ref={ref} {...value} />}
    </Consumer>
  ));
}

export { withModalSettings, Provider };
