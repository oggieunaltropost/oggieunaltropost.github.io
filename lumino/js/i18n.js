// Lingue del gioco: italiano e inglese. Si parte in italiano se il sistema e' in italiano,
// altrimenti in inglese; la scelta fatta nel menu' viene ricordata.
const KEY = 'lumino-lang';

const STRINGS = {
  it: {
    'yes': 'SÌ', 'no': 'NO',
    'both': 'entrambi', 'luminoAndLumina': 'Lumino e Lumina',
    'level.facile': 'facile', 'level.normale': 'normale', 'level.difficile': 'difficile',
    'occ.short': ['stanza', 'profondità', 'no'],
    'occ.long': ['mesh della stanza', 'sensore di profondità (mani incluse)', 'disattivata'],
    // menu'
    'menu.back': '‹ Indietro', 'menu.close': 'Chiudi',
    'menu.exit': 'Esci dal gioco', 'menu.exitYes': 'Sì, esci', 'menu.exitNo': 'No, resta',
    'page.exit': 'Uscire dal gioco?', 'page.exit.info': 'Lumino e Lumina ti aspettano la prossima volta!',
    'page.exit.game': 'La partita in corso non verrà salvata.', 'menu.play': '▶  Gioca',
    'menu.cast': 'Personaggi: {x}', 'menu.follow': 'Seguimi: {x}', 'menu.fly': 'Mosca: {x}',
    'menu.lang': 'Lingua: Italiano',
    'menu.berries': 'Gara di bacche ›', 'menu.berriesExit': 'Esci dalla gara',
    'menu.defend': 'Difendi ›', 'menu.defendExit': 'Esci da Difendi', 'menu.stats': 'Statistiche ›',
    'menu.callBoth': 'Chiamali', 'menu.call': 'Chiama {x}',
    'menu.resetBoth': 'Resetta tutti e due', 'menu.reset': 'Resetta {x}',
    'menu.occ': 'Occlusione: {x}', 'menu.room': 'Mostra stanza: {x}', 'menu.scan': 'Scansiona la stanza',
    'menu.duration': 'Durata: {x} min', 'menu.level': 'Difficoltà: {x}',
    'menu.prev': '◀  Precedenti', 'menu.next': 'Successive  ▶',
    'page.berries': 'Gara di bacche',
    'page.berries.info': ['Le bacche compaiono nella stanza: chi le mangia fa punto.', 'Prendile prima tu (pizzico) e portale alla bocca!'],
    'page.defend': 'Difendi',
    'page.defend.info': ['I ragni vogliono prendere i tuoi animaletti:', 'falli esplodere toccandoli con le mani.',
      "{x} cuori ciascuno: se uno li finisce è game over."],
    'page.stats': 'Statistiche', 'page.stats.choose': 'Scegli il gioco:', 'page.stats.level': 'Scegli la difficoltà:',
    'page.stats.berries': 'Statistiche · Gara di bacche', 'page.stats.defend': 'Statistiche · Difendi',
    'page.stats.defendLevel': 'Statistiche · Difendi · {x}',
    'page.stats.none': 'Nessuna partita ancora.', 'page.stats.page': 'Pagina {x} di {y}',
    // pannelli
    'help': ['Menu: dorso della mano sinistra verso di te e pizzica (o tocca la zampetta MENÙ)', 'Pizzica o stringi Lumino: lo prendi (anche con 2 mani)',
      'Palmo in su vicino a lui: ti sale in mano', 'Pizzico lontano / grilletto: lancia una bacca', 'Mano aperta su di lui: lo accarezzi'],
    'room.none': 'Stanza non rilevata: menu > Scansiona la stanza',
    'room.info': 'Stanza: {x} mesh{g}, {y} piani', 'room.global': ' (scansione 3D)',
    'stuck.m': '{x} si era incastrato: eccolo di nuovo qui!', 'stuck.f': '{x} si era incastrata: eccola di nuovo qui!',
    'occlusion': 'Occlusione',
    'cats.panel': ['Guarda verso il gatto: quando lo vedono', 'compare un anello giallo sotto di lui.'], 'cats.title': 'Segui i gatti',
    'tattoo': 'MENÙ',
    // pagina iniziale
    'status.loading': 'Carico Lumino e Lumina...', 'status.ready': 'Pronto! Metti il visore e premi "Entra in AR".',
    'status.noAR': "AR non disponibile su questo dispositivo: prova l'anteprima 3D.",
    'status.https': "AR richiede HTTPS: apri l'indirizzo https:// mostrato dal server.",
    'status.error': 'Errore AR: {x}', 'status.press': 'Premi "Entra in AR" per iniziare.',
    'page.intro': 'Un piccolo cucciolo luminoso grande come una mano corre per la tua stanza, si arrampica sui mobili e salta giù.',
    'page.enter': 'Entra in AR', 'page.sim': 'Anteprima 3D su PC', 'page.apk': "⬇ Scarica l'app per il Quest (APK{v})",
    'page.list': [
      'Menu: guarda il <b>dorso della mano sinistra</b> e <b>pizzica</b> pollice e indice (oppure tocca la zampetta <b>MENÙ</b>): personaggi, seguimi, mosca, giochi, opzioni',
      '<b>Pizzica</b> o <b>stringi</b> Lumino per prenderlo (anche con due mani ai lati); <b>palmo in su</b> vicino a lui e ti sale in mano',
      '<b>Pizzico lontano</b> o grilletto: lanci una bacca, Lumino corre a mangiarla',
      '<b>Giochi</b> dal menu: <b>Gara di bacche</b> e <b>Difendi</b> (ragni da far esplodere toccandoli), durata 1-3 minuti, 3 livelli',
      '<b>Toccalo</b> con la mano aperta per accarezzarlo. Con i controller: stick premuto o A/B/X/Y apre il menu',
    ],
    'sim.call': 'Chiama', 'sim.pet': 'Accarezza', 'sim.menu': 'Menu',
    // gara di bacche
    'berries.title': 'Gara di bacche!',
    'berries.intro': ['Le bacche compaiono nella stanza.', '{x} a mangiarle...', '...ma se la prendi prima tu (pizzico / grip)',
      "e te la porti alla bocca, il punto è tuo!", 'Durata: {y}. Esci dal menu.'],
    'berries.runs1': '{x} corre', 'berries.runsN': '{x} corrono',
    'minutes1': '1 minuto', 'minutesN': '{x} minuti',
    'you': 'Tu', 'tie': 'Pareggio!', 'youWin': 'Hai vinto!', 'winner': 'Ha vinto {x}!',
    'rematch': 'Vogliono la rivincita...', 'greedy': 'Che golosi!',
    // difendi
    'defend.title': 'Difendi!',
    'defend.intro': ['Arrivano i ragni: vogliono prendere i tuoi animaletti!', 'Falli esplodere toccandoli con le mani.',
      'Se un ragno li raggiunge, perdono un cuore.', 'Tenerli in mano li protegge, ma solo per {x} secondi.',
      'Livello {l}: {y} cuori ciascuno, {m} min.'],
    'defend.caught': 'I ragni hanno preso {x}...', 'defend.popped': 'Ragni esplosi: {x}', 'defend.lasted': 'Resistito: {x} secondi',
    'defend.won': 'Li hai difesi tutti!', 'defend.heartsLeft': 'Cuori rimasti: {x}',
    'defend.gameOver': 'Game over', 'defend.victory': 'Vittoria!', 'defend.stopped': 'Partita interrotta',
    'defend.hud': 'Ragni {x}',
    // statistiche
    'stats.summaryB': '{n} partite · {w} vinte da te · tuo record {b}',
    'stats.summaryD': '{n} partite · {w} vinte · record {b} ragni',
    'stats.rowB': '{d} · {m} min · {p}{i}', 'stats.interrupted': ' (interrotta)',
    'stats.rowD': '{d} · {m} min · {r} · {s} ragni · resistito {t}s',
    'stats.res.vittoria': 'Vittoria', 'stats.res.gameover': 'Game over', 'stats.res.interrotta': 'Interrotta',
    'stats.headB': 'Gara di bacche: {x}', 'stats.headD': 'Difendi · {l}: {x}',
    'stats.noneD': 'Difendi: nessuna partita ancora', 'stats.noneAll': 'Nessuna partita ancora: prova un gioco dal menu!',
  },
  en: {
    'yes': 'ON', 'no': 'OFF',
    'both': 'both', 'luminoAndLumina': 'Lumino and Lumina',
    'level.facile': 'easy', 'level.normale': 'normal', 'level.difficile': 'hard',
    'occ.short': ['room', 'depth', 'off'],
    'occ.long': ['room mesh', 'depth sensor (hands included)', 'off'],
    'menu.back': '‹ Back', 'menu.close': 'Close',
    'menu.exit': 'Exit game', 'menu.exitYes': 'Yes, exit', 'menu.exitNo': 'No, stay',
    'page.exit': 'Exit the game?', 'page.exit.info': 'Lumino and Lumina will be waiting for you next time!',
    'page.exit.game': 'The current game will not be saved.', 'menu.play': '▶  Play',
    'menu.cast': 'Characters: {x}', 'menu.follow': 'Follow me: {x}', 'menu.fly': 'Fly: {x}',
    'menu.lang': 'Language: English',
    'menu.berries': 'Berry race ›', 'menu.berriesExit': 'Quit the race',
    'menu.defend': 'Defend ›', 'menu.defendExit': 'Quit Defend', 'menu.stats': 'Statistics ›',
    'menu.callBoth': 'Call them', 'menu.call': 'Call {x}',
    'menu.resetBoth': 'Reset both', 'menu.reset': 'Reset {x}',
    'menu.occ': 'Occlusion: {x}', 'menu.room': 'Show room: {x}', 'menu.scan': 'Scan the room',
    'menu.duration': 'Length: {x} min', 'menu.level': 'Difficulty: {x}',
    'menu.prev': '◀  Previous', 'menu.next': 'Next  ▶',
    'page.berries': 'Berry race',
    'page.berries.info': ['Berries pop up around the room: whoever eats one scores.', 'Grab them first (pinch) and bring them to your mouth!'],
    'page.defend': 'Defend',
    'page.defend.info': ['The spiders want to catch your pets:', 'pop them by touching them with your hands.',
      '{x} hearts each: if one runs out, it is game over.'],
    'page.stats': 'Statistics', 'page.stats.choose': 'Choose the game:', 'page.stats.level': 'Choose the difficulty:',
    'page.stats.berries': 'Statistics · Berry race', 'page.stats.defend': 'Statistics · Defend',
    'page.stats.defendLevel': 'Statistics · Defend · {x}',
    'page.stats.none': 'No games yet.', 'page.stats.page': 'Page {x} of {y}',
    'help': ['Menu: back of your left hand toward you, then pinch (or touch the MENU paw)', 'Pinch or grab Lumino to pick him up (two hands work too)',
      'Palm up near him: he jumps into your hand', 'Pinch far away / trigger: throw a berry', 'Open hand on him: pet him'],
    'room.none': 'Room not detected: menu > Scan the room',
    'room.info': 'Room: {x} meshes{g}, {y} planes', 'room.global': ' (3D scan)',
    'stuck.m': '{x} got stuck: here he is again!', 'stuck.f': '{x} got stuck: here she is again!',
    'occlusion': 'Occlusion',
    'cats.panel': ['Look at the cat: when they see it', 'a yellow ring appears under it.'], 'cats.title': 'Follow the cats',
    'tattoo': 'MENU',
    'status.loading': 'Loading Lumino and Lumina...', 'status.ready': 'Ready! Put on the headset and press "Enter AR".',
    'status.noAR': 'AR is not available on this device: try the 3D preview.',
    'status.https': 'AR needs HTTPS: open the https:// address shown by the server.',
    'status.error': 'AR error: {x}', 'status.press': 'Press "Enter AR" to start.',
    'page.intro': 'A tiny glowing pup, as big as your hand, runs around your room, climbs on the furniture and jumps down.',
    'page.enter': 'Enter AR', 'page.sim': '3D preview on PC', 'page.apk': '⬇ Download the Quest app (APK{v})',
    'page.list': [
      'Menu: look at the <b>back of your left hand</b> and <b>pinch</b> thumb and index (or touch the <b>MENU</b> paw): characters, follow me, fly, games, options',
      '<b>Pinch</b> or <b>grab</b> Lumino to pick him up (two hands on his sides work too); <b>palm up</b> near him and he jumps into your hand',
      '<b>Pinch far away</b> or trigger: throw a berry and Lumino runs to eat it',
      '<b>Games</b> from the menu: <b>Berry race</b> and <b>Defend</b> (pop the spiders by touching them), 1-3 minutes, 3 levels',
      '<b>Touch him</b> with an open hand to pet him. With controllers: thumbstick click or A/B/X/Y opens the menu',
    ],
    'sim.call': 'Call', 'sim.pet': 'Pet', 'sim.menu': 'Menu',
    'berries.title': 'Berry race!',
    'berries.intro': ['Berries pop up around the room.', '{x} to eat them...', '...but if you grab one first (pinch / grip)',
      'and bring it to your mouth, you score!', 'Length: {y}. Quit from the menu.'],
    'berries.runs1': '{x} runs', 'berries.runsN': '{x} run',
    'minutes1': '1 minute', 'minutesN': '{x} minutes',
    'you': 'You', 'tie': 'Tie!', 'youWin': 'You win!', 'winner': '{x} wins!',
    'rematch': 'They want a rematch...', 'greedy': 'What gluttons!',
    'defend.title': 'Defend!',
    'defend.intro': ['Here come the spiders: they want to catch your pets!', 'Pop them by touching them with your hands.',
      'If a spider reaches them, they lose a heart.', 'Holding them keeps them safe, but only for {x} seconds.',
      'Level {l}: {y} hearts each, {m} min.'],
    'defend.caught': 'The spiders caught {x}...', 'defend.popped': 'Spiders popped: {x}', 'defend.lasted': 'Survived: {x} seconds',
    'defend.won': 'You protected them all!', 'defend.heartsLeft': 'Hearts left: {x}',
    'defend.gameOver': 'Game over', 'defend.victory': 'Victory!', 'defend.stopped': 'Game stopped',
    'defend.hud': 'Spiders {x}',
    'stats.summaryB': '{n} games · {w} won by you · your best {b}',
    'stats.summaryD': '{n} games · {w} won · best {b} spiders',
    'stats.rowB': '{d} · {m} min · {p}{i}', 'stats.interrupted': ' (stopped)',
    'stats.rowD': '{d} · {m} min · {r} · {s} spiders · survived {t}s',
    'stats.res.vittoria': 'Victory', 'stats.res.gameover': 'Game over', 'stats.res.interrotta': 'Stopped',
    'stats.headB': 'Berry race: {x}', 'stats.headD': 'Defend · {l}: {x}',
    'stats.noneD': 'Defend: no games yet', 'stats.noneAll': 'No games yet: try a game from the menu!',
  },
};

function detect() {
  try { const saved = localStorage.getItem(KEY); if (saved === 'it' || saved === 'en') return saved; } catch { /* niente storage */ }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  return langs.some(l => String(l).toLowerCase().startsWith('it')) ? 'it' : 'en';
}

export let lang = detect();
const listeners = [];

export function setLang(l) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignora */ }
  document.documentElement.lang = l;
  for (const f of listeners) f(l);
}
export function onLangChange(f) { listeners.push(f); }

// t('chiave', { x: ..., y: ... }): testo nella lingua corrente, con i segnaposto {x} sostituiti
export function t(key, vars = {}) {
  const v = STRINGS[lang][key] ?? STRINGS.it[key] ?? key;
  const fill = s => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return Array.isArray(v) ? v.map(fill) : fill(v);
}
