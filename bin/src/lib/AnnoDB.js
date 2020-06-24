import { fstat } from 'fs';

const Logger = require('./Logger').default;
const PyCaller = require('./PyCaller').default;
const path = require('path');
const { TASK_TYPES, CLASSIFICATION_TASK } = require('../constants/App');
const fs = require('fs');

class AnnoDB {
  app = null;
  customInstance = null;

  constructor(eApp, customInstance) {
    this.app = eApp;
    this.customInstance = customInstance;
    this.create();
  }

  create = async () => {
    try {
      Logger.info('Setting app anno.db');
      await PyCaller.call('send:database', {
        sub: 'init',
      });

      Logger.info('Fetching pre-saved user projects');
      const projpy = await PyCaller.call('send:database', {
        sub: 'get-projects',
      });

      if (!projpy.err && projpy.data) {
        let projectInKeys = {};
        this.app.annoDB = { ...this.app.annoDB, projects: projpy.data || [] };
        // create output folder for the project if it doesn't exist yet

        for (let index = 0; index < this.app.annoDB.projects.length; index++) {
          const currentProj = this.app.annoDB.projects[index];
          const project = String(currentProj.name).toLowerCase();
          projectInKeys[`${currentProj.idx}`] = currentProj;

          if (currentProj.permanent === 'true') {
            currentProj.permanent = true;
            projectInKeys[`${currentProj.idx}`].permanent = true;
          } else {
            currentProj.permanent = false;
            projectInKeys[`${currentProj.idx}`].permanent = false;
          }

          await this.projectOutput(project);
        }

        this.app.annoDB.projectInKeys = projectInKeys;
      }

      if (this.customInstance) this.customInstance.setWaitFlag('annodb');
    } catch (err) {
      Logger.error(`AnnoDB Class: on create - ${err.message} `);
    }
  };

  projectOutput = async (project) => {
    const projectOutput = path.join(this.app.settings.dirs.output, project);
    const cpathpy = await PyCaller.call('send:helpers', {
      sub: 'check-path',
      path: projectOutput,
    });

    if (!cpathpy.err && !cpathpy.data) {
      Logger.info(`Creating output folder for - ${project}`);
      const makedirpy = await PyCaller.call('send:helpers', {
        sub: 'make-directory',
        path: this.app.settings.dirs.output,
        dirname: project,
      });

      if (!makedirpy.err && makedirpy.data) {
        Logger.info(`Output folder for project - ${project} has been created`);

        await this.tasksFolder(projectOutput, project);
      }
    } else if (!cpathpy.err) {
      Logger.info(`Output folder - ${project} is valid`);
      await this.tasksFolder(projectOutput, project);
    } else {
      Logger.error(`Creating output folder - ${project} failed or isn't valid`);
    }
  };

  tasksFolder = async (projectOutput, project) => {
    const tasks = Object.keys(TASK_TYPES);
    for (let index = 0; index < tasks.length; index++) {
      const ctask = TASK_TYPES[tasks[index]].key.toLowerCase();
      const fullTaskPath = path.join(projectOutput, ctask);
      const taskdirpy = await PyCaller.call('send:helpers', {
        sub: 'check-path',
        path: fullTaskPath,
      });

      if (!taskdirpy.err && !taskdirpy.data) {
        Logger.info(`Creating task folder - ${ctask} for project - ${project}`);

        const makedirpy = await PyCaller.call('send:helpers', {
          sub: 'make-directory',
          path: projectOutput,
          dirname: ctask,
        });

        if (!makedirpy.err && makedirpy.data) {
          Logger.info(
            `Task folder - ${ctask} for - ${project} has been created`
          );
        }
      } else if (!taskdirpy.err) {
        Logger.info(`Task folder - ${ctask} for project - ${project} is valid`);
      } else {
        Logger.error(
          `Creating task folder - ${ctask} for - ${project} failed or isn't valid`
        );
      }
    }
  };

  createProject = async (data) => {
    Logger.info(`Creating project: name - ${data.name}, key - ${data.key}`);

    try {
      const res = await PyCaller.call('send:database', {
        sub: 'add-project',
        ...data,
        ...{
          permanent: (data.permanent && 'true') || 'false',
          output_path: data.outputPath,
        },
      });

      if (!res.err && res.data) {
        if (this.app.settings.dirs.output) {
          Logger.info('Creating output folder for the project');
          const projectName = String(data.name).toLowerCase();
          const outputfolderpy = await PyCaller.call('send:helpers', {
            sub: 'make-directory',
            path: this.app.settings.dirs.output,
            dirname: projectName,
          });

          if (!outputfolderpy.err && outputfolderpy.data) {
            if (this.app.annoDB.projects.length <= 0)
              this.app.annoDB.projects = [];
            this.app.annoDB.projects.push(data);

            const tasks = Object.keys(TASK_TYPES);

            for (let index = 0; index < tasks.length; index++) {
              const ctask = TASK_TYPES[tasks[index]].key.toLowerCase();
              const taskdirpy = await PyCaller.call('send:helpers', {
                sub: 'make-directory',
                path: path.join(this.app.settings.dirs.output, projectName),
                dirname: ctask,
              });

              if (!taskdirpy.err && taskdirpy.data) {
                Logger.info(`Successfully created task folder - ${ctask}`);
              }

              /**
               * Stringify tasks field available
               */
              data[ctask] = JSON.stringify(data[ctask] || {});
            }

            this.app.annoDB.projectInKeys[`${data.idx}`] = data;
            Logger.info(`Successfully created new project - ${data.name}`);
          } else
            Logger.error(
              `Failed to create output folder for project - ${data.name}`
            );
        }
      }
    } catch (err) {
      Logger.error(`AnnoDB Class: on create project - ${err.message}`);
    }
  };

  removeProject = async (project) => {
    Logger.info(
      `Removing project: name - ${project.name}, key - ${project.key}`
    );

    try {
      const deleteprojpy = await PyCaller.call('send:database', {
        sub: 'remove-project',
        ...project,
      });

      if (!deleteprojpy.err && deleteprojpy.data) {
        Logger.info(`AnnoDB Class: removing project - ${project.name} success`);

        await this.removeOutputFiles(project.name);
        const rmoutputpy = await PyCaller.call('send:helpers', {
          sub: 'remove-files-from-dir',
          path: project.outputPath,
          include_dir: 'true',
        });

        if (!rmoutputpy.err && rmoutputpy.data) {
          Logger.info(
            `AnnoDB Class: removing project output dir - ${project.name} success`
          );
        } else
          Logger.info(
            `AnnoDB Class: removing project output dir - ${project.name} failed`
          );
      } else {
        Logger.error(`AnnoDB Class: removing project - ${project.name} failed`);
      }
    } catch (err) {
      Logger.error(`AnnoDB Class: on remove - ${project.name} ${err.message}`);
    }
  };

  removeOutputFiles = async (project) => {
    project = String(project).toLowerCase();
    Logger.info(`Removing output files under project - ${project}`);

    try {
      const { output } = this.app.settings.dirs;
      const tasksKey = Object.keys(TASK_TYPES);

      for (let index = 0; index < tasksKey.length; index++) {
        const ctask = TASK_TYPES[tasksKey[index]].key.toLowerCase();
        const fullPath = path.join(output, project, ctask);
        const rmoutputfilespy = await PyCaller.call('send:helpers', {
          sub: 'remove-files-from-dir',
          path: fullPath,
          include_dir: 'false',
        });

        if (!rmoutputfilespy.err && rmoutputfilespy.data) {
          Logger.info(
            `AnnoDB Class: Removed task's output - ${ctask} under project - ${project}`
          );
        } else {
          Logger.error(
            `AnnoDB Class: Failed to remove task's output - ${ctask} under project - ${project}`
          );
        }
      }
    } catch (err) {
      Logger.error(
        `AnnoDB Clas: on removing output files under - ${project} ${err.message}`
      );
    }
  };

  addDataToProject = (data) => {
    return new Promise(async (resolve) => {
      let result = { isSuccess: false, doesExist: false, err: false };
      const checkdatapy = await PyCaller.call('send:database', {
        sub: 'check-data',
        name: data.name,
        path: data.path,
        project_id: data.projectId,
      });

      if (checkdatapy.err) {
        result.err = true;
      } else if (!checkdatapy.data) {
        result.isSuccess = true;
        result.doesExist = true;
      } else if (checkdatapy.data) {
        const newdatapy = await PyCaller.call('send:database', {
          sub: 'add-data',
          ...data,
          project_name: data.projectName,
          project_id: data.projectId,
        });

        if (newdatapy.err) {
          result.isSuccess = false;
          result.err = true;
        } else {
          this.app.annoDB.projectInKeys[`${data.projectId}`].numFiles =
            newdatapy.data.numFiles;
          result = {
            ...result,
            data: newdatapy.data,
            isSuccess: true,
            doesExist: false,
            err: false,
          };
        }
      } else result.isSuccess = false;

      resolve(result);
    });
  };

  getFilesFromProject = ({ min, max, projectName, projectId }) => {
    return new Promise(async (resolve) => {
      Logger.info(
        `Getting files from project - ${projectName} w/ ID - ${projectId} from ${min} to ${max}`
      );

      let result = { isSuccess: false, data: [], err: false };

      const getfilespy = await PyCaller.call(
        'send:database',
        {
          sub: 'get-files',
          min,
          max,
          project_name: projectName,
          project_id: projectId,
        },
        false
      );

      if (getfilespy.err) {
        result.err = true;
        result.isSuccess = false;
      } else {
        result.err = false;
        result.isSuccess = true;
        result.data = getfilespy.data || [];
      }

      resolve(result);
    });
  };

  removeAllFilesFromProject = ({ projectId, projectName }) => {
    return new Promise(async (resolve) => {
      Logger.info(
        `Removing all files from project - ${projectName} w/ ID - ${projectId}`
      );
      let result = { isSuccess: false, err: false };

      const deletefilespy = await PyCaller.call('send:database', {
        sub: 'remove-all-files',
        project_id: projectId,
        project_name: projectName,
      });

      if (deletefilespy.err || !deletefilespy.data) {
        result.err = true;
        result.isSuccess = false;
      } else {
        result.err = false;
        result.isSuccess = true;
        this.app.annoDB.projectInKeys[`${projectId}`].numFiles = 0;

        await this.removeOutputFiles(projectName);
      }

      resolve(result);
    });
  };

  updateTaskSetup = (task, setup, projectId) => {
    return new Promise(async (resolve) => {
      let result = { isSuccess: false, err: false };
      const updatetaskpy = await PyCaller.call('send:database', {
        sub: 'task-setup',
        idx: projectId,
        task,
        setup,
      });

      if (!updatetaskpy.err && updatetaskpy.data) {
        // success and udpated
        const { output } = this.app.settings.dirs;
        this.app.annoDB.projectInKeys[`${projectId}`][
          `${task}`
        ] = JSON.stringify(setup);
        result.isSuccess = true;

        if (CLASSIFICATION_TASK.key === task) {
          // write classes on classes.json
          try {
            const classesFilePath = path.join(
              output,
              this.app.annoDB.projectInKeys[`${projectId}`].name.toLowerCase(),
              `${CLASSIFICATION_TASK.key}`,
              'classes.json'
            );

            fs.writeFileSync(classesFilePath, JSON.stringify(setup, null, 4));
          } catch (err) {
            Logger.error(
              `Failed to write on classes.json for project id - ${projectId} w/ error -${err.message}`
            );
            result.err = true;
            result.isSuccess = false;
          }
        }
      } else if (updatetaskpy.err) {
        result.err = true;
      }

      resolve(result);
    });
  };
}

export default AnnoDB;
