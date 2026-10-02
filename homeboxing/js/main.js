// Home Boxing - avvio, realta' mista, round e punteggi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRing, RING_SIZE } from './ring.js';
import { Mike, LEVELS, loadMikeGLTF } from './mike.js';
import { Sweat, Bruises } from './fx.js';
import { Player, SimInput } from './player.js';
import { Scoreboard, HitFlash } from './hud.js';
import { Room } from './room.js';
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

scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 1.1));
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
let level = 'normale';
try { level = localStorage.getItem('hb-level') || 'normale'; } catch (e) {}
if (!LEVELS[level]) level = 'normale';
const READY_S = 6;                    // secondi prima del gong

const player = new Player(renderer, scene, camera);
const flash = new HitFlash(camera);

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
  const fit = room.fitRing(headPos, yaw, RING_SIZE, PLAYER_Z);
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

// ---------------------------------------------------------------- round e punteggi
const game = {
  round: 1, time: 180, phase: 'ready', phaseT: 0,
  player: { points: 0, hits: 0, blocks: 0, dodges: 0 },
  mike: { points: 0, hits: 0, blocks: 0, dodges: 0 },
  message: '',
};
function resetRound() {
  game.time = 180; game.phase = 'ready'; game.phaseT = 0;
  for (const k of ['player', 'mike']) Object.assign(game[k], { points: 0, hits: 0, blocks: 0, dodges: 0 });
  game.message = 'Pronti…';
  if (mike) mike.enabled = false;
}
resetRound();

function handleEvents() {
  for (const e of mike.events) {
    (window.evlog ||= []).push(`${game.time.toFixed(1)} ${e.type} ${e.zone || e.name || ''} ${e.why || ''}`);
    switch (e.type) {
      case 'playerHit': {
        const pts = e.zone === 'head' ? 2 : 1;
        game.player.points += pts; game.player.hits++;
        game.message = e.zone === 'head' ? 'Colpo alla testa! +2' : 'Colpo al corpo +1';
        sfx.punchHit(Math.min(1.3, 0.6 + e.speed / 6)); sfx.crowd(0.08);
        bruises.hit(e.zone, e.lx, e.ly, Math.min(1.6, e.speed / 4));
        {
          // qualche gocciolina rossa: solo nei colpi al viso molto forti o quando Mike e' gia' molto segnato
          const hurt = bruises.worst();
          const strong = e.speed > 5.5 && Math.random() < 0.45;                 // colpo molto forte
          const worn = hurt > 0.6 && Math.random() < 0.2 + (hurt - 0.6) * 1.5;  // gia' molto segnato
          const blood = e.zone === 'head' && (strong || worn) ? 1 + Math.floor(Math.random() * (1 + hurt * 3)) : 0;
          sweat.burst(e.point, e.dir, Math.min(1.5, e.speed / 4), blood);
        }
        player.pulse(e.side, 1.0, 70);
        break;
      }
      case 'mikeBlocked':
        game.mike.blocks++; game.message = 'Mike para';
        sfx.punchBlock(); player.pulse(e.side, 0.4, 40);
        break;
      case 'mikeDodged':
        game.mike.dodges++; game.message = 'Mike schiva';
        break;
      case 'mikeThrows':
        sfx.whoosh();
        break;
      case 'mikeHit':
        game.mike.points += 2; game.mike.hits++;
        game.message = 'Mike ti colpisce!';
        sfx.punchHit(1.2); flash.hit(1);
        player.pulse('left', 0.7, 90); player.pulse('right', 0.7, 90);
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
  if (game.phase === 'ready') {
    const left = Math.ceil(READY_S - game.phaseT);
    game.message = left > 0 ? `Si comincia tra ${left}…` : 'BOX!';
    if (left > 0 && floorSource !== 'stanza' && floorSource !== 'mano') game.message = `Ring basso? Accovacciati e tieni una mano a terra 2 s · ${left}`;
    if (game.phaseT >= READY_S) { game.phase = 'fight'; game.phaseT = 0; sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; }
  } else if (game.phase === 'fight') {
    game.time = Math.max(0, game.time - dt);
    if (game.time === 0) {
      game.phase = 'end'; game.phaseT = 0; sfx.bell(3); mike.enabled = false;
      const a = game.player.points, b = game.mike.points;
      game.message = a > b ? 'Hai vinto il round!' : a < b ? 'Round a Mike' : 'Pareggio';
    }
  } else if (game.phase === 'end') {
    if (game.phaseT > 10) { game.round++; resetRound(); }
    else if (game.phaseT > 4) game.message = `Nuovo round tra ${Math.ceil(10 - game.phaseT)} s`;
  }
  const xr = renderer.xr.getSession && renderer.xr.getSession();
  const feats = xr && xr.enabledFeatures ? (xr.enabledFeatures.includes('plane-detection') ? 'piani sì' : 'piani no') : '';
  board.draw({ round: game.round, level: LEVELS[level].label, time: game.time, running: game.phase === 'fight',
    player: game.player, mike: game.mike, message: game.message,
    diag: `ring ${ringSize.toFixed(1)} m · pavimento: ${floorSource} · occhi a ${(player.head.y + 0.06 - floorY).toFixed(1)} m da terra ${feats ? '· ' + feats : ''}` +
 '' });
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
  // regolazione a mano con la levetta di un controller (su/giu')
  if (renderer.xr.isPresenting) for (const src of player.sources) {
    const ax = src.gamepad && src.gamepad.axes;
    if (ax && ax.length >= 4 && Math.abs(ax[3]) > 0.5) setFloor(floorY - ax[3] * dt * 0.3, 'manuale');
  }
  if (renderer.xr.isPresenting) xrFrames++;
  if (orbit) orbit.update();
  player.update(dt);
  if (renderer.xr.isPresenting || sim) calibrateByHand(dt);
  if (mike) {
    mike.update(dt, player);
    handleEvents();
    updateGame(dt);
  }
  flash.update(dt);
  sweat.update(dt);
  player.endFrame();
  renderer.render(scene, camera);
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
  bruises = new Bruises(mike.model);
  mike.bounds = keepInRing;
  placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  window.mike = mike; window.game = game; window.player = player; window.room = room; window.placeArena = placeArena; window.camera = camera; window.renderOnly = () => renderer.render(scene, camera); window.bruisesFx = () => bruises; window.sweatFx = sweat;   // per le prove
  status('');
  $('enter').disabled = !navigator.xr;
  if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (!ok) { $('enter').disabled = true; status('Questo browser non supporta la realtà mista: usa il browser del Quest 3.'); }
  });
  if (new URLSearchParams(location.search).has('sim')) startSim();
}).catch(e => { console.error(e); status('Errore nel caricamento di Mike: ' + e.message); });

$('enter').onclick = async () => {
  sfx.initAudio();
  try {
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'anchors'],
    });
    renderer.xr.setFoveation(1);
    await renderer.xr.setSession(session);
    if (bruises) bruises.reset();
    placed = false; xrFrames = 0; floorSource = 'visore'; floorY = 0; roomCaptureAsked = false; headMax = 0;
    resetRound();
    $('overlay').hidden = true;
    session.addEventListener('end', () => { $('overlay').hidden = false; placed = false; });
  } catch (e) { status('Impossibile entrare in realtà mista: ' + e.message); }
};

function startSim() {
  sfx.initAudio();
  $('overlay').hidden = true; $('simhelp').hidden = false;
  sim = new SimInput(camera, renderer.domElement);
  sim.base.set(0, 1.65, 0);
  player.sim = sim; window.sim = sim;
  scene.background = new THREE.Color(0x2a2c31);
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
