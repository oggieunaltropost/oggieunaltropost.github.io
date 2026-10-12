import * as THREE from 'three';
import {beam,mergeParts,label} from './venue_parts.js?v=20261012215037';
import {grandstands} from './venue_structure.js?v=20261012215037';
import {FighterCrowd} from './fighter_crowd.js?v=20261012215037';

export class Circus {
 constructor(size=3.2){
  this.group=new THREE.Group();this.group.name='Il Circo';this.skyLoaded=true;this.time=0;this.setRing(size);
  const red=new THREE.MeshStandardMaterial({color:0x7e1825,roughness:.96,side:THREE.DoubleSide});
  const ivory=new THREE.MeshStandardMaterial({color:0xd5c6a2,roughness:.95,side:THREE.DoubleSide});
  const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=256;const paint=clothCanvas.getContext('2d');
  const folds=paint.createLinearGradient(0,0,256,0);folds.addColorStop(0,'#a5a5a5');folds.addColorStop(.35,'#eeeeee');folds.addColorStop(.6,'#dedede');folds.addColorStop(1,'#a5a5a5');paint.fillStyle=folds;paint.fillRect(0,0,256,256);
  for(let n=0;n<5000;n++){paint.fillStyle=n%2?'#ffffff10':'#0000000a';paint.fillRect((n*37)%256,(n*71)%256,1,2);}
  const clothTexture=new THREE.CanvasTexture(clothCanvas);clothTexture.colorSpace=THREE.SRGBColorSpace;clothTexture.wrapS=clothTexture.wrapT=THREE.RepeatWrapping;clothTexture.repeat.set(2,8);clothTexture.anisotropy=4;red.map=ivory.map=clothTexture;
  const gold=new THREE.MeshStandardMaterial({color:0x937046,roughness:.55,metalness:.45});
  const wood=new THREE.MeshStandardMaterial({color:0x352719,roughness:.95});
  const ground=new THREE.Mesh(new THREE.CircleGeometry(23,64),new THREE.MeshStandardMaterial({color:0x8a7050,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;this.group.add(ground);
  // Each panel is a real cloth surface; the dome is closed at the apex and floor.
  const ribs=[];
  for(let i=0;i<48;i++){
   const a=i*Math.PI*2/48,b=(i+1)*Math.PI*2/48,positions=[],indices=[];
   for(const [r,y] of [[19,-.05],[19,5.6],[12,9.7],[.16,13.5]])for(const t of [a,b])positions.push(Math.sin(t)*r,y,Math.cos(t)*r);
   for(let n=0;n<3;n++){const v=n*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
   const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,.42,1,.42,0,.72,1,.72,0,1,1,1],2));geom.setIndex(indices);geom.computeVertexNormals();this.group.add(new THREE.Mesh(geom,i%2?ivory:red));
   if(i%4===0)ribs.push(beam(new THREE.Vector3(Math.sin(a)*19,0,Math.cos(a)*19),new THREE.Vector3(Math.sin(a)*19,5.6,Math.cos(a)*19),.045),beam(new THREE.Vector3(Math.sin(a)*19,5.6,Math.cos(a)*19),new THREE.Vector3(0,13.5,0),.02));
  }
  mergeParts(ribs,wood,this.group);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.25,12,6),red);cap.position.y=13.5;this.group.add(cap);
  for(let i=0;i<4;i++){
   const a=(i+.5)*Math.PI/2;const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,10,12),gold);post.position.set(Math.sin(a)*10,5,Math.cos(a)*10);this.group.add(post);
  }
  this._tightrope(gold,wood);
  const seats=grandstands(this.group,{rows:4,radius:9,base:.03,warm:true});
  this.spectators=new FighterCrowd(this.group,seats,28);this.skyLoaded=false;
  this.ready=this.spectators.ready.then(()=>{if(!this.dead){this.skyLoaded=true;this.onSkyLoad?.();}});
  const string=[],bulbs=[];
  for(let i=0;i<72;i++){
   const a=i*Math.PI*2/72,b=(i+1)*Math.PI*2/72,r=14;
   const p=new THREE.Vector3(Math.sin(a)*r,5.5-.35*Math.cos(a*8),Math.cos(a)*r),q=new THREE.Vector3(Math.sin(b)*r,5.5-.35*Math.cos(b*8),Math.cos(b)*r);
   string.push(beam(p,q,.01));const bulb=new THREE.SphereGeometry(.065,6,5);bulb.translate(p.x,p.y,p.z);bulbs.push(bulb);
  }
  mergeParts(string,wood,this.group);mergeParts(bulbs,new THREE.MeshBasicMaterial({color:0xffcc73}),this.group);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.4,1.15),new THREE.MeshBasicMaterial({map:label('CIRCO  •  HOME BOXING','#751323','#f5d894')}));sign.position.set(0,5.3,-17.8);this.group.add(sign);
  const curtain=new THREE.Mesh(new THREE.BoxGeometry(6,4,.25),red);curtain.position.set(0,2,-18.1);this.group.add(curtain);
  this.performers=[];
  const costumes=[[0x247a87,0xeab653],[0x793e95,0xf1d193],[0xb33745,0x4eb9b2],[0x3764a4,0xe7a45a]];
  for(let i=costumes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[costumes[i],costumes[j]]=[costumes[j],costumes[i]];}
  for(let side=0;side<4;side++){
   const rig=new THREE.Group(),a=side*Math.PI/2;rig.position.set(Math.sin(a)*7.6,0,-Math.cos(a)*7.6);rig.rotation.y=-a;this.group.add(rig);
   const stage=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.24,32),wood);stage.position.y=.12;rig.add(stage);
   const edge=new THREE.Mesh(new THREE.TorusGeometry(1.45,.025,5,32),gold);edge.rotation.x=Math.PI/2;edge.position.y=.245;rig.add(edge);
   const act=new THREE.Group(),angle=Math.random()*Math.PI*2,radius=Math.sqrt(Math.random())*.52;act.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius);act.rotation.y=(Math.random()-.5)*.35;rig.add(act);
   const armStart=(this.arms||[]).length,juggler=this.makeJuggler(...costumes[side]);juggler.position.y=.24;act.add(juggler);
   const balls=[];for(const color of [0xe24a35,0xf6c444,0x40a6c4]){const ball=new THREE.Mesh(new THREE.SphereGeometry(.10,12,8),new THREE.MeshStandardMaterial({color,roughness:.48}));act.add(ball);balls.push(ball);}
   this.performers.push({juggler,balls,arms:this.arms.slice(armStart),phase:side*.43});
  }
  this.juggler=this.performers[0].juggler;this.balls=this.performers[0].balls;
  // The pennant line is visibly suspended from the tent poles.
  const pennantRope=[];for(let i=0;i<32;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;pennantRope.push(beam(new THREE.Vector3(Math.sin(a)*13,6.2,Math.cos(a)*13),new THREE.Vector3(Math.sin(b)*13,6.2,Math.cos(b)*13),.018));}
  for(let i=0;i<4;i++){const a=(i+.5)*Math.PI/2;pennantRope.push(beam(new THREE.Vector3(Math.sin(a)*10,7.2,Math.cos(a)*10),new THREE.Vector3(Math.sin(a)*13,6.2,Math.cos(a)*13),.022));}
  mergeParts(pennantRope,new THREE.MeshStandardMaterial({color:0xb99d71,roughness:.9,emissive:0x33291c}),this.group);
  this.banners=[];for(let i=0;i<16;i++){
   const a=i*Math.PI/8;const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([-.28,0,0,.28,0,0,0,-.48,0],3));geom.computeVertexNormals();
   const pennant=new THREE.Mesh(geom,i%2?ivory:red);pennant.position.set(Math.sin(a)*13,6.2,Math.cos(a)*13);pennant.rotation.y=a;this.group.add(pennant);this.banners.push(pennant);
  }
 }
 _tightrope(gold,wood){
  const height=7.7;
  const rope=new THREE.Mesh(beam(new THREE.Vector3(-12,height,0),new THREE.Vector3(12,height,0),.026),new THREE.MeshStandardMaterial({color:0xc4ac80,roughness:.85}));this.group.add(rope);
  const supports=[];
  for(const side of [-1,1]){
   supports.push(beam(new THREE.Vector3(side*12,0,0),new THREE.Vector3(side*12,height+.5,0),.095));
   const platform=new THREE.Mesh(new THREE.BoxGeometry(1.2,.15,1.1),wood);platform.position.set(side*12,height-.1,0);this.group.add(platform);
  }
  mergeParts(supports,gold,this.group);
  const start=(this.arms||[]).length,artist=this.makeJuggler();artist.position.set(0,height,0);artist.rotation.y=Math.PI/2;this.group.add(artist);
  const arms=this.arms.splice(start);
  // Balance arms extend naturally from the shoulders instead of juggling.
  for(let i=0;i<arms.length;i++){
   const arm=arms[i],s=i===0?-1:1;for(const child of [...arm.children]){arm.remove(child);child.geometry.dispose();}
   const cloth=new THREE.MeshStandardMaterial({color:0x18394b,roughness:.9}),skin=new THREE.MeshStandardMaterial({color:0xc99b77,roughness:.9});
   arm.add(new THREE.Mesh(beam(new THREE.Vector3(),new THREE.Vector3(s*.25,-.025,.04),.055),cloth));
   arm.add(new THREE.Mesh(beam(new THREE.Vector3(s*.25,-.025,.04),new THREE.Vector3(s*.49,-.05,.08),.044),skin));
   const hand=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),skin);hand.position.set(s*.49,-.05,.08);arm.add(hand);
  }
  const oldLegs=artist.children.filter(o=>o.isMesh&&o.geometry.type==='CapsuleGeometry'&&o.position.y>.2&&o.position.y<.8),oldShoes=artist.children.filter(o=>o.isMesh&&o.geometry.type==='CapsuleGeometry'&&o.position.y<.2);
  for(const mesh of [...oldLegs,...oldShoes]){artist.remove(mesh);mesh.geometry.dispose();}
  const torso=new THREE.Group();torso.position.y=.94;
  for(const child of [...artist.children]){artist.remove(child);child.position.y-=.94;torso.add(child);}artist.add(torso);
  const balance=new THREE.Mesh(beam(new THREE.Vector3(-1.55,.29,.08),new THREE.Vector3(1.55,.29,.08),.018),gold);torso.add(balance);
  const legMat=new THREE.MeshStandardMaterial({color:0x18394b,roughness:.9}),shoeMat=new THREE.MeshStandardMaterial({color:0x211c1a,roughness:.85});
  const legs=[],shoes=[];
  for(let i=0;i<2;i++){
   const upper=new THREE.Mesh(new THREE.CylinderGeometry(.072,.061,1,10),legMat),lower=new THREE.Mesh(new THREE.CylinderGeometry(.059,.044,1,10),legMat),knee=new THREE.Mesh(new THREE.SphereGeometry(.060,10,8),legMat);
   const shoe=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),shoeMat);shoe.scale.set(.050,.055,.145);artist.add(upper,lower,knee,shoe);legs.push({upper,lower,knee});shoes.push(shoe);
  }
  artist.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  this.walker={artist,torso,arms,legs,shoes,height,distance:0,lastX:null};
  const light=new THREE.SpotLight(0xffecd1,32,25,Math.PI/5,.65,1);light.position.set(0,12.3,0);light.target.position.set(0,0,0);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0003;light.shadow.normalBias=.012;this.group.add(light,light.target);this.walkerLight=light;
  const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.23,.17,.3,12),new THREE.MeshStandardMaterial({color:0x282523,metalness:.4,roughness:.6}));lamp.position.copy(light.position);this.group.add(lamp);
 }
 makeJuggler(clothColor=0x18394b,trimColor=0xc64535){
  const g=new THREE.Group(),skin=new THREE.MeshStandardMaterial({color:0xc99b77,roughness:.85}),cloth=new THREE.MeshStandardMaterial({color:clothColor,roughness:.95}),trim=new THREE.MeshStandardMaterial({color:trimColor,roughness:.8});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.20,.36,4,12),cloth);body.position.y=1.14;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),skin);head.scale.set(.88,1.08,.92);head.position.y=1.66;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.142,12,6,0,Math.PI*2,0,Math.PI*.5),new THREE.MeshStandardMaterial({color:0x291c17}));hair.position.y=1.70;g.add(hair);
  const eyes=new THREE.MeshStandardMaterial({color:0xe8e3d8}),pupil=new THREE.MeshStandardMaterial({color:0x251c17});
  for(const s of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.016,8,6),eyes);eye.position.set(s*.047,1.69,.122);g.add(eye);const iris=new THREE.Mesh(new THREE.SphereGeometry(.007,6,4),pupil);iris.position.set(s*.047,1.694,.136);g.add(iris);const ear=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),skin);ear.scale.set(.55,1,.7);ear.position.set(s*.129,1.67,0);g.add(ear);}
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),skin);nose.scale.set(.6,.85,1);nose.position.set(0,1.665,.133);g.add(nose);
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.027,.004,4,10,Math.PI),pupil);mouth.rotation.z=Math.PI;mouth.position.set(0,1.625,.126);g.add(mouth);
  for(const s of [-1,1]){const lapel=new THREE.Mesh(new THREE.BoxGeometry(.045,.24,.02),new THREE.MeshStandardMaterial({color:0xf0dfba,roughness:.9}));lapel.position.set(s*.075,1.27,.195);lapel.rotation.z=s*.25;g.add(lapel);}
  const belt=new THREE.Mesh(new THREE.CylinderGeometry(.20,.20,.08,12),trim);belt.position.y=.94;g.add(belt);
  for(const s of [-1,1]){
   const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.63,3,8),cloth);leg.position.set(s*.12,.51,0);g.add(leg);
   const shoe=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.13,3,8),new THREE.MeshStandardMaterial({color:0x211c1a}));shoe.rotation.x=Math.PI/2;shoe.position.set(s*.12,.09,.07);g.add(shoe);
   const arm=new THREE.Group();arm.position.set(s*.22,1.34,0);g.add(arm);
   const upper=new THREE.Mesh(beam(new THREE.Vector3(),new THREE.Vector3(s*.10,-.25,.04),.055),cloth);arm.add(upper);
   const forearm=new THREE.Mesh(beam(new THREE.Vector3(s*.10,-.25,.04),new THREE.Vector3(s*.07,-.12,.29),.045),skin);arm.add(forearm);
   const hand=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),skin);hand.position.set(s*.07,-.12,.29);arm.add(hand);(this.arms||=[]).push(arm);
  }return g;
 }
 setRing(size){this.ringSize=size;}
 update(dt){
  this.time+=Math.min(.1,dt);const t=this.time;this.spectators.update(dt);
  const w=this.walker,phase=t*Math.PI*2/150,x=9*Math.sin(phase),direction=Math.cos(phase)>=0?1:-1;
  if(w.lastX!==null)w.distance+=Math.abs(x-w.lastX);w.lastX=x;
  w.artist.position.set(x,w.height+.026,0);
  const yaw=direction*Math.PI/2,turn=Math.atan2(Math.sin(yaw-w.artist.rotation.y),Math.cos(yaw-w.artist.rotation.y));w.artist.rotation.y+=THREE.MathUtils.clamp(turn,-dt*.8,dt*.8);
  const stride=w.distance*Math.PI/.23,moving=THREE.MathUtils.smoothstep(Math.abs(Math.cos(phase)),.04,.32);
  w.torso.rotation.z=.028*Math.sin(stride)*moving+.014*Math.sin(t*1.1);w.torso.rotation.x=.018*Math.sin(stride*2)*moving;
  for(let i=0;i<w.arms.length;i++){w.arms[i].rotation.z=.075*Math.sin(t*.9+i*Math.PI);w.arms[i].rotation.y=.045*Math.sin(t*1.3+i);}
  const segment=(mesh,a,b)=>{mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());};
  for(let i=0;i<2;i++){
   const s=i===0?-1:1,step=stride+i*Math.PI,foot=new THREE.Vector3(s*.015,.055+.10*Math.max(0,Math.sin(step))*moving,.19*Math.cos(step)*moving);
   w.shoes[i].position.copy(foot);w.shoes[i].rotation.x=-.13*Math.max(0,Math.sin(step))*moving;
   const hip=new THREE.Vector3(s*.085,.93,0),ankle=foot.clone().add(new THREE.Vector3(0,.025,-.02)),d=ankle.clone().sub(hip),u=d.clone().normalize(),length=.45,along=d.length()*.5,bend=Math.sqrt(Math.max(0,length*length-along*along)),pole=new THREE.Vector3(0,0,1).addScaledVector(u,-u.z).normalize(),knee=hip.clone().addScaledVector(u,along).addScaledVector(pole,bend);
   w.legs[i].knee.position.copy(knee);segment(w.legs[i].upper,hip,knee);segment(w.legs[i].lower,knee,ankle);
  }
  for(const performer of this.performers){
   const pt=t+performer.phase;
   for(let i=0;i<3;i++){
    const phase=((pt/1.6+i/3)%1),left=phase<.5,u=(phase%.5)*2;
    performer.balls[i].position.set((left?-1:1)*(.30-.60*u),1.49+1.0*4*u*(1-u),.30);
   }
   for(let i=0;i<performer.arms.length;i++)performer.arms[i].rotation.x=.08*Math.sin(pt*Math.PI*2/1.6+i*Math.PI);
   performer.juggler.rotation.z=.018*Math.sin(pt*1.8);
  }
  for(let i=0;i<this.banners.length;i++)this.banners[i].rotation.x=.025*Math.sin(t*.7+i);
 }
 dispose(){this.dead=true;this.spectators.dispose();this.walkerLight.shadow.dispose();}
}

