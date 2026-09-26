// Mini gioco "Gara di bacche": 3 minuti. Le bacche compaiono nella stanza; Lumino (e Lumina, se c'e')
// corrono a mangiarle, ma se ne prendi una prima tu e te la porti alla bocca il punto e' tuo.
// Ogni giocatore ha il suo punteggio; con due personaggi compaiono piu' bacche.
import * as THREE from 'three';
import { makeBerry } from './fx.js';
import { t as tr } from './i18n.js';   // (qui 't' e' anche il tempo)

const _v = new THREE.Vector3();

function canvasPanel(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, tex, g: canvas.getContext('2d') };
}

export class BerryGame {
  // players(): personaggi attivi in questo momento
  constructor({ scene, room, players, fx, sfx }) {
    Object.assign(this, { scene, room, players, fx, sfx });
    this.active = false;
    this.berries = [];
    this.board = canvasPanel(900, 140);
    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.056),
      new THREE.MeshBasicMaterial({ map: this.board.tex, transparent: true, depthTest: false }));
    this.hud.renderOrder = 35;
    this.hud.visible = false;
    scene.add(this.hud);
    this.hudText = '';
  }

  get onField() { return 3 + (this.players().length - 1) * 2; }

  // minutes: durata scelta nel menu' (1, 2 o 3)
  start(camera, minutes = 3) {
    this.stop(false);
    this.active = true;
    this.time = minutes * 60;
    this.minutes = minutes;
    const ps = this.players();
    this.score = { me: 0 };
    for (const c of ps) this.score[c.name] = 0;
    this.spawnT = 0.3;
    this.retargetT = 0;
    for (const c of ps) { c.autoWander = false; c.clearTarget(); }
    this.fx.hideBerry();
    this.hud.visible = true;
    this.placeHud(camera, true);
    this.sfx.start();
    this.sfx.startMusic();
    const who = ps.length > 1 ? tr('luminoAndLumina') : ps[0]?.name;
    const runs = tr(ps.length > 1 ? 'berries.runsN' : 'berries.runs1', { x: who });
    const dur = minutes === 1 ? tr('minutes1') : tr('minutesN', { x: minutes });
    this.fx.showPanel(tr('berries.intro', { x: runs, y: dur }), camera, 7, tr('berries.title'));
  }

  stop(showResult = true, camera = null) {
    if (!this.active) return;
    this.active = false;
    for (const b of this.berries) this.scene.remove(b.mesh);
    this.berries = [];
    this.hud.visible = false;
    this.sfx.stopMusic();
    const ps = this.players();
    for (const c of ps) { c.autoWander = true; if (c.mode === 'game') c.clearTarget(); }
    // si salva solo la partita arrivata alla fine (non quella abbandonata)
    if (showResult && this.time <= 0) this.onEnd?.({ minutes: this.minutes, score: { ...this.score }, completed: true });
    if (showResult && camera) {
      const ranking = Object.entries(this.score).sort((a, b) => b[1] - a[1]);
      const [topName, top] = ranking[0];
      const tie = ranking.length > 1 && ranking[1][1] === top;
      const label = n => n === 'me' ? tr('you') : n;
      const title = tie ? tr('tie') : topName === 'me' ? tr('youWin') : tr('winner', { x: topName });
      this.fx.showPanel([ranking.map(([n, s]) => `${label(n)}: ${s}`).join('   '),
        topName === 'me' && !tie ? tr('rematch') : tr('greedy')], camera, 8, title);
      if (topName === 'me' || tie) this.sfx.win(); else this.sfx.lose();
      for (const c of ps) if (c.free) c.happy();
    }
  }

  // ------------------------------------------------------------ bacche
  spawnBerry(userHead) {
    const ps = this.players();
    let p = null;
    for (let i = 0; i < 6 && !p; i++) {
      const c = this.room.sample(Math.random() < 0.4, userHead, 2.3, userHead);
      if (c && ps.every(cr => c.distanceTo(cr.pos) > 0.3) && this.berries.every(b => b.pos.distanceTo(c) > 0.25)) p = c;
    }
    if (!p) return;
    const mesh = makeBerry();
    mesh.position.copy(p);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);
    this.berries.push({ mesh, pos: p.clone(), state: 'ground', vel: new THREE.Vector3(), holder: -1, age: 0 });
    this.sfx.point();
  }

  removeBerry(b) {
    this.scene.remove(b.mesh);
    this.berries.splice(this.berries.indexOf(b), 1);
    this.spawnT = Math.max(this.spawnT, 0.9);
  }

  // prova a prendere una bacca vicina al punto di presa; ritorna true se presa
  grab(point, holderId, radius) {
    if (!this.active) return false;
    let best = null, bd = radius;
    for (const b of this.berries) {
      if (b.state === 'held') continue;
      const d = b.pos.distanceTo(point);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return false;
    best.state = 'held';
    best.holder = holderId;
    best.hist = [];
    this.sfx.click();
    return true;
  }

  holding(holderId) { return this.berries.some(b => b.state === 'held' && b.holder === holderId); }

  release(holderId) {
    for (const b of this.berries) {
      if (b.state !== 'held' || b.holder !== holderId) continue;
      b.state = 'fall';
      const h = b.hist;
      if (h.length >= 2) b.vel.subVectors(h[h.length - 1].p, h[0].p).divideScalar(Math.max(1e-3, h[h.length - 1].t - h[0].t));
      b.vel.clampLength(0, 3);
      b.holder = -1;
    }
  }

  // who: 'me' oppure il personaggio (oggetto Creature)
  eat(b, who) {
    const key = who === 'me' ? 'me' : who.name;
    this.score[key] = (this.score[key] || 0) + 1;
    this.fx.hearts(b.pos.clone(), who === 'me' ? 2 : 3);
    if (who === 'me') this.sfx.chomp(); else who.sfx.nom();
    this.removeBerry(b);
    // chi stava correndo verso questa bacca cambia obiettivo
    for (const c of this.players()) if (c !== who && c.gameBerry === b) { c.gameBerry = null; if (c.mode === 'game') c.clearTarget(); }
  }

  // ------------------------------------------------------------ ciclo
  // ctx: { dt, t, camera, userHead, holdPoint(holderId) -> Vector3|null }
  update(ctx) {
    if (!this.active) return;
    const { dt, t, camera, userHead } = ctx;
    this.time -= dt;
    if (this.time <= 0) { this.stop(true, camera); return; }
    this.sfx.setMusicFast(this.time < 20);

    this.spawnT -= dt;
    if (this.berries.length < this.onField && this.spawnT <= 0) { this.spawnBerry(userHead); this.spawnT = 0.7; }

    // la tua bocca: un po' sotto e davanti agli occhi
    const fwd = _v.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const mouth = userHead.clone().addScaledVector(fwd, 0.05).add(new THREE.Vector3(0, -0.075, 0));
    const players = this.players().filter(c => c.state !== 'hidden');
    const mouths = players.map(c => ({ c, m: c.mouth.clone() }));

    for (const b of [...this.berries]) {
      b.age += dt;
      if (b.state === 'held') {
        const hp = ctx.holdPoint(b.holder);
        if (!hp) { this.release(b.holder); continue; }
        b.pos.lerp(hp, 1 - Math.exp(-dt * 30));
        b.hist.push({ p: b.pos.clone(), t });
        while (b.hist.length > 2 && t - b.hist[0].t > 0.1) b.hist.shift();
        if (b.pos.distanceTo(mouth) < 0.1) { this.eat(b, 'me'); continue; }
      } else if (b.state === 'fall') {
        b.vel.y -= 9.8 * dt;
        const step = b.vel.length() * dt;
        const hit = step > 1e-5 && this.room.raycast(b.pos.clone(), b.vel.clone().normalize(), step + 0.012);
        if (hit) {
          b.pos.copy(hit.point).addScaledVector(hit.normal, 0.012);
          if (hit.normal.y > 0.6 && b.vel.y < 0) { b.state = 'ground'; b.vel.set(0, 0, 0); b.pos.copy(hit.point); }
          else b.vel.reflect(hit.normal).multiplyScalar(0.35);
        } else b.pos.addScaledVector(b.vel, dt);
        if (b.pos.y < this.room.floorY - 1) { this.removeBerry(b); continue; }
      }
      // se gliela porti alla bocca (o gli cade vicino) la mangia lui/lei
      const taker = b.state !== 'ground' && mouths.find(({ m }) => b.pos.distanceTo(m) < 0.055);
      if (taker) { this.eat(b, taker.c); continue; }
      const grow = Math.min(1, b.age * 4);
      b.mesh.scale.setScalar(grow < 1 ? grow * (1 + Math.sin(grow * Math.PI) * 0.4) : 1);
      b.mesh.position.copy(b.pos);
      if (b.state === 'ground') b.mesh.position.y += 0.014 + Math.sin(t * 3 + b.age) * 0.003;
      b.mesh.rotation.y += dt * 1.5;
      b.mesh.userData.glow.material.opacity = 0.14 + 0.08 * Math.sin(t * 5 + b.age);
    }

    this.retargetT -= dt;
    if (this.retargetT <= 0) { this.retargetT = 0.25; for (const c of players) this.drive(c, players); }
    this.placeHud(camera);
    const mm = Math.floor(this.time / 60), ss = Math.floor(this.time % 60);
    const text = `${mm}:${String(ss).padStart(2, '0')}   ${tr('you')} ${this.score.me}` +
      players.map(c => `  ·  ${c.name} ${this.score[c.name] ?? 0}`).join('');
    if (text !== this.hudText) { this.hudText = text; this.drawHud(text); }
  }

  // ogni personaggio punta la bacca a terra piu' vicina; se l'altro ci sta gia' andando
  // ed e' piu' vicino, preferisce un'altra (ma se e' l'unica ci provano tutti e due)
  drive(c, players) {
    if (!c.free) return;
    let best = null, bd = Infinity;
    for (const b of this.berries) {
      if (b.state !== 'ground' || b.age < 0.3) continue;
      let d = b.pos.distanceTo(c.pos) + Math.abs(b.pos.y - c.pos.y) * 0.8;
      for (const o of players) {
        if (o !== c && o.gameBerry === b && o.pos.distanceTo(b.pos) < d) d += 0.6;
      }
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) { if (c.mode === 'game') c.clearTarget(); c.gameBerry = null; return; }
    if (c.target && c.mode === 'game' && c.gameBerry === best && c.target.distanceTo(best.pos) < 0.03) return;
    c.gameBerry = best;
    c.setTarget(best.pos, 'game', () => {
      if (this.berries.includes(best) && best.state === 'ground' && best.pos.distanceTo(c.pos) < 0.1) { this.eat(best, c); return true; }
      return false;
    });
  }

  placeHud(camera, snap = false) {
    const fwd = _v.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const target = camera.position.clone().addScaledVector(fwd, 0.7);
    target.y += 0.2;
    if (snap) this.hud.position.copy(target);
    else this.hud.position.lerp(target, 0.06);
    this.hud.lookAt(camera.position);
  }

  drawHud(text) {
    const { g, canvas } = this.board;
    g.font = '600 54px sans-serif';
    const w = Math.max(600, Math.ceil(g.measureText(text).width + 110));
    if (canvas.width !== w) {
      canvas.width = w;
      this.board.tex.dispose();
      this.board.tex = new THREE.CanvasTexture(canvas);
      this.board.tex.colorSpace = THREE.SRGBColorSpace;
      this.hud.material.map = this.board.tex;
      this.hud.material.needsUpdate = true;
    }
    this.hud.scale.x = w / 900;
    const tex = this.board.tex;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = 'rgba(12,20,32,0.85)';
    g.beginPath(); g.roundRect(0, 0, canvas.width, canvas.height, 40); g.fill();
    g.strokeStyle = this.time < 15 ? '#ff7a8a' : 'rgba(125,255,207,0.8)'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 38); g.stroke();
    g.fillStyle = '#ffffff'; g.font = '600 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    tex.needsUpdate = true;
  }
}
