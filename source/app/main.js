'use strict';
/*
  Clubhouse — launcher for the golf simulator.
  Shows two tiles: Clubhouse Arcade (runs inside this window, with its shot relay)
  and GSPro (started from its own install). Settings say which programs to start
  or close alongside each one, so NeoTrack, Rela and GSPro never fight over the
  cameras or port 921.
*/
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path'), fs = require('fs'), cp = require('child_process'), http = require('http');

const WIN = process.platform === 'win32';
const ARCADE_DIR = path.join(__dirname, 'arcade');
const ICON = path.join(__dirname, 'build', WIN ? 'icon.ico' : 'icon.png');

app.commandLine.appendSwitch('ignore-gpu-blocklist');          // sim PCs often have GPUs Chromium is shy about
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); }

/* ---------------- settings ---------------- */
const CFG_FILE = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = {
  gspro: { path: '', start: [], close: [] },   // start: full paths; close: program names like rela.exe
  arcade: { start: [], close: [] },
  afterGSPro: 'minimize',                      // minimize | quit | stay
  fullscreen: true,
  last: 'arcade'
};
let cfg = loadCfg();
function loadCfg() {
  let c = {}; try { c = JSON.parse(fs.readFileSync(CFG_FILE(), 'utf8')); } catch (e) { }
  const m = JSON.parse(JSON.stringify(DEFAULTS));
  for (const k of Object.keys(m)) if (c[k] !== undefined) m[k] = (typeof m[k] === 'object' && !Array.isArray(m[k])) ? Object.assign(m[k], c[k]) : c[k];
  return m;
}
function saveCfg() { try { fs.mkdirSync(path.dirname(CFG_FILE()), { recursive: true }); fs.writeFileSync(CFG_FILE(), JSON.stringify(cfg, null, 1)); } catch (e) { log('could not save settings: ' + e.message); } }

const LOG_FILE = () => path.join(app.getPath('userData'), 'log.txt');
function log(s) { const line = new Date().toLocaleTimeString() + ' ' + s; try { fs.appendFileSync(LOG_FILE(), line + '\n'); } catch (e) { } if (!app.isPackaged) console.log(line); }

/* ---------------- finding GSPro ---------------- */
function gsproCandidates() {
  if (!WIN) return [];
  const list = [];
  for (const d of ['C', 'D', 'E', 'F']) for (const p of ['GSProV1\\GSPLauncher.exe', 'GSProV1\\Core\\GSP\\GSPro.exe', 'GSPro\\GSPLauncher.exe', 'Program Files\\GSPro\\GSPLauncher.exe']) list.push(d + ':\\' + p);
  // shortcuts on the desktop and in the Start menu
  const dirs = [app.getPath('desktop'), path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Desktop'),
    path.join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs'), path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs')];
  for (const d of dirs) {
    let names = []; try { names = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { continue; }
    for (const n of names) {
      const full = path.join(d, n.name);
      const look = f => { if (/gspro/i.test(path.basename(f)) && /\.lnk$/i.test(f)) { try { const t = shell.readShortcutLink(f).target; if (t) list.push(t); } catch (e) { } } };
      if (n.isFile()) look(full);
      else if (n.isDirectory() && /gspro/i.test(n.name)) { try { for (const m of fs.readdirSync(full)) look(path.join(full, m)); } catch (e) { } }
    }
  }
  return list;
}
function findGSPro() { for (const p of gsproCandidates()) { try { if (fs.statSync(p).isFile()) return p; } catch (e) { } } return ''; }
const exists = p => { try { return !!p && fs.statSync(p).isFile(); } catch (e) { return false; } };

/* ---------------- running programs ---------------- */
function running() {
  return new Promise(res => {
    const done = (err, out) => res(new Set(err ? [] : String(out).split(/\r?\n/).map(l => (WIN ? (l.split('","')[0] || '').replace(/^"/, '') : path.basename(l.trim())).toLowerCase()).filter(Boolean)));
    if (WIN) cp.execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, timeout: 8000 }, done);
    else cp.execFile('ps', ['-A', '-o', 'comm='], { timeout: 8000 }, done);
  });
}
const exeName = p => path.basename(String(p)).toLowerCase();
const GSPRO_NAMES = ['gspro.exe', 'gsplauncher.exe'];
function gsproRunning(set) { return GSPRO_NAMES.some(n => set.has(n)) || (cfg.gspro.path && set.has(exeName(cfg.gspro.path))); }

async function closePrograms(names) {
  names = names.map(exeName).filter(Boolean); if (!names.length) return [];
  const now = await running(), todo = names.filter(n => now.has(n)); if (!todo.length) return [];
  log('closing ' + todo.join(', '));
  const kill = force => Promise.all(todo.map(n => new Promise(r => {
    if (WIN) cp.execFile('taskkill', (force ? ['/F'] : []).concat(['/IM', n, '/T']), { windowsHide: true, timeout: 8000 }, () => r());
    else cp.execFile('pkill', [force ? '-9' : '-15', '-i', '-x', n], () => r());
  })));
  await kill(false);
  for (let i = 0; i < 16; i++) { await wait(400); const s = await running(); if (!todo.some(n => s.has(n))) return todo; }
  await kill(true); await wait(800); return todo;
}

function startProgram(p) {
  if (!exists(p)) { log('not found: ' + p); return false; }
  try { const c = cp.spawn(p, [], { cwd: path.dirname(p), detached: true, stdio: 'ignore', windowsHide: false }); c.on('error', e => log('could not start ' + p + ': ' + e.message)); c.unref(); log('started ' + p); return true; }
  catch (e) { log('could not start ' + p + ': ' + e.message); return false; }
}
async function startPrograms(list) {
  const now = await running(), started = [], skipped = [];
  for (const p of list) { if (now.has(exeName(p))) { skipped.push(path.basename(p)); continue; } if (startProgram(p)) started.push(path.basename(p)); }
  return { started, skipped };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- the arcade's relay ---------------- */
let relay = null, relayUrl = '', relayOut = '';
function getJSON(port, p, method = 'GET') {
  return new Promise(res => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, timeout: 700 }, s => { let b = ''; s.on('data', c => b += c); s.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } }); });
    r.on('error', () => res(null)); r.on('timeout', () => { r.destroy(); res(null); }); r.end();
  });
}
// an old ClubhouseArcade.exe left running would hold ports 921 and 9210, so ask it to quit
async function stopStrayRelays() {
  for (let p = 8080; p < 8090; p++) {
    if (relay && relayUrl.endsWith(':' + p)) continue;
    const i = await getJSON(p, '/api/info'); if (i && i.app === 'clubhouse-arcade') { log('asking the arcade on port ' + p + ' to quit'); await getJSON(p, '/api/quit', 'POST'); await wait(600); }
  }
}
function startRelay() {
  if (relay && relayUrl) return Promise.resolve(relayUrl);
  return new Promise((resolve, reject) => {
    relayOut = ''; relayUrl = '';
    const env = Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1', ARCADE_DATA: path.join(app.getPath('userData'), 'arcade') });
    relay = cp.spawn(process.execPath, [path.join(ARCADE_DIR, 'arcade-relay.js'), '--no-open', '--http', '8080'], { env, cwd: ARCADE_DIR, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const me = relay; let settled = false;
    const t = setTimeout(() => { if (!settled) { settled = true; reject(new Error('The arcade did not start in time.\n' + relayOut.slice(-600))); } }, 15000);
    const onData = d => {
      const s = d.toString(); relayOut = (relayOut + s).slice(-20000);
      s.split(/\r?\n/).filter(x => x.trim()).forEach(x => log('[arcade] ' + x.trim()));
      const m = /running at (http:\/\/localhost:\d+)/.exec(relayOut);
      if (m && !settled) { settled = true; clearTimeout(t); relayUrl = m[1]; resolve(relayUrl); }
    };
    relay.stdout.on('data', onData); relay.stderr.on('data', onData);
    relay.on('exit', code => { log('arcade relay stopped (' + code + ')'); if (relay === me) { relay = null; relayUrl = ''; } if (!settled) { settled = true; clearTimeout(t); reject(new Error('The arcade stopped while starting.\n' + relayOut.slice(-600))); } });
  });
}
function stopRelay() {
  if (!relay) return Promise.resolve();
  const r = relay; relay = null; relayUrl = '';
  return new Promise(res => { const t = setTimeout(() => { try { r.kill('SIGKILL'); } catch (e) { } res(); }, 2500); r.once('exit', () => { clearTimeout(t); res(); }); try { r.kill(); } catch (e) { clearTimeout(t); res(); } });
}

/* ---------------- window ---------------- */
let win = null, screen = 'launcher';
function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#070b14', title: 'Clubhouse',
    fullscreen: !!cfg.fullscreen, autoHideMenuBar: true, icon: exists(ICON) ? ICON : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  // links in the arcade (Help, Suggestions) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { const u = new URL(url); if (u.protocol !== 'file:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    if (i.key === 'F12' && i.control && i.shift) win.webContents.toggleDevTools();
  });
  win.webContents.on('render-process-gone', (e, d) => log('page stopped: ' + d.reason));
  win.on('closed', () => { win = null; });
  showLauncher();
}
function showLauncher() { screen = 'launcher'; if (win) win.loadFile(path.join(__dirname, 'launcher', 'index.html')); }

/* ---------------- what the launcher asks for ---------------- */
async function state() {
  const set = await running();
  const gp = cfg.gspro.path;
  return {
    version: app.getVersion(), platform: process.platform, cfg,
    gspro: { path: gp, found: exists(gp), running: gsproRunning(set) },
    arcade: { version: arcadeVersion(), running: !!relay },
    names: [...set].filter(n => [...GSPRO_NAMES, ...cfg.gspro.start.map(exeName), ...cfg.arcade.start.map(exeName), ...cfg.gspro.close, ...cfg.arcade.close].map(exeName).includes(n)),
    fullscreen: win ? win.isFullScreen() : cfg.fullscreen
  };
}
function arcadeVersion() { try { return (/<meta name="arcade-version" content="([\d.]+)"/.exec(fs.readFileSync(path.join(ARCADE_DIR, 'index.html'), 'utf8').slice(0, 4000)) || [])[1] || ''; } catch (e) { return ''; } }

ipcMain.handle('state', () => state());
ipcMain.handle('save', (e, c) => {
  const clean = l => Array.isArray(l) ? l.map(String).filter(Boolean).slice(0, 12) : [];
  cfg.gspro = { path: String(c.gspro.path || ''), start: clean(c.gspro.start), close: clean(c.gspro.close).map(exeName) };
  cfg.arcade = { start: clean(c.arcade.start), close: clean(c.arcade.close).map(exeName) };
  cfg.afterGSPro = ['minimize', 'quit', 'stay'].includes(c.afterGSPro) ? c.afterGSPro : 'minimize';
  cfg.fullscreen = !!c.fullscreen; if (win && win.isFullScreen() !== cfg.fullscreen) win.setFullScreen(cfg.fullscreen);
  saveCfg(); return state();
});
ipcMain.handle('browse', async (e, what) => {
  const r = await dialog.showOpenDialog(win, {
    title: what === 'gspro' ? 'Choose GSPro (GSPLauncher.exe or GSPro.exe)' : 'Choose a program',
    defaultPath: what === 'gspro' && WIN ? 'C:\\GSProV1' : undefined,
    filters: WIN ? [{ name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk'] }] : [], properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return '';
  let p = r.filePaths[0];
  if (WIN && /\.lnk$/i.test(p)) { try { p = shell.readShortcutLink(p).target || p; } catch (x) { } }
  return p;
});
ipcMain.handle('find-gspro', () => findGSPro());
ipcMain.handle('open-log', () => shell.openPath(LOG_FILE()));

ipcMain.handle('play-arcade', async (e, opts = {}) => {
  const steps = [];
  const set = await running();
  if (gsproRunning(set) && !opts.ignoreGSPro) return { ask: 'gspro' };
  if (opts.closeGSPro) { const c = await closePrograms([...GSPRO_NAMES, cfg.gspro.path].filter(Boolean)); if (c.length) steps.push('Closed GSPro'); }
  const closed = await closePrograms(cfg.arcade.close); if (closed.length) steps.push('Closed ' + closed.join(', '));
  await stopStrayRelays();
  let url; try { url = await startRelay(); } catch (x) { log(x.message); return { error: x.message }; }
  const s = await startPrograms(cfg.arcade.start); if (s.started.length) steps.push('Started ' + s.started.join(', '));
  cfg.last = 'arcade'; saveCfg(); screen = 'arcade';
  setTimeout(() => { if (win && screen === 'arcade') win.loadURL(url + '/?app=1'); }, 350);
  return { ok: true, steps };
});
ipcMain.handle('play-gspro', async () => {
  if (!exists(cfg.gspro.path)) { const f = findGSPro(); if (f) { cfg.gspro.path = f; saveCfg(); } else return { setup: true }; }
  const steps = [];
  await stopRelay(); await stopStrayRelays();
  const closed = await closePrograms(cfg.gspro.close); if (closed.length) steps.push('Closed ' + closed.join(', '));
  const now = await running();
  if (!gsproRunning(now)) { if (!startProgram(cfg.gspro.path)) return { error: 'GSPro could not be started from ' + cfg.gspro.path }; steps.push('Started GSPro'); }
  else steps.push('GSPro was already open');
  const s = await startPrograms(cfg.gspro.start); if (s.started.length) steps.push('Started ' + s.started.join(', '));
  cfg.last = 'gspro'; saveCfg();
  setTimeout(() => { if (!win) return; if (cfg.afterGSPro === 'quit') app.quit(); else if (cfg.afterGSPro === 'minimize') win.minimize(); }, 2500);
  return { ok: true, steps };
});
ipcMain.handle('home', async () => { await stopRelay(); if (win) { if (cfg.fullscreen && !win.isFullScreen()) win.setFullScreen(true); showLauncher(); } return true; });
ipcMain.handle('quit', () => app.quit());
ipcMain.handle('toggle-full', () => { if (win) win.setFullScreen(!win.isFullScreen()); return win && win.isFullScreen(); });

/* ---------------- app life ---------------- */
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(() => {
  try { fs.writeFileSync(LOG_FILE(), ''); } catch (e) { }
  log('Clubhouse ' + app.getVersion() + ' starting');
  if (!cfg.gspro.path) { const f = findGSPro(); if (f) { cfg.gspro.path = f; saveCfg(); log('found GSPro at ' + f); } }
  createWindow();
});
app.on('window-all-closed', () => app.quit());
let quitting = false;
app.on('before-quit', e => { if (relay && !quitting) { quitting = true; e.preventDefault(); stopRelay().then(() => app.quit()); } });
