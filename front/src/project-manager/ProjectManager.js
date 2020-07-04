import React, { Component } from 'react';
import { Provider } from './Context';
import { withGlobalSettings } from 'src/app-manager/Context';
import { cloneObject, sleepAsync, debounce } from 'src/helpers/util';
import Logger from 'src/lib/Logger';
import {
  DEFAULT_PROJECT_DATA,
  TASK_KEYS_IN_ARRAY,
  CLASSIFICATION_TASK,
  DEFAULT_REGION_INSPECT,
  DEFAULT_SEGMENTATION_INSPECT,
} from 'src/constants/App';

class ProjectManager extends Component {
  REQUIRED_KEYS = ['name', 'key', 'file', 'permanent', 'numFiles'];
  CHANGING_PROJECT_DELAY = 1500;

  state = {
    userProjects: [],
    projectFiles: [],
    selectedProject: null,
    importingFiles: true,
    removingFiles: false,
    changingProject: false,
    removingProject: false,
    loaded: false,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
  }

  componentWillUnmount() {
    delete this.REQUIRED_KEYS;
    delete this.CHANGING_PROJECT_DELAY;
    delete this.state;
  }

  componentDidMount() {
    let mountMode = 'default';
    if (this.props.userProjects.length > 0) mountMode = 'custom';

    this.mainOnMount(mountMode);
  }

  mainOnMount = async (mode = 'default') => {
    if (mode === 'default') {
      // create new project
      Logger.log('Creating default project..');
      const defaultFinal = {
        ...DEFAULT_PROJECT_DATA,
      };

      await this.addProject(defaultFinal);
      this.setState(
        {
          loaded: true,
          selectedProject: defaultFinal,
        },
        async () => {
          const { userConfig } = this.props;
          const files = cloneObject(userConfig.files);
          files.active = null;
          files.currentPage = 1;

          await this.props.setUserConfig('selectedProject', defaultFinal);
          await this.props.setUserConfig('files', files, 'setActiveFile');
          await this.props.setUserConfig('task', CLASSIFICATION_TASK);
          await this.fetchProjectFiles();
        }
      );
    } else {
      // select the first created project after default (if it has other than default)
      Logger.log('Getting user created projects');
      const { userProjects, userConfig } = this.props;
      const files = cloneObject(userConfig.files);
      let finalSelected = cloneObject(userConfig.selectedProject) || null;
      let configSelectedExists = false;

      if (finalSelected) {
        for (let index = 0; index < userProjects.length; index++) {
          const cProject = userProjects[index];
          if (cProject.key === finalSelected.key) {
            // sync selected project from DB
            configSelectedExists = true;
            finalSelected.numFiles = cProject.numFiles;
            for (
              let taskidx = 0;
              taskidx < TASK_KEYS_IN_ARRAY.length;
              taskidx++
            ) {
              const ctask = TASK_KEYS_IN_ARRAY[taskidx].toLowerCase();
              finalSelected[`${ctask}`] = cProject[`${ctask}`];
            }

            Logger.log(`Project exists in DB - ${JSON.stringify(cProject)}`);
            break;
          }
        }
      }

      if (!configSelectedExists) {
        // choose first or default project if current selected at config does not exist
        finalSelected = userProjects[1] || userProjects[0];
        files.active = null;
        files.currentPage = 1;
      }

      await this.props.setUserConfig('files', files, 'setActiveFile');
      this.setState(
        {
          userProjects: cloneObject(userProjects),
          selectedProject: finalSelected,
          loaded: true,
        },
        async () => {
          await this.props.setUserConfig(
            'selectedProject',
            this.state.selectedProject
          );
          await this.fetchProjectFiles();

          Logger.log(
            `Pre-selected user project - ${JSON.stringify(
              this.state.selectedProject
            )}`
          );
        }
      );
    }
  };

  addProject = async (projectData) => {
    /**
     * Required fields for project
     *
     * name: <string>
     * key: <string> <generated>,
     * file: <string>,
     * permanent: <bool>,
     * numFiles: <int>
     */

    const { userProjects = [] } = this.state;
    const keyL = Object.keys(userProjects).length;
    const outputPath = window.ipc.sendSync(
      'file:outputhPathForProject',
      projectData.name
    );

    projectData.idx = Number(keyL);
    projectData.outputPath = outputPath;

    /**
     * Assign field setup for available tasks in-app
     */
    for (let taskidx = 0; taskidx < TASK_KEYS_IN_ARRAY.length; taskidx++) {
      const task = TASK_KEYS_IN_ARRAY[taskidx].toLowerCase();
      projectData[`${task}`] = DEFAULT_PROJECT_DATA[`${task}`];
    }

    if (userProjects.length <= 0) {
      await this.setStateAsync({
        userProjects: [projectData],
      });
    } else {
      await this.setStateAsync({
        userProjects: [
          ...userProjects,
          {
            ...projectData,
          },
        ],
      });
    }

    Logger.log('Creating project - ', projectData);
    window.ipc.send('db:addProject', projectData);
  };

  selectProject = async (project = null) => {
    const { userConfig } = this.props;
    const { selectedProject, importingFiles, removingFiles } = this.state;
    const files = cloneObject(userConfig.files);

    if (
      project.key === selectedProject.key ||
      !project ||
      importingFiles ||
      removingFiles
    ) {
      Logger.log(
        'User attempted to switch project when importing/removing files'
      );
      return;
    }

    await this.setStateAsync({
      changingProject: true,
    });

    try {
      const pKeys = Object.keys(project);
      for (let index = 0; index < this.REQUIRED_KEYS.length; index++) {
        const ckey = this.REQUIRED_KEYS[index];

        if (!pKeys.includes(ckey)) {
          throw new Error(
            `Required data field for project is missing - ${ckey}`
          );
        }
      }

      files.active = null;
      await this.setStateAsync({
        selectedProject: project,
      });
      await this.props.setUserConfig('files', files);
      await this.props.setUserConfig('selectedProject', project);
      await sleepAsync(this.CHANGING_PROJECT_DELAY);
    } catch (err) {
      Logger.error(err.message);
    }

    await this.fetchProjectFiles();
    await sleepAsync(this.CHANGING_PROJECT_DELAY);
    await this.setStateAsync({ changingProject: false });
  };

  importingProjectFiles = (flag) => {
    this.setState({
      importingFiles: flag,
    });
  };

  removeProject = async (toRemove) => {
    const { removingProject, importingFiles, changingProject } = this.state;
    let selectedProject = null;
    let userProjects = cloneObject(this.state.userProjects);

    // exit if:
    // already in removing project
    // importing files for project
    // currently changing project
    if (removingProject || importingFiles || changingProject) return;
    await this.setStateAsync({ removingProject: true });

    Logger.log(`Removing project - ${JSON.stringify(toRemove)}`);
    for (let index = 0; index < this.state.userProjects.length; index++) {
      const cProject = this.state.userProjects[index];
      if (cProject.key === toRemove.key) {
        selectedProject = this.state.userProjects[index - 1];
        if (selectedProject) userProjects.splice(index, 1);
        break;
      }
    }

    if (selectedProject) {
      await this.selectProject(selectedProject);
      await this.setStateAsync({
        userProjects,
      });
      await sleepAsync(this.CHANGING_PROJECT_DELAY);
      // remove project on core
      window.ipc.send('db:removeProject', toRemove);
    } else {
      Logger.error(`Failed to remove project, unable to select active project`);
    }

    await this.setStateAsync({
      removingProject: false,
    });
  };

  fetchProjectFiles = debounce(async (min = 0, max = 0) => {
    const { userConfig } = this.props;
    const { selectedProject } = this.state;
    const { files } = userConfig;

    if (!selectedProject || selectedProject.numFiles <= 0) {
      Logger.info(
        !selectedProject
          ? 'Trying to fetch files with no selected project'
          : 'Trying to fetch files with project that had no imported files'
      );

      await this.setStateAsync({
        importingFiles: false,
        projectFiles: [],
      });
      return;
    }

    await this.setStateAsync({ importingFiles: true });
    min = min || (files.currentPage - 1) * files.filesPerPage;
    max =
      max || (files.currentPage - 1) * files.filesPerPage + files.filesPerPage;

    try {
      Logger.log(
        `Fetching files for project - ${selectedProject.name} from ${min} to ${max} `
      );
      let res = await window.ipc.invoke('db:fetchProjectFiles', {
        min,
        max,
        projectName: selectedProject.name,
        projectId: selectedProject.idx,
      });

      if (!res.isSuccess) throw new Error(res.error);
      else {
        await this.setStateAsync({
          projectFiles: (res.data && res.data.length > 0 && res.data) || [],
        });
      }
    } catch (err) {
      Logger.error(
        `Fetching files for project - ${selectedProject.name} failed w/ error - ${err.message}`
      );
    }

    await this.setStateAsync({
      importingFiles: false,
    });
  }, 500);

  addFileForProject = async (data = {}, fetchFiles = true) => {
    const { loaded, importingFiles } = this.state;
    const { userConfig } = this.props;
    const selectedProject = cloneObject(this.state.selectedProject);

    if (
      !data ||
      !loaded ||
      !data.name ||
      typeof data !== 'object' ||
      !selectedProject ||
      importingFiles
    )
      return;

    await this.setStateAsync({
      importingFiles: true,
    });

    data.idx = selectedProject.numFiles;
    data.key = `${data.name}-${new Date().getDate().toString()}`;
    data.projectName = selectedProject.name;
    data.projectId = selectedProject.idx;

    try {
      let res = await window.ipc.invoke('db:addDataFile', data);
      if (!res.isSuccess) throw new Error(res.error);
      else if (!res.doesExist && res.isSuccess) {
        if (res.data.numFiles !== selectedProject.numFiles) {
          // update data on UI
          // update numFiles
          const { files } = userConfig;
          const minFilesL = (files.currentPage - 1) * files.filesPerPage;
          selectedProject.numFiles = res.data.numFiles;
          await this.setStateAsync({ selectedProject });
          await this.props.setUserConfig('selectedProject', selectedProject);
          if (fetchFiles)
            await this.fetchProjectFiles(
              minFilesL,
              minFilesL + files.filesPerPage
            );
          await this.updateUserProjects();
        }
      }
    } catch (err) {
      Logger.error(
        `Adding data for project - ${selectedProject.name} failed w/ error - ${err.message}`
      );
    }

    await this.setStateAsync({
      importingFiles: false,
    });
  };

  clearAllFiles = async () => {
    const { removingFiles, loaded, importingFiles } = this.state;
    const { userConfig } = this.props;
    const selectedProject = cloneObject(this.state.selectedProject);
    const files = cloneObject(userConfig.files);
    const inspect = cloneObject(this.props.inspect);

    if (
      removingFiles ||
      !loaded ||
      !selectedProject ||
      importingFiles ||
      !selectedProject.numFiles
    )
      return;
    await this.setStateAsync({
      removingFiles: true,
    });

    try {
      let res = await window.ipc.invoke('db:removeAllFiles', {
        projectName: selectedProject.name,
        projectId: selectedProject.idx,
      });

      if (!res.isSuccess) throw new Error(res.error);
      else {
        files.currentPage = 1;
        files.active = null;
        selectedProject.numFiles = 0;
        inspect.region = { ...DEFAULT_REGION_INSPECT };
        inspect.segmentation = { ...DEFAULT_SEGMENTATION_INSPECT };

        await this.setStateAsync({ projectFiles: [], selectedProject });
        await this.props.setUserConfig('files', files);
        await this.props.setUserConfig('selectedProject', selectedProject);
        await this.updateUserProjects();
        Logger.log(
          `Clearing all files for project - ${this.state.selectedProject.name} numFiles - ${this.state.selectedProject.numFiles} `
        );
        await this.props.setGlobalState('activeAnnotation', null);
        await this.props.setGlobalState('inspect', inspect);
      }
    } catch (err) {
      Logger.error(
        `Clearing all files for project - ${selectedProject.name} failed w/ error - ${err.message}`
      );
    }

    await sleepAsync(this.CHANGING_PROJECT_DELAY);
    await this.setStateAsync({
      removingFiles: false,
    });
  };

  updateUserProjects = async () => {
    const { selectedProject } = this.state;
    const userProjects = cloneObject(this.state.userProjects);

    for (let index = 0; index < userProjects.length; index++) {
      const cProject = userProjects[index];

      if (selectedProject.idx === cProject.idx) {
        cProject.numFiles = selectedProject.numFiles;
        for (let taskidx = 0; taskidx < TASK_KEYS_IN_ARRAY.length; taskidx++) {
          const ctask = TASK_KEYS_IN_ARRAY[taskidx].toLowerCase();
          cProject[`${ctask}`] = selectedProject[`${ctask}`];
        }
        break;
      }
    }

    await this.setStateAsync({ userProjects });
  };

  setupProjectTask = async (task, setup) => {
    const selectedProject = cloneObject(this.state.selectedProject);

    if (!TASK_KEYS_IN_ARRAY.includes(task)) return;
    selectedProject[`${task}`] = setup;
    await this.props.setUserConfig('selectedProject', selectedProject);
    await this.setStateAsync({
      selectedProject,
    });
    await this.updateUserProjects();
    window.ipc.send('db:setupTask', {
      projectId: selectedProject.idx,
      projectName: selectedProject.name,
      task,
      setup,
    });
    await sleepAsync(100);
  };

  render() {
    return (
      <Provider
        value={{
          ...this.state,
          addProject: this.addProject,
          selectProject: this.selectProject,
          removeProject: this.removeProject,
          importingProjectFiles: this.importingProjectFiles,
          addFileForProject: this.addFileForProject,
          fetchProjectFiles: this.fetchProjectFiles,
          clearAllFiles: this.clearAllFiles,
          setupProjectTask: this.setupProjectTask,
        }}
      >
        {this.props.children}
      </Provider>
    );
  }
}

export default withGlobalSettings(ProjectManager);
