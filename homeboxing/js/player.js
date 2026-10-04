// Il giocatore: due guantoni rossi che seguono le mani (hand tracking) o i controller.
// Ogni guantone conosce posizione del pugno, velocita' e "punta" per capire i colpi.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

// Sezioni del guantone lungo l'asse -Z (dal polsino alla punta): [z, semiasse trasversale, semiasse dorso/palmo]
const PROFILE = [[0.12, 0.044, 0.038], [0.105, 0.045, 0.039], [0.08, 0.046, 0.040], [0.062, 0.047, 0.041],
  [0.042, 0.048, 0.042], [0.02, 0.050, 0.044], [0.0, 0.053, 0.047], [-0.025, 0.060, 0.052],
  [-0.055, 0.066, 0.057], [-0.09, 0.068, 0.059], [-0.12, 0.067, 0.058], [-0.145, 0.063, 0.054],
  [-0.163, 0.055, 0.047], [-0.175, 0.042, 0.036], [-0.182, 0.024, 0.020], [-0.185, 0.0, 0.0]];

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// Profilo interpolato (piu' sezioni = superficie piu' liscia)
function profileAt(t) {
  const n = PROFILE.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, k = u * u * (3 - 2 * u);
  return PROFILE[i].map((v, j) => v + (PROFILE[i + 1][j] - v) * k);
}

// Disegno del guantone (mappa in coordinate u = giro attorno, v = dal polsino alla punta)
function gloveTexture(color) {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), red = '#' + new THREE.Color(color).getHexString();
  const vy = v => H * (1 - v);                       // v -> riga del canvas (la texture e' capovolta)
  const vz = z => (0.12 - z) / 0.305;                // z del profilo -> v
  g.fillStyle = red; g.fillRect(0, 0, W, H);
  // polsino bianco con banda rossa
  g.fillStyle = '#f2f2ee'; g.fillRect(0, vy(vz(-0.01)), W, vy(vz(0.12)) - vy(vz(-0.01)));
  g.fillStyle = red; g.fillRect(0, vy(vz(0.062)), W, vy(vz(0.042)) - vy(vz(0.062)));
  g.fillStyle = '#d9d9d3'; g.fillRect(0, vy(vz(-0.004)), W, 6);   // cucitura
  // piega delle dita sul palmo (u ~ 0.75) e cucitura lungo i fianchi
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 7;
  g.beginPath(); g.moveTo(W * 0.62, vy(vz(-0.075))); g.quadraticCurveTo(W * 0.75, vy(vz(-0.068)), W * 0.88, vy(vz(-0.075))); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3;
  for (const u of [0.02, 0.48]) { g.beginPath(); g.moveTo(W * u, vy(vz(-0.012))); g.lineTo(W * u, vy(vz(-0.17))); g.stroke(); }
  // scritta bianca sul dorso (u ~ 0.25), leggibile da chi guarda il proprio guantone: specchiata in u
  g.save(); g.translate(W * 0.25, vy(vz(-0.058))); g.scale(-1, 1);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 58px system-ui, sans-serif'; g.fillText('HOME', 0, -34);
  g.font = '900 46px system-ui, sans-serif'; g.fillText('BOXING', 0, 20);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Tubo affusolato lungo una curva (per il pollice), chiuso alle estremita'
function taperedTube(points, radii, seg = 24, rad = 16) {
  const curve = new THREE.CatmullRomCurve3(points), frames = curve.computeFrenetFrames(seg, false);
  const pos = [], idx = [];
  const rAt = t => { const f = t * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(f)); return radii[i] + (radii[i + 1] - radii[i]) * (f - i); };
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i];
    // estremita' arrotondate: il raggio si chiude a semisfera
    const e = Math.min(t, 1 - t) * seg / 3, r = rAt(t) * (e < 1 ? Math.sqrt(Math.max(0.0, 1 - (1 - e) * (1 - e))) : 1);
    for (let k = 0; k < rad; k++) {
      const a = 2 * Math.PI * k / rad;
      pos.push(p.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), p.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y),
        p.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z));
    }
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) {
    const a = i * rad + k, b = i * rad + (k + 1) % rad, c = (i + 1) * rad + (k + 1) % rad, d = (i + 1) * rad + k;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// side: 'left' | 'right'. Locale: -Z verso le nocche, +Y dorso della mano, pollice verso il centro del corpo.
export function makeGloveMesh(side, color = 0xc8101a) {
  const N = 56, R = 40, pos = [], idx = [], uv = [];
  for (let r = 0; r < R; r++) {
    const [z, ax, ay] = profileAt(r / (R - 1));
    const d = -z;                                              // distanza dal polso verso la punta
    for (let k = 0; k <= N; k++) {
      const a = 2 * Math.PI * k / N, ca = Math.cos(a), sa = Math.sin(a);
      let x = ax * ca, y = ay * sa * (sa > 0 ? 1.1 : 0.92);
      y += 0.008 * smoothstep(0.0, 0.05, d) * (1 - smoothstep(0.13, 0.178, d)) * Math.max(0, sa);   // imbottitura sulle nocche
      // dita arricciate: rotolo sotto la punta, con una piega dove finiscono sul palmo
      if (sa < 0) {
        y -= 0.010 * smoothstep(0.08, 0.13, d) * (1 - smoothstep(0.15, 0.185, d)) * -sa;
        y += 0.006 * Math.exp(-((d - 0.072) ** 2) / 0.00006) * -sa;
      }
      pos.push(x, y, z); uv.push(k / N, r / (R - 1));
    }
  }
  for (let r = 0; r < R - 1; r++) for (let k = 0; k < N; k++) {
    const a = r * (N + 1) + k, b = a + 1, c = (r + 1) * (N + 1) + k + 1, d = (r + 1) * (N + 1) + k;
    idx.push(a, d, b, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nr = g.attributes.normal;                      // giunzione liscia dove il giro si chiude
  for (let r = 0; r < R; r++) {
    const a = r * (N + 1), b = a + N;
    _v.set(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize();
    nr.setXYZ(a, _v.x, _v.y, _v.z); nr.setXYZ(b, _v.x, _v.y, _v.z);
  }
  const leather = { roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 };
  const mat = new THREE.MeshPhysicalMaterial({ map: gloveTexture(color), ...leather });
  const glove = new THREE.Group();
  const body = new THREE.Mesh(g, mat); body.castShadow = true; glove.add(body);
  // pollice: curvo e affusolato, appoggiato al fianco interno verso il palmo, punta contro le dita
  const sx = side === 'right' ? -1 : 1;
  const thumb = new THREE.Mesh(taperedTube([
    new THREE.Vector3(sx * 0.036, -0.030, 0.004), new THREE.Vector3(sx * 0.056, -0.028, -0.040),
    new THREE.Vector3(sx * 0.061, -0.030, -0.085), new THREE.Vector3(sx * 0.046, -0.042, -0.122)],
    [0.017, 0.022, 0.021, 0.016]), new THREE.MeshPhysicalMaterial({ color, ...leather }));
  thumb.castShadow = true;
  glove.add(thumb);
  return glove;
}

class Glove {
  constructor(side, scene) {
    this.side = side;
    this.mesh = makeGloveMesh(side);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.center = new THREE.Vector3();      // centro del pugno (sfera dei colpi)
    this.prev = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.radius = 0.075;
    this.active = false;                    // tracciato in questo fotogramma
    this.cooldown = 0;                      // dopo un colpo: aspetta che il braccio torni indietro
    this.contactPoint = new THREE.Vector3();
    this.punchId = 0;                       // cresce a ogni nuova "spinta" in avanti
    this.wasFast = false;
    this.hist = [];                         // posizioni recenti, per capire se il pugno e' partito davvero
    this.clock = 0;
  }

  // velocita' massima negli ultimi 0,25 s (al contatto il pugno sta gia' rallentando)
  peakSpeed() { let m = this.speed; for (const h of this.hist) m = Math.max(m, h.s || 0); return m; }

  // quanto si e' spostato il pugno nella direzione dir negli ultimi 0,25 s
  travel(dir) {
    let best = 0;
    for (const h of this.hist) best = Math.max(best, _v.subVectors(this.center, h.p).dot(dir));
    return best;
  }

  // wrist = polso, fwd = verso le nocche, back = dorso della mano
  setPose(wrist, fwd, back) {
    const z = _a.copy(fwd).negate().normalize();
    const y = _b.copy(back).addScaledVector(z, -back.dot(z)).normalize();
    const x = _c.crossVectors(y, z).normalize();
    _m.makeBasis(x, y, z); _m.setPosition(wrist);
    this.mesh.matrix.copy(_m);
    this.mesh.matrix.decompose(this.mesh.position, this.mesh.quaternion, this.mesh.scale);
    this.center.copy(wrist).addScaledVector(fwd.clone().normalize(), 0.095);
    this.active = true;
  }

  update(dt) {
    // nei pugni veloci il tracciamento delle mani a volte si perde per qualche fotogramma:
    // per 0,12 s il guantone continua per la sua strada invece di "saltare" al bersaglio
    if (!this.active) {
      this.lostT = (this.lostT || 0) + dt;
      if (this.lostT < 0.12 && this.speed > 1.0 && this.mesh.visible) {
        this.center.addScaledVector(this.vel, dt);
        this.mesh.position.addScaledVector(this.vel, dt);
        this.active = true; this.coasting = true;
        return;
      }
    } else { this.lostT = 0; this.coasting = false; }
    this.mesh.visible = this.active;
    if (!this.active) { this.vel.set(0, 0, 0); this.speed = 0; return; }
    if (dt > 0) {
      _v.subVectors(this.center, this.prev).divideScalar(dt);
      if (_v.length() < 25) this.vel.lerp(_v, 0.55);          // scarta i salti del tracciamento
    }
    this.speed = this.vel.length();
    this.clock += dt;
    this.hist.push({ t: this.clock, p: this.center.clone(), s: this.speed });
    while (this.hist.length && this.clock - this.hist[0].t > 0.25) this.hist.shift();
    const fast = this.speed > 0.7;           // inizio di una spinta: serve a Mike per "leggere" il pugno presto
    if (fast && !this.wasFast) this.punchId++;
    this.wasFast = fast;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      // il colpo successivo vale solo quando il pugno si e' allontanato dal punto d'impatto
      if (this.center.distanceTo(this.contactPoint) > 0.16 && this.cooldown < 0.25) this.cooldown = Math.min(this.cooldown, 0.05);
    }
  }

  // segmento percorso in questo fotogramma (contro i colpi troppo veloci che "salterebbero" il bersaglio)
  segment() { return [this.prev, this.center]; }
  endFrame() { this.prev.copy(this.center); this.active = false; }
}

export class Player {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.gloves = { left: new Glove('left', scene), right: new Glove('right', scene) };
    this.head = new THREE.Vector3();
    this.mode = '—';
    this.sources = [];       // {hand, grip, ray, handedness}
    this.fist = { left: false, right: false };   // pugno chiuso (mani) o tasto di presa tenuto (controller): accende il raggio dei menu
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i), grip = renderer.xr.getControllerGrip(i), ray = renderer.xr.getController(i);
      scene.add(hand); scene.add(grip); scene.add(ray);
      const s = { hand, grip, ray, handedness: null, isHand: false, gamepad: null };
      const on = e => { s.handedness = e.data.handedness; s.isHand = !!e.data.hand; s.gamepad = e.data.gamepad || null; };
      const off = () => { s.handedness = null; s.isHand = false; s.gamepad = null; };
      ray.addEventListener('connected', on); ray.addEventListener('disconnected', off);
      this.sources.push(s);
    }
    this.sim = null;
  }

  pulse(side, strength = 0.8, ms = 60) {
    for (const s of this.sources) {
      if (s.handedness !== side || !s.gamepad) continue;
      const h = s.gamepad.hapticActuators && s.gamepad.hapticActuators[0];
      if (h && h.pulse) h.pulse(strength, ms);
    }
  }

  // posizione della testa (centro del viso)
  updateHead() {
    const cam = this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
    cam.getWorldPosition(this.head);
    _q.setFromRotationMatrix(cam.matrixWorld);
    this.head.add(_v.set(0, -0.06, -0.04).applyQuaternion(_q));
    return this.head;
  }

  update(dt) {
    this.updateHead();
    if (this.sim) this.sim.apply(this, dt);
    else {
      const modes = [];
      for (const s of this.sources) {
        if (!s.handedness) continue;
        const g = this.gloves[s.handedness];
        if (s.isHand) {
          const j = s.hand.joints;
          const W = j['wrist'], M = j['middle-finger-phalanx-proximal'], I = j['index-finger-phalanx-proximal'],
            P = j['pinky-finger-phalanx-proximal'];
          if (!W || !M || !I || !P || !W.visible) continue;
          const w = W.getWorldPosition(new THREE.Vector3());
          const fwd = M.getWorldPosition(new THREE.Vector3()).sub(w);
          const iv = I.getWorldPosition(new THREE.Vector3()).sub(w), pv = P.getWorldPosition(new THREE.Vector3()).sub(w);
          const back = s.handedness === 'right' ? new THREE.Vector3().crossVectors(pv, iv) : new THREE.Vector3().crossVectors(iv, pv);
          g.setPose(w, fwd.normalize(), back.normalize());
          // pugno chiuso: le punte di indice, medio e anulare vicine al polso (aperta ~18 cm, chiusa ~9 cm)
          let dsum = 0, nt = 0;
          for (const n of ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip']) { const T = j[n]; if (T && T.visible) { dsum += T.getWorldPosition(new THREE.Vector3()).distanceTo(w); nt++; } }
          if (nt) { const dm = dsum / nt; this.fist[s.handedness] = this.fist[s.handedness] ? dm < 0.13 : dm < 0.11; }   // (isteresi: non sfarfalla)
          modes.push('mani');
        } else {
          if (!s.grip.visible) continue;
          const p = s.grip.getWorldPosition(new THREE.Vector3());
          _q.setFromRotationMatrix(s.ray.matrixWorld);
          const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(_q);
          const back = new THREE.Vector3(0, 1, 0).applyQuaternion(_q);
          g.setPose(p.addScaledVector(fwd, -0.05), fwd, back);
          const b = s.gamepad && s.gamepad.buttons;
          this.fist[s.handedness] = !!(b && b[1] && b[1].pressed);   // tasto laterale di presa
          modes.push('controller');
        }
      }
      this.mode = modes[0] || '—';
    }
    for (const g of Object.values(this.gloves)) g.update(dt);
  }

  // un guantone e' "in guardia" se e' davanti al viso
  guardCovers(point, radius = 0.16) {
    for (const g of Object.values(this.gloves)) {
      if (g.mesh.visible && g.center.distanceTo(point) < radius) return g;
    }
    return null;
  }

  endFrame() { for (const g of Object.values(this.gloves)) g.endFrame(); }
}

// ---------------------------------------------------------------- anteprima su PC (mouse e tastiera)
export class SimInput {
  constructor(camera, dom) {
    this.camera = camera;
    this.mouse = new THREE.Vector2();
    this.base = new THREE.Vector3(0, 1.65, 0);
    this.lean = 0; this.duck = 0; this.forward = 0;
    this.keys = {};
    this.punch = { left: 0, right: 0 };       // tempo della spinta (0 = fermo)
    this.guard = false;
    dom.addEventListener('mousemove', e => {
      this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('mousedown', e => {
      const side = e.button === 2 ? 'right' : 'left';
      if (this.punch[side] === 0) this.punch[side] = 0.0001;
    });
    addEventListener('keydown', e => { this.keys[e.code] = true; if (e.code === 'Space') this.guard = true; });
    addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'Space') this.guard = false; });
  }

  apply(player, dt) {
    const k = this.keys;
    const tl = (k.KeyA ? -1 : 0) + (k.KeyD ? 1 : 0);
    this.lean += (tl * 0.2 - this.lean) * Math.min(1, dt * 12);
    this.duck += ((k.KeyC ? 0.28 : 0) - this.duck) * Math.min(1, dt * 12);
    this.forward += ((k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0)) * dt * 1.2;
    this.forward = Math.max(-0.8, Math.min(0.6, this.forward));
    if (!this.spectator) {
      this.camera.position.set(this.base.x + this.lean, this.base.y - this.duck, this.base.z - this.forward);
      this.camera.rotation.set(-0.08, 0, -this.lean * 0.5);
    }
    player.updateHead();
    const head = new THREE.Vector3(this.base.x + this.lean, this.base.y - this.duck, this.base.z - this.forward);
    for (const side of ['left', 'right']) {
      const sx = side === 'left' ? -1 : 1;
      let w = new THREE.Vector3(head.x + sx * 0.17 + this.mouse.x * 0.12, head.y - 0.25 + this.mouse.y * 0.15, head.z - 0.30);
      let fwd = new THREE.Vector3(-sx * 0.15, 0.55, -1).normalize();
      if (this.guard) { w.set(head.x + sx * 0.075, head.y - 0.17, head.z - 0.17); fwd.set(-sx * 0.1, 1.2, -0.6).normalize(); }
      let t = this.punch[side];
      if (t > 0) {
        t += dt; this.punch[side] = t > 0.34 ? 0 : t;
        const ext = t < 0.12 ? smoothstep(0, 0.12, t) : 1 - smoothstep(0.16, 0.34, t);
        const target = new THREE.Vector3(head.x + sx * 0.05 + this.mouse.x * 0.25, head.y - 0.08 + this.mouse.y * 0.3, head.z - 0.78);
        w.lerp(target, ext);
        fwd.lerp(new THREE.Vector3(0, 0.05, -1), ext).normalize();
      }
      player.gloves[side].setPose(w, fwd, new THREE.Vector3(sx * 0.3, 1, 0));
    }
    player.mode = 'anteprima';
  }
}
