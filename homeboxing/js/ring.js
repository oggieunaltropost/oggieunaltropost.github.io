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

export function buildRing() {
  const ring = new THREE.Group(); ring.name = 'ring';
  const S = RING_SIZE, h = S / 2;

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
    }
  }
  return ring;
}
