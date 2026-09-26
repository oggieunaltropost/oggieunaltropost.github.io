// "Segui i gatti": prende piccoli fotogrammi dalla telecamera del Quest (WebXR camera-access),
// li fa analizzare al worker e trasforma i gatti trovati in posizioni 3D nella stanza.
import * as THREE from 'three';

const MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const W = 320, H = 240;
const INTERVAL = 0.3;     // secondi tra un'analisi e l'altra
const FORGET = 5;         // secondi dopo cui un gatto non piu' visto viene dimenticato
// stima per le telecamere frontali del Quest 3 quando arrivano come "webcam" (getUserMedia)
const MEDIA_HFOV = 78;    // gradi
const MEDIA_PITCH = -0.05;

export class CatWatcher {
  constructor(renderer, room, scene) {
    this.renderer = renderer;
    this.room = room;
    this.status = 'off';     // off | loading | ready | error | nocamera
    this.tracks = [];
    this.timer = 0;
    this.busy = false;
    this.nextId = 1;
    this.lastMs = 0;
    this.rt = new THREE.WebGLRenderTarget(W, H);
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }',
      depthTest: false, depthWrite: false,
    });
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quadMat));
    this.pixels = new Uint8Array(W * H * 4);
    // anelli sotto i gatti riconosciuti (per capire cosa vede Lumino)
    this.ringGeo = new THREE.RingGeometry(0.16, 0.18, 40).rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffd35a, transparent: true, opacity: 0.5, depthWrite: false });
    this.scene = scene;
  }

  get ready() { return this.status === 'ready'; }

  // Metodo alternativo: le telecamere del visore come normale "webcam" del browser.
  // Va chiamato da un clic dell'utente (il browser chiede il permesso).
  async startMedia() {
    if (this.video) return true;
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } });
      // se ci sono piu' telecamere preferisci quella sinistra/frontale
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      this.cameraLabels = devs.map(d => d.label);
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream;
      await video.play();
      this.video = video;
      this.canvas = document.createElement('canvas');
      this.canvas.width = W; this.canvas.height = H;
      this.ctx2d = this.canvas.getContext('2d', { willReadFrequently: true });
      return true;
    } catch (e) {
      this.mediaError = e.name || String(e);
      return false;
    }
  }

  // testo di stato per il menu'
  get label() {
    if (this.status === 'loading') return ' (carico...)';
    if (this.status === 'error') return ' (errore)';
    if (this.source === 'none') return this.mediaError ? ' (permesso negato)' : ' (no telecamera)';
    return '';
  }

  init() {
    if (this.status !== 'off' && this.status !== 'error') return;
    this.status = 'loading';
    this.worker = new Worker(new URL('./cat-worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = e => this.onMessage(e.data);
    this.worker.onerror = e => { this.status = 'error'; this.error = e.message; };
    this.worker.postMessage({ type: 'init', model: MODEL, classes: ['cat'], threshold: 0.35 });
  }

  onMessage(m) {
    if (m.type === 'ready') this.status = 'ready';
    else if (m.type === 'error') { this.status = 'error'; this.error = m.message; console.warn('Gatti:', m.message); }
    else if (m.type === 'result') {
      this.busy = false;
      this.lastMs = m.ms;
      const shot = this.shots?.[m.id];
      delete this.shots?.[m.id];
      if (shot) for (const d of m.detections) this.addDetection(d, shot);
    }
  }

  // Da riquadro nell'immagine a punto 3D: raggio dalla telecamera attraverso il centro del lato basso
  // del riquadro (le zampe), intersecato con la stanza.
  addDetection(d, shot) {
    const u = (d.x + d.w / 2) / W, v = (d.y + d.h) / H;
    let origin, dir;
    if (shot.mode === 'media') {
      // telecamera "webcam": direzione stimata dalla posa della testa e dal campo visivo della telecamera
      const tx = Math.tan(THREE.MathUtils.degToRad(MEDIA_HFOV / 2)), ty = tx * H / W;
      dir = new THREE.Vector3((u * 2 - 1) * tx, (1 - v * 2) * ty + MEDIA_PITCH, -1).normalize().applyQuaternion(shot.quat);
      origin = shot.pos.clone();
    } else {
      const ndc = new THREE.Vector3(u * 2 - 1, 1 - v * 2, -1);
      const a = ndc.clone().applyMatrix4(shot.invProj), b = ndc.setZ(1).applyMatrix4(shot.invProj);
      origin = new THREE.Vector3().setFromMatrixPosition(shot.world);
      a.applyMatrix4(shot.world); b.applyMatrix4(shot.world);
      dir = b.sub(a).normalize();
    }
    let p = null;
    const hit = this.room.raycast(origin, dir, 8);
    if (hit) p = hit.point.clone();
    else if (dir.y < -0.05) p = origin.clone().addScaledVector(dir, (this.room.floorY - origin.y) / dir.y);
    if (!p) return;
    this.observe(p, shot.t);
  }

  observe(p, t) {
    let best = null, bd = 0.7;
    for (const tr of this.tracks) {
      const dd = Math.hypot(tr.pos.x - p.x, tr.pos.z - p.z);
      if (dd < bd) { bd = dd; best = tr; }
    }
    if (best) { best.pos.lerp(p, 0.5); best.lastSeen = t; best.hits++; }
    else {
      const ring = new THREE.Mesh(this.ringGeo, this.ringMat);
      ring.renderOrder = 8;
      this.scene.add(ring);
      this.tracks.push({ id: this.nextId++, pos: p.clone(), lastSeen: t, hits: 1, ring });
    }
  }

  // gatti "confermati" (visti almeno 2 volte)
  get cats() { return this.tracks.filter(tr => tr.hits >= 2); }

  nearest(p) {
    let best = null, bd = Infinity;
    for (const tr of this.cats) {
      // conta anche da quanto non lo vediamo: un gatto appena visto batte una posizione vecchia
      const d = tr.pos.distanceTo(p) + Math.max(0, (this.now ?? tr.lastSeen) - tr.lastSeen) * 1.5;
      if (d < bd) { bd = d; best = tr; }
    }
    return best;
  }

  // chiamare nel loop XR (serve il frame corrente); enabled = modalita' attiva nel menu'
  update(dt, t, frame, refSpace, enabled, camera = null) {
    this.now = t;
    for (const tr of [...this.tracks]) {
      const stale = t - tr.lastSeen > FORGET;
      tr.ring.visible = enabled && tr.hits >= 2;
      tr.ring.position.copy(tr.pos).setY(tr.pos.y + 0.004);
      if (stale) { this.scene.remove(tr.ring); this.tracks.splice(this.tracks.indexOf(tr), 1); }
    }
    if (!enabled || !this.ready || this.busy) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = INTERVAL;
    this.shots ||= {};
    const id = this.nextId++;
    let out = null;

    // 1) WebXR camera-access: immagine allineata alla vista (la piu' precisa)
    const view = frame?.getViewerPose(refSpace)?.views?.[0];
    const tex = view?.camera && this.renderer.xr.getCameraTexture?.(view.camera);
    if (tex) {
      this.source = 'xr';
      this.capture(tex);
      this.shots[id] = {
        mode: 'xr', t,
        invProj: new THREE.Matrix4().fromArray(view.projectionMatrix).invert(),
        world: new THREE.Matrix4().fromArray(view.transform.matrix),
      };
      // righe capovolte: l'immagine per il riconoscimento va dall'alto in basso
      out = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) out.set(this.pixels.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    } else if (this.video && this.video.readyState >= 2 && camera) {
      // 2) telecamera come "webcam" (getUserMedia): direzione stimata dalla posa della testa
      this.source = 'media';
      this.ctx2d.drawImage(this.video, 0, 0, W, H);
      out = new Uint8ClampedArray(this.ctx2d.getImageData(0, 0, W, H).data.buffer);
      this.shots[id] = { mode: 'media', t, pos: camera.getWorldPosition(new THREE.Vector3()), quat: camera.getWorldQuaternion(new THREE.Quaternion()) };
    } else {
      this.source = 'none';
      return;
    }
    this.busy = true;
    this.worker.postMessage({ type: 'detect', id, width: W, height: H, buffer: out.buffer }, [out.buffer]);
  }

  capture(tex) {
    const r = this.renderer, prevTarget = r.getRenderTarget(), xrOn = r.xr.enabled;
    this.quadMat.uniforms.map.value = tex;
    r.xr.enabled = false;
    r.setRenderTarget(this.rt);
    r.render(this.quadScene, this.quadCam);
    r.readRenderTargetPixels(this.rt, 0, 0, W, H, this.pixels);
    r.setRenderTarget(prevTarget);
    r.xr.enabled = xrOn;
  }

  clear() {
    for (const tr of this.tracks) this.scene.remove(tr.ring);
    this.tracks = [];
  }
}
