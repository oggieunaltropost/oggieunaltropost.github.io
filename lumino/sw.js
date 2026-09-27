// Service worker di Lumino AR: tiene il gioco sul visore, cosi' parte anche senza rete.
// Generato da tools/make_pwa.py: rigeneralo quando cambiano i file del gioco.
const CACHE = 'lumino-427493';
const FILES = [
  "./",
  "assets/fly.glb",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/lumina.glb",
  "assets/lumino.glb",
  "assets/lumino.png",
  "assets/spider.glb",
  "index.html",
  "js/cats.js",
  "js/creature.js",
  "js/defend.js",
  "js/fly.js",
  "js/fx.js",
  "js/gloves.js",
  "js/i18n.js",
  "js/main.js",
  "js/menu.js",
  "js/minigame.js",
  "js/room.js",
  "js/sfx.js",
  "js/social.js",
  "js/stats.js",
  "js/treats.js",
  "manifest.webmanifest",
  "node_modules/three/build/three.module.js",
  "node_modules/three/build/three.core.js",
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
  "node_modules/three/examples/jsm/environments/RoomEnvironment.js",
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  "node_modules/three/examples/jsm/utils/SkeletonUtils.js",
  "node_modules/three-mesh-bvh/build/index.module.js"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// prima la rete (cosi' gli aggiornamenti arrivano subito), se manca la copia salvata
// (cache: 'no-cache' = chiede sempre al sito se il file e' cambiato, senza la cache HTTP di 10 minuti)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = new URL(e.request.url).origin === location.origin ? new Request(e.request, { cache: 'no-cache' }) : e.request;
  e.respondWith(fetch(req).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
