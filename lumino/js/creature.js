// Lumino: comportamento e movimento sulla geometria della stanza.
// Stati: spawn, idle, walk, climb, mantle, jump, land, happy, sleep.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

const SPEED = { wander: 0.28, goto: 0.46, come: 0.52, follow: 0.6, game: 0.44, cat: 0.5, play: 0.42, chase: 0.52, cuddle: 0.3,
  flee: 0.5, hunt: 0.3, escape: 0.22, flyhunt: 0.6 };
// modalita' senza versetto quando parte (autonome o ripetute di continuo)
const QUIET_MODES = ['wander', 'follow', 'game', 'cat', 'play', 'chase', 'cuddle', 'flee', 'hunt', 'escape', 'flyhunt'];
// stati in cui Lumino "sta provando ad andare da qualche parte" (in idle/sleep/in mano e' fermo per scelta)
const MOVING_STATES = ['walk', 'climb', 'mantle', 'jump', 'fall', 'land'];
const CLIMB_SPEED = 0.2;
const STEP_UP = 0.06;      // gradino superabile camminando
const TURN_RATE = 9;       // rad/s

function horiz(v, out = new THREE.Vector3()) {
  out.set(v.x, 0, v.z);
  const l = out.length();
  return l > 1e-6 ? out.divideScalar(l) : out.set(0, 0, 1);
}

function basisQuat(up, fwd, out) {
  const z = _v3.copy(fwd).addScaledVector(up, -fwd.dot(up));
  if (z.lengthSq() < 1e-8) z.set(0, 0, 1).addScaledVector(up, -up.z);
  z.normalize();
  const x = _v2.crossVectors(up, z).normalize();
  _m.makeBasis(x, up, z);
  return out.setFromRotationMatrix(_m);
}

export class Creature {
  // opts: { name, hue (colore orme), scale, speed (moltiplicatore), centerH (altezza del centro), footprints }
  constructor(scene, room, opts = {}) {
    this.speedMul = opts.speed ?? 1;
    this.centerH = opts.centerH ?? 0.06;
    this.footprints = opts.footprints ?? true;
    this.name = opts.name || 'Lumino';
    this.hue = opts.hue ?? 0.47;
    this.baseScale = opts.scale ?? 1;
    this.enabled = true;
    this.room = room;
    this.root = new THREE.Group();
    this.root.visible = false;
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.heading = new THREE.Vector3(0, 0, 1);
    this.surfaceN = UP.clone();
    this.wallN = new THREE.Vector3();
    this.state = 'hidden';
    this.stateTime = 0;
    this.target = null;
    this.mode = 'wander';
    this.onArrive = null;
    this.idleTimer = 2;
    this.avoidDir = new THREE.Vector3();
    this.avoidT = 0;
    this.failCount = 0;
    this.stuck = { t: 0, best: Infinity, count: 0 };
    this.qTarget = new THREE.Quaternion();
    this.petCooldown = 0;
    this.sfx = null;
    this.fx = null;
    this.userPos = new THREE.Vector3(0, 1.6, 0);
    this.stepPhase = 0;
    this.jumpCheck = 0;
    this.idleCount = 0;
    this.autoWander = true;   // falso in "seguimi" e nel mini gioco
    this.hands = [];          // mani tracciate (aggiornate da main.js): superfici e ostacoli
    this.handId = -1;
    this.handHappy = 0;
    this.perchT = 0;
    this.supportT = 0;
    this.lastGroundKind = null;
    this.onStuck = null;      // callback: Lumino e' incastrato davvero
    this.watch = { pos: new THREE.Vector3(), t: 0, goalT: 0, goalBest: Infinity, loops: 0 };
  }

  // Incastrato = sta cercando di muoversi ma non avanza:
  //  - resta nello stesso punto (entro 8 cm) per 6 s mentre cammina/si arrampica/cade, oppure
  //  - ha un obiettivo ma in 15 s non si e' avvicinato di almeno 10 cm (gira a vuoto).
  checkStuck(dt) {
    const w = this.watch;
    if (!MOVING_STATES.includes(this.state)) {
      w.pos.copy(this.pos); w.t = 0; w.goalT = 0; w.goalBest = Infinity;
      return;
    }
    w.t += dt;
    if (this.pos.distanceTo(w.pos) > 0.08) { w.pos.copy(this.pos); w.t = 0; }
    if (this.target) {
      const d = this.target.distanceTo(this.pos);
      if (d < w.goalBest - 0.1) { w.goalBest = d; w.goalT = 0; }
      w.goalT += dt;
    } else { w.goalT = 0; w.goalBest = Infinity; }
    if (w.t > 6 || w.goalT > 15) {
      w.t = 0; w.goalT = 0; w.goalBest = Infinity;
      this.onStuck?.();
    }
  }

  // riporta Lumino in un punto sicuro (reset dal menu' o automatico)
  respawn(p, faceTo) {
    this.clearTarget();
    this.handId = -1;
    this.failCount = 0;
    this.avoidT = 0;
    this.watch.t = 0; this.watch.goalT = 0; this.watch.goalBest = Infinity;
    this.surfaceN.copy(UP);
    this.spawn(p, faceTo);
  }

  // puo' ricevere nuovi obiettivi (non e' in mano, in volo o in arrampicata)
  get free() { return ['idle', 'walk', 'happy', 'land', 'sleep'].includes(this.state); }
  get mouth() { return _v.copy(this.center).addScaledVector(this.heading, 0.075).addScaledVector(UP, 0.02); }

  // un modello caricato una volta sola e riusato (clonato) da piu' istanze, es. i ragni
  static loadAsset(url) {
    Creature._assets ||= {};
    return (Creature._assets[url] ||= new GLTFLoader().loadAsync(url));
  }

  // tint: { NomeMateriale: colore } per ricolorare questa istanza
  async load(url, tint = null) {
    const gltf = await Creature.loadAsset(url);
    this.model = cloneSkinned(gltf.scene);
    if (tint) this.model.traverse(o => {
      if (!o.isMesh || !tint[o.material.name]) return;
      const name = o.material.name;
      o.material = o.material.clone();
      o.material.color.set(tint[name]);
      if (name === 'Macchie') o.material.emissive.set(tint[name]);
    });
    this.model.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
      if (o.material?.emissive && o.material.emissiveIntensity > 1) o.material.emissiveIntensity = 1.6;
    });
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of gltf.animations) {
      const a = this.mixer.clipAction(clip);
      if (clip.name === 'Happy') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions[clip.name] = a;
    }
    this.current = null;
  }

  get center() { return _v.set(0, this.centerH, 0).applyMatrix4(this.root.matrixWorld); }
  get busy() { return ['climb', 'mantle', 'jump'].includes(this.state); }

  play(name, fade = 0.2, timeScale = 1) {
    const a = this.actions[name];
    if (!a) return;
    a.timeScale = timeScale;
    if (this.current === a) return;
    a.reset().setEffectiveWeight(1).play();
    if (this.current) this.current.crossFadeTo(a, fade, false);
    this.current = a;
  }

  setState(s) { this.state = s; this.stateTime = 0; }

  // ------------------------------------------------------------ comandi
  spawn(p, faceTo) {
    this.pos.copy(p);
    horiz(_v.subVectors(faceTo, p), this.heading);
    basisQuat(UP, this.heading, this.root.quaternion);
    this.root.position.copy(p);
    this.root.scale.setScalar(0.01 * this.baseScale);
    this.root.visible = true;
    this.setState('spawn');
    this.play('Happy', 0);
    this.sfx?.pop();
  }

  setTarget(p, mode = 'goto', onArrive = null) {
    this.target = p.clone();
    this.mode = mode;
    this.onArrive = onArrive;
    this.failCount = 0;
    this.exits = 0;
    this.stuck = { t: 0, best: Infinity, count: 0 };
    this.watch.goalT = 0; this.watch.goalBest = Infinity;
    if (this.state === 'sleep') this.sfx?.squeak(1.2);
    if (['idle', 'sleep', 'happy', 'land'].includes(this.state)) this.setState('walk');
    if (!QUIET_MODES.includes(mode)) this.sfx?.squeak(1);
  }

  clearTarget() { this.target = null; this.onArrive = null; }

  // ------------------------------------------------------------ presa con la mano
  grab() {
    if (['hidden', 'spawn', 'held'].includes(this.state)) return false;
    this.handId = -1;
    this.setState('held');
    this.holdHist = [];
    this.surfaceN.copy(UP);
    this.sfx?.squeak(1.35);
    return true;
  }

  // p = punto della presa (pizzico o controller): Lumino penzola appena sotto
  holdAt(p, dt, time, offset = 0.085) {
    if (this.state !== 'held') return;
    _v.copy(p).addScaledVector(UP, -offset);
    this.pos.lerp(_v, 1 - Math.exp(-dt * 25));
    this.holdHist.push({ p: p.clone(), t: time });
    while (this.holdHist.length > 2 && time - this.holdHist[0].t > 0.12) this.holdHist.shift();
  }

  release() {
    if (this.state !== 'held') return;
    const h = this.holdHist, v = new THREE.Vector3();
    if (h.length >= 2) {
      const a = h[0], b = h[h.length - 1];
      if (b.t > a.t) v.subVectors(b.p, a.p).divideScalar(b.t - a.t);
    }
    const hv = Math.hypot(v.x, v.z);
    if (hv > 1.2) { v.x *= 1.2 / hv; v.z *= 1.2 / hv; }
    v.y = Math.min(v.y, 0.8);
    this.startFall(v);
    this.sfx?.squeak(1.1);
  }

  startFall(vel) {
    this.fallVel = vel.clone();
    this.handId = -1;
    this.setState('fall');
  }

  // ------------------------------------------------------------ mani come superfici
  // h: { id, tracked, center, up (normale verso l'alto della superficie mano), surf, palmUp, points[], vel }
  handById(id) { return this.hands.find(h => h.id === id && h.tracked); }

  perch(h) {
    this.handId = h.id;
    h.occupant = this;
    this.setState('onHand');
    this.pos.copy(h.surf);
    this.surfaceN.copy(h.up);
    this.sfx?.squeak(1.25);
    this.fx?.hearts(_v.copy(h.surf).addScaledVector(UP, 0.1), 2);
  }

  onHandStep(dt) {
    const h = this.handById(this.handId);
    if (!h) { this.startFall(new THREE.Vector3()); return; }
    if (h.up.y < 0.35) { this.startFall(h.vel); this.sfx?.squeak(1.1); return; } // mano inclinata: scivola via
    this.pos.lerp(h.surf, 1 - Math.exp(-dt * 30));
    this.surfaceN.lerp(h.up, 1 - Math.exp(-dt * 15)).normalize();
    this.turnToward(horiz(_v.subVectors(this.userPos, this.pos)), dt, 2.5);
    this.handHappy -= dt;
  }

  // palmo aperto verso l'alto vicino a lui: ci salta sopra
  // su un palmo ci sta uno solo: l'altro personaggio ci e' gia' seduto?
  // (conta anche chi ci sta gia' saltando sopra)
  handTaken(h) {
    const o = h.occupant;
    return !!o && o !== this && ((o.state === 'onHand' && o.handId === h.id) || (o.state === 'jump' && o.jump?.toHand === h.id));
  }

  perchCandidate() {
    for (const h of this.hands) {
      if (!h.tracked || !h.palmUp || h.vel.length() > 0.35 || this.handTaken(h)) continue;
      const dh = Math.hypot(h.surf.x - this.pos.x, h.surf.z - this.pos.z), dy = h.surf.y - this.pos.y;
      if (dh < 0.35 && dy > 0.02 && dy < 1.3) return h;
    }
    return null;
  }

  tryPerch(dt) {
    const h = this.perchCandidate();
    if (!h) { this.perchT = 0; return false; }
    this.perchT += dt;
    if (this.perchT < 0.45) return false;
    this.perchT = 0;
    this.startJump(h.surf, 0.06);
    this.jump.toHand = h.id;
    h.occupant = this;   // prenotata
    return true;
  }

  // atterraggio su una mano durante la caduta ("lo fermo mettendo la mano")
  catchByHand() {
    for (const h of this.hands) {
      if (!h.tracked || h.up.y < 0.5 || this.handTaken(h)) continue;
      _v.subVectors(this.pos, h.surf);
      const along = _v.dot(h.up);
      const lateral = _v.addScaledVector(h.up, -along).length();
      if (lateral < 0.065 && along < 0.035 && along > -0.06) { this.perch(h); return true; }
    }
    return false;
  }

  // mano (non a palmo in su) davanti: ostacolo da aggirare
  handBlocking(next) {
    for (const h of this.hands) {
      if (!h.tracked) continue;
      for (const p of h.points) {
        const dy = p.y - next.y;
        if (dy < -0.02 || dy > 0.045) continue; // solo mani appoggiate in basso: se lo stai per prendere non scappa
        if (Math.hypot(p.x - next.x, p.z - next.z) < 0.05) return { h, p };
      }
    }
    return null;
  }

  // planata con le ali: velocita' di discesa limitata, slancio orizzontale smorzato
  fallStep(dt) {
    if (this.catchByHand()) return;
    const v = this.fallVel;
    v.y = Math.max(v.y - 3 * dt, -0.38);
    const damp = Math.exp(-dt * 1.4);
    v.x *= damp; v.z *= damp;
    const hl = Math.hypot(v.x, v.z) * dt;
    if (hl > 1e-5) {
      const dir = _v2.set(v.x, 0, v.z).normalize();
      const w = this.room.raycast(_v3.copy(this.pos).addScaledVector(UP, 0.05), dir, hl + 0.04);
      if (w && w.normal.y < 0.5) { v.x = 0; v.z = 0; }
      else this.turnToward(dir, dt, 4);
    }
    const dy = v.y * dt;
    if (dy <= 0) {
      const g = this.room.raycast(_v3.copy(this.pos).addScaledVector(UP, 0.02), DOWN, 0.03 - dy);
      if (g && g.normal.y > 0.5) {
        this.pos.copy(g.point);
        this.surfaceN.copy(g.normal);
        this.lastGroundKind = g.kind;
        this.sfx?.land();
        this.trackFeet(0.04, g.normal, this.heading);
        this.trackFeet(0.04, g.normal, this.heading);
        this.setState('land');
        return;
      }
      if (g) { v.x += g.normal.x * 0.3; v.z += g.normal.z * 0.3; } // scivola via da superfici ripide
    }
    this.pos.x += v.x * dt; this.pos.y += dy; this.pos.z += v.z * dt;
    // sicurezza: mai sotto il pavimento
    if (this.pos.y < this.room.floorY - 0.3 || this.stateTime > 10) {
      const g = this.room.groundBelow(_v3.set(this.pos.x, this.room.floorY + 2, this.pos.z), 0, 4);
      this.pos.y = g ? g.point.y : this.room.floorY;
      this.setState('land');
    }
  }

  pet() {
    if (this.petCooldown > 0 || ['hidden', 'spawn', 'held', 'fall'].includes(this.state)) return false;
    this.petCooldown = 1.6;
    if (this.state === 'onHand') {
      // coccole mentre e' in mano: saltella felice ma resta li'
      this.handHappy = 1.25;
      this.actions.Happy?.reset().play();
      this.sfx?.happy();
      this.fx?.hearts(_v.copy(this.center).addScaledVector(UP, 0.05));
      return true;
    }
    if (this.busy) { this.sfx?.squeak(1.3); return true; }
    this.target = null;
    this.happy();
    return true;
  }

  happy() {
    this.setState('happy');
    const a = this.actions.Happy;
    if (this.current === a) a.reset().play(); else this.play('Happy', 0.12);
    this.sfx?.happy();
    this.fx?.hearts(_v.copy(this.center).addScaledVector(UP, 0.05));
  }

  // ------------------------------------------------------------ ciclo principale
  update(dt, userPos) {
    if (this.state === 'hidden' || !this.mixer) return;
    this.userPos.copy(userPos);
    this.stateTime += dt;
    this.petCooldown -= dt;
    this.checkStuck(dt);
    let speedAnim = 1;

    // niente piu' "a mezz'aria": se sotto non c'e' niente, cade planando
    if (['idle', 'happy', 'sleep', 'land', 'walk'].includes(this.state)) {
      this.supportT -= dt;
      if (this.supportT <= 0) {
        this.supportT = 0.25;
        const g = this.room.groundBelow(this.pos, 0.03, 3);
        if (!g || this.pos.y - g.point.y > 0.035 || g.normal.y < 0.45) this.startFall(new THREE.Vector3());
      }
    }

    switch (this.state) {
      case 'spawn': {
        const k = Math.min(1, this.stateTime / 0.45);
        this.root.scale.setScalar(this.baseScale * (k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.25 * Math.sin(k * Math.PI)) : 1));
        if (k >= 1) this.toIdle();
        break;
      }
      case 'idle': this.idleStep(dt); break;
      case 'sleep':
        if (Math.floor(this.stateTime / 1.8) !== Math.floor((this.stateTime - dt) / 1.8)) {
          this.sfx?.snore();
          this.fx?.zzz(_v.copy(this.center).addScaledVector(UP, 0.04));
        }
        if (this.stateTime > this.sleepFor) { this.sfx?.squeak(0.9); this.toIdle(); }
        break;
      case 'happy':
        if (this.stateTime > 1.25) this.target ? this.setState('walk') : this.toIdle();
        break;
      case 'walk': speedAnim = this.walkStep(dt); break;
      case 'climb': this.climbStep(dt); break;
      case 'mantle': this.mantleStep(dt); break;
      case 'jump': this.jumpStep(dt); break;
      case 'held':
        this.turnToward(horiz(_v.subVectors(this.userPos, this.pos)), dt, 3);
        if (Math.floor(this.stateTime / 2.2) !== Math.floor((this.stateTime - dt) / 2.2)) this.sfx?.squeak(1.2);
        break;
      case 'fall': this.fallStep(dt); break;
      case 'onHand': this.onHandStep(dt); break;
      case 'land':
        if (this.stateTime > 0.12) this.afterMove();
        break;
    }

    // animazione
    const anim = { idle: 'Idle', spawn: 'Happy', sleep: 'Sleep', happy: 'Happy', walk: 'Run',
      climb: 'Climb', mantle: 'Climb', jump: 'Jump', land: 'Idle', held: 'Jump', fall: 'Jump',
      onHand: this.handHappy > 0 ? 'Happy' : 'Idle' }[this.state];
    this.play(anim, this.state === 'jump' ? 0.08 : 0.2);
    if (this.state === 'walk' && this.actions.Run) this.actions.Run.timeScale = speedAnim;
    if (this.actions.Jump) this.actions.Jump.timeScale = this.state === 'held' ? 0.55 : this.state === 'fall' ? 0.8 : 1;
    this.mixer.update(dt);

    // orientamento
    if (this.state === 'climb') basisQuat(this.wallN, UP, this.qTarget);
    else if (this.state === 'mantle') {
      const s = Math.min(1, this.mantle.t / this.mantle.T);
      basisQuat(this.wallN, UP, _q);
      basisQuat(UP, this.heading, this.qTarget);
      this.qTarget.slerpQuaternions(_q, this.qTarget, s * s);
    } else if (this.state === 'jump') {
      const vy = this.jump.vy;
      _v.copy(this.heading).addScaledVector(UP, THREE.MathUtils.clamp(vy * 0.35, -0.8, 0.8)).normalize();
      _v2.copy(UP).addScaledVector(this.heading, -THREE.MathUtils.clamp(vy * 0.35, -0.8, 0.8));
      basisQuat(_v2.normalize(), _v, this.qTarget);
    } else if (this.state === 'onHand') {
      basisQuat(this.surfaceN, this.heading, this.qTarget);
    } else {
      const n = this.surfaceN.y > 0.75 ? this.surfaceN : UP;
      basisQuat(n, this.heading, this.qTarget);
    }
    this.root.quaternion.slerp(this.qTarget, 1 - Math.exp(-dt * (this.state === 'climb' ? 18 : 13)));
    this.root.position.copy(this.pos);
    this.root.updateMatrixWorld(true);
  }

  toIdle() {
    this.setState('idle');
    this.idleCount++;
    this.idleTimer = 1.5 + Math.random() * 4;
    this.lookAtUser = Math.random() < 0.6;
  }

  idleStep(dt) {
    if (this.target) { this.setState('walk'); return; }
    if (this.tryPerch(dt)) return;
    if (this.lookAtUser || !this.autoWander) this.turnToward(horiz(_v.subVectors(this.userPos, this.pos)), dt, 2.5);
    this.idleTimer -= dt;
    if (this.idleTimer > 0 || !this.autoWander) return;
    if (this.idleCount > 3 && Math.random() < 0.15) {
      this.idleCount = 0;
      this.sleepFor = 7 + Math.random() * 6;
      this.setState('sleep');
      return;
    }
    const p = this.room.sample(Math.random() < 0.45, this.pos, 3, this.userPos);
    if (p) this.setTarget(p, 'wander');
    else this.idleTimer = 1;
  }

  turnToward(dir, dt, rate = TURN_RATE) {
    const cur = Math.atan2(this.heading.x, this.heading.z);
    const want = Math.atan2(dir.x, dir.z);
    let d = want - cur;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const a = cur + THREE.MathUtils.clamp(d, -rate * dt, rate * dt);
    this.heading.set(Math.sin(a), 0, Math.cos(a));
    return Math.abs(d);
  }

  // ------------------------------------------------------------ camminata
  walkStep(dt) {
    if (!this.target) { this.toIdle(); return 1; }
    const toT = _v.subVectors(this.target, this.pos);
    const dy = toT.y;
    toT.y = 0;
    const dH = toT.length();
    const dist = Math.hypot(dH, dy);

    if (dH < 0.035) {
      if (Math.abs(dy) < 0.07) { this.arrive(); return 1; }
      if (dy > 0 && dy < 1.5) {
        if (this.canJump(this.pos, this.target)) { this.startJump(this.target); return 1; }
        // sotto l'obiettivo ma con qualcosa in mezzo: esci da sotto e riprova
        if (this.avoidT <= 0 && !this.goToExit()) { this.giveUpOrLeap(); return 1; }
      }
      // obiettivo proprio sotto di noi (es. sotto il tavolo): vai al bordo piu' vicino e salta giu'
      else if (dy < 0 && this.avoidT <= 0) {
        const e = this.findEdge();
        if (!e) { this.arrive(); return 1; }
        this.avoidDir.copy(e.dir);
        this.avoidT = e.dist / SPEED[this.mode] + 0.4;
      }
    }

    // controllo blocco
    if (this.stateTime > 25) { this.giveUpOrLeap(); return 1; }
    this.stuck.t += dt;
    if (dist < this.stuck.best - 0.04) { this.stuck.best = dist; this.stuck.t = 0; this.stuck.count = 0; }
    if (this.stuck.t > 1.6) {
      this.stuck.t = 0; this.stuck.count++;
      if (this.stuck.count >= 2) { this.giveUpOrLeap(); return 1; }
    }

    const desired = _v2.copy(toT).divideScalar(dH);
    if (this.avoidT > 0) { this.avoidT -= dt; desired.copy(this.avoidDir); }
    const turn = this.turnToward(desired, dt);
    let base = SPEED[this.mode] * this.speedMul;
    if (this.mode === 'follow' || this.mode === 'cat') base =THREE.MathUtils.clamp(0.35 + dist * 0.4, 0.4, 1.0); // piu' sei lontano, piu' corre
    let speed = base * THREE.MathUtils.clamp(1.2 - turn, 0.25, 1);
    if (dH < 0.15) speed *= 0.5 + dH / 0.3;
    const step = speed * dt;

    // obiettivo in alto e vicino, senza parete da scalare in mezzo (es. piano di un tavolo): salta
    this.jumpCheck -= dt;
    if (dy > 0.07 && dH < 0.9 && this.jumpCheck <= 0) {
      this.jumpCheck = 0.15;
      const eye0 = _v3.copy(this.pos).addScaledVector(UP, 0.035);
      const blocker = this.room.raycast(eye0, desired, dH + 0.02);
      if (!blocker || blocker.normal.y >= 0.55) {
        if (this.canJump(this.pos, this.target)) { this.startJump(this.target); return 1; }
        if (this.avoidT <= 0 && this.room.raycast(_v3.copy(this.pos).addScaledVector(UP, 0.12), UP, dy)) {
          // siamo sotto il tavolo: usciamo per prendere la rincorsa
          this.goToExit();
        }
      }
    }

    // ostacolo davanti?
    const eye = _v3.copy(this.pos).addScaledVector(UP, 0.035);
    const wall = this.room.raycast(eye, this.heading, 0.06 + step);
    if (wall && wall.normal.y < 0.55) {
      if (dy > 0.07) {
        if (wall.distance < 0.045) {
          if (this.failCount >= 2) { this.giveUpOrLeap(); return 1; }
          this.startClimb(wall); return 1;
        }
      } else {
        const n = horiz(wall.normal, new THREE.Vector3());
        const slide = this.heading.clone().addScaledVector(n, -this.heading.dot(n));
        if (slide.lengthSq() < 0.04) {
          slide.set(-n.z, 0, n.x);
          if (slide.dot(toT) < 0) slide.negate();
        }
        this.avoidDir.copy(slide.normalize());
        this.avoidT = 0.45;
        if (wall.distance < 0.03) return 0.8;
      }
    }

    // terreno davanti
    const next = new THREE.Vector3().copy(this.pos).addScaledVector(this.heading, step);
    // la tua mano e' un ingombro: se e' a palmo in su ci sale, altrimenti la aggira
    const hb = this.handBlocking(next);
    if (hb) {
      this.watch.t = 0; this.watch.goalT = 0; // fermo per colpa tua, non incastrato
      if (hb.h.palmUp && hb.h.surf.y - this.pos.y < 0.2) {
        if (this.handTaken(hb.h)) { this.bounceBack(); return 0.8; }
        this.startJump(hb.h.surf, 0.05);
        this.jump.toHand = hb.h.id;
        hb.h.occupant = this;
        return 1;
      }
      const away = horiz(_v3.subVectors(this.pos, hb.p), new THREE.Vector3());
      this.avoidDir.copy(away).applyAxisAngle(UP, away.dot(_v3.set(-toT.z, 0, toT.x)) > 0 ? 0.9 : -0.9);
      this.avoidT = 0.4;
      return 0.8;
    }
    if (this.room.raycast(_v3.copy(next).addScaledVector(UP, 0.02), UP, 0.1)) { this.bounceBack(); return 0.8; }
    const g = this.room.groundBelow(next, STEP_UP + 0.005, 4);
    if (!g) { this.bounceBack(); return 1; }
    const drop = this.pos.y - g.point.y;
    if (drop <= STEP_UP && g.normal.y > 0.5) {
      this.pos.set(next.x, g.point.y, next.z);
      this.lastGroundKind = g.kind;
      this.surfaceN.lerp(g.normal, Math.min(1, dt * 12)).normalize();
      this.stepPhase += dt * speed * 22;
      if (this.stepPhase > 1) { this.stepPhase -= 1; this.sfx?.step(); }
      this.trackFeet(step, g.normal, this.heading);
    } else if (g.normal.y <= 0.5) {
      this.bounceBack();
    } else {
      // bordo: saltare giu' o attraversare?
      if (dy >= -0.07 && dH < 0.7 && this.canJump(this.pos, this.target)) {
        this.startJump(this.target);  // balzo diretto verso l'obiettivo
        return 1;
      }
      const land = this.room.groundBelow(_v3.copy(this.pos).addScaledVector(this.heading, 0.13), 0.02, 2);
      if (land && this.pos.y - land.point.y < 1.7 && land.normal.y > 0.6) { this.startJump(land.point); return 1; }
      this.bounceBack();
    }
    return 0.6 + speed * 2.3;
  }

  // Punto vicino con il cielo libero fino all'altezza dell'obiettivo (per uscire da sotto un tavolo).
  goToExit() {
    if (!this.target || (this.exits = (this.exits || 0) + 1) > 4) return false;
    const h = this.target.y - this.pos.y;
    const p = new THREE.Vector3(), o = new THREE.Vector3();
    let best = null;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      for (let s = 0.05; s < 1.6; s += 0.05) {
        p.copy(this.pos).addScaledVector(dir, s);
        const g = this.room.groundBelow(p, STEP_UP, 0.2);
        if (!g || Math.abs(g.point.y - this.pos.y) > STEP_UP) break;
        if (this.room.raycast(o.copy(p).addScaledVector(UP, 0.02), dir, 0.06)) break;
        if (!this.room.raycast(o.copy(g.point).addScaledVector(UP, 0.12), UP, h + 0.2)) {
          if (!best || s < best.dist) best = { dir, dist: s + 0.12 };
          break;
        }
      }
    }
    if (!best) return false;
    this.avoidDir.copy(best.dir);
    this.avoidT = best.dist / SPEED[this.mode] + 0.25;
    this.stuck = { t: 0, best: Infinity, count: 0 };
    return true;
  }

  findEdge() {
    let best = null;
    const p = new THREE.Vector3();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      for (let s = 0.04; s < 1.2; s += 0.04) {
        p.copy(this.pos).addScaledVector(dir, s);
        const g = this.room.groundBelow(p, STEP_UP, 3);
        if (!g || this.pos.y - g.point.y > 0.1) {
          if (!best || s < best.dist) best = { dir, dist: s };
          break;
        }
        if (g.point.y - this.pos.y > STEP_UP) break; // muro/ostacolo
      }
    }
    return best;
  }

  bounceBack() {
    this.avoidDir.copy(this.heading).negate().applyAxisAngle(UP, (Math.random() - 0.5) * 1.5);
    this.avoidT = 0.5;
  }

  giveUpOrLeap() {
    this.failCount++;
    const d = this.target ? this.target.distanceTo(this.pos) : 99;
    if (this.target && d < 1.3 && this.failCount <= 3 && this.canJump(this.pos, this.target)) {
      this.startJump(this.target);
      return;
    }
    if (this.target && this.failCount <= 4 && this.goToExit()) return;
    // obiettivo irraggiungibile
    this.target = null; this.onArrive = null;
    this.sfx?.squeak(0.8);
    this.toIdle();
  }

  arrive() {
    const cb = this.onArrive, mode = this.mode;
    this.target = null; this.onArrive = null;
    // la callback puo' rispondere false: es. la bacca l'ha gia' mangiata l'altro
    if (cb?.() === false) { this.disappointed(); return; }
    if (mode === 'goto' || mode === 'come') this.happy();
    else this.toIdle();
  }

  // "uffa": arrivato tardi
  disappointed() {
    this.sfx?.squeak(0.72);
    this.toIdle();
    this.idleTimer = 2 + Math.random() * 2;
    this.lookAtUser = true;
  }

  afterMove() {
    if (!this.target) { this.toIdle(); return; }
    const d = _v.subVectors(this.target, this.pos);
    if (Math.hypot(d.x, d.z) < 0.05 && Math.abs(d.y) < 0.08) this.arrive();
    else this.setState('walk');
  }

  // ------------------------------------------------------------ arrampicata
  startClimb(hit) {
    horiz(hit.normal, this.wallN);
    this.pos.x = hit.point.x + this.wallN.x * 0.006;
    this.pos.z = hit.point.z + this.wallN.z * 0.006;
    this.pos.y += 0.015;
    this.climbStartY = this.pos.y;
    const need = this.target ? this.target.y - this.pos.y : 0.8;
    this.climbMax = THREE.MathUtils.clamp(need + 0.3, 0.25, 1.9);
    this.heading.copy(this.wallN).negate();
    this.setState('climb');
    this.sfx?.squeak(1.1);
  }

  // Orme alternate sinistra/destra ogni pochi centimetri percorsi.
  trackFeet(dist, normal, fwd) {
    if (!this.fx || !this.footprints) return;
    this.footDist = (this.footDist || 0) + dist;
    if (this.footDist < 0.034) return;
    this.footDist = 0;
    this.footSide = -(this.footSide || 1);
    const side = _v2.crossVectors(normal, fwd).normalize().multiplyScalar(0.011 * this.footSide);
    this.fx.footprint(_v3.copy(this.pos).add(side), normal, fwd, this.hue);
  }

  climbStep(dt) {
    this.pos.y += CLIMB_SPEED * dt;
    this.trackFeet(CLIMB_SPEED * dt, this.wallN, UP);
    if (Math.floor(this.stateTime * 6) !== Math.floor((this.stateTime - dt) * 6)) this.sfx?.scratch();

    // soffitto / sporgenza sopra?
    const o = _v3.copy(this.pos).addScaledVector(this.wallN, 0.035);
    if (this.room.raycast(o, UP, 0.11)) { this.letGo(); return; }
    if (this.pos.y - this.climbStartY > this.climbMax) { this.letGo(); return; }

    const probe = new THREE.Vector3().copy(this.pos).addScaledVector(this.wallN, 0.05);
    probe.y += 0.03;
    const h = this.room.raycast(probe, _v2.copy(this.wallN).negate(), 0.1);
    if (h && h.normal.y < 0.6) {
      const n = horiz(h.normal, new THREE.Vector3());
      this.wallN.lerp(n, Math.min(1, dt * 10)).normalize();
      this.pos.x = h.point.x + this.wallN.x * 0.006;
      this.pos.z = h.point.z + this.wallN.z * 0.006;
      return;
    }
    // finita la parete: cerca la superficie sopra
    const topO = new THREE.Vector3().copy(this.pos).addScaledVector(this.wallN, -0.07);
    topO.y += 0.16;
    const top = this.room.raycast(topO, DOWN, 0.3);
    if (top && top.normal.y > 0.6 && top.point.y > this.pos.y - 0.06) this.startMantle(top.point);
    else this.letGo();
  }

  letGo() {
    const o = new THREE.Vector3().copy(this.pos).addScaledVector(this.wallN, 0.1);
    const land = this.room.groundBelow(o, 0.02, 3);
    this.failCount++;
    this.sfx?.squeak(0.85);
    this.heading.copy(this.wallN);
    if (land) this.startJump(land.point, 0.03);
    else { this.pos.addScaledVector(this.wallN, 0.05); this.afterMove(); }
  }

  startMantle(p) {
    this.mantle = { from: this.pos.clone(), to: p.clone(), t: 0, T: 0.32 };
    this.heading.copy(this.wallN).negate();
    this.setState('mantle');
  }

  mantleStep(dt) {
    const m = this.mantle;
    m.t += dt;
    const s = Math.min(1, m.t / m.T);
    this.pos.lerpVectors(m.from, m.to, s);
    this.pos.y = THREE.MathUtils.lerp(m.from.y, m.to.y, Math.min(1, s * 1.6)) + Math.sin(s * Math.PI) * 0.01;
    if (s >= 1) {
      this.pos.copy(m.to);
      this.surfaceN.copy(UP);
      this.failCount = 0;
      this.afterMove();
    }
  }

  // ------------------------------------------------------------ salto
  jumpArc(from, to) {
    const d = Math.hypot(to.x - from.x, to.z - from.z), dy = to.y - from.y;
    return 0.06 + Math.max(0, dy) * 0.18 + d * 0.18;
  }

  // Punto della traiettoria: verso l'alto prima sale e poi avanza, verso il basso il contrario.
  static pathAt(from, to, arc, s, out) {
    const dy = to.y - from.y;
    const hs = dy > 0.15 ? s * s : dy < -0.15 ? 1 - (1 - s) * (1 - s) : s;
    const vs = dy > 0.15 ? 1 - (1 - s) * (1 - s) : dy < -0.15 ? s * s : s;
    out.x = from.x + (to.x - from.x) * hs;
    out.z = from.z + (to.z - from.z) * hs;
    out.y = from.y + dy * vs + arc * 4 * s * (1 - s);
    return out;
  }

  // La traiettoria del salto e' libera da ostacoli?
  canJump(from, to) {
    const arc = this.jumpArc(from, to), N = 12;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
    const at = (s, out) => Creature.pathAt(from, to, arc, s, out).addScaledVector(UP, 0.04);
    at(0, a);
    for (let i = 1; i <= N; i++) {
      at(i / N, b);
      dir.subVectors(b, a);
      const len = dir.length();
      const h = this.room.raycast(a, dir.divideScalar(len), len);
      if (h && !(h.point.distanceTo(to) < 0.08 && h.normal.y > 0.5)) return false;
      a.copy(b);
    }
    return true;
  }

  startJump(to, arcMin = 0.05) {
    const from = this.pos.clone();
    const d = Math.hypot(to.x - from.x, to.z - from.z), dy = to.y - from.y;
    const T = THREE.MathUtils.clamp(0.28 + 0.4 * Math.sqrt(d * d + dy * dy), 0.28, 1.1);
    const arc = Math.max(arcMin, this.jumpArc(from, to));
    if (d > 0.01) horiz(_v.subVectors(to, from), this.heading);
    this.jump = { from, to: to.clone(), T, arc, t: 0, vy: 0 };
    this.setState('jump');
    this.sfx?.boing();
  }

  jumpStep(dt) {
    const j = this.jump;
    j.t += dt;
    const s = Math.min(1, j.t / j.T);
    const prevY = this.pos.y;
    let hand = null;
    if (j.toHand !== undefined) {
      hand = this.handById(j.toHand);
      if (hand) j.to.lerp(hand.surf, 1 - Math.exp(-dt * 12)); // la mano si muove: la inseguo
    }
    Creature.pathAt(j.from, j.to, j.arc, s, this.pos);
    j.vy = (this.pos.y - prevY) / Math.max(dt, 1e-3);
    if (s >= 1) {
      this.pos.copy(j.to);
      if (j.toHand !== undefined) {
        if (hand && hand.surf.distanceTo(this.pos) < 0.12 && !this.handTaken(hand)) this.perch(hand);
        else this.startFall(new THREE.Vector3());
        return;
      }
      const g = this.room.groundBelow(this.pos, 0.03, 0.12);
      if (!g) { this.startFall(new THREE.Vector3()); return; } // niente sotto: plana giu'
      this.surfaceN.copy(g.normal);
      this.pos.y = g.point.y;
      this.lastGroundKind = g.kind;
      this.sfx?.land();
      this.setState('land');
    }
  }
}
