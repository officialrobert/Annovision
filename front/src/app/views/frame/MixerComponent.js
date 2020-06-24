import React, { Component, createRef } from 'react';
import cx from 'classnames';
import styles from './MixerComponent.scss';
import i18n from 'src/locales';
import { withGlobalSettings } from 'src/app-manager/Context';

class MixerComponent extends Component {
  canvasRef = null;
  enablePaint = false;

  state = {
    mounted: false,
  };

  constructor() {
    super();
    this.canvasRef = createRef();

    window.ipc.on('main:receiveMain', this.handleReceive);
  }

  componentDidMount() {
    this.setState(
      {
        mounted: true,
      },
      this.mainOnMount
    );
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.doPaint);

    window.ipc.removeAllListeners('main:receiveMain');
    delete this.canvasRef;
  }

  handleReceive = async (evt, { key, value }) => {
    if (!key) return;
    else if (key === 'canvas-paint' && value) {
      requestAnimationFrame(this.doPaint);
    }
  };

  mainOnMount = () => {
    requestAnimationFrame(this.doPaint);
  };

  doPaint = () => {
    const { enablePaint, state, canvasRef, props } = this;
    const { mounted } = state;
    const { mixerDOM } = props;

    if (!mounted || !canvasRef || !mixerDOM) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const mixerCanvas = mixerDOM.document.getElementById(mixerDOM.CANVAS_ID);

    if (!enablePaint) {
      ctx.clearRect(0, 0, c.width, c.height);
    } else {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(mixerCanvas, 0, 0, c.width, c.height);
    }
  };

  onLabelDrag = (evt) => {
    if (!evt) return;
    const { clientX, clientY } = evt;
    const { realX, realY } = this.getCoords(clientX, clientY);
  };

  getCoords = (clientX, clientY) => {
    const { frameStyle, mixerWrapStyle, mixerStyle } = this.props;
    const realX =
      clientX -
      Number(frameStyle.left) -
      Number(mixerWrapStyle.left) -
      Number(mixerStyle.left);

    const realY = clientY;

    return { realX, realY };
  };

  render() {
    const { userConfig, mixerStyle = null } = this.props;
    const { files = null } = userConfig;
    let hasActiveFile = false;
    let width = 0;
    let height = 0;

    if (files.active) {
      hasActiveFile = true;
      this.enablePaint = true;
    } else this.enablePaint = false;

    if (mixerStyle) {
      width = Number(String(mixerStyle.width).replace('px', ''));
      height = Number(String(mixerStyle.height).replace('px', ''));
    }

    requestAnimationFrame(this.doPaint);

    return (
      <section
        style={{ height: `${height}px`, width: `${width}px` }}
        className={styles.mixercomp}
      >
        <canvas width={width} height={height} ref={this.canvasRef}></canvas>
        {!hasActiveFile && (
          <div className={cx(styles.center_all_row, styles.nofile)}>
            <div className={styles.msg}>
              <p>{i18n('no_active_file_msg')}</p>
            </div>
          </div>
        )}
        <div onMouseDown={this.onLabelDrag} className={styles.compcover}></div>
      </section>
    );
  }
}

export default withGlobalSettings(MixerComponent);
