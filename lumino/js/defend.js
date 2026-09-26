// Gioco "Difendi": compaiono ragni di colori e grandezze diverse che vogliono prendere i tuoi animaletti.
// Loro scappano; tu fai esplodere i ragni toccandoli con le mani. Se un ragno raggiunge un animaletto,
// esplode e gli toglie un cuore. Se uno dei due resta senza cuori e' game over.
import * as THREE from 'three';
import { Creature } from './creature.js';
import { t } from './i18n.js';

export const LEVELS = {
  facile:    { lives: 5, speed: 0.8,  spawn: [5.0, 2.8], alive: [2, 4], pounce: 0.25 },
  normale:   { lives: 4, speed: 1.0,  spawn: [3.8, 1.8], alive: [2, 5], pounce: 0.33 },
  difficile: { lives: 3, speed: 1.2,  spawn: [3.0, 1.3], alive: [3, 7], pounce: 0.4 },
};
const COLORS = [
  { Corpo: '#6b3fd1', Macchie: '#ffcf3f' },
  { Corpo: '#2fae4f', Macchie: '#ff4fa0' },
  { Corpo: '#e0452b', Macchie: '#ffe14f' },
  { Corpo: '#2b6fe0', Macchie: '#7dffcf' },
  { Corpo: '#26243a', Macchie: '#ff3355' },
  { Corpo: '#e08a1e', Macchie: '#7a4dff' },
];
const HEART = { Lumino: '#5fd8ff', Lumina: '#ff8fd0' };
const SAFE_IN_HAND = 5;   // secondi massimi al sicuro in mano
const _v = new THREE.Vector3();

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  g.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  g.closePath();
}

export class DefendGame {
  constructor({ scene, room, fx, sfx, players }) {
    Object.assign(this, { scene, room, fx, sfx, players });
    this.active = false;
    this.pool = [];
    this.spiders = [];
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 140;
    this.canvas = canvas;
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.056),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false }));
    this.hud.renderOrder = 35;
    this.hud.visible = false;
    scene.add(this.hud);
    this.hudKey = '';
  }

  // 8 ragni pronti (modello caricato una volta e clonato, ognuno col suo colore)
  async prepare() {
    if (this.pool.length) return;
    this.pool = await Promise.all(Array.from({ length: 8 }, async (_, i) => {
      const c = new Creature(this.scene, this.room, { name: 'Ragno', footprints: false, centerH: 0.03 });
      await c.load('assets/spider.glb', COLORS[i % COLORS.length]);
      c.color = new THREE.Color(COLORS[i % COLORS.length].Corpo);
      c.autoWander = false;
      c.onStuck = () => this.remove(c);
      return c;
    }));
  }

  async start(camera, minutes = 3, level = 'normale') {
    await this.prepare();
    this.stop(false);
    this.active = true;
    this.level = LEVELS[level];
    this.levelName = level;
    this.duration = minutes * 60;
    this.minutes = minutes;
    this.time = this.duration;
    this.score = 0;
    this.spawnT = 2;
    this.lives = {};
    for (const p of this.players()) {
      this.lives[p.name] = this.level.lives;
      p.autoWander = false; p.clearTarget();
      p.safeT = 0; p.hurtT = 0; p.fleeT = 0;
    }
    this.hud.visible = true;
    this.placeHud(camera, true);
    this.sfx.start();
    this.sfx.startMusic(0.06, 'horror');
    this.fx.showPanel(t('defend.intro', { x: SAFE_IN_HAND, l: t('level.' + level), y: this.level.lives, m: minutes }),
      camera, 7, t('defend.title'));
  }

  stop(showResult = true, camera = null, lost = null) {
    if (!this.active) return;
    this.active = false;
    for (const s of [...this.spiders]) this.remove(s);
    this.hud.visible = false;
    this.sfx.stopMusic();
    for (const p of this.players()) { p.autoWander = true; if (p.mode === 'flee') p.clearTarget(); }
    const finished = lost || this.time <= 0;
    if (showResult && finished) this.onEnd?.({
      minutes: this.minutes, level: this.levelName, score: this.score, lives: { ...this.lives },
      result: lost ? 'gameover' : this.time <= 0 ? 'vittoria' : 'interrotta',
      seconds: Math.floor(this.duration - Math.max(0, this.time)),
    });
    if (showResult && camera) {
      if (lost) {
        this.fx.showPanel([t('defend.caught', { x: lost.name }), t('defend.popped', { x: this.score }),
          t('defend.lasted', { x: Math.floor(this.duration - this.time) })], camera, 8, t('defend.gameOver'));
        this.sfx.lose();
      } else if (this.time > 0) {
        this.fx.showPanel([t('defend.popped', { x: this.score }), t('defend.lasted', { x: Math.floor(this.duration - this.time) })], camera, 6, t('defend.stopped'));
      } else {
        this.fx.showPanel([t('defend.won'), t('defend.popped', { x: this.score }),
          t('defend.heartsLeft', { x: Object.entries(this.lives).map(([n, l]) => `${n} ${l}`).join(', ') })], camera, 8, t('defend.victory'));
        this.sfx.win();
        for (const p of this.players()) if (p.free) p.happy();
      }
    }
  }

  remove(s) {
    s.clearTarget();
    s.state = 'hidden';
    s.root.visible = false;
    this.spiders = this.spiders.filter(x => x !== s);
  }

  explode(s) {
    const c = s.center.clone();
    this.fx.burst(c, s.color, s.baseScale);
    this.fx.burst(c, 0xffffff, s.baseScale * 0.5);
    this.sfx.splat();
    this.remove(s);
  }

  // ------------------------------------------------------------ comparsa dei ragni
  spawn(userHead) {
    const s = this.pool.find(x => !this.spiders.includes(x));
    if (!s) return;
    const players = this.players();
    let p = null;
    for (let i = 0; i < 12 && !p; i++) {
      const c = this.room.sample(Math.random() < 0.3, userHead, 2.6, userHead);
      if (!c) continue;
      const farFromPets = players.every(pl => pl.pos.distanceTo(c) > 1.0);
      const farFromMe = Math.hypot(c.x - userHead.x, c.z - userHead.z) > 0.6;
      if (farFromPets && farFromMe) p = c;
    }
    if (!p) return;
    const size = 0.6 + Math.random() * 1.0;             // da 6 a 16 cm di zampe
    s.baseScale = size;
    s.speedMul = this.level.speed * (1.35 - 0.45 * (size - 0.6));   // i piccoli sono piu' veloci
    s.retarget = 0;
    s.pounceT = 1.5;
    const prey = this.nearestPrey(p);
    s.respawn(p, prey ? prey.pos : userHead);
    this.spiders.push(s);
    this.sfx.spawnSpider();
  }

  nearestPrey(p) {
    let best = null, bd = Infinity;
    for (const pl of this.players()) {
      if (pl.state === 'hidden' || this.isSafe(pl)) continue;
      const d = pl.pos.distanceTo(p);
      if (d < bd) { bd = d; best = pl; }
    }
    return best;
  }

  isSafe(pl) { return ['held', 'onHand'].includes(pl.state); }

  // ------------------------------------------------------------ gli animaletti scappano
  flee(pl, dt, userHead) {
    pl.fleeT -= dt;
    if (pl.fleeT > 0 || !pl.free) return;
    pl.fleeT = 0.35;
    // finito lontano o fuori vista? torna vicino a te
    const far = Math.hypot(pl.pos.x - userHead.x, pl.pos.z - userHead.z) > 2.0;
    pl.hiddenT = this.room.visibleFrom(pl.pos, userHead) ? 0 : (pl.hiddenT || 0) + 0.35;
    if (far || pl.hiddenT > 2.5) {
      // punto sul pavimento vicino ai tuoi piedi (non alla testa) e che vedi
      const feet = new THREE.Vector3(userHead.x, this.room.floorY, userHead.z);
      const back = this.room.sample(false, feet, 1.2, userHead);
      if (back) { pl.setTarget(back, 'flee'); pl.hiddenT = 0; return; }
    }
    let near = null, nd = 1.3;
    for (const s of this.spiders) {
      const d = Math.hypot(s.pos.x - pl.pos.x, s.pos.z - pl.pos.z);
      if (d < nd && Math.abs(s.pos.y - pl.pos.y) < 0.6) { nd = d; near = s; }
    }
    if (!near) { if (pl.mode === 'flee' && !pl.target) pl.toIdle(); return; }
    const away = new THREE.Vector3(pl.pos.x - near.pos.x, 0, pl.pos.z - near.pos.z).normalize();
    let best = null, bestScore = -Infinity;
    for (const ang of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
      for (const dist of [0.9, 0.6, 0.35]) {
        const dir = away.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        const g = this.room.groundBelow(pl.pos.clone().addScaledVector(dir, dist), 0.3, 1.2);
        if (!g || g.normal.y < 0.7) continue;
        // lontano da tutti i ragni, preferendo la direzione opposta a quello piu' vicino
        // non scappare verso il vuoto (scale, bordi): meglio punti su cui si sta bene in piedi
        if (!this.room.isStandable(g.point)) continue;
        if (Math.hypot(g.point.x - userHead.x, g.point.z - userHead.z) > 1.8) continue;
        if (!this.room.visibleFrom(g.point, userHead)) continue;
        const score = Math.min(...this.spiders.map(s => s.pos.distanceTo(g.point))) - Math.abs(ang) * 0.05;
        if (score > bestScore) { bestScore = score; best = g.point.clone(); }
      }
    }
    if (best) pl.setTarget(best, 'flee');
  }

  // ------------------------------------------------------------ ciclo
  // ctx: { dt, t, camera, userHead, touchPoints: [Vector3] }
  update(ctx) {
    if (!this.active) return;
    const { dt, camera, userHead } = ctx;
    this.time -= dt;
    if (this.time <= 0) { this.stop(true, camera); return; }
    this.sfx.setMusicFast(this.time < 20);
    const k = 1 - this.time / this.duration;              // 0 -> 1: sempre piu' ragni
    const L = this.level;
    const maxAlive = Math.round(L.alive[0] + (L.alive[1] - L.alive[0]) * k);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.spiders.length < maxAlive) {
      this.spawn(userHead);
      this.spawnT = L.spawn[0] + (L.spawn[1] - L.spawn[0]) * k;
    }

    const players = this.players().filter(p => p.state !== 'hidden');
    for (const pl of players) {
      pl.hurtT -= dt;
      // in mano sono al sicuro, ma non per sempre: dopo un po' scappano via
      if (this.isSafe(pl)) {
        pl.safeT += dt;
        if (pl.safeT > SAFE_IN_HAND) { pl.safeT = 0; pl.sfx?.squeak(1.3); pl.startFall(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3, (Math.random() - 0.5) * 0.4)); }
      } else pl.safeT = Math.max(0, pl.safeT - dt * 0.5);
      this.flee(pl, dt, userHead);
    }

    for (const s of [...this.spiders]) {
      s.update(dt, userHead);
      if (s.state === 'spawn') continue;
      // bersaglio: l'animaletto non protetto piu' vicino
      s.retarget -= dt;
      const prey = this.nearestPrey(s.pos);
      s.pounceT -= dt;
      if (s.retarget <= 0 && s.free) {
        s.retarget = 0.3;
        if (prey) {
          // abbastanza vicino: balzo addosso all'animaletto
          const dist = Math.hypot(prey.pos.x - s.pos.x, prey.pos.z - s.pos.z);
          if (s.pounceT <= 0 && dist < L.pounce && Math.abs(prey.pos.y - s.pos.y) < 0.2 && s.canJump(s.pos, prey.pos)) {
            s.pounceT = 2.2;
            s.startJump(prey.pos.clone(), 0.08);
          } else s.setTarget(prey.pos, 'hunt');
        } else if (s.target) s.clearTarget();
      }
      // toccato da una mano: esplode
      // (center restituisce un vettore condiviso: va copiato)
      const sc = s.center.clone(), r = 0.045 * s.baseScale + 0.015;
      if (ctx.touchPoints.some(q => q.distanceTo(sc) < r)) {
        this.score++;
        this.explode(s);
        continue;
      }
      // ha raggiunto un animaletto: gli toglie un cuore ed esplode
      for (const pl of players) {
        if (this.isSafe(pl) || pl.hurtT > 0) continue;
        const reach = 0.045 * s.baseScale + 0.05;
        const pc = pl.center.clone();
        if (Math.hypot(sc.x - pc.x, sc.z - pc.z) < reach && Math.abs(sc.y - pc.y) < 0.09) {
          // (chi non ha ancora i suoi cuori, es. aggiunto a partita in corso, parte da quelli del livello)
          this.lives[pl.name] = Math.max(0, (this.lives[pl.name] ?? this.level.lives) - 1);
          pl.hurtT = 2;
          pl.sfx?.hurt();
          this.explode(s);
          // spinta via dal ragno
          const away = new THREE.Vector3(pl.pos.x - s.pos.x, 0, pl.pos.z - s.pos.z).normalize();
          const g = this.room.groundBelow(pl.pos.clone().addScaledVector(away, 0.15), 0.1, 0.6);
          if (pl.free && g && g.normal.y > 0.6) pl.startJump(g.point, 0.08);
          if (this.lives[pl.name] <= 0) { this.stop(true, camera, pl); return; }
          break;
        }
      }
    }
    this.placeHud(camera);
    this.drawHud(players);
  }

  placeHud(camera, snap = false) {
    const fwd = _v.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const target = camera.position.clone().addScaledVector(fwd, 0.7);
    target.y += 0.2;
    if (snap) this.hud.position.copy(target); else this.hud.position.lerp(target, 0.06);
    this.hud.lookAt(camera.position);
  }

  // tempo, ragni esplosi e i cuori di ciascun animaletto (azzurri Lumino, rosa Lumina)
  drawHud(players) {
    const mm = Math.floor(this.time / 60), ss = Math.floor(this.time % 60);
    const timeTxt = `${mm}:${String(ss).padStart(2, '0')}`;
    const scoreTxt = t('defend.hud', { x: this.score });
    const key = timeTxt + scoreTxt + players.map(p => p.name + this.lives[p.name]).join();
    if (key === this.hudKey) return;
    this.hudKey = key;
    const g = this.canvas.getContext('2d');
    g.font = '600 52px sans-serif';
    const heartsW = players.length * (this.level.lives * 44 + 40);
    const w = Math.max(600, Math.ceil(g.measureText(`${timeTxt}   ${scoreTxt}   `).width + heartsW + 90));
    if (this.canvas.width !== w) {
      this.canvas.width = w;
      this.tex.dispose();
      this.tex = new THREE.CanvasTexture(this.canvas);
      this.tex.colorSpace = THREE.SRGBColorSpace;
      this.hud.material.map = this.tex;
      this.hud.material.needsUpdate = true;
    }
    this.hud.scale.x = w / 900;
    const h = this.canvas.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,10,28,0.88)';
    g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
    g.strokeStyle = this.time < 15 ? '#ff5a6a' : 'rgba(190,120,255,0.85)'; g.lineWidth = 6;
    g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, 38); g.stroke();
    g.font = '600 52px sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    const line = `${timeTxt}   ${scoreTxt}   `;
    g.fillText(line, 45, h / 2 + 2);
    let x = 45 + g.measureText(line).width;
    for (const p of players) {
      const col = HEART[p.name] || '#ffffff';
      for (let i = 0; i < this.level.lives; i++) {
        heartPath(g, x + 20, h / 2 + 4, 36);
        if (i < (this.lives[p.name] ?? this.level.lives)) { g.fillStyle = col; g.fill(); }
        else { g.strokeStyle = col; g.lineWidth = 4; g.globalAlpha = 0.45; g.stroke(); g.globalAlpha = 1; }
        x += 44;
      }
      x += 40;
    }
    this.tex.needsUpdate = true;
  }
}
