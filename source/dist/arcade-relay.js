#!/usr/bin/env node
/*
  Clubhouse Arcade relay  —  runs as ClubhouseArcade.exe, or with plain Node.js:  node arcade-relay.js

  1. Serves the arcade at   http://localhost:8080
  2. Listens for a launch monitor speaking GSPro Open Connect on TCP ports 921 and 9210
  3. Pushes every shot to the arcade over a WebSocket on the same port as the page
  4. Keeps downloaded game updates and a log in a data folder on this PC

  Options:  --http 8080   --ports 921,9210   --quiet   --window (exe: keep this window open)   --no-open   --update <url>
  Test a shot without swinging:  http://localhost:8080/test?speed=95&vla=22&hla=-2&spin=7000
*/
'use strict';
const http = require('http'), https = require('https'), net = require('net'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os'), cp = require('child_process');
const SHELL = 5;                 // version of this program (the games have their own version)
const UPDATE_URL_BUILT_IN = '';  // folder that holds version.json and index.html for updates; empty = updates off
let SEA = null; try { const s = require('node:sea'); if (s.isSea()) SEA = s; } catch (e) { }
const has = f => process.argv.includes('--' + f);
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const HTTP_PORT = +arg('http', 8080), LM_PORTS = String(arg('ports', '921,9210')).split(',').map(Number).filter(Boolean), QUIET = has('quiet');
const CHILD = has('child'), HERE = SEA ? path.dirname(process.execPath) : __dirname;
const DATA = process.env.ARCADE_DATA || (process.platform === 'win32' && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ClubhouseArcade') : path.join(os.homedir(), '.clubhouse-arcade'));
try { fs.mkdirSync(path.join(DATA, 'games'), { recursive: true }); } catch (e) { }
const LOGFILE = path.join(DATA, 'log.txt'); if (CHILD) { try { fs.writeFileSync(LOGFILE, ''); } catch (e) { } }
function out(s) { if (CHILD) { try { fs.appendFileSync(LOGFILE, s + '\n'); } catch (e) { } } else { try { console.log(s); } catch (e) { } } }
const log = (...a) => { if (!QUIET) out(new Date().toLocaleTimeString() + ' ' + a.join(' ')); };
const openBrowser = url => { if (has('no-open')) return; try { process.platform === 'win32' ? cp.exec('start "" "' + url + '"') : process.platform === 'darwin' ? cp.exec('open ' + url) : cp.exec('xdg-open ' + url, () => { }); } catch (e) { } };
function hold(code) { if (CHILD) return process.exit(code); out('\n  Press Enter to close this window.'); try { process.stdin.resume(); process.stdin.once('data', () => process.exit(code)); } catch (e) { process.exit(code); } }
process.on('uncaughtException', e => { out('Something went wrong: ' + (e && e.stack || e)); hold(1); });

/* ---------- launcher: the .exe starts itself again hidden, so no window stays open ---------- */
function ping(port, cb) { const r = http.get({ host: '127.0.0.1', port, path: '/api/info', timeout: 700 }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { cb(JSON.parse(b).app === 'clubhouse-arcade'); } catch (e) { cb(false); } }); }); r.on('error', () => cb(false)); r.on('timeout', () => { r.destroy(); cb(false); }); }
function findRunning(cb, p = HTTP_PORT) { if (p > HTTP_PORT + 9) return cb(0); ping(p, ok => ok ? cb(p) : findRunning(cb, p + 1)); }
if (SEA && !CHILD && !has('window')) {
  findRunning(port => {
    if (port) { console.log('\n  Clubhouse Arcade is already running. Opening it in your browser.'); openBrowser('http://localhost:' + port); return setTimeout(() => process.exit(0), 900); }
    console.log('\n  Starting Clubhouse Arcade. This window will close by itself.');
    try { cp.spawn(process.execPath, process.argv.slice(2).concat('--child'), { detached: true, stdio: 'ignore', windowsHide: true }).unref(); setTimeout(() => process.exit(0), 1500); }
    catch (e) { console.log('  Could not start in the background (' + e.message + '). Running in this window instead.'); main(); }
  });
} else main();

function main() {
  /* ---------- game files: built in, in this folder, or a newer downloaded copy ---------- */
  const verOf = html => { const m = /<meta name="arcade-version" content="([\d.]+)"/.exec(String(html).slice(0, 4000)); return m ? m[1] : '0'; };
  const cmpVer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const baseFile = (name, cb) => { name = name.split(path.sep).join('/'); if (SEA) { try { return cb(null, Buffer.from(SEA.getAsset(name))); } catch (e) { return cb(e); } } const f = path.join(HERE, name); if (!f.startsWith(HERE)) return cb(new Error('no')); fs.readFile(f, cb); };
  const UPD = path.join(DATA, 'games', 'index.html'); let baseVer = '0', curVer = '0', useUpd = false, upd = { state: UPDATE_URL() ? 'idle' : 'off', checked: 0, error: '' };
  function UPDATE_URL() { let u = arg('update', process.env.ARCADE_UPDATE_URL || ''); if (!u) for (const d of [HERE, DATA]) { try { u = fs.readFileSync(path.join(d, 'update-url.txt'), 'utf8').trim(); if (u) break; } catch (e) { } } return (u || UPDATE_URL_BUILT_IN).replace(/\/+$/, ''); }
  function pickBundle() { useUpd = false; curVer = baseVer; try { const v = verOf(fs.readFileSync(UPD, 'utf8')); if (cmpVer(v, baseVer) > 0) { useUpd = true; curVer = v; } } catch (e) { } }
  baseFile('index.html', (e, d) => { if (!e) baseVer = verOf(d); pickBundle(); log('games version ' + curVer + (useUpd ? ' (downloaded update)' : '')); });
  function fetchBuf(url, cb, depth = 0) { let done = false; const fin = (e, b) => { if (!done) { done = true; cb(e, b); } }; try { const r = (url.startsWith('http:') ? http : https).get(url, { timeout: 9000, headers: { 'User-Agent': 'ClubhouseArcade/' + SHELL, 'Cache-Control': 'no-cache' } }, res => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 4) { res.resume(); return fetchBuf(new URL(res.headers.location, url).href, cb, depth + 1); } if (res.statusCode !== 200) { res.resume(); return fin(new Error('HTTP ' + res.statusCode)); } const ch = []; let n = 0; res.on('data', c => { ch.push(c); n += c.length; if (n > 3e7) { r.destroy(); fin(new Error('too big')); } }); res.on('end', () => fin(null, Buffer.concat(ch))); res.on('error', fin); }); r.on('error', fin); r.on('timeout', () => { r.destroy(); fin(new Error('timed out')); }); } catch (e) { fin(e); } }
  function checkUpdate(cb = () => { }) {
    const base = UPDATE_URL(); if (!base) { upd.state = 'off'; return cb(); } upd.state = 'checking'; upd.error = '';
    fetchBuf(base + '/version.json?t=' + Date.now(), (e, b) => {
      upd.checked = Date.now(); let j; try { if (e) throw e; j = JSON.parse(b.toString('utf8')); } catch (x) { upd.state = 'error'; upd.error = 'Could not reach the update server (' + x.message + ')'; log(upd.error); return cb(); }
      if (!(cmpVer(j.version, curVer) > 0)) { upd.state = 'current'; return cb(); }
      fetchBuf(base + '/' + (j.file || 'index.html') + '?t=' + Date.now(), (e2, html) => {
        const bad = m => { upd.state = 'error'; upd.error = m; log(m); cb(); };
        if (e2) return bad('Could not download the update (' + e2.message + ')');
        if (j.sha256 && crypto.createHash('sha256').update(html).digest('hex') !== String(j.sha256).toLowerCase()) return bad('The update file did not match its checksum, so it was not installed');
        if (cmpVer(verOf(html), curVer) <= 0) return bad('The update file is not newer than the installed games');
        try { fs.writeFileSync(UPD + '.tmp', html); fs.renameSync(UPD + '.tmp', UPD); } catch (x) { return bad('Could not save the update (' + x.message + ')'); }
        pickBundle(); upd.state = 'installed'; log('installed games update ' + curVer); broadcast({ type: 'update', version: curVer }); cb();
      });
    });
  }
  setTimeout(checkUpdate, 1500); setInterval(checkUpdate, 6 * 3600 * 1000).unref();

  /* ---------- browsers (WebSocket, text frames only) ---------- */
  const clients = new Set(); let monitors = 0, ever = false, lastGone = Date.now(); const started = Date.now();
  function frame(str) { const b = Buffer.from(str), n = b.length; const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x81, 127, 0, 0, 0, 0]), Buffer.from([n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255])]); return Buffer.concat([h, b]); }
  function broadcast(obj) { const f = frame(JSON.stringify(obj)); for (const s of clients) { try { s.write(f); } catch (e) { } } }
  let lmFlags = false, lmReady = false, lmBall = false; const statusMsg = () => ({ type: 'status', lm: monitors > 0, flags: lmFlags, ready: lmReady, ball: lmBall }); const status = () => broadcast(statusMsg());
  function sendShot(b, src) {
    const back = +b.BackSpin || 0, side = +b.SideSpin || 0;
    const shot = { type: 'shot', t: Date.now(), speed: +b.Speed, vla: +b.VLA || 0, hla: +b.HLA || 0, spin: +b.TotalSpin || Math.hypot(back, side), axis: b.SpinAxis !== undefined ? +b.SpinAxis : Math.atan2(side, back || 1) * 180 / Math.PI };
    if (!(shot.speed > 0)) return false;
    log(`shot from ${src}: ${shot.speed.toFixed(1)} mph, launch ${shot.vla.toFixed(1)}°, ${shot.hla.toFixed(1)}° ${shot.hla < 0 ? 'left' : 'right'}, ${Math.round(shot.spin)} rpm  ->  ${clients.size} screen(s)`);
    broadcast(shot); return true;
  }
  // started from the .exe: quit once the arcade's browser tab has been closed for a few seconds
  if (CHILD) setInterval(() => { if (clients.size) return; if (ever ? Date.now() - lastGone > 8000 : Date.now() - started > 120000) { log('browser closed, quitting'); process.exit(0); } }, 2000);

  /* ---------- web page, small API, WebSocket upgrade ---------- */
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  const body = (req, cb) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { cb(JSON.parse(b || '{}')); } catch (e) { cb(null); } }); };
  const info = () => ({ app: 'clubhouse-arcade', version: curVer, shell: SHELL, exe: !!SEA, update: upd.state, updateError: upd.error, checked: upd.checked });
  let port = HTTP_PORT;
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/info') return json(res, 200, info());
    if (u.pathname === '/api/check-update' && req.method === 'POST') return checkUpdate(() => json(res, 200, info()));
    if (u.pathname === '/api/quit' && req.method === 'POST') { json(res, 200, { ok: true }); return setTimeout(() => process.exit(0), 300); }
    if (u.pathname === '/test') { const q = u.searchParams, ok = sendShot({ Speed: q.get('speed') || 90, VLA: q.get('vla') || 22, HLA: q.get('hla') || 0, TotalSpin: q.get('spin') || 6500, SpinAxis: q.get('axis') || 0 }, 'test link'); res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(ok ? `Test shot sent to ${clients.size} screen(s).` : 'Bad shot values.'); }
    if (u.pathname === '/shot' && req.method === 'POST') return body(req, d => { const ok = !!d && sendShot(d.BallData || d, 'web hook'); json(res, ok ? 200 : 400, { ok }); });
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/, ''); if (!p || p.endsWith(path.sep)) p += 'index.html';
    const send = (err, data) => { if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end(p === 'index.html' ? 'index.html is missing. Put it in the same folder as arcade-relay.js.' : 'Not found'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data); };
    if (p === 'index.html' && useUpd) return fs.readFile(UPD, (e, d) => e ? baseFile(p, send) : send(null, d));
    baseFile(p, send);
  });
  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key']; if (!key) return sock.destroy();
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
    sock.setNoDelay(true); clients.add(sock); ever = true; log(`arcade screen connected (${clients.size} open)`);
    sock.write(frame(JSON.stringify(statusMsg())));
    sock.on('data', d => { const op = d[0] & 15; if (op === 8) sock.end(); else if (op === 9) { try { sock.write(Buffer.from([0x8a, 0])); } catch (e) { } } });
    const bye = () => { if (clients.delete(sock)) { lastGone = Date.now(); log(`arcade screen closed (${clients.size} open)`); } }; sock.on('close', bye); sock.on('error', bye); sock.on('end', () => { bye(); sock.destroy(); });
  });
  server.on('error', e => { if (e.code === 'EADDRINUSE' && port < HTTP_PORT + 9) { port++; return server.listen(port); } out(e.code === 'EADDRINUSE' ? 'Ports ' + HTTP_PORT + ' to ' + port + ' are all in use. Close other copies of Clubhouse Arcade and try again.' : e.message); hold(1); });
  server.on('listening', () => { const url = 'http://localhost:' + port; out('\n  Clubhouse Arcade is running at ' + url + (CHILD ? '' : '\n  Keep this window open while you play. Close it to quit.') + '\n'); if (SEA || has('open')) openBrowser(url); });
  server.listen(port);

  /* ---------- launch monitor side: GSPro Open Connect v1 over TCP ---------- */
  function listen(lp) {
    const srv = net.createServer(sock => {
      monitors++; status(); log(`launch monitor connected on port ${lp}`);
      sock.setNoDelay(true); let buf = '';
      try { sock.write(JSON.stringify({ Code: 201, Message: 'GSPro Player Information', Player: { Handed: 'RH', Club: 'DR' } })); } catch (e) { }
      sock.on('data', chunk => {
        buf += chunk.toString('utf8'); if (buf.length > 1e6) buf = '';
        // messages arrive back to back with no separator, so split on balanced braces
        let depth = 0, start = -1, inStr = false, escp = false, used = 0;
        for (let i = 0; i < buf.length; i++) {
          const c = buf[i]; if (inStr) { if (escp) escp = false; else if (c === '\\') escp = true; else if (c === '"') inStr = false; continue; }
          if (c === '"') inStr = true; else if (c === '{') { if (depth++ === 0) start = i; } else if (c === '}' && depth > 0 && --depth === 0) {
            used = i + 1; let msg; try { msg = JSON.parse(buf.slice(start, i + 1)); } catch (e) { continue; }
            const o = msg.ShotDataOptions || {}; let reply = { Code: 200, Message: 'OK' };
            if ('LaunchMonitorIsReady' in o || 'LaunchMonitorBallDetected' in o) { const r = !!o.LaunchMonitorIsReady, b = !!o.LaunchMonitorBallDetected; if (!lmFlags || r !== lmReady || b !== lmBall) { lmFlags = true; lmReady = r; lmBall = b; status(); } }
            if (!o.IsHeartBeat && o.ContainsBallData !== false && msg.BallData) reply = sendShot(msg.BallData, 'launch monitor') ? { Code: 200, Message: 'Shot received successfully' } : { Code: 501, Message: 'Shot had no ball speed' };
            try { sock.write(JSON.stringify(reply)); } catch (e) { }
          }
        }
        buf = buf.slice(used);
      });
      const bye = () => { if (sock._gone) return; sock._gone = true; monitors = Math.max(0, monitors - 1); if (!monitors) lmFlags = lmReady = lmBall = false; status(); log(`launch monitor on port ${lp} disconnected`); }; sock.on('close', bye); sock.on('error', bye);
    });
    srv.on('error', e => out(e.code === 'EADDRINUSE' ? `  Port ${lp} is busy (GSPro is probably running), so the relay is not listening there.` : e.code === 'EACCES' ? `  Windows would not let the relay open port ${lp}. Use the other port, or run as administrator.` : `  Port ${lp}: ${e.message}`));
    srv.listen(lp, () => out(`  Waiting for a launch monitor on port ${lp} (GSPro Open Connect).`));
  }
  LM_PORTS.forEach(listen);
}
