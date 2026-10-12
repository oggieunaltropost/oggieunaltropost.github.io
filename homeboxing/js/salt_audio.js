import { audioBus } from './sfx.js?v=20261012074748';

// Individual padded footfalls with a dry granular crunch; independent HRTF sources.
export class SaltAudio {
  constructor(){this.dead=false;this.buffers=null;this.playing=new Set();this.loading=null;this.lastSample=-1;}
  load(ctx){
    if(this.loading)return this.loading;
    this.loading=Promise.all(Array.from({length:9},async(_,i)=>{
      const r=await fetch(`assets/audio/llama_step_${i}.ogg?v=20261012074748`);if(!r.ok)throw Error('Llama footstep unavailable');
      return ctx.decodeAudioData(await r.arrayBuffer());
    })).then(buffers=>{if(!this.dead)this.buffers=buffers;}).catch(e=>console.warn('Passi lama:',e));
    return this.loading;
  }
  update(cam){
    if(this.dead)return;this.bus=audioBus();if(!this.bus||!cam)return;
    this.load(this.bus.ctx);
    if(!cam.isArrayCamera)cam.updateMatrixWorld(true);
    const m=cam.matrixWorld.elements,L=this.bus.ctx.listener;
    if(L.positionX){L.positionX.value=m[12];L.positionY.value=m[13];L.positionZ.value=m[14];L.forwardX.value=-m[8];L.forwardY.value=-m[9];L.forwardZ.value=-m[10];L.upX.value=m[4];L.upY.value=m[5];L.upZ.value=m[6];}
  }
  step(pos,weight=1){
    const bus=this.bus||audioBus();if(this.dead||!bus||bus.ctx.state!=='running')return false;
    const {ctx,master}=bus;
    if(!this.buffers){this.load(ctx);return false;}
    const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createPanner();
    const index=(this.lastSample+1+Math.floor(Math.random()*(this.buffers.length-1)))%this.buffers.length;this.lastSample=index;
    source.buffer=this.buffers[index];source.playbackRate.value=.96+Math.random()*.08;
    gain.gain.value=.32*Math.min(1,Math.max(.3,weight));filter.type='lowpass';filter.frequency.value=3400;
    pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=3;pan.rolloffFactor=.9;pan.maxDistance=60;
    pan.positionX.value=pos.x;pan.positionY.value=pos.y;pan.positionZ.value=pos.z;
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(master);
    const item={source,filter,gain,pan};this.playing.add(item);
    source.onended=()=>{for(const n of Object.values(item))n.disconnect();this.playing.delete(item);};source.start();return true;
  }
  dispose(){this.dead=true;for(const p of this.playing){try{p.source.stop();}catch{}for(const n of Object.values(p))n.disconnect();}this.playing.clear();this.buffers=null;}
}
