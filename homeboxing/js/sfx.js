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

import { FIGHTERS, FIGHTER_IDS } from './fighters.js?v=20261005214307';
// Voci dello speaker e dell'arbitro (tools/gen_voices.py) nella lingua del gioco: frasi in coda, una dopo l'altra
const NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const VOICES = [...NUMS.map((_, i) => `round_${i + 1}`), ...NUMS.slice(0, 10).map((_, i) => `count_${i + 1}`),
  'final_round', 'ten_seconds', 'knockdown', 'winner_intro', 'scorecards', 'win_you_ko', 'win_you_tko', 'win_you_points',
  'win_you_dq', 'draw', 'box', 'lowblow_1', 'lowblow_2', 'dq', 'intro_1', 'intro_red', 'intro_blue_g', 'title',
  // l'avversario: parte comune + il suo nome (per un nuovo pugile bastano intro_<id> e name_<id>)
  'win_opp_ko', 'win_opp_tko', 'win_opp_points', 'win_opp_dq', 'intro_gen',
  // torneo: benvenuto, nome del turno, campione, eliminato
  'tour_intro', 'tour_r0', 'tour_r1', 'tour_r2', 'tour_r3', 'tour_r4', 'tour_champ', 'tour_out',
  ...FIGHTER_IDS.flatMap(id => FIGHTERS[id].genericIntro ? [`name_${id}`] : [`intro_${id}`, `name_${id}`]),   // (i nuovi: presentazione comune intro_gen)
  // l'allenatore dello sparring
  'c_start', 'c_free', 'c_combo', 'c_defense', 'c_k_1', 'c_k_2', 'c_k_11', 'c_k_12', 'c_k_112', 'c_k_123', 'c_k_32', 'c_k_23', 'c_k_1232',
  'c_k_16', 'c_k_63', 'c_k_34', 'c_k_b', 'c_k_12b', 'c_d_slip', 'c_d_block', 'c_d_duck', 'c_d_body', 'c_backguard',
  'c_good1', 'c_good2', 'c_good3', 'c_good4', 'c_bad1', 'c_bad2', 'c_bad3', 'c_bad4', 'c_bad5',
  'c_tip_guard', 'c_tip_body', 'c_tip_def', 'c_tip_miss', 'c_tip_combo', 'c_end',
  // l'uomo delle pulizie (in allenamento, quando si ferma vicino a te)
  'j_sacco', 'j_pera', 'j_doppio', 'j_corda'];
let vbuf = {}, vLang = 'it';
let vEnd = 0, vPlaying = [];
function loadVoices() {
  const mine = vbuf = {}, l = vLang;
  for (const n of VOICES) fetch(`assets/voce/${l}/${n}.ogg?v=20261005214307`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a))
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

// una voce che arriva da un punto (l'uomo delle pulizie): spaziale
export function voiceAt(name, pos, cam) {
  const b = vbuf[name]; if (!ctx || !b || ctx.state !== 'running') return;
  setListener(cam);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = 1.1;
  s.connect(g); g.connect(p); p.connect(master); s.start();
}
// uscendo dal gioco: silenzio totale (si riaccende con initAudio)
export function stopAll() {
  crowdAmbient(false); seaAmbient(false); windAmbient(false); snowAmbient(false); lavaAmbient(false); underAmbient(false); heliStop();
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
// menu: il classico "blink blink" da videogioco (due note brevi che salgono)
export function menuBlip() {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 0.07, 1046, 0.16, 'square'); tone(t + 0.075, 0.1, 1568, 0.14, 'square');
  tone(t, 0.07, 2093, 0.04, 'sine'); tone(t + 0.075, 0.1, 3136, 0.035, 'sine');
}
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
  'mare', 'onda_0', 'onda_1', 'onda_2', 'gabbiano_0', 'gabbiano_1', 'elicottero', 'vento',
  'sacco_0', 'sacco_1', 'sacco_2', 'sacco_3', 'catena_0', 'catena_1', 'catena_2',
  'pera_0', 'pera_1', 'pera_2', 'pera_3', 'pera_4', 'pera_5', 'pera_6', 'pera_7', 'aquila_0', 'aquila_1',
  'ululato_0', 'ululato_1', 'ululato_2', 'ululato_3', 'passineve_0', 'passineve_1', 'passineve_2', 'passineve_3', 'passineve_4', 'passineve_5', 'ventoneve',
  'lavaloop', 'eruzione_0', 'eruzione_1', 'eruzione_2', 'eruzione_3', 'schizzo_0', 'schizzo_1', 'schizzo_2', 'schizzo_3', 'schizzo_4', 'schizzo_5',
  'sottacqua', 'bolle_0', 'bolle_1', 'bolle_2', 'bolle_3'];
const buf = {};
let loading = null, amb = null, ambWanted = false, sea = null, seaWanted = false;
function loadSamples() {
  if (loading || !ctx) return loading;
  loading = Promise.all(SAMPLES.map(n => fetch(`assets/audio/${n}.ogg?v=20261005214307`).then(r => r.arrayBuffer())
    .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(e => console.warn('audio', n, e))));
  loading.then(() => { if (ambWanted && !amb) crowdAmbient(true); if (seaWanted && !sea) seaAmbient(true); if (snowWanted && !snowW) snowAmbient(true); if (lavaWanted && !lavaW) lavaAmbient(true); if (underWanted && !underW) underAmbient(true); if (windWanted && (!wind || wind.synth)) { if (wind) { wind.s.stop(); wind = null; } windAmbient(true); } });   // vento vero appena caricato
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

// ---------------------------------------------------------------- sacco pesante (allenamento)
// suono che arriva da un punto (HRTF): il sacco e' li', a destra/sinistra, vicino
function spot(pos, ref = 1.0) {
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  p.connect(master); return p;
}
function playAt(b, pos, gain, rate = 1, delay = 0) {
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(spot(pos)); s.start(ctx.currentTime + delay);
}
// colpo sul sacco: power 0..1.5 (0,3 = tocco, 1 = colpo pieno). Campione vero + tonfo grave + schiocco del cuoio, poi
// la catena che tintinna (piu' forte se il colpo e' forte)
export function bagHit(power, pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const P = Math.max(0.15, Math.min(1.5, power)), t = ctx.currentTime;
  const hits = ['sacco_0', 'sacco_1', 'sacco_2', 'sacco_3'].filter(n => buf[n]);
  if (hits.length) playAt(buf[hits[Math.floor(Math.random() * hits.length)]], pos, 0.35 + 0.65 * Math.min(1, P), 1.06 - 0.12 * Math.min(1, P) + Math.random() * 0.05);
  const out = spot(pos);
  // tonfo: la massa del sacco (piu' basso e lungo se il colpo e' forte)
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95 - 25 * Math.min(1, P), t); o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * P, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32);
  // schiocco del cuoio (solo i colpi decisi)
  if (P > 0.45) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400 + 900 * Math.random(); f.Q.value = 0.9;
    const gg = ctx.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.35 * (P - 0.3), t + 0.003); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(gg); gg.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.08);
  }
  const ch = ['catena_0', 'catena_1', 'catena_2'].filter(n => buf[n]);
  if (ch.length && P > 0.35) playAt(buf[ch[Math.floor(Math.random() * ch.length)]], pos.clone ? pos.clone().setY(pos.y + 0.8) : pos, 0.08 + 0.22 * Math.min(1, P - 0.2), 0.95 + Math.random() * 0.1, 0.05);
}
// scricchiolio del gancio quando il sacco oscilla forte (al punto di inversione)
export function bagCreak(level, pos, cam) {
  if (!ctx || ctx.state !== 'running' || level < 0.05) return;
  setListener(cam);
  const t = ctx.currentTime, out = spot(pos);
  const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 520 + Math.random() * 300;
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 0.82, t + 0.18);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 2; bp.Q.value = 6;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * Math.min(1, level), t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
}

// ---------------------------------------------------------------- corda per saltare
// schiocco della corda di cuoio sul pavimento (a ogni giro, sotto i piedi)
export function ropeSlap(power, pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const t = ctx.currentTime, out = spot(pos), P = Math.max(0.2, Math.min(1.2, power));
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + 600 * Math.random(); f.Q.value = 1.2;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * P, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.07);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.18 * P, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.08);
}
// la corda colpisce le caviglie: schiocco sordo
export function ropeTrip(pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const t = ctx.currentTime, out = spot(pos);
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.15);
}
// fruscio dell'aria mentre gira (piu' forte e acuto quando gira veloce, a ondate a ogni giro)
let ropeAir = null;
export function ropeWhoosh(level, phaseGain) {
  if (!ctx || ctx.state !== 'running') return;
  if (!ropeAir) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    ropeAir = { s, f, g };
  }
  const L = Math.max(0, Math.min(1, level));
  ropeAir.g.gain.setTargetAtTime(0.16 * L * L * (0.35 + 0.65 * phaseGain), ctx.currentTime, 0.02);
  ropeAir.f.frequency.setTargetAtTime(450 + 1100 * L, ctx.currentTime, 0.05);
}
export function ropeWhooshStop() { if (ropeAir) { ropeAir.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } }

// ---------------------------------------------------------------- pera veloce (speed bag)
const PERA = ['pera_0', 'pera_1', 'pera_2', 'pera_3', 'pera_4', 'pera_5', 'pera_6', 'pera_7'];
// la pera sbatte contro la tavola di legno (il "ta" del ritmo)
export function speedRebound(power, pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const P = Math.max(0.05, Math.min(1.2, power)), have = PERA.filter(n => buf[n]);
  if (have.length) playAt(buf[have[Math.floor(Math.random() * have.length)]], pos, 0.15 + 0.75 * P, 0.94 + Math.random() * 0.12);
  else {                                                   // (se i campioni non ci sono ancora) colpo di legno sintetico
    const t = ctx.currentTime, out = spot(pos);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * P, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1);
  }
}
// il guantone colpisce la pera: schiocco di cuoio, piu' leggero del rimbalzo
export function speedHit(power, pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const t = ctx.currentTime, out = spot(pos), P = Math.max(0.1, Math.min(1.2, power));
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + 500 * Math.random(); f.Q.value = 1.0;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4 * P, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.07);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.25 * P, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.09);
}

// grido dell'aquila, dal punto in cui vola (spaziale; lontana = piu' piano)
export function eagleCry(pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  const names = ['aquila_0', 'aquila_1']   // (aquila_2 tolta: dentro c'era una specie di voce che canticchiava)
    .filter(n => buf[n]);
  if (!names.length) return;
  setListener(cam);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 18; p.rolloffFactor = 1;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const s = ctx.createBufferSource(); s.buffer = buf[names[Math.floor(Math.random() * names.length)]];
  s.playbackRate.value = 0.94 + Math.random() * 0.12;
  const g = ctx.createGain(); g.gain.value = 0.8;
  s.connect(g); g.connect(p); p.connect(master); s.start();
}

// ---------------------------------------------------------------- neve: vento freddo in loop, passi del lupo, ululato
let snowW = null, snowWanted = false;
export function snowAmbient(on) {
  snowWanted = on;
  if (!ctx) return;
  if (on && !snowW) {
    if (!buf.ventoneve) { loadSamples(); return; }
    snowW = loopSrc(buf.ventoneve, 0.0); snowW.g.gain.setTargetAtTime(0.38, ctx.currentTime, 1.5);
  } else if (!on && snowW) { const w = snowW; snowW = null; w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { try { w.s.stop(); } catch (e) {} }, 1200); }
}
function playSpatial(names, pos, cam, gain, ref, rate = 1) {
  if (!ctx || ctx.state !== 'running') return;
  names = names.filter(n => buf[n]); if (!names.length) return;
  setListener(cam);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 1;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const s = ctx.createBufferSource(); s.buffer = buf[names[Math.floor(Math.random() * names.length)]]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  s.connect(g); g.connect(p); p.connect(master); s.start();
}
export function snowStep(pos, cam) {
  playSpatial(['passineve_0', 'passineve_1', 'passineve_2', 'passineve_3', 'passineve_4', 'passineve_5'], pos, cam, 0.35, 1.5, 1.05 + Math.random() * 0.25);
}
export function wolfHowl(pos, cam) {
  playSpatial(['ululato_0', 'ululato_1', 'ululato_2', 'ululato_3'], pos, cam, 0.9, 6, 0.9 + Math.random() * 0.06);   // (un po' piu' grave: lupo, non cane)
}

// ---------------------------------------------------------------- sotto il mare: ambiente subacqueo (loop), sbuffi di bolle
let underW = null, underWanted = false;
export function underAmbient(on) {
  underWanted = on;
  if (!ctx) return;
  if (on && !underW) {
    if (!buf.sottacqua) { loadSamples(); return; }
    underW = loopSrc(buf.sottacqua, 0.0); underW.g.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2);
  } else if (!on && underW) { const w = underW; underW = null; w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { try { w.s.stop(); } catch (e) {} }, 1200); }
}
export function bubbles(pos, cam) {
  playSpatial(['bolle_0', 'bolle_1', 'bolle_2', 'bolle_3'], pos, cam, 0.6, 2.5, 0.85 + Math.random() * 0.3);
}
// ---------------------------------------------------------------- vulcano: lava che ribolle (loop), boati dell'eruzione, schizzi
let lavaW = null, lavaWanted = false;
export function lavaAmbient(on) {
  lavaWanted = on;
  if (!ctx) return;
  if (on && !lavaW) {
    if (!buf.lavaloop) { loadSamples(); return; }
    lavaW = loopSrc(buf.lavaloop, 0.0); lavaW.g.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
  } else if (!on && lavaW) { const w = lavaW; lavaW = null; w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { try { w.s.stop(); } catch (e) {} }, 1200); }
}
export function eruption(pos, cam, gain = 1.0) {
  playSpatial(['eruzione_0', 'eruzione_1', 'eruzione_2', 'eruzione_3'], pos, cam, 1.4 * gain, 400, 0.9 + Math.random() * 0.15);
}
export function lavaSplash(pos, cam) {
  playSpatial(['schizzo_0', 'schizzo_1', 'schizzo_2', 'schizzo_3', 'schizzo_4', 'schizzo_5'], pos, cam, 0.7, 2.5, 0.85 + Math.random() * 0.3);
}
