import React, { Component, createRef } from 'react';
import cx from 'classnames';
import styles from './MixerComponent.scss';
import i18n from 'src/locales';
import { withGlobalSettings } from 'src/app-manager/Context';
import {
  REGION_BOUNDINGBOX_NAME,
  CLASSIFICATION_TASK,
  REGION_BASED_TASK,
  REGION_POLYGON_NAME,
} from 'src/constants/App';

class MixerComponent extends Component {
  canvasRef = null;
  enablePaint = false;
  points = { start: [], cont: [], stop: [] };
  onFrameFlag = false;

  state = {
    mounted: false,
    hasDrag: false,
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
    this.setState({
      mounted: false,
      hasDrag: false,
    });

    this.canvasRef = null;
    this.points = null;
    window.Mousetrap.unbind('esc', 'keyup');
    window.Mousetrap.unbind('space', 'keyup');
  }

  handleReceive = async (evt, { key, value }) => {
    if (!key) return;
    else if (key === 'canvas-paint' && value) {
      requestAnimationFrame(this.doPaint);
    }
  };

  mainOnMount = () => {
    window.Mousetrap.bind('esc', this.doCancel, 'keyup');
    window.Mousetrap.bind('space', this.doSave, 'keyup');
    requestAnimationFrame(this.doPaint);
  };

  doCancel = () => {
    const { mounted, hasDrag } = this.state;

    if (!mounted) return;
    else if (hasDrag) {
      this.points = { start: [], cont: [], stop: [] };
      this.setState({
        hasDrag: false,
      });

      this.props.repaintMixer();
    }
  };

  doSave = () => {
    const { userConfig } = this.props;
    const { task } = userConfig;
    const { mounted, hasDrag } = this.state;

    if (!mounted || task.key === CLASSIFICATION_TASK.key) return;
    else if (task.key === REGION_BASED_TASK.key) {
      if (hasDrag)
        this.setState(
          {
            hasDrag: false,
          },
          async () => {
            await this.props.storeAnnoRegionBased({ ...this.points });
            this.points = { start: [], cont: [], stop: [] };
          }
        );
    }
  };

  doPaint = () => {
    const { enablePaint, state, canvasRef, props } = this;
    const { mounted } = state;
    const { mixerDOM } = props;

    if (!mounted || !canvasRef || !mixerDOM || !canvasRef.current) return;
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

  startDrag = (evt) => {
    if (!evt) return;
    const { userConfig } = this.props;
    const { task, files } = userConfig;

    if (task.key === CLASSIFICATION_TASK.key || !files.active) {
      if (this.state.hasDrag) {
        this.points = { start: [], cont: [], stop: [] };
        this.setState({
          hasDrag: false,
        });
      }
      return;
    }

    const { clientX, clientY } = evt;
    const { realX, realY } = this.getCoords(clientX, clientY);
    const isBeyondNotAllowed = this.isBeyondImageDims(realX, realY);

    if (isBeyondNotAllowed) {
      return;
    } else if (task.key === REGION_BASED_TASK.key) {
      if (this.points.start.length > 0) {
        const startLatestL = this.points.start.length - 1;
        if (this.points.start[startLatestL].task.opt !== task.opt) {
          this.points.start = [];
        }
      }

      if (task.opt === REGION_BOUNDINGBOX_NAME) {
        this.points.start = [{ sX: realX, sY: realY, task }];
      } else {
        this.points.start.push({
          sX: realX,
          sY: realY,
          task,
        });
      }
      this.setState(
        {
          hasDrag: true,
        },
        () => {
          this.props.beginPaint([...this.points.start]);
        }
      );
    }
  };

  endDrag = (evt) => {
    if (!evt) return;
    const { userConfig } = this.props;
    const { task, files } = userConfig;

    if (
      task.key === CLASSIFICATION_TASK.key ||
      !files.active ||
      this.points.start.length <= 0 ||
      !this.state.hasDrag
    ) {
      if (this.state.hasDrag) {
        this.points = { start: [], cont: [], stop: [] };
        this.setState({
          hasDrag: false,
        });
      }
      return;
    }

    const { clientX, clientY } = evt;
    const { realX, realY } = this.getCoords(clientX, clientY);
    const continueDragging = !(task.opt === REGION_BOUNDINGBOX_NAME);
    this.points.stop = [{ eX: realX, eY: realY }];
    this.setState(
      {
        hasDrag: continueDragging,
      },
      async () => {
        const { userConfig } = this.props;
        const { task } = userConfig;

        if (task.opt === REGION_BOUNDINGBOX_NAME) {
          await this.props.storeAnnoRegionBased({ ...this.points });
          this.points = { start: [], cont: [], stop: [] };
        }
      }
    );
  };

  offFrame = async (evt) => {
    if (this.onFrameFlag) this.onFrameFlag = false;

    if (this.state.hasDrag) {
      const { userConfig } = this.props;
      const { task } = userConfig;

      if (task.opt === REGION_BOUNDINGBOX_NAME) {
        await this.props.storeAnnoRegionBased({ ...this.points });
        this.points = { start: [], cont: [], stop: [] };
      }

      this.setState({
        hasDrag: false,
      });
    }
  };

  onFrame = () => {
    const { userConfig } = this.props;
    const { task } = userConfig;

    if (!this.onFrameFlag) this.onFrameFlag = true;

    if (task.key === REGION_BASED_TASK.key) {
      const canBeContinued = this.points.start.length >= 1;
      if (task.opt === REGION_POLYGON_NAME && canBeContinued) {
        this.setState({
          hasDrag: true,
        });
      }
    }
  };

  contDrag = (evt) => {
    const { userConfig } = this.props;
    const { hasDrag } = this.state;
    const { task, files } = userConfig;

    if (
      !evt ||
      !hasDrag ||
      !this.onFrameFlag ||
      !this.points ||
      !files.active
    ) {
      return;
    }

    const { clientX, clientY } = evt;
    const startLatestL = this.points.start.length - 1;
    const { sX, sY } = this.points.start[startLatestL];
    const { realX, realY } = this.getCoords(clientX, clientY);
    let height = 0;
    let width = 0;
    const isBeyondNotAllowed = this.isBeyondImageDims(realX, realY);

    if (isBeyondNotAllowed) {
      this.endDrag();
      return;
    } else if (task.opt === REGION_BOUNDINGBOX_NAME) {
      const hyp = Math.sqrt(Math.pow(realX - sX, 2) + Math.pow(realY - sY, 2));
      width = Math.abs(realX - sX);
      height = Math.floor(Math.sqrt(Math.pow(hyp, 2) - Math.pow(width, 2)));
    }

    this.points.cont = [
      {
        pX: realX,
        pY: realY,
        width,
        height,
      },
    ];
    this.props.contPaint([...this.points.cont]);
  };

  isBeyondImageDims = (realX, realY) => {
    const { userConfig } = this.props;
    const { files } = userConfig;
    if (!files.active) return;
    let isBeyond = false;
    const { offsetLeft, offsetTop, availWidth, availHeight } = files.active.fit;

    if (realX < offsetLeft || realY < offsetTop) isBeyond = true;
    else if (realX > offsetLeft + availWidth || realY > offsetTop + availHeight)
      isBeyond = true;
    return isBeyond;
  };

  getCoords = (clientX, clientY) => {
    const { frameStyle, mixerWrapStyle, mixerStyle, userConfig } = this.props;
    const { files } = userConfig;
    if (!files.active) return;
    const { canvasW, canvasH } = files.active.fit;

    let realX = Math.ceil(
      clientX -
        Number(frameStyle.left) -
        Number(mixerWrapStyle.left) -
        Number(mixerStyle.left)
    );

    let realY = Math.ceil(clientY - 70 - Number(mixerStyle.top));
    // 70 is 20px padding and 50px header height
    realX = realX <= 0 ? 0 : realX;
    realY = realY <= 0 ? 0 : realY;
    realX = Math.floor(realX * (canvasW / mixerStyle.width));
    realY = Math.floor(realY * (canvasH / mixerStyle.height));

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
      width = mixerStyle.width;
      height = mixerStyle.height;
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

        <div
          onMouseDown={this.startDrag}
          onMouseUp={this.endDrag}
          onMouseMove={this.contDrag}
          onMouseLeave={this.offFrame}
          onMouseEnter={this.onFrame}
          className={styles.compcover}
        ></div>
      </section>
    );
  }
}

export default withGlobalSettings(MixerComponent);
