// La ragazza del ring: tra un round e l'altro fa il giro del ring con il cartello del round successivo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const _hp = new THREE.Vector3(), _hd = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hr = new THREE.Quaternion(),
  _hw = new THREE.Quaternion(), _hp2 = new THREE.Quaternion(), _he2 = new THREE.Vector3(), _he3 = new THREE.Vector3();
const SPEED = 0.62;          // m/s: un ciclo di camminata (1.33 s) = 83 cm (blender/create_ringgirl.py)
// Materiali dei personaggi MakeHuman: niente trasparenza sulla pelle e sui vestiti (altrimenti si vede
// "dentro" la testa e il viso sembra tagliato); capelli, sopracciglia e occhi con ritaglio netto.
export function fixHumanMaterial(o) {
  const m = o.material, n = (m.name || '').toLowerCase();
  if (/eyebrow|eyelash/.test(n)) { m.transparent = true; m.alphaTest = 0.04; m.depthWrite = false; m.opacity = 0.7; o.renderOrder = 2; }   // sopracciglia sottili e sfumate
  else if (/hair|short0|bob0|long0|ponytail|braid|afro/.test(n)) { m.transparent = false; m.alphaTest = 0.45; }
  else if (/high-poly|eye/.test(n)) { m.transparent = false; m.alphaTest = 0.9; m.roughness = 0.15; }   // solo il bulbo, niente velo della cornea
  else { m.transparent = false; m.alphaTest = 0; m.opacity = 1; }
  m.depthWrite = true; m.side = THREE.FrontSide; m.needsUpdate = true;
}

export class RingGirl {
  constructor(scene) {
    this.root = new THREE.Group(); this.root.name = 'ragazza del ring'; this.root.visible = false;
    scene.add(this.root);
    this.canvas = document.createElement('canvas'); this.canvas.width = 512; this.canvas.height = 360;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.ready = false;
  }

  async load(url = 'assets/ringgirl.glb?v=20261003210134') {
    const g = await new GLTFLoader().loadAsync(url);
    this.model = g.scene; this.root.add(this.model);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true;
      const n = o.material.name || '';
      if (n === 'Cartello') {
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
      else { fixHumanMaterial(o); if (/body/i.test(o.name)) o.material.color.setScalar(0.8); }   // pelle meno sbiancata dai fari
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
    g.fillStyle = '#c4161f'; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#111'; g.font = '900 78px system-ui, sans-serif'; g.fillText('ROUND', W / 2, 98);
    g.fillStyle = '#c4161f'; g.font = '900 190px system-ui, sans-serif'; g.fillText(String(round), W / 2, 240);
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
  stop() { this.root.visible = false; }

  update(dt, look) {
    if (!this.root.visible || !this.ready) return;
    let a = this.path[this.seg], b = this.path[this.seg + 1];
    const len = a.distanceTo(b);
    // a meta' del lato davanti a te si ferma un attimo e mostra il cartello
    if (!this.paused && this.seg === 2 && this.u > 0.5) { this.paused = true; this.pause = 3.4; }
    const stopNow = this.pause > 0;
    if (stopNow) this.pause -= dt;
    else {
      this.u += SPEED * dt / Math.max(0.01, len);
      if (this.u >= 1) { this.u = 0; this.seg = (this.seg + 1) % (this.path.length - 1); a = this.path[this.seg]; b = this.path[this.seg + 1]; }
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
