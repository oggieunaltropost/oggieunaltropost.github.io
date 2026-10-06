// Sfondo in 3D vero: la foto a 360 gradi stesa su una superficie dove ogni punto sta alla sua distanza reale
// (la profondita' l'ha calcolata Blender: <stage>_profondita.png, 16 bit = mezzi metri, 65535 = cielo).
// Nel visore, con i due occhi, il terreno lontano, le rocce e le montagne hanno la loro forma e la loro distanza:
// niente fondale "all'infinito" (il ring sembrava sospeso) e niente rocce schiacciate a terra.
// Va al posto della sfera del cielo, che resta solo finche' la profondita' non e' caricata.
import * as THREE from 'three';

// quanti sfondi 3D sono ancora in costruzione (finche' ce n'e' uno, il caricamento resta al buio)
export let panoPending = 0;

// il worker: legge la mappa di profondita' e costruisce i due strati (davanti e riempimento dietro)
const WORKER_URL = URL.createObjectURL(new Blob([`
const GW = 512, GH = 256, SKY = 880;
onmessage = async ({ data: { url, eye, uU, flat } }) => {
  try {
    const bmp = await createImageBitmap(await (await fetch(url)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    // distanza in un punto della foto: davanti la minima di un 3x3 (sui bordi vince la roccia, niente frange),
    // dietro la massima di un 9x9 (vince lo sfondo)
    const distMin = (x, y) => { let m = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = (x + dx + W) % W, yy = Math.min(H - 1, Math.max(0, y + dy)), i = (yy * W + xx) * 4;
        const v = px[i] * 256 + px[i + 1]; if (v !== 65535) m = Math.min(m, v * 0.5); }
      return m; };
    const distMax = (x, y) => { let m = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const xx = (x + dx + W) % W, yy = Math.min(H - 1, Math.max(0, y + dy)), i = (yy * W + xx) * 4;
        const v = px[i] * 256 + px[i + 1]; m = Math.max(m, v === 65535 ? Infinity : v * 0.5); }
      return m; };
    const build = dist => {
      const pos = new Float32Array((GW + 1) * (GH + 1) * 3);
      for (let j = 0; j <= GH; j++) {
        const lat = (0.5 - j / GH) * Math.PI;                    // j = 0 in alto
        for (let i = 0; i <= GW; i++) {
          const lon = (i / GW - 0.5 - uU) * 2 * Math.PI;
          const dx = Math.cos(lat) * Math.cos(lon), dy = Math.sin(lat), dz = Math.cos(lat) * Math.sin(lon);
          let uu = (Math.atan2(dz, dx) / (2 * Math.PI) + 0.5 + uU) % 1; if (uu < 0) uu += 1;
          let R = Math.min(SKY, dist(Math.min(W - 1, (uu * W) | 0), Math.min(H - 1, (j / GH * H) | 0)));
          if (flat > 0 && dy < -0.01) {                       // a terra: sul piano, con un raccordo morbido verso la foto
            const tp = eye / -dy, rh = tp * Math.sqrt(1 - dy * dy);
            const k = Math.min(1, Math.max(0, (rh - flat) / 6)), kk = k * k * (3 - 2 * k);
            if (rh < flat + 6) R = tp + (Math.min(R, SKY) - tp) * kk;
          }
          const k = ((j * (GW + 1)) + i) * 3;
          pos[k] = dx * R; pos[k + 1] = eye + dy * R; pos[k + 2] = dz * R;
        }
      }
      return pos; };
    // i triangoli a cavallo di un salto di distanza (bordo di una roccia davanti allo sfondo) si tolgono: tirati tra
    // vicino e lontano facevano strisce stirate; nel buco si vede lo strato dietro o la sfera del cielo
    const tris = (pos, ratio, far) => {
      const d = v => Math.hypot(pos[v * 3], pos[v * 3 + 1] - eye, pos[v * 3 + 2]);
      const keep = (p, q, r) => { const a = d(p), b = d(q), c = d(r), lo = Math.min(a, b, c), hi = Math.max(a, b, c); return hi < lo * ratio || lo > far; };
      const idx = new Uint32Array(GW * GH * 6); let n = 0;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const a = j * (GW + 1) + i, b = a + 1, cc = a + GW + 1, dd = cc + 1;
        if (keep(a, cc, b)) { idx[n++] = a; idx[n++] = cc; idx[n++] = b; }
        if (keep(b, cc, dd)) { idx[n++] = b; idx[n++] = cc; idx[n++] = dd; }
      }
      return idx.slice(0, n); };
    const pos = build(distMin), posB = build(distMax);
    const idx = tris(pos, 1.45, 120), idxB = tris(posB, 3, 200);   // dietro: si tolgono solo i salti enormi
    postMessage({ pos, idx, posB, idxB }, [pos.buffer, idx.buffer, posB.buffer, idxB.buffer]);
  } catch (e) { postMessage({ err: String(e) }); }
};
`], { type: 'text/javascript' }));

// clip: raggio (m) attorno al ring dove lo sfondo non si disegna: li' c'e' il terreno 3D del gioco (che porta lupo,
// impronte, scorpione...) e il terreno della foto, qualche cm piu' alto, lo copriva
// flat: entro questo raggio il terreno della foto si stende su un pavimento piatto a y = 0 (al posto del terreno 3D
// separato, che faceva un cerchio di colore diverso): ci camminano sopra lupo, scorpione, impronte
// grain: texture di dettaglio (grana) stesa sul pavimento piatto vicino, dove la foto ha pochi pixel ed e' sfocata;
// grainMean = sua luminosita' media (lineare), cosi' il colore della foto non cambia
export function panoDepth(url, tex, { eye = 1.65, uU = 0, onReady = null, clip = 0, flat = 0, grain = null, grainMean = 0.5, grainScale = 1.6 } = {}) {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
    fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4,   // (dietro al terreno 3D vicino)
    uniforms: { uPano: { value: tex }, uEye: { value: eye }, uU: { value: uU }, uClip: { value: clip }, uGrain: { value: grain }, uGM: { value: grainMean }, uGS: { value: grainScale }, uFlat: { value: grain ? flat : 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uPano; uniform float uEye; uniform float uU; uniform float uClip; uniform sampler2D uGrain; uniform float uGM; uniform float uGS; uniform float uFlat; varying vec3 vP;
      void main(){ if (length(vP.xz) < uClip && vP.y < 3.0) discard;
        vec3 d = normalize(vP - vec3(0.0, uEye, 0.0));
        vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5 + uU), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        vec3 col = texture2D(uPano, uv).rgb;
        if (uFlat > 0.0 && vP.y < 0.2) { float k = 1.0 - smoothstep(uFlat - 4.0, uFlat + 4.0, length(vP.xz));
          col *= mix(1.0, dot(texture2D(uGrain, vP.xz / uGS).rgb, vec3(0.299, 0.587, 0.114)) / uGM, k); }   // (solo chiaro/scuro: niente puntini colorati)
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  mesh.renderOrder = -9; mesh.frustumCulled = false; mesh.name = 'sfondo 3D';
  // strato di riempimento, appena dietro: le cose vicine "assottigliate" (vince la distanza piu' lontana dei dintorni),
  // cosi' dove al bordo di una roccia il primo strato e' tagliato si vede lo sfondo vero alla sua distanza (non un buco)
  const back = new THREE.Mesh(new THREE.BufferGeometry(), mesh.material.clone());
  back.material.polygonOffsetFactor = 10; back.material.polygonOffsetUnits = 10;
  back.renderOrder = -9.5; back.frustumCulled = false; back.name = 'sfondo 3D dietro';
  const root = new THREE.Group(); root.name = 'sfondo 3D'; root.add(back); root.add(mesh); root.visible = false;
  panoPending++;
  // il calcolo (milioni di letture della mappa) si fa in un worker: fatto qui bloccava il gioco per un attimo e nel
  // visore restava congelata l'ultima immagine, come un pannello fermo con la stanza tutt'intorno
  const w = new Worker(WORKER_URL);
  w.onmessage = ({ data }) => {
    if (done) return; done = true; w.terminate(); panoPending--;
    if (data.err) { console.warn('profondita', url, data.err); return; }
    mesh.geometry.setAttribute('position', new THREE.BufferAttribute(data.pos, 3)); mesh.geometry.setIndex(new THREE.BufferAttribute(data.idx, 1));
    mesh.geometry.computeBoundingSphere();
    back.geometry.setAttribute('position', new THREE.BufferAttribute(data.posB, 3)); back.geometry.setIndex(new THREE.BufferAttribute(data.idxB, 1));
    back.geometry.computeBoundingSphere();
    root.visible = true; if (onReady) onReady();
  };
  // se il worker non risponde (errore o niente) il caricamento non deve restare al buio per sempre
  let done = false; const fail = e => { if (done) return; done = true; panoPending--; try { w.terminate(); } catch (_) {} console.warn('profondita', url, e); };
  w.onerror = e => fail(e.message || 'worker'); setTimeout(() => fail('tempo scaduto'), 25000);
  w.postMessage({ url: new URL(url, location.href).href, eye, uU, flat });
  return root;
}
