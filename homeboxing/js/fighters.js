// Voci: in tools/gen_voices.py (FIGHTERS) intro_<id> (descrizione) e name_<id> (nome) per ogni pugile.
// Gli avversari: modello (blender/create_mike.py char=...), anteprima per il menu e dettagli di aspetto.
// Ruolo nel gioco sempre lo stesso ("mike" nel codice = l'avversario); qui cambiano nome e aspetto.
export const FIGHTERS = {
  bruce: {
    id: 'bruce', name: 'Bruce', glb: 'assets/bruce.glb?v=20261003130016', thumb: 'assets/fighter_bruce.webp?v=20261003130016',
    skinTint: 0xe3b98f,                                            // pelle piu' abbronzata della texture MakeHuman
    evenSkin: false,                                               // (la schiaritura delle gambe serve solo alla pelle di Mike)
    band: { bg: '#141416', line: '#c99a2e', text: '#e9c46a' },     // fascia nera con scritta dorata
  },
  mike: {
    id: 'mike', name: 'Mike', glb: 'assets/mike.glb?v=20261003130016', thumb: 'assets/fighter_mike.webp?v=20261003130016',
    skinTint: null,
    band: { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' },
  },
};
export const FIGHTER_IDS = ['bruce', 'mike'];
