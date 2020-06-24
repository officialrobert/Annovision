const path = require('path');
const { WINDOWS_PYTHON_NAME, PY_SCRIPTS_NAME } = require('../constants/App');
const System = require('./System').default;
const Logger = require('./Logger').default;

const AVAILABLE_SCRIPTS = {
  test: { pytask: 'test' },
  helpers: { pytask: 'helpers' },
  database: { pytask: 'database', mainDB: path.join(__dirname, 'db') },
  image: { pytask: 'image' },
};

class PyCaller {
  /**
   * Stores the path for the embedded executable python
   * @private variable
   */
  pyPath = path.resolve(__dirname, `../${WINDOWS_PYTHON_NAME}/python.exe`);

  /**
   * Stores the path where the python scripts are placed in app
   * @private variable
   */
  scriptPath = path.resolve(__dirname, `../${PY_SCRIPTS_NAME}`);

  call = async (namespace, data = {}, verbose = false) => {
    const str = String(namespace).replace('send:', '');

    if (System) {
      try {
        if (!AVAILABLE_SCRIPTS[str])
          throw new Error(
            `PyCaller call: ${str} namespace does not exist in available scripts`
          );

        if (verbose) Logger.info(`PyCaller call: ${str} namespace called`);
        const res = await System.doSpawn(this.pyPath, [
          '-u',
          `${path.resolve(__dirname, this.scriptPath + '/main.py')}`,
          `--params ${JSON.stringify({ ...data, ...AVAILABLE_SCRIPTS[str] })}`,
        ]);

        if (verbose)
          Logger.info(
            `PyCaller call: ${str} w/ result: ${JSON.stringify(res)}`
          );

        if (res.err)
          throw new Error(`Unexpected error on pycorewin => ${res.data}`);
        else return res;
      } catch (err) {
        Logger.error(err.message);
      }
    } else Logger.error('PyCaller: System object does not exist!');

    return { err: true };
  };
}

export default new PyCaller();
