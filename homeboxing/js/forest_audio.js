// Lazy storm samples routed through the existing game's master bus.
import { audioBus } from './sfx.js?v=20261012074748';

export class ForestAudio {
  constructor() { this.buffers = {}; this.loops = []; this.shots = new Set(); this.dead = false; this.pending = false; }
  update(cam, wind) {
    const bus = audioBus();
    if (this.dead || !bus || bus.ctx.state !== 'running') return;
    const { ctx, master } = bus;
    this.ctx = ctx; this.master = master;
    if (!this.pending) {
      this.pending = true;
      for (const name of ['rain', 'wind', 'thunder_0', 'thunder_1', 'thunder_2']) {
        fetch(`assets/foresta/${name}.ogg?v=20261012074748`).then(r => { if (!r.ok) throw Error(name); return r.arrayBuffer(); })
          .then(a => ctx.decodeAudioData(a)).then(b => { if (!this.dead) this.buffers[name] = b; })
          .catch(e => console.warn('Forest sound unavailable:', name, e));
      }
    }
    for (const [name, level] of [['rain', .32], ['wind', .14]]) {
      if (this.buffers[name] && !this.loops.some(l => l.name === name)) {
        const source = ctx.createBufferSource(), gain = ctx.createGain();
        source.buffer = this.buffers[name]; source.loop = true; gain.gain.value = 0;
        source.connect(gain); gain.connect(master); source.start();
        gain.gain.setTargetAtTime(level, ctx.currentTime, 1);
        this.loops.push({ name, source, gain });
      }
    }
    const w = this.loops.find(l => l.name === 'wind');
    if (w) w.gain.gain.setTargetAtTime(.08 + wind * .14, ctx.currentTime, .6);
    if (cam) {
      // Read the pose supplied by WebXR. Never recompute the XR camera matrix
      // here: its stereo pose belongs to the renderer, not to the audio system.
      if (!cam.isArrayCamera) cam.updateWorldMatrix(true, false);
      const e = cam.matrixWorld.elements, l = ctx.listener;
      if (l.positionX) {
        for (const [param, value] of [['positionX',e[12]],['positionY',e[13]],['positionZ',e[14]],
          ['forwardX',-e[8]],['forwardY',-e[9]],['forwardZ',-e[10]],['upX',e[4]],['upY',e[5]],['upZ',e[6]]])
          l[param].setValueAtTime(value, ctx.currentTime);
      }
    }
  }
  thunder(world, delay, variant = 0) {
    if (this.dead || !this.ctx || this.ctx.state !== 'running') return;
    const b = this.buffers[`thunder_${variant % 3}`]; if (!b) return;
    const ctx = this.ctx, source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createPanner();
    source.buffer = b; source.playbackRate.value = .93 + Math.random() * .14;
    pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 28; pan.rolloffFactor = .65;
    pan.positionX.value = world.x; pan.positionY.value = world.y; pan.positionZ.value = world.z;
    gain.gain.value = .65; source.connect(gain); gain.connect(pan); pan.connect(this.master);
    const shot = { source, gain, pan }; this.shots.add(shot);
    source.onended = () => { source.disconnect(); gain.disconnect(); pan.disconnect(); this.shots.delete(shot); };
    source.start(ctx.currentTime + delay);
  }
  moveDeer(world) {
    if(!this.deerPan || this.dead)return;
    const now=this.ctx.currentTime;
    for(const [axis,value] of [['X',world.x],['Y',world.y],['Z',world.z]])this.deerPan['position'+axis].setTargetAtTime(value,now,.04);
  }
  deerStep(world,weight=1) {
    if(this.dead || !this.ctx || this.ctx.state!=='running')return;
    const ctx=this.ctx;
    if(!this.deerPan) {
      this.deerPan=ctx.createPanner();this.deerPan.panningModel='HRTF';this.deerPan.distanceModel='inverse';
      this.deerPan.refDistance=3;this.deerPan.rolloffFactor=.9;this.deerPan.maxDistance=24;
      this.deerPan.positionX.value=world.x;this.deerPan.positionY.value=world.y;this.deerPan.positionZ.value=world.z;
      this.deerPan.connect(this.master);this.footShots=new Set();
      // Tiny mono samples: a damp earth impact followed by a soft leaf crunch.
      this.footBuffers=Array.from({length:4},(_,variant)=>{
        const b=ctx.createBuffer(1,Math.round(ctx.sampleRate*.19),ctx.sampleRate),a=b.getChannelData(0);
        let seed=371+variant*113,low=0;
        for(let i=0;i<a.length;i++) {
          const t=i/ctx.sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
          const n=seed/2147483648-1;low+=.16*(n-low);
          const attack=Math.min(1,t/.005),impact=Math.sin(2*Math.PI*(95+variant*7)*t)*Math.exp(-t*48);
          a[i]=attack*(impact*.28+low*Math.exp(-t*24)*.65+n*Math.exp(-t*38)*.065);
        }return b;
      });
    }
    this.moveDeer(world);
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=this.footBuffers[Math.floor(Math.random()*4)];source.playbackRate.value=.94+Math.random()*.12;
    gain.gain.value=.38*weight*(.85+Math.random()*.15);
    source.connect(gain);gain.connect(this.deerPan);
    const shot={source,gain};this.footShots.add(shot);
    source.onended=()=>{source.disconnect();gain.disconnect();this.footShots.delete(shot);};source.start();
  }
  dispose() {
    this.dead = true;
    for (const l of this.loops) { l.source.stop(); l.source.disconnect(); l.gain.disconnect(); }
    for (const s of this.shots) { s.source.stop(); s.source.disconnect(); s.gain.disconnect(); s.pan.disconnect(); }
    for(const s of this.footShots||[]){s.source.stop();s.source.disconnect();s.gain.disconnect();}
    this.footShots?.clear();this.deerPan?.disconnect();this.footBuffers=null;
    this.loops.length = 0; this.shots.clear(); this.buffers = {};
  }
}
