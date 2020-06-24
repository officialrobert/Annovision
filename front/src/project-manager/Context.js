import React, { createContext } from 'react';

const { Provider, Consumer } = createContext();

function withProjectSettings(WrappedComponent) {
  return React.forwardRef((props, ref) => (
    <Consumer>
      {(value) => <WrappedComponent {...props} ref={ref} {...value} />}
    </Consumer>
  ));
}

export { withProjectSettings, Provider };
