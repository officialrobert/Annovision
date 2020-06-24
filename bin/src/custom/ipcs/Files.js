const electron = require('electron');
const path = require('path');
const ipc = electron.ipcMain;
const Logger = require('../../lib/Logger').default;
const { IMAGE_FILE_EXT_SUPPORTED } = require('../../constants/App');
const System = require('../../lib/System').default;
const CustomImage = require('../../lib/CustomImage').default;

class Files {
  app = null;
  constructor(eApp) {
    this.app = eApp;
    this.set();
  }

  set = () => {
    ipc.handle('file:selectLocalImages', async (evt, name = 'main') => {
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:selectLocalImages' : Required app object is missing`
        );
      } else {
        try {
          const res = await electron.dialog.showOpenDialog(
            this.app.settings.renderer[name],
            {
              filters: [
                { name: 'Images', extensions: [...IMAGE_FILE_EXT_SUPPORTED] },
              ],
              properties: ['openFile', 'multiSelections'],
            }
          );
          if (res.canceled) return [];
          else {
            // need to store before returning the data if in case user select all huge number of images
            return (
              res.filePaths.map((filepath) => {
                const lastIndexBackSlash = String(filepath).lastIndexOf('\\');
                const fileName = String(filepath).substring(
                  lastIndexBackSlash + 1,
                  filepath.length
                );
                const lastIndexDot = fileName.lastIndexOf('.');
                const ext = String(fileName).substring(
                  lastIndexDot + 1,
                  filepath.length
                );

                return {
                  path: filepath,
                  extensions: [...IMAGE_FILE_EXT_SUPPORTED],
                  name: fileName,
                  ext,
                };
              }) || []
            );
          }
        } catch (err) {
          Logger.error(`Files IPC - 'file:selectLocalImages': ${err.message}`);
          return [];
        }
      }
    });

    ipc.on('file:getDirectoryPath', (evt, name = '') => {
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:getDirectoryPath' : Required app object is missing`
        );
      } else if (this.app.settings.dirs[name]) {
        evt.returnValue = this.app.settings.dirs[name] || '';
        return;
      }

      evt.returnValue = '';
    });

    ipc.on('file:showDirectoryPath', async (evt, name) => {
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:showDirectoryPath' : Required app object is missing`
        );
      } else if (this.app.settings.dirs[name]) {
        try {
          Logger.info(`Showing directory - ${this.app.settings.dirs[name]}`);
          await System.showFolder(
            this.app.settings.dirs[name],
            String(this.app.settings.reliableOS).toLowerCase()
          );
        } catch (err) {
          evt.returnValue = { err: true, data: null };
        }
        return;
      }

      evt.returnValue = { err: true, data: null };
    });

    ipc.on('file:outputhPathForProject', (evt, name) => {
      let projectOutput = '';
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:outputhPathForProject' : Required app object is missing`
        );
      } else {
        projectOutput = path.join(
          this.app.settings.dirs.output,
          String(name).toLowerCase()
        );
      }

      evt.returnValue = projectOutput;
    });

    ipc.handle('file:imagePathToBase64', async (evt, path) => {
      let result = { isSuccess: false, data: null };
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:imagePathToBase64' : Required app object is missing`
        );
      } else {
        try {
          let res = await CustomImage.pathToBase64(path);

          if (res.err) {
            result.isSuccess = false;
            throw new Error(
              `FilesIPC 'file:imagePathToBase64' Error: Flag from pathToBase64`
            );
          } else {
            result = { ...res };
          }
        } catch (err) {
          Logger.error(
            `FilesIPC -  'file:imagePathToBase64': encoding from path - ${path} to base64 failed`
          );
          result.error = err.message;
        }
      }

      return result;
    });

    ipc.on('file:joinPaths', (evt, ...args) => {
      let fullPath = '';
      if (!this.app) {
        Logger.error(
          `FilesIPC - 'file:joinPaths' : Required app object is missing`
        );
      } else {
        fullPath = args.reduce((combinedPath, cValue) => {
          return path.join(combinedPath, cValue);
        }, '');
      }

      evt.returnValue = fullPath;
    });
  };

  release = () => {
    ipc.removeAllListeners('file:selectLocalImages');
    ipc.removeAllListeners('file:getOutputDirectory');
    ipc.removeAllListeners('file:showDirectoryPath');
    ipc.removeAllListeners('file:outputhPathForProject');
    ipc.removeAllListeners('file:imagePathToBase64');
    ipc.removeAllListeners('file:joinPaths');

    Logger.info(`Releasing ipc listeners on Files instance`);
  };
}

export default Files;
