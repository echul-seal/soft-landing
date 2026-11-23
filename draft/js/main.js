// Soft Landing v3, draft 1: tower prologue + first minute of the lake. Made by Seal.
import * as S from './audio.js';

const $ = id => document.getElementById(id);
const cv = $('c'), g = cv.getContext('2d');
const Q = new URLSearchParams(location.search);
const FAST = Q.has('fast') ? 0.15 : 1;
const st = window.__sl = { scene: 'boot', t: 0, w: 0, h: 0, dpr: 1, ptr: { x: 0, y: 0, down: false }, landed: 0, lost: 0, goArounds: 0, name: '', log: [] };
const save = JSON.parse(localStorage.getItem('sl3') || '{}');
const persist = o => { Object.assign(save, o); localStorage.setItem('sl3', JSON.stringify(save)); };
const wait = ms => new Promise(r => setTimeout(r, ms * FAST));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);

// ---------- canvas, backdrop, input ----------
const IMG = {};
function load(name) { return new Promise(r => { const i = new Image(); i.onload = () => { IMG[name] = i; r(i); }; i.onerror = () => r(null); i.src = `assets/${name}.webp`; }); }
function resize() {
  st.dpr = Math.min(window.devicePixelRatio || 1, 2);
  st.w = innerWidth; st.h = innerHeight;
  cv.width = st.w * st.dpr; cv.height = st.h * st.dpr; g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
}
addEventListener('resize', resize); resize();
let fit = { s: 1, ox: 0, oy: 0, iw: 1536, ih: 1024 };
function setFit(img, fx = 0.5, fy = 0.5) {
  const iw = img ? img.width : 1536, ih = img ? img.height : 1024;
  const s = Math.max(st.w / iw, st.h / ih) * 1.03;
  fit = { s, iw, ih, ox: clamp(st.w / 2 - fx * iw * s, st.w - iw * s, 0), oy: clamp(st.h / 2 - fy * ih * s, st.h - ih * s, 0) };
}
const P = (u, v) => ({ x: fit.ox + u * fit.iw * fit.s, y: fit.oy + v * fit.ih * fit.s });
function backdrop(img, par = 6) {
  if (!img) { g.fillStyle = '#0a0e14'; g.fillRect(0, 0, st.w, st.h); return; }
  const px = (st.ptr.x / st.w - 0.5) * -par, py = (st.ptr.y / st.h - 0.5) * -par * 0.5;
  st.par = { x: lerp(st.par ? st.par.x : 0, px, 0.04), y: lerp(st.par ? st.par.y : 0, py, 0.04) };
  g.drawImage(img, fit.ox + st.par.x, fit.oy + st.par.y, fit.iw * fit.s, fit.ih * fit.s);
}
function setPtr(e) { st.ptr.x = e.clientX; st.ptr.y = e.clientY; }
cv.addEventListener('pointerdown', e => { S.initAudio(); setPtr(e); st.ptr.down = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} if (scene.down) scene.down(); });
cv.addEventListener('pointermove', setPtr);
const up = () => { if (st.ptr.down) { st.ptr.down = false; if (scene.up) scene.up(); } };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
$('mute').onclick = () => { const m = !S.audio.muted; S.setMuted(m); $('mute').textContent = m ? 'sound off' : 'sound on'; };

// ---------- shared drawing ----------
function glow(x, y, r, col, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.25, `rgba(${col},${a * 0.45})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
let grainC = null;
function grain(a = 0.07) {
  if (!grainC) { grainC = document.createElement('canvas'); grainC.width = grainC.height = 160; const c = grainC.getContext('2d'), d = c.createImageData(160, 160); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); }
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'overlay';
  const ox = (Math.random() * 160) | 0, oy = (Math.random() * 160) | 0;
  for (let x = -ox; x < st.w; x += 160) for (let y = -oy; y < st.h; y += 160) g.drawImage(grainC, x, y);
  g.restore();
}
function vignette(a = 0.55, col = '4,6,10') {
  const gr = g.createRadialGradient(st.w / 2, st.h * 0.48, Math.min(st.w, st.h) * 0.3, st.w / 2, st.h / 2, Math.max(st.w, st.h) * 0.75);
  gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${a})`); g.fillStyle = gr; g.fillRect(0, 0, st.w, st.h);
}
// the tether: your hand to the light
function tether(L, strain, col) {
  const p = st.ptr; g.save(); g.globalCompositeOperation = 'lighter';
  const mx = (p.x + L.x) / 2 + (L.vx || 0) * st.h * -0.25, my = (p.y + L.y) / 2 + 18 * (1 - strain);
  g.strokeStyle = `rgba(${col},${0.25 + strain * 0.5})`; g.lineWidth = 1 + strain; g.beginPath(); g.moveTo(p.x, p.y); g.quadraticCurveTo(mx, my, L.x, L.y); g.stroke();
  g.strokeStyle = `rgba(${col},0.7)`; g.lineWidth = 1.2; g.beginPath(); g.arc(p.x, p.y, 15 + strain * 7, 0, 7); g.stroke();
  glow(p.x, p.y, 26, col, 0.25); g.restore();
}

// ---------- UI text ----------
const radio = $('radio'), voiceEl = $('voice'), hint = $('hint'), hud = $('hud'), card = $('card'), counter = $('counter');
function setHint(t) { if (!t) { hint.classList.remove('on'); return; } hint.textContent = t; hint.classList.add('on'); }
function radioLine(who, me) {
  [...radio.children].forEach(c => c.classList.add('old')); while (radio.children.length > 2) radio.firstChild.remove();
  const d = document.createElement('div'); d.className = 'ln' + (me ? ' me' : ''); d.innerHTML = `<span class='who'>${who}</span><span class='tx'></span>`;
  radio.appendChild(d); requestAnimationFrame(() => d.classList.add('on')); return d.querySelector('.tx');
}
async function heard(who, text, cps = 34) { // someone on the frequency
  const tx = radioLine(who, false); S.radioClick(true); S.staticHiss(1); S.radioVoice(text.length / cps + 0.2, 0.9);
  for (let i = 1; i <= text.length; i++) { tx.textContent = text.slice(0, i); await wait(1000 / cps); }
  S.staticHiss(0); S.radioClick(false); st.log.push(who + ': ' + text); await wait(500);
}
// you: the line only exists while you hold the key
function holdSpeak(text, cps = 22) {
  return new Promise(res => {
    const mic = $('mic'), tx = radioLine('HALDEN TOWER · YOU', true); let i = 0, held = false, done = false, last = performance.now();
    mic.classList.add('show'); setHint('');
    const dn = e => { e.preventDefault(); S.initAudio(); if (done) return; held = true; mic.classList.add('live'); tx.classList.remove('cut'); S.radioClick(true); S.staticHiss(0.6); };
    const upp = () => { if (!held || done) return; held = false; mic.classList.remove('live'); S.radioClick(false); S.staticHiss(0); if (i < text.length) { tx.classList.add('cut'); tx.textContent = text.slice(0, i) + '—'; st.cutOff = (st.cutOff || 0) + 1; i = Math.max(0, text.lastIndexOf(' ', Math.max(0, i - 8))); } };
    mic.addEventListener('pointerdown', dn); addEventListener('pointerup', upp); addEventListener('pointercancel', upp);
    const step = () => {
      if (done) return; const now = performance.now();
      if (held && now - last > 1000 / cps * FAST) { last = now; i++; tx.textContent = text.slice(0, i); if (text[i - 1] !== ' ') S.typeKey(); }
      if (i >= text.length) { done = true; held = false; mic.classList.remove('live', 'show'); S.radioClick(false); S.staticHiss(0); mic.removeEventListener('pointerdown', dn); removeEventListener('pointerup', upp); removeEventListener('pointercancel', upp); st.log.push('YOU: ' + text); setTimeout(res, 450 * FAST); return; }
      requestAnimationFrame(step);
    }; step();
  });
}
let vIx = 0;
async function voice(text, hold = 1600, cps = 30) { // the caretaker
  voiceEl.classList.add('on'); voiceEl.textContent = '';
  for (let i = 1; i <= text.length; i++) { voiceEl.textContent = text.slice(0, i); if (i % 3 === 1 && text[i - 1] !== ' ') S.voiceBlip(vIx++); await wait(1000 / cps); }
  st.log.push('VOICE: ' + text); await wait(hold);
}
function voiceOff() { voiceEl.classList.remove('on'); }
function ask(placeholder) {
  return new Promise(res => {
    const f = $('ask'), inp = $('askIn'); f.classList.add('show'); inp.value = ''; inp.placeholder = placeholder || ''; setTimeout(() => inp.focus(), 50);
    inp.oninput = () => S.typeKey();
    f.onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; f.classList.remove('show'); inp.blur(); res(v); };
  });
}

// ---------- the light: one body, one feel, used everywhere ----------
// positions in px; velocities in screen-heights per second.
function makeLight(o) { return Object.assign({ x: 0, y: 0, vx: 0, vy: 0, held: false, t: 0 }, o); }
function stepLight(L, dt, env) {
  const H = st.h, p = st.ptr; L.t += dt;
  let ax = env.wind(L), ay = env.g;
  L.strain = 0;
  if (L.held) {
    const dx = (p.x - L.x) / H, dy = (p.y - L.y) / H;
    let fx = dx * env.k, fy = dy * env.k;
    const m = Math.hypot(fx, fy); if (m > env.fmax) { fx *= env.fmax / m; fy *= env.fmax / m; }
    if (fy < -env.lift) fy = -env.lift; // how much it can be held up
    ax += fx; ay += fy; L.strain = clamp(m / env.fmax, 0, 1);
  }
  L.vx += ax * dt; L.vy += ay * dt;
  const cd = L.held ? env.dragHeld : env.drag; L.vx -= L.vx * cd * dt; L.vy -= L.vy * cd * dt;
  L.x += L.vx * H * dt; L.y += L.vy * H * dt;
}

// ---------- scenes ----------
let scene = {};
function go(s) { scene = s; st.scene = s.name; st.t = 0; if (s.enter) s.enter(); }

const drops = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.9 }));
function drawRain(dt, wind, a = 0.3) {
  g.save(); g.lineCap = 'round';
  for (const d of drops) {
    d.y += dt * (1.5 + d.z) * 0.9; d.x += dt * wind * 2.2 * d.z;
    if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() * 1.4 - 0.2; } if (d.x > 1.2) d.x -= 1.4; if (d.x < -0.2) d.x += 1.4;
    const x = d.x * st.w, y = d.y * st.h, len = 14 * d.z + 8;
    g.strokeStyle = `rgba(190,210,225,${a * d.z * 0.45})`; g.lineWidth = d.z * 0.9;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + wind * len * 2.4, y + len); g.stroke();
  }
  g.restore();
}

// ===== TOWER =====
// You never touch the plane. You hold the line open and talk. He flies, a beat late, and cannot see what the wind is doing to him.
const SINK_MAX = 0.032, SINK_SOFT = 0.02, SINK_WARN = 0.027, OFF_MAX = 1.15, TH = 44;
const FPM = v => Math.round(Math.max(0, v) * 3000) * 10;
const CALLS = {
  left: ['Come left.', 'Left a little more.', 'Left again.'], right: ['Come right.', 'Right a little more.', 'Right again.'],
  up: ['Ease it.', 'Slower. Hold her up.', 'Ease it again.'], down: ['Bring it down.', 'Lower.', 'Down a little more.'],
};
const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
const tower = {
  name: 'tower', phase: 'talk', L: null, windT: 0, gust: 0, gustS: 0, pend: 0, trail: [], approach: 1, why: '', dev: 0, alt: 1, beepT: 0, warned: 0,
  keyed: false, ptrHeld: false, A: { x: 0, y: 0 }, armed: true, rep: 0, hot: null, q: [], stress: 0.3, off: 0, cmd: 0, sinkT: 0.022, copy: null, alone: 0, aloneN: 0, lastCall: null, calls: 0, wph: Math.random() * 7,
  windNow: 0.01,
  setHud() {
    hud.innerHTML = 'HALDEN TOWER &nbsp;·&nbsp; 02:14<br>RWY 27 &nbsp;·&nbsp; WIND 310 / 22 G 34' + (this.approach > 1 ? `<br><span style='color:#ffb070'>APPROACH ${this.approach} &nbsp;·&nbsp; LAST: ${this.why}</span>` : '');
  },
  geom() { const T = P(0.46, 0.665); this.T = T; this.half = 0.062 * fit.iw * fit.s; this.S0 = { x: clamp(T.x + st.h * 0.2, 40, st.w - 40), y: st.h * 0.09 }; },
  enter() {
    setFit(IMG.tower, 0.46, 0.52); this.setHud(); hud.style.opacity = 1;
    S.setMode('tower'); S.rain(1); S.wind(0.5);
    if (!this.keys) {
      this.keys = true; const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
      addEventListener('keydown', e => { if (scene !== tower || this.phase !== 'guide') return; if (e.code === 'Space') { this.kbSpace = true; e.preventDefault(); return; } const d = map[e.key]; if (d && !e.repeat) { e.preventDefault(); this.kbHold = this.windT + 1.6; this.call(d); } });
      addEventListener('keyup', e => { if (e.code === 'Space') this.kbSpace = false; });
    }
    this.script();
  },
  async script() {
    await wait(2600);
    await heard('MERIDIAN 214', 'Halden Tower, Meridian two one four. We’ve lost the left engine. Forty-one aboard.');
    setHint('hold the key to speak. don’t let go.');
    await holdSpeak('Meridian two one four, Halden Tower. I have you.');
    await heard('MERIDIAN 214', 'Crosswind’s throwing us around. I can’t see the field.');
    await holdSpeak('You don’t need to see it. I can. Do what I say.');
    await heard('MERIDIAN 214', '…Rain. One light. Could be yours.');
    await holdSpeak('It’s mine. I’ll talk you down. Stay on my voice.');
    await wait(700);
    this.spawn(); this.phase = 'guide';
    setHint('press and hold anywhere to keep the line open. slide toward a call, then back.');
  },
  spawn() {
    this.geom(); const S0 = this.S0;
    if (!this.L) this.L = makeLight({});
    Object.assign(this.L, { x: S0.x, y: S0.y, vx: 0, vy: 0.022, held: false, landed: false, far: 0 });
    this.trail = []; this.warned = 0; this.dev = 0; this.off = 0; this.cmd = 0; this.sinkT = 0.022; this.q = []; this.copy = null; this.lastCall = null;
    this.gust = 0; this.pend = 0; this.gustEnd = 0; this.nextGust = this.windT + 3.2; this.stress = Math.min(this.stress, 0.4); this.alone = 0; this.aloneSaid = false; S.setOpts({ tension: 0.6 });
  },
  down() { this.ptrHeld = true; this.A = { x: st.ptr.x, y: st.ptr.y }; this.armed = true; this.hot = null; },
  up() { this.ptrHeld = false; this.hot = null; },
  unkey() { if (this.keyed) { this.keyed = false; S.guideTone(false); S.radioClick(false); S.staticHiss(0); } },
  async pilot(t) { if (this.busy) return; this.busy = true; await heard('MERIDIAN 214', t, 40); this.busy = false; if (this.keyed) S.staticHiss(0.5); },
  say(t) { const tx = radioLine('HALDEN TOWER · YOU', true); tx.textContent = t; S.typeKey(); st.log.push('YOU: ' + t); },
  // a call goes out now; he acts on it a beat later, more or less as asked
  call(dir) {
    const n = this.windT, last = this.lastCall, rpt = last && last.dir === dir && n - last.t < 4 ? Math.min(2, last.n + 1) : 0;
    this.say(CALLS[dir][rpt]); this.calls++; S.radioClick(true);
    if (last && last.dir === OPP[dir] && n - last.t < 0.9) { this.stress = clamp(this.stress + 0.25, 0, 1); this.q = []; this.lastCall = { dir, t: n, n: 0 }; this.pilot('Say again? Which way?'); return; }
    this.lastCall = { dir, t: n, n: rpt };
    this.q.push({ dir, at: n + 0.5 + 0.6 * this.stress + rnd(0, 0.15) });
  },
  apply(c) {
    const e = 1 + rnd(-0.22, 0.22) * (1 + this.stress * 1.5), step = this.half * 0.85;
    if (c.dir === 'left') this.cmd -= step * e; else if (c.dir === 'right') this.cmd += step * e;
    else if (c.dir === 'up') this.sinkT = Math.max(0.009, this.sinkT - 0.0075 * e); else this.sinkT = Math.min(0.05, this.sinkT + 0.0075 * e);
    this.copy = { t: this.windT, text: { left: 'LEFT', right: 'RIGHT', up: 'EASING', down: 'DESCENDING' }[c.dir] }; S.tap(3);
  },
  input(dt) {
    if (!this.ptrHeld) { this.hot = null; return; }
    const dx = st.ptr.x - this.A.x, dy = st.ptr.y - this.A.y, m = Math.hypot(dx, dy);
    const dir = m < TH ? null : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.hot = dir;
    if (!dir) { if (m < 24) this.armed = true; return; }
    this.rep -= dt;
    if (this.armed || this.rep <= 0) { this.armed = false; this.rep = 1.05; this.call(dir); }
  },
  circuit() { const L = this.L; this.circ = { k: 0, x: L.x, y: L.y }; L.vx = 0; L.vy = 0; return new Promise(r => { this.circDone = r; }); },
  update(dt) {
    const L = this.L, H = st.h; this.windT += dt;
    // wind: a slow swing, and gusts you can see coming in the rain a second before they land
    const base = 0.013 * Math.sin(this.windT * 0.33 + this.wph) + 0.004;
    if (this.phase === 'guide') {
      if (!this.pend && !this.gust && this.windT > this.nextGust) { this.pend = (Math.random() < 0.6 ? 1 : -1) * rnd(0.04, 0.07); this.pendAt = this.windT + 1.1; S.wind(1.4, 0.4); }
      if (this.pend && this.windT > this.pendAt) { this.gust = this.pend; this.pend = 0; this.gustEnd = this.windT + rnd(1.3, 2); }
    }
    if (this.gust && this.windT > this.gustEnd) { this.gust = 0; this.nextGust = this.windT + rnd(2.6, 4.6); S.wind(0.5, 1.5); }
    this.gustS = lerp(this.gustS, this.gust, 1 - Math.pow(0.02, dt));
    this.windNow = base + this.gustS;
    // the go-around: it climbs out along the runway, turns, and comes back to the top of the path
    if (L && this.phase === 'around' && this.circ) {
      const c = this.circ, S0 = this.S0; c.k = Math.min(1, c.k + dt / (7.5 * FAST));
      const ax = Math.max(24, c.x - H * 0.34), ay = Math.min(c.y - H * 0.4, H * 0.22);
      if (c.k < 0.38) { const a = c.k / 0.38; L.x = lerp(c.x, ax, a); L.y = lerp(c.y, ay, a * a * (3 - 2 * a)); }
      else { const b = (c.k - 0.38) / 0.62, e = b * b * (3 - 2 * b); L.x = lerp(ax, S0.x, e); L.y = lerp(ay, S0.y, e) - Math.sin(b * Math.PI) * H * 0.05; }
      L.far = Math.sin(c.k * Math.PI);
      if (st.t % 0.05 < dt) { this.trail.push({ x: L.x, y: L.y }); if (this.trail.length > 60) this.trail.shift(); }
      if (c.k >= 1) { this.circ = null; L.far = 0; this.circDone(); }
      return;
    }
    if (!L || this.phase !== 'guide') return;
    const T = this.T, S0 = this.S0;
    // the line: open while you hold. he is steadier with you on it.
    const k0 = this.ptrHeld || this.kbSpace || this.windT < (this.kbHold || 0);
    if (k0 !== this.keyed) { this.keyed = k0; S.guideTone(k0); S.radioClick(k0); S.staticHiss(k0 ? 0.5 : 0); if (k0) setHint(''); }
    this.stress = clamp(this.stress + (this.keyed ? -0.16 : 0.2) * dt, 0, 1);
    if (this.keyed) { this.alone = 0; this.aloneSaid = false; }
    else { this.alone += dt; if (this.alone > 1.6 && !this.aloneSaid && !this.busy) { this.aloneSaid = true; this.pilot(['Tower? Are you there?', 'Tower, I’ve lost you—', 'Say something. Anything.'][this.aloneN++ % 3]); } }
    this.input(dt);
    while (this.q.length && this.q[0].at <= this.windT) this.apply(this.q.shift());
    // he flies what he was last told. the wind moves him and he cannot see it.
    const wob = Math.sin(this.windT * 2.3) * 0.5 + Math.sin(this.windT * 3.7 + 1) * 0.5;
    this.cmd += (this.windNow * 0.85 + wob * 0.012 * this.stress) * H * dt;
    this.off += (this.cmd - this.off) * (1 - Math.exp(-dt / 0.42));
    this.sinkT = Math.min(0.05, this.sinkT + (0.0007 + 0.002 * this.stress) * dt);
    L.vy += (this.sinkT + Math.abs(this.gustS) * 0.12 - L.vy) * (1 - Math.exp(-dt / 0.5));
    L.y += L.vy * H * dt;
    const k = clamp((L.y - S0.y) / (T.y - S0.y), 0, 1);
    L.x = lerp(S0.x, T.x, k) + this.off;
    this.alt = clamp((T.y - L.y) / (T.y - S0.y), 0, 1); const alt = this.alt;
    this.dev = this.off / (this.half * lerp(0.55, 1, k)); this.gx = T.x + this.off; const dev = this.dev;
    S.guideSet(alt, clamp(this.stress * 0.6 + Math.abs(this.gustS) * 8, 0, 1));
    if (st.t % 0.05 < dt) { this.trail.push({ x: L.x, y: L.y }); if (this.trail.length > 40) this.trail.shift(); }
    // sink warning: ticks that quicken as the descent gets dangerous
    if (L.vy > SINK_WARN && alt < 0.6) { this.beepT -= dt; if (this.beepT <= 0) { S.tap(L.vy > SINK_MAX ? 5 : 2); this.beepT = lerp(0.36, 0.11, clamp((L.vy - SINK_WARN) / 0.01, 0, 1)); } } else this.beepT = 0;
    if (alt < 0.45 && alt > 0.08 && !this.busy) {
      if (L.vy > SINK_MAX && !(this.warned & 1)) { this.warned |= 1; this.pilot('We’re coming down hard, Tower—'); }
      else if (Math.abs(dev) > 1.35 && !(this.warned & 2)) { this.warned |= 2; this.pilot('I can’t find your lights. Which way?'); }
    }
    if (L.y >= T.y || (Math.abs(dev) > 3.2 && alt < 0.7)) this.touch();
  },
  async touch() {
    const L = this.L, off = this.off / this.half, sink = L.vy; this.phase = 'down'; this.unkey(); this.hot = null;
    st.log.push(`TOUCH sink=${sink.toFixed(3)} off=${off.toFixed(2)} calls=${this.calls}`);
    const hard = sink > SINK_MAX, wide = Math.abs(off) > OFF_MAX;
    if (hard || wide) { // not this time: say why, show the way round, try again
      st.goArounds++; this.approach++; S.thud(hard && !wide ? 0.6 : 0.3); S.glitch(0.2);
      this.why = wide ? `OFF THE RUNWAY, ${off > 0 ? 'RIGHT' : 'LEFT'}` : `TOO FAST, ${FPM(sink)} DOWN, LIMIT ${FPM(SINK_MAX)}`;
      this.setHud(); st.log.push('GO-AROUND ' + this.why); setHint('');
      const round = this.circuit(); this.phase = 'around';
      await heard('MERIDIAN 214', wide ? `We’re ${off > 0 ? 'right' : 'left'} of the runway lights. That’s grass. Going around.` : 'Too fast. We hit hard and bounced. Going around.');
      await holdSpeak(st.goArounds > 1 ? 'Climb. Come round again. I’m not going anywhere.' : wide ? 'Climb. Come round the field. I’ll call it sooner.' : 'Climb. Come round again. I’ll bring you down slower.');
      await round;
      await heard('MERIDIAN 214', st.goArounds > 1 ? 'Turning back in. I don’t know how many of these I have.' : 'Turning back in. I see your light again.', 40);
      this.spawn(); this.phase = 'guide';
      setHint(wide ? 'he answers late. call before the gust lands, not after.' : 'he sinks faster the longer it goes. call “ease it” before the ground.');
      return;
    }
    st.towerSink = sink; L.landed = true; L.vy = 0; L.vx = -0.06; S.thud(sink > SINK_SOFT ? 0.45 : 0.2); S.setOpts({ tension: 0 }); S.wind(0.3, 3); setHint('');
    await wait(3200);
    await heard('MERIDIAN 214', sink > SINK_SOFT ? 'We’re down. Firm, but we’re down. Everyone’s down.' : 'We’re down. …I didn’t even feel it. Everyone’s down.', 26);
    await wait(900);
    await heard('MERIDIAN 214', 'Thank you. Whoever you are.', 22);
    await holdSpeak('Ines. Goodnight, two one four.');
    await wait(1800); S.setMode('off', { fade: 2.5 }); S.rain(0.25, 4);
    notice();
  },
  draw(dt) {
    backdrop(IMG.tower); const L = this.L, T = this.T, guiding = this.phase === 'guide', around = this.phase === 'around';
    const onPath = guiding && Math.abs(this.dev) <= 1, MONO = 'ui-monospace, Menlo, Consolas, monospace';
    if (T) {
      const half = this.half, S0 = this.S0, zc = onPath ? '120,255,170' : '90,215,150';
      g.save(); g.globalCompositeOperation = 'lighter';
      glow(T.x, T.y, half * 2.2, '255,170,80', 0.07 + 0.03 * Math.sin(st.t * 2));
      // the green bar: anywhere between the brackets is runway
      for (let i = 0; i <= 8; i++) glow(T.x - half + i * half / 4, T.y + 2, onPath ? 8 : 6, zc, onPath ? 0.85 : 0.5);
      g.strokeStyle = `rgba(${zc},${onPath ? 0.9 : 0.55})`; g.lineWidth = 1.5;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(T.x + s * half, T.y - 12); g.lineTo(T.x + s * half, T.y + 5); g.lineTo(T.x + s * (half - 12), T.y + 5); g.stroke(); }
      if (guiding || around) {
        // the path down: rungs of light, with a pulse running toward the runway
        const c = '160,220,230', N = 11, run = Math.floor(st.t * 9) % (N + 4);
        g.strokeStyle = `rgba(${c},0.12)`; g.lineWidth = 1;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(S0.x + s * half * 0.55, S0.y); g.lineTo(T.x + s * half, T.y); g.stroke(); }
        for (let i = 0; i < N; i++) { const k = (i + 0.5) / N, x = lerp(S0.x, T.x, k), y = lerp(S0.y, T.y, k), w = half * lerp(0.55, 1, k), hot = i === run; for (const s of [-1, 0, 1]) glow(x + s * w, y, hot ? 6 : 3.5, c, hot ? 0.8 : (s ? 0.3 : 0.16)); }
      }
      g.restore();
    }
    if (L) {
      const alt = guiding ? this.alt : (L.landed ? 0 : 1), r = lerp(30, 9, alt) * (st.h / 800 + 0.4) * 0.5 * (1 - 0.45 * (L.far || 0));
      if (L.landed) { L.x += L.vx * st.h * dt; L.vx *= 1 - 0.5 * dt; }
      const jx = guiding ? Math.sin(st.t * 31) * this.stress * 2.5 : 0, jy = guiding ? Math.sin(st.t * 23 + 1) * this.stress * 2 : 0, X = L.x + jx, Y = L.y + jy;
      g.save(); g.globalCompositeOperation = 'lighter';
      this.trail.forEach((p, i) => glow(p.x, p.y, r * 0.5, '255,220,170', (around ? 0.05 : 0.02) * i / this.trail.length));
      const fast = clamp((L.vy - SINK_SOFT) / (SINK_MAX - SINK_SOFT), 0, 1), col = `255,${Math.round(236 - fast * 120)},${Math.round(200 - fast * 150)}`;
      glow(X, Y, r * 5, col, 0.16); glow(X, Y, r * 1.6, col, 0.9);
      g.fillStyle = `rgba(${col},0.12)`; g.fillRect(X - r * 9, Y - 0.8, r * 18, 1.6);
      // red and green wingtips, the only colour up there
      glow(X - r * 1.5, Y + 1, r * 0.7, '255,60,50', 0.5); glow(X + r * 1.5, Y + 1, r * 0.7, '70,255,150', 0.4);
      if (T && guiding) { // where this line of descent puts him down
        const gc = onPath ? '120,255,170' : '255,170,90', gx = this.gx === undefined ? T.x : this.gx;
        glow(gx, T.y + 6, lerp(60, 14, alt) * (1 - alt * 0.3), '255,220,170', 0.1 * (1 - alt));
        g.strokeStyle = `rgba(${gc},0.42)`; g.lineWidth = 1.2; g.setLineDash([3, 8]); g.beginPath(); g.moveTo(X, Y + r * 2); g.lineTo(gx, T.y - 6); g.stroke(); g.setLineDash([]);
        glow(gx, T.y + 2, 13, gc, 0.9); g.fillStyle = `rgba(${gc},0.9)`; g.beginPath(); g.moveTo(gx, T.y - 3); g.lineTo(gx - 6, T.y - 13); g.lineTo(gx + 6, T.y - 13); g.fill();
      }
      g.restore();
      if (T && (guiding || around)) { // the tag a controller reads: who, how high, how fast he is coming down, and what he just heard
        const sc = L.vy > SINK_MAX ? '255,96,76' : L.vy > SINK_WARN ? '255,196,110' : '160,220,230', d0 = this.dev;
        const copied = this.copy && this.windT - this.copy.t < 1.2;
        const s = around ? ['GOING AROUND', '255,176,112'] : copied ? ['COPIES: ' + this.copy.text, '255,255,255'] : L.vy > SINK_MAX && alt < 0.6 ? ['SINKING FAST', '255,96,76'] : d0 > 1 ? ['DRIFTING RIGHT', '255,176,112'] : d0 < -1 ? ['DRIFTING LEFT', '255,176,112'] : L.vy > SINK_WARN ? ['SINKING', '255,196,110'] : ['ON PATH', '120,255,170'];
        const left = X > st.w * 0.55, d = left ? -1 : 1, tx = X + d * (r * 3 + 20), ty = Y - 20;
        g.save(); g.font = '11px ' + MONO; g.textAlign = left ? 'right' : 'left'; g.textBaseline = 'middle';
        g.strokeStyle = 'rgba(160,220,230,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X + d * (r * 1.8 + 4), Y - 5); g.lineTo(tx - d * 5, ty + 10); g.stroke();
        g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 6;
        g.fillStyle = 'rgba(160,220,230,0.8)'; g.fillText('MER 214', tx, ty);
        if (!around) { g.fillStyle = `rgba(${sc},0.95)`; g.fillText(`${Math.round(alt * 12) * 100} FT  ↓ ${FPM(L.vy)}`, tx, ty + 14); }
        g.fillStyle = `rgba(${s[1]},0.98)`; g.fillText(s[0], tx, ty + (around ? 14 : 28));
        g.restore();
      }
    }
    drawRain(dt, (this.windNow + (this.pend || 0) * 0.6) * 12, 0.34);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) { const x = ((i * 137.5) % 100) / 100 * st.w, y = ((i * 61.3 + st.t * (3 + i % 5)) % 100) / 100 * st.h; g.fillStyle = 'rgba(200,170,120,0.10)'; g.fillRect(x, y, 1.4, 16 + i % 9 * 3); }
    g.restore();
    vignette(0.7);
    if (guiding) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.font = '11px ' + MONO; g.textBaseline = 'middle';
      // a gust, seen before it is felt: it comes in from the side it will push from
      if (this.pend || this.gust) {
        const d = Math.sign(this.pend || this.gust), a = this.pend ? 0.55 + 0.4 * Math.sin(st.t * 14) : 0.35, ex = d > 0 ? 16 : st.w - 16, y = st.h * 0.36;
        g.strokeStyle = `rgba(190,225,240,${a})`; g.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const x = ex + d * (i * 12 + (st.t * 40) % 12); g.beginPath(); g.moveTo(x - d * 7, y - 10); g.lineTo(x, y); g.lineTo(x - d * 7, y + 10); g.stroke(); }
        g.fillStyle = `rgba(190,225,240,${a})`; g.textAlign = d > 0 ? 'left' : 'right'; g.fillText('GUST', ex, y + 24);
      }
      // the line, and the calls under your thumb
      g.textAlign = 'center';
      if (!this.keyed) { g.fillStyle = `rgba(255,150,110,${0.55 + 0.35 * Math.sin(st.t * 6)})`; g.fillText('LINE DEAD · HOLD TO SPEAK', st.w / 2, st.h - 26); }
      else { g.fillStyle = 'rgba(160,220,230,0.6)'; g.fillText('LINE OPEN', st.w / 2, st.h - 26); }
      if (this.ptrHeld) {
        const ax = clamp(this.A.x, 118, st.w - 118), ay = clamp(this.A.y, 96, st.h - 96), c = '160,220,230';
        g.strokeStyle = `rgba(${c},0.3)`; g.lineWidth = 1; g.beginPath(); g.arc(ax, ay, TH, 0, 7); g.stroke();
        glow(ax + (st.ptr.x - this.A.x), ay + (st.ptr.y - this.A.y), 22, c, 0.3);
        const lab = (t, x, y, on, al) => { g.textAlign = al; g.fillStyle = on ? 'rgba(255,255,255,1)' : `rgba(${c},0.6)`; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 6; g.fillText(t, x, y); if (on) glow(x + (al === 'left' ? 30 : al === 'right' ? -30 : 0), y, 34, c, 0.22); };
        lab('← COME LEFT', ax - TH - 10, ay, this.hot === 'left', 'right'); lab('COME RIGHT →', ax + TH + 10, ay, this.hot === 'right', 'left');
        lab('EASE IT', ax, ay - TH - 16, this.hot === 'up', 'center'); lab('BRING IT DOWN', ax, ay + TH + 16, this.hot === 'down', 'center');
      }
      g.restore();
    }
    grain(0.08);
  },
};

// ===== THE NOTICE =====
async function notice() {
  hud.style.opacity = 0; radio.innerHTML = ''; setHint('');
  card.className = 'paper'; card.innerHTML = `<div class='notice'><div class='hd'>HALDEN REGIONAL AIRPORT AUTHORITY<br>TO: I. VARGA, TOWER</div>
  <span>From the first of March, Halden Tower will be operated remotely by an automated system.</span><br>
  <span>Your nineteen years are noted, with thanks.</span><br>
  <span>You will not be asked to do this again.</span><br>
  <span>We have arranged somewhere soft for you.</span></div><button id='goSoft'>go</button>`;
  await wait(1500); card.classList.add('on'); S.rain(0, 6);
  const sp = [...card.querySelectorAll('.notice span')];
  for (const s of sp) { await wait(1900); s.classList.add('on'); S.tap(); }
  await wait(1600); const b = $('goSoft'); b.classList.add('on');
  b.onclick = () => { b.onclick = null; b.classList.remove('on'); S.initAudio(); S.chime('good'); persist({ act: 'lake' }); card.classList.remove('on'); go(lake); };
}

// ===== THE LAKE =====
const lake = {
  name: 'lake', lights: [], lanterns: [], ripples: [], motes: [], fade: 0, spawnOn: false, nextSpawn: 0, breeze: 0, cur: null, score: 0,
  env: {
    g: 0.034, k: 3.4, fmax: 0.12, lift: 0.09, drag: 0.42, dragHeld: 1.5,
    wind(L) { return lake.breeze + 0.035 * Math.sin(L.t * 1.3 + L.ph) * (L.held ? 0.5 : 1); },
  },
  enter() {
    setFit(IMG.lake, 0.5, 0.5); this.lights = []; this.lanterns = []; this.ripples = []; this.fade = 0; st.landed = 0; st.lost = 0;
    this.motes = Array.from({ length: 34 }, () => ({ x: Math.random(), y: 0.45 + Math.random() * 0.5, p: Math.random() * 7, s: 0.3 + Math.random() }));
    S.setMode('lake', { arp: true, fade: 5, delay: 1.5 }); S.setSour(0); S.water(1, 4); S.wind(0.15, 4); S.resetTheme();
    if (this.started) return; this.started = true;
    this.script();
  },
  async script() {
    await wait(4200);
    await voice('oh. hello.', 1300);
    await voice('you’re here. I wasn’t sure when you’d come.', 1700);
    if (!save.name) {
      await voice('I don’t have a name yet. they said you might give me one.', 600);
      const n = await ask('a name'); st.name = n.slice(0, 24); persist({ name: st.name }); S.chime('good');
      await voice(`${st.name}.`, 1300); await voice('I’ll keep it. thank you.', 1500);
    } else { st.name = save.name; await voice(`it’s still ${st.name}. I kept it.`, 1600); }
    await voice('look up.', 900);
    this.spawn(0.5); await wait(2600);
    await voice('they come down in the evenings.', 1400);
    setHint('hold a light. let it down onto the water, slowly.');
    await voice('you can catch them, if you want to.', 1800); voiceOff();
  },
  spawn(u) {
    const depth = rnd(0.6, 0.9), wy = P(0, depth).y, x = (u !== undefined ? u : rnd(0.14, 0.86)) * st.w;
    this.lights.push(makeLight({ x, y: -20, vx: rnd(-0.02, 0.02), vy: 0.02, wy, depth, ph: rnd(7), hue: rnd(0, 1) }));
  },
  down() {
    let best = null, bd = Math.max(80, st.h * 0.13);
    for (const L of this.lights) { const d = Math.hypot(st.ptr.x - L.x, st.ptr.y - L.y); if (d < bd && !L.done) { bd = d; best = L; } }
    if (best) { best.held = true; this.cur = best; S.guideTone(true); S.tap(1); setHint(''); }
  },
  up() { if (this.cur) { this.cur.held = false; this.cur = null; S.guideTone(false); } },
  async landed(L, soft) {
    st.landed++; const n = st.landed; this.score += soft > 0.6 ? 12 : 7; counter.style.opacity = 1; counter.innerHTML = `contentment<b>${this.score}</b>`;
    if (n === 1) { await voice(soft > 0.6 ? 'soft. oh, that was soft.' : 'there. it’s down.', 1500); await voice('did you hear it? it gave you a note.', 1700); voiceOff(); this.spawnOn = true; this.nextSpawn = 0; }
    else if (n === 3) { this.breezeOn = true; await voice('you’ve done this before. bringing things down.', 1800); voiceOff(); }
    else if (n === 5) { await voice('there’s a little wind now. you don’t mind wind.', 1800); voiceOff(); }
    else if (n === 8) { this.spawnOn = false; await wait(1500); await voice('that’s a whole phrase. listen.', 800); S.playTheme({ count: 8, beat: 0.6, vel: 0.3 }); await wait(5600); await voice('I think it’s yours. I’ll keep that too.', 2200); voiceOff(); this.endDraft(); }
  },
  async gone(L, why) {
    st.lost++; S.lost();
    if (!this.spawnOn && st.landed === 0) setTimeout(() => this.spawn(), 1500 * FAST);
    if (why === 'fast' && !this.toldFast) { this.toldFast = true; await voice('that one met the water too fast. it went out.', 1500); await voice('slow them near the end. keep your hand above.', 1700); voiceOff(); } else if (st.lost === 1) { await voice('the wind carried that one off. it’s all right.', 1600); voiceOff(); }
  },
  async endDraft() {
    await wait(1500); card.className = 'solid'; card.innerHTML = `<h1>Soft Landing</h1><p class='mono'>draft one ends here</p><p class='serif' style='opacity:.8;margin-top:1em'>The tower and the first minute of the lake.<br>What the lights are comes next.</p><button id='again'>again</button>`;
    card.classList.add('on'); S.setMode('off', { fade: 3 }); await wait(1200); $('again').classList.add('on'); $('again').onclick = () => { localStorage.removeItem('sl3'); location.href = location.pathname; };
  },
  update(dt) {
    this.fade = Math.min(1, this.fade + dt / (5 * FAST));
    this.breeze = this.breezeOn ? 0.022 * Math.sin(st.t * 0.23) + 0.03 * Math.max(0, Math.sin(st.t * 0.61)) * Math.sign(Math.sin(st.t * 0.11)) : 0;
    if (this.spawnOn) { this.nextSpawn -= dt; if (this.nextSpawn <= 0 && this.lights.length < 2) { this.spawn(); this.nextSpawn = rnd(2.2, 4); } }
    for (const L of this.lights) {
      if (L.done) continue; stepLight(L, dt, this.env);
      if (L.held) S.guideSet(clamp((L.wy - L.y) / (st.h * 0.7), 0, 1), L.strain * 0.5 + clamp(L.vy / 0.09, 0, 1) * 0.5);
      if (L.x < -40 || L.x > st.w + 40) { L.done = true; if (L === this.cur) this.up(); this.gone(L, 'wind'); continue; }
      if (L.y >= L.wy) {
        L.done = true; if (L === this.cur) this.up(); const sink = L.vy, soft = clamp(1 - (sink - 0.02) / 0.05, 0, 1);
        st.log.push(`LAND sink=${sink.toFixed(3)} soft=${soft.toFixed(2)}`);
        this.ripples.push({ x: L.x, y: L.wy, t: 0, s: 0.5 + L.depth, hard: 1 - soft }); S.splash(soft);
        if (sink > 0.072) { this.gone(L, 'fast'); continue; } // it hit the water: it goes out
        S.landNote(soft); this.lanterns.push({ x: L.x, y: L.wy, depth: L.depth, ph: rnd(7), hue: L.hue, born: st.t, soft }); this.landed(L, soft);
      }
    }
    this.lights = this.lights.filter(l => !l.done);
    for (const r of this.ripples) r.t += dt; this.ripples = this.ripples.filter(r => r.t < 4);
  },
  draw(dt) {
    backdrop(IMG.lake, 10); const H = st.h, W = st.w, water = P(0, 0.505).y;
    g.save(); g.globalCompositeOperation = 'soft-light';
    for (let i = 0; i < 16; i++) { const y = water + Math.pow(i / 16, 1.6) * (H - water), a = 0.07 + 0.05 * Math.sin(st.t * 0.7 + i * 1.7); g.fillStyle = `rgba(255,220,180,${a})`; const wv = Math.sin(st.t * 0.3 + i) * 30; g.fillRect(wv - 40, y, W + 80, 1.5 + i * 0.35); }
    g.restore();
    g.save(); for (let i = 0; i < 3; i++) { const y = water - 14 + i * 16, gr = g.createLinearGradient(0, y - 30, 0, y + 40); gr.addColorStop(0, 'rgba(240,210,190,0)'); gr.addColorStop(0.5, `rgba(240,210,190,${0.07 + 0.03 * Math.sin(st.t * 0.2 + i * 2)})`); gr.addColorStop(1, 'rgba(240,210,190,0)'); g.fillStyle = gr; g.fillRect(0, y - 30, W, 70); } g.restore();
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of this.motes) { const x = ((m.x + st.t * 0.004 * m.s) % 1) * W, y = m.y * H + Math.sin(st.t * 0.5 + m.p) * 8; glow(x, y, 2.5 + m.s * 2, '255,225,180', 0.1 + 0.08 * Math.sin(st.t + m.p)); }
    for (const r of this.ripples) { const k = r.t / 4; for (let j = 0; j < 3; j++) { const rr = (k * 150 + j * 22) * r.s * (0.7 + r.hard * 0.8); if (rr <= 0) continue; g.strokeStyle = `rgba(255,232,200,${(1 - k) * 0.35 / (j + 1)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(r.x, r.y, rr, rr * 0.22, 0, 0, 7); g.stroke(); } }
    // lanterns you set down, and their long reflections
    for (const l of this.lanterns) {
      const bob = Math.sin(st.t * 0.9 + l.ph) * 2.2, s = 0.5 + l.depth * 0.9, y = l.y + bob, a = clamp((st.t - l.born) / 1.5, 0, 1), col = `255,${Math.round(200 + l.hue * 30)},${Math.round(130 + l.hue * 50)}`;
      l.x += Math.sin(st.t * 0.13 + l.ph) * 0.03;
      glow(l.x, y - 6 * s, 46 * s, col, 0.2 * a); glow(l.x, y - 6 * s, 10 * s, '255,244,220', 0.95 * a);
      for (let j = 1; j < 9; j++) { const yy = y + j * 5 * s, wob = Math.sin(st.t * 2 + j * 1.3 + l.ph) * 3 * s; g.fillStyle = `rgba(${col},${0.2 * a * (1 - j / 9)})`; g.fillRect(l.x - (7 - j * 0.5) * s + wob, yy, (14 - j) * s, 2 * s); }
    }
    // the falling lights
    for (const L of this.lights) {
      const s = 0.5 + L.depth * 0.9, alt = clamp((L.wy - L.y) / (H * 0.7), 0, 1), fl = 0.85 + 0.15 * Math.sin(L.t * 9 + L.ph), fast = clamp((L.vy - 0.04) / 0.04, 0, 1);
      const col = `255,${Math.round(214 - fast * 90 + L.hue * 20)},${Math.round(150 - fast * 90 + L.hue * 40)}`;
      glow(L.x, L.y, 70 * s, col, 0.14 * fl); glow(L.x, L.y, 13 * s, '255,246,226', 0.95 * fl);
      // its reflection rises to meet it: that gap is your altitude
      const ry = L.wy + (L.wy - L.y) * 0.35; if (ry < H + 40) { for (let j = 0; j < 7; j++) { const wob = Math.sin(st.t * 2.4 + j * 1.2 + L.ph) * (3 + alt * 8) * s; g.fillStyle = `rgba(${col},${0.22 * (1 - alt * 0.8) * (1 - j / 7)})`; g.fillRect(L.x - 6 * s + wob, ry + j * 4 * s, 12 * s, 2 * s); } }
      g.strokeStyle = L.vy > 0.072 ? `rgba(255,110,80,${0.3 + 0.5 * (1 - alt)})` : `rgba(255,236,210,${0.18 + 0.3 * (1 - alt)})`; g.lineWidth = 1.3; g.beginPath(); g.ellipse(L.x, L.wy, 26 * s, 6 * s, 0, 0, 7); g.stroke();
    }
    g.restore();
    for (const L of this.lights) { if (L.held) tether(L, L.strain, '255,236,200'); }
    vignette(0.42, '40,18,40'); grain(0.06);
    if (this.fade < 1) { g.fillStyle = `rgba(241,236,226,${1 - this.fade})`; g.fillRect(0, 0, W, H); }
  },
};

// ===== TITLE =====
function title() {
  card.className = 'solid on'; card.innerHTML = `<h1>Soft Landing</h1><p class='mono'>a short game about being looked after</p><p class='mono' style='margin-top:.6em;opacity:.45'>headphones, if you have them</p><button id='begin'>${save.act === 'lake' ? 'continue' : 'begin'}</button>`;
  setTimeout(() => $('begin').classList.add('on'), 600);
  const start = () => { $('begin').onclick = null; S.initAudio(); card.classList.remove('on'); setTimeout(() => { if (!card.classList.contains('on')) card.className = ''; }, 1500); const a = Q.get('act') || save.act; go(a === 'lake' ? lake : tower); };
  $('begin').onclick = start;
}

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
  if (scene.update) scene.update(dt);
  if (scene.draw) scene.draw(dt); else { g.fillStyle = '#07090e'; g.fillRect(0, 0, st.w, st.h); }
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { if (scene === tower) { setFit(IMG.tower, 0.46, 0.52); if (tower.T) tower.geom(); } if (scene === lake) setFit(IMG.lake, 0.5, 0.5); });
Promise.all([load('tower'), load('lake')]).then(() => { title(); requestAnimationFrame(frame); });
st.scenes = { tower, lake };
