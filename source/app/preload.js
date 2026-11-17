'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
// The arcade page checks for window.clubhouseApp to show its "Launcher" button.
contextBridge.exposeInMainWorld('clubhouseApp', {
  home: () => call('home'),
  state: () => call('state'),
  save: c => call('save', c),
  browse: what => call('browse', what),
  findGSPro: () => call('find-gspro'),
  findArcade: () => call('find-arcade'),
  playArcade: o => call('play-arcade', o),
  playGSPro: () => call('play-gspro'),
  toggleFull: () => call('toggle-full'),
  openLog: () => call('open-log'),
  quit: () => call('quit')
});
