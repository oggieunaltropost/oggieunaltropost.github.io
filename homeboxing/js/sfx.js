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

import { FIGHTER_IDS } from './fighters.js?v=20261004103857';
// Voci dello speaker e dell'arbitro (tools/gen_voices.py) nella lingua del gioco: frasi in coda, una dopo l'altra
const NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const VOICES = [...NUMS.map((_, i) => `round_${i + 1}`), ...NUMS.slice(0, 10).map((_, i) => `count_${i + 1}`),
  'final_round', 'ten_seconds', 'knockdown', 'winner_intro', 'scorecards', 'win_you_ko', 'win_you_tko', 'win_you_points',
  'win_you_dq', 'draw', 'box', 'lowblow_1', 'lowblow_2', 'dq', 'intro_1', 'intro_red', 'intro_blue_g', 'title',
  // l'avversario: parte comune + il suo nome (per un nuovo pugile bastano intro_<id> e name_<id>)
  'win_opp_ko', 'win_opp_tko', 'win_opp_points', 'win_opp_dq',
  // torneo: benvenuto, nome del turno, campione, eliminato
  'tour_intro', 'tour_r0', 'tour_r1', 'tour_r2', 'tour_r3', 'tour_r4', 'tour_champ', 'tour_out',
  ...FIGHTER_IDS.flatMap(id => [`intro_${id}`, `name_${id}`])];
let vbuf = {}, vLang = 'it';
let vEnd = 0, vPlaying = [];
function loadVoices() {
  const mine = vbuf = {}, l = vLang;
  for (const n of VOICES) fetch(`assets/voce/${l}/${n}.ogg?v=20261004103857`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a))
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
// lo speaker sta ancora parlando (o ha frasi in coda)?
export function voiceBusy() { return !!ctx && vEnd > ctx.currentTime; }
// pausa: si ferma TUTTO l'audio (voce a meta' frase compresa) e riparte da dove era
export function suspend(on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); }
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
  crowdAmbient(false); seaAmbient(false); windAmbient(false); heliStop();
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
//  mio (vai a segno tu): schiocco secco e brillante del guantone sulla pelle, tonfo piu' corto
//  suo (ti colpisce):    piu' cupo e ovattato, lo senti "dentro la testa", con un rimbombo basso
export function punchHit(strength = 1, mine = true) {
  if (!ctx) return; const t = ctx.currentTime;
  if (mine) {
    tone(t, 0.14, 150, 0.8 * strength, 'sine', 55);
    noise(t, 0.07, 2600, 0.8, 0.75 * strength);
    noise(t, 0.05, 3400, 1.4, 0.35 * strength, 'bandpass');         // schiocco del cuoio
    noise(t, 0.18, 500, 0.5, 0.3 * strength);
  } else {
    tone(t, 0.26, 95, 1.0 * strength, 'sine', 32);
    tone(t + 0.01, 0.35, 55, 0.5 * strength, 'sine', 28);           // rimbombo
    noise(t, 0.12, 900, 0.7, 0.75 * strength);                      // ovattato: niente alti
    noise(t, 0.3, 300, 0.5, 0.45 * strength);
  }
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
// torneo: passi il turno (fanfara breve che sale); champion = fanfara piu' lunga per la coppa
// sopravvivenza: il gettone sale di un piano (soffio che sale, arpeggio, colpo d'arrivo)
export function climb(dur = 1.7, top = false) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  noise(t, dur, 300, 0.9, 0.16, 'bandpass', 3800);
  const notes = top ? [392, 523, 659, 784, 1047, 1319, 1568] : [392, 523, 659, 784, 1047];
  notes.forEach((f, i) => tone(t + i * dur / notes.length * 0.9, 0.18, f, 0.12, 'triangle'));
  tone(t + dur, 0.5, 98, 0.35, 'sine', 55);                       // arrivo: colpo basso
  noise(t + dur, 0.35, 2400, 0.7, 0.18, 'highpass');
  for (const [m, g] of [[1, 0.22], [2.41, 0.1]]) tone(t + dur, 1.2, 880 * m, g);   // campana
}
export function advance(champion = false) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  noise(t, 0.5, 600, 0.6, 0.12, 'bandpass', 2600);                    // fruscio che sale (il nome che corre)
  const notes = champion ? [523, 659, 784, 1047, 784, 1047, 1319] : [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    const d = champion && i === notes.length - 1 ? 0.9 : 0.16;
    tone(t + 0.12 + i * 0.11, d, f, 0.16, 'triangle');
    tone(t + 0.12 + i * 0.11, d, f * 2, 0.05, 'sine');
  });
  if (champion) cheer('applauso', 1);
}
export function bell(times = 1) {
  if (!ctx) return;
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + i * 0.45;
    for (const [m, g] of [[1, 0.5], [2.41, 0.25], [3.9, 0.15], [5.2, 0.08]]) tone(t, 1.6, 830 * m, g);
  }
}

// Pubblico del palazzetto: suoni veri generati con AudioGen (tools/gen_crowd_audio.py, tools/make_audio.py)
const SAMPLES = ['brusio', 'tifo', 'boato_0', 'boato_1', 'boato_2', 'boato_3', 'ooh_0', 'ooh_1', 'ooh_2', 'applauso_0', 'applauso_1',
  'mare', 'onda_0', 'onda_1', 'onda_2', 'gabbiano_0', 'gabbiano_1', 'elicottero', 'vento'];
const buf = {};
let loading = null, amb = null, ambWanted = false, sea = null, seaWanted = false;
function loadSamples() {
  if (loading || !ctx) return loading;
  loading = Promise.all(SAMPLES.map(n => fetch(`assets/audio/${n}.ogg?v=20261004103857`).then(r => r.arrayBuffer())
    .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(e => console.warn('audio', n, e))));
  loading.then(() => { if (ambWanted && !amb) crowdAmbient(true); if (seaWanted && !sea) seaAmbient(true); if (windWanted && (!wind || wind.synth)) { if (wind) { wind.s.stop(); wind = null; } windAmbient(true); } });   // vento vero appena caricato
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
// gabbiano lontano, nel punto in cui vola (audio spaziale: si sente da quella parte e piu' piano se e' lontano)
export function gull(pos, cam) {
  if (!ctx || !sea) return;
  const names = ['gabbiano_0', 'gabbiano_1'].filter(n => buf[n]);
  if (!names.length) return;
  const L = ctx.listener, cp = cam.getWorldPosition(new cam.position.constructor()), f = cam.getWorldDirection(new cam.position.constructor());
  const up = new cam.position.constructor(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(new cam.quaternion.constructor()));
  if (L.positionX) { L.positionX.value = cp.x; L.positionY.value = cp.y; L.positionZ.value = cp.z;
    L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z; }
  else { L.setPosition(cp.x, cp.y, cp.z); L.setOrientation(f.x, f.y, f.z, up.x, up.y, up.z); }
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 10; p.rolloffFactor = 1;
  p.setPosition(pos.x, pos.y, pos.z);
  const s = ctx.createBufferSource(); s.buffer = buf[names[Math.floor(Math.random() * names.length)]];
  s.playbackRate.value = 0.9 + Math.random() * 0.25;
  const g = ctx.createGain(); g.gain.value = 0.55;
  s.connect(g); g.connect(p); p.connect(master); s.start();
}
// ascoltatore (orecchie) dove sta la testa: per i suoni spaziali (gabbiani, elicottero)
function setListener(cam) {
  const L = ctx.listener, cp = cam.getWorldPosition(new cam.position.constructor()), f = cam.getWorldDirection(new cam.position.constructor());
  const up = new cam.position.constructor(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(new cam.quaternion.constructor()));
  if (L.positionX) { L.positionX.value = cp.x; L.positionY.value = cp.y; L.positionZ.value = cp.z;
    L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z; }
  else { L.setPosition(cp.x, cp.y, cp.z); L.setOrientation(f.x, f.y, f.z, up.x, up.y, up.z); }
}
// suoni sintetizzati in un buffer (nessun file): vento d'alta quota ed elicottero
function synthBuffer(secs, fn) {
  const n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  fn(d, ctx.sampleRate); return b;
}
let wind = null, windWanted = false, heliSrc = null, heliBuf = null;
export function windAmbient(on) {
  windWanted = on;
  if (!ctx) return;
  if (on && !wind) {
    if (buf.vento) {                                       // vento vero (AudioGen, tools/make_sky_audio.py)
      const v = loopSrc(buf.vento, 0.0); v.g.gain.setTargetAtTime(0.42, ctx.currentTime, 1.0); wind = v; return;
    }
    if (!loading) loadSamples();
    const buf2 = synthBuffer(8, (d, sr) => {                // rumore "rosa" morbido che sale e scende (raffiche)
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
        const t = i / sr, gust = 0.55 + 0.45 * Math.sin(t * Math.PI * 2 / 8) * Math.sin(t * Math.PI * 2 / 2.67 + 1);
        d[i] = (b0 + b1 + b2) * gust;
      }
      const f = Math.floor(sr * 0.5); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[d.length - f + i] * (1 - k); }   // giro chiuso
    });
    const s = ctx.createBufferSource(); s.buffer = buf2; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.32;
    s.connect(lp); lp.connect(g); g.connect(master); s.start();
    wind = { s, g, synth: true };
  } else if (!on && wind) { wind.s.stop(); wind = null; heliStop(); }
}
// elicottero: colpi delle pale (~5,5 al secondo) + turbina; suono spaziale, piu' forte quando e' vicino (mai troppo)
export function heli(pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  if (!heliSrc) {
    if (!heliBuf) heliBuf = synthBuffer(2, (d, sr) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, ph = (t * 5.5) % 1;                // un colpo di pala ogni 1/5.5 s (2 s = 11 colpi: loop perfetto)
        const slap = Math.exp(-ph * 18) * (Math.random() * 2 - 1) * 0.9 + Math.exp(-ph * 9) * Math.sin(2 * Math.PI * 68 * t) * 0.6;
        lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;     // rombo continuo
        d[i] = slap + lp * 0.5 + Math.sin(2 * Math.PI * 1150 * t) * 0.025;   // + fischio della turbina
      }
    });
    const s = ctx.createBufferSource(); s.buffer = buf.elicottero || heliBuf; s.loop = true;   // vero (AudioGen) se caricato
    s.playbackRate.value = 0.94 + Math.random() * 0.12;    // ogni elicottero un po' diverso
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 45; p.rolloffFactor = 1.3; p.maxDistance = 2000;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;   // lontano = piu' ovattato
    const g = ctx.createGain(); g.gain.value = 0.0; g.gain.setTargetAtTime(buf.elicottero ? 0.9 : 0.45, ctx.currentTime, 1.5);
    s.connect(lp); lp.connect(g); g.connect(p); p.connect(master); s.start(s.context.currentTime, Math.random() * 3);
    heliSrc = { s, p, g, lp };
  }
  setListener(cam);
  const cp = cam.getWorldPosition(new cam.position.constructor()), dist = cp.distanceTo(pos);
  heliSrc.lp.frequency.setTargetAtTime(500 + 9000 * Math.exp(-dist / 140), ctx.currentTime, 0.2);
  const P = heliSrc.p;
  if (P.positionX) { P.positionX.value = pos.x; P.positionY.value = pos.y; P.positionZ.value = pos.z; } else P.setPosition(pos.x, pos.y, pos.z);
}
export function heliStop() {
  if (!heliSrc) return;
  const h = heliSrc; heliSrc = null;
  h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { try { h.s.stop(); } catch (e) {} }, 1500);
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
