// Lingua del gioco: italiano o inglese. All'inizio segue la lingua del sistema; dal menu si puo' cambiare
// (la scelta resta salvata). Scritte e voci (game/assets/voce/it, .../en) seguono la stessa lingua.
const STR = {
  it: {
    menu_sub: 'tieni un guantone sul pulsante', where: 'DOVE', m_stanza: 'La tua stanza', m_arena: 'Nell\'arena', m_spiaggia: 'In spiaggia',
    level: 'LIVELLO', l_facile: 'Facile', l_normale: 'Normale', l_difficile: 'Difficile', l_impossibile: 'Impossibile',
    rounds: 'ROUND', duration: 'DURATA DI UN ROUND', rule3: 'REGOLA DEI 3 ATTERRAMENTI', yes: 'Sì', no: 'No', language: 'LINGUA',
    start: 'INIZIA INCONTRO', quit: 'ESCI DAL GIOCO',
    next_title: 'ROUND {n} TRA {s} s', next_btn: 'VAI AL PROSSIMO ROUND',
    pause: 'PAUSA', fight_over: 'FINE INCONTRO', resume: 'RIPRENDI', restart: 'RICOMINCIA', menu_btn: 'MENU',
    getup_title: 'COLPISCI {n} VOLTE PER RIALZARTI', getup_left: 'ancora {n}',
    you: 'TU', stats: 'Colpi {h} · Parate {b} · Schivate {d}', down_times: 'A terra {n} {v}', once: 'volta', times: 'volte', penalties: 'Penalità {n}/3',
    round_of: 'Round {r} di {n}', mike_down: 'MIKE E\' A TERRA!',
    you_down_hit: 'SEI A TERRA! Colpisci {n} volte il bottone per rialzarti', you_down_out: 'SEI A TERRA… non hai più energia',
    third_kd: '{who}: terzo atterramento, l\'arbitro ferma l\'incontro!', who_you: 'Tu', who_mike: 'Mike',
    is_up: 'in piedi', is_down: 'a terra', hit_button: ' · colpisci il bottone! ({n})', up_after8: 'In piedi! Si riprende dopo l\'8',
    win_you: 'HAI VINTO per {how}!', win_mike: 'Vince Mike per {how}', draw: 'Pareggio ai punti ({pts})',
    how_KO: 'KO', how_TKO: 'KO tecnico', how_DQ: 'squalifica', how_PTS: 'decisione ai punti',
    dq3: 'Terzo colpo basso: SQUALIFICATO!', lowblow: 'Colpo basso! Penalità {p} di 3',
    you_head: 'Tu: colpo alla testa +2', you_body: 'Tu: colpo al corpo +1', mike_blocks: 'Mike para', mike_dodges: 'Mike schiva',
    mike_body: 'Mike: colpo al corpo +1', mike_head: 'Mike: colpo alla testa +2', blocked: 'Parata!', dodged: 'Schivata!',
    choose_menu: 'Scegli dal menu davanti a te', starts_in: 'Round {r} di {n} · si comincia tra {s}…',
    low_ring: 'Ring basso? Accovacciati e tieni una mano a terra 2 s · {s}', pause_hint: 'Pausa: alza le due mani all\'altezza della fronte · {s}',
    rest: 'Riposo all\'angolo · round {r} tra {s} s', menu: 'Menu', floor_fixed: 'Pavimento sistemato!', presenting: 'Presentazione dei pugili…',
    diag: 'ring {m} m · pavimento: {f} · occhi a {e} m da terra',
    loading: 'Caricamento gioco… {p}%', play: 'Gioca', no_xr: 'Questo browser non supporta la realtà mista: usa il browser del Quest 3 (oppure prova l\'anteprima su PC).',
    load_err: 'Errore nel caricamento di Mike: {e}', xr_err: 'Impossibile entrare in realtà mista: {e}',
  },
  en: {
    menu_sub: 'hold a glove on a button', where: 'WHERE', m_stanza: 'Your room', m_arena: 'Arena', m_spiaggia: 'Beach',
    level: 'LEVEL', l_facile: 'Easy', l_normale: 'Normal', l_difficile: 'Hard', l_impossibile: 'Impossible',
    rounds: 'ROUNDS', duration: 'ROUND LENGTH', rule3: 'THREE KNOCKDOWN RULE', yes: 'Yes', no: 'No', language: 'LANGUAGE',
    start: 'START FIGHT', quit: 'EXIT GAME',
    next_title: 'ROUND {n} IN {s} s', next_btn: 'GO TO NEXT ROUND',
    pause: 'PAUSED', fight_over: 'FIGHT OVER', resume: 'RESUME', restart: 'RESTART', menu_btn: 'MENU',
    getup_title: 'HIT IT {n} TIMES TO GET UP', getup_left: '{n} to go',
    you: 'YOU', stats: 'Hits {h} · Blocks {b} · Dodges {d}', down_times: 'Down {n} {v}', once: 'time', times: 'times', penalties: 'Penalties {n}/3',
    round_of: 'Round {r} of {n}', mike_down: 'MIKE IS DOWN!',
    you_down_hit: 'YOU\'RE DOWN! Hit the button {n} times to get up', you_down_out: 'YOU\'RE DOWN… no energy left',
    third_kd: '{who}: third knockdown, the referee stops the fight!', who_you: 'You', who_mike: 'Mike',
    is_up: 'up', is_down: 'down', hit_button: ' · hit the button! ({n})', up_after8: 'Up! The fight resumes after eight',
    win_you: 'YOU WIN by {how}!', win_mike: 'Mike wins by {how}', draw: 'Draw on points ({pts})',
    how_KO: 'knockout', how_TKO: 'technical knockout', how_DQ: 'disqualification', how_PTS: 'decision on points',
    dq3: 'Third low blow: DISQUALIFIED!', lowblow: 'Low blow! Penalty {p} of 3',
    you_head: 'You: head shot +2', you_body: 'You: body shot +1', mike_blocks: 'Mike blocks', mike_dodges: 'Mike dodges',
    mike_body: 'Mike: body shot +1', mike_head: 'Mike: head shot +2', blocked: 'Blocked!', dodged: 'Dodged!',
    choose_menu: 'Choose from the menu in front of you', starts_in: 'Round {r} of {n} · starting in {s}…',
    low_ring: 'Ring too low? Crouch and keep a hand on the floor for 2 s · {s}', pause_hint: 'Pause: raise both hands to forehead height · {s}',
    rest: 'Resting in the corner · round {r} in {s} s', menu: 'Menu', floor_fixed: 'Floor adjusted!', presenting: 'Introducing the fighters…',
    diag: 'ring {m} m · floor: {f} · eyes {e} m above the floor',
    loading: 'Loading game… {p}%', play: 'Play', no_xr: 'This browser does not support mixed reality: use the Quest 3 browser (or try the PC preview).',
    load_err: 'Error loading Mike: {e}', xr_err: 'Could not start mixed reality: {e}',
  },
};

function detect() {
  try { const s = localStorage.getItem('hb-lang'); if (s === 'it' || s === 'en') return s; } catch (e) {}
  const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^it\b/i.test(l) ? 'it' : 'en';
}
export let lang = detect();
const listeners = [];
export function onLang(f) { listeners.push(f); }
export function setLang(l) {
  if (l !== 'it' && l !== 'en' || l === lang) return;
  lang = l;
  try { localStorage.setItem('hb-lang', l); } catch (e) {}
  for (const f of listeners) f(l);
}
// t('chiave', { var: valore }) -> testo nella lingua attuale
export function t(key, vars) {
  let s = (STR[lang] && STR[lang][key]) ?? STR.it[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
