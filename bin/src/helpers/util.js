export function debounce(fn, t = 150) {
  let interval;

  return (...args) => {
    clearTimeout(interval);
    interval = setTimeout(() => {
      fn(...args);
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

export function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}
