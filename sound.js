// Soft Landing: sound. Everything is synthesized with Web Audio; no files.
const Snd = (() => {
  let AC = null, master, pad, padOn = false, ci = 0, timer = null, wind = null;
  const CH = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 392.0]];
  const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  function init() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AC = new C();
    master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
    pad = AC.createGain(); pad.gain.value = 1;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    pad.connect(lp); lp.connect(master);
    startPad();
  }

  function chord() {
    if (!AC || !padOn) return;
    const t = AC.currentTime + 0.05;
    CH[ci++ % CH.length].forEach((f, i) => {
      [-5, 5].forEach(d => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = i === 0 ? f / 2 : f; o.detune.value = d;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 2.5);
        g.gain.setValueAtTime(0.03, t + 5.5);
        g.gain.linearRampToValueAtTime(0, t + 8.5);
        o.connect(g); g.connect(pad); o.start(t); o.stop(t + 8.6);
      });
    });
  }

  function startPad() {
    if (!AC || padOn) return;
    padOn = true;
    pad.gain.cancelScheduledValues(AC.currentTime);
    pad.gain.setTargetAtTime(1, AC.currentTime, 0.6);
    chord(); timer = setInterval(chord, 6000);
  }

  function stopPad() {
    padOn = false; clearInterval(timer);
    if (AC) { pad.gain.cancelScheduledValues(AC.currentTime); pad.gain.setTargetAtTime(0, AC.currentTime, 0.08); }
  }

  function chime(k, vol) {
    if (!AC || !padOn) return;
    const t = AC.currentTime;
    const f = PENT[(k == null ? Math.floor(Math.random() * PENT.length) : k) % PENT.length];
    [1, 2].forEach((m, j) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      const v = (vol == null ? 0.1 : vol) * (j ? 0.25 : 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.5);
    });
  }

  function sparkle() { [0, 2, 4, 7].forEach((k, i) => setTimeout(() => chime(k, 0.08), i * 90)); }

  function windOn() {
    if (!AC || wind) return;
    const t = AC.currentTime, n = AC.sampleRate * 4;
    const b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = AC.createBufferSource(); src.buffer = b; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.45, t + 7);
    src.connect(lp); lp.connect(g); g.connect(master); src.start();
    wind = { src, g };
  }

  function windOff() {
    if (!wind) return;
    const w = wind; wind = null;
    w.g.gain.cancelScheduledValues(AC.currentTime);
    w.g.gain.setTargetAtTime(0, AC.currentTime, 0.4);
    setTimeout(() => { try { w.src.stop(); } catch (_) {} }, 2500);
  }

  return { init, startPad, stopPad, chime, sparkle, windOn, windOff };
})();
