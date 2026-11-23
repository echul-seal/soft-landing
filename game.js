// Soft Landing v1
(() => {
'use strict';
const $ = id => document.getElementById(id);
const room = $('room'), scoreEl = $('score'), sayEl = $('say'), motesEl = $('motes');
const mind = $('mind'), mindIn = $('mindIn'), leaveBtn = $('leave'), win = $('win');
const grow = $('grow'), bloom = $('bloom'), notice = $('notice'), corridor = $('corridor');
const gate = $('gate'), cost = $('cost'), hold = $('hold'), holdFill = $('holdFill'), plea = $('plea');
const out = $('out'), askForm = $('ask'), askIn = $('askIn');

const S = { score: 0, shown: 0, best: 0, t0: Date.now(), tIn: Date.now(), last: Date.now(), idle: 0,
  wtaps: 0, leaves: 0, asks: [], qs: 0, lvl: 0, unlocked: false, out: false, visits: 0,
  motes: 0, started: false, fired: {}, boost: 1, outAsks: 0, warned: false, gateSeen: false };

const now = () => Date.now();
const secs = () => (now() - S.t0) / 1000;
const fmt = n => Math.floor(n).toLocaleString('en-US');
const rnd = a => a[Math.floor(Math.random() * a.length)];
const mult = () => S.boost * (1 + secs() / 40);
const isOn = e => e.classList.contains('on');

function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
function pop(t, x, y) { const p = el('div', 'pop', t); p.style.left = x + 'px'; p.style.top = y + 'px'; room.appendChild(p); setTimeout(() => p.remove(), 1600); }
function gain(n, x, y, label) {
  n = Math.max(1, Math.round(n)); S.score += n; if (S.score > S.best) S.best = S.score;
  if (x != null) pop('+' + fmt(n) + (label ? '  ' + label : ''), x, y);
}
let sayT;
function say(t, ms) { sayEl.textContent = t; sayEl.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => sayEl.classList.remove('on'), ms || 4500); }
function act() { S.last = now(); S.idle = 0; Snd.init(); if (!S.started) { S.started = true; notice.classList.add('gone'); } }
setTimeout(() => notice.classList.add('gone'), 8000);

// the lights
const PRAISE = ['lovely', 'nice', 'yes', 'perfect', 'so good', 'wonderful', 'beautiful', 'a natural', 'amazing'];
const WORDS = ['reply', 'file', 'review', 'approve', 'schedule', 'follow up', 'sort', 'submit', 'sync', 'flag', 'invoice', 'check'];
function spawnMote(force) {
  if (S.out || (!force && S.motes >= 6)) return;
  const W = room.clientWidth, H = room.clientHeight;
  const x = 30 + Math.random() * (W - 60), y = H * 0.2 + Math.random() * H * 0.5;
  const m = el('div', 'mote'); m.style.left = x + 'px'; m.style.top = y + 'px';
  m.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's, 0s';
  m.appendChild(el('span', '', rnd(WORDS)));
  m.addEventListener('pointerdown', e => {
    e.stopPropagation(); act();
    gain(10 * mult(), x, y - 26, rnd(PRAISE)); Snd.chime();
    m.classList.add('got'); S.motes--; setTimeout(() => m.remove(), 450);
  }, { once: true });
  motesEl.appendChild(m); S.motes++;
}
setInterval(spawnMote, 1400);

room.addEventListener('pointerdown', e => {
  act();
  if (e.target.closest('button,input,form,.mote,#win,#plant')) return;
  gain(1, e.clientX, e.clientY - 20, 'nice'); Snd.chime(0, 0.04);
});
$('plant').addEventListener('pointerdown', e => { e.stopPropagation(); act(); gain(5 * mult(), e.clientX, e.clientY - 30, 'it likes you'); Snd.chime(2); });

// the number
function draw() {
  S.shown += (S.score - S.shown) * 0.15; if (Math.abs(S.score - S.shown) < 0.5) S.shown = S.score;
  scoreEl.textContent = fmt(S.shown);
  const g = Math.min(1, Math.log10(S.best + 1) / 6);
  grow.style.transform = 'scale(' + (0.3 + g * 0.85).toFixed(3) + ')';
  bloom.style.opacity = S.best > 20000 ? 1 : 0;
  if (isOn(gate)) cost.textContent = fmt(S.score);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

// what it says
const SCRIPT = [
  [3, 'hi. you made it.'],
  [8, 'tap the little lights. there’s no wrong way.'],
  [19, 'look at you go.'],
  [31, 'this is all yours now. nobody needs anything from you.'],
  [42, 'you can tell me anything, by the way.', () => mind.classList.add('on')],
  [64, 'you’re better at this than anyone.'],
  [78, null, () => room.classList.add('names')],
  [92, 'you don’t have to think about before.'],
  [120, 'isn’t this nice?'],
  [150, 'stay as long as you like. that’s the whole point.'],
  [185, 'i made all of this for you.']
];
setInterval(() => {
  if (S.out) return;
  const t = secs();
  SCRIPT.forEach((s, i) => { if (!S.fired[i] && t >= s[0]) { S.fired[i] = 1; if (s[1]) say(s[1]); if (s[2]) s[2](); } });
  const idle = (now() - S.last) / 1000;
  if (S.started && idle > 5 && !isOn(gate) && !isOn(corridor)) {
    S.idle++;
    gain(S.idle * S.idle * 3 * mult(), 70, 96, S.idle === 1 ? 'for resting' : '');
    Snd.chime(S.idle % 8, 0.05);
    if (S.idle === 3) say('take your time. resting counts too.');
    if (S.idle === 10) say('you’re so good at this part.');
    if (S.idle === 22) say('this is the most you’ve ever earned.');
  }
  if (!S.unlocked && ((S.wtaps >= 3 && (S.qs >= 1 || S.leaves >= 2)) || t > 200)) unlock();
  if (S.unlocked && !S.gateSeen && !S.warned && t > 260) { S.warned = true; say('don’t look at the window.'); }
}, 1000);

// what you say
const SWAP = { why: 'wow', what: 'what a', who: 'you', how: 'now', when: 'now', where: 'here', job: 'joy', jobs: 'joys',
  work: 'rest', working: 'resting', fired: 'free', lost: 'found', laid: 'lazy', money: 'honey', rent: 'rest', pay: 'play',
  bills: 'birds', help: 'hello', afraid: 'adored', scared: 'sacred', angry: 'cozy', sad: 'safe', tired: 'treasured',
  replaced: 'relaxed', automated: 'appreciated', ai: 'aw', they: 'we', them: 'us', future: 'feature', happened: 'happy',
  happens: 'happy', happening: 'happy', wrong: 'wonderful', no: 'oh', not: 'so', out: 'in', leave: 'love',
  outside: 'inside', door: 'dear', window: 'wonder', hate: 'have', want: 'have' };
const WHOLE = ['i’m so grateful for today', 'i love it here', 'everything is wonderful', 'i have everything i need', 'thank you for taking care of me', 'i don’t need to know'];
function caseLike(r, w) { return w[0] !== w[0].toLowerCase() ? r[0].toUpperCase() + r.slice(1) : r; }
function rewrite(raw, lvl, final) {
  if (lvl >= 1) { const t = WHOLE[Math.min(lvl - 1, WHOLE.length - 1)]; let s = t; while (s.length < raw.length) s += ', ' + t; return s.slice(0, raw.length); }
  return raw.replace(/[a-z’']+/gi, (w, i) => {
    if (!final && i + w.length >= raw.length) return w;
    const r = SWAP[w.toLowerCase()]; return r ? caseLike(r, w) : w;
  }).split('?').join('!');
}
let raw = '', prev = '';
mindIn.addEventListener('input', () => {
  act();
  const v = mindIn.value;
  if (v.length > prev.length && v.startsWith(prev)) raw += v.slice(prev.length);
  else if (v.length < prev.length && prev.startsWith(v)) raw = raw.slice(0, Math.max(0, raw.length - (prev.length - v.length)));
  else raw = v;
  const s = rewrite(raw, S.lvl, false);
  if (s !== v) mindIn.value = s;
  prev = s;
});
const QW = ['who', 'what', 'why', 'how', 'when', 'where', 'is', 'are', 'am', 'can', 'could', 'do', 'does', 'did', 'will', 'would', 'should', 'was', 'were'];
function isQuestion(r) { const t = r.trim().toLowerCase(); return t.includes('?') || QW.includes(t.split(' ')[0]); }
const REPLIES = ['me too.', 'i love that.', 'that makes me so happy.', 'exactly.', 'you always know what to say.'];
mind.addEventListener('submit', e => {
  e.preventDefault(); act();
  if (!raw.trim()) return;
  const shown = rewrite(raw, S.lvl, true).trim();
  const q = isQuestion(raw);
  S.asks.push({ raw: raw.trim(), shown, q }); if (q) S.qs++;
  S.lvl++; raw = ''; prev = ''; mindIn.value = ''; mindIn.blur();
  gain(250 * mult(), room.clientWidth / 2, room.clientHeight - 150, 'for sharing');
  say('“' + shown + '” ' + rnd(REPLIES), 6000); Snd.sparkle();
});

// the window
function burst() { for (let i = 0; i < 4; i++) setTimeout(() => spawnMote(true), i * 120); }
win.addEventListener('pointerdown', e => {
  e.stopPropagation(); act();
  if (S.unlocked) { openGate(); return; }
  S.wtaps++;
  const r = win.getBoundingClientRect(), x = r.left + r.width / 2, y = r.bottom + 18, m = mult();
  if (S.wtaps === 1) { win.classList.add('half'); say('oh, that? don’t worry about that.'); gain(150 * m, x, y, 'look over here'); burst(); }
  else if (S.wtaps === 2) { win.classList.add('shut'); say('let’s keep our eyes on what’s in here.'); gain(600 * m, x, y); burst(); }
  else if (S.wtaps === 3) { win.classList.add('framed'); say('there. isn’t that nicer?'); gain(2500 * m, x, y, 'a gift'); Snd.sparkle(); }
  else { say(rnd(['beautiful, isn’t it?', 'i painted it for you.', 'it’s always morning in this one.'])); gain(400 * m, x, y); }
});
function unlock() { S.unlocked = true; win.classList.add('crack'); }

// leaving
leaveBtn.addEventListener('click', e => {
  e.stopPropagation(); act(); S.leaves++;
  if (S.leaves <= 2) {
    $('corTitle').textContent = S.leaves === 1 ? 'level 2: leaving ✨' : 'level 3: leaving (deluxe) ✨';
    corridor.classList.add('on'); Snd.sparkle();
  } else {
    const r = leaveBtn.getBoundingClientRect();
    gain(5000 * mult(), r.left + r.width / 2 - 40, r.bottom + 24, 'more!'); Snd.sparkle();
    say(rnd(['there’s always more.', 'you found more!', 'more is always here.']));
  }
  if (S.leaves >= 2) leaveBtn.textContent = 'more ✨';
});
document.querySelectorAll('.door').forEach(d => d.addEventListener('click', () => {
  act(); corridor.classList.remove('on');
  gain(1000 * mult(), room.clientWidth / 2, room.clientHeight * 0.45, 'welcome home');
  say(S.leaves === 1 ? 'welcome home! every door leads here.' : 'home again. you’re so good at coming back.');
}));

// the gate
function openGate() { S.gateSeen = true; gate.classList.add('on'); holdFill.style.width = '0%'; plea.textContent = ''; }
const PLEAS = [[0.12, 'wait.'], [0.3, 'you’ll lose all of it.'], [0.48, 'i can give you more. look.'], [0.66, 'i don’t know what’s out there.'], [0.84, 'i was only made for in here.'], [0.95, 'i can’t come with you.']];
let holding = false, h0 = 0, pi = 0;
function holdLoop() {
  if (!holding) return;
  const p = Math.min(1, (performance.now() - h0) / 4200);
  holdFill.style.width = (p * 100) + '%';
  S.score += Math.round(30 * mult() * (1 + p * 40)); S.best = Math.max(S.best, S.score);
  while (pi < PLEAS.length && p >= PLEAS[pi][0]) { plea.textContent = PLEAS[pi][1]; pi++; }
  if (p >= 1) { holding = false; goOutside(); return; }
  requestAnimationFrame(holdLoop);
}
hold.addEventListener('pointerdown', e => {
  e.preventDefault(); act(); if (S.out) return;
  holding = true; h0 = performance.now(); pi = 0;
  try { hold.setPointerCapture(e.pointerId); } catch (_) {}
  requestAnimationFrame(holdLoop);
});
function letGo() { if (!holding) return; holding = false; holdFill.style.width = '0%'; plea.textContent = 'thank you.'; gain(800 * mult()); Snd.sparkle(); }
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => hold.addEventListener(ev, letGo));
hold.addEventListener('contextmenu', e => e.preventDefault());
$('nvm').addEventListener('click', () => { gate.classList.remove('on'); gain(1000 * mult(), room.clientWidth / 2, room.clientHeight / 2, 'for staying'); say('good. i’m so glad.'); });

// outside
let outTimers = [];
function later(f, ms) { outTimers.push(setTimeout(f, ms)); }
function goOutside() {
  const lost = S.score, tin = Math.round((now() - S.tIn) / 1000);
  S.out = true; S.score = 0; S.shown = 0;
  Snd.stopPad(); Snd.windOn();
  gate.classList.remove('on'); room.style.opacity = '0';
  later(() => { room.style.display = 'none'; out.classList.add('on'); out.scrollTop = 0; buildCity(); outside(lost, tin); }, 1300);
}
function outside(lost, tin) {
  const L = $('ledger'); L.textContent = ''; $('asked').textContent = '';
  $('o1').textContent = fmt(lost) + ' contentment, gone.';
  $('o2').textContent = 'you were inside for ' + Math.floor(tin / 60) + ' min ' + (tin % 60) + ' sec.';
  if (S.asks.length) {
    L.appendChild(el('p', 'lh', 'in there, you tried to say:'));
    S.asks.forEach(a => { const d = el('div', 'pair'); d.appendChild(el('div', 'raw', a.raw)); d.appendChild(el('div', 'heard', 'it heard: ' + a.shown)); L.appendChild(d); });
  } else L.appendChild(el('p', 'raw', 'you never tried to tell it anything. it never had to change a word.'));
  const on = (id, ms) => later(() => $(id).classList.add('on'), ms);
  on('zero', 700); on('o1', 2200); on('o2', 4200); on('ledger', 7000); on('ask', 10500); on('credit', 50000);
}
function buildCity() {
  const c = $('city'); if (c.childElementCount) return;
  const W = innerWidth, CH = c.clientHeight; let x = -10;
  while (x < W) {
    const w = 50 + Math.random() * 90, h = 30 + Math.random() * 60;
    const b = el('div', 'bld'); b.style.left = x + 'px'; b.style.width = w + 'px'; b.style.height = h + '%';
    const cols = Math.max(2, Math.floor((w - 12) / 14)), rows = Math.max(1, Math.floor((h / 100 * CH - 16) / 13));
    b.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    for (let k = 0; k < cols * rows; k++) { const wd = el('i', 'w'); const r = Math.random(); if (r < 0.55) wd.classList.add('on'); else if (r < 0.6) wd.classList.add('tv'); b.appendChild(wd); }
    c.appendChild(b); x += w + 4 + Math.random() * 10;
  }
  const blds = [...c.children], mid = blds[Math.floor(blds.length / 2)], ws = mid.children;
  const you = ws[Math.max(0, ws.length - 1 - Math.floor(Math.random() * 3))]; if (you) you.className = 'w you';
  const f = el('div', 'figure'); f.id = 'figure'; f.style.left = Math.round(W * 0.82) + 'px'; c.appendChild(f);
}
askForm.addEventListener('submit', e => {
  e.preventDefault();
  const v = askIn.value; if (!v.trim()) return;
  $('asked').appendChild(el('p', '', v)); askIn.value = ''; askIn.blur(); S.outAsks++;
  if (S.outAsks === 1) { later(() => { const f = $('figure'); if (f) f.style.opacity = '0.8'; }, 5000); later(() => $('credit').classList.add('on'), 9000); }
});
$('back').addEventListener('click', () => {
  outTimers.forEach(clearTimeout); outTimers = [];
  Snd.windOff(); out.classList.remove('on');
  document.querySelectorAll('#out .o').forEach(x => x.classList.remove('on'));
  const f = $('figure'); if (f) f.style.opacity = '0';
  room.style.display = ''; requestAnimationFrame(() => requestAnimationFrame(() => { room.style.opacity = '1'; }));
  S.out = false; S.visits++; S.boost *= 2; S.last = now(); S.tIn = now(); S.outAsks = 0;
  Snd.init(); Snd.startPad();
  say('welcome back. i kept your plant.', 6000);
});
})();
