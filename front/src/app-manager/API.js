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

  setResolution: async (AppManager, value = null) => {
    if (AppManager.mixerReady)
      window.ipc.send('main:sendMixer', {
        key: 'resolution',
        value: value || AppManager.state.properties.resolution,
      });
  },
};
