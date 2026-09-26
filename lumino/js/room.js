// Geometria della stanza: mesh e piani rilevati dal Quest 3 (o una stanza finta nell'anteprima PC).
// Fornisce raycast accelerati (BVH), occlusione, ombre e punti casuali su cui la creatura puo' andare.
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const colliderMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _n = new THREE.Vector3(), _o = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);
const H_DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.entries = new Map();
    this.colliders = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
    this.occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 12,
    });
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
    this.debugMat = new THREE.MeshBasicMaterial({
      color: 0x55ffe0, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false,
    });
    this.showDebug = false;
    this.occlusion = true;
    this.floorY = 0;
    this.dirty = true;
    this.surfaces = { floor: null, high: null };
    this.stats = { meshes: 0, planes: 0, global: false };
  }

  get hasXRData() { return this.stats.meshes + this.stats.planes > 0; }
  get hasData() { return this.colliders.length > 0; }

  // ------------------------------------------------------------ gestione entry
  _add(key, geometry, kind, extra = {}) {
    this._remove(key);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundsTree();
    const collider = new THREE.Mesh(geometry, colliderMat);
    collider.userData.kind = kind;
    collider.updateMatrixWorld(true);
    const e = { key, kind, geometry, collider, ...extra };
    if (kind !== 'static') {
      e.occluder = new THREE.Mesh(geometry, this.occluderMat);
      e.occluder.renderOrder = -10;
      e.shadow = new THREE.Mesh(geometry, this.shadowMat);
      e.shadow.receiveShadow = true;
      e.shadow.renderOrder = 5;
      e.debug = new THREE.Mesh(geometry, this.debugMat);
      e.debug.renderOrder = 6;
      for (const m of [e.occluder, e.shadow, e.debug]) { m.matrixAutoUpdate = false; this.scene.add(m); }
    }
    this.entries.set(key, e);
    this.dirty = true;
    return e;
  }

  _remove(key) {
    const e = this.entries.get(key);
    if (!e) return;
    for (const m of [e.occluder, e.shadow, e.debug]) if (m) this.scene.remove(m);
    e.geometry.disposeBoundsTree();
    e.geometry.dispose();
    this.entries.delete(key);
    this.dirty = true;
  }

  clear() { for (const k of [...this.entries.keys()]) this._remove(k); }

  addStatic(key, geometry) { return this._add(key, geometry, 'static'); }

  // Pavimento virtuale molto grande appena sotto quello vero: permette a Lumino di seguirti
  // anche fuori dalla stanza scansionata (li' corre su un pavimento piatto).
  setFallbackFloor(on, y = this.floorY - 0.008) {
    const e = this.entries.get('fallback');
    if (on && (!e || Math.abs(e.y - y) > 0.01)) {
      const g = new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2).translate(0, y, 0);
      this._add('fallback', g, 'fallback', { y });
    } else if (!on && e) this._remove('fallback');
  }

  // l'ombra sul pavimento virtuale serve solo quando Lumino e' li' (altrimenti ombra doppia)
  setFallbackShadow(on) {
    const e = this.entries.get('fallback');
    if (e?.shadow) e.shadow.visible = on;
  }

  // ------------------------------------------------------------ dati WebXR
  updateXR(frame, refSpace) {
    this._frameNo = (this._frameNo || 0) + 1;
    const seen = new Set();
    let meshes = 0, planes = 0, global = false;
    if (frame.detectedMeshes) {
      for (const m of frame.detectedMeshes) {
        seen.add(m); meshes++;
        if (m.semanticLabel === 'global mesh') global = true;
        this._syncMesh(frame, refSpace, m);
      }
    }
    if (frame.detectedPlanes) {
      for (const p of frame.detectedPlanes) {
        seen.add(p); planes++;
        this._syncPlane(frame, refSpace, p);
      }
    }
    for (const [k, e] of this.entries) {
      if ((e.kind === 'mesh' || e.kind === 'plane') && !seen.has(k)) this._remove(k);
    }
    this.stats = { meshes, planes, global };
  }

  _poseChanged(e, mat) {
    if (!e) return true;
    const a = e.matrix, b = mat;
    for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > (i >= 12 ? 0.004 : 0.002)) return true;
    return false;
  }

  _syncMesh(frame, refSpace, m) {
    const e = this.entries.get(m);
    if (e && e.lastChanged === m.lastChangedTime && this._frameNo % 30 !== 0) return;
    const pose = frame.getPose(m.meshSpace, refSpace);
    if (!pose) return;
    const mat = pose.transform.matrix;
    if (e && e.lastChanged === m.lastChangedTime && !this._poseChanged(e, mat)) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.vertices), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(m.indices), 1));
    g.applyMatrix4(new THREE.Matrix4().fromArray(mat));
    this._add(m, g, 'mesh', {
      lastChanged: m.lastChangedTime, matrix: Float32Array.from(mat),
      label: m.semanticLabel || '',
    });
  }

  _syncPlane(frame, refSpace, p) {
    const e = this.entries.get(p);
    if (e && e.lastChanged === p.lastChangedTime && this._frameNo % 30 !== 0) return;
    const pose = frame.getPose(p.planeSpace, refSpace);
    if (!pose) return;
    const mat = pose.transform.matrix;
    if (e && e.lastChanged === p.lastChangedTime && !this._poseChanged(e, mat)) return;
    const poly = p.polygon;
    if (!poly || poly.length < 3) return;
    const pos = new Float32Array(poly.length * 3);
    poly.forEach((pt, i) => { pos[i * 3] = pt.x; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = pt.z; });
    const idx = [];
    for (let i = 1; i < poly.length - 1; i++) idx.push(0, i, i + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.applyMatrix4(new THREE.Matrix4().fromArray(mat));
    this._add(p, g, 'plane', {
      lastChanged: p.lastChangedTime, matrix: Float32Array.from(mat),
      label: p.semanticLabel || '', orientation: p.orientation,
    });
  }

  // ------------------------------------------------------------ ruoli delle geometrie
  // Con la "global mesh" del Quest 3 usiamo quella (piu' fedele) + i piani;
  // i volumi dei mobili (scatole) vengono ignorati per non bloccare il passaggio sotto i tavoli.
  refresh() {
    if (!this.dirty) return;
    this.dirty = false;
    const global = [...this.entries.values()].some(e => e.kind === 'mesh' && e.label === 'global mesh');
    this.colliders = [];
    let floor = null;
    for (const e of this.entries.values()) {
      const collide = e.kind === 'mesh' ? (!global || e.label === 'global mesh') : true;
      let visual = null;
      if (e.kind === 'fallback') visual = 'shadow';
      else if (e.kind === 'mesh') visual = global && e.label === 'global mesh' ? 'full' : null;
      else if (e.kind === 'plane') visual = global ? null : 'full';
      e.collide = collide;
      e.visual = visual;
      if (collide) this.colliders.push(e.collider);
      if (e.kind === 'plane' && e.label === 'floor') {
        const y = e.geometry.boundingSphere.center.y;
        floor = floor === null ? y : Math.min(floor, y);
      }
    }
    this.floorY = floor ?? 0;
    this._applyVisibility();
    this.surfaces = { floor: null, high: null };
  }

  _applyVisibility() {
    for (const e of this.entries.values()) {
      if (!e.occluder) continue;
      e.occluder.visible = e.visual === 'full' && this.occlusion;
      e.shadow.visible = !!e.visual;
      e.debug.visible = this.showDebug && e.collide;
    }
  }

  setOcclusion(on) { this.occlusion = on; this._applyVisibility(); }
  setDebug(on) { this.showDebug = on; this._applyVisibility(); }

  // ------------------------------------------------------------ raycast
  raycast(origin, dir, far = 5) {
    if (!this.colliders.length) return null;
    this.raycaster.set(origin, dir);
    this.raycaster.near = 0;
    this.raycaster.far = far;
    const hits = this.raycaster.intersectObjects(this.colliders, false);
    if (!hits.length) return null;
    const h = hits[0];
    const normal = h.face ? h.face.normal.clone() : UP.clone();
    if (normal.dot(dir) > 0) normal.negate();
    return { point: h.point, normal, distance: h.distance, kind: h.object.userData.kind };
  }

  groundBelow(p, above = 0.05, far = 4) {
    _o.copy(p); _o.y += above;
    return this.raycast(_o, DOWN, far + above);
  }

  // ------------------------------------------------------------ punti casuali
  _buildSurfaces() {
    const floor = { tris: [], cum: [], total: 0 }, high = { tris: [], cum: [], total: 0 };
    for (const e of this.entries.values()) {
      if (!e.collide || (e.kind === 'fallback' && this.hasXRData)) continue;
      const pos = e.geometry.attributes.position, idx = e.geometry.index;
      const n = idx ? idx.count : pos.count;
      for (let i = 0; i < n; i += 3) {
        const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
        _a.fromBufferAttribute(pos, ia); _b.fromBufferAttribute(pos, ib); _c.fromBufferAttribute(pos, ic);
        _n.subVectors(_b, _a).cross(_o.subVectors(_c, _a));
        const area2 = _n.length();
        if (area2 < 1e-6) continue;
        if (Math.abs(_n.y) / area2 < 0.94) continue;
        const y = (_a.y + _b.y + _c.y) / 3;
        const bucket = y > this.floorY + 0.15 && y < this.floorY + 1.9 ? high
          : Math.abs(y - this.floorY) < 0.1 ? floor : null;
        if (!bucket) continue;
        bucket.tris.push(ia, ib, ic, e);
        bucket.total += area2 / 2;
        bucket.cum.push(bucket.total);
      }
    }
    this.surfaces = { floor, high };
  }

  // eye: se passato, il punto deve essere visibile da li' (niente punti sotto/dentro i mobili)
  sample(preferHigh, near = null, maxDist = 3.5, eye = null) {
    this.refresh();
    if (!this.hasXRData && this.entries.has('fallback')) {
      // nessuna scansione: solo pavimento virtuale, punto a caso vicino
      const c = near || new THREE.Vector3(), a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * maxDist * 0.5;
      return new THREE.Vector3(c.x + Math.cos(a) * r, this.entries.get('fallback').y, c.z + Math.sin(a) * r);
    }
    if (!this.surfaces.floor) this._buildSurfaces();
    const order = preferHigh ? ['high', 'floor'] : ['floor', 'high'];
    for (const name of order) {
      const s = this.surfaces[name];
      if (!s.total) continue;
      for (let tries = 0; tries < 25; tries++) {
        const r = Math.random() * s.total;
        let lo = 0, hi = s.cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (s.cum[mid] < r) lo = mid + 1; else hi = mid; }
        const e = s.tris[lo * 4 + 3], pos = e.geometry.attributes.position;
        _a.fromBufferAttribute(pos, s.tris[lo * 4]);
        _b.fromBufferAttribute(pos, s.tris[lo * 4 + 1]);
        _c.fromBufferAttribute(pos, s.tris[lo * 4 + 2]);
        let u = Math.random(), v = Math.random();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        const p = _a.clone().addScaledVector(_b.sub(_a), u).addScaledVector(_c.sub(_a), v);
        if (near && p.distanceTo(near) > maxDist) continue;
        if (eye && !this.visibleFrom(p, eye)) continue;
        if (this.isStandable(p)) return p;
      }
    }
    return null;
  }

  visibleFrom(p, eye) {
    const o = _o.copy(p); o.y += 0.06;
    const d = _n.subVectors(eye, o);
    const len = d.length();
    return !this.raycast(o.clone(), d.divideScalar(len).clone(), len - 0.1);
  }

  // Un punto va bene se e' la superficie piu' alta, c'e' spazio sopra e non e' attaccato a un muro.
  isStandable(p) {
    const g = this.groundBelow(p, 0.12, 0.2);
    if (!g || Math.abs(g.point.y - p.y) > 0.015 || g.normal.y < 0.8) return false;
    _o.copy(p); _o.y += 0.01;
    if (this.raycast(_o, UP, 0.14)) return false;
    _o.y += 0.03;
    for (const d of H_DIRS) if (this.raycast(_o, d, 0.07)) return false;
    return true;
  }
}
