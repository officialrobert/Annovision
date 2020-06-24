import React, { Component } from 'react';
import { Provider } from './Context';

class ModalManager extends Component {
  state = { DOM: null, active: false };

  setDOM = (dom) => {
    if (!dom) return;

    this.setState({ DOM: dom });
  };

  activateModal = () => {
    this.setState({
      active: true,
    });
  };

  deactivateModal = () => {
    this.setState({
      active: false,
      DOM: null,
    });
  };

  render() {
    const { active, DOM } = this.state;
    return (
      <Provider
        value={{
          ...this.state,
          activateModal: this.activateModal,
          deactivateModal: this.deactivateModal,
          setDOM: this.setDOM,
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            filter: `blur(${active ? 5 : 0}px)`,
          }}
        >
          {this.props.children}
        </div>
        {(active && DOM) || null}
      </Provider>
    );
  }
}

export default ModalManager;
