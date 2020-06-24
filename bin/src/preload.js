const electron = require('electron');
const shared = electron.remote.getGlobal('shared');
const app = electron.app;
const fs = require('fs');

window.ipc = electron.ipcRenderer;
window.electron = electron.remote;
class Preload {
  constructor() {
    this.begin();
  }

  begin = () => {
    Object.keys(shared).forEach((sh) => {
      window[String(sh)] = shared[sh];
    });
  };
}

new Preload();
window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('contextmenu', (evt) => {
    if (!evt) return;
    evt.preventDefault();
  });
});
