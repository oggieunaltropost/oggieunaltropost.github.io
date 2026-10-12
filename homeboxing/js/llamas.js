import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { contactShadow } from './contact_shadow.js?v=20261012074748';

const SPEED=.38;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class Llamas {
  constructor(parent,ringHalf=1.85){
    this.group=new THREE.Group();this.group.name='due lama';parent.add(this.group);
    this.ringHalf=ringHalf;this.dead=false;this.loaded=false;this.time=0;this.nextSocial=22;this.social=null;this.socialCount=0;
    this.ready=new GLTFLoader().loadAsync('assets/sale/llama.glb?v=20261012074748').then(g=>{
      if(this.dead){this._release(g.scene);return;}
      const originalMaterials=new Set();g.scene.traverse(o=>{if(o.isMesh)originalMaterials.add(o.material);});
      this.animals=[[-7,-8],[5,-10]].map(([x,z],i)=>{
        const model=i?clone(g.scene):g.scene;
        model.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;
          const old=o.material;o.material=new THREE.MeshLambertMaterial({name:old.name,color:old.color,vertexColors:!!o.geometry.attributes.color,side:old.side});
          if(old.name==='Llama matte fleece'){
            o.material.color.set(0xffffff);
            if(i&&o.geometry.attributes.color){o.geometry=o.geometry.clone();const c=o.geometry.attributes.color;for(let k=0;k<c.count;k++)c.setXYZ(k,.68+c.getX(k)*.32,.67+c.getY(k)*.32,.64+c.getZ(k)*.32);}
          }
        });
        this.group.add(model);model.position.set(x,0,z);model.rotation.y=i?-.4:.6;
        const mixer=new THREE.AnimationMixer(model),actions={};for(const c of g.animations)actions[c.name]=mixer.clipAction(c);
        for(const a of Object.values(actions))a.play().setEffectiveWeight(0);actions.idle.setEffectiveWeight(1);
        const shadow=contactShadow(.8,1.65,.38);shadow.material.map=shadow.material.map.clone();shadow.position.set(x,.021,z);this.group.add(shadow);
        const feet=['hind_L','front_L','hind_R','front_R'].map(name=>model.getObjectByName(name+'_foot'));
        const a={model,mixer,actions,shadow,feet,target:new THREE.Vector3(x,0,z),speed:0,pause:2+i*3,head:model.getObjectByName('head'),neck:model.getObjectByName('neck'),look:0};
        this._target(a);return a;
      });
      for(const m of originalMaterials)m.dispose();this.loaded=true;
    }).catch(e=>{this.loadError=e;if(!this.dead)console.error('Deserto di sale: lama',e);});
  }
  _target(a){
    const angle=Math.atan2(a.model.position.z,a.model.position.x)+(Math.random()-.5)*1.25;
    const radius=Math.max(this.ringHalf+5,9)+Math.random()*8;
    a.target.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
  }
  setRing(half){this.ringHalf=half;for(const a of this.animals||[])this._target(a);}
  beginSocial(){
    if(!this.loaded||this.social)return false;
    const mid=this.animals[0].model.position.clone().add(this.animals[1].model.position).multiplyScalar(.5);mid.y=0;
    if(mid.length()<this.ringHalf+5)mid.setLength(this.ringHalf+6);
    const tangent=new THREE.Vector3(-mid.z,0,mid.x).normalize();
    this.animals.forEach((a,i)=>{a.target.copy(mid).addScaledVector(tangent,i?1.2:-1.2);a.pause=0;});
    this.social={phase:'approach',time:45};return true;
  }
  update(dt){
    if(this.dead||!this.loaded)return;dt=Math.min(.1,Math.max(0,dt));this.time+=dt;
    this.nextSocial-=dt;if(this.nextSocial<=0&&!this.social)this.beginSocial();
    if(this.social){
      this.social.time-=dt;
      if(this.social.phase==='approach'&&this.animals.every(a=>a.model.position.distanceTo(a.target)<.12)){
        this.social={phase:'greet',time:7+Math.random()*3};this.socialCount++;
        for(const a of this.animals)a.actions.greet.reset().play();
      }else if(this.social.time<=0){this.social=null;this.nextSocial=30+Math.random()*30;for(const a of this.animals){a.pause=2+Math.random()*3;this._target(a);}}
    }
    for(let i=0;i<2;i++){
      const a=this.animals[i],other=this.animals[1-i],pos=a.model.position;
      a.pause=Math.max(0,a.pause-dt);const delta=a.target.clone().sub(pos).setY(0),distance=delta.length();
      const greeting=this.social?.phase==='greet';
      if(!this.social&&distance<.12&&a.pause===0){a.pause=3+Math.random()*5;this._target(a);}
      const to=greeting?other.model.position.clone().sub(pos):delta;
      const want=Math.atan2(to.x,to.z),turn=wrap(want-a.model.rotation.y);
      a.model.rotation.y+=THREE.MathUtils.clamp(turn*2*dt,-.65*dt,.65*dt);
      const moving=!greeting&&a.pause===0&&distance>.10&&Math.abs(turn)<.7;
      const speed=moving?SPEED*Math.min(1,distance/.5):0;a.speed=THREE.MathUtils.damp(a.speed,speed,4,dt);
      if(a.speed>.0005&&distance>.01){pos.addScaledVector(delta.normalize(),Math.min(distance,a.speed*dt));}
      const min=this.ringHalf+4.5,radius=Math.hypot(pos.x,pos.z);if(radius<min){pos.x*=min/radius;pos.z*=min/radius;}
      // Do not let independent routes overlap bodies.
      const away=pos.clone().sub(other.model.position).setY(0),apart=away.length();if(apart<1.75&&apart>.001)pos.addScaledVector(away.normalize(),(1.75-apart)*.5);
      const w=a.speed/SPEED;a.actions.walk.setEffectiveWeight(w).setEffectiveTimeScale(w);
      const socialWeight=greeting?(Math.sin((this.social.time)*.7)*.25+.55):0;
      a.actions.greet.setEffectiveWeight(socialWeight*(1-w));a.actions.idle.setEffectiveWeight((1-socialWeight)*(1-w));
      const duration=a.actions.walk.getClip().duration,before=a.actions.walk.time/duration;a.mixer.update(dt);
      let after=a.actions.walk.time/duration;if(after<before)after+=1;
      if(w>.25&&moving&&this.onStep){a.model.updateMatrixWorld(true);[0,.08,.5,.58].forEach((offset,k)=>{
        if(a.feet[k]&&Math.floor(before+offset)<Math.floor(after+offset))this.onStep(a.feet[k].getWorldPosition(new THREE.Vector3()),w);
      });}
      if(greeting&&a.head){const yaw=THREE.MathUtils.clamp(wrap(want-a.model.rotation.y),-.35,.35);a.model.updateMatrixWorld(true);const axis=new THREE.Vector3(0,1,0).applyQuaternion(a.head.parent.getWorldQuaternion(new THREE.Quaternion()).invert());a.head.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,yaw));}
      a.shadow.position.set(pos.x,.018,pos.z);a.shadow.rotation.z=-a.model.rotation.y;
    }
  }
  _release(root){root.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[]))m.dispose();});}
  dispose(){this.dead=true;for(const a of this.animals||[])a.mixer.stopAllAction();}
}
