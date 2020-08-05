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
  ZOOM_RANGE,
} from 'src/constants/App';
import { cloneObject } from 'src/helpers/util';

class MixerComponent extends Component {
  canvasRef = null;
  enablePaint = false;
  points = { start: [], cont: [], stop: [] };
  onFrameFlag = false;
  displacement = { from: [] };

  state = {
    mounted: false,
    hasDrag: false,
    hasMove: false,
  };

  constructor() {
    super();
    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });

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
    this.displacement = null;

    window.Mousetrap.unbind('esc', 'keyup');
    window.Mousetrap.unbind('space', 'keyup');
    window.Mousetrap.unbind('ctrl+up');
    window.Mousetrap.unbind('ctrl+down');
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
    window.Mousetrap.bind('ctrl+up', this.onZoomIn);
    window.Mousetrap.bind('ctrl+down', this.onZoomout);
    requestAnimationFrame(this.doPaint);
  };

  onZoomIn = async () => {
    const { userConfig } = this.props;
    const files = cloneObject(userConfig.files);

    if (!files.active || !files.active.fit) return;
    else if (files.active.fit.zoom) {
      if (
        files.active.fit.zoom < ZOOM_RANGE.max &&
        files.active.fit.zoom >= ZOOM_RANGE.min
      )
        files.active.fit.zoom = Number(
          (parseFloat(files.active.fit.zoom) + 0.2).toFixed(2)
        );
    }

    await this.props.setUserConfig('files', files, 'setFileZoom');
  };

  onZoomout = async () => {
    const { userConfig } = this.props;
    const files = cloneObject(userConfig.files);
    let resetOffset = false;

    if (!files.active || !files.active.fit) return;
    else if (files.active.fit.zoom) {
      if (
        files.active.fit.zoom <= ZOOM_RANGE.max &&
        files.active.fit.zoom > ZOOM_RANGE.min
      )
        files.active.fit.zoom = Number(
          (parseFloat(files.active.fit.zoom) - 0.2).toFixed(2)
        );

      if (files.active.fit.zoom === 1) {
        files.active.fit.offsetLeft = 0;
        files.active.fit.offsetTop = 0;
        resetOffset = true;
      }
    }

    await this.props.setUserConfig('files', files, 'setFileZoom');
    if (resetOffset)
      await this.props.setUserConfig('files', files, 'setFileOffset');
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

  startDrag = async (evt) => {
    const { userConfig, moveAndDrag } = this.props;
    const { task } = userConfig;
    const files = cloneObject(userConfig.files);

    if (!evt || !files.active || !files.active.fit) return;
    else if (task.key === CLASSIFICATION_TASK.key) {
      if (this.state.hasDrag) {
        this.setState({
          hasDrag: false,
        });
      }

      if (this.points.start.length > 0) {
        this.points.start = [];
        this.points.cont = [];
      }
    }

    const { clientX, clientY } = evt;
    const { realX, realY } = this.getCoords(clientX, clientY);
    const isBeyondNotAllowed = this.isBeyondImageDims(realX, realY);
    const { offsetLeft, offsetTop, zoom } = files.active.fit;

    if (isBeyondNotAllowed) {
      return;
    }

    if (moveAndDrag) {
      this.displacement.from = [
        { dX: realX - offsetLeft, dY: realY - offsetTop },
      ];
      this.setState({
        hasMove: true,
      });
    } else if (task.key === REGION_BASED_TASK.key && task.opt) {
      if (this.points.start.length > 0) {
        const startLatestL = this.points.start.length - 1;
        if (this.points.start[startLatestL].task.opt !== task.opt) {
          this.points.start = [];
        }
      }

      if (this.state.hasDrag && task.opt === REGION_BOUNDINGBOX_NAME) {
        await this.props.storeAnnoRegionBased({ ...this.points });
        this.points = { start: [], cont: [], stop: [] };
        await this.setStateAsync({
          hasDrag: false,
        });
        return;
      } else {
        this.points.start.push({
          sX: realX,
          sY: realY,
          sXFit: Math.floor((realX - offsetLeft) / zoom),
          sYFit: Math.floor((realY - offsetTop) / zoom),
          task,
        });
      }

      if (!this.state.hasDrag) {
        await this.setStateAsync({
          hasDrag: true,
        });
      }

      this.props.beginPaint([...this.points.start]);
    }
  };

  endDrag = (evt) => {
    if (!evt) return;
    const { hasMove } = this.state;
    const { userConfig } = this.props;
    const { task, files } = userConfig;

    if (hasMove) {
      this.setState(
        {
          hasMove: false,
        },
        async () => {
          const { userConfig } = this.props;
          const files = cloneObject(userConfig.files);
          await this.props.setUserConfig('files', files, 'setFileOffset');
          this.displacement.from = [];
        }
      );
    }

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
    this.points.stop = [{ eX: realX, eY: realY }];
  };

  offFrame = async (evt) => {
    if (this.onFrameFlag) this.onFrameFlag = false;

    if (this.state.hasDrag) {
      this.setState({
        hasDrag: false,
      });
    }

    if (this.state.hasMove) {
      this.setState({
        hasMove: false,
      });
    }
  };

  onFrame = () => {
    const { userConfig } = this.props;
    const { task } = userConfig;

    if (!this.onFrameFlag) this.onFrameFlag = true;

    if (task.key === REGION_BASED_TASK.key) {
      const canBeContinued = this.points.start.length >= 1;
      if (
        (task.opt === REGION_POLYGON_NAME ||
          task.opt === REGION_BOUNDINGBOX_NAME) &&
        canBeContinued
      ) {
        this.setState({
          hasDrag: true,
        });
      }
    }
  };

  contDrag = async (evt) => {
    const { userConfig, callAPI } = this.props;
    const { hasDrag, hasMove } = this.state;
    const { task, files } = userConfig;

    if (!evt || !files.active || !files.active.fit) return;
    const { clientX, clientY } = evt;
    const { realX, realY } = this.getCoords(clientX, clientY);

    if (hasMove) {
      const dX = this.displacement.from[0].dX;
      const dY = this.displacement.from[0].dY;
      const offsetLeft = realX - dX;
      const offsetTop = realY - dY;

      files.active.fit.offsetLeft = offsetLeft;
      files.active.fit.offsetTop = offsetTop;
      callAPI('setFileOffset', { ...files });
    }

    if (!hasDrag || !this.onFrameFlag || !this.points) return;
    else if (hasDrag) {
      const startLatestL = this.points.start.length - 1;
      const { sX, sY } = this.points.start[startLatestL];

      let height = 0;
      let width = 0;
      const isBeyondNotAllowed = this.isBeyondImageDims(realX, realY);

      if (isBeyondNotAllowed) {
        this.endDrag();
        return;
      } else if (task.opt === REGION_BOUNDINGBOX_NAME) {
        const hyp = Math.sqrt(
          Math.pow(realX - sX, 2) + Math.pow(realY - sY, 2)
        );
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
    }
  };

  isBeyondImageDims = (realX, realY) => {
    const { userConfig } = this.props;
    const { files } = userConfig;
    if (!files.active || !files.active.fit) return;
    let isBeyond = false;
    const {
      offsetLeft,
      offsetTop,
      availWidth,
      availHeight,
      zoom,
    } = files.active.fit;

    if (realX < offsetLeft || realY < offsetTop) isBeyond = true;
    else if (
      realX > offsetLeft + availWidth * zoom ||
      realY > offsetTop + availHeight * zoom
    )
      isBeyond = true;
    return isBeyond;
  };

  getCoords = (clientX, clientY) => {
    const { frameStyle, mixerWrapStyle, mixerStyle, userConfig } = this.props;
    const { files } = userConfig;
    if (!files.active || !files.active.fit) return;
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
    let exceedsDimsLimit = false;
    let fileDoesNotExist = false;

    if (files.active) {
      hasActiveFile = true;
      fileDoesNotExist = files.active.invalid;
      exceedsDimsLimit = files.active.notFit;
      this.enablePaint = true;
    } else {
      if (this.points.start.length > 0 || this.points.cont.length > 0)
        this.points = { start: [], cont: [], stop: [] };
      this.enablePaint = false;
    }

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
        {hasActiveFile && fileDoesNotExist && (
          <div className={cx(styles.center_all_row, styles.filenotexist)}>
            <div className={styles.msg}>
              <p>{i18n('file_selected_not_exist')}</p>
            </div>
          </div>
        )}
        {hasActiveFile && exceedsDimsLimit && (
          <div className={cx(styles.center_all_row, styles.notsupported)}>
            <div className={styles.msg}>
              <p>{i18n('file_selected_not_supported')}</p>
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
