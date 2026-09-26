// Guanti bianchi futuristici disegnati sulle mani tracciate, con il bottone "MENÙ"
// sul dorso della mano sinistra (si preme con l'indice dell'altra mano).
import * as THREE from 'three';

const FINGERS = {
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
  index: ['index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
};
// segmenti delle dita (dal metacarpo in su: il palmo lo copre la "piastra")
const BONES = Object.values(FINGERS).flatMap(ch => ch.slice(1).map((n, i) => [ch[i], n]))
  .filter(([a]) => !a.endsWith('metacarpal') || a.startsWith('thumb'));
const JOINTS = ['wrist', ...Object.values(FINGERS).flat()];
const RING_AT = ['index-finger-phalanx-proximal', 'middle-finger-phalanx-proximal', 'ring-finger-phalanx-proximal',
  'pinky-finger-phalanx-proximal', 'thumb-phalanx-proximal'];

const glove = new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.32, metalness: 0.18, emissive: 0x1b2a38, emissiveIntensity: 0.25 });
const glow = new THREE.MeshBasicMaterial({ color: 0x5ff5ff });
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true);
const bandMat = glove.clone(); bandMat.side = THREE.DoubleSide;
const sphGeo = new THREE.SphereGeometry(1, 16, 10);
const ringGeo = new THREE.TorusGeometry(1, 0.12, 8, 24);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _z = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

function tattooTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 328;
  const g = c.getContext('2d');
  g.strokeStyle = '#6ff7ff'; g.fillStyle = '#6ff7ff';
  g.shadowColor = '#38e8ff'; g.shadowBlur = 16;
  g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.arc(128, 118, 96, 0, Math.PI * 2); g.stroke();              // cerchio esterno
  g.lineWidth = 4;
  g.beginPath(); g.arc(128, 118, 78, 0.3, Math.PI * 2 - 0.3); g.stroke();      // cerchio interno spezzato
  g.lineWidth = 12;
  for (const y of [86, 118, 150]) { g.beginPath(); g.moveTo(84, y); g.lineTo(172, y); g.stroke(); } // tre lineette
  g.font = 'bold 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MENÙ', 128, 285);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  // targhetta scura: si legge anche sul guanto bianco
  g.fillStyle = 'rgba(8,24,38,0.92)';
  g.beginPath(); g.roundRect(6, 10, 244, 76, 38); g.fill();
  g.strokeStyle = '#5ff5ff'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(6, 10, 244, 76, 38); g.stroke();
  g.shadowColor = '#5ff5ff'; g.shadowBlur = 14;
  g.fillStyle = '#dfffff'; g.font = 'bold 54px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

class Glove {
  constructor(scene, left) {
    this.left = left;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.joints = JOINTS.map(() => this.add(new THREE.Mesh(sphGeo, glove)));
    this.bones = BONES.map(() => this.add(new THREE.Mesh(cylGeo, glove)));
    this.palm = this.add(new THREE.Mesh(sphGeo, glove));
    this.cuff = this.add(new THREE.Mesh(ringGeo, glow));
    this.cuffBand = this.add(new THREE.Mesh(cylGeo, bandMat));
    this.rings = RING_AT.map(() => this.add(new THREE.Mesh(ringGeo, glow)));
    if (left) {
      // tatuaggio luminoso del menu' sul dorso della mano
      this.button = new THREE.Group();
      this.tattoo = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.046).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: tattooTexture(), transparent: true, depthWrite: false, opacity: 0.9 }));
      this.tattoo.renderOrder = 12;
      this.tattoo.position.z = 0.005;   // la scritta sta un po' verso il polso
      this.button.add(this.tattoo);
      this.group.add(this.button);
      this.flash = 0;
    }
  }

  add(m) { m.matrixAutoUpdate = false; this.group.add(m); return m; }

  place(mesh, pos, quat, sx, sy, sz) {
    mesh.matrix.compose(pos, quat, _a.set(sx, sy, sz));
    mesh.matrixWorldNeedsUpdate = true;
  }

  update(p, h, dt) {
    const J = p.hand.joints || {};
    const ok = h.tracked && JOINTS.every(n => J[n]?.visible);
    this.group.visible = !!ok && this.enabled;
    if (!this.group.visible) return;
    const pos = {}, rad = {};
    for (const n of JOINTS) {
      pos[n] = J[n].getWorldPosition(new THREE.Vector3());
      rad[n] = Math.max(J[n].jointRadius || 0.009, n.endsWith('tip') ? 0.0085 : 0.0095) * 1.32;
    }
    const q = new THREE.Quaternion();
    JOINTS.forEach((n, i) => this.place(this.joints[i], pos[n], q, rad[n], rad[n], rad[n]));
    BONES.forEach(([a, b], i) => {
      _a.subVectors(pos[b], pos[a]);
      const len = _a.length();
      q.setFromUnitVectors(Y, _a.divideScalar(len || 1));
      const r = (rad[a] + rad[b]) * 0.5;
      this.place(this.bones[i], _b.addVectors(pos[a], pos[b]).multiplyScalar(0.5), q, r, len, r);
    });
    // piastra del palmo: ellissoide tra polso e nocche
    const kIndex = pos['index-finger-phalanx-proximal'], kPinky = pos['pinky-finger-phalanx-proximal'], w = pos.wrist;
    const knuckles = _b.addVectors(kIndex, kPinky).multiplyScalar(0.5);
    const along = _z.subVectors(knuckles, w);
    const length = along.length(); along.divideScalar(length || 1);
    const across = _x.subVectors(kPinky, kIndex);
    const width = across.length();
    const n = h.palmN.clone();
    const xAxis = across.clone().addScaledVector(n, -across.dot(n)).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, n).normalize();
    _m.makeBasis(xAxis, n, zAxis);
    const pq = new THREE.Quaternion().setFromRotationMatrix(_m);
    const pc = new THREE.Vector3().addVectors(w, knuckles).multiplyScalar(0.5);
    this.place(this.palm, pc, pq, width * 0.66 + 0.014, 0.019, length * 0.64);
    // polsino luminoso
    const cq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
    const cuffPos = w.clone().addScaledVector(along, -0.012);
    this.place(this.cuff, cuffPos, cq, 0.03, 0.026, 0.03);
    const bq = new THREE.Quaternion().setFromUnitVectors(Y, along);
    this.place(this.cuffBand, cuffPos.clone().addScaledVector(along, -0.006), bq, 0.027, 0.012, 0.023);
    // anelli luminosi sulle nocche
    RING_AT.forEach((name, i) => {
      const ch = Object.values(FINGERS).find(c => c.includes(name));
      const next = ch[ch.indexOf(name) + 1];
      const d = _a.subVectors(pos[next], pos[name]).normalize();
      const rq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      const r = rad[name] * 1.25;
      this.place(this.rings[i], pos[name].clone().addScaledVector(d, 0.006), rq, r, r, r);
    });
    if (this.button) {
      // dorso = lato opposto al palmo; il testo si legge con le dita verso l'alto
      const back = n.clone().negate();
      // sui guanti sta sopra il guanto, altrimenti appoggiato sulla pelle del dorso
      const center = pc.clone().addScaledVector(back, this.skin ? 0.0125 : 0.0195).addScaledVector(along, -0.004);
      const zb = along.clone().negate().addScaledVector(back, along.dot(back)).normalize(); // verso il polso
      const xb = new THREE.Vector3().crossVectors(back, zb).normalize();
      _m.makeBasis(xb, back, zb);
      this.button.position.copy(center);
      this.button.quaternion.setFromRotationMatrix(_m);
      this.button.updateMatrix();
      this.buttonCenter = center.addScaledVector(back, 0.003);
      this.buttonNormal = back;
      this.flash = Math.max(0, this.flash - dt * 3);
      this.tattoo.material.opacity = 0.72 + 0.18 * Math.sin(performance.now() / 350) + this.flash * 0.3;
      this.tattoo.scale.setScalar(1 + this.flash * 0.18);
    }
  }
}

export class Gloves {
  constructor(scene) {
    this.list = [new Glove(scene, false), new Glove(scene, true)];
    this.enabled = false;   // di serie niente guanti: solo il tatuaggio del menu'
    this.cooldown = 0;
    this.touching = false;
  }

  setEnabled(on) { this.enabled = on; }

  // pointers/hands di main.js; ritorna true se e' stato premuto il bottone del menu'
  update(pointers, hands, dt) {
    this.cooldown -= dt;
    let leftGlove = null, leftHand = null;
    for (let i = 0; i < 2; i++) {
      const p = pointers[i], h = hands[i];
      const src = p.c.userData.source;
      const isLeft = src?.handedness === 'left';
      const g = isLeft ? this.list[1] : this.list[0];
      if (!src?.hand) continue;
      g.enabled = this.enabled || isLeft; // il tatuaggio resta anche senza guanti
      g.skin = !this.enabled;
      g.update(p, h, dt);
      // a guanti spenti della mano sinistra resta solo il bottone
      if (isLeft && !this.enabled && g.group.visible) for (const m of g.group.children) m.visible = m === g.button;
      else if (isLeft) for (const m of g.group.children) m.visible = true;
      if (isLeft) { leftGlove = g; leftHand = h; }
    }
    for (const g of this.list) if (!pointers.some(p => p.c.userData.source?.hand && (p.c.userData.source.handedness === 'left') === g.left)) g.group.visible = false;
    // pressione: indice dell'altra mano sul bottone
    if (!leftGlove?.group.visible || !leftGlove.buttonCenter) return false;
    const other = hands.find(h => h.tracked && h !== leftHand && h.tipOk);
    if (!other) { this.touching = false; return false; }
    const d = other.tip.distanceTo(leftGlove.buttonCenter);
    const inFront = _a.subVectors(other.tip, leftGlove.buttonCenter).dot(leftGlove.buttonNormal) > -0.008;
    const touch = d < 0.02 && inFront;
    let pressed = false;
    if (touch && !this.touching && this.cooldown <= 0) {
      pressed = true;
      this.cooldown = 0.8;
      leftGlove.flash = 1;
    }
    this.touching = touch;
    return pressed;
  }
}
