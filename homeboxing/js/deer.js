// The stag belongs to the forest's grounded coordinate frame. It never touches
// the ring, player camera, or XR reference space. Speed matches the Blender gait.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SPEED=.42, WALK_PERIOD=2.4;
const _p=new THREE.Vector3(), _q=new THREE.Quaternion();
const _look=new THREE.Vector3(), _axis=new THREE.Vector3(), _parentQ=new THREE.Quaternion();
export class Deer {
  constructor(parent,ringHalf=1.85) {
    this.group=new THREE.Group();this.group.name='cervo';this.group.position.y=-.9;parent.add(this.group);
    this.dead=false;this.loaded=false;this.ringHalf=ringHalf;
    this.angle=-2.05;this.radius=Math.max(5.25,ringHalf+2.5);
    this.state='walk';this.speed=0;this.pauseIn=13;this.stateTime=0;this.time=0;
    this.alertCooldown=0;this.ears=[];this.hooves=[];this.lookYaw=0;this.observing=false;
    this._shadow();
    this.ready=new GLTFLoader().loadAsync('assets/foresta/deer.glb?v=20261013002357').then(g=>{
      if(this.dead){this._release(g.scene);return;}
      this.model=g.scene;
      g.scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;
        if(o.isSkinnedMesh){o.frustumCulled=false;o.material.envMapIntensity=0;
          if(o.material.name.includes('chestnut')) {
            const old=o.material;
            // Matte short fur: no sheen/specular flashes as the head turns.
            o.material=new THREE.MeshLambertMaterial({name:old.name,color:old.color,map:old.map,vertexColors:true});
            old.dispose();
          }
        }}});
      this.group.add(g.scene);this.mixer=new THREE.AnimationMixer(g.scene);
      this.actions={};
      for(const c of g.animations)this.actions[c.name]=this.mixer.clipAction(c);
      if(!this.actions.walk||!this.actions.idle||!this.actions.alert)throw Error('Incomplete stag animation set');
      this.actions.walk.play();this.actions.idle.play();this.actions.idle.setEffectiveWeight(0);
      this.actions.alert.setLoop(THREE.LoopOnce,1);this.actions.alert.clampWhenFinished=true;
      this.neck=g.scene.getObjectByName('neck');this.head=g.scene.getObjectByName('head');
      this.hooves=['front_L_hoof','front_R_hoof','hind_L_hoof','hind_R_hoof'].map(n=>g.scene.getObjectByName(n)).filter(Boolean);
      this.loaded=true;this._place();
    }).catch(e=>{if(!this.dead){this.loadError=e;console.warn('Stag unavailable:',e);}});
  }
  _shadow() {
    // Own texture, so releasing this stage cannot invalidate another animal's shadow.
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    const grad=g.createRadialGradient(64,64,10,64,64,60);grad.addColorStop(0,'rgba(0,0,0,.32)');grad.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=grad;g.fillRect(0,0,128,128);
    const mat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.85),mat);this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.003;this.group.add(this.shadow);
  }
  _release(root) {root.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[])){for(const t of Object.values(m))if(t?.isTexture)t.dispose();m.dispose();}});}
  _place() {
    const x=Math.cos(this.angle)*this.radius,z=Math.sin(this.angle)*this.radius;
    const yaw=Math.atan2(-Math.sin(this.angle),Math.cos(this.angle));
    if(this.model){this.model.position.set(x,0,z);this.model.rotation.y=yaw;}
    this.shadow.position.set(x,.003,z);this.shadow.rotation.z=-yaw;
  }
  setRing(half) {this.ringHalf=half;this.radius=Math.max(5.25,half+2.5);}
  onThunder() {
    if(this.dead||!this.loaded||this.alertCooldown>0||this.observing)return;
    this.state='alert';this.stateTime=3.2;this.alertCooldown=17;
    this.actions.alert.reset().setEffectiveWeight(1).fadeIn(.2).play();
  }
  update(dt,observer=null,hold=false) {
    if(this.dead||!this.loaded)return;
    dt=Math.min(.1,Math.max(0,dt));this.time+=dt;this.alertCooldown=Math.max(0,this.alertCooldown-dt);
    if(hold&&!this.observing){this.observing=true;this.state='observe';this.actions.alert.fadeOut(.3);}
    else if(!hold&&this.observing){this.observing=false;this.state='walk';this.pauseIn=12+Math.random()*14;}
    if(!hold && this.state==='walk') {
      this.pauseIn-=dt;if(this.pauseIn<=0){this.state='idle';this.stateTime=4+Math.random()*5;}
    }else if(!hold){
      this.stateTime-=dt;if(this.stateTime<=0){this.state='walk';this.pauseIn=12+Math.random()*14;this.actions.alert.fadeOut(.5);}
    }
    const target=this.state==='walk'?SPEED:0;
    this.speed=THREE.MathUtils.damp(this.speed,target,hold?8:3.5,dt);
    if(this.speed<.0005)this.speed=0;
    this.angle+=this.speed*dt/this.radius;
    const weight=this.speed/SPEED;
    this.actions.walk.setEffectiveWeight(weight).setEffectiveTimeScale(weight);
    this.actions.idle.setEffectiveWeight(1-weight);
    const oldBeat=Math.floor(this.actions.walk.time/WALK_PERIOD*4);
    this.mixer.update(dt);this._place();
    const newBeat=Math.floor(this.actions.walk.time/WALK_PERIOD*4);
    // Share the turn between neck and head, with a limited, eased gaze.
    // Convert world up into each bone's parent frame; the rig's bone axes
    // differ from scene axes. Animation is evaluated first, so no drift.
    const looking=this.state==='idle'||this.state==='observe';
    let desired=0;
    if(looking&&observer){this.model.updateWorldMatrix(true,true);_look.copy(observer);this.model.worldToLocal(_look);desired=THREE.MathUtils.clamp(Math.atan2(_look.x,_look.z),-1.4,1.4);}
    this.lookYaw=THREE.MathUtils.damp(this.lookYaw,desired,2.2,dt);
    for(const [bone,share] of [[this.neck,.65],[this.head,.35]])if(bone){
      bone.parent.getWorldQuaternion(_parentQ);_axis.set(0,1,0).applyQuaternion(_parentQ.invert());
      _q.setFromAxisAngle(_axis,this.lookYaw*share);bone.quaternion.premultiply(_q);bone.updateWorldMatrix(false,true);
    }
    // All planted hoof soles are checked in forest-local space. The source
    // gait uses IK at ground level; this small correction prevents floating.
    this.group.updateWorldMatrix(true,true);
    let low=Infinity;
    for(const h of this.hooves){_p.setFromMatrixPosition(h.matrixWorld);this.group.worldToLocal(_p);low=Math.min(low,_p.y-.105);}
    if(Number.isFinite(low)&&Math.abs(low)<.22)this.model.position.y-=low;
    this.model.updateWorldMatrix(true,false);this.model.getWorldPosition(_p);_p.y+=.12;
    this.onPosition?.(_p);
    if(newBeat!==oldBeat && this.state==='walk' && weight>.25)this.onStep?.(_p,weight);
  }
  dispose() {
    this.dead=true;
    if(this.mixer){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);}
  }
}
