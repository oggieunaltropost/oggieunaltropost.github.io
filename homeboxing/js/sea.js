// Stage "Sotto il mare": il ring dentro una sfera di vetro posata sul fondale, a ~14 m di profondita'.
// Intorno la scogliera di coralli (foto a 360 gradi fatta in Blender: blender/create_sea.py); in 3D, vicino:
//  - la sfera: vetro quasi invisibile (si vede ai bordi, col riflesso), costoloni d'acciaio, anello di base, pavimento
//  - sabbia intorno con le caustiche (la rete di luce delle onde) che si muovono, anche sul tappeto del ring
//  - raggi di sole che scendono dalla superficie e ondeggiano
//  - banchi di pesci tropicali (gialli, chirurghi blu, pesci pagliaccio vicino alla base), pesci pappagallo,
//    una palla di sardine argentate che gira su se stessa
//  - squali che girano intorno alla sfera, mante che planano sopra battendo le ali, meduse luminose
//  - bolle che salgono dalle prese d'aria della sfera e dal fondo, particelle in sospensione
// Pesci, squali e mante si piegano nuotando (nel vertex shader). Sistema di riferimento: quello del ring.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SUN = new THREE.Vector3(0.287, 0.927, 0.241).normalize();      // il sole della foto (Blender (0.241,0.287,0.927))
export const WATER = new THREE.Color(0x0e505a);                    // colore dell'acqua lontana (nebbia)
const SURF = 14;                                                    // superficie del mare sopra il pavimento
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _basis = new THREE.Matrix4();

// rete delle caustiche (GLSL): piu' passaggi di seni deformati, poi si tengono solo le linee chiare
const CAUSTIC = `
float caustic(vec2 p, float t) {
  vec2 i = p; float c = 1.0; float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}`;

// nuoto: piega il corpo di lato (asse z) con un'onda che va dalla testa (+x) alla coda, piu' forte in coda
function swimMaterial(params, opt) {
  const m = new THREE.MeshStandardMaterial(params);
  m.userData.u = { uTime: { value: 0 } };
  m.customProgramCacheKey = () => 'swim' + JSON.stringify(opt);   // (ogni specie ha i suoi numeri dentro lo shader)
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = m.userData.u.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uTime;
      ${opt.instanced ? 'attribute float aPhase;' : 'uniform float uPhase;'}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = ${opt.instanced ? 'aPhase' : 'uPhase'};
      ${opt.manta ? `
        float wing = pow(abs(transformed.z) / ${opt.span.toFixed(2)}, 1.4);
        transformed.y += sin(uTime * ${opt.freq.toFixed(2)} + ph - transformed.x * 1.2) * ${opt.amp.toFixed(3)} * wing;
      ` : `
        float back = clamp((${opt.head.toFixed(3)} - transformed.x) / ${opt.len.toFixed(3)}, 0.0, 1.0);
        transformed.z += sin(uTime * ${opt.freq.toFixed(2)} + ph + transformed.x * ${opt.k.toFixed(2)}) * ${opt.amp.toFixed(3)} * back * back;
      `}`);
    if (opt.manta) sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb = gl_FrontFacing ? diffuseColor.rgb : vec3(0.92, 0.93, 0.95);`);   // sopra scuro, pancia bianca
  };
  return m;
}

// colori per vertice (sopra/sotto, strisce) su una geometria
function paint(g, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const col = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
function triFin(a, b, c) {                      // pinna: un triangolo a due facce
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...b], 3));
  g.computeVertexNormals(); return g;
}

// pesce di 1 m (testa verso +x): corpo a goccia schiacciato ai lati, coda a forbice, pinna dorsale
function fishGeo(col, kind) {
  const body = new THREE.SphereGeometry(0.5, 14, 8); body.scale(1, kind === 'tall' ? 0.75 : 0.42, 0.16);
  const tail = triFin([-0.42, 0, 0], [-0.75, 0.24, 0], [-0.75, -0.24, 0]);
  const dors = triFin([0.15, 0.15, 0], [-0.3, 0.12, 0], [-0.15, kind === 'tall' ? 0.5 : 0.3, 0]);
  const parts = [body, tail, dors].map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; });
  const geo = mergeGeometries(parts.map(g => { g.deleteAttribute('normal'); return g; }));
  geo.computeVertexNormals();
  return paint(geo, (x, y) => col(x, y));
}

export class Sea {
  constructor(ringSize) {
    this.group = new THREE.Group(); this.group.name = 'mare';
    this.sunDir = SUN.clone();
    this.S = ringSize;
    this.R = Math.max(3.6, ringSize * 0.71 + 1.3);              // raggio della sfera
    this.C = 0.8;                                               // centro della sfera sopra il pavimento
    this.r0 = Math.sqrt(this.R * this.R - this.C * this.C);     // raggio della sfera all'altezza del pavimento
    this.t = 0;
    this.mats = [];                                             // materiali con uTime
    this._sky(); this._dome(); this._sand(); this._rays();
    this._fish(); this._sharks(); this._mantas(); this._jellies(); this._bubbles(); this._snow();
  }

  _sky() {
    const tex = new THREE.TextureLoader().load('assets/mare_panorama.jpg?v=20261005000743', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uPano: { value: tex } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uPano; varying vec3 vD;
        void main(){ vec3 d = normalize(vD);
          vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), m);
    sky.renderOrder = -10; sky.frustumCulled = false;
    this.group.add(sky);
  }

  // ---------------------------------------------------------------- la sfera
  _dome() {
    const R = this.R, C = this.C;
    // vetro: quasi trasparente al centro, si vede verso i bordi (Fresnel) con un riflesso chiaro che scorre
    const glass = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 v = normalize(cameraPosition - vW);
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 3.0);
          float glint = smoothstep(0.985, 1.0, sin(vW.y * 1.3 + vW.x * 0.7 - uTime * 0.35) * 0.5 + 0.5) * 0.25;
          vec3 col = mix(vec3(0.55, 0.85, 0.9), vec3(1.0), f);
          gl_FragColor = vec4(col, 0.025 + f * 0.33 + glint);
        }`,
    });
    this.glassMat = glass;
    const sph = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40, 0, Math.PI * 2, 0, Math.acos(-C / R)), glass);
    sph.position.y = C; sph.renderOrder = 20; this.group.add(sph);
    // costoloni d'acciaio: meridiani e paralleli, anello di base con i bulloni, oblo' in cima
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa4ac, metalness: 0.9, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.8, roughness: 0.5 });
    const top = Math.acos(-C / R);                                     // fino al pavimento
    for (let k = 0; k < 8; k++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.035, 8, 48, top), steel);
      arc.rotation.set(0, k * Math.PI / 4, Math.PI / 2); arc.position.y = C;   // da sopra la testa giu' fino al pavimento
      this.group.add(arc);
    }
    for (const y of [1.6, 3.0]) {
      const rr = Math.sqrt(Math.max(0, R * R - (y - C) * (y - C)));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.02, 0.03, 8, 96), steel); ring.rotation.x = Math.PI / 2; ring.position.y = y; this.group.add(ring);
    }
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), dark); hatch.position.y = C + R; this.group.add(hatch);
    const base = new THREE.Mesh(new THREE.TorusGeometry(this.r0 + 0.05, 0.14, 12, 128), dark); base.rotation.x = Math.PI / 2; base.position.y = 0.02; this.group.add(base);
    const boltG = new THREE.SphereGeometry(0.035, 6, 4);
    const bolts = new THREE.InstancedMesh(boltG, steel, 96);
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; bolts.setMatrixAt(i, _m.makeTranslation(Math.cos(a) * (this.r0 + 0.05), 0.15, Math.sin(a) * (this.r0 + 0.05))); }
    this.group.add(bolts);
    // pavimento d'acciaio a lastre dentro la sfera (sotto il ring)
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#4a535c'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) { const v = 60 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v + 6},${v + 12},0.3)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    g.strokeStyle = '#2a3036'; g.lineWidth = 4; for (let k = 0; k <= 512; k += 256) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
    g.fillStyle = '#7d8790'; for (let a = 0; a < 512; a += 256) for (let b = 12; b < 512; b += 40) { g.fillRect(a + 8, b, 5, 5); g.fillRect(b, a + 8, 5, 5); }
    const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(this.r0, this.r0); ft.anisotropy = 4;
    const deck = new THREE.Mesh(new THREE.CircleGeometry(this.r0 + 0.1, 64), new THREE.MeshStandardMaterial({ map: ft, metalness: 0.6, roughness: 0.55 }));
    deck.rotation.x = -Math.PI / 2; deck.position.y = -0.01; deck.receiveShadow = true; this.group.add(deck);
    // caustiche anche dentro: sul pavimento e sul tappeto del ring (luce che passa dal vetro)
    const cm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uK: { value: 0.16 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; uniform float uK; varying vec3 vW; ${CAUSTIC}
        void main(){ float c = caustic(vW.xz * 1.6 + 20.0, uTime * 0.5);
          gl_FragColor = vec4(vec3(0.55, 0.9, 1.0) * c * uK, 1.0); }`,
    });
    this.causticIn = cm;
    const ov = new THREE.Mesh(new THREE.CircleGeometry(this.r0, 64), cm); ov.rotation.x = -Math.PI / 2; ov.position.y = 0.008; ov.renderOrder = 3; this.group.add(ov);
  }

  // ---------------------------------------------------------------- sabbia intorno, con le caustiche
  _sand() {
    const r1 = 26;
    const geo = new THREE.RingGeometry(this.r0 + 0.05, r1, 96, 12); geo.rotateX(-Math.PI / 2);
    const m = new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uR0: { value: this.r0 + 0.05 }, uR1: { value: r1 } }]),
      vertexShader: `varying vec3 vW;
        #include <fog_pars_vertex>
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; uniform float uR0; uniform float uR1; varying vec3 vW; ${CAUSTIC}
        #include <fog_pars_fragment>
        void main(){
          float r = length(vW.xz);
          float rip = sin(vW.x * 5.0 + sin(vW.z * 1.3) * 2.0) * 0.5 + 0.5;          // increspature
          vec3 sand = mix(vec3(0.075, 0.12, 0.11), vec3(0.1, 0.15, 0.135), rip * 0.6);   // come la sabbia della foto
          float c = caustic(vW.xz * 1.1, uTime * 0.5);
          vec3 col = sand * (0.8 + c * 0.9) + vec3(0.06, 0.12, 0.13) * c * 0.35;
          float a = 1.0 - smoothstep(uR1 * 0.55, uR1, r);                        // sfuma nella foto
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.sandMat = m;
    const sand = new THREE.Mesh(geo, m); sand.position.y = -0.05; sand.renderOrder = -5; this.group.add(sand);
  }

  // ---------------------------------------------------------------- raggi di sole
  _rays() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const gy = g.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,0.0)'); gy.addColorStop(0.15, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy; g.fillRect(0, 0, 64, 256);
    const tex = new THREE.CanvasTexture(c);
    this.rays = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.MeshBasicMaterial({ map: tex, color: 0xbff0ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      const w = 0.8 + Math.random() * 2.2, h = SURF + 2;
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      const a = Math.random() * Math.PI * 2, d = this.R + 1.5 + Math.random() * 12;
      r.userData = { a, d, ph: Math.random() * 6, sp: 0.05 + Math.random() * 0.08, base: 0.05 + Math.random() * 0.07 };
      r.renderOrder = 8; this.group.add(r); this.rays.push(r);
    }
  }

  // ---------------------------------------------------------------- pesci
  _fish() {
    const hex = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
    const SPECIES = [
      // nome, n, lunghezza, colori(x,y), forma, frequenza coda, banco
      { n: 26, L: 0.24, kind: 'tall', col: (x) => x < -0.42 ? hex(0xfff4a0) : hex(0xffd21a), school: { r: [5.5, 8], h: [1.2, 3.2], w: 0.18, spread: 1.4 } },             // pesci chirurgo gialli
      { n: 22, L: 0.28, kind: 'tall', col: (x) => x < -0.42 ? hex(0xffe14a) : (x > 0.3 ? hex(0x14246e) : hex(0x2257ff)), school: { r: [6, 9], h: [2.5, 5], w: -0.15, spread: 1.6 } },   // chirurghi blu
      { n: 14, L: 0.13, kind: 'tall', col: (x) => (Math.abs(x - 0.22) < 0.05 || Math.abs(x + 0.08) < 0.05 || x < -0.5) ? hex(0xffffff) : hex(0xff6a10), school: { r: [this.r0 + 0.8, this.r0 + 1.6], h: [0.2, 0.9], w: 0.3, spread: 0.5 } },   // pagliaccio, vicino alla base
      { n: 10, L: 0.55, kind: 'fat', col: (x, y) => y > 0.1 ? hex(0x1fa59a) : (x < -0.42 ? hex(0x7ad3ff) : hex(0x38c4b0)), school: { r: [7, 13], h: [0.6, 3], w: 0.07, spread: 4 } },   // pappagallo
    ];
    this.schools = [];
    for (const sp of SPECIES) {
      const geo = fishGeo(sp.col, sp.kind);
      const phase = new Float32Array(sp.n); for (let i = 0; i < sp.n; i++) phase[i] = Math.random() * 6.28;
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
      const mat = swimMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }, { instanced: true, head: 0.5, len: 1.2, freq: 12, k: 5, amp: 0.12 });
      this.mats.push(mat);
      const mesh = new THREE.InstancedMesh(geo, mat, sp.n); mesh.frustumCulled = false; this.group.add(mesh);
      const s = sp.school;
      const fish = [];
      for (let i = 0; i < sp.n; i++) fish.push({ o: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5), (Math.random() - 0.5) * 2).multiplyScalar(s.spread),
        f: [0.3 + Math.random() * 0.4, 0.2 + Math.random() * 0.3, 0.25 + Math.random() * 0.4], p: Math.random() * 6.28, sc: sp.L * (0.8 + Math.random() * 0.4),
        prev: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0) });
      this.schools.push({ mesh, fish, s, a: Math.random() * 6.28, rr: (s.r[0] + s.r[1]) / 2, hh: (s.h[0] + s.h[1]) / 2, t0: Math.random() * 100 });
    }
    // palla di sardine: girano tutte attorno a un centro, a strati
    const sg = fishGeo((x, y) => y > 0.05 ? [0.35, 0.45, 0.55] : [0.85, 0.88, 0.92], 'slim');
    const N = 220, ph = new Float32Array(N); for (let i = 0; i < N; i++) ph[i] = Math.random() * 6.28;
    sg.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
    const smat = swimMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.75, side: THREE.DoubleSide }, { instanced: true, head: 0.5, len: 1.2, freq: 16, k: 5, amp: 0.1 });
    this.mats.push(smat);
    this.ball = { mesh: new THREE.InstancedMesh(sg, smat, N), c: new THREE.Vector3(-9, 5, -10), f: [] };
    for (let i = 0; i < N; i++) this.ball.f.push({ th: Math.random() * 6.28, r: 0.8 + Math.random() * 1.8, y: (Math.random() - 0.5) * 2.6, w: 0.9 + Math.random() * 0.4, sc: 0.15 + Math.random() * 0.06 });
    this.ball.mesh.frustumCulled = false; this.group.add(this.ball.mesh);
  }

  // orienta un'istanza: testa (+x) lungo dir, dorso in alto, inclinata un poco in virata
  _setFish(mesh, i, pos, dir, sc, bank = 0) {
    _x.copy(dir).normalize();
    _z.crossVectors(_x, _up); if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1); _z.normalize();
    _y.crossVectors(_z, _x);
    if (bank) { _y.applyAxisAngle(_x, bank); _z.applyAxisAngle(_x, bank); }
    _basis.makeBasis(_x, _y, _z); _q.setFromRotationMatrix(_basis);
    mesh.setMatrixAt(i, _m.compose(pos, _q, _s.set(sc, sc, sc)));
  }

  // tieni fuori dalla sfera (e sopra la sabbia)
  _outside(p, margin) {
    const dx = p.x, dz = p.z, dy = p.y - this.C, d = Math.hypot(dx, dy, dz), m = this.R + margin;
    if (d < m) { const k = m / Math.max(d, 1e-3); p.set(dx * k, dy * k + this.C, dz * k); }   // (prima usava _p, che e' p stesso: finivano al centro della sfera)
    p.y = Math.max(0.15, p.y);
    return p;
  }

  _updFish(dt) {
    const t = this.t;
    for (const S of this.schools) {
      const s = S.s;
      S.a += dt * s.w / Math.max(1, S.rr) * 2.2;
      S.rr = (s.r[0] + s.r[1]) / 2 + (s.r[1] - s.r[0]) / 2 * Math.sin(t * 0.05 + S.t0);
      S.hh = (s.h[0] + s.h[1]) / 2 + (s.h[1] - s.h[0]) / 2 * Math.sin(t * 0.07 + S.t0 * 2);
      const cx = Math.cos(S.a) * S.rr, cz = Math.sin(S.a) * S.rr;
      S.fish.forEach((f, i) => {
        _p.set(cx + f.o.x + Math.sin(t * f.f[0] + f.p) * 0.6, S.hh + f.o.y + Math.sin(t * f.f[1] + f.p * 2) * 0.3, cz + f.o.z + Math.cos(t * f.f[2] + f.p) * 0.6);
        this._outside(_p, 0.6);
        const v = _s.subVectors(_p, f.prev);
        if (v.lengthSq() > 1e-8) f.dir.lerp(v.normalize(), Math.min(1, dt * 5));
        f.prev.copy(_p);
        this._setFish(S.mesh, i, _p, f.dir, f.sc);
      });
      S.mesh.instanceMatrix.needsUpdate = true;
    }
    // sardine: il centro si sposta piano, ognuna gira attorno (in senso unico), la palla "respira"
    const B = this.ball, c = B.c;
    c.set(-9 + Math.sin(t * 0.03) * 4, 5 + Math.sin(t * 0.05) * 1.5, -10 + Math.cos(t * 0.04) * 4);
    const breathe = 1 + 0.15 * Math.sin(t * 0.4);
    B.f.forEach((f, i) => {
      f.th += dt * f.w * 1.6 / f.r;
      const r = f.r * breathe;
      _p.set(c.x + Math.cos(f.th) * r, c.y + f.y + Math.sin(f.th * 2 + f.r) * 0.2, c.z + Math.sin(f.th) * r);
      _z.set(-Math.sin(f.th), 0, Math.cos(f.th));
      this._setFish(B.mesh, i, _p, _z, f.sc, -0.3);
    });
    B.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- squali
  _sharks() {
    // corpo: sezioni ellittiche lungo x (muso a punta, pancia un po' piatta, peduncolo sottile verso la coda)
    const NL = 44, NR = 22, pos = [], col = [], idx = [];
    const rad = t => t < 0.22 ? 0.3 * Math.pow(Math.sin(t / 0.22 * Math.PI / 2), 0.75) : t < 0.45 ? 0.3 : 0.3 * (0.08 + 0.92 * Math.pow(Math.cos((t - 0.45) / 0.55 * Math.PI / 2), 1.3));
    for (let i = 0; i <= NL; i++) {
      const t = i / NL, x = 1.3 - 2.6 * t, r = rad(t), yc = t < 0.15 ? -0.03 * (1 - t / 0.15) : 0;   // muso appena sotto
      for (let j = 0; j <= NR; j++) {
        const f = j / NR * Math.PI * 2, sy = Math.sin(f), cz = Math.cos(f);
        const y = yc + r * (sy > 0 ? 0.88 : 0.66) * sy, z = r * 0.7 * cz;
        pos.push(x, y, z);
        const k = THREE.MathUtils.smoothstep(sy, -0.45, 0.15);            // 0 = pancia, 1 = dorso
        const top = [0.045, 0.06, 0.075], side = [0.13, 0.16, 0.19], belly = [0.66, 0.68, 0.7];   // (colori lineari)
        const c = sy < -0.25 ? belly : k < 1 ? side.map((v, q) => belly[q] + (v - belly[q]) * THREE.MathUtils.smoothstep(sy, -0.45, -0.1)) : side;
        const mix = THREE.MathUtils.smoothstep(sy, -0.1, 0.6);
        col.push(...c.map((v, q) => v + (top[q] - v) * mix));
      }
    }
    for (let i = 0; i < NL; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const body = new THREE.BufferGeometry(); body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); body.setIndex(idx);
    // pinne: sagome (Shape) nel piano xy, colore del dorso con la punta piu' scura
    const finCol = [0.05, 0.065, 0.08];
    const fin = (pts, rotX = 0, z = 0, colr = finCol) => {
      const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
      const g = new THREE.ShapeGeometry(sh, 6); g.rotateX(rotX); g.translate(0, 0, z);
      const n = g.attributes.position.count, c = new Float32Array(n * 3);
      for (let q = 0; q < n; q++) { c[q * 3] = colr[0]; c[q * 3 + 1] = colr[1]; c[q * 3 + 2] = colr[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
    };
    const dors = fin([[0.42, 0.22], [0.25, 0.5], [0.1, 0.74], [0.02, 0.76], [-0.08, 0.5], [-0.2, 0.22]]);          // dorsale falcata
    const dors2 = fin([[-0.78, 0.1], [-0.86, 0.22], [-0.92, 0.2], [-0.96, 0.07]]);
    const anal = fin([[-0.82, -0.08], [-0.9, -0.2], [-0.97, -0.18], [-1.0, -0.05]], 0, 0, [0.3, 0.32, 0.34]);
    const tail = fin([[-1.12, 0.04], [-1.36, 0.22], [-1.62, 0.52], [-1.69, 0.5], [-1.52, 0.15], [-1.46, 0.0], [-1.55, -0.24], [-1.5, -0.27], [-1.28, -0.06], [-1.12, -0.04]]);   // coda a mezzaluna, lobo alto piu' lungo
    const pec = s => fin([[0.5, 0], [0.32, 0.05], [-0.18, 0.62], [-0.05, 0.6], [0.2, 0.25]], s * (Math.PI / 2 + 0.35), 0, [0.09, 0.11, 0.13]);
    const pecL = pec(1); pecL.translate(0, -0.13, 0.17); const pecR = pec(-1); pecR.translate(0, -0.13, -0.17);
    const pel = s => { const g = fin([[-0.45, 0], [-0.5, 0.18], [-0.6, 0.15], [-0.6, 0]], s * (Math.PI / 2 + 0.6), 0, [0.25, 0.27, 0.29]); g.translate(0, -0.12, s * 0.08); return g; };
    // occhi e branchie (cinque fessure per lato)
    const eyeG = [1, -1].map(s => { const g = new THREE.SphereGeometry(0.026, 8, 6); g.translate(0.95, 0.05, s * 0.135); return paint(g, () => [0.02, 0.02, 0.03]); });
    const gills = [];
    for (const s of [1, -1]) for (let k = 0; k < 5; k++) {
      const x = 0.66 - k * 0.045, r = rad((1.3 - x) / 2.6), g = new THREE.BoxGeometry(0.008, 0.13 - k * 0.008, 0.01);
      g.rotateZ(0.12); g.translate(x, 0.0, s * r * 0.69); gills.push(paint(g, () => [0.1, 0.12, 0.14]));
    }
    body.computeVertexNormals();                       // (normali morbide sul corpo: prima veniva a facce, a strisce)
    const parts = [body, dors, dors2, anal, tail, pecL, pecR, pel(1), pel(-1), ...eyeG, ...gills].map(g => { if (g.attributes.uv) g.deleteAttribute('uv'); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    const geo = mergeGeometries(parts);
    this.sharks = [];
    for (let i = 0; i < 2; i++) {
      const mat = swimMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.08, side: THREE.DoubleSide }, { instanced: false, head: 0.7, len: 2.5, freq: 4.2, k: 1.6, amp: 0.24 });
      mat.userData.u.uPhase = { value: i * 2 };
      const ob = mat.onBeforeCompile; mat.onBeforeCompile = sh => { sh.uniforms.uPhase = mat.userData.u.uPhase; ob(sh); };
      this.mats.push(mat);
      const m = new THREE.Mesh(geo, mat); const L = 2.4 + i * 0.5; m.scale.setScalar(L / 2.6);
      this.group.add(m);
      this.sharks.push({ m, a: i * Math.PI, r: 9 + i * 2.5, h: 2.5 + i * 1.5, sp: 1.3 + i * 0.25, dir: new THREE.Vector3(1, 0, 0), prev: new THREE.Vector3(), seed: Math.random() * 100, close: 0 });
    }
  }
  _updSharks(dt) {
    const t = this.t;
    for (const S of this.sharks) {
      // giri larghi, che ogni tanto si stringono e passano vicino al vetro
      if (S.close <= 0 && Math.random() < dt / 25) S.close = 12;
      if (S.close > 0) S.close -= dt;
      const want = S.close > 0 ? this.R + 1.6 + Math.sin(S.close / 12 * Math.PI) * -0.5 : 8.5 + 3.5 * Math.sin(t * 0.03 + S.seed);
      S.r += (want - S.r) * Math.min(1, dt * 0.25);
      S.a += dt * S.sp / S.r;
      const h = S.h + 1.5 * Math.sin(t * 0.06 + S.seed);
      _p.set(Math.cos(S.a) * S.r, h, Math.sin(S.a) * S.r);
      this._outside(_p, 1.0);
      const v = _s.subVectors(_p, S.prev);
      if (v.lengthSq() > 1e-8) S.dir.lerp(v.normalize(), Math.min(1, dt * 2));
      S.prev.copy(_p);
      this._orient(S.m, _p, S.dir, 0.35);
    }
  }
  _orient(obj, pos, dir, bank) {
    _x.copy(dir).normalize(); _z.crossVectors(_x, _up).normalize(); _y.crossVectors(_z, _x);
    _y.applyAxisAngle(_x, bank); _z.applyAxisAngle(_x, bank);
    _basis.makeBasis(_x, _y, _z); obj.quaternion.setFromRotationMatrix(_basis); obj.position.copy(pos);
  }

  // ---------------------------------------------------------------- mante
  _mantas() {
    const L = 2.2, W = 2.0;                       // lunghezza e mezza apertura alare (m)
    const nu = 20, nv = 24, pos = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv * 2 - 1;
      // pianta a rombo con le ali appuntite all'indietro; corpo piu' spesso al centro
      const span = W * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 0.85) * (u < 0.8 ? 1 : Math.max(0, 1 - (u - 0.8) * 5));
      const x = (0.45 - u) * L - Math.abs(v) * span * 0.35;
      pos.push(x, 0.16 * (1 - v * v) * Math.sin(Math.PI * u), v * span);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const tail = new THREE.CylinderGeometry(0.012, 0.03, 1.4, 5); tail.rotateZ(Math.PI / 2); tail.translate(-0.55 * L - 0.6, 0, 0);
    // pinne cefaliche (davanti alla bocca)
    const ceph = [triFin([0.45 * L, 0, 0.18], [0.45 * L + 0.3, -0.05, 0.22], [0.45 * L, -0.02, 0.3]), triFin([0.45 * L, 0, -0.18], [0.45 * L, -0.02, -0.3], [0.45 * L + 0.3, -0.05, -0.22])];
    const parts = [g.toNonIndexed(), tail.toNonIndexed(), ...ceph].map(x => { if (x.attributes.uv) x.deleteAttribute('uv'); if (x.attributes.normal) x.deleteAttribute('normal'); return x; });
    const geo = mergeGeometries(parts); geo.computeVertexNormals();
    this.mantas = [];
    for (let i = 0; i < 2; i++) {
      const mat = swimMaterial({ color: 0x1d2329, roughness: 0.7, side: THREE.DoubleSide }, { manta: true, span: W, freq: 1.6, amp: 0.55 });
      mat.userData.u.uPhase = { value: i * 1.7 };
      const ob = mat.onBeforeCompile; mat.onBeforeCompile = sh => { sh.uniforms.uPhase = mat.userData.u.uPhase; ob(sh); };
      this.mats.push(mat);
      const m = new THREE.Mesh(geo, mat); m.scale.setScalar(1 + i * 0.35); this.group.add(m);
      this.mantas.push({ m, a: i * 2.5 + 1, r: 10 + i * 3, h: 6 + i * 2.5, sp: 1.0 + i * 0.15, dir: new THREE.Vector3(1, 0, 0), prev: new THREE.Vector3(), seed: Math.random() * 100 });
    }
  }
  _updMantas(dt) {
    const t = this.t;
    for (const M of this.mantas) {
      M.a += dt * M.sp / M.r * (M === this.mantas[0] ? 1 : -1);
      const r = M.r + 3 * Math.sin(t * 0.04 + M.seed), h = M.h + 1.8 * Math.sin(t * 0.09 + M.seed);   // sale e scende mentre gira
      _p.set(Math.cos(M.a) * r, h, Math.sin(M.a) * r);
      this._outside(_p, 2.0);
      const v = _s.subVectors(_p, M.prev);
      if (v.lengthSq() > 1e-8) M.dir.lerp(v.normalize(), Math.min(1, dt * 1.5));
      M.prev.copy(_p);
      this._orient(M.m, _p, M.dir, (M === this.mantas[0] ? -1 : 1) * 0.25);
    }
  }

  // ---------------------------------------------------------------- meduse luminose
  _jellies() {
    this.jellies = [];
    const cols = [0xff7ad9, 0x7ae8ff, 0xffb86b, 0xb98bff];
    for (let i = 0; i < 9; i++) {
      const col = new THREE.Color(cols[i % cols.length]);
      const J = new THREE.Group();
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      core.position.y = 0.05; core.scale.y = 0.6;
      J.add(bell, core);
      // tentacoli: linee che ondeggiano
      const tl = [], n = 10;
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; for (let s = 0; s < 6; s++) tl.push(Math.cos(a) * 0.18, -s * 0.12, Math.sin(a) * 0.18, Math.cos(a) * 0.18, -(s + 1) * 0.12, Math.sin(a) * 0.18); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(tl, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      J.add(lines);
      const a = Math.random() * 6.28, d = this.R + 2 + Math.random() * 9;
      J.position.set(Math.cos(a) * d, 1 + Math.random() * 9, Math.sin(a) * d);
      J.scale.setScalar(0.7 + Math.random() * 0.9);
      this.group.add(J);
      this.jellies.push({ J, bell, lines, base: lg.attributes.position.array.slice(), ph: Math.random() * 6.28, f: 0.7 + Math.random() * 0.5, vy: 0.1 + Math.random() * 0.12 });
    }
  }
  _updJellies(dt) {
    for (const j of this.jellies) {
      const k = Math.sin(this.t * j.f * 2 + j.ph);                          // pulsazione della campana
      j.bell.scale.set(1 + 0.12 * k, 1 - 0.18 * k, 1 + 0.12 * k);
      j.J.position.y += dt * j.vy * (0.6 + 0.8 * Math.max(0, -k));          // spinta quando si chiude
      j.J.position.x += dt * 0.05 * Math.sin(this.t * 0.1 + j.ph);
      if (j.J.position.y > SURF - 2) j.J.position.y = 0.5;
      const p = j.lines.geometry.attributes.position, b = j.base;
      for (let i = 0; i < p.count; i++) {
        const y = b[i * 3 + 1];
        p.array[i * 3] = b[i * 3] + Math.sin(this.t * 1.5 + y * 6 + j.ph) * 0.04 * -y * 3;
        p.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(this.t * 1.3 + y * 5 + j.ph) * 0.04 * -y * 3;
      }
      p.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- bolle e particelle
  _dotTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(24, 22, 5, 0, Math.PI * 2); g.fill();   // riflesso
    return new THREE.CanvasTexture(c);
  }
  _bubbles() {
    // prese d'aria sulla base della sfera e qualche fessura nel fondale: filari di bolle che salgono oscillando
    this.vents = [];
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; this.vents.push(new THREE.Vector3(Math.cos(a) * (this.r0 + 0.2), 0.2, Math.sin(a) * (this.r0 + 0.2))); }
    for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28, d = this.R + 3 + Math.random() * 12; this.vents.push(new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d)); }
    const N = 260, pos = new Float32Array(N * 3), size = new Float32Array(N);
    this.bub = [];
    for (let i = 0; i < N; i++) {
      const b = { v: i % this.vents.length, y: Math.random() * SURF, s: 0.03 + Math.random() * 0.07, ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 0.6 };
      this.bub.push(b); size[i] = b.s;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTex: { value: this._dotTex() }, uScale: { value: 900 } },
      vertexShader: `attribute float size; uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; void main(){ vec4 c = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(0.85, 0.97, 1.0), c.a * 0.8); }`,
    });
    this.bubPts = new THREE.Points(g, m); this.bubPts.frustumCulled = false; this.group.add(this.bubPts);
  }
  _snow() {
    // particelle in sospensione: puntini chiari che vagano piano (danno profondita' all'acqua)
    const N = 700, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * 6.28, d = this.R + 0.5 + Math.random() * 18;
      pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = Math.sin(a) * d;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snowBase = pos.slice();
    const m = new THREE.PointsMaterial({ color: 0xcfeff5, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true });
    this.snowPts = new THREE.Points(g, m); this.snowPts.frustumCulled = false; this.group.add(this.snowPts);
  }
  _updParticles(dt) {
    const p = this.bubPts.geometry.attributes.position;
    for (let i = 0; i < this.bub.length; i++) {
      const b = this.bub[i], v = this.vents[b.v];
      b.y += dt * b.sp * (0.8 + b.s * 4);
      if (b.y > SURF) b.y = v.y;
      const wob = 0.08 + (b.y - v.y) * 0.04;
      p.array[i * 3] = v.x + Math.sin(this.t * 3 + b.ph + b.y * 2) * wob;
      p.array[i * 3 + 1] = b.y;
      p.array[i * 3 + 2] = v.z + Math.cos(this.t * 2.6 + b.ph + b.y * 2) * wob;
    }
    p.needsUpdate = true;
    const q = this.snowPts.geometry.attributes.position, s0 = this.snowBase, t = this.t;
    for (let i = 0; i < q.count; i++) {
      q.array[i * 3] = s0[i * 3] + Math.sin(t * 0.13 + i) * 0.4;
      q.array[i * 3 + 1] = s0[i * 3 + 1] + Math.sin(t * 0.09 + i * 1.7) * 0.3;
      q.array[i * 3 + 2] = s0[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.7) * 0.4;
    }
    q.needsUpdate = true;
  }

  // ---------------------------------------------------------------- un fotogramma
  // cam: posizione della camera nel mondo (i raggi la guardano). Ritorna la luce del sole che tremola (0.85..1.15)
  update(dt, cam) {
    this.t += dt;
    for (const m of this.mats) m.userData.u.uTime.value = this.t;
    this.glassMat.uniforms.uTime.value = this.t;
    this.sandMat.uniforms.uTime.value = this.t;
    this.causticIn.uniforms.uTime.value = this.t;
    this._updFish(dt); this._updSharks(dt); this._updMantas(dt); this._updJellies(dt); this._updParticles(dt);
    // raggi: ondeggiano e pulsano; ruotati verso di te attorno alla verticale
    const lc = cam ? this.group.worldToLocal(_p.copy(cam)) : null;
    for (const r of this.rays) {
      const u = r.userData; u.a += dt * 0.004;
      r.position.set(Math.cos(u.a) * u.d + Math.sin(this.t * u.sp + u.ph) * 0.8, (SURF + 2) / 2 - 1, Math.sin(u.a) * u.d);
      r.rotation.z = 0.12 + Math.sin(this.t * u.sp * 0.7 + u.ph) * 0.05;     // inclinati come il sole
      if (lc) r.rotation.y = Math.atan2(lc.x - r.position.x, lc.z - r.position.z);
      r.material.opacity = u.base * (0.6 + 0.4 * Math.sin(this.t * u.sp * 3 + u.ph));
    }
    return 1 + 0.08 * Math.sin(this.t * 1.7) * Math.sin(this.t * 0.63 + 1);
  }
}
