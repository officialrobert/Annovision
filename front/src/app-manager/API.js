import Logger from 'src/lib/Logger';
import { cloneObject } from 'src/helpers/util';

export default {
  setActiveFile: async (AppManager, type = 'image') => {
    const files = cloneObject(AppManager.state.userConfig.files);
    const { active } = files;

    if (type === 'image' && active) {
      const { path, height, width, name } = active;
      let canvasW = width;
      let canvasH = height;
      const fit = AppManager.getImageMaxSizeContain(width, height);

      if (!path) return;
      else if (!fit) {
        Logger.error(
          `Something went wrong in looking for the max dimensions available for the file - ${name}`
        );
        return;
      } else {
        canvasH = fit.canvasH;
        canvasW = fit.canvasW;
      }

      const result = await window.ipc.invoke('file:imagePathToBase64', path);
      if (!result.isSuccess) {
        Logger.error(
          `Failed to encode image given path to base64 w/ error - ${result.error}`
        );
        return;
      }
      files.active.fit = fit;
      await AppManager.setUserConfig('files', files);

      if (AppManager.mixerReady)
        window.ipc.send('main:sendMixer', {
          key: 'viewFile',
          value: {
            data: result.img,
            type,
            height: fit.availHeight,
            width: fit.availWidth,
            offsetLeft: fit.offsetLeft,
            offsetTop: fit.offsetTop,
            canvasH,
            canvasW,
          },
        });

      AppManager.outputForActiveFile();
    }
  },

  setTask: (AppManager, task) => {
    if (!AppManager.mixerReady) {
      window.ipc.send('main:sendMixer', {
        key: 'setTask',
        value: task,
      });
    }
  },

  setResolution: (AppManager, value = null) => {
    if (AppManager.mixerReady)
      window.ipc.send('main:sendMixer', {
        key: 'resolution',
        value: value || AppManager.state.properties.resolution,
      });
  },

  beginPaint: (AppManager, value = null, task) => {
    if (AppManager.mixerReady && value) {
      window.ipc.send('main:sendMixer', {
        key: 'beginPaint',
        value,
        opt: { task },
      });
    }
  },

  continuePaint: (AppManager, value = null, task) => {
    if (AppManager.mixerReady && value) {
      window.ipc.send('main:sendMixer', {
        key: 'continuePaint',
        value,
        opt: { task },
      });
    }
  },

  stopPaint: (AppManager, value = null, task) => {
    if (AppManager.mixerReady && value) {
      window.ipc.send('main:sendMixer', {
        key: 'stopPaint',
        value,
        opt: { task },
      });
    }
  },

  paintFileAnnotations: (AppManager) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      const { userConfig } = AppManager.state;
      const active = cloneObject(userConfig.files.active);
      const task = cloneObject(userConfig.task);
      if (!active || !task) return;

      let value = cloneObject(AppManager.state.activeAnnotation);
      window.ipc.send('main:sendMixer', {
        key: 'paintAnnnotations',
        value,
        opt: { task },
      });
    }
  },

  paintImageOnly: (AppManager) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      window.ipc.send('main:sendMixer', { key: 'paintImage', value: true });
    }
  },
};
