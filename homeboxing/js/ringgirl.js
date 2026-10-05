// La ragazza del ring: tra un round e l'altro fa il giro del ring con il cartello del round successivo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const _hp = new THREE.Vector3(), _hd = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hr = new THREE.Quaternion(),
  _hw = new THREE.Quaternion(), _hp2 = new THREE.Quaternion(), _he2 = new THREE.Vector3(), _he3 = new THREE.Vector3();
const SPEED = 0.62;          // m/s: un ciclo di camminata (1.33 s) = 83 cm (blender/create_ringgirl.py)
// Materiali dei personaggi MakeHuman: niente trasparenza sulla pelle e sui vestiti (altrimenti si vede
// "dentro" la testa e il viso sembra tagliato); capelli, sopracciglia e occhi con ritaglio netto.
// capelli chiari (bionda): si tiene il chiaroscuro delle ciocche e si ricolora
function tintHair(m, hex) {
  const img = m.map && m.map.image; if (!img || !img.width) return;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, col = new THREE.Color(hex);
  let sum = 0, n = 0;
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 128) { sum += p[i] + p[i + 1] + p[i + 2]; n++; }
  const mean = Math.max(1, sum / Math.max(1, n));
  for (let i = 0; i < p.length; i += 4) { const k = Math.min(1.35, (p[i] + p[i + 1] + p[i + 2]) / mean) * 255; p[i] = Math.min(255, col.r * k); p[i + 1] = Math.min(255, col.g * k); p[i + 2] = Math.min(255, col.b * k); }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c), o = m.map; t.flipY = o.flipY; t.colorSpace = o.colorSpace; t.wrapS = o.wrapS; t.wrapT = o.wrapT;
  m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
}
export function fixHumanMaterial(o) {
  const m = o.material, n = (m.name || '').toLowerCase();
  if (/eyebrow|eyelash/.test(n)) { m.transparent = true; m.alphaTest = 0.04; m.depthWrite = false; m.opacity = 0.7; o.renderOrder = 2; }   // sopracciglia sottili e sfumate
  else if (/hair|short0|bob0|long0|ponytail|braid|afro/.test(n)) { m.transparent = false; m.alphaTest = 0.45; }
  else if (/high-poly|eye/.test(n)) { m.transparent = false; m.alphaTest = 0.9; m.roughness = 0.15; }   // solo il bulbo, niente velo della cornea
  else { m.transparent = false; m.alphaTest = 0; m.opacity = 1; }
  m.depthWrite = true; m.side = THREE.FrontSide; m.needsUpdate = true;
}

// cinque ragazze (blender/create_ringgirl.py var=0..4): stessa struttura e animazioni, cambiano pelle, capelli,
// completo e colore del numero sul cartello. Una a caso per incontro, la stessa per tutto l'incontro.
export const GIRLS = [
  { glb: 'assets/ringgirl.glb?v=20261005210521', ink: '#c4161f', band: '#c4161f' },                          // mora, rosso e oro
  { glb: 'assets/ringgirl_1.glb?v=20261005210521', ink: '#b8860b', band: '#111111' },                        // di colore, oro e nero
  { glb: 'assets/ringgirl_2.glb?v=20261005210521', ink: '#c4161f', band: '#c4161f' },                        // cinese, bianco e rosso
  { glb: 'assets/ringgirl_3.glb?v=20261005210521', ink: '#1d4fc4', band: '#1d4fc4', hair: '#e8c47c' },       // bionda, blu e argento
  { glb: 'assets/ringgirl_4.glb?v=20261005210521', ink: '#8a2be2', band: '#d6407a' },                        // latina, viola e rosa
];
// la coppa della premiazione: oro, due manici, base nera con la fascia dorata
function makeCup() {
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 1.0, roughness: 0.22, emissive: 0x3a2800, emissiveIntensity: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.4, roughness: 0.4 });
  const C = new THREE.Group(); C.name = 'coppa';
  const prof = [[0.0, 0.16], [0.03, 0.165], [0.016, 0.19], [0.02, 0.215], [0.06, 0.24], [0.085, 0.29], [0.095, 0.35], [0.1, 0.4], [0.105, 0.41], [0.098, 0.41]].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), gold); bowl.material.side = THREE.DoubleSide; C.add(bowl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.1, 20), gold); stem.position.y = 0.12; C.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.07, 24), black); base.position.y = 0.035; C.add(base);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0705, 0.0705, 0.015, 24), gold); band.position.y = 0.035; C.add(band);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 10, 24, Math.PI * 1.2), gold); h.position.set(s * 0.1, 0.33, 0); h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; C.add(h); }
  C.traverse(o => { if (o.isMesh) o.castShadow = true; });
  C.visible = false; return C;
}
export class RingGirl {
  constructor(scene) {
    this.root = new THREE.Group(); this.root.name = 'ragazza del ring'; this.root.visible = false;
    scene.add(this.root);
    this.canvas = document.createElement('canvas'); this.canvas.width = 512; this.canvas.height = 360;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.ready = false;
  }

  // sceglie la ragazza dell'incontro (indice in GIRLS, o a caso); la carica se serve e prende il posto della precedente
  async pick(i = Math.floor(Math.random() * GIRLS.length)) {
    if (this.variant === i && this.ready) return;
    this.variant = i; this.ink = GIRLS[i].ink; this.bandC = GIRLS[i].band;
    const tok = (this._tok = (this._tok || 0) + 1);
    this.cache = this.cache || {};
    const g = this.cache[i] || (this.cache[i] = await new GLTFLoader().loadAsync(GIRLS[i].glb));
    if (tok !== this._tok) return;                                     // nel frattempo ne e' stata scelta un'altra
    const wasVisible = this.root.visible;
    if (this.model) this.root.remove(this.model);
    this.ready = false;
    this._setup(g, GIRLS[i]);
    this.root.visible = wasVisible;
  }
  async load() { return this.pick(0); }
  _setup(g, V) {
    this.model = g.scene; this.root.add(this.model);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true;
      const n = o.material.name || '';
      if (n === 'Cartello' || o.userData.isCard) {
        o.userData.isCard = true;
        // mappatura piana: tutto il disegno (ROUND + numero) sulla faccia grande, davanti e dietro
        const g = o.geometry; g.computeBoundingBox();
        const bb = g.boundingBox, pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
        const big = ['x', 'y', 'z'].sort((a, b) => (bb.max[b] - bb.min[b]) - (bb.max[a] - bb.min[a]));
        const [U, V] = [big[0], big[1]];
        for (let i = 0; i < pos.count; i++) {
          const p = { x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) };
          uv[i * 2] = (p[U] - bb.min[U]) / (bb.max[U] - bb.min[U]);
          uv[i * 2 + 1] = (p[V] - bb.min[V]) / (bb.max[V] - bb.min[V]);
        }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        o.material = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false });
        this.card = o;
      }
      else {
        fixHumanMaterial(o); if (/body/i.test(o.name)) o.material.color.setScalar(0.8);   // pelle meno sbiancata dai fari
        if (V.hair && /hair|long0|bob0|ponytail|braid|afro/i.test(o.material.name || '') && !o.userData.tinted) { o.userData.tinted = true; tintHair(o.material, V.hair); }
      }
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.walk = this.mixer.clipAction(g.animations.find(a => a.name === 'cammina'));
    this.stand = this.mixer.clipAction(g.animations.find(a => a.name === 'ferma'));
    this.walk.play(); this.stand.play(); this.stand.setEffectiveWeight(0);
    this.headAnimated = g.animations.some(a => a.tracks.some(t => t.name === 'head.quaternion'));
    this.ready = true;
    this.face = null;
    this.model.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'blink_l' in o.morphTargetDictionary) this.face = o; });
    this.blinkT = 2; this.gesture = null; this.gestured = false;
    this.model.traverse(o => { if (o.isBone && o.name === 'head') this.head = o; });
    if (this.head) {
      this.headBase = this.head.quaternion.clone();   // posa della testa senza lo sguardo
      // in posa di riposo il viso guarda avanti (+Z): direzione del viso nel sistema dell'osso
      this.model.updateMatrixWorld(true);
      this.faceLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion)
        .applyQuaternion(this.head.getWorldQuaternion(new THREE.Quaternion()).invert());
    }
  }

  _morph(name, v) { if (this.face) this.face.morphTargetInfluences[this.face.morphTargetDictionary[name]] = v; }

  _draw(round) {
    const g = this.canvas.getContext('2d'), W = 512, H = 360;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = this.bandC || '#c4161f'; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#111'; g.font = '900 78px system-ui, sans-serif'; g.fillText('ROUND', W / 2, 98);
    g.fillStyle = this.ink || '#c4161f'; g.font = '900 190px system-ui, sans-serif'; g.fillText(String(round), W / 2, 240);
    this.tex.needsUpdate = true;
  }

  // giro del ring a 50 cm dalle corde; parte dall'angolo lontano a sinistra
  start(arena, ringSize, round, viewer = null) {
    if (!this.ready) return;
    this._draw(round);
    const a = Math.max(0.35, ringSize / 2 - 0.95);      // giro interno: passa lontano da Mike seduto all'angolo
    // il lato davanti a te resta ad almeno 90 cm, cosi' quando si ferma ti guarda da una distanza giusta
    let f = a;
    if (viewer) {
      const v = viewer.clone().applyMatrix4(arena.matrixWorld.clone().invert());
      if (v.z - f < 0.9) f = Math.max(-a + 0.4, v.z - 0.9);
    }
    const pts = [[-a, -a], [a, -a], [a, f], [-a, f]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(arena.matrixWorld));
    this.path = [...pts, pts[0]];
    this.seg = 0; this.u = 0; this.pause = 0; this.paused = false; this.gestured = false; this.gesture = null;
    this.root.position.copy(pts[0]);
    this.root.visible = true;
  }
  stop() { this.root.visible = false; this.trophyMode = false; if (this.cup) this.cup.visible = false; if (this.card) this.card.visible = true; }
  // braccia in avanti all'altezza del petto, mani ai lati della coppa (porta la coppa e te la porge): si punta ogni
  // osso del braccio verso il suo bersaglio (gomito un po' basso e in fuori), sopra la posa dell'animazione
  _offerCup() {
    if (!this.arms) {
      const B = n => { let r = null; this.model.traverse(o => { if (o.isBone && o.name === n) r = o; }); return r; };
      this.arms = ['l', 'r'].map(s => ({ s: s === 'l' ? 1 : -1, up: B('upperarm_' + s), lo: B('lowerarm_' + s), hand: B('hand_' + s) })).filter(a => a.up && a.lo && a.hand);
    }
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion), side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.quaternion);
    const chest = this.root.position.clone().add(new THREE.Vector3(0, 1.08, 0)).addScaledVector(fwd, 0.36);
    const aim = (bone, target) => {                               // punta l'asse Y dell'osso verso target
      const p = bone.getWorldPosition(new THREE.Vector3()), q = bone.getWorldQuaternion(new THREE.Quaternion());
      const cur = new THREE.Vector3(0, 1, 0).applyQuaternion(q), want = target.clone().sub(p).normalize();
      const nq = new THREE.Quaternion().setFromUnitVectors(cur, want).multiply(q);
      bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(nq)); bone.updateMatrixWorld(true);
    };
    for (const A of this.arms) {
      const hand = chest.clone().addScaledVector(side, A.s * 0.11);
      const sh = A.up.getWorldPosition(new THREE.Vector3());
      const elbow = sh.clone().lerp(hand, 0.5).add(new THREE.Vector3(0, -0.12, 0)).addScaledVector(side, A.s * 0.08);
      aim(A.up, elbow); aim(A.lo, hand);
    }
    // la coppa appoggiata sulle mani (tra i palmi), girata come lei
    const hm = this.arms.length === 2 ? this.arms[0].hand.getWorldPosition(new THREE.Vector3()).add(this.arms[1].hand.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5) : chest;
    this.cup.position.copy(hm).addScaledVector(fwd, 0.04).add(new THREE.Vector3(0, -0.01, 0)); this.cup.rotation.y = this.root.rotation.y;
  }
  // premiazione (finale del torneo o cima della torre): entra con la coppa in mano e te la porge, ferma davanti a te
  trophy(arena, ringSize, viewer) {
    if (!this.ready) return;
    if (!this.cup) this.cup = makeCup(), this.root.parent.add(this.cup);
    const a = Math.max(0.35, ringSize / 2 - 0.6);
    const v = viewer.clone().applyMatrix4(arena.matrixWorld.clone().invert());
    const end = new THREE.Vector3(v.x * 0.9, 0, v.z - 0.75);                    // 75 cm davanti a te
    this.path = [new THREE.Vector3(-a, 0, -a), end].map(p => p.applyMatrix4(arena.matrixWorld));
    this.seg = 0; this.u = 0; this.pause = 0; this.paused = true; this.gestured = false; this.gesture = null;
    this.trophyMode = true;
    this.root.position.copy(this.path[0]); this.root.visible = true;
    if (this.card) this.card.visible = false; this.cup.visible = true;
  }

  update(dt, look) {
    if (!this.root.visible || !this.ready) return;
    if (this.trophyMode && this.u >= 1) { this.u = 1; this.pause = 1; }        // arrivata davanti a te: resta li' a porgerti la coppa
    let a = this.path[this.seg], b = this.path[this.seg + 1];
    const len = a.distanceTo(b);
    // a meta' del lato davanti a te si ferma un attimo e mostra il cartello
    if (!this.paused && this.seg === 2 && this.u > 0.5) { this.paused = true; this.pause = 3.4; }
    const stopNow = this.pause > 0;
    if (stopNow) this.pause -= dt;
    else {
      this.u += SPEED * dt / Math.max(0.01, len);
      if (this.u >= 1 && !this.trophyMode) { this.u = 0; this.seg = (this.seg + 1) % (this.path.length - 1); a = this.path[this.seg]; b = this.path[this.seg + 1]; }
      if (this.trophyMode) this.u = Math.min(1, this.u);
    }
    this.root.position.lerpVectors(a, b, this.u);
    const dir = b.clone().sub(a);
    let yaw = Math.atan2(dir.x, dir.z);
    if (stopNow) yaw = Math.atan2(look.x - this.root.position.x, look.z - this.root.position.z);
    let dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
    this.root.rotation.y += Math.max(-4 * dt, Math.min(4 * dt, dy));
    const w = stopNow ? 1 : 0;
    this.stand.setEffectiveWeight(w); this.walk.setEffectiveWeight(1 - w);
    this.mixer.update(dt);
    this.root.updateMatrixWorld(true);
    if (this.trophyMode && this.cup) this._offerCup();
    // ferma davanti a te: gira e inclina la testa verso i tuoi occhi (alla tua altezza vera)
    this.lookW = Math.max(0, Math.min(1, (this.lookW || 0) + (stopNow ? dt : -dt) * 1.1));   // la testa si gira piano verso di te (~0.9 s)
    if (this.head && !this.headAnimated) this.head.quaternion.copy(this.headBase);   // l'animazione non la muove: si riparte da qui
    if (this.lookW > 0 && this.head) {
      // direzione verso i tuoi occhi, limitata (non si torce oltre ~60 gradi dal busto)
      const hp = this.head.getWorldPosition(_hp);
      const want = _hd.copy(look).sub(hp).normalize();
      const body = _he2.set(0, 0, 1).applyQuaternion(this.root.quaternion);
      const ang = want.angleTo(body);
      if (ang > 1.05) want.lerp(body, 1 - 1.05 / ang).normalize();
      this.head.getWorldQuaternion(_hq);
      const face = _he3.copy(this.faceLocal).applyQuaternion(_hq);
      const w = this.lookW * this.lookW * (3 - 2 * this.lookW);
      _hw.setFromUnitVectors(face, want); _hr.identity().slerp(_hw, w);
      _hq.premultiply(_hr);
      this.head.parent.getWorldQuaternion(_hp2).invert();
      this.head.quaternion.copy(_hp2.multiply(_hq));
      this.head.updateMatrixWorld(true);
    }
    // viso: sorriso, battito di ciglia; quando ti passa vicino un occhiolino o un bacio (a caso)
    this.blinkT -= dt;
    let bl = 0;
    if (this.blinkT < 0.12) bl = 1;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    // quando si ferma davanti a te col cartello: occhiolino (a volte un bacio), ben visibile
    if (stopNow && this.lookW >= 1 && this.pause < 2.2 && !this.gestured) { this.gestured = true; this.gesture = { kind: Math.random() < 0.7 ? 'wink' : 'kiss', t: 0 }; }
    let wink = 0, kiss = 0;
    if (this.gesture) {
      const g = this.gesture; g.t += dt;
      // sale in 0.15 s, resta 0.55 s, scende in 0.2 s
      const k = g.t < 0.15 ? g.t / 0.15 : g.t < 0.7 ? 1 : Math.max(0, 1 - (g.t - 0.7) / 0.2);
      if (g.kind === 'wink') wink = k; else kiss = Math.sin(Math.min(1, g.t / 1.2) * Math.PI);
      bl = 0;                                      // niente battito normale mentre ammicca
      if (g.t > 1.3) this.gesture = null;
    }
    this._morph('blink_l', Math.max(bl, wink)); this._morph('blink_r', bl);
    this._morph('kiss', kiss); this._morph('smile', (0.55 + 0.35 * wink) * (1 - kiss));
  }
}
