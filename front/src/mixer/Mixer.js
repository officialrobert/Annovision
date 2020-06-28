import React, { Component, createRef } from 'react';
import styles from './Mixer.scss';
import MixerAPI from './MixerAPI';
import { debounce } from 'src/helpers/util';
import {
  REGION_BOUNDINGBOX_NAME,
  REGION_POLYGON_NAME,
  POINTS_BLOCK_RADIUS,
} from 'src/constants/App';

export default class Mixer extends Component {
  wrap = null;
  CANVAS_ID = '';
  IMG_DOM = null;

  startPaintLoad = null;
  pointsPaintLoad = null;
  endPaintLoad = null;
  activeAnnotation = null;

  state = {
    mounted: false,
    files: { active: null },
    resolution: null,
    task: null,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });

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
        this.IMG_DOM.onload = this.paintActiveFile;
        window.ipc.send('mixer:sendMain', { key: 'mixerReady', value: true });
      }
    );
  }

  paintActiveFile = () => {
    const { files, mounted } = this.state;
    const { active } = files;
    const c = document.getElementById(this.CANVAS_ID);
    const ctx = c.getContext('2d');
    if (!mounted || !active) return;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 1;

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

  handleReceive = async (evt, { key, value, opt = {} }) => {
    if (!key) return;
    const cb = MixerAPI[key];

    if (typeof cb === 'function') {
      cb(this, value, opt);
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

  paintRegionBased = () => {
    const { task, files, mounted } = this.state;
    const { active } = files;
    const { region } = this.activeAnnotation;
    const c = document.getElementById(this.CANVAS_ID);
    const ctx = c.getContext('2d');

    if (!task || !mounted || !active) return;
    const { offsetLeft, offsetTop } = active;

    ctx.beginPath();
    ctx.lineWidth = '6';
    ctx.strokeStyle = '#4464e4';

    for (let index = 0; index < region.regions.length; index++) {
      const cReg = region.regions[index];

      if (cReg.region_attr.name === REGION_BOUNDINGBOX_NAME) {
        const sX =
          cReg.shape_attr.topLeftX * (active.width / region.width) + offsetLeft;
        const sY =
          cReg.shape_attr.topLeftY * (active.height / region.height) +
          offsetTop;
        const width = cReg.shape_attr.width * (active.width / region.width);
        const height = cReg.shape_attr.height * (active.height / region.height);

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#4464e4';
        ctx.rect(sX, sY, width, height);
        ctx.stroke();
        ctx.globalAlpha = 0.2;
        ctx.fillRect(sX, sY, width, height);
      } else if (cReg.region_attr.name === REGION_POLYGON_NAME) {
        ctx.fillStyle = '#cc544b';

        const numberOfVertices = cReg.shape_attr.vertices.length;
        for (
          let polygonidx = 0;
          polygonidx < numberOfVertices - 1;
          polygonidx++
        ) {
          const vertex = cReg.shape_attr.vertices[polygonidx];
          const nextVertex = cReg.shape_attr.vertices[polygonidx + 1];
          const sXNext =
            nextVertex[0] * (active.width / region.width) + offsetLeft;
          const sYNext =
            nextVertex[1] * (active.height / region.height) + offsetTop;
          const sX = vertex[0] * (active.width / region.width) + offsetLeft;
          const sY = vertex[1] * (active.height / region.height) + offsetTop;

          ctx.globalAlpha = 1;
          ctx.moveTo(sX, sY);
          ctx.fillRect(
            sX - POINTS_BLOCK_RADIUS - 0.5,
            sY - POINTS_BLOCK_RADIUS - 0.5,
            POINTS_BLOCK_RADIUS * 2,
            POINTS_BLOCK_RADIUS * 2
          );
          ctx.lineTo(sXNext, sYNext);

          if (polygonidx === numberOfVertices - 2) {
            ctx.moveTo(sXNext, sYNext);
            ctx.fillRect(
              sXNext - POINTS_BLOCK_RADIUS - 0.5,
              sYNext - POINTS_BLOCK_RADIUS - 0.5,
              POINTS_BLOCK_RADIUS * 2,
              POINTS_BLOCK_RADIUS * 2
            );

            ctx.lineTo(
              cReg.shape_attr.vertices[0][0] * (active.width / region.width) +
                offsetLeft,
              cReg.shape_attr.vertices[0][1] * (active.height / region.height) +
                offsetTop
            );
          }

          ctx.stroke();
        }
      }
    }
  };

  render() {
    return (
      <div ref={this.wrap} className={styles.mixer}>
        <canvas id={this.CANVAS_ID}></canvas>
      </div>
    );
  }
}
