import React, { Component, createRef } from 'react';
import styles from './Mixer.scss';
import MixerAPI from './MixerAPI';
import { debounce } from 'src/helpers/util';

export default class Mixer extends Component {
  wrap = null;
  CANVAS_ID = '';
  IMG_DOM = null;

  state = {
    mounted: false,
    files: { active: null },
    resolution: null,
  };

  constructor() {
    super();

    this.CANVAS_ID = `mixer-canvas-${new Date().getDate().toString()}`;
    this.wrap = createRef();
    this.IMG_DOM = new Image();

    window.CANVAS_ID = this.CANVAS_ID;
    window.ipc = window.opener.ipc;
    window.ipc.on('mixer:receiveMixer', this.handleReceive);
  }

  componentDidMount() {
    this.setState(
      {
        mounted: true,
      },
      () => {
        this.IMG_DOM.onload = () => {
          const { files, mounted } = this.state;
          const { active } = files;
          const c = document.getElementById(this.CANVAS_ID);
          const ctx = c.getContext('2d');
          if (!mounted || !active) return;

          ctx.clearRect(0, 0, c.width, c.height);
          c.setAttribute('width', active.canvasW);
          c.setAttribute('height', active.canvasH);
          ctx.drawImage(
            this.IMG_DOM,
            active.offsetLeft,
            active.offsetTop,
            active.width,
            active.height
          );
          this.repaintOnMain();
        };

        window.ipc.send('mixer:sendMain', { key: 'mixerReady', value: true });
      }
    );
  }

  componentWillUnmount() {
    window.ipc.removeAllListeners('mixer:receiveMixer');
    this.IMG_DOM.onload = undefined;
    this.IMG_DOM.src = undefined;

    delete this.CANVAS_ID;
    delete this.wrap;
    delete this.IMG_DOM;
  }

  handleWindowResize = debounce(() => {
    const { resolution } = this.state;
    const { wrap } = this;
    if (!resolution || !wrap) return;
    const [width, height] = resolution.split(',').map((d) => Number(d));
    this.wrap.current.style.width = `${width}px`;
    this.wrap.current.style.height = `${height}px`;
  }, 200);

  handleReceive = async (evt, { key, value }) => {
    if (!key) return;
    const cb = MixerAPI[key];

    if (typeof cb === 'function') {
      cb(this, value);
    }
  };

  repaintOnMain = () => {
    window.ipc.send('mixer:sendMain', { key: 'canvas-paint', value: true });
  };

  paintActiveImage = () => {
    const { files, mounted } = this.state;
    const { active } = files;
    if (!active || !mounted) return;

    this.IMG_DOM.setAttribute('src', `data:image/png;base64, ${active.data}`);
  };

  render() {
    return (
      <div ref={this.wrap} className={styles.mixer}>
        <canvas id={this.CANVAS_ID}></canvas>
      </div>
    );
  }
}
