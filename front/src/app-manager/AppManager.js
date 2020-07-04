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
  REGION_BASED_TASK,
  REGION_BOUNDINGBOX_NAME,
  DEFAULT_REGION_INSPECT,
  DEFAULT_SEGMENTATION_INSPECT,
} from 'src/constants/App';
import API from './API';
import { REGION_POLYGON_NAME } from '../constants/App';

export default class AppManager extends Component {
  onInit = false;
  mixerReady = false;
  mixerReadyCbCalled = false;
  storingRegionBased = false;

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

    /**
     * Considered global states below.
     * Can be modified via `setGlobalState` function
     */
    activeAnnotation: null,
    inspect: {
      region: { ...DEFAULT_REGION_INSPECT },
      segmentation: { ...DEFAULT_SEGMENTATION_INSPECT },
      isOn: false,
    },
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

  onMixerReady = () => {
    const { loaded, properties } = this.state;

    if (this.mixerReadyCbCalled || !loaded) return;

    this.mixerReadyCbCalled = true;
    Logger.log('Calling onMixerReady');
    Logger.log(`Setting mixer resolution with - ${properties.resolution}`);
    API['setResolution'](this, properties.resolution);
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
      await this.setUserConfig('files', { ...USER_CONFIG_FILES_DEFAULT });
    }

    if (!userConfig.task) {
      Logger.log('Applying userConfig:task default');
      await this.setUserConfig('task', { ...CLASSIFICATION_TASK });
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
        [`${key}`]: value,
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

        await this.setGlobalState(
          'activeAnnotation',
          activeAnnotation,
          'paintFileAnnotations'
        );
      } catch (err) {
        Logger.error(
          `Fetching file ${active.idx}-${active.name} annotation failed w/ error -${err.messsage}`
        );
      }
    }
  };

  setAnnotation = async (task, load) => {
    const { userConfig, activeAnnotation } = this.state;
    const selectedProject = cloneObject(userConfig.selectedProject);

    if (!selectedProject || !task || !load) return;
    task = task.toLowerCase();
    const projectName = selectedProject.name.toLowerCase();
    let annotation = activeAnnotation[`${task}`];

    if (task === CLASSIFICATION_TASK.key) {
      // write on the file
      const { cclass } = cloneObject(load);
      if (annotation.assigned.length <= 0) annotation.assigned = [cclass];
      else if (annotation.assigned.includes(cclass)) {
        annotation.assigned.splice(annotation.assigned.indexOf(cclass), 1);
      } else annotation.assigned.push(cclass);
    } else if (task === REGION_BASED_TASK.key) {
      const { type = null, shape_attr, region_attr, annoidx } = cloneObject(
        load
      );

      if (!type) return;
      else if (type === 'insert') {
        annotation.regions.push({
          shape_attr,
          region_attr,
        });
      } else if (type === 'update') {
        annotation.regions[annoidx].region_attr = region_attr;
      } else if (type === 'remove') {
        annotation.regions.splice(annoidx, 1);
      } else return;
    }

    await window.ipc.invoke('db:setFileAnnotation', {
      task,
      projectName,
      idxFile: load.idx,
      annotation,
    });

    await this.setStateAsync({
      activeAnnotation,
    });
  };

  beginPaint = (pStart) => {
    const { userConfig } = this.state;
    const task = cloneObject(userConfig.task);

    if (!task) return;
    else if (REGION_BASED_TASK.key === task.key) {
      API['beginPaint'](this, pStart, task);
    }
  };

  storeAnnoRegionBased = async (points) => {
    const { userConfig } = this.state;
    const { task, files } = userConfig;
    const { active } = files;
    const { offsetLeft, offsetTop, availHeight, availWidth } = active.fit;

    if (!points.cont.length || this.storingRegionBased) return;

    this.storingRegionBased = true;

    if (task.opt === REGION_BOUNDINGBOX_NAME) {
      const { height, width, pX, pY } = points.cont[0];
      let { sX, sY } = points.start[0];
      const shape_attr = {
        height: height * (active.height / availHeight),
        width: width * (active.width / availWidth),
      };
      sX = sX > pX ? pX : sX;
      sY = sY > pY ? pY : sY;

      shape_attr.topLeftX = (sX - offsetLeft) * (active.width / availWidth);
      shape_attr.topLeftY = (sY - offsetTop) * (active.height / availHeight);

      await this.setAnnotation(task.key, {
        shape_attr,
        idx: active.idx,
        type: 'insert',
        region_attr: { name: REGION_BOUNDINGBOX_NAME },
      });
      // redraw
    } else if (task.opt === REGION_POLYGON_NAME) {
      const shape_attr = {
        vertices: [],
      };

      for (let index = 0; index < points.start.length; index++) {
        const cpoint = points.start[index];
        let { sX, sY } = cpoint;

        /**
         * Translate points
         */
        sX = (sX - offsetLeft) * (active.width / availWidth);
        sY = (sY - offsetTop) * (active.height / availHeight);
        shape_attr.vertices.push([sX, sY]); // x,y points
      }

      await this.setAnnotation(task.key, {
        shape_attr,
        idx: active.idx,
        type: 'insert',
        region_attr: { name: REGION_POLYGON_NAME },
      });
    }

    this.repaintMixer();
    this.storingRegionBased = false;
  };

  contPaint = (pCont) => {
    const { userConfig } = this.state;
    const task = cloneObject(userConfig.task);

    if (!task) return;
    else if (REGION_BASED_TASK.key === task.key) {
      API['continuePaint'](this, pCont, task);
    }
  };

  repaintMixer = (type = 'all') => {
    if (type === 'all') API['paintFileAnnotations'](this);
    else if (type === 'image-only') API['paintImageOnly'](this);
    else return;
  };

  setGlobalState = async (key, value, fn = null, verbose = false) => {
    if (!key || typeof value === 'undefined') return;

    await this.setStateAsync({
      [`${key}`]: value,
    });

    if (verbose)
      Logger.log(
        `Set global state - ${key} with value - ${
          typeof value === 'object' ? JSON.stringify(value) : value
        }`
      );

    if (fn) {
      const cb = API[`${fn}`];

      if (typeof cb === 'function') {
        await cb(this);
      }
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
            beginPaint: this.beginPaint,
            contPaint: this.contPaint,
            storeAnnoRegionBased: this.storeAnnoRegionBased,
            repaintMixer: this.repaintMixer,
            setGlobalState: this.setGlobalState,
          }}
        >
          {loaded && mounted && this.props.children}
        </Provider>
        {(!loaded && <LoadingScreen />) || null}
      </Fragment>
    );
  }
}
