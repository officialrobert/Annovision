export const DEFAULT_LOCALE = 'en';

export const IMAGE_FILE_EXT_SUPPORTED = ['png', 'jpg', 'gif'];

export const IMAGE_FILE_TYPE = { key: 'image' };

export const REGION_BASED_TASK = {
  key: 'region',
  i18n: 'region_based_title',
};

export const CLASSIFICATION_TASK = {
  key: 'classification',
  i18n: 'classification_title',
};

export const SEGMENTATION_TASK = {
  key: 'segmentation',
  i18n: 'semantic_segmentation_title',
};

export const TASK_TYPES = {
  classification: { i18n: 'classification_title', key: 'classification' },
  region: { i18n: 'region_based_title', key: 'region' },
  segmentation: {
    i18n: 'semantic_segmentation_title',
    key: 'segmentation',
  },
};

export const TASK_KEYS_IN_ARRAY = ['classification', 'region', 'segmentation'];

export const NO_LIMIT_FILES_BATCH = 'Unlimited';

export const DEFAULT_PROJECT_DATA = {
  name: 'Default',
  key: `Default-${new Date().getTime().toString()}`,
  file: IMAGE_FILE_TYPE.key,
  permanent: true,
  numFiles: 0,
  classification: { classes: [] },
  // labels-colors index must match
  region: { labels: [], colors: [] },
  segmentation: { labels: [], colors: [] },
};

export const SUPPORTED_FILE_RESOLUTION = [
  { height: 720, width: 1280, key: '720p' },
  { height: 1080, width: 1920, key: '1080p' },
];

export const SUPPORTED_FILE_RESOLUTION_IN_KEYS = {
  '720p': { height: 720, width: 1280 },
  '1080p': { height: 1080, width: 1920 },
};

export const USER_CONFIG_FILES_DEFAULT = {
  filesPerPage: 50,
  currentPage: 1,
  active: null,
};
