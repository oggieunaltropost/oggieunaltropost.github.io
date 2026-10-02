// Home Boxing - avvio, realta' mista, round e punteggi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRing, RING_SIZE } from './ring.js';
import { Mike, LEVELS, loadMikeGLTF } from './mike.js';
import { Sweat, Bruises, Celebration } from './fx.js';
import { Player, SimInput } from './player.js';
import { Scoreboard, HitFlash, PauseMenu, MenuPanel } from './hud.js';
import { Room } from './room.js';
import { Arena } from './arena.js';
import { RingGirl } from './ringgirl.js';
import { ROUND_S, REST_S, knockdownChance, say, sayCount, GetUpChallenge } from './match.js';
import * as sfx from './sfx.js';

const $ = id => document.getElementById(id);
const status = t => { $('status').textContent = t; };

// ---------------------------------------------------------------- scena
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 60);
camera.position.set(0, 1.65, 0);
scene.add(camera);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const hemi = new THREE.HemisphereLight(0xffffff, 0x404048, 1.1);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
key.position.set(1.2, 3.5, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 8 });
key.shadow.bias = -0.0005;

addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// l'arena (ring + tabellone) si sistema davanti al giocatore; il giocatore sta sul lato +Z
const arena = new THREE.Group();
scene.add(arena);
arena.add(key, key.target);           // luce e ombre seguono il ring
const board = new Scoreboard();
arena.add(board.mesh);
const PLAYER_Z = 0.8;                 // dove sta il giocatore rispetto al centro del ring (se c'e' spazio)
let ringSize = 0, ringObj = null, playerZ = PLAYER_Z;
function setRing(size, pz) {
  playerZ = pz;
  if (Math.abs(size - ringSize) > 1e-3) {
    if (ringObj) arena.remove(ringObj);
    ringObj = buildRing(size); arena.add(ringObj); ringSize = size;
  }
  arena.updateMatrixWorld(true);
  board.mesh.position.set(Math.min(1.15, size / 2 - 0.2), 1.95, -size / 2 - 0.1);
  board.mesh.lookAt(new THREE.Vector3(0, 1.6, pz).applyMatrix4(arena.matrix));
}
setRing(RING_SIZE, PLAYER_Z);
const room = new Room(scene);
const sweat = new Sweat(scene);
let bruises = null;
// round per incontro (dal menu: 1, 3, 6 o 12; di base 3)
let rounds = 3;
try { rounds = parseInt(localStorage.getItem('hb-rounds')) || 3; } catch (e) {}
const party = new Celebration(scene);
const girl = new RingGirl(scene);
// sgabello di Mike nel suo angolo (blu), si vede solo nel riposo
const stool = new THREE.Group();
{ const m = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.5, metalness: 0.4 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), m); seat.position.y = 0.5; stool.add(seat);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), m); const a = i * 2.1; l.position.set(Math.cos(a) * 0.11, 0.25, Math.sin(a) * 0.11); stool.add(l); } }
stool.visible = false; scene.add(stool);
let level = 'normale';
try { level = localStorage.getItem('hb-level') || 'normale'; } catch (e) {}
if (!LEVELS[level]) level = 'normale';
// dove si gioca: 'stanza' = realta' mista nella tua stanza, 'arena' = palazzetto virtuale con il pubblico
let mode = 'stanza';
try { mode = localStorage.getItem('hb-mode') || 'stanza'; } catch (e) {}
let arenaEnv = null;
function applyMode() {
  const inArena = mode === 'arena';
  if (inArena && !arenaEnv) { arenaEnv = new Arena(RING_SIZE); arena.add(arenaEnv.group); }
  if (arenaEnv) arenaEnv.group.visible = inArena;
  room.group.visible = !inArena;
  hemi.intensity = inArena ? 0.2 : 1.1;
  scene.environmentIntensity = inArena ? 0.3 : 0.7;     // nel palazzetto il pubblico resta in penombra
  key.intensity = inArena ? 0.9 : 2.2;
  scene.background = inArena ? new THREE.Color(0x05060a) : (sim ? new THREE.Color(0x2a2c31) : null);
  scene.fog = inArena ? new THREE.Fog(0x05060a, 9, 26) : null;
  sfx.crowdAmbient(inArena);
}
const READY_S = 6;                    // secondi prima del gong

const player = new Player(renderer, scene, camera);
const flash = new HitFlash(camera);
const pause = new PauseMenu();
scene.add(pause.group);
// menu principale dentro il gioco (stanza o arena, livello, inizia, esci)
const mainMenu = new MenuPanel({ title: 'HOME BOXING', subtitle: 'tieni un guantone sul pulsante', width: 1.0, height: 0.95, rows: [
  { label: 'DOVE', y: 0.22, buttons: [{ id: 'm:stanza', text: 'Nella stanza', w: 0.42 }, { id: 'm:arena', text: 'Nell\'arena', w: 0.42 }] },
  { label: 'LIVELLO', y: 0.06, buttons: [{ id: 'l:facile', text: 'Facile', w: 0.205 }, { id: 'l:normale', text: 'Normale', w: 0.205 },
    { id: 'l:difficile', text: 'Difficile', w: 0.205 }, { id: 'l:impossibile', text: 'Impossibile', w: 0.205 }] },
  { label: 'ROUND', y: -0.1, buttons: [{ id: 'r:1', text: '1', w: 0.15 }, { id: 'r:3', text: '3', w: 0.15 }, { id: 'r:6', text: '6', w: 0.15 }, { id: 'r:12', text: '12', w: 0.15 }] },
  { y: -0.3, h: 0.12, buttons: [{ id: 'start', text: 'INIZIA INCONTRO', w: 0.52, color: 0x1f8a4c }, { id: 'quit', text: 'ESCI DAL GIOCO', w: 0.34, color: 0xc4161f }] },
] });
scene.add(mainMenu.group);
let armsUpT = 0, prevButtons = false;

let mike = null;
let sim = null, orbit = null;

// tiene Mike dentro le corde
const _inv = new THREE.Matrix4(), _p = new THREE.Vector3();
function keepInRing(pos) {
  _inv.copy(arena.matrixWorld).invert();
  _p.copy(pos).applyMatrix4(_inv);
  const m = ringSize / 2 - 0.4;
  _p.x = Math.max(-m, Math.min(m, _p.x)); _p.z = Math.max(-m, Math.min(m, _p.z)); _p.y = 0;   // sul tappeto
  pos.copy(_p.applyMatrix4(arena.matrixWorld));
}

// Altezza del pavimento vero. Il riferimento "local-floor" del Quest puo' sbagliare di molto
// (per esempio con il Confine disattivato): per questo si legge il pavimento dalla scansione
// della stanza (plane-detection), come in Lumino; se manca si stima dall'altezza della testa.
let floorY = 0, floorSource = 'visore';
function setFloor(y, source) {
  floorY = y; floorSource = source;
  arena.position.y = y; arena.updateMatrixWorld(true);
  if (mike) mike.root.position.y = y;
  console.log('pavimento', y.toFixed(3), source);
}

function detectFloor(frame) {
  const ref = renderer.xr.getReferenceSpace();
  if (!ref) return null;
  room.update(frame, ref);
  return room.floorY;
}

let lastPlace = null, fitted = false;
function placeArena(headPos, yaw) {
  lastPlace = { head: headPos.clone(), yaw };
  // ring piu' grande possibile dentro la stanza scansionata; senza scansione: 3,2 m davanti a te
  const fit = mode === 'arena' ? null : room.fitRing(headPos, yaw, RING_SIZE, PLAYER_Z);
  fitted = !!fit;
  arena.rotation.y = yaw;
  if (fit) {
    arena.position.set(fit.center.x, floorY, fit.center.z);
    arena.updateMatrix(); setRing(fit.size, fit.playerZ);
    console.log('ring', fit.size.toFixed(1), 'm, giocatore a', fit.playerZ.toFixed(2), 'dal centro');
  } else {
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    arena.position.set(headPos.x, floorY, headPos.z).addScaledVector(fwd, PLAYER_Z);
    arena.updateMatrix(); setRing(RING_SIZE, PLAYER_Z);
  }
  arena.updateMatrixWorld(true);
  if (mike) {
    const mz = Math.max(-(ringSize / 2 - 0.4), playerZ - 1.15);
    mike.root.position.set(0, 0, mz).applyMatrix4(arena.matrixWorld);
    mike.root.rotation.y = yaw;               // il modello guarda verso +Z: verso il giocatore
  }
}

// ---------------------------------------------------------------- incontro: round, punti, danno, atterramenti
const POWER = { facile: 0.7, normale: 0.9, difficile: 1.1, impossibile: 1.3 };   // forza dei pugni di Mike
const getUp = new GetUpChallenge(scene);
getUp.attachDark(camera);
const fighter = () => ({ points: 0, hits: 0, blocks: 0, dodges: 0, dmg: 0, kd: 0, kdRound: 0 });
const game = {
  round: 1, time: ROUND_S, phase: 'ready', phaseT: 0, paused: false,
  player: fighter(), mike: fighter(), message: '', kd: null, result: null,
};
function newMatch() {
  game.round = 1; game.result = null; game.kd = null;
  game.player = fighter(); game.mike = fighter();
  if (bruises) bruises.reset();
  if (mike) { mike.resetPose(); mike.holdDist = null; }
  getUp.stop();
  startRound();
}
function startRound() {
  girl.stop(); stool.visible = false;
  if (mike) mike.leaveCorner();
  game.time = ROUND_S; game.phase = 'ready'; game.phaseT = 0; game.paused = false; game.kd = null;
  game.player.kdRound = 0; game.mike.kdRound = 0;
  game.message = `Round ${game.round} di ${rounds}`;
  if (mike) mike.enabled = false;
}
const resetRound = newMatch;          // (nomi usati dal resto del codice)
newMatch();

// un colpo a segno: danno, e forse atterramento
function landed(who, zone, power) {
  const f = game[who];
  f.dmg = Math.min(100, f.dmg + (zone === 'head' ? 5 + 9 * power : 3 + 5 * power));
  if (game.kd || game.phase !== 'fight') return;
  if (Math.random() < knockdownChance(f.dmg, power, zone)) knockdown(who, power);
}

function knockdown(who, power) {
  const f = game[who];
  f.kd++; f.kdRound++;
  mike.enabled = false;
  sfx.punchHit(1.4);
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') sfx.cheer('boato', 1);
  // KO tecnico solo con il terzo atterramento nello stesso round (regola dei tre knockdown)
  const kd = { who, count: 0, t: 0, up: false, tko: f.kdRound >= 3 };
  if (who === 'mike') {
    mike.knockdown();
    // si rialza? con tanto danno, o dopo un colpo devastante, puo' restare giu' anche al primo atterramento
    // resta giu' (KO al 10)? piu' probabile se e' gia' andato giu' o il colpo era devastante
    const stay = kd.tko || Math.random() < 0.08 + (power > 1.3 ? 0.15 : 0) + (f.kd >= 2 ? 0.25 : 0) + Math.max(0, f.kd - 2) * 0.2;
    kd.getUpAt = stay ? 99 : Math.min(9, 3 + Math.floor(Math.random() * (2 + f.dmg / 25)));
    game.message = 'MIKE E\' A TERRA!';
  } else {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
    const n = f.kdRound === 1 ? 10 : 20;                  // 10 colpi la prima volta, 20 la seconda (la terza e' KO tecnico)
    if (!kd.tko) getUp.start(n, 0.11, player.head, e.y);
    game.message = `SEI A TERRA! Colpisci ${n} volte il bottone per rialzarti`;
    mike.holdDist = 1.7;                     // Mike va all'angolo neutro
  }
  if (kd.tko) game.message = who === 'mike' ? 'L\'arbitro ferma l\'incontro!' : 'L\'arbitro ti ferma!';
  game.kd = kd;
}

function updateKnockdown(dt) {
  const kd = game.kd, f = game[kd.who];
  kd.t += dt;
  if (kd.tko && kd.t > 1.5) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'KO tecnico');
  if (kd.tko) return;
  // conteggio: un numero al secondo
  const c = Math.floor(kd.t / 1.0);
  if (c > kd.count && c <= 10) {
    kd.count = c;
    if (!sayCount(c)) sfx.punchBlock();
    if (c <= 8) game.message = `${kd.who === 'mike' ? 'Mike' : 'Tu'} ${kd.up ? 'in piedi' : 'a terra'}… ${c}` + (kd.who === 'player' && !kd.up ? ` · colpisci il bottone! (${getUp.left})` : '');
  }
  if (kd.who === 'mike' && !kd.up && kd.count >= kd.getUpAt) { kd.up = true; mike.getUp(); }
  if (kd.who === 'player' && !kd.up && getUp.update(dt, Object.values(player.gloves))) {
    kd.up = true; game.message = 'In piedi! Si riprende dopo l\'8';
  }
  if (!kd.up && kd.count >= 10) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'KO');
  // conteggio obbligatorio fino a 8, poi si riprende
  if (kd.up && kd.count >= 8 && (kd.who === 'player' || mike.isUp())) {
    f.dmg = Math.max(0, Math.min(f.dmg - 15, 70));      // si e' ripreso un po'
    game.kd = null; getUp.stop(); mike.holdDist = null;
    game.message = 'BOX!'; sfx.bell(1);
    mike.enabled = true;
  }
}

function endMatch(winner, how) {
  game.phase = 'end'; game.phaseT = 0; game.kd = null;
  mike.enabled = false; getUp.stop(); mike.holdDist = null;
  sfx.bell(3);
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') { sfx.cheer('boato', 1); setTimeout(() => sfx.cheer('applauso', 0.9), 2500); }
  game.result = { winner, how };
  const pts = `${game.player.points}-${game.mike.points}`;
  game.message = winner === 'player' ? `HAI VINTO per ${how}!` : winner === 'mike' ? `Vince Mike per ${how}` : `Pareggio ai punti (${pts})`;
  if (how.includes('punti') && winner !== 'pari') game.message += ` (${pts})`;
  // festa per il vincitore: coriandoli e fuochi d'artificio nei suoi colori
  const c = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  party.start(c, winner === 'player' ? [0xd81e2c, 0xff7a7a, 0xffffff] : winner === 'mike' ? [0x1d4fc4, 0x7aa8ff, 0xffffff] : [0xd81e2c, 0x1d4fc4]);
  sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
  say(winner === 'player' ? `Hai vinto per ${how}` : winner === 'mike' ? `Vince Mike per ${how}` : 'Pareggio');
}

function handleEvents() {
  for (const e of mike.events) {
    (window.evlog ||= []).push(`${game.time.toFixed(1)} ${e.type} ${e.zone || e.name || ''} ${e.why || ''}`);
    switch (e.type) {
      case 'playerHit': {
        const pts = e.zone === 'head' ? 2 : 1;
        game.player.points += pts; game.player.hits++;
        game.message = e.zone === 'head' ? 'Tu: colpo alla testa +2' : 'Tu: colpo al corpo +1';
        sfx.punchHit(Math.min(1.3, 0.6 + e.speed / 6));
        if (mode === 'arena') { if (e.speed > 4 || e.zone === 'head') sfx.cheer('boato', Math.min(1, 0.4 + e.speed / 10)); }
        else sfx.crowd(0.08);
        if (arenaEnv) arenaEnv.cheer(Math.min(1.5, e.speed / 4) * (e.zone === 'head' ? 1 : 0.6));
        bruises.hit(e.zone, e.lx, e.ly, Math.min(1.6, e.speed / 4));
        {
          // qualche gocciolina rossa: solo nei colpi al viso molto forti o quando Mike e' gia' molto segnato
          const hurt = bruises.worst();
          const strong = e.speed > 5.5 && Math.random() < 0.45;
          const worn = hurt > 0.6 && Math.random() < 0.2 + (hurt - 0.6) * 1.5;
          const blood = e.zone === 'head' && (strong || worn) ? 1 + Math.floor(Math.random() * (1 + hurt * 3)) : 0;
          sweat.burst(e.point, e.dir, Math.min(1.5, e.speed / 4), blood);
        }
        player.pulse(e.side, 1.0, 70);
        landed('mike', e.zone, Math.min(1.5, e.speed / 5));
        break;
      }
      case 'mikeBlocked':
        game.mike.blocks++; game.message = 'Mike para';
        if (mode === 'arena' && Math.random() < 0.35) sfx.cheer('ooh', 0.6);
        sfx.punchBlock(); player.pulse(e.side, 0.4, 40);
        break;
      case 'mikeDodged':
        game.mike.dodges++; game.message = 'Mike schiva';
        if (mode === 'arena' && Math.random() < 0.5) sfx.cheer('ooh', 0.7);
        break;
      case 'mikeThrows':
        sfx.whoosh();
        break;
      case 'mikeHit':
        game.mike.points += e.zone === 'body' ? 1 : 2; game.mike.hits++;
        game.message = e.zone === 'body' ? 'Mike: colpo al corpo +1' : 'Mike: colpo alla testa +2';
        sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2); flash.hit(e.zone === 'body' ? 0.5 : 1);
        if (arenaEnv) arenaEnv.cheer(0.6);
        if (mode === 'arena' && e.zone === 'head') sfx.cheer('boato', 0.6);
        player.pulse('left', 0.7, 90); player.pulse('right', 0.7, 90);
        landed('player', e.zone, POWER[level] * (0.85 + Math.random() * 0.3));
        break;
      case 'playerBlocked':
        game.player.blocks++; game.message = 'Parata!';
        sfx.punchBlock(); player.pulse(e.side, 0.6, 50);
        break;
      case 'playerDodged':
        game.player.dodges++; game.message = 'Schivata!';
        break;
    }
  }
  mike.events.length = 0;
}

function updateGame(dt) {
  game.phaseT += dt;
  mike.fatigue = game.mike.dmg / 100;
  if (game.phase === 'menu') {
    game.message = 'Scegli dal menu davanti a te';
    flash.setBase(0);
  } else if (game.paused) {
    game.message = 'PAUSA';
  } else if (game.phase === 'ready') {
    const left = Math.ceil(READY_S - game.phaseT);
    game.message = left > 0 ? `Round ${game.round} di ${rounds} · si comincia tra ${left}…` : 'BOX!';
    if (left > 0 && renderer.xr.isPresenting && floorSource !== 'stanza' && floorSource !== 'mano') game.message = `Ring basso? Accovacciati e tieni una mano a terra 2 s · ${left}`;
    else if (left > 3 && game.round === 1) game.message = `Pausa: alza tutte e due le braccia sopra la testa · ${left}`;
    if (game.phaseT >= READY_S) { game.phase = 'fight'; game.phaseT = 0; sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; }
  } else if (game.phase === 'fight') {
    if (game.kd) updateKnockdown(dt);
    else {
      game.time = Math.max(0, game.time - dt);
      for (const k of ['player', 'mike']) game[k].dmg = Math.max(0, game[k].dmg - dt * 0.6);   // si riprende un po'
      flash.setBase(game.player.dmg > 55 ? (game.player.dmg - 55) / 45 * 0.35 : 0);         // vista che si annebbia
      if (game.time === 0) {
        sfx.bell(3); mike.enabled = false;
        if (game.round >= rounds) {
          const a = game.player.points, b = game.mike.points;
          endMatch(a > b ? 'player' : a < b ? 'mike' : 'pari', 'decisione ai punti');
        } else {
          game.phase = 'rest'; game.phaseT = 0;
          // Mike all'angolo sullo sgabello, la ragazza del ring gira col cartello del prossimo round
          const h = ringSize / 2 - 0.42;
          const corner = new THREE.Vector3(h, 0, -h).applyMatrix4(arena.matrixWorld);
          const center = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
          stool.position.copy(corner).addScaledVector(corner.clone().sub(center).setY(0).normalize(), -0.02);
          stool.visible = true;
          mike.goTo(corner.clone().addScaledVector(center.clone().sub(corner).setY(0).normalize(), 0.12), center);
          girl.start(arena, ringSize, game.round + 1);
          if (mode === 'arena') sfx.cheer('applauso', 0.8);
          for (const k of ['player', 'mike']) game[k].dmg = Math.max(0, game[k].dmg - 25);   // all'angolo ci si riprende
        }
      }
    }
  } else if (game.phase === 'rest') {
    const left = Math.ceil(REST_S - game.phaseT);
    game.message = `Riposo all'angolo · round ${game.round + 1} tra ${left} s`;
    flash.setBase(0);
    if (game.phaseT >= REST_S) { game.round++; startRound(); }
  } else if (game.phase === 'end') {
    flash.setBase(0);
    if (game.phaseT > 5 && !pause.group.visible) openPause(true);
  }
  const xr = renderer.xr.getSession && renderer.xr.getSession();
  const feats = xr && xr.enabledFeatures ? (xr.enabledFeatures.includes('plane-detection') ? 'piani sì' : 'piani no') : '';
  board.draw({ round: game.round, rounds: rounds, level: LEVELS[level].label, time: game.phase === 'rest' ? Math.max(0, REST_S - game.phaseT) : game.time,
    running: game.phase === 'fight', player: game.player, mike: game.mike, message: game.message,
    diag: `ring ${ringSize.toFixed(1)} m · pavimento: ${floorSource} · occhi a ${(player.head.y + 0.06 - floorY).toFixed(1)} m da terra ${feats ? '· ' + feats : ''}` });
}

// ---------------------------------------------------------------- ciclo
let lastT = performance.now();
let placed = false, xrFrames = 0, roomCaptureAsked = false, headMax = 0;
const floorTouch = { left: 0, right: 0 };
renderer.setAnimationLoop((t, frame) => { if (window.pauseLoop) return; const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; tick(dt, frame); });
// per le prove senza visore: window.stepGame(n, dt) fa avanzare il gioco di n fotogrammi
window.stepGame = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt, null); };

function tick(dt, frame) {
  if (renderer.xr.isPresenting && !placed && xrFrames > 15) {   // aspetta che il tracciamento sia stabile
    const cam = renderer.xr.getCamera();
    const p = new THREE.Vector3(); cam.getWorldPosition(p);
    {
      const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
      placeArena(p, e.y); placed = true;
      if (game.phase === 'menu' && !mainMenu.group.visible) showMainMenu();
    }
  }
  if (renderer.xr.isPresenting && frame && xrFrames % 30 === 0) {
    const y = detectFloor(frame);
    const userSet = floorSource === 'mano' || floorSource === 'manuale';
    if (y !== null && !userSet && (floorSource !== 'stanza' || Math.abs(y - floorY) > 0.02)) setFloor(y, 'stanza');
    // la pianta della stanza e' arrivata dopo: rimetti il ring della misura giusta
    if (placed && !fitted && room.floorPoly && lastPlace) placeArena(lastPlace.head, lastPlace.yaw);
    // nessuna scansione dopo 3 s e altezza della testa poco credibile: stima (occhi ~ 1,55 m da terra)
    if (y === null && floorSource === 'visore' && xrFrames > 200) {
      const h = player.head.y + 0.06 - floorY;
      if (h < 1.2 || h > 2.1) setFloor(player.head.y + 0.06 - 1.55, 'stima');
      else floorSource = 'visore ok';
    }
    // come Lumino: se la stanza non e' mai stata scansionata, il Quest propone la scansione (una volta)
    const session = renderer.xr.getSession();
    if (y === null && !roomCaptureAsked && xrFrames > 300 && !userSet && session && session.initiateRoomCapture) {
      roomCaptureAsked = true;
      session.initiateRoomCapture().catch(() => {});
    }
  }
  // Nell'arena (realta' virtuale) il Quest non da' la scansione della stanza: il pavimento si stima
  // dall'altezza dei tuoi occhi, misurata quando giochi nella stanza (pavimento vero) e salvata.
  if (false && renderer.xr.isPresenting && mode === 'arena' && xrFrames > 40 && xrFrames < 600 &&
      (floorSource === 'visore' || floorSource === 'stima')) {
    let eye = 1.55;
    try { eye = parseFloat(localStorage.getItem('hb-eye')) || 1.55; } catch (e) {}
    const y = headMax - eye;
    if (floorSource === 'visore' || Math.abs(y - floorY) > 0.02) setFloor(y, 'stima');
  }
  if (renderer.xr.isPresenting && mode !== 'arena' && xrFrames % 300 === 0 && xrFrames > 600 &&
      (floorSource === 'stanza' || floorSource === 'mano')) {
    const eye = headMax - floorY;
    if (eye > 1.2 && eye < 2.1) try { localStorage.setItem('hb-eye', eye.toFixed(3)); } catch (e) {}
  }
  // regolazione a mano con la levetta di un controller (su/giu')
  if (renderer.xr.isPresenting) for (const src of player.sources) {
    const ax = src.gamepad && src.gamepad.axes;
    if (ax && ax.length >= 4 && Math.abs(ax[3]) > 0.5) setFloor(floorY - ax[3] * dt * 0.3, 'manuale');
  }
  if (renderer.xr.isPresenting) xrFrames++;
  if (orbit) orbit.update();
  player.update(dt);
  if (renderer.xr.isPresenting || sim) calibrateByHand(dt);
  if (mike) updatePause(dt);
  if (mike) {
    mike.update(dt, player);
    handleEvents();
    updateGame(dt);
  }
  flash.update(dt);
  sweat.update(dt);
  girl.update(dt, player.head);
  if (party.update(dt)) sfx.firework();
  if (arenaEnv && arenaEnv.group.visible) { arenaEnv.update(dt); sfx.crowdLevel(arenaEnv.excite); }
  player.endFrame();
  renderer.render(scene, camera);
}

// Pausa: tutte e due le braccia alzate sopra la testa per 1,2 s (in combattimento non succede),
// oppure A/B/X/Y sui controller. Nel menu i pulsanti si premono tenendoci sopra un guantone.
function openPause(end = false) {
  game.paused = !end; mike.enabled = false;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  pause.open(player.head, e.y, end);
  if (!end) sfx.bell(1);
}
function closePause() {
  game.paused = false; pause.close();
  mike.enabled = game.phase === 'fight' && !game.kd;
}
function showMainMenu() {
  newMatch(); game.phase = 'menu'; game.message = 'Menu';
  mike.enabled = false; pause.close();
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  mainMenu.select(['m:' + mode, 'l:' + level, 'r:' + rounds]);
  mainMenu.open(player.head, e.y);
}
function updateMainMenu(dt, gloves) {
  const id = mainMenu.update(dt, gloves);
  if (!id) return;
  sfx.punchBlock();
  if (id.startsWith('m:')) { mode = id.slice(2); try { localStorage.setItem('hb-mode', mode); } catch (e) {} applyMode(); placed = false; xrFrames = 16; }
  else if (id.startsWith('l:')) { level = id.slice(2); try { localStorage.setItem('hb-level', level); } catch (e) {} mike.setLevel(level); }
  else if (id.startsWith('r:')) { rounds = parseInt(id.slice(2)); try { localStorage.setItem('hb-rounds', rounds); } catch (e) {} }
  else if (id === 'start') { mainMenu.close(); newMatch(); return; }
  else if (id === 'quit') { mainMenu.close(); const s = renderer.xr.getSession(); if (s) s.end(); return; }
  mainMenu.select(['m:' + mode, 'l:' + level, 'r:' + rounds]);
}

function updatePause(dt) {
  const g = Object.values(player.gloves);
  const up = g.every(x => x.mesh.visible && x.center.y > player.head.y + 0.12);
  armsUpT = up ? armsUpT + dt : 0;
  let pressed = false;
  for (const s of player.sources) {
    const b = s.gamepad && s.gamepad.buttons;
    if (b && ((b[4] && b[4].pressed) || (b[5] && b[5].pressed))) pressed = true;
  }
  const click = pressed && !prevButtons; prevButtons = pressed;
  if (game.phase === 'menu') { updateMainMenu(dt, g); return; }
  if (!game.paused && !pause.group.visible && (armsUpT > 1.2 || click)) { armsUpT = -2; openPause(); return; }
  if (game.paused && click) { closePause(); return; }
  const id = pause.update(dt, g);
  if (id === 'resume') closePause();
  else if (id === 'restart') { closePause(); newMatch(); }
  else if (id === 'exit') { closePause(); showMainMenu(); }
}

// Pavimento "a mano": accovacciati e appoggia una mano (o il controller) a terra per 2 secondi.
// Funziona anche senza scansione della stanza.
function calibrateByHand(dt) {
  const head = player.head;
  headMax = Math.max(headMax * (1 - dt * 0.02), head.y);       // altezza da in piedi (si adatta piano)
  const crouched = head.y < headMax - 0.3;
  for (const g of Object.values(player.gloves)) {
    const low = g.mesh.visible && head.y - g.center.y > 0.45 && g.speed < 0.25;
    floorTouch[g.side] = crouched && low ? floorTouch[g.side] + dt : 0;
    if (floorTouch[g.side] > 2) {
      floorTouch[g.side] = -3;                                    // pausa prima di poterlo rifare
      setFloor(g.center.y - 0.035, 'mano');
      sfx.bell(1);
      game.message = 'Pavimento sistemato!';
    }
  }
}

// ---------------------------------------------------------------- avvio
loadMikeGLTF('assets/mike.glb', f => status(`Caricamento di Mike… ${Math.round(f * 100)}%`)).then(gltf => {
  mike = new Mike(gltf, scene, level);
  girl.load().catch(e => console.warn('ragazza del ring', e));
  bruises = new Bruises(mike.model);
  mike.bounds = keepInRing;
  placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  window.mike = mike; window.game = game; window.player = player; window.room = room; window.placeArena = placeArena; window.camera = camera; window.renderOnly = () => renderer.render(scene, camera); window.bruisesFx = () => bruises; window.getUpFx = getUp; window.gameApi = { newMatch }; window.sweatFx = sweat;   // per le prove
  status('');
  $('enter').disabled = !navigator.xr;
  if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (!ok) { $('enter').disabled = true; status('Questo browser non supporta la realtà mista: usa il browser del Quest 3 (oppure prova l\'anteprima su PC).'); }
  });
  if (new URLSearchParams(location.search).has('sim')) startSim();
}).catch(e => { console.error(e); status('Errore nel caricamento di Mike: ' + e.message); });

$('enter').onclick = async () => {
  sfx.initAudio();
  try {
    // nella stanza: realta' mista; nell'arena: realta' virtuale (il palazzetto copre tutto)
    // sempre realta' mista: l'arena e' un ambiente che copre la stanza, cosi' si cambia dal menu senza uscire
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'anchors'],
    });
    applyMode();
    renderer.xr.setFoveation(1);
    await renderer.xr.setSession(session);
    if (bruises) bruises.reset();
    game.phase = 'menu';
    placed = false; xrFrames = 0; floorSource = 'visore'; floorY = 0; roomCaptureAsked = false; headMax = 0;
    resetRound();
    $('overlay').hidden = true;
    session.addEventListener('end', () => {
      $('overlay').hidden = false; placed = false;
      if (game.paused) closePause();
      mainMenu.close();
      if (mike) mike.enabled = false;
      sfx.stopAll();                                // niente suoni dopo l'uscita
    });
  } catch (e) { status('Impossibile entrare in realtà mista: ' + e.message); }
};

// pagina nascosta (visore tolto, browser chiuso): silenzio
document.addEventListener('visibilitychange', () => { if (document.hidden) sfx.stopAll(); });

function startSim() {
  sfx.initAudio();
  $('overlay').hidden = true; $('simhelp').hidden = false;
  sim = new SimInput(camera, renderer.domElement);
  addEventListener('keydown', e => { if (e.code === 'KeyM') showMainMenu(); });   // menu nell'anteprima
  sim.base.set(0, 1.65, 0);
  player.sim = sim; window.sim = sim;
  applyMode();
  resetRound();
  addEventListener('keydown', e => {
    if (e.code !== 'KeyV') return;
    sim.spectator = !sim.spectator;
    if (sim.spectator) {
      orbit = new OrbitControls(camera, renderer.domElement);
      camera.position.set(2.4, 1.9, 0.6); orbit.target.set(0, 1.2, -0.6);
    } else { orbit.dispose(); orbit = null; }
  });
}
$('sim').onclick = startSim;

// livello scelto nella pagina iniziale (ricordato per la volta dopo)
function showLevel() {
  for (const b of document.querySelectorAll('#levels button')) b.classList.toggle('on', b.dataset.level === level);
}
for (const b of document.querySelectorAll('#levels button')) b.onclick = () => {
  level = b.dataset.level;
  try { localStorage.setItem('hb-level', level); } catch (e) {}
  if (mike) mike.setLevel(level);
  showLevel();
};
showLevel();

function showMode() {
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === mode);
  $('enter').textContent = 'Gioca';
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => {
  mode = b.dataset.mode;
  try { localStorage.setItem('hb-mode', mode); } catch (e) {}
  showMode();
  if (sim) applyMode();
};
showMode();
