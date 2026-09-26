// La mosca: vola a caso per la stanza (zig-zag, scatti, cambi di direzione), ogni tanto si posa su muri
// e mobili. Gli animaletti impazziscono: la inseguono e fanno grandi salti per prenderla; se ci riescono
// esplode e dopo un po' ne arriva un'altra. Ronzio 3D che cresce e cala con la distanza da te.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const UP = new THREE.Vector3(0, 1, 0);
const SCALE = 1.4;            // un po' piu' grande del vero, cosi' si vede bene
const RADIUS = 0.022;         // quanto e' "grossa" per essere presa
const _v = new THREE.Vector3(), _m = new THREE.Matrix4();

function randUnit() {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  return v.lengthSq() > 1e-6 ? v.normalize() : v.set(1, 0, 0);
}

export class Fly {
  constructor(scene, room, fx, sfx) {
    Object.assign(this, { scene, room, fx, sfx });
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.jitter = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.state = 'off';     // off | fly | rest | dead
    this.enabled = false;
    this.t = 0;
  }

  async load() {
    const gltf = await new GLTFLoader().loadAsync('assets/fly.glb');
    this.model = gltf.scene;
    this.model.scale.setScalar(SCALE);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; if (o.material.transparent) o.material.depthWrite = false; } });
    this.wings = ['WingL', 'WingR'].map(n => this.model.getObjectByName(n));
    this.root.add(this.model);
  }

  pause(p) {
    if (p === this.paused) return;
    this.paused = p;
    this.root.visible = !p && this.enabled && this.state !== 'dead';
    if (p) this.buzz?.set(false);
  }

  setEnabled(on, userHead) {
    this.enabled = on;
    if (on) this.spawn(userHead);
    else {
      this.state = 'off';
      this.root.visible = false;
      this.buzz?.set(false);
    }
  }

  // ------------------------------------------------------------ comparsa
  spawn(userHead) {
    this.buzz ||= this.sfx.createBuzz(this.root);
    const p = this.randomAirPoint(userHead) || userHead.clone().add(new THREE.Vector3(0.6, -0.4, -0.6));
    this.pos.copy(p);
    this.vel.copy(randUnit()).multiplyScalar(0.6);
    this.state = 'fly';
    this.root.visible = true;
    this.pickTarget(userHead);
    this.nextLand = 4 + Math.random() * 6;
    this.grow = 0;
  }

  // punto d'aria libero vicino a te: 0,5-2,2 m in orizzontale, da 15 cm a 1,8 m d'altezza
  randomAirPoint(userHead) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 1.7;
      const p = new THREE.Vector3(userHead.x + Math.cos(a) * r, this.room.floorY + 0.15 + Math.random() * 1.65, userHead.z + Math.sin(a) * r);
      const g = this.room.groundBelow(p, 0, 3);
      if (!g || g.point.y > p.y - 0.06) continue;                       // dentro un mobile
      if (this.room.visibleFrom(p, userHead)) return p;                 // non dietro i muri
    }
    return null;
  }

  pickTarget(userHead) {
    const p = this.randomAirPoint(userHead);
    if (!p) return;
    // non attraversare le cose: si ferma prima dell'ostacolo
    const d = _v.subVectors(p, this.pos), len = d.length();
    const hit = len > 0.01 && this.room.raycast(this.pos.clone(), d.clone().divideScalar(len), len);
    this.target.copy(hit ? this.pos.clone().addScaledVector(d, Math.max(0, hit.distance - 0.08) / len) : p);
    this.landing = null;
    this.targetT = 0.6 + Math.random() * 2.2;
  }

  // sceglie un muro (o un mobile) su cui posarsi, sparando un raggio in una direzione a caso
  pickLanding() {
    for (let i = 0; i < 6; i++) {
      const dir = randUnit();
      dir.y *= 0.5;
      dir.normalize();
      const hit = this.room.raycast(this.pos.clone(), dir, 2.0);
      if (!hit || hit.distance < 0.15) continue;
      if (Math.random() < 0.7 && hit.normal.y > 0.6) continue;           // di preferenza i muri
      this.landing = { point: hit.point.clone(), normal: hit.normal.clone() };
      this.target.copy(hit.point).addScaledVector(hit.normal, 0.05);
      this.targetT = 4;
      return true;
    }
    return false;
  }

  // la schiacci anche tu: basta toccarla con la mano (o il controller)
  touch(points) {
    if (!this.enabled || this.paused || (this.state !== 'fly' && this.state !== 'rest')) return false;
    if (!points.some(p => p.distanceTo(this.pos) < RADIUS + 0.02)) return false;
    this.explode();
    return true;
  }

  explode() {
    this.fx.burst(this.pos.clone(), 0x2a3a2c, 0.6);
    this.fx.burst(this.pos.clone(), 0xd8202c, 0.4);
    this.sfx.splat();
    this.state = 'dead';
    this.deadT = 2.5 + Math.random() * 2;
    this.root.visible = false;
    this.buzz?.set(false);
  }

  // ------------------------------------------------------------ volo
  update(dt, userHead, pets) {
    if (!this.enabled || !this.model || this.paused) return;
    this.t += dt;
    if (this.state === 'dead') {
      this.deadT -= dt;
      if (this.deadT <= 0) this.spawn(userHead);
      return;
    }
    if (this.state === 'rest') this.restStep(dt, userHead, pets);
    else this.flyStep(dt, userHead, pets);

    this.grow = Math.min(1, this.grow + dt * 3);
    this.model.scale.setScalar(SCALE * this.grow);
    this.root.position.copy(this.pos);
    // ali: in volo vibrano cosi' in fretta da sembrare sfocate; posata le chiude sul dorso
    for (const [i, w] of this.wings.entries()) {
      if (!w) continue;
      const s = i === 0 ? 1 : -1;
      if (this.state === 'fly') {
        w.rotation.set(0, (Math.random() - 0.5) * 0.3, s * (Math.random() < 0.5 ? 0.9 : -0.4));
      } else w.rotation.set(0, s * 0.35, s * -0.05);
    }
    this.buzz?.set(this.state === 'fly', this.vel.length());
  }

  flyStep(dt, userHead, pets) {
    // scappa quando un animaletto le arriva troppo vicino (non sempre ci riesce!)
    for (const p of pets) {
      const d = p.center.distanceTo(this.pos);
      if (d < 0.28 && Math.random() < dt * 5) {
        this.vel.addScaledVector(_v.subVectors(this.pos, p.center).normalize(), 1.2).addScaledVector(UP, 0.5);
        this.targetT = 0;
      }
    }
    this.targetT -= dt;
    this.nextLand -= dt;
    if (this.targetT <= 0 || this.pos.distanceTo(this.target) < 0.08) {
      if (this.landing && this.pos.distanceTo(this.target) < 0.1) return this.land();
      if (this.nextLand <= 0 && this.pickLanding()) this.nextLand = 6 + Math.random() * 8;
      else this.pickTarget(userHead);
    }
    // traiettoria nervosa: verso il bersaglio + una spinta casuale che cambia di continuo
    const toT = _v.subVectors(this.target, this.pos);
    const speedWanted = this.landing ? 0.45 : 0.6 + Math.random() * 0.8;
    const desired = toT.clone().normalize().multiplyScalar(speedWanted);
    if (Math.random() < dt * 3) this.jitter.copy(randUnit()).multiplyScalar(1.5 + Math.random() * 2);
    this.vel.addScaledVector(desired.sub(this.vel), Math.min(1, dt * 3.5));
    if (!this.landing) this.vel.addScaledVector(this.jitter, dt);
    const sp = this.vel.length();
    if (sp > 1.6) this.vel.multiplyScalar(1.6 / sp);
    // non entrare nella tua testa
    const toHead = _v.subVectors(this.pos, userHead);
    if (toHead.length() < 0.3) this.vel.addScaledVector(toHead.normalize(), dt * 6);
    // urti: se sta per sbattere, rimbalza (o si posa, se era li' che voleva andare)
    const step = this.vel.length() * dt;
    if (step > 1e-5) {
      const dir = this.vel.clone().normalize();
      const hit = this.room.raycast(this.pos.clone(), dir, step + 0.02);
      if (hit) {
        if (this.landing && hit.point.distanceTo(this.landing.point) < 0.15) return this.land();
        this.vel.reflect(hit.normal).multiplyScalar(0.7);
        this.targetT = 0;
        return;
      }
    }
    this.pos.addScaledVector(this.vel, dt);
    // mai sotto il pavimento
    const g = this.room.groundBelow(this.pos, 0.02, 0.5);
    if (g && this.pos.y < g.point.y + 0.03) { this.pos.y = g.point.y + 0.03; this.vel.y = Math.abs(this.vel.y); }
    // orientamento: guarda dove va, leggermente inclinata
    const fwd = this.vel.lengthSq() > 1e-6 ? this.vel.clone().normalize() : new THREE.Vector3(0, 0, 1);
    this.orient(UP, fwd, dt * 10);
  }

  land() {
    const L = this.landing;
    this.state = 'rest';
    this.restT = 2 + Math.random() * 4;
    this.pos.copy(L.point).addScaledVector(L.normal, 0.012 * SCALE * 0.6);
    this.restN = L.normal.clone();
    this.restFwd = randUnit().addScaledVector(L.normal, -1).normalize();
    this.landing = null;
    this.vel.set(0, 0, 0);
  }

  restStep(dt, userHead, pets) {
    this.restT -= dt;
    // si pulisce le zampette ogni tanto (piccoli scatti sul posto)
    if (Math.random() < dt * 1.5) this.restFwd.applyAxisAngle(this.restN, (Math.random() - 0.5) * 1.2);
    this.orient(this.restN, this.restFwd, dt * 20);
    const scared = pets.some(p => p.center.distanceTo(this.pos) < 0.22) || this.pos.distanceTo(userHead) < 0.2;
    if (this.restT <= 0 || (scared && Math.random() < dt * 6)) {
      this.state = 'fly';
      this.vel.copy(this.restN).multiplyScalar(0.9).addScaledVector(randUnit(), 0.4);
      this.pos.addScaledVector(this.restN, 0.02);
      this.pickTarget(userHead);
      this.nextLand = 5 + Math.random() * 8;
    }
  }

  orient(up, fwd, k) {
    const z = fwd.clone().addScaledVector(up, -fwd.dot(up));
    if (z.lengthSq() < 1e-6) return;
    z.normalize();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    _m.makeBasis(x, up, z);
    const q = new THREE.Quaternion().setFromRotationMatrix(_m);
    this.root.quaternion.slerp(q, Math.min(1, k));
  }

  // ------------------------------------------------------------ gli animaletti la vogliono prendere
  // pets: personaggi liberi; ritorna true se la mosca e' "attiva" (cosi' main sa che la stanno cacciando)
  drive(dt, pets) {
    if (!this.enabled || this.state === 'off' || this.paused) return false;
    for (const c of pets) {
      c.flyT = (c.flyT ?? 0) - dt;
      c.flyJumpT = (c.flyJumpT ?? 0) - dt;
      // presa! (bocca o corpo vicino alla mosca, anche in volo durante il salto)
      if (this.state !== 'dead' && (c.mouth.distanceTo(this.pos) < RADIUS + 0.03 || c.center.distanceTo(this.pos) < RADIUS + 0.035)) {
        this.explode();
        c.sfx?.nom();
        c.flyCatches = (c.flyCatches || 0) + 1;
        if (c.free) c.happy();
        continue;
      }
      if (this.state === 'dead' || !c.free || c.flyT > 0) continue;
      if (c.target && ['goto', 'come'].includes(c.mode)) continue;
      c.flyT = 0.22;
      const dx = this.pos.x - c.pos.x, dz = this.pos.z - c.pos.z;
      const dh = Math.hypot(dx, dz), up = this.pos.y - c.pos.y;
      // abbastanza vicina: GRANDE salto verso la mosca (poi plana giu')
      if (c.flyJumpT <= 0 && dh < 0.6 && up > -0.05 && up < 1.0) {
        const aim = this.pos.clone().addScaledVector(this.vel, 0.25);  // mira un po' avanti
        if (c.canJump(c.pos, aim)) {
          c.flyJumpT = 1.0 + Math.random() * 0.8;
          c.startJump(aim, 0.12 + Math.max(0, up) * 0.35);
          c.sfx?.squeak(1.35);
          continue;
        }
      }
      // altrimenti corre sotto la mosca
      const g = this.room.groundBelow(this.pos, 0, 3);
      if (g && g.normal.y > 0.6) c.setTarget(g.point, 'flyhunt');
    }
    return this.state !== 'dead';
  }
}
