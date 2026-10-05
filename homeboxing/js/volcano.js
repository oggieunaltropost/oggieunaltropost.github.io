// Stage "Vulcano": il ring su una piana di lava nera. Sfondo = foto a 360 gradi fatta in Blender
// (blender/create_volcano.py: vulcano con le colate, montagne scure, cielo di cenere arrossato, pennacchio).
// Davanti, in 3D:
//  - la terra lavica vicina (colore preso pixel per pixel dalla foto: niente giunta) con le crepe che brillano e pulsano;
//  - tre fiumi di lava che girano attorno al ring: lava che scorre, placche di crosta scura che si rompono,
//    bordi raffreddati; ogni tanto uno schizzo di fuoco incandescente (gocce che volano e ricadono) col suo suono;
//  - fumo e vapore che salgono dai fiumi;
//  - l'eruzione sul vulcano lontano: bagliore del cratere che pulsa, lapilli incandescenti che salgono e ricadono,
//    nuvole di fumo che escono e salgono; ogni tanto un'esplosione piu' forte col boato.
import * as THREE from 'three';
import { contactShadow } from './contact_shadow.js?v=20261005210207';
import * as sfx from './sfx.js?v=20261005210207';

const EYE = 1.65;
const R_FADE0 = 11, R_FADE1 = 17;
// direzione del cratere nella foto, misurata sull'immagine (u 0,551, 21,8 gradi sopra l'orizzonte; il vulcano sta sopra
// le colline del rumore di fondo, piu' alto di quanto dice la sola formula del cono)
const CRATER_DIR = new THREE.Vector3(0.8815, 0.371, 0.2924).normalize();
const CRATER_DIST = 5013, SKY_D = 780, K = SKY_D / CRATER_DIST;           // l'eruzione 3D sta a 780 m, rimpicciolita in proporzione
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const ss = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// i fiumi di lava (x, z del ring), larghezza: girano attorno al ring a 4,5-15 m, escono verso la foto
const RIVERS = [
  { w: 2.4, pts: [[-17, -7], [-11, -6.5], [-6.5, -5], [-5, -1], [-5.6, 3.5], [-8.5, 7.5], [-13, 10], [-17, 12]] },
  { w: 1.7, pts: [[17, 2], [11.5, 3.2], [7.5, 5], [5.4, 8], [4.6, 12], [3.5, 17]] },
  { w: 2.0, pts: [[-4, -17], [-1.5, -11.5], [1.8, -7.2], [6.5, -6.8], [10.5, -9.5], [14, -14]] },
];

export class Volcano {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'vulcano';
    this.keyDir = CRATER_DIR.clone().setY(0.35).normalize();
    this.t = 0;
    this._sky(); this._riverCurves(); this._ground(); this._rivers(); this._rocks(); this._sparks(); this._smoke(); this._eruption();
    this.nextSplash = 2; this.nextBoom = 8 + Math.random() * 10;
  }
  // ---------------------------------------------------------------- foto a 360 gradi
  _sky() {
    const img = new Image();
    const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    img.onload = () => { tex.needsUpdate = true; this.skyLoaded = true; this._tintGround(img); if (this.onSkyLoad) this.onSkyLoad(); };
    img.src = 'assets/vulcano_panorama.jpg?v=20261005210207';
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uPano: { value: tex } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uPano; varying vec3 vD;
        void main(){ vec3 d = normalize(vD);
          vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), m);
    sky.renderOrder = -10; sky.frustumCulled = false; this.group.add(sky);
  }
  // ---------------------------------------------------------------- terra lavica vicina
  _ground() {
    const RS = 60, AS = 200, geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let i = 0; i <= RS; i++) for (let j = 0; j <= AS; j++) {
      const a = j / AS * Math.PI * 2, r = i === 0 ? 0 : 0.6 + Math.pow(i / RS, 1.4) * (R_FADE1 - 0.6), x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, r < 2.8 ? -0.004 : this._lump(x, z) - 0.004, z); uv.push(x / 2.2, z / 2.2);
    }
    for (let i = 0; i < RS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals();
    this.baseY = new Map(); this.baseY.set(geo, Float32Array.from(geo.attributes.position.array));
    const n = geo.attributes.position.count, col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 4] = 0.03; col[i * 4 + 1] = 0.025; col[i * 4 + 2] = 0.022; col[i * 4 + 3] = 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.groundGeo = geo;
    const [rock, cracks] = this._rockTex();
    const mat = new THREE.MeshBasicMaterial({ map: rock, vertexColors: true, transparent: true, depthWrite: true, toneMapped: false });
    const g = new THREE.Mesh(geo, mat); g.renderOrder = -5; this.group.add(g);
    // crepe incandescenti (sopra, additive): pulsano piano come se la lava respirasse sotto la crosta
    this.crackMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1,
      uniforms: { uTex: { value: cracks }, uT: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying float vR; void main(){ vUv = uv; vR = length(position.xz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uT; varying vec2 vUv; varying float vR;
        void main(){ float c = texture2D(uTex, vUv).r;
          float p = 0.55 + 0.45 * sin(uT * 1.3 + vUv.x * 2.1 + vUv.y * 1.7) * sin(uT * 0.7 - vUv.y * 2.9);
          float a = c * p * (1.0 - smoothstep(${R_FADE0.toFixed(1)}, ${R_FADE1.toFixed(1)}, vR)) * smoothstep(2.4, 3.2, vR);
          gl_FragColor = vec4(vec3(1.0, 0.3, 0.04) * a * 2.2, 1.0); }`,
    });
    const cg = new THREE.Mesh(geo, this.crackMat); cg.renderOrder = -4; this.group.add(cg);
  }
  // basalto: nero con grana e vesciche; e la mappa delle crepe (linee sottili che si ramificano)
  _rockTex() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const im = g.createImageData(S, S), d = im.data;
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * Math.PI * 2, v = y / S * Math.PI * 2;
      let k = 1 + 0.25 * Math.sin(u * 3 + Math.sin(v * 2) * 2) * Math.sin(v * 4 + Math.sin(u * 3)) + (hash(x, y) - 0.5) * 0.5;
      if (hash(x + 3, y + 9) > 0.995) k *= 0.3;                             // vesciche
      const val = Math.max(0, Math.min(255, k * 150));
      d[(y * S + x) * 4] = val; d[(y * S + x) * 4 + 1] = val * 0.92; d[(y * S + x) * 4 + 2] = val * 0.88; d[(y * S + x) * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const rock = new THREE.CanvasTexture(c); rock.wrapS = rock.wrapT = THREE.RepeatWrapping; rock.colorSpace = THREE.SRGBColorSpace; rock.anisotropy = 8;
    const c2 = document.createElement('canvas'); c2.width = c2.height = 1024; const h = c2.getContext('2d');
    h.fillStyle = '#000'; h.fillRect(0, 0, 1024, 1024); h.lineCap = 'round';
    const crack = (x, y, a, len, w) => {                                   // crepa che serpeggia e si ramifica
      for (let i = 0; i < len; i++) {
        const nx = x + Math.cos(a) * 9, ny = y + Math.sin(a) * 9;
        h.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.random()})`; h.lineWidth = w; h.beginPath(); h.moveTo(x, y); h.lineTo(nx, ny); h.stroke();
        for (const [ox, oy] of [[0, 0], [1024, 0], [-1024, 0], [0, 1024], [0, -1024]]) if (ox || oy) { h.beginPath(); h.moveTo(x + ox, y + oy); h.lineTo(nx + ox, ny + oy); h.stroke(); }
        x = nx; y = ny; a += (Math.random() - 0.5) * 0.7; w = Math.max(0.6, w * 0.985);
        if (Math.random() < 0.05 && len > 10) crack(x, y, a + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6), len * 0.4 | 0, w * 0.7);
      }
    };
    for (let k = 0; k < 22; k++) crack(Math.random() * 1024, Math.random() * 1024, Math.random() * 6.28, 30 + Math.random() * 50, 6 + Math.random() * 6);
    // sfocatura una volta sola sull'immagine finita (prima ogni tratto era sfocato: migliaia di sfocature, lentissimo)
    const c3 = document.createElement('canvas'); c3.width = c3.height = 1024; const h3 = c3.getContext('2d');
    h3.filter = 'blur(1.2px)'; h3.drawImage(c2, 0, 0);
    const cracks = new THREE.CanvasTexture(c3); cracks.wrapS = cracks.wrapT = THREE.RepeatWrapping;
    return [rock, cracks];
  }
  // terreno lavico a placche e cordoni (rilievo di pochi centimetri, piatto sotto e vicino al ring)
  _lump(x, z) {
    const r = Math.hypot(x, z), k = Math.min(1, Math.max(0, (r - 3) / 2));
    const dR = this.riverPts ? this._riverDist(x, z) : 9;                  // vicino ai fiumi il terreno scende: la lava sta nel suo letto
    const bed = dR < 0.6 ? -0.06 * (1 - Math.max(0, dR) / 0.6) : 0;
    return bed + k * Math.min(1, Math.max(0, dR / 1.2)) * (0.05 * Math.sin(x * 2.1 + Math.sin(z * 1.3) * 1.7) * Math.sin(z * 1.7 + Math.sin(x * 0.9) * 2.0) + 0.025 * Math.sin(x * 5.3 + z * 4.1));
  }
  // distanza dal fiume piu' vicino (per la luce rossa della lava sulle rocce attorno)
  // (griglia da 0,2 m precalcolata in _riverCurves: prima si misurava da tutti i 660 punti dei fiumi per ogni vertice,
  // milioni di conti al caricamento; fuori dalla griglia o lontano dai fiumi: 99)
  _riverDist(x, z) {
    const G = this.rdGrid; if (!G) return 99;
    const fx = (x + G.H) / G.C, fz = (z + G.H) / G.C, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= G.N - 1 || j >= G.N - 1) return 99;
    const tx = fx - i, tz = fz - j, d = G.d, N = G.N;
    return (d[j * N + i] * (1 - tx) + d[j * N + i + 1] * tx) * (1 - tz) + (d[(j + 1) * N + i] * (1 - tx) + d[(j + 1) * N + i + 1] * tx) * tz;
  }
  _riverCurves() {
    this.riverPts = RIVERS.map(R => {
      const curve = new THREE.CatmullRomCurve3(R.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
      return { curve, w: R.w, pts: curve.getSpacedPoints(220) };
    });
    const H = R_FADE1 + 2, C = 0.2, N = Math.ceil(2 * H / C) + 1, d = new Float32Array(N * N).fill(99), RAD = 4.8;   // (fino a ~3,5 m dalla riva)
    for (const R of this.riverPts) for (const p of R.pts) {           // ogni punto aggiorna solo le celle vicine
      const i0 = Math.max(0, Math.floor((p.x - RAD + H) / C)), i1 = Math.min(N - 1, Math.ceil((p.x + RAD + H) / C));
      const j0 = Math.max(0, Math.floor((p.z - RAD + H) / C)), j1 = Math.min(N - 1, Math.ceil((p.z + RAD + H) / C));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dd = Math.hypot(i * C - H - p.x, j * C - H - p.z) - R.w / 2;
        if (dd < d[j * N + i]) d[j * N + i] = dd;
      }
    }
    this.rdGrid = { H, C, N, d };
  }
  _tintGround(img) {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H); const px = g.getImageData(0, 0, W, H).data;
    const pos = this.groundGeo.attributes.position, col = this.groundGeo.attributes.color, nor = this.groundGeo.attributes.normal;
    const L = new THREE.Vector3(0.6, 0.55, 0.3).normalize();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
      _v.set(x, -EYE, z).normalize();
      const u = ((Math.atan2(_v.z, _v.x) / (Math.PI * 2) + 0.5) % 1 + 1) % 1, v = Math.asin(_v.y) / Math.PI + 0.5;
      const pi = (Math.min(H - 1, Math.floor((1 - v) * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      const lin = k => Math.pow(px[pi + k] / 255, 2.2) / 0.32;              // (la grana del basalto ha media ~0,32)
      // vicino: basalto (la texture si vede bene) con il rilievo; verso il bordo: il colore della foto
      const lit = 0.55 + 0.9 * Math.max(0, nor.getX(i) * L.x + nor.getY(i) * L.y + nor.getZ(i) * L.z - 0.55);
      const far = ss(7, R_FADE1 - 1, r), base = [0.085 * lit, 0.07 * lit, 0.065 * lit];
      // luce della lava: rosso-arancio sulle rocce fino a ~2,5 m dai fiumi
      const dR = r < 2.8 ? 99 : this._riverDist(x, z), glow = Math.max(0, 1 - dR / 2.5) ** 2;
      const c = [0, 1, 2].map(k => base[k] * (1 - far) + lin(k) * far + glow * [0.75, 0.12, 0.02][k] * (1 - far * 0.5));
      col.setXYZW(i, c[0], c[1], c[2], 1 - ss(R_FADE0, R_FADE1, r));
    }
    col.needsUpdate = true;
  }
  // ---------------------------------------------------------------- fiumi di lava
  _rivers() {
    this.lavaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 } },
      vertexShader: `attribute float aR; attribute float aS; varying vec2 vUv; varying float vR; varying float vS; void main(){ vUv = uv; vR = aR; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT; varying vec2 vUv; varying float vR; varying float vS;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
        // placche di crosta (celle) che scorrono, con le fessure calde tra l'una e l'altra
        float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 9.0, d2 = 9.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), o = vec2(h(i + g), h(i + g + 17.0));
            float dd = length(g + o - f); if (dd < d){ d2 = d; d = dd; } else if (dd < d2) d2 = dd; }
          return d2 - d; }
        void main(){
          float across = abs(vS);                                          // 0 al centro, 1 sulla riva (vUv in metri)
          float speed = 0.3;                                               // (uguale su tutta la larghezza: se no col tempo il disegno si stira in righe)
          vec2 p = vec2(vUv.x - uT * speed, vUv.y);
          float heat = fbm(p * 1.5 + vec2(-uT * 0.15, 0.0));
          float edge = cells(p * 1.6 + vec2(fbm(p * 2.0 + uT * 0.05) * 1.2, 0.0));
          float crust = smoothstep(0.05, 0.22, edge) * smoothstep(0.15, 0.85, across + 0.35 * heat);   // crosta piu' fitta verso le rive
          float t = clamp(1.0 - crust + 0.25 * heat - across * 0.4, 0.0, 1.0);
          vec3 hot = mix(vec3(0.85, 0.08, 0.01), vec3(1.0, 0.55, 0.08), smoothstep(0.4, 1.0, t));
          hot = mix(hot, vec3(1.0, 0.85, 0.45), smoothstep(0.85, 1.0, t) * 0.6);
          vec3 cool = vec3(0.045, 0.03, 0.025) + vec3(0.12, 0.02, 0.0) * (1.0 - smoothstep(0.0, 0.12, edge));
          vec3 col = mix(cool, hot * (1.4 + 0.3 * sin(uT * 2.0 + vUv.x)), t);
          float bank = smoothstep(1.0, 0.82, across);                      // riva: sfuma nella roccia
          float a = bank * (1.0 - smoothstep(${R_FADE0.toFixed(1)}, ${R_FADE1.toFixed(1)}, vR));
          gl_FragColor = vec4(col, a);
        }`,
    });
    this.riverPaths = [];
    const bankMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false, side: THREE.DoubleSide });
    bankMat.vertexAlphas = true;
    for (const R of RIVERS) {
      const curve = new THREE.CatmullRomCurve3(R.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
      const N = 160, L = curve.getLength(), P = [], uv = [], ar = [], as = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3(-tg.z, 0, tg.x);
        const w = R.w * (0.85 + 0.25 * Math.sin(t * 13.0 + R.w * 7));
        for (const s of [-1, 1]) { const q = p.clone().addScaledVector(side, s * w / 2); P.push(q.x, -0.02, q.z); uv.push(t * L, s * w / 2); as.push(s); ar.push(Math.hypot(q.x, q.z)); }
        if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('aR', new THREE.Float32BufferAttribute(ar, 1)); geo.setAttribute('aS', new THREE.Float32BufferAttribute(as, 1)); geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, this.lavaMat); mesh.renderOrder = -3; this.group.add(mesh);
      this.baseY.set(geo, Float32Array.from(geo.attributes.position.array));
      this.riverPaths.push({ curve, L, w: R.w });
      // argini: dal pelo della lava salgono ~10 cm e scendono sul terreno; bordo interno incandescente, fuori nero
      const B = [], BC = [], BI = [], prof = [[0, -0.02, 0.85], [0.07, 0.08, 0.12], [0.3, 0.06, 0.0], [0.6, 0.0, 0]];   // (solo il bordo sulla lava brilla)
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3(-tg.z, 0, tg.x);
        const w = R.w * (0.85 + 0.25 * Math.sin(t * 13.0 + R.w * 7)), wob = 0.06 * Math.sin(t * 57 + R.w);
        for (const sgn of [-1, 1]) for (const [o, h, hot] of prof) {
          const q = p.clone().addScaledVector(side, sgn * (w / 2 + o + (o > 0 ? wob : 0)));
          const r = Math.hypot(q.x, q.z), a = 1 - ss(R_FADE0, R_FADE1, r);
          B.push(q.x, h + (o > 0 ? this._lump(q.x, q.z) * 0.5 : 0), q.z);
          const gr = 0.7 + 0.6 * Math.abs(Math.sin(q.x * 7.1 + q.z * 5.3));            // crosta a chiazze
          BC.push(0.03 * gr + hot * 0.9, 0.025 * gr + hot * 0.2, 0.023 * gr + hot * 0.03, a * (o >= 0.6 ? 0 : 1));
        }
        if (i < N) for (const sgn of [0, 1]) for (let k = 0; k < 3; k++) {
          const a = i * 8 + sgn * 4 + k, b = a + 8; BI.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(B, 3));
      bg.setAttribute('color', new THREE.Float32BufferAttribute(BC, 4)); bg.setIndex(BI);
      const bank = new THREE.Mesh(bg, bankMat); bank.renderOrder = -2; this.group.add(bank);
      this.baseY.set(bg, Float32Array.from(bg.attributes.position.array));
    }
  }
  _rocks() {
    const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {                                  // masso irregolare, schiacciato
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.28 * Math.sin(x * 3.1 + y * 2.3) * Math.sin(z * 2.7 + x * 1.3);
      p.setXYZ(i, x * k, Math.max(-0.2, y * k * 0.6), z * k);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b1716, roughness: 0.95, metalness: 0, flatShading: true });
    const list = [];
    const ok = (x, z, s) => Math.max(Math.abs(x), Math.abs(z)) > 3.0 && this._riverDist(x, z) > s * 0.8 + 0.1;
    for (const R of this.riverPts) for (let k = 0; k < 26; k++) {           // lungo le rive
      const t = Math.random(), q = R.curve.getPointAt(t), tg = R.curve.getTangentAt(t), sd = new THREE.Vector3(-tg.z, 0, tg.x);
      const s = 0.12 + Math.random() * 0.35, off = R.w / 2 + 0.45 + s + Math.random() * 0.8;
      const x = q.x + sd.x * off * (Math.random() < 0.5 ? -1 : 1), z = q.z + sd.z * off * (Math.random() < 0.5 ? -1 : 1);
      if (ok(x, z, s) && Math.hypot(x, z) < R_FADE1 - 1) list.push([x, z, s]);
    }
    for (let k = 0; k < 140 && list.length < 160; k++) {                  // nella piana
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * (R_FADE1 - 5), x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.08 + Math.random() ** 2 * 0.6;
      if (ok(x, z, s)) list.push([x, z, s]);
    }
    const im = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const col = new THREE.Color();
    list.forEach(([x, z, s], i) => {
      e.set(Math.random() * 0.4, Math.random() * 6.28, Math.random() * 0.4); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, this._lump(x, z) + s * 0.25, z), q, new THREE.Vector3(s * (0.8 + Math.random() * 0.6), s, s * (0.8 + Math.random() * 0.6)));
      im.setMatrixAt(i, m);
      const glow = Math.max(0, 1 - this._riverDist(x, z) / 2.0);              // vicino alla lava: rossiccio
      im.setColorAt(i, col.setRGB(0.11 + glow * 0.5, 0.09 + glow * 0.1, 0.085));
    });
    im.receiveShadow = false; im.castShadow = false; this.group.add(im);
  }
  _onRiver() {                                                         // punto a caso sul pelo della lava (sulla terra 3D)
    for (let k = 0; k < 20; k++) {
      const R = this.riverPaths[Math.floor(Math.random() * this.riverPaths.length)], p = R.curve.getPointAt(Math.random());
      const r = Math.hypot(p.x, p.z); if (r > 4.2 && r < 13) return p.setY(0.03);
    }
    return null;
  }
  // ---------------------------------------------------------------- schizzi di lava (gocce incandescenti)
  _sparks() {
    const N = 900, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(N), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N), 1));
    this.spV = new Float32Array(N * 3); this.spN = N; this.spI = 0;
    this.sparkMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uH: { value: 800 } },
      vertexShader: `attribute float aLife; attribute float aSize; uniform float uH; varying float vL;
        void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aLife > 0.0 ? clamp(aSize * projectionMatrix[1][1] * uH / -mv.z, 1.5, 40.0) : 0.0; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vL; void main(){ if (vL <= 0.0) discard; float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d);
        vec3 c = mix(vec3(0.9, 0.12, 0.01), vec3(1.0, 0.75, 0.3), clamp(vL, 0.0, 1.0)); gl_FragColor = vec4(c * a * (0.4 + vL), 1.0); }`,
    });
    const pts = new THREE.Points(geo, this.sparkMat); pts.frustumCulled = false; pts.renderOrder = 6; this.group.add(pts);
    this.sparkPts = pts;
    // fiammata dello schizzo: un bagliore che si accende e si spegne
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.3, 'rgba(255,120,20,0.7)'); gr.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.glowTex = new THREE.CanvasTexture(c);
    this.flashes = Array.from({ length: 4 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0 }));
      s.renderOrder = 7; this.group.add(s); return { s, t: 9 }; });
  }
  _splash(p, power = 1) {
    const pos = this.sparkPts.geometry.attributes.position.array, life = this.sparkPts.geometry.attributes.aLife.array, size = this.sparkPts.geometry.attributes.aSize.array;
    const n = Math.round(40 + 50 * power);
    for (let k = 0; k < n; k++) {
      const i = this.spI; this.spI = (i + 1) % this.spN;
      const a = Math.random() * Math.PI * 2, h = (0.3 + Math.random() * 1.3) * power, up = (2.2 + Math.random() * 3.5) * power;
      pos[i * 3] = p.x + Math.cos(a) * 0.15; pos[i * 3 + 1] = p.y + 0.02; pos[i * 3 + 2] = p.z + Math.sin(a) * 0.15;
      this.spV[i * 3] = Math.cos(a) * h; this.spV[i * 3 + 1] = up; this.spV[i * 3 + 2] = Math.sin(a) * h;
      life[i] = 1.0 + Math.random() * 0.4; size[i] = 0.02 + Math.random() * 0.05;
    }
    const F = this.flashes.find(f => f.t > 0.8) || this.flashes[0]; F.t = 0; F.s.position.copy(p).setY(0.35); F.power = power;
  }
  _updSparks(dt) {
    const G = this.sparkPts.geometry, pos = G.attributes.position.array, life = G.attributes.aLife.array, v = this.spV;
    for (let i = 0; i < this.spN; i++) {
      if (life[i] <= 0) continue;
      v[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += v[i * 3] * dt; pos[i * 3 + 1] += v[i * 3 + 1] * dt; pos[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.02) { pos[i * 3 + 1] = 0.02; v[i * 3] *= 0.3; v[i * 3 + 2] *= 0.3; v[i * 3 + 1] = 0; life[i] -= dt * 2.5; }   // a terra: si spegne
      life[i] -= dt * 0.55;
    }
    G.attributes.position.needsUpdate = true; G.attributes.aLife.needsUpdate = true; G.attributes.aSize.needsUpdate = true;
    for (const F of this.flashes) {
      F.t += dt; const k = F.t < 0.12 ? F.t / 0.12 : Math.max(0, 1 - (F.t - 0.12) / 0.7);
      F.s.material.opacity = k * 0.55; F.s.scale.setScalar((0.35 + 0.45 * (F.power || 1)) * (0.6 + 0.6 * k));
    }
  }
  // ---------------------------------------------------------------- fumo e vapore che salgono dai fiumi
  _smokeTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    for (let k = 0; k < 14; k++) {                                         // nuvoletta fatta di sbuffi
      const x = 64 + (Math.random() - 0.5) * 50, y = 64 + (Math.random() - 0.5) * 50, r = 18 + Math.random() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }
  _smoke() {
    this.smokeTex = this._smokeTex();
    this.puffs = Array.from({ length: 26 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, color: 0x4a3f3a, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
      s.renderOrder = 4; this.group.add(s); return { s, t: Math.random() * 6, life: 6, p: new THREE.Vector3(), rot: Math.random() * 6 };
    });
  }
  _updSmoke(dt) {
    for (const P of this.puffs) {
      P.t += dt;
      if (P.t > P.life) { const p = this._onRiver(); if (!p) continue; P.p.copy(p); P.t = 0; P.life = 5 + Math.random() * 4; P.s.material.rotation = Math.random() * 6; }
      const k = P.t / P.life;
      P.s.position.set(P.p.x + Math.sin(this.t * 0.3 + P.rot) * k * 0.6, 0.2 + k * 3.2, P.p.z + k * 0.8);
      P.s.scale.setScalar(0.6 + k * 2.6);
      P.s.material.opacity = 0.22 * Math.sin(Math.PI * k);
      // fumo scuro; in basso prende la luce rossa della lava
      P.s.material.color.setRGB(0.12 + 0.22 * (1 - k), 0.09 + 0.04 * (1 - k), 0.08);
    }
  }
  // ---------------------------------------------------------------- eruzione sul vulcano lontano
  _eruption() {
    const C = CRATER_DIR.clone().multiplyScalar(SKY_D); C.y += EYE * (1 - K);            // cratere (rimpicciolito verso l'occhio)
    this.crater = C;
    this.cGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0.8, fog: false }));
    this.cGlow.position.copy(C); this.cGlow.scale.setScalar(900 * K); this.cGlow.renderOrder = -8; this.group.add(this.cGlow);
    // lapilli: punti incandescenti lanciati dal cratere che ricadono sui fianchi
    const N = 500, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(N), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N).fill(9 * K), 1));
    this.bombs = new THREE.Points(geo, this.sparkMat); this.bombs.frustumCulled = false; this.bombs.renderOrder = -7; this.group.add(this.bombs);
    this.bV = new Float32Array(N * 3); this.bI = 0;
    // nuvole di fumo che escono dal cratere e salgono (grandi, scure, illuminate dal basso)
    this.cPuffs = Array.from({ length: 22 }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, color: 0x2a2422, transparent: true, depthWrite: false, opacity: 0, fog: false }));
      s.renderOrder = -6; this.group.add(s); return { s, t: i * 1.2, life: 26, dx: (Math.random() - 0.5), rot: Math.random() * 6 };
    });
  }
  _throw(power) {
    const G = this.bombs.geometry, pos = G.attributes.position.array, life = G.attributes.aLife.array, n = Math.round(12 + 50 * power);
    for (let k = 0; k < n; k++) {
      const i = this.bI; this.bI = (i + 1) % life.length;
      pos[i * 3] = this.crater.x; pos[i * 3 + 1] = this.crater.y; pos[i * 3 + 2] = this.crater.z;
      const a = Math.random() * Math.PI * 2, h = (40 + Math.random() * 160) * power, up = (120 + Math.random() * 220) * power;
      this.bV[i * 3] = Math.cos(a) * h * K; this.bV[i * 3 + 1] = up * K; this.bV[i * 3 + 2] = Math.sin(a) * h * K;
      life[i] = 1.4 + Math.random();
    }
  }
  _updEruption(dt, cam) {
    // bagliore del cratere: respira, con guizzi; esplosioni: lampo + tanti lapilli + boato (arriva in ritardo: e' lontano)
    const t = this.t;
    let g = 0.65 + 0.2 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 3.7) * Math.sin(t * 1.3);
    this.nextBoom -= dt;
    if (this.nextBoom <= 0) {
      const big = Math.random() < 0.35; this.boom = big ? 1 : 0.6; this.nextBoom = big ? 18 + Math.random() * 20 : 6 + Math.random() * 10;
      this._throw(big ? 1.3 : 0.7);
      this.boomSound = 1.2 + Math.random() * 0.8;                       // (5 km: il suono arriva dopo il lampo)
      this.lastBig = big;
    }
    if (this.boomSound > 0 && (this.boomSound -= dt) <= 0 && cam) sfx.eruption(this.group.localToWorld(this.crater.clone()), cam, this.lastBig ? 1 : 0.6);
    if (Math.random() < dt * 3) this._throw(0.25);                    // lancio continuo, piccolo
    this.boom = Math.max(0, (this.boom || 0) - dt * 0.8);
    g += this.boom * 1.2;
    this.cGlow.material.opacity = Math.min(1, g * 0.85); this.cGlow.scale.setScalar((700 + 500 * g) * K);
    const G = this.bombs.geometry, pos = G.attributes.position.array, life = G.attributes.aLife.array, v = this.bV;
    for (let i = 0; i < life.length; i++) {
      if (life[i] <= 0) continue;
      v[i * 3 + 1] -= 9.8 * K * 6 * dt;                                     // (tempo accelerato: a 5 km sembrerebbero fermi)
      pos[i * 3] += v[i * 3] * dt * 2.5; pos[i * 3 + 1] += v[i * 3 + 1] * dt * 2.5; pos[i * 3 + 2] += v[i * 3 + 2] * dt * 2.5;
      life[i] -= dt * 0.5;
    }
    G.attributes.position.needsUpdate = true; G.attributes.aLife.needsUpdate = true;
    for (const P of this.cPuffs) {
      P.t += dt * (1 + this.boom);
      if (P.t > P.life) { P.t = 0; P.dx = Math.random() - 0.5; P.s.material.rotation = Math.random() * 6; }
      const k = P.t / P.life;
      P.s.position.copy(this.crater).add(_v.set((P.dx * 300 + k * 900) * K, (60 + k * 2600) * K, (k * 500) * K));
      P.s.scale.setScalar((350 + k * 2200) * K);
      P.s.material.opacity = 0.6 * Math.min(1, k * 8) * (1 - k);
      const lit = Math.max(0, 1 - k * 3) * (0.6 + 0.4 * g);
      P.s.material.color.setRGB(0.07 + 0.4 * lit, 0.06 + 0.1 * lit, 0.055 + 0.02 * lit);           // fumo scuro, rosso solo in basso
    }
  }
  update(dt, cam) {
    this.t += dt;
    this.crackMat.uniforms.uT.value = this.t; this.lavaMat.uniforms.uT.value = this.t;
    this.sparkMat.uniforms.uH.value = (this._drawH || 1000) * 0.5;
    // schizzi a caso dai fiumi
    this.nextSplash -= dt;
    if (this.nextSplash <= 0) {
      const p = this._onRiver();
      if (p) { const pw = Math.random() < 0.25 ? 1.4 : 0.6 + Math.random() * 0.5; this._splash(p, pw); if (cam) sfx.lavaSplash(this.group.localToWorld(p.clone()), cam); }
      this.nextSplash = 0.8 + Math.random() * 2.8;
    }
    this._updSparks(dt); this._updSmoke(dt); this._updEruption(dt, cam);
  }
  // ombra sotto il ring (la roccia non riceve ombre: senza, il ring sembrava sospeso)
  setRing(size) {
    if (!this.ringShadow) { this.ringShadow = contactShadow(1, 1, 0.75); this.ringShadow.position.y = 0.006; this.group.add(this.ringShadow); }
    this.ringShadow.scale.set((size + 0.35) * 1.45, (size + 0.35) * 1.45, 1);
  }
  setDrawHeight(h) { this._drawH = h; }
  // altezza dei tuoi occhi dal pavimento: la terra 3D (con fiumi e argini) piega piano verso il bordo per combaciare
  // con lo sfondo, che e' stato fotografato da 1,65 m (senza questo, con occhi diversi, al bordo si vedeva un gradino)
  setEye(eye) {
    if (!(eye > 1.0 && eye < 2.3) || (this.eyeApplied != null && Math.abs(eye - this.eyeApplied) < 0.03)) return;
    this.eyeApplied = eye;
    const off = eye - EYE;
    for (const [geo, base] of this.baseY) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const r = Math.hypot(base[i], base[i + 2]); p[i + 1] = base[i + 1] + off * ss(4.5, R_FADE1, r); }
      geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere();
    }
  }
}
