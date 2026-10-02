// Mike: modello animato + intelligenza artificiale (si muove, para, schiva, attacca).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Caratteristiche dell'avversario: per i prossimi pugili bastera' cambiare questi numeri.
export const MIKE = {
  name: 'Mike',
  reactChance: 0.55,          // probabilita' di reagire a un tuo pugno
  reactDelay: [0.05, 0.13],   // tempi di reazione (s)
  attackEvery: [2.0, 3.8],    // pausa tra un attacco e l'altro (s)
  punchSpeed: 1.0,            // velocita' delle animazioni dei pugni
  moveSpeed: 1.3,             // m/s
  stalkDist: 1.0,             // distanza di studio (m)
  attackDist: 0.70,           // distanza da cui colpisce
  combos: [['jab'], ['jab', 'cross'], ['jab', 'jab'], ['cross', 'hook_l'], ['jab', 'cross', 'hook_l'], ['hook_r'], ['jab', 'hook_r']],
};

// finestre "attive" dei pugni, in fotogrammi a 30 fps (quando il guantone puo' colpire)
const PUNCH = {
  jab: { side: 'l', from: 2, to: 6 },
  cross: { side: 'r', from: 3, to: 8 },
  hook_l: { side: 'l', from: 5, to: 10 },
  hook_r: { side: 'r', from: 6, to: 11 },
};

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

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
  constructor(gltf, scene, cfg = MIKE) {
    this.cfg = cfg;
    this.root = new THREE.Group(); this.root.name = 'Mike';
    this.model = gltf.scene;
    this.root.add(this.model);
    scene.add(this.root);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.castShadow = true;
      const m = o.material, n = m.name || '';
      if (n === 'Capelli') { m.transparent = true; m.depthWrite = false; m.vertexColors = true; o.renderOrder = 2; }
      else if (n.includes('eyebrow') || n.includes('eyelash')) { m.transparent = true; m.depthWrite = false; m.alphaTest = 0.05; o.renderOrder = 2; o.castShadow = false; }
      else if (n.includes('high-poly')) { m.transparent = false; m.alphaTest = 0.4; o.castShadow = false; }
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.8;
    });
    const bone = n => this.model.getObjectByName(n);
    this.bones = {};
    for (const n of ['head', 'neck_01', 'spine_01', 'spine_02', 'spine_03', 'hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r', 'pelvis'])
      this.bones[n] = bone(n);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.idle = this.mixer.clipAction(this.clips.idle);
    this.idle.play();
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
    if (this.punch) return this.impact[this.punch.name];
    if (this.state === 'approach' && this.combo.length) return this.impact[this.combo[0]];
    return null;
  }

  // --------------------------------------------------------------- animazioni
  play(name, timeScale = 1) {
    for (const l of this.layers) l.out = true;
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.timeScale = timeScale; a.setEffectiveWeight(0); a.play();
    const layer = { name, action: a, t: 0, dur: this.clips[name].duration, ts: timeScale, w: 0, out: false };
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
        if (l.t > l.dur - 0.14) w = Math.min(w, Math.max(0, (l.dur - l.t) / 0.14));
        l.w = w;
      }
      l.action.setEffectiveWeight(l.w);
      total += l.w;
    }
    this.layers = this.layers.filter(l => {
      const keep = l.w > 0.001 || (!l.out && l.t < 0.07);
      if (!keep) l.action.stop();
      return keep;
    });
    this.idle.setEffectiveWeight(Math.max(0, 1 - total));
    this.mixer.update(dt);
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
    }
    this.animate(dt);
    if (this.enabled) this.resolveMyPunch(player, dist);
  }

  think(dt, player, dist) {
    const c = this.cfg;
    // 1) difesa: guarda i tuoi guantoni
    if (!this.reaction && !this.defending && this.stun <= 0 && !(this.punch && this.punch.layer.t > 0.03)) {
      const hc = this.headCenter();
      for (const g of Object.values(player.gloves)) {
        if (!g.mesh.visible || g.speed < 1.1 || this.seen[g.side] === g.punchId) continue;
        const rel = _b.subVectors(hc, g.center); const d = rel.length();
        const closing = g.vel.dot(rel) / d;
        if (d < 0.8 && closing > 1.0) {
          this.seen[g.side] = g.punchId;
          if (Math.random() < c.reactChance) this.reaction = { at: this.time + rand(...c.reactDelay), glove: g, punchId: g.punchId };
          break;
        }
      }
    }
    if (this.reaction && this.time >= this.reaction.at) {
      const g = this.reaction.glove;
      // da che lato arriva il pugno
      const local = this.root.worldToLocal(g.center.clone());
      const lateral = Math.abs(g.vel.clone().applyQuaternion(this.root.quaternion.clone().invert()).x);
      let type;
      const r = Math.random();
      if (lateral > 1.2 && r < 0.5) type = 'duck';                  // gancio: sotto
      else if (r < 0.5) type = 'block';
      else if (r < 0.85) type = local.x > 0 ? 'slip_r' : 'slip_l'; // si sposta dal lato opposto (+X = sinistra di Mike)
      else type = 'duck';
      if (this.punch) { this.punch = null; this.combo = []; this.setState('retreat'); }
      this.play(type, type === 'block' ? 1.2 : 1.35);
      this.defending = { type, until: this.time + 0.55, glove: g.side, punchId: this.reaction.punchId, hit: false };
      this.reaction = null;
    }
    if (this.defending && this.time > this.defending.until) {
      if (!this.defending.hit && this.defending.type !== 'block') this.emit('mikeDodged');
      this.defending = null;
    }

    // 2) attacco
    switch (this.state) {
      case 'stalk':
        this.nextAttack -= dt;
        if (this.nextAttack <= 0 && !this.defending && this.stun <= 0) {
          this.combo = [...pick(c.combos)];
          this.setState('approach');
        }
        break;
      case 'approach':
        if ((Math.abs(dist - this.attackDist()) < 0.07 || this.stateT > 1.2) && !this.defending) {
          this.setState('attack'); this.nextPunch();
        }
        break;
      case 'attack':
        if (this.punch && this.punch.layer.t > this.punch.layer.dur * 0.72) {
          if (this.combo.length && this.stun <= 0) this.nextPunch();
          else { this.punch = null; this.setState('retreat'); }
        } else if (!this.punch) this.setState('retreat');
        break;
      case 'retreat':
        if (this.stateT > 0.7) { this.setState('stalk'); this.nextAttack = rand(...c.attackEvery); }
        break;
    }
  }

  setState(s) { this.state = s; this.stateT = 0; }
  attackDist() { const a = this.aimPunch(); return a ? a.dist - 0.03 : this.cfg.attackDist; }

  nextPunch() {
    const name = this.combo.shift();
    const layer = this.play(name, this.cfg.punchSpeed);
    this.punch = { name, layer, resolved: false, inRange: false };
    this.emit('mikeThrows', { name });
  }

  move(dt, dist, dir) {
    if (this.stun > 0) return;
    const c = this.cfg;
    const desired = this.state === 'approach' || this.state === 'attack' ? this.attackDist() : c.stalkDist;
    let radial = Math.max(-c.moveSpeed, Math.min(c.moveSpeed, (dist - desired) * 4));
    if (this.state === 'retreat') radial = Math.min(radial, -0.2);
    const side = _c.set(dir.z, 0, -dir.x);       // perpendicolare: gira intorno
    const strafe = this.state === 'stalk' ? Math.sin(this.time * 0.8 + this.strafe) * 0.3 : 0;
    this.root.position.addScaledVector(dir, radial * dt).addScaledVector(side, strafe * dt);
    if (this.bounds) this.bounds(this.root.position);
  }

  // i miei pugni: hanno colpito, sono stati parati o sono andati a vuoto?
  resolveMyPunch(player, dist) {
    const p = this.punch;
    if (!p || p.resolved) return;
    const spec = PUNCH[p.name], f = p.layer.t * 30;
    if (f < spec.from) return;
    if (f > spec.to) {
      p.resolved = true;
      if (dist < 0.9) this.emit('playerDodged');
      return;
    }
    p.inRange = true;
    const { tip, center } = this.glove(spec.side);
    for (const g of Object.values(player.gloves)) {
      if (g.mesh.visible && (g.center.distanceTo(tip) < 0.15 || g.center.distanceTo(center) < 0.13)) {
        p.resolved = true; this.emit('playerBlocked', { side: g.side }); return;
      }
    }
    if (tip.distanceTo(player.head) < 0.17 || center.distanceTo(player.head) < 0.15) {
      p.resolved = true; this.emit('mikeHit', { name: p.name });
    }
  }

  // i tuoi pugni
  checkPlayerPunches(player) {
    const hc = this.headCenter();
    const [t0, t1] = this.torso();
    const towardMike = this.forward().negate();
    const gl = { l: this.glove('l'), r: this.glove('r') };
    for (const g of Object.values(player.gloves)) {
      if (!g.mesh.visible || g.cooldown > 0 || g.speed < 1.3) continue;
      if (g.vel.dot(towardMike) < 0.4) continue;           // deve andare verso Mike
      const [a, b] = g.segment();
      let ev = null;
      // in parata i guantoni coprono bene; nella guardia normale lasciano spazi
      const blocking = this.defending && this.defending.type === 'block';
      for (const s of ['l', 'r']) {
        if (distPointSeg(gl[s].center, a, b) < g.radius + (blocking ? 0.09 : 0.035)) { ev = { type: 'mikeBlocked' }; break; }
      }
      if (!ev && distPointSeg(hc, a, b) < g.radius + 0.115) ev = { type: 'playerHit', zone: 'head' };
      if (!ev && distSegSeg(a, b, t0, t1) < g.radius + 0.16) ev = { type: 'playerHit', zone: 'body' };
      if (!ev) continue;
      g.cooldown = 0.45; g.contactPoint.copy(g.center);
      ev.side = g.side; ev.speed = g.speed;
      this.emit(ev.type, ev);
      if (ev.type === 'playerHit') {
        if (this.defending) this.defending.hit = true;
        this.reaction = null;
        this.stun = 0.35;
        if (this.punch && Math.random() < 0.6) { this.punch = null; this.combo = []; this.setState('retreat'); }
        this.play(ev.zone === 'head' ? 'hit_head' : 'hit_body', 1.1);
      }
    }
  }
}
