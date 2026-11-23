// Soft Landing — score and sound. Web Audio, composed by Seal.
// Lullaby in D, 3/4. The player completes the theme by landing lights.
// `sour` (0..1) flattens the sixth, drops a tritone under the cadence and adds tape wobble.
const A = {
  ctx: null, master: null, wet: null, dry: null, bus: {},
  mode: 'off', sour: 0, warmth: 1, started: false, muted: false,
  themeIx: 0, bar: 0, nextBar: 0, timer: null, wob: null,
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// D major: D4=62 E=64 F#=66 A=69 B=71 D5=74
const THEME = [69, 66, 69, 71, 69, 66, 64, 66, 69, 74, 71, 69, 66, 64, 62, 62];
const THEME_MINOR = [69, 65, 69, 70, 69, 65, 64, 65, 69, 74, 70, 69, 65, 64, 62, 62];
const CHORDS = [
  { n: [62, 66, 69], b: 38 }, // D
  { n: [59, 62, 66], b: 35 }, // Bm
  { n: [55, 59, 62], b: 43 }, // G
  { n: [57, 61, 64], b: 45 }, // A
];
const CHORDS_MINOR = [
  { n: [62, 65, 69], b: 38 }, // Dm
  { n: [58, 62, 65], b: 34 }, // Bb
  { n: [55, 58, 62], b: 43 }, // Gm
  { n: [57, 61, 64], b: 45 }, // A
];

function impulse(ctx, secs, decay) {
  const len = ctx.sampleRate * secs, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
function noiseBuf(ctx, secs, color) {
  const len = ctx.sampleRate * secs, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (color === 'pink') { last = 0.97 * last + 0.03 * w; d[i] = last * 6 + w * 0.08; }
    else d[i] = w;
  }
  return buf;
}

export function initAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return A;
  const ctx = A.ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  A.master = ctx.createGain(); A.master.gain.value = 0.9;
  A.master.connect(comp); comp.connect(ctx.destination);
  const conv = ctx.createConvolver(); conv.buffer = impulse(ctx, 4.2, 2.6);
  A.wet = ctx.createGain(); A.wet.gain.value = 0.5; A.wet.connect(conv); conv.connect(A.master);
  A.dry = ctx.createGain(); A.dry.gain.value = 1; A.dry.connect(A.master);
  for (const k of ['pad', 'mel', 'sfx', 'amb', 'song']) {
    const g = ctx.createGain(); g.gain.value = k === 'pad' ? 0 : 1;
    g.connect(A.dry); if (k !== 'song' && k !== 'amb') g.connect(A.wet);
    A.bus[k] = g;
  }
  A.wob = ctx.createOscillator(); A.wob.frequency.value = 0.31;
  A.wobGain = ctx.createGain(); A.wobGain.gain.value = 0; A.wob.connect(A.wobGain); A.wob.start();
  A.noise = { white: noiseBuf(ctx, 2, 'white'), pink: noiseBuf(ctx, 4, 'pink'), brown: noiseBuf(ctx, 4, 'brown') };
  A.started = true;
  return A;
}
export const audio = A;
const now = () => A.ctx.currentTime;

function env(g, t, a, peak, d, s, r, hold) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(peak * s, 0.0002), t + a + d);
  g.gain.setValueAtTime(Math.max(peak * s, 0.0002), t + a + d + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + hold + r);
  return t + a + d + hold + r;
}
export function bell(midi, t, vel = 0.5, bus = 'mel', len = 2.6, tone = 1) {
  if (!A.ctx) return; const ctx = A.ctx; t = t || now();
  const f = mtof(midi), g = ctx.createGain(); g.connect(A.bus[bus]);
  const end = env(g, t, 0.004, vel * 0.5, 0.25, 0.25, len, 0.05);
  [[1, 1], [2.01, 0.35 * tone], [3.98, 0.12 * tone], [5.4, 0.05 * tone]].forEach(([m, a], i) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f * m;
    if (A.sour > 0.3) o.detune.value = (i ? 1 : -1) * A.sour * 14;
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.0001, t + len / (1 + i * 0.9));
    o.connect(og); og.connect(g); o.start(t); o.stop(end + 0.1);
  });
}
export function felt(midi, t, vel = 0.5, bus = 'mel', len = 3.2) {
  if (!A.ctx) return; const ctx = A.ctx; t = t || now();
  const f = mtof(midi), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 5, t); lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 1.2); lp.Q.value = 0.4;
  lp.connect(g); g.connect(A.bus[bus]);
  const end = env(g, t, 0.012, vel * 0.55, 0.5, 0.3, len, 0.1);
  [0, 4, -5].forEach((dt, i) => {
    const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = dt;
    const og = ctx.createGain(); og.gain.value = i ? 0.3 : 0.7; o.connect(og); og.connect(lp); o.start(t); o.stop(end + 0.1);
  });
  const n = ctx.createBufferSource(); n.buffer = A.noise.pink; const ng = ctx.createGain();
  ng.gain.setValueAtTime(vel * 0.12, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  n.connect(ng); ng.connect(lp); n.start(t, Math.random() * 2); n.stop(t + 0.1);
}
function padVoice(midi, t, dur, vel, bright) {
  const ctx = A.ctx, f = mtof(midi), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 500 + bright * 1400; lp.Q.value = 0.3;
  lp.connect(g); g.connect(A.bus.pad);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(vel * 0.8, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.35);
  [-7, 0, 6].forEach((dt, i) => {
    const o = ctx.createOscillator(); o.type = i === 1 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
    A.wobGain.connect(o.detune);
    const og = ctx.createGain(); og.gain.value = i === 1 ? 0.6 : 0.14;
    o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur * 1.4);
  });
}
function bass(midi, t, dur, vel) {
  const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = mtof(midi); A.wobGain.connect(o.detune);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.2);
  o.connect(g); g.connect(A.bus.pad); o.start(t); o.stop(t + dur * 1.25);
}

const BAR = { lake: 3.3, outside: 4.4, tower: 4.0 };
function scheduleBar() {
  if (!A.ctx || A.mode === 'off') return;
  const t0 = A.nextBar, mode = A.mode;
  if (mode === 'lake' || mode === 'outside') {
    const minor = mode === 'outside' && !A.resolve;
    const ch = (minor ? CHORDS_MINOR : CHORDS)[Math.floor(A.bar / 2) % 4];
    const dur = BAR[mode] * 2;
    if (A.bar % 2 === 0) {
      let notes = ch.n.slice(), b = ch.b;
      if (mode === 'lake') {
        if (A.sour > 0.35) notes = notes.map(n => (n % 12 === 11 ? n - 1 : n));
        if (A.sour > 0.6 && Math.floor(A.bar / 2) % 4 === 3) b = 39;
        if (A.sour > 0.85 && Math.floor(A.bar / 2) % 4 === 0) notes = [62, 65, 68];
      }
      const v = mode === 'outside' ? 0.05 : 0.085 * A.warmth;
      notes.forEach((n, i) => padVoice(n, t0 + i * 0.12, dur, v, mode === 'outside' ? 0.1 : 0.5 - A.sour * 0.3));
      padVoice(notes[0] + 12, t0 + 0.5, dur, v * 0.5, 0.7 - A.sour * 0.5);
      bass(b, t0, dur, mode === 'outside' ? 0.1 : 0.16);
    }
    if (mode === 'lake' && A.arp) {
      const beat = BAR.lake / 3, n = ch.n;
      const pick = [n[0] + 12, n[2] + 12, n[1] + 12][A.bar % 3];
      bell(A.sour > 0.35 && pick % 12 === 11 ? pick - 1 : pick, t0 + beat * (1 + (A.bar % 2)), 0.1, 'mel', 2.2, 0.6);
    }
    if (mode === 'outside' && A.outTheme) {
      const th = A.resolve ? THEME : THEME_MINOR, beat = BAR.outside / 2;
      for (let i = 0; i < 2; i++) {
        const ix = (A.bar * 2 + i) % 16;
        if (ix === 15 && !A.resolve) continue;
        felt(th[ix] - 12, t0 + i * beat + (Math.random() * 0.03), 0.42, 'mel', 4);
        if (ix % 4 === 0) felt(th[ix] - 24, t0 + i * beat, 0.25, 'mel', 5);
      }
    }
  } else if (mode === 'tower') {
    const ctx = A.ctx;
    [0, 2].forEach(off => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = mtof(38);
      g.gain.setValueAtTime(0.0001, t0 + off); g.gain.linearRampToValueAtTime(0.16, t0 + off + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 1.6);
      o.connect(g); g.connect(A.bus.pad); o.start(t0 + off); o.stop(t0 + off + 1.8);
    });
    if (A.bar % 2 === 0) { padVoice(50, t0, 8, 0.05, 0.05); padVoice(57, t0 + 1, 8, 0.035, 0.05); }
    if (A.bar % 4 === 3) bell(81, t0 + 1, 0.06, 'mel', 4, 0.3);
    if (A.tension > 0) padVoice(51, t0, 4, 0.04 * A.tension, 0.2);
  }
  A.bar++; A.nextBar += BAR[mode] || 4;
}
function tick() {
  if (!A.ctx) return;
  while (A.mode !== 'off' && A.nextBar < now() + 0.6) scheduleBar();
}
export function setMode(mode, opts = {}) {
  if (!A.ctx) return; const t = now();
  A.mode = mode; A.bar = 0; A.nextBar = t + (opts.delay || 0.2);
  A.arp = !!opts.arp; A.outTheme = !!opts.theme; A.resolve = !!opts.resolve; A.tension = opts.tension || 0;
  A.bus.pad.gain.cancelScheduledValues(t);
  A.bus.pad.gain.setTargetAtTime(mode === 'off' ? 0 : 1, t, opts.fade || 1.5);
  if (!A.timer) A.timer = setInterval(tick, 120);
}
export function setSour(s) {
  A.sour = Math.max(0, Math.min(1, s)); if (!A.ctx) return;
  A.wobGain.gain.setTargetAtTime(A.sour * A.sour * 38, now(), 2);
  A.wob.frequency.setTargetAtTime(0.31 + A.sour * 1.7, now(), 2);
}
export function setWarmth(w) { A.warmth = w; }
export function setOpts(o) { Object.assign(A, o); }
export function duck(to = 0.25, secs = 1) { if (A.ctx) A.bus.pad.gain.setTargetAtTime(to, now(), secs); }

export function landNote(softness = 1, opts = {}) {
  if (!A.ctx) return 0;
  let m = THEME[A.themeIx % 16];
  if (A.sour > 0.35 && m % 12 === 11) m -= 1;
  if (A.sour > 0.75 && A.themeIx % 16 === 9) m -= 1;
  const t = now();
  if (softness > 0.55) { bell(m, t, 0.5 + softness * 0.25, 'mel', 3.2, 0.7 + softness * 0.5); bell(m + 12, t + 0.02, 0.08, 'mel', 2); }
  else { bell(m, t, 0.5, 'mel', 1.4, 1.8); thud(0.3); }
  if (opts.harm) bell(m - (A.sour > 0.5 ? 6 : 5), t + 0.01, 0.16, 'mel', 3);
  A.themeIx++;
  return A.themeIx;
}
export function resetTheme() { A.themeIx = 0; }
export function playTheme(opts = {}) {
  if (!A.ctx) return 0; const t = now() + 0.1, beat = opts.beat || 0.55, th = opts.minor ? THEME_MINOR : THEME;
  const n = opts.count || 16;
  for (let i = 0; i < n; i++) (opts.felt ? felt : bell)(th[i] + (opts.oct || 0), t + i * beat, opts.vel || 0.35, 'mel', 3);
  return n * beat;
}

function burst(buf, t, dur, vol, type, freq, q, bus = 'sfx') {
  const ctx = A.ctx, n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f); f.connect(g); g.connect(A.bus[bus]); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  return f;
}
export function tap(pitch = 0) { if (!A.ctx) return; burst(A.noise.white, now(), 0.05, 0.05, 'bandpass', 2400 + pitch * 300, 2); }
export function thud(v = 0.4) { if (!A.ctx) return; const ctx = A.ctx, t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(A.bus.sfx); o.start(t); o.stop(t + 0.35); }
export function typeKey() { if (!A.ctx) return; burst(A.noise.white, now(), 0.025, 0.035, 'highpass', 3000 + Math.random() * 1500, 1); }
export function swapSound(up = true) {
  if (!A.ctx) return; const t = now(); const base = up ? 86 : 74;
  [0, 4, 7].forEach((s, i) => bell(base + (up ? s : -s), t + i * 0.045, 0.09, 'sfx', 0.7, 0.5));
}
export function unswapSound() { if (!A.ctx) return; const t = now(); felt(50, t, 0.5, 'sfx', 1.5); burst(A.noise.pink, t, 0.3, 0.12, 'lowpass', 500, 1); }
export function radioClick(open = true) {
  if (!A.ctx) return; const t = now();
  burst(A.noise.white, t, 0.03, 0.2, 'bandpass', open ? 1800 : 1200, 3);
  if (open) burst(A.noise.white, t + 0.03, 0.22, 0.045, 'bandpass', 2200, 1.2);
}
export function radioVoice(dur = 1.2, pitch = 1) {
  if (!A.ctx) return; const ctx = A.ctx, t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth'; const g = ctx.createGain(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 3; hp.type = 'highpass'; hp.frequency.value = 500;
  const syl = Math.max(2, Math.floor(dur / 0.16));
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < syl; i++) {
    const tt = t + i * (dur / syl);
    o.frequency.setValueAtTime((105 + Math.random() * 40) * pitch, tt);
    bp.frequency.setValueAtTime(600 + Math.random() * 1400, tt);
    g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, tt + 0.03);
    g.gain.linearRampToValueAtTime(0.008, tt + dur / syl * 0.85);
  }
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(bp); bp.connect(hp); hp.connect(g); g.connect(A.bus.sfx); o.start(t); o.stop(t + dur + 0.1);
  burst(A.noise.white, t, dur, 0.02, 'bandpass', 2500, 0.8);
}
export function voiceBlip(i = 0, warm = 1) {
  if (!A.ctx) return; const t = now(); const m = [74, 78, 81, 76, 73][i % 5] - (A.sour > 0.8 ? 1 : 0);
  const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.setValueAtTime(mtof(m - 12), t); o.frequency.linearRampToValueAtTime(mtof(m - 12) * 1.012, t + 0.12);
  lp.type = 'lowpass'; lp.frequency.value = 900 + warm * 600;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(lp); lp.connect(g); g.connect(A.bus.sfx); o.start(t); o.stop(t + 0.2);
}
export function chime(kind = 'good') {
  if (!A.ctx) return; const t = now();
  const seq = kind === 'good' ? [74, 78, 81] : kind === 'coin' ? [86, 90] : kind === 'level' ? [74, 78, 81, 86] : [62, 61];
  seq.forEach((m, i) => bell(m, t + i * 0.09, 0.22, 'sfx', 1.4));
}
export function glitch(dur = 0.3) { if (!A.ctx) return; const t = now(); for (let i = 0; i < 6; i++) burst(A.noise.white, t + i * dur / 6, dur / 9, 0.09, 'bandpass', 400 + Math.random() * 4000, 6); }
export function swell(midi = 50, dur = 6, vel = 0.12) { if (!A.ctx) return; const t = now(); [0, 7, 12, 16].forEach((s, i) => padVoice(midi + s, t + i * 0.3, dur, vel / (1 + i * 0.4), 0.6)); }
export function drop() {
  if (!A.ctx) return; const ctx = A.ctx, t = now(), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(27, t + 2.4);
  g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  o.connect(g); g.connect(A.bus.sfx); o.start(t); o.stop(t + 3);
}
function loopNoise(key, buf, type, freq, q) {
  const ctx = A.ctx; if (A[key]) return A[key];
  const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0; n.connect(f); f.connect(g); g.connect(A.bus.amb); n.start();
  return (A[key] = { n, f, g });
}
export function rain(level = 1, secs = 2) { if (!A.ctx) return; const r = loopNoise('rainNode', A.noise.pink, 'highpass', 1200, 0.3); r.g.gain.setTargetAtTime(0.1 * level, now(), secs); }
export function wind(level = 1, secs = 2) { if (!A.ctx) return; const r = loopNoise('windNode', A.noise.brown, 'bandpass', 320, 0.8); r.g.gain.setTargetAtTime(0.3 * level, now(), secs); r.f.frequency.setTargetAtTime(240 + level * 260, now(), 3); }
export function water(level = 1, secs = 3) { if (!A.ctx) return; const r = loopNoise('waterNode', A.noise.brown, 'lowpass', 420, 0.2); r.g.gain.setTargetAtTime(0.22 * level, now(), secs); }
export function staticHiss(level = 1, secs = 0.3) { if (!A.ctx) return; const r = loopNoise('staticNode', A.noise.white, 'bandpass', 2600, 0.6); r.g.gain.setTargetAtTime(0.03 * level, now(), secs); }
export function splash(soft = 1) { if (!A.ctx) return; const t = now(); const f = burst(A.noise.pink, t, 0.5 + soft * 0.4, 0.07 + (1 - soft) * 0.1, 'bandpass', 700 + (1 - soft) * 900, 0.8); f.frequency.exponentialRampToValueAtTime(260, t + 0.5); }
export function rise() { if (!A.ctx) return; const t = now(); [62, 69, 74, 81].forEach((m, i) => felt(m, t + i * 0.16, 0.3, 'sfx', 3)); }
// a held tone that follows the player's hand while they guide a light: pitch = height, strain = wind
export function guideTone(on) {
  if (!A.ctx) return; const ctx = A.ctx, t = now();
  if (on && !A.guide) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = 220; o2.frequency.value = 330; lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.value = 0; o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(A.bus.sfx); o.start(); o2.start();
    A.guide = { o, o2, g, lp };
  }
  if (A.guide) A.guide.g.gain.setTargetAtTime(on ? 0.035 : 0, t, on ? 0.08 : 0.15);
}
export function guideSet(height01, strain01) {
  if (!A.ctx || !A.guide) return; const t = now();
  const f = 147 * Math.pow(2, height01 * 1.2);
  A.guide.o.frequency.setTargetAtTime(f, t, 0.06); A.guide.o2.frequency.setTargetAtTime(f * 1.5 * (1 + strain01 * 0.03), t, 0.06);
  A.guide.lp.frequency.setTargetAtTime(700 + strain01 * 2200, t, 0.1);
  A.guide.g.gain.setTargetAtTime(0.03 + strain01 * 0.04, t, 0.1);
}
export function lost() { if (!A.ctx) return; const t = now(); [69, 68, 63].forEach((m, i) => felt(m - 12, t + i * 0.3, 0.3, 'sfx', 3)); }
export function playSong(url, vol = 0.8) {
  if (!A.ctx) return null; if (A.songEl) { A.songEl.pause(); }
  const el = new Audio(url); el.loop = false; el.volume = vol; A.songEl = el;
  el.play().catch(() => {}); return el;
}
export function stopSong(secs = 2) { const el = A.songEl; if (!el) return; const v0 = el.volume, t0 = performance.now(); const f = () => { const k = (performance.now() - t0) / (secs * 1000); if (k >= 1) { el.pause(); return; } el.volume = v0 * (1 - k); requestAnimationFrame(f); }; f(); }
export function setMuted(m) { A.muted = m; if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05); if (A.songEl) A.songEl.muted = m; }
