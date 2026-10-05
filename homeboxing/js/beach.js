// Stage "In spiaggia": il ring appoggiato sulla sabbia. Davanti (oltre Mike) il mare con le onde che
// si infrangono e gli schizzi; ai lati la spiaggia con palme, ombrelloni e la torretta del bagnino,
// sullo sfondo il panorama vero della Spiaggia di Mondello (foto a 360 gradi CC0 di Andreas Mischok, Poly Haven):
// cielo, mare in lontananza, Monte Pellegrino, pini e lungomare. Sabbia e oggetti vicini sono generati qui.
// Sistema di riferimento: quello del ring (origine al centro del tappeto, il giocatore verso +Z, il mare verso -Z).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SUN = new THREE.Vector3(-0.53, 0.42, 0.73).normalize();   // il sole della foto: basso, alle spalle del giocatore
const PANO_U = -0.25;          // rotazione del panorama: il mare della foto davanti al giocatore (-Z)

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// altezza della sabbia: piatta attorno al ring, scende verso il mare, dune dietro
export function sandY(x, z) {
  let y = 0;
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
export class Beach {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'spiaggia';
    this.t = 0;
    this.sunDir = SUN.clone();
    this._sky(); this._sand();
    this.occ = [];                                     // spazi gia' occupati: niente oggetti uno dentro l'altro
    this._props(); this._promenade(); this._palms(); this._birds();
    this.group.traverse(o => { if (o.isMesh || o.isPoints) o.frustumCulled = false; });
  }

  // cielo e sfondo: il panorama a 360 gradi della spiaggia vera (proiezione equirettangolare)
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/spiaggia_cielo.jpg?v=20261005221042', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
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

  // sabbia: grande distesa con dune; bagnata e piu' scura vicino all'acqua
  _sand() {
    const W = 150, D = 80, NX = 110, NZ = 70, pos = [], col = [], uv = [], idx = [];
    for (let j = 0; j <= NZ; j++) {
      const v = j / NZ, z = -16 + D * Math.pow(v, 1.5);
      for (let i = 0; i <= NX; i++) {
        const u = i / NX * 2 - 1, x = Math.sign(u) * (W / 2) * Math.pow(Math.abs(u), 1.5);
        const y = sandY(x, z);
        pos.push(x, y, z); uv.push(x / 2.2, z / 2.2);
        col.push(1, 1, 1);
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
    const tex = L.load('assets/sabbia_colore.jpg?v=20261005221042'), nrm = L.load('assets/sabbia_rilievo.jpg?v=20261005221042');
    tex.colorSpace = THREE.SRGBColorSpace;
    for (const t of [tex, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
    const m = new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, normalScale: new THREE.Vector2(1.4, 1.4), vertexColors: true, roughness: 1 });
    const sand = new THREE.Mesh(g, m); sand.receiveShadow = true;
    this.group.add(sand);
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
    for (let k = 0; k < 9; k++) spots.push([-40 + k * 10 + r() * 3, 15.5 + r() * 1.5]);
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
    sign.position.set(0, 1.95, 0.63); sign.rotation.y = Math.PI;      // sulla parete di fondo, sopra il bancone
    bar.add(counter, back, thatch, sign); bar.rotation.y = 0; this.group.add(bar);
    // lampioni lungo la passeggiata
    const iron = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.4 });
    for (let k = 0; k < 10; k++) {
      const x = -45 + k * 10;
      this._take(x, 24, 0.6);                                     // (al centro della passeggiata)
      const deckTop = sandY(0, 24) + 0.425;                       // piano della passeggiata
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), iron); pole.position.set(x, deckTop + 2.1, 24);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0x665a3a }));
      lamp.position.set(x, pole.position.y + 2.2, 24);
      this.group.add(pole, lamp);
    }
  }

  // gabbiani che volano in cerchio
  _birds() {
    this.birds = [];
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.8 });
    const grey = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, roughness: 0.8, side: THREE.DoubleSide });
    const black = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.8, side: THREE.DoubleSide });
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.6 });
    // mezza ala: profilo piatto (x = apertura, z = avanti), piu' larga all'attaccatura
    const wingPart = (x0, x1, c0, c1, back0, back1) => {
      const sh = new THREE.Shape();
      sh.moveTo(x0, c0); sh.lineTo(x1, c1); sh.lineTo(x1, -back1); sh.lineTo(x0, -back0); sh.closePath();
      const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);      // nel piano orizzontale
      return g;
    };
    const inner = wingPart(0.0, 0.30, 0.07, 0.05, 0.10, 0.08), outer = wingPart(0.0, 0.26, 0.05, 0.0, 0.08, 0.02);
    const tip = wingPart(0.18, 0.26, 0.015, 0.0, 0.05, 0.02);
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), white); body.scale.set(0.055, 0.05, 0.17);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), white); head.position.set(0, 0.025, 0.17);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 6), yellow); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.02, 0.23);
      const tail = new THREE.Mesh(wingPart(-0.05, 0.05, 0.0, 0.0, 0.09, 0.09), white); tail.position.set(0, 0, -0.14);
      b.add(body, head, beak, tail);
      for (const sd of [-1, 1]) {
        const sh = new THREE.Group(); sh.position.set(sd * 0.04, 0.01, 0.02); sh.scale.x = sd;   // spalla
        const w1 = new THREE.Mesh(inner, grey); sh.add(w1);
        const el = new THREE.Group(); el.position.x = 0.30; sh.add(el);                      // gomito dell'ala
        el.add(new THREE.Mesh(outer, grey), new THREE.Mesh(tip, black));
        b.add(sh); b.userData[sd] = { sh, el };
      }
      b.scale.setScalar(1.6);
      b.userData.p = { cx: (Math.random() - 0.5) * 30, cz: -12 - Math.random() * 20, r: 6 + Math.random() * 10, y: 9 + Math.random() * 8,
        w: (0.15 + Math.random() * 0.15) * (Math.random() < 0.5 ? 1 : -1), a: Math.random() * 6 };
      this.birds.push(b); this.group.add(b);
    }
  }

  update(dt, onBreak, onGull) {
    this.t += dt;
    const t = this.t;
    // il mare e' lontano: ogni tanto il rumore di un'onda che si infrange
    this.nextWave = (this.nextWave ?? 3) - dt;
    if (this.nextWave <= 0) { this.nextWave = 5 + Math.random() * 7; if (onBreak) onBreak(0.5 + Math.random() * 0.6); }
    // ogni tanto un gabbiano lontano grida (il suono parte da dove vola davvero)
    this.nextGull = (this.nextGull ?? 6) - dt;
    if (this.nextGull <= 0 && this.birds.length) {
      this.nextGull = 9 + Math.random() * 16;
      if (onGull) onGull(this.birds[Math.floor(Math.random() * this.birds.length)].getWorldPosition(new THREE.Vector3()));
    }
    // gabbiani, bandiera
    for (const b of this.birds) {
      const p = b.userData.p; p.a += p.w * dt;
      b.position.set(p.cx + Math.cos(p.a) * p.r, p.y + Math.sin(t * 0.5 + p.a) * 0.6, p.cz + Math.sin(p.a) * p.r);
      // muso nella direzione del volo, un po' inclinato in virata
      b.rotation.set(0, Math.atan2(-Math.sin(p.a) * Math.sign(p.w), Math.cos(p.a) * Math.sign(p.w)), -0.25 * Math.sign(p.w), 'YXZ');
      // battito d'ali alternato a planate; l'ala si piega al "gomito"
      const glide = Math.sin(t * 0.35 + p.a * 3) > 0.2;
      const f = glide ? 0.06 * Math.sin(t * 2 + p.a) : Math.sin(t * 6.5 + p.a * 5) * 0.32;   // battito ampio come un gabbiano vero
      for (const sd of [-1, 1]) {
        const u = b.userData[sd];
        u.sh.rotation.z = sd * f; u.el.rotation.z = sd * (glide ? -0.05 : f * 0.4 - 0.08);
      }
    }
    if (this.flag) this.flag.rotation.y = Math.sin(t * 3.1) * 0.25;
  }
}
