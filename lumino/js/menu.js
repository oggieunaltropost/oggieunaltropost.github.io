// Menu' a pagine davanti a te: una pagina ha un titolo, un testo facoltativo (regole, statistiche)
// e dei pulsanti. I pulsanti si premono toccandoli con l'indice oppure puntandoli e facendo pizzico/grilletto.
import * as THREE from 'three';

const BW = 0.13, BH = 0.024, GAP = 0.006;
const INFO_W = 0.27;        // larghezza (m) del testo a 1000 px di canvas

function drawButton(canvas, label, hover, flash, disabled) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.globalAlpha = disabled ? 0.35 : 1;
  // hover 'ray' = puntato col raggio (turchese), 'finger' = dito che sta per premere (rosa come i ditini)
  g.fillStyle = flash ? '#7dffcf' : disabled || !hover ? 'rgba(18,32,48,0.92)'
    : hover === 'finger' ? 'rgba(255,150,205,0.97)' : 'rgba(53,198,192,0.95)';
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.fill();
  g.strokeStyle = 'rgba(125,255,207,0.85)'; g.lineWidth = 5;
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.stroke();
  g.fillStyle = (flash || hover) && !disabled ? '#06201f' : '#ffffff';
  g.font = '600 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 44;
  while (g.measureText(label).width > w - 40 && size > 26) { size -= 2; g.font = `600 ${size}px sans-serif`; }
  g.fillText(label, w / 2, h / 2 + 2);
  g.globalAlpha = 1;
}

// Sfondo a zampetta: cuscinetto grande (con i tre lobi in basso) che contiene testi e pulsanti,
// e quattro ditini sopra. Trucco per il bordo: prima i contorni di tutte le forme, poi il riempimento
// sopra, cosi' resta visibile solo il contorno esterno dell'unione.
const PX = 1000 / INFO_W;   // pixel per metro (come il testo)
function drawPaw(canvas, padW, padH, toeH) {
  const W = Math.ceil(padW * PX), H = Math.ceil((padH + toeH) * PX);
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  const top = toeH * PX, ph = padH * PX;
  const lobeR = W * 0.2, lobes = [0.22, 0.5, 0.78].map(f => [W * f, top + ph - lobeR * 0.95]);
  const pad = () => {
    g.beginPath(); g.roundRect(0, top, W, ph - lobeR * 0.5, Math.min(W, ph) * 0.18);
    for (const [x, y] of lobes) { g.moveTo(x + lobeR, y); g.arc(x, y, lobeR, 0, Math.PI * 2); }
  };
  // ditini: ovali un po' inclinati verso l'esterno, quelli ai lati piu' bassi
  const toes = [[0.12, 0.6, -0.45], [0.37, 0.4, -0.12], [0.63, 0.4, 0.12], [0.88, 0.6, 0.45]]
    .map(([fx, fy, rot]) => ({ x: W * fx, y: top * fy, rx: W * 0.1, ry: top * 0.34, rot }));
  const toe = t => { g.beginPath(); g.ellipse(t.x, t.y, t.rx, t.ry, t.rot, 0, Math.PI * 2); };
  // contorni luminosi
  g.shadowColor = '#38e8ff'; g.shadowBlur = 28;
  g.strokeStyle = 'rgba(125,255,207,0.9)'; g.lineWidth = 14;
  pad(); g.stroke();
  for (const t of toes) { toe(t); g.stroke(); }
  g.shadowBlur = 0;
  // riempimenti
  g.fillStyle = 'rgba(12,20,32,0.93)';
  pad(); g.fill();
  for (const t of toes) {
    const gr = g.createRadialGradient(t.x - t.rx * 0.3, t.y - t.ry * 0.3, 2, t.x, t.y, t.ry);
    gr.addColorStop(0, '#ffd3ea'); gr.addColorStop(1, '#e46aa8');
    g.fillStyle = gr; toe(t); g.fill();
  }
}

export class Menu {
  // onAction(id): chiamata quando si preme un pulsante
  constructor(scene, onAction) {
    this.onAction = onAction;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.mode = null;
    this.buttons = [];
    this.raycaster = new THREE.Raycaster();
    this.pokeLock = 0;
    this.infoCanvas = document.createElement('canvas');
    this.infoTex = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTex.colorSpace = THREE.SRGBColorSpace;
    this.info = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.infoTex, transparent: true, depthTest: false }));
    this.info.renderOrder = 39;
    this.group.add(this.info);
    this.pawCanvas = document.createElement('canvas');
    this.paw = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, depthTest: false }));
    this.paw.renderOrder = 38;
    this.group.add(this.paw);
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 40;
    const bg = bc.getContext('2d');
    bg.fillStyle = '#e8f4ff'; bg.shadowColor = '#38e8ff'; bg.shadowBlur = 10;
    bg.beginPath(); bg.roundRect(12, 10, 232, 20, 10); bg.fill();
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
    this.bar = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.013),
      new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthTest: false, opacity: 0.75 }));
    this.bar.renderOrder = 41;
    this.group.add(this.bar);
  }

  get open() { return this.group.visible; }
  get items() { return this.page?.items ?? []; }

  // page: { title, info: () => string[], items: [{ id, label: () => string, disabled?: () => bool }] }
  setPage(page) {
    for (const b of this.buttons) { this.group.remove(b.mesh); b.tex.dispose(); b.mesh.material.dispose(); }
    this.page = page;
    this.buttons = page.items.map(it => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 104;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
      m.renderOrder = 40;
      this.group.add(m);
      return { mesh: m, canvas, tex, item: it, hover: false, flash: 0 };
    });
    // piu' di 6 voci: due colonne
    const cols = page.cols ?? (page.items.length > 6 ? 2 : 1), rows = Math.ceil(page.items.length / cols);
    this.cols = cols;
    this.buttons.forEach((b, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      b.mesh.position.set((col - (cols - 1) / 2) * (BW + GAP), -row * (BH + GAP), 0);
    });
    this.rows = rows;
    this.infoKey = null;
    this.pokeLock = 0.5;   // il dito che ha appena premuto non preme subito anche la pagina nuova
    this.redraw(true);
  }

  redraw(force = false) {
    for (const b of this.buttons) {
      const label = b.item.label();
      const disabled = !!b.item.disabled?.();
      const key = label + b.hover + (b.flash > 0) + disabled;
      if (!force && key === b.key) continue;
      b.key = key;
      drawButton(b.canvas, label, b.hover, b.flash > 0, disabled);
      b.tex.needsUpdate = true;
    }
    this.drawInfo(force);
  }

  // titolo + testo sopra ai pulsanti; la larghezza segue la riga piu' lunga
  drawInfo(force) {
    const title = this.page?.title ?? '';
    const lines = this.page?.info?.() ?? [];
    const key = title + '|' + lines.join('|');
    if (!force && key === this.infoKey) return;
    this.infoKey = key;
    this.info.visible = !!(title || lines.length);
    if (!this.info.visible) { this.layoutPaw(0, 0); return; }
    const g = this.infoCanvas.getContext('2d');
    g.font = '32px sans-serif';
    let wText = Math.max(0, ...lines.map(l => g.measureText(l).width));
    g.font = 'bold 50px sans-serif';
    wText = Math.max(wText, g.measureText(title).width);
    const buttonsW = (this.cols * BW + (this.cols - 1) * GAP) / INFO_W * 1000;
    const W = Math.ceil(Math.max(buttonsW, wText + 80));
    const H = (title ? 90 : 20) + lines.length * 46 + 24;
    this.infoCanvas.width = W; this.infoCanvas.height = H;
    g.clearRect(0, 0, W, H);   // niente riquadro: il testo sta dentro la zampetta
    let y = 20;
    if (title) { g.fillStyle = '#7dffcf'; g.font = 'bold 50px sans-serif'; g.textBaseline = 'top'; g.fillText(title, 40, y + 8); y += 80; }
    g.fillStyle = '#ffffff'; g.font = '32px sans-serif'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, 40, y + i * 46));
    this.infoTex.dispose();
    this.infoTex = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTex.colorSpace = THREE.SRGBColorSpace;
    this.info.material.map = this.infoTex;
    this.info.material.needsUpdate = true;
    const wM = W / 1000 * INFO_W, hM = H / 1000 * INFO_W;
    this.info.scale.set(wM, hM, 1);
    this.info.position.set(0, BH / 2 + GAP * 1.5 + hM / 2, 0);
    this.layoutPaw(wM, hM);
  }

  // zampetta attorno a testo (largo infoW, alto infoH) e pulsanti
  layoutPaw(infoW, infoH) {
    if (!this.page) return;   // menu' mai aperto (es. cambio lingua dalla pagina iniziale)
    const buttonsW = this.cols * BW + (this.cols - 1) * GAP;
    const top = infoH ? BH / 2 + GAP * 1.5 + infoH : BH / 2;
    const bottom = -(this.rows - 1) * (BH + GAP) - BH / 2;
    const padW = Math.max(buttonsW, infoW) + 0.075;   // margine ai lati: gli angoli sono stondati
    const padH = top - bottom + 0.05 + padW * 0.14;   // in basso piu' spazio per i lobi
    const toeH = padW * 0.24;
    drawPaw(this.pawCanvas, padW, padH, toeH);
    this.paw.material.map?.dispose();
    const tex = new THREE.CanvasTexture(this.pawCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.paw.material.map = tex;
    this.paw.material.needsUpdate = true;
    this.paw.scale.set(padW, padH + toeH, 1);
    // il cuscinetto parte 2,5 cm sopra il testo; i ditini stanno sopra
    const padTop = top + 0.025;
    this.paw.position.set(0, padTop - padH + (padH + toeH) / 2, -0.001);
    // barra per spostare il menu', sotto la zampetta
    this.bar.position.set(0, padTop - padH - 0.016, 0);
  }

  // ------------------------------------------------------------ spostamento con la barra
  // punto del mondo vicino alla barra (per il pizzico diretto)
  barNear(p, r = 0.035) {
    if (!this.open) return false;
    return this.bar.getWorldPosition(new THREE.Vector3()).distanceTo(p) < r;
  }
  barHit(origin, dir) {
    if (!this.open) return null;
    this.raycaster.set(origin, dir);
    const h = this.raycaster.intersectObject(this.bar, false)[0];
    return h ? h.distance : null;
  }
  startDrag(point) {
    this.dragOffset = this.group.position.clone().sub(point);
    this.dragging = true;
  }
  dragTo(point, camera) {
    if (!this.dragging) return;
    this.group.position.copy(point).add(this.dragOffset);
    const look = camera.position.clone(); look.y = this.group.position.y;   // resta dritto
    this.group.lookAt(look);
  }
  endDrag() { this.dragging = false; }

  show(mode, camera, dist = 0.6) {
    this.mode = mode;
    this.camera = camera;
    this.group.visible = true;
    this.group.scale.setScalar(1.5);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    this.group.position.copy(camera.position).addScaledVector(fwd, dist);
    this.group.position.y -= 0.06;
    this.group.lookAt(camera.position);
    this.redraw(true);
  }

  hide() { this.group.visible = false; this.mode = null; this.dragging = false; }

  toggleWorld(camera, dist = 0.6) { if (this.open) this.hide(); else this.show('world', camera, dist); }

  // raggio da controller o mano: restituisce il pulsante colpito
  hit(origin, dir) {
    if (!this.open) return null;
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.buttons.map(b => b.mesh), false);
    if (!hits.length) return null;
    return { button: this.buttons.find(b => b.mesh === hits[0].object), distance: hits[0].distance };
  }

  setHover(buttons, kind = 'ray') {
    for (const b of this.buttons) b.hover = buttons.includes(b) ? kind : false;
  }

  press(b) {
    if (!this.buttons.includes(b) || b.item.disabled?.()) return;
    b.flash = 0.18;
    this.pokeLock = 0.6;
    this.onAction(b.item.id);
    if (this.open) this.redraw(true);
  }

  // dito vicino al menu' (entro 12 cm davanti o 3 cm dietro, dentro la sagoma): comanda il dito, non il raggio
  fingerNear(tip) {
    if (!this.open) return false;
    const local = this.group.worldToLocal(new THREE.Vector3().copy(tip));
    const w = this.cols * (BW + GAP) / 2 + 0.03, top = this.info.visible ? this.info.position.y + this.info.scale.y / 2 : BH;
    return local.z < 0.08 && local.z > -0.02 && Math.abs(local.x) < w &&
      local.y < top + 0.03 && local.y > -this.rows * (BH + GAP) - 0.03;
  }

  // pulsante sotto la punta del dito che si avvicina (si illumina prima di premerlo)
  fingerHover(tips) {
    const out = [];
    const local = new THREE.Vector3();
    for (const tip of tips) {
      let best = null, bestZ = Infinity;
      for (const b of this.buttons) {
        b.mesh.worldToLocal(local.copy(tip));
        if (Math.abs(local.x) < BW / 2 + GAP / 2 && Math.abs(local.y) < BH / 2 + GAP / 2 &&
          local.z < 0.05 && local.z > -0.02 && local.z < bestZ) { best = b; bestZ = local.z; }
      }
      if (best) out.push(best);
    }
    return out;
  }

  // tocco con la punta dell'indice
  poke(tips) {
    if (!this.open || this.pokeLock > 0) return;
    const local = new THREE.Vector3();
    for (const tip of tips) {
      for (const b of this.buttons) {
        b.mesh.worldToLocal(local.copy(tip));
        if (Math.abs(local.x) < BW / 2 && Math.abs(local.y) < BH / 2 && local.z < 0.012 && local.z > -0.02) {
          this.press(b);
          return;
        }
      }
    }
  }

  update(dt) {
    if (!this.open) return;
    // resta sempre rivolto verso di te (se ti sposti non lo vedi di sbieco); mentre lo trascini resta dritto
    if (this.camera && !this.dragging) {
      const q = this.group.quaternion.clone();
      this.group.lookAt(this.camera.position);
      const target = this.group.quaternion.clone();
      this.group.quaternion.copy(q).slerp(target, Math.min(1, dt * 4));
    }
    this.bar.material.opacity = this.dragging || this.barHover ? 1 : 0.7;
    this.bar.scale.setScalar(this.dragging || this.barHover ? 1.15 : 1);
    this.pokeLock -= dt;
    for (const b of this.buttons) b.flash -= dt;
    this.redraw();
  }
}
