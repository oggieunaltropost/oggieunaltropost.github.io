// Terreno lontano "vero": un grande disco piatto (fino quasi all'orizzonte) su cui si proietta la foto a 360 gradi
// dal punto in cui era la camera (altezza degli occhi della foto). Il colore e' identico a quello della foto, ma ogni
// punto del suolo sta alla sua distanza reale: nel visore (in 3D, con i due occhi) il terreno non sembra piu' un
// fondale lontanissimo sotto un'isola sospesa, e il ring e le cose vicine risultano appoggiate per terra.
// Va sotto al terreno 3D vicino (che sfuma sopra di lui) e sopra la sfera del cielo.
import * as THREE from 'three';

export function panoGround(tex, { eye = 1.65, rIn = 6, rOut = 900, uU = 0, y = -0.01, uUniform = null } = {}) {
  const RS = 48, AS = 160, pos = [], idx = [];
  for (let i = 0; i <= RS; i++) {
    const r = rIn * Math.pow(rOut / rIn, i / RS);                    // anelli sempre piu' larghi verso l'orizzonte
    for (let j = 0; j <= AS; j++) { const a = j / AS * Math.PI * 2; pos.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  }
  for (let i = 0; i < RS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    fog: false, side: THREE.DoubleSide,
    uniforms: { uPano: { value: tex }, uEye: { value: eye }, uU: uUniform || { value: uU } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uPano; uniform float uEye; uniform float uU; varying vec3 vP;
      void main(){ vec3 d = normalize(vP - vec3(0.0, uEye, 0.0));
        vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5 + uU), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = -7; mesh.frustumCulled = false; mesh.name = 'terreno lontano';
  return mesh;
}
