'use strict';
/*
  Clubhouse — launcher for the golf simulator.
  Shows two tiles: Clubhouse Arcade and GSPro. Both are separate programs with
  their own updates: the launcher starts ClubhouseArcade.exe hidden and shows the
  arcade inside this window, and starts GSPro from its own install. Settings say which programs to start
  or close alongside each one, so NeoTrack, Rela and GSPro never fight over the
  cameras or port 921.
*/
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen: Displays } = require('electron');
const path = require('path'), fs = require('fs'), cp = require('child_process'), http = require('http');

const WIN = process.platform === 'win32';
const ICON = path.join(__dirname, 'build', WIN ? 'icon.ico' : 'icon.png');

app.commandLine.appendSwitch('ignore-gpu-blocklist');          // sim PCs often have GPUs Chromium is shy about
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) { app.quit(); }

/* ---------------- settings ---------------- */
const CFG_FILE = () => path.join(app.getPath('userData'), 'config.json');
const DEFAULTS = {
  gspro: { path: '', start: [], close: [] },   // start: full paths; close: program names like rela.exe
  arcade: { path: '', start: [], close: [], version: '' },   // path: ClubhouseArcade.exe
  afterGSPro: 'minimize',                      // minimize | quit | stay
  fullscreen: true,                            // old setting, used once to fill in screens
  screens: null,                               // { launcher: {display, label, full, bounds}, arcade: {...} }
  last: 'arcade'
};
let cfg = loadCfg();
function loadCfg() {
  let c = {}; try { c = JSON.parse(fs.readFileSync(CFG_FILE(), 'utf8')); } catch (e) { }
  const m = JSON.parse(JSON.stringify(DEFAULTS));
  for (const k of Object.keys(m)) if (c[k] !== undefined) m[k] = (m[k] && typeof m[k] === 'object' && !Array.isArray(m[k])) ? Object.assign(m[k], c[k]) : c[k];
  return m;
}
function fixScreens() {
  if (!cfg.screens || typeof cfg.screens !== 'object') cfg.screens = {};
  for (const k of ['launcher', 'arcade']) { const v = cfg.screens[k] || {}; cfg.screens[k] = { display: String(v.display || ''), label: String(v.label || ''), full: v.full !== undefined ? !!v.full : cfg.fullscreen !== false, bounds: v.bounds || null }; }
}
fixScreens();
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

/* ---------------- Clubhouse Arcade (its own program, ClubhouseArcade.exe) ---------------- */
function getJSON(port, p, method = 'GET') {
  return new Promise(res => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, timeout: 700 }, s => { let b = ''; s.on('data', c => b += c); s.on('end', () => { try { res(JSON.parse(b)); } catch (e) { res(null); } }); });
    r.on('error', () => res(null)); r.on('timeout', () => { r.destroy(); res(null); }); r.end();
  });
}
async function findRunningArcade() {
  for (let p = 8080; p < 8090; p++) { const i = await getJSON(p, '/api/info'); if (i && i.app === 'clubhouse-arcade') return { port: p, info: i }; }
  return null;
}
function arcadeCandidates() {
  const home = app.getPath('home'), L = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const list = [process.env.CLUBHOUSE_ARCADE_EXE,
    path.join(path.dirname(process.execPath), 'ClubhouseArcade', 'ClubhouseArcade.exe'),   // copy installed with Clubhouse
    path.join(L, 'Programs', 'ClubhouseArcade', 'ClubhouseArcade.exe'), 'C:\\ClubhouseArcade\\ClubhouseArcade.exe'];
  for (const d of ['desktop', 'downloads', 'documents']) { let dir; try { dir = app.getPath(d); } catch (e) { continue; } list.push(path.join(dir, 'ClubhouseArcade', 'ClubhouseArcade.exe'), path.join(dir, 'ClubhouseArcade.exe')); }
  return list.filter(Boolean);
}
function findArcade() { for (const p of arcadeCandidates()) if (exists(p)) return p; return ''; }
function arcadePath() { if (exists(cfg.arcade.path)) return cfg.arcade.path; const f = findArcade(); if (f) { cfg.arcade.path = f; saveCfg(); } return f; }

// starts ClubhouseArcade.exe without its browser tab; it serves the games on localhost:8080
async function startArcade() {
  const run = await findRunningArcade(); if (run) return run;
  const exe = arcadePath(); if (!exe) return { setup: true };
  try { const c = cp.spawn(exe, ['--no-open'], { cwd: path.dirname(exe), detached: true, stdio: 'ignore', windowsHide: true }); c.on('error', e => log('could not start the arcade: ' + e.message)); c.unref(); log('started ' + exe); }
  catch (e) { return { error: 'Clubhouse Arcade could not be started: ' + e.message }; }
  for (let i = 0; i < 40; i++) { await wait(500); const r = await findRunningArcade(); if (r) return r; }
  return { error: 'Clubhouse Arcade did not start. Try running ' + exe + ' --window to see why.' };
}
// asks every running copy to quit, which frees ports 921 and 9210 for GSPro and Rela
async function stopArcade() {
  let n = 0; for (let p = 8080; p < 8090; p++) { const i = await getJSON(p, '/api/info'); if (i && i.app === 'clubhouse-arcade') { await getJSON(p, '/api/quit', 'POST'); n++; } }
  if (n) { log('asked ' + n + ' arcade(s) to quit'); await wait(700); }
}

/* ---------------- window and screens ---------------- */
// One window shows both the launcher and the arcade; each remembers its own screen and full screen / window choice.
let win = null, screen = 'launcher', placing = Promise.resolve(), boundsTimer = null;
const mode = () => screen === 'arcade' ? 'arcade' : 'launcher';
function displayList() {
  const all = Displays.getAllDisplays(), main = Displays.getPrimaryDisplay().id;
  return all.slice().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y).map((d, i) => ({
    id: String(d.id), n: i + 1, label: d.label || '', primary: d.id === main,
    size: Math.round(d.size.width * d.scaleFactor) + ' × ' + Math.round(d.size.height * d.scaleFactor),
    name: 'Screen ' + (i + 1) + (d.label ? ' · ' + d.label : '') + ' · ' + Math.round(d.size.width * d.scaleFactor) + '×' + Math.round(d.size.height * d.scaleFactor) + (d.id === main ? ' (main)' : '')
  }));
}
function pickDisplay(pref) {
  const all = Displays.getAllDisplays();
  return all.find(d => String(d.id) === pref.display) || (pref.label && all.find(d => d.label === pref.label)) || Displays.getPrimaryDisplay();
}
const onDisplay = (b, d) => { const cx = b.x + b.width / 2, cy = b.y + b.height / 2; return cx >= d.bounds.x && cx < d.bounds.x + d.bounds.width && cy >= d.bounds.y && cy < d.bounds.y + d.bounds.height; };
function windowBounds(pref, d) {
  const w = d.workArea; if (pref.bounds && onDisplay(pref.bounds, d)) return pref.bounds;
  const W = Math.round(w.width * .8), H = Math.round(w.height * .8);
  return { x: w.x + Math.round((w.width - W) / 2), y: w.y + Math.round((w.height - H) / 2), width: W, height: H };
}
// moves the window to the screen chosen for the launcher or the arcade
function place(which = mode()) {
  placing = placing.then(async () => {
    if (!win) return;
    const pref = cfg.screens[which], d = pickDisplay(pref);
    if (win.isMinimized()) win.restore();
    const here = Displays.getDisplayMatching(win.getBounds());
    if (pref.full) {
      if (win.isFullScreen() && here.id === d.id) return;
      if (win.isFullScreen()) { win.setFullScreen(false); await wait(250); }
      const c = d.workArea; win.setBounds({ x: c.x + 40, y: c.y + 40, width: Math.min(1280, c.width - 80), height: Math.min(800, c.height - 80) }); await wait(60);
      win.setFullScreen(true);
    } else {
      if (win.isFullScreen()) { win.setFullScreen(false); await wait(250); }
      win.setBounds(windowBounds(pref, d));
    }
  }).catch(e => log('could not place the window: ' + e.message));
  return placing;
}
function choose(which, patch) { Object.assign(cfg.screens[which], patch); saveCfg(); if (which === mode()) return place(which); return Promise.resolve(); }
function nextDisplay() {   // F9: move to the next screen and remember it
  const list = displayList(), cur = String(Displays.getDisplayMatching(win.getBounds()).id), i = list.findIndex(d => d.id === cur), nx = list[(i + 1) % list.length];
  const d = Displays.getAllDisplays().find(x => String(x.id) === nx.id);
  return choose(mode(), { display: nx.id, label: d.label || '', bounds: null });
}
function identify() {   // big number on each screen for a few seconds
  for (const d of displayList()) {
    const real = Displays.getAllDisplays().find(x => String(x.id) === d.id), b = real.bounds;
    const w = new BrowserWindow({ x: b.x + Math.round(b.width / 2) - 220, y: b.y + Math.round(b.height / 2) - 170, width: 440, height: 340, frame: false, transparent: true, alwaysOnTop: true, focusable: false, skipTaskbar: true, resizable: false, show: false, webPreferences: { sandbox: true } });
    const html = `<html><body style="margin:0;display:grid;place-items:center;height:100vh;font-family:Segoe UI,system-ui,sans-serif;color:#fff;background:rgba(7,11,20,.88);border-radius:28px;border:4px solid #f4c55a"><div style="text-align:center"><div style="font-size:180px;font-weight:800;line-height:1">${d.n}</div><div style="font-size:22px;opacity:.8">${d.size.replace(/[<>&]/g, '')}${d.primary ? ' · main' : ''}</div></div></body></html>`;
    w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html)); w.once('ready-to-show', () => w.showInactive());
    setTimeout(() => { try { w.close(); } catch (e) { } }, 3000);
  }
}

function createWindow() {
  const pref = cfg.screens.launcher, d = pickDisplay(pref), start = pref.full ? { ...d.workArea } : windowBounds(pref, d);
  win = new BrowserWindow({
    x: start.x, y: start.y, width: start.width, height: start.height, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#070b14', title: 'Clubhouse',
    autoHideMenuBar: true, icon: exists(ICON) ? ICON : undefined,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.show(); place('launcher'); });
  // links in the arcade (Help, Suggestions) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { const u = new URL(url); if (u.protocol !== 'file:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { e.preventDefault(); choose(mode(), { full: !win.isFullScreen() }); }
    if (i.key === 'F9') { e.preventDefault(); nextDisplay(); }
    if (i.key === 'F12' && i.control && i.shift) win.webContents.toggleDevTools();
    if (i.key === 'F10' && screen === 'arcade') { e.preventDefault(); goHome(); }   // back to the launcher from any arcade version
  });
  // remember where a windowed window was put
  const keep = () => { if (!win || win.isFullScreen() || win.isMinimized() || win.isMaximized()) return; clearTimeout(boundsTimer); boundsTimer = setTimeout(() => { if (!win || win.isFullScreen()) return; const b = win.getBounds(), d = Displays.getDisplayMatching(b), p = cfg.screens[mode()]; if (p.full) return; p.bounds = b; p.display = String(d.id); p.label = d.label || ''; saveCfg(); }, 600); };
  win.on('moved', keep); win.on('resized', keep);
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
    arcade: { path: cfg.arcade.path, found: exists(cfg.arcade.path) || !!findArcade(), version: cfg.arcade.version, running: set.has('clubhousearcade.exe') },
    names: [...set].filter(n => [...GSPRO_NAMES, ...cfg.gspro.start.map(exeName), ...cfg.arcade.start.map(exeName), ...cfg.gspro.close, ...cfg.arcade.close].map(exeName).includes(n)),
    fullscreen: win ? win.isFullScreen() : cfg.screens.launcher.full,
    displays: displayList(), mainDisplay: String(Displays.getPrimaryDisplay().id)
  };
}

ipcMain.handle('state', () => state());
ipcMain.handle('save', (e, c) => {
  const clean = l => Array.isArray(l) ? l.map(String).filter(Boolean).slice(0, 12) : [];
  cfg.gspro = { path: String(c.gspro.path || ''), start: clean(c.gspro.start), close: clean(c.gspro.close).map(exeName) };
  cfg.arcade = { path: String(c.arcade.path || ''), start: clean(c.arcade.start), close: clean(c.arcade.close).map(exeName), version: cfg.arcade.version };
  cfg.afterGSPro = ['minimize', 'quit', 'stay'].includes(c.afterGSPro) ? c.afterGSPro : 'minimize';
  saveCfg(); return state();
});
ipcMain.handle('browse', async (e, what) => {
  const r = await dialog.showOpenDialog(win, {
    title: what === 'gspro' ? 'Choose GSPro (GSPLauncher.exe or GSPro.exe)' : what === 'arcade' ? 'Choose ClubhouseArcade.exe' : 'Choose a program',
    defaultPath: what === 'gspro' && WIN ? 'C:\\GSProV1' : undefined,
    filters: WIN ? [{ name: 'Programs', extensions: ['exe', 'bat', 'cmd', 'lnk'] }] : [], properties: ['openFile']
  });
  if (r.canceled || !r.filePaths[0]) return '';
  let p = r.filePaths[0];
  if (WIN && /\.lnk$/i.test(p)) { try { p = shell.readShortcutLink(p).target || p; } catch (x) { } }
  return p;
});
ipcMain.handle('find-gspro', () => findGSPro());
ipcMain.handle('find-arcade', () => findArcade());
ipcMain.handle('open-log', () => shell.openPath(LOG_FILE()));
ipcMain.handle('set-screen', async (e, which, patch) => {
  if (!['launcher', 'arcade'].includes(which)) return state();
  const p = {}; if (patch && patch.display !== undefined) { const d = Displays.getAllDisplays().find(x => String(x.id) === String(patch.display)); p.display = d ? String(d.id) : ''; p.label = d ? d.label || '' : ''; p.bounds = null; }
  if (patch && patch.full !== undefined) p.full = !!patch.full;
  await choose(which, p); return state();
});
ipcMain.handle('identify', () => identify());

ipcMain.handle('play-arcade', async (e, opts = {}) => {
  const steps = [];
  if (!arcadePath()) return { setup: true };
  const set = await running();
  if (gsproRunning(set) && !opts.ignoreGSPro) return { ask: 'gspro' };
  if (opts.closeGSPro) { const c = await closePrograms([...GSPRO_NAMES, cfg.gspro.path].filter(Boolean)); if (c.length) steps.push('Closed GSPro'); }
  const closed = await closePrograms(cfg.arcade.close); if (closed.length) steps.push('Closed ' + closed.join(', '));
  const r = await startArcade(); if (r.setup || r.error) { log(r.error || 'arcade not found'); return r; }
  if (r.info && r.info.version) cfg.arcade.version = r.info.version;
  const s = await startPrograms(cfg.arcade.start); if (s.started.length) steps.push('Started ' + s.started.join(', '));
  cfg.last = 'arcade'; saveCfg(); screen = 'arcade';
  const url = 'http://localhost:' + r.port + '/?app=1';
  setTimeout(async () => { if (!win || screen !== 'arcade') return; await place('arcade'); win.loadURL(url); }, 350);
  return { ok: true, steps };
});
ipcMain.handle('play-gspro', async () => {
  if (!exists(cfg.gspro.path)) { const f = findGSPro(); if (f) { cfg.gspro.path = f; saveCfg(); } else return { setup: true }; }
  const steps = [];
  await stopArcade();
  const closed = await closePrograms(cfg.gspro.close); if (closed.length) steps.push('Closed ' + closed.join(', '));
  const now = await running();
  if (!gsproRunning(now)) { if (!startProgram(cfg.gspro.path)) return { error: 'GSPro could not be started from ' + cfg.gspro.path }; steps.push('Started GSPro'); }
  else steps.push('GSPro was already open');
  const s = await startPrograms(cfg.gspro.start); if (s.started.length) steps.push('Started ' + s.started.join(', '));
  cfg.last = 'gspro'; saveCfg();
  setTimeout(() => { if (!win) return; if (cfg.afterGSPro === 'quit') app.quit(); else if (cfg.afterGSPro === 'minimize') win.minimize(); }, 2500);
  return { ok: true, steps };
});
async function goHome() { const was = screen === 'arcade'; screen = 'launcher'; if (win) { showLauncher(); place('launcher'); } if (was) await stopArcade(); return true; }
ipcMain.handle('home', () => goHome());
ipcMain.handle('quit', () => app.quit());
ipcMain.handle('toggle-full', async () => { if (win) await choose(mode(), { full: !win.isFullScreen() }); return win && win.isFullScreen(); });

/* ---------------- app life ---------------- */
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
// a screen unplugged or plugged in: put the window back where it belongs
app.whenReady().then(() => { const re = () => setTimeout(() => place(), 800); Displays.on('display-removed', re); Displays.on('display-added', re); });
app.whenReady().then(() => {
  try { fs.writeFileSync(LOG_FILE(), ''); } catch (e) { }
  log('Clubhouse ' + app.getVersion() + ' starting');
  if (!cfg.gspro.path) { const f = findGSPro(); if (f) { cfg.gspro.path = f; saveCfg(); log('found GSPro at ' + f); } }
  if (!exists(cfg.arcade.path)) { const f = findArcade(); if (f) { cfg.arcade.path = f; saveCfg(); log('found Clubhouse Arcade at ' + f); } }
  createWindow();
});
app.on('window-all-closed', () => app.quit());
let quitting = false;
app.on('before-quit', e => { if (screen === 'arcade' && !quitting) { quitting = true; e.preventDefault(); stopArcade().then(() => app.quit()); } });
