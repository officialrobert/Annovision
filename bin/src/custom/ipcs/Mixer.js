const electron = require('electron');
const ipc = electron.ipcMain;
const Logger = require('../../lib/Logger').default;

class Mixer {
  app = null;

  constructor(eApp) {
    this.app = eApp;
    this.set();
  }

  set = () => {
    ipc.on('mixer:toggleVisibility', (evt) => {
      if (!this.app) {
        Logger.error(
          `MixerIPC - 'mixer:toggleVisibility' : Required app object is missing`
        );
      } else if (this.app.settings.renderer.mixer) {
        if (!this.app.settings.showMixer)
          this.app.settings.renderer.mixer.show();
        else this.app.settings.renderer.mixer.hide();

        this.app.settings.showMixer = !this.app.settings.showMixer;
      }
    });

    ipc.on('mixer:sendMain', (evt, data = {}, verbose = false) => {
      if (!this.app) {
        Logger.error(
          `MixerIPC - 'mixer:sendMain' : Required app object is missing`
        );
      } else if (this.app.settings.renderer.main) {
        if (verbose)
          Logger.info(
            `Sending from mixer to app with data - ${JSON.stringify(data)}`
          );

        this.app.settings.renderer.main.webContents.send(
          'main:receiveMain',
          data
        );
      }
    });
  };

  release = () => {
    ipc.removeAllListeners('mixer:toggleVisibility');
    ipc.removeAllListeners('mixer:sendMain');
    Logger.info('Releasing ipc listeners on Mixer instance');
  };
}

export default Mixer;
