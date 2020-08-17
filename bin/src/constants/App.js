const WINDOWS_PYTHON_NAME = 'pycorewin';
const PY_SCRIPTS_NAME = 'pysc';
const STARTUP_HTML_NAME = 'startup.html';
const LOAD_SPLASH_HTML_NAME = 'load.html';
const OS_NAMES = ['windows', 'linux', 'darwin', 'ios'];
const STORAGE_FILE_NAME = 'user-pref.json';
const IMAGE_FILE_EXT_SUPPORTED = ['png', 'jpg', 'gif'];
const OUTPUT_DIR_NAME = 'Annovision-Output';
const DEFAULT_RESOLUTION = ['1280,720,16:9'];
const TASK_TYPES = {
  region: { key: 'region' },
  segmentation: {
    key: 'segmentation',
  },
  classification: { key: 'classification' },
};
const TASK_TYPES_IN_ARR = ['region', 'segmentation', 'classification'];
const CLASSIFICATION_TASK = { key: 'classification' };
const SEGMENTATION_TASK = {
  key: 'segmentation',
};
const REGION_TASK = {
  key: 'region',
};

module.exports = {
  WINDOWS_PYTHON_NAME,
  PY_SCRIPTS_NAME,
  STARTUP_HTML_NAME,
  LOAD_SPLASH_HTML_NAME,
  OS_NAMES,
  STORAGE_FILE_NAME,
  IMAGE_FILE_EXT_SUPPORTED,
  OUTPUT_DIR_NAME,
  DEFAULT_RESOLUTION,
  TASK_TYPES,
  CLASSIFICATION_TASK,
  SEGMENTATION_TASK,
  REGION_TASK,
  TASK_TYPES_IN_ARR,
};
