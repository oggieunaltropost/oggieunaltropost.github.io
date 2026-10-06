// L'avversario impara il tuo modo di combattere (solo a Difficile e Impossibile).
// Durante l'incontro conta le tue abitudini:
//  - che colpi tiri e cosa tiri dopo (dopo un jab tiri quasi sempre il diretto?)
//  - il ritmo con cui attacchi (ogni quanto parti)
//  - come ti difendi quando tira lui (schivi sempre dallo stesso lato, ti abbassi, arretri, chiudi la guardia)
//  - se dopo aver attaccato resti scoperto
// e poi, piano piano, ne approfitta. Il primo minuto osserva e basta; impara le tendenze, non indovina tutto:
// se cambi stile ci mette un po' a riadattarsi.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion();
const KINDS = ['jab', 'cross', 'hook', 'upper', 'body'];
const LEARN = { difficile: 0.65, impossibile: 1.0 };
const DEFS = ['slip_l', 'slip_r', 'duck', 'back', 'block'];

export class StyleLearner {
  constructor() {
    this.t = 0;                                     // tempo di combattimento osservato (s)
    this.trans = {};                                // trans[prima][dopo] = quante volte (colpi ravvicinati)
    this.kinds = {};                                // quante volte per tipo di colpo
    this.last = null;                               // ultimo tuo colpo { kind, t }
    this.seqStart = -9; this.seqLen = 0; this.starts = [];   // inizi delle tue serie (per il ritmo)
    this.ids = { left: -1, right: -1 };
    this.def = {}; this.defN = 0; this.watch = null;        // come ti difendi dai suoi colpi
    this.openN = 0; this.endN = 0; this.endCheck = null;    // scoperto dopo aver attaccato?
    this.announced = false;
  }
  // quanto ne approfitta adesso (0..1): il livello, il tempo (da ~45 s a ~2 min e mezzo) e quanti esempi ha visto
  strength(level) {
    const k = LEARN[level] || 0;
    return k * THREE.MathUtils.clamp((this.t - 45) / 100, 0, 1);
  }

  // il tuo pugno, nel sistema dell'avversario (+X = sua sinistra, +Z avanti, +Y su)
  _kind(m, g) {
    _q.copy(m.root.quaternion).invert();
    const v = _a.copy(g.vel).applyQuaternion(_q), sp = Math.max(0.01, v.length());
    const hc = m.headCenter();
    // dove sta andando (non da dove parte: dalla guardia anche un jab parte piu' in basso della testa)
    const tca = Math.max(0, Math.min(0.4, _b.subVectors(hc, g.center).dot(g.vel) / Math.max(0.01, g.speed * g.speed)));
    if (g.center.y + g.vel.y * tca < hc.y - 0.25) return 'body';
    if (v.y / sp > 0.55) return 'upper';
    if (Math.abs(v.x) / sp > 0.5) return 'hook';
    return g.side === 'left' ? 'jab' : 'cross';
  }

  observe(dt, m, player) {
    this.t += dt;
    const T = this.t, hc = m.headCenter();
    // 1) i tuoi colpi
    for (const g of Object.values(player.gloves)) {
      if (!g.mesh.visible || g.punchId === this.ids[g.side]) continue;
      if (g.speed < 1.6) continue;
      const to = _b.subVectors(hc, g.center);
      if (to.length() > 1.1 || to.normalize().dot(_a.copy(g.vel).normalize()) < 0.5) continue;   // non verso di lui
      this.ids[g.side] = g.punchId;
      const kind = this._kind(m, g);
      this.kinds[kind] = (this.kinds[kind] || 0) + 1;
      if (this.last && T - this.last.t < 1.0) {
        const r = this.trans[this.last.kind] || (this.trans[this.last.kind] = {});
        r[kind] = (r[kind] || 0) + 1;
        this.seqLen++;
      } else {                                      // nuova serie
        if (T - this.seqStart < 8) this.starts.push(T - this.seqStart);
        if (this.starts.length > 12) this.starts.shift();
        this.seqStart = T; this.seqLen = 1;
      }
      this.last = { kind, t: T, side: g.side };
      this.endCheck = T + 0.45;                     // tra poco: sei rientrato in guardia?
    }
    // 2) fine della tua serie: guantoni lontani dal viso = scoperto
    if (this.endCheck && T > this.endCheck && (!this.last || T - this.last.t > 0.4)) {
      this.endCheck = null; this.endN++;
      const open = Object.values(player.gloves).filter(g => g.mesh.visible && g.center.distanceTo(player.head) > 0.4).length;
      if (open) this.openN++;
      this.justEnded = T;
    }
    // 3) come ti difendi: quando parte un suo pugno guarda dove va la tua testa nel quarto di secondo dopo
    const P = m.punch;
    if (P && !P.move && !P.watched && m.state === 'attack') {
      P.watched = true;
      this.watch = { t: T, head: m.root.worldToLocal(player.head.clone()) };
    }
    if (this.watch && T - this.watch.t > 0.28) {
      const h = m.root.worldToLocal(player.head.clone()), d = h.sub(this.watch.head);
      const guard = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.3);
      const def = d.y < -0.1 ? 'duck' : d.x > 0.08 ? 'slip_l' : d.x < -0.08 ? 'slip_r' : d.z > 0.12 ? 'back' : guard ? 'block' : null;
      if (def) { this.def[def] = (this.def[def] || 0) + 1; this.defN++; }
      this.watch = null;
    }
  }

  // il colpo che probabilmente segue quello appena tirato: { kind, p } (servono almeno 4 esempi)
  predictNext() {
    if (!this.last) return null;
    const r = this.trans[this.last.kind]; if (!r) return null;
    let n = 0, best = null, bn = 0;
    for (const [k, c] of Object.entries(r)) { n += c; if (c > bn) { bn = c; best = k; } }
    return n >= 4 && bn / n >= 0.45 ? { kind: best, p: bn / n } : null;
  }
  // la tua difesa abituale ai suoi colpi: { type, share } (almeno 5 esempi e il 40%)
  defHabit() {
    let best = null, bn = 0;
    for (const k of DEFS) if ((this.def[k] || 0) > bn) { bn = this.def[k]; best = k; }
    return this.defN >= 5 && bn / this.defN >= 0.4 ? { type: best, share: bn / this.defN } : null;
  }
  // quante volte resti scoperto dopo aver attaccato (0..1)
  openAfter() { return this.endN >= 4 ? this.openN / this.endN : 0; }
  // il tuo ritmo: tra quanto parte la prossima serie (s, dall'inizio dell'ultima), se sei regolare
  nextAttackIn() {
    const s = this.starts; if (s.length < 4) return null;
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
    return sd / mean < 0.35 ? this.seqStart + mean - this.t : null;
  }
  // ha capito abbastanza da dirlo (una volta sola)?
  ready(level) {
    const has = this.predictNext() || this.defHabit() || this.openAfter() > 0.5;
    return !this.announced && has && this.strength(level) > 0.3;
  }
}
