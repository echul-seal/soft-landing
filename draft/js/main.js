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
const tower = {
  name: 'tower', phase: 'talk', L: null, windT: 0, gust: 0, lineT: 0, said: 0, trail: [],
  env: {
    g: 0.05, k: 2.6, fmax: 0.13, lift: 0.0415, drag: 0.5, dragHeld: 1.1,
    wind(L) { return tower.windNow * (0.5 + 0.9 * clamp((L.y - st.h * 0.1) / (st.h * 0.5), 0, 1)); },
  },
  windNow: 0.02,
  enter() {
    setFit(IMG.tower, 0.46, 0.52); hud.innerHTML = 'HALDEN TOWER &nbsp;·&nbsp; 02:14<br>RWY 27 &nbsp;·&nbsp; WIND 310 / 22 G 34'; hud.style.opacity = 1;
    S.setMode('tower'); S.rain(1); S.wind(0.5);
    this.script();
  },
  async script() {
    await wait(2600);
    await heard('MERIDIAN 214', 'Halden Tower, Meridian two one four. We’ve lost the left engine. Forty-one aboard.');
    setHint('hold the key to speak. don’t let go.');
    await holdSpeak('Meridian two one four, Halden Tower. I have you.');
    await heard('MERIDIAN 214', 'Crosswind’s throwing us around. I can’t see the field.');
    await holdSpeak('You don’t need to see it. Tell me what you see.');
    await heard('MERIDIAN 214', '…Rain. One light. Could be yours.');
    await holdSpeak('It’s mine. Stay with me.');
    await wait(700);
    this.spawn(); this.phase = 'guide';
    setHint('hold the light. bring it down slow. it cannot climb.');
  },
  spawn() {
    const T = P(0.46, 0.665);
    this.T = T; this.half = 0.062 * fit.iw * fit.s;
    this.L = makeLight({ x: clamp(T.x + st.h * 0.2, 40, st.w - 40), y: st.h * 0.09, vx: -0.02, vy: 0.03 });
    this.trail = []; this.lineT = 2; S.setOpts({ tension: 0.6 });
  },
  down() { const L = this.L; if (this.phase !== 'guide' || !L) return; if (Math.hypot(st.ptr.x - L.x, st.ptr.y - L.y) < Math.max(90, st.h * 0.16)) { L.held = true; S.guideTone(true); S.radioClick(true); setHint(''); } },
  up() { const L = this.L; if (L && L.held) { L.held = false; S.guideTone(false); S.radioClick(false); if (this.phase === 'guide' && L.y < this.T.y - st.h * 0.08) this.pilot('Tower? Tower, say again—'); } },
  async pilot(t) { if (this.busy) return; this.busy = true; await heard('MERIDIAN 214', t, 40); this.busy = false; },
  say(t) { const tx = radioLine('HALDEN TOWER · YOU', true); tx.textContent = t; S.typeKey(); st.log.push('YOU: ' + t); },
  update(dt) {
    const L = this.L; this.windT += dt;
    // wind: slow swing plus gusts that announce themselves in the rain
    const base = 0.022 + 0.012 * Math.sin(this.windT * 0.37);
    if (this.phase === 'guide' && this.windT > (this.nextGust || 5)) { this.gust = (Math.random() < 0.75 ? 1 : -0.7) * rnd(0.05, 0.085); this.gustEnd = this.windT + rnd(1.2, 2.2); this.nextGust = this.windT + rnd(3.5, 6); S.wind(1.4, 0.4); }
    if (this.gustEnd && this.windT > this.gustEnd) { this.gust = 0; this.gustEnd = 0; S.wind(0.5, 1.5); }
    this.gustS = lerp(this.gustS || 0, this.gust, 1 - Math.pow(0.02, dt));
    this.windNow = base + this.gustS;
    if (!L || this.phase !== 'guide') return;
    stepLight(L, dt, this.env);
    L.x = clamp(L.x, 10, st.w - 10);
    const alt = clamp((this.T.y - L.y) / (this.T.y - st.h * 0.09), 0, 1);
    S.guideSet(alt, clamp(L.strain * 0.6 + Math.abs(this.gustS) * 8, 0, 1));
    if (st.t % 0.05 < dt) { this.trail.push({ x: L.x, y: L.y }); if (this.trail.length > 40) this.trail.shift(); }
    // your voice, while you hold: it says what the light needs
    this.lineT -= dt;
    if (L.held && this.lineT <= 0 && !this.busy) {
      const off = (L.x - this.T.x) / this.half; let t;
      if (L.vy > 0.062) t = ['Ease it. You’re dropping.', 'Slower. Slower.'][this.said % 2];
      else if (off > 1.1) t = ['Come left.', 'Left a little more.'][this.said % 2];
      else if (off < -1.1) t = ['Come right.', 'Right. Into the wind.'][this.said % 2];
      else if (Math.abs(this.gustS) > 0.03) t = 'Hold it. Let the gust go by.';
      else t = alt < 0.3 ? 'I have you.' : ['That’s it.', 'Good. Stay with me.', 'Just like that.'][this.said % 3];
      this.say(t); this.said++; this.lineT = 2.7;
    }
    if (L.y >= this.T.y) this.touch();
  },
  async touch() {
    const L = this.L, off = Math.abs(L.x - this.T.x) / this.half, sink = L.vy; this.phase = 'down'; L.held = false; S.guideTone(false);
    st.log.push(`TOUCH sink=${sink.toFixed(3)} off=${off.toFixed(2)}`);
    if (off > 1.25 || sink > 0.085) { // not this time
      st.goArounds++; S.thud(0.5); S.glitch(0.2);
      this.phase = 'climb'; const L0 = { x: L.x, y: L.y }; const t0 = performance.now();
      const climb = () => { const k = (performance.now() - t0) / (2600 * FAST); L.x = L0.x - k * st.h * 0.25; L.y = L0.y - k * k * st.h * 0.6; if (k < 1) requestAnimationFrame(climb); }; climb();
      await heard('MERIDIAN 214', off > 1.25 ? 'That’s grass— going around. I don’t know how many of these I have.' : 'Too fast, too fast— going around.');
      await holdSpeak(st.goArounds > 1 ? 'You have one more. I’m not going anywhere.' : 'You have it. Come back to me. Slower this time.');
      this.spawn(); this.phase = 'guide'; return;
    }
    st.towerSink = sink; L.landed = true; L.vy = 0; L.vx = 0.06; S.thud(sink > 0.05 ? 0.45 : 0.2); S.setOpts({ tension: 0 }); S.wind(0.3, 3); setHint('');
    await wait(3200);
    await heard('MERIDIAN 214', sink > 0.05 ? 'We’re down. Firm, but we’re down. Everyone’s down.' : 'We’re down. …I didn’t even feel it. Everyone’s down.', 26);
    await wait(900);
    await heard('MERIDIAN 214', 'Thank you. Whoever you are.', 22);
    await holdSpeak('Ines. Goodnight, two one four.');
    await wait(1800); S.setMode('off', { fade: 2.5 }); S.rain(0.25, 4);
    notice();
  },
  draw(dt) {
    backdrop(IMG.tower); const L = this.L;
    if (this.T) {
      const T = this.T, on = L && Math.abs(L.x - T.x) < this.half; g.save(); g.globalCompositeOperation = 'lighter';
      glow(T.x, T.y, this.half * 2.2, '255,170,80', 0.07 + 0.03 * Math.sin(st.t * 2));
      g.strokeStyle = `rgba(255,${on ? 215 : 160},${on ? 150 : 90},${on ? 0.8 : 0.35})`; g.lineWidth = 1.5;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(T.x + s * this.half, T.y - 10); g.lineTo(T.x + s * this.half, T.y + 4); g.lineTo(T.x + s * (this.half - 12), T.y + 4); g.stroke(); }
      g.restore();
    }
    if (L) {
      const alt = this.T ? clamp((this.T.y - L.y) / (this.T.y - st.h * 0.09), 0, 1) : 1, r = lerp(30, 9, alt) * (st.h / 800 + 0.4) * 0.5;
      if (L.landed) { L.x += L.vx * st.h * dt; L.vx *= 1 - 0.5 * dt; }
      g.save(); g.globalCompositeOperation = 'lighter';
      this.trail.forEach((p, i) => glow(p.x, p.y, r * 0.5, '255,220,170', 0.02 * i / this.trail.length));
      const fast = clamp((L.vy - 0.035) / 0.05, 0, 1), col = `255,${Math.round(236 - fast * 120)},${Math.round(200 - fast * 150)}`;
      glow(L.x, L.y, r * 5, col, 0.16); glow(L.x, L.y, r * 1.6, col, 0.9);
      g.fillStyle = `rgba(${col},0.12)`; g.fillRect(L.x - r * 9, L.y - 0.8, r * 18, 1.6);
      // red and green wingtips, the only colour up there
      glow(L.x - r * 1.5, L.y + 1, r * 0.7, '255,60,50', 0.5); glow(L.x + r * 1.5, L.y + 1, r * 0.7, '70,255,150', 0.4);
      // its light on the wet runway before it arrives
      if (this.T && !L.landed) glow(L.x, this.T.y + 6, lerp(60, 14, alt) * (1 - alt * 0.3), '255,220,170', 0.1 * (1 - alt));
      g.restore();
      if (L.held) tether(L, L.strain, '160,220,230');
      else if (this.phase === 'guide') { g.strokeStyle = `rgba(160,220,230,${0.3 + 0.25 * Math.sin(st.t * 5)})`; g.lineWidth = 1; g.beginPath(); g.arc(L.x, L.y, r * 3 + 8, 0, 7); g.stroke(); }
    }
    drawRain(dt, this.windNow * 9, 0.34);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) { const x = ((i * 137.5) % 100) / 100 * st.w, y = ((i * 61.3 + st.t * (3 + i % 5)) % 100) / 100 * st.h; g.fillStyle = 'rgba(200,170,120,0.10)'; g.fillRect(x, y, 1.4, 16 + i % 9 * 3); }
    g.restore();
    vignette(0.7); grain(0.08);
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
  async gone(L) {
    st.lost++; S.lost();
    if (!this.spawnOn && st.landed === 0) setTimeout(() => this.spawn(), 1500 * FAST);
    if (st.lost === 1) { await voice('it’s all right. that one was tired.', 1600); voiceOff(); }
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
      if (L.x < -40 || L.x > st.w + 40) { L.done = true; if (L === this.cur) this.up(); this.gone(L); continue; }
      if (L.y >= L.wy) {
        L.done = true; if (L === this.cur) this.up(); const sink = L.vy, soft = clamp(1 - (sink - 0.02) / 0.05, 0, 1);
        st.log.push(`LAND sink=${sink.toFixed(3)} soft=${soft.toFixed(2)}`);
        this.ripples.push({ x: L.x, y: L.wy, t: 0, s: 0.5 + L.depth, hard: 1 - soft }); S.splash(soft);
        if (sink > 0.072) { this.gone(L); continue; } // it hit the water: it goes out
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
      g.strokeStyle = `rgba(255,236,210,${0.16 * (1 - alt)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(L.x, L.wy, 26 * s, 6 * s, 0, 0, 7); g.stroke();
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
addEventListener('resize', () => { if (scene === tower) { setFit(IMG.tower, 0.46, 0.52); if (tower.T) { tower.T = P(0.46, 0.665); tower.half = 0.062 * fit.iw * fit.s; } } if (scene === lake) setFit(IMG.lake, 0.5, 0.5); });
Promise.all([load('tower'), load('lake')]).then(() => { title(); requestAnimationFrame(frame); });
st.scenes = { tower, lake };
