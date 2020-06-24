const electron = require('electron');
const ipc = electron.ipcMain;
const Logger = require('../../lib/Logger').default;

class Main {
  app = null;

  constructor(eApp) {
    this.app = eApp;
    this.set();
  }

  set = () => {
    ipc.on('main:closeRenderer', (evt, name) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:closeRenderer' : Required app object is missing`
        );
      } else if (this.app.settings.renderer[String(name)]) {
        this.app.settings.renderer[String(name)].close();
      }
    });

    ipc.on('main:saveUserConfig', (evt, data = {}) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:closeRenderer' : Required app object is missing`
        );
      } else if (this.app.instance.storage) {
        this.app.instance.storage.save(data);
      }
    });

    ipc.on('main:getUserConfig', (evt) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:closeRenderer' : Required app object is missing`
        );
      } else if (this.app.storage) {
        evt.returnValue = this.app.storage.user || {};
        return;
      }

      evt.returnValue = {};
    });

    ipc.on('main:getAppProperties', (evt) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:closeRenderer' : Required app object is missing`
        );
      } else if (this.app.properties) {
        evt.returnValue = this.app.properties || {};
        return;
      }

      evt.returnValue = {};
    });

    ipc.on('main:getUserProjects', (evt) => {
      let result = {};
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:closeRenderer' : Required app object is missing`
        );
      } else if (this.app.annoDB) {
        result = this.app.annoDB.projectInKeys || {};
      }

      evt.returnValue = result;
    });

    ipc.on('main:logInfo', (evt, str) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:logInfo' : Required app object is missing`
        );
      } else if (Logger) {
        Logger.info(`Main Logs: ${str}`);
      }
    });

    ipc.on('main:sendMixer', (evt, data, verbose = false) => {
      if (!this.app) {
        Logger.error(
          `MainIPC - 'main:sendMixer' : Required app object is missing`
        );
      } else if (this.app.settings.renderer.main) {
        if (verbose)
          Logger.info(
            `Sending from app to mixer with data - ${JSON.stringify(data)}`
          );

        this.app.settings.renderer.main.webContents.send(
          'mixer:receiveMixer',
          data
        );
      }
    });
  };

  release = () => {
    ipc.removeAllListeners('main:getAppProperties');
    ipc.removeAllListeners('main:getUserConfig');
    ipc.removeAllListeners('main:getUserProjects');
    ipc.removeAllListeners('main:saveUserConfig');
    ipc.removeAllListeners('main:closeRenderer');
    ipc.removeAllListeners('main:logInfo');
    ipc.removeAllListeners('main:sendMixer');

    Logger.info(`Releasing ipc listeners on Main instance`);
  };
}

export default Main;
