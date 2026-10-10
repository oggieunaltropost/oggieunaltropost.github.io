// Astronauta dello stage "Sulla Luna": gira attorno al ring a balzi a piedi uniti, come gli astronauti dell'Apollo:
// si accuccia, si spinge e resta in aria a lungo (un sesto della gravita' terrestre), atterra piegando le gambe.
// Ogni tanto si ferma e si guarda intorno, e ogni tanto usa il gas dello zaino: si accuccia, una spinta dagli ugelli (con
// nuvolette bianche e il sibilo), vola per qualche secondo, frena con un altro soffio e atterra.
// (modello e animazioni: blender/create_astronaut.py)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow } from './contact_shadow.js?v=20261010231139';
import * as sfx from './sfx.js?v=20261010231139';

const R = 5.6, G = 1.62, HOP = 0.95;                   // raggio del giro (attorno al ring), metri a balzo
const T_UP = 0.32, T_DOWN = 0.86;                      // frazioni del balzo: stacco e atterraggio (come in Blender)
const SCALE = 1.2;                                     // piu' alto del modello (2,2 m con casco e zaino): sembrava piccolo
// ugelli dello zaino (spazio del modello, y in alto): due sotto lo zaino, spingono verso l'alto
const NOZZLES = [new THREE.Vector3(0.17, 1.0, -0.27), new THREE.Vector3(-0.17, 1.0, -0.27)];
const glowTex = (() => { let t = null; return () => {
  if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (t = new THREE.CanvasTexture(c));
}; })();

export class Astronaut {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'astronauta'; parent.add(this.group);
    this.shadow = contactShadow(0.7, 0.7, 0.55); this.shadow.position.y = 0.012; this.group.add(this.shadow);
    this.a = Math.random() * Math.PI * 2; this.state = 'hop'; this.t = 0; this.next = 20 + Math.random() * 15; this.prevPh = 0;
    this.nextJet = 7 + Math.random() * 8; this.J = null; this.puffs = [];
    for (let i = 0; i < 110; i++) {                                   // nuvolette di gas: si allargano e svaniscono (e il fumo del razzo, che resta piu' a lungo)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0, color: 0xf4f7ff }));
      sp.visible = false; sp.renderOrder = 5; this.group.add(sp);
      this.puffs.push({ sp, life: 0, ttl: 1, v: new THREE.Vector3(), r0: 0.1, grow: 0.9, a: 0.75 });
    }
    this.dust = [];                                                    // polvere lunare sollevata dai salti: nuvolette grigie basse che si allargano piano
    for (let i = 0; i < 70; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0, color: 0xd2ccc2 }));
      sp.visible = false; sp.renderOrder = 4; this.group.add(sp);
      this.dust.push({ sp, life: 0, ttl: 1, v: new THREE.Vector3(), r0: 0.1, grow: 0.5, a: 0.5 });
    }
    new GLTFLoader().load('assets/astronauta.glb?v=20261010231139', g => {
      this.model = g.scene; this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      // visiera dorata a specchio: riflette il paesaggio lunare (l'ambiente della scena e' la foto della luna)
      this.model.traverse(o => { if (o.isMesh && /Visiera/.test(o.material.name)) { const m = o.material; m.metalness = 1; m.roughness = 0.03; m.color.setRGB(1.0, 0.78, 0.4); m.envMapIntensity = 2.2; } });
      this.model.scale.setScalar(SCALE); this.group.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      const clip = n => g.animations.find(c => c.name === n);
      this.hop = this.mixer.clipAction(clip('salta')); this.look = this.mixer.clipAction(clip('fermo'));
      this.hop.play(); this.look.play(); this.look.setEffectiveWeight(0);
      this.dur = clip('salta').duration;
    });
  }

  // ---------------------------------------------------------------- nuvolette di gas dagli ugelli
  _puff(pos, dir, big = 1, smoke = false) {
    const P = this.puffs.find(q => q.life <= 0); if (!P) return;
    P.grow = smoke ? 0.55 * big : 0.9; P.a = smoke ? 0.4 : 0.75;
    P.sp.position.copy(this.group.worldToLocal(pos.clone()));
    P.v.copy(dir).multiplyScalar(2.6 + Math.random() * 1.6).add(new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.9));
    if (smoke) P.v.multiplyScalar(0.25);
    P.ttl = smoke ? 2.0 + Math.random() * 1.4 : 0.55 + Math.random() * 0.4; P.life = P.ttl; P.r0 = (0.07 + Math.random() * 0.05) * big; P.sp.visible = true;
  }
  _nozzles(big = 1) {
    for (const n of NOZZLES) { const w = this.model.localToWorld(n.clone()); this._puff(w, new THREE.Vector3(0, -1, 0), big); if (Math.random() < 0.7) this._puff(w, new THREE.Vector3(0, -1, 0), big, true); }       // gas + fumo del razzo (resta in aria e svanisce piano)
  }
  _updPuffs(dt) {
    for (const P of this.puffs) {
      if (P.life <= 0) continue;
      P.life -= dt; const k = 1 - Math.max(0, P.life) / P.ttl;
      P.sp.position.addScaledVector(P.v, dt); P.v.multiplyScalar(Math.pow(0.35, dt));      // il gas si allarga e rallenta
      P.sp.scale.setScalar(P.r0 + k * P.grow); P.sp.material.opacity = P.a * (1 - k) * (1 - k);
      if (P.life <= 0) P.sp.visible = false;
    }
  }

  // polvere dell'atterraggio (o dello stacco): un anello di nuvolette che si allarga sul terreno e ricade piano (poca gravita', niente aria)
  _dustPuff(x, z, n, big = 1) {
    for (let k = 0; k < n; k++) {
      const D = this.dust.find(q => q.life <= 0); if (!D) return;
      const a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random() * 1.1) * big;
      D.sp.position.set(x + Math.cos(a) * 0.15, 0.05 + Math.random() * 0.08, z + Math.sin(a) * 0.15);
      D.v.set(Math.cos(a) * sp, 0.12 + Math.random() * 0.3 * big, Math.sin(a) * sp);
      D.ttl = D.life = 1.6 + Math.random() * 1.6; D.r0 = (0.2 + Math.random() * 0.12) * big; D.grow = (0.8 + Math.random() * 0.6) * big; D.a = 0.62 * Math.min(1, big);
      D.sp.visible = true;
    }
  }
  _updDust(dt) {
    for (const D of this.dust) {
      if (D.life <= 0) continue;
      D.life -= dt; const k = 1 - Math.max(0, D.life) / D.ttl;
      D.sp.position.addScaledVector(D.v, dt); D.v.multiplyScalar(Math.pow(0.3, dt)); D.v.y -= 0.25 * dt;
      if (D.sp.position.y < 0.03) { D.sp.position.y = 0.03; D.v.y = 0; }
      D.sp.scale.setScalar(D.r0 + k * D.grow); D.sp.material.opacity = D.a * Math.min(1, k * 8) * (1 - k) * (1 - k);
      if (D.life <= 0) D.sp.visible = false;
    }
  }

  // ---------------------------------------------------------------- il volo col gas: accucciato, spinta (0,75 s), planata
  // con la gravita' lunare, soffio di frenata, atterraggio piegando le gambe
  _startJet() {
    this.state = 'jet';
    this.J = { phase: 'prep', t: 0, y: 0, vy: 0, vh: 0, lean: 0, emit: 0, braked: false, brake: 0 };
    this.hop.paused = true; this.hop.setEffectiveWeight(1); this.look.setEffectiveWeight(0);
  }
  _updJet(dt, cam) {
    const J = this.J; J.t += dt;
    const set = ph => { this.hop.time = ph * this.dur; };
    const wp = () => this.model.getWorldPosition(new THREE.Vector3());
    if (J.phase === 'prep') {                                    // si accuccia
      set(Math.min(0.2, J.t / 0.55 * 0.22));
      if (J.t > 0.6) { J.phase = 'thrust'; J.t = 0; if (cam) sfx.gasPuff(wp(), cam, 0.8, 1); }
    } else if (J.phase === 'thrust') {                           // spinta dagli ugelli
      set(0.52); J.vy = Math.min(1.95, J.vy + 4.2 * dt); J.vh = Math.min(1.3, J.vh + 2.4 * dt); J.lean = Math.min(0.28, J.lean + dt * 0.8);
      J.emit -= dt; if (J.emit <= 0) { J.emit = 0.025; this._nozzles(1.3); }
      if (J.t > 0.65) { J.phase = 'coast'; J.t = 0; }
    } else if (J.phase === 'coast') {                            // in volo: parabola lunare, poi il soffio di frenata
      set(0.55); J.vy -= G * dt;
      if (!J.braked && J.y < 0.9 && J.vy < -0.9) { J.braked = true; J.brake = 0.7; if (cam) sfx.gasPuff(wp(), cam, 0.55, 0.85); }
      if (J.brake > 0) {
        J.brake -= dt; J.vy += 2.4 * dt; J.vh *= Math.pow(0.4, dt); J.lean *= Math.pow(0.3, dt);
        J.emit -= dt; if (J.emit <= 0) { J.emit = 0.03; this._nozzles(1.1); }
      }
    }
    if (J.phase === 'thrust' || J.phase === 'coast') {
      J.y += J.vy * dt; this.a += (J.vh / R) * dt;
      if (J.phase === 'coast' && J.y <= 0 && J.vy < 0) { J.y = 0; J.phase = 'land'; this.hop.time = T_DOWN * this.dur; this.hop.paused = false; J.vh = 0; this._dustPuff(Math.cos(this.a) * R, Math.sin(this.a) * R, 16, 1.5); }
    } else if (J.phase === 'land') {                             // atterra piegando le gambe (la fine del balzo)
      J.lean *= Math.pow(0.05, dt);
      const ph = (this.hop.time % this.dur) / this.dur;
      if (ph < T_DOWN - 0.05 || this.hop.time >= this.dur - 1e-3) {
        this.state = 'hop'; this.J = null; this.hop.time = 0; this.hop.paused = false; this.prevPh = 0;
        this.next = this.t + 8 + Math.random() * 12; this.nextJet = this.t + 9 + Math.random() * 10;
      }
    }
    return J;
  }

  update(dt, cam) {
    if (!this.mixer) return;
    this.t += dt;
    this._updPuffs(dt); this._updDust(dt);
    const ph = (this.hop.time % this.dur) / this.dur;
    let y = 0, lean = 0;
    if (this.state === 'jet') {
      const J = this._updJet(dt, cam);
      if (J) { y = J.y; lean = J.lean; }
    } else if (this.state === 'hop') {
      if (ph >= T_UP && ph < T_DOWN) {                           // in aria: avanza lungo il giro, parabola lunare
        const tAir = (T_DOWN - T_UP) * this.dur, u = (ph - T_UP) / (T_DOWN - T_UP);
        this.a += (HOP / R) * dt / tAir;
        y = 0.5 * G * (u * tAir) * ((1 - u) * tAir);
      }
      if (this.prevPh > T_DOWN && ph < this.prevPh) {            // dopo un atterraggio: volo col gas o sosta a guardarsi intorno
        if (this.t > this.nextJet) this._startJet();
        else if (false) {                                          // (non si ferma piu' a guardarsi intorno: salta e basta)
          this.state = 'look'; this.st = 5 + Math.random() * 4; this.hop.setEffectiveWeight(0); this.look.setEffectiveWeight(1); this.look.time = 0;
        }
      }
    } else {
      this.st -= dt;
      if (this.st <= 0) { this.state = 'hop'; this.next = this.t + 20 + Math.random() * 20; this.hop.time = 0; this.hop.setEffectiveWeight(1); this.look.setEffectiveWeight(0); }
    }
    if (this.state === 'hop' && this.prevPh < T_DOWN && ph >= T_DOWN) this._dustPuff(Math.cos(this.a) * R, Math.sin(this.a) * R, 9, 1);        // tocca terra: polvere
    if (this.state === 'hop' && this.prevPh < T_UP && ph >= T_UP) this._dustPuff(Math.cos(this.a) * R, Math.sin(this.a) * R, 4, 0.6);          // si stacca: un po' meno
    this.prevPh = ph;
    if (this.state !== 'jet') this.hop.paused = this.state !== 'hop';
    this.mixer.update(dt);
    const x = Math.cos(this.a) * R, z = Math.sin(this.a) * R;
    const yaw = this.state === 'look' ? Math.atan2(-x, -z) : Math.atan2(-Math.sin(this.a), Math.cos(this.a));   // in cammino/volo: tangente; fermo: guarda il ring
    this.yaw = this.yaw === undefined ? yaw : this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw)) * Math.min(1, dt * 3);
    this.model.position.set(x, y, z); this.model.rotation.set(lean, this.yaw, 0, 'YXZ');
    this.shadow.position.set(x, 0.012, z); const k = 1 / (1 + y * 1.6);
    this.shadow.scale.set(0.7 * 1.45 * SCALE * k, 0.7 * 1.45 * SCALE * k, 1); this.shadow.material.opacity = 0.55 * k;
  }
}
