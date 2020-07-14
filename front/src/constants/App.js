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
  // attributes-colors-types index must match
  region: { colors: [], attributes: [], types: [] },
  segmentation: { labels: [], colors: [] },
  dataIdx: 0,
};

export const SUPPORTED_FILE_RESOLUTION_IN_KEYS = {
  '720p': { height: 720, width: 1280 },
  '1080p': { height: 1080, width: 1920 },
};

export const USER_CONFIG_FILES_DEFAULT = {
  filesPerPage: 50,
  currentPage: 1,
  active: null,
};

export const REGION_BOUNDINGBOX_NAME = 'region-bounding-box';

export const REGION_POLYGON_NAME = 'region-polygon';

export const POINTS_BLOCK_RADIUS = 10;

export const DEFAULT_RGB_SEGMENTATION = '235, 64, 52';

export const AVAIL_COLORS_SEGMENTATION = [
  '235, 64, 52',
  '242, 108, 5',
  '232, 190, 23',
  '164, 227, 16',
  '0, 176, 15',
  '47, 235, 222',
  '0, 2, 143',
  '119, 2, 222',
];

export const DEFAULT_REGION_INSPECT = { active: 0 };

export const DEFAULT_SEGMENTATION_INSPECT = { active: 0 };

export const ZOOM_RANGE = { max: 3, min: 1 };
