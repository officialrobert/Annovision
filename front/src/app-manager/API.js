import Logger from 'src/lib/Logger';
import { cloneObject } from 'src/helpers/util';
import { SUPPORTED_FILE_RESOLUTION_IN_KEYS } from 'src/constants/App';

export default {
  setActiveFile: async (AppManager, value, type = 'image') => {
    const files = cloneObject(AppManager.state.userConfig.files || value);
    const { active } = files;
    const maxResolution = SUPPORTED_FILE_RESOLUTION_IN_KEYS['1080p']; // 1080p max support for now

    if (type === 'image' && active) {
      const { path, height, width, name } = active;
      let canvasW = width;
      let canvasH = height;
      const fit = AppManager.getImageMaxSizeContain(width, height);
      const fileDoesExist = await window.ipc.invoke(
        'file:pathDoesExist',
        String(path)
      ); // we need to make sure that the file does exists first
      let hasErr = false;

      if (!path || !fileDoesExist) {
        // path is invalid, prompt on frame
        active.invalid = true;
        hasErr = true;
      } else if (
        !fit ||
        maxResolution.width < width ||
        maxResolution.height < height
      ) {
        Logger.error(
          `Something went wrong in looking for the max dimensions available for the file - ${name}`
        );
        // image dimension exceeds limit
        // must be below 1080p resolution
        active.notFit = true;
        hasErr = true;
      } else {
        canvasH = fit.canvasH;
        canvasW = fit.canvasW;
      }

      if (hasErr) {
        AppManager.setUserConfig('files', files);
        AppManager.callAPI('clearMixer');
        return;
      } else {
        active.invalid = false;
        active.notFit = false;
      }

      const result = await window.ipc.invoke('file:imagePathToBase64', path);
      if (!result.isSuccess) {
        Logger.error(
          `Failed to encode image given path to base64 w/ error - ${result.error}`
        );
        return;
      }

      active.fit = fit;
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
            zoom: fit.zoom,
          },
        });

      AppManager.outputForActiveFile();
    }
  },

  setTask: (AppManager, task) => {
    if (AppManager.mixerReady) {
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
      Logger.log('Painting file annotations');

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

  setInspect: (AppManager) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      const value = cloneObject(AppManager.state.inspect);
      if (!value) return;

      window.ipc.send('main:sendMixer', { key: 'setInspect', value });
    }
  },

  setFileZoom: (AppManager, files) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      const zoom = Number(files.active.fit.zoom);
      if (!zoom) return;
      window.ipc.send('main:sendMixer', { key: 'setFileZoom', value: zoom });
    }
  },

  setFileOffset: (AppManager, files) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      const offsetLeft = Number(files.active.fit.offsetLeft);
      const offsetTop = Number(files.active.fit.offsetTop);

      window.ipc.send('main:sendMixer', {
        key: 'setFileOffset',
        value: { offsetLeft, offsetTop },
      });
    }
  },

  clearMixer: (AppManager) => {
    if (!AppManager) return;
    else if (AppManager.mixerReady) {
      window.ipc.send('main:sendMixer', {
        key: 'clearMixer',
        value: true,
      });
    }
  },
};
