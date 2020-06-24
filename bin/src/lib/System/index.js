const child_process = require('child_process');
const { spawn } = child_process;
const Logger = require('../Logger').default;

class System {
  verbose = false;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  setVerbose = (flag) => {
    this.verbose = flag;
  };

  doSpawn = (exec, args = []) => {
    return new Promise(async (resolve, reject) => {
      if (this.verbose) Logger.info(`System lib spawn: ${exec} ${args}`);

      if (!Array.isArray(args)) {
        Logger.error(`System lib spawn: args param should be an array`);
        return null;
      }

      try {
        let outData = '';
        let hasError = false;

        const res = spawn(exec, args, {
          detached: true,
          stdio: 'pipe',
        });

        res.unref();

        res.stdout.on('data', (data) => {
          if (this.verbose) outData += data.toString();
          else outData = data.toString();
        });

        res.stderr.on('data', (data) => {
          hasError = true;
          if (this.verbose) outData += data.toString();
          else outData = data.toString();
        });

        res.on('exit', async (code) => {
          if (this.verbose)
            Logger.info(
              `System lib closing spawn: ${exec} with exit code => ${code}`
            );

          try {
            if (this.verbose) console.log(outData);
            const dataJSON = JSON.parse(
              String(outData).replace(/(\r\n|\n|\r)/g, '')
            );

            if (hasError || dataJSON.err === 'true')
              resolve({
                err: true,
                data:
                  dataJSON.data === 'true'
                    ? true
                    : dataJSON.data === 'false'
                    ? false
                    : dataJSON.data,
              });
            else
              resolve({
                err: false,
                data:
                  dataJSON.data === 'true'
                    ? true
                    : dataJSON.data === 'false'
                    ? false
                    : dataJSON.data,
              });
          } catch (err) {
            Logger.error(`System Class: ${err.message}`);
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  showFolder = (folder, platform) => {
    return new Promise((resolve, reject) => {
      const availOS = { windows: 'explorer' }; // We only support windows for now

      try {
        if (!availOS[String(platform).toLowerCase()]) {
          throw new Error('Invalid platform');
        }

        let hasError = false;
        const res = spawn(availOS[String(platform).toLowerCase()], [folder], {
          detached: true,
          stdio: 'pipe',
        });

        res.unref();

        res.stderr.on('data', (data) => {
          hasError = true;
        });

        res.on('exit', async (code) => {
          if (hasError) reject({ err: true, data: null });
          else resolve({ err: false, data: code });
        });
      } catch (err) {
        Logger.error(
          `Opening folder for - ${folder} failed with - ${err.message}`
        );
        reject({ err: true, data: null });
      }
    });
  };
}

export default new System();
