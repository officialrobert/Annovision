const path = require('path');
const { modifyVersion } = require(path.resolve(
  __dirname,
  '../../scripts/util'
));
const appJSON = require('../package.json');

modifyVersion({
  // Change object data below if field needed to be updated
  APP_VERSION: { major: '1', minor: '0' },
  dataJSON: appJSON,
  path: path.resolve(__dirname, '../package.json'),
  name: 'core-electron',
});
