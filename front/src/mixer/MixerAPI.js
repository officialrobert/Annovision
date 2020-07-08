import {
  REGION_BOUNDINGBOX_NAME,
  REGION_POLYGON_NAME,
  POINTS_BLOCK_RADIUS,
  REGION_BASED_TASK,
} from 'src/constants/App';
import { cloneObject } from 'src/helpers/util';

export default {
  viewFile: async (Mixer, value) => {
    Mixer.setState(
      {
        files: { ...Mixer.state.files, active: value },
      },
      () => {
        if (value.type === 'image') {
          Mixer.paintActiveImage();
        }
      }
    );
  },

  setTask: (Mixer, value) => {
    Mixer.setState({
      task: value,
    });
  },

  resolution: async (Mixer, value) => {
    Mixer.setState(
      {
        resolution: value,
      },
      () => {
        Mixer.handleWindowResize();
      }
    );
  },

  paintImage: (Mixer, value) => {
    if (Mixer && value) {
      const { files } = Mixer.state;
      const { active } = files;
      if (active) Mixer.paintActiveFile();
      Mixer.repaintOnMain();
    }
  },

  setFileZoom: async (Mixer, zoom) => {
    if (Mixer) {
      const { files, task } = Mixer.state;
      if (files.active && task) {
        const active = cloneObject(files.active);
        active.zoom = zoom;
        await Mixer.setStateAsync({
          files: { ...Mixer.state.files, active },
        });

        Mixer.paintActiveFile();
        if (task.key === REGION_BASED_TASK.key) {
          Mixer.paintRegionBased();
        }

        Mixer.repaintOnMain();
      }
    }
  },

  setFileOffset: async (Mixer, { offsetTop, offsetLeft }) => {
    if (Mixer) {
      const { files, task } = Mixer.state;
      if (files.active && task) {
        const active = cloneObject(files.active);
        active.offsetLeft = offsetLeft;
        active.offsetTop = offsetTop;

        await Mixer.setStateAsync({
          files: { ...Mixer.state.files, active },
        });

        Mixer.paintActiveFile();
        if (task.key === REGION_BASED_TASK.key) {
          Mixer.paintRegionBased();
        }

        Mixer.repaintOnMain();
      }
    }
  },

  paintAnnnotations: async (Mixer, activeAnnotation = null, { task }) => {
    if (activeAnnotation) {
      Mixer.activeAnnotation = activeAnnotation;

      await Mixer.setStateAsync({
        task,
      });

      Mixer.paintActiveFile();
      if (task.key === REGION_BASED_TASK.key) {
        Mixer.paintRegionBased();
      }

      Mixer.repaintOnMain();
    }
  },

  beginPaint: async (Mixer, pStart, { task }) => {
    if (!Mixer) return;

    Mixer.startPaintLoad = pStart;
    await Mixer.setStateAsync({
      task,
    });

    const c = document.getElementById(Mixer.CANVAS_ID);
    const ctx = c.getContext('2d');
    Mixer.paintActiveFile();

    if (task.key === REGION_BASED_TASK.key) {
      Mixer.paintRegionBased();

      if (task.opt === REGION_POLYGON_NAME) {
        const pStartLatest = Mixer.startPaintLoad.length - 1;
        if (pStartLatest < 0) return;

        const { sX, sY } = Mixer.startPaintLoad[pStartLatest];
        ctx.beginPath();
        ctx.moveTo(sX, sY);
        ctx.fillStyle = '#cc544b';
        ctx.fillRect(
          sX - POINTS_BLOCK_RADIUS,
          sY - POINTS_BLOCK_RADIUS,
          POINTS_BLOCK_RADIUS * 2,
          POINTS_BLOCK_RADIUS * 2
        );
        Mixer.repaintOnMain();
      }
    }
  },

  continuePaint: async (Mixer, pCont, { task }) => {
    if (!Mixer || !pCont || !Mixer.startPaintLoad) return;
    Mixer.pointsPaintLoad = pCont;

    const c = document.getElementById(Mixer.CANVAS_ID);
    const ctx = c.getContext('2d');
    Mixer.paintActiveFile();

    if (task.key === REGION_BASED_TASK.key) {
      Mixer.paintRegionBased();

      if (task.opt === REGION_BOUNDINGBOX_NAME) {
        const { sX, sY } = Mixer.startPaintLoad[0];
        const pointsLatest = Mixer.pointsPaintLoad.length - 1;
        let { pX, pY, width, height } = Mixer.pointsPaintLoad[pointsLatest];
        if (pX <= sX) width = width * -1;
        if (pY <= sY) height = height * -1;

        ctx.globalAlpha = 1;
        ctx.lineWidth = '8';
        ctx.strokeStyle = '#4464e4';
        ctx.rect(sX, sY, width, height);
        ctx.stroke();
        ctx.fillStyle = '#4464e4';
      } else if (task.opt === REGION_POLYGON_NAME) {
        const startLatest = Mixer.startPaintLoad.length - 1;
        const pointsLatest = Mixer.pointsPaintLoad.length - 1;
        const { pX, pY } = Mixer.pointsPaintLoad[pointsLatest];

        ctx.globalAlpha = 1;
        ctx.lineWidth = '8';
        ctx.strokeStyle = '#4464e4';
        ctx.fillStyle = '#cc544b';

        for (let index = 0; index < Mixer.startPaintLoad.length - 1; index++) {
          const { sX, sY } = Mixer.startPaintLoad[index];
          ctx.moveTo(sX, sY);
          ctx.lineTo(
            Mixer.startPaintLoad[index + 1].sX,
            Mixer.startPaintLoad[index + 1].sY
          );
          ctx.fillRect(
            sX - POINTS_BLOCK_RADIUS - 0.5,
            sY - POINTS_BLOCK_RADIUS - 0.5,
            POINTS_BLOCK_RADIUS * 2,
            POINTS_BLOCK_RADIUS * 2
          );
        }

        ctx.fillRect(
          Mixer.startPaintLoad[startLatest].sX - POINTS_BLOCK_RADIUS - 0.5,
          Mixer.startPaintLoad[startLatest].sY - POINTS_BLOCK_RADIUS - 0.5,
          POINTS_BLOCK_RADIUS * 2,
          POINTS_BLOCK_RADIUS * 2
        );
        ctx.moveTo(
          Mixer.startPaintLoad[startLatest].sX,
          Mixer.startPaintLoad[startLatest].sY
        );
        ctx.lineTo(pX, pY);
        ctx.moveTo(pX, pY);
        ctx.lineTo(Mixer.startPaintLoad[0].sX, Mixer.startPaintLoad[0].sY);
        ctx.stroke();
      }
    }

    Mixer.repaintOnMain();
  },

  stopPaint: async (Mixer, pEnd, { task }) => {
    if (!Mixer) return;

    Mixer.endPaintLoad = pEnd;
    await Mixer.setStateAsync({
      task,
    });
  },

  setInspect: async (Mixer, inspect) => {
    if (!Mixer) return;

    const { task } = Mixer.state;
    await Mixer.setStateAsync({
      inspect,
    });

    Mixer.paintActiveFile();
    if (task.key === REGION_BASED_TASK.key) {
      Mixer.paintRegionBased();
    }

    Mixer.repaintOnMain();
  },
};
