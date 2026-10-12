import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const IDS=['mike','bruce','eddy','bob','ace','riki','kim','reza'];
// Independent seated copies of the fighters, without combat AI.
export class FighterCrowd{
 constructor(parent,seats,count=64){
  this.group=new THREE.Group();this.group.name='Pugili spettatori';parent.add(this.group);
  this.people=[];this.outfitMaterials=new Set();this.time=0;this.forceRaised=false;this.dead=false;this.ready=this._load(seats,count);
 }
 async _load(seats,count){
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),models=await Promise.all(IDS.map(async id=>{try{return {id,gltf:await loader.loadAsync(`assets/fighter_crowd/${id}.glb?v=20261013002357`)};}catch(error){console.warn('Pubblico',id,error);return null;}}));
  this.models=models.filter(Boolean);if(this.dead){this._disposeModels();return;}if(!this.models.length)return;
  const slots=[...seats];for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  for(const model of this.models)model.gltf.scene.traverse(o=>{if(o.isMesh){for(const mat of [].concat(o.material)){
   // Preserve source textures and opacity. A global alpha cutoff punches holes
   // through skin, eyes and clothes when different materials are joined.
   const name=mat.name||'';mat.side=THREE.DoubleSide;mat.roughness=Math.max(.65,mat.roughness??.8);
   if(name==='Capelli'){mat.vertexColors=true;mat.transparent=false;mat.depthWrite=true;mat.alphaTest=.45;}
   else if(name==='Capelli folti'){mat.transparent=false;mat.depthWrite=true;mat.alphaTest=.5;}
   else if(/high-poly/.test(name)){mat.transparent=false;mat.depthWrite=true;mat.alphaTest=.9;mat.roughness=.25;}
   else if(/teeth|tongue/.test(name)){mat.transparent=false;mat.depthWrite=true;mat.alphaTest=0;}
  }o.castShadow=false;}});
  for(let i=0;i<Math.min(count,slots.length);i++){
   const slot=slots[i],point=new THREE.Vector3(slot.x,slot.y,slot.z);
   const nearest=this.people.map(p=>({id:p.id,d:p.root.position.distanceTo(point)})).sort((a,b)=>a.d-b.d);
   // Neighbouring seats, including the next tier, get different fighters.
   const forbidden=new Set(nearest.filter(p=>p.d<2.1).map(p=>p.id));
   let choices=this.models.filter(m=>!forbidden.has(m.id));
   if(!choices.length)choices=this.models.filter(m=>m.id!==nearest[0]?.id);
   if(!choices.length)choices=this.models;
   const used=id=>this.people.filter(p=>p.id===id).length,min=Math.min(...choices.map(m=>used(m.id))),balanced=choices.filter(m=>used(m.id)===min);
   const model=balanced[Math.floor(Math.random()*balanced.length)],root=SkeletonUtils.clone(model.gltf.scene);
   root.name=`Spettatore_${model.id}_${i}`;root.position.set(slot.x,slot.y,slot.z);root.rotation.y=slot.rot;this.group.add(root);
   const outfit=new Map(),colors=[0x263d61,0x662e36,0x295849,0x4d425f,0x5d5037,0x333c46],color=colors[Math.floor(Math.random()*colors.length)];
   root.traverse(o=>{if(o.isMesh){const vary=mat=>{
     if(!/^Raso blu$|^Scarpe$/.test(mat.name))return mat;
     if(!outfit.has(mat)){const copy=mat.clone();if(mat.name==='Raso blu')copy.color.setHex(color);else copy.color.multiplyScalar(.72+Math.random()*.25);outfit.set(mat,copy);this.outfitMaterials.add(copy);}
     return outfit.get(mat);
   };o.material=Array.isArray(o.material)?o.material.map(vary):vary(o.material);}
   if(o.isSkinnedMesh){o.frustumCulled=true;o.castShadow=false;}});
   const mixer=new THREE.AnimationMixer(root),actions=['seated','one_arm','both_arms'].map(name=>{const clip=model.gltf.animations.find(c=>c.name===name),action=mixer.clipAction(clip);action.play();action.setEffectiveWeight(name==='seated'?1:0);return action;});
   mixer.update(.5);root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingSphere();o.boundingSphere.radius+=.6;}});this.people.push({root,mixer,actions,weights:[1,0,0],cheerUntil:0,delay:Math.random()*.75,id:model.id});
  }
 }
 cheer(strength=1){if(this.forceRaised)return;for(const person of this.people)if(Math.random()<Math.min(.25,.06+strength*.1))person.cheerUntil=this.time+.9+Math.random()*1.5;}
 setMatchState(down,ended){const raised=!!(down||ended);if(raised===this.forceRaised)return;this.forceRaised=raised;this.stateAt=this.time;if(!raised)for(const person of this.people)person.cheerUntil=0;}
 update(dt){
  this.time+=Math.min(dt,.1);
  for(const p of this.people){
   const raised=this.forceRaised&&this.time-(this.stateAt||0)>p.delay,target=raised?2:p.cheerUntil>this.time?1:0;let changing=false;
   for(let i=0;i<3;i++){const want=i===target?1:0,next=p.weights[i]+(want-p.weights[i])*Math.min(1,dt*5),value=Math.abs(next-want)<.001?want:next;changing ||= Math.abs(value-p.weights[i])>.00001;p.weights[i]=value;p.actions[i].setEffectiveWeight(value);}
   // Once settled, a spectator requires no further animation updates.
   if(changing)p.mixer.update(dt);
  }
 }
 _disposeModels(){const geometries=new Set(),materials=new Set();for(const model of this.models||[])model.gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const mat of [].concat(o.material||[]))materials.add(mat);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();});}
 dispose(){this.dead=true;for(const p of this.people){p.mixer.stopAllAction();p.mixer.uncacheRoot(p.root);}for(const mat of this.outfitMaterials)mat.dispose();this.outfitMaterials.clear();this._disposeModels();}
}
