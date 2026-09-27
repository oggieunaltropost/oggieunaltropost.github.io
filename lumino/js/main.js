import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Room } from './room.js';
import { Creature } from './creature.js';
import { Sfx } from './sfx.js';
import { Fx } from './fx.js';
import { Menu } from './menu.js';
import { BerryGame } from './minigame.js';
import { CatWatcher } from './cats.js';
import { Social } from './social.js';
import { Gloves } from './gloves.js';
import { Treats } from './treats.js';
import { DefendGame, LEVELS } from './defend.js';
import { Stats } from './stats.js';
import { Fly } from './fly.js';
import { t, lang, setLang, onLangChange } from './i18n.js';

// ------------------------------------------------------------ base
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 50);
scene.add(camera);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 0.7));
const sun = new THREE.DirectionalLight(0xfff4e8, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -0.35, right: 0.35, top: 0.35, bottom: -0.35, near: 0.05, far: 4 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.001;
scene.add(sun, sun.target);

const room = new Room(scene);
const fx = new Fx(scene);
// i personaggi: Lumino (azzurro) e Lumina (rosa, un po' piu' piccola e con la voce piu' acuta)
const lumino = new Creature(scene, room, { name: 'Lumino', hue: 0.47 });
const lumina = new Creature(scene, room, { name: 'Lumina', hue: 0.9, scale: 0.94 });
const sfx = new Sfx(camera, lumino.root);                 // anche musica e suoni del menu'
lumino.sfx = sfx;
lumina.sfx = new Sfx(camera, lumina.root, sfx, 1.2);
const creatures = [lumino, lumina];
lumina.enabled = false;                                   // all'inizio c'e' solo lui
for (const c of creatures) c.fx = fx;
const active = () => creatures.filter(c => c.enabled);
const visible = () => creatures.filter(c => c.enabled && c.state !== 'hidden');

const berryGame = new BerryGame({ scene, room, fx, sfx, players: visible });
const defendGame = new DefendGame({ scene, room, fx, sfx, players: visible });
const treats = new Treats(scene, fx);
const stats = new Stats();
const fly = new Fly(scene, room, fx, sfx);
berryGame.onEnd = info => { stats.add('bacche', info); showStatsPage(); };
defendGame.onEnd = info => { stats.add('difendi', info); showStatsPage(); };
const gameOn = () => berryGame.active || defendGame.active;
const cats = new CatWatcher(renderer, room, scene);
const social = new Social(room, fx);
const gloves = new Gloves(scene);

const ui = {
  overlay: document.getElementById('overlay'),
  status: document.getElementById('status'),
  ar: document.getElementById('btn-ar'),
  sim: document.getElementById('btn-sim'),
  simBar: document.getElementById('simbar'),
  hud: document.getElementById('hud'),
};

let mode = null;          // 'ar' | 'sim'
let arStart = 0;
let spawnedOnce = false;
let roomCaptureAsked = false;
let occlusionMode = 0;    // 0 stanza, 1 profondita', 2 nessuna
let followOn = false;
let catsOn = false;
let cast = 'lumino';      // 'lumino' | 'lumina' | 'both'
let gameMinutes = 3;      // durata dei giochi: 1, 2 o 3 minuti
let level = 'normale';    // difficolta' di Difendi
const castLabel = () => cast === 'both' ? t('both') : cast === 'lumino' ? 'Lumino' : 'Lumina';
const yn = on => on ? t('yes') : t('no');
const levelName = l => t('level.' + l);
const clock = new THREE.Clock();
const userPos = new THREE.Vector3();
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();

window.game = { fly, scene, room, creatures, lumino, lumina, fx, renderer, camera, berryGame, defendGame, treats, cats, social, gloves };

function who() { return cast === 'both' ? t('luminoAndLumina') : active()[0].name; }

// ------------------------------------------------------------ menu' (a pagine)
const PER_PAGE = 6;                        // partite per pagina nelle statistiche
const statsView = { game: 'bacche', level: null, page: 0 };
const back = { id: 'back', label: () => t('menu.back') };
const close = { id: 'close', label: () => t('menu.close') };

const PAGES = {
  main: () => ({
    items: [
      { id: 'cast', label: () => t('menu.cast', { x: castLabel() }) },
      { id: 'follow', label: () => t('menu.follow', { x: yn(followOn) }) },
      { id: 'fly', label: () => t('menu.fly', { x: yn(fly.enabled) }) },
      // SEGUI I GATTI disattivato per ora (riconoscimento non affidabile):
      // { id: 'cats', label: () => `Segui i gatti: ${catsOn ? 'SÌ' : 'NO'}${catsOn ? cats.label : ''}` },
      { id: 'go:bacche', label: () => berryGame.active ? t('menu.berriesExit') : t('menu.berries') },
      { id: 'go:difendi', label: () => defendGame.active ? t('menu.defendExit') : t('menu.defend') },
      { id: 'go:stats', label: () => t('menu.stats') },
      { id: 'call', label: () => cast === 'both' ? t('menu.callBoth') : t('menu.call', { x: who() }) },
      { id: 'reset', label: () => cast === 'both' ? t('menu.resetBoth') : t('menu.reset', { x: who() }) },
      { id: 'occ', label: () => t('menu.occ', { x: t('occ.short')[occlusionMode] }) },
      { id: 'room', label: () => (room.hasXRData || mode === 'sim') ? t('menu.room', { x: yn(room.showDebug) }) : t('menu.scan') },
      { id: 'lang', label: () => t('menu.lang') },
      { id: 'go:exit', label: () => t('menu.exit') },
      close,
    ],
  }),
  // conferma prima di uscire
  exit: () => ({
    title: t('page.exit'),
    info: () => [t(gameOn() ? 'page.exit.game' : 'page.exit.info')],
    cols: 1,
    items: [
      { id: 'exit', label: () => t('menu.exitYes') },
      { id: 'back', label: () => t('menu.exitNo') },
    ],
  }),
  // schermata di un gioco: impostazioni gia' pronte, basta premere "Gioca"
  bacche: () => ({
    title: t('page.berries'),
    info: () => t('page.berries.info'),
    cols: 1,
    items: [
      { id: 'dur', label: () => t('menu.duration', { x: gameMinutes }) },
      { id: 'play:bacche', label: () => t('menu.play') },
      back,
    ],
  }),
  difendi: () => ({
    title: t('page.defend'),
    info: () => t('page.defend.info', { x: LEVELS[level].lives }),
    cols: 1,
    items: [
      { id: 'level', label: () => t('menu.level', { x: levelName(level) }) },
      { id: 'dur', label: () => t('menu.duration', { x: gameMinutes }) },
      { id: 'play:difendi', label: () => t('menu.play') },
      back,
    ],
  }),
  stats: () => ({
    title: t('page.stats'),
    info: () => [t('page.stats.choose')],
    cols: 1,
    items: [
      { id: 'stats:bacche', label: () => t('page.berries') },
      { id: 'stats:difendi', label: () => t('page.defend') },
      back,
    ],
  }),
  statsLevel: () => ({
    title: t('page.stats.defend'),
    info: () => [t('page.stats.level')],
    cols: 1,
    items: [
      ...Object.keys(LEVELS).map(l => ({ id: `statsLevel:${l}`, label: () => `${levelName(l)[0].toUpperCase() + levelName(l).slice(1)} (${stats.list('difendi', l).length})` })),
      { id: 'back:stats', label: () => t('menu.back') },
    ],
  }),
  // partite di un gioco, a pagine
  statsView: () => ({
    title: statsView.game === 'bacche' ? t('page.stats.berries') : t('page.stats.defendLevel', { x: levelName(statsView.level) }),
    info: () => {
      const all = stats.entries(statsView.game, statsView.level);
      const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
      statsView.page = Math.min(statsView.page, pages - 1);
      const rows = all.slice(statsView.page * PER_PAGE, (statsView.page + 1) * PER_PAGE);
      return [stats.summary(statsView.game, statsView.level), '', ...(rows.length ? rows : [t('page.stats.none')]),
        '', t('page.stats.page', { x: statsView.page + 1, y: pages })];
    },
    cols: 2,
    items: [
      { id: 'prev', label: () => t('menu.prev'), disabled: () => statsView.page === 0 },
      { id: 'next', label: () => t('menu.next'),
        disabled: () => (statsView.page + 1) * PER_PAGE >= stats.entries(statsView.game, statsView.level).length },
      { id: 'back:statsView', label: () => t('menu.back') },
      close,
    ],
  }),
};

const menu = new Menu(scene, onMenu);
game.menu = menu;
// esce dalla realta' mista; nell'app installata chiude anche l'app (partite in corso non salvate)
function exitGame() {
  menu.hide();
  const session = renderer.xr.getSession();
  const closeApp = () => { if (pwaLaunch) window.close(); };
  if (session) session.end().then(closeApp, closeApp); else closeApp();
}

function openMenu() { menu.setPage(PAGES.main()); menu.show('world', camera, 0.42); }
function toggleMenu() { if (menu.open) menu.hide(); else openMenu(); }
game.openMenu = openMenu;

function onMenu(id) {
  sfx.click();
  // navigazione tra le pagine e scelte da scorrere: il menu' resta aperto
  if (id === 'go:bacche') { if (berryGame.active) { berryGame.stop(true, camera); menu.hide(); } else menu.setPage(PAGES.bacche()); return; }
  if (id === 'go:difendi') { if (defendGame.active) { defendGame.stop(true, camera); menu.hide(); } else menu.setPage(PAGES.difendi()); return; }
  if (id === 'go:stats') { menu.setPage(PAGES.stats()); return; }
  if (id === 'go:exit') { menu.setPage(PAGES.exit()); return; }
  if (id === 'exit') { exitGame(); return; }
  if (id === 'stats:bacche') { Object.assign(statsView, { game: 'bacche', level: null, page: 0 }); menu.setPage(PAGES.statsView()); return; }
  if (id === 'stats:difendi') { menu.setPage(PAGES.statsLevel()); return; }
  if (id.startsWith('statsLevel:')) { Object.assign(statsView, { game: 'difendi', level: id.split(':')[1], page: 0 }); menu.setPage(PAGES.statsView()); return; }
  if (id === 'back:statsView') { menu.setPage(statsView.game === 'difendi' ? PAGES.statsLevel() : PAGES.stats()); return; }
  if (id === 'prev') { statsView.page = Math.max(0, statsView.page - 1); return; }
  if (id === 'next') { statsView.page++; return; }
  if (id === 'back') { menu.setPage(PAGES.main()); return; }
  if (id === 'back:stats') { menu.setPage(PAGES.stats()); return; }
  if (id === 'level') { level = { facile: 'normale', normale: 'difficile', difficile: 'facile' }[level]; return; }
  if (id === 'dur') { gameMinutes = gameMinutes % 3 + 1; return; }
  if (id === 'lang') { setLang(lang === 'it' ? 'en' : 'it'); menu.setPage(PAGES.main()); return; }
  if (id === 'cast') { setCast({ lumino: 'lumina', lumina: 'both', both: 'lumino' }[cast]); return; }

  menu.hide();
  if (id === 'play:bacche') {
    defendGame.stop(false); treats.clear(); berryGame.start(camera, gameMinutes);
  } else if (id === 'play:difendi') {
    berryGame.stop(false); treats.clear(); defendGame.start(camera, gameMinutes, level);
  } else if (id === 'fly') {
    fly.setEnabled(!fly.enabled, userPos.clone());
  } else if (id === 'follow') {
    followOn = !followOn;
    for (const c of creatures) { c.followT = 0; if (!followOn && c.mode === 'follow') c.clearTarget(); }
  } else if (id === 'cats') {
    catsOn = !catsOn;
    if (catsOn) {
      cats.init();
      if (!camAccess) cats.startMedia();  // alternativa: telecamere come "webcam"
      fx.showPanel(t('cats.panel'), camera, 4, t('cats.title'));
    } else for (const c of creatures) if (c.mode === 'cat') c.clearTarget();
  } else if (id === 'reset') {
    fx.hideBerry();
    for (const c of active()) spawnOne(c);
  } else if (id === 'call') {
    callTo(_v.copy(camera.position).addScaledVector(camForward(), 0.4));
  } else if (id === 'gloves') {
    gloves.setEnabled(!gloves.enabled);
  } else if (id === 'occ') {
    cycleOcclusion();
  } else if (id === 'room') {
    const session = renderer.xr.getSession();
    if (mode === 'ar' && !room.hasXRData && session?.initiateRoomCapture) session.initiateRoomCapture().catch(() => {});
    else room.setDebug(!room.showDebug);
  }
}

// chi c'e' in scena: Lumino, Lumina o entrambi
function setCast(next) {
  cast = next;
  const want = { Lumino: cast !== 'lumina', Lumina: cast !== 'lumino' };
  for (const c of creatures) {
    const on = want[c.name];
    if (on === c.enabled) continue;
    c.enabled = on;
    if (!on) {
      if (held === c) dropHeld();
      c.clearTarget();
      c.root.visible = false;
      c.state = 'hidden';
    } else if (mode && spawnedOnce) spawnOne(c);
    if (on && defendGame.active) defendGame.lives[c.name] ??= defendGame.level.lives;
  }
  social.stop(lumino, lumina);
}

// ------------------------------------------------------------ helpers
function camForward() { return new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize(); }

// personaggio colpito da un raggio: { c, t } del piu' vicino
function hitCreature(origin, dir, maxDist) {
  let best = null;
  for (const c of visible()) {
    const r = 0.075;
    _v.subVectors(c.center, origin);
    const t = _v.dot(dir);
    if (t < 0 || t > maxDist) continue;
    if (_v.lengthSq() - t * t < r * r && (!best || t < best.t)) best = { c, t };
  }
  return best;
}

function nearestCreature(p, maxDist, filter = () => true) {
  let best = null, bd = maxDist;
  for (const c of visible()) {
    if (!filter(c)) continue;
    const d = c.center.distanceTo(p);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// bacca lanciata: resta a terra (fino a 10) e la mangia il primo che arriva
function goTo(hit) {
  let p = hit.point.clone();
  if (hit.normal.y < 0.6) {
    const g = room.groundBelow(_v.copy(hit.point).addScaledVector(hit.normal, 0.07), 0, 4);
    if (!g) return;
    p = g.point.clone();
  }
  sfx.resume();
  treats.add(p);
}

// chiamata: vengono vicino al punto, uno accanto all'altro
function callTo(p) {
  const g = room.groundBelow(p, 0, 3);
  if (!g) return;
  const base = g.point.clone();
  const toUser = new THREE.Vector3(camera.position.x - base.x, 0, camera.position.z - base.z).normalize();
  const side = new THREE.Vector3(-toUser.z, 0, toUser.x);
  fx.hideBerry();
  const list = visible();
  list.forEach((c, i) => {
    const t = base.clone();
    const toMe = _v.subVectors(c.pos, t).setY(0);
    if (toMe.length() > 0.12) t.addScaledVector(toMe.normalize(), 0.08);
    if (list.length > 1) t.addScaledVector(side, i === 0 ? -0.09 : 0.09);
    const tg = room.groundBelow(t, 0.1, 0.5);
    c.setTarget(tg && tg.normal.y > 0.6 ? tg.point : t, 'come');
  });
}

let camAccess = false;

// fa comparire un personaggio davanti a te (accanto all'altro, se c'e')
function spawnOne(c) {
  const other = visible().find(o => o !== c);
  if (other && other.state !== 'held' && other.state !== 'onHand') {
    const side = new THREE.Vector3(-camForward().z, 0, camForward().x);
    for (const s of [0.22, -0.22, 0.35, -0.35]) {
      const g = room.groundBelow(other.pos.clone().addScaledVector(side, s), 0.1, 0.5);
      if (g && g.normal.y > 0.7 && room.isStandable(g.point) && !room.isOutside(g.point)) { c.respawn(g.point, camera.position); return; }
    }
  }
  const fwd = camForward();
  for (const dist of [0.8, 0.5, 1.1, 0.3]) {
    const p = camera.position.clone().addScaledVector(fwd, dist);
    if (other) p.addScaledVector(new THREE.Vector3(-fwd.z, 0, fwd.x), 0.2);
    const g = room.groundBelow(p, 0, 3);
    if (g && g.normal.y > 0.7 && room.isStandable(g.point) && !room.isOutside(g.point)) { c.respawn(g.point, camera.position); return; }
  }
  const p = camera.position.clone().addScaledVector(fwd, 0.8);
  p.y = room.floorY;
  c.respawn(p, camera.position);
}

// Cuccioli finiti dietro un muro o dentro un mobile (buchi nella mappa della stanza): da li' non
// ritrovano la strada. Se succede per 1 s di fila li riportiamo vicino a te.
// (non quando anche tu sei fuori dalla stanza scansionata, es. "seguimi" per casa)
let outsideCheckT = 0;
function checkOutside(dt) {
  room.calibrate(camera.position);
  if ((outsideCheckT -= dt) > 0) return;
  outsideCheckT = 0.5;
  const feet = camera.position.clone(); feet.y = room.floorY + 0.05;
  const userOut = room.isOutside(feet);
  for (const c of visible()) {
    const check = !userOut && ['idle', 'walk', 'happy', 'sleep', 'land'].includes(c.state);
    c.outsideN = check && room.isOutside(c.pos) ? (c.outsideN || 0) + 1 : 0;
    if (c.outsideN >= 2) { c.outsideN = 0; c.onStuck?.(); }
  }
}

function spawnAll() { for (const c of active()) spawnOne(c); spawnedOnce = true; }

function roomLine() {
  const s = room.stats;
  if (!room.hasXRData) return t('room.none');
  return t('room.info', { x: s.meshes, g: s.global ? t('room.global') : '', y: s.planes });
}

function arHelp() {
  fx.showPanel([...t('help'), roomLine()], camera, 30);
}

// ------------------------------------------------------------ mani: superfici, ostacoli e gesti
const JOINT_NAMES = ['wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  ...['index', 'middle', 'ring', 'pinky'].flatMap(f => ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(j => `${f}-finger-${j}`))];

const hands = [0, 1].map(id => ({
  id, tracked: false, handed: '', center: new THREE.Vector3(), palmN: new THREE.Vector3(), up: new THREE.Vector3(),
  surf: new THREE.Vector3(), palmUp: false, open: false, points: [], vel: new THREE.Vector3(), prev: null,
  palmT: 0, palmDone: false, tip: new THREE.Vector3(), tipOk: false,
  closed: false, kind: null, pinchD: 1, curl: 1, pinchPt: new THREE.Vector3(), occupant: null,
}));
for (const c of creatures) c.hands = hands;

// reset automatico se si incastra davvero
for (const c of creatures) {
  c.onStuck = () => {
    if (mode === null) return;
    spawnOne(c);
    fx.showPanel([t(c.name === 'Lumina' ? 'stuck.f' : 'stuck.m', { x: c.name })], camera, 3, 'Oops!');
  };
}

// ------------------------------------------------------------ controller e mani (AR)
const pointers = [0, 1].map(i => {
  const c = renderer.xr.getController(i);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0xc8fff0, transparent: true, opacity: 0.55 }));
  line.visible = false;
  c.add(line);
  c.addEventListener('connected', e => { c.userData.source = e.data; line.visible = true; });
  c.addEventListener('disconnected', () => { c.userData.source = null; line.visible = false; fx.setReticle(i, null); });
  // pizzico/grilletto o grip vicino a un personaggio (o a una bacca) = presa; lontano = bacca / chiamata
  c.addEventListener('selectstart', () => {
    const p = pointers[i];
    if (p.menuHit) p.menuSel = true;
    else if (p.barHitD != null && !menu.dragging) { p.barDrag = p.barHitD; menu.startDrag(p.barPoint.clone()); }
    else tryGrab(i);
  });
  c.addEventListener('squeezestart', () => tryGrab(i));
  c.addEventListener('select', () => {
    const p = pointers[i];
    if (p.menuSel) { p.menuSel = false; if (p.menuHit) menu.press(p.menuHit.button); return; }
    if (p.menuPinch) return;   // pizzico usato per aprire il menu'
    if (p.barDrag != null || clock.elapsedTime - (p.barEndT || -9) < 0.3) return;   // ha spostato il menu'
    // il pizzico usato per prendere (o per il menu') non lancia anche una bacca
    const justHeld = clock.elapsedTime - (p.grabEndT || -9) < 0.6 || hands[i].closed ||
      clock.elapsedTime - (p.menuT || -9) < 0.8;
    if (!p.grabbing && !(isHand(p) && justHeld)) onSelect(i);
  });
  c.addEventListener('squeeze', () => { if (!pointers[i].grabbing) callTo(grip.getWorldPosition(new THREE.Vector3())); });
  c.addEventListener('selectend', () => {
    const p = pointers[i];
    if (p.barDrag != null) { p.barDrag = null; p.barEndT = clock.elapsedTime; menu.endDrag(); }
    releaseGrab(i);
  });
  c.addEventListener('squeezeend', () => releaseGrab(i));
  const grip = renderer.xr.getControllerGrip(i);
  const hand = renderer.xr.getHand(i);
  scene.add(c, grip, hand);
  return { c, line, grip, hand, hit: null, creatureHit: null, grabbing: false, menuHit: null, menuSel: false };
});
game.pointers = pointers;
game.test = { updateHands: dt => updateHands(dt), updateHandGrabs: (dt, t) => updateHandGrabs(dt, t), updateHold: (dt, t) => updateHold(dt, t), updateTouch: () => updateTouch(), menuPinch: dt => menuPinch(dt), get held() { return held; } };
game.hands = hands;

function isHand(p) { return !!p.c.userData.source?.hand; }
function joint(p, name) { const j = p.hand.joints?.[name]; return j && j.visible ? j : null; }

function updateHands(dt) {
  for (let i = 0; i < 2; i++) {
    const p = pointers[i], h = hands[i];
    const w = isHand(p) && joint(p, 'wrist'), im = w && joint(p, 'index-finger-metacarpal'),
      pm = w && joint(p, 'pinky-finger-metacarpal'), mm = w && joint(p, 'middle-finger-metacarpal'),
      mk = w && joint(p, 'middle-finger-phalanx-proximal'), mt = w && joint(p, 'middle-finger-tip');
    if (!w || !im || !pm || !mm || !mk || !mt) { h.tracked = false; h.prev = null; h.palmT = 0; continue; }
    h.tracked = true;
    h.handed = p.c.userData.source.handedness;
    const wp = w.getWorldPosition(new THREE.Vector3());
    const a = im.getWorldPosition(new THREE.Vector3()).sub(wp), b = pm.getWorldPosition(new THREE.Vector3()).sub(wp);
    h.palmN.copy(h.handed === 'left' ? b.cross(a) : a.cross(b)).normalize();
    h.center.lerpVectors(mm.getWorldPosition(_v), mk.getWorldPosition(_d), 0.5);
    h.up.copy(h.palmN.y >= 0 ? h.palmN : _v.copy(h.palmN).negate());
    h.surf.copy(h.center).addScaledVector(h.up, 0.017);
    h.open = mt.getWorldPosition(_v).distanceTo(wp) > 0.13;
    h.palmUp = h.palmN.y > 0.6 && h.open;
    if (h.prev) {
      _v.subVectors(h.center, h.prev).divideScalar(Math.max(dt, 1e-3));
      h.vel.lerp(_v, 0.35);
    } else h.vel.set(0, 0, 0);
    h.prev = (h.prev || new THREE.Vector3()).copy(h.center);
    let k = 0;
    for (const n of JOINT_NAMES) {
      const j = joint(p, n);
      if (!j) continue;
      (h.points[k] ||= new THREE.Vector3()).copy(j.getWorldPosition(_v));
      k++;
    }
    h.points.length = k;
    const tip = joint(p, 'index-finger-tip');
    h.tipOk = !!tip;
    if (tip) tip.getWorldPosition(h.tip);
    const tt = joint(p, 'thumb-tip');
    if (tt && tip) {
      tt.getWorldPosition(_v);
      h.pinchD = _v.distanceTo(h.tip);
      h.pinchPt.copy(_v).add(h.tip).multiplyScalar(0.5);
    } else h.pinchD = 1;
    const tips = [tip, mt, joint(p, 'ring-finger-tip')].filter(Boolean);
    h.curl = tips.reduce((s, j) => s + j.getWorldPosition(_v).distanceTo(h.center), 0) / tips.length;
  }
}

// ------------------------------------------------------------ prendere i personaggi
// - pizzico su di lui, oppure mano che si chiude a pugno attorno a lui;
// - con due mani ai lati (palmi uno verso l'altro), come si tiene un criceto.
let held = null;       // personaggio in mano
let holder = -1;       // 0/1 = mano o controller, 2 = due mani
let holdMode = null;   // 'pinch' | 'grasp' | 'two' | 'ctrl'
let twoT = 0, twoLostT = 0;

function takeHold(c, who, how) {
  if (!c.grab()) return false;
  held = c; holder = who; holdMode = how;
  if (who === 2) pointers[0].grabbing = pointers[1].grabbing = true;
  else { pointers[who].grabbing = true; fx.setReticle(who, null); }
  fx.panelTimer = Math.min(fx.panelTimer, 1);
  social.stop(lumino, lumina);
  return true;
}

function dropHeld() {
  const c = held;
  if (holder === 2) for (const p of pointers) { p.grabbing = false; p.grabEndT = clock.elapsedTime; }
  else if (holder >= 0) { pointers[holder].grabbing = false; pointers[holder].grabEndT = clock.elapsedTime; }
  held = null; holder = -1; holdMode = null;
  c?.release();
}

function updateHandGrabs(dt, t) {
  const [A, B] = hands;
  // due mani ai lati (mani aperte, palmi verso di lui): basta che lo "abbracci" tra le mani.
  // Si guarda la parte della mano piu' vicina a lui (anche le dita), non solo il centro del palmo.
  if (!held && A.tracked && B.tracked && !A.closed && !B.closed) {
    const mid = new THREE.Vector3().addVectors(A.center, B.center).multiplyScalar(0.5);
    const c = nearestCreature(mid, 0.14);
    let ok = false;
    if (c) {
      const cc = c.center.clone();
      const ab = _v.subVectors(B.center, A.center), dist = ab.length();
      ab.divideScalar(dist || 1);
      const near = h => Math.min(...h.points.map(q => q.distanceTo(cc)));
      const along = _d.subVectors(cc, A.center).dot(ab) / (dist || 1);   // 0 = mano A, 1 = mano B
      const between = along > 0.15 && along < 0.85;
      const facing = A.palmN.dot(ab) > 0.15 && B.palmN.dot(ab) < -0.15;
      ok = between && facing && dist < 0.26 && near(A) < 0.075 && near(B) < 0.075;
    }
    twoT = ok ? twoT + dt : 0;
    if (twoT > 0.08) { takeHold(c, 2, 'two'); twoLostT = 0; }
  }
  if (holder === 2) {
    // lo lasci solo se allarghi davvero le mani (non per un tremolio del tracciamento)
    const cc = held.center.clone();
    const lost = !A.tracked || !B.tracked || A.center.distanceTo(B.center) > 0.3 ||
      A.center.distanceTo(cc) > 0.19 || B.center.distanceTo(cc) > 0.19;
    twoLostT = lost ? twoLostT + dt : 0;
    if (twoLostT > 0.15) dropHeld();
    return;
  }
  // una mano: pizzico o pugno
  for (let i = 0; i < 2; i++) {
    const h = hands[i], p = pointers[i];
    if (!isHand(p) || !h.tracked) {
      if (h.closed) { h.closed = false; releaseGrab(i); }
      continue;
    }
    // barra sotto il menu': pizzicala e trascina per spostarlo
    if (h.menuDrag) {
      if (h.pinchD < 0.045) { menu.dragTo(h.pinchPt, camera); continue; }
      h.menuDrag = false; menu.endDrag();
    } else if (!h.closed && menu.open && h.pinchD < 0.022 && menu.barNear(h.pinchPt)) {
      h.menuDrag = true; p.menuPinch = true; menu.startDrag(h.pinchPt); continue;
    }
    if (p.menuPinch) continue;   // pizzico del menu': non prende niente
    const pinchOn = h.closed ? h.kind === 'pinch' && h.pinchD < 0.045 : h.pinchD < 0.022;
    const graspOn = h.closed ? h.kind === 'grasp' && h.curl < 0.08 : h.curl < 0.062;
    if (!h.closed && (pinchOn || graspOn)) {
      h.closed = true;
      h.kind = pinchOn ? 'pinch' : 'grasp';
      handGrab(i);
    } else if (h.closed && !pinchOn && !graspOn) {
      h.closed = false;
      releaseGrab(i);
    }
  }
}

function handGrab(i) {
  const p = pointers[i], h = hands[i];
  const pt = h.kind === 'pinch' ? h.pinchPt : h.center;
  if (berryGame.active && berryGame.grab(pt, i, 0.07)) { p.grabbing = true; return; }
  if (held) return;
  const c = nearestCreature(pt, h.kind === 'pinch' ? 0.1 : 0.11);
  if (c) takeHold(c, i, h.kind);
}

// menu' col pizzico: mano sinistra davanti a te con il DORSO verso di te, pollice e indice che si chiudono.
// (il menu' di sistema del Quest e' lo stesso pizzico ma col PALMO verso di te: cosi' non si confondono)
let menuPinchCool = 0;
function menuPinch(dt) {
  menuPinchCool -= dt;
  const h = hands.find(h => h.tracked && h.handed === 'left');
  if (!h) return false;
  const p = pointers[h.id];
  const toHead = _v.subVectors(camera.position, h.center);
  const dist = toHead.length(); toHead.divideScalar(dist || 1);
  const fwd = _d.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const pose = dist < 0.7 && -fwd.dot(toHead) > 0.75 &&   // davanti agli occhi
    h.palmN.dot(toHead) < -0.55 &&                         // dorso verso la faccia
    !p.grabbing && !p.menuHit && !held;
  const pinched = h.pinchD < 0.022;
  if (!pinched && h.pinchD > 0.045) p.menuPinch = false;   // (dopo l'evento 'select' del rilascio)
  const fire = pose && pinched && !h.menuPinched && menuPinchCool <= 0;
  h.menuPinched = pinched;
  if (!fire) return false;
  menuPinchCool = 0.8;
  p.menuPinch = true;   // questo pizzico non lancia bacche e non prende niente
  return true;
}

// gesti: palmo in su per 1 s = "venite qui"
function updateGestures(dt) {
  for (const h of hands) {
    if (!h.tracked) continue;
    const holding = pointers[h.id].grabbing;
    const callPose = !holding && h.palmN.y > 0.8 && h.open;
    if (callPose) {
      h.palmT += dt;
      const near = visible().some(c => Math.hypot(c.pos.x - h.center.x, c.pos.z - h.center.z) < 0.4);
      if (h.palmT > 1 && !h.palmDone && !near && visible().some(c => c.free) && !gameOn()) {
        h.palmDone = true;
        callTo(h.center);
        fx.hearts(h.surf.clone().addScaledVector(h.up, 0.04), 2);
      }
    } else { h.palmT = 0; h.palmDone = false; }
  }
  // pulsanti del menu' premuti con la punta dell'indice
  if (menu.open) menu.poke(hands.filter(h => h.tracked && h.tipOk).map(h => h.tip));
}

// punto con cui si tiene qualcosa: in mezzo tra pollice e indice, oppure il controller
function holdPoint(p, out) {
  if (!p.c.userData.source) return null;
  if (isHand(p)) {
    const h = hands[pointers.indexOf(p)];
    if (h.closed && h.kind === 'grasp') return h.tracked ? out.copy(h.center) : null;
    const a = joint(p, 'thumb-tip'), b = joint(p, 'index-finger-tip');
    if (!a || !b) return null;
    return out.copy(a.getWorldPosition(_v)).add(b.getWorldPosition(_d)).multiplyScalar(0.5);
  }
  if (!p.grip.visible) return null;
  return p.grip.getWorldPosition(out);
}

const _hold = new THREE.Vector3();
// presa con i controller (le mani sono gestite in updateHandGrabs)
function tryGrab(i) {
  const p = pointers[i];
  if (isHand(p) || p.grabbing || !holdPoint(p, _hold)) return;
  if (berryGame.active && berryGame.grab(_hold, i, 0.09)) { p.grabbing = true; return; }
  if (held) return;
  const c = nearestCreature(_hold, 0.11);
  if (c) takeHold(c, i, 'ctrl');
}
function releaseGrab(i) {
  const p = pointers[i];
  if (!p.grabbing || holder === 2) return;
  if (holder === i) { dropHeld(); return; }
  p.grabbing = false;
  p.grabEndT = clock.elapsedTime;
  if (berryGame.holding(i)) berryGame.release(i);
}
function updateHold(dt, t) {
  if (!held) return;
  if (held.state !== 'held') {
    if (holder === 2) for (const p of pointers) p.grabbing = false;
    else if (holder >= 0) pointers[holder].grabbing = false;
    held = null; holder = -1; holdMode = null;
    return;
  }
  if (holder === 2) {
    // tra le due mani: sta al centro dei palmi (sulla loro superficie, non dentro), non penzola
    const A = hands[0], B = hands[1];
    _hold.copy(A.center).addScaledVector(A.palmN, 0.015).add(_d.copy(B.center).addScaledVector(B.palmN, 0.015)).multiplyScalar(0.5);
    held.holdAt(_hold, dt, t, 0.055);
    return;
  }
  const p = pointers[holder];
  if (!p.c.userData.source) { dropHeld(); return; }
  if (holdPoint(p, _hold)) held.holdAt(_hold, dt, t, holdMode === 'grasp' ? 0.055 : 0.085);
}

function onSelect(i) {
  const p = pointers[i];
  fx.panelTimer = Math.min(fx.panelTimer, 1);
  if (p.creatureHit) { p.creatureHit.c.pet(); return; }
  if (p.hit && !gameOn()) goTo(p.hit);
}

function updatePointers() {
  const hovered = [];
  let barHover = hands.some(h => h.tracked && (h.menuDrag || menu.barNear(h.pinchPt, 0.05)));
  // un dito vicino al menu': i raggi delle mani non illuminano piu' niente (comanda il dito)
  const fingerAtMenu = menu.open && hands.some(h => h.tracked && h.tipOk && menu.fingerNear(h.tip));
  for (let i = 0; i < 2; i++) {
    const p = pointers[i];
    if (!p.c.userData.source) { p.menuHit = null; continue; }
    p.c.getWorldPosition(_v);
    p.c.getWorldQuaternion(_q);
    const o = _v.clone(), dir = _d.set(0, 0, -1).applyQuaternion(_q).clone();
    // trascinamento del menu' col raggio (preso per la barra)
    if (p.barDrag != null) {
      menu.dragTo(o.clone().addScaledVector(dir, p.barDrag), camera);
      p.menuHit = null; p.line.scale.z = p.barDrag; p.line.visible = true; fx.setReticle(i, null);
      barHover = true;
      continue;
    }
    p.menuHit = menu.hit(o, dir);
    p.barHitD = p.menuHit ? null : menu.barHit(o, dir);
    if (p.barHitD != null) {
      (p.barPoint ||= new THREE.Vector3()).copy(o).addScaledVector(dir, p.barHitD);
      p.line.scale.z = p.barHitD; p.line.visible = true; fx.setReticle(i, null);
      barHover = true;
      continue;
    }
    // mano col dito gia' vicino al menu': comanda il dito (niente raggio che illumina un altro tasto)
    if (p.menuHit && isHand(p) && fingerAtMenu) {
      p.menuHit = null;
      p.line.visible = false;
      fx.setReticle(i, null);
      continue;
    }
    if (p.menuHit) {
      hovered.push(p.menuHit.button);
      p.line.scale.z = p.menuHit.distance;
      p.line.visible = true;
      fx.setReticle(i, null);
      continue;
    }
    p.hit = room.raycast(o, dir, 8);
    p.creatureHit = hitCreature(o, dir, p.hit ? p.hit.distance : 8);
    const len = p.creatureHit?.t ?? (p.hit ? p.hit.distance : 1.5);
    p.line.scale.z = len;
    // con le mani il raggio si vede solo quando serve (niente linee davanti mentre li tieni o accarezzi)
    p.line.visible = !isHand(p) || !p.grabbing;
    fx.setReticle(i, !p.creatureHit && !p.grabbing && !gameOn() ? p.hit : null);
  }
  // il tasto sotto il dito che si avvicina si illumina (ha la precedenza sul raggio)
  const fingers = menu.open ? menu.fingerHover(hands.filter(h => h.tracked && h.tipOk).map(h => h.tip)) : [];
  if (fingers.length) menu.setHover(fingers, 'finger'); else menu.setHover(hovered, 'ray');
  menu.barHover = barHover;
}

// carezze: mano aperta (o controller) che tocca un personaggio
function updateTouch() {
  for (const c of visible()) {
    if (['held', 'fall'].includes(c.state)) continue;
    const ctr = c.center.clone();
    for (let i = 0; i < 2; i++) {
      const p = pointers[i], h = hands[i];
      if (!p.c.userData.source || p.grabbing) continue;
      if (isHand(p)) {
        if (h.closed) continue;
        if (c.state === 'onHand' && c.handId === i) continue; // la mano che lo regge non lo accarezza
        if (h.tracked && h.points.some(q => q.distanceTo(ctr) < 0.065)) c.pet();
      } else if (p.grip.visible && p.grip.getWorldPosition(_v).distanceTo(ctr) < 0.07) c.pet();
    }
  }
}

const prevButtons = new Map();
function updateButtons(session) {
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp || src.hand) continue;
    const prev = prevButtons.get(src) || [];
    const now = gp.buttons.map(b => b.pressed);
    // stick premuto o A/B/X/Y: apre/chiude il menu' davanti a te
    if ([3, 4, 5].some(k => now[k] && !prev[k])) { toggleMenu(); sfx.click(); }
    prevButtons.set(src, now);
  }
}

// punti che fanno esplodere i ragni: tutte le articolazioni delle mani e i controller
function touchPoints() {
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const p = pointers[i], h = hands[i];
    if (!p.c.userData.source) continue;
    if (isHand(p)) { if (h.tracked) pts.push(...h.points); }
    else if (p.grip.visible) pts.push(p.grip.getWorldPosition(new THREE.Vector3()));
  }
  return pts;
}

// ------------------------------------------------------------ segui i gatti
// ognuno va dal gatto piu' vicino e gli gira attorno a ~45 cm, un passo di cerchio alla volta
function updateCats(dt, c, phase) {
  c.chasingCat = false;
  if (!catsOn || gameOn() || !c.free) return;
  const cat = cats.nearest(c.pos);
  if (!cat) { if (c.mode === 'cat') c.clearTarget(); return; }
  c.chasingCat = true;
  c.catT = (c.catT ?? 0) - dt;
  if (c.catT > 0) return;
  c.catT = 0.45;
  const R = 0.45 + phase * 0.12;
  const rel = new THREE.Vector3(c.pos.x - cat.pos.x, 0, c.pos.z - cat.pos.z);
  const d = rel.length();
  c.catAngle = d > 1e-3 ? Math.atan2(rel.z, rel.x) : (c.catAngle ?? 0);
  if (d < R * 1.6) c.catAngle += 0.75;
  const p = new THREE.Vector3(cat.pos.x + Math.cos(c.catAngle) * R, cat.pos.y + 0.3, cat.pos.z + Math.sin(c.catAngle) * R);
  const g = room.groundBelow(p, 0, 1.2);
  if (g && g.normal.y > 0.6) c.setTarget(g.point, 'cat');
}

// ------------------------------------------------------------ seguimi
function updateFollow(dt, c) {
  if (!followOn || gameOn() || !c.free || c.chasingCat || c.mode === 'goto') return;
  c.followT = (c.followT ?? 0) - dt;
  if (c.followT > 0) return;
  c.followT = 0.4;
  const me = new THREE.Vector3(camera.position.x, room.floorY + 1, camera.position.z);
  const g = room.groundBelow(me, 0, 3);
  const feet = g && g.normal.y > 0.6 ? g.point : me.setY(room.floorY);
  const away = new THREE.Vector3(c.pos.x - feet.x, 0, c.pos.z - feet.z);
  const dist = away.length();
  if (dist < 0.9 && !(c.mode === 'follow' && c.target)) return;
  // punto a ~45 cm da te, dal lato in cui si trova
  if (dist > 1e-3) away.divideScalar(dist); else away.copy(camForward());
  const spot = feet.clone().addScaledVector(away, 0.45);
  const sg = room.groundBelow(spot, 0.3, 1);
  if (sg && sg.normal.y > 0.6) spot.copy(sg.point);
  if (c.mode === 'follow' && c.target && c.target.distanceTo(spot) < 0.3) return;
  c.setTarget(spot, 'follow');
}

// i due personaggi non si compenetrano quando stanno a terra
const GROUND_STATES = ['idle', 'walk', 'happy', 'land', 'sleep'];
function separate() {
  const [a, b] = [lumino, lumina];
  if (!a.enabled || !b.enabled || !GROUND_STATES.includes(a.state) || !GROUND_STATES.includes(b.state)) return;
  if (Math.abs(a.pos.y - b.pos.y) > 0.05) return;
  const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz);
  const min = social.kind === 'cuddle' ? 0.13 : 0.12;
  if (d >= min || d < 1e-4) return;
  const push = (min - d) / 2;
  a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
  b.pos.x += dx / d * push; b.pos.z += dz / d * push;
}

// ------------------------------------------------------------ occlusione
function applyOcclusion() {
  const hasDepth = renderer.xr.hasDepthSensing?.();
  if (occlusionMode === 1 && !hasDepth) occlusionMode = 2;
  room.setOcclusion(occlusionMode === 0);
  const dm = renderer.xr.getDepthSensingMesh?.();
  if (dm) dm.visible = occlusionMode === 1;
}
function cycleOcclusion() {
  occlusionMode = (occlusionMode + 1) % 3;
  applyOcclusion();
  if (!menu.open) fx.showPanel([t('occ.long')[occlusionMode]], camera, 2.5, t('occlusion'));
}

async function startAR() {
  sfx.resume();
  const init = {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'depth-sensing', 'anchors',
      // ...(document.getElementById('opt-cats')?.checked ? ['camera-access'] : []),   // gatti: disattivato
    ],
    depthSensing: { usagePreference: ['gpu-optimized'], dataFormatPreference: [] },
  };
  let session = null;
  if (window.__xrSession) {           // app PWA: sessione chiesta appena aperta la pagina
    session = await window.__xrSession;
    window.__xrSession = null;
  }
  if (!session) try {
    session = await navigator.xr.requestSession('immersive-ar', init);
  } catch (e) {
    delete init.depthSensing;
    init.optionalFeatures = init.optionalFeatures.filter(f => f !== 'depth-sensing');
    session = await navigator.xr.requestSession('immersive-ar', init);
  }
  scene.background = null;
  await renderer.xr.setSession(session);
  camAccess = !!session.enabledFeatures?.includes('camera-access');
  // if (camAccess) cats.init();   // gatti: disattivato
  mode = 'ar';
  arStart = performance.now();
  spawnedOnce = false;
  menu.hide();
  ui.overlay.hidden = true;
  session.addEventListener('end', () => {
    mode = null;
    berryGame.stop(false);
    defendGame.stop(false);
    treats.clear();
    fly.setEnabled(false);
    cats.clear();
    menu.hide();
    room.clear();
    if (held) dropHeld();
    for (const c of creatures) { c.root.visible = false; c.state = 'hidden'; c.clearTarget(); }
    fx.hideBerry();
    ui.overlay.hidden = false;
  });
}

// ------------------------------------------------------------ anteprima su PC (stanza finta)
let controls = null;
const simObjects = [];
function buildSimRoom() {
  const add = (key, geo, color, pos, rotY = 0) => {
    geo.rotateY(rotY).translate(...pos);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    m.receiveShadow = true;
    m.castShadow = key !== 'floor';
    scene.add(m);
    simObjects.push(m);
    room.addStatic(key, geo.clone());
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add('floor', new THREE.PlaneGeometry(4.4, 4.1).rotateX(-Math.PI / 2), 0xd8ccb9, [0.35, 0, 0.45]);
  add('wallB', box(5, 2.5, 0.1), 0xeef0f2, [0, 1.25, -1.6]);
  add('wallL', box(0.1, 2.5, 5), 0xe4e8ec, [-1.9, 1.25, 0]);
  // tavolo con gambe (ci si passa sotto)
  add('tableTop', box(1.0, 0.04, 0.6), 0x9b6b43, [0.55, 0.72, -0.7]);
  for (const [x, z] of [[0.1, -0.44], [1.0, -0.44], [0.1, -0.96], [1.0, -0.96]]) add(`leg${x}${z}`, box(0.05, 0.7, 0.05), 0x7d5434, [x, 0.35, z]);
  add('books', box(0.22, 0.1, 0.16), 0x3b6fb6, [0.35, 0.79, -0.8], 0.3);
  // mobiletto pieno (da scalare)
  add('cabinet', box(0.45, 0.5, 0.38), 0xb7c4cf, [-1.2, 0.25, -1.3]);
  add('box', box(0.28, 0.22, 0.28), 0xd9a95b, [-0.7, 0.11, -0.2], 0.4);
  add('pouf', new THREE.CylinderGeometry(0.2, 0.2, 0.36, 28), 0xc2577a, [0.9, 0.18, 0.5]);
  add('rug', box(1.1, 0.012, 0.8), 0x6a8f7a, [-0.2, 0.006, 0.5]);
}

function startSim() {
  sfx.resume();
  mode = 'sim';
  ui.overlay.hidden = true;
  ui.simBar.hidden = false;
  ui.hud.hidden = false;
  scene.background = new THREE.Color(0xdfe6ed);
  if (!simObjects.length) buildSimRoom();
  room.refresh();
  camera.position.set(1.3, 1.15, 1.7);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.3, -0.3);
  controls.update();
  game.controls = controls;
  camera.updateMatrixWorld();
  lumino.spawn(new THREE.Vector3(0, 0, 0.35), camera.position);
  spawnedOnce = true;

  const ray = new THREE.Raycaster();
  let down = null, dragging = null;
  const dragPlane = new THREE.Plane(), dragPt = new THREE.Vector3();
  const setRay = e => ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
  // trascinando un personaggio col mouse lo si "prende" come con la mano
  renderer.domElement.addEventListener('pointerdown', e => {
    down = [e.clientX, e.clientY];
    setRay(e);
    const h = e.button === 0 && !menu.hit(ray.ray.origin, ray.ray.direction) && hitCreature(ray.ray.origin, ray.ray.direction, 20);
    if (h) {
      dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(_d).negate(), h.c.center);
      dragging = h.c;
      controls.enabled = false;
    }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    setRay(e);
    const mh = menu.hit(ray.ray.origin, ray.ray.direction);
    menu.setHover(mh ? [mh.button] : []);
    if (!dragging || !down) return;
    if (dragging.state !== 'held' && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) dragging.grab();
    if (dragging.state === 'held' && ray.ray.intersectPlane(dragPlane, dragPt)) dragging.holdAt(dragPt.addScaledVector(_v.set(0, 1, 0), 0.03), 1 / 60, clock.elapsedTime);
  });
  renderer.domElement.addEventListener('pointerup', e => {
    controls.enabled = true;
    if (dragging) { const c = dragging; dragging = null; if (c.state === 'held') { c.release(); return; } }
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.button !== 0) return;
    setRay(e);
    const mh = menu.hit(ray.ray.origin, ray.ray.direction);
    if (mh) { menu.press(mh.button); return; }
    if (fly.enabled && ray.ray.distanceSqToPoint(fly.pos) < 0.03 * 0.03 && fly.touch([fly.pos.clone()])) return;
    if (defendGame.active) {
      const s = defendGame.spiders.find(s => ray.ray.distanceSqToPoint(s.center) < (0.045 * s.baseScale + 0.015) ** 2);
      if (s) { defendGame.score++; defendGame.explode(s); return; }
    }
    // nel mini gioco un clic su una bacca = la mangi tu
    if (berryGame.active) {
      const b = berryGame.berries.find(b => ray.ray.distanceSqToPoint(b.pos) < 0.04 * 0.04);
      if (b) { berryGame.eat(b, 'me'); return; }
    }
    const hit = room.raycast(ray.ray.origin, ray.ray.direction, 20);
    const hc = hitCreature(ray.ray.origin, ray.ray.direction, hit ? hit.distance : 20);
    if (hc) hc.c.pet();
    else if (hit && !gameOn()) goTo(hit);
  });
  document.getElementById('sim-call').onclick = () => callTo(new THREE.Vector3(camera.position.x * 0.5, 1, camera.position.z * 0.5));
  document.getElementById('sim-pet').onclick = () => visible().forEach(c => c.pet());
  document.getElementById('sim-menu').onclick = () => toggleMenu();
}

// ------------------------------------------------------------ loop
function loop(time, frame) {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 'ar' && frame) {
    const session = renderer.xr.getSession();
    room.updateXR(frame, renderer.xr.getReferenceSpace());
    room.refresh();
    room.setFallbackFloor(true, room.floorY - 0.02);
    room.refresh();
    room.setFallbackShadow(!room.hasXRData || creatures.some(c => c.enabled && c.lastGroundKind === 'fallback'));
    applyOcclusion();
    const elapsed = (performance.now() - arStart) / 1000;
    if (!spawnedOnce && modelsReady && elapsed > 1.2 && (room.hasXRData || elapsed > 3)) {
      spawnAll();
      arHelp();
    }
    // senza scansione della stanza (e magari senza controller): la chiediamo una volta
    if (!room.hasXRData && elapsed > 4 && !roomCaptureAsked && session.initiateRoomCapture) {
      roomCaptureAsked = true;
      session.initiateRoomCapture().catch(() => {});
    }
    // cats.update(dt, t, frame, renderer.xr.getReferenceSpace(), catsOn, camera);   // gatti: disattivato
    updateHands(dt);
    if (spawnedOnce) checkOutside(dt);
    // bottone MENÙ sul dorso della mano sinistra
    if (gloves.update(pointers, hands, dt) || menuPinch(dt)) {
      toggleMenu();
      sfx.click();
      for (const p of pointers) p.menuT = clock.elapsedTime;
    }
    updateHandGrabs(dt, t);
    updatePointers();
    updateGestures(dt);
    updateHold(dt, t);
    updateTouch();
    updateButtons(session);
  } else if (mode === 'sim') {
    controls?.update();
    room.refresh();
    // cats.update(dt, t, null, null, catsOn, camera);   // gatti: disattivato
    ui.hud.textContent = visible().map(c => `${c.name}: ${c.state}${c.target ? ' → ' + c.mode : ''}`).join('   ') +
      (social.kind ? `   · gioco: ${social.kind}` : '') + (followOn ? '  · seguimi' : '') +
      (defendGame.active ? '  · difendi: ragni ' + defendGame.score + ' cuori ' + JSON.stringify(defendGame.lives) : '') +
      (berryGame.active ? '  · gara: ' + Object.entries(berryGame.score).map(([k, v]) => `${k === 'me' ? 'tu' : k} ${v}`).join(' - ') : '');
  }

  simulate(dt, t);
  renderer.render(scene, camera);
}

// logica di gioco di un fotogramma (separata dal disegno: serve anche per i test veloci)
function simulate(dt, t) {
  camera.getWorldPosition(userPos);
  const list = visible();
  list.forEach((c, i) => updateCats(dt, c, i));
  const eating = treats.update(dt, t, list, !gameOn());
  // la mosca: durante i giochi va in pausa; altrimenti gli animaletti le danno la caccia
  fly.pause(gameOn());
  fly.update(dt, userPos, list);
  if (mode === 'ar') fly.touch(touchPoints());
  const flyHunt = fly.drive(dt, list);
  const playing = social.update(dt, lumino, lumina, userPos,
    cast === 'both' && !gameOn() && !followOn && !eating && !flyHunt && !list.some(c => c.chasingCat));
  for (const c of list) {
    c.autoWander = !followOn && !gameOn() && !c.chasingCat && !playing && !eating && !flyHunt;
    if (!flyHunt) updateFollow(dt, c);
  }
  berryGame.update({ dt, t, camera, userHead: userPos.clone(), holdPoint: id => holdPoint(pointers[id], new THREE.Vector3()) });
  if (defendGame.active) defendGame.update({ dt, t, camera, userHead: userPos.clone(), touchPoints: touchPoints() });
  for (const c of creatures) c.update(dt, userPos);
  separate();
  fx.update(dt, t);
  menu.update(dt);

  // la luce segue i personaggi per ombre nitide (inquadra entrambi se ci sono tutti e due)
  if (list.length) {
    const ctr = new THREE.Vector3();
    for (const c of list) ctr.add(c.pos);
    ctr.divideScalar(list.length);
    const spread = list.length > 1 ? list[0].pos.distanceTo(list[1].pos) : 0;
    const half = THREE.MathUtils.clamp(spread / 2 + 0.35, 0.35, 1.4);
    const cam = sun.shadow.camera;
    if (Math.abs(cam.right - half) > 0.02) {
      Object.assign(cam, { left: -half, right: half, top: half, bottom: -half });
      cam.updateProjectionMatrix();
    }
    sun.target.position.copy(ctr);
    sun.position.copy(ctr).add(_v.set(0.5, 1.6, 0.35));
  }
}
game.simulate = simulate;
game.setCast = c => setCast(c);
game.goTo = hit => goTo(hit);

// ------------------------------------------------------------ avvio
addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let statusMsg = ['status.loading', {}];
function setStatus(key, vars = {}) { statusMsg = [key, vars]; ui.status.textContent = t(key, vars); }
// testi della pagina iniziale nella lingua scelta
function applyPageText() {
  document.documentElement.lang = lang;
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  set('intro', 'page.intro'); set('btn-ar', 'page.enter'); set('btn-sim', 'page.sim');
  const apkVer = document.querySelector('meta[name="apk-version"]')?.content;
  const apk = document.getElementById('apk'); if (apk) apk.textContent = t('page.apk', { v: apkVer ? ' ' + apkVer : '' });
  set('sim-call', 'sim.call'); set('sim-pet', 'sim.pet'); set('sim-menu', 'sim.menu');
  const list = document.getElementById('help-list');
  if (list) list.innerHTML = t('page.list').map(l => `<li>${l}</li>`).join('');
  ui.status.textContent = t(...statusMsg);
  for (const b of document.querySelectorAll('#langflags .flag')) b.classList.toggle('active', b.dataset.lang === lang);
}
// bandierine in alto a destra: cambiano la lingua (stessa scelta della voce del menu')
for (const b of document.querySelectorAll('#langflags .flag')) b.addEventListener('click', () => { if (b.dataset.lang !== lang) setLang(b.dataset.lang); });
onLangChange(() => { applyPageText(); showStatsPage(); gloves.refreshText?.(t('tattoo')); menu.redraw(true); });
applyPageText();
gloves.refreshText?.(t('tattoo'));
setStatus('status.loading');
let modelsReady = false;
renderer.setAnimationLoop(loop);
const pwaLaunch = new URLSearchParams(location.search).has('pwa');
if (pwaLaunch && window.__xrSession) startAR().catch(() => setStatus('status.press'));
await Promise.all([lumino.load('assets/lumino.glb'), lumina.load('assets/lumina.glb'), fly.load()]);
modelsReady = true;

const arOk = navigator.xr && await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
if (arOk) {
  ui.ar.disabled = false;
  setStatus('status.ready');
} else {
  setStatus(window.isSecureContext ? 'status.noAR' : 'status.https');
}
ui.ar.onclick = () => {
  startAR().catch(e => setStatus('status.error', { x: e.message }));
  // if (optCats.checked) { cats.init(); cats.startMedia(); }   // gatti: disattivato
};
// modalita' gatti: il permesso per le telecamere si chiede qui (serve un clic)
const optCats = document.getElementById('opt-cats');
try { optCats.checked = localStorage.getItem('lumino-cats') === '1'; } catch { /* storage non disponibile */ }
// gatti: disattivato
// optCats.addEventListener('change', async () => {
//   try { localStorage.setItem('lumino-cats', optCats.checked ? '1' : '0'); } catch { /* ignora */ }
//   if (!optCats.checked) return;
//   cats.init();
//   ui.status.textContent = 'Chiedo il permesso per le telecamere...';
//   const ok = await cats.startMedia();
//   ui.status.textContent = ok ? 'Telecamere pronte: potranno vedere i gatti.'
//     : 'Telecamere non disponibili (' + (cats.mediaError || '?') + '): proverò con l\'accesso WebXR.';
// });
ui.sim.onclick = startSim;
// statistiche anche nella pagina iniziale
function showStatsPage() {
  const el = document.getElementById('stats');
  if (!el) return;
  // titolo di ogni gioco + elenco delle ultime partite
  el.innerHTML = stats.lines(5).map(l => l.startsWith('   ') ? `<li>${l.trim()}</li>` : `</ul><h3>${l}</h3><ul>`).join('').replace(/^<\/ul>/, '') + '</ul>';
}
showStatsPage();
if (new URLSearchParams(location.search).has('sim')) startSim();
// app PWA "immersiva" sul Quest: entra subito in realta' mista (se il visore chiede un tocco, resta il pulsante)
// (se la richiesta immediata non e' partita, riprova qui)
if (pwaLaunch && arOk && mode !== 'ar' && !window.__xrSession) {
  startAR().catch(() => setStatus('status.press'));
}
