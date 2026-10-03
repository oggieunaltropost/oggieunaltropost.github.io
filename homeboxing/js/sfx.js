// Suoni sintetizzati con WebAudio: niente file da scaricare.
let ctx = null, master = null, noiseBuf = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  loadSamples(); loadVoices();
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

// Voci dello speaker e dell'arbitro (tools/gen_voices.py) nella lingua del gioco: frasi in coda, una dopo l'altra
const NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const VOICES = [...NUMS.map((_, i) => `round_${i + 1}`), ...NUMS.slice(0, 10).map((_, i) => `count_${i + 1}`),
  'final_round', 'ten_seconds', 'knockdown', 'winner_intro', 'scorecards', 'win_you_ko', 'win_you_tko', 'win_you_points',
  'win_mike_ko', 'win_mike_tko', 'win_mike_points', 'draw', 'box', 'lowblow_1', 'lowblow_2', 'dq', 'win_mike_dq', 'win_you_dq',
  'intro_1', 'intro_red', 'intro_blue', 'title'];
let vbuf = {}, vLang = 'it';
let vEnd = 0, vPlaying = [];
function loadVoices() {
  const mine = vbuf = {}, l = vLang;
  for (const n of VOICES) fetch(`assets/voce/${l}/${n}.ogg?v=20261003121134`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a))
    .then(b => { mine[n] = b; }).catch(() => {});
}
// lingua delle voci ('it' o 'en'): al cambio si ricaricano
export function setVoiceLang(l) { if (l === vLang) return; vLang = l; if (ctx) loadVoices(); }
// durata di una frase (s), 0 se non ancora caricata
export function voiceDur(n) { return vbuf[n] ? vbuf[n].duration : 0; }
export function announce(names, gain = 1.0) {
  if (!ctx || ctx.state !== 'running') return;        // audio in pausa (fuori dal gioco): niente frasi in coda
  let t = Math.max(ctx.currentTime + 0.02, vEnd);
  for (const n of [].concat(names)) {
    const b = vbuf[n]; if (!b) continue;
    const s = ctx.createBufferSource(); s.buffer = b;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(g); g.connect(master); s.start(t);
    vPlaying.push(s); s.onended = () => { vPlaying = vPlaying.filter(x => x !== s); };
    t += b.duration + 0.2;
  }
  vEnd = t;
}
// zittisce lo speaker (anche le frasi gia' in coda)
export function stopVoices() { for (const s of vPlaying) { try { s.stop(); } catch (e) {} } vPlaying = []; vEnd = 0; }
export function voiceNow(name, gain = 1.0) { vEnd = 0; announce(name, gain); }   // subito (es. conteggio)
// subito, con l'intonazione alzata (rate > 1: piu' acuta e veloce)
export function voiceRate(name, rate = 1, gain = 1.0) {
  const b = vbuf[name]; if (!ctx || !b) return;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(master); s.start();
}

// uscendo dal gioco: silenzio totale (si riaccende con initAudio)
export function stopAll() {
  crowdAmbient(false); seaAmbient(false);
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
const SAMPLES = ['brusio', 'tifo', 'boato_0', 'boato_1', 'boato_2', 'boato_3', 'ooh_0', 'ooh_1', 'ooh_2', 'applauso_0', 'applauso_1',
  'mare', 'onda_0', 'onda_1', 'onda_2'];
const buf = {};
let loading = null, amb = null, ambWanted = false, sea = null, seaWanted = false;
function loadSamples() {
  if (loading || !ctx) return loading;
  loading = Promise.all(SAMPLES.map(n => fetch(`assets/audio/${n}.ogg?v=20261003121134`).then(r => r.arrayBuffer())
    .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(e => console.warn('audio', n, e))));
  loading.then(() => { if (ambWanted && !amb) crowdAmbient(true); if (seaWanted && !sea) seaAmbient(true); });
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
// spiaggia: risacca continua (AudioGen, tools/gen_beach_audio.py)
export function seaAmbient(on) {
  seaWanted = on;
  if (!ctx) return;
  if (on && !sea) {
    if (!buf.mare) { loadSamples(); return; }
    sea = loopSrc(buf.mare, 0.55);
  } else if (!on && sea) { sea.s.stop(); sea = null; }
}
// un'onda che si infrange (gain secondo la distanza)
export function wave(gain = 0.6) {
  if (!ctx || !sea) return;
  const names = ['onda_0', 'onda_1', 'onda_2'].filter(n => buf[n]);
  if (!names.length) return;
  const s = ctx.createBufferSource(); s.buffer = buf[names[Math.floor(Math.random() * names.length)]];
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(master); s.start();
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
