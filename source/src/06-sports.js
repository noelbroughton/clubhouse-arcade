/* ============ Sports: four games with five levels each ============ */
// Each player has their own level. Score on 2 of the 3 shots in a turn and that player moves up a level next turn.
function levelKit(match, max = 5) {
  const lv = match.players.map(() => 1); let cur = 0, n = 0, made = 0, up = false;
  return {
    get lv() { return lv[cur]; }, begin(pi) { cur = pi; n = 0; made = 0; up = false; },
    shot(ok) { n++; if (ok) made++; if (n >= match.spt && made >= 2 && lv[cur] < max) { lv[cur]++; up = true; setTimeout(() => Snd.coin(), 500); } },
    sub(s) { return up && n >= match.spt ? (s ? s + ' · ' : '') + 'LEVEL UP' : s; },
    label() { return 'Level ' + lv[cur] + (n < match.spt ? ' · shot ' + (n + 1) + ' of ' + match.spt : ''); }
  };
}
let _crowd; function crowdMat() {
  const t = ctex(1024, 512, (g, w, h) => { g.fillStyle = '#1b2036'; g.fillRect(0, 0, w, h); const cols = ['#e8344e', '#3fa7ff', '#ffc93c', '#f4f0e6', '#44d68a', '#b98bff', '#ff9a3c', '#2a2f4a', '#d9b48f']; for (let r = 0; r < 12; r++)for (let i = 0; i < 64; i++) { if (Math.random() < .12) continue; const x = i * 16 + 8 + rnd(-3, 3), y = r * 42 + 26 + rnd(-3, 3); g.fillStyle = pick(cols); g.fillRect(x - 6, y, 12, 16); g.fillStyle = pick(['#f2c9a0', '#d9a878', '#8a5a3a', '#f6d7b8']); g.beginPath(); g.arc(x, y - 4, 5.2, 0, 7); g.fill(); } });
  t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}
function standBlock(ctx, x, z, w, ry, rows = 10, y0 = 0) {
  const g = new T.Group(); g.position.set(x, y0, z); g.rotation.y = ry; ctx.root.add(g); const len = rows * 1.42, ang = Math.atan2(.9, 1.1), tex = crowdMat(); tex.repeat.set(Math.max(1, Math.round(w / 30)), Math.max(.5, len / 9));
  const slab = M(gBox(), mat(0x1a1f33, { roughness: .9 }), 0, rows * .45 + .2, -rows * .55, w, 1, len + 1, g); slab.rotation.x = ang;
  const p = new T.Mesh(new T.PlaneGeometry(w, len), new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color(1, 1, 1), emissiveIntensity: .35, roughness: 1 })); p.position.set(0, rows * .45 + .95, -rows * .55 + .45); p.rotation.x = ang - PI / 2; g.add(p);
  M(gBox(), mat(0x2a3350), 0, .7, .9, w, 1.4, .4, g); M(gBox(), mat(0x14182a), 0, rows * .9 + 1.6, -rows * 1.1 - .6, w, 3.2, .6, g); return g;
}
function floodlight(ctx, x, z, h, face = 0) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = face; ctx.root.add(g); M(gCyl(8), mat(0x555b70, { metalness: .6, roughness: .4 }), 0, h / 2, 0, .35, h, .35, g); M(gBox(), mat(0x2a2f40), 0, h + 1.2, 0, 7, 3.4, .6, g);
  for (let i = 0; i < 4; i++)for (let j = 0; j < 2; j++) { const b = M(gBox(), glowMat(0xfff4d8, { k: 5 }), -2.4 + i * 1.6, h + .5 + j * 1.4, .35, 1.1, .9, .1, g); b.castShadow = false; }
  const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: 0xfff0c8, blending: T.AdditiveBlending, depthWrite: false, opacity: .5, fog: false })); s.position.set(0, h + 1.2, .6); s.scale.setScalar(26); g.add(s);
}
function athlete(col, o = {}) {
  const g = new T.Group(), c = mat(col, { roughness: .6 }), skin = mat(o.skin || 0xe9b98f), dark = mat(o.pants || 0x23283a), s = o.s || 1; g.scale.setScalar(s);
  for (const k of [-1, 1]) { M(gBox(), dark, k * .2, .45, 0, .26, .9, .3, g); M(gBox(), mat(0xf4f0e6), k * .2, .06, .06, .28, .14, .44, g); const a = M(gBox(), c, k * .52, 1.28, 0, .2, .7, .24, g); a.rotation.z = k * .18; M(gSph(), skin, k * .6, .92, 0, .11, .11, .11, g); }
  M(gBox(), c, 0, 1.3, 0, .78, .82, .4, g); if (o.pads) M(gBox(), c, 0, 1.62, 0, 1.1, .26, .5, g); M(gSph(), skin, 0, 1.98, 0, .24, .26, .24, g);
  if (o.helmet) { M(gSph(), mat(o.helmet, { roughness: .25, metalness: .3 }), 0, 2.03, -.02, .3, .3, .31, g); M(gBox(), mat(0x9aa0b0, { metalness: .7 }), 0, 1.93, .27, .3, .16, .04, g); } else if (o.cap) { M(gSph(), mat(o.cap), 0, 2.1, 0, .26, .16, .26, g); M(gBox(), mat(o.cap), 0, 2.07, .28, .3, .04, .26, g); }
  return g;
}

/* ---------------- arenas ---------------- */
function envRink(ctx) {
  E.snd = 'arena'; atmosphere({ sky: [0x04060c, 0x0a0f1e, 0x0a0f1e], fog: 0x0a1020, fogNear: 140, fogFar: 700, hemi: [0xe6efff, 0x93a8c8, .7], sun: [0xffffff, .85, [.12, .92, .36]], sunGlow: 0x000000, exp: .9, bloom: .28, bloomAt: 2.3, env: 1.4, amb: .9 });
  groundPlane(ctx, ctex(64, 64, g => { g.fillStyle = '#20232e'; g.fillRect(0, 0, 64, 64); }, [50, 50]), -.02, 600);
  const W = 30, Z0 = 10, Z1 = -28, L = Z0 - Z1, cz = (Z0 + Z1) / 2, k = 512 / W;
  const tex = ctex(512, Math.round(L * k), (g, w, h) => { const zy = z => (z - Z1) * k; g.fillStyle = '#c9d8ea'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, .02); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; for (let i = 0; i < 60; i++) { g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + rnd(-80, 80), y + rnd(-80, 80), x + rnd(-140, 140), y + rnd(-140, 140)); g.stroke(); }
    g.fillStyle = '#2f6fe0'; g.fillRect(0, zy(-2) - 5, w, 10); g.fillStyle = '#d6263c'; g.fillRect(0, zy(-18.3) - 2, w, 4); g.fillRect(0, zy(8) - 5, w, 10);
    g.fillStyle = 'rgba(63,140,240,.35)'; g.beginPath(); g.arc(w / 2, zy(-18.3), 3.6 * k, PI, 0, true); g.fill(); g.strokeStyle = '#d6263c'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, zy(-18.3), 3.6 * k, PI, 0, true); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(w / 2 + sx * 8.5 * k, zy(-11), 4.2 * k, 0, 7); g.stroke(); g.fillStyle = '#d6263c'; g.beginPath(); g.arc(w / 2 + sx * 8.5 * k, zy(-11), .4 * k, 0, 7); g.fill(); } });
  const ice = new T.Mesh(new T.PlaneGeometry(W, L).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: tex, roughness: .12, metalness: .05, envMapIntensity: .5 })); ice.position.set(0, .01, cz); ice.receiveShadow = true; ctx.root.add(ice);
  const wht = mat(0xf2f4f8, { roughness: .5 }), yel = mat(0xffc93c), glass = new T.MeshStandardMaterial({ color: C(0xbfe0ff), transparent: true, opacity: .13, roughness: .05, metalness: .2, depthWrite: false });
  const board = (x, z, w, ry) => { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.root.add(g); M(gBox(), wht, 0, .6, 0, w, 1.2, .25, g); M(gBox(), yel, 0, .1, .14, w, .2, .05, g); M(gBox(), mat(0xd6263c), 0, 1.22, 0, w, .08, .3, g); const gl = M(gBox(), glass, 0, 2.3, 0, w, 2.1, .06, g); gl.castShadow = false; for (let i = 0; i <= Math.round(w / 2.4); i++)M(gBox(), mat(0x8a90a0, { metalness: .6 }), -w / 2 + i * w / Math.round(w / 2.4), 2.3, 0, .06, 2.1, .1, g); };
  board(0, Z1, W, 0); board(-W / 2, cz, L, PI / 2); board(W / 2, cz, L, PI / 2);
  standBlock(ctx, 0, Z1 - 2.5, W + 26, 0, 12); standBlock(ctx, -W / 2 - 2.5, cz, L + 4, PI / 2, 12); standBlock(ctx, W / 2 + 2.5, cz, L + 4, -PI / 2, 12);
  for (let i = 0; i < 5; i++)for (const sx of [-1, 1]) { const b = M(gBox(), glowMat(0xffffff, { k: 6 }), sx * 7, 19, 4 - i * 8, 5, .15, 1.2, ctx.root); b.castShadow = false; } M(gBox(), mat(0x20232e, { metalness: .5 }), 0, 19.6, cz, 22, .5, L, ctx.root).castShadow = false;
  const sb = new T.Group(); sb.position.set(0, 13.5, -9); ctx.root.add(sb); M(gBox(), mat(0x14182a, { metalness: .4 }), 0, 0, 0, 7, 3.6, 7, sb).castShadow = false; for (let i = 0; i < 4; i++) { const l = label(i % 2 ? 'SLAPSHOT' : 'CLUBHOUSE ARENA', { w: 768, h: 200, size: 1.7, color: i % 2 ? '#ffc93c' : '#fff', stroke: null, glow: 2 }); l.position.set(Math.sin(i * PI / 2) * 3.52, 0, Math.cos(i * PI / 2) * 3.52); l.rotation.y = i * PI / 2; sb.add(l); } for (const sx of [-1, 1]) M(gCyl(6), mat(0x555b70), sx * 2.5, 16.6, -9, .06, 6, .06, ctx.root);
}
function envCourt(ctx) {
  E.snd = 'arena'; atmosphere({ sky: [0x2b55c8, 0xffc890, 0xff9e70], fog: 0xf0b890, fogNear: 160, fogFar: 1100, hemi: [0xffe6cc, 0x6a5a70, .95], sun: [0xffc890, 1.5, [-.6, .42, -.5]], sunGlow: 0xffd0a0, exp: 1.05, bloom: .5, bloomAt: 1.5 });
  groundPlane(ctx, ctex(128, 128, (g, w) => { g.fillStyle = '#3a3c48'; g.fillRect(0, 0, w, w); speckle(g, w, w, 1400, .05); }, [120, 120]));
  const W = 34, Z0 = 8, Z1 = -46, L = Z0 - Z1, k = 512 / W, tex = ctex(512, Math.round(L * k), (g, w, h) => { const zy = z => (z - Z1) * k; g.fillStyle = '#1f8f8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8763a'; g.fillRect(w * .28, zy(-10), w * .44, zy(-40) - zy(-10)); speckle(g, w, h, 5000, .03); g.strokeStyle = '#fff6e4'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20); g.strokeRect(w * .28, zy(-10), w * .44, zy(-40) - zy(-10)); g.beginPath(); g.arc(w / 2, zy(-10), w * .22, 0, PI); g.stroke(); g.beginPath(); g.arc(w / 2, zy(-25), 5 * k, 0, 7); g.stroke(); g.beginPath(); g.arc(w / 2, zy(-40), w * .36, PI, 0); g.stroke(); g.beginPath(); g.moveTo(10, zy(-25)); g.lineTo(w - 10, zy(-25)); g.stroke(); });
  const c = new T.Mesh(new T.PlaneGeometry(W, L).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: tex, roughness: .7 })); c.position.set(0, .02, (Z0 + Z1) / 2); c.receiveShadow = true; ctx.root.add(c);
  const fen = ctex(64, 64, g => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(210,215,230,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }), fm = (w, h) => { const t = fen.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / .7, h / .7); return new T.MeshBasicMaterial({ map: t, transparent: true, side: T.DoubleSide, depthWrite: false }); };
  const fence = (x, z, w, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, 6), fm(w, 6)); m.position.set(x, 3, z); m.rotation.y = ry; ctx.root.add(m); for (let i = 0; i <= Math.round(w / 6); i++) { const t = -w / 2 + i * w / Math.round(w / 6); M(gCyl(8), mat(0x8a90a0, { metalness: .6, roughness: .4 }), x + Math.cos(ry) * t, 3, z - Math.sin(ry) * t, .08, 6, .08, ctx.root); } };
  fence(0, Z1 - 2, W + 4, 0); fence(-W / 2 - 2, (Z0 + Z1) / 2, L + 4, PI / 2); fence(W / 2 + 2, (Z0 + Z1) / 2, L + 4, PI / 2);
  standBlock(ctx, -W / 2 - 4, -22, 30, PI / 2, 5); standBlock(ctx, W / 2 + 4, -22, 30, -PI / 2, 5);
  const kit = cityKit(null, 1.1, .25), r = ctx.rng; for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2, d = lerp(95, 190, r()); kit.tower(ctx, Math.sin(a) * d, Math.cos(a) * d - 20, lerp(22, 44, r()), lerp(22, 44, r()), lerp(18, 85, r()), i % 4); }
  floodlight(ctx, -W / 2 - 3, Z1 - 3, 14, .6); floodlight(ctx, W / 2 + 3, Z1 - 3, 14, -.6); clouds(ctx, 10, 0xffd8b8);
}
function envGridiron(ctx) {
  E.snd = 'arena'; atmosphere({ sky: [0x050818, 0x16224e, 0x1c2450], fog: 0x121a3a, fogNear: 180, fogFar: 900, hemi: [0xdfe8ff, 0x4a6a4a, 1], sun: [0xfff6e0, 1.35, [.3, .85, .35]], sunGlow: 0x000000, stars: .8, exp: 1.08, bloom: .55, bloomAt: 1.5, env: 2.4, amb: .95 });
  groundPlane(ctx, ctex(64, 64, g => { g.fillStyle = '#1c2a22'; g.fillRect(0, 0, 64, 64); }, [60, 60]), -.02, 900);
  const W = 49, Y0 = -10, Y1 = 60, k = 14.6, w = Math.round(W * k / YD * .9144 / .9144), tex = ctex(768, 1024, (g, cw, ch) => { const py = yd => (Y1 - yd) / (Y1 - Y0) * ch; for (let yd = Y0; yd < Y1; yd += 5) { g.fillStyle = yd >= 50 ? '#c8392b' : ((yd / 5) & 1) ? '#2f9a48' : '#38a852'; g.fillRect(0, py(yd + 5), cw, py(yd) - py(yd + 5) + 1); } speckle(g, cw, ch, 9000, .03); g.fillStyle = '#fff'; for (let yd = 0; yd <= 60; yd += 5) g.fillRect(0, py(yd) - 2, cw, yd % 10 ? 3 : 5); g.fillRect(0, 0, 8, ch); g.fillRect(cw - 8, 0, 8, ch); for (let yd = 0; yd < 50; yd++)for (const x of [.33, .67]) g.fillRect(cw * x - 6, py(yd) - 1, 12, 2);
    g.font = '800 64px "Outfit",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let yd = 10; yd <= 40; yd += 10)for (const x of [.14, .86]) g.fillText(String(yd), cw * x, py(yd) + 40); g.font = '110px "Titan One",sans-serif'; g.fillStyle = '#ffc93c'; g.fillText('TOUCHDOWN', cw / 2, py(55)); });
  tex.flipY = true; const f = new T.Mesh(new T.PlaneGeometry(W, (Y1 - Y0) / YD).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: tex, roughness: .95 })); f.position.set(0, .01, -(Y0 + Y1) / 2 / YD); f.receiveShadow = true; ctx.root.add(f);
  const gp = mat(0xffd21f, { metalness: .4, roughness: .35 }), gz = -60 / YD; M(gCyl(10), gp, 0, 1.6, gz, .16, 3.2, .16, ctx.root); rod(new V3(-2.8, 3.2, gz), new V3(2.8, 3.2, gz), .14, gp, ctx.root); for (const s of [-1, 1]) M(gCyl(10), gp, s * 2.8, 7.7, gz, .12, 9, .12, ctx.root);
  const fl = -(Y0 + Y1) / 2 / YD, len = (Y1 - Y0) / YD; standBlock(ctx, -W / 2 - 7, fl, len + 20, PI / 2, 16); standBlock(ctx, W / 2 + 7, fl, len + 20, -PI / 2, 16); standBlock(ctx, 0, gz - 9, W + 40, 0, 14);
  floodlight(ctx, -W / 2 - 26, gz - 6, 30, .7); floodlight(ctx, W / 2 + 26, gz - 6, 30, -.7); floodlight(ctx, -W / 2 - 26, 6, 30, 2.2); floodlight(ctx, W / 2 + 26, 6, 30, -2.2);
  for (let yd = 10; yd <= 50; yd += 10) ctx.root.add(tagLabel(yd + ' yd', (W / 2 + 2.2) * (yd % 20 ? 1 : -1), 1.3 + yd * .012, -yd / YD, 1 + yd * .014));
}
const BB = { fence: d => 330 + 70 * Math.cos(d * PI / 90) };
function envBallpark(ctx) {
  E.snd = 'arena'; atmosphere({ sky: [0x1a70e8, 0xcfeaff, 0xa8d4f4], fog: 0xd0e8fb, fogNear: 260, fogFar: 1700, hemi: [0xeaf5ff, 0x5a9a55, .9], sun: [0xfff2d6, 1.55, [.4, .78, .3]], exp: 1 });
  groundPlane(ctx, groundTex(0x4fb04a, 0x47a443, 3000 / 18)); clouds(ctx, 14);
  const dirt = mat(0xc98a52, { roughness: 1 }), grass = new T.MeshStandardMaterial({ map: groundTex(0x55b84e, 0x4cad46, 4), roughness: 1 }), wht = mat(0xffffff), B = 19.4, flat = (m, x, z, sx, sz, y) => { const o = M(gDisc(), m, x, y, z, sx, 1, sz, ctx.root); o.castShadow = false; return o; };
  flat(dirt, 0, -B, 29, 29, .02); const sq = M(gBox(), grass, 0, .03, -B, 21, .02, 21, ctx.root); sq.rotation.y = PI / 4; sq.castShadow = false; flat(dirt, 0, 0, 4.2, 4.2, .04); flat(dirt, 0, -B * .95, 2.8, 2.8, .05);
  for (const [x, z] of [[B, -B], [0, -2 * B], [-B, -B]]) { flat(dirt, x, z, 2.4, 2.4, .045); const b = M(gBox(), wht, x, .1, z, .5, .1, .5, ctx.root); b.rotation.y = PI / 4; } M(gBox(), wht, 0, .07, .3, .5, .06, .5, ctx.root); M(gBox(), wht, 0, .12, -B * .95, .7, .08, .2, ctx.root);
  for (const s of [-1, 1]) { const l = M(gBox(), wht, s * 40, .05, -40, .14, .02, 113, ctx.root); l.rotation.y = -s * PI / 4; l.castShadow = false; }
  const wall = mat(0x1f5a3a, { roughness: .8 }), top = mat(0xffd21f), N = 30; for (let i = 0; i < N; i++) { const a0 = lerp(-45, 45, i / N), a1 = lerp(-45, 45, (i + 1) / N), p = a => { const r = BB.fence(a) * .3048, t = a * PI / 180; return new V3(Math.sin(t) * r, 0, -Math.cos(t) * r); }, A = p(a0), Bp = p(a1), L = A.distanceTo(Bp), ry = -Math.atan2(Bp.z - A.z, Bp.x - A.x), cx = (A.x + Bp.x) / 2, cz = (A.z + Bp.z) / 2; const w = M(gBox(), wall, cx, 1.7, cz, L + .1, 3.4, .5, ctx.root); w.rotation.y = ry; const t = M(gBox(), top, cx, 3.45, cz, L + .1, .14, .56, ctx.root); t.rotation.y = ry; t.castShadow = false; if (i % 5 === 2) { const am = (a0 + a1) / 2, l = label(String(Math.round(BB.fence(am))), { w: 300, h: 150, size: 2.2, color: '#fff6e4', stroke: null, fog: false }); l.position.set(cx - Math.sin(am * PI / 180) * .4, 1.8, cz + Math.cos(am * PI / 180) * .4); l.rotation.y = -am * PI / 180; ctx.root.add(l); } if (i % 3 === 1) { const am = (a0 + a1) / 2, r = BB.fence(am) * .3048 + 5; standBlock(ctx, Math.sin(am * PI / 180) * r, -Math.cos(am * PI / 180) * r, 32, PI - am * PI / 180 + PI, 9, 2.5); } }
  for (const s of [-1, 1]) { const r = 330 * .3048, x = s * Math.sin(PI / 4) * r, z = -Math.cos(PI / 4) * r; M(gCyl(8), top, x, 9, z, .16, 18, .16, ctx.root); }
  const sc = new T.Group(); sc.position.set(0, 0, -400 * .3048 - 22); ctx.root.add(sc); M(gBox(), mat(0x14301f), 0, 16, 0, 30, 12, 1.2, sc); for (const s of [-1, 1]) M(gBox(), mat(0x555b70), s * 11, 5, 0, 1, 10, 1, sc); const l = label('HOME RUN DERBY', { w: 1024, h: 220, size: 5.4, color: '#ffc93c', stroke: null, fog: false, glow: 1.6 }); l.position.set(0, 17, .7); sc.add(l);
  floodlight(ctx, -75, -150, 34, .5); floodlight(ctx, 75, -150, 34, -.5);
}

/* ---------------- Slapshot (hockey) ---------------- */
GAMES.push({
  id: 'hockey', group: 'sports', name: 'Slapshot', tag: 'Beat the goalie. He gets harder every level', unit: 'pts', spt: 3, rounds: [3, 5, 7],
  how: ['Shoot the ball into the net, 20 yards away. A goal scores 100 times your level, plus 50 for a top corner.', 'Level 1 has no goalie. Then he stands still, slides side to side, and from level 4 he moves to stop your shot.', 'Score on 2 of your 3 shots to move up a level on your next turn.'],
  cam: { p: [0, 2.5, 7.5], l: [0, 1.4, -18] }, camMax: 5, thumb: { p: [6.5, 3, 1], l: [-1, 1.5, -18] },
  create(ctx, match) {
    envRink(ctx); const L = levelKit(match), NZ = -18.3, NW = 2.9, NH = 3.2, GZ = NZ + 1.1;
    const net = new T.Group(); net.position.set(0, 0, NZ); ctx.root.add(net); const red = mat(0xd6263c, { metalness: .4, roughness: .35 });
    for (const s of [-1, 1]) { M(gCyl(12), red, s * NW, NH / 2, 0, .1, NH, .1, net); rod(new V3(s * NW, NH, 0), new V3(s * NW, .1, -1.7), .06, red, net); } rod(new V3(-NW, NH, 0), new V3(NW, NH, 0), .1, red, net); rod(new V3(-NW, .1, -1.7), new V3(NW, .1, -1.7), .06, red, net);
    const mesh = ctex(64, 64, g => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); }), mm = (rx, ry) => { const t = mesh.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return new T.MeshBasicMaterial({ map: t, transparent: true, side: T.DoubleSide, depthWrite: false }); };
    const back = new T.Mesh(new T.PlaneGeometry(NW * 2, 3.6), mm(20, 12)); back.position.set(0, NH / 2 + .05, -.85); back.rotation.x = -.49; net.add(back); for (const s of [-1, 1]) { const sd = new T.Mesh(new T.PlaneGeometry(1.7, NH), mm(6, 11)); sd.position.set(s * NW, NH / 2, -.85); sd.rotation.y = PI / 2; net.add(sd); }
    const lamp = M(gSph(), new T.MeshStandardMaterial({ color: C(0x7a1020), emissive: C(0xff2030), emissiveIntensity: 0, roughness: .3 }), 0, NH + .5, NZ - .3, .32, .32, .32, ctx.root);
    ctx.root.add(tagLabel('Net · ' + Math.round(-NZ * YD) + ' yd', NW + 3.4, 1.4, NZ, 1.5));
    // goalie
    const gk = new T.Group(); gk.position.set(0, 0, GZ); ctx.root.add(gk); const jer = mat(0x1f4fd0, { roughness: .6 }), pad = mat(0xf4f0e6, { roughness: .5 }), blk = mat(0x14182a);
    for (const s of [-1, 1]) { M(gBox(), pad, s * .34, .55, .05, .56, 1.1, .34, gk); M(gBox(), jer, s * .34, .75, .23, .56, .14, .02, gk); } M(gBox(), jer, 0, 1.55, 0, 1.25, .95, .5, gk); M(gBox(), pad, 0, 1.5, .27, .5, .4, .04, gk);
    M(gBox(), pad, -.95, 1.45, .12, .5, .7, .16, gk); M(gSph(), mat(0x8a5a2e), .98, 1.5, .12, .36, .4, .22, gk); M(gSph(), pad, 0, 2.28, 0, .3, .32, .3, gk); M(gBox(), blk, 0, 2.25, .27, .34, .2, .05, gk); const st = rod(new V3(-.95, 1.2, .3), new V3(-.5, .1, .7), .05, mat(0x8a5a2e), gk); M(gBox(), mat(0x8a5a2e), -.25, .08, .72, .7, .14, .06, gk);
    let gx = 0, gw = 0, gh = 0, res = '', pz = 0, predX = null, react = 0, lv = 1, lit = 0, hx = 0, hy = 0, endT = 0;
    const setLevel = l => { lv = l; gk.visible = l > 1; const s = l === 5 ? 1.22 : 1; gk.scale.setScalar(s); gw = 1.05 * s; gh = 2.5 * s; gx = 0; };
    return {
      surface() { return 'ice'; },
      beginTurn(pl, round, pi) { L.begin(pi); setLevel(L.lv); },
      beginShot() { res = ''; pz = 0; predX = null; react = 0; endT = 0; },
      onLaunch(B, s) { predX = clamp(Math.tan(s.hla * PI / 180) * -NZ, -NW, NW); react = lv >= 5 ? .16 : .34; },
      step(B, dt) {
        const was = pz; pz = B.p.z;
        if (Math.abs(B.p.x) > 14.6) { B.p.x = Math.sign(B.p.x) * 14.6; B.v.x *= -.5; Snd.thud(); } if (B.p.z < -27.6) { B.p.z = -27.6; B.v.z = Math.abs(B.v.z) * .4; if (!res) res = 'wide'; Snd.thud(); }
        if (res) { if (res === 'goal' && B.p.z < NZ - 1.3) { B.p.z = NZ - 1.3; B.v.z = 0; } if ((endT += dt) > 1.7) B.state = 'done'; return; }
        if (gk.visible && was > GZ && pz <= GZ && Math.abs(B.p.x - gx) < gw + .12 && B.p.y < gh) { res = 'save'; B.v.set(rnd(-3, 3), 2.5, Math.abs(B.v.z) * .25 + 2); B.p.z = GZ + .1; Snd.thud(); Snd.whistle(); FX.stars(B.p, 16, [0xffffff, 0xbfe0ff]); Cam.shake = .2; return; }
        if (was > NZ && pz <= NZ) {
          const ax = Math.abs(B.p.x), y = B.p.y;
          if (ax < NW - .12 && y < NH - .12) { res = 'goal'; hx = B.p.x; hy = y; B.v.set(B.v.x * .1, Math.min(B.v.y * .2, 0), -1.5); lit = 2.2; Snd.horn(); Snd.cheer(); FX.confetti(new V3(0, NH + 1, NZ), 160, 1.2); FX.flash(new V3(0, NH, NZ), 8); }
          else if ((Math.abs(ax - NW) < .26 && y < NH + .2) || (Math.abs(y - NH) < .26 && ax < NW + .2)) { res = 'post'; B.v.set(B.v.x * -.3 + rnd(-2, 2), Math.abs(B.v.y) * .4 + 1.5, Math.abs(B.v.z) * .35 + 1.5); B.p.z = NZ + .15; Snd.glass(); FX.stars(B.p, 22); Cam.shake = .25; }
          else res = y >= NH ? 'over' : 'wide';
        }
      },
      update(dt, t) {
        lit = Math.max(0, lit - dt); lamp.material.emissiveIntensity = lit > 0 ? (Math.sin(t * 30) > 0 ? 6 : 1) : 0; if (!gk.visible) return;
        let tx = 0; if (lv >= 3) tx = Math.sin(t * (lv >= 4 ? 1.7 : 1.25)) * (NW - gw - .1);
        if (lv >= 4 && predX !== null && Shot.phase === 'air') { react -= dt; if (react <= 0) tx = clamp(predX, -(NW - gw * .6), NW - gw * .6); }
        const sp = (lv >= 5 ? 5.2 : lv === 4 ? 3.3 : 9) * dt; gx += clamp(tx - gx, -sp, sp); gk.position.x = gx; gk.rotation.z = clamp((tx - gx) * -.12, -.3, .3); gk.position.y = Math.abs(Math.sin(t * 2.2)) * .04;
      },
      result() {
        const l = L.lv; let pts = 0, text, sub = '', tone = 'miss';
        if (res === 'goal') { const corner = Math.abs(hx) > NW * .6 && hy > NH * .55; pts = 100 * l + (corner ? 50 : 0); text = corner ? 'TOP CORNER!' : 'GOAL!'; sub = '+' + pts; tone = 'great'; }
        else { text = res === 'save' ? 'SAVED!' : res === 'post' ? 'OFF THE POST!' : res === 'over' ? 'Over the bar' : 'Wide'; sub = res === 'save' ? 'The goalie got there' : ''; }
        L.shot(res === 'goal'); return { pts, text, sub: L.sub(sub) || undefined, tone, hold: 2.2 };
      },
      shotLabel() { return L.label(); }
    };
  }
});

/* ---------------- Hoop Shots (basketball) ---------------- */
GAMES.push({
  id: 'hoops', group: 'sports', name: 'Hoop Shots', tag: 'Drop chip shots through three giant hoops', unit: 'pts', spt: 3, rounds: [3, 5, 7],
  how: ['Chip the ball so it drops through a hoop. Near scores 100, middle 200, far 300, each times your level.', 'The hoops shrink at level 2, slide at level 3 and bob up and down at level 4. At level 5 one hoop lights up for double or triple points.', 'Score on 2 of your 3 shots to move up a level on your next turn. The backboards are live.'],
  cam: { p: [0, 3.2, 8.5], l: [0, 4.2, -26] }, camMax: 8, thumb: { p: [9, 5, 0], l: [-2, 4, -26] },
  create(ctx, match) {
    envCourt(ctx); const L = levelKit(match), H = [[-7.5, -15.5, 3.2, 100], [6.5, -23.5, 3.9, 200], [-1, -32, 4.6, 300]].map(([x, z, y, pts], i) => {
      const g = new T.Group(); ctx.root.add(g); const rm = new T.MeshStandardMaterial({ color: C(0xff6a1f), emissive: C(0xff6a1f), emissiveIntensity: .25, roughness: .35, metalness: .3 }), rim = M(gTor(.045), rm, 0, 0, 0, 1, 1, 1, g); rim.rotation.x = PI / 2;
      const netm = new T.Mesh(new T.CylinderGeometry(1, .62, 1.25, 18, 3, true), new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .75 })); netm.position.y = -.63; g.add(netm);
      const bb = new T.Group(); g.add(bb); M(gBox(), mat(0xf7f7fa, { roughness: .3 }), 0, 1, 0, 3.4, 2.4, .12, bb); M(gBox(), mat(0xd6263c), 0, .75, .07, 1.3, .08, .02, bb); M(gBox(), mat(0xd6263c), 0, 1.55, .07, 1.3, .08, .02, bb); for (const s of [-1, 1]) M(gBox(), mat(0xd6263c), s * .65, 1.15, .07, .08, .88, .02, bb);
      const pole = M(gCyl(12), mat(0x3a4058, { metalness: .6, roughness: .4 }), 0, 0, 0, .16, 1, .16, g), arm = M(gBox(), mat(0x3a4058, { metalness: .6 }), 0, 0, 0, .14, .14, 1, g);
      const tag = tagLabel(Math.round(Math.hypot(x, z) * YD) + ' yd · ' + pts, x, 1, z, 1.1 + i * .3, { w: 520 }); ctx.root.add(tag);
      return { x, z, y, pts, g, rim, rm, netm, bb, pole, arm, tag, cx: x, cy: y, r: 2, ph: i * 2.1, py: 0, pz: 0, mult: 1 };
    });
    let lv = 1, res = null, rimHit = false, bank = false;
    const size = h => { h.rim.scale.set(h.r, h.r, h.r * 1.0); h.netm.scale.set(h.r, 1, h.r); const bz = -h.r - .25; h.bb.position.set(0, -.3, bz); h.bb.scale.setScalar(.75 + h.r * .25); h.arm.position.set(0, .2, bz - .5); h.arm.scale.set(.14, .14, 1); };
    const place = (h, t) => { const sl = lv >= 3 ? Math.sin(t * (.55 + h.ph * .08) + h.ph) * (lv >= 5 ? 4 : 3.2) : 0, bob = lv >= 4 ? Math.sin(t * .9 + h.ph * 1.7) * .8 : 0; h.cx = h.x + sl; h.cy = h.y + bob; h.g.position.set(h.cx, h.cy, h.z); h.pole.position.set(0, -h.cy / 2 + .2, -h.r - .75); h.pole.scale.set(.16, h.cy + .4, .16); h.tag.position.x = h.cx; };
    return {
      surface() { return 'court'; },
      beginTurn(pl, round, pi) { L.begin(pi); lv = L.lv; const r = [2.4, 1.9, 1.8, 1.6, 1.5][lv - 1]; H.forEach(h => { h.r = r; size(h); }); },
      beginShot() { res = null; rimHit = false; bank = false; H.forEach(h => { h.mult = 1; h.py = 99; h.pz = 9; h.rm.color.copy(C(0xff6a1f)); h.rm.emissive.copy(C(0xff6a1f)); h.rm.emissiveIntensity = .25; }); if (lv >= 5) { const h = pick(H), gold = Math.random() < .4; h.mult = gold ? 3 : 2; const c = C(gold ? 0xffd21f : 0x44ff8a); h.rm.color.copy(c); h.rm.emissive.copy(c); h.rm.emissiveIntensity = E.hdr ? 3 : 1.2; Snd.tick(); } },
      step(B) {
        for (const h of H) {
          const py = h.py, pzz = h.pz; h.py = B.p.y; h.pz = B.p.z; if (res) continue; const bz = h.z - h.r - .25, sc = .75 + h.r * .25;
          if (pzz > bz && B.p.z <= bz && Math.abs(B.p.x - h.cx) < 1.7 * sc && B.p.y > h.cy - .3 - .2 * sc && B.p.y < h.cy - .3 + 2.2 * sc) { bank = true; B.p.z = bz + .05; B.v.z = 3.2; B.v.x *= .3; B.v.y = Math.min(B.v.y * .5, 1); Snd.thud(); FX.stars(B.p, 8); h.pz = B.p.z; continue; }
          if (py > h.cy && B.p.y <= h.cy && B.v.y < 0) { const dx = B.p.x - h.cx, dz = B.p.z - h.z, d = Math.hypot(dx, dz); if (d < h.r - .1) { res = h; B.v.x *= .25; B.v.z *= .25; Snd.swish(); Snd.cheer(); const p = new V3(h.cx, h.cy, h.z); FX.confetti(p, 110); FX.stars(p, 30); FX.ring(p, h.r * 2.5, 0xffc93c, .6, h.cy); } else if (d < h.r + .35 && !rimHit) { rimHit = true; B.p.y = h.cy + .02; B.v.y = Math.abs(B.v.y) * .4 + 1; B.v.x = B.v.x * .3 - dx / d * 1.2 * (d < h.r ? 1 : -1); B.v.z = B.v.z * .3 - dz / d * 1.2 * (d < h.r ? 1 : -1); h.py = B.p.y; Snd.glass(); FX.stars(B.p, 12); } }
        }
      },
      update(dt, t) { H.forEach(h => { place(h, t); h.netm.rotation.y = Math.sin(t * 1.3 + h.ph) * .1; if (h.mult > 1) h.rim.scale.setScalar(h.r * (1 + Math.sin(t * 8) * .03)); }); },
      result() { let pts = 0, text, sub = '', tone = 'miss'; if (res) { pts = res.pts * lv * res.mult; text = res.mult > 1 ? 'BONUS HOOP!' : bank ? 'OFF THE GLASS!' : rimHit ? 'IT DROPS!' : 'SWISH!'; sub = '+' + pts; tone = 'great'; } else text = rimHit ? 'Off the rim' : pick(['Airball', 'No good', 'Just missed']); L.shot(!!res); return { pts, text, sub: L.sub(sub) || undefined, tone, hold: 2.2 }; },
      shotLabel() { return L.label(); }
    };
  }
});

/* ---------------- Quarterback (football) ---------------- */
GAMES.push({
  id: 'football', group: 'sports', name: 'Quarterback', tag: 'Hit your receiver in the catch zone', unit: 'pts', spt: 3, rounds: [3, 5, 7],
  how: ['Your receivers run to the glowing catch zones when you hit. Land the ball in a zone for a completion.', 'Zones score 100, 200 or 300 times your level. The deep one is a touchdown. The yard lines show the distance.', 'From level 3 red defenders patrol some zones. Land it beside one and it is intercepted. Complete 2 of 3 to move up.'],
  cam: { p: [0, 4.2, 10], l: [0, 2, -34] }, camMax: 22, thumb: { p: [-12, 7, 6], l: [4, 1, -34] },
  create(ctx, match) {
    envGridiron(ctx); const L = levelKit(match), grp = new T.Group(); ctx.root.add(grp);
    const PLAYS = [
      [[0, -27, 8.5, 100, 0, 0]],
      [[-9, -20, 6.5, 100, 0, 0], [8, -38, 7, 200, 0, 0]],
      [[-10, -20, 5.5, 100, 1, 0], [9, -35, 6, 200, 0, 0], [0, -50, 6, 300, 0, 0]],
      [[-10, -19, 4.8, 100, 1, 0], [10, -34, 5.2, 200, 1, 0], [0, -50, 5.5, 300, 0, 0]],
      [[-9, -19, 4.2, 100, 1, 5], [9, -34, 4.6, 200, 1, 5], [0, -50, 5, 300, 1, 0]]
    ];
    let Z = [], lv = 1, res = null, runT = 0, cur = 0;
    const build = l => {
      while (grp.children.length) grp.remove(grp.children[0]); lv = l;
      Z = PLAYS[l - 1].map(([x, z, r, pts, def, slide], i) => {
        const g = new T.Group(); g.position.set(x, 0, z); grp.add(g); const col = pts === 300 ? 0xffd21f : pts === 200 ? 0x29e0ff : 0x6dff8a, ring = M(gTor(.02), glowMat(col, { k: 2.2 }), 0, .12, 0, r, r, r, g); ring.rotation.x = PI / 2; ring.castShadow = false; const d = M(gDisc(), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .32, depthWrite: false }), 0, .06, 0, r, 1, r, g); d.castShadow = d.receiveShadow = false;
        const tag = tagLabel(Math.round(Math.hypot(x, z) * YD) + ' yd · ' + pts, 0, 4.6 + i * .5, 0, 1.3 + i * .35, { w: 520 }); g.add(tag);
        const rc = athlete(0x2f6fe0, { helmet: 0xf4f0e6, pads: 1, s: 1.5 }); grp.add(rc); const df = def ? athlete(0xd6263c, { helmet: 0x23283a, pads: 1, s: 1.5 }) : null; if (df) grp.add(df);
        return { bx: x, x, z, r, pts, slide, g, rc, df, sx: x < -1 ? -11 - i : x > 1 ? 11 + i : -8, ph: i * 2, dx: 0, dz: 0, jump: 0 };
      });
    };
    return {
      beginTurn(pl, round, pi) { L.begin(pi); cur = pi; if (L.lv !== lv || !Z.length) build(L.lv); },
      beginShot() { res = null; runT = 0; Z.forEach(z => { z.jump = 0; }); },
      onLaunch() { runT = .001; Snd.whistle(); },
      onLand(B) {
        for (const z of Z) if (hd(B.p.x, B.p.z, z.x, z.z) < z.r) { if (z.df && hd(B.p.x, B.p.z, z.x + z.dx, z.z + z.dz) < 2.3) { res = { z, int: true }; Snd.buzz(); FX.stars(B.p.clone().setY(2), 20, [0xff5d73, 0xffffff]); } else { res = { z }; z.jump = 1; z.rc.position.set(B.p.x, 0, B.p.z); const p = B.p.clone().setY(2.5); FX.confetti(p, z.pts === 300 ? 220 : 100, z.pts === 300 ? 1.3 : 1); FX.stars(p, 30); z.pts === 300 ? (Snd.horn(), Snd.cheer()) : Snd.cheer(); } B.m.visible = false; return 'stop'; }
      },
      update(dt, t) {
        if (runT > 0) runT = Math.min(1, runT + dt / 2.4);
        for (const z of Z) {
          z.x = z.bx + (z.slide ? Math.sin(t * .7 + z.ph) * z.slide : 0); z.g.position.x = z.x; const k = runT > 0 ? smooth(0, 1, runT) : 0;
          if (!(res && res.z === z && !res.int)) z.rc.position.set(lerp(z.sx, z.x, k), Math.abs(Math.sin(t * 9)) * .12 * (runT > 0 && runT < 1 ? 1 : 0), lerp(-4, z.z, k)); z.rc.rotation.y = runT > 0 && runT < 1 ? PI : 0; if (z.jump > 0) { z.jump = Math.max(0, z.jump - dt * 1.2); z.rc.position.y = Math.sin(z.jump * PI) * 1.3; }
          if (z.df) { const a = t * (lv >= 5 ? 1.5 : 1.1) + z.ph; z.dx = Math.cos(a) * z.r * .55; z.dz = Math.sin(a) * z.r * .45; z.df.position.set(z.x + z.dx, 0, z.z + z.dz); z.df.rotation.y = -a; }
        }
      },
      result() {
        let pts = 0, text, sub = '', tone = 'miss'; const ok = res && !res.int;
        if (ok) { pts = res.z.pts * lv; text = res.z.pts === 300 ? 'TOUCHDOWN!' : 'COMPLETE!'; sub = '+' + pts; tone = 'great'; } else if (res) { text = 'INTERCEPTED!'; sub = 'Thrown right at the defender'; } else text = pick(['Incomplete', 'Overthrown', 'No one there']);
        L.shot(!!ok); return { pts, text, sub: L.sub(sub) || undefined, tone, hold: 2.3 };
      },
      shotLabel() { return L.label(); }
    };
  }
});

/* ---------------- Home Run Derby (baseball) ---------------- */
GAMES.push({
  id: 'baseball', group: 'sports', name: 'Home Run Derby', tag: 'Time your swing on the meter and go deep', unit: 'pts', spt: 3, rounds: [3, 5, 7],
  how: ['Watch the timing meter on the left. Hit your shot while the marker is in the green for the best contact.', 'Distance comes from your ball speed and launch, your boost and your timing. Your shot’s direction sets where it goes on the field.', 'A single scores 100, a double 200, a home run 400, each times your level. Get 2 hits in 3 swings to move up. The green zone shrinks every level.'],
  cam: { p: [0, 3.4, 8], l: [0, 7, -70] }, camMax: 70, thumb: { p: [-7, 4, 7], l: [6, 8, -70] },
  create(ctx, match) {
    envBallpark(ctx); const L = levelKit(match), GW = [.14, .11, .085, .065, .05], YW = [.17, .15, .13, .11, .1], SP = [.2, .25, .3, .36, .43], CR = [0, 6, 8, 10, 12];
    const bat = athlete(0xf4f0e6, { cap: 0x1f4fd0, s: 1.45 }); bat.position.set(-3.1, 0, .2); bat.rotation.y = -PI / 2; ctx.root.add(bat); const bg = new T.Group(); bg.position.set(-2.5, 1.9, .2); ctx.root.add(bg); const bm = M(gCyl(10), mat(0xc49a5a), 0, 0, -.75, .07, 1.5, .07, bg); bm.rotation.x = PI / 2;
    const pit = athlete(0x1f4fd0, { cap: 0x23283a, s: 1.45 }); pit.position.set(0, .25, -18.4); ctx.root.add(pit);
    const F = [[-27, -76], [0, -96], [27, -76], [-13, -36], [13, -36], [-22, -24], [22, -24]].map(([x, z]) => { const a = athlete(0x1f4fd0, { cap: 0x23283a, s: 1.45 }); a.position.set(x, 0, z); ctx.root.add(a); return { x, z, a, hx: x, hz: z }; });
    const meter = $('meter'), dot = $('meterDot'), bar = $('meterBar'), hist = []; let lv = 1, clock = 0, swing = 0, an = null, res = null, q = 0, qn = '';
    const tri = t => { const u = t % 1; return u < .5 ? u * 2 : 2 - u * 2; }, pos = t => tri(t * SP[lv - 1]);
    const paint = () => { const g = GW[lv - 1] * 100, y = YW[lv - 1] * 100, a = 50 - g - y, b = 50 - g, c = 50 + g, d = 50 + g + y; bar.style.background = `linear-gradient(0deg,#d6304a 0 ${a}%,#ffc93c ${a}% ${b}%,#34c46a ${b}% ${c}%,#ffc93c ${c}% ${d}%,#d6304a ${d}% 100%)`; };
    return {
      beginTurn(pl, round, pi) { L.begin(pi); lv = L.lv; paint(); meter.hidden = false; },
      beginShot() { res = null; an = null; F.forEach(f => f.a.position.set(f.hx, 0, f.hz)); bg.rotation.y = 0; meter.hidden = false; $('meterTxt').textContent = 'Timing'; },
      onLaunch(B, s) {
        const p = pos(Math.max(0, clock - Store.d.bbLag)), d = Math.abs(p - .5), g = GW[lv - 1], y = YW[lv - 1];
        if (d <= g) { q = 1 - .08 * d / g; qn = 'Green'; } else if (d <= g + y) { q = lerp(.86, .62, (d - g) / y); qn = 'Yellow'; } else { q = lerp(.56, .3, (d - g - y) / Math.max(.01, .5 - g - y)); qn = 'Red'; }
        dot.style.bottom = p * 100 + '%'; $('meterTxt').textContent = qn + ' · ' + Math.round(q * 100) + '%';
        const c = simCarry(s), carry = Math.hypot(c.x, c.z) * YD, ground = s.vla < 8, spray = clamp(s.hla * 3.2, -70, 70), fence = BB.fence(clamp(spray, -45, 45)); let ft = Math.min(carry * 2.5 * q * q * (ground ? .5 : 1), 560);
        const foul = Math.abs(spray) > 45, hr = !foul && !ground && ft >= fence, th = spray * PI / 180, dm = ft * .3048, lx = Math.sin(th) * dm, lz = -Math.cos(th) * dm; let out = null, kind;
        if (!foul && !hr) for (const f of F) if (hd(lx, lz, f.hx, f.hz) < (f.hz < -60 ? CR[lv - 1] : CR[lv - 1] * .5) + (ground ? 0 : 0)) { out = f; break; }
        kind = foul ? 'foul' : hr ? 'hr' : out ? (ground ? 'gout' : 'out') : ground ? (ft >= 110 ? 'single' : 'gout') : ft / fence >= .68 ? 'double' : ft >= 130 ? 'single' : 'pop';
        res = { kind, ft, spray, out }; an = { t: 0, T: clamp(1.5 + dm / 42, 1.7, 5.2), lx, lz, H: ground ? 1 : clamp(dm * Math.tan(clamp(s.vla, 12, 45) * PI / 180) * .28, 3, 46), ground }; swing = .001;
        B.state = 'custom'; B.p.set(0, 1, 0); Snd.bat(); if (out) { out.tx = lx; out.tz = lz; }
        B.cells = [['Ball speed', Math.round(s.speed) + ' mph'], ['Launch', s.vla.toFixed(1) + '°'], ['Timing', qn + ' ' + Math.round(q * 100) + '%'], ['Distance', Math.round(ft) + ' ft'], ['Direction', Math.abs(spray) < 4 ? 'Centre' : (spray < 0 ? 'Left' : 'Right') + ' ' + Math.round(Math.abs(spray)) + '°']];
      },
      step(B, dt) {
        if (!an) return; an.t += dt; const s = Math.min(1, an.t / an.T), hop = an.ground ? Math.abs(Math.sin(s * PI * 5)) * an.H * (1 - s) : 4 * an.H * s * (1 - s);
        B.p.set(an.lx * s, Math.max(.05, hop + (1 - s) * 1), an.lz * s); if (s >= 1) { B.state = 'done'; if (res.kind === 'hr') { const p = new V3(an.lx, 6, an.lz); FX.confetti(p, 260, 1.6); FX.stars(p, 80); FX.explode(new V3(an.lx * 1.05, 18, an.lz * 1.05), .8); } else FX.dust(B.p); }
      },
      update(dt) {
        clock += dt; if (Shot.phase === 'ready') { hist.length = 0; dot.style.bottom = pos(clock) * 100 + '%'; }
        if (swing > 0) { swing = Math.min(1, swing + dt * 6); bg.rotation.y = -swing * 3.4; }
        if (an && res && res.out) { const f = res.out, k = Math.min(1, an.t / an.T); f.a.position.set(lerp(f.hx, f.tx, k), 0, lerp(f.hz, f.tz, k)); }
      },
      result() {
        const k = res.kind, ft = Math.round(res.ft); let pts = 0, text, sub = ft + ' ft · ' + qn.toLowerCase() + ' timing', tone = 'miss', hit = false;
        if (k === 'hr') { pts = 400 * lv; text = ft >= 450 ? 'MOONSHOT!' : 'HOME RUN!'; tone = 'great'; hit = true; Snd.horn(); Snd.cheer(); } else if (k === 'double') { pts = 200 * lv; text = 'DOUBLE!'; tone = 'great'; hit = true; Snd.cheer(); } else if (k === 'single') { pts = 100 * lv; text = 'BASE HIT'; tone = 'good'; hit = true; Snd.claps(14, 1, 0, .2); }
        else text = k === 'foul' ? 'FOUL BALL' : k === 'out' ? 'CAUGHT!' : k === 'gout' ? 'Ground out' : 'Pop out';
        if (pts) sub = '+' + pts + ' · ' + sub; L.shot(hit); return { pts, text, sub: L.sub(sub), tone, hold: 2.6 };
      },
      shotLabel() { return L.label(); }
    };
  }
});
