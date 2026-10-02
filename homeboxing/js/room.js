// La stanza vera, letta dalla scansione del Quest (plane-detection):
// - le pareti e i mobili diventano "occlusori" invisibili: nascondono quello che sta dietro
//   (senza, il ring oltre la parete veniva disegnato sopra il muro e sembrava salire);
// - la pianta del pavimento serve a scegliere quanto grande fare il ring e dove metterlo.
import * as THREE from 'three';

const occMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

export class Room {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.name = 'stanza';
    scene.add(this.group);
    this.planes = new Map();       // XRPlane -> {mesh, changed}
    this.floorY = null;
    this.floorPoly = null;         // [[x, z], ...] nel mondo
  }

  update(frame, ref) {
    const planes = frame.detectedPlanes;
    if (!planes) return;
    let floor = null, floorPoly = null, floorArea = 0;
    const seen = new Set();
    for (const pl of planes) {
      const pose = frame.getPose(pl.planeSpace, ref);
      if (!pose) continue;
      seen.add(pl);
      const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
      const y = pose.transform.position.y;
      const horizontal = !pl.orientation || pl.orientation === 'horizontal';
      const isFloor = pl.semanticLabel === 'floor';
      if (isFloor || (horizontal && !pl.semanticLabel)) {
        const pts = pl.polygon.map(p => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(m));
        const area = polyArea(pts);
        if (isFloor && area > floorArea) { floorArea = area; floorPoly = pts.map(p => [p.x, p.z]); }
        if (isFloor) floor = floor === null ? y : Math.min(floor, y);
        if (isFloor) { this._drop(pl); continue; }        // il pavimento non deve coprire il ring
      }
      // occlusore: pareti, porte, finestre, mobili (ma niente piani vicini al pavimento)
      if (horizontal && this.floorY !== null && y < this.floorY + 0.15) { this._drop(pl); continue; }
      const e = this.planes.get(pl);
      if (e && e.changed === pl.lastChangedTime) { e.mesh.matrix.copy(m); continue; }
      this._drop(pl);
      const shape = new THREE.Shape(pl.polygon.map(p => new THREE.Vector2(p.x, -p.z)));
      const g = new THREE.ShapeGeometry(shape);
      g.rotateX(-Math.PI / 2);                              // dal piano XY al piano XZ dello spazio del piano
      const mesh = new THREE.Mesh(g, occMat);
      mesh.matrixAutoUpdate = false; mesh.matrix.copy(m);
      mesh.renderOrder = -10;
      this.group.add(mesh);
      this.planes.set(pl, { mesh, changed: pl.lastChangedTime });
    }
    for (const pl of [...this.planes.keys()]) if (!seen.has(pl)) this._drop(pl);
    if (floor !== null) this.floorY = floor;
    if (floorPoly) this.floorPoly = floorPoly;
  }

  _drop(pl) {
    const e = this.planes.get(pl);
    if (!e) return;
    this.group.remove(e.mesh); e.mesh.geometry.dispose();
    this.planes.delete(pl);
  }

  // Ring piu' grande possibile dentro la pianta, davanti al giocatore (che resta dentro il ring).
  // Restituisce {size, center: Vector3, playerZ} oppure null se la pianta non c'e'.
  fitRing(head, yaw, maxSize, defaultPlayerZ) {
    if (!this.floorPoly) return null;
    const f = new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw)), r = new THREE.Vector2(Math.cos(yaw), -Math.sin(yaw));
    const P = new THREE.Vector2(head.x, head.z);
    let best = null;
    for (let size = maxSize; size >= 1.8 - 1e-6; size -= 0.1) {
      const h = size / 2 + 0.15;                            // con un po' di bordo
      for (let cf = Math.min(defaultPlayerZ, size / 2 - 0.25); cf >= 0.2; cf -= 0.1) {
        for (const cr of [0, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6]) {
          const C = P.clone().addScaledVector(f, cf).addScaledVector(r, cr);
          let ok = true;
          for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const q = C.clone().addScaledVector(f, a * h).addScaledVector(r, b * h);
            if (!inside(q.x, q.y, this.floorPoly)) { ok = false; break; }
          }
          if (!ok) continue;
          const score = -Math.abs(cr) - Math.abs(cf - defaultPlayerZ) * 0.5;
          if (!best || score > best.score) best = { size, center: new THREE.Vector3(C.x, 0, C.y), playerZ: cf, score };
        }
      }
      if (best) return best;
    }
    // stanza piccola: ring minimo nella posizione normale
    const C = P.clone().addScaledVector(f, Math.min(defaultPlayerZ, 0.65));
    return { size: 1.8, center: new THREE.Vector3(C.x, 0, C.y), playerZ: Math.min(defaultPlayerZ, 0.65) };
  }
}

function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.z - q.x * p.z; }
  return Math.abs(a) / 2;
}
function inside(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
