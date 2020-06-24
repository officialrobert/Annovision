import React, { Component, Fragment } from 'react';
import LoadingScreen from 'src/components/modals/loading-screen';
import { Provider } from './Context';
import Logger from 'src/lib/Logger';
import { debounce, objectHasSameKeys, cloneObject } from 'src/helpers/util';
import {
  USER_CONFIG_FILES_DEFAULT,
  SUPPORTED_FILE_RESOLUTION_IN_KEYS,
  CLASSIFICATION_TASK,
  TASK_KEYS_IN_ARRAY,
} from 'src/constants/App';
import API from './API';

export default class AppManager extends Component {
  onInit = false;
  mixerReady = false;
  mixerReadyCbCalled = false;

  state = {
    leftPanelDom: null,
    rightPanelDom: null,
    showLeftPanel: true,
    showRightPanel: true,
    loaded: false,
    mounted: false,
    userConfig: null,
    userProjects: null, // user projects on start-up only, for updated projects, please adopt ProjectManager around your component
    properties: null,
    dirs: {},
    mixerDOM: null,
    activeAnnotation: null,
  };

  constructor() {
    super();
    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });

    window.ipc.on('main:core-ready', this.init);
    window.ipc.on('main:receiveMain', this.handleReceive);
    window.addEventListener('resize', this.onAppResize);
  }

  componentDidMount() {
    this.setState({
      mounted: true,
    });
  }

  componentWillUnmount() {
    this.setState({
      leftPanelDom: null,
      rightPanelDom: null,
      loaded: false,
      mounted: false,
      userConfig: null,
      userProjects: null, // user projects on start-up only, for updated projects, please adopt ProjectManager around your component
      properties: null,
      dirs: {},
    });

    window.removeEventListener('resize', this.onAppResize);
    window.ipc.removeAllListeners('main:receiveMain');
    window.ipc.removeAllListeners('main:core-ready');
    delete window.mixer;
    delete this.state;
  }

  handleReceive = async (evt, { key, value }) => {
    if (!key) return;
    else if (key === 'mixerReady' && value) {
      Logger.log('Mixer mounted');
      this.mixerReady = true;
      this.onMixerReady();
    }
  };

  onMixerReady = async () => {
    const { loaded, properties } = this.state;

    if (this.mixerReadyCbCalled || !loaded) return;

    this.mixerReadyCbCalled = true;
    Logger.log('Calling onMixerReady');
    Logger.log(`Setting mixer resolution with - ${properties.resolution}`);
    await API['setResolution'](this, properties.resolution);
  };

  onAppResize = debounce(async () => {
    await this.setUserConfig('window', {
      height: window.outerHeight,
      width: window.outerWidth,
    });
  }, 300);

  init = () => {
    if (this.onInit) return;
    this.onInit = true;
    const userConfig = window.ipc.sendSync('main:getUserConfig');
    const userProjectInKeys = window.ipc.sendSync('main:getUserProjects');
    const userProjects =
      Object.keys(userProjectInKeys).map((projKey) => {
        const project = userProjectInKeys[projKey];

        try {
          project.classification = JSON.parse(project.classification);
          project.region = JSON.parse(project.region);
          project.segmentation = JSON.parse(project.segmentation);
        } catch (err) {
          Logger.error(
            `Parsing project - ${project.name} task failed with error - ${err.messsage}`
          );
        }

        return { ...project };
      }) || [];
    const properties = window.ipc.sendSync('main:getAppProperties');
    const outputDir = window.ipc.sendSync('file:getDirectoryPath', 'output');

    this.setState(
      {
        properties,
        userConfig,
        userProjects,
        mixerDOM: window.mixer || null,
        dirs: {
          output: outputDir,
        },
      },
      () => {
        const { properties = {} } = this.state;
        if (properties.console) Logger.enable();
        this.appDefaults();
      }
    );
  };

  appDefaults = async () => {
    const { userConfig } = this.state;

    if (
      !userConfig.files ||
      !objectHasSameKeys(USER_CONFIG_FILES_DEFAULT, userConfig.files)
    ) {
      Logger.log('Applying userConfig:files default');
      await this.setUserConfig('files', USER_CONFIG_FILES_DEFAULT);
    }

    if (!userConfig.task) {
      Logger.log('Applying userConfig:task default');
      await this.setUserConfig('task', CLASSIFICATION_TASK);
    }

    await this.setStateAsync({ loaded: true });

    if (this.mixerReady && !this.mixerReadyCbCalled) this.onMixerReady();
  };

  leftPanelOn = (dom) => {
    if (dom)
      this.setState({
        leftPanelDom: dom,
      });
  };

  rightPanelOn = (dom) => {
    if (dom)
      this.setState({
        rightPanelDom: dom,
      });
  };

  getBothPanelDims = () => {
    const { leftPanelDom, rightPanelDom } = this.state;

    if (leftPanelDom && rightPanelDom)
      return {
        right: { width: rightPanelDom.clientWidth },
        left: { width: leftPanelDom.clientWidth },
      };

    return null;
  };

  setUserConfig = async (key = '', value, fnAPI = null, verbose = false) => {
    if (!key || typeof value === 'undefined' || !this.state.mounted) return;

    if (verbose)
      Logger.log(
        `Set user config key - ${key} and value - ${
          typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : value
        }`
      );

    await this.setStateAsync({
      userConfig: {
        ...this.state.userConfig,
        [key]: value,
      },
    });

    if (fnAPI) {
      const cb = API[fnAPI];
      if (typeof cb === 'function') {
        const respond = await cb(this);
        if (verbose)
          Logger.log(`AppManager API fn - ${fnAPI} w/ result - ${respond}`);
      }
    }

    window.ipc.send('main:saveUserConfig', this.state.userConfig);
  };

  showDirectory = (dirName = '') => {
    if (dirName) window.ipc.send('file:showDirectoryPath', dirName);
  };

  toggleRightPanel = () => {
    this.setState({
      showRightPanel: !this.state.showRightPanel,
    });
  };

  toggleLeftPanel = () => {
    this.setState({
      showLeftPanel: !this.state.showLeftPanel,
    });
  };

  getImageMaxSizeContain = (width, height) => {
    let zoom = 1;
    let availWidth = width;
    let availHeight = height;
    const maxResolution = { ...SUPPORTED_FILE_RESOLUTION_IN_KEYS['1080p'] }; // 1080p max support for now

    while (true) {
      zoom += 1;
      availHeight = height * zoom;
      availWidth = width * zoom;

      if (
        availHeight > maxResolution.height ||
        availWidth > maxResolution.width
      ) {
        zoom -= 1;
        availHeight = height * zoom;
        availWidth = width * zoom;
        break;
      }
    }

    return {
      availHeight,
      availWidth,
      canvasW: maxResolution.width,
      canvasH: maxResolution.height,
      offsetLeft: Math.floor((maxResolution.width - availWidth) / 2),
      offsetTop: Math.floor((maxResolution.height - availHeight) / 2),
    };
  };

  outputForActiveFile = async () => {
    /**
     * Always call this function after setting an active file that's subject for annotation/labelling
     */
    const { selectedProject, files } = this.state.userConfig;
    const active = cloneObject(files.active);
    const projectName = String(selectedProject.name).toLowerCase();

    if (!active) return;
    const rwresult = await window.ipc.invoke(
      'db:checkFileOutput',
      projectName,
      active
    );

    if (!rwresult.isSuccess) {
      Logger.error(
        `An error has occurred checking annotation file for - ${active.name} under project - ${projectName}`
      );
    } else await this.activeFileAnnotation();
  };

  activeFileAnnotation = async () => {
    const { userConfig } = this.state;
    const { selectedProject, files } = userConfig;

    if (files.active && selectedProject) {
      const { active } = files;

      try {
        let activeAnnotation = {};
        for (let taskidx = 0; taskidx < TASK_KEYS_IN_ARRAY.length; taskidx++) {
          const task = TASK_KEYS_IN_ARRAY[taskidx].toLowerCase();
          const projectName = selectedProject.name.toLowerCase();
          const res = await window.ipc.invoke(
            'db:getFileAnnotation',
            task,
            projectName,
            `${active.idx}`
          );

          if (res.isSuccess) {
            activeAnnotation[`${task}`] = cloneObject(res.data);
          } else throw new Error(res.error);
        }

        await this.setStateAsync({ activeAnnotation });
      } catch (err) {
        Logger.error(
          `Fetching file ${active.idx}-${active.name} annotation failed w/ error -${err.messsage}`
        );
      }
    }
  };

  setAnnotation = async (task, load) => {
    const { userConfig } = this.state;
    const selectedProject = cloneObject(userConfig.selectedProject);

    if (!selectedProject || !task || !load) return;
    task = task.toLowerCase();

    if (CLASSIFICATION_TASK.key === task) {
      // write on the file
      const activeAnnotation = cloneObject(this.state.activeAnnotation);
      const { cclass, idx } = load;
      const projectName = selectedProject.name.toLowerCase();
      let annotation = activeAnnotation[`${task}`];

      if (annotation.assigned.length <= 0) annotation.assigned = [cclass];
      else if (annotation.assigned.includes(cclass)) {
        annotation.assigned.splice(annotation.assigned.indexOf(cclass), 1);
      } else annotation.assigned.push(cclass);

      await window.ipc.invoke('db:setFileAnnotation', {
        task,
        projectName,
        idxFile: idx,
        annotation,
      });

      await this.setStateAsync({
        activeAnnotation,
      });
    }
  };

  render() {
    const { loaded, mounted } = this.state;

    return (
      <Fragment>
        <Provider
          value={{
            ...this.state,
            leftPanelOn: this.leftPanelOn,
            rightPanelOn: this.rightPanelOn,
            getBothPanelDims: this.getBothPanelDims,
            setUserConfig: this.setUserConfig,
            showDirectory: this.showDirectory,
            toggleRightPanel: this.toggleRightPanel,
            toggleLeftPanel: this.toggleLeftPanel,
            activeFileAnnotation: this.activeFileAnnotation,
            setAnnotation: this.setAnnotation,
          }}
        >
          {loaded && mounted && this.props.children}
        </Provider>
        {(!loaded && <LoadingScreen />) || null}
      </Fragment>
    );
  }
}
