const electron = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const CustomEvent = require('../lib/CustomEvent').default;
const app = electron.app;
const gotTheLock = app.requestSingleInstanceLock();

////////////////////////////////////
///////    Custom import   /////////
////////////////////////////////////
const Logger = require('../lib/Logger').default;
const PyCaller = require('../lib/PyCaller').default;
const Custom = require('../custom/Custom').default;
const version = require('../../package.json').version || '1.0.0';
const System = require('../lib/System/index').default;

class App {
  app = {
    settings: { ready: false, renderer: {}, dirs: {} },
    properties: { version },
    storage: { version, user: {} },
    annoDB: { projects: [], projectInKeys: {} },
    instance: {},
  };

  MainEvents = null;
  constructor() {
    Logger.info('Starting application');
    this.MainEvents = new CustomEvent('AppClass');
    if (!isDev) electron.Menu.setApplicationMenu(null);
    this.MainEvents.on('app-core-ready', this.createWindows);

    app.on('ready', this.electronAppIsReady);
    app.on('window-all-closed', this.allclosed);
    this.start();
  }

  electronAppIsReady = () => {
    this.app.settings.ready = true;
    if (this.app.properties.loaded) this.MainEvents.callEvent('app-core-ready');
  };

  createWindows = () => {
    /**
     * Create renderer process here
     */
    Logger.info('Application core is ready to create windows');

    if (Custom) {
      Custom.begin(this.app); // begin is a required function
      if (
        this.app.properties.coreSystemVerbose &&
        this.app.properties.coreSystemVerbose !== 'false'
      )
        System.setVerbose(true);
    }
  };

  allclosed = () => {
    /**
     * We release all variables or listeneers here
     */
    this.MainEvents.emptyCallStack();
    if (Custom) Custom.exit();
  };

  getProperties = async () => {
    Logger.info('Fetching app properties');
    const res = await PyCaller.call('send:helpers', {
      sub: 'properties',
      path: path.resolve(__dirname, '../app.config'),
    });

    if (res === null) {
      Logger.error('Failed to fetch application properties');
      return;
    } else if (res.err) {
      Logger.error('Failed to fetch application properties');
      return;
    }
    Logger.info('Successfully fetched application properties');

    this.app.properties = { ...this.app.properties, ...res.data, loaded: true };
  };

  start = async () => {
    const testpy = await PyCaller.call('send:test');
    if (testpy === null) {
      Logger.error('Application cannot be executed, python core not working');
      if (Custom) Custom.exit();
    } else if (testpy.err) {
      Logger.error('Testing python core failed, it may not work');
      if (Custom) Custom.exit();
    } else {
      Logger.info('Successfully tested python core, working!');

      /**
       * Get User platform
       */

      const platformpy = await PyCaller.call('send:helpers', {
        sub: 'reliable-platform',
      });

      if (platformpy !== null && !platformpy.err) {
        this.app.settings.reliableOS = platformpy.data;
        Logger.info(`User platform in reliable string => ${platformpy.data}`);
      }

      await this.getProperties();
      if (this.app.settings.ready) this.MainEvents.callEvent('app-core-ready');
    }
  };
}

(() => {
  if (gotTheLock) {
    new App();
  } else {
    Logger.info('Force quitting the application, app is already running');
    app.quit();
  }
})();
