const { OS_NAMES, STORAGE_FILE_NAME } = require('../constants/App');
const Logger = require('./Logger').default;
const path = require('path');
const fs = require('fs-extra');
const PyCaller = require('../lib/PyCaller').default;

class Storage {
  platform = '';
  userDataPath = '';
  valid = false;
  app = null;
  customInstance = null;

  constructor(eApp, platform, userDataPath, customInstance) {
    this.app = eApp;
    this.platform = platform;
    this.userDataPath = userDataPath;
    this.customInstance = customInstance;

    if (OS_NAMES.includes(String(platform).toLowerCase())) {
      this.valid = true;
      Logger.info('Platform is valid, storage is available for app');
    }
    this.create();
  }

  create = async () => {
    if (!this.valid) {
      Logger.info('Creating storage not possible, platform is invalid');
      this.customInstance.closeAll();
      return;
    }

    let writeFresh = false;
    const pathCheckpy = await PyCaller.call('send:helpers', {
      sub: 'check-path',
      path: this.userDataPath,
    });
    const fileCheckpy = await PyCaller.call('send:helpers', {
      sub: 'check-path',
      path: path.join(this.userDataPath, STORAGE_FILE_NAME),
    });

    if (
      !pathCheckpy.err &&
      pathCheckpy.data &&
      !fileCheckpy.err &&
      fileCheckpy.data
    ) {
      //JSON file was already created
      Logger.info(`Fetching storage json file ${STORAGE_FILE_NAME}`);
      try {
        const storage = fs.readFileSync(
          path.join(this.userDataPath, STORAGE_FILE_NAME),
          { encoding: 'utf-8' }
        );
        const storageJson = JSON.parse(storage);
        this.app.storage = storageJson;
      } catch (err) {
        Logger.error(
          `Parsing storage file at ${path.join(
            this.userDataPath,
            STORAGE_FILE_NAME
          )} failed`
        );
        writeFresh = true;
      }
    } else if (!pathCheckpy.err && pathCheckpy.data && !fileCheckpy.err) {
      //path is existing but it's a fresh install (JSON file does not exist)
      Logger.info(`Creating storage json file ${STORAGE_FILE_NAME}`);
      writeFresh = true;
    } else {
      Logger.info(
        `Error in creating storage path- ${this.userDataPath} seems to not exist!`
      );
      Logger.info('User may not be able to store data/profile as expected');
      return;
    }

    if (writeFresh)
      fs.writeFileSync(
        path.join(this.userDataPath, STORAGE_FILE_NAME),
        JSON.stringify(this.app.storage, null, 4)
      );

    if (this.customInstance) this.customInstance.setWaitFlag('storage');
  };

  save = (user, verbose = false) => {
    if (!user) return;
    this.app.storage.user = user;
    if (verbose)
      Logger.info(`Saving user config value => ${JSON.stringify(user)}`);
    try {
      fs.writeFileSync(
        path.join(this.userDataPath, STORAGE_FILE_NAME),
        JSON.stringify(this.app.storage, null, 4)
      );
    } catch (err) {
      Logger.error(err.message);
    }
  };
}

export default Storage;
