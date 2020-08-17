const electron = require('electron');
const path = require('path');
const ipc = electron.ipcMain;
const Logger = require('../../lib/Logger').default;
const { TASK_TYPES, TASK_TYPES_IN_ARR } = require('../../constants/App');
const Tasks = require('../../lib/Tasks').default;
const fs = require('fs');

class DB {
  app = null;
  closeApp = null;

  constructor(eApp, closeApp) {
    /**
     * Accepts:
     *  - App's mutable object containing shared data and libraries <object>
     *  - Acces to function that terminates application whenever an obscure error occurred
     */
    this.app = eApp;
    this.closeApp = closeApp;

    /**
     * Call to IPCs
     */
    this.set();
  }

  set = () => {
    ipc.on('db:addProject', (evt, data = {}) => {
      if (!this.app) {
        if (typeof this.closeApp === 'function') {
          this.closeApp(
            `DbIPC - 'db:addProject' : Required app object is missing`
          );
        }
      } else if (this.app.instance.annoDB) {
        this.app.instance.annoDB.createProject(data);
      }
    });

    ipc.on('db:removeProject', (evt, data = {}) => {
      if (!this.app) {
        Logger.error(
          `DbIPC - 'db:removeProject' : Required app object is missing`
        );
      } else if (this.app.instance.annoDB) {
        if (data.name) this.app.instance.annoDB.removeProject(data);
        else Logger.error(`Removing project failed, project data is undefined`);
      }
    });

    ipc.handle('db:addDataFile', async (evt, data) => {
      let result = { isSuccess: false, doesExist: false };

      if (!this.app) {
        if (typeof this.closeApp === 'function') {
          this.closeApp(
            `DbIPC - 'db:addDataFile' : Required app object is missing`
          );

          return result;
        }
      } else if (this.app.instance.annoDB) {
        try {
          let res = await this.app.instance.annoDB.addDataToProject(data);

          if (res.err) {
            result.isSuccess = false;
            throw new Error(
              `DbIPC 'db:addDataFile' Error: Flag from addDataToProject`
            );
          } else {
            result = { ...res };
          }
        } catch (err) {
          Logger.error(
            `DbIPC -  'db:addDataFile': adding data file - ${data.name} failed w/ error - ${err.message}`
          );
          result.error = err.message;
        }
      }

      return result;
    });

    ipc.handle(
      'db:fetchProjectFiles',
      async (evt, { min, max, projectName, projectId }) => {
        let result = { isSuccess: false, data: [] };
        if (!this.app) {
          result.error = `DbIPC - 'db:fetchProjectFiles' : Required app object is missing`;
          if (typeof this.closeApp === 'function') {
            this.closeApp(
              `DbIPC - 'db:fetchProjectFiles' : Required app object is missing`
            );
          }
          return result;
        } else if (this.app.instance.annoDB) {
          try {
            let res = await this.app.instance.annoDB.getFilesFromProject({
              min,
              max: max - 1,
              projectName,
              projectId,
            });

            if (res.err) {
              result.isSuccess = false;
              throw new Error(
                `DbIPC 'db:fetchProjectFiles' Error: Flag from getFilesFromProject`
              );
            } else {
              result = { ...res };
            }
          } catch (err) {
            Logger.error(
              `DbIPC -  'db:fetchProjectFiles': fetching files from project - ${projectName} failed w/ error - ${err.message}`
            );
            result.error = err.message;
          }
        }

        return result;
      }
    );

    ipc.handle('db:removeAllFiles', async (evt, { projectId, projectName }) => {
      let result = { isSuccess: false };
      if (!this.app) {
        result.error = `DbIPC - 'db:removeAllFiles' : Required app object is missing`;
        if (typeof this.closeApp === 'function') {
          this.closeApp(
            `DbIPC - 'db:removeAllFiles' : Required app object is missing`
          );
        }

        return result;
      } else if (this.app.instance.annoDB) {
        try {
          let res = await this.app.instance.annoDB.removeAllFilesFromProject({
            projectName,
            projectId,
          });

          if (res.err) {
            result.isSuccess = false;
            throw new Error(
              `DbIPC 'db:removeAllFiles' Error: Flag from removeAllFilesFromProject`
            );
          } else {
            result = { ...res };
          }
        } catch (err) {
          Logger.error(
            `DbIPC -  'db:removeAllFiles': removing all files in project - ${projectName} failed w/ error - ${err.message}`
          );
          result.error = err.message;
        }
      }

      return result;
    });

    ipc.handle(
      'db:removeDataFile',
      async (evt, { projectId, projectName, file, numFiles }) => {
        let result = { isSuccess: false };
        if (!this.app) {
          result.error = `DbIPC - 'db:removeDataFile' : Required app object is missing`;

          if (typeof this.closeApp === 'function') {
            this.closeApp(
              `DbIPC - 'db:removeDataFile' : Required app object is missing`
            );
          }

          return result;
        } else if (this.app.instance.annoDB) {
          try {
            let res = await this.app.instance.annoDB.removeFileFromProject(
              projectId,
              projectName,
              numFiles,
              file
            );

            if (res.err) {
              result.isSuccess = false;
              throw new Error(
                `DbIPC 'db:removeDataFile' Error: Flag from removeFileFromProject`
              );
            } else {
              result = { ...res };
            }
          } catch (err) {
            Logger.error(
              `DbIPC -  'db:removeDataFile': removing selected file in project - ${projectName} failed w/ error - ${err.message}`
            );
            result.error = err.message;
          }
        }

        return result;
      }
    );

    ipc.handle('db:checkFileOutput', async (evt, project, file) => {
      /**
       * Checks if the annotation file for available tasks are present.
       * Function creates json file for available tasks if not found.
       */

      let result = { isSuccess: false };
      if (!this.app) {
        result.error = `DbIPC - 'db:checkFileOutput' : Required app object is missing`;
        if (typeof this.closeApp === 'function') {
          this.closeApp(
            `DbIPC - 'db:checkFileOutput' : Required app object is missing`
          );
        }

        return result;
      } else if (this.app.settings.dirs.output) {
        try {
          const { output } = this.app.settings.dirs;

          for (let index = 0; index < TASK_TYPES_IN_ARR.length; index++) {
            const ctask = TASK_TYPES[
              TASK_TYPES_IN_ARR[index]
            ].key.toLowerCase();
            const cpath = path.join(
              `${output}`,
              project,
              ctask,
              `${file.idx}.json`
            );

            if (fs.existsSync(cpath)) {
              continue;
            }

            const cTaskFormat = Tasks.getFormat(ctask, project, file);
            if (cTaskFormat) {
              fs.writeFileSync(cpath, JSON.stringify(cTaskFormat, null, 4));
            }
          }

          result.isSuccess = true;
        } catch (err) {
          Logger.error(
            `DbIPC - 'db:checkFileOutput' : Something went wrong ${err.message}`
          );
        }
      }

      return result;
    });

    ipc.on(
      'db:setupTask',
      async (evt, { projectId, task, setup, projectName }) => {
        let result = { isSuccess: false };
        if (!this.app) {
          result.error = `DbIPC - 'db:setupTask' : Required app object is missing`;
          if (typeof this.closeApp === 'function') {
            this.closeApp(
              `DbIPC - 'db:setupTask' : Required app object is missing`
            );
          }

          return result;
        } else if (this.app.instance.annoDB) {
          try {
            const wrtask = await this.app.instance.annoDB.updateTaskSetup(
              task,
              setup,
              projectId
            );

            if (wrtask.err) {
              result.isSuccess = false;
              throw new Error(
                `DbIPC 'db:setupTask' Error: Flag from updateTaskSetup`
              );
            } else if (wrtask.isSuccess) {
              Logger.info(
                `DbIPC - 'db:setupTask': Successfully setup task - ${task} under project - ${projectName}`
              );
            }
          } catch (err) {
            Logger.error(
              `DbIPC - 'db:setupTask': Something went wrong ${err.message}`
            );
            result.error = `DbIPC - 'db:setupTask': Something went wrong ${err.message}`;
          }
        }
      }
    );

    ipc.handle(
      'db:setFileAnnotation',
      (evt, { task, projectName, idxFile, annotation }) => {
        let result = { isSuccess: false };

        if (!this.app) {
          result.error = `DbIPC - 'db:setFileAnnotation' : Required app object is missing`;
          if (typeof this.closeApp === 'function') {
            this.closeApp(
              `DbIPC - 'db:setFileAnnotation' : Required app object is missing`
            );
          }

          return result;
        } else if (this.app.settings.dirs) {
          const { output } = this.app.settings.dirs;

          try {
            const filePath = path.join(
              output,
              projectName,
              task,
              `${idxFile}.json`
            );

            fs.writeFileSync(filePath, JSON.stringify(annotation, null, 4));
            result.isSuccess = true;
          } catch (err) {
            Logger.error(
              `DbIPC - 'db:setFileAnnotation': Something went wrong ${err.message}`
            );
            result.error = `DbIPC - 'db:setFileAnnotation': Something went wrong ${err.message}`;
          }
        }

        return result;
      }
    );

    ipc.handle('db:getFileAnnotation', (evt, task, projectName, idxFile) => {
      let result = { isSuccess: false, data: {} };

      if (!this.app) {
        result.error = `DbIPC - 'db:getFileAnnotation' : Required app object is missing`;
        if (typeof this.closeApp === 'function') {
          this.closeApp(
            `DbIPC - 'db:getFileAnnotation' : Required app object is missing`
          );
        }

        return result;
      } else if (this.app.settings.dirs) {
        const { output } = this.app.settings.dirs;
        const filePath = path.join(
          output,
          projectName,
          task,
          `${idxFile}.json`
        );

        try {
          // @todo
          // implement on python when json/chunk gets large
          // cause we don't want to block loop on this sync function

          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, {
              encoding: 'utf-8',
            });
            const inJson = JSON.parse(raw);
            result.data = inJson;
          } else result.data = {};

          result.isSuccess = true;
        } catch (err) {
          Logger.error(
            `DbIPC - 'db:getFileAnnotation': Something went wrong ${err.message}`
          );
          result.error = `DbIPC - 'db:getFileAnnotation': Something went wrong ${err.message}`;
        }
      }

      return result;
    });
  };

  release = () => {
    ipc.removeAllListeners('db:addProject');
    ipc.removeAllListeners('db:removeProject');
    ipc.removeAllListeners('db:addDataFile');
    ipc.removeAllListeners('db:fetchProjectFiles');
    ipc.removeAllListeners('db:removeAllFiles');
    ipc.removeAllListeners('db:checkFileOutput');
    ipc.removeAllListeners('db:setupTask');
    ipc.removeAllListeners('db:setFileAnnotation');
    ipc.removeAllListeners('db:getFileAnnotation');
    ipc.removeAllListeners('db:removeDataFile');

    Logger.info('Releasing ipc listeners on DB instance');
  };
}

export default DB;
