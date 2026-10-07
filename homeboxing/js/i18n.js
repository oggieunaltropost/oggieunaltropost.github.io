// Lingua del gioco: italiano o inglese. All'inizio segue la lingua del sistema; dal menu si puo' cambiare
// (la scelta resta salvata). Scritte e voci (game/assets/voce/it, .../en) seguono la stessa lingua.
const STR = {
  it: {
    menu_sub: 'tieni un guantone sul pulsante', where: 'DOVE', m_stanza: 'La tua stanza', m_arena: 'Nell\'arena', m_spiaggia: 'In spiaggia', m_grattacielo: 'Grattacielo', m_notte: 'Città di notte', m_deserto: 'Nel deserto', m_neve: 'Nella neve', m_vulcano: 'Vulcano', m_mare: 'Sotto il mare', m_luna: 'Sulla Luna', options: 'Opzioni', options_title: 'OPZIONI', roster: 'Lottatori', roster_title: 'LOTTATORI', vibration: 'VIBRAZIONE DEI CONTROLLER', pause_change: 'CAMBIA ALLENAMENTO', loading_short: 'Caricamento…', pointer: 'PUNTATORE', pt_left: 'Mano sinistra', pt_right: 'Mano destra', pt_both: 'Entrambe', cue_body: 'CORPO', dm_random: 'CASUALE (TUTTI I COLPI)', dm_pick: 'OPPURE SCEGLI I COLPI', dm_start: 'INIZIA', dm_type: 'COSA ALLENI', dm_guard: 'TORNA IN GUARDIA', dt_para: 'Para', dt_schiva: 'Schiva', dt_entrambi: 'Entrambi', dk_jab: 'Jab', dk_cross: 'Diretto', dk_hook_l: 'Gancio sx', dk_hook_r: 'Gancio dx', dk_upper_l: 'Montante sx', dk_upper_r: 'Montante dx', dk_body: 'Ganci al corpo', m_palestra: 'In palestra',
    level: 'LIVELLO', l_facile: 'Facile', l_normale: 'Normale', l_difficile: 'Difficile', l_impossibile: 'Impossibile',
    rounds: 'ROUND', duration: 'DURATA DI UN ROUND', rule3: 'REGOLA DEI 3 ATTERRAMENTI', rule1: 'UN KO, FINE PARTITA', yes: 'Sì', no: 'No', language: 'LINGUA',
    start: 'INIZIA INCONTRO', quit: 'ESCI DAL GIOCO',
    next_title: 'ROUND {n} TRA {s} s', next_btn: 'VAI AL PROSSIMO ROUND',
    intro_title: 'IL MATCH INIZIA TRA {s} s', skip_intro: 'INIZIA SUBITO',
    mode_title: 'MODALITÀ DI GIOCO', m_arcade: 'Arcade', m_training: 'Allenamento', soon: 'presto', training: 'ALLENAMENTO', tr_bag: 'Sacco', tr_speed: 'Speed bag', tr_double: 'Double end bag', tr_rope: 'Corda', tr_slip: 'Spago', slip_title: 'SPAGO: PASSACI SOTTO', slip_pass: 'PASSAGGI', slip_touch: 'TOCCATO', slip_h: 'ALTEZZA', bag_title: 'ALLENAMENTO AL SACCO', bag_time: 'TEMPO', bag_hits: 'COLPI A SEGNO', bag_best: 'COLPO PIÙ FORTE', bag_rate: 'COLPI AL MINUTO', rope_title: 'SALTO DELLA CORDA', speed_title: 'PERA VELOCE', de_title: 'PALLA A DOPPIO ELASTICO', tr_spar: 'Sparring', sp_title: 'SPARRING', sp_libero: 'LIBERO', sp_combo: 'COMBINAZIONI', sp_difesa: 'DIFESA', sp_choose: 'ESERCIZIO A SCELTA', sp_ok: 'GIUSTE', sp_wrong: 'SBAGLIATE', sp_avoided: 'EVITATI', sp_taken: 'PRESI', sp_guard: 'IN GUARDIA', sp_landed: 'A SEGNO', sp_defended: 'PARATI', sp_dodged: 'SCHIVATI', sp_speed: 'VELOCITÀ', sp_hint: 'Velocità del partner: tieni il guantone sul pomello della barra e trascinalo', de_taken: 'TI HA COLPITO', speed_hits: 'A SEGNO', speed_miss: 'A VUOTO', speed_acc: 'PRECISIONE', rope_jumps: 'SALTI', rope_errors: 'ERRORI', rope_streak: 'DI FILA', rope_best: 'RECORD DI FILA', m_tour: 'Torneo', m_surv: 'La torre', surv: 'LA TORRE', start_surv: 'INIZIA LA SCALATA', sv_title: 'LA TORRE', sv_quit: 'ESCI DALLA TORRE', sv_floor: 'PIANO {n}', sv_next: 'Piano {n}: TU contro {b}', sv_won: 'Hai battuto {b}! Si sale!', sv_lost: 'Sconfitto da {b} al piano {n}', sv_champ: 'HAI CONQUISTATO LA TORRE!', bn_surv: 'LA TORRE',
    arcade: 'ARCADE', watch_title: 'GUARDA UN INCONTRO', w_red: 'ANGOLO ROSSO', w_blue: 'ANGOLO BLU', tour: 'TORNEO', stage: 'STAGE', m_random: 'Arena random', f_random: 'Random', cpu_vs: '{a} contro {b}', back: 'INDIETRO', start_tour: 'INIZIA TORNEO',
    tr_title: 'TORNEO HOME BOXING', tr_r64: 'Trentaduesimi di finale', tr_r32: 'Sedicesimi di finale', tr_n: 'PARTECIPANTI', tr_size: '{n} PUGILI', tw_n: 'PIANI DELLA TORRE', tw_size: '{n} PIANI', tr_r16: 'Ottavi di finale', tr_qf: 'Quarti di finale',
    tr_sf: 'Semifinale', tr_f: 'Finale', tr_next: '{round}: TU contro {b}', tr_fight: 'COMBATTI', tr_quit: 'ESCI DAL TORNEO',
    tr_menu: 'TORNA AL MENU', feint_bit: 'Finta! Ci sei cascato', you_counter: 'CONTRATTACCO! Colpo pieno', mike_counter: 'Ti ha preso in contrattacco!', adapted: '{b} HA CAPITO IL TUO GIOCO: cambia stile!', tr_watch_rest: 'GUARDA GLI ALTRI', tr_champ: 'CAMPIONE DEL TORNEO!', tr_lost: 'Eliminato da {b} ({round})', tr_adv: '{round}: hai vinto, passi il turno!',
    tr_cpu: '{round}: {a} contro {b} - vuoi guardarlo?', tr_watch: 'GUARDA L\'INCONTRO', tr_continue: 'CONTINUA', tr_skip: 'VAI AL RISULTATO', tr_skipfight: 'SALTA', watch: 'GUARDA', watch_tour: 'GUARDA IL TORNEO', tr_next_round: 'TURNO SUCCESSIVO', tr_adv_spec: '{round}: ecco chi passa il turno', tr_cpu_res: '{round}: passa {b}!', tr_champ_spec: '{b} VINCE IL TORNEO!',
    pause: 'PAUSA', out_ring: 'Sei uscito dal ring: rientra per riprendere', out_warn: 'AMMONIZIONE! Penalità {p} di 3: rientra nel ring per riprendere', dq_out: 'Terza penalità: SQUALIFICATO!', bn_red: 'ANGOLO ROSSO', bn_you: 'TU', bn_go: 'FORZA {NAME}!', bn_champ: 'CAMPIONATO DEI PESI MASSIMI', bn_tour: 'TORNEO DEI PESI MASSIMI', fight_over: 'FINE INCONTRO', res_win: 'HAI VINTO!', res_lose: 'HAI PERSO', res_draw: 'PAREGGIO', resume: 'RIPRENDI', restart: 'RICOMINCIA', replay: 'RIGIOCA', menu_btn: 'MENU',
    getup_title: 'COLPISCI {n} VOLTE PER RIALZARTI', getup_left: 'ancora {n}',
    you: 'TU', stats: 'Colpi {h} · Parate {b} · Schivate {d}', down_times: 'A terra {n} {v}', once: 'volta', times: 'volte', penalties: 'Penalità {n}/3',
    round_of: 'Round {r} di {n}', mike_down: '{NAME} E\' A TERRA!',
    you_down_hit: 'SEI A TERRA! Colpisci {n} volte il bottone per rialzarti', you_down_out: 'SEI A TERRA… non hai più energia',
    third_kd: '{who}: terzo atterramento, l\'arbitro ferma l\'incontro!', who_you: 'Tu', who_mike: '{name}', opp: '{NAME}', opponent: 'AVVERSARIO',
    is_up: 'in piedi', is_down: 'a terra', hit_button: ' · colpisci il bottone! ({n})', up_after8: 'In piedi! Si riprende dopo l\'8',
    win_you: 'HAI VINTO per {how}!', win_mike: 'Vince {name} per {how}', draw: 'Pareggio ai punti ({pts})',
    how_KO: 'KO', how_TKO: 'KO tecnico', how_DQ: 'squalifica', how_PTS: 'decisione ai punti',
    dq3: 'Terzo colpo basso: SQUALIFICATO!', lowblow: 'Colpo basso! Penalità {p} di 3',
    you_head: 'Tu: colpo alla testa +2', you_body: 'Tu: colpo al corpo +1', mike_blocks: '{name} para', mike_dodges: '{name} schiva',
    mike_body: '{name}: colpo al corpo +1', mike_head: '{name}: colpo alla testa +2', blocked: 'Parata!', dodged: 'Schivata!',
    choose_menu: 'Scegli dal menu davanti a te', starts_in: 'Round {r} di {n} · si comincia tra {s}…',
    low_ring: 'Ring basso? Accovacciati e tieni una mano a terra 2 s · {s}', pause_hint: 'Pausa: tasto del controller o menu del visore · {s}',
    rest: 'Riposo all\'angolo · round {r} tra {s} s', menu: 'Menu', floor_fixed: 'Pavimento sistemato!', floor_title: 'Stanza non scansionata: sistema il pavimento', floor_title2: 'Sistema il pavimento', opt_floor: 'SISTEMA IL PAVIMENTO', floor_scan: 'SCANSIONA LA STANZA', floor_hand: 'TOCCA IL PAVIMENTO', floor_hand_hint: 'Accovacciati e tieni una mano ferma a terra 2 secondi', floor_scan_hint: 'Segui le istruzioni del Quest per la scansione…', floor_scan_no: 'Scansione non disponibile: tocca il pavimento con la mano', presenting: 'Presentazione dei pugili…',
    diag: 'ring {m} m · pavimento: {f} · occhi a {e} m da terra',
    loading: 'Caricamento gioco… {p}%', play: 'Gioca', no_xr: 'Questo browser non supporta la realtà mista: usa il browser del Quest 3 (oppure prova l\'anteprima su PC).',
    load_err: 'Errore nel caricamento di Mike: {e}', xr_err: 'Impossibile entrare in realtà mista: {e}',
  },
  en: {
    menu_sub: 'hold a glove on a button', where: 'WHERE', m_stanza: 'Your room', m_arena: 'Arena', m_spiaggia: 'Beach', m_grattacielo: 'Skyscraper', m_notte: 'City by night', m_deserto: 'Desert', m_neve: 'Snow', m_vulcano: 'Volcano', m_mare: 'Under the sea', m_luna: 'On the Moon', options: 'Options', options_title: 'OPTIONS', roster: 'Fighters', roster_title: 'FIGHTERS', vibration: 'CONTROLLER VIBRATION', pause_change: 'CHANGE DRILL', loading_short: 'Loading…', pointer: 'POINTER', pt_left: 'Left hand', pt_right: 'Right hand', pt_both: 'Both', cue_body: 'BODY', dm_random: 'RANDOM (ALL PUNCHES)', dm_pick: 'OR PICK THE PUNCHES', dm_start: 'START', dm_type: 'WHAT TO TRAIN', dm_guard: 'BACK TO GUARD', dt_para: 'Block', dt_schiva: 'Slip', dt_entrambi: 'Both', dk_jab: 'Jab', dk_cross: 'Cross', dk_hook_l: 'Left hook', dk_hook_r: 'Right hook', dk_upper_l: 'Left upper', dk_upper_r: 'Right upper', dk_body: 'Body hooks', m_palestra: 'Gym',
    level: 'LEVEL', l_facile: 'Easy', l_normale: 'Normal', l_difficile: 'Hard', l_impossibile: 'Impossible',
    rounds: 'ROUNDS', duration: 'ROUND LENGTH', rule3: 'THREE KNOCKDOWN RULE', rule1: 'ONE KO ENDS THE FIGHT', yes: 'Yes', no: 'No', language: 'LANGUAGE',
    start: 'START FIGHT', quit: 'EXIT GAME',
    next_title: 'ROUND {n} IN {s} s', next_btn: 'GO TO NEXT ROUND',
    intro_title: 'FIGHT STARTS IN {s} s', skip_intro: 'START NOW',
    mode_title: 'GAME MODE', m_arcade: 'Arcade', m_training: 'Training', soon: 'soon', training: 'TRAINING', tr_bag: 'Heavy bag', tr_speed: 'Speed bag', tr_double: 'Double end bag', tr_rope: 'Jump rope', tr_slip: 'Slip line', slip_title: 'SLIP LINE: GET UNDER IT', slip_pass: 'SLIPS', slip_touch: 'TOUCHED', slip_h: 'HEIGHT', bag_title: 'HEAVY BAG TRAINING', bag_time: 'TIME', bag_hits: 'PUNCHES LANDED', bag_best: 'HARDEST PUNCH', bag_rate: 'PUNCHES PER MINUTE', rope_title: 'JUMP ROPE', speed_title: 'SPEED BAG', de_title: 'DOUBLE END BAG', tr_spar: 'Sparring', sp_title: 'SPARRING', sp_libero: 'FREE', sp_combo: 'COMBINATIONS', sp_difesa: 'DEFENSE', sp_choose: 'DRILL OF YOUR CHOICE', sp_ok: 'RIGHT', sp_wrong: 'WRONG', sp_avoided: 'AVOIDED', sp_taken: 'TAKEN', sp_guard: 'BACK IN GUARD', sp_landed: 'LANDED', sp_defended: 'BLOCKED', sp_dodged: 'SLIPPED', sp_speed: 'SPEED', sp_hint: 'Partner speed: hold a glove on the slider knob and drag it', de_taken: 'IT HIT YOU', speed_hits: 'HITS', speed_miss: 'MISSES', speed_acc: 'ACCURACY', rope_jumps: 'JUMPS', rope_errors: 'MISSES', rope_streak: 'IN A ROW', rope_best: 'BEST STREAK', m_tour: 'Tournament', m_surv: 'The tower', surv: 'THE TOWER', start_surv: 'START THE CLIMB', sv_title: 'THE TOWER', sv_quit: 'LEAVE THE TOWER', sv_floor: 'FLOOR {n}', sv_next: 'Floor {n}: YOU vs {b}', sv_won: 'You beat {b}! Going up!', sv_lost: 'Beaten by {b} on floor {n}', sv_champ: 'YOU CONQUERED THE TOWER!', bn_surv: 'THE TOWER',
    arcade: 'ARCADE', watch_title: 'WATCH A FIGHT', w_red: 'RED CORNER', w_blue: 'BLUE CORNER', tour: 'TOURNAMENT', stage: 'STAGE', m_random: 'Random arena', f_random: 'Random', cpu_vs: '{a} vs {b}', back: 'BACK', start_tour: 'START TOURNAMENT',
    tr_title: 'HOME BOXING TOURNAMENT', tr_r64: 'Round of 64', tr_r32: 'Round of 32', tr_n: 'ENTRANTS', tr_size: '{n} FIGHTERS', tw_n: 'TOWER FLOORS', tw_size: '{n} FLOORS', tr_r16: 'Round of 16', tr_qf: 'Quarter-final',
    tr_sf: 'Semi-final', tr_f: 'Final', tr_next: '{round}: YOU vs {b}', tr_fight: 'FIGHT', tr_quit: 'LEAVE TOURNAMENT',
    tr_menu: 'BACK TO MENU', feint_bit: 'Feint! You bit', you_counter: 'COUNTER PUNCH! Clean hit', mike_counter: 'Caught by a counter!', adapted: '{b} HAS FIGURED YOU OUT: change your style!', tr_watch_rest: 'WATCH THE OTHERS', tr_champ: 'TOURNAMENT CHAMPION!', tr_lost: 'Knocked out by {b} ({round})', tr_adv: '{round}: you won, you go through!',
    tr_cpu: '{round}: {a} vs {b} - do you want to watch?', tr_watch: 'WATCH THE FIGHT', tr_continue: 'CONTINUE', tr_skip: 'SKIP TO RESULT', tr_skipfight: 'SKIP', watch: 'WATCH', watch_tour: 'WATCH THE TOURNAMENT', tr_next_round: 'NEXT ROUND', tr_adv_spec: '{round}: who goes through', tr_cpu_res: '{round}: {b} goes through!', tr_champ_spec: '{b} WINS THE TOURNAMENT!',
    pause: 'PAUSED', out_ring: 'You left the ring: step back in to resume', out_warn: 'WARNING! Penalty {p} of 3: step back into the ring to resume', dq_out: 'Third penalty: DISQUALIFIED!', bn_red: 'RED CORNER', bn_you: 'YOU', bn_go: 'GO {NAME}!', bn_champ: 'HEAVYWEIGHT CHAMPIONSHIP', bn_tour: 'HEAVYWEIGHT TOURNAMENT', fight_over: 'FIGHT OVER', res_win: 'YOU WIN!', res_lose: 'YOU LOSE', res_draw: 'DRAW', resume: 'RESUME', restart: 'RESTART', replay: 'PLAY AGAIN', menu_btn: 'MENU',
    getup_title: 'HIT IT {n} TIMES TO GET UP', getup_left: '{n} to go',
    you: 'YOU', stats: 'Hits {h} · Blocks {b} · Dodges {d}', down_times: 'Down {n} {v}', once: 'time', times: 'times', penalties: 'Penalties {n}/3',
    round_of: 'Round {r} of {n}', mike_down: '{NAME} IS DOWN!',
    you_down_hit: 'YOU\'RE DOWN! Hit the button {n} times to get up', you_down_out: 'YOU\'RE DOWN… no energy left',
    third_kd: '{who}: third knockdown, the referee stops the fight!', who_you: 'You', who_mike: '{name}', opp: '{NAME}', opponent: 'OPPONENT',
    is_up: 'up', is_down: 'down', hit_button: ' · hit the button! ({n})', up_after8: 'Up! The fight resumes after eight',
    win_you: 'YOU WIN by {how}!', win_mike: '{name} wins by {how}', draw: 'Draw on points ({pts})',
    how_KO: 'knockout', how_TKO: 'technical knockout', how_DQ: 'disqualification', how_PTS: 'decision on points',
    dq3: 'Third low blow: DISQUALIFIED!', lowblow: 'Low blow! Penalty {p} of 3',
    you_head: 'You: head shot +2', you_body: 'You: body shot +1', mike_blocks: '{name} blocks', mike_dodges: '{name} dodges',
    mike_body: '{name}: body shot +1', mike_head: '{name}: head shot +2', blocked: 'Blocked!', dodged: 'Dodged!',
    choose_menu: 'Choose from the menu in front of you', starts_in: 'Round {r} of {n} · starting in {s}…',
    low_ring: 'Ring too low? Crouch and keep a hand on the floor for 2 s · {s}', pause_hint: 'Pause: controller button or headset menu · {s}',
    rest: 'Resting in the corner · round {r} in {s} s', menu: 'Menu', floor_fixed: 'Floor adjusted!', floor_title: 'Room not scanned: set the floor', floor_title2: 'Set the floor', opt_floor: 'SET THE FLOOR', floor_scan: 'SCAN THE ROOM', floor_hand: 'TOUCH THE FLOOR', floor_hand_hint: 'Crouch and hold one hand still on the floor for 2 seconds', floor_scan_hint: 'Follow the Quest instructions to scan…', floor_scan_no: 'Scan not available: touch the floor with your hand', presenting: 'Introducing the fighters…',
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
// nome dell'avversario scelto: {name} / {NAME} nelle frasi
let opp = 'Bruce';
export function setOpponentName(n) { opp = n; }
export function t(key, vars) {
  let s = (STR[lang] && STR[lang][key]) ?? STR.it[key] ?? key;
  s = s.split('{name}').join(opp).split('{NAME}').join(opp.toUpperCase());
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
