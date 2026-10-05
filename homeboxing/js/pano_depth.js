// Sfondo in 3D vero: la foto a 360 gradi stesa su una superficie dove ogni punto sta alla sua distanza reale
// (la profondita' l'ha calcolata Blender: <stage>_profondita.png, 16 bit = mezzi metri, 65535 = cielo).
// Nel visore, con i due occhi, il terreno lontano, le rocce e le montagne hanno la loro forma e la loro distanza:
// niente fondale "all'infinito" (il ring sembrava sospeso) e niente rocce schiacciate a terra.
// Va al posto della sfera del cielo, che resta solo finche' la profondita' non e' caricata.
import * as THREE from 'three';

const GW = 512, GH = 256, SKY = 880;

// clip: raggio (m) attorno al ring dove lo sfondo non si disegna: li' c'e' il terreno 3D del gioco (che porta lupo,
// impronte, scorpione...) e il terreno della foto, qualche cm piu' alto, lo copriva
// flat: entro questo raggio il terreno della foto si stende su un pavimento piatto a y = 0 (al posto del terreno 3D
// separato, che faceva un cerchio di colore diverso): ci camminano sopra lupo, scorpione, impronte
export function panoDepth(url, tex, { eye = 1.65, uU = 0, onReady = null, clip = 0, flat = 0 } = {}) {
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
    fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4,   // (dietro al terreno 3D vicino)
    uniforms: { uPano: { value: tex }, uEye: { value: eye }, uU: { value: uU }, uClip: { value: clip } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uPano; uniform float uEye; uniform float uU; uniform float uClip; varying vec3 vP;
      void main(){ if (length(vP.xz) < uClip && vP.y < 3.0) discard;
        vec3 d = normalize(vP - vec3(0.0, uEye, 0.0));
        vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5 + uU), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  mesh.renderOrder = -9; mesh.frustumCulled = false; mesh.visible = false; mesh.name = 'sfondo 3D';
  fetch(url).then(r => r.blob()).then(b => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })).then(bmp => {
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    // distanza in un punto della foto: la minima di un 3x3 (sui bordi delle rocce vince la roccia, niente frange)
    const dist = (x, y) => {
      let m = Infinity;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = (x + dx + W) % W, yy = Math.min(H - 1, Math.max(0, y + dy)), i = (yy * W + xx) * 4;
        const v = px[i] * 256 + px[i + 1]; if (v !== 65535) m = Math.min(m, v * 0.5);
      }
      return m;
    };
    const pos = new Float32Array((GW + 1) * (GH + 1) * 3);
    for (let j = 0; j <= GH; j++) {
      const lat = (0.5 - j / GH) * Math.PI;                    // j = 0 in alto
      for (let i = 0; i <= GW; i++) {
        const u = i / GW, lon = (u - 0.5 - uU) * 2 * Math.PI;
        const d = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        let uu = (Math.atan2(d.z, d.x) / (2 * Math.PI) + 0.5 + uU) % 1; if (uu < 0) uu += 1;
        let R = Math.min(SKY, dist(Math.min(W - 1, (uu * W) | 0), Math.min(H - 1, (j / GH * H) | 0)));
        if (flat > 0 && d.y < -0.01) {                       // a terra: sul piano, con un raccordo morbido verso la foto
          const tp = eye / -d.y, rh = tp * Math.sqrt(1 - d.y * d.y);
          const k = Math.min(1, Math.max(0, (rh - flat) / 6)), kk = k * k * (3 - 2 * k);
          if (rh < flat + 6) R = tp + (Math.min(R, SKY) - tp) * kk;
        }
        const k = ((j * (GW + 1)) + i) * 3;
        pos[k] = d.x * R; pos[k + 1] = eye + d.y * R; pos[k + 2] = d.z * R;
      }
    }
    const idx = new Uint32Array(GW * GH * 6); let n = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const a = j * (GW + 1) + i, b = a + 1, cc = a + GW + 1, dd = cc + 1;
      idx[n++] = a; idx[n++] = cc; idx[n++] = b; idx[n++] = b; idx[n++] = cc; idx[n++] = dd;
    }
    const geo = mesh.geometry; geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    mesh.visible = true; if (onReady) onReady();
  }).catch(e => console.warn('profondita', url, e));
  return mesh;
}
