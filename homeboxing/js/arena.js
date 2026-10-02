// Modalita' "Nell'arena": palazzetto virtuale intorno al ring, con tribune, pubblico animato,
// luci, flash dei fotografi e striscioni. Tutto generato qui (niente file da scaricare).
import * as THREE from 'three';

const SKIN = [0x3b2417, 0x5a3825, 0x7a4e33, 0x9a6a48, 0xc08d6a, 0xe0b594, 0xf1cfb4];
const SHIRT = [0xd81e2c, 0x1d4fc4, 0xf2f2f2, 0x1b1b1f, 0xffc93a, 0x2e8b57, 0x8a2be2, 0xff7f27, 0x4cc3e6, 0x9e9e9e, 0x6b3e26];
const HAIR = [0x111111, 0x2a1b10, 0x5a3a1c, 0x8a6a3a, 0xd9c39a, 0x777777];

function banner(text, sub, w = 2048, h = 384, bg = '#0d1424', fg = '#ffffff', accent = '#d81e2c') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, bg); grd.addColorStop(0.5, '#1b2a4a'); grd.addColorStop(1, bg);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = accent; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${h * 0.42}px system-ui, sans-serif`; g.fillText(text, w / 2, h * (sub ? 0.42 : 0.5));
  if (sub) { g.font = `600 ${h * 0.15}px system-ui, sans-serif`; g.fillStyle = '#ffd34d'; g.fillText(sub, w / 2, h * 0.78); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Arena {
  constructor(ringSize) {
    this.group = new THREE.Group(); this.group.name = 'palazzetto';
    this.excite = 0;          // 0..1: quanto e' esaltata la folla
    this.time = 0;
    const R = ringSize / 2;

    // pavimento del palazzetto e zona intorno al ring
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; floor.receiveShadow = true;
    this.group.add(floor);
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(ringSize + 3.2, ringSize + 3.2),
      new THREE.MeshStandardMaterial({ color: 0x3a0d12, roughness: 0.95 }));
    carpet.rotation.x = -Math.PI / 2; carpet.position.y = 0.0; carpet.receiveShadow = true;
    this.group.add(carpet);

    // tribune: 4 lati, file di gradoni che salgono
    const ROWS = 9, stepMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.85 });
    const seats = [];       // {x, y, z, rot}
    for (let side = 0; side < 4; side++) {
      const rot = side * Math.PI / 2;
      for (let r = 0; r < ROWS; r++) {
        const d = R + 2.6 + r * 0.95, y = 0.15 + r * 0.5, len = 2 * d + 1.0;
        const step = new THREE.Mesh(new THREE.BoxGeometry(len, y + 0.02, 0.95), stepMat);
        step.position.set(Math.sin(rot) * (d + 0.45), (y + 0.02) / 2 - 0.01, Math.cos(rot) * (d + 0.45));
        step.rotation.y = rot;
        step.receiveShadow = true;
        this.group.add(step);
        const n = Math.floor(len / 0.62);
        for (let i = 0; i < n; i++) {
          if (Math.random() < 0.08) continue;                    // qualche posto vuoto
          const along = -len / 2 + 0.31 + i * 0.62 + (Math.random() - 0.5) * 0.12;
          const px = Math.sin(rot) * (d + 0.35) + Math.cos(rot) * along;
          const pz = Math.cos(rot) * (d + 0.35) - Math.sin(rot) * along;
          // il ring e' al centro: ognuno guarda verso il ring
          seats.push({ x: px, y: y + 0.02, z: pz, rot: Math.atan2(-px, -pz) });
        }
      }
    }
    this._buildCrowd(seats);

    // struttura di luci sopra il ring
    const truss = new THREE.Group();
    const tMat = new THREE.MeshStandardMaterial({ color: 0x2b2d33, metalness: 0.8, roughness: 0.35 });
    const S = ringSize + 1.2, H = 4.2;
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(S, 0.12, 0.12), tMat);
      const a = i * Math.PI / 2;
      bar.position.set(Math.sin(a) * S / 2, H, Math.cos(a) * S / 2); bar.rotation.y = a;
      truss.add(bar);
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4dc });
    for (let i = 0; i < 4; i++) for (let k = -1; k <= 1; k++) {
      const a = i * Math.PI / 2;
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.18, 16), lampMat);
      lamp.position.set(Math.sin(a) * S / 2 + Math.cos(a) * k * S / 3, H - 0.15, Math.cos(a) * S / 2 - Math.sin(a) * k * S / 3);
      truss.add(lamp);
    }
    // cubo con gli schermi al centro
    const cubeTex = banner('HOME BOXING', 'MIKE  vs  TU', 1024, 512);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6),
      [0, 1, 2, 3, 4, 5].map(i => i === 2 || i === 3 ? new THREE.MeshStandardMaterial({ color: 0x111111 })
        : new THREE.MeshBasicMaterial({ map: cubeTex, toneMapped: false })));
    cube.position.y = H + 1.4;
    truss.add(cube);
    this.group.add(truss);

    // luci: il ring molto illuminato, il pubblico in penombra
    this.spot = new THREE.SpotLight(0xfff2e0, 60, 14, Math.PI / 5.5, 0.5, 1.2);
    this.spot.position.set(0, H + 0.2, 0.2); this.spot.target.position.set(0, 0, 0);
    this.spot.castShadow = true; this.spot.shadow.mapSize.set(1024, 1024); this.spot.shadow.bias = -0.0004;
    this.group.add(this.spot, this.spot.target);
    const fillA = new THREE.SpotLight(0xd8e4ff, 18, 14, Math.PI / 4, 0.7, 1.2);
    fillA.position.set(3.5, 3.5, 3.5); fillA.target.position.set(0, 1, 0);
    const fillB = fillA.clone(); fillB.position.set(-3.5, 3.5, -3.5);
    fillB.target = new THREE.Object3D(); fillB.target.position.set(0, 1, 0);
    this.group.add(fillA, fillA.target, fillB, fillB.target);
    this.crowdLight = new THREE.HemisphereLight(0x8090b0, 0x101010, 0.12);
    this.group.add(this.crowdLight);

    // striscioni appesi sopra le tribune
    // 0 = dietro di te, 1 = a destra, 2 = dietro Mike (quello che vedi), 3 = a sinistra
    const texts = [['ANGOLO ROSSO', 'TU'], ['FORZA MIKE!', null], ['HOME BOXING', 'CAMPIONATO DEI PESI MASSIMI'], ['KO!', null]];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, d = R + 2.6 + ROWS * 0.95 + 0.6;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3),
        new THREE.MeshBasicMaterial({ map: banner(...texts[i]), toneMapped: false }));
      b.position.set(Math.sin(a) * d, 0.15 + ROWS * 0.5 + 1.6, Math.cos(a) * d);
      b.rotation.y = a + Math.PI;
      this.group.add(b);
    }

    // flash dei fotografi
    this.flashes = [];
    const fm = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(fm.clone()); sp.scale.set(0.35, 0.35, 1);
      this.group.add(sp); this.flashes.push({ sp, t: 0 });
    }
    this.seats = seats;
  }

  _buildCrowd(seats) {
    const n = seats.length;
    const body = new THREE.CapsuleGeometry(0.17, 0.42, 4, 10);
    const head = new THREE.SphereGeometry(0.105, 12, 10);
    const hair = new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const arm = new THREE.CapsuleGeometry(0.05, 0.42, 4, 8); arm.translate(0, -0.26, 0);   // ruota dalla spalla
    const mk = (g, rough = 0.8) => { const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: rough }), n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; this.group.add(m); return m; };
    this.mBody = mk(body); this.mHead = mk(head, 0.6); this.mHair = mk(hair, 0.9);
    this.mArmL = mk(arm); this.mArmR = mk(arm);
    this.people = seats.map((s, i) => {
      const shirt = new THREE.Color(SHIRT[Math.floor(Math.random() * SHIRT.length)]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
      const skin = new THREE.Color(SKIN[Math.floor(Math.random() * SKIN.length)]);
      this.mBody.setColorAt(i, shirt); this.mArmL.setColorAt(i, shirt); this.mArmR.setColorAt(i, shirt);
      this.mHead.setColorAt(i, skin);
      this.mHair.setColorAt(i, new THREE.Color(HAIR[Math.floor(Math.random() * HAIR.length)]));
      return { ...s, h: 0.92 + Math.random() * 0.16, phase: Math.random() * 10, fan: Math.random(),
        standing: Math.random() < 0.25, armUp: 0, look: (Math.random() - 0.5) * 0.4 };
    });
    for (const m of [this.mBody, this.mHead, this.mHair, this.mArmL, this.mArmR]) m.instanceColor.needsUpdate = true;
  }

  // la folla reagisce: colpo forte = esulta
  cheer(amount = 1) { this.excite = Math.min(1, this.excite + 0.5 * amount); }

  update(dt, ringCenterWorld) {
    this.time += dt;
    this.excite = Math.max(0, this.excite - dt * 0.25);
    this._frame = (this._frame || 0) + 1;
    if (this._frame % 2 === 0) this._updateCrowd(dt * 2);
    // flash dei fotografi, piu' frequenti quando la folla e' esaltata
    for (const f of this.flashes) {
      if (f.t > 0) { f.t -= dt; f.sp.material.opacity = Math.max(0, f.t / 0.12); continue; }
      f.sp.material.opacity = 0;
      if (Math.random() < dt * (0.15 + this.excite * 2.5)) {
        const s = this.seats[Math.floor(Math.random() * this.seats.length)];
        f.sp.position.set(s.x, s.y + 1.3, s.z); f.t = 0.12;
      }
    }
  }

  _updateCrowd(dt) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3(), base = new THREE.Matrix4(), off = new THREE.Matrix4();
    const ex = this.excite, t = this.time;
    this.people.forEach((s, i) => {
      const hype = Math.min(1, ex * (0.5 + s.fan));
      const stand = s.standing || hype > 0.35;
      const bounce = Math.abs(Math.sin(t * (3 + s.fan * 3) + s.phase)) * (0.02 + hype * 0.12);
      const sit = stand ? 0 : -0.32;
      s.armUp += ((hype > 0.25 ? 1 : 0) - s.armUp) * Math.min(1, dt * 6);
      e.set(0, s.rot + s.look * (1 - hype), 0); q.setFromEuler(e);
      base.compose(p.set(s.x, s.y, s.z), q, one);
      const k = s.h;
      // corpo
      off.makeTranslation(0, (0.55 + sit + bounce) * k, 0);
      this.mBody.setMatrixAt(i, m4.multiplyMatrices(base, off));
      // testa e capelli
      off.makeTranslation(0, (1.02 + sit + bounce) * k, 0);
      this.mHead.setMatrixAt(i, m4.multiplyMatrices(base, off));
      off.makeTranslation(0, (1.04 + sit + bounce) * k, -0.005);
      this.mHair.setMatrixAt(i, m4.multiplyMatrices(base, off));
      // braccia: giu' lungo i fianchi, su quando esultano (e si agitano)
      for (const [mesh, sx] of [[this.mArmL, 1], [this.mArmR, -1]]) {
        const wave = Math.sin(t * 7 + s.phase + sx) * 0.35 * s.armUp;
        const ang = 0.15 + s.armUp * (2.6 + wave);
        const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-ang * 0.25, 0, sx * ang));
        off.makeTranslation(sx * 0.2, (0.8 + sit + bounce) * k, 0).multiply(r);
        mesh.setMatrixAt(i, m4.multiplyMatrices(base, off));
      }
    });
    for (const m of [this.mBody, this.mHead, this.mHair, this.mArmL, this.mArmR]) m.instanceMatrix.needsUpdate = true;
  }
}
