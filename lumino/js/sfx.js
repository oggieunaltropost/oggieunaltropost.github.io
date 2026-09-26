// Suoni sintetizzati al volo (nessun file audio), spazializzati sulla posizione della creatura.
import * as THREE from 'three';

export class Sfx {
  // shared: un altro Sfx di cui riusare "ascoltatore" e uscite (per il secondo personaggio)
  // pitch: voce piu' acuta (>1) o piu' grave (<1)
  constructor(camera, emitter, shared = null, pitch = 1) {
    this.pitch = pitch;
    if (shared) this.listener = shared.listener;
    else { this.listener = new THREE.AudioListener(); camera.add(this.listener); }
    this.ctx = this.listener.context;
    this.voice = new THREE.PositionalAudio(this.listener);
    this.voice.setRefDistance(0.5);
    this.voice.setRolloffFactor(1.2);
    this.voice.panner.panningModel = 'HRTF';
    emitter.add(this.voice);
    this.out = this.voice.getOutput();
    // uscita non spazializzata per menu' e gara
    if (shared) this.ui = shared.ui;
    else {
      this.ui = this.ctx.createGain();
      this.ui.gain.value = 0.7;
      this.ui.connect(this.listener.getInput());
    }
    this.noise = shared ? shared.noise : this._noiseBuffer();
    this.lastStep = 0;
  }

  resume() { if (this.ctx.state !== 'running') this.ctx.resume(); }

  _noiseBuffer() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  _env(gainNode, t, a, peak, dur) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _tone(type, freqs, dur, peak = 0.3, delay = 0, vibrato = 0, out = this.out) {
    if (this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    if (out === this.out && this.pitch !== 1) freqs = freqs.map(f => f * this.pitch); // voce del personaggio
    o.frequency.setValueAtTime(freqs[0], t);
    freqs.slice(1).forEach((f, i) =>
      o.frequency.exponentialRampToValueAtTime(f, t + dur * (i + 1) / (freqs.length - 1)));
    if (vibrato) {
      const l = this.ctx.createOscillator(), lg = this.ctx.createGain();
      l.frequency.value = 28; lg.gain.value = vibrato;
      l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur);
    }
    this._env(g, t, 0.01, peak, dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, freq, peak, delay = 0, q = 1, out = this.out) {
    if (this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    this._env(g, t, 0.003, peak, dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  }

  squeak(pitch = 1) {
    const p = pitch * (0.9 + Math.random() * 0.2);
    this._tone('sine', [1300 * p, 2100 * p, 1600 * p], 0.16, 0.25, 0, 40);
  }
  happy() {
    [0, 0.13, 0.26].forEach((d, i) => this._tone('sine', [1500 + i * 250, 2300 + i * 250, 1900 + i * 200], 0.12, 0.22, d, 60));
  }
  boing() { this._tone('triangle', [380, 950], 0.22, 0.2); }
  land() { this._noise(0.06, 900, 0.25, 0, 0.8); }
  step() {
    const now = this.ctx.currentTime;
    if (now - this.lastStep < 0.07) return;
    this.lastStep = now;
    this._noise(0.025, 4200 + Math.random() * 1500, 0.07, 0, 2);
  }
  scratch() { this._noise(0.05, 2600 + Math.random() * 800, 0.08, 0, 3); }
  nom() {
    this._tone('square', [300, 180], 0.07, 0.07);
    this._tone('square', [320, 190], 0.07, 0.07, 0.12);
    this._tone('sine', [900, 1400], 0.12, 0.15, 0.28);
  }
  snore() {
    if (this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; s.loop = true;
    f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(f).connect(g).connect(this.out);
    s.start(t); s.stop(t + 1.7);
  }
  click() { this._tone('sine', [900, 1300], 0.05, 0.2, 0, 0, this.ui); }
  chomp() { // la bacca la mangi tu
    this._tone('square', [260, 150], 0.08, 0.08, 0, 0, this.ui);
    this._tone('square', [280, 160], 0.08, 0.08, 0.13, 0, this.ui);
    this._tone('sine', [700, 1050, 1400], 0.18, 0.2, 0.25, 0, this.ui);
  }
  point() { this._tone('sine', [1200, 1500], 0.1, 0.12, 0, 0, this.ui); }
  start() { [0, 0.18, 0.36].forEach((d, i) => this._tone('triangle', [520 + i * 130, 540 + i * 130], 0.14, 0.2, d, 0, this.ui)); }
  win() { [0, 0.15, 0.3, 0.5].forEach((d, i) => this._tone('triangle', [520 * [1, 1.25, 1.5, 2][i], 530 * [1, 1.25, 1.5, 2][i]], i === 3 ? 0.5 : 0.16, 0.22, d, 0, this.ui)); }
  lose() { [0, 0.22, 0.44].forEach((d, i) => this._tone('triangle', [440 - i * 60, 420 - i * 60], 0.25, 0.18, d, 0, this.ui)); }
  // ------------------------------------------------------------ musica arcade (chiptune generata al volo)
  // style: 'arcade' (gara di bacche) oppure 'horror' (Difendi)
  startMusic(volume = 0.055, style = 'arcade') {
    this.stopMusic();
    const ctx = this.ctx;
    this.music = { gain: ctx.createGain(), step: 0, next: ctx.currentTime + 0.1, bpm: style === 'horror' ? 122 : 138, style };
    this.music.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.music.gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 1.2);
    this.music.gain.connect(this.ui);
    this.music.timer = setInterval(() => this._schedule(), 25);
  }

  setMusicFast(fast) {
    if (!this.music) return;
    const slow = this.music.style === 'horror' ? 122 : 138;
    this.music.bpm = fast ? slow * 1.2 : slow;
  }

  stopMusic() {
    const m = this.music;
    if (!m) return;
    clearInterval(m.timer);
    const t = this.ctx.currentTime;
    m.gain.gain.cancelScheduledValues(t);
    m.gain.gain.setValueAtTime(m.gain.gain.value, t);
    m.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    setTimeout(() => m.gain.disconnect(), 800);
    this.music = null;
  }

  _schedule() {
    const m = this.music;
    if (!m || this.ctx.state !== 'running') return;
    if (m.style === 'horror') return this._scheduleHorror();
    // La minore: Am - F - C - G, 16 sedicesimi per battuta
    const roots = [45, 41, 48, 43];
    const chords = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
    const lead = [12, 15, 19, 15, 24, 19, 15, 19, 12, 15, 19, 22, 24, 22, 19, 15];
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    while (m.next < this.ctx.currentTime + 0.12) {
      const s = m.step % 64, bar = Math.floor(s / 16), i = s % 16, t = m.next, d = 60 / m.bpm / 4;
      const root = roots[bar], ch = chords[bar];
      if (i % 2 === 0) this._note('square', f(root + (i % 4 === 0 ? 0 : 12)), t, d * 1.6, 0.5); // basso
      this._note('triangle', f(root + 12 + ch[i % 3] + (lead[i] >= 19 ? 12 : 0)), t, d * 0.9, 0.28); // arpeggio
      if (i % 4 === 2) this._hat(t, 0.12);                            // charleston
      if (i === 0 || i === 8) this._kick(t);
      if (bar === 3 && i >= 12) this._note('square', f(root + 24 + lead[i] % 12), t, d * 0.8, 0.18);
      m.step++;
      m.next += d;
    }
  }

  // Re minore con accordi "inquietanti" (tritono, diminuito), basso che martella,
  // arpeggio da carillon stonato e un organetto che ogni tanto sale
  _scheduleHorror() {
    const m = this.music;
    const roots = [38, 38, 34, 37];                 // Re, Re, Si bemolle, Do diesis
    const chords = [[0, 3, 7], [0, 3, 6], [0, 4, 7], [0, 3, 6]];
    const bell = [12, 15, 19, 18, 15, 12, 11, 12, 24, 22, 19, 18, 15, 18, 19, 23];
    const f = n => 440 * Math.pow(2, (n - 69) / 12);
    while (m.next < this.ctx.currentTime + 0.12) {
      const s = m.step % 64, bar = Math.floor(s / 16), i = s % 16, t = m.next, d = 60 / m.bpm / 4;
      const root = roots[bar], ch = chords[bar];
      if (i % 2 === 0) this._note('sawtooth', f(root + (i % 8 === 6 ? 1 : 0)), t, d * 1.4, 0.32);     // basso
      if (i % 2 === 1) this._note('triangle', f(root + 24 + ch[(i >> 1) % 3]), t, d * 1.1, 0.2);   // carillon
      if (bar % 2 === 1 && i % 4 === 0) this._note('square', f(root + 12 + bell[i]), t, d * 3, 0.1);
      if (i % 4 === 2) this._hat(t, 0.08);
      if (i === 0 || i === 6 || i === 10) this._kick(t);
      if (s === 60) this._note('sine', f(root + 36), t, d * 4, 0.12);  // "urletto" a fine giro
      m.step++;
      m.next += d;
    }
  }

  _note(type, freq, t, dur, peak) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.music.gain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _hat(t, peak) {
    const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; fl.type = 'highpass'; fl.frequency.value = 7000;
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(fl).connect(g).connect(this.music.gain);
    s.start(t, Math.random() * 0.3); s.stop(t + 0.05);
  }

  _kick(t) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(this.music.gain);
    o.start(t); o.stop(t + 0.16);
  }

  splat() {          // ragno che esplode
    this._noise(0.12, 700, 0.35, 0, 0.7, this.ui);
    this._noise(0.08, 2500, 0.2, 0.02, 1.2, this.ui);
    this._tone('square', [520, 90], 0.18, 0.12, 0, 0, this.ui);
  }
  hurt() {           // l'animaletto perde un cuore
    this._tone('sine', [1400, 700, 900], 0.28, 0.3, 0, 60);
    this._tone('square', [330, 160], 0.3, 0.08, 0.05, 0, this.ui);
  }
  spawnSpider() {    // ragno che compare
    this._tone('triangle', [180, 120], 0.25, 0.08, 0, 30, this.ui);
  }
  // Ronzio continuo agganciato a un oggetto 3D: il volume segue la distanza da te (audio spaziale).
  // Ritorna { set(active, speed), dispose() }.
  createBuzz(object) {
    const ctx = this.ctx;
    const pa = new THREE.PositionalAudio(this.listener);
    pa.panner.panningModel = 'HRTF';
    pa.setDistanceModel('inverse');
    pa.setRefDistance(0.25);       // piena intensita' entro 25 cm
    pa.setRolloffFactor(1.6);      // poi cala in fretta con la distanza
    pa.setMaxDistance(10);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 205; o2.frequency.value = 211;
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 14;       // tremolio del tono
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfoGain.connect(o2.frequency);
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 900; band.Q.value = 0.8;
    const amp = ctx.createGain(); amp.gain.value = 0;
    o1.connect(band); o2.connect(band); band.connect(amp);
    pa.setNodeSource(amp);
    object.add(pa);
    o1.start(); o2.start(); lfo.start();
    return {
      set: (active, speed = 1) => {
        const t = ctx.currentTime;
        amp.gain.setTargetAtTime(active ? 0.22 : 0, t, active ? 0.05 : 0.08);
        const f = 185 + speed * 45 + Math.random() * 6;           // piu' veloce = ronzio piu' acuto
        o1.frequency.setTargetAtTime(f, t, 0.08);
        o2.frequency.setTargetAtTime(f * 1.03, t, 0.08);
      },
      dispose: () => { o1.stop(); o2.stop(); lfo.stop(); object.remove(pa); },
    };
  }

  pop() { this._tone('sine', [500, 1400], 0.1, 0.25); this._noise(0.05, 3000, 0.1); }
}
