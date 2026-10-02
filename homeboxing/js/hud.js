// Tabellone dei punti (pannello 3D con una canvas) e lampo rosso quando Mike ti colpisce.
import * as THREE from 'three';

export class Scoreboard {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 560;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    // Disegnato subito dopo le pareti/mobili invisibili e senza controllare la profondita': i mobili
    // non lo coprono. Scrive pero' la sua profondita', quindi Mike (davanti) ci passa sopra.
    // (con depthTest spento WebGL non scrive la profondita': per questo si usa AlwaysDepth)
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), mat);
    this.mesh.name = 'tabellone';
    this.mesh.renderOrder = -5;
    // cornice
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.66, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x15171d, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false }));
    frame.position.z = -0.02; frame.renderOrder = -6; this.mesh.add(frame);
    this.last = '';
  }

  draw(s) {
    const key = JSON.stringify(s);
    if (key === this.last) return;
    this.last = key;
    const g = this.canvas.getContext('2d'), W = 1024, H = 560;
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 54px system-ui, sans-serif';
    g.fillText(`ROUND ${s.round}${s.rounds ? '/' + s.rounds : ''}`, W * 0.2, 52);
    g.fillStyle = '#c9ced8'; g.font = '700 34px system-ui, sans-serif';
    g.fillText((s.level || '').toUpperCase(), W * 0.45, 54);
    const mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    g.fillStyle = s.time < 10 && s.running ? '#ff5a5a' : '#ffffff';
    g.font = '800 64px ui-monospace, monospace';
    g.fillText(`${mm}:${ss}`, W * 0.72, 54);
    // colonne giocatore / Mike
    const col = (x, name, color, p) => {
      g.fillStyle = color; g.fillRect(x - 230, 100, 460, 64);
      g.fillStyle = '#fff'; g.font = '800 44px system-ui, sans-serif'; g.fillText(name, x, 133);
      g.font = '900 150px system-ui, sans-serif'; g.fillText(p.points, x, 250);
      // energia: verde -> rosso
      const e = Math.max(0, 1 - (p.dmg || 0) / 100);
      g.fillStyle = '#2a2f3a'; g.fillRect(x - 200, 338, 400, 20);
      g.fillStyle = e > 0.5 ? '#3cc46b' : e > 0.25 ? '#f0b429' : '#e5484d'; g.fillRect(x - 200, 338, 400 * e, 20);
      g.font = '500 28px system-ui, sans-serif'; g.fillStyle = '#c9ced8';
      g.fillText(`Colpi ${p.hits} · Parate ${p.blocks} · Schivate ${p.dodges}`, x, 392);
      if (p.kd) { g.fillStyle = '#ff8a8a'; g.fillText(`A terra ${p.kd} ${p.kd === 1 ? 'volta' : 'volte'}`, x, 428); }
    };
    col(W * 0.27, 'TU', '#c4161f', s.player);
    col(W * 0.73, 'MIKE', '#1a49b8', s.mike);
    g.fillStyle = '#2a2f3a'; g.fillRect(W / 2 - 2, 110, 4, 300);
    g.fillStyle = '#ffffff'; g.font = '700 34px system-ui, sans-serif';
    g.fillText(s.message || '', W / 2, 482);
    g.fillStyle = '#9aa3b6'; g.font = '500 27px system-ui, sans-serif';
    g.fillText(s.diag || '', W / 2, 535);
    this.tex.needsUpdate = true;
  }
}

// lampo rosso attaccato alla testa
export class HitFlash {
  constructor(camera) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff1010, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
    this.mesh.renderOrder = 999;
    camera.add(this.mesh);
    this.v = 0;
  }
  hit(strength = 1) { this.v = Math.min(0.6, 0.35 * strength + 0.15); }
  setBase(b) { this.base = b; }
  update(dt) {
    this.v = Math.max(this.base || 0, this.v - dt * 1.6);
    this.mesh.material.opacity = this.v;
    this.mesh.visible = this.v > 0.001;
  }
}

// Menu di pausa: si apre alzando tutte e due le braccia sopra la testa (o con A/B/X/Y).
// I pulsanti si "premono" tenendoci sopra un guantone per un secondo e mezzo: niente click per sbaglio.
export class PauseMenu {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'pausa'; this.group.visible = false;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.88, depthTest: false }));
    panel.renderOrder = 1100; this.group.add(panel);
    this.title = this._label('PAUSA', 0, 0.23, 0.6, 0.1, '#ffd34d', 72);
    this.group.add(this.title);
    this.group.add(this._label('tieni un guantone sul pulsante', 0, 0.15, 0.8, 0.05, '#c9ced8', 30));
    this.buttons = [
      { id: 'resume', text: 'RIPRENDI', color: 0x1f8a4c, x: -0.29 },
      { id: 'restart', text: 'RICOMINCIA', color: 0x1d4fc4, x: 0 },
      { id: 'exit', text: 'MENU', color: 0xc4161f, x: 0.29 },
    ].map(b => {
      const g = new THREE.Group(); g.position.set(b.x, -0.06, 0.02);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.04),
        new THREE.MeshBasicMaterial({ color: b.color, depthTest: false }));
      base.renderOrder = 1101; g.add(base);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthTest: false }));
      fill.position.z = 0.021; fill.renderOrder = 1102; fill.scale.y = 0.001; g.add(fill);
      const t = this._label(b.text, 0, 0, 0.24, 0.06, '#ffffff', 40); t.position.z = 0.023; g.add(t);
      this.group.add(g);
      return { ...b, group: g, fill, hold: 0 };
    });
  }

  _label(text, x, y, w, h, color, px) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext('2d');
    g.fillStyle = color; g.font = `800 ${px}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false }));
    m.userData = { canvas: c, tex: t, color, px };
    m.position.set(x, y, 0.01); m.renderOrder = 1103;
    return m;
  }

  // davanti alla testa, a 55 cm, girato verso di te
  setTitle(text) {
    const { canvas: c, tex, color, px } = this.title.userData, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = color; g.font = `800 ${px}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2); tex.needsUpdate = true;
  }

  open(head, yaw, end = false) {
    this.setTitle(end ? 'FINE INCONTRO' : 'PAUSA');
    this.buttons[0].group.visible = !end;
    this.buttons[1].group.children[2].visible = true;
    this.group.position.set(head.x - Math.sin(yaw) * 0.55, head.y - 0.1, head.z - Math.cos(yaw) * 0.55);
    this.group.rotation.set(0, yaw, 0);
    this.group.visible = true;
    for (const b of this.buttons) { b.hold = 0; b.fill.scale.y = 0.001; }
  }
  close() { this.group.visible = false; }

  // restituisce l'id del pulsante premuto (o null)
  update(dt, gloves) {
    if (!this.group.visible) return null;
    this.group.updateMatrixWorld(true);
    for (const b of this.buttons) {
      if (!b.group.visible) continue;
      const p = b.group.getWorldPosition(new THREE.Vector3());
      const on = gloves.some(g => g.mesh.visible && g.center.distanceTo(p) < 0.14);
      b.hold = on ? b.hold + dt : Math.max(0, b.hold - dt * 2);
      b.fill.scale.y = Math.max(0.001, Math.min(1, b.hold / 1.5));
      b.fill.position.y = -0.11 + 0.11 * b.fill.scale.y;
      if (b.hold >= 1.5) { b.hold = 0; return b.id; }
    }
    return null;
  }
}

// Menu fluttuante del gioco (dentro il visore): pulsanti che si premono tenendoci sopra un guantone.
// spec: { title, rows: [{ y, buttons: [{ id, text, w, color, group? }] }] }
export class MenuPanel {
  constructor(spec, holdTime = 0.8) {
    this.hold = holdTime;
    this.group = new THREE.Group(); this.group.name = 'menu'; this.group.visible = false;
    const W = spec.width || 0.95, H = spec.height || 0.7;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.9, depthTest: false }));
    bg.renderOrder = 1100; this.group.add(bg);
    const lab = PauseMenu.prototype._label;
    this.group.add(lab(spec.title, 0, H / 2 - 0.07, W - 0.1, 0.09, '#ffd34d', 64));
    if (spec.subtitle) this.group.add(lab(spec.subtitle, 0, H / 2 - 0.13, W - 0.1, 0.045, '#c9ced8', 30));
    this.buttons = [];
    for (const row of spec.rows) {
      if (row.label) this.group.add(lab(row.label, 0, row.y + 0.075, W - 0.1, 0.04, '#9aa3b6', 28));
      const gap = 0.02, total = row.buttons.reduce((a, b) => a + b.w, 0) + gap * (row.buttons.length - 1);
      let x = -total / 2;
      for (const b of row.buttons) {
        const g = new THREE.Group(); g.position.set(x + b.w / 2, row.y, 0.02); x += b.w + gap;
        const h = row.h || 0.09;
        const base = new THREE.Mesh(new THREE.BoxGeometry(b.w, h, 0.03),
          new THREE.MeshBasicMaterial({ color: b.color || 0x2a2f3a, depthTest: false }));
        base.renderOrder = 1101; g.add(base);
        const sel = new THREE.Mesh(new THREE.PlaneGeometry(b.w + 0.012, h + 0.012),
          new THREE.MeshBasicMaterial({ color: 0xffd34d, depthTest: false }));
        sel.position.z = -0.02; sel.renderOrder = 1100; sel.visible = false; g.add(sel);
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(b.w, h),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthTest: false }));
        fill.position.z = 0.016; fill.renderOrder = 1102; fill.scale.x = 0.001; g.add(fill);
        const t = lab(b.text, 0, 0, b.w - 0.01, h * 0.6, '#ffffff', 40); t.position.z = 0.018; g.add(t);
        this.group.add(g);
        this.buttons.push({ ...b, w: b.w, g, sel, fill, t: 0, base, color0: b.color || 0x2a2f3a });
      }
    }
  }
  // evidenzia la scelta attuale (es. livello, modalita')
  select(ids) {
    for (const b of this.buttons) {
      const on = ids.includes(b.id);
      b.sel.visible = on;
      b.base.material.color.setHex(on ? 0xb8860b : b.color0);      // scelta attuale: oro
    }
  }
  open(head, yaw, dist = 0.55, drop = 0.2) {
    this.group.position.set(head.x - Math.sin(yaw) * dist, head.y - drop, head.z - Math.cos(yaw) * dist);
    this.group.rotation.set(-0.25, yaw, 0, 'YXZ');
    this.group.visible = true;
    for (const b of this.buttons) { b.t = 0; b.fill.scale.x = 0.001; }
  }
  close() { this.group.visible = false; }
  update(dt, gloves) {
    if (!this.group.visible) return null;
    this.group.updateMatrixWorld(true);
    for (const b of this.buttons) {
      const p = b.g.getWorldPosition(new THREE.Vector3());
      const on = gloves.some(g => g.mesh.visible && g.center.distanceTo(p) < Math.max(0.09, b.w / 2));
      b.t = on ? b.t + dt : Math.max(0, b.t - dt * 3);
      b.fill.scale.x = Math.max(0.001, Math.min(1, b.t / this.hold));
      b.fill.position.x = -b.w / 2 * (1 - b.fill.scale.x);
      if (b.t >= this.hold) { b.t = -0.6; return b.id; }      // pausa breve prima di poterlo ripremere
    }
    return null;
  }
}
