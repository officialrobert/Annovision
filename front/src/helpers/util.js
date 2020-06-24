export function debounce(fn, t = 150) {
  let interval;
  return (...args) => {
    clearTimeout(interval);

    interval = setTimeout(() => {
      if (typeof fn === 'function') fn(...args);
    }, t);
  };
}

export function sleepAsync(t = 100) {
  return new Promise((resolve) => {
    let sleepTimeout = setTimeout(() => {
      clearTimeout(sleepTimeout);
      sleepTimeout = undefined;
      resolve();
    }, t);
  });
}

export function cloneObject(ob) {
  return JSON.parse(JSON.stringify(ob));
}

export function isAlphaNumeric(str = '') {
  const re = /^[a-z0-9]+$/i;

  if (typeof str !== 'string' || String(str).length <= 0 || !re.test(str))
    return false;

  return true;
}

export function objectHasSameKeys(obj1, obj2) {
  /**
   * Checks if obj2 has missing keys in obj1,
   * returns false if there are missing key(s), true otherwise
   */
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  let isPassed = true;

  for (let index = 0; index < keys1.length; index++) {
    const ckey1 = keys1[index];

    if (!keys2.includes(ckey1)) {
      isPassed = false;
      break;
    }
  }

  return isPassed;
}
