// Il calciatore dello stage "Stadio": corre per il campo con la palla al piede, a volte scattando, a volte a zig zag, e ogni
// tanto si ferma e palleggia. Ogni tanto tira in porta: la palla puo' entrare in rete, prendere il palo o la traversa e
// rimbalzare, finire fuori; poi lui la va a recuperare. Ogni tocco, rimbalzo, palo e rete si sente (sfx.ballKick/ballHit),
// secondo posizione e distanza.
// (modello e animazioni: blender/create_calciatore.py; cicli "sul posto", la velocita' regola timeScale)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow } from './contact_shadow.js?v=20261010193730';
import * as sfx from './sfx.js?v=20261010193730';

const SCALE = 1.18;                                       // il modello e' 1,5 m: diventa ~1,78 m
const V_RUN = 4.5, V_SPRINT = 8.0;                        // velocita' di riferimento dei cicli (m/s)
const BALL_R = 0.11;
const HALF_X = 26, HALF_Z = 40;                           // il campo percorribile (la lunghezza e' lungo z)
const GOAL_Z = 52.5, GW = 3.66, GH = 2.44, DT = 1.35, DB = 2.2, POST_R = 0.065;   // le porte (come in blender/create_stadium.py)
const WALL_X = 44.5, WALL_Z = 64.5;                       // i cartelloni: la palla non va oltre
const smooth = q => q * q * (3 - 2 * q);

function ballTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#1b1b1d';
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) {
    const x = i * 43 + (j % 2) * 21, y = 22 + j * 42, r = 11;
    g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// la fase (0..1) ha superato c tra x0 e x1?
const crossed = (x0, x1, c) => x1 >= x0 ? (x0 < c && x1 >= c) : (c > x0 || c <= x1);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

export class Footballer {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'calciatore'; parent.add(this.group);
    this.pos = new THREE.Vector3((Math.random() - 0.5) * 30, 0, 20 + Math.random() * 10);
    this.heading = Math.random() * Math.PI * 2; this.speed = 0; this.t = 0;
    this.mode = 'run'; this.modeT = 0; this.modeDur = 5; this.zig = 2; this.goal = null; this.ringR = 8;
    this.sh = null; this.free = false; this.bv = new THREE.Vector3(); this.evT = {};
    this.shadow = contactShadow(0.8, 0.8, 0.55); this.shadow.position.y = 0.012; this.group.add(this.shadow);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 20, 14), new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.5 }));
    this.ball.castShadow = true; this.group.add(this.ball);
    this.ballShadow = contactShadow(0.22, 0.22, 0.6); this.ballShadow.position.y = 0.013; this.group.add(this.ballShadow);
    this.ball.position.copy(this.pos); this.bFrom = this.ball.position.clone(); this.bBlend = 1;
    new GLTFLoader().load('assets/calciatore.glb?v=20261010193730', g => {
      this.model = g.scene; this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      // pelle, occhi, sopracciglia e capelli sono esportati in "blend": ordinati male, girandosi spariva mezza faccia o i
      // capelli. Pelle e occhi opachi; capelli e sopracciglia con taglio netto dell'alpha (niente ordinamento)
      this.model.traverse(o => { if (!o.isMesh) return; const m = o.material;
        if (/short|eyebrow/.test(m.name)) { m.transparent = false; m.alphaTest = 0.5; m.depthWrite = true; }
        else if (/body|high-poly/.test(m.name)) { m.transparent = false; m.alphaTest = 0; m.depthWrite = true; m.opacity = 1; }
        m.needsUpdate = true; });
      this.model.scale.setScalar(SCALE); this.group.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model); this.act = {};
      for (const n of ['corsa', 'scatto', 'palleggio', 'fermo', 'tiro', 'cheer']) { const a = this.mixer.clipAction(g.animations.find(c => c.name === n)); a.play(); a.setEffectiveWeight(0); this.act[n] = a; }
      this.act.tiro.setLoop(THREE.LoopOnce, 1); this.act.tiro.clampWhenFinished = true;
      this.cur = 'corsa'; this.act.corsa.setEffectiveWeight(1);
    });
  }
  setRing(size) { this.ringR = size / 2 + 4; }
  // fine incontro: si ferma, si gira verso di te (look = la tua testa, nello spazio dello stadio) ed esulta con le braccia in alto,
  // chiunque abbia vinto; on = false: riprende a giocare
  cheer(on, look = null) {
    this.cheering = !!on; if (look) this.look = look.clone();
    if (on) { this.sh = null; if (this.mode === 'shoot' || this.mode === 'fetch') this.mode = 'run'; }
    else if (!this.watching) this._resume();
  }
  // guarda il ring (ko, o in attesa del verdetto): si ferma in piedi, girato verso di te, col pallone fermo ai piedi, senza esultare
  watch(on, look = null) {
    this.watching = !!on; if (look) this.look = look.clone();
    if (on) { this.sh = null; if (this.mode === 'shoot' || this.mode === 'fetch' || this.mode === 'juggle') this.mode = 'run'; }
    else if (!this.cheering) this._resume();
  }
  _resume() {
    if (!this.mixer) return;
    if (this.free) { this.mode = 'fetch'; this.modeT = 0; this.modeDur = 1e9; this.sh = null; } else this._pickNext();   // pallone rimasto lontano: va a riprenderlo
  }

  _clip(name) {                                                // dissolvenza tra le animazioni
    if (name === this.cur) return;
    const a = this.act[name], b = this.act[this.cur];
    a.reset(); a.setEffectiveWeight(1); a.play(); a.crossFadeFrom(b, 0.3, false); this.cur = name;
  }
  _newGoal() {                                                 // un punto a caso del campo, fuori dal ring
    for (let i = 0; i < 20; i++) {
      const g = new THREE.Vector3((Math.random() * 2 - 1) * HALF_X, 0, (Math.random() * 2 - 1) * HALF_Z);
      if (g.length() > this.ringR + 3 && g.distanceTo(this.pos) > 10) return g;
    }
    return new THREE.Vector3(HALF_X, 0, 0);
  }
  _setMode(m) {
    this.mode = m; this.modeT = 0;
    if (m === 'run') this.modeDur = 5 + Math.random() * 6;
    else if (m === 'sprint') this.modeDur = 2 + Math.random() * 2;
    else if (m === 'zig') { this.modeDur = 4 + Math.random() * 4; this.zig = 2 + Math.random() * 3; }
    else if (m === 'juggle') this.modeDur = 5 + Math.random() * 3;
    else this.modeDur = 1e9;                                   // tiro e recupero: finiscono da soli
    this.bFrom.copy(this.ball.position); this.bBlend = 0;
  }
  _pickNext() {
    const r = Math.random();
    if (r < 0.22) {                                            // tiro in porta: va a un punto a 18-24 m dalla linea
      const g = Math.random() < 0.5 ? -1 : 1;
      this.sh = { g, ph: 'go', kt: 0, S: new THREE.Vector3((Math.random() * 2 - 1) * 9, 0, g * (GOAL_Z - 18 - Math.random() * 6)) };
      this.goal = this.sh.S.clone(); this._setMode('shoot'); return;
    }
    this._setMode(r < 0.4 ? 'run' : r < 0.6 ? 'sprint' : r < 0.82 ? 'zig' : 'juggle');
    this.goal = this.mode === 'juggle' ? this.goal : this._newGoal();
  }

  // ---------------------------------------------------------------- il tiro e la palla libera
  _kick(cam) {
    const g = this.sh.g, r = Math.random(), side = Math.random() < 0.5 ? -1 : 1, B = this.ball.position;
    let tx, ty;
    if (r < 0.42) { tx = side * (0.4 + Math.random() * 2.7); ty = 0.25 + Math.random() * 1.9; }              // in rete
    else if (r < 0.64) { tx = side * (GW + (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.1)); ty = 0.5 + Math.random() * 1.6; }   // palo
    else if (r < 0.78) { tx = (Math.random() * 2 - 1) * 2.6; ty = GH + (Math.random() - 0.5) * 0.12; }      // traversa
    else if (r < 0.9) { tx = side * (4.8 + Math.random() * 3); ty = 0.6 + Math.random() * 1.8; }            // a lato
    else { tx = (Math.random() * 2 - 1) * 3; ty = 3.3 + Math.random() * 1.5; }                              // alta
    const dx = tx - B.x, dz = g * GOAL_Z - B.z, dh = Math.hypot(dx, dz), vh = 22 + Math.random() * 5, t = dh / vh;
    this.bv.set(dx / t, (ty - B.y + 4.9 * t * t) / t, dz / t);
    this.free = true;
    if (cam) sfx.ballKick(this.ball.getWorldPosition(_a), cam, 1);
  }
  _ev(kind, strength, cam) {                                   // un suono della palla (con un minimo di pausa tra i simili)
    if (!cam || this.t - (this.evT[kind] || -1) < 0.12) return;
    this.evT[kind] = this.t;
    sfx.ballHit(this.ball.getWorldPosition(_a), cam, kind, Math.min(1, strength / (kind === 'post' ? 14 : 9)));
  }
  _hitSeg(p, v, a, b, rad, cam) {                              // sfera contro tubo (palo, traversa)
    _b.copy(b).sub(a); const t = THREE.MathUtils.clamp(_c.copy(p).sub(a).dot(_b) / _b.lengthSq(), 0, 1);
    _c.copy(a).addScaledVector(_b, t); _d.copy(p).sub(_c); const d = _d.length();
    if (d >= rad || d < 1e-6) return;
    _d.divideScalar(d); p.copy(_c).addScaledVector(_d, rad);
    const vn = v.dot(_d);
    if (vn < 0) { v.addScaledVector(_d, -(1 + 0.72) * vn).multiplyScalar(0.97); this._ev('post', -vn, cam); }
  }
  _physics(dt, cam) {
    const v = this.bv, p = this.ball.position, R = BALL_R, A = new THREE.Vector3(), Bv = new THREE.Vector3();
    const n = Math.max(1, Math.ceil(v.length() * dt / 0.04)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const px0 = p.x; v.y -= 9.8 * h; p.addScaledVector(v, h);
      if (p.y < R) {                                           // prato
        p.y = R;
        if (v.y < -0.8) { this._ev('bounce', -v.y, cam); v.y *= -0.62; v.x *= 0.88; v.z *= 0.88; } else v.y = 0;
      }
      if (p.y <= R + 0.003) {                                  // rotola: attrito
        const hs = Math.hypot(v.x, v.z); if (hs > 0) { const k = Math.max(0, hs - 1.5 * h) / hs; v.x *= k; v.z *= k; }
      }
      for (const sg of [-1, 1]) {
        const zg = sg * GOAL_Z; if (Math.abs(p.z - zg) > 3) continue;
        for (const x of [-GW, GW]) this._hitSeg(p, v, A.set(x, 0, zg), Bv.set(x, GH, zg), R + POST_R, cam);   // pali
        this._hitSeg(p, v, A.set(-GW - POST_R, GH, zg), Bv.set(GW + POST_R, GH, zg), R + POST_R, cam);          // traversa
        // la rete: tetto, fondo (obliquo) e fianchi; dentro rallenta molto
        const zr = sg * p.z - GOAL_Z;
        if (zr > -R && zr < DB + 0.3 && p.y < GH + R) {
          const back = DB - (DB - DT) * THREE.MathUtils.clamp(p.y / GH, 0, 1), inX = Math.abs(p.x) < GW, was = Math.abs(px0) < GW;
          if (was && inX && zr > 0) {
            v.multiplyScalar(1 - 1.8 * h);
            if (zr > back - R) { p.z = sg * (GOAL_Z + back - R); const vo = sg * v.z; if (vo > 0) { v.z = -sg * vo * 0.25; v.x *= 0.6; this._ev('net', vo, cam); } }
            if (p.y > GH - R && zr < DT) { p.y = GH - R; if (v.y > 0) { v.y *= -0.2; this._ev('net', v.y, cam); } }
            if (Math.abs(p.x) > GW - R) { const s = Math.sign(p.x); p.x = s * (GW - R); if (v.x * s > 0) { v.x *= -0.2; this._ev('net', Math.abs(v.x), cam); } }
            if (zr > 0.3 && p.y <= R + 0.003) v.z -= sg * 2.4 * h;        // la palla esce piano dalla rete
          } else if (!was && zr > 0 && zr < back && Math.abs(p.x) < GW + R) {       // fianco, da fuori
            const s = Math.sign(px0); p.x = s * (GW + R); if (v.x * s < 0) { v.x *= -0.2; this._ev('net', Math.abs(v.x), cam); }
          }
        }
      }
      if (Math.abs(p.z) > WALL_Z) { p.z = Math.sign(p.z) * WALL_Z; v.z *= -0.4; v.x *= 0.8; this._ev('bounce', 3, cam); }
      if (Math.abs(p.x) > WALL_X) { p.x = Math.sign(p.x) * WALL_X; v.x *= -0.4; v.z *= 0.8; this._ev('bounce', 3, cam); }
    }
    if (v.lengthSq() < 0.02 && p.y <= R + 0.004) v.set(0, 0, 0);
    const hs = Math.hypot(v.x, v.z);                           // rotola: gira attorno all'asse orizzontale perpendicolare
    if (hs > 0.05) this.ball.rotateOnWorldAxis(_a.set(v.z, 0, -v.x).normalize(), hs * dt / R);
    return hs + Math.abs(v.y);
  }

  update(dt, cam) {
    if (!this.mixer) return;
    dt = Math.min(dt, 0.1); this.t += dt; this.modeT += dt;
    const juggling = this.mode === 'juggle', shooting = this.mode === 'shoot', fetching = this.mode === 'fetch', S = this.sh;
    if (this.modeT > this.modeDur && !this.cheering && !this.watching) this._pickNext();
    let vWant = this.mode === 'sprint' ? V_SPRINT * (0.85 + 0.1 * Math.sin(this.t * 2)) : juggling ? 0 : 4.2 + 0.5 * Math.sin(this.t * 0.7);
    let want, kicking = false, bx = HALF_X, bz = HALF_Z;
    if (shooting) {
      S.kt += dt;
      if (S.ph === 'go') {
        vWant = 5.5; this.goal = S.S;
        if (this.pos.distanceTo(S.S) < 1.3) { S.ph = 'set'; S.kt = 0; this.bFrom.copy(this.ball.position); this.bBlend = 0; }
      } else {
        vWant = 0;
        const aligned = Math.abs(Math.atan2(Math.sin((S.g > 0 ? 0 : Math.PI) - this.heading), Math.cos((S.g > 0 ? 0 : Math.PI) - this.heading))) < 0.2;
        if (S.ph === 'set' && aligned && this.speed < 0.4 && this.bBlend >= 1 && S.kt > 0.4) { S.ph = 'kick'; S.kt = 0; this.kicked = false; }
        kicking = S.ph === 'kick';
        if (kicking && S.kt > 1.05) { this.mode = 'fetch'; this.modeT = 0; this.modeDur = 1e9; this.sh = null; }
      }
    } else if (fetching) {
      bx = WALL_X - 0.2; bz = WALL_Z - 0.2;                   // fin dove puo' arrivare la palla (contro i cartelloni)
      const bp = this.ball.position, d = Math.hypot(bp.x - this.pos.x, bp.z - this.pos.z);
      this.goal = _a.set(THREE.MathUtils.clamp(bp.x + this.bv.x * 0.4, -bx, bx), 0, THREE.MathUtils.clamp(bp.z + this.bv.z * 0.4, -bz, bz)).clone();
      this._fd = d; vWant = d > 14 ? 7.2 : d > 6 ? 6.0 : Math.max(1.6, d * 0.95);       // rallenta e gira stretto quando e' vicino (a tutta velocita' ci girava intorno senza prenderla)
      if ((d < 0.75 && this.bv.length() < 3) || this.modeT > 16) {        // l'ha ripresa: si riparte col pallone al piede
        this.free = false; this._pickMode = true; this.bv.set(0, 0, 0);
        if (this.modeT > 16) this.ball.position.set(this.pos.x + Math.sin(this.heading) * 0.6, BALL_R, this.pos.z + Math.cos(this.heading) * 0.6);   // non la raggiunge (angolo, dietro la porta): la ritrova ai piedi
        this._setMode('run'); this.goal = this._newGoal();
      }
    }
    if (!this.goal) this.goal = this._newGoal();
    const toG = this.goal.clone().sub(this.pos); if (toG.length() < 3 && !juggling && !shooting && !fetching) this.goal = this._newGoal();
    want = Math.atan2(toG.x, toG.z);
    if (shooting && S && S.ph !== 'go') want = S.g > 0 ? 0 : Math.PI;                         // guarda la porta
    if (this.mode === 'zig') want += Math.sin(this.t * this.zig) * 0.8;                      // a zig zag
    const d0 = this.pos.length();                                                             // il ring: lo gira attorno
    if (d0 < this.ringR + 2.5) {
      const away = Math.atan2(this.pos.x, this.pos.z), k = Math.min(1, Math.max(0, 1 - (d0 - this.ringR) / 2.5));
      want += Math.atan2(Math.sin(away - want), Math.cos(away - want)) * k;
    }
    const mg = fetching ? 0 : 2;                                  // (a caccia della palla puo' arrivare fino ai cartelloni)
    if (Math.abs(this.pos.x) > bx - mg || Math.abs(this.pos.z) > bz - mg) want = Math.atan2(-this.pos.x, -this.pos.z);
    if (this.cheering || this.watching) { vWant = 0; if (this.look) want = Math.atan2(this.look.x - this.pos.x, this.look.z - this.pos.z); }       // fermo, guarda verso di te
    const turn = (this.cheering || this.watching ? 4.0 : fetching ? (this._fd < 5 ? 6.5 : 2.4) : this.mode === 'sprint' ? 2.0 : 3.2) * dt;
    this.heading += Math.max(-turn, Math.min(turn, Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading))));
    this.speed += Math.max(-6 * dt, Math.min(3.2 * dt, vWant - this.speed));
    this.pos.x += Math.sin(this.heading) * this.speed * dt; this.pos.z += Math.cos(this.heading) * this.speed * dt;
    // animazione: la scelta dipende dalla velocita' vera
    const sp = this.speed;
    const clip = this.cheering && sp < 0.4 ? 'cheer' : kicking ? 'tiro' : sp < 0.35 ? (juggling && this.modeT > 0.6 ? 'palleggio' : 'fermo') : sp > 6.2 ? 'scatto' : 'corsa';
    this._clip(clip);
    const a = this.act[this.cur], dur = a.getClip().duration;
    a.timeScale = clip === 'corsa' ? Math.max(0.5, sp / V_RUN) : clip === 'scatto' ? Math.max(0.7, sp / V_SPRINT) : 1;
    const prevPh = (a.time % dur) / dur, prevT = a.time;
    this.mixer.update(dt);
    const ph = (a.time % dur) / dur;
    // pallone: ai piedi (tocco a ogni passo), in aria nel palleggio, o libero dopo il tiro
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading), P = this.pos;
    const target = new THREE.Vector3(); let kick = false, power = 0.5;
    if (kicking && !this.kicked && prevT < 0.5 * dur && a.time >= 0.5 * dur - 1e-6) { this.kicked = true; this._kick(cam); }
    if (this.free) {
      if (this.cheering || this.watching) this.bv.multiplyScalar(Math.exp(-2.5 * dt));        // fermo a guardare: il pallone si ferma
      this._physics(dt, cam);
    } else {
      if (clip === 'palleggio') {
        const u = (ph * 2) % 1, hh = BALL_R + 0.4 + 0.78 * 4 * u * (1 - u), side = ph < 0.5 ? -0.08 : 0.08;
        target.set(P.x + fx * 0.34 + fz * side, hh, P.z + fz * 0.34 - fx * side);
        if (crossed(prevPh, ph, 0) || crossed(prevPh, ph, 0.5)) { kick = true; power = 0.4; }
      } else if (clip === 'fermo' || clip === 'tiro' || clip === 'cheer') {
        const ahead = shooting ? 0.72 : 0.45;
        target.set(P.x + fx * ahead, BALL_R, P.z + fz * ahead);
      } else {
        const per = clip === 'scatto' ? 1 : 2;                                                       // tocchi per ciclo
        const u = (ph * per) % 1, run = clip === 'scatto' ? 1.6 : 1.0;
        const dd = 0.55 + run * (u < 0.15 ? 0 : (u - 0.15) / 0.85);                                  // calciata in avanti, poi la raggiunge
        const hop = u < 0.2 ? 0.1 * Math.sin(u / 0.2 * Math.PI) : 0;
        target.set(P.x + fx * dd, BALL_R + hop, P.z + fz * dd);
        if (clip === 'scatto' ? crossed(prevPh, ph, 0.1) : (crossed(prevPh, ph, 0.0) || crossed(prevPh, ph, 0.5))) { kick = true; power = clip === 'scatto' ? 0.9 : 0.55; }
      }
      this.bBlend = Math.min(1, this.bBlend + dt / 0.5);
      this.ball.position.copy(this.bFrom).lerp(target, smooth(this.bBlend));
      this.ball.rotation.x += dt * (this.speed + 1.5) / BALL_R * 0.6; this.ball.rotation.z += dt * 2;
      if (kick && cam && this.bBlend > 0.3) sfx.ballKick(this.ball.getWorldPosition(_a), cam, power * (0.85 + 0.3 * Math.random()));
    }
    // modello, ombre
    this.model.position.set(P.x, 0, P.z);
    const yaw = Math.atan2(fx, fz);
    this.yaw = this.yaw === undefined ? yaw : this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw)) * Math.min(1, dt * 8);
    this.model.rotation.y = this.yaw;
    this.shadow.position.set(P.x, 0.012, P.z); this.shadow.scale.set(0.8 * 1.45, 0.8 * 1.45, 1);
    const k = 1 / (1 + (this.ball.position.y - BALL_R) * 1.5);
    this.ballShadow.position.set(this.ball.position.x, 0.013, this.ball.position.z); this.ballShadow.scale.set(0.22 * 1.45 * k, 0.22 * 1.45 * k, 1); this.ballShadow.material.opacity = 0.6 * k;
  }
}
