// Voci: in tools/gen_voices.py (FIGHTERS) intro_<id> (descrizione) e name_<id> (nome) per ogni pugile.
// Gli avversari: modello (blender/create_mike.py char=...), anteprima per il menu e dettagli di aspetto.
// Ruolo nel gioco sempre lo stesso ("mike" nel codice = l'avversario); qui cambiano nome e aspetto.
// genericIntro: lo speaker usa la presentazione comune (intro_gen) e poi il nome: niente frase dedicata.
export const FIGHTERS = {
  bruce: {
    id: 'bruce', name: 'Bruce', glb: 'assets/bruce.glb?v=20261010145517', thumb: 'assets/fighter_bruce.webp?v=20261010145517',
    face: [163, 5, 110],                                           // volto nell'anteprima (x, y, lato) per il tabellone
    skinTint: 0xe3b98f,                                            // pelle piu' abbronzata della texture MakeHuman
    evenSkin: false,                                               // (la schiaritura delle gambe serve solo alla pelle di Mike)
    band: { bg: '#141416', line: '#c99a2e', text: '#e9c46a' },     // fascia nera con scritta dorata
    legs: [{ side: 'left', color: '#e9c46a' }, { side: 'right', color: '#e9c46a', text: '', icon: 'kungfu', scale: 1.5 }],   // il nome sulla coscia sinistra e la sagoma del calcio volante sulla destra, nello stesso oro della scritta HOME BOXING
    // stile: saltella molto (clip "idle" di Blender) e fa finte a vuoto per ingannarti, fluide e coreografiche
    feints: { rate: 1.3, moves: ['feint_jab', 'feint_dip', 'feint_hop', 'feint_jab'], speed: 1.0 },
  },
  mike: {
    id: 'mike', name: 'Mike', glb: 'assets/mike.glb?v=20261010145517', thumb: 'assets/fighter_mike.webp?v=20261010145517',
    face: [178, 0, 110],
    skinTint: null,
    band: { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' },
    legName: { side: 'right', color: '#ffffff', stars: 3 },         // il nome in bianco sulla coscia destra, con tre stelle bianche sotto
  },
  eddy: {
    id: 'eddy', name: 'Eddy', glb: 'assets/eddy.glb?v=20261010145517', thumb: 'assets/fighter_eddy.webp?v=20261010145517',
    face: [182, 52, 110],
    skinTint: null, evenSkin: false, noStubble: true,            // ai lati rasato a zero: niente ombra di capelli sotto la cresta
    band: { bg: '#0b0b0e', line: '#0a8cff', text: '#3fb0ff' },     // fascia nera con scritta blu fosforescente
    glow: ['Raso blu', 'Pelle guantoni', 'Cresta'],                // blu fosforescente: si illumina anche nel buio
    // stile agile: si muove tanto e veloce, schiva di piu', attacca a raffiche; qualche finta saltellando
    mods: { moveSpeed: 1.35, defenseSpeed: 1.15, evade: 0.08, attackEvery: 0.85 },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.15 },
  },
  fury: {
    id: 'fury', name: 'Fury', glb: 'assets/fury.glb?v=20261010145517', thumb: 'assets/fighter_fury.webp?v=20261010145517',
    face: [190, 8, 102],
    skinTint: 0xc99872, evenSkin: false,                           // pelle abbronzata
    // calzoncini thai: fascia dorata larga con il riquadro bianco e la scritta rossa
    band: { bg: '#e3ad25', line: '#b07d10', text: '#c4122a', label: 'FURY', box: '#f6f3ea' },
    // stile: si muove poco ma quando attacca sono combinazioni lunghe e precise
    mods: { moveSpeed: 0.6, defenseSpeed: 1.0, attackEvery: 1.15, extraCombos: ['1-2-3-2', '1-6-3-2', '2-3-2', '1-2-5-2', '3-2-3', '6-3b-3', '1-2-3'] },
  },
  maxim: {
    id: 'maxim', name: 'Maxim', glb: 'assets/maxim.glb?v=20261010145517', thumb: 'assets/fighter_maxim.webp?v=20261010145517',
    face: [192, 34, 100],
    skinTint: null, evenSkin: false, hairTint: '#d9b872',          // biondo
    band: { bg: '#f4f4f0', line: '#c40f22', text: '#c40f22', label: 'MAXIM ★' },
    // stile aggressivo: ti viene addosso, attacca spesso e lavora soprattutto di ganci
    mods: { moveSpeed: 1.15, defenseSpeed: 0.95, attackEvery: 0.7, extraCombos: ['3-4', '3-2-3', '2-3', '1-2-3', '3-2', '2-3-2', '6-3', '1-2-3-2', '3b-4', '3b-3'] },
  },
  brutus: {
    id: 'brutus', name: 'Brutus', glb: 'assets/brutus.glb?v=20261010145517', thumb: 'assets/fighter_brutus.webp?v=20261010145517',
    face: [188, 30, 100],
    skinTint: 0xe8c4a8, evenSkin: false,
    band: { bg: '#7a0f14', line: '#d4a537', text: '#e8c25a', label: 'BRUTUS' },
    mean: { brow: 0.55, squint: 0.3 },                             // sempre accigliato
    fur: '#2b2019',                                                // barba e capelli castano scurissimo, folti
    // stile brutale: viene avanti, attacca spesso, ganci e montanti pesanti (colpisce piu' forte)
    mods: { moveSpeed: 1.0, defenseSpeed: 0.9, attackEvery: 0.75, power: 1.2,
      extraCombos: ['3-4', '6-3', '1-6', '5-2', '6-3b-3', '3-2-3', '1-6-3-2', '1-2-5-2', '3b-4', '6-3'] },
  },
  rocco: {
    id: 'rocco', name: 'Rocco', glb: 'assets/rocco.glb?v=20261010145517', thumb: 'assets/fighter_rocco.webp?v=20261010145517',
    face: [195, 12, 92],
    skinTint: 0xf0d2b8, evenSkin: false, skinGloss: 0.32,           // pelle lucida di sudore
    band: { bg: '#121214', line: '#121214', text: '#f1efe8', label: ' ' },   // fascia nera liscia
    legName: { side: 'right', color: '#121214', icon: 'glove', x: 0.26 },     // il nome in nero sulla coscia destra, con un guantone nero sotto
    hairTint: '#74492b',                                            // castano scuro (le ciocche restano)
    mean: { squint: 0.3 },                                          // palpebre pesanti: sguardo stanco
    // stile da incassatore: incassa tanto (prende meno danno), para poco, va avanti e lavora al corpo
    mods: { moveSpeed: 0.95, defenseSpeed: 0.8, attackEvery: 0.85, toughness: 0.75,
      extraCombos: ['3b-3', '1-3b-3', '2b-3-2', '3b-4', '1-2b', '3-2', '1-2-3'] },
  },
  ace: {
    id: 'ace', name: 'Ace', glb: 'assets/ace.glb?v=20261010145517', thumb: 'assets/fighter_ace.webp?v=20261010145517',
    face: [195, 15, 95],
    skinTint: 0x6e5244, evenSkin: false, skinGloss: 0.4,           // nerissimo, un po' lucido
    fur: '#0c0a09',                                                 // capelli rasati neri (non grigi sulla pelle scura)
    band: { bg: '#f2f1ec', line: '#0c6b3c', text: '#0c6b3c', label: 'ACE ♠' },
    // stile: velocita' pura. Pugni piu' rapidi, si muove tanto, raffiche lunghe di colpi
    mods: { punchSpeed: 1.2, moveSpeed: 1.3, defenseSpeed: 1.1, attackEvery: 0.8,
      extraCombos: ['1-1-2', '1-2-3-2', '1-2-5-2', '1-6-3-2', '2-3-2', '1-2-3', '3-2-3', '1-2-schivata-2-3', '1-2-abbassata-3-2'] },
    feints: { rate: 0.5, moves: ['feint_jab', 'feint_hop'], speed: 1.25 },
  },
  riki: {
    id: 'riki', name: 'Riki', glb: 'assets/riki.glb?v=20261010145517', thumb: 'assets/fighter_riki.webp?v=20261010145517',
    face: [185, 0, 115],
    skinTint: 0xeac39e, evenSkin: false, hairTint: '#141110',          // capelli neri corvini
    band: { bg: '#c4122a', line: '#f4f3ee', text: '#f4f3ee', label: 'RIKI', icon: 'sole' },   // fascia rossa, sol levante
    // stile: potente e tecnico. Colpisce forte, para bene, incassa; combinazioni pulite, poche mosse sprecate
    mods: { power: 1.25, defenseSpeed: 1.15, moveSpeed: 0.85, attackEvery: 0.95, toughness: 0.85,
      extraCombos: ['1-2-3', '1-2-5-2', '2-3-2', '1-6-3-2', '3b-3', '1-2-3-2', '5-2', '1-2b-3'] },
  },
  bob: {
    goatee: true,                                                      // pizzetto: segue il mento, non il labbro di sopra (bocca aperta)
    id: 'bob', name: 'Rob', glb: 'assets/bob.glb?v=20261010145517', thumb: 'assets/fighter_bob.webp?v=20261010145517',
    face: [185, 30, 110],
    skinTint: 0xf2cdb4, evenSkin: false,                               // riccioli biondi (fatti in Blender, colore gia' nel modello)
    fur: '#e2c27a',                                                     // pizzetto e base dei riccioli: stesso biondo dei capelli
    band: { bg: '#f2c230', line: '#b5161c', text: '#b5161c', label: 'ROB', icon: 'panino' },
    // stile: lento e pesante, ma quando prende fa male. Incassa tanto (la pancia), ganci larghi e montanti
    mods: { power: 1.35, moveSpeed: 0.75, defenseSpeed: 0.85, attackEvery: 1.0, toughness: 0.8,
      extraCombos: ['3-4', '6-3', '2-3', '1-6', '3b-4', '3-2-3', '5-6'] },
  },
  // ---- i cinque nuovi (2026-10-04): presentazione generica + nome
  diego: {
    goatee: true,                                                      // pizzetto: segue il mento, non il labbro di sopra (bocca aperta)
    id: 'diego', name: 'Diego', glb: 'assets/diego.glb?v=20261010145517', thumb: 'assets/fighter_diego.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // messicano, 1,72 m, 70 kg. "El Toro": basso e compatto, ti pressa sempre e lavora al corpo (ganci al fegato)
    skinTint: 0xd6a57c, evenSkin: false,
    band: { bg: '#111112', line: '#d4a42c', text: '#d4a42c', label: 'EL TORO' },
    legName: { side: 'right', color: '#d4a42c', x: 0.24 },                     // il nome sulla coscia destra, in oro
    mods: { moveSpeed: 1.2, defenseSpeed: 0.95, attackEvery: 0.7, toughness: 0.85,
      extraCombos: ['3b-3', '1-3b-3', '2b-3-2', '3b-4', '1-2b', '3b-3b', '2-3b-3', '1-2-3b'] },
  },
  kwame: {
    id: 'kwame', name: 'Kwame', glb: 'assets/kwame.glb?v=20261010145517', thumb: 'assets/fighter_kwame.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // ghanese, 1,88 m, 95 kg. "Il Leone": contrattaccante. Aspetta, para benissimo e ti punisce con il destro
    skinTint: null, evenSkin: false, fur: '#0b0908',
    band: { bg: '#f2b705', line: '#121212', text: '#121212', label: 'KWAME' },
    legName: { side: 'left', color: '#121212', text: '', icon: 'lion', scale: 1.5 },    // il leone sulla coscia sinistra
    mods: { power: 1.3, defenseSpeed: 1.25, moveSpeed: 0.8, attackEvery: 1.25, toughness: 0.9,
      extraCombos: ['2', '1-2', '2-3', '3-2', '2-3-2', '5-2', '1-2-3'] },
  },
  lars: {
    id: 'lars', name: 'Lars', glb: 'assets/lars.glb?v=20261010145517', thumb: 'assets/fighter_lars.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // norvegese, 1,98 m, 112 kg, tatuaggi vichinghi e coda rossa. Ti tiene lontano con un jab lunghissimo
    skinTint: null, evenSkin: false, fur: '#9c5226', hairTint: '#b0602a',        // rosso rame
    band: { bg: '#2c3540', line: '#c9d6e2', text: '#c9d6e2', label: 'LARS' },
    legName: { side: 'right', color: '#c9d6e2', text: '', icon: 'hammer', scale: 1.8 },   // il martello grande sulla coscia destra
    mods: { power: 1.15, moveSpeed: 0.85, defenseSpeed: 0.95, attackEvery: 0.85,
      extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1', '1-1', '1-2', '1-6'] },
  },
  malik: {
    id: 'malik', name: 'Malik', glb: 'assets/malik.glb?v=20261010145517', thumb: 'assets/fighter_malik.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // marocchino, 1,76 m, 64 kg. "Il Falco": leggero, gambe velocissime, schiva tutto e ti punge di rimessa
    skinTint: 0xc99a70, evenSkin: false, fur: '#15110e',
    band: { bg: '#5b2a86', line: '#d9d9de', text: '#d9d9de', label: 'MALIK' },
    mods: { punchSpeed: 1.15, moveSpeed: 1.4, defenseSpeed: 1.25, evade: 0.14, attackEvery: 1.0, power: 0.85,
      extraCombos: ['1-1', '1-2', '1-1-2', '2-3', '1-2-schivata-2-3', '1-2-abbassata-3-2'] },
    feints: { rate: 0.8, moves: ['feint_jab', 'feint_dip', 'feint_hop'], speed: 1.2 },
  },
  connor: {
    id: 'connor', name: 'Connor', glb: 'assets/connor.glb?v=20261010145517', thumb: 'assets/fighter_connor.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // irlandese, 1,83 m, 82 kg, rosso con le lentiggini. Rissaiolo instancabile: ganci larghi, para poco, non molla mai
    skinTint: null, evenSkin: false, hairTint: '#a8441c',               // capelli rossi
    band: { bg: '#0f7a3c', line: '#f4f3ee', text: '#f4f3ee', label: 'CONNOR' },
    mods: { moveSpeed: 1.05, defenseSpeed: 0.8, attackEvery: 0.62, toughness: 0.8, power: 1.1,
      extraCombos: ['3-4', '3-2-3', '2-3-2', '1-2-3-4', '4-3', '3-4-3', '2-3'] },
  },
  // ---- altri cinque (2026-10-05): presentazione generica + nome
  tavita: {
    id: 'tavita', name: 'Tavita', glb: 'assets/tavita.glb?v=20261010145517', thumb: 'assets/fighter_tavita.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // samoano, 1,86 m, 118 kg, tatuaggi tribali. Il picchiatore: lento, incassa tutto, ma i suoi ganci ti spengono
    skinTint: 0xb98a62, evenSkin: false,
    band: { bg: '#0b6e7a', line: '#f2f1ec', text: '#f2f1ec', label: 'TAVITA' },
    mods: { power: 1.45, punchSpeed: 0.9, moveSpeed: 0.7, defenseSpeed: 0.8, attackEvery: 1.1, toughness: 0.72,
      extraCombos: ['3', '4', '3-4', '2-3', '6-3', '3b-3', '1-3-4', '4-3'] },
  },
  arjun: {
    id: 'arjun', name: 'Arjun', glb: 'assets/arjun.glb?v=20261010145517', thumb: 'assets/fighter_arjun.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // indiano, 1,81 m, 80 kg. Il tecnico: gambe leggere, jab continuo, ti tiene alla distanza e conta i punti
    skinTint: 0xd29c74, evenSkin: false,
    band: { bg: '#ff8c1a', line: '#1b3f8f', text: '#1b3f8f', label: 'ARJUN' },
    mods: { punchSpeed: 1.1, moveSpeed: 1.25, defenseSpeed: 1.15, evade: 0.06, attackEvery: 0.9, power: 0.9,
      extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1', '2-1-2', '1-2-3', '1-1-2-schivata-2'] },
    feints: { rate: 0.7, moves: ['feint_jab', 'feint_jab', 'feint_dip'], speed: 1.15 },
  },
  moussa: {
    id: 'moussa', name: 'Moussa', glb: 'assets/moussa.glb?v=20261010145517', thumb: 'assets/fighter_moussa.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // senegalese, 2,01 m, 92 kg. Il lungo: braccia infinite, guardia bassa e calma, e quando entri ti aspetta il montante
    skinTint: null, evenSkin: false,
    band: { bg: '#e6b422', line: '#0e0e10', text: '#0e0e10', label: 'MOUSSA' },
    mods: { power: 1.1, moveSpeed: 1.0, defenseSpeed: 1.2, attackEvery: 1.15,
      extraCombos: ['5', '6', '1-6', '2-5', '5-6', '6-3', '1-2-5', '3-6', '1-schivata-6'] },
  },
  mateo: {
    id: 'mateo', name: 'Mateo', glb: 'assets/mateo.glb?v=20261010145517', thumb: 'assets/fighter_mateo.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // argentino, 1,79 m, 76 kg. Il martello: ti viene sempre addosso, non smette mai di lavorare al corpo
    skinTint: 0xe8bf98, evenSkin: false,
    band: { bg: '#6cace4', line: '#f4f3ee', text: '#f4f3ee', label: 'MATEO' },
    gloveLetter: { text: 'M', color: '#6cace4' },                   // l'iniziale sul davanti dei guantoni, dello stesso celeste dei calzoncini
    mods: { moveSpeed: 1.25, defenseSpeed: 0.9, attackEvery: 0.6, toughness: 0.85,
      extraCombos: ['1-2b', '3b-3', '2b-3', '1-3b-3', '3b-4b', '2-3b-2', '1-2-3b-3', '4b-3'] },
  },
  joon: {
    id: 'joon', name: 'Joon', glb: 'assets/joon.glb?v=20261010145517', thumb: 'assets/fighter_joon.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // coreano, 1,74 m, 68 kg. Il fulmine: mani velocissime, raffiche di quattro o cinque colpi e via
    skinTint: 0xe8c39c, evenSkin: false,
    band: { bg: '#e0218a', line: '#f4f3ee', text: '#f4f3ee', label: 'JOON' },
    mods: { punchSpeed: 1.25, moveSpeed: 1.35, defenseSpeed: 1.2, attackEvery: 0.7, power: 0.8,
      extraCombos: ['1-2-1-2', '1-1-2', '1-2-3-2', '3-2-3', '1-2-1', '2-3-2-3', '1-1-2-3', '1-2-1-2-3'] },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.25 },
  },
  // ---- altri sedici (2026-10-05): con loro il torneo da 32 e' tutto di personaggi veri
  ink: {
    id: 'ink', name: 'Ink', glb: 'assets/ink.glb?v=20261010145517', thumb: 'assets/fighter_ink.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // tedesco, 1,84 m, 84 kg, tatuato dalla testa ai piedi. Imprevedibile: entra a testa bassa e cambia ritmo di continuo
    skinTint: null, evenSkin: false,
    band: { bg: '#0c0c0e', line: '#b0121b', text: '#b0121b', label: 'INK' },
    mods: { power: 1.15, moveSpeed: 1.1, attackEvery: 0.7, toughness: 0.9, extraCombos: ['1-3', '3-2-3', '2-3b', '1-2-3-2', '3b-3-2', '6-3-2', '1-1-3'] },
    feints: { rate: 0.5, moves: ['feint_dip', 'feint_jab'], speed: 1.1 },
  },
  thiago: {
    id: 'thiago', name: 'Thiago', glb: 'assets/thiago.glb?v=20261010145517', thumb: 'assets/fighter_thiago.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // brasiliano, 1,80 m, 79 kg. La ginga: ondeggia a tempo di musica, ti fa sbagliare e risponde
    skinTint: 0xd6a27a, evenSkin: false,
    band: { bg: '#009c3b', line: '#ffdf00', text: '#ffdf00', label: 'THIAGO' },
    mods: { moveSpeed: 1.2, defenseSpeed: 1.2, evade: 0.07, attackEvery: 0.95, extraCombos: ['1-schivata-2', '2-3', '1-2-5', '5-2', 'schivata-3-2', '1-6-3'] },
    feints: { rate: 0.8, moves: ['feint_dip', 'feint_hop'], speed: 1.1 },
  },
  danilo: {
    id: 'danilo', name: 'Danilo', glb: 'assets/danilo.glb?v=20261010145517', thumb: 'assets/fighter_danilo.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // filippino, 1,65 m, 63 kg. Il tornado: piccolo, velocissimo, entra con quattro colpi ed e' gia' fuori
    skinTint: 0xd9a982, evenSkin: false,
    band: { bg: '#0038a8', line: '#fcd116', text: '#fcd116', label: 'DANILO' },
    mods: { punchSpeed: 1.3, moveSpeed: 1.45, defenseSpeed: 1.15, attackEvery: 0.65, power: 0.8, evade: 0.05, extraCombos: ['1-2-1-2', '2-3-2', '1-1-2-3', '3-2-3-2', '1-2-3b-3', '2-1-2'] },
    feints: { rate: 0.7, moves: ['feint_hop', 'feint_jab'], speed: 1.3 },
  },
  emeka: {
    id: 'emeka', name: 'Emeka', glb: 'assets/emeka.glb?v=20261010145517', thumb: 'assets/fighter_emeka.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // nigeriano, 1,93 m, 108 kg. Il re leone: lento e calmo, ma il suo destro chiude gli incontri
    skinTint: null, evenSkin: false,
    band: { bg: '#008751', line: '#f4f3ee', text: '#f4f3ee', label: 'EMEKA' },
    mods: { power: 1.5, punchSpeed: 0.85, moveSpeed: 0.8, defenseSpeed: 0.9, attackEvery: 1.15, toughness: 0.75, extraCombos: ['2', '3', '2-3', '1-2', '6', '2-6', '3-2'] },
  },
  taras: {
    id: 'taras', name: 'Taras', glb: 'assets/taras.glb?v=20261010145517', thumb: 'assets/fighter_taras.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // ucraino, 1,98 m, 108 kg, biondo. Il professore: jab lungo come un palo, ti tiene sempre alla sua distanza
    skinTint: null, evenSkin: false, hairTint: '#c9a46a',
    band: { bg: '#0057b7', line: '#ffd700', text: '#ffd700', label: 'TARAS' },
    mods: { power: 1.2, punchSpeed: 0.95, moveSpeed: 0.95, defenseSpeed: 1.15, attackEvery: 0.95, extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1', '1-2-3'] },
  },
  javi: {
    goatee: true,                                                      // pizzetto: segue il mento, non il labbro di sopra (bocca aperta)
    id: 'javi', name: 'Javi', glb: 'assets/javi.glb?v=20261010145517', thumb: 'assets/fighter_javi.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // portoricano, 1,75 m, 70 kg, pizzetto. Il bandido: furbo, ti fa alzare la guardia e ti colpisce al fegato
    skinTint: 0xdcae86, evenSkin: false,
    band: { bg: '#ed0000', line: '#f4f3ee', text: '#f4f3ee', label: 'JAVI' },
    mods: { moveSpeed: 1.2, defenseSpeed: 1.1, attackEvery: 0.8, extraCombos: ['3b', '1-3b', '2-3b', '3b-3', '1-2-3b', '3b-4b', '4b-3'] },
    feints: { rate: 0.6, moves: ['feint_jab', 'feint_dip'], speed: 1.15 },
  },
  bastien: {
    id: 'bastien', name: 'Bastien', glb: 'assets/bastien.glb?v=20261010145517', thumb: 'assets/fighter_bastien.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // francese, 1,82 m, 78 kg, coda di cavallo. Il moschettiere: elegante, finte continue e jab di fioretto
    skinTint: null, evenSkin: false, hairTint: '#3a2416',
    band: { bg: '#002654', line: '#f4f3ee', text: '#f4f3ee', label: 'BASTIEN' },
    mods: { punchSpeed: 1.1, moveSpeed: 1.2, defenseSpeed: 1.2, evade: 0.05, attackEvery: 0.95, power: 0.9, extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1-2', '1-schivata-2'] },
    feints: { rate: 0.9, moves: ['feint_jab', 'feint_jab', 'feint_dip'], speed: 1.15 },
  },
  nurlan: {
    id: 'nurlan', name: 'Nurlan', glb: 'assets/nurlan.glb?v=20261010145517', thumb: 'assets/fighter_nurlan.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // kazako, 1,78 m, 75 kg. Il lupo della steppa: avanza sempre, ganci pesanti alla testa e al corpo
    skinTint: 0xe0b48e, evenSkin: false,
    band: { bg: '#00afca', line: '#fec50c', text: '#fec50c', label: 'NURLAN' },
    mods: { power: 1.25, moveSpeed: 1.15, defenseSpeed: 0.95, attackEvery: 0.75, toughness: 0.85, extraCombos: ['1-3', '3-3b', '1-2-3', '3-2-3', '1-3-2', '3b-3-2'] },
  },
  kerem: {
    goatee: true,                                                      // pizzetto: segue il mento, non il labbro di sopra (bocca aperta)
    id: 'kerem', name: 'Kerem', glb: 'assets/kerem.glb?v=20261010145517', thumb: 'assets/fighter_kerem.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // turco, 1,85 m, 95 kg, peloso e col pizzetto. Il toro: fisico da lottatore, ti spinge all'angolo e lavora di ganci
    skinTint: 0xe2b590, evenSkin: false,
    band: { bg: '#e30a17', line: '#f4f3ee', text: '#f4f3ee', label: 'KEREM' },
    mods: { power: 1.25, moveSpeed: 1.0, defenseSpeed: 0.85, attackEvery: 0.85, toughness: 0.7, extraCombos: ['3', '3-4', '3b-3', '2-3', '1-3-4', '4-3'] },
  },
  karim: {
    id: 'karim', name: 'Karim', glb: 'assets/karim.glb?v=20261010145517', thumb: 'assets/fighter_karim.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // egiziano, 1,83 m, 82 kg, cicatrici sulle arcate. Il faraone: guardia bassa di spalla, aspetta il tuo errore e contrattacca
    skinTint: 0xc8956a, evenSkin: false,
    band: { bg: '#0e0e10', line: '#c9a227', text: '#c9a227', label: 'KARIM' },
    mods: { defenseSpeed: 1.3, evade: 0.07, attackEvery: 1.05, punchSpeed: 1.1, extraCombos: ['2', '1-schivata-2', '2-3', 'schivata-2-3', '1-2', '6-2'] },
  },
  logan: {
    id: 'logan', name: 'Hogan', glb: 'assets/logan.glb?v=20261010145517', thumb: 'assets/fighter_logan.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // canadese, 1,90 m, 120 kg, basettoni alla Wolverine. Il boscaiolo: lento, incassa di tutto e picchia come un'ascia
    skinTint: 0xf0c6a4, evenSkin: false, hairTint: '#3a2414',
    band: { bg: '#d52b1e', line: '#0e0e10', text: '#0e0e10', label: 'HOGAN' },
    mods: { power: 1.35, punchSpeed: 0.85, moveSpeed: 0.7, defenseSpeed: 0.75, attackEvery: 1.05, toughness: 0.6, extraCombos: ['3', '4', '3-4', '2-3', '3-4-3', '6-3'] },
  },
  kuba: {
    id: 'kuba', name: 'Kuba', glb: 'assets/kuba.glb?v=20261010145517', thumb: 'assets/fighter_kuba.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // polacco, 1,88 m, 96 kg, 41 anni, capelli grigi. Il veterano: ha visto tutto, para quasi tutto e non spreca un colpo
    skinTint: null, evenSkin: false, hairTint: '#9a9794',
    band: { bg: '#f4f3ee', line: '#dc143c', text: '#dc143c', label: 'KUBA' },
    mods: { defenseSpeed: 1.35, moveSpeed: 0.85, attackEvery: 1.0, toughness: 0.8, extraCombos: ['1-2', '1-1-2', '2-3', '1-2-3', '1-6-3'] },
  },
  desmond: {
    id: 'desmond', name: 'Desmond', glb: 'assets/desmond.glb?v=20261010145517', thumb: 'assets/fighter_desmond.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // giamaicano, 1,87 m, 86 kg, capelli afro. Il serpente: sciolto, braccia lunghe, montanti che arrivano dal basso
    skinTint: null, evenSkin: false,
    band: { bg: '#009b3a', line: '#fed100', text: '#fed100', label: 'DESMOND' },
    mods: { power: 1.1, moveSpeed: 1.15, defenseSpeed: 1.0, attackEvery: 0.9, extraCombos: ['5', '6', '1-6', '2-5', '6-3', '5-6-3', '1-2-5'] },
    feints: { rate: 0.5, moves: ['feint_dip'], speed: 1.1 },
  },
  ante: {
    id: 'ante', name: 'Ante', glb: 'assets/ante.glb?v=20261010145517', thumb: 'assets/fighter_ante.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // croato, 2,03 m, 115 kg. La torre: il piu' alto di tutti, uno-due dritti dall'alto
    skinTint: null, evenSkin: false, hairTint: '#6b4a2e',
    band: { bg: '#ff0000', line: '#f4f3ee', text: '#f4f3ee', label: 'ANTE' },
    mods: { power: 1.3, punchSpeed: 0.9, moveSpeed: 0.85, defenseSpeed: 1.0, attackEvery: 1.0, extraCombos: ['1-2', '2', '1-1-2', '1-2-1-2', '2-3-2'] },
  },
  batu: {
    id: 'batu', name: 'Batu', glb: 'assets/batu.glb?v=20261010145517', thumb: 'assets/fighter_batu.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // mongolo, 1,72 m, 90 kg, testa rasata. Il khan: basso e tozzo come un lottatore, ti si incolla addosso
    skinTint: 0xe0b48e, evenSkin: false,
    band: { bg: '#c4272f', line: '#f9cf02', text: '#f9cf02', label: 'BATU' },
    mods: { power: 1.25, moveSpeed: 1.0, defenseSpeed: 0.85, attackEvery: 0.8, toughness: 0.65, extraCombos: ['3b', '4b', '3b-3', '4b-4', '6-3', '3-4-3', '1-3b-3'] },
  },
  camilo: {
    id: 'camilo', name: 'Camilo', glb: 'assets/camilo.glb?v=20261010145517', thumb: 'assets/fighter_camilo.webp?v=20261010145517', genericIntro: true,
    face: [185, 30, 110],
    // colombiano, 1,77 m, 72 kg, 20 anni, riccio. Il colibri': giovane e sfrontato, raffiche velocissime
    skinTint: 0xd9a57c, evenSkin: false,
    band: { bg: '#fcd116', line: '#003893', text: '#003893', label: 'CAMILO' },
    mods: { punchSpeed: 1.2, moveSpeed: 1.35, defenseSpeed: 1.05, attackEvery: 0.7, power: 0.85, extraCombos: ['1-2-3', '1-2-1-2', '2-3-2', '1-1-2-3', '3-2-3-2', '1-2-3-4'] },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.25 },
  },
};
export const FIGHTER_IDS = ['bruce', 'mike', 'eddy', 'fury', 'maxim', 'brutus', 'rocco', 'ace', 'riki', 'bob', 'diego', 'kwame', 'lars', 'malik', 'connor', 'tavita', 'arjun', 'moussa', 'mateo', 'joon',
  'ink', 'thiago', 'danilo', 'emeka', 'taras', 'javi', 'bastien', 'nurlan', 'kerem', 'karim', 'logan', 'kuba', 'desmond', 'ante', 'batu', 'camilo'];
