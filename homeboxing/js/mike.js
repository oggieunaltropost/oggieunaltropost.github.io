// Mike: modello animato + intelligenza artificiale (si muove, para, schiva, attacca).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Caratteristiche dell'avversario: per i prossimi pugili bastera' cambiare questi numeri.
export const MIKE = {
  name: 'Mike',
  stalkDist: 1.0,             // distanza di studio (m)
  attackDist: 0.70,           // distanza da cui colpisce
};

// Combinazioni della boxe. Numeri: 1 jab, 2 diretto, 3 gancio sinistro, 4 gancio destro,
// 5 montante sinistro, 6 montante destro; "b" = al corpo. Dentro ci possono stare schivate e abbassate.
const C = {
  '1': ['jab'], '2': ['cross'], '1-1': ['jab', 'jab'], '1-2': ['jab', 'cross'], '1-1-2': ['jab', 'jab', 'cross'],
  '1-2-3': ['jab', 'cross', 'hook_l'], '1-2-3-2': ['jab', 'cross', 'hook_l', 'cross'], '3-2': ['hook_l', 'cross'],
  '2-3': ['cross', 'hook_l'], '3-2-3': ['hook_l', 'cross', 'hook_l'], '2-3-2': ['cross', 'hook_l', 'cross'],
  '1-6': ['jab', 'uppercut_r'], '1-6-3-2': ['jab', 'uppercut_r', 'hook_l', 'cross'], '5-2': ['uppercut_l', 'cross'],
  '6-3': ['uppercut_r', 'hook_l'], '1-2-5-2': ['jab', 'cross', 'uppercut_l', 'cross'], '3-4': ['hook_l', 'hook_r'],
  '1-schivata-2': ['jab', 'slip_r', 'cross'], '1-2-schivata-2-3': ['jab', 'cross', 'slip_l', 'cross', 'hook_l'],
  '1-2-abbassata-3-2': ['jab', 'cross', 'duck', 'hook_l', 'cross'], 'abbassata-6-3': ['duck', 'uppercut_r', 'hook_l'],
  '2b': ['body_r'], '1-2b': ['jab', 'body_r'], '3b-3': ['body_l', 'hook_l'], '2-3b': ['cross', 'body_l'],
  '1-3b-3': ['jab', 'body_l', 'hook_l'], '2b-3-2': ['body_r', 'hook_l', 'cross'], '3b-4': ['body_l', 'hook_r'],
  '6-3b-3': ['uppercut_r', 'body_l', 'hook_l'],
};
const combos = (...names) => names.map(n => C[n]);
// se tieni la guardia alta, Mike lavora al corpo e con montanti e ganci che entrano di lato
const BODY_COMBOS = combos('2b', '1-2b', '3b-3', '2-3b', '1-3b-3', '2b-3-2', '3b-4', '6-3b-3', '5-2', '3-4');
// contrattacchi: [tipo del tuo pugno][difesa usata] -> risposte possibili
const COUNTER_TABLE = {
  jab: { slip: combos('2', '2-3', '6-3'), duck: combos('6-3', '2b-3-2'), block: combos('1-2', '2') },
  cross: { slip: combos('3-2', '3-2', '5-2'), duck: combos('3-2', '5-2'), block: combos('1-2', '3-2') },
  hook: { duck: combos('6-3', '3-2', '3b-3'), slip: combos('2-3'), block: combos('5-2', '1-2') },
  body: { block_low: combos('3-2', '2-3', '3-4'), back: combos('1-2') },
};
const COUNTERS = combos('2', '3-2', '1-2', '6-3');
const MOVES = new Set(['slip_l', 'slip_r', 'duck']);

// Livelli. reactChance = quante volte reagisce a un tuo pugno; reactDelay = riflessi (s);
// threatDist/threatSpeed = da quanto lontano e da che velocita' "legge" il pugno;
// defenseSpeed = rapidita' di parate e schivate; smart = sceglie la difesa giusta per il colpo;
// chain = difende anche il secondo pugno di una combinazione; counterChance = contrattacco;
// guardReach = quanto copre la guardia normale (senza parare apposta);
// openFactor = quanto reagisce subito dopo che hai parato/schivato un suo colpo (la tua finestra per colpire);
// bodyBias = quanto va al corpo se tieni la guardia alta; feints = finte al secondo mentre ti studia;
// lowGuard = quanto spesso abbassa la guardia mentre ti studia (e lascia la testa scoperta).
export const LEVELS = {
  facile: { label: 'Facile', guardReach: -0.03, stalkDist: 0.85, openFactor: 0.1, reactChance: 0.35, reactDelay: [0.14, 0.24],
    attackEvery: [2.2, 3.8], retreatTime: 0.8, punchSpeed: 0.8, moveSpeed: 0.6, defenseSpeed: 1.1, threatDist: 0.8,
    threatSpeed: 1.6, smart: false, chain: false, counterChance: 0.1, blockReach: 0.07, bodyBias: 0.15, feints: 0, lowGuard: 0.6,
    combos: combos('1', '2', '1-2', '1-1', '1-1-2', '2-3') },
  normale: { label: 'Normale', guardReach: 0.0, stalkDist: 0.9, openFactor: 0.25, reactChance: 0.68, reactDelay: [0.05, 0.13],
    attackEvery: [0.9, 1.8], retreatTime: 0.5, punchSpeed: 1.0, moveSpeed: 0.9, defenseSpeed: 1.35, threatDist: 0.95,
    threatSpeed: 1.3, smart: false, chain: false, counterChance: 0.35, blockReach: 0.09, bodyBias: 0.45, feints: 0.08, lowGuard: 0.5,
    combos: combos('1', '1-2', '1-1-2', '1-2-3', '3-2', '2-3', '1-6', '1-2b', '1-schivata-2') },
  difficile: { label: 'Difficile', guardReach: 0.03, stalkDist: 0.95, openFactor: 0.45, reactChance: 0.9, reactDelay: [0.02, 0.06],
    attackEvery: [0.5, 1.2], retreatTime: 0.35, punchSpeed: 1.15, moveSpeed: 1.1, defenseSpeed: 1.6, threatDist: 1.1,
    threatSpeed: 1.1, smart: true, chain: true, counterChance: 0.65, blockReach: 0.11, bodyBias: 0.65, feints: 0.15, lowGuard: 0.4,
    combos: combos('1-2', '1-1-2', '1-2-3', '1-2-3-2', '1-6-3-2', '3-2-3', '2-3-2', '1-2-5-2', '1-schivata-2',
      '1-2-schivata-2-3', '1-2-abbassata-3-2', 'abbassata-6-3', '1-3b-3') },
  impossibile: { label: 'Impossibile', guardReach: 0.07, stalkDist: 1.0, openFactor: 0.95, reactChance: 1.0, reactDelay: [0.0, 0.0],
    attackEvery: [0.3, 0.8], retreatTime: 0.25, punchSpeed: 1.3, moveSpeed: 1.3, defenseSpeed: 2.0, threatDist: 1.3,
    threatSpeed: 0.9, smart: true, chain: true, counterChance: 0.85, blockReach: 0.15, bodyBias: 0.85, feints: 0.22, lowGuard: 0.3,
    combos: combos('1-2-3', '1-2-3-2', '1-6-3-2', '3-2-3', '2-3-2', '1-2-5-2', '1-2-schivata-2-3',
      '1-2-abbassata-3-2', 'abbassata-6-3', '1-schivata-2', '6-3b-3', '2b-3-2', '3-4') },
};

// finestre "attive" dei pugni, in fotogrammi a 30 fps (quando il guantone puo' colpire)
const PUNCH = {
  jab: { side: 'l', from: 2, to: 6, zone: 'head' },
  cross: { side: 'r', from: 3, to: 8, zone: 'head' },
  hook_l: { side: 'l', from: 5, to: 10, zone: 'head' },
  hook_r: { side: 'r', from: 6, to: 11, zone: 'head' },
  body_l: { side: 'l', from: 5, to: 10, zone: 'body' },
  body_r: { side: 'r', from: 3, to: 8, zone: 'body' },
  uppercut_l: { side: 'l', from: 4, to: 8, zone: 'head' },
  uppercut_r: { side: 'r', from: 4, to: 9, zone: 'head' },
};
// parte "ferma" delle difese (fotogrammi): la tiene finche' il tuo pugno e' ancora in arrivo
const HOLD = { block: [3, 12], block_low: [3, 12], slip_l: [4, 10], slip_r: [4, 10], duck: [5, 11] };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const STEP_SPEED = 0.22 / 0.5;    // un ciclo di passi (0,5 s) avanza di 22 cm

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// distanza tra il punto p e il segmento ab
function distPointSeg(p, a, b) {
  _a.subVectors(b, a); const l2 = _a.lengthSq();
  let t = l2 > 1e-9 ? _b.subVectors(p, a).dot(_a) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return _c.copy(a).addScaledVector(_a, t).distanceTo(p);
}
// distanza (approssimata) tra due segmenti: campiona il primo
function distSegSeg(a0, a1, b0, b1) {
  let best = Infinity;
  for (let i = 0; i <= 6; i++) {
    _d.lerpVectors(a0, a1, i / 6);
    best = Math.min(best, distPointSeg(_d.clone(), b0, b1));
  }
  return best;
}

export async function loadMikeGLTF(url, onProgress) {
  return new GLTFLoader().loadAsync(url, e => onProgress && e.total && onProgress(e.loaded / e.total));
}

export class Mike {
  constructor(gltf, scene, level = 'normale') {
    this.setLevel(level);
    this.root = new THREE.Group(); this.root.name = 'Mike';
    this.model = gltf.scene;
    this.root.add(this.model);
    scene.add(this.root);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.castShadow = true;
      const m = o.material, n = m.name || '';
      // capelli rasati: ritaglio netto invece della trasparenza (che sulla nuca "sfarfallava" con la pelle)
      if (n === 'Capelli') { m.transparent = false; m.depthWrite = true; m.vertexColors = true; m.alphaTest = 0.45; }
      else if (/teeth|tongue/i.test(n)) { m.transparent = false; m.alphaTest = 0; o.castShadow = false; }
      else if (n.includes('eyebrow') || n.includes('eyelash')) { m.transparent = true; m.depthWrite = false; m.alphaTest = 0.05; o.renderOrder = 2; o.castShadow = false; }
      // occhi: si tiene solo il bulbo con l'iride; la cornea (velo bianco semitrasparente) si scarta del tutto
      else if (n.includes('high-poly')) { m.transparent = false; m.alphaTest = 0.9; m.depthWrite = true; m.roughness = 0.15; o.castShadow = false; }
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.8;
    });
    this.brandShorts();
    const bone = n => this.model.getObjectByName(n);
    this.bones = {};
    for (const n of ['head', 'neck_01', 'spine_01', 'spine_02', 'spine_03', 'hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r', 'pelvis'])
      this.bones[n] = bone(n);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.idle = this.mixer.clipAction(this.clips.idle);
    this.idle.play();
    this.idleLow = this.mixer.clipAction(this.clips.idle_low);
    this.idleLow.setEffectiveWeight(0); this.idleLow.play();
    this.low = 0; this.lowTarget = 0; this.lowTimer = 1;     // 0 = guardia alta, 1 = guardia bassa
    // passi da pugile: cicli "sul posto" che avanzano di STEP_SPEED m/s a velocita' normale
    this.loco = {};
    for (const n of ['step_f', 'step_b', 'step_l', 'step_r']) {
      const a = this.mixer.clipAction(this.clips[n]);
      a.setEffectiveWeight(0); a.play();
      this.loco[n] = { action: a, w: 0 };
    }
    this.vel = new THREE.Vector3();
    this.moveVel = new THREE.Vector3();
    this.prevPos = new THREE.Vector3();
    this.layers = [];            // animazioni singole in corso, con il loro peso

    this.state = 'stalk';
    this.stateT = 0;
    this.nextAttack = 2.0;
    this.combo = [];
    this.punch = null;           // pugno in corso: {name, layer, resolved, inRange}
    this.reaction = null;        // reazione programmata {at, glove, punchId}
    this.defending = null;       // {type, until, glove, punchId, hit}
    this.seen = { left: -1, right: -1 };
    this.stun = 0;
    this.strafe = Math.random() * 10;
    this.enabled = false;        // si muove e combatte solo durante il round
    this.events = [];
    this.bounds = null;          // funzione che tiene Mike dentro il ring
    this.time = 0;
    this.openUntil = 0;
    // viso: morph target (blender: unita' espressive MakeHuman)
    this.face = null;
    this.model.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'blink_l' in o.morphTargetDictionary) this.face = o; });
    this.blinkT = 2; this.pain = 0; this.breath = 0;
    this.impact = this.measureImpacts();
  }

  // dove arriva la punta del guantone in ogni pugno (nel sistema di Mike, a meta' della finestra attiva):
  // serve per scegliere distanza e angolo giusti per centrare la testa dell'avversario
  measureImpacts() {
    const res = {};
    this.root.updateMatrixWorld(true);
    for (const [name, spec] of Object.entries(PUNCH)) {
      const a = this.mixer.clipAction(this.clips[name]);
      this.idle.setEffectiveWeight(0);
      a.reset(); a.setEffectiveWeight(1); a.play();
      a.time = (spec.from + spec.to) / 2 / 30;
      this.mixer.update(0);
      this.root.updateMatrixWorld(true);
      const tip = this.root.worldToLocal(this.glove(spec.side).tip);
      res[name] = { x: tip.x, y: tip.y, z: tip.z, dist: Math.hypot(tip.x, tip.z), yaw: Math.atan2(tip.x, tip.z) };
      a.stop();
    }
    this.idle.setEffectiveWeight(1);
    this.mixer.update(0);
    return res;
  }

  // il pugno da preparare o in corso (per distanza e angolo)
  aimPunch() {
    if (this.punch && this.impact[this.punch.name]) return this.impact[this.punch.name];
    if (this.punch && this.combo.length) return this.impact[this.combo.find(n => this.impact[n])];
    if (this.state === 'approach' && this.combo.length) return this.impact[this.combo[0]];
    return null;
  }

  // ---- riposo tra i round: va nel suo angolo e si siede sullo sgabello
  goTo(p, look) { this.goal = p.clone(); this.goalLook = look.clone(); this.atGoal = false; this.enabled = false; }
  leaveCorner() { this.goal = null; if (this.atGoal) this.resetPose(); this.atGoal = false; }
  updateGoal(dt) {
    const d = new THREE.Vector3(this.goal.x - this.root.position.x, 0, this.goal.z - this.root.position.z);
    const dist = d.length();
    if (dist > 0.04 && !this.atGoal) {
      d.normalize();
      this.root.position.addScaledVector(d, Math.min(dist, 0.8 * dt));
      this.vel.copy(d).multiplyScalar(0.8);
      const yaw = Math.atan2(d.x, d.z), dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
      this.root.rotation.y += Math.max(-5 * dt, Math.min(5 * dt, dy));
    } else {
      this.vel.set(0, 0, 0);
      const yaw = Math.atan2(this.goalLook.x - this.root.position.x, this.goalLook.z - this.root.position.z);
      const dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
      this.root.rotation.y += Math.max(-4 * dt, Math.min(4 * dt, dy));
      if (!this.atGoal && Math.abs(dy) < 0.2) { this.atGoal = true; this.play('stool', 1, true); }
    }
  }

  // fascia bianca dei calzoncini con la scritta HOME BOXING tra due righe dorate (mappatura cilindrica)
  brandShorts() {
    let band = null;
    this.model.traverse(o => { if (o.isMesh && o.material.name === 'Raso bianco') band = o; });
    if (!band) return;
    const c = document.createElement('canvas'); c.width = 2048; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 2048, 160);
    g.fillStyle = '#c99a2e'; g.fillRect(0, 14, 2048, 10); g.fillRect(0, 128, 2048, 10);
    g.fillStyle = '#1239a8'; g.font = '900 78px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('HOME BOXING ★', 1024, 80);             // una sola scritta, centrata sul davanti (u = 0.5 = +Z)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
    const geo = band.geometry; geo.computeBoundingBox();
    const bb = geo.boundingBox, pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
    const h = (bb.max.y - bb.min.y) * 0.19;                 // altezza della fascia (la parte alta)
    const cx = (bb.max.x + bb.min.x) / 2, cz = (bb.max.z + bb.min.z) / 2;
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = Math.atan2(pos.getX(i) - cx, pos.getZ(i) - cz) / (2 * Math.PI) + 0.5;
      uv[i * 2 + 1] = (pos.getY(i) - (bb.max.y - h)) / h;   // sotto la fascia resta bianco (bordo del disegno)
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    band.material = band.material.clone(); band.material.map = tex; band.material.color.set(0xffffff); band.material.needsUpdate = true;
  }

  // ---- colpo basso e vittoria
  lowBlowed() {
    this.enabled = false; this.punch = null; this.combo = []; this.reaction = null; this.defending = null;
    this.setState('stalk'); this.nextAttack = 2;
    this.play('lowblow', 1, true); this.pain = 1.6;
  }
  celebrate() {
    for (const l of this.layers) l.out = true;
    const a = this.mixer.clipAction(this.clips.celebrate);
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(0); a.play();
    this.layers.push({ name: 'celebrate', action: a, t: 0, dur: 1e9, ts: 1, w: 0, out: false, hold: true });
  }

  // ---- espressioni: battito di ciglia, smorfia quando lo colpisci, fiatone quando e' stanco
  _morph(n, v) { if (this.face) this.face.morphTargetInfluences[this.face.morphTargetDictionary[n]] = v; }
  updateFace(dt) {
    if (!this.face) return;
    this.blinkT -= dt;
    let blink = this.blinkT < 0.13 ? 1 : 0;
    if (this.blinkT < 0) this.blinkT = 1.8 + Math.random() * 3.5;
    this.pain = Math.max(0, this.pain - dt * 1.4);
    const p = Math.min(1, this.pain);
    const tired = Math.max(0, ((this.fatigue || 0) - 0.66) / 0.34);          // sotto un terzo di energia: fiatone
    this.breath += dt * (2.2 + tired * 2.5);
    const pant = tired * (0.35 + 0.35 * Math.sin(this.breath * Math.PI));
    if (this.down) { blink = 0.75; }
    this._morph('blink_l', Math.max(blink, p * 0.7)); this._morph('blink_r', Math.max(blink, p * 0.9));
    this._morph('squint_l', p * 0.6); this._morph('squint_r', p * 0.6);
    this._morph('brow_l', p * 0.8); this._morph('brow_r', p * 0.8);
    this._morph('grimace', p * 0.9);
    this._morph('mouth_open', Math.max(pant * 0.5, p * 0.25));
    this._morph('nose_l', pant * 0.8); this._morph('nose_r', pant * 0.8);
    // fiatone: spalle e petto che salgono e scendono
    if (tired > 0 && this.bones.spine_03) this.bones.spine_03.rotation.x -= tired * 0.03 * Math.sin(this.breath * Math.PI);
  }

  // ---- atterramento
  knockdown() {
    this.enabled = false; this.down = true;
    this.punch = null; this.combo = []; this.reaction = null; this.defending = null;
    this.setState('stalk'); this.nextAttack = 2;
    this.play('knockdown', 0.8, true);      // caduta un po' piu' lenta
  }
  getUp() { this.getupLayer = this.play('getup', 1); this.down = false; }
  isUp() { return !this.getupLayer || this.getupLayer.t >= this.getupLayer.dur - 0.15; }
  resetPose() {
    for (const l of this.layers) l.out = true;
    this.down = false; this.getupLayer = null; this.punch = null; this.combo = []; this.defending = null; this.reaction = null;
  }

  setLevel(name) {
    this.levelName = LEVELS[name] ? name : 'normale';
    this.cfg = { ...MIKE, ...LEVELS[this.levelName] };
  }

  // --------------------------------------------------------------- animazioni
  play(name, timeScale = 1, hold = false) {
    for (const l of this.layers) l.out = true;
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.timeScale = timeScale; a.setEffectiveWeight(0); a.play();
    const layer = { name, action: a, t: 0, dur: this.clips[name].duration, ts: timeScale, w: 0, out: false, hold };
    // se la stessa azione era in uscita, quella vecchia sparisce subito
    this.layers = this.layers.filter(l => l.action !== a);
    this.layers.push(layer);
    return layer;
  }
  busyAnim() { return this.layers.some(l => !l.out && l.t < l.dur - 0.1); }
  current() { return this.layers.find(l => !l.out) || null; }

  animate(dt) {
    let total = 0;
    for (const l of this.layers) {
      l.t += dt * l.ts;
      if (l.out) l.w = Math.max(0, l.w - dt / 0.07);
      else {
        let w = Math.min(1, l.t / 0.07);
        if (l.t > l.dur - 0.14 && !l.hold) w = Math.min(w, Math.max(0, (l.dur - l.t) / 0.14));
        l.w = w;
      }
      l.action.setEffectiveWeight(l.w);
      total += l.w;
    }
    this.layers = this.layers.filter(l => {
      const keep = l.w > 0.001 || (!l.out && l.t < 0.07) || (l.hold && !l.out);
      if (!keep) l.action.stop();
      return keep;
    });
    // passi: direzione e velocita' nel sistema di Mike (+Z avanti, +X sua sinistra)
    const free = Math.max(0, 1 - total);
    const lv = _d.copy(this.vel).applyQuaternion(_q.copy(this.root.quaternion).invert());
    const sp = Math.hypot(lv.x, lv.z);
    const k = Math.min(1, Math.max(0, (sp - 0.05) / 0.2));
    const s2 = Math.max(1e-6, lv.x * lv.x + lv.z * lv.z);
    const want = { step_f: lv.z > 0 ? lv.z * lv.z / s2 : 0, step_b: lv.z < 0 ? lv.z * lv.z / s2 : 0,
      step_l: lv.x > 0 ? lv.x * lv.x / s2 : 0, step_r: lv.x < 0 ? lv.x * lv.x / s2 : 0 };
    let locoSum = 0;
    const ts = Math.min(2.2, Math.max(0.6, sp / STEP_SPEED));
    for (const [n, l] of Object.entries(this.loco)) {
      l.w += (k * want[n] - l.w) * Math.min(1, dt * 10);
      l.action.setEffectiveWeight(free * l.w);
      l.action.timeScale = ts;
      locoSum += l.w;
    }
    const idleW = free * Math.max(0, 1 - locoSum);
    this.idle.setEffectiveWeight(idleW * (1 - this.low));
    this.idleLow.setEffectiveWeight(idleW * this.low);
    this.mixer.update(dt);
    this.updateFace(dt);
    this.root.updateMatrixWorld(true);
  }

  // --------------------------------------------------------------- punti del corpo nel mondo
  forward(out = new THREE.Vector3()) { return out.set(0, 0, 1).applyQuaternion(this.root.quaternion); }
  bonePos(n, out = new THREE.Vector3()) { return this.bones[n].getWorldPosition(out); }
  headCenter(out = new THREE.Vector3()) {
    const h = this.bonePos('head'), n = this.bonePos('neck_01');
    return out.copy(h).addScaledVector(h.clone().sub(n).normalize(), 0.085).addScaledVector(this.forward(), 0.03);
  }
  torso() {
    const f = this.forward();
    const s1 = this.bonePos('spine_01'), s2 = this.bonePos('spine_02'), s3 = this.bonePos('spine_03');
    const top = s3.clone().addScaledVector(s3.clone().sub(s2), 1.3).addScaledVector(f, 0.06);
    return [s1.addScaledVector(f, 0.06), top];
  }
  glove(side) {
    const w = this.bonePos('hand_' + side), e = this.bonePos('lowerarm_' + side);
    const d = w.clone().sub(e).normalize();
    return { center: w.clone().addScaledVector(d, 0.09), tip: w.clone().addScaledVector(d, 0.165) };
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }

  // --------------------------------------------------------------- un fotogramma
  update(dt, player) {
    this.time += dt;
    this.stateT += dt;
    if (this.stun > 0) this.stun -= dt;
    const head = player.head;
    if (this.goal) { this.updateGoal(dt); this.animate(dt); return; }   // va all'angolo

    // guarda sempre l'avversario
    const toP = _a.set(head.x - this.root.position.x, 0, head.z - this.root.position.z);
    const dist = toP.length();
    const aimP = this.enabled ? this.aimPunch() : null;
    const want = Math.atan2(toP.x, toP.z) - (aimP ? aimP.yaw : 0);
    let dy = want - this.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.root.rotation.y += Math.max(-9 * dt, Math.min(9 * dt, dy));

    if (this.enabled) {
      this.checkPlayerPunches(player);
      this.think(dt, player, dist);
      this.move(dt, dist, toP.clone().normalize());
    } else if (this.holdDist && !this.down) this.move(dt, dist, toP.clone().normalize());   // si allontana (angolo neutro)
    else this.vel.set(0, 0, 0);
    this.animate(dt);
    if (this.enabled) this.resolveMyPunch(player, dist);
  }

  think(dt, player, dist) {
    const c = this.cfg;
    // 1) difesa: guarda i tuoi guantoni. Conta solo un pugno in rotta di collisione con testa o corpo
    //    (non qualunque movimento delle mani), letto appena parte la spinta.
    const committed = this.punch && this.punch.layer.t > 0.03 && !c.chain;
    if (!this.reaction && this.stun <= 0 && !committed) {
      const hc = this.headCenter();
      const [t0, t1] = this.torso();
      const tm = t0.clone().lerp(t1, 0.5);
      for (const g of Object.values(player.gloves)) {
        if (!g.mesh.visible || g.speed < c.threatSpeed || this.seen[g.side] === g.punchId) continue;
        if (this.defending && !c.chain) continue;
        if (this.defending && this.defending.glove === g.side && this.defending.punchId === g.punchId) continue;
        // verso cosa va il pugno: testa o corpo (il bersaglio a cui passera' piu' vicino)
        let threat = null, best = Infinity;
        for (const [T, R, zone] of [[hc, 0.30, 'head'], [tm, 0.30, 'body']]) {
          const rel = _b.subVectors(T, g.center);
          if (rel.length() > c.threatDist) continue;
          const tca = rel.dot(g.vel) / (g.speed * g.speed);      // fra quanto passa piu' vicino
          if (tca < 0 || tca > 0.5) continue;
          const miss = _c.copy(g.center).addScaledVector(g.vel, tca).distanceTo(T);
          if (miss < R && miss < best) { best = miss; threat = zone; }
        }
        if (!threat) continue;
        this.seen[g.side] = g.punchId;
        const open = this.time < this.openUntil;              // appena parato/schivato da te: e' scoperto
        if (Math.random() < c.reactChance * (open ? c.openFactor : 1) * (1 - 0.35 * (this.fatigue || 0))) this.reaction = { at: this.time + rand(...c.reactDelay), glove: g, punchId: g.punchId, zone: threat };
        break;
      }
    }
    if (this.reaction && this.time >= this.reaction.at) {
      const g = this.reaction.glove;
      const type = this.chooseDefense(g, this.reaction.zone);
      // che pugno era (tu in guardia normale: sinistro = jab, destro = diretto)
      const lvx = Math.abs(g.vel.clone().applyQuaternion(_q.copy(this.root.quaternion).invert()).x) / Math.max(0.01, g.speed);
      const kind = this.reaction.zone === 'body' ? 'body' : lvx > 0.5 ? 'hook' : g.side === 'left' ? 'jab' : 'cross';
      if (this.punch) { this.punch = null; this.combo = []; this.setState('retreat'); }
      if (type === 'back') this.backOff = 0.3;                       // indietro di un passo
      else this.play(type, c.defenseSpeed);
      this.defending = { kind, start: this.time, type, until: this.time + 0.55 / Math.max(1, c.defenseSpeed * 0.75), glove: g.side,
        punchId: this.reaction.punchId, hit: false };
      this.reaction = null;
    }
    if (this.defending) {
      const g = player.gloves[this.defending.glove === 'left' ? 'left' : 'right'];
      const hc = this.headCenter();
      const rel = _b.subVectors(hc, g.center);
      const coming = g.mesh.visible && g.speed > 0.8 && g.vel.dot(rel) / rel.length() > 0.3 && rel.length() < 0.75;
      if (coming) {
        this.defending.until = Math.max(this.defending.until, this.time + 0.12);
        const h = HOLD[this.defending.type], l = this.current();
        if (h && l && l.name === this.defending.type && l.t * 30 > h[1]) { l.t = h[1] / 30 - 0.02; l.action.time = l.t; }
      }
    }
    if (this.defending && this.time > this.defending.until) {
      const ok = !this.defending.hit;
      if (ok && this.defending.type !== 'block') this.emit('mikeDodged');
      this.defending_last = this.defending;
      this.defending = null;
      if (ok) this.maybeCounter(this.defending_last);
    }

    // ritmo della guardia: mentre ti studia ogni tanto la abbassa; appena c'e' pericolo o attacca la rialza
    const busy = this.reaction || this.defending || this.state !== 'stalk' || this.stun > 0;
    this.lowTimer -= dt;
    if (busy) this.lowTarget = 0;
    else if (this.lowTimer <= 0) {
      this.lowTimer = rand(1.0, 2.8);
      this.lowTarget = Math.random() < c.lowGuard ? rand(0.6, 1) : 0;
    }
    this.low += (this.lowTarget - this.low) * Math.min(1, dt * (this.lowTarget > this.low ? 3 : 9));

    // 2) attacco
    switch (this.state) {
      case 'stalk':
        this.nextAttack -= dt;
        {
          // ti scopri (guantoni lontani dal viso) o hai appena tirato a vuoto: Mike ne approfitta
          const open = Object.values(player.gloves).filter(g => g.mesh.visible && g.center.distanceTo(player.head) > 0.42).length;
          if (open && Math.random() < dt * (0.6 + c.counterChance * 2) * open) this.nextAttack = Math.min(this.nextAttack, 0.05);
        }
        if (this.nextAttack <= 0 && !this.defending && this.stun <= 0) {
          // guardia alta (tutti e due i guantoni vicino al viso)? allora va al corpo o di gancio
          const high = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.42);
          const toBody = Math.random() < (high ? c.bodyBias : c.bodyBias * 0.3);
          this.combo = [...pick(toBody ? BODY_COMBOS : c.combos)];
          this.setState('approach');
        } else if (!this.defending && !this.layers.length && Math.random() < c.feints * dt) {
          this.play(pick(['slip_l', 'slip_r', 'duck', 'block']), c.defenseSpeed * 0.9);   // finta
        }
        break;
      case 'approach':
        if ((Math.abs(dist - this.attackDist()) < 0.07 || this.stateT > (this.counter ? 0.35 : 1.2)) && !this.defending) {
          this.counter = false;
          this.setState('attack'); this.nextPunch();
        }
        break;
      case 'attack':
        if (this.punch && this.punch.layer.t > this.punch.layer.dur * (this.punch.move ? 0.5 : 0.72)) {
          if (this.combo.length && this.stun <= 0) this.nextPunch();
          else { this.punch = null; this.setState('retreat'); }
        } else if (!this.punch) this.setState('retreat');
        break;
      case 'retreat':
        if (this.stateT > c.retreatTime) { this.setState('stalk'); this.nextAttack = rand(...c.attackEvery); }
        break;
    }
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // quale difesa usare contro questo pugno
  chooseDefense(g, zone) {
    const c = this.cfg;
    const local = this.root.worldToLocal(g.center.clone());
    const lv = g.vel.clone().applyQuaternion(_q.copy(this.root.quaternion).invert());
    const sp = Math.max(0.01, lv.length());
    const hook = Math.abs(lv.x) / sp > 0.5;                         // arriva di lato
    // dove arrivera' il guantone rispetto alla testa: si sposta dal lato opposto (+X = sinistra di Mike)
    const hc0 = this.headCenter();
    const tA = Math.min(0.3, g.center.distanceTo(hc0) / Math.max(0.5, g.speed));
    const arrive = this.root.worldToLocal(g.center.clone().addScaledVector(g.vel, tA));
    const headL = this.root.worldToLocal(hc0.clone());
    const dx = arrive.x - headL.x;
    const away = Math.abs(dx) > 0.03 ? (dx > 0 ? 'slip_r' : 'slip_l') : (local.x > 0 ? 'slip_r' : 'slip_l');
    const r = Math.random();
    if (!c.smart) {
      if (zone === 'body') return r < 0.6 ? 'block_low' : 'back';
      if (hook && r < 0.5) return 'duck';
      return r < 0.5 ? 'block' : r < 0.85 ? away : 'duck';
    }
    // dove sta andando il pugno: al corpo o alla testa?
    if (zone === 'body') return 'block_low';                       // ai livelli alti para sempre in basso
    // abbassarsi serve solo se il pugno arriva all'altezza della testa o piu' in alto
    const hc = this.headCenter();
    const tArr = Math.min(0.3, g.center.distanceTo(hc) / Math.max(0.5, g.speed));
    const high = g.center.y + g.vel.y * tArr > hc.y - 0.03;
    if (hook) return high && r < 0.75 ? 'duck' : r < 0.85 ? away : 'block';
    return r < 0.75 ? away : high && r < 0.9 ? 'duck' : 'block';
  }

  // dopo una difesa riuscita: contrattacco immediato
  maybeCounter(d) {
    if (this.stun > 0 || this.state === 'attack' || Math.random() >= this.cfg.counterChance) return;
    const key = d && (d.type.startsWith('slip') ? 'slip' : d.type);
    const opts = d && COUNTER_TABLE[d.kind] && COUNTER_TABLE[d.kind][key];
    this.combo = [...pick(opts || COUNTERS)];
    this.setState('approach');
    this.counter = true;
  }
  attackDist() { const a = this.aimPunch(); return a ? a.dist - 0.03 : this.cfg.attackDist; }

  nextPunch() {
    const name = this.combo.shift();
    if (!name || !this.clips[name]) { this.punch = null; this.setState('retreat'); return; }
    if (MOVES.has(name)) {                                   // movimento di difesa dentro la combinazione
      const layer = this.play(name, this.cfg.defenseSpeed);
      this.punch = { name, layer, resolved: true, move: true };
      return;
    }
    const layer = this.play(name, this.cfg.punchSpeed * (1 - 0.2 * (this.fatigue || 0)));
    this.punch = { name, layer, resolved: false, inRange: false };
    this.emit('mikeThrows', { name });
  }

  move(dt, dist, dir) {
    if (this.stun > 0) { this.vel.set(0, 0, 0); if (this.moveVel) this.moveVel.set(0, 0, 0); return; }
    const c = this.cfg;
    const desired = this.holdDist || (this.state === 'approach' || this.state === 'attack' ? this.attackDist() : c.stalkDist);
    let radial = Math.max(-c.moveSpeed, Math.min(c.moveSpeed * (this.counter ? 1.6 : 1), (dist - desired) * 4));
    if (this.state === 'retreat') radial = Math.min(radial, -0.2);
    if (this.backOff > 0) { radial = -1.1; this.backOff -= 1.1 * dt; }   // passo indietro (schiva al corpo), con i passi
    const side = _c.set(dir.z, 0, -dir.x);       // perpendicolare: gira intorno
    const strafe = this.state === 'stalk' ? Math.sin(this.time * 0.8 + this.strafe) * 0.3 : 0;
    // velocita' con un minimo di inerzia (un pugile non parte e non si ferma di colpo)
    const target = _b.copy(dir).multiplyScalar(radial).addScaledVector(side, strafe);
    this.moveVel.lerp(target, Math.min(1, dt * 6));
    this.prevPos.copy(this.root.position);
    this.root.position.addScaledVector(this.moveVel, dt);
    if (this.bounds) this.bounds(this.root.position);
    if (dt > 0) this.vel.subVectors(this.root.position, this.prevPos).divideScalar(dt);   // velocita' vera (con le corde)
  }

  // i miei pugni: hanno colpito, sono stati parati o sono andati a vuoto?
  resolveMyPunch(player, dist) {
    const p = this.punch;
    if (!p || p.resolved) return;
    const spec = PUNCH[p.name], f = p.layer.t * 30;
    if (f < spec.from) return;
    if (f > spec.to) {
      p.resolved = true;
      if (dist < 0.9) { this.openUntil = this.time + 0.7; this.emit('playerDodged'); }
      return;
    }
    p.inRange = true;
    const { tip, center } = this.glove(spec.side);
    // il tratto percorso dalla punta in questo fotogramma: un guantone tuo sulla traiettoria la ferma
    const prevTip = p.prevTip || tip;
    p.prevTip = tip.clone();
    for (const g of Object.values(player.gloves)) {
      if (g.mesh.visible && (distPointSeg(g.center, prevTip, tip) < 0.17 || g.center.distanceTo(center) < 0.15)) {
        p.resolved = true; this.openUntil = this.time + 0.7; this.emit('playerBlocked', { side: g.side }); return;
      }
    }
    // la tua guardia alta (tutti e due i guantoni davanti al viso) ferma i colpi dritti e i montanti;
    // i ganci, che arrivano di lato, passano a volte
    const guardUp = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.32);
    if (p.hookThrough === undefined) p.hookThrough = Math.random() < 0.45;
    if (guardUp && spec.zone === 'head' && (!p.name.startsWith('hook') || !p.hookThrough) &&
        (tip.distanceTo(player.head) < 0.3 || center.distanceTo(player.head) < 0.28)) {
      p.resolved = true; this.openUntil = this.time + 0.7; this.emit('playerBlocked', { side: 'left' }); return;
    }
    if (spec.zone === 'body') {
      // il tuo corpo: dal petto alla pancia, sotto la testa
      const top = player.head.clone().add(new THREE.Vector3(0, -0.28, 0)), bot = player.head.clone().add(new THREE.Vector3(0, -0.62, 0));
      if (distPointSeg(tip, top, bot) < 0.2 || distPointSeg(center, top, bot) < 0.18) {
        p.resolved = true; this.emit('mikeHit', { name: p.name, zone: 'body' });
      }
    } else if (tip.distanceTo(player.head) < 0.17 || center.distanceTo(player.head) < 0.15) {
      p.resolved = true; this.emit('mikeHit', { name: p.name, zone: 'head' });
    }
  }

  // i tuoi pugni
  checkPlayerPunches(player) {
    const hc = this.headCenter();
    const [t0, t1] = this.torso();
    const towardMike = this.forward().negate();
    const gl = { l: this.glove('l'), r: this.glove('r') };
    for (const g of Object.values(player.gloves)) {
      if (!g.mesh.visible || g.cooldown > 0 || g.peakSpeed() < 1.8) continue;
      if (g.vel.dot(towardMike) < -0.3) continue;          // non mentre torna indietro
      if (g.travel(towardMike) < 0.12) continue;           // deve essere partito davvero (non Mike che ci finisce contro)
      const [a, b] = g.segment();
      let ev = null;
      // colpo basso: il pugno arriva sotto la cintura (vale solo finche' Mike ha almeno meta' energia)
      const belt = this.bonePos('pelvis').y + 0.10;          // bordo alto dei calzoncini
      const groin = this.bonePos('pelvis').addScaledVector(this.forward(), 0.13).add(new THREE.Vector3(0, -0.13, 0));
      if (this.lowBlowAllowed && g.center.y < belt && distPointSeg(groin, a, b) < g.radius + 0.14) {
        g.cooldown = 0.6; g.contactPoint.copy(g.center);
        this.emit('lowBlow', { side: g.side });
        continue;
      }
      // in parata i guantoni coprono bene; nella guardia normale lasciano spazi
      const blocking = this.defending && this.defending.type === 'block';
      const blockLow = this.defending && this.defending.type === 'block_low';
      const guard = blocking ? this.cfg.blockReach : blockLow ? -0.06 : this.cfg.guardReach * (1 - this.low) - 0.06 * this.low;
      for (const s of ['l', 'r']) {
        if (distPointSeg(gl[s].center, a, b) < g.radius + guard) { ev = { type: 'mikeBlocked' }; break; }
      }
      if (!ev && blockLow && distSegSeg(a, b, t0, t1) < g.radius + 0.2) ev = { type: 'mikeBlocked' };
      if (!ev && distPointSeg(hc, a, b) < g.radius + 0.115) ev = { type: 'playerHit', zone: 'head' };
      if (!ev && distSegSeg(a, b, t0, t1) < g.radius + 0.16) ev = { type: 'playerHit', zone: 'body' };
      if (!ev) continue;
      g.cooldown = 0.45; g.contactPoint.copy(g.center);
      ev.side = g.side; ev.speed = g.peakSpeed();
      const lp = this.root.worldToLocal(g.center.clone()), lh = this.root.worldToLocal(hc.clone());
      ev.why = `t+${this.defending ? (this.time - this.defending.start).toFixed(2) : '-'} hx${lh.x.toFixed(2)} gx${lp.x.toFixed(2)} gy${(lp.y - lh.y).toFixed(2)} ${this.state}${this.defending ? '/' + this.defending.type : ''}${this.time < this.openUntil ? '/aperto' : ''}${this.punch ? '/pugno' : ''}`;
      // dove ha colpito, nel sistema di Mike (per i lividi): x>0 = sua sinistra, y rispetto al centro della testa
      ev.lx = lp.x; ev.ly = lp.y - lh.y;
      ev.point = g.center.clone(); ev.dir = g.vel.clone().normalize();
      this.emit(ev.type, ev);
      if (ev.type === 'playerHit') {
        if (this.defending) this.defending.hit = true;
        this.reaction = null;
        this.stun = 0.35;
        if (this.punch && Math.random() < 0.6) { this.punch = null; this.combo = []; this.setState('retreat'); }
        this.play(ev.zone === 'head' ? 'hit_head' : 'hit_body', 1.1);
        this.pain = ev.zone === 'head' ? 1.1 : 0.8;          // smorfia
      }
    }
  }
}
