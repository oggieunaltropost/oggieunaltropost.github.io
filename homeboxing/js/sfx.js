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

import { FIGHTERS, FIGHTER_IDS } from './fighters.js?v=20261010150310';
// Voci dello speaker e dell'arbitro (tools/gen_voices.py) nella lingua del gioco: frasi in coda, una dopo l'altra
const NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const VOICES = [...NUMS.map((_, i) => `round_${i + 1}`), ...NUMS.slice(0, 10).map((_, i) => `count_${i + 1}`),
  'final_round', 'ten_seconds', 'knockdown', 'winner_intro', 'scorecards', 'win_you_ko', 'win_you_tko', 'win_you_points',
  'win_you_dq', 'draw', 'box', 'lowblow_1', 'lowblow_2', 'dq', 'out_1', 'out_2', 'adapted', 'intro_1', 'intro_red', 'intro_blue_g', 'intro_red_g', 'title',
  // l'avversario: parte comune + il suo nome (per un nuovo pugile bastano intro_<id> e name_<id>)
  'win_opp_ko', 'win_opp_tko', 'win_opp_points', 'win_opp_dq', 'win_red_ko', 'win_red_tko', 'win_red_points', 'win_red_dq', 'intro_gen', 'intro_gen2', 'intro_gen3', 'intro_gen4',
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
  for (const n of VOICES) fetch(`assets/voce/${l}/${n}.ogg?v=20261010150310`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a))
    .then(b => { mine[n] = b; }).catch(() => {});
}
// lingua delle voci ('it' o 'en'): al cambio si ricaricano
export function setVoiceLang(l) { if (l === vLang) return; vLang = l; if (ctx) loadVoices(); }
// durata di una frase (s), 0 se non ancora caricata
export function voiceDur(n) { return vbuf[n] ? vbuf[n].duration : 0; }
// quando parte l'ultima frase messa in coda (il nome del vincitore): ms da adesso
let lastVoiceAt = 0, lastVoiceEnd = 0;
export function lastVoiceEnds() { return ctx && ctx.state === 'running' ? Math.max(0, (lastVoiceEnd - ctx.currentTime) * 1000) : 0; }   // ms da adesso alla fine dell'ultima frase
export function lastVoiceIn() { return ctx && ctx.state === 'running' ? Math.max(0, (lastVoiceAt - ctx.currentTime) * 1000) : 0; }
export function announce(names, gain = 1.0) {
  if (!ctx || ctx.state !== 'running') return;        // audio in pausa (fuori dal gioco): niente frasi in coda
  let t = Math.max(ctx.currentTime + 0.02, vEnd);
  for (const n of [].concat(names)) {
    const b = vbuf[n]; if (!b) continue;
    lastVoiceAt = t; lastVoiceEnd = t + b.duration;
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
export function voiceNow(name, gain = 1.0) { stopVoices(); announce(name, gain); }   // subito (es. conteggio); la voce di prima si ferma (si sovrapponeva: "mezza parola" dopo il nome)
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
// ---- sparring, combinazioni: colpo giusto (campanello che sale a ogni colpo della sequenza), sbagliato (ronzio basso), fine riuscita
// (arpeggio con scintillio), tempo scaduto (discesa)
export function comboOk(i = 0) {
  if (!ctx) return; const t = ctx.currentTime, f = [523.25, 587.33, 659.25, 783.99, 880, 987.77][Math.min(5, i)];
  tone(t, 0.16, f, 0.2, 'triangle'); tone(t, 0.22, f * 2, 0.07, 'sine'); tone(t + 0.02, 0.1, f * 3, 0.03, 'sine');
  noise(t, 0.04, 5000, 0.8, 0.07, 'highpass');
}
export function comboWrong() {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 0.16, 190, 0.22, 'sawtooth', 120); tone(t + 0.05, 0.16, 150, 0.2, 'square', 95); noise(t, 0.08, 400, 0.9, 0.12, 'lowpass');
}
export function comboDone() {
  if (!ctx) return; const t = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => { tone(t + k * 0.075, 0.28, f, 0.17, 'triangle'); tone(t + k * 0.075, 0.3, f * 2, 0.05, 'sine'); });
  tone(t + 0.32, 0.6, 1568, 0.08, 'sine'); noise(t + 0.3, 0.4, 7000, 0.7, 0.05, 'highpass');
}
export function comboFail() {
  if (!ctx) return; const t = ctx.currentTime;
  tone(t, 0.22, 392, 0.17, 'triangle', 330); tone(t + 0.18, 0.3, 294, 0.17, 'triangle', 220); tone(t + 0.18, 0.34, 147, 0.1, 'sawtooth', 110);
}

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
  loading = Promise.all(SAMPLES.map(n => fetch(`assets/audio/${n}.ogg?v=20261010150310`).then(r => r.arrayBuffer())
    .then(a => ctx.decodeAudioData(a)).then(b => { buf[n] = b; }).catch(e => console.warn('audio', n, e))));
  loading.then(() => { if (ambWanted && !amb) crowdAmbient(true); if (seaWanted && !sea) seaAmbient(true); if (snowWanted && !snowW) snowAmbient(true); if (lavaWanted && !lavaW) lavaAmbient(true); if (underWanted && !underW) underAmbient(true); if (spaceWanted && !spaceW) spaceAmbient(true); if (windWanted && (!wind || wind.synth)) { if (wind) { wind.s.stop(); wind = null; } windAmbient(true); } });   // vento vero appena caricato
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
// sibilo del gas dello zaino (astronauta sulla Luna): fruscio a banda larga che sale subito e cala, ovattato dalla distanza;
// `dur` = quanto dura la spinta (s). La sorgente e' nel mondo (pos) e panneggiata.
let gasNoise = null;
export function gasPuff(pos, cam, dur = 0.7, gain = 1) {
  if (!ctx || ctx.state !== 'running') return;
  if (!gasNoise) { gasNoise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = gasNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + 0.02, s = ctx.createBufferSource(); s.buffer = gasNoise; s.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(3200, t0); bp.frequency.exponentialRampToValueAtTime(1500, t0 + dur + 0.3); bp.Q.value = 0.6;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.55 * gain, t0 + 0.05);
  g.gain.setValueAtTime(0.42 * gain, t0 + dur * 0.7); g.gain.linearRampToValueAtTime(0, t0 + dur + 0.35);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.2; p.maxDistance = 200;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  setListener(cam);
  s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(p); p.connect(master);
  s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.45);
  // un colpetto sordo all'inizio (la valvola che si apre)
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + 0.12);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.0, t0); og.gain.linearRampToValueAtTime(0.35 * gain, t0 + 0.01); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
  o.connect(og); og.connect(p); o.start(t0); o.stop(t0 + 0.2);
}
// aereo da traino (stage Stadio): motore a pistoni a 2200 giri, elica a 74 Hz, un po' di vento; la posizione e' nel mondo e
// `rate` e' l'effetto Doppler (1 = fermo, >1 si avvicina)
let planeSrc = null, planeBuf = null;
export function planeBuzz(pos, cam, rate = 1) {
  if (!ctx || ctx.state !== 'running') return;
  if (!planeSrc) {
    if (!planeBuf) planeBuf = synthBuffer(2, (d, sr) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr, w = 2 * Math.PI * t;
        const fire = Math.sin(w * 37 + 1.6 * Math.sin(w * 37));                      // gli scoppi dei cilindri
        const blade = Math.sin(w * 74) * (0.65 + 0.35 * Math.sin(w * 3));            // le pale dell'elica
        lp = lp * 0.9 + (Math.random() * 2 - 1) * 0.1;                               // vento e rumore
        d[i] = fire * 0.34 + blade * 0.30 + Math.sin(w * 148) * 0.12 + Math.sin(w * 222) * 0.06 + lp * 0.32;
      }
    });
    const s = ctx.createBufferSource(); s.buffer = planeBuf; s.loop = true;
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 70; p.rolloffFactor = 1.0; p.maxDistance = 3000;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
    s.connect(lp); lp.connect(g); g.connect(p); p.connect(master); s.start(ctx.currentTime, Math.random() * 2);
    planeSrc = { s, p, g, lp };
  }
  setListener(cam);
  const cp = cam.getWorldPosition(new cam.position.constructor()), dist = cp.distanceTo(pos);
  planeSrc.lp.frequency.setTargetAtTime(700 + 6000 * Math.exp(-dist / 160), ctx.currentTime, 0.2);   // lontano = piu' ovattato
  planeSrc.s.playbackRate.setTargetAtTime(Math.max(0.8, Math.min(1.25, rate)), ctx.currentTime, 0.15);
  const P = planeSrc.p;
  if (P.positionX) { P.positionX.value = pos.x; P.positionY.value = pos.y; P.positionZ.value = pos.z; } else P.setPosition(pos.x, pos.y, pos.z);
}
export function planeStop() {
  if (!planeSrc) return;
  const h = planeSrc; planeSrc = null;
  h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(() => { try { h.s.stop(); } catch (e) {} }, 2000);
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
// ---------------------------------------------------------------- luna: atmosfera "da spazio", bassissima
// (sintetizzata qui: un rombo profondo che respira piano, un fruscio scuro e un luccichio lontano; 24 s che si ripetono)
let spaceW = null, spaceWanted = false, spaceBuf = null;
function makeSpace() {
  // (prima i toni stavano tra 41 e 124 Hz: gli altoparlanti del Quest non li riproducono e non si sentiva niente)
  // Un tappeto lento e sospeso: bordone a 110 Hz con quinta e ottava, ognuno con un compagno appena stonato (battimenti
  // lenti che "respirano"), un soffio d'aria sottile e ogni tanto un luccichio. Tutte le frequenze sono multipli di 1/24 Hz:
  // il giro di 24 s e' senza scatti.
  const L = 24, sr = ctx.sampleRate, n = L * sr, b = ctx.createBuffer(2, n, sr);
  const tones = [[110, 0.20], [110.5, 0.16], [165, 0.13], [165.75, 0.10], [220, 0.10], [220.5, 0.08], [330, 0.05], [440.25, 0.035], [660, 0.02]];
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0, hp = 0;
    const noise = new Float32Array(n);
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; lp += (w - lp) * 0.18; hp += (lp - hp) * 0.012; noise[i] = lp - hp; }   // fruscio "d'aria" (banda larga, senza il rombo)
    const X = sr * 2;                                                     // giunta del fruscio: dissolvenza incrociata di 2 s
    for (let i = 0; i < X; i++) { const k = i / X; noise[i] = noise[i] * k + noise[n - X + i] * (1 - k); }
    for (let i = 0; i < n; i++) {
      const t = i / sr; let v = 0;
      for (const [f, a] of tones) v += a * Math.sin(2 * Math.PI * f * t + ch * 0.9 + f * 0.37);
      v *= 0.62 + 0.38 * Math.sin(2 * Math.PI * t * 2 / 24 + ch * 1.1);     // respiro lento
      v += noise[i] * 0.9 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t * 3 / 24 + 1.3 + ch));
      v += 0.03 * Math.sin(2 * Math.PI * 1760 * t) * Math.max(0, Math.sin(2 * Math.PI * t * 3 / 24 + ch * 2));    // luccichio
      v += 0.02 * Math.sin(2 * Math.PI * 2343.75 * t) * Math.max(0, Math.sin(2 * Math.PI * t * 2 / 24 + 2 + ch));
      d[i] = v * 0.55;
    }
  }
  return b;
}
export function spaceAmbient(on) {
  spaceWanted = on;
  if (!ctx) return;
  if (on && !spaceW) {
    if (!spaceBuf) spaceBuf = makeSpace();
    spaceW = loopSrc(spaceBuf, 0.0); spaceW.g.gain.setTargetAtTime(0.11, ctx.currentTime, 2.5);   // molto soft, di sottofondo
  } else if (!on && spaceW) { const w = spaceW; spaceW = null; w.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3); setTimeout(() => { try { w.s.stop(); } catch (e) {} }, 1200); }
}
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
// colpo di piede sul pallone (stage Stadio): tonfo secco + schiocco del cuoio, nel mondo. Piu' e' lontano, piu' arriva
// tardi (340 m/s), piu' e' piano e ovattato. `power` 0..1 = forza del tocco.
export function ballKick(pos, cam, power = 0.6) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const cp = cam.getWorldPosition(new cam.position.constructor()), dist = cp.distanceTo(pos);
  const t0 = ctx.currentTime + 0.01 + dist / 340, pw = 0.35 + 0.65 * power;
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.3; p.maxDistance = 400;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400 + 7000 * Math.exp(-dist / 45);   // lontano = ovattato
  const g = ctx.createGain(); g.gain.value = 0.45 * pw; lp.connect(g); g.connect(p); p.connect(master);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(320, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.09);   // il corpo del pallone (i toni bassi non escono dagli altoparlanti: c'e' anche il medio)
  const og = ctx.createGain(); og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.8, t0 + 0.004); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
  o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + 0.16);
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const n = ctx.createBufferSource(); n.buffer = noiseBuf;                                  // lo schiocco del cuoio
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100 + 900 * power; bp.Q.value = 0.8;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(0.9, t0 + 0.002); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
  n.connect(bp); bp.connect(ng); ng.connect(lp); n.start(t0, Math.random() * 0.5); n.stop(t0 + 0.07);
}
// palla contro palo/traversa (clangore metallico che risuona), contro la rete (fruscio sordo) o rimbalzo sul prato (tonfo
// morbido); nel mondo, in ritardo con la distanza come ballKick. power 0..1
export function ballHit(pos, cam, kind = 'bounce', power = 0.5) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const cp = cam.getWorldPosition(new cam.position.constructor()), dist = cp.distanceTo(pos);
  const t0 = ctx.currentTime + 0.01 + dist / 340, pw = Math.min(1, Math.max(0.1, power));
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.3; p.maxDistance = 400;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 + 8000 * Math.exp(-dist / 45);
  const g = ctx.createGain(); g.gain.value = 0.45; lp.connect(g); g.connect(p); p.connect(master);
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const noise = (f, q, dur, amp, type = 'bandpass') => {
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(amp, t0 + 0.004); ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    n.connect(b); b.connect(ng); ng.connect(lp); n.start(t0, Math.random() * 0.5); n.stop(t0 + dur + 0.03);
  };
  const tone = (f, f2, dur, amp) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const og = ctx.createGain(); og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(amp, t0 + 0.003); og.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + dur + 0.03);
  };
  if (kind === 'post') {                                    // tubo d'alluminio: toni alti e lunghi
    tone(1180, 1120, 0.45, 0.7 * pw); tone(2150, 2100, 0.3, 0.4 * pw); tone(3300, 3250, 0.18, 0.2 * pw); noise(2500, 1, 0.04, 0.8 * pw);
    tone(330, 200, 0.12, 0.6 * pw);
  } else if (kind === 'net') {                              // rete: fruscio sordo
    noise(1400, 0.5, 0.35, 0.5 * pw, 'lowpass'); noise(3000, 0.7, 0.12, 0.25 * pw); tone(200, 120, 0.15, 0.25 * pw);
  } else {                                                  // rimbalzo sul prato
    tone(240, 120, 0.1, 0.55 * pw); noise(900, 0.8, 0.04, 0.3 * pw);
  }
}
// fuochi d'artificio dello stadio di notte, nel mondo: il botto arriva in ritardo (340 m/s), piu' ovattato e piano da lontano.
// Lancio: fischio che sale. Botto: tonfo + corpo medio (gli altoparlanti del Quest non rendono i bassi) + crepitio di scintille.
function fwChain(pos, cam, ref = 30) {
  setListener(cam);
  const cp = cam.getWorldPosition(new cam.position.constructor()), dist = cp.distanceTo(pos);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = 0.8; p.maxDistance = 800;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500 + 9000 * Math.exp(-dist / 140);
  const g = ctx.createGain(); g.gain.value = 1.0; lp.connect(g); g.connect(p); p.connect(master);
  // riflessioni sulle gradinate: tre echi che escono dallo stesso punto del botto (passano dal panner: la direzione resta quella giusta)
  for (const [dt_, gn] of [[0.19, 0.45], [0.37, 0.3], [0.62, 0.2]]) {
    const dl = ctx.createDelay(1.0); dl.delayTime.value = dt_; const lf = ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 900 - dt_ * 500;
    const eg = ctx.createGain(); eg.gain.value = gn; lp.connect(dl); dl.connect(lf); lf.connect(eg); eg.connect(p);
  }
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return { lp, t0: ctx.currentTime + 0.02 + dist / 340, dist };
}
function fwNoise(C, at, f0, f1, dur, amp, q = 0.8, type = 'bandpass') {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; const b = ctx.createBiquadFilter(); b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f0, at); if (f1 !== f0) b.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + Math.min(0.01, dur / 3)); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  n.connect(b); b.connect(g); g.connect(C.lp); n.start(at, Math.random() * 0.5); n.stop(at + dur + 0.05);
}
function fwTone(C, at, f0, f1, dur, amp) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(amp, at + 0.008); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g); g.connect(C.lp); o.start(at); o.stop(at + dur + 0.05);
}
export function fireworkLaunch(pos, cam, T = 3.5) {
  if (!ctx || ctx.state !== 'running') return;
  const C = fwChain(pos, cam, 70), t = C.t0;
  fwNoise(C, t, 700, 700, 0.22, 0.45, 0.6, 'lowpass');                 // la partenza: un "puff" sordo
  // il fischio del razzo: sale piano per tutta la salita (con un leggero tremolio), poi si spegne appena prima dello scoppio
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t + 0.15); o.frequency.exponentialRampToValueAtTime(3600, t + T - 0.1);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t + 0.15); g.gain.linearRampToValueAtTime(0.16, t + 0.7); g.gain.setValueAtTime(0.16, t + T - 0.6); g.gain.linearRampToValueAtTime(0, t + T);
  o.connect(g); g.connect(C.lp); o.start(t + 0.15); lfo.start(t + 0.15); o.stop(t + T + 0.05); lfo.stop(t + T + 0.05);
  fwNoise(C, t + 0.1, 2500, 5200, T - 0.2, 0.06, 1.5);                 // e il sibilo della miccia
}
export function fireworkBurst(pos, cam, type = 'peony', power = 1) {
  if (!ctx || ctx.state !== 'running') return;
  const C = fwChain(pos, cam, 70), t = C.t0 + Math.random() * 0.03, P = Math.max(0.2, power), big = type === 'double' ? 1.15 : 1;
  // scoppio di un vero fuoco d'artificio aereo: un picco secco (rumore a banda larga, attacco istantaneo), subito un "boom" di rumore che
  // scende dagli acuti ai bassi come un'esplosione (non toni sintetici), un po' di bassi ruvidi e poi il rimbombo del riverbero
  fwNoise(C, t, 9000, 2500, 0.03, 1.5 * P * big, 0.4, 'highpass');                // il colpo
  fwNoise(C, t, 3200, 160, 0.55, 1.3 * P * big, 0.5, 'lowpass');                  // il boom: cutoff che scende
  fwNoise(C, t + 0.005, 700, 90, 0.9, 1.0 * P * big, 0.6, 'lowpass');             // corpo grave
  fwNoise(C, t + 0.01, 180, 55, 0.7, 1.1 * P * big, 0.7, 'lowpass');              // il "thump" nel petto (rumore, non sinusoide)
  const ne = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ne; i++) fwNoise(C, t + 0.3 + i * (0.25 + Math.random() * 0.35), 700 + Math.random() * 700, 150 + Math.random() * 100, 0.3 + Math.random() * 0.4, (0.22 - i * 0.04) * P, 0.6, 'lowpass');   // riflessioni
  const n = type === 'willow' ? 40 : type === 'ring' ? 14 : type === 'palm' ? 34 : 18, span = type === 'willow' || type === 'palm' ? 3.0 : 1.6;
  for (let i = 0; i < n; i++) fwNoise(C, t + 0.15 + Math.random() * span, 3200 + Math.random() * 3800, 3200 + Math.random() * 3800, 0.02 + Math.random() * 0.03, (0.08 + Math.random() * 0.22) * P, 1.2);   // crepitio
}
// crepitio di scintille bianche (fine di alcuni scoppi): tanti piccoli schiocchi ravvicinati
export function fireworkCrackle(pos, cam) {
  if (!ctx || ctx.state !== 'running') return;
  const C = fwChain(pos, cam, 70), t = C.t0;
  for (let i = 0; i < 60; i++) fwNoise(C, t + Math.random() * 1.6, 3500 + Math.random() * 3500, 3500 + Math.random() * 3500, 0.012 + Math.random() * 0.02, 0.1 + Math.random() * 0.3, 1.5);
}

// fruscio bassissimo dello scorpione che scava / esce / raspa sulla sabbia (nel mondo, quasi sussurrato): rumore filtrato con un
// tremolio rapido (le zampe che grattano)
export function sandRustle(pos, cam, dur = 1.5, gain = 0.05) {
  if (!ctx || ctx.state !== 'running') return;
  setListener(cam);
  const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1.6; p.maxDistance = 60;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + 0.02, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
  const am = ctx.createGain(); am.gain.value = 0.55;
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 9 + Math.random() * 5; const ld = ctx.createGain(); ld.gain.value = 0.45; lfo.connect(ld); ld.connect(am.gain);
  const env = ctx.createGain(); env.gain.setValueAtTime(0, t0); env.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.3, dur * 0.3)); env.gain.setValueAtTime(gain, t0 + dur * 0.7); env.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(hp); hp.connect(bp); bp.connect(am); am.connect(env); env.connect(p); p.connect(master);
  src.start(t0, Math.random() * 0.5); lfo.start(t0); src.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
}
