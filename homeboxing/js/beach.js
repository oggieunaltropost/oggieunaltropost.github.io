// Stage "In spiaggia": il ring appoggiato sulla sabbia. Davanti (oltre Mike) il mare con le onde che
// si infrangono e gli schizzi; ai lati la spiaggia con palme, ombrelloni e la torretta del bagnino,
// sullo sfondo il panorama vero della Spiaggia di Mondello (foto a 360 gradi CC0 di Andreas Mischok, Poly Haven):
// cielo, Monte Pellegrino, pini e lungomare. Il mare vicino, le onde e gli oggetti sono generati qui.
// Sistema di riferimento: quello del ring (origine al centro del tappeto, il giocatore verso +Z, il mare verso -Z).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SHORE = -8.0;          // dove l'acqua incontra la sabbia (z)
const SEA_Y = -0.32;          // livello medio del mare
const SUN = new THREE.Vector3(-0.53, 0.42, 0.73).normalize();   // il sole della foto: basso, alle spalle del giocatore
const PANO_U = -0.25;          // rotazione del panorama: il mare della foto davanti al giocatore (-Z)

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// altezza della sabbia: piatta attorno al ring, scende verso il mare, dune dietro
export function sandY(x, z) {
  let y = 0;
  if (z < -4) y = -0.09 * (-4 - z);
  y = Math.max(y, -1.8);
  y += 0.9 * smooth(14, 40, z) * (0.6 + 0.4 * Math.sin(x * 0.07) * Math.sin(z * 0.11 + 1.3));
  y += 0.25 * smooth(12, 40, Math.abs(x)) * Math.sin(x * 0.19 + z * 0.05);
  return y;
}

// ---------------------------------------------------------------- texture disegnate al volo
function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function barkTex() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#6f6556'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 9) {
      g.fillStyle = 'rgba(40,25,10,0.45)'; g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(200,170,120,0.25)'; g.fillRect(0, y + 4, w, 2);
    }
  });
}
function leafTex() {
  const t = canvasTex(128, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#6b6a3a'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    for (let y = 8; y < h - 8; y += 9) {                     // foglioline ai due lati della costa
      const L = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, y / h + 0.08)) ** 0.7;
      const shade = 70 + Math.round(40 * Math.sin(y * 0.4));
      g.strokeStyle = `rgb(${38 + shade / 4},${70 + shade * 0.7},${32 + shade / 5})`; g.lineWidth = 4;
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - L, y + 22); g.stroke();
      g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + L, y + 22); g.stroke();
    }
  });
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function stripesTex(a, b, n = 8) {
  return canvasTex(256, 32, (g, w, h) => {
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w / n, 0, w / n + 1, h); }
  });
}
// ---------------------------------------------------------------- shader comuni
const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; } return v; }
`;
const COLORS = {
  zenith: new THREE.Color(0x2a5fae), horizon: new THREE.Color(0xa9c9e6),
  deep: new THREE.Color(0x1d6aa0), shallow: new THREE.Color(0x48c4c8), foam: new THREE.Color(0xf4f8f8),
};

export class Beach {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'spiaggia';
    this.t = 0;
    this.sunDir = SUN.clone();
    this.waves = [];
    this._sky(); this._sea(); this._sand(); this._breakers();
    this.occ = [];                                     // spazi gia' occupati: niente oggetti uno dentro l'altro
    this._props(); this._promenade(); this._palms(); this._birds();
    this.group.traverse(o => { if (o.isMesh || o.isPoints) o.frustumCulled = false; });
  }

  // cielo e sfondo: il panorama a 360 gradi della spiaggia vera (proiezione equirettangolare)
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/spiaggia_cielo.jpg?v=20261003123527', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uPano: { value: tex }, uU: { value: PANO_U } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uPano; uniform float uU; varying vec3 vD;
        void main(){ vec3 d = normalize(vD);
          vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5 + uU), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 64, 32), m);
    sky.renderOrder = -10; sky.frustumCulled = false;
    this.sky = sky; this.group.add(sky);
  }

  // mare: piano fitto vicino alla riva e rado al largo, onde che vanno verso la spiaggia
  _sea() {
    const NX = 160, NZ = 110, pos = [], idx = [];
    for (let j = 0; j <= NZ; j++) {
      const v = j / NZ, z = SHORE + 2.5 - 280 * Math.pow(v, 2.2);
      for (let i = 0; i <= NX; i++) {
        const u = i / NX * 2 - 1, x = Math.sign(u) * 300 * Math.pow(Math.abs(u), 2.0);
        pos.push(x, 0, z);
      }
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.seaU = {
      uTime: { value: 0 }, uSun: { value: this.sunDir }, uZen: { value: COLORS.zenith }, uHor: { value: COLORS.horizon },
      uDeep: { value: COLORS.deep }, uShallow: { value: COLORS.shallow }, uFoam: { value: COLORS.foam },
      uShore: { value: SHORE }, uSeaY: { value: SEA_Y },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.seaU,
      vertexShader: `uniform float uTime, uShore, uSeaY; varying vec3 vW; varying vec3 vN; varying float vH;
        const vec4 W0 = vec4( 0.10, 1.0, 11.0, 0.16);
        const vec4 W1 = vec4(-0.35, 1.0,  6.5, 0.07);
        const vec4 W2 = vec4( 0.45, 1.0,  4.2, 0.04);
        const vec4 W3 = vec4(-0.10, 1.0, 19.0, 0.10);
        const vec4 W4 = vec4( 0.80, 1.0,  2.6, 0.02);
        void wave(vec4 w, vec2 p, float k0, inout float h, inout vec2 d){
          vec2 D = normalize(w.xy); float k = 6.2831 / w.z; float c = sqrt(9.8 / k);
          float f = k * (dot(D, p) - c * uTime); float A = w.w * k0;
          h += A * sin(f); d += A * k * D * cos(f);
        }
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 lp = position;
          float out_ = clamp((uShore - lp.z) / 14.0, 0.0, 1.0);   // vicino a riva onde piu' basse
          float k0 = 0.35 + 0.65 * out_;
          float h = 0.0; vec2 d = vec2(0.0);
          wave(W0, lp.xz, k0, h, d); wave(W1, lp.xz, k0, h, d); wave(W2, lp.xz, k0, h, d);
          wave(W3, lp.xz, k0, h, d); wave(W4, lp.xz, k0, h, d);
          lp.y = uSeaY + h;
          vH = h; vN = normalize(mat3(modelMatrix) * vec3(-d.x, 1.0, -d.y));
          vec4 w2 = modelMatrix * vec4(lp, 1.0); vW = w2.xyz;
          gl_Position = projectionMatrix * viewMatrix * w2;
        }`,
      fragmentShader: `uniform float uTime, uShore; uniform vec3 uSun, uZen, uHor, uDeep, uShallow, uFoam;
        varying vec3 vW; varying vec3 vN; varying float vH; varying vec3 vL;
        ${NOISE}
        void main(){
          vec3 V = normalize(cameraPosition - vW);
          vec2 q = vW.xz * 0.35 + vec2(0.0, uTime * 0.25);
          float fd = length(vW - cameraPosition);
          vec3 N = normalize(vN + vec3(vnoise(q) - 0.5, 0.0, vnoise(q + 7.3) - 0.5) * 0.18 * exp(-fd / 35.0));
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(mix(uZen, uHor, 0.35), uZen, clamp(R.y * 3.0, 0.0, 1.0));
          // distanza dalla riva nel sistema del ring (il piano segue il ring)
          vec3 lw = (inverse(modelMatrixInv) * vec4(0.0)).xyz;
          float dist = max(0.0, -(vL.z - uShore));
          float sh = exp(-dist / 9.0);
          vec3 water = mix(uDeep, uShallow, sh * 0.85);
          water *= 0.85 + 0.3 * max(dot(N, uSun), 0.0);
          vec3 col = mix(water, sky, clamp(fres, 0.0, 0.55));
          col += vec3(1.0, 0.95, 0.85) * pow(max(dot(R, uSun), 0.0), 300.0) * 3.0;
          float n = fbm(vW.xz * 0.5 + vec2(uTime * 0.05, uTime * 0.12));
          float foam = smoothstep(0.17, 0.30, vH + (n - 0.5) * 0.18) * 0.7;
          foam += smoothstep(4.0, 0.0, dist) * smoothstep(0.35, 0.7, n) * 0.9;
          col = mix(col, uFoam, clamp(foam, 0.0, 0.9));
          float ang = atan(abs(vL.x), max(0.001, uShore - vL.z + 6.0));          // 0 = davanti, 1.57 = di lato
          float side = 1.0 - smoothstep(0.75, 1.05, ang) * smoothstep(10.0, 30.0, abs(vL.x));
          gl_FragColor = vec4(col, (1.0 - smoothstep(55.0, 120.0, fd)) * side);  // al largo e ai lati lascia vedere la foto
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    // la distanza dalla riva serve nel sistema del ring: si passa la posizione locale come varying
    m.vertexShader = m.vertexShader.replace('varying float vH;', 'varying float vH; varying vec3 vL;')
      .replace('vH = h;', 'vH = h; vL = lp;');
    m.fragmentShader = m.fragmentShader.replace('vec3 lw = (inverse(modelMatrixInv) * vec4(0.0)).xyz;\n', '');
    m.transparent = true;
    const sea = new THREE.Mesh(g, m); sea.frustumCulled = false; sea.renderOrder = -5;
    this.group.add(sea);
  }

  // sabbia: grande distesa con dune; bagnata e piu' scura vicino all'acqua
  _sand() {
    const W = 150, D = 80, NX = 110, NZ = 70, pos = [], col = [], uv = [], idx = [];
    for (let j = 0; j <= NZ; j++) {
      const v = j / NZ, z = -16 + D * Math.pow(v, 1.5);
      for (let i = 0; i <= NX; i++) {
        const u = i / NX * 2 - 1, x = Math.sign(u) * (W / 2) * Math.pow(Math.abs(u), 1.5);
        const y = sandY(x, z);
        pos.push(x, y, z); uv.push(x / 2.2, z / 2.2);
        const wet = smooth(-4.5, -7.5, z);                        // sabbia bagnata
        const k = 1 - 0.35 * wet;
        col.push(k, k * (1 - 0.04 * wet), k * (1 - 0.08 * wet));
      }
    }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const L = new THREE.TextureLoader();
    const tex = L.load('assets/sabbia_colore.jpg?v=20261003123527'), nrm = L.load('assets/sabbia_rilievo.jpg?v=20261003123527');
    tex.colorSpace = THREE.SRGBColorSpace;
    for (const t of [tex, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    const m = new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: 1 });
    const sand = new THREE.Mesh(g, m); sand.receiveShadow = true;
    this.group.add(sand);
    // velo di schiuma che sale e scende sulla riva dopo ogni onda
    const fg = new THREE.PlaneGeometry(90, 4.5, 90, 10); fg.rotateX(-Math.PI / 2); fg.translate(0, 0, -6.3);
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, sandY(p.getX(i), p.getZ(i)) + 0.02);
    this.swashU = { uTime: { value: 0 }, uReach: { value: -8 }, uAlpha: { value: 0 }, uFoam: { value: COLORS.foam }, uShallow: { value: COLORS.shallow } };
    const sm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: this.swashU,
      vertexShader: `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uReach, uAlpha; uniform vec3 uFoam, uShallow; varying vec3 vL;
        ${NOISE}
        void main(){
          float edge = uReach + (fbm(vec2(vL.x * 0.35, uTime * 0.2)) - 0.5) * 1.2;
          float inside = smoothstep(edge + 0.05, edge - 0.25, vL.z);
          float lace = smoothstep(0.45, 0.75, fbm(vL.xz * 1.8 + vec2(0.0, uTime * 0.3)));
          float rim = smoothstep(0.5, 0.0, abs(vL.z - edge));
          vec3 c = mix(uShallow, uFoam, clamp(lace * 0.8 + rim, 0.0, 1.0));
          float a = inside * (0.08 + 0.55 * lace + 0.35 * rim * lace) * uAlpha;
          a *= smoothstep(30.0, 18.0, abs(vL.x));               // ai lati sfuma (oltre c'e' la spiaggia della foto)
          gl_FragColor = vec4(c, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.swash = new THREE.Mesh(fg, sm); this.swash.renderOrder = 1;
    this.group.add(this.swash);
  }

  // frangenti: fasce d'onda che arrivano verso riva, si alzano, si arricciano e si rompono in schiuma
  _breakers() {
    const NX = 140, NY = 14, pos = [], uv = [], idx = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      pos.push(-45 + 90 * i / NX, 0, 0); uv.push(i / NX, j / NY);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    for (let k = 0; k < 3; k++) {
      const u = {
        uZ: { value: -30 }, uPh: { value: 0 }, uH: { value: 1.1 }, uSeed: { value: k * 1.7 + 0.3 }, uTime: { value: 0 },
        uSeaY: { value: SEA_Y }, uDeep: { value: COLORS.deep }, uShallow: { value: COLORS.shallow }, uFoam: { value: COLORS.foam },
        uSun: { value: this.sunDir }, uHor: { value: COLORS.horizon },
      };
      const m = new THREE.ShaderMaterial({
        transparent: true, side: THREE.DoubleSide, uniforms: u,
        vertexShader: `uniform float uZ, uPh, uH, uSeed, uSeaY; varying float vS, vPh, vBrk, vProf, vX; varying vec3 vW;
          void main(){
            float x = position.x, s = uv.y;
            float ph = clamp(uPh + x * 0.0022 + 0.04 * sin(x * 0.06 + uSeed), 0.0, 1.0);
            float grow = smoothstep(0.0, 0.62, ph), brk = smoothstep(0.62, 0.8, ph);
            float H = uH * (0.7 + 0.3 * sin(x * 0.09 + uSeed * 3.0)) * grow * (1.0 - 0.8 * brk);
            float prof = s < 0.72 ? pow(s / 0.72, 1.7) : pow(1.0 - (s - 0.72) / 0.28, 0.55);
            float y = uSeaY - 0.04 + H * prof;
            float wdt = 4.0 + 5.0 * brk;
            float z = uZ + (s - 0.5) * wdt;
            z += 0.55 * H * smoothstep(0.45, 0.62, ph) * (1.0 - brk) * pow(s, 3.0);   // la cresta si arriccia in avanti
            vS = s; vPh = ph; vBrk = brk; vProf = prof; vX = x;
            vec4 w = modelMatrix * vec4(x, y, z, 1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `uniform float uTime, uSeed; uniform vec3 uDeep, uShallow, uFoam, uSun, uHor;
          varying float vS, vPh, vBrk, vProf, vX; varying vec3 vW;
          ${NOISE}
          void main(){
            float n = fbm(vec2(vX * 0.3 + uSeed * 10.0, vS * 3.0 + uTime * 0.6));
            vec3 face = mix(uShallow, uDeep, 0.5 + 0.3 * (1.0 - vProf));
            face *= 0.9 + 0.25 * vProf;                              // la parete d'acqua controluce e' piu' chiara
            float crest = smoothstep(0.8, 1.0, vProf) * smoothstep(0.45, 0.6, vPh);
            float foam = clamp(crest * (0.6 + 0.6 * n) + vBrk * smoothstep(0.35, 0.75, n), 0.0, 1.0);
            vec3 c = mix(face, uFoam, foam);
            float a = smoothstep(0.0, 0.18, vS) * (vBrk > 0.0 ? 1.0 : smoothstep(0.0, 0.08, 1.0 - vS));
            a *= (1.0 - smoothstep(0.86, 1.0, vPh)) * smoothstep(0.0, 0.08, vPh);
            a *= smoothstep(32.0, 18.0, abs(vX));
            a *= mix(0.35, 0.9, foam) * (1.0 - 0.55 * vBrk);   // parete d'acqua trasparente; la schiuma rotta si dissolve
            float fd = length(vW - cameraPosition);
            c = mix(c, uHor, smoothstep(60.0, 200.0, fd) * 0.8);
            gl_FragColor = vec4(c, a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 2;
      this.group.add(mesh);
      this.waves.push({ mesh, u, t: k * 2.9, T: 8.7, H: 0.45 + 0.4 * Math.random(), splashed: false });
    }
  }

  // palme ai lati del ring, tutte in due soli oggetti (tronchi e foglie)
  _take(x, z, r) { this.occ.push([x, z, r]); }
  _free(x, z, r) { return this.occ.every(([a, b, q]) => Math.hypot(x - a, z - b) > r + q); }

  _palms() {
    const trunks = [], fronds = [], nuts = [];
    const r = rnd(11);
    const spots = [];
    for (let k = 0; k < 22; k++) {
      const side = k % 2 ? 1 : -1;
      const x = side * (8.5 + r() * 26), z = -5 + r() * 34;
      spots.push([x, z]);
    }
    spots.push([-7.5, 9], [8, 12], [-13, -3], [12.5, -4.5]);
    for (let k = 0; k < 9; k++) spots.push([-40 + k * 10 + r() * 3, 19 + r() * 1.5]);
    for (const [x, z] of spots) {
      if (Math.abs(x) < 7.5 && z < 11) continue;               // lontano dal ring e dal giro della ragazza
      if (!this._free(x, z, 2.0)) continue;                    // niente palme dentro ombrelloni, cabine, bar o altre palme
      this._take(x, z, 2.0);
      const h = 6 + r() * 4.5, lean = (r() - 0.5) * 2.2, ang = r() * Math.PI * 2;
      const by = sandY(x, z);
      const top = new THREE.Vector3(x + Math.cos(ang) * lean, by + h, z + Math.sin(ang) * lean);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, by - 0.2, z),
        new THREE.Vector3(x + Math.cos(ang) * lean * 0.15, by + h * 0.45, z + Math.sin(ang) * lean * 0.15),
        new THREE.Vector3(x + Math.cos(ang) * lean * 0.55, by + h * 0.8, z + Math.sin(ang) * lean * 0.55), top]);
      const tg = new THREE.TubeGeometry(curve, 16, 0.2, 8, false);
      const tp = tg.attributes.position, tuv = tg.attributes.uv;
      for (let i = 0; i < tp.count; i++) {                     // tronco che si assottiglia verso l'alto
        const t = tuv.getX(i), c = curve.getPointAt(t);
        const k = 1.25 - 0.55 * t;
        tp.setXYZ(i, c.x + (tp.getX(i) - c.x) * k, tp.getY(i) + (tp.getY(i) - c.y) * (k - 1), c.z + (tp.getZ(i) - c.z) * k);
        tuv.setXY(i, tuv.getY(i), t * h / 1.2);
      }
      tg.computeVertexNormals(); trunks.push(tg);
      // corona di foglie: strisce piegate che ricadono
      const nF = 15 + Math.floor(r() * 5);
      for (let f = 0; f < nF; f++) {
        const a = f / nF * Math.PI * 2 + r() * 0.3, L = 2.6 + r() * 1.4, up = 0.2 + r() * 0.9;
        const S = 10, P = [], U = [], I = [];
        for (let s = 0; s <= S; s++) {
          const t = s / S, w = 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)), 0.6);
          const cx = Math.cos(a) * L * t, cz = Math.sin(a) * L * t, cy = up * t * 2.2 - 2.4 * t * t;
          const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
          const droop = -0.18 * w;                              // la foglia si piega a V
          P.push(top.x + cx - px, top.y + cy + droop, top.z + cz - pz, top.x + cx + px, top.y + cy + droop, top.z + cz + pz);
          U.push(0, t, 1, t);
        }
        for (let s = 0; s < S; s++) { const q = s * 2; I.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
        const fgeo = new THREE.BufferGeometry();
        fgeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); fgeo.setIndex(I); fgeo.computeVertexNormals();
        fronds.push(fgeo);
      }
      for (let c = 0; c < 4; c++) {
        const s = new THREE.SphereGeometry(0.13, 8, 6);
        s.translate(top.x + Math.cos(c * 1.6) * 0.22, top.y - 0.25, top.z + Math.sin(c * 1.6) * 0.22);
        nuts.push(s);
      }
    }
    const bark = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.9 });
    bark.map.wrapS = bark.map.wrapT = THREE.RepeatWrapping;
    const leaf = new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 });
    const tm = new THREE.Mesh(mergeGeometries(trunks), bark); tm.castShadow = true;
    const fm = new THREE.Mesh(mergeGeometries(fronds), leaf); fm.castShadow = true;
    const nm = new THREE.Mesh(mergeGeometries(nuts), new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.8 }));
    this.palmLeaves = fm;
    this.group.add(tm, fm, nm);
  }

  // ombrelloni, lettini, teli, torretta del bagnino, tavole da surf
  _props() {
    const r = rnd(5);
    const pole = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    const cols = [['#e8412c', '#ffffff'], ['#1e66c9', '#ffffff'], ['#f5b700', '#ffffff'], ['#18a39a', '#f2efe6'], ['#e85d9a', '#ffffff']];
    const towels = [0xe8412c, 0x1e66c9, 0xf5b700, 0x18a39a, 0x8a5bd6];
    const spots = [[-10, 3], [-14, 8], [-19, 1], [-24, 7], [11, 4], [15, 9], [20, 2], [26, 8], [-30, 13], [31, 14]];
    spots.forEach(([x, z], k) => {
      this._take(x + 0.4, z + 0.3, 1.9);
      const y = sandY(x, z);
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = (r() - 0.5) * 0.15;
      const c = cols[k % cols.length];
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 16, 1, true),
        new THREE.MeshStandardMaterial({ map: stripesTex(c[0], c[1], 16), side: THREE.DoubleSide, roughness: 0.8 }));
      top.position.y = 2.25; top.castShadow = true;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), pole); p.position.y = 1.15;
      g.add(top, p);
      // lettino con telo
      const bed = new THREE.Group(); bed.position.set(0.9, 0, 0.6); bed.rotation.y = r() * 0.6 - 0.3;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 1.8), pole); frame.position.y = 0.3;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.7), pole); back.position.set(0, 0.55, -0.95); back.rotation.x = 0.9;
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 1.5), new THREE.MeshStandardMaterial({ color: towels[k % towels.length], roughness: 0.95 }));
      towel.position.y = 0.34;
      for (const [lx, lz] of [[-0.27, -0.8], [0.27, -0.8], [-0.27, 0.8], [0.27, 0.8]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), pole); leg.position.set(lx, 0.15, lz); bed.add(leg);
      }
      bed.add(frame, back, towel); g.add(bed);
      this.group.add(g);
    });
    // torretta del bagnino (rossa e bianca) a destra, verso il mare
    const red = new THREE.MeshStandardMaterial({ color: 0xd8322a, roughness: 0.6 }), white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6 });
    const tw = new THREE.Group(); tw.position.set(13.5, sandY(13.5, -5), -5); tw.rotation.y = -0.3; this._take(13.5, -5, 2.2);
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), white); leg.position.set(lx, 1.1, lz); tw.add(leg);
    }
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 2.0), red); cabin.position.y = 2.9; cabin.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 4), white); roof.position.y = 3.95; roof.rotation.y = Math.PI / 4;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 2.6), white); deck.position.y = 2.2;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshStandardMaterial({ color: 0xd8322a, side: THREE.DoubleSide }));
    flag.position.set(0.35, 5.0, 0); const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6), white); fp.position.y = 4.4;
    tw.add(cabin, roof, deck, flag, fp); this.flag = flag;
    this.group.add(tw);
    // tavole da surf piantate nella sabbia
    const boardCols = [0xf5b700, 0x18a39a, 0xffffff, 0xe8412c];
    [[-8.5, -2.5], [-9.2, -2.1], [9.5, 6.5]].forEach(([x, z], k) => {
      this._take(x, z, 0.5);
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.7, 4, 12), new THREE.MeshStandardMaterial({ color: boardCols[k], roughness: 0.4 }));
      b.scale.set(1, 1, 0.18); b.position.set(x, sandY(x, z) + 0.9, z); b.rotation.set(0.1, k, 0.12 * (k - 1)); b.castShadow = true;
      this.group.add(b);
    });
  }

  // dietro di te: passeggiata di legno con cabine colorate, chiosco bar e lampioni
  _promenade() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.85 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(120, 0.25, 4), wood);
    deck.position.set(0, sandY(0, 24) + 0.3, 24); deck.receiveShadow = true;
    for (let x = -60; x <= 60; x += 3) this._take(x, 24, 2.1);
    this.group.add(deck);
    const hutCols = ['#e8412c', '#1e66c9', '#f5b700', '#18a39a', '#e85d9a', '#ffffff'];
    for (let k = 0; k < 16; k++) {
      const x = -44 + k * 6.2; if (Math.abs(x) < 8.5) continue;   // niente cabine sotto la tettoia del bar
      const hut = new THREE.Group(); hut.position.set(x, sandY(x, 28) + 0.2, 28); this._take(x, 28, 1.8);
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), new THREE.MeshStandardMaterial({ map: stripesTex(hutCols[k % hutCols.length], '#ffffff', 10), roughness: 0.8 }));
      body.position.y = 1.2; body.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 }));
      roof.position.y = 2.8; roof.rotation.y = Math.PI / 4;
      hut.add(body, roof); this.group.add(hut);
    }
    // chiosco bar con tettoia di paglia e insegna
    const bar = new THREE.Group(); bar.position.set(0, sandY(0, 30) + 0.2, 30); this._take(0, 30, 5.5);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 1.15, 1.2), wood); counter.position.set(0, 0.58, -1.6);
    const back = new THREE.Mesh(new THREE.BoxGeometry(7, 2.8, 0.3), wood); back.position.set(0, 1.4, 0.8);
    const thatch = new THREE.Mesh(new THREE.ConeGeometry(5.2, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xc8a25a, roughness: 1 }));
    thatch.position.y = 3.6; thatch.scale.set(1, 1, 0.65);
    for (const lx of [-3.2, 3.2]) for (const lz of [-1.9, 0.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3, 8), wood); post.position.set(lx, 1.5, lz); bar.add(post);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.8), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#1e66c9'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd34d'; g.font = '900 86px system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BEACH BAR', w / 2, h / 2 + 4); }) }));
    sign.position.set(0, 2.75, -2.35); sign.rotation.y = Math.PI;
    bar.add(counter, back, thatch, sign); bar.rotation.y = 0; this.group.add(bar);
    // lampioni lungo la passeggiata
    const iron = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.4 });
    for (let k = 0; k < 10; k++) {
      const x = -45 + k * 10;
      this._take(x, 22.4, 0.6);                                   // (sul bordo della passeggiata)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), iron); pole.position.set(x, sandY(x, 22.4) + 2.3, 22.4);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0x665a3a }));
      lamp.position.set(x, pole.position.y + 2.2, 22.4);
      this.group.add(pole, lamp);
    }
  }

  // gabbiani che volano in cerchio
  _birds() {
    this.birds = [];
    const m = new THREE.MeshBasicMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide });
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Group();
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.08), new THREE.Vector3(s * 0.55, 0, 0), new THREE.Vector3(0, 0, 0.12)]), m);
        b.add(w); b.userData[s] = w;
      }
      b.userData.p = { cx: (Math.random() - 0.5) * 30, cz: -12 - Math.random() * 20, r: 6 + Math.random() * 10, y: 9 + Math.random() * 8, w: (0.15 + Math.random() * 0.15) * (Math.random() < 0.5 ? 1 : -1), a: Math.random() * 6 };
      this.birds.push(b); this.group.add(b);
    }
  }

  update(dt, onBreak) {
    this.t += dt;
    const t = this.t;
    this.seaU.uTime.value = t; this.swashU.uTime.value = t;
    // frangenti: ciclo di T secondi da lontano fino alla riva
    let reach = -8.0, swashA = 0;
    for (const w of this.waves) {
      w.t += dt;
      if (w.t > w.T) { w.t -= w.T; w.H = 0.45 + Math.random() * 0.4; w.splashed = false; }
      const ph = w.t / w.T;
      w.u.uPh.value = ph; w.u.uH.value = w.H; w.u.uTime.value = t;
      w.u.uZ.value = -22 + 14.5 * (1 - Math.pow(1 - ph, 1.4));
      // si rompe: suono dell'onda (gli schizzi da questa distanza non si vedrebbero: resta la schiuma)
      if (ph > 0.62 && !w.splashed) { w.splashed = true; if (onBreak) onBreak(w.H); }
      // risacca: la schiuma sale sulla sabbia e torna indietro
      if (ph > 0.78) {
        const k = (ph - 0.78) / 0.22;
        const r = -7.9 + 2.6 * Math.sin(Math.min(1, k) * Math.PI * 0.85);
        if (r > reach) reach = r;
        swashA = Math.max(swashA, Math.sin(Math.min(1, k) * Math.PI));
      }
    }
    this.swashU.uReach.value += (reach - this.swashU.uReach.value) * Math.min(1, dt * 3);
    this.swashU.uAlpha.value += (Math.max(0.1, swashA) - this.swashU.uAlpha.value) * Math.min(1, dt * 2);
    // gabbiani, bandiera
    for (const b of this.birds) {
      const p = b.userData.p; p.a += p.w * dt;
      b.position.set(p.cx + Math.cos(p.a) * p.r, p.y + Math.sin(t * 0.5 + p.a) * 0.6, p.cz + Math.sin(p.a) * p.r);
      b.rotation.y = -p.a + (p.w > 0 ? 0 : Math.PI);
      const f = Math.sin(t * 7 + p.a * 5) * 0.5;
      b.userData[-1].rotation.z = -f; b.userData[1].rotation.z = f;
    }
    if (this.flag) this.flag.rotation.y = Math.sin(t * 3.1) * 0.25;
  }
}
