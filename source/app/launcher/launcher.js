'use strict';
const A = window.clubhouseApp, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let S = null, sel = 'arcade', draft = null, busy = false;
const base = p => String(p).split(/[\\/]/).pop();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* clock */
function tick() { const d = new Date(); $('#time').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); $('#date').textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
tick(); setInterval(tick, 5000);

/* selection */
function select(k) {
  sel = k; $$('.card').forEach(c => c.classList.toggle('sel', c.dataset.k === k));
  const art = $('#c-' + k + ' .art').style.backgroundImage; $('#bg').style.backgroundImage = art;
  if (document.activeElement && document.activeElement.classList.contains('card')) $('#c-' + k).focus({ preventScroll: true });
}
$$('.card').forEach(c => { c.addEventListener('mouseenter', () => select(c.dataset.k)); c.addEventListener('focus', () => select(c.dataset.k)); c.addEventListener('click', () => { select(c.dataset.k); play(c.dataset.k); }); });

/* status */
async function refresh() {
  if (busy) return;
  try { S = await A.state(); } catch (e) { return; }
  const c = S.cfg, g = S.gspro, run = n => S.names.includes(n.toLowerCase());
  const chip = (id, txt, cls) => { const e = $(id); e.textContent = txt; e.className = 'chip' + (cls ? ' ' + cls : ''); };
  if (!g.found) chip('#s-gspro', 'Set up GSPro in Settings', 'warn'); else if (g.running) chip('#s-gspro', 'Running', 'run'); else chip('#s-gspro', 'Ready');
  const a = S.arcade; if (!a.found) chip('#s-arcade', 'Set up Clubhouse Arcade in Settings', 'warn'); else if (a.running) chip('#s-arcade', 'Running', 'run'); else chip('#s-arcade', a.version ? 'Games ' + a.version : 'Ready');
  const extra = (start, close) => [start.length ? 'Starts ' + start.map(base).join(', ') : '', close.length ? 'Closes ' + close.join(', ') + ' first' : ''].filter(Boolean).join(' · ');
  $('#x-arcade').textContent = extra(c.arcade.start, c.arcade.close) || (S.names.some(n => /^rela/.test(n)) ? 'Rela is running' : '');
  $('#x-gspro').textContent = extra(c.gspro.start, c.gspro.close);
  $('#ver').textContent = 'Clubhouse ' + S.version;
  $('#b-full').textContent = S.fullscreen ? 'Window' : 'Full screen';
}
setInterval(refresh, 4000);

/* overlays */
function showBusy(title, steps) { $('#busy-t').textContent = title; $('#busy-steps').innerHTML = (steps || []).map(s => '<li>' + esc(s) + '</li>').join(''); $('#busy').hidden = false; }
function hideBusy() { $('#busy').hidden = true; }
function ask(title, text, buttons) {
  return new Promise(res => {
    $('#ask-t').textContent = title; $('#ask-p').textContent = text;
    $('#ask-b').innerHTML = buttons.map((b, i) => `<button class="btn${i === 0 ? ' go' : ''}" type="button" data-i="${i}">${esc(b)}</button>`).join('');
    $('#ask').hidden = false; $('#ask-b button').focus();
    $('#ask-b').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#ask').hidden = true; res(+b.dataset.i); };
  });
}

/* play */
async function play(k, opts) {
  if (busy) return; busy = true; let hold = false;
  try {
    if (k === 'arcade') {
      showBusy('Starting Clubhouse Arcade', ['Starting ClubhouseArcade.exe…']);
      let r = await A.playArcade(opts || {});
      if (r.ask === 'gspro') {
        hideBusy();
        const i = await ask('GSPro is still open', 'GSPro may be using your launch monitor and port 921. Close it before starting the arcade?', ['Close GSPro', 'Keep it open', 'Cancel']);
        if (i === 2) return;
        showBusy('Starting Clubhouse Arcade', [i === 0 ? 'Closing GSPro…' : 'Starting ClubhouseArcade.exe…']);
        r = await A.playArcade({ ignoreGSPro: true, closeGSPro: i === 0 });
      }
      if (r.setup) { hideBusy(); const i = await ask('Where is Clubhouse Arcade?', 'Clubhouse could not find ClubhouseArcade.exe on this PC. Choose it in Settings.', ['Open Settings', 'Cancel']); if (i === 0) openSettings(); return; }
      if (r.error) { hideBusy(); await ask('The arcade could not start', r.error, ['OK']); return; }
      showBusy('Starting Clubhouse Arcade', (r.steps || []).concat('Loading the games…'));
      hold = true; return; // the window switches to the arcade
    }
    if (k === 'gspro') {
      showBusy('Starting GSPro', ['Closing Clubhouse Arcade…']);
      const r = await A.playGSPro();
      if (r.setup) { hideBusy(); const i = await ask('Where is GSPro?', 'Clubhouse could not find GSPro on this PC. Choose GSPLauncher.exe or GSPro.exe in Settings.', ['Open Settings', 'Cancel']); if (i === 0) openSettings(); return; }
      if (r.error) { hideBusy(); await ask('GSPro could not start', r.error, ['OK']); return; }
      showBusy('GSPro is starting', (r.steps || []).concat(S && S.cfg.afterGSPro === 'minimize' ? 'This window will tuck away. Click Clubhouse on the taskbar to come back.' : ''));
      hold = true; setTimeout(() => { hideBusy(); busy = false; refresh(); }, 4000);
      return;
    }
  } catch (e) { hideBusy(); await ask('Something went wrong', String(e && e.message || e), ['OK']); }
  finally { if (!hold) busy = false; }
}

/* settings */
function openSettings() { if (!S) return; draft = JSON.parse(JSON.stringify(S.cfg)); paintSettings(); $('#settings').hidden = false; $('#saved').textContent = ''; }
function closeSettings() { $('#settings').hidden = true; refresh(); }
function getL(key) { const [a, b] = key.split('.'); return draft[a][b]; }
function paintSettings() {
  const p = $('#gp-path'); p.textContent = draft.gspro.path || 'Not set'; p.classList.toggle('bad', !draft.gspro.path);
  const q = $('#ar-path'); q.textContent = draft.arcade.path || 'Not set'; q.classList.toggle('bad', !draft.arcade.path);
  $$('[data-list]').forEach(ul => { const l = getL(ul.dataset.list); ul.innerHTML = l.length ? l.map((x, i) => `<li><span title="${esc(x)}">${esc(ul.dataset.list.endsWith('close') ? x : x)}</span><button type="button" data-rm="${i}" aria-label="Remove">×</button></li>`).join('') : '<li class="empty">None</li>'; });
  $$('[data-seg]').forEach(s => { const v = String(draft[s.dataset.seg]); s.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); });
}
async function saveSettings() { S = await A.save(draft); draft = JSON.parse(JSON.stringify(S.cfg)); paintSettings(); $('#saved').textContent = 'Saved'; clearTimeout(saveSettings.t); saveSettings.t = setTimeout(() => $('#saved').textContent = '', 1800); }
$('#settings').addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.a === 'close') return closeSettings();
  if (t.dataset.a === 'log') return A.openLog();
  if (t.dataset.a === 'gp-browse') { const p = await A.browse('gspro'); if (p) { draft.gspro.path = p; await saveSettings(); } return; }
  if (t.dataset.a === 'gp-find') { const p = await A.findGSPro(); if (p) { draft.gspro.path = p; await saveSettings(); } else await ask('GSPro not found', 'Use Browse to choose GSPLauncher.exe or GSPro.exe.', ['OK']); return; }
  if (t.dataset.a === 'ar-browse') { const p = await A.browse('arcade'); if (p) { draft.arcade.path = p; await saveSettings(); } return; }
  if (t.dataset.a === 'ar-find') { const p = await A.findArcade(); if (p) { draft.arcade.path = p; await saveSettings(); } else await ask('Clubhouse Arcade not found', 'Use Browse to choose ClubhouseArcade.exe.', ['OK']); return; }
  if (t.dataset.add) { const p = await A.browse('program'); if (!p) return; const l = getL(t.dataset.add), v = t.dataset.add.endsWith('close') ? base(p) : p; if (!l.some(x => x.toLowerCase() === v.toLowerCase())) l.push(v); return saveSettings(); }
  if (t.dataset.rm !== undefined) { getL(t.closest('ul').dataset.list).splice(+t.dataset.rm, 1); return saveSettings(); }
  const seg = t.closest('[data-seg]'); if (seg) { const k = seg.dataset.seg; draft[k] = k === 'fullscreen' ? t.dataset.v === 'true' : t.dataset.v; return saveSettings(); }
});

/* footer */
document.querySelector('footer').addEventListener('click', async e => {
  const a = (e.target.closest('button') || {}).dataset; if (!a) return;
  if (a.a === 'settings') openSettings();
  if (a.a === 'quit') A.quit();
  if (a.a === 'full') { await A.toggleFull(); setTimeout(refresh, 300); }
});

/* keys */
document.addEventListener('keydown', e => {
  if (!$('#ask').hidden || !$('#busy').hidden) return;
  if (!$('#settings').hidden) { if (e.key === 'Escape') closeSettings(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); select(e.key === 'ArrowLeft' ? 'arcade' : 'gspro'); $('#c-' + sel).focus(); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(sel); }
  else if (e.key === 's' || e.key === 'S') openSettings();
});

refresh().then(() => { select(S && S.cfg.last === 'gspro' ? 'gspro' : 'arcade'); $('#c-' + sel).focus({ preventScroll: true }); });
window.addEventListener('focus', refresh);
