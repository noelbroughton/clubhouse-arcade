/* ============ match flow, HUD, screens, input ============ */
const App = { state: 'boot', def: null, game: null, match: null, thumbs: {}, paused: false, conn: 0, pick: null, tab: null, fx: 0 };
const Shot = { phase: 'idle', t: 0 };
const LEN = ['Quick', 'Standard', 'Long'];
const Sess = { d: {}, load() { try { this.d = JSON.parse(sessionStorage.getItem('clubhouseArcade.session')) || {}; } catch (e) { this.d = {}; } }, save() { try { sessionStorage.setItem('clubhouseArcade.session', JSON.stringify(this.d)); } catch (e) { } } };
const isSport = def => def.group === 'sports', LV_NAMES = ['Climb all levels', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const bkey = (def, len, lv) => def.id + ':' + len + (isSport(def) && lv ? ':L' + lv : '');
const lenOf = def => Math.min(Store.d.len, def.rounds.length - 1), lenName = (def, i) => (def.lenNames || LEN)[i];
const DEMO = { players: [{ name: 'Player 1', c: 0 }, { name: 'Player 2', c: 1 }] };
const byId = id => GAMES.find(g => g.id === id);
const fmtScore = (def, v) => def.fmt ? def.fmt(v) : Math.round(v).toLocaleString();

function loadScene(def, match) {
  const ctx = newCtx(), g = def.create(ctx, match || DEMO); ctx.near.build(); ctx.far.build();
  $('meter').hidden = true; Cam.max = def.camMax || 210; Cam.orbit = null; Cam.cut = null; Cam.home(def.cam.p, def.cam.l, true); App.def = def; App.game = g; Shot.phase = 'idle'; return g;
}
function scores() { const m = App.match; return App.game.scores ? App.game.scores() : m.players.map(p => p.score); }
function startMatch(def) {
  const players = Store.d.players.map((p, i) => ({ name: (p.name || '').trim() || 'Player ' + (i + 1), c: p.c, b: p.b || 1, score: 0 }));
  App.match = { def, players, rounds: def.rounds[lenOf(def)], spt: def.spt, round: 0, pi: 0, shot: 0, len: lenOf(def), level: isSport(def) ? Store.d.sportLv : 0 }; $('aimBar').hidden = !def.putt;
  loadScene(def, App.match); setState('play'); $('hStats').classList.remove('show'); HUD.hideToast(); beginTurn(true);
}
function beginTurn(np) {
  const m = App.match, pl = m.players[m.pi], g = App.game;
  if (np) { g.beginTurn && g.beginTurn(pl, m.round, m.pi); HUD.banner(pl); }
  Ball.hide(); Cam.mode = 'home'; g.beginShot && g.beginShot(pl); Shot.phase = 'ready'; HUD.refresh();
}
function fire(s, raw) {
  if (App.state !== 'play' || App.paused || !s || !(s.speed > 1)) return false;
  if (Shot.phase === 'show') { Cam.cut = null; advance(); } else if (Shot.phase === 'settle') { App.queued = s; App.queuedRaw = raw; return false; }
  if (App.state !== 'play' || Shot.phase !== 'ready') return false; App.queued = null;
  Snd.init(); const pl = App.match.players[App.match.pi], shot = { speed: +s.speed, vla: +s.vla || 0, hla: +s.hla || 0, spin: +s.spin || 0, axis: +s.axis || 0 };
  if (pl.b > 1 && !App.def.putt) shot.speed *= pl.b; shot.speed = clamp(shot.speed, 2, 235); shot.vla = clamp(shot.vla, 0, 62); shot.raw = shot.hla; if (!raw && !App.def.putt) shot.hla = screenAim(shot); shot.hla = clamp(shot.hla, -60, 60);
  Ball.launch(shot, PCOL[pl.c]); Shot.phase = 'air'; Cam.mode = 'follow'; if (App.game.onLaunch) App.game.onLaunch(Ball, shot); App.def.putt ? Snd.putt() : Snd.hit(); HUD.hideToast(); $('hStats').classList.remove('show'); $('hBanner').classList.remove('show'); return true;
}
function finishShot() {
  const pl = App.match.players[App.match.pi], r = App.game.result(Ball) || { pts: 0, text: '' };
  pl.score += r.pts || 0; pl.played = true; Shot.phase = 'show'; Shot.t = r.hold || 2; if (r.tone === 'miss' && !Ball.wet) Snd.aww();
  HUD.toast(r); HUD.stats(Ball); HUD.refresh(); if (App.queued) { const q = App.queued; App.queued = null; fire(q, App.queuedRaw); }
}
function advance(force) {
  const m = App.match; m.shot++; HUD.hideToast(); let np = false;
  if (force || (App.game.turnOver ? App.game.turnOver() : m.shot >= m.spt)) { m.shot = 0; m.pi++; np = true; if (m.pi >= m.players.length) { m.pi = 0; m.round++; if (m.round >= m.rounds || (App.game.over && App.game.over())) return endMatch(); } }
  beginTurn(np);
}
function endMatch() {
  const m = App.match, def = m.def, sc = scores(), rows = m.players.map((p, i) => ({ name: p.name, c: p.c, s: sc[i] })).sort((a, b) => def.lower ? a.s - b.s : b.s - a.s);
  const key = bkey(def, m.len, m.level), bd = Store.d.boards[key] || (Store.d.boards[key] = []), prevBest = bd.length ? bd[0].s : null, sb = Sess.d[key] || (Sess.d[key] = []), sBest = sb.length ? sb[0].s : null, better = (a, b) => def.lower ? a < b : a > b;
  rows.forEach(r => { r.rec = prevBest !== null && better(r.s, prevBest); r.srec = !r.rec && sBest !== null && better(r.s, sBest); const e = { n: r.name, s: r.s, d: new Date().toISOString().slice(0, 10) }; bd.push(e); sb.push(e); });
  for (const L of [bd, sb]) { L.sort((a, b) => def.lower ? a.s - b.s : b.s - a.s); L.length = Math.min(L.length, 10); } Store.save(); Sess.save();
  App.rows = rows; Ball.hide(); Cam.mode = 'home'; Shot.phase = 'idle'; setState('results'); Snd.win();
}

const HUD = {
  refresh() {
    const m = App.match; if (!m) return; const def = m.def, pl = m.players[m.pi], sc = scores();
    const g = App.game; $('hGame').textContent = def.name; $('hRound').textContent = (def.id === 'ctp' || def.putt ? 'Hole ' : 'Round ') + Math.min(m.round + 1, m.rounds) + ' of ' + m.rounds + ' · ' + (g.roundLabel ? g.roundLabel() : def.unit);
    $('hTurn').style.setProperty('--pc', PCOL[pl.c]); $('hName').textContent = pl.name; $('hShots').textContent = g.shotLabel ? g.shotLabel() : pl.b > 1 ? 'Boost ×' + pl.b.toFixed(1) : m.spt > 1 ? 'Shot ' + Math.min(m.shot + 1, m.spt) + ' of ' + m.spt : 'One shot';
    $('hPips').innerHTML = m.spt > 1 ? Array.from({ length: m.spt }, (_, i) => `<u class="${i < m.spt - m.shot - (Shot.phase === 'ready' ? 0 : 1) ? 'on' : ''}"></u>`).join('') : '';
    $('hBoard').innerHTML = m.players.map((p, i) => `<li class="${i === m.pi ? 'on' : ''}" style="--pc:${PCOL[p.c]}"><i></i><span>${esc(p.name)}</span><b>${def.lower && !p.played ? '–' : fmtScore(def, sc[i])}</b></li>`).join('');
  },
  banner(pl) { const b = $('hBanner'); b.style.setProperty('--pc', PCOL[pl.c]); b.querySelector('span').textContent = pl.name; b.classList.add('show'); clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.remove('show'), 1900); Snd.turn(); },
  toast(r) { const t = $('hToast'); t.className = 'h-toast show ' + (r.tone === 'miss' || r.tone === 'soft' ? 'miss' : ''); t.firstElementChild.textContent = r.text || ''; const s = t.lastElementChild; s.textContent = r.sub || ''; s.hidden = !r.sub; },
  hideToast() { $('hToast').classList.remove('show'); },
  stats(B) {
    const s = B.shot, carry = B.carry === null ? Math.hypot(B.p.x, B.p.z) : B.carry, off = B.p.x * YD;
    const cells = [['Ball speed', Math.round(s.speed) + ' mph'], ['Launch', s.vla.toFixed(1) + '°'], ['Carry', Math.round(carry * YD) + ' yd'], ['Total', Math.round(Math.hypot(B.p.x, B.p.z) * YD) + ' yd'], ['Direction', Math.abs(s.raw || 0) < .05 ? 'Straight' : Math.abs(s.raw).toFixed(1) + '° ' + (s.raw > 0 ? 'R' : 'L')], ['Offline', Math.abs(off) < .5 ? '0' : Math.round(Math.abs(off)) + (off > 0 ? ' R' : ' L')], ['Peak', Math.round(B.apex * 3.281) + ' ft']];
    if (B.cells) { cells.length = 0; cells.push(...B.cells); } else if (App.def.putt) { cells.length = 0; cells.push(['Ball speed', s.speed.toFixed(1) + ' mph'], ['Start line', Math.abs(s.hla) < .05 ? 'Straight' : Math.abs(s.hla).toFixed(1) + '° ' + (s.hla > 0 ? 'R' : 'L')], ['Rolled', Math.round((B.rolled || 0) * 3.281) + ' ft']); }
    const el = $('hStats'); el.innerHTML = cells.map(c => `<div><b>${c[1]}</b><span>${c[0]}</span></div>`).join(''); el.classList.add('show');
  }
};

/* ---------- screens ---------- */
addEventListener('pointermove', e => { if (App.mx !== undefined) App.moveD = (App.moveD || 0) + Math.abs(e.clientX - App.mx) + Math.abs(e.clientY - App.my); App.mx = e.clientX; App.my = e.clientY; });
function setState(s) {
  if (s === 'results') { App.armT = performance.now() + 1500; App.moveD = 0; }
  App.state = s; App.paused = false; document.body.classList.toggle('menu', s !== 'play'); $('hud').hidden = s !== 'play'; if (s !== 'play') { $('hBanner').classList.remove('show'); $('aimBar').hidden = true; $('meter').hidden = true; } padVis();
  const ui = $('ui');
  if (s === 'home') ui.innerHTML = homeHTML(); else if (s === 'cat') ui.innerHTML = catHTML(); else if (s === 'news') ui.innerHTML = newsHTML(); else if (s === 'sugg') ui.innerHTML = suggHTML(); else if (s === 'help') ui.innerHTML = helpHTML(); else if (s === 'setup') ui.innerHTML = setupHTML(); else if (s === 'results') ui.innerHTML = resultsHTML(); else if (s === 'boards') ui.innerHTML = boardsHTML(); else if (s === 'settings') ui.innerHTML = settingsHTML(); else ui.innerHTML = '';
  const f = ui.querySelector('[data-focus]'); if (f) f.focus({ preventScroll: true });
}
function best(def) { const b = Store.d.boards[def.id + ':' + lenOf(def)]; return b && b.length ? `Best ${fmtScore(def, b[0].s)} ${def.fmt ? '' : def.unit} · ${esc(b[0].n)}` : lenName(def, lenOf(def)) + ' · no scores yet'; }
const CATS = [{ id: 'carnival', name: 'Carnival', blurb: 'Big targets and bigger bangs. Made for the kids.' }, { id: 'minigolf', name: 'Mini Golf', blurb: 'Three six-hole putting courses for everyone.' }, { id: 'sports', name: 'Sports', blurb: 'Hockey, basketball, football and baseball, each with five levels to climb.' }, { id: 'clubhouse', name: 'Clubhouse', blurb: 'Skill games for the grown-ups.' }];
const VERSION = (document.querySelector('meta[name="arcade-version"]') || {}).content || '0';
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdFsCb7RlySfFJ10iTZg7ENKza-u8c1YNpvZ1v-nl-TQxsrUA/viewform';
const FEEDBACK_QR = '<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" role="img" aria-label="QR code for the suggestions form"><rect width="45" height="45" fill="#fff"/><path fill="#130f2b" d="M2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM5 2h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM11 2h1v1h-1zM15 2h1v1h-1zM17 2h1v1h-1zM18 2h1v1h-1zM19 2h1v1h-1zM21 2h1v1h-1zM22 2h1v1h-1zM23 2h1v1h-1zM28 2h1v1h-1zM29 2h1v1h-1zM30 2h1v1h-1zM32 2h1v1h-1zM36 2h1v1h-1zM37 2h1v1h-1zM38 2h1v1h-1zM39 2h1v1h-1zM40 2h1v1h-1zM41 2h1v1h-1zM42 2h1v1h-1zM2 3h1v1h-1zM8 3h1v1h-1zM16 3h1v1h-1zM17 3h1v1h-1zM20 3h1v1h-1zM23 3h1v1h-1zM25 3h1v1h-1zM26 3h1v1h-1zM28 3h1v1h-1zM29 3h1v1h-1zM31 3h1v1h-1zM32 3h1v1h-1zM34 3h1v1h-1zM36 3h1v1h-1zM42 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM5 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM12 4h1v1h-1zM14 4h1v1h-1zM15 4h1v1h-1zM17 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM25 4h1v1h-1zM26 4h1v1h-1zM28 4h1v1h-1zM30 4h1v1h-1zM31 4h1v1h-1zM33 4h1v1h-1zM34 4h1v1h-1zM36 4h1v1h-1zM38 4h1v1h-1zM39 4h1v1h-1zM40 4h1v1h-1zM42 4h1v1h-1zM2 5h1v1h-1zM4 5h1v1h-1zM5 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h1v1h-1zM12 5h1v1h-1zM15 5h1v1h-1zM18 5h1v1h-1zM19 5h1v1h-1zM20 5h1v1h-1zM22 5h1v1h-1zM23 5h1v1h-1zM25 5h1v1h-1zM28 5h1v1h-1zM29 5h1v1h-1zM31 5h1v1h-1zM32 5h1v1h-1zM33 5h1v1h-1zM36 5h1v1h-1zM38 5h1v1h-1zM39 5h1v1h-1zM40 5h1v1h-1zM42 5h1v1h-1zM2 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM11 6h1v1h-1zM12 6h1v1h-1zM13 6h1v1h-1zM18 6h1v1h-1zM19 6h1v1h-1zM20 6h1v1h-1zM27 6h1v1h-1zM30 6h1v1h-1zM32 6h1v1h-1zM33 6h1v1h-1zM36 6h1v1h-1zM38 6h1v1h-1zM39 6h1v1h-1zM40 6h1v1h-1zM42 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM11 7h1v1h-1zM12 7h1v1h-1zM15 7h1v1h-1zM17 7h1v1h-1zM19 7h1v1h-1zM20 7h1v1h-1zM21 7h1v1h-1zM22 7h1v1h-1zM23 7h1v1h-1zM24 7h1v1h-1zM26 7h1v1h-1zM29 7h1v1h-1zM30 7h1v1h-1zM32 7h1v1h-1zM33 7h1v1h-1zM36 7h1v1h-1zM42 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h1v1h-1zM30 8h1v1h-1zM32 8h1v1h-1zM34 8h1v1h-1zM36 8h1v1h-1zM37 8h1v1h-1zM38 8h1v1h-1zM39 8h1v1h-1zM40 8h1v1h-1zM41 8h1v1h-1zM42 8h1v1h-1zM11 9h1v1h-1zM12 9h1v1h-1zM13 9h1v1h-1zM15 9h1v1h-1zM16 9h1v1h-1zM17 9h1v1h-1zM19 9h1v1h-1zM20 9h1v1h-1zM22 9h1v1h-1zM23 9h1v1h-1zM28 9h1v1h-1zM29 9h1v1h-1zM30 9h1v1h-1zM31 9h1v1h-1zM2 10h1v1h-1zM5 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM10 10h1v1h-1zM11 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM18 10h1v1h-1zM21 10h1v1h-1zM23 10h1v1h-1zM24 10h1v1h-1zM25 10h1v1h-1zM26 10h1v1h-1zM27 10h1v1h-1zM28 10h1v1h-1zM30 10h1v1h-1zM35 10h1v1h-1zM37 10h1v1h-1zM3 11h1v1h-1zM4 11h1v1h-1zM6 11h1v1h-1zM10 11h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM15 11h1v1h-1zM16 11h1v1h-1zM17 11h1v1h-1zM23 11h1v1h-1zM26 11h1v1h-1zM30 11h1v1h-1zM31 11h1v1h-1zM34 11h1v1h-1zM39 11h1v1h-1zM40 11h1v1h-1zM41 11h1v1h-1zM42 11h1v1h-1zM2 12h1v1h-1zM4 12h1v1h-1zM8 12h1v1h-1zM13 12h1v1h-1zM14 12h1v1h-1zM17 12h1v1h-1zM20 12h1v1h-1zM21 12h1v1h-1zM23 12h1v1h-1zM26 12h1v1h-1zM27 12h1v1h-1zM31 12h1v1h-1zM33 12h1v1h-1zM37 12h1v1h-1zM38 12h1v1h-1zM39 12h1v1h-1zM40 12h1v1h-1zM41 12h1v1h-1zM4 13h1v1h-1zM5 13h1v1h-1zM11 13h1v1h-1zM12 13h1v1h-1zM13 13h1v1h-1zM16 13h1v1h-1zM17 13h1v1h-1zM20 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM24 13h1v1h-1zM26 13h1v1h-1zM27 13h1v1h-1zM28 13h1v1h-1zM30 13h1v1h-1zM38 13h1v1h-1zM40 13h1v1h-1zM41 13h1v1h-1zM42 13h1v1h-1zM2 14h1v1h-1zM3 14h1v1h-1zM4 14h1v1h-1zM5 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM10 14h1v1h-1zM11 14h1v1h-1zM12 14h1v1h-1zM16 14h1v1h-1zM21 14h1v1h-1zM23 14h1v1h-1zM25 14h1v1h-1zM26 14h1v1h-1zM29 14h1v1h-1zM30 14h1v1h-1zM33 14h1v1h-1zM35 14h1v1h-1zM36 14h1v1h-1zM39 14h1v1h-1zM41 14h1v1h-1zM4 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM10 15h1v1h-1zM11 15h1v1h-1zM13 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM18 15h1v1h-1zM19 15h1v1h-1zM20 15h1v1h-1zM24 15h1v1h-1zM26 15h1v1h-1zM27 15h1v1h-1zM28 15h1v1h-1zM31 15h1v1h-1zM34 15h1v1h-1zM37 15h1v1h-1zM39 15h1v1h-1zM40 15h1v1h-1zM41 15h1v1h-1zM42 15h1v1h-1zM2 16h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM8 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM13 16h1v1h-1zM14 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM20 16h1v1h-1zM22 16h1v1h-1zM24 16h1v1h-1zM25 16h1v1h-1zM26 16h1v1h-1zM28 16h1v1h-1zM31 16h1v1h-1zM36 16h1v1h-1zM37 16h1v1h-1zM38 16h1v1h-1zM39 16h1v1h-1zM41 16h1v1h-1zM42 16h1v1h-1zM2 17h1v1h-1zM3 17h1v1h-1zM10 17h1v1h-1zM11 17h1v1h-1zM18 17h1v1h-1zM19 17h1v1h-1zM20 17h1v1h-1zM21 17h1v1h-1zM23 17h1v1h-1zM24 17h1v1h-1zM27 17h1v1h-1zM28 17h1v1h-1zM29 17h1v1h-1zM31 17h1v1h-1zM32 17h1v1h-1zM36 17h1v1h-1zM41 17h1v1h-1zM42 17h1v1h-1zM2 18h1v1h-1zM3 18h1v1h-1zM4 18h1v1h-1zM5 18h1v1h-1zM8 18h1v1h-1zM9 18h1v1h-1zM10 18h1v1h-1zM15 18h1v1h-1zM19 18h1v1h-1zM21 18h1v1h-1zM24 18h1v1h-1zM29 18h1v1h-1zM33 18h1v1h-1zM37 18h1v1h-1zM41 18h1v1h-1zM5 19h1v1h-1zM10 19h1v1h-1zM15 19h1v1h-1zM16 19h1v1h-1zM17 19h1v1h-1zM18 19h1v1h-1zM20 19h1v1h-1zM21 19h1v1h-1zM25 19h1v1h-1zM27 19h1v1h-1zM30 19h1v1h-1zM34 19h1v1h-1zM36 19h1v1h-1zM37 19h1v1h-1zM39 19h1v1h-1zM41 19h1v1h-1zM42 19h1v1h-1zM4 20h1v1h-1zM7 20h1v1h-1zM8 20h1v1h-1zM9 20h1v1h-1zM12 20h1v1h-1zM13 20h1v1h-1zM15 20h1v1h-1zM17 20h1v1h-1zM20 20h1v1h-1zM22 20h1v1h-1zM23 20h1v1h-1zM27 20h1v1h-1zM30 20h1v1h-1zM32 20h1v1h-1zM35 20h1v1h-1zM38 20h1v1h-1zM41 20h1v1h-1zM42 20h1v1h-1zM4 21h1v1h-1zM6 21h1v1h-1zM7 21h1v1h-1zM10 21h1v1h-1zM12 21h1v1h-1zM16 21h1v1h-1zM19 21h1v1h-1zM20 21h1v1h-1zM21 21h1v1h-1zM22 21h1v1h-1zM24 21h1v1h-1zM28 21h1v1h-1zM30 21h1v1h-1zM31 21h1v1h-1zM32 21h1v1h-1zM33 21h1v1h-1zM34 21h1v1h-1zM37 21h1v1h-1zM41 21h1v1h-1zM2 22h1v1h-1zM4 22h1v1h-1zM6 22h1v1h-1zM8 22h1v1h-1zM11 22h1v1h-1zM12 22h1v1h-1zM13 22h1v1h-1zM15 22h1v1h-1zM17 22h1v1h-1zM18 22h1v1h-1zM19 22h1v1h-1zM20 22h1v1h-1zM25 22h1v1h-1zM27 22h1v1h-1zM28 22h1v1h-1zM29 22h1v1h-1zM32 22h1v1h-1zM34 22h1v1h-1zM35 22h1v1h-1zM36 22h1v1h-1zM38 22h1v1h-1zM39 22h1v1h-1zM40 22h1v1h-1zM42 22h1v1h-1zM3 23h1v1h-1zM5 23h1v1h-1zM6 23h1v1h-1zM7 23h1v1h-1zM12 23h1v1h-1zM14 23h1v1h-1zM15 23h1v1h-1zM18 23h1v1h-1zM19 23h1v1h-1zM20 23h1v1h-1zM22 23h1v1h-1zM26 23h1v1h-1zM29 23h1v1h-1zM30 23h1v1h-1zM35 23h1v1h-1zM36 23h1v1h-1zM40 23h1v1h-1zM41 23h1v1h-1zM42 23h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM7 24h1v1h-1zM8 24h1v1h-1zM10 24h1v1h-1zM13 24h1v1h-1zM14 24h1v1h-1zM16 24h1v1h-1zM17 24h1v1h-1zM19 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1zM26 24h1v1h-1zM31 24h1v1h-1zM33 24h1v1h-1zM35 24h1v1h-1zM38 24h1v1h-1zM39 24h1v1h-1zM40 24h1v1h-1zM41 24h1v1h-1zM3 25h1v1h-1zM4 25h1v1h-1zM12 25h1v1h-1zM13 25h1v1h-1zM16 25h1v1h-1zM18 25h1v1h-1zM22 25h1v1h-1zM23 25h1v1h-1zM25 25h1v1h-1zM26 25h1v1h-1zM27 25h1v1h-1zM29 25h1v1h-1zM32 25h1v1h-1zM35 25h1v1h-1zM37 25h1v1h-1zM39 25h1v1h-1zM40 25h1v1h-1zM42 25h1v1h-1zM3 26h1v1h-1zM4 26h1v1h-1zM8 26h1v1h-1zM9 26h1v1h-1zM10 26h1v1h-1zM11 26h1v1h-1zM13 26h1v1h-1zM16 26h1v1h-1zM17 26h1v1h-1zM18 26h1v1h-1zM19 26h1v1h-1zM22 26h1v1h-1zM23 26h1v1h-1zM26 26h1v1h-1zM27 26h1v1h-1zM30 26h1v1h-1zM31 26h1v1h-1zM33 26h1v1h-1zM34 26h1v1h-1zM35 26h1v1h-1zM36 26h1v1h-1zM42 26h1v1h-1zM3 27h1v1h-1zM4 27h1v1h-1zM5 27h1v1h-1zM7 27h1v1h-1zM9 27h1v1h-1zM11 27h1v1h-1zM12 27h1v1h-1zM13 27h1v1h-1zM14 27h1v1h-1zM15 27h1v1h-1zM19 27h1v1h-1zM21 27h1v1h-1zM22 27h1v1h-1zM23 27h1v1h-1zM24 27h1v1h-1zM26 27h1v1h-1zM30 27h1v1h-1zM31 27h1v1h-1zM33 27h1v1h-1zM36 27h1v1h-1zM39 27h1v1h-1zM41 27h1v1h-1zM2 28h1v1h-1zM8 28h1v1h-1zM11 28h1v1h-1zM14 28h1v1h-1zM20 28h1v1h-1zM22 28h1v1h-1zM23 28h1v1h-1zM24 28h1v1h-1zM25 28h1v1h-1zM27 28h1v1h-1zM31 28h1v1h-1zM32 28h1v1h-1zM34 28h1v1h-1zM37 28h1v1h-1zM38 28h1v1h-1zM41 28h1v1h-1zM42 28h1v1h-1zM3 29h1v1h-1zM10 29h1v1h-1zM11 29h1v1h-1zM12 29h1v1h-1zM14 29h1v1h-1zM15 29h1v1h-1zM17 29h1v1h-1zM18 29h1v1h-1zM19 29h1v1h-1zM20 29h1v1h-1zM22 29h1v1h-1zM23 29h1v1h-1zM26 29h1v1h-1zM27 29h1v1h-1zM28 29h1v1h-1zM31 29h1v1h-1zM32 29h1v1h-1zM34 29h1v1h-1zM35 29h1v1h-1zM37 29h1v1h-1zM6 30h1v1h-1zM8 30h1v1h-1zM9 30h1v1h-1zM10 30h1v1h-1zM11 30h1v1h-1zM14 30h1v1h-1zM15 30h1v1h-1zM19 30h1v1h-1zM22 30h1v1h-1zM23 30h1v1h-1zM35 30h1v1h-1zM41 30h1v1h-1zM42 30h1v1h-1zM6 31h1v1h-1zM7 31h1v1h-1zM14 31h1v1h-1zM15 31h1v1h-1zM16 31h1v1h-1zM18 31h1v1h-1zM21 31h1v1h-1zM24 31h1v1h-1zM25 31h1v1h-1zM26 31h1v1h-1zM27 31h1v1h-1zM28 31h1v1h-1zM30 31h1v1h-1zM31 31h1v1h-1zM36 31h1v1h-1zM37 31h1v1h-1zM39 31h1v1h-1zM40 31h1v1h-1zM41 31h1v1h-1zM2 32h1v1h-1zM4 32h1v1h-1zM6 32h1v1h-1zM8 32h1v1h-1zM9 32h1v1h-1zM11 32h1v1h-1zM19 32h1v1h-1zM21 32h1v1h-1zM22 32h1v1h-1zM23 32h1v1h-1zM30 32h1v1h-1zM31 32h1v1h-1zM37 32h1v1h-1zM39 32h1v1h-1zM41 32h1v1h-1zM42 32h1v1h-1zM4 33h1v1h-1zM5 33h1v1h-1zM6 33h1v1h-1zM10 33h1v1h-1zM16 33h1v1h-1zM18 33h1v1h-1zM19 33h1v1h-1zM21 33h1v1h-1zM22 33h1v1h-1zM23 33h1v1h-1zM24 33h1v1h-1zM26 33h1v1h-1zM28 33h1v1h-1zM31 33h1v1h-1zM33 33h1v1h-1zM35 33h1v1h-1zM38 33h1v1h-1zM41 33h1v1h-1zM2 34h1v1h-1zM4 34h1v1h-1zM6 34h1v1h-1zM8 34h1v1h-1zM12 34h1v1h-1zM17 34h1v1h-1zM18 34h1v1h-1zM20 34h1v1h-1zM21 34h1v1h-1zM22 34h1v1h-1zM23 34h1v1h-1zM26 34h1v1h-1zM27 34h1v1h-1zM31 34h1v1h-1zM34 34h1v1h-1zM35 34h1v1h-1zM36 34h1v1h-1zM37 34h1v1h-1zM38 34h1v1h-1zM40 34h1v1h-1zM41 34h1v1h-1zM42 34h1v1h-1zM10 35h1v1h-1zM15 35h1v1h-1zM16 35h1v1h-1zM18 35h1v1h-1zM22 35h1v1h-1zM23 35h1v1h-1zM24 35h1v1h-1zM26 35h1v1h-1zM27 35h1v1h-1zM28 35h1v1h-1zM30 35h1v1h-1zM33 35h1v1h-1zM34 35h1v1h-1zM38 35h1v1h-1zM39 35h1v1h-1zM42 35h1v1h-1zM2 36h1v1h-1zM3 36h1v1h-1zM4 36h1v1h-1zM5 36h1v1h-1zM6 36h1v1h-1zM7 36h1v1h-1zM8 36h1v1h-1zM11 36h1v1h-1zM12 36h1v1h-1zM15 36h1v1h-1zM16 36h1v1h-1zM19 36h1v1h-1zM21 36h1v1h-1zM22 36h1v1h-1zM26 36h1v1h-1zM30 36h1v1h-1zM31 36h1v1h-1zM34 36h1v1h-1zM36 36h1v1h-1zM38 36h1v1h-1zM40 36h1v1h-1zM41 36h1v1h-1zM2 37h1v1h-1zM8 37h1v1h-1zM10 37h1v1h-1zM12 37h1v1h-1zM13 37h1v1h-1zM14 37h1v1h-1zM16 37h1v1h-1zM18 37h1v1h-1zM19 37h1v1h-1zM21 37h1v1h-1zM22 37h1v1h-1zM23 37h1v1h-1zM24 37h1v1h-1zM27 37h1v1h-1zM28 37h1v1h-1zM32 37h1v1h-1zM34 37h1v1h-1zM38 37h1v1h-1zM39 37h1v1h-1zM40 37h1v1h-1zM42 37h1v1h-1zM2 38h1v1h-1zM4 38h1v1h-1zM5 38h1v1h-1zM6 38h1v1h-1zM8 38h1v1h-1zM11 38h1v1h-1zM12 38h1v1h-1zM13 38h1v1h-1zM14 38h1v1h-1zM17 38h1v1h-1zM18 38h1v1h-1zM24 38h1v1h-1zM25 38h1v1h-1zM26 38h1v1h-1zM27 38h1v1h-1zM29 38h1v1h-1zM31 38h1v1h-1zM34 38h1v1h-1zM35 38h1v1h-1zM36 38h1v1h-1zM37 38h1v1h-1zM38 38h1v1h-1zM39 38h1v1h-1zM41 38h1v1h-1zM2 39h1v1h-1zM4 39h1v1h-1zM5 39h1v1h-1zM6 39h1v1h-1zM8 39h1v1h-1zM10 39h1v1h-1zM15 39h1v1h-1zM17 39h1v1h-1zM22 39h1v1h-1zM23 39h1v1h-1zM25 39h1v1h-1zM26 39h1v1h-1zM27 39h1v1h-1zM31 39h1v1h-1zM32 39h1v1h-1zM34 39h1v1h-1zM35 39h1v1h-1zM36 39h1v1h-1zM38 39h1v1h-1zM39 39h1v1h-1zM40 39h1v1h-1zM41 39h1v1h-1zM2 40h1v1h-1zM4 40h1v1h-1zM5 40h1v1h-1zM6 40h1v1h-1zM8 40h1v1h-1zM13 40h1v1h-1zM14 40h1v1h-1zM15 40h1v1h-1zM16 40h1v1h-1zM18 40h1v1h-1zM19 40h1v1h-1zM22 40h1v1h-1zM23 40h1v1h-1zM24 40h1v1h-1zM25 40h1v1h-1zM26 40h1v1h-1zM27 40h1v1h-1zM28 40h1v1h-1zM32 40h1v1h-1zM34 40h1v1h-1zM38 40h1v1h-1zM39 40h1v1h-1zM41 40h1v1h-1zM42 40h1v1h-1zM2 41h1v1h-1zM8 41h1v1h-1zM12 41h1v1h-1zM13 41h1v1h-1zM14 41h1v1h-1zM15 41h1v1h-1zM16 41h1v1h-1zM22 41h1v1h-1zM23 41h1v1h-1zM24 41h1v1h-1zM25 41h1v1h-1zM26 41h1v1h-1zM27 41h1v1h-1zM28 41h1v1h-1zM29 41h1v1h-1zM31 41h1v1h-1zM32 41h1v1h-1zM33 41h1v1h-1zM34 41h1v1h-1zM37 41h1v1h-1zM41 41h1v1h-1zM2 42h1v1h-1zM3 42h1v1h-1zM4 42h1v1h-1zM5 42h1v1h-1zM6 42h1v1h-1zM7 42h1v1h-1zM8 42h1v1h-1zM10 42h1v1h-1zM11 42h1v1h-1zM12 42h1v1h-1zM13 42h1v1h-1zM15 42h1v1h-1zM16 42h1v1h-1zM20 42h1v1h-1zM21 42h1v1h-1zM22 42h1v1h-1zM23 42h1v1h-1zM24 42h1v1h-1zM26 42h1v1h-1zM29 42h1v1h-1zM30 42h1v1h-1zM31 42h1v1h-1zM33 42h1v1h-1zM34 42h1v1h-1zM35 42h1v1h-1zM37 42h1v1h-1zM38 42h1v1h-1zM40 42h1v1h-1zM41 42h1v1h-1z"/></svg>';
const CHANGELOG = [
  { v: '1.6', date: 'Nov 16, 2026', notes: ['Change any player’s boost during a game: press Boost at the bottom left.', 'Sports games: pick a level from 1 to 5 before you start, or climb through all of them. Each choice has its own leaderboard.', 'The game-over screen no longer reacts to a click that only wakes the mouse. Move onto a button first.'] },
  { v: '1.5.1', date: 'Nov 15, 2026', notes: ['Side targets are much easier to hit. Shot direction now matches what you see on your screen. Set your screen width and distance in Settings > Aiming.', 'The shot numbers after each shot include the direction your launch monitor read.'] },
  { v: '1.5', date: 'Nov 14, 2026', notes: ['New Sports collection: Slapshot, Hoop Shots, Quarterback and Home Run Derby. Each has five levels; score on 2 of 3 shots to move up.', 'Every player now has their own boost slider.', 'Music can be changed from inside any game, with three tunes to choose from.', 'Ferris Frenzy gondolas show their points again, and the hit area is a little tighter.', 'A Ball ready light appears when your launch monitor reports it (needs the newest program).'] },
  { v: '1.4', date: 'Nov 14, 2026', notes: ['New Help section: getting started, connecting with rēlā or any GSPro-compatible sender, what each setting does, and troubleshooting.', 'The connection pill on the player screen links to the setup help.'] },
  { v: '1.3.1', date: 'Nov 14, 2026', notes: ['Suggestions now go to an online form: scan the code with your phone or open it on the PC. Nothing is stored on the PC.'] },
  { v: '1.3', date: 'Nov 14, 2026', notes: ['Junior boost is now a slider, and goes higher.', 'Ferris Frenzy is much easier to hit, and the wheel itself scores 25.', 'Capture the Flag: rooftops no longer flicker, and a ball can no longer get stuck between buildings.', 'Mini golf: higher camera, and the windmill fades when it blocks your view.', 'Leaderboards for this session and for all time.', 'What’s new and Suggestions screens. The program no longer leaves a window open.'] },
  { v: '1.2', date: 'Nov 13, 2026', notes: ['Menu grouped into Carnival, Mini Golf and Clubhouse, with no scrolling.', 'Much louder sound effects, plus crowd, background sounds and music.', 'Shots play at full speed on slower PCs, and a quick second shot is no longer ignored.', 'The result notice clears before the next shot.'] },
  { v: '1.1', date: 'Nov 13, 2026', notes: ['Three mini golf courses: Pirate Cove, Windmill Meadows and Neon Nights.', 'Capture the Flag moved to night rooftops.', 'Yardages in every game.', 'New graphics: glow, reflections and sharper shadows.'] },
  { v: '1.0', date: 'Nov 13, 2026', notes: ['First version with eight games: Barrel Blast, Mole Patrol, Ferris Frenzy, Dunk Derby, Bullseye, Closest to the Pin, Capture the Flag and Skyline Drive.', 'Up to six players, Junior boost and leaderboards.'] }
];
const api = (p, body) => location.protocol === 'http:' ? fetch(p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined).then(r => r.json()) : Promise.reject(new Error('no relay'));
const updText = i => !i ? 'updates need the Clubhouse Arcade program' : i.update === 'off' ? 'automatic updates are not set up yet' : i.update === 'installed' || App.update ? 'an update is downloaded. Restart to use it' : i.update === 'error' ? i.updateError : i.update === 'checking' ? 'checking for updates' : 'up to date';
const topNav = () => `<nav>${App.update ? '<button class="btn go sm" type="button" data-a="reload">Update ready · Restart</button>' : ''}<button class="btn" type="button" data-a="boards">Leaderboards</button><button class="btn" type="button" data-a="news">What’s new</button><button class="btn" type="button" data-a="sugg">Suggestions</button><button class="btn" type="button" data-a="help">Help</button><button class="btn" type="button" data-a="settings">Settings</button><button class="btn" type="button" data-a="full">Full screen</button></nav>`;
function newsHTML() {
  const i = App.info;
  return `<div class="screen fit"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="home">Back to games</button><div class="crumb">${i && i.update !== 'off' ? '<button class="btn" type="button" data-a="chk">Check for updates</button>' : ''}${App.update ? '<button class="btn go sm" type="button" data-a="reload">Restart with the update</button>' : ''}<h1 class="cat-h">What’s new<small>You have version ${VERSION} · ${esc(updText(i))}</small></h1></div></header>
  <div class="box sets news">${CHANGELOG.slice(0, 4).map(c => `<section><h3>Version ${c.v} · ${c.date}</h3><ul class="how">${c.notes.map(n => `<li>${n}</li>`).join('')}</ul></section>`).join('')}</div></div></div>`;
}
const RELA = { guide: 'https://docs.rela.golf/rela/user-guide/', install: 'https://docs.rela.golf/rela/installation/', faq: 'https://docs.rela.golf/rela/faq/', discord: 'https://discord.gg/mXJayKrv4H' };
const lnk = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
const HELP = [
  { id: 'start', t: 'Getting started', s: [
    { h: 'Play a game', ol: ['Pick Carnival, Mini Golf or Clubhouse, then a game.', 'Add up to six players. Click a coloured dot to change a player’s colour.', 'Choose a game length and click <b>Tee off</b>.', 'Hit when the banner shows your name. The result and your shot numbers appear after each shot.'] },
    { h: 'No launch monitor?', ul: ['Press <b>T</b> in a game to show the test pad, then click it to hit. Left and right aim, higher is harder.', 'Press <b>Space</b> for a random shot.', 'The pill at the bottom right says <b>Demo mode</b> until a launch monitor connects.'] },
    { h: 'Younger players', ul: ['Each player has a <b>boost</b> slider beside their name. It multiplies ball speed, from no boost up to 3.5 times. You can change it during a game from the <b>Boost</b> button or the pause menu.', 'Set it per player: a small child might need ×3, an older one ×1.5.', 'Boost is not used in mini golf.'] },
    { h: 'Keys', ul: ['<b>Esc</b> pause or go back · <b>F</b> full screen', '<b>T</b> test pad · <b>Space</b> random test shot', '<b>Left</b> and <b>Right</b> aim in mini golf (hold Shift for fine steps)'] }
  ] },
  { id: 'rela', t: 'Connect with rēlā', s: [
    { h: 'What rēlā is', p: `rēlā is a separate Windows program that connects many launch monitors to simulator software. Clubhouse Arcade accepts the same shot format as GSPro, so in rēlā you choose <b>GSPro</b>. Read more: ${lnk(RELA.guide, 'User guide')} · ${lnk(RELA.install, 'Installation')} · ${lnk(RELA.faq, 'FAQ')} · ${lnk(RELA.discord, 'Discord help')}` },
    { h: 'Set it up once', ol: ['Install your launch monitor’s own software and check it reads shots there.', `Install rēlā (${lnk(RELA.install, 'installation steps')}). In the installer, tick your launch monitor and select <b>GSPro</b> as a simulator output.`, 'In rēlā, set <b>Device</b> to your launch monitor and <b>Simulator</b> to <b>GSPro</b>. Do not choose Other for the simulator.'] },
    { h: 'Each time you play', ol: ['Close GSPro if it is open. It uses the same port.', 'Turn on the launch monitor and start Clubhouse Arcade.', 'In rēlā, click <b>Search</b> under Device. rēlā connects to the arcade by itself once the launch monitor is found.', 'If the pill in a game is not green, click <b>Connect</b> under Simulator in rēlā.'] },
    { h: 'Good to know', ul: ['To keep GSPro open as well, open rēlā’s Settings, find <b>Simulator Connection</b> and set the port to <b>9210</b>. Set it back to 921 for GSPro.', 'rēlā’s documents name SkyTrak, Foresight GC2, FlightScope, GolfJoy, Mevo+, Square, Nova, Garmin R10 and Full Swing KIT. Check its guide for the current list.', 'Not listed? rēlā’s <b>Other</b> device option uses a plugin made for that launch monitor. See its guide.'] }
  ] },
  { id: 'other', t: 'Other ways to connect', s: [
    { h: 'Anything that can send to GSPro', p: 'Clubhouse Arcade listens for GSPro Open Connect shots. If your launch monitor’s software or a connector app has a GSPro option, point it here instead of at GSPro.' },
    { h: 'The numbers to enter', ul: ['Address: <b>127.0.0.1</b> (the same PC)', 'Port: <b>921</b> with GSPro closed, or <b>9210</b> at any time', 'From another PC on your network, use the simulator PC’s own address and allow the program through Windows Firewall.'] },
    { h: 'Check the link without swinging', ol: ['Start a game so it is waiting for a shot.', 'Open a second browser tab and go to <b>localhost:8080/test?speed=95&amp;vla=22</b>', 'A ball should fly in the game. If it does, the arcade is working and the problem is before it.'] },
    { h: 'What the arcade uses', ul: ['Ball speed, launch angle, direction, spin and spin axis.', 'Club data is ignored.', 'Mini golf uses only ball speed and direction, so a putt or a chip both work.'] }
  ] },
  { id: 'settings', t: 'Settings', s: [
    { h: 'Sound and picture', ul: ['<b>Volume</b>: Off, Low, Medium or High. Sound starts after your first click.', '<b>Music</b>: the menu and carnival tune, and the Neon Nights track.', '<b>Graphics</b>: High adds glow, reflections and smoother edges. Choose Low if the picture stutters.'] },
    { h: 'Shots', ul: ['<b>Baseball timing</b>: tells Home Run Derby how long your launch monitor takes to report a shot.', '<b>Mini golf power</b>: raise it if your launch monitor only reads firmer putts.', '<b>Test shot pad</b>: Auto shows it only when no launch monitor is connected.'] },
    { h: 'Aiming', ul: ['<b>Match my screen</b> sends the ball where it appears to go on your screen, so side targets are hit at the angle you see.', 'Enter your real screen width and the distance from the ball to the screen. If side shots still land too wide, increase the screen width a little; if they land short of the side, decrease it.', 'Mini golf uses its own aim arrows instead.'] },
    { h: 'Connection', ul: ['<b>Launch monitor relay</b>: leave blank. It is only for running the games page from a different address than the program.'] },
    { h: 'Sports levels', ul: ['Before a sports game, choose <b>Climb all levels</b> or one level from 1 to 5.', 'Climbing: everyone starts at level 1, and scoring on 2 of 3 shots moves you up next turn. Points are multiplied by your level.', 'Each level choice has its own leaderboard.'] },
    { h: 'Scores', ul: ['Leaderboards show <b>This session</b> and <b>All time</b> for each game and length.', 'All-time scores are kept in this browser on this PC.', '<b>Clear all leaderboards</b> removes both.'] }
  ] },
  { id: 'fix', t: 'Troubleshooting', s: [
    { h: 'The pill at the bottom right', ul: ['<b>Red, Demo mode</b>: the page cannot reach the program. Start ClubhouseArcade.exe and use the page it opens.', '<b>Yellow, Relay ready</b>: the program is running but no launch monitor has connected.', '<b>Green</b>: connected. After a shot it also shows how long the shot took to reach the screen.'] },
    { h: 'Stays yellow', ul: ['Close GSPro, or use port 9210.', 'Check the address is 127.0.0.1 and the simulator is set to GSPro.', 'Connect the launch monitor first, then the simulator.', 'Allow the program if Windows Firewall asks.'] },
    { h: 'Shots feel late or the picture stutters', ul: ['If the pill shows a small number (under about 50 ms), the wait is in the launch monitor or connector, not the arcade.', 'Set Graphics to Low. The arcade also lowers its own resolution when the PC struggles.'] },
    { h: 'No sound, or nothing opens', ul: ['Click anywhere once, check Volume in Settings, and check which speaker Windows is using.', 'If the program opens nothing, run <b>ClubhouseArcade.exe --window</b> from a Command Prompt to see why.', 'A log is kept in <b>%LOCALAPPDATA%\\ClubhouseArcade\\log.txt</b>.'] }
  ] }
];
function helpHTML() {
  const h = HELP.find(x => x.id === App.helpTab) || HELP[0];
  return `<div class="screen fit"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="home">Back to games</button><h1 class="cat-h">Help</h1></header><div class="stack">
  <div class="seg">${HELP.map(x => `<button type="button" data-a="help" data-id="${x.id}" class="${x.id === h.id ? 'on' : ''}">${x.t}</button>`).join('')}</div>
  <div class="box sets help">${h.s.map(c => `<section><h3>${c.h}</h3>${c.p ? `<p>${c.p}</p>` : ''}${c.ol ? `<ol>${c.ol.map(l => `<li>${l}</li>`).join('')}</ol>` : ''}${c.ul ? `<ul>${c.ul.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}</section>`).join('')}</div></div></div></div>`;
}
function suggHTML() {
  return `<div class="screen fit"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="home">Back to games</button><h1 class="cat-h">Suggestions<small>Ideas for new games, fixes, anything.</small></h1></header><div class="setup">
  <div class="box sgq">${FEEDBACK_QR}<div><h2>Scan with your phone</h2><p class="note">Point your phone’s camera at the code to open the suggestion form. It is the easiest way to type an idea from the hitting bay.</p></div></div>
  <div class="box"><h2>Or open it here</h2><p class="note">The form opens in a new browser tab on this PC. Your idea goes straight to the arcade’s owner. Nothing is saved on this PC.</p><a class="btn go" href="${FEEDBACK_URL}" target="_blank" rel="noopener" style="justify-self:start;text-decoration:none">Open the suggestion form</a><p class="note">Pick a category in the form: General, Carnival Games, Mini Golf or Clubhouse.</p></div></div></div></div>`;
}
function homeHTML() {
  return `<div class="screen fit"><div class="wrap"><header class="top"><h1 class="logo"><span>Clubhouse</span>Arcade</h1>${topNav()}</header>
  <div class="cats" style="--n:${CATS.length}">${CATS.map((c, i) => { const G = GAMES.filter(g => g.group === c.id); return `<button class="cat ${c.id}" type="button" data-a="cat" data-id="${c.id}" ${i ? '' : 'data-focus'}><div class="mos">${G.slice(0, 4).map((g, k) => `<img class="${G.length === 3 && k === 0 ? 'w' : ''}" src="${App.thumbs[g.id] || ''}" alt="">`).join('')}</div><div class="cat-t"><b>${c.name}</b><span>${c.blurb}</span><em>${G.length} games · ${G.map(g => g.name).join(' · ')}</em></div></button>`; }).join('')}</div></div><span class="ver">Version ${VERSION}</span></div>`;
}
function catHTML() {
  const c = CATS.find(x => x.id === App.cat) || CATS[0], G = GAMES.filter(g => g.group === c.id);
  return `<div class="screen fit"><div class="wrap"><header class="top"><div class="crumb"><button class="btn" type="button" data-a="home">All games</button><h1 class="cat-h ${c.id}">${c.name}<small>${c.blurb}</small></h1></div>${topNav()}</header>
  <div class="cards ${c.id}" style="--n:${G.length}">${G.map((d, i) => `<button class="card" type="button" data-a="pick" data-id="${d.id}" ${i ? '' : 'data-focus'}><img src="${App.thumbs[d.id] || ''}" alt=""><div><b>${d.name}</b><span>${d.tag}</span><em>${best(d)}</em></div></button>`).join('')}</div></div></div>`;
}
function playersHTML() {
  const P = Store.d.players;
  return P.map((p, i) => `<div class="prow"><button class="dot" type="button" style="--pc:${PCOL[p.c]}" data-a="col" data-i="${i}" aria-label="Change colour"></button><input id="pn${i}" data-i="${i}" maxlength="14" value="${esc(p.name)}" aria-label="Player ${i + 1} name"><label class="pb" title="Boost"><input type="range" id="pb${i}" data-i="${i}" min="1" max="3.5" step="0.1" value="${p.b || 1}" aria-label="Boost for player ${i + 1}"><b>${(p.b || 1) > 1 ? '×' + p.b.toFixed(1) : 'No boost'}</b></label><button class="x" type="button" data-a="del" data-i="${i}" aria-label="Remove player" ${P.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('') + (P.length < 6 ? `<button class="btn sm" type="button" data-a="add" style="justify-self:start">Add player</button>` : '');
}
function setupHTML() {
  const d = App.pick, n = Store.d.players.length, li = lenOf(d), shots = d.rounds[li] * d.spt;
  return `<div class="screen fit"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="cat" data-id="${d.group}">Back to ${CATS.find(c => c.id === d.group).name}</button></header><div class="setup">
  <div class="box"><img class="poster" src="${App.thumbs[d.id] || ''}" alt=""><h2>${d.name}</h2><ul class="how">${d.how.map(h => `<li>${h}</li>`).join('')}</ul></div>
  <div class="box"><h3>Players</h3><div id="plist" style="display:grid;gap:.6em">${playersHTML()}</div>${isSport(d) ? '' : `<p class="note">${d.putt ? 'Boost is not used in mini golf.' : 'Each player has a boost slider. It multiplies ball speed, so shorter hitters can reach the far targets.'}</p>`}
  ${isSport(d) ? `<h3>Level</h3><div class="seg">${LV_NAMES.map((n, i) => `<button type="button" data-a="slv" data-i="${i}" class="${i === Store.d.sportLv ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}<h3>Game length</h3><div class="seg">${d.rounds.map((_, i) => `<button type="button" data-a="len" data-i="${i}" class="${i === li ? 'on' : ''}">${lenName(d, i)}</button>`).join('')}</div><p class="note" id="lenNote">${isSport(d) ? (Store.d.sportLv ? 'Level ' + Store.d.sportLv + ' for every shot · ' : 'Start at level 1, score on 2 of 3 to move up · ') : ''}${d.putt ? d.rounds[li] + ' holes. Everyone plays each hole out before the next player putts.' : shots + ' shot' + (shots > 1 ? 's' : '') + ' each, ' + shots * n + ' in total.'}</p>
  <div class="row"><span style="display:flex;flex-wrap:wrap;gap:.6em;align-items:center"><span class="chip pill ${['', 'mid', 'ok'][App.conn]}">${connText()}</span><button class="btn sm" type="button" data-a="help" data-id="rela">How to connect</button></span><button class="btn go" type="button" data-a="go" data-focus>Tee off</button></div></div></div></div></div>`;
}
function resultsHTML() {
  const def = App.match.def, R = App.rows, tie = R.length > 1 && R[0].s === R[1].s, ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  return `<div class="screen"><div class="center"><div class="res"><h2><small>${def.name} · ${lenName(def, App.match.len)}${isSport(def) ? ' · ' + LV_NAMES[App.match.level || 0] : ''}</small>${R.length === 1 ? 'Round complete' : tie ? 'It’s a tie!' : esc(R[0].name) + ' wins!'}</h2>
  <ol class="rank">${R.map((r, i) => `<li style="--pc:${PCOL[r.c]}"><span>${ord[i]}</span><i></i><span>${esc(r.name)}${r.rec ? '<em>All-time record</em>' : r.srec ? '<em>Session best</em>' : ''}</span><b>${fmtScore(def, r.s)} ${def.fmt ? '' : def.unit}</b></li>`).join('')}</ol>
  <div class="row" style="justify-content:center"><button class="btn go" type="button" data-a="again" data-focus>Play again</button><button class="btn" type="button" data-a="home">Choose a game</button><button class="btn" type="button" data-a="boards">Leaderboards</button></div><p class="note res-hint" id="resHint" hidden>Move the mouse onto a button, then click.</p></div></div></div>`;
}
function boardsHTML() {
  const d = byId(App.tab) || GAMES[0], li = lenOf(d), ses = App.bview === 'session', blv = isSport(d) ? Store.d.sportLv : 0, b = (ses ? Sess.d : Store.d.boards)[bkey(d, li, blv)] || [];
  return `<div class="screen fit boards"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="home">Back to games</button><h1 class="logo" style="font-size:calc(var(--u)*3)"><span>Clubhouse Arcade</span>Leaderboards</h1></header><div class="stack">
  <div class="seg">${GAMES.map(g => `<button type="button" data-a="tab" data-id="${g.id}" class="${g.id === d.id ? 'on' : ''}">${g.name}</button>`).join('')}</div>
  <div class="box">${isSport(d) ? `<div class="seg">${LV_NAMES.map((n, i) => `<button type="button" data-a="blv" data-i="${i}" class="${i === blv ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}<div class="row"><h2>${d.name}</h2><div class="seg"><button type="button" data-a="bview" data-v="session" class="${ses ? 'on' : ''}">This session</button><button type="button" data-a="bview" data-v="all" class="${ses ? '' : 'on'}">All time</button>${ses ? '<button type="button" data-a="newsess">Start a new session</button>' : ''}</div><div class="seg">${d.rounds.map((_, i) => `<button type="button" data-a="blen" data-i="${i}" class="${i === li ? 'on' : ''}">${lenName(d, i)}</button>`).join('')}</div></div>
  ${b.length ? `<div style="overflow-x:auto"><table class="tbl"><tr><th>Rank</th><th>Player</th><th>Date</th><th>${d.lower ? 'Total distance' : 'Score'}</th></tr>${b.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.n)}</td><td>${r.d}</td><td>${fmtScore(d, r.s)} ${d.fmt ? '' : d.unit}</td></tr>`).join('')}</table></div>` : `<p class="note">No ${lenName(d, li).toLowerCase()} games of ${d.name} finished ${ses ? 'this session' : 'yet'}. Play one and the top ten will show here.</p>`}</div></div></div></div>`;
}
function settingsHTML() {
  const s = Store.d, seg = (a, opts, cur) => `<div class="seg">${opts.map(o => `<button type="button" data-a="${a}" data-v="${o[0]}" class="${String(o[0]) === String(cur) ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`;
  return `<div class="screen fit"><div class="wrap"><header class="top"><button class="btn" type="button" data-a="home">Back to games</button><h1 class="cat-h">Settings</h1></header><div class="box sets">
  <section><h3>Volume</h3>${seg('vol', [[0, 'Off'], [.5, 'Low'], [1, 'Medium'], [1.7, 'High']], s.vol)}</section><section><h3>Music</h3>${tuneSeg()}
  </section><section><h3>Graphics</h3>${seg('gfx', [['high', 'High'], ['low', 'Low']], s.gfx)}<p class="note">High adds glow, reflections and smoother edges. Choose Low if the picture stutters.</p>
  </section><section><h3>Mini golf power</h3>${seg('putt', [[.7, 'Soft'], [1, 'Normal'], [1.4, 'Strong'], [2, 'Extra']], s.putt)}<p class="note">Raise this if your launch monitor only picks up firmer putts.</p>
  </section><section><h3>Aiming</h3>${seg('aimOn', [[1, 'Match my screen'], [0, 'Off']], s.aim.on ? 1 : 0)}<label class="rng" for="aimW"><span>Screen width</span><input type="range" id="aimW" min="5" max="20" step="0.5" value="${s.aim.w}"><b class="av">${s.aim.w} ft</b></label><label class="rng" for="aimD"><span>Ball to screen</span><input type="range" id="aimD" min="5" max="25" step="0.5" value="${s.aim.d}"><b class="av">${s.aim.d} ft</b></label><p class="note" id="aimNote">${aimNote()}</p>
  </section><section><h3>Baseball timing</h3><label class="rng" for="bbLag"><span>Launch monitor delay</span><input type="range" id="bbLag" min="0" max="3" step="0.1" value="${s.bbLag}"><b class="lv">${s.bbLag.toFixed(1)} s</b></label><p class="note">If your launch monitor takes a moment to report a shot, set that delay here so the Home Run Derby meter is read at the moment you hit.</p>
  </section><section><h3>Test shot pad</h3>${seg('pad', [['null', 'Auto'], ['true', 'Always on'], ['false', 'Off']], String(s.pad))}<p class="note">Hit shots with the mouse. Auto shows it only when no relay is connected. T toggles it in a game.</p>
  </section><section><h3>Launch monitor relay</h3><div class="field"><label class="note" for="relay">Relay address. Leave blank when you open the arcade from the relay’s own page.</label><input id="relay" placeholder="ws://127.0.0.1:8080" value="${esc(s.relay || '')}"></div><span class="chip pill ${['', 'mid', 'ok'][App.conn]}" style="justify-self:start">${connText()}</span>
  </section><section><h3>Leaderboards</h3><button class="btn sm" type="button" data-a="wipe" style="justify-self:start">Clear all leaderboards</button></section></div></div></div>`;
}
const TUNE_NAMES = [['auto', 'Game’s own'], ['waltz', 'Fairground'], ['synth', 'Synth'], ['chill', 'Chill'], ['off', 'Off']];
const tuneSeg = () => `<div class="seg">${TUNE_NAMES.map(t => `<button type="button" data-a="mus" data-v="${t[0]}" class="${t[0] === Store.d.tune ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
function musPaint() { const t = TUNE_NAMES.find(x => x[0] === Store.d.tune) || TUNE_NAMES[0]; $('bMus').textContent = 'Music: ' + t[1]; }
const bTxt = b => b > 1 ? '×' + b.toFixed(1) : 'No boost';
function pauseHTML() { const m = App.match, putt = m && m.def.putt; return `<div class="screen" style="background:rgba(19,15,43,.82)"><div class="center"><div class="res" style="width:min(100%,760px)"><h2 style="font-size:calc(var(--u)*4.5)">Paused</h2><div class="box" style="text-align:left;gap:calc(var(--u)*.8)">${m && !putt ? `<h3>Boost</h3><div class="pzs">${m.players.map((p, i) => `<div class="prow pz"><span class="dot" style="--pc:${PCOL[p.c]}"></span><span class="pn">${esc(p.name)}</span><label class="pb"><input type="range" id="gb${i}" data-i="${i}" min="1" max="3.5" step="0.1" value="${p.b || 1}" aria-label="Boost for ${esc(p.name)}"><b>${bTxt(p.b || 1)}</b></label></div>`).join('')}</div>` : ''}<h3>Music</h3>${tuneSeg()}<h3>Volume</h3><div class="seg">${[[0, 'Off'], [.5, 'Low'], [1, 'Medium'], [1.7, 'High']].map(o => `<button type="button" data-a="vol" data-v="${o[0]}" class="${o[0] === Store.d.vol ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div><button class="btn go" type="button" data-a="resume" data-focus>Resume</button><button class="btn" type="button" data-a="skip">Skip this player</button><button class="btn" type="button" data-a="again">Restart game</button><button class="btn" type="button" data-a="home">Quit to games</button></div></div></div>`; }
function pause(on) { if (App.state !== 'play') return; App.paused = on; $('ui').innerHTML = on ? pauseHTML() : ''; if (on) $('ui').querySelector('[data-focus]').focus(); }
function goHome() { if (!App.def || App.def.id !== 'ferris' || App.match) { App.match = null; loadScene(byId('ferris')); App.game.beginTurn(); } Cam.home([16, 8, 14], [-2, 20, -64], true); setState('home'); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  if (App.state === 'results' && e.detail > 0 && (performance.now() < App.armT || App.moveD < 40)) { const h = $('resHint'); if (h) { h.hidden = false; h.classList.remove('nudge'); void h.offsetWidth; h.classList.add('nudge'); } return; }
  Snd.init(); Snd.tick(); const a = b.dataset.a, i = +b.dataset.i, P = Store.d.players;
  if (a === 'pick') { App.pick = byId(b.dataset.id); setState('setup'); }
  else if (a === 'cat') { if (App.match) goHome(); App.cat = b.dataset.id; setState('cat'); }
  else if (a === 'home') goHome();
  else if (a === 'news') { setState('news'); api('/api/info').then(i => { App.info = i; if (App.state === 'news') setState('news'); }).catch(() => { }); }
  else if (a === 'chk') { b.textContent = 'Checking…'; b.disabled = true; api('/api/check-update', {}).then(i => { App.info = i; if (i.update === 'installed') App.update = i.version; if (App.state === 'news') setState('news'); }).catch(() => { if (App.state === 'news') setState('news'); }); }
  else if (a === 'reload') location.reload();
  else if (a === 'sugg') setState('sugg');
  else if (a === 'help') { if (b.dataset.id) App.helpTab = b.dataset.id; setState('help'); }
  else if (a === 'boards') { App.tab = App.tab || (App.match && App.match.def.id) || GAMES[0].id; setState('boards'); }
  else if (a === 'settings') setState('settings');
  else if (a === 'full') { const d = document.documentElement; try { (document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen()).catch(() => { }); } catch (x) { } }
  else if (a === 'bview') { App.bview = b.dataset.v; setState('boards'); }
  else if (a === 'newsess') { if (b.dataset.sure) { Sess.d = {}; Sess.save(); setState('boards'); } else { b.dataset.sure = 1; b.textContent = 'Tap again to clear this session'; } }
  else if (a === 'tab') { App.tab = b.dataset.id; setState('boards'); }
  else if (a === 'blen') { Store.d.len = i; Store.save(); setState('boards'); }
  else if (a === 'slv') { Store.d.sportLv = i; Store.save(); setState('setup'); }
  else if (a === 'blv') { Store.d.sportLv = i; Store.save(); setState('boards'); }
  else if (a === 'len') { Store.d.len = i; Store.save(); setState('setup'); }
  else if (a === 'add') { const used = P.map(p => p.c), c = [0, 1, 2, 3, 4, 5].find(k => !used.includes(k)); P.push({ name: 'Player ' + (P.length + 1), c: c === undefined ? 0 : c, b: 1 }); Store.save(); setState('setup'); }
  else if (a === 'del') { if (P.length > 1) { P.splice(i, 1); Store.save(); setState('setup'); } }
  else if (a === 'col') { const used = P.filter((p, k) => k !== i).map(p => p.c); let c = P[i].c; for (let k = 0; k < 6; k++) { c = (c + 1) % 6; if (!used.includes(c)) break; } P[i].c = c; Store.save(); b.style.setProperty('--pc', PCOL[c]); }
  else if (a === 'go') startMatch(App.pick);
  else if (a === 'again') startMatch(App.match.def);
  else if (a === 'resume') pause(false);
  else if (a === 'skip') { pause(false); if (Shot.phase === 'ready') advance(true); }
  else if (a === 'aimL' || a === 'aimR') { if (App.game.aim && Shot.phase === 'ready') App.game.aim(a === 'aimL' ? -.035 : .035); }
  else if (a === 'gfx') { Store.d.gfx = b.dataset.v; Store.save(); const sh = E.sun.shadow; sh.mapSize.setScalar(Store.d.gfx === 'low' ? 2048 : 4096); if (sh.map) { sh.map.dispose(); sh.map = null; } resize(); setState('settings'); }
  else if (a === 'aimOn') { Store.d.aim.on = b.dataset.v === '1'; Store.save(); setState('settings'); }
  else if (a === 'putt') { Store.d.putt = +b.dataset.v; Store.save(); setState('settings'); }
  else if (a === 'vol') { Store.d.vol = +b.dataset.v; Store.save(); Snd.setVol(); Snd.ding(1); App.paused ? pause(true) : setState('settings'); }
  else if (a === 'mus') { Store.d.tune = b.dataset.v; Store.save(); musPaint(); App.paused ? pause(true) : setState('settings'); }
  else if (a === 'boostMenu') { pause(true); }
  else if (a === 'musNext') { const k = TUNE_NAMES.map(t => t[0]); Store.d.tune = k[(k.indexOf(Store.d.tune) + 1) % k.length]; Store.save(); musPaint(); }
  else if (a === 'pad') { Store.d.pad = b.dataset.v === 'null' ? null : b.dataset.v === 'true'; Store.save(); setState('settings'); }
  else if (a === 'wipe') { if (b.dataset.sure) { Store.d.boards = {}; Store.save(); Sess.d = {}; Sess.save(); b.textContent = 'Leaderboards cleared'; b.disabled = true; } else { b.dataset.sure = 1; b.textContent = 'Tap again to clear every score'; } }
});
document.addEventListener('input', e => { const t = e.target; if (t.id && t.id.startsWith('pn')) { Store.d.players[+t.dataset.i].name = t.value; Store.save(); } if (t.id && t.id.startsWith('gb') && App.match) { const i = +t.dataset.i, p = App.match.players[i], v = +t.value; p.b = v; if (Store.d.players[i]) { Store.d.players[i].b = v; Store.save(); } t.nextElementSibling.textContent = bTxt(v); HUD.refresh(); }
  if (t.id && t.id.startsWith('pb')) { const p = Store.d.players[+t.dataset.i]; p.b = +t.value; Store.save(); t.nextElementSibling.textContent = p.b > 1 ? '×' + p.b.toFixed(1) : 'No boost'; }
  if (t.id === 'aimW' || t.id === 'aimD') { Store.d.aim[t.id === 'aimW' ? 'w' : 'd'] = +t.value; Store.save(); t.nextElementSibling.textContent = t.value + ' ft'; $('aimNote').textContent = aimNote(); }
  if (t.id === 'bbLag') { Store.d.bbLag = +t.value; Store.save(); t.nextElementSibling.textContent = Store.d.bbLag.toFixed(1) + ' s'; }
  if (t.id === 'relay') { Store.d.relay = t.value.trim(); Store.save(); } });
$('bPause').addEventListener('click', () => { Snd.init(); pause(true); });
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { if (App.state === 'play') pause(!App.paused); else if (App.state === 'setup') { App.cat = App.pick.group; setState('cat'); } else if (App.state !== 'home') goHome(); }
  else if (e.key === 't' || e.key === 'T') { Store.d.pad = !padOn(); Store.save(); padVis(); }
  else if (e.key === 'f' || e.key === 'F') { try { (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => { }); } catch (x) { } }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && App.state === 'play' && !App.paused && App.game.aim && Shot.phase === 'ready') { e.preventDefault(); App.game.aim((e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? .009 : .035)); }
  else if (e.key === ' ' && App.state === 'play' && !App.paused) { e.preventDefault(); fire(App.def.putt ? puttPad(rnd(-.1, .1), rnd(.25, .6)) : padShot(rnd(-.35, .35), rnd(.25, .75))); }
});

/* ---------- shot input: relay WebSocket and the on-screen test pad ---------- */
function aimNote() { const A = Store.d.aim; if (!A.on) return 'The ball starts on the exact angle your launch monitor reads. Side targets will need wide shots.'; const g = aimGeom(); return 'Measure your screen’s width and the distance from the ball to the screen. The ball then goes where it appears to go on your screen (side angles are scaled about ×' + g.k.toFixed(1) + ').'; }
function readyPaint(d) { const el = $('hReady'); if (!d.lm || !d.flags) { el.hidden = true; return; } el.hidden = false; el.textContent = d.ball ? 'Ball ready' : d.ready ? 'Place a ball' : 'Launch monitor not ready'; el.className = 'chip pill ' + (d.ball ? 'ok' : d.ready ? 'mid' : ''); }
function connText() { return ['Demo mode · no relay', 'Relay ready · waiting for launch monitor', 'Launch monitor connected' + (App.lat != null ? ' · shot reached screen in ' + App.lat + ' ms' : '')][App.conn]; }
function connPaint() { const el = $('hConn'); el.textContent = connText(); document.querySelectorAll('#ui .pill').forEach(p => { p.textContent = connText(); }); }
function setConn(c) { if (c === App.conn) return; App.conn = c; const el = $('hConn'); el.textContent = connText(); el.className = 'chip pill ' + ['', 'mid', 'ok'][c]; padVis(); document.querySelectorAll('#ui .pill').forEach(p => { p.textContent = connText(); p.className = 'chip pill ' + ['', 'mid', 'ok'][c]; }); }
const padAim = (s, u) => { const A = Store.d.aim || { w: 10, d: 11 }; s.hla = Math.atan(u * A.w / 2 / A.d) * 180 / PI; return s; };
const puttPad = (u, pw) => ({ speed: lerp(2, 32, pw), vla: 0, hla: u * 20, spin: 0, axis: 0 });
function padOn() { return Store.d.pad === null ? App.conn === 0 : Store.d.pad; }
function padVis() { $('pad').hidden = !(App.state === 'play' && padOn()); }
function parseShot(d) {
  if (!d) return null; if (d.type === 'shot') return d; const b = d.BallData; if (!b || (d.ShotDataOptions && d.ShotDataOptions.ContainsBallData === false)) return null;
  const back = +b.BackSpin || 0, sidesp = +b.SideSpin || 0; return { speed: +b.Speed, vla: +b.VLA, hla: +b.HLA, spin: +b.TotalSpin || Math.hypot(back, sidesp), axis: b.SpinAxis !== undefined ? +b.SpinAxis : Math.atan2(sidesp, back || 1) * 180 / PI };
}
function connect() {
  if (location.protocol === 'https:' && !Store.d.relay) return; let ws;
  try { ws = new WebSocket(Store.d.relay || 'ws://' + (location.protocol === 'http:' && location.host ? location.host : '127.0.0.1:8080')); } catch (e) { return void setTimeout(connect, 5000); }
  ws.onopen = () => setConn(Math.max(App.conn, 1)); ws.onclose = () => { setConn(0); setTimeout(connect, 3000); }; ws.onerror = () => { };
  ws.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (x) { return; } if (d.type === 'status') { setConn(d.lm ? 2 : 1); readyPaint(d); return; } if (d.type === 'update') { App.update = d.version; if (App.state === 'home' || App.state === 'cat' || App.state === 'news') setState(App.state); return; } const s = parseShot(d); if (s) { setConn(2); fire(s); if (d.t) { App.lat = Math.max(0, Date.now() - d.t); connPaint(); } } };
}
(function pad() {
  const a = $('padArea'), dot = $('padDot'), info = $('padInfo'); const at = e => { const r = a.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1, 1 - clamp((e.clientY - r.top) / r.height, 0, 1), r]; };
  a.addEventListener('pointermove', e => { const [u, pw] = at(e); if (App.def && App.def.putt) { const p = puttPad(u, pw); info.textContent = p.speed.toFixed(0) + ' mph · ' + Math.abs(p.hla).toFixed(0) + '°'; return; } const s = padShot(u, pw), pl = App.match && App.match.players[App.match.pi]; if (pl && pl.b > 1) s.speed *= pl.b; const c = simCarry(s); info.textContent = '≈ ' + Math.round(Math.hypot(c.x, c.z) * YD) + ' yd'; });
  a.addEventListener('pointerdown', e => { e.preventDefault(); const [u, pw, r] = at(e); dot.hidden = false; dot.style.left = (u + 1) / 2 * r.width + 'px'; dot.style.top = (1 - pw) * r.height + 'px'; fire(App.def && App.def.putt ? puttPad(u, pw) : padAim(padShot(u, pw), u)); });
})();

/* ---------- main loop and boot ---------- */
let last = 0; const Perf = { ms: 16, n: 0, lv: 0 };
function step(dt) {
  E.t += dt; const g = App.game;
  if (App.state === 'play') {
    if (Shot.phase === 'air') { Ball.acc += dt; const H = 1 / 240; while (Ball.acc >= H && Ball.state !== 'done') { Ball.step(H, g); if (Ball.state !== 'done' && g.step) g.step(Ball, H); Ball.acc -= H; } if (Ball.state === 'done') { Shot.phase = 'settle'; Shot.t = 0; } }
    else if (Shot.phase === 'settle') { Shot.t += dt; if (Shot.t > .45 && (!g.settled || g.settled() || Shot.t > 9)) finishShot(); }
    else if (Shot.phase === 'show') { Shot.t -= dt; if (Shot.t <= 0 && !Cam.cut) advance(); }
  } else if (App.state === 'results') { App.fx -= dt; if (App.fx <= 0) { App.fx = .55; FX.confetti(new V3(Cam.l.x + rnd(-14, 14), Cam.l.y + rnd(4, 12), Cam.p.z - rnd(22, 40)), 70, 1.1); } }
  if (g && g.update) g.update(dt, E.t); for (const f of E.ticks) f(dt, E.t); Ball.draw(); FX.update(dt); Cam.update(dt);
}
function frame(now) {
  requestAnimationFrame(frame); const raw = (now - last) / 1000 || 0, dt = Math.min(.2, raw); last = now;
  if (Snd.ctx) { const want = App.state === 'play' ? E.snd : 'menu'; if (Snd.ambKind !== want) Snd.amb(want); }
  if (!window.Arcade.manual && raw < 1 && !document.hidden) { Perf.ms = Perf.ms * .95 + raw * 50; if (++Perf.n > 120) { Perf.n = 0; if (Perf.ms > 30 && Store.d.gfx !== 'low') { if (Perf.lv < 3) { E.scale = [1, .8, .65, .5][++Perf.lv]; resize(); } else if (!E.autoLow) { E.autoLow = true; } Perf.ms = 16; } } }
  if (App.paused) return; if (!window.Arcade.manual) step(dt); E.render();
}
async function boot() {
  Store.load(); Sess.load(); App.bview = 'session'; Snd.setVol(); musPaint();
  try { await Promise.race([Promise.all([document.fonts.load('40px "Titan One"'), document.fonts.load('800 40px "Outfit"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  try { initEngine(); } catch (e) { $('load').querySelector('div').innerHTML = '<h1 class="logo"><span>Clubhouse</span>Arcade</h1><p class="note">This browser could not start 3D graphics. Open the arcade in Chrome or Edge with hardware acceleration turned on.</p>'; return; }
  const bar = $('bar').firstElementChild, tick = () => new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < GAMES.length; i++) {
    const d = GAMES[i]; try {
      const g = loadScene(d); g.beginTurn && g.beginTurn(DEMO.players[0], 0, 0); g.beginShot && g.beginShot(DEMO.players[0]); for (let k = 0; k < 40; k++) { E.t += .05; g.update && g.update(.05, E.t); for (const f of E.ticks) f(.05, E.t); }
      E.setSize(640, 360, 1); Cam.p.fromArray(d.thumb.p); Cam.l.fromArray(d.thumb.l); Cam.hp.copy(Cam.p); Cam.hl.copy(Cam.l); Cam.update(0); Ball.m.visible = false; E.render(); App.thumbs[d.id] = E.r.domElement.toDataURL('image/jpeg', .82);
    } catch (e) { console.error('thumb', d.id, e); }
    bar.style.width = (i + 1) / GAMES.length * 100 + '%'; await tick();
  }
  resize(); FX.clear(); App.match = null; App.def = null; goHome();
  $('load').classList.add('out'); setTimeout(() => $('load').remove(), 700); requestAnimationFrame(frame); connect();
  api('/api/info').then(i => { App.info = i; if (i.update === 'installed' && i.version !== VERSION) { App.update = i.version; if (App.state === 'home') setState('home'); } }).catch(() => { });
}
window.Arcade = { Snd, Mini: { HOLES, mkHole, puttStep, aimFor, remain, PUTT }, E, FX, App, Ball, Shot, Cam, GAMES, Store, fire, step, solveShot, padShot, simCarry, startMatch, aim: (x, z, loft) => fire(solveShot(x, z, loft), true), aimNeeded, screenAim, ready: false };
boot().then(() => { window.Arcade.ready = true; });
