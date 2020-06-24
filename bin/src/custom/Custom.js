const path = require('path');
const isDev = require('electron-is-dev');
const electron = require('electron');
const fs = require('fs');
const MainIPC = require('./ipcs/Main').default;
const MixerIPC = require('./ipcs/Mixer').default;
const FilesIPC = require('./ipcs/Files').default;
const DbIPC = require('./ipcs/DB').default;
const CustomEvent = require('../lib/CustomEvent').default;
const Logger = require('../lib/Logger').default;
const Storage = require('../lib/Storage').default;
const AnnoDB = require('../lib/AnnoDB').default;
const {
  STARTUP_HTML_NAME,
  LOAD_SPLASH_HTML_NAME,
  OUTPUT_DIR_NAME,
  DEFAULT_RESOLUTION,
} = require('../constants/App');
const PyCaller = require('../lib/PyCaller').default;
const { debounce } = require('../helpers/util');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

class Custom {
  /**
   * You may extend this class for your own project/application
   * Note: To avoid disrupting the architecture, extend functionality under `begin`
   * begin <function> - called when app properties are fetched and electron is ready to spawn renderer process
   * exit <function> - called when app renderer processes were terminated
   */

  STARTUP = STARTUP_HTML_NAME;
  LOAD = LOAD_SPLASH_HTML_NAME;
  STARTUP_URL = '';
  LOAD_URL = '';
  app = null;
  CustomClassEvents = new CustomEvent('CustomClass');
  shared = { mode: isDev ? 'development' : 'production' };
  IPCS = {};
  APP_URL = '';
  MIXER_URL = '';
  WAIT_FLAGS = { storage: false, annodb: false };

  constructor() {
    this.STARTUP_URL = `file://${path.resolve(__dirname, `./${this.STARTUP}`)}`;
    this.LOAD_URL = `file://${path.resolve(__dirname, `./${this.LOAD}`)}`;
    this.APP_URL =
      (isDev && 'http://localhost:3000/#/') ||
      `file://${path.resolve(__dirname, './public/index.html')}`;
    this.MIXER_URL = isDev
      ? 'http://localhost:3000/#/mixer'
      : `file://${path.resolve(__dirname, './public/index.html#mixer')}`;
    this.CustomClassEvents.on('spawn-main', this.createMain);

    // global/shared variables (see preload script for renderer access)
    global.shared = {
      ...this.shared,
      PROD_APP_URL: this.APP_URL,
      MIXER_URL: this.MIXER_URL,
    };
  }

  setWaitFlag = (name) => {
    Logger.info(`Setting wait flag to true => ${name}`);
    this.WAIT_FLAGS[name] = true;
    let callValidEvent = true;

    Object.keys(this.WAIT_FLAGS).forEach((key) => {
      if (!this.WAIT_FLAGS[key]) callValidEvent = false;
    });

    if (callValidEvent) {
      if (this.WAIT_FLAGS.done) {
        this.doneLoading();
        this.doCheck();
      } else this.WAIT_FLAGS.done = true;
    }
  };

  setupDirs = async () => {
    /**
     * Create directory for output if it does not exist
     */
    Logger.info('Setting up application directories');

    const userpathpy = await PyCaller.call('send:helpers', {
      sub: 'user-path',
    });

    if (!userpathpy.err && userpathpy.data) {
      const userdocupy = await PyCaller.call('send:helpers', {
        sub: 'make-directory',
        path: userpathpy.data,
        dirname: 'Documents',
        // Create Documents folder if it doesn't exist or deleted by user
      });

      if (!userdocupy.err && userdocupy.data) {
        const outputdirpy = await PyCaller.call('send:helpers', {
          sub: 'make-directory',
          path: path.join(userpathpy.data, '/Documents'),
          dirname: OUTPUT_DIR_NAME,
        });

        this.app.settings.dirs.output = path.join(
          userpathpy.data,
          `/Documents/${OUTPUT_DIR_NAME}`
        );

        if (outputdirpy.err || !outputdirpy.data) {
          Logger.error(
            'Terminating process, setting up the application directories failed'
          );
          this.closeAll();
          this.exit();
        } else
          Logger.info(
            `Output directory setup successfully - ${this.app.settings.dirs.output}`
          );
      } else {
        Logger.error(
          'Terminating process, setting up the application directories failed'
        );
        this.closeAll();
        this.exit();
      }
    } else {
      // Create output folder inside electron's path for user data instead
      const outputdirpy = await PyCaller.call('send:helpers', {
        sub: 'make-directory',
        path: path.resolve(app.getPath('userData'), '../'),
        dirname: OUTPUT_DIR_NAME,
      });
      this.app.settings.dirs.output = path.join(
        path.resolve(app.getPath('userData'), '../'),
        OUTPUT_DIR_NAME
      );

      if (!outputdirpy.err && outputdirpy.data) {
        Logger.info(
          `Output directory setup successfully - ${this.app.settings.dirs.output}`
        );
      } else {
        Logger.error(
          `Failed to setup directory for output - ${this.app.settings.dirs.output}`
        );
        this.closeAll();
        this.exit();
      }
    }
  };

  begin = async (eApp) => {
    /**
     * Required function if extended (see App.js call)
     */

    this.app = eApp;
    await this.setupDirs();

    this.IPCS.main = new MainIPC(this.app);
    this.IPCS.mixer = new MixerIPC(this.app);
    this.IPCS.files = new FilesIPC(this.app);
    this.IPCS.db = new DbIPC(this.app);
    this.app.instance.storage = new Storage(
      this.app,
      this.app.settings.reliableOS,
      app.getPath('userData'),
      this
    );
    this.app.instance.annoDB = new AnnoDB(this.app, this);

    /**
     * Loading/Splash to check if data are intact
     *
     */

    if (this.app) {
      this.app.settings.renderer.loading = new BrowserWindow({
        height: 320,
        width: 280,
        maxHeight: 320,
        maxWidth: 280,
        minHeight: 320,
        minWidth: 280,
        resizable: false,
        hasShadow: false,
        frame: false,
        webPreferences: {
          nodeIntegration: false,
          devTools: isDev,
          preload: path.join(__dirname, 'a.js'),
        },
        icon: path.resolve(__dirname, './app.ico'),
      });

      this.app.settings.renderer.loading.on('close', () => {
        this.app.settings.renderer.loading.removeAllListeners('close');
        this.app.settings.renderer.loading.removeAllListeners('closed');
        this.app.settings.renderer.loading.webContents.removeAllListeners(
          'did-finish-load'
        );
        delete this.app.settings.renderer.loading;
        this.app.settings.renderer.loading = null;
        this.app.settings.renderer.main.focus();

        Logger.info('Loading renderer removed');
      });

      this.app.settings.renderer.loading.webContents.on(
        'did-finish-load',
        (evt) => {
          this.app.settings.renderer.loading.show();
          this.app.settings.renderer.loading.focus();
          // check startup html if it exists one expected directory
          fs.open(
            `${path.resolve(__dirname, `./${this.STARTUP}`)}`,
            'r',
            async (err) => {
              if (!err) {
                Logger.info('Main HTML available');
                let interval;
                interval = setTimeout(() => {
                  this.app.settings.renderer.loading.webContents.send(
                    'main:successCheck',
                    true
                  );
                  this.CustomClassEvents.callEvent('spawn-main');
                  clearTimeout(interval);
                }, 2000); // initialisation w/ purpose delay
              } else {
                Logger.error('Main HTML does not exists');
                this.closeAll();
                this.exit();
              }
            }
          );
        }
      );

      this.app.settings.renderer.loading.loadURL(this.LOAD_URL, {
        ...(!isDev && { extraHeaders: 'pragma: no-cache\n' }),
      });
    } else {
      Logger.error(
        'Custom Class: Cannot create splash/load window app object is undefined'
      );
      this.exit();
    }
  };

  createMixer = (
    event,
    url,
    frameName,
    disposition,
    options,
    additionalFeatures
  ) => {
    if (this.app) {
      if (!frameName === 'mixer') return;

      Logger.info(`Custom Class: Creating mixer with URL => ${url}`);
      event.preventDefault();

      if (this.app.settings.renderer.mixer) {
        this.app.settings.renderer.mixer.close();
      }

      let width = 0;
      let height = 0;

      if (this.app.properties.resolution) {
        const resolution = this.app.properties.resolution
          .split(',')
          .map((r) => Number(r));
        width = resolution[0];
        height = resolution[1];
      } else {
        const resolution = DEFAULT_RESOLUTION.split(',').map((r) => Number(r));
        width = resolution[0];
        height = resolution[1];
      }

      Object.assign(options, {
        height,
        width,
        frame: !!isDev,
        transparent: true,
        hasShadow: false,
        show: false,
        modal: false,
        webPreferences: {
          offscreen: !isDev,
          nodeIntegration: false,
          devTools: !!isDev,
          preload: path.join(__dirname, 'a.js'),
          webSecurity: false,
        },
        icon: path.resolve(__dirname, './app.ico'),
      });

      this.app.settings.renderer.mixer = new BrowserWindow(options);
      this.app.settings.renderer.mixer.on('close', this.mixerOnClose);
      this.app.settings.renderer.mixer.webContents.on(
        'did-finish-load',
        (evt) => {
          Logger.info(
            `Custom Class: Mixer window loaded - width: ${width} and height: ${height}`
          );

          if (!this.WAIT_FLAGS.done) {
            this.WAIT_FLAGS.done = true;
            Logger.info('Waiting for flags to be valid');
          } else {
            this.doneLoading();
            this.doCheck();
          }
        }
      );

      event.newGuest = this.app.settings.renderer.mixer;
    } else {
      Logger.error(
        'Custom Class: Cannot create main window app object is undefined'
      );
      this.exit();
    }
  };

  closeAll = () => {
    Logger.info('Terminating app renderers');

    Object.keys(this.app.settings.renderer).forEach((rn) => {
      this.app.settings.renderer[rn].close();
    });
  };

  doneLoading = (hideMixer = false) => {
    if (this.app.settings.renderer.loading) {
      this.app.settings.renderer.loading.close();
    }

    if (this.app.settings.renderer.main) {
      this.app.settings.renderer.mixer.center();
      this.app.settings.renderer.main.show();
    }
    this.app.settings.showMixer = !!hideMixer;
  };

  doCheck = () => {
    this.app.settings.renderer.main.webContents.send('main:core-ready');
    Logger.info('Doing check, setting core as ready');
  };

  mixerOnClose = () => {
    Logger.info('Terminating mixer window');

    if (this.app.settings.renderer.mixer) {
      this.app.settings.renderer.mixer.removeAllListeners('close');
      this.app.settings.renderer.mixer.removeAllListeners('closed');
      this.app.settings.renderer.mixer.webContents.removeAllListeners(
        'did-finish-load'
      );
      this.app.settings.renderer.mixer.webContents.session.clearCache();
      this.app.settings.renderer.mixer = null;
    }
  };

  createMain = () => {
    /***
     * Creates the main renderer for the desired application
     */
    if (this.app) {
      Logger.info(
        `Custom Class: Creating main renderer process with URL === ${this.STARTUP_URL}`
      );

      const { properties } = this.app;
      let width = Number(properties.winMinWidth) || 0;
      let height = Number(properties.winMinHeight) || 0;

      if (!width || !height) {
        Logger.error(
          'Custom Class: Cannot create main window with invalid width and height values for the renderer'
        );
        this.exit();
      }

      if (this.app.storage.user.window) {
        if (
          this.app.storage.user.window.height &&
          this.app.storage.user.window.width
        ) {
          width = this.app.storage.user.window.width;
          height = this.app.storage.user.window.height;
          Logger.info(
            `Using user preference last stored window size, height - ${height}, width- ${width} `
          );
        }

        if (
          width < Number(properties.winMinWidth) ||
          height < Number(properties.winMinHeight)
        ) {
          width = Number(properties.winMinWidth);
          height = Number(properties.winMinHeight);
        }
      }

      this.app.settings.renderer.main = new BrowserWindow({
        height,
        width,
        minHeight: Number(properties.winMinHeight) || 637,
        minWidth: Number(properties.winMinWidth) || 1200,
        resizable: !!(properties.winResize === 'true'),
        hasShadow: false,
        show: false,
        webPreferences: {
          nativeWindowOpen: true,
          nodeIntegration: false,
          preload: path.join(__dirname, 'a.js'),
          devTools: isDev,
        },
        icon: path.resolve(__dirname, './app.ico'),
      });

      this.app.settings.renderer.main.webContents.on(
        'new-window',
        this.createMixer
      );

      this.app.settings.renderer.main.webContents.on(
        'did-finish-load',
        (evt) => {
          try {
            Logger.info(
              `Main renderer successfully loaded current URL === ${
                this.app.settings.renderer.main.webContents.history[
                  this.app.settings.renderer.main.webContents.history.length - 1
                ]
              }`
            );

            const isAppURL =
              String(
                this.app.settings.renderer.main.webContents.history[
                  this.app.settings.renderer.main.webContents.history.length - 1
                ]
              )
                .toLowerCase()
                .indexOf(
                  String(
                    isDev ? this.APP_URL : 'public/index.html'
                  ).toLowerCase()
                ) >= 0;

            if (isAppURL) {
              Logger.info(`Launching mixer with url => ${this.MIXER_URL}`);
              this.app.settings.renderer.main.webContents.executeJavaScript(
                `window.mixer = window.open(window.MIXER_URL,'mixer')`
              );
            }
            //else if (isAppURL && this.app.settings.renderer.mixer)
            //this.doCheck();
          } catch (err) {
            Logger.error(err.message);
          }
        }
      );

      this.app.settings.renderer.main.on('close', this.mainOnClose);
      this.app.settings.renderer.main.loadURL(this.STARTUP_URL, {
        ...(!isDev && { extraHeaders: 'pragma: no-cache\n' }),
      });
    } else {
      Logger.error(
        'Custom Class: Cannot create main window app object is undefined'
      );
      this.exit();
    }
  };

  mainOnClose = () => {
    Logger.info('Terminating main window');

    if (this.app.settings.renderer.mixer)
      this.app.settings.renderer.mixer.close();

    if (this.app.settings.renderer.main) {
      this.app.settings.renderer.main.webContents.session.clearCache();
      this.app.settings.renderer.main.webContents.session.clearStorageData({
        storages: ['shadercache', 'caches', 'indexdb'],
      });
      this.app.settings.renderer.main.webContents.removeAllListeners(
        'did-finish-load'
      );
      this.app.settings.renderer.main.webContents.removeAllListeners(
        'new-window'
      );
      this.app.settings.renderer.main.removeAllListeners('close');
    }
  };

  exit = debounce(() => {
    /**
     * Required function if extended (see App.js call)
     */
    if (this.IPCS.mixer) this.IPCS.mixer.release();
    if (this.IPCS.main) this.IPCS.main.release();
    if (this.IPCS.files) this.IPCS.files.release();

    /**
     * Remove all electron app instance listeners (ipcs etc)
     */
    app.removeAllListeners('ready');
    app.removeAllListeners('activate');
    app.removeAllListeners('before-quit');
    app.removeAllListeners('browser-window-created');
    app.removeAllListeners('close');
    app.removeAllListeners('closed');
    Logger.info('Terminate application');
    app.quit();
    process.exit(0);
  }, 200);
}

export default new Custom();
