// Ring virtuale: tappeto, pali agli angoli con cuscini rosso/blu/bianchi e tre corde per lato.
import * as THREE from 'three';

export const RING_SIZE = 3.2;          // lato interno in metri

function canvasTexture(size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#26406b'; g.fillRect(0, 0, size, size);
  // trama della tela
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  // bordo chiaro e logo al centro
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 10; g.strokeRect(22, 22, size - 44, size - 44);
  g.save(); g.translate(size / 2, size / 2);
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.font = `900 ${size * 0.11}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('HOME', 0, -size * 0.06); g.fillText('BOXING', 0, size * 0.06);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function buildRing(S = RING_SIZE) {
  const ring = new THREE.Group(); ring.name = 'ring';
  const h = S / 2;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S + 0.5, S + 0.5),
    new THREE.MeshStandardMaterial({ map: canvasTexture(), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.004; floor.receiveShadow = true;
  ring.add(floor);
  // bordo (grembiule) leggermente rialzato
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x14203a, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(S + 0.6, 0.05, 0.08), apronMat);
    a.position.y = 0.025;
    const ang = i * Math.PI / 2;
    a.position.x = Math.sin(ang) * (h + 0.27); a.position.z = Math.cos(ang) * (h + 0.27);
    a.rotation.y = ang;
    ring.add(a);
  }

  // angoli: [x, z, colore cuscino] - rosso dietro a sinistra del giocatore, blu davanti a destra
  const corners = [[-h, h, 0xd81e2c], [h, -h, 0x1d4fc4], [h, h, 0xf2f2f2], [-h, -h, 0xf2f2f2]];
  const postMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 });
  for (const [x, z, col] of corners) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.3, 16), postMat);
    post.position.set(x, 0.65, z); post.castShadow = true; ring.add(post);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.95, 20),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }));
    pad.position.set(x, 0.72, z); ring.add(pad);
  }
  // corde
  const ropeCols = [0xf2f2f2, 0xd81e2c, 0x1d4fc4];
  const heights = [0.42, 0.78, 1.14];
  for (let k = 0; k < 3; k++) {
    const mat = new THREE.MeshStandardMaterial({ color: ropeCols[k], roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[[2, 3, 1, 0][i]];   // lati del quadrato
      const pa = new THREE.Vector3(a[0], heights[k], a[1]), pbv = new THREE.Vector3(b[0], heights[k], b[1]);
      const len = pa.distanceTo(pbv);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 10), mat);
      rope.position.copy(pa).add(pbv).multiplyScalar(0.5);
      rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pbv.clone().sub(pa).normalize());
      ring.add(rope);
      // per piegarla: la corda tesa e, quando ci spingi, una copia curva al suo posto
      const mid = pa.clone().add(pbv).multiplyScalar(0.5), out = new THREE.Vector3(mid.x, 0, mid.z).normalize();
      const bent = new THREE.Mesh(new THREE.BufferGeometry(), mat); bent.visible = false; ring.add(bent);
      (ring.userData.ropes ||= []).push({ pa, pb: pbv, len, u: pbv.clone().sub(pa).normalize(), out, rope, bent, d: 0, t: 0.5, v: 0 });
    }
  }
  return ring;
}

// Corde che cedono: se ci appoggi un guantone (o la mano) la corda si piega verso fuori nel punto in cui spingi
// (fino a ~18 cm, come una corda tesa), e quando togli la mano torna dritta con un piccolo rimbalzo.
// points: posizioni nel mondo (guantoni). Si rifa' la geometria solo delle corde piegate.
const _p = new THREE.Vector3(), _c = new THREE.Vector3();
export function updateRopes(ring, points, dt) {
  const R = ring.userData.ropes; if (!R) return;
  const loc = points.map(p => ring.worldToLocal(_p.copy(p)).clone());
  for (const r of R) {
    let want = 0, tt = r.t;
    for (const p of loc) {
      const t = THREE.MathUtils.clamp(_c.copy(p).sub(r.pa).dot(r.u) / r.len, 0.04, 0.96);
      _c.copy(r.pa).addScaledVector(r.u, t * r.len);
      const dy = p.y - _c.y, o = (p.x - _c.x) * r.out.x + (p.z - _c.z) * r.out.z;
      if (Math.abs(dy) < 0.08 && o > -0.07 && o < 0.3) {              // guantone sulla corda (o oltre): la spinge fuori
        const push = Math.min(0.18, o + 0.07) * Math.sin(Math.PI * t) ** 0.5;   // vicino ai pali cede meno
        if (push > want) { want = push; tt = t; }
      }
    }
    // la corda segue la mano; lasciata, torna come una molla (un po' di rimbalzo)
    if (want > r.d) { r.d += (want - r.d) * Math.min(1, dt * 18); r.v = 0; r.t = tt; }
    else { r.v += (-r.d * 260 - r.v * 14) * dt; r.d += r.v * dt; if (Math.abs(r.d) < 0.001 && Math.abs(r.v) < 0.01) { r.d = 0; r.v = 0; } }
    const on = Math.abs(r.d) > 0.002;
    r.rope.visible = !on; r.bent.visible = on;
    if (!on) continue;
    const c = r.pa.clone().addScaledVector(r.u, r.t * r.len).addScaledVector(r.out, r.d).add(new THREE.Vector3(0, -r.d * 0.15, 0));
    const curve = new THREE.CatmullRomCurve3([r.pa, r.pa.clone().lerp(c, 0.5), c, c.clone().lerp(r.pb, 0.5), r.pb], false, 'centripetal', 0.2);
    r.bent.geometry.dispose(); r.bent.geometry = new THREE.TubeGeometry(curve, 24, 0.016, 8, false);
  }
}
