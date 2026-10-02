// Suoni sintetizzati con WebAudio: niente file da scaricare.
let ctx = null, master = null, noiseBuf = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  loadSamples();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function noise(t, dur, freq, q, gain, type = 'lowpass', sweepTo = null) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

function tone(t, dur, freq, gain, type = 'sine', toFreq = null) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

// uscendo dal gioco: silenzio totale (si riaccende con initAudio)
export function stopAll() {
  crowdAmbient(false);
  if (ctx && ctx.state === 'running') ctx.suspend();
}

// fuoco d'artificio: botto e crepitio
export function firework() {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 0.5, 90, 0.7, 'sine', 35);
  noise(t, 0.6, 1200, 0.5, 0.5);
  for (let i = 0; i < 10; i++) noise(t + 0.15 + Math.random() * 0.6, 0.04, 4000, 2, 0.12, 'bandpass');
}

// colpo pieno: tonfo sordo + schiocco del cuoio
export function punchHit(strength = 1) {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 0.18, 120, 0.9 * strength, 'sine', 45);
  noise(t, 0.09, 1800, 0.8, 0.7 * strength);
  noise(t, 0.25, 400, 0.5, 0.4 * strength);
}

// parata: colpo su guantone, piu' secco e meno profondo
export function punchBlock() {
  if (!ctx) return; const t = ctx.currentTime;
  noise(t, 0.07, 2600, 1.2, 0.6, 'bandpass');
  tone(t, 0.08, 220, 0.35, 'triangle', 120);
}

// spostamento d'aria di un pugno che va a vuoto
export function whoosh() {
  if (!ctx) return; const t = ctx.currentTime;
  noise(t, 0.22, 500, 1.5, 0.25, 'bandpass', 2400);
}

// campana del ring
export function bell(times = 1) {
  if (!ctx) return;
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + i * 0.45;
    for (const [m, g] of [[1, 0.5], [2.41, 0.25], [3.9, 0.15], [5.2, 0.08]]) tone(t, 1.6, 830 * m, g);
  }
}

// Pubblico del palazzetto: suoni veri generati con AudioGen (tools/gen_crowd_audio.py, tools/make_audio.py)
const SAMPLES = ['brusio', 'tifo', 'boato_0', 'boato_1', 'boato_2', 'boato_3', 'ooh_0', 'ooh_1', 'ooh_2', 'applauso_0', 'applauso_1'];
const buf = {};
let loading = null, amb = null, ambWanted = false;
function loadSamples() {
  if (loading || !ctx) return loading;
  loading = Promise.all(SAMPLES.map(n => fetch(`assets/audio/${n}.ogg`).then(r => r.arrayBuffer())
    .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(e => console.warn('audio', n, e))));
  loading.then(() => { if (ambWanted && !amb) crowdAmbient(true); });
  return loading;
}
function loopSrc(b, gain) {
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(master); s.start(0, Math.random() * b.duration);
  return { s, g };
}
export function crowdAmbient(on) {
  ambWanted = on;
  if (!ctx) return;
  if (on && !amb) {
    if (!buf.brusio) { loadSamples(); return; }
    amb = { brusio: loopSrc(buf.brusio, 0.45), tifo: loopSrc(buf.tifo, 0.0) };
  } else if (!on && amb) {
    amb.brusio.s.stop(); amb.tifo.s.stop(); amb = null;
  }
}
// x = eccitazione del pubblico (0..1): il brusio cresce e partono i cori
export function crowdLevel(x) {
  if (!amb) return;
  amb.brusio.g.gain.setTargetAtTime(0.4 + x * 0.25, ctx.currentTime, 0.3);
  amb.tifo.g.gain.setTargetAtTime(Math.max(0, x - 0.15) * 0.8, ctx.currentTime, 0.4);
}
// effetto singolo: 'boato' (colpo forte), 'ooh' (quasi), 'applauso'
export function cheer(kind, gain = 0.8) {
  if (!ctx) return;
  const names = SAMPLES.filter(n => n.startsWith(kind + '_') && buf[n]);
  if (!names.length) return;
  const s = ctx.createBufferSource(); s.buffer = buf[names[Math.floor(Math.random() * names.length)]];
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(master); s.start();
}

// incitamento quando un colpo va a segno (fruscio di folla breve)
export function crowd(gain = 0.15) {
  if (!ctx) return; const t = ctx.currentTime;
  noise(t, 0.9, 900, 0.4, gain, 'bandpass', 600);
}
