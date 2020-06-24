const fs = require('fs-extra');

function modifyVersion({
  APP_VERSION = {},
  name = '',
  path = null,
  dataJSON = {},
}) {
  /**
   * @param
   * APP_VERSION <object> <required> : { minor <string> <required> , major <string> <required>}
   * name <string> <optional> : "Front-end" || "Core-electron"
   * path <string> <required> : <resolved-path-for-json>
   * dataJSON <object> <required> : <current-json-data-containing-version-field>
   *
   * Version format - MAJOR.MINOR.YYMM.DDRR
   */

  const today = new Date();
  const { major, minor } = APP_VERSION;

  console.log(`Updating ${name}'s version..`);
  if (!APP_VERSION) {
    console.log(
      `App version object was not provided, failed at modifying version for => ${name}`
    );
    console.log(`Terminating helper function`);
    return;
  } else if (!dataJSON) {
    console.log(
      `${String(
        name
      ).toUpperCase()}'s data object required is missing, failed at modifying version`
    );
    console.log('Terminating helper function');
    return;
  }

  const YY = String(today.getFullYear()).substring(
    String(today.getFullYear()).length - 2,
    String(today.getFullYear()).length
  );
  const DD = today.getDate().toString();
  let MM = String(Number(today.getMonth()) + 1);
  let RR = String(dataJSON.version).substring(
    String(dataJSON.version).length - 2,
    String(dataJSON.version).length
  );

  RR = String(Number(RR) + 1);
  if (MM.length <= 1) MM = '0' + MM;
  if (RR.length <= 1) RR = '0' + RR;
  const newV = `${major}.${minor}.${YY}${MM}.${DD}${RR}`;
  dataJSON.version = newV;

  console.log(`${String(name).toUpperCase()} app's current version - ${newV}`);

  if (fs.exists(path))
    fs.writeFileSync(path, JSON.stringify(dataJSON, null, 4));
  else
    console.log(
      `Path => ${path} in modifying version for ${name} does not exist`
    );

  console.log('Terminating helper function');
}

module.exports = { modifyVersion };
