// Home Boxing - avvio, realta' mista, round e punteggi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRing, RING_SIZE } from './ring.js?v=20261004202924';
import { Mike, LEVELS, loadMikeGLTF } from './mike.js?v=20261004202924';
import { Sweat, Bruises, Celebration } from './fx.js?v=20261004202924';
import { Player, SimInput } from './player.js?v=20261004202924';
import { Scoreboard, HitFlash, PauseMenu, MenuPanel, CountdownHUD, RayPointers, setRays } from './hud.js?v=20261004202924';
import { Room } from './room.js?v=20261004202924';
import { Arena } from './arena.js?v=20261004202924';
import { Beach } from './beach.js?v=20261004202924';
import { Rooftop } from './rooftop.js?v=20261004202924';
import { Desert } from './desert.js?v=20261004202924';
import { Snow } from './snow.js?v=20261004202924';
import { Volcano } from './volcano.js?v=20261004202924';
import { Gym } from './gym.js?v=20261004202924';
import { BagTraining } from './training.js?v=20261004202924';
import { RopeTraining } from './rope.js?v=20261004202924';
import { SpeedBagTraining } from './speedbag.js?v=20261004202924';
import { DoubleEndTraining } from './doubleend.js?v=20261004202924';
import { Sparring } from './sparring.js?v=20261004202924';
import { RingGirl } from './ringgirl.js?v=20261004202924';
import { REST_S, knockdownChance, say, sayCount, GetUpChallenge } from './match.js?v=20261004202924';
import * as sfx from './sfx.js?v=20261004202924';
import { t, lang, setLang, onLang, setOpponentName } from './i18n.js?v=20261004202924';
import { FIGHTERS, FIGHTER_IDS } from './fighters.js?v=20261004202924';
import { Tournament, BracketView } from './tournament.js?v=20261004202924';
import { CpuMatch } from './cpu_match.js?v=20261004202924';
import { TowerView } from './tower.js?v=20261004202924';
sfx.setVoiceLang(lang);

const $ = id => document.getElementById(id);
const status = t => { $('status').textContent = t; statusK = null; };
let statusK = null, statusV = null;            // ultimo messaggio tradotto: si riscrive al cambio lingua
const statusT = (k, v) => { status(t(k, v)); statusK = k; statusV = v; };

// ---------------------------------------------------------------- scena
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;           // (lo scorpione del deserto tagliato a filo della sabbia)
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
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = roomEnv;
scene.environmentIntensity = 0.7;

const hemi = new THREE.HemisphereLight(0xffffff, 0x404048, 1.1);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
key.position.set(1.2, 3.5, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 8 });
key.shadow.bias = -0.0005;
// luce di riempimento dal punto di vista del giocatore (come le luci TV a bordo ring): illumina gambe e viso di Mike
const fill = new THREE.DirectionalLight(0xfff4ea, 0.4);
fill.position.set(0, 0.3, 0.5); fill.target.position.set(0, -0.6, -3);
camera.add(fill); camera.add(fill.target);

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
let snowEnv = null, volcEnv = null;               // stage neve (creato in applyMode; qui perche' setRing lo usa subito)
// Tabellone: parte al suo posto (dietro all'avversario, in alto a destra). Si sposta SOLO se esce dal campo
// visivo: allora gira piano attorno a te (stessa distanza e altezza) finche' rientra un po' dentro la vista, e li' resta.
const _bw = new THREE.Vector3();
function followBoard(dt) {
  if (!board.mesh.visible) return;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const yaw = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  const h = player.head, p = board.mesh.getWorldPosition(_bw);
  const dx = p.x - h.x, dz = p.z - h.z, D = Math.hypot(dx, dz);
  if (D < 0.3) return;
  const ang = Math.atan2(-dx, -dz);                           // direzione del tabellone (come lo yaw della vista)
  const off = Math.atan2(Math.sin(ang - yaw), Math.cos(ang - yaw));
  if (!boardMoving && Math.abs(off) > 0.75) {                 // non si vede piu' (bordo della vista del visore)
    boardMoving = true; boardTarget = Math.sign(off) * 0.4;   // rientra dal lato da cui era uscito, non al centro
  }
  let vWant = 0;
  if (boardMoving) {
    const rem = Math.atan2(Math.sin(yaw + boardTarget - ang), Math.cos(yaw + boardTarget - ang));
    vWant = Math.sign(rem) * Math.min(0.35, Math.max(0.06, Math.abs(rem) * 0.6));     // lento: al massimo 0,35 rad/s
    if (Math.abs(rem) < 0.03) { boardMoving = false; vWant = 0; boardVel = 0; }
  }
  boardVel += Math.max(-0.5 * dt, Math.min(0.5 * dt, vWant - boardVel));             // parte e si ferma dolcemente
  if (Math.abs(boardVel) < 1e-4) return;
  const a = ang + boardVel * dt;
  _bw.set(h.x - Math.sin(a) * D, p.y, h.z - Math.cos(a) * D);
  board.mesh.position.copy(arena.worldToLocal(_bw.clone()));
  board.mesh.lookAt(h.x, p.y - 0.25, h.z);
}
// Fuori dal ring (in tutto, non solo con la testa oltre le corde): pausa finche' non rientri
function outOfRing() {
  const active = ['ready', 'fight', 'presentazione', 'rest', 'sparring'].includes(game.phase);
  if (!active || !ringSize) return;
  const p = arena.worldToLocal(player.head.clone()), half = ringSize / 2;
  const out = Math.abs(p.x) > half + 0.15 || Math.abs(p.z) > half + 0.15;
  const back = Math.abs(p.x) < half - 0.1 && Math.abs(p.z) < half - 0.1;
  if (out && !game.paused && !pause.group.visible) { openPause(); game.outRing = true; }
  else if (back && game.paused && game.outRing) closePause();
}
let boardMoving = false, boardVel = 0, boardTarget = 0;
function setRing(size, pz) {
  playerZ = pz;
  if (Math.abs(size - ringSize) > 1e-3) {
    if (ringObj) arena.remove(ringObj);
    ringObj = buildRing(size); arena.add(ringObj); ringSize = size;
    if (snowEnv) snowEnv.setRing(size);
  }
  arena.updateMatrixWorld(true);
  resetBoard();
}
// tabellone al suo posto: dietro all'avversario, in alto a destra (all'inizio di ogni incontro)
function resetBoard() {
  arena.updateMatrixWorld(true);
  board.mesh.position.set(Math.min(1.15, ringSize / 2 - 0.2), 1.95, -ringSize / 2 - 0.1);
  board.mesh.lookAt(new THREE.Vector3(0, 1.6, playerZ).applyMatrix4(arena.matrix));
  boardMoving = false; boardVel = 0;
}
setRing(RING_SIZE, PLAYER_Z);
const room = new Room(scene);
const sweat = new Sweat(scene);
let bruises = null;
// round per incontro (dal menu: 1, 3, 6 o 12; di base 3)
let rounds = 3;
// durata dei round (dal menu: 1, 2 o 3 minuti; di base 3)
let roundSecs = 180;
try { roundSecs = parseInt(localStorage.getItem('hb-roundsec')) || 180; } catch (e) {}
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
// dove si gioca: 'stanza' = realta' mista nella tua stanza, 'arena' = palazzetto virtuale con il pubblico,
// 'spiaggia' = ring sulla sabbia in riva al mare
const MODES = ['stanza', 'arena', 'spiaggia', 'grattacielo', 'deserto', 'neve', 'vulcano', 'palestra'];
let mode = 'stanza';
try { mode = localStorage.getItem('hb-mode') || 'stanza'; } catch (e) {}
// stage scelto nel menu: uno dei tre oppure 'random' (estratto a ogni incontro tra gli stage virtuali)
let stageChoice = mode;
try { stageChoice = localStorage.getItem('hb-stage') || mode; } catch (e) {}
let gameMode = 'arcade';
try { gameMode = localStorage.getItem('hb-gamemode') || 'arcade'; } catch (e) {}
let tour = null;                      // torneo in corso

if (!MODES.includes(mode)) mode = 'stanza';
let arenaEnv = null, beachEnv = null, roofEnv = null, desertEnv = null, gymEnv = null;
function applyMode() {
  const inArena = mode === 'arena', onBeach = mode === 'spiaggia', onRoof = mode === 'grattacielo';
  if (onRoof && !roofEnv) { roofEnv = new Rooftop(RING_SIZE); arena.add(roofEnv.group); }
  if (roofEnv) roofEnv.group.visible = onRoof;
  const onDesert = mode === 'deserto', inGym = mode === 'palestra';
  if (inGym && !gymEnv) { gymEnv = new Gym(); arena.add(gymEnv.group); }
  if (gymEnv) gymEnv.group.visible = inGym;
  if (onDesert && !desertEnv) { desertEnv = new Desert(); arena.add(desertEnv.group); }
  if (desertEnv) desertEnv.group.visible = onDesert;
  const onSnow = mode === 'neve';
  if (onSnow && !snowEnv) { snowEnv = new Snow(ringSize || RING_SIZE); arena.add(snowEnv.group); }
  if (snowEnv) snowEnv.group.visible = onSnow;
  const onVolc = mode === 'vulcano';
  if (onVolc && !volcEnv) { volcEnv = new Volcano(); arena.add(volcEnv.group); }
  if (volcEnv) volcEnv.group.visible = onVolc;
  if (inArena && !arenaEnv) { arenaEnv = new Arena(RING_SIZE); arena.add(arenaEnv.group); }
  if (onBeach && !beachEnv) { beachEnv = new Beach(); arena.add(beachEnv.group); }
  if (arenaEnv) arenaEnv.group.visible = inArena;
  if (beachEnv) beachEnv.group.visible = onBeach;
  room.group.visible = mode === 'stanza';
  if (inGym) {                                         // palestra la sera: luci calde e soffuse dall'alto, sala in penombra
    scene.environment = roomEnv; scene.environmentRotation.set(0, 0, 0);
    hemi.color.set(0xffe2c0); hemi.groundColor.set(0x2a2018); hemi.intensity = 0.35;
    scene.environmentIntensity = 0.3; key.intensity = 1.8; fill.intensity = 0.35;
    key.color.set(0xffd9a8); key.position.set(0.8, 4.0, 0.9);
    scene.background = new THREE.Color(0x0b0a0c); scene.fog = null;
    camera.far = 60;
  } else if (onVolc) {                                       // vulcano: luce bassa e rossa della lava, cielo di cenere
    hemi.color.set(0x5a3326); hemi.groundColor.set(0xff6a2a); hemi.intensity = 0.7;   // (dal basso arriva la luce della lava)
    scene.environmentIntensity = 0.45; key.intensity = 1.6; fill.intensity = 0.25;
    key.color.set(0xff8a4a); key.position.copy(volcEnv.keyDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x1a0f0c); scene.fog = null;
    const useSky = () => {
      if (!volcEnv.envMap) volcEnv.envMap = pmrem.fromEquirectangular(volcEnv.skyTex).texture;
      if (mode === 'vulcano') { scene.environment = volcEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (volcEnv.skyLoaded) useSky(); else volcEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onSnow) {                                       // cielo coperto d'inverno: luce morbida e fredda da tutte le parti
    hemi.color.set(0xdfe8f5); hemi.groundColor.set(0xc8d0dc); hemi.intensity = 1.0;
    scene.environmentIntensity = 0.8; key.intensity = 1.2; fill.intensity = 0.5;
    key.color.set(0xf2f4ff); key.position.copy(snowEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0xc5ccd6); scene.fog = null;
    const useSky = () => {
      if (!snowEnv.envMap) snowEnv.envMap = pmrem.fromEquirectangular(snowEnv.skyTex).texture;
      if (mode === 'neve') { scene.environment = snowEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (snowEnv.skyLoaded) useSky(); else snowEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onDesert) {                                      // deserto vero a mezzogiorno: sole alto e forte, cielo blu intenso
    hemi.color.set(0x8fb0f0); hemi.groundColor.set(0xb8865a); hemi.intensity = 0.8;
    scene.environmentIntensity = 0.75; key.intensity = 3.0; fill.intensity = 0.45;
    key.color.set(0xfff4e2); key.position.copy(desertEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x3a63b0); scene.fog = null;
    const useSky = () => {
      if (!desertEnv.envMap) desertEnv.envMap = pmrem.fromEquirectangular(desertEnv.skyTex).texture;
      if (mode === 'deserto') { scene.environment = desertEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (desertEnv.skyLoaded) useSky(); else desertEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onRoof) {                                 // in cima al grattacielo, bella giornata: sole alto, cielo blu
    hemi.color.set(0xbcd4f2); hemi.groundColor.set(0x7d7a74); hemi.intensity = 0.85;
    scene.environmentIntensity = 0.75; key.intensity = 2.7; fill.intensity = 0.45;
    key.color.set(0xfff4e4); key.position.copy(roofEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x8fb0dc); scene.fog = null;
    const useSky = () => {
      if (!roofEnv.envMap) roofEnv.envMap = pmrem.fromEquirectangular(roofEnv.skyTex).texture;
      if (mode === 'grattacielo') { scene.environment = roofEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (roofEnv.skyLoaded) useSky(); else roofEnv.onSkyLoad = useSky;
    camera.far = 1200;                                 // la citta' tutto intorno e l'elicottero lontano
  } else if (onBeach) {                                // pieno giorno: sole alto dietro di te, cielo azzurro
    hemi.color.set(0xbfe0ff); hemi.groundColor.set(0xb89a68); hemi.intensity = 0.8;
    scene.environmentIntensity = 0.6; key.intensity = 2.3; fill.intensity = 0.4;
    key.color.set(0xfff0d8); key.position.copy(beachEnv.sunDir).multiplyScalar(6);   // il sole della foto
    scene.background = new THREE.Color(0xa9c9e6); scene.fog = null;
    // riflessi e luce d'ambiente dal panorama vero (appena l'immagine e' caricata)
    const useSky = () => {
      if (!beachEnv.envMap) beachEnv.envMap = pmrem.fromEquirectangular(beachEnv.skyTex).texture;
      if (mode === 'spiaggia') { scene.environment = beachEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (beachEnv.skyLoaded) useSky(); else beachEnv.onSkyLoad = useSky;
    camera.far = 400;                                  // si vedono orizzonte, citta' e promontorio
  } else {
    scene.environment = roomEnv; scene.environmentRotation.set(0, 0, 0);
    hemi.color.set(0xffffff); hemi.groundColor.set(0x404048);
    hemi.intensity = inArena ? 0.2 : 1.1;
    scene.environmentIntensity = inArena ? 0.3 : 0.7;     // nel palazzetto il pubblico resta in penombra
    key.intensity = inArena ? 0.9 : 2.2; key.color.set(0xfff1e0); key.position.set(1.2, 3.5, 1.5);
    fill.intensity = inArena ? 1.5 : 0.5;
    scene.background = inArena ? new THREE.Color(0x05060a) : (sim ? new THREE.Color(0x2a2c31) : null);
    scene.fog = inArena ? new THREE.Fog(0x05060a, 9, 26) : null;
    camera.far = 60;
  }
  camera.updateProjectionMatrix();
  sfx.crowdAmbient(inArena);
  sfx.seaAmbient(onBeach);
  sfx.windAmbient(onRoof || onDesert);
  sfx.snowAmbient(onSnow);
  sfx.lavaAmbient(onVolc);
}
const READY_S = 6;                    // secondi prima del gong

const player = new Player(renderer, scene, camera);
const flash = new HitFlash(camera);
const pause = new PauseMenu();
const rayPointers = new RayPointers(scene);
const _rayM = new THREE.Matrix4();
scene.add(pause.group);
// menu principale dentro il gioco (stanza o arena, livello, inizia, esci)
// anteprime degli stage nel menu: foto del gioco per arena e spiaggia, un disegno per la stanza
function roomPreview() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, 320, 120);                       // parete
  g.fillStyle = '#9b7a55'; g.fillRect(0, 120, 320, 80);                      // parquet
  g.strokeStyle = 'rgba(60,40,20,0.35)';
  for (let x = -200; x < 520; x += 28) { g.beginPath(); g.moveTo(160 + (x - 160) * 0.5, 120); g.lineTo(x, 200); g.stroke(); }
  g.fillStyle = '#8fc3e8'; g.fillRect(28, 22, 70, 60); g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(28, 22, 70, 60);   // finestra
  g.beginPath(); g.moveTo(63, 22); g.lineTo(63, 82); g.stroke();
  g.fillStyle = '#4b5d78'; g.fillRect(222, 78, 86, 34); g.fillRect(218, 64, 94, 20);   // divano
  g.fillStyle = '#1e66c9'; g.fillRect(70, 132, 180, 46);                           // ring
  g.strokeStyle = '#e8412c'; g.lineWidth = 4; g.strokeRect(70, 108, 180, 34);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(70, 118, 180, 24);
  g.fillStyle = '#eeeeee'; for (const x of [70, 250]) g.fillRect(x - 4, 100, 8, 70);
  // bollino "AR" (realta' aumentata: vedi la tua casa vera) nell'angolo in alto a destra
  g.fillStyle = '#ffd34d'; g.beginPath(); g.roundRect(244, 10, 66, 40, 9); g.fill();
  g.fillStyle = '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 30px system-ui, sans-serif'; g.fillText('AR', 277, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stageImg = n => { const t = new THREE.TextureLoader().load(`assets/stage_${n}.webp?v=20261004202924`); t.colorSpace = THREE.SRGBColorSpace; return t; };
const fighterImg = id => { const tx = new THREE.TextureLoader().load(FIGHTERS[id].thumb); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
// anteprima di "Arena random": gli stage virtuali con un grande punto di domanda
function randomPreview() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 320, 200); gr.addColorStop(0, '#1b2a4a'); gr.addColorStop(0.5, '#2a7fb5'); gr.addColorStop(1, '#d9b46a');
  g.fillStyle = gr; g.fillRect(0, 0, 320, 200);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 320, 200);
  g.fillStyle = '#ffd34d'; g.font = '900 150px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('?', 160, 108);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const withText = rows => rows.map(r => ({ ...r, buttons: r.buttons.map(b => ({ ...b, text: b.tk ? t(b.tk) + (b.disabled ? ' (' + t('soon') + ')' : '') : b.text })) }));
const stageRow = y => ({ label: t('stage'), tk: 'stage', y, h: 0.2, carousel: true, buttons: [
  { id: 's:stanza', tk: 'm_stanza', w: 0.22, img: roomPreview() }, { id: 's:arena', tk: 'm_arena', w: 0.22, img: stageImg('arena') },
  { id: 's:spiaggia', tk: 'm_spiaggia', w: 0.22, img: stageImg('spiaggia') },
  { id: 's:grattacielo', tk: 'm_grattacielo', w: 0.22, img: stageImg('grattacielo') },
  { id: 's:deserto', tk: 'm_deserto', w: 0.22, img: stageImg('deserto') }, { id: 's:neve', tk: 'm_neve', w: 0.22, img: stageImg('neve') }, { id: 's:vulcano', tk: 'm_vulcano', w: 0.22, img: stageImg('vulcano') }, { id: 's:palestra', tk: 'm_palestra', w: 0.22, img: stageImg('palestra') }, { id: 's:random', tk: 'm_random', w: 0.22, img: randomPreview() }] });
const optionRows = y0 => [
  { label: t('level'), tk: 'level', y: y0, buttons: [{ id: 'l:facile', tk: 'l_facile', w: 0.205 }, { id: 'l:normale', tk: 'l_normale', w: 0.205 },
    { id: 'l:difficile', tk: 'l_difficile', w: 0.205 }, { id: 'l:impossibile', tk: 'l_impossibile', w: 0.205 }] },
  { label: t('rounds'), tk: 'rounds', y: y0 - 0.16, buttons: [{ id: 'r:1', text: '1', w: 0.15 }, { id: 'r:3', text: '3', w: 0.15 }, { id: 'r:6', text: '6', w: 0.15 }, { id: 'r:12', text: '12', w: 0.15 }] },
  { label: t('duration'), tk: 'duration', y: y0 - 0.32, buttons: [{ id: 'd:60', text: '1 min', w: 0.2 }, { id: 'd:120', text: '2 min', w: 0.2 }, { id: 'd:180', text: '3 min', w: 0.2 }] },
  { label: t('rule3'), tk: 'rule3', y: y0 - 0.48, buttons: [{ id: 'k:si', tk: 'yes', w: 0.2 }, { id: 'k:no', tk: 'no', w: 0.2 }] },
];
// menu iniziale: modalita' di gioco, regole generali, lingua
const rootMenu = new MenuPanel({ title: 'HOME BOXING', titleH: 0.1, width: 1.0, height: 0.86, draggable: true, rows: withText([
  { label: t('mode_title'), tk: 'mode_title', y: 0.15, h: 0.12, buttons: [{ id: 'gm:arcade', tk: 'm_arcade', w: 0.22, color: 0x1f6f8a },
    { id: 'gm:training', tk: 'm_training', w: 0.22, color: 0x8a3a1a }, { id: 'gm:tour', tk: 'm_tour', w: 0.22, color: 0x7a5a10 },
    { id: 'gm:surv', tk: 'm_surv', w: 0.22, color: 0x6a1f8a }] },
  { label: t('language'), tk: 'language', y: -0.02, buttons: [{ id: 'g:it', text: 'Italiano', w: 0.26 }, { id: 'g:en', text: 'English', w: 0.26 }] },
  // con quale mano si punta nei menu (con tutte e due si facevano scelte per sbaglio)
  { label: t('pointer'), tk: 'pointer', y: -0.225, h: 0.09, buttons: [{ id: 'pt:left', tk: 'pt_left', w: 0.22 }, { id: 'pt:right', tk: 'pt_right', w: 0.22 }, { id: 'pt:both', tk: 'pt_both', w: 0.22 }] },
  // esci: piccolo, in basso a sinistra (lontano dalle scelte)
  { y: -0.36, h: 0.065, x: -0.47, buttons: [{ id: 'quit', tk: 'quit', w: 0.2, color: 0x8a1a20 }] },
]) });
// Arcade: stage, avversario e opzioni dell'incontro
// avversari a righe da 4 (pulsanti grandi); con piu' pugili le righe si aggiungono da sole e il pannello si allunga
const OPP_BTNS = [{ id: 'f:random', tk: 'f_random', w: 0.22, img: randomPreview() },
  ...FIGHTER_IDS.map(id => ({ id: 'f:' + id, text: FIGHTERS[id].name, w: 0.22, img: fighterImg(id) }))];
const OPP_ROWS = 1, OPP_EXTRA = 0;      // (una riga a scorrimento)
const arcadeMenu = new MenuPanel({ title: t('arcade'), titleTk: 'arcade', titleH: 0.1, width: 1.0, height: 1.52 + OPP_EXTRA, draggable: true, rows: withText([
  stageRow(0.48 + OPP_EXTRA / 2),
  { label: t('opponent'), tk: 'opponent', y: 0.22, h: 0.2, carousel: true, buttons: OPP_BTNS },
  ...optionRows(0.01 - OPP_EXTRA / 2),
  { y: -0.65 - OPP_EXTRA / 2, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'start', tk: 'start', w: 0.5, color: 0x1f8a4c }] },
]) });
// Torneo: come l'arcade ma gli avversari li assegna il tabellone
const tourMenu = new MenuPanel({ title: t('tour'), titleTk: 'tour', titleH: 0.1, width: 1.0, height: 1.32, draggable: true, rows: withText([
  stageRow(0.37),
  ...optionRows(0.12),
  { y: -0.54, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'start_tour', tk: 'start_tour', w: 0.5, color: 0x1f8a4c }] },
]) });
// Sopravvivenza: come il torneo (stage e opzioni), poi la torre con tutti gli avversari in ordine casuale
const survMenu = new MenuPanel({ title: t('surv'), titleTk: 'surv', titleH: 0.1, width: 1.0, height: 1.32, draggable: true, rows: withText([
  stageRow(0.37),
  ...optionRows(0.12),
  { y: -0.54, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'start_surv', tk: 'start_surv', w: 0.5, color: 0x6a1f8a }] },
]) });
// Allenamento: cosa fare in palestra
const trainMenu = new MenuPanel({ title: t('training'), titleTk: 'training', titleH: 0.1, width: 1.0, height: 0.98, draggable: true, rows: withText([
  { y: 0.1, h: 0.16, buttons: [{ id: 't:sacco', tk: 'tr_bag', w: 0.22, color: 0x8a1a20 }, { id: 't:speed', tk: 'tr_speed', w: 0.22, color: 0x8a5a1a },
    { id: 't:double', tk: 'tr_double', w: 0.22, color: 0x6a1f8a }, { id: 't:rope', tk: 'tr_rope', w: 0.22, color: 0x1f6f8a }] },
  { y: -0.1, h: 0.13, buttons: [{ id: 't:spar', tk: 'tr_spar', w: 0.46, color: 0x9a1418 }] },
  { y: -0.32, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }] },
]) });
// Sparring: libero oppure esercizio a scelta
const sparMenu = new MenuPanel({ title: t('sp_title'), titleTk: 'sp_title', titleH: 0.1, width: 1.0, height: 0.86, draggable: true, rows: withText([
  { y: 0.14, h: 0.14, buttons: [{ id: 'sp:libero', tk: 'sp_libero', w: 0.4, color: 0x9a1418 }] },
  { label: t('sp_choose'), tk: 'sp_choose', y: -0.1, h: 0.12, buttons: [{ id: 'sp:combo', tk: 'sp_combo', w: 0.3, color: 0x1f6f8a }, { id: 'sp:difesa', tk: 'sp_difesa', w: 0.3, color: 0x2e7a3a }] },
  { y: -0.33, h: 0.1, buttons: [{ id: 'back_train', tk: 'back', w: 0.3, color: 0x3a4254 }] },     // indietro: all'allenamento
]) });
// Difesa: tutto casuale, oppure scegli i colpi che il partner ti tira (uno alla volta, niente combinazioni)
const DEF_IDS = ['jab', 'cross', 'hook_l', 'hook_r', 'upper_l', 'upper_r', 'body'];
let defSel = new Set(['jab', 'cross']);
try { const v = JSON.parse(localStorage.getItem('hb-def-kinds') || 'null'); if (Array.isArray(v) && v.length) defSel = new Set(v.filter(k => DEF_IDS.includes(k))); } catch (e) {}
let defType = 'entrambi';                          // cosa alleni: para, schiva o entrambi
try { const v = localStorage.getItem('hb-def-type'); if (['para', 'schiva', 'entrambi'].includes(v)) defType = v; } catch (e) {}
const defMenu = new MenuPanel({ title: t('sp_difesa'), titleTk: 'sp_difesa', titleH: 0.1, width: 1.0, height: 1.2, draggable: true, rows: withText([
  { label: t('dm_type'), tk: 'dm_type', y: 0.33, h: 0.1, buttons: [{ id: 'dt:para', tk: 'dt_para', w: 0.22, color: 0x5a3a8a }, { id: 'dt:schiva', tk: 'dt_schiva', w: 0.22, color: 0x5a3a8a }, { id: 'dt:entrambi', tk: 'dt_entrambi', w: 0.22, color: 0x5a3a8a }] },
  { y: 0.16, h: 0.11, buttons: [{ id: 'dm:casuale', tk: 'dm_random', w: 0.6, color: 0x2e7a3a }] },
  { label: t('dm_pick'), tk: 'dm_pick', y: -0.05, h: 0.11, buttons: DEF_IDS.slice(0, 4).map(k => ({ id: 'dk:' + k, tk: 'dk_' + k, w: 0.21, color: 0x1f4f6f })) },
  { y: -0.2, h: 0.11, buttons: DEF_IDS.slice(4).map(k => ({ id: 'dk:' + k, tk: 'dk_' + k, w: 0.21, color: 0x1f4f6f })) },
  { y: -0.44, h: 0.11, buttons: [{ id: 'back_spar', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'dm:start', tk: 'dm_start', w: 0.42, color: 0x9a1418 }] },
]) });
const defSelect = () => defMenu.select([...[...defSel].map(k => 'dk:' + k), 'dt:' + defType]);
let lastTrainMenu = null;                          // per "Cambia allenamento": il menu da cui eri partito
const MENUS = [rootMenu, arcadeMenu, tourMenu, survMenu, trainMenu, sparMenu, defMenu];
for (const m of MENUS) { m.group.scale.setScalar(0.88); scene.add(m.group); }
const menuVisible = () => MENUS.some(m => m.group.visible) || bracket.group.visible || tower.group.visible || tourBtns.group.visible;
// tabellone del torneo e i suoi pulsanti (sotto il tabellone)
const bracket = new BracketView(scene, FIGHTERS);
const tower = new TowerView(scene, FIGHTERS);
let surv = null;          // sopravvivenza in corso: { order, idx, state, stages }
const tourBtns = new MenuPanel({ title: '', titleH: 0.03, width: 0.9, height: 0.16, rows: withText([
  { y: -0.01, h: 0.09, buttons: [{ id: 'tgo', tk: 'tr_fight', w: 0.45, color: 0x1f8a4c }, { id: 'tquit', tk: 'tr_quit', w: 0.36, color: 0x7a2a2a }] }]) });
scene.add(tourBtns.group);
// incontro CPU: pulsante piccolo per andare al risultato
const skipBtn = new MenuPanel({ title: '', titleH: 0.02, width: 0.3, height: 0.1, rows: withText([
  { y: -0.005, h: 0.06, buttons: [{ id: 'skip', tk: 'tr_skip', w: 0.25, color: 0x3a4254 }] }]) });
scene.add(skipBtn.group);
let prevButtons = false;

let mike = null;
// avversario scelto (nel codice resta "mike" = l'avversario)
let fighterId = 'bruce';
try { fighterId = localStorage.getItem('hb-fighter') || 'bruce'; } catch (e) {}
let oppChoice = fighterId;                  // avversario scelto in arcade: un pugile o 'random'
try { oppChoice = localStorage.getItem('hb-opp') || fighterId; } catch (e) {}
if (!FIGHTERS[fighterId]) fighterId = 'bruce';
setOpponentName(FIGHTERS[fighterId].name);
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
  const fit = mode !== 'stanza' ? null : room.fitRing(headPos, yaw, RING_SIZE, PLAYER_Z);
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

// Riallinea: ti rimette nel tuo angolo, girato verso l'avversario. Non si sposta il ring (Mike, tabellone, pubblico
// restano dove sono): si sposta il riferimento del visore. Serve quando togli e rimetti il visore (il Quest puo'
// cambiare il suo "centro") o quando ti ritrovi lontano dal ring. Nella stanza (realta' mista) invece si rimette il
// ring attorno a te, perche' deve restare allineato alla stanza vera.
let needRecenter = 0, recenterAlways = false, reopenPending = false, reopenWait = 0, lastHeadR = null;
const selHeld = new Map(), selPrev = new Map();
// mano del puntatore nei menu: 'left' (predefinita), 'right' o 'both'
let pointerHand = 'left';
try { const v = localStorage.getItem('hb-pointer'); if (['left', 'right', 'both'].includes(v)) pointerHand = v; } catch (e) {}     // grilletto / pizzico tenuto, per sorgente (mano o controller)
function recenterPlayer() {
  if (!renderer.xr.isPresenting || intro) return;
  const cam = renderer.xr.getCamera();
  const H = new THREE.Vector3(); cam.getWorldPosition(H);
  const yaw = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  if (mode === 'stanza') { if (game.phase === 'menu') placeArena(H, yaw); return; }
  arena.updateMatrixWorld(true);
  const T = new THREE.Vector3(0, 0, playerZ).applyMatrix4(arena.matrixWorld); T.y = H.y;
  const R = new THREE.Matrix4().makeTranslation(T.x, T.y, T.z)
    .multiply(new THREE.Matrix4().makeRotationY(arena.rotation.y - yaw))
    .multiply(new THREE.Matrix4().makeTranslation(-H.x, -H.y, -H.z));
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  R.invert().decompose(p, q, sc);
  const ref = renderer.xr.getReferenceSpace();
  renderer.xr.setReferenceSpace(ref.getOffsetReferenceSpace(new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })));
  console.log('riallineato nel tuo angolo');
}
function headOutOfRing(margin = 0.15) {
  if (!ringSize) return false;
  const p = arena.worldToLocal(player.head.clone()), half = ringSize / 2;
  return Math.abs(p.x) > half + margin || Math.abs(p.z) > half + margin;
}

// ---------------------------------------------------------------- incontro: round, punti, danno, atterramenti
const POWER = { facile: 0.65, normale: 0.95, difficile: 1.3, impossibile: 1.8 };   // forza dei pugni di Mike
// Atterramenti: si va giu' solo a energia zero. Rialzandosi l'energia risale sempre meno; quando non ce n'e'
// piu' da recuperare si resta giu': KO. Con la "regola dei 3 KO" il terzo atterramento chiude l'incontro.
const KD_REFILL = [75, 50, 25];
const getUp = new GetUpChallenge(scene);
getUp.attachDark(camera);
const countdown = new CountdownHUD(camera);
const nextMenu = new MenuPanel({ title: t('next_title', { n: 2, s: 30 }), titleH: 0.045, titleW: 0.3, width: 0.38, height: 0.2, rows: [
  { y: -0.04, h: 0.06, buttons: [{ id: 'next', tk: 'next_btn', text: t('next_btn'), w: 0.29, color: 0x1f8a4c }] },
] });
scene.add(nextMenu.group);
// durante la presentazione dello speaker: conto alla rovescia e pulsante per iniziare subito
const introMenu = new MenuPanel({ title: t('intro_title', { s: 20 }), titleH: 0.045, titleW: 0.3, width: 0.38, height: 0.2, rows: [
  { y: -0.04, h: 0.06, buttons: [{ id: 'skip', tk: 'skip_intro', text: t('skip_intro'), w: 0.29, color: 0x1f8a4c }] },
] });
scene.add(introMenu.group);
const fighter = () => ({ points: 0, hits: 0, blocks: 0, dodges: 0, dmg: 0, kd: 0, kdRound: 0, penalties: 0 });
const game = {
  round: 1, time: roundSecs, phase: 'ready', phaseT: 0, paused: false,
  player: fighter(), mike: fighter(), message: '', kd: null, result: null, foul: null, fill: null,
};
let threeKO = true;
try { threeKO = localStorage.getItem('hb-3ko') !== 'no'; } catch (e) {}

function setPeople(v) {                      // nel menu il ring e' vuoto: niente Mike, niente pubblico
  if (mike) mike.root.visible = v;
  if (arenaEnv) arenaEnv.setPeople(v);
}
function newMatch() {
  game.round = 1; game.result = null; game.kd = null; game.foul = null; game.fill = null;
  game.player = fighter(); game.mike = fighter();
  if (bruises) bruises.reset();
  if (mike) { mike.resetPose(); mike.holdDist = null; }
  getUp.stop(); setPeople(true); resetBoard();
  startRound();
}
function startRound() {
  girl.stop(); stool.visible = false; nextMenu.close(); introMenu.close(); countdown.hide();
  if (mike) { mike.leaveCorner(); mike.applyRound(game.round); }    // l'avversario si stanca round dopo round
  game.time = roundSecs; game.phase = 'ready'; game.phaseT = 0; game.paused = false; game.kd = null; game.foul = null;
  game.announced = false; game.lastCount = 0; game.girlStarted = false;
  game.player.kdRound = 0; game.mike.kdRound = 0;
  game.message = t('round_of', { r: game.round, n: rounds });
  if (mike) mike.enabled = false;
}
const resetRound = newMatch;          // (nomi usati dal resto del codice)
newMatch();
game.phase = 'menu';            // finche' non scegli "Inizia incontro" non parte niente (anche fuori dal visore)

// un colpo a segno: danno; a energia zero si va giu'
function landed(who, zone, power) {
  const f = game[who];
  f.dmg = Math.min(100, f.dmg + (zone === 'head' ? 3.5 + 6 * power : 2 + 3.5 * power));
  if (game.kd || game.phase !== 'fight' || game.foul) return;
  if (f.dmg >= 100) knockdown(who, power);
}

function knockdown(who, power) {
  const f = game[who];
  f.kd++; f.kdRound++;
  // stanchezza da atterramenti: sale di 1 a ogni atterramento e cala col tempo (pause tra i round, minuti di combattimento)
  f.kdLvl = (f.kdLvl || 0) + 1;
  const lvl = Math.max(1, Math.round(f.kdLvl));
  mike.enabled = false;
  sfx.punchHit(1.4, who === 'mike');               // atterrato lui: il tuo colpo; atterrato tu: il suo
  sfx.voiceNow('knockdown');
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') sfx.cheer('boato', 1);
  // energia che si recupera rialzandosi: 75, 50, 25 (con la regola dei 3 atterramenti il terzo chiude l'incontro);
  // senza la regola ci si rialza finche' c'e' energia da recuperare: 15, 8, poi niente -> si resta giu' (KO). Vale per tutti e due.
  const refill = KD_REFILL[lvl - 1] ?? (threeKO ? 0 : [15, 8][lvl - 4] ?? 0);
  const kd = { who, count: 0, t: 0, up: false, refill, final: refill <= 0, tko: threeKO && f.kd >= 3 };
  if (who === 'mike') {
    mike.knockdown();
    kd.getUpAt = kd.final || kd.tko ? 99 : 4 + Math.floor(Math.random() * 5);      // si rialza tra il 4 e l'8
    game.message = t('mike_down');
  } else {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
    const n = 10 * lvl;                       // colpi per rialzarsi: 10 in piu' a ogni atterramento (meno se hai recuperato)
    if (!kd.final && !kd.tko) {
      getUp.start(n, 0.11, player.head, e.y);
      game.message = t('you_down_hit', { n });
    } else game.message = t('you_down_out');
    mike.holdDist = 1.7;                     // Mike va all'angolo neutro
  }
  if (kd.tko) game.message = t('third_kd', { who: t(who === 'mike' ? 'who_mike' : 'who_you') });
  game.kd = kd;
}

function updateKnockdown(dt) {
  const kd = game.kd, f = game[kd.who];
  kd.t += dt;
  if (kd.tko && kd.t > 1.5) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'TKO');
  if (kd.tko) return;
  const c = Math.floor(kd.t / 1.0);                     // conteggio: un numero al secondo
  if (c > kd.count && c <= 10) {
    kd.count = c;
    sfx.voiceNow('count_' + c);
    if (c <= 8) game.message = `${t(kd.who === 'mike' ? 'who_mike' : 'who_you')} ${t(kd.up ? 'is_up' : 'is_down')}… ${c}` + (kd.who === 'player' && !kd.up && !kd.final ? t('hit_button', { n: getUp.left }) : '');
  }
  if (kd.who === 'mike' && !kd.up && kd.count >= kd.getUpAt) { kd.up = true; mike.getUp(); }
  if (kd.who === 'player' && !kd.up && !kd.final && getUp.update(dt, Object.values(player.gloves))) {
    kd.up = true; game.message = t('up_after8');
  }
  if (!kd.up && kd.count >= 10) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'KO');
  // conteggio obbligatorio fino a 8, poi si riprende: l'energia risale (animazione sulla barra)
  if (kd.up && kd.count >= 8 && (kd.who === 'player' || mike.isUp())) {
    game.fill = { who: kd.who, from: f.dmg, to: 100 - kd.refill, t: 0 };
    game.kd = null; getUp.stop(); mike.holdDist = null;
    game.message = 'BOX!'; sfx.bell(1);
    mike.enabled = true;
  }
}

function endMatch(winner, how) {
  game.phase = 'end'; game.phaseT = 0; game.kd = null; game.foul = null;
  mike.enabled = false; getUp.stop(); mike.holdDist = null; countdown.hide(); nextMenu.close();
  sfx.bell(3);
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') { sfx.cheer('boato', 1); setTimeout(() => sfx.cheer('applauso', 0.9), 2500); }
  game.result = { winner, how };
  const pts = `${game.player.points}-${game.mike.points}`;
  game.message = winner === 'player' ? t('win_you', { how: t('how_' + how) }) : winner === 'mike' ? t('win_mike', { how: t('how_' + how) }) : t('draw', { pts });
  if (how === 'PTS' && winner !== 'pari') game.message += ` (${pts})`;
  if (winner === 'mike' && !mike.down) mike.celebrate();          // Mike esulta a braccia alzate
  // festa per il vincitore: coriandoli e fuochi d'artificio nei suoi colori
  const c = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  party.start(c, winner === 'player' ? [0xd81e2c, 0xff7a7a, 0xffffff] : winner === 'mike' ? [0x1d4fc4, 0x7aa8ff, 0xffffff] : [0xd81e2c, 0x1d4fc4]);
  sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
  // verdetto dell'annunciatore, come nei veri incontri
  const kind = how === 'KO' ? 'ko' : how === 'TKO' ? 'tko' : how === 'DQ' ? 'dq' : 'points';
  // verdetto: per l'avversario parte comune ("...dall'angolo blu...") e poi il suo nome
  const verdict = winner === 'player' ? [`win_you_${kind}`] : [`win_opp_${kind}`, 'name_' + fighterId];
  setTimeout(() => sfx.announce(winner === 'pari' ? ['scorecards', 'draw']
    : kind === 'points' ? ['scorecards', 'winner_intro', ...verdict]
    : kind === 'dq' ? verdict : ['winner_intro', ...verdict]), kind === 'dq' ? 2600 : 1800);
}

// colpo basso: niente punti, Mike si accascia; penalita' (alla terza squalifica); si riprende col gong
function lowBlow() {
  const p = ++game.player.penalties;
  game.mike.dmg = Math.min(99, game.mike.dmg + 10);
  sfx.punchHit(0.8);
  mike.lowBlowed();
  if (arenaEnv) arenaEnv.cheer(0.4);
  if (mode === 'arena') sfx.cheer('ooh', 1);
  if (p >= 3) {
    game.message = t('dq3');
    sfx.voiceNow('dq');
    game.foul = { t: 0, dq: true };
  } else {
    game.message = t('lowblow', { p });
    sfx.voiceNow('lowblow_' + p);
    game.foul = { t: 0 };
  }
}
function updateFoul(dt) {
  const f = game.foul;
  f.t += dt;
  // Mike prima si riprende e si rimette in guardia; con la terza penalita' poi gli danno la vittoria (ed esulta)
  if (f.t > 5.5 && !f.recovered) { f.recovered = true; mike.resetPose(); }
  if (f.dq) { if (f.t > 7) endMatch('mike', 'DQ'); return; }
  if (f.t > 7) { game.foul = null; sfx.announce('box'); sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; }
}

function handleEvents() {
  for (const e of mike.events) {
    (window.evlog ||= []).push(`${game.time.toFixed(1)} ${e.type} ${e.zone || e.name || ''} ${e.why || ''}`);
    switch (e.type) {
      case 'lowBlow':
        lowBlow();
        break;
      case 'playerHit': {
        const pts = e.zone === 'head' ? 2 : 1;
        game.player.points += pts; game.player.hits++;
        game.message = t(e.zone === 'head' ? 'you_head' : 'you_body');
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
        landed('mike', e.zone, Math.min(1.5, e.speed / 5) * (mike.cfg.toughness ?? 1));   // ai livelli alti incassa meno
        break;
      }
      case 'mikeBlocked':
        game.mike.blocks++; game.message = t('mike_blocks');
        if (mode === 'arena' && Math.random() < 0.35) sfx.cheer('ooh', 0.6);
        sfx.punchBlock(); player.pulse(e.side, 0.4, 40);
        break;
      case 'mikeDodged':
        game.mike.dodges++; game.message = t('mike_dodges');
        if (mode === 'arena' && Math.random() < 0.5) sfx.cheer('ooh', 0.7);
        break;
      case 'mikeThrows':
        sfx.whoosh();
        break;
      case 'mikeHit':
        game.mike.points += e.zone === 'body' ? 1 : 2; game.mike.hits++;
        game.message = t(e.zone === 'body' ? 'mike_body' : 'mike_head');
        sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2, false); flash.hit(e.zone === 'body' ? 0.5 : 1);
        if (arenaEnv) arenaEnv.cheer(0.6);
        if (mode === 'arena' && e.zone === 'head') sfx.cheer('boato', 0.6);
        player.pulse('left', 0.7, 90); player.pulse('right', 0.7, 90);
        landed('player', e.zone, powerNow() * ((mike.cfg0.mods && mike.cfg0.mods.power) || 1) * (0.85 + Math.random() * 0.3));
        break;
      case 'playerBlocked':
        game.player.blocks++; game.message = t('blocked');
        sfx.punchBlock(); player.pulse(e.side, 0.6, 50);
        break;
      case 'playerDodged':
        game.player.dodges++; game.message = t('dodged');
        break;
    }
  }
  mike.events.length = 0;
}

function startRest() {
  game.phase = 'rest'; game.phaseT = 0; countdown.hide();
  // Mike all'angolo sullo sgabello; la ragazza del ring entra quando lui e' seduto
  const h = ringSize / 2 - 0.42;
  const corner = new THREE.Vector3(h, 0, -h).applyMatrix4(arena.matrixWorld);
  const center = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  stool.position.copy(corner); stool.visible = true;
  mike.goTo(corner.clone().addScaledVector(center.clone().sub(corner).setY(0).normalize(), 0.12), center);
  if (mode === 'arena') sfx.cheer('applauso', 0.8);
  for (const k of ['player', 'mike']) { game[k].dmg = Math.max(0, game[k].dmg - 25); game[k].kdLvl = Math.max(0, (game[k].kdLvl || 0) - 0.5); }   // all'angolo ci si riprende
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  nextMenu.open(player.head, e.y, 0.5, 0.35);
}

function updateGame(dt) {
  game.phaseT += dt;
  mike.fatigue = game.mike.dmg / 100;
  mike.lowBlowAllowed = game.mike.dmg <= 50;           // il colpo basso "riesce" solo se Mike ha almeno meta' energia
  if (game.fill) {                                      // energia che risale dopo un atterramento
    game.fill.t += dt;
    const k = Math.min(1, game.fill.t / 1.8);
    game[game.fill.who].dmg = game.fill.from + (game.fill.to - game.fill.from) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) game.fill = null;
  }
  if (game.phase === 'menu') {
    game.message = t('choose_menu');
    flash.setBase(0);
  } else if (game.paused) {
    game.message = t(game.outRing ? 'out_ring' : 'pause');
  } else if (game.phase === 'presentazione') {
    game.message = t('presenting');
    // conto alla rovescia fino al gong del primo round (presentazione + preparazione)
    introMenu.setTitle(t('intro_title', { s: Math.max(0, Math.ceil(game.presT - game.phaseT + READY_S)) }));
    if (introMenu.update(dt, Object.values(player.gloves)) === 'skip') {     // si salta: subito "Round one… Fight!"
      sfx.punchBlock(); sfx.stopVoices(); introMenu.close();
      game.phase = 'ready'; game.phaseT = READY_S - 2.2;
    } else if (game.phaseT >= game.presT) { game.phase = 'ready'; game.phaseT = 0; introMenu.close(); }
  } else if (game.phase === 'ready') {
    const left = Math.ceil(READY_S - game.phaseT);
    game.message = left > 0 ? t('starts_in', { r: game.round, n: rounds, s: left }) : 'BOX!';
    if (left > 0 && renderer.xr.isPresenting && floorSource !== 'stanza' && floorSource !== 'mano') game.message = t('low_ring', { s: left });
    else if (left > 3 && game.round === 1) game.message = t('pause_hint', { s: left });
    if (!game.announced && game.phaseT >= READY_S - 1.6) {      // "Round one... Fight!" che finisce sul gong
      game.announced = true;
      sfx.announce(rounds > 1 && game.round === rounds ? 'final_round' : `round_${game.round}`);
    }
    if (game.phaseT >= READY_S) { game.phase = 'fight'; game.phaseT = 0; sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; countdown.hide(); }
  } else if (game.phase === 'fight') {
    if (game.kd) updateKnockdown(dt);
    else if (game.foul) updateFoul(dt);
    else {
      game.time = Math.max(0, game.time - dt);
      // ultimi 10 secondi: solo l'annuncio a voce "Ten seconds!" (niente numeri a schermo)
      if (game.time <= 10 && game.lastCount !== 10 && roundSecs > 15) { game.lastCount = 10; sfx.announce('ten_seconds'); }
      if (!game.fill) for (const k of ['player', 'mike']) game[k].dmg = Math.max(0, game[k].dmg - dt * 0.5);   // si riprende un po'
      for (const k of ['player', 'mike']) game[k].kdLvl = Math.max(0, (game[k].kdLvl || 0) - dt / 90);      // e smaltisce gli atterramenti
      flash.setBase(game.player.dmg > 55 ? (game.player.dmg - 55) / 45 * 0.35 : 0);         // vista che si annebbia
      if (game.time === 0) {
        sfx.bell(3); mike.enabled = false; countdown.hide();
        if (game.round >= rounds) {
          const a = game.player.points, b = game.mike.points;
          endMatch(a > b ? 'player' : a < b ? 'mike' : 'pari', 'PTS');
        } else startRest();
      }
    }
  } else if (game.phase === 'rest') {
    const left = Math.ceil(REST_S - game.phaseT);
    game.message = t('rest', { r: game.round + 1, s: left });
    nextMenu.setTitle(t('next_title', { n: game.round + 1, s: left }));
    flash.setBase(0);
    if (!game.girlStarted && mike.atGoal) { game.girlStarted = true; girl.start(arena, ringSize, game.round + 1, player.head); }
    if (nextMenu.update(dt, Object.values(player.gloves)) === 'next') { sfx.punchBlock(); game.phaseT = REST_S; }
    if (game.phaseT >= REST_S) { game.round++; startRound(); }
  } else if (game.phase === 'end') {
    flash.setBase(0);
    if (tour || surv) { if (game.phaseT > 6 && !sfx.voiceBusy()) { if (surv) showTowerAfter(); else showBracketAfter(); } return; }   // torneo/sopravvivenza: niente popup
    if (game.phaseT > 6 && !pause.group.visible && !sfx.voiceBusy()) openPause(true);   // dopo che lo speaker ha finito
  }
  const xr = renderer.xr.getSession && renderer.xr.getSession();
  const feats = xr && xr.enabledFeatures ? (xr.enabledFeatures.includes('plane-detection') ? 'piani sì' : 'piani no') : '';
  board.draw({ round: game.round, rounds: rounds, level: t('l_' + level), time: game.phase === 'rest' ? Math.max(0, REST_S - game.phaseT) : game.time,
    running: game.phase === 'fight', player: game.player, mike: game.mike, message: game.message,
    diag: t('diag', { m: ringSize.toFixed(1), f: floorSource, e: (player.head.y + 0.06 - floorY).toFixed(1) }) + (feats ? ' · ' + feats : '') });
}

// ---------------------------------------------------------------- ciclo
let lastT = performance.now();
let placed = false, xrFrames = 0, roomCaptureAsked = false, headMax = 0, greetPending = false;
const floorTouch = { left: 0, right: 0 };
renderer.setAnimationLoop((t, frame) => { if (window.pauseLoop) return; const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; tick(dt, frame); });
// ---------------------------------------------------------------- presentazione dei pugili (speaker)
// "Signore e signori, benvenuti… nell'angolo rosso, lo sfidante! … nell'angolo blu… MIKE!", poi il primo round.
function startPresentation() {
  if (arenaEnv) arenaEnv.setBanners([[t('bn_red'), t('bn_you')], [t('bn_go'), null], ['HOME BOXING', t(tour ? 'bn_tour' : surv ? 'bn_surv' : 'bn_champ')], ['KO!', null]]);
  const head = tour ? (tour.round === 0 ? ['tour_intro', 'tour_r0'] : ['tour_r' + tour.round]) : ['intro_1'];
  const parts = [...head, 'intro_red', 'intro_blue_g', FIGHTERS[fighterId].genericIntro ? 'intro_gen' : 'intro_' + fighterId, 'name_' + fighterId];
  const d = parts.map(n => sfx.voiceDur(n));
  if (d.some(x => !x)) return;                         // voci non ancora caricate: si parte e basta
  sfx.announce(parts);
  game.phase = 'presentazione'; game.phaseT = 0; game.presT = d.reduce((a, b) => a + b + 0.2, 0) + 0.8;
  game.message = t('presenting');
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  introMenu.open(player.head, e.y, 0.5, 0.35);
  // il pubblico applaude ai nomi
  const crowd = (ms, k, g) => setTimeout(() => { if (game.phase !== 'presentazione') return;
    if (mode === 'arena') { sfx.cheer(k, g); if (arenaEnv) arenaEnv.cheer(1.2); } }, ms);
  const upTo = n => d.slice(0, n).reduce((a, b) => a + b + 0.2, 0);
  crowd((upTo(head.length + 1) + 0.1) * 1000, 'applauso', 0.8);
  crowd((upTo(parts.length) + 0.5) * 1000, 'boato', 0.9);
}
// cambio lingua dal menu: scritte e voci
onLang(l => {
  sfx.setVoiceLang(l);
  for (const m of MENUS) m.relabel();
  skipBtn.relabel();
  nextMenu.relabel(); introMenu.relabel(); pause.relabel(); tourBtns.relabel();
  for (const m of MENUS) m.select(menuChoices());
  if (bracket.group.visible && bracket.T) bracket.draw();
  if (game.phase === 'menu') game.message = t('menu');
  showMode();
  if (statusK) statusT(statusK, statusV);
});

// ---------------------------------------------------------------- presentazione dell'incontro (arena e spiaggia)
// La vista parte in alto sopra il ring e scende facendo un giro completo attorno, fino al tuo angolo; solo allora
// compaiono i guantoni. Nel visore non si puo' muovere la testa: si sposta il riferimento della scena
// (spazio di riferimento con uno scostamento), cosi' sei tu a "volare" e il ring resta sempre davanti a te.
const INTRO_S = 11;
let intro = null, baseRef = null;
const _iR = new THREE.Matrix4(), _iT = new THREE.Matrix4(), _iRot = new THREE.Matrix4();
function startIntro() {
  if (mode === 'stanza' || !mike) return;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const H0 = new THREE.Vector3(); cam.getWorldPosition(H0);
  if (renderer.xr.isPresenting) baseRef = renderer.xr.getReferenceSpace();
  intro = { t: 0, H0, C: new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld), p0: camera.position.clone(), q0: camera.quaternion.clone() };
  game.phase = 'intro'; game.phaseT = 0; game.message = '';
  if (mode === 'arena') { sfx.cheer('applauso', 0.9); if (arenaEnv) arenaEnv.cheer(1); }
}
function introRig(t) {
  const k = Math.min(1, t / INTRO_S), e = k * k * k * (k * (k * 6 - 15) + 10);       // parte e arriva dolcemente
  const d = new THREE.Vector3(intro.H0.x - intro.C.x, 0, intro.H0.z - intro.C.z);
  const rEnd = d.length(); d.normalize();
  const rad = rEnd + (7 - rEnd) * Math.pow(1 - e, 1.2);       // da 7 m di distanza al tuo angolo
  const hgt = 8 * Math.pow(1 - e, 1.5);                       // da 8 m d'altezza ai tuoi occhi
  const phi = -2 * Math.PI * (1 - e);                         // un giro completo attorno al ring
  _iRot.makeRotationY(phi);
  const target = d.multiplyScalar(rad).applyMatrix4(_iRot).add(intro.C); target.y = intro.H0.y + hgt;
  return _iR.makeTranslation(target.x, target.y, target.z).multiply(_iRot)
    .multiply(_iT.makeTranslation(-intro.H0.x, -intro.H0.y, -intro.H0.z));
}
function updateIntro(dt) {
  intro.t += dt;
  const done = intro.t >= INTRO_S;
  const R = done ? _iR.identity() : introRig(intro.t);
  if (renderer.xr.isPresenting && baseRef) {
    if (done) renderer.xr.setReferenceSpace(baseRef);
    else {
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      R.clone().invert().decompose(p, q, s);
      renderer.xr.setReferenceSpace(baseRef.getOffsetReferenceSpace(
        new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })));
    }
  } else if (sim) {
    if (done) { camera.position.copy(intro.p0); camera.quaternion.copy(intro.q0); }
    else {
      camera.position.copy(intro.H0).applyMatrix4(R);
      camera.quaternion.copy(intro.q0).premultiply(new THREE.Quaternion().setFromRotationMatrix(R));
    }
    camera.updateMatrixWorld(true);
  }
  // durante il volo: niente guantoni e Mike guarda il punto dove sei davvero
  for (const g of Object.values(player.gloves)) g.mesh.visible = false;
  player.head.copy(intro.H0);
  if (done) { intro = null; game.phase = 'ready'; game.phaseT = 2; }
}

// per le prove senza visore: window.stepGame(n, dt) fa avanzare il gioco di n fotogrammi
window.stepGame = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt, null); };

// indicatore di caricamento (avversario, partner, stage): anello che gira davanti agli occhi
const loader = (() => {
  const G = new THREE.Group(); G.visible = false;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,10,14,0.75)'; g.beginPath(); g.roundRect(6, 6, 500, 116, 30); g.fill();
  g.fillStyle = '#ffd34d'; g.fillText(t('loading_short'), 256, 66);
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.08), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  txt.position.y = -0.1; txt.renderOrder = 1300; G.add(txt);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.062, 40, 1, 0, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = 1300; G.add(ring);
  return { G, ring };
})();
function loadingBusy() {
  if (fighterLoading || sparLoading) return true;
  const envs = [[desertEnv, 'deserto'], [roofEnv, 'grattacielo'], [snowEnv, 'neve'], [volcEnv, 'vulcano']];
  for (const [e, m] of envs) if (mode === m && e && !e.skyLoaded) return true;
  if (mode === 'palestra' && gymEnv && !gymEnv.loaded) return true;
  return false;
}
function updateLoader(dt) {
  const busy = loadingBusy();
  if (!loader.G.parent) scene.add(loader.G);
  loader.G.visible = busy;
  if (!busy) return;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const p = cam.getWorldPosition(new THREE.Vector3()), q = cam.getWorldQuaternion(new THREE.Quaternion());
  loader.G.position.copy(p).add(new THREE.Vector3(0, 0, -0.9).applyQuaternion(q)); loader.G.quaternion.copy(q);
  loader.ring.rotation.z -= dt * 5;
}

function tick(dt, frame) {
  updateLoader(dt);
  if (renderer.xr.isPresenting && !placed && xrFrames > 15) {   // aspetta che il tracciamento sia stabile
    const cam = renderer.xr.getCamera();
    const p = new THREE.Vector3(); cam.getWorldPosition(p);
    {
      const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
      placeArena(p, e.y); placed = true;
      if (game.phase === 'menu' && !menuVisible() && !tour && !surv && !fightStarting && !sparLoading) showMainMenu();   // (non mentre si carica il partner dello sparring)
    }
  }
  if (renderer.xr.isPresenting && frame && xrFrames % 30 === 0) {
    const y = detectFloor(frame);
    const userSet = floorSource === 'mano' || floorSource === 'manuale';
    if (y !== null && !userSet && (floorSource !== 'stanza' || Math.abs(y - floorY) > 0.02)) setFloor(y, 'stanza');
    // la pianta della stanza e' arrivata dopo: rimetti il ring della misura giusta
    // (solo nella stanza: nell'arena il ring non si adatta e rimetterlo a posto riportava Mike al punto di partenza)
    if (placed && !fitted && mode === 'stanza' && room.floorPoly && lastPlace && game.phase === 'menu') placeArena(lastPlace.head, lastPlace.yaw);
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
  if (renderer.xr.isPresenting && mode === 'stanza' && xrFrames % 300 === 0 && xrFrames > 600 &&
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
  if (needRecenter > 0 && renderer.xr.isPresenting && placed && --needRecenter === 0) {
    if (recenterAlways || headOutOfRing()) recenterPlayer();
    reopenWait = 0; reopenPending = true;           // visore tolto e rimesso: i menu aperti tornano davanti a te...
  }
  // ...ma solo quando la testa e' di nuovo a un'altezza credibile e ferma (subito dopo il visore puo' dare una
  // posizione a terra: il menu finiva sul pavimento)
  if (reopenPending && renderer.xr.isPresenting) {
    const hy = arena.worldToLocal(player.head.clone()).y, still = lastHeadR && player.head.distanceTo(lastHeadR) < 0.01;
    reopenWait = hy > 0.9 && still ? reopenWait + dt : 0;
    if (reopenWait > 0.4) { reopenPending = false; reopenMenus(); }
  }
  lastHeadR = (lastHeadR || new THREE.Vector3()).copy(player.head);
  if (orbit) orbit.update();
  player.update(dt);
  // puntatori: raggi da mani e controller quando c'e' il menu aperto (puntare = toccare col guantone)
  const menuOpen = menuVisible() || pause.group.visible || skipBtn.group.visible;   // (solo menu principale e pausa, non i pannellini dell'incontro)
  const rays = [];
  if (menuOpen && renderer.xr.isPresenting && frame) {
    const ref = renderer.xr.getReferenceSpace();
    for (const src of renderer.xr.getSession().inputSources) {
      if (pointerHand !== 'both' && src.handedness !== pointerHand) continue;   // solo la mano scelta
      if (!player.fist[src.handedness]) continue;                               // raggio solo a pugno chiuso / presa tenuta
      const pose = src.targetRaySpace && frame.getPose(src.targetRaySpace, ref);
      if (!pose) continue;
      const m = _rayM.fromArray(pose.transform.matrix);
      const sel = !!selHeld.get(src), click = sel && !selPrev.get(src);
      rays.push({ o: new THREE.Vector3().setFromMatrixPosition(m), d: new THREE.Vector3(0, 0, -1).transformDirection(m), hit: null, sel, click });
    }
  }
  for (const src of selHeld.keys()) selPrev.set(src, selHeld.get(src));
  setRays(rays, player.head);
  if (intro) updateIntro(dt);
  else {
    if (renderer.xr.isPresenting || sim) calibrateByHand(dt);
    if (mike) updatePause(dt);
  }
  if (cpu) {
    for (const g of Object.values(player.gloves)) g.mesh.visible = false;      // guardi soltanto
    cpu.update(dt);
    const st = i => ({ points: cpu.pts[i], dmg: cpu.dmg[i], hits: cpu.hits[i], blocks: 0, dodges: 0 });
    board.draw({ round: 1, rounds: 1, level: t('l_' + level), time: Math.max(0, cpu.time), running: cpu.delay <= 0, player: st(0), mike: st(1),
      names: [tour.p[pending.cm.a].name.toUpperCase(), tour.p[pending.cm.b].name.toUpperCase()], message: t('cpu_vs', { a: tour.p[pending.cm.a].name, b: tour.p[pending.cm.b].name }), diag: '' });
    if (skipBtn.update(dt, []) === 'skip') { sfx.punchBlock(); cpu.finish(true); }
    if (cpu.done) endCpuWatch();
  } else if (game.phase === 'sparring') {
    if (!game.paused) { mike.update(dt, player); const ev = mike.events.slice(); mike.events.length = 0; sparSounds(ev); spar.update(dt, player, ev); }
  } else if (game.phase === 'training') {
    const cam_ = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    if (trainKind === 'corda') {                          // corda: niente guantoni, ci sono le fasce e le manopole
      for (const g of Object.values(player.gloves)) g.mesh.visible = false;
      if (!game.paused) ropeTr.update(dt, player, cam_, arena.position.y);
    } else if (trainKind === 'pera' || trainKind === 'doppio') { if (!game.paused) trainer().update(dt, player, cam_); }
    else if (!game.paused) bagTr.update(dt, player, cam_);
  } else if (mike && game.phase !== 'watch') {
    mike.update(dt, player);
    handleEvents();
    updateGame(dt);
  }
  flash.update(dt);
  followBoard(dt);
  outOfRing();
  countdown.update(dt);
  sweat.update(dt);
  girl.update(dt, player.head);
  if (stool.visible && mike && mike.atGoal) {         // lo sgabello esattamente sotto Mike seduto
    stool.position.copy(mike.root.position).addScaledVector(mike.forward(), -0.07);
  }
  if (party.update(dt)) sfx.firework();
  if (arenaEnv && arenaEnv.group.visible) { arenaEnv.update(dt); sfx.crowdLevel(arenaEnv.excite); }
  if (desertEnv && desertEnv.group.visible) desertEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  if (snowEnv && snowEnv.group.visible) {
    let h = renderer.domElement.height;
    if (renderer.xr.isPresenting) { const bl = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); h = bl ? (bl.framebufferHeight || bl.textureHeight || 1800) : 1800; }
    snowEnv.setDrawHeight(h);
    snowEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  }
  if (volcEnv && volcEnv.group.visible) {
    let h = renderer.domElement.height;
    if (renderer.xr.isPresenting) { const bl = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); h = bl ? (bl.framebufferHeight || bl.textureHeight || 1800) : 1800; }
    volcEnv.setDrawHeight(h);
    volcEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  }
  if (gymEnv && gymEnv.group.visible) {             // l'inserviente ogni tanto guarda te (allenamento) o il match (a meta' tra voi due)
    const ch = (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(new THREE.Vector3());
    const w = game.phase === 'training' || !mike || !mike.root.visible ? ch : ch.lerp(mike.root.getWorldPosition(new THREE.Vector3()).setY(ch.y), 0.5);
    gymEnv.update(dt, w);
  }
  if (roofEnv && roofEnv.group.visible) {
    const hp = roofEnv.update(dt);
    if (hp) sfx.heli(hp, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera); else sfx.heliStop();
  }
  if (beachEnv && beachEnv.group.visible) beachEnv.update(dt, h => sfx.wave(0.2 + 0.25 * h), p => sfx.gull(p, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera));
  rayPointers.update(rays, menuOpen);
  player.endFrame();
  renderer.render(scene, camera);
}

// Pausa: tutte e due le braccia alzate sopra la testa per 1,2 s (in combattimento non succede),
// oppure A/B/X/Y sui controller. Nel menu i pulsanti si premono tenendoci sopra un guantone.
function openPause(end = false) {
  game.paused = !end; mike.enabled = false;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  const r = game.result;
  pause.open(player.head, e.y, end, end && r ? { win: r.winner === 'player' ? true : r.winner === 'mike' ? false : null, how: r.how } : null,
    game.phase === 'training' || game.phase === 'sparring');            // in allenamento anche "Cambia allenamento"
  if (!end) sfx.suspend(true);                    // tutto l'audio si ferma (anche lo speaker a meta' frase)
}
function closePause() {
  if (headOutOfRing()) recenterPlayer();          // ripresa da fuori dal ring: torni nel tuo angolo
  game.paused = false; pause.close(); game.outRing = false;
  sfx.suspend(false);
  mike.enabled = (game.phase === 'fight' && !game.kd) || game.phase === 'sparring';
}
const menuChoices = () => ['s:' + stageChoice, 'f:' + oppChoice, 'l:' + level, 'r:' + rounds, 'd:' + roundSecs,
  threeKO ? 'k:si' : 'k:no', 'g:' + lang, 'pt:' + pointerHand];
function menuYaw() {
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  return new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
}
// rimette davanti alla testa i menu aperti (dopo che il visore ha ricalcolato la posizione)
function reopenMenus() {
  const yaw = menuYaw();
  for (const m of MENUS) if (m.group.visible) m.open(player.head, yaw);
  if (tower.group.visible) { tower.open(player.head, yaw); setTourButtons(tourBtns.buttons.find(b => b.id === 'tgo').tk, tourBtns.buttons.find(b => b.id === 'tquit').g.visible, yaw, tourBtns.buttons.find(b => b.id === 'tquit').tk); }
  else if (bracket.group.visible) { bracket.open(player.head, yaw); setTourButtons(tourBtns.buttons.find(b => b.id === 'tgo').tk, tourBtns.buttons.find(b => b.id === 'tquit').g.visible, yaw, tourBtns.buttons.find(b => b.id === 'tquit').tk); }
}
function closeMenus() { for (const m of MENUS) m.close(); bracket.close(); tower.close(); tourBtns.close(); }
function openMenu(m) { closeMenus(); m.select(menuChoices()); m.open(player.head, menuYaw()); }
// ---- allenamento al sacco: in palestra, il ring sparisce e il sacco pende davanti a te
let bagTr = null, ropeTr = null, speedTr = null, deTr = null, trainKind = 'sacco';
const trainer = () => ({ corda: ropeTr, pera: speedTr, doppio: deTr })[trainKind] || bagTr;
function startTraining(kind = 'sacco') {
  trainKind = kind;
  closeMenus();
  setStage('palestra');
  if (kind === 'sacco' && !bagTr) bagTr = new BagTraining(arena);
  if (kind === 'corda' && !ropeTr) ropeTr = new RopeTraining(arena, scene);
  if (kind === 'pera' && !speedTr) speedTr = new SpeedBagTraining(arena);
  if (kind === 'doppio' && !deTr) { deTr = new DoubleEndTraining(arena); deTr.onTaken = k => flash.hit(0.4 + 0.6 * k); }
  newMatch(); game.phase = 'training'; game.message = '';
  setPeople(false); if (ringObj) ringObj.visible = false; board.mesh.visible = false; stool.visible = false;
  mike.enabled = false;
  const headY = arena.worldToLocal(player.head.clone()).y;
  if (kind === 'pera' || kind === 'doppio') trainer().start(playerZ, headY); else trainer().start(playerZ);
  if (gymEnv) { gymEnv.setTraining(true, playerZ - 0.85, kind); gymEnv.onSay = (k, p) => { sfx.voiceAt('j_' + k, p, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera); return sfx.voiceDur('j_' + k); }; }
  if (headOutOfRing()) recenterPlayer();
}
function stopTraining() {
  const tr_ = trainer();
  if (!tr_ || !tr_.group.visible) return;
  tr_.stop(); if (ringObj) ringObj.visible = true; board.mesh.visible = true;
  if (gymEnv) gymEnv.setTraining(false);
}
// suoni dei colpi nello sparring (come nell'incontro, ma senza pubblico ne' danni)
function sparSounds(ev) {
  for (const e of ev) {
    if (e.type === 'playerHit') { sfx.punchHit(Math.min(1.3, 0.6 + (e.speed || 3) / 6)); player.pulse(e.side, 1.0, 70); }
    else if (e.type === 'mikeBlocked') { sfx.punchBlock(); player.pulse(e.side, 0.4, 40); }
    else if (e.type === 'mikeThrows') sfx.whoosh();
    else if (e.type === 'mikeHit') { sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2, false); flash.hit(e.zone === 'body' ? 0.3 : 0.5); player.pulse('left', 0.6, 80); player.pulse('right', 0.6, 80); }
    else if (e.type === 'playerBlocked') { sfx.punchBlock(); player.pulse(e.side, 0.6, 50); }
  }
}
// ---- sparring: il partner (caschetto, alto come te) prende il posto dell'avversario sul ring della palestra
const PARTNER = { id: 'partner', name: 'Partner', glb: 'assets/partner.glb?v=20261004202924', evenSkin: false,
  band: { bg: '#1a1a1c', line: '#c4122a', text: '#f2ece0', label: 'SPARRING' } };
let spar = null, partner = null, savedMike = null, sparLoading = false;
async function startSparring(kind, defKinds = null) {
  closeMenus();
  setStage('palestra');
  if (!partner) {
    if (sparLoading) return; sparLoading = true;
    try {
      const gltf = await loadMikeGLTF(PARTNER.glb, () => {});
      partner = new Mike(gltf, scene, 'normale', PARTNER); partner.bounds = keepInRing;
    } catch (e) { console.warn('partner', e); sparLoading = false; showMainMenu(); return; }
    sparLoading = false;
    closeMenus();                                   // (se nel frattempo si fosse aperto un menu)
  }
  if (!spar) spar = new Sparring(scene);
  if (mike !== partner) { savedMike = mike; savedMike.enabled = false; savedMike.root.visible = false; mike = partner; window.mike = mike; }
  newMatch(); game.phase = 'sparring'; game.message = '';
  mike.setLevel('normale');
  const k = THREE.MathUtils.clamp((arena.worldToLocal(player.head.clone()).y + 0.15) / 1.68, 0.85, 1.25);   // 15 cm piu' alto di te (in guardia, gambe piegate, sembrava piu' basso)
  mike.root.scale.setScalar(k);
  mike.cfg.stalkDist *= k; mike.cfg.attackDist = (mike.cfg.attackDist || 0.7) * k;
  if (lastPlace) placeArena(lastPlace.head, lastPlace.yaw); else placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  mike.root.visible = true; mike.enabled = true; board.mesh.visible = false; stool.visible = false;
  mike.reachExtra = kind === 'difesa' ? 0.03 : 0;               // in difesa un filo piu' lontano (ma il colpo arriva al viso)
  mike.lightHits = true;                                         // sparring: contano anche i colpi leggeri
  mike.quickRecover = kind === 'difesa';                          // in difesa: braccio disteso -> rientra subito, alla stessa velocita'
  spar.defKinds = defKinds; spar.defType = defType;
  if (headOutOfRing()) recenterPlayer();
  const eye = new THREE.Vector3(0, 1.6, playerZ).applyMatrix4(arena.matrixWorld);
  spar.start(kind, mike, arena, new THREE.Vector3(ringSize / 2 + 0.15, 1.95, -ringSize / 2 - 0.1),
    new THREE.Vector3(-0.55, 1.2, playerZ + 0.05), eye);
}
function stopSparring() {
  if (!spar || !spar.active) return;
  spar.stop();
  mike.enabled = false; mike.root.visible = false; mike.root.scale.setScalar(1); mike.reachExtra = 0; mike.quickRecover = false; mike.lightHits = false;
  if (savedMike) { mike = savedMike; window.mike = mike; savedMike = null; }
  board.mesh.visible = true;
}
function showMainMenu() {
  stopTraining();
  stopSparring();
  if (greetPending) { greetPending = false; setTimeout(() => sfx.voiceNow('title'), 500); }   // "Home Boxing!" all'ingresso
  newMatch(); game.phase = 'menu'; game.message = t('menu');
  setPeople(false); tour = null; surv = null;
  mike.enabled = false; pause.close();
  openMenu(rootMenu);
}
// stage dell'incontro: quello scelto, oppure a caso tra gli stage virtuali (nel torneo senza ripetere finche' si puo')
const VIRTUAL = ['arena', 'spiaggia', 'grattacielo', 'deserto', 'neve', 'vulcano', 'palestra'];
function pickStage() {
  if (stageChoice !== 'random') return stageChoice;
  let pool = VIRTUAL;
  const run = tour || surv;
  if (run) {
    run.stages = run.stages || [];
    const fresh = VIRTUAL.filter(v => !run.stages.includes(v));
    pool = fresh.length ? fresh : VIRTUAL.filter(v => v !== run.stages[run.stages.length - 1]);
  } else pool = VIRTUAL.filter(v => v !== mode).concat(VIRTUAL.length > 1 ? [] : VIRTUAL);
  const st = pool[Math.floor(Math.random() * pool.length)] || VIRTUAL[0];
  if (run) run.stages.push(st);
  return st;
}
function setStage(st) {
  if (st === mode) return;
  mode = st; applyMode(); placed = false; xrFrames = 16;
}
let fightStarting = false;
async function startFight(opponentId) {
  closeMenus(); fightStarting = true;
  setStage(pickStage());
  await setFighter(opponentId);
  girl.pick().catch(e => console.warn('ragazza del ring', e));   // una ragazza a caso, la stessa per tutto l'incontro
  fightStarting = false; closeMenus();
  mike.setRamp(rampNow());
  newMatch();
  if (headOutOfRing(0)) recenterPlayer();
  startPresentation();
}
// quanto e' cresciuta la difficolta': 0 = il livello scelto, 1 = il livello sopra (non lo raggiunge mai del tutto)
function rampNow() {
  if (tour) return Math.min(0.6, tour.round * 0.15);                                   // finale: 60% verso il livello sopra
  if (surv) return surv.order.length > 1 ? 0.8 * surv.idx / (surv.order.length - 1) : 0;   // ultimo piano: 80%
  return 0;
}
// forza dei pugni con la crescita
function powerNow() {
  const names = Object.keys(POWER), nx = POWER[names[Math.min(names.length - 1, names.indexOf(level) + 1)]];
  return POWER[level] + (nx - POWER[level]) * rampNow();
}
// ---- sopravvivenza: la torre prima di ogni incontro, la salita dopo ogni vittoria
function startSurvival() {
  const order = [...FIGHTER_IDS];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  surv = { order, idx: 0, state: 'next', stages: [] };
  showTowerNext();
}
function showTowerNext() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  tower.open(player.head, yaw);
  tower.show(surv, t('sv_next', { n: surv.idx + 1, b: FIGHTERS[surv.order[surv.idx]].name.toUpperCase() }));
  setTourButtons('tr_fight', true, yaw, 'sv_quit');
}
function showTowerAfter() {
  const res = game.result || {};
  let youWon = res.winner === 'player';
  if (res.winner === 'pari') youWon = game.player.hits >= game.mike.hits;
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), opp = FIGHTERS[surv.order[surv.idx]].name.toUpperCase();
  tower.open(player.head, yaw);
  if (!youWon) {
    surv.state = 'lost';
    tower.show(surv, t('sv_lost', { b: opp, n: surv.idx + 1 }));
    sfx.announce(['tour_out']);
    setTourButtons('tr_menu', false, yaw);
    return;
  }
  const from = surv.idx, top = from + 1 >= surv.order.length;
  surv.idx = from + 1;
  tower.climb(surv, from, top ? t('sv_champ') : t('sv_won', { b: opp }), () => {
    if (!top) { showTowerNext(); return; }
    sfx.advance(true); sfx.announce(['tour_champ']);
    party.start(tower.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)), [0xffc928, 0xffffff, 0x6a1f8a]);
    sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
    setTourButtons('tr_menu', false, yaw);
  });
  setTimeout(() => sfx.climb(top ? 2.4 : 1.7, top), 120);
}
// ---- torneo: tabellone prima di ogni incontro e dopo (chi passa il turno), coppa alla fine
function showBracketNext() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  bracket.open(player.head, yaw);
  const opp = tour.opponent();
  bracket.showNext(tour, t('tr_next', { round: bracket.roundName(tour.round), b: FIGHTERS[opp].name.toUpperCase() }));
  setTourButtons('tr_fight', true, yaw);
}
function setTourButtons(goKey, showQuit, yaw = menuYaw(), quitKey = 'tr_quit') {
  const go = tourBtns.buttons.find(b => b.id === 'tgo'), q = tourBtns.buttons.find(b => b.id === 'tquit');
  go.tk = goKey; q.tk = quitKey; q.g.visible = showQuit;
  if (goKey !== 'tr_watch') tourStep = goKey === 'tr_fight' ? 'next' : 'end';
  go.x0 = go.x0 ?? go.g.position.x; go.g.position.x = showQuit ? go.x0 : 0;     // da solo, al centro
  tourBtns.relabel();
  // sotto il tabellone
  const onTower = tower.group.visible, p = (onTower ? tower.group : bracket.group).position, dd = onTower ? 1.25 : 1.05;
  tourBtns.open(new THREE.Vector3(p.x + Math.sin(yaw) * dd, p.y - (onTower ? 0.8 : 0.47), p.z + Math.cos(yaw) * dd), yaw, onTower ? 1.0 : 0.95, 0.0);
  tourBtns.group.rotation.set(0, yaw, 0);
}
let tourStep = 'next', pending = null, cpu = null, cpuB = null;
function showBracketAfter() {
  const res = game.result || {};
  let youWon = res.winner === 'player';
  if (res.winner === 'pari') youWon = game.player.hits >= game.mike.hits;     // pari: passa chi ha colpito di piu'
  const cm = youWon ? tour.cpuMatches() : [];
  if (cm.length) { pending = { youWon, cm: cm[0] }; showCpuChoice(); return; }
  advanceRound(youWon, {});
}
// un incontro tra due personaggi veri della CPU in questo turno: guardarlo o andare avanti
function showCpuChoice() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), { cm } = pending;
  bracket.open(player.head, yaw);
  bracket.showCpu(tour, cm.j, t('tr_cpu', { round: bracket.roundName(tour.round), a: tour.p[cm.a].name.toUpperCase(), b: tour.p[cm.b].name.toUpperCase() }));
  tourStep = 'choice';
  setTourButtons('tr_watch', true, yaw, 'tr_continue');
}
// guardi l'incontro: i due pugili combattono nel ring (di lato rispetto a te), tu senza guantoni
async function startCpuWatch() {
  const { cm } = pending;
  closeMenus(); fightStarting = true; game.phase = 'watch';
  await setFighter(tour.p[cm.a].id);
  const gltf = await loadMikeGLTF(FIGHTERS[tour.p[cm.b].id].glb, () => {});
  cpuB = new Mike(gltf, scene, level, FIGHTERS[tour.p[cm.b].id]);
  fightStarting = false;
  const away = pos => {                              // nel ring, e lontano da dove sei tu
    keepInRing(pos);
    const dx = pos.x - player.head.x, dz = pos.z - player.head.z, d = Math.hypot(dx, dz);
    if (d < 1.5) { pos.x = player.head.x + dx / Math.max(d, 1e-3) * 1.5; pos.z = player.head.z + dz / Math.max(d, 1e-3) * 1.5; }
  };
  mike.bounds = away; cpuB.bounds = away;
  const zc = -Math.min(0.6, ringSize / 2 - 0.9), half = Math.min(0.95, ringSize / 2 - 0.6);
  const place = (f, x) => { f.root.position.set(x, 0, zc).applyMatrix4(arena.matrixWorld); f.root.visible = true; };
  place(mike, -half); place(cpuB, half);           // ognuno dal suo lato: l'incontro comincia dall'inizio
  setPeople(true);
  const nA = tour.p[cm.a], nB = tour.p[cm.b];
  const intro = [`name_${nA.id}`, 'intro_blue_g', `name_${nB.id}`, 'round_1'];   // "Bruce… e nell'angolo blu… Mike! Round uno"
  sfx.announce(intro);
  cpu = new CpuMatch(mike, cpuB, roundSecs, {
    onHit: (zone, p) => { sfx.punchHit(Math.min(1.3, 0.6 + p * 0.4)); if (arenaEnv) arenaEnv.cheer(zone === 'head' ? 0.8 : 0.5); if (mode === 'arena' && zone === 'head') sfx.cheer('boato', 0.5); },
    onKO: () => { sfx.voiceNow('knockdown'); if (arenaEnv) arenaEnv.cheer(2); if (mode === 'arena') sfx.cheer('boato', 1); },
    onStart: () => { sfx.bell(1); sfx.announce(['box']); if (mode === 'arena') sfx.cheer('boato', 0.8); },
  }, Math.max(3.5, intro.reduce((s, n) => s + sfx.voiceDur(n), 0) + 0.8));
  // pulsante discreto, in basso di lato, per andare subito al risultato
  skipBtn.open(player.head, menuYaw() + 0.75, 0.55, 0.45);
}
function endCpuWatch() {
  const { cm, youWon } = pending, w = cpu.winner === 0 ? cm.a : cm.b;
  sfx.bell(3);
  cpu = null; skipBtn.close();
  if (cpuB) { scene.remove(cpuB.root); cpuB = null; }
  mike.bounds = keepInRing; mike.resetPose();
  pending = null;
  advanceRound(youWon, { [cm.j]: w });
}
function advanceRound(youWon, forced) {
  const opp = tour.opponent(), r = tour.result(youWon, forced);
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  bracket.open(player.head, yaw);
  const sub = youWon ? (tour.state === 'champion' ? t('tr_champ') : t('tr_adv', { round: bracket.roundName(r) }))
    : t('tr_lost', { b: FIGHTERS[opp].name.toUpperCase(), round: bracket.roundName(r) });
  if (youWon) setTimeout(() => sfx.advance(false), 300);
  else sfx.announce(['tour_out']);
  bracket.showAdvance(tour, r, sub, () => {
    if (tour.state === 'next') { showBracketNext(); return; }
    if (tour.state === 'champion') {                  // festa: coriandoli e fuochi sopra la coppa
      sfx.advance(true); sfx.announce(['tour_champ']);
      party.start(bracket.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), [0xffc928, 0xffffff, 0xd81e2c]);
      sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
    }
    setTourButtons('tr_menu', false, yaw);
  });
}
function updateMainMenu(dt, gloves) {
  bracket.update(dt); tower.update(dt);
  if (tourBtns.group.visible) {
    const id = tourBtns.update(dt, gloves);
    if (!id) return;
    sfx.punchBlock();
    if (tourStep === 'choice') { if (id === 'tgo') startCpuWatch(); else { const p = pending; pending = null; advanceRound(p.youWon, {}); } return; }
    if (surv) { if (id === 'tgo' && surv.state === 'next') startFight(surv.order[surv.idx]); else showMainMenu(); return; }
    if (id === 'tgo') { if (tour && tour.state === 'next') startFight(tour.opponent()); else showMainMenu(); }
    else if (id === 'tquit') showMainMenu();
    return;
  }
  const menu = MENUS.find(m => m.group.visible);
  if (!menu) return;
  const id = menu.update(dt, gloves);
  if (!id) return;
  sfx.punchBlock();
  if (id === 'gm:training') { openMenu(trainMenu); return; }
  if (id === 't:spar') { openMenu(sparMenu); return; }
  if (id === 'sp:difesa') { openMenu(defMenu); defSelect(); return; }
  if (id === 'back_spar') { openMenu(sparMenu); return; }
  if (id === 'back_train') { openMenu(trainMenu); return; }
  if (id.startsWith('dt:')) { defType = id.slice(3); try { localStorage.setItem('hb-def-type', defType); } catch (e) {} defSelect(); return; }
  if (id.startsWith('dk:')) {                                  // colpo scelto / tolto
    const k = id.slice(3); if (defSel.has(k)) defSel.delete(k); else defSel.add(k);
    try { localStorage.setItem('hb-def-kinds', JSON.stringify([...defSel])); } catch (e) {}
    defSelect(); return;
  }
  if (id === 'dm:casuale') { lastTrainMenu = 'def'; startSparring('difesa', null); return; }
  if (id === 'dm:start') { if (defSel.size) { lastTrainMenu = 'def'; startSparring('difesa', [...defSel]); } return; }
  if (id.startsWith('sp:')) { lastTrainMenu = 'spar'; startSparring(id.slice(3)); return; }
  if (id === 't:sacco') { startTraining('sacco'); return; }
  if (id === 't:rope') { startTraining('corda'); return; }
  if (id === 't:speed') { startTraining('pera'); return; }
  if (id === 't:double') { startTraining('doppio'); return; }
  if (id === 'gm:arcade' || id === 'gm:tour' || id === 'gm:surv') {
    gameMode = id.slice(3);
    try { localStorage.setItem('hb-gamemode', gameMode); } catch (e) {}
    openMenu({ arcade: arcadeMenu, tour: tourMenu, surv: survMenu }[gameMode]); return;
  }
  if (id === 'back') { openMenu(rootMenu); return; }
  if (id.startsWith('s:')) {
    stageChoice = id.slice(2);
    try { localStorage.setItem('hb-stage', stageChoice); } catch (e) {}
    if (stageChoice !== 'random') { setStage(stageChoice); try { localStorage.setItem('hb-mode', mode); } catch (e) {} }
  }
  else if (id.startsWith('l:')) { level = id.slice(2); try { localStorage.setItem('hb-level', level); } catch (e) {} mike.setLevel(level); }
  else if (id.startsWith('d:')) { roundSecs = parseInt(id.slice(2)); try { localStorage.setItem('hb-roundsec', roundSecs); } catch (e) {} }
  else if (id.startsWith('k:')) { threeKO = id === 'k:si'; try { localStorage.setItem('hb-3ko', threeKO ? 'si' : 'no'); } catch (e) {} }
  else if (id.startsWith('r:')) { rounds = parseInt(id.slice(2)); try { localStorage.setItem('hb-rounds', rounds); } catch (e) {} }
  else if (id.startsWith('g:')) setLang(id.slice(2));
  else if (id.startsWith('pt:')) { pointerHand = id.slice(3); try { localStorage.setItem('hb-pointer', pointerHand); } catch (e) {} }
  else if (id.startsWith('f:')) {
    oppChoice = id.slice(2); try { localStorage.setItem('hb-opp', oppChoice); } catch (e) {}
    if (oppChoice !== 'random') setFighter(oppChoice);
  }
  else if (id === 'start') { tour = null; startFight(oppChoice === 'random' ? FIGHTER_IDS[Math.floor(Math.random() * FIGHTER_IDS.length)] : oppChoice); return; }
  else if (id === 'start_tour') { surv = null; tour = new Tournament(FIGHTERS); showBracketNext(); return; }
  else if (id === 'start_surv') { tour = null; startSurvival(); return; }
  else if (id === 'quit') { closeMenus(); const s = renderer.xr.getSession(); if (s) s.end(); return; }
  menu.select(menuChoices());
}

function updatePause(dt) {
  const g = Object.values(player.gloves);
  let pressed = false;
  for (const s of player.sources) {
    const b = s.gamepad && s.gamepad.buttons;
    if (b && ((b[4] && b[4].pressed) || (b[5] && b[5].pressed))) pressed = true;
  }
  const click = pressed && !prevButtons; prevButtons = pressed;
  if (game.phase === 'menu') { updateMainMenu(dt, g); return; }
  // sicurezza: un menu principale aperto mentre giochi/ti alleni non si potrebbe premere (si resterebbe bloccati): si chiude
  if (MENUS.some(m => m.group.visible)) { console.warn('menu aperto fuori dal menu: chiuso', game.phase); for (const m of MENUS) m.close(); }
  if (game.phase === 'watch') return;                 // incontro CPU: niente pausa, c'e' il pulsante per saltare
  if (!game.paused && !pause.group.visible && game.phase !== 'end' && click) { openPause(); return; }
  if (game.paused && click) { closePause(); return; }
  const id = pause.update(dt, g);
  if (id === 'resume') closePause();
  else if (id === 'restart') { closePause(); if (game.phase === 'training') trainer().reset(); else if (game.phase === 'sparring') spar.reset(); else newMatch(); }
  else if (id === 'exit') { closePause(); tour = null; surv = null; showMainMenu(); }
  else if (id === 'change') {                     // torna al menu da cui eri partito (difesa, sparring o allenamento)
    closePause(); const lm = game.phase === 'sparring' ? lastTrainMenu : null; showMainMenu();
    if (lm === 'def') { openMenu(defMenu); defSelect(); } else if (lm === 'spar') openMenu(sparMenu); else openMenu(trainMenu);
  }
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
      game.message = t('floor_fixed');
    }
  }
}

// ---------------------------------------------------------------- avvio
// cambio avversario dal menu: si carica il suo modello e prende il posto del precedente
let fighterLoading = false;
function setFighter(id) {
  return new Promise(resolve => {
  if (!FIGHTERS[id] || id === fighterId || fighterLoading) return resolve();
  fighterLoading = true;
  loadMikeGLTF(FIGHTERS[id].glb, () => {}).then(gltf => {
    fighterLoading = false;
    fighterId = id;
    try { localStorage.setItem('hb-fighter', id); } catch (e) {}
    setOpponentName(FIGHTERS[id].name);
    const old = mike;
    mike = new Mike(gltf, scene, level, FIGHTERS[id]);
    mike.bounds = keepInRing;
    bruises = new Bruises(mike.model);
    if (old) scene.remove(old.root);
    window.mike = mike;
    if (lastPlace) placeArena(lastPlace.head, lastPlace.yaw); else placeArena(new THREE.Vector3(0, 1.65, 0), 0);
    if (game.phase === 'menu') { newMatch(); game.phase = 'menu'; game.message = t('menu'); }
    for (const m of MENUS) m.select(menuChoices());
    resolve();
  }).catch(e => { fighterLoading = false; console.warn('avversario', e); resolve(); });
  });
}

loadMikeGLTF(FIGHTERS[fighterId].glb, f => statusT('loading', { p: Math.min(100, Math.round(f * 100)) })).then(gltf => {
  mike = new Mike(gltf, scene, level, FIGHTERS[fighterId]);
  girl.load().catch(e => console.warn('ragazza del ring', e));
  bruises = new Bruises(mike.model);
  mike.bounds = keepInRing;
  placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  window.mike = mike; window.game = game; window.player = player; window.room = room; window.placeArena = placeArena; window.camera = camera; window.renderOnly = () => renderer.render(scene, camera); window.bruisesFx = () => bruises; window.getUpFx = getUp; window.gameApi = { newMatch, showMainMenu, openPause, pause, startTraining, bag: () => bagTr, rope: () => ropeTr, spar: () => spar, startSparring, speed: () => speedTr, de: () => deTr, envs: () => ({ roofEnv, desertEnv, gymEnv, snowEnv, volcEnv }), startIntro, startPresentation, girl: () => girl, arena: () => arena, ringSize: () => ringSize }; window.sweatFx = sweat;   // per le prove
  window.tourApi = { MENUS, bracket, tourBtns, show: () => showMainMenu(), open: m => openMenu(MENUS[m]), start: () => { tour = new Tournament(FIGHTERS); showBracketNext(); },
    after: win => { game.result = { winner: win ? 'player' : 'mike' }; showBracketAfter(); }, fight: () => startFight(tour.opponent()), setStageChoice: c => { stageChoice = c; }, get mode() { return mode; }, get tour() { return tour; }, get cpu() { return cpu; }, skipBtn, tower, startSurvival, get surv() { return surv; }, survAfter: win => { game.result = { winner: win ? 'player' : 'mike' }; showTowerAfter(); } };   // (prove)
  status('');
  $('enter').disabled = !navigator.xr;
  if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (!ok) { $('enter').disabled = true; statusT('no_xr'); }
  });
  if (new URLSearchParams(location.search).has('sim')) startSim();
}).catch(e => { console.error(e); statusT('load_err', { e: e.message }); });

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
    placed = false; xrFrames = 0; floorSource = 'visore'; floorY = 0; roomCaptureAsked = false; headMax = 0; greetPending = true;
    newMatch(); game.phase = 'menu'; setPeople(false);       // si entra nello stage con il menu, la partita non parte
    $('overlay').hidden = true;
    // visore tolto e rimesso (la sessione torna visibile) o "centro" del Quest cambiato: riallinea appena il tracciamento riparte
    // grilletto / pizzico (mani): per prendere e trascinare i menu e premere i pulsanti come sul Quest
    session.addEventListener('selectstart', e => selHeld.set(e.inputSource, true));
    session.addEventListener('selectend', e => selHeld.set(e.inputSource, false));
    session.addEventListener('visibilitychange', () => { if (session.visibilityState === 'visible') { needRecenter = 20; recenterAlways = false; } });   // (solo se sei fuori dal ring)
    try { renderer.xr.getReferenceSpace().addEventListener('reset', () => { needRecenter = 20; recenterAlways = true; }); } catch (e) {}
    session.addEventListener('end', () => {
      intro = null; baseRef = null;
      $('overlay').hidden = false; placed = false;
      if (game.paused) closePause();
      closeMenus(); tour = null; surv = null;
      if (mike) mike.enabled = false;
      newMatch(); game.phase = 'menu';              // fuori dal gioco l'incontro non va avanti da solo
      sfx.stopAll();                                // niente suoni dopo l'uscita
    });
  } catch (e) { statusT('xr_err', { e: e.message }); }
};

// pagina nascosta (visore tolto, browser chiuso): silenzio
document.addEventListener('visibilitychange', () => { if (document.hidden) sfx.stopAll(); });

function startSim() {
  sfx.initAudio();
  $('overlay').hidden = true; $('simhelp').hidden = false;
  sim = new SimInput(camera, renderer.domElement); window.simInput = sim;   // (per le prove)
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
  $('enter').textContent = t('play');
  for (const b of document.querySelectorAll('#langs button')) b.classList.toggle('on', b.dataset.lang === lang);
  for (const el of document.querySelectorAll('.lang-it')) el.hidden = lang !== 'it';
  for (const el of document.querySelectorAll('.lang-en')) el.hidden = lang !== 'en';
  $('sim').textContent = lang === 'it' ? 'Anteprima su PC' : 'PC preview';
  document.documentElement.lang = lang;
}
for (const b of document.querySelectorAll('#langs button')) b.onclick = () => setLang(b.dataset.lang);   // bandierine: lingua gia' dalla pagina
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => {
  mode = b.dataset.mode;
  try { localStorage.setItem('hb-mode', mode); } catch (e) {}
  showMode();
  if (sim) applyMode();
};
showMode();
