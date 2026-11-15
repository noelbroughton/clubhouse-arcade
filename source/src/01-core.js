'use strict';
/* ============ Clubhouse Arcade — core: helpers, storage, sound, renderer, effects, ball flight ============ */
const T = THREE, PI = Math.PI, YD = 1.09361, V3 = T.Vector3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const srand = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = h => new T.Color(h).convertSRGBToLinear();
const PCOL = ['#ff5d73', '#3fa7ff', '#ffc93c', '#44d68a', '#b98bff', '#ff9a3c'];

/* ---------- storage (per browser; survives restarts on the sim PC) ---------- */
const Store = {
  d: { players: [{ name: 'Player 1', c: 0, b: 1 }, { name: 'Player 2', c: 1, b: 1 }], boards: {}, len: 1, sound: true, boost: 1.5, pad: null, relay: '', gfx: 'high', putt: 1, vol: 1, music: true, jr: 1.9, tune: 'auto', bbLag: 0 },
  load() { try { const s = JSON.parse(localStorage.getItem('clubhouseArcade.v2')); if (s && s.players) Object.assign(this.d, s); } catch (e) { } for (const p of this.d.players) { if (typeof p.b !== 'number') p.b = p.jr ? (this.d.jr || 1.9) : 1; delete p.jr; } if (this.d.music === false) { this.d.tune = 'off'; this.d.music = true; } },
  save() { try { localStorage.setItem('clubhouseArcade.v2', JSON.stringify(this.d)); } catch (e) { } }
};

/* ---------- sound: everything is synthesised, no audio files ---------- */
const Snd = {
  ctx: null, ambKind: null, ambN: [], nextT: 0, stepI: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.out = c.createGain(); const cp = c.createDynamicsCompressor(); cp.threshold.value = -16; cp.knee.value = 12; cp.ratio.value = 8; cp.attack.value = .003; cp.release.value = .2; this.out.connect(cp); cp.connect(c.destination); this.setVol();
      const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++)d[i] = Math.random() * 2 - 1; this.nb = b;
    } catch (e) { }
  },
  setVol() { Store.d.sound = Store.d.vol > 0; if (this.out) this.out.gain.value = Store.d.vol * 1.5; },
  tone(f, d, o = {}) { if (!this.ctx || !Store.d.sound) return; const c = this.ctx, t = c.currentTime + Math.max(0, o.at || 0), os = c.createOscillator(), g = c.createGain(); os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || .25, t + (o.atk || .008)); g.gain.exponentialRampToValueAtTime(.0001, t + d); os.connect(g); g.connect(o.bus || this.out); os.start(t); os.stop(t + d + .05); },
  noise(d, o = {}) { if (!this.ctx || !Store.d.sound) return; const c = this.ctx, t = c.currentTime + Math.max(0, o.at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.nb; s.loop = true; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 800, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + d); f.Q.value = o.q || .7; g.gain.setValueAtTime(o.atk ? .0001 : (o.vol || .3), t); if (o.atk) g.gain.exponentialRampToValueAtTime(o.vol || .3, t + o.atk); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(o.bus || this.out); s.start(t, Math.random()); s.stop(t + d + .05); },
  note(m, d, o) { this.tone(440 * Math.pow(2, (m - 69) / 12), d, o); },
  claps(n, span, at = 0, vol = .22) { for (let i = 0; i < n; i++)this.noise(.035, { f: rnd(1300, 2400), type: 'bandpass', q: 1.2, vol: vol * rnd(.5, 1), at: at + Math.random() * span }); },
  crowd(d, vol, at = 0, up = true) { this.noise(d, { f: up ? 700 : 900, to: up ? 1900 : 380, type: 'bandpass', q: .5, vol, atk: .25, at }); this.noise(d, { f: 2600, type: 'bandpass', q: .8, vol: vol * .35, atk: .3, at }); },
  hit() { this.noise(.05, { f: 4200, type: 'highpass', vol: .9 }); this.tone(240, .16, { to: 55, vol: .95 }); this.tone(1900, .05, { to: 700, type: 'triangle', vol: .35 }); this.noise(.9, { f: 600, to: 3200, type: 'bandpass', q: 1.4, vol: .22, atk: .06, at: .03 }); },
  putt() { this.tone(980, .05, { to: 620, type: 'triangle', vol: .6 }); this.noise(.03, { f: 3000, type: 'highpass', vol: .4 }); this.tone(160, .08, { to: 90, vol: .4 }); },
  thud() { this.tone(120, .18, { to: 45, vol: .7 }); this.noise(.1, { f: 520, vol: .4 }); },
  boom() { this.noise(1.4, { f: 1100, to: 40, vol: 1 }); this.tone(100, .9, { to: 24, vol: 1 }); this.tone(55, 1.1, { to: 20, vol: .8 }); this.noise(.2, { f: 4000, type: 'highpass', vol: .5 }); this.noise(1.2, { f: 300, to: 90, vol: .5, at: .25 }); },
  ding(n = 0) { const f = 880 * Math.pow(1.122, n); this.tone(f, .6, { vol: .5 }); this.tone(f * 1.5, .8, { vol: .3, at: .05 }); this.tone(f * 2, 1, { vol: .18, at: .1 }); },
  bonk() { this.tone(260, .24, { to: 80, type: 'square', vol: .45 }); this.tone(640, .14, { to: 280, type: 'triangle', vol: .5, at: .03 }); this.noise(.09, { f: 1200, vol: .6 }); this.tone(1200, .25, { to: 1700, type: 'sine', vol: .2, at: .1 }); },
  pop() { this.noise(.06, { f: 2500, type: 'highpass', vol: .8 }); this.tone(760, .11, { to: 170, vol: .6 }); },
  splash() { this.noise(.9, { f: 2600, to: 420, type: 'bandpass', q: .8, vol: .9 }); this.noise(.3, { f: 600, vol: .7 }); this.tone(180, .25, { to: 60, vol: .5 }); this.noise(.7, { f: 5000, type: 'highpass', vol: .15, at: .15 }); },
  miss() { this.tone(330, .3, { to: 160, type: 'triangle', vol: .4 }); this.tone(220, .45, { to: 100, type: 'triangle', vol: .4, at: .24 }); },
  aww() { this.miss(); this.crowd(1.1, .16, .05, false); },
  coin() { this.tone(988, .09, { type: 'square', vol: .22 }); this.tone(1319, .4, { type: 'square', vol: .22, at: .08 }); },
  cup() { this.tone(520, .07, { to: 300, type: 'triangle', vol: .6 }); this.tone(300, .1, { to: 170, type: 'triangle', vol: .55, at: .09 }); for (let i = 0; i < 4; i++)this.noise(.03, { f: 1800, type: 'bandpass', q: 2, vol: .35 / (i + 1), at: .16 + i * .06 }); },
  cheer() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .4, { type: 'triangle', vol: .42, at: i * .09 })); this.crowd(1.9, .32, .1); this.claps(26, 1.6, .2); },
  win() { [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76]].forEach(([f, t]) => this.tone(f, .34, { type: 'triangle', vol: .45, at: t })); [523, 659, 784, 1047].forEach(f => this.tone(f, 1.4, { type: 'triangle', vol: .28, at: .95 })); this.crowd(3.2, .34, .2); this.claps(60, 3, .3); },
  horn() { [196, 247, 294].forEach(f => { this.tone(f, 1.3, { type: 'sawtooth', vol: .3, atk: .03 }); this.tone(f / 2, 1.3, { type: 'square', vol: .2, atk: .03 }); }); },
  swish() { this.noise(.35, { f: 5000, to: 1500, type: 'bandpass', q: 1.2, vol: .7 }); this.noise(.12, { f: 7000, type: 'highpass', vol: .3, at: .1 }); },
  bat() { this.noise(.05, { f: 2600, type: 'bandpass', q: .8, vol: 1 }); this.tone(1100, .09, { to: 260, type: 'triangle', vol: .9 }); this.tone(320, .12, { to: 120, vol: .6 }); },
  whistle() { for (let i = 0; i < 6; i++)this.tone(2700 + (i % 2) * 180, .06, { type: 'square', vol: .12, at: i * .055 }); },
  buzz() { this.tone(140, .5, { type: 'sawtooth', vol: .3 }); this.tone(147, .5, { type: 'square', vol: .2 }); },
  turn() { this.tone(660, .12, { type: 'triangle', vol: .3 }); this.tone(880, .22, { type: 'triangle', vol: .3, at: .11 }); },
  tick() { this.tone(700, .05, { type: 'square', vol: .16 }); },
  glass() { this.noise(.35, { f: 5200, type: 'highpass', vol: .6 }); this.tone(1900, .22, { to: 900, vol: .25 }); for (let i = 0; i < 5; i++)this.tone(rnd(2400, 4200), .12, { vol: .1, at: .04 + i * .05 }); },
  /* ---- ambience and music: one looping bed per world, random events, an optional tune ---- */
  stopAmb() { clearInterval(this.ambT); const c = this.ctx; if (this.ambG && c) { const g = this.ambG, n = this.ambN; try { g.gain.setTargetAtTime(0, c.currentTime, .25); } catch (e) { } setTimeout(() => { n.forEach(x => { try { x.stop(); } catch (e) { } }); try { g.disconnect(); } catch (e) { } }, 1200); } this.ambG = null; this.ambN = []; this.ambKind = null; },
  amb(kind) {
    if (kind === this.ambKind) return; this.stopAmb(); const c = this.ctx, A = AMB[kind]; if (!c || !A) return; this.ambKind = kind;
    const g = this.ambG = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(1, c.currentTime, .6); g.connect(this.out);
    for (const L of A.beds || []) { const s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(); s.buffer = this.nb; s.loop = true; f.type = L[0]; f.frequency.value = L[1]; f.Q.value = L[2]; v.gain.value = L[3]; s.connect(f); f.connect(v); v.connect(g); if (L[4]) { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = L[4]; og.gain.value = L[3] * L[5]; o.connect(og); og.connect(v.gain); o.start(); this.ambN.push(o); } s.start(0, Math.random()); this.ambN.push(s); }
    this.nextT = c.currentTime + .4; this.stepI = 0;
    this.ambT = setInterval(() => {
      if (!Store.d.sound || document.hidden) return; if (A.ev && Math.random() < A.ev[0]) A.ev[1](this, g);
      const tn = Store.d.tune, M = tn === 'off' ? null : tn === 'auto' ? A.music : TUNES[tn]; if (!M) { this.nextT = c.currentTime + .2; return; }
      while (this.nextT < c.currentTime + .35) { const i = this.stepI++ % M.len, at = this.nextT - c.currentTime; M.play(this, i, at, g); this.nextT += M.step; }
    }, 110);
  }
};
const chirp = (S, g) => { const n = 2 + (Math.random() * 3 | 0), f = rnd(2300, 3600); for (let i = 0; i < n; i++)S.tone(f * rnd(.9, 1.1), .09, { to: f * rnd(1.15, 1.4), vol: .05, at: i * .13, bus: g }); };
const gull = (S, g) => { for (let i = 0; i < 3; i++)S.tone(1500, .28, { to: 950, type: 'triangle', vol: .05, at: i * .34, bus: g }); };
const horn = (S, g) => { const f = pick([392, 440, 349]); S.tone(f, .5, { type: 'square', vol: .018, bus: g }); S.tone(f * 1.26, .5, { type: 'square', vol: .018, bus: g }); };
const WALTZ = { mel: [72, 76, 79, 84, 79, 76, 74, 77, 81, 86, 81, 77, 76, 79, 84, 88, 84, 79, 77, 81, 79, 76, 74, 72], root: [48, 48, 50, 50, 48, 48, 53, 43], minor: [0, 0, 1, 1, 0, 0, 0, 0] };
const waltz = vol => ({ len: 24, step: .36, play(S, i, at, g) { const bar = i / 3 | 0, b = i % 3, r = WALTZ.root[bar]; S.note(WALTZ.mel[i], .42, { type: 'triangle', vol: .075 * vol, at, bus: g }); S.note(WALTZ.mel[i] + 12, .3, { type: 'sine', vol: .03 * vol, at, bus: g }); if (b === 0) S.note(r - 12, .5, { type: 'triangle', vol: .12 * vol, at, bus: g }); else[12, 12 + (WALTZ.minor[bar] ? 3 : 4), 19].forEach(k => S.note(r + k, .2, { type: 'square', vol: .016 * vol, at, bus: g })); } });
const ARP = [[45, 57, 60, 64, 69, 64, 60, 57], [41, 53, 57, 60, 65, 60, 57, 53], [48, 55, 60, 64, 67, 64, 60, 55], [43, 55, 59, 62, 67, 62, 59, 55]];
const chill = { len: 32, step: .42, play(S, i, at, g) { const ch = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 64, 67], [55, 62, 67, 71]][(i / 8 | 0) % 4]; S.note(ch[i % 4] + (i % 8 > 3 ? 12 : 0), 1.1, { type: 'sine', vol: .05, at, atk: .04, bus: g }); if (i % 8 === 0) { S.note(ch[0] - 12, 3, { type: 'triangle', vol: .09, at, atk: .2, bus: g }); S.note(ch[2], 3, { type: 'sine', vol: .03, at, atk: .5, bus: g }); } } };
const organ = (S, g) => { [[55, 0], [60, .16], [64, .32], [67, .48], [64, .72], [67, .88]].forEach(([m, t]) => S.note(m + 12, t > .8 ? .5 : .15, { type: 'square', vol: .028, at: t, bus: g })); };
const AMB = {
  arena: { beds: [['bandpass', 800, .5, .085, .27, .5], ['bandpass', 2200, .6, .02, .4, .6]], ev: [.02, (S, g) => Math.random() < .35 ? organ(S, g) : S.claps(8, .7, 0, .06)] },
  menu: { music: waltz(.8) },
  carnival: { beds: [['bandpass', 900, .5, .05, .31, .5]], music: waltz(.6), ev: [.012, (S, g) => S.claps(5, .5, 0, .05)] },
  canyon: { beds: [['bandpass', 420, .8, .1, .13, .8], ['lowpass', 180, .5, .08, 0, 0]], ev: [.006, (S, g) => S.tone(2100, .7, { to: 1300, type: 'sawtooth', vol: .012, bus: g })] },
  lake: { beds: [['lowpass', 520, .5, .08, .23, .7], ['bandpass', 2400, .6, .012, .4, .8]], ev: [.04, chirp] },
  sea: { beds: [['lowpass', 420, .5, .16, .11, .9], ['bandpass', 1800, .5, .03, .11, .9]], ev: [.018, gull] },
  meadow: { beds: [['bandpass', 650, .6, .045, .17, .7]], ev: [.06, chirp] },
  city: { beds: [['lowpass', 130, .6, .3, 0, 0], ['bandpass', 1000, .5, .02, .2, .6]], ev: [.012, horn] },
  roofs: { beds: [['bandpass', 320, .7, .09, .1, .8], ['lowpass', 110, .6, .24, 0, 0]], ev: [.006, horn] },
  neon: { beds: [['lowpass', 90, .6, .16, 0, 0]], music: { len: 64, step: .136, play(S, i, at, g) { const ch = ARP[(i / 16 | 0) % 4], n = ch[1 + i % 7]; S.note(n + 12, .16, { type: 'sawtooth', vol: .022, at, bus: g }); if (i % 4 === 0) S.note(ch[0] - 12, .3, { type: 'triangle', vol: .13, at, bus: g }); if (i % 8 === 4) S.noise(.05, { f: 3000, type: 'highpass', vol: .05, at, bus: g }); if (i % 16 === 0) S.note(ch[4] + 12, 1.6, { type: 'sine', vol: .03, at, atk: .3, bus: g }); } } }
};
const TUNES = { waltz: waltz(.7), synth: AMB.neon.music, chill };

/* ---------- textures, materials, geometry ---------- */
function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const hex = n => '#' + ('00000' + (n >>> 0).toString(16)).slice(-6);
function speckle(g, w, h, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; const s = 1 + Math.random() * 3; g.fillRect(Math.random() * w, Math.random() * h, s, s); } }
function groundTex(c1, c2, rep, bands = 2) {
  return ctex(1024, 1024, (g, w, h) => {
    const a = new T.Color(c1), b = new T.Color(c2), col = new T.Color();
    for (let x = 0; x < w; x += 4) { const k = bands < 2 ? .5 : .5 + .5 * Math.tanh(Math.sin(x / w * PI * bands) * 5); col.copy(a).lerp(b, k); g.fillStyle = '#' + col.getHexString(); g.fillRect(x, 0, 4, h); }
    for (let i = 0; i < 240; i++) { const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 110, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Math.random() < .5 ? 'rgba(0,0,0,.075)' : 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 24000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.085)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 2 + Math.random() * 5); }
  }, [rep, rep]);
}
function stripeTex(c1, c2, n = 12) { return ctex(n * 16, 8, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = hex(i % 2 ? c2 : c1); g.fillRect(i * 16, 0, 16, h); } }); }
const MATS = {};
function mat(c, o) { let k = c + '|'; if (o) for (const n in o) { if (typeof o[n] === 'object') { k = null; break; } k += n + ':' + o[n] + ','; } if (k && MATS[k]) return MATS[k]; const p = Object.assign({ color: C(c), roughness: .85, metalness: 0 }, o); if (typeof p.emissive === 'number') p.emissive = C(p.emissive); const m = new T.MeshStandardMaterial(p); if (k) MATS[k] = m; return m; }
const glowMat = (c, o) => { const k = o && o.k !== undefined ? o.k : 4; if (o) { o = Object.assign({}, o); delete o.k; } return new T.MeshBasicMaterial(Object.assign({ color: C(c).multiplyScalar(E.hdr ? k : 1), toneMapped: false }, o)); };
const GEO = {}, geo = (k, f) => GEO[k] || (GEO[k] = f());
const gBox = () => geo('box', () => new T.BoxGeometry(1, 1, 1));
const gSph = () => geo('sph', () => new T.SphereGeometry(1, 28, 18));
const gIco = d => geo('ico' + d, () => new T.IcosahedronGeometry(1, d));
const gCyl = (s = 20) => geo('cyl' + s, () => new T.CylinderGeometry(1, 1, 1, s));
const gCone = (s = 20) => geo('cone' + s, () => new T.ConeGeometry(1, 1, s));
const gDisc = () => geo('disc', () => new T.CircleGeometry(1, 64).rotateX(-PI / 2));
const gTor = (t = .04) => geo('tor' + t, () => new T.TorusGeometry(1, t, 10, 72));
function M(g, m, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, parent) { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = o.receiveShadow = true; if (parent) parent.add(o); return o; }
function rod(a, b, r, m, parent) { const d = new V3().subVectors(b, a), o = M(gCyl(10), m, 0, 0, 0, r, d.length(), r, parent); o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return o; }
function label(text, o = {}) {
  const w = o.w || 512, h = o.h || 160, font = o.font || 'Titan One';
  const tex = ctex(w, h, g => {
    if (o.bg) { g.fillStyle = o.bg; const r = h * .25; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill(); }
    let fs = h * (o.fs || .66); g.font = `${o.weight || ''} ${fs}px "${font}",sans-serif`; const tw = g.measureText(text).width; if (tw > w * .92) { fs *= w * .92 / tw; g.font = `${o.weight || ''} ${fs}px "${font}",sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (o.stroke !== null) { g.lineWidth = fs * .16; g.strokeStyle = o.stroke || '#1a1230'; g.strokeText(text, w / 2, h * .54); }
    g.fillStyle = o.color || '#fff'; g.fillText(text, w / 2, h * .54);
  });
  const s = o.size || 2, m = new T.Mesh(new T.PlaneGeometry(s * w / h, s), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide, toneMapped: false, depthWrite: false, fog: o.fog !== false }));
  if (E.hdr) m.material.color.setScalar(o.glow || 1.25); m.renderOrder = 5; return m;
}
class Batch {
  constructor(root, shadow) { this.root = root; this.shadow = shadow; this.m = new Map(); this.o = new T.Object3D(); }
  put(g, m, x, y, z, sx = 1, sy = sx, sz = sx, ry = 0, col, rx = 0, rz = 0) { const o = this.o; o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); o.updateMatrix(); const k = g.uuid + m.uuid; let e = this.m.get(k); if (!e) this.m.set(k, e = { g, m, ms: [], cs: [], any: false }); e.ms.push(o.matrix.clone()); e.cs.push(col); if (col) e.any = true; }
  build() { const w = new T.Color(1, 1, 1); for (const e of this.m.values()) { const im = new T.InstancedMesh(e.g, e.m, e.ms.length); e.ms.forEach((mx, i) => { im.setMatrixAt(i, mx); if (e.any) im.setColorAt(i, e.cs[i] || w); }); im.castShadow = this.shadow; im.receiveShadow = this.shadow; im.frustumCulled = false; this.root.add(im); } this.m.clear(); }
}

/* ---------- renderer and scene ---------- */
const E = { t: 0, ticks: [], sunDir: new V3(.5, .8, .3) };
function initEngine() {
  const r = E.r = new T.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; E.pmrem = new T.PMREMGenerator(r);
  E.scene = new T.Scene(); E.cam = new T.PerspectiveCamera(50, 1, .3, 4000);
  E.hemi = new T.HemisphereLight(); E.sun = new T.DirectionalLight(); E.sun.castShadow = true;
  const s = E.sun.shadow; s.mapSize.set(4096, 4096); s.radius = 2; s.camera.left = s.camera.bottom = -75; s.camera.right = s.camera.top = 75; s.camera.near = 1; s.camera.far = 500; s.bias = -.0005; s.normalBias = .06;
  E.scene.add(E.hemi, E.sun, E.sun.target);
  E.sky = new T.Mesh(new T.SphereGeometry(3000, 32, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new T.Color() }, b: { value: new T.Color() }, c: { value: new T.Color() }, sd: { value: E.sunDir }, sc: { value: new T.Color() }, st: { value: 0 }, hd: { value: 0 }, sk: { value: 1 }, ev: { value: 1 } },
    vertexShader: 'varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 d;uniform vec3 a,b,c,sd,sc;uniform float st,hd,sk,ev;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){vec3 n=normalize(d);float h=n.y;vec3 col=mix(b,a,pow(clamp(h,0.,1.),.5));col=mix(col,c,1.-smoothstep(-.2,0.,h));col=max(col,vec3(0.));
float s=max(dot(n,sd),0.);col+=sc*sk*(pow(s,900.)*3.+pow(s,40.)*.35+pow(s,5.)*.14);
if(st>0.){vec2 g=n.xz/(abs(n.y)+.25)*90.;float r=h21(floor(g));col+=st*step(.985,r)*smoothstep(.45,.0,length(fract(g)-.5))*smoothstep(.05,.4,h);}
col=pow(col,vec3(2.2))*(1.+.12*hd)*ev;gl_FragColor=linearToOutputTexel(vec4(col,1.));}`
  }));
  E.sky.frustumCulled = false; E.scene.add(E.sky);
  E.envScene = new T.Scene(); E.envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), E.sky.material));
  if (T.EffectComposer && T.UnrealBloomPass && T.ShaderPass && r.capabilities.isWebGL2) {
    try {
      const sz = r.getDrawingBufferSize(new T.Vector2()), rt = new T.WebGLMultisampleRenderTarget(sz.x, sz.y, { type: T.HalfFloatType, format: T.RGBAFormat }); rt.samples = 4;
      E.comp = new T.EffectComposer(r, rt); E.comp.addPass(new T.RenderPass(E.scene, E.cam)); E.bloom = new T.UnrealBloomPass(new T.Vector2(sz.x, sz.y), .55, .7, 1.0); E.comp.addPass(E.bloom);
      E.final = new T.ShaderPass({
        uniforms: { tDiffuse: { value: null }, ex: { value: 1 }, vig: { value: .32 }, sat: { value: 1.12 }, tm: { value: 0 } },
        vertexShader: 'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform sampler2D tDiffuse;uniform float ex,vig,sat,tm;varying vec2 u;
vec3 fit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.432951)+.238081;return a/b;}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 c=texture2D(tDiffuse,u).rgb*ex/.6;
c=mat3(.59719,.076,.0284,.35458,.90834,.13383,.04823,.01566,.83777)*c;c=fit(c);c=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602)*c;c=clamp(c,0.,1.);
float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);c=pow(c,vec3(1./2.2));vec2 d=u-.5;c*=1.-vig*dot(d,d)*1.5;c+=(h(u*917.+tm)-.5)*.012;gl_FragColor=vec4(c,1.);}`
      }); E.comp.addPass(E.final); E.hdr = true; r.toneMapping = T.NoToneMapping; E.sky.material.uniforms.hd.value = 1;
    } catch (e) { console.warn('post-processing off', e); E.comp = null; E.hdr = false; r.toneMapping = T.ACESFilmicToneMapping; }
  }
  E.render = () => { const post = E.comp && Store.d.gfx !== 'low' && !E.autoLow; r.toneMapping = post ? T.NoToneMapping : T.ACESFilmicToneMapping; if (post) { E.final.uniforms.tm.value = E.t % 10; E.comp.render(); } else r.render(E.scene, E.cam); };
  E.setSize = (w, h, pr) => { r.setPixelRatio(pr); r.setSize(w, h, false); if (E.comp) { E.comp.setPixelRatio(pr); E.comp.setSize(w, h); } E.cam.aspect = w / h; E.cam.fov = w / h < 1 ? 72 : 50; E.cam.updateProjectionMatrix(); };
  E.root = new T.Group(); E.scene.add(E.root);
  E.fx = new T.Group(); E.scene.add(E.fx);
  FX.init(); Ball.init();
  addEventListener('resize', resize); resize();
}
function resize() { E.setSize(innerWidth, innerHeight, (Store.d.gfx === 'low' ? 1 : Math.min(devicePixelRatio || 1, 2)) * (E.scale || 1)); }
function clearScene() {
  E.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k of ['map', 'emissiveMap', 'normalMap', 'alphaMap']) if (m[k]) m[k].dispose(); m.dispose(); }); });
  while (E.root.children.length) E.root.remove(E.root.children[0]);
  E.ticks = []; FX.clear(); Ball.hide(); Ball.minS = 0;
}
function newCtx() { clearScene(); return { root: E.root, ticks: E.ticks, near: new Batch(E.root, true), far: new Batch(E.root, false), rng: srand(11) }; }
function atmosphere(o) {
  const u = E.sky.material.uniforms; u.a.value.set(o.sky[0]); u.b.value.set(o.sky[1]); u.c.value.set(o.sky[2] || o.sky[1]); u.sc.value.set(o.sunGlow || 0xfff2cc); u.st.value = o.stars || 0;
  E.scene.fog = new T.Fog(C(o.fog || o.sky[1]), o.fogNear || 150, o.fogFar || 1300);
  E.hemi.color = C(o.hemi[0]); E.hemi.groundColor = C(o.hemi[1]); E.hemi.intensity = o.hemi[2];
  E.sun.color = C(o.sun[0]); E.sun.intensity = o.sun[1]; E.sunDir.set(o.sun[2][0], o.sun[2][1], o.sun[2][2]).normalize();
  E.r.toneMappingExposure = o.exp || 1; if (E.final) E.final.uniforms.ex.value = (o.exp || 1) * .88; if (E.bloom) { E.bloom.strength = o.bloom === undefined ? .42 : o.bloom; E.bloom.threshold = o.bloomAt || 1.55; E.bloom.radius = .65; }
  if (E.pmrem) { const old = E.scene.environment; u.sk.value = .1; u.ev.value = o.env === undefined ? .5 : o.env; E.scene.environment = E.pmrem.fromScene(E.envScene, 0, 1, 200).texture; u.sk.value = 1; u.ev.value = 1; if (old) old.dispose(); E.hemi.intensity = o.hemi[2] * (o.amb === undefined ? .4 : o.amb); }
}

/* ---------- camera ---------- */
const Cam = {
  p: new V3(0, 3, 8), l: new V3(0, 3, -50), fp: new V3(), fl: new V3(), hp: new V3(), hl: new V3(), tp: new V3(), tl: new V3(), shake: 0, mode: 'home', cut: null, orbit: null, max: 400,
  home(p, l, snap) { this.hp.fromArray(p); this.hl.fromArray(l); this.mode = 'home'; if (snap) { this.p.copy(this.hp); this.l.copy(this.hl); } },
  cutTo(p, l, dur) { this.cut = { p: new V3().fromArray(p), l: new V3().fromArray(l), t: dur }; },
  update(dt) {
    let kp = 2.2, kl = 3.5;
    if (this.orbit) { const o = this.orbit; o.a += dt * o.sp; this.tp.set(o.c[0] + Math.sin(o.a) * o.r, o.h, o.c[2] + Math.cos(o.a) * o.r); this.tl.fromArray(o.c); }
    else if (this.cut) { this.tp.copy(this.cut.p); this.tl.copy(this.cut.l); this.cut.t -= dt; kp = 2.6; if (this.cut.t <= 0) this.cut = null; }
    else if (this.mode === 'free') { this.tp.copy(this.fp); this.tl.copy(this.fl); kp = 2.6; kl = 5; }
    else if (this.mode === 'follow' && Ball.on) {
      const b = Ball.p, f = clamp(-b.z - 16, 0, this.max) * .82;
      this.tp.set(this.hp.x + b.x * .55, this.hp.y + clamp(b.y * .28, 0, 14) + f * .035, this.hp.z - f);
      this.tl.set(b.x, b.y + 1.2, b.z - 4); kp = 3; kl = 7;
    } else { this.tp.copy(this.hp); this.tl.copy(this.hl); this.tp.x += Math.sin(E.t * .3) * .25; this.tp.y += Math.sin(E.t * .43) * .1; }
    this.p.lerp(this.tp, 1 - Math.exp(-dt * kp)); this.l.lerp(this.tl, 1 - Math.exp(-dt * kl));
    E.cam.position.copy(this.p);
    if (this.shake > .001) { E.cam.position.x += rnd(-1, 1) * this.shake; E.cam.position.y += rnd(-1, 1) * this.shake; this.shake *= Math.exp(-dt * 6); }
    E.cam.lookAt(this.l); E.sky.position.copy(E.cam.position);
    E.sun.target.position.set(this.l.x * .5 + this.p.x * .5, 0, lerp(this.p.z, this.l.z, .55)); E.sun.position.copy(E.sun.target.position).addScaledVector(E.sunDir, 220);
  }
};

/* ---------- effects ---------- */
class PSys {
  constructor(n, add) {
    this.n = n; this.i = 0; this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.sz = new Float32Array(n); this.al = new Float32Array(n);
    this.life = new Float32Array(n); this.max = new Float32Array(n); this.gr = new Float32Array(n); this.dr = new Float32Array(n); this.s0 = new Float32Array(n); this.gw = new Float32Array(n);
    const g = this.g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.pos, 3)); g.setAttribute('aCol', new T.BufferAttribute(this.col, 3)); g.setAttribute('aSz', new T.BufferAttribute(this.sz, 1)); g.setAttribute('aAl', new T.BufferAttribute(this.al, 1));
    this.pts = new T.Points(g, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, uniforms: { sc: { value: 600 }, soft: { value: add ? .0 : .32 }, bo: { value: add && E.hdr ? 3.2 : 1 } },
      vertexShader: 'attribute vec3 aCol;attribute float aSz,aAl;varying vec3 c;varying float a;uniform float sc;void main(){c=aCol;a=aAl;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSz*sc/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 c;varying float a;uniform float soft,bo;void main(){float d=length(gl_PointCoord-.5);float m=smoothstep(.5,soft,d);if(m*a<.01)discard;gl_FragColor=vec4(c*bo,m*a);}'
    }));
    this.pts.frustumCulled = false; this.pts.renderOrder = 8;
  }
  emit(p, n, o) {
    for (let k = 0; k < n; k++) {
      const i = this.i = (this.i + 1) % this.n, j = i * 3, sp = rnd(o.v[0], o.v[1]), th = rnd(PI * 2), ph = Math.acos(rnd(o.up === undefined ? -1 : o.up, 1));
      const r = o.r || 0; this.pos[j] = p.x + rnd(-r, r); this.pos[j + 1] = p.y + rnd(-r, r) * (o.ry === undefined ? 1 : o.ry); this.pos[j + 2] = p.z + rnd(-r, r);
      this.vel[j] = Math.sin(ph) * Math.cos(th) * sp; this.vel[j + 1] = Math.cos(ph) * sp; this.vel[j + 2] = Math.sin(ph) * Math.sin(th) * sp;
      const c = C(pick(o.c)); this.col[j] = c.r; this.col[j + 1] = c.g; this.col[j + 2] = c.b;
      this.s0[i] = rnd(o.s[0], o.s[1]); this.gw[i] = o.grow || 0; this.max[i] = this.life[i] = rnd(o.life[0], o.life[1]); this.gr[i] = o.g === undefined ? 9 : o.g; this.dr[i] = o.drag || 0;
    }
  }
  update(dt) {
    const { pos, vel, life, max, n } = this;
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) { if (this.al[i] !== 0) { this.al[i] = 0; this.sz[i] = 0; } continue; }
      life[i] -= dt; const j = i * 3, d = Math.exp(-this.dr[i] * dt); vel[j] *= d; vel[j + 1] = vel[j + 1] * d - this.gr[i] * dt; vel[j + 2] *= d;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt; if (pos[j + 1] < .05 && this.gr[i] > 0) { pos[j + 1] = .05; vel[j + 1] *= -.3; vel[j] *= .6; vel[j + 2] *= .6; }
      const k = Math.max(life[i], 0) / max[i]; this.al[i] = Math.min(1, k * 2.5); this.sz[i] = this.s0[i] * (1 + this.gw[i] * (1 - k));
    }
    const a = this.g.attributes; a.position.needsUpdate = a.aSz.needsUpdate = a.aAl.needsUpdate = a.aCol.needsUpdate = true;
    this.pts.material.uniforms.sc.value = innerHeight * .9;
  }
  clear() { this.life.fill(0); }
}
const FX = {
  rings: [], lights: [], fl: [],
  init() {
    this.glow = new PSys(2500, true); this.solid = new PSys(3500, false); E.fx.add(this.solid.pts, this.glow.pts);
    for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.RingGeometry(.82, 1, 64).rotateX(-PI / 2), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide })); m.visible = false; m.renderOrder = 7; E.fx.add(m); this.rings.push({ m, t: 0, d: 1 }); }
    for (let i = 0; i < 3; i++) { const l = new T.PointLight(0xffa040, 0, 90, 2); E.fx.add(l); this.lights.push(l); }
  },
  clear() { this.glow.clear(); this.solid.clear(); this.rings.forEach(r => { r.t = 0; r.m.visible = false; }); this.fl.forEach(f => f.el.remove()); this.fl = []; },
  ring(p, r, col, d = .7, y) { const o = this.rings.find(r => r.t <= 0) || this.rings[0]; o.m.position.set(p.x, y === undefined ? p.y + .15 : y, p.z); o.m.material.color.set(col); o.t = o.d = d; o.r = r; o.m.visible = true; },
  flash(p, i = 6) { const l = this.lights.sort((a, b) => a.intensity - b.intensity)[0]; l.position.set(p.x, p.y + 2, p.z); l.intensity = i; },
  text(p, s, cls = '') { const el = document.createElement('div'); el.className = 'fl ' + cls; el.textContent = s; $('floaters').appendChild(el); this.fl.push({ el, p: p.clone(), t: 1.5 }); },
  explode(p, s = 1) {
    this.glow.emit(p, 70, { v: [4 * s, 20 * s], up: -.2, c: [0xffe27a, 0xff9a2e, 0xff5a1a, 0xffffff], s: [.6 * s, 1.7 * s], life: [.35, .9], g: -3, drag: 2.2, r: .6 * s, grow: 1.2 });
    this.solid.emit(p, 34, { v: [2 * s, 9 * s], up: .1, c: [0x3a3330, 0x57504a, 0x2a2523], s: [1.4 * s, 3 * s], life: [1, 2.2], g: -2.5, drag: 1.3, r: 1 * s, grow: 1.6 });
    this.solid.emit(p, 40, { v: [6 * s, 22 * s], up: .15, c: [0x8a4b2a, 0xc8392b, 0x3b2a20, 0xe8c070], s: [.16, .42], life: [1.2, 2.4], g: 22, drag: .3 });
    this.ring(p, 13 * s, 0xffc070, .55, .2); this.flash(p, 9 * s); Cam.shake = Math.max(Cam.shake, .5 * s); Snd.boom();
    const f = $('flash'); f.style.transition = 'none'; f.style.opacity = .35; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; });
  },
  confetti(p, n = 90, sp = 1) { this.solid.emit(p, n, { v: [5 * sp, 16 * sp], up: .2, c: [0xff5d73, 0xffc93c, 0x2ad4c0, 0x3fa7ff, 0xb98bff, 0xffffff], s: [.16, .34], life: [1.6, 3.2], g: 7, drag: 1.4, r: .5 }); },
  stars(p, n = 26, c = [0xffe27a, 0xffffff, 0xffc93c]) { this.glow.emit(p, n, { v: [4, 13], up: 0, c, s: [.3, .8], life: [.5, 1.1], g: 6, drag: 1.5 }); },
  splash(p) { const q = new V3(p.x, .1, p.z); this.solid.emit(q, 60, { v: [3, 13], up: .55, c: [0xffffff, 0xd8f2ff, 0x9bd8ff], s: [.14, .4], life: [.6, 1.3], g: 16, drag: .5, r: .4, ry: 0 }); this.ring(q, 7, 0xcfefff, .9, .08); Snd.splash(); },
  dust(p, c = [0xd9c9a0, 0xb9a878], n = 16) { this.solid.emit(new V3(p.x, (p.y || 0) + .15, p.z), n, { v: [1, 4], up: .3, c, s: [.3, .8], life: [.4, .9], g: -1, drag: 2, grow: 1.5 }); },
  update(dt) {
    this.glow.update(dt); this.solid.update(dt);
    for (const r of this.rings) if (r.t > 0) { r.t -= dt; const k = 1 - Math.max(r.t, 0) / r.d, s = r.r * (1 - Math.pow(1 - k, 3)); r.m.scale.set(s, 1, s); r.m.material.opacity = (1 - k) * .9; if (r.t <= 0) r.m.visible = false; }
    for (const l of this.lights) l.intensity *= Math.exp(-dt * 7);
    const v = new V3(), w = innerWidth, h = innerHeight;
    this.fl = this.fl.filter(f => { f.t -= dt; if (f.t <= 0) { f.el.remove(); return false; } v.copy(f.p).project(E.cam); f.el.style.left = clamp((v.x * .5 + .5) * w, 60, w - 60) + 'px'; f.el.style.top = clamp((-v.y * .5 + .5) * h, 60, h - 60) + 'px'; f.el.style.visibility = v.z < 1 ? 'visible' : 'hidden'; return true; });
  }
};

/* ---------- ball flight ---------- */
const SURF = { ice: { e: .25, f: .82, roll: 2.4 }, court: { e: .55, f: .78, roll: 3 }, turf: { e: .3, f: .5, roll: 7.5 }, grass: { e: .36, f: .6, roll: 5.2 }, green: { e: .26, f: .6, roll: 2.3 }, road: { e: .48, f: .74, roll: 2.1 }, wood: { e: .4, f: .62, roll: 4 }, sandy: { e: .22, f: .5, roll: 8 } };
const G_A = .5 * 1.225 * .001432 / .04593;
function aero(v, w, wd, out) { const sp = v.length() || .001, S = w * .02135 / sp, cd = .24 + .2 * Math.min(S, .6) - .05 * smooth(55, 76, sp), cl = Math.min(.32, .12 + .6 * S) * smooth(4, 14, sp), k = G_A * sp; out.crossVectors(wd, v).multiplyScalar(k * cl).addScaledVector(v, -k * cd); out.y -= 9.81; return out; }
function shotVectors(s, v, wd) { const a = s.vla * PI / 180, h = s.hla * PI / 180, sp = s.speed * .44704, ax = (s.axis || 0) * PI / 180; v.set(Math.sin(h) * Math.cos(a) * sp, Math.sin(a) * sp, -Math.cos(h) * Math.cos(a) * sp); wd.set(Math.cos(h) * Math.cos(ax), -Math.sin(ax), Math.sin(h) * Math.cos(ax)); return (s.spin || 0) * 2 * PI / 60; }
function simCarry(s) { const v = new V3(), wd = new V3(), a = new V3(), p = new V3(0, .02, 0); let w = shotVectors(s, v, wd), t = 0; const dt = 1 / 120; while (t < 15) { aero(v, w, wd, a); v.addScaledVector(a, dt); p.addScaledVector(v, dt); w *= Math.exp(-dt / 30); t += dt; if (p.y <= 0) break; } return p; }
function padShot(u, pw) { const speed = lerp(26, 172, pw); return { speed, vla: lerp(36, 11, Math.pow(pw, .75)), hla: u * 13, spin: clamp(11500 - speed * 54, 2300, 9500), axis: 0 }; }
function solveShot(x, z, loft) { const d = Math.hypot(x, z), hla = Math.atan2(x, -z) * 180 / PI; let lo = 0, hi = 1; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2, s = padShot(0, m); if (loft) s.vla = loft; const c = simCarry(s); (Math.hypot(c.x, c.z) < d ? lo = m : hi = m); } const s = padShot(0, (lo + hi) / 2); if (loft) s.vla = loft; s.hla = hla; return s; }
const Ball = {
  p: new V3(), v: new V3(), wd: new V3(), a: new V3(), w: 0, on: false, state: 'idle', cd: 0, n: 0, tr: [],
  init() {
    this.m = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .3, emissive: 0xffffff, emissiveIntensity: .5 })); this.m.castShadow = true; this.m.visible = false; E.fx.add(this.m);
    const N = this.N = 70, g = this.tg = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 6), 3)); g.setAttribute('aA', new T.BufferAttribute(new Float32Array(N * 2), 1));
    const ix = []; for (let i = 0; i < N - 1; i++)ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(ix);
    this.tm = new T.Mesh(g, new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { c: { value: new T.Color(1, 1, 1) } }, vertexShader: 'attribute float aA;varying float a;void main(){a=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'uniform vec3 c;varying float a;void main(){gl_FragColor=vec4(mix(vec3(1.),c,.65),a*.85);}' }));
    this.tm.frustumCulled = false; this.tm.visible = false; this.tm.renderOrder = 6; E.fx.add(this.tm);
  },
  hide() { this.on = false; this.m.visible = false; this.tm.visible = false; this.state = 'idle'; },
  launch(s, color) {
    this.w = shotVectors(s, this.v, this.wd); this.p.set(0, .03, 0); this.state = 'air'; this.on = true; this.t = 0; this.apex = 0; this.carry = null; this.land = null; this.cd = 0; this.cells = null; this.wall = 0; this.wet = false; this.lost = false; this.sand = false; this.n = 0; this.tr = [];
    this.m.visible = true; this.tm.visible = true; this.tm.material.uniforms.c.value.set(color || '#fff'); this.acc = 0; this.shot = s;
  },
  step(dt, game) {
    const p = this.p, v = this.v; this.t += dt; this.cd -= dt; if (this.state === 'custom') return;
    const gy = game.ground ? game.ground(p.x, p.z) : 0;
    if (this.state === 'air') {
      aero(v, this.w, this.wd, this.a); v.addScaledVector(this.a, dt); p.addScaledVector(v, dt); this.w *= Math.exp(-dt / 30); if (p.y > this.apex) this.apex = p.y;
      if (p.y <= gy && gy - p.y > 1.4) { p.x -= v.x * dt; p.z -= v.z * dt; v.x *= -.3; v.z *= -.3; if (v.y > 0) v.y *= .3; if (this.cd <= 0) { this.cd = .2; Snd.thud(); FX.stars(p, 10, [0xffffff, 0x9bd8ff]); } if (++this.wall > 240 || this.t > 16) { this.lost = true; this.state = 'done'; } return; }
      if (p.y <= gy && v.y < 0) {
        p.y = gy; const sf = (game.surface && game.surface(p.x, p.z)) || 'grass';
        if (this.carry === null) { this.carry = Math.hypot(p.x, p.z); this.land = p.clone(); const r = game.onLand && game.onLand(this, sf); if (r === 'stop') { this.state = 'done'; return; } }
        if (sf === 'void') { this.lost = true; this.state = 'done'; return; }
        if (sf === 'water') { FX.splash(p); this.wet = true; this.state = 'done'; return; }
        if (sf === 'sand') { FX.dust(p, [0xf2e2b0, 0xe2cf98], 22); Snd.thud(); this.sand = true; this.state = 'done'; return; }
        const S = SURF[sf] || SURF.grass; if (this.n < 2) { FX.dust(p, sf === 'road' ? [0x888899, 0xaaaabb] : undefined, 8); if (this.n === 0) Snd.thud(); } this.n++;
        const grip = S.f * (this.n === 1 ? clamp(1.12 - this.w * 9.549 / 11000, .3, 1) : 1); v.y = -v.y * S.e; v.x *= grip; v.z *= grip; this.w *= .5; if (v.y < 1.1) { v.y = 0; this.state = 'roll'; this.gy = gy; }
      }
    } else if (this.state === 'roll') {
      if (gy < this.gy - .4) { this.state = 'air'; return; } if (gy > this.gy + .4) { p.x -= v.x * dt * 2; p.z -= v.z * dt * 2; v.x *= -.4; v.z *= -.4; return; } this.gy = gy;
      const sf = (game.surface && game.surface(p.x, p.z)) || 'grass';
      if (sf === 'water') { FX.splash(p); this.wet = true; this.state = 'done'; return; }
      if (sf === 'sand') { this.sand = true; this.state = 'done'; return; }
      const S = SURF[sf] || SURF.grass, sp = Math.hypot(v.x, v.z); if (sp < .3) { this.state = 'done'; return; }
      const k = Math.max(0, sp - S.roll * dt) / sp; v.x *= k; v.z *= k; p.x += v.x * dt; p.z += v.z * dt; p.y = gy;
    }
    if (this.t > 16 || Math.abs(p.x) > 500 || p.z < -700 || p.z > 60) this.state = 'done';
  },
  draw() {
    if (!this.on) return; const cp = E.cam.position, d = this.p.distanceTo(cp), s = clamp(d * .0048, this.minS || .05, 1.6); this.m.position.copy(this.p); this.m.position.y += s; this.m.scale.setScalar(s);
    if (this.state === 'air' || this.state === 'roll' || this.state === 'custom') { const q = this.m.position.clone(); if (!this.tr.length || this.tr[this.tr.length - 1].distanceToSquared(q) > .2) { this.tr.push(q); if (this.tr.length > this.N) this.tr.shift(); } }
    const pos = this.tg.attributes.position.array, al = this.tg.attributes.aA.array, n = this.tr.length, side = new V3(), dir = new V3(), tc = new V3();
    for (let i = 0; i < this.N; i++) {
      const k = Math.min(i, n - 1), pt = n ? this.tr[k] : this.p; if (n > 1) { dir.subVectors(this.tr[Math.min(k + 1, n - 1)], this.tr[Math.max(k - 1, 0)]); tc.subVectors(cp, pt); side.crossVectors(dir, tc).normalize(); } else side.set(0, 0, 0);
      const w = clamp(pt.distanceTo(cp) * .0042, .04, 1.3) * (n > 1 ? k / (n - 1) : 0); pos[i * 6] = pt.x + side.x * w; pos[i * 6 + 1] = pt.y + side.y * w; pos[i * 6 + 2] = pt.z + side.z * w; pos[i * 6 + 3] = pt.x - side.x * w; pos[i * 6 + 4] = pt.y - side.y * w; pos[i * 6 + 5] = pt.z - side.z * w;
      al[i * 2] = al[i * 2 + 1] = n > 1 ? Math.pow(k / (n - 1), 1.5) : 0;
    }
    this.tg.attributes.position.needsUpdate = this.tg.attributes.aA.needsUpdate = true;
  }
};
