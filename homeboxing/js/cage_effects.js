import * as THREE from 'three';
import {mergeParts,beam} from './venue_parts.js?v=20261013002357';
import * as sfx from './sfx.js?v=20261013002357';

export class CageEffects {
 constructor(parent){
  this.parent=parent;this.time=0;this.nextJet=14+Math.random()*12;this.leds=[];
  // Narrow strips fixed to the wall ribs, all the way around the venue.
  for(let side=0;side<4;side++){
   const a=side*Math.PI/2,mat=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(.56+side*.04,.65,.42)}),parts=[];
   for(let k=-4;k<=4;k++){const g=new THREE.BoxGeometry(.12,5.7,.04);g.rotateY(a);g.translate(Math.sin(a)*13.82+Math.cos(a)*k*3,6.6,Math.cos(a)*13.82-Math.sin(a)*k*3);parts.push(g);}
   const point=(x,y,r)=>new THREE.Vector3(Math.cos(a)*x+Math.sin(a)*r,y,-Math.sin(a)*x+Math.cos(a)*r);
   // Continue the color onto the upper wall rail and ceiling trusses.
   parts.push(beam(point(-12,9.94,13.82),point(12,9.94,13.82),.045));
   for(let k=-4;k<=4;k++)parts.push(beam(point(k*3,9.38,0),point(k*3,9.38,12),.035));
   parts.push(beam(point(-3.5,6.53,3.5),point(3.5,6.53,3.5),.035));
   mergeParts(parts,mat,parent);this.leds.push({mat,from:mat.color.clone(),to:new THREE.Color().setHSL(Math.random(),.65,.42),elapsed:0,duration:8+Math.random()*10});
  }
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  for(let i=0;i<65;i++){const a=Math.random()*Math.PI*2,radius=Math.sqrt(Math.random())*44,x=128+Math.sin(a)*radius,y=128+Math.cos(a)*radius,r=24+Math.random()*40,grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(225,234,243,.08)');grad.addColorStop(.45,'rgba(210,223,236,.045)');grad.addColorStop(1,'rgba(210,223,236,0)');g.fillStyle=grad;g.fillRect(0,0,256,256);}
  this.map=new THREE.CanvasTexture(c);this.map.colorSpace=THREE.SRGBColorSpace;this.clouds=[];
  for(let i=0;i<48;i++){const mat=new THREE.SpriteMaterial({map:this.map,transparent:true,depthWrite:false,opacity:0,color:0xc8d4e0});const sprite=new THREE.Sprite(mat);sprite.visible=false;parent.add(sprite);this.clouds.push({sprite,age:99,ttl:1,velocity:new THREE.Vector3()});}
  this.nozzles=[];
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,mesh=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,.32,10),new THREE.MeshStandardMaterial({color:0x29313b,metalness:.7,roughness:.5}));mesh.position.set(Math.sin(a)*5,-.60,Math.cos(a)*5);parent.add(mesh);this.nozzles.push(mesh);}
 }
 burst(camera){
  const chosen=Math.floor(Math.random()*4),pos=this.nozzles[chosen].position.clone();pos.y=-.40;
  for(let i=0;i<this.clouds.length;i++){const c=this.clouds[i];c.age=-i*.040;c.ttl=8+Math.random()*2;c.sprite.position.copy(pos);c.sprite.visible=false;c.velocity.set((Math.random()-.5)*.40,2.4+Math.random()*.9,(Math.random()-.5)*.40);c.size=.32+Math.random()*.2;c.spin=(Math.random()-.5)*.12;c.drift=Math.random()*Math.PI*2;c.sprite.material.rotation=Math.random()*Math.PI*2;}
  if(camera)sfx.smokeJet(this.parent.localToWorld(pos.clone()),camera);
 }
 update(dt,camera){
  dt=Math.min(.1,dt);this.time+=dt;
  for(const l of this.leds){l.elapsed+=dt;const u=THREE.MathUtils.smoothstep(l.elapsed/l.duration,0,1);l.mat.color.copy(l.from).lerp(l.to,u);if(l.elapsed>=l.duration){l.from.copy(l.to);l.to.setHSL(Math.random(),.6+Math.random()*.15,.36+Math.random()*.1);l.elapsed=0;l.duration=8+Math.random()*12;}}
  if((this.nextJet-=dt)<=0){this.burst(camera);this.nextJet=25+Math.random()*25;}
  for(const c of this.clouds){c.age+=dt;if(c.age<0||c.age>=c.ttl){c.sprite.visible=false;continue;}c.sprite.visible=true;c.sprite.position.addScaledVector(c.velocity,dt);c.velocity.y+=(.10-c.velocity.y)*(1-Math.exp(-1.05*dt));c.velocity.x+=Math.cos(c.drift+c.age*.4)*.022*dt;c.velocity.z+=Math.sin(c.drift+c.age*.4)*.022*dt;c.sprite.material.rotation+=c.spin*dt;
   const u=c.age/c.ttl;c.sprite.scale.setScalar(c.size+Math.sqrt(c.age)*.64);c.sprite.material.opacity=.70*THREE.MathUtils.smoothstep(c.age,0,.28)*(1-THREE.MathUtils.smoothstep(u,.4,1));}
 }
 dispose(){this.map.dispose();for(const c of this.clouds)c.sprite.material.dispose();}
}
