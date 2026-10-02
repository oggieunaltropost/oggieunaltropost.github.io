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

  // Pubblico: persone vere create in Blender (blender/create_crowd.py) e fotografate in 3 pose
  // (ferma, applaude, esulta). Ogni spettatore e' una "sagoma" con la sua foto: leggero per il visore.
  // Atlante: 6 colonne x 8 righe, celle 256x512; persona p -> riga p/2, colonna (p%2)*3 + posa.
  _buildCrowd(seats) {
    const n = seats.length, PEOPLE = 16, COLS = 6, ROWS = 8;
    const tex = new THREE.TextureLoader().load('assets/pubblico.webp');
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(1.15, 2.3); geo.translate(0, 1.15, 0);   // piedi a terra
    const aCell = new Float32Array(n * 2), aPose = new Float32Array(n), aTint = new Float32Array(n);
    this.people = seats.map((st, k) => {
      const who = Math.floor(Math.random() * PEOPLE);
      aCell[k * 2] = (who % 2) * 3; aCell[k * 2 + 1] = Math.floor(who / 2);
      aTint[k] = 0.5 + Math.random() * 0.25;          // in penombra rispetto al ring
      return { ...st, phase: Math.random() * 10, fan: Math.random(), pose: 0, clapRate: 3 + Math.random() * 2 };
    });
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 2));
    this.aPose = new THREE.InstancedBufferAttribute(aPose, 1); this.aPose.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPose', this.aPose);
    geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 1));
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec2 aCell;\nattribute float aPose;\nattribute float aTint;\nvarying float vTint;\n' +
        sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          vMapUv = vec2((aCell.x + aPose + uv.x) / ${COLS}.0, 1.0 - (aCell.y + 1.0 - uv.y) / ${ROWS}.0);
          vTint = aTint;`);
      sh.fragmentShader = 'varying float vTint;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n diffuseColor.rgb *= vTint;');
    };
    this.crowd = new THREE.InstancedMesh(geo, mat, n);
    this.crowd.frustumCulled = false;
    this.crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.crowd);
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
    const p = new THREE.Vector3(), ex = this.excite, t = this.time;
    this.people.forEach((st, k) => {
      const hype = Math.min(1, ex * (0.5 + st.fan));
      // posa: 0 ferma, 1 applaude, 2 esulta. Calmi: ogni tanto applaudono; esaltati: braccia al cielo
      let pose = 0;
      if (hype > 0.45) pose = Math.sin(t * 2 + st.phase) > -0.6 ? 2 : 1;
      else if (hype > 0.15 || Math.sin(t * 0.37 + st.phase * 3) > 0.85) pose = Math.sin(t * st.clapRate * Math.PI + st.phase) > 0 ? 1 : 0;
      this.aPose.array[k] = pose;
      const bounce = Math.abs(Math.sin(t * (3 + st.fan * 3) + st.phase)) * (0.01 + hype * 0.1);
      e.set(0, st.rot, 0); q.setFromEuler(e);
      m4.compose(p.set(st.x, st.y + bounce, st.z), q, one);
      this.crowd.setMatrixAt(k, m4);
    });
    this.crowd.instanceMatrix.needsUpdate = true;
    this.aPose.needsUpdate = true;
  }
}
