import * as THREE from 'three';
import {beam,mergeParts,label} from './venue_parts.js?v=20261013002357';
import {grandstands,arenaRoof} from './venue_structure.js?v=20261013002357';
import {FighterCrowd} from './fighter_crowd.js?v=20261013002357';
import {CageEffects} from './cage_effects.js?v=20261013002357';

export class MmaCage {
 constructor(size=3.2){
  this.group=new THREE.Group();this.group.name='Gabbia MMA';this.time=0;this.skyLoaded=true;
  const black=new THREE.MeshStandardMaterial({color:0x15191e,roughness:.75,metalness:.3});
  const steel=new THREE.MeshStandardMaterial({color:0x555b61,roughness:.68,metalness:.6});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(24,64),new THREE.MeshStandardMaterial({color:0x15171b,roughness:.93}));floor.rotation.x=-Math.PI/2;floor.position.y=-.85;this.group.add(floor);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(26,40,20),new THREE.MeshBasicMaterial({color:0x080a10,side:THREE.BackSide}));this.group.add(dome);
  const seats=grandstands(this.group,{rows:5,radius:8.6,base:-.65});
  arenaRoof(this.group,24,10,7,6.2);
  this.effects=new CageEffects(this.group);
  this.spectators=new FighterCrowd(this.group,seats,32);this.skyLoaded=false;
  this.ready=this.spectators.ready.then(()=>{if(!this.dead){this.skyLoaded=true;this.onSkyLoad?.();}});
  const trusses=[];
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,x=Math.sin(a)*6,z=Math.cos(a)*6;
   trusses.push(beam(new THREE.Vector3(x,-.8,z),new THREE.Vector3(x,6.2,z),.065));
   const b=(i+1)*Math.PI/4;trusses.push(beam(new THREE.Vector3(x,6.2,z),new THREE.Vector3(Math.sin(b)*6,6.2,Math.cos(b)*6),.08));
   const lamp=new THREE.Mesh(new THREE.BoxGeometry(.6,.08,.25),new THREE.MeshBasicMaterial({color:i%2?0xbfd7ff:0xffeed6}));lamp.position.set(x*.6,5.8,z*.6);lamp.lookAt(0,0,0);this.group.add(lamp);
  }
  mergeParts(trusses,steel,this.group);
  this.panels=[];
  for(let i=0;i<4;i++){
   const tx=label('HOME BOXING  •  FIGHT NIGHT','#101724','#b6cadb');
   const banner=new THREE.Mesh(new THREE.PlaneGeometry(5,1),new THREE.MeshBasicMaterial({map:tx}));const a=i*Math.PI/2;banner.position.set(Math.sin(a)*12,3.2,Math.cos(a)*12);banner.lookAt(0,3.2,0);this.group.add(banner);
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.5),new THREE.MeshBasicMaterial({map:label('HOME BOXING  •  LIVE','#071119','#59a9bc')}));screen.position.set(Math.sin(a)*11,4.7,Math.cos(a)*11);screen.lookAt(0,4.7,0);this.group.add(screen);this.panels.push(screen);
  }
  this.setRing(size);
 }
 setRing(size){
  if(this.cage){this.group.remove(this.cage);const geometries=new Set(),materials=new Set();this.cage.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose()});}
  this.cage=new THREE.Group();this.cage.name='Ottagono';this.group.add(this.cage);
  const radius=(size/2+.3)*Math.SQRT2+.22,height=2.05,width=2*radius*Math.sin(Math.PI/8);
  this.radius=radius;
  const mat=new THREE.MeshStandardMaterial({color:0x303337,metalness:.55,roughness:.78});
  const pad=new THREE.MeshStandardMaterial({color:0x141821,roughness:.65});
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(radius+.12,radius+.12,.82,8),new THREE.MeshStandardMaterial({color:0x11151d,roughness:.85}));platform.position.y=-.415;this.cage.add(platform);
  const cloth=document.createElement('canvas');cloth.width=cloth.height=1024;const paint=cloth.getContext('2d');paint.fillStyle='#687782';paint.fillRect(0,0,1024,1024);
  for(let n=0;n<16000;n++){paint.fillStyle=n%2?'#ffffff08':'#00000008';paint.fillRect((n*71)%1024,(n*113)%1024,1,2);}
  // The marked boxing area retains the scanned room's playable footprint.
  const margin=(1-size/(radius*2))*512;paint.strokeStyle='#dbe0df88';paint.lineWidth=4;paint.strokeRect(margin,margin,1024-margin*2,1024-margin*2);
  paint.fillStyle='#dbe0df55';paint.textAlign='center';paint.font='700 84px sans-serif';paint.fillText('HOME',512,490);paint.fillText('BOXING',512,580);
  const canvasMap=new THREE.CanvasTexture(cloth);canvasMap.colorSpace=THREE.SRGBColorSpace;canvasMap.anisotropy=4;
  const canvas=new THREE.Mesh(new THREE.CircleGeometry(radius,8),new THREE.MeshStandardMaterial({map:canvasMap,roughness:.94}));canvas.rotation.x=-Math.PI/2;canvas.position.y=-.001;canvas.receiveShadow=true;this.cage.add(canvas);
  const wires=[];
  for(const sign of [-1,1])for(let b=-width/2-height;b<width/2+height;b+=.13){
   const points=[];for(const x of [-width/2,width/2]){const y=sign*x+b;if(y>=0&&y<=height)points.push(new THREE.Vector3(x,y,0));}
   for(const y of [0,height]){const x=(y-b)/sign;if(x>-width/2&&x<width/2)points.push(new THREE.Vector3(x,y,0));}
   if(points.length>=2&&points[0].distanceTo(points[1])>.02)wires.push(beam(points[0],points[1],.004));
  }
  const template=new THREE.Group();const wire=mergeParts(wires,mat,template),wireGeometry=wire.geometry;
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+Math.PI/8,center=new THREE.Vector3(Math.sin(a)*radius*Math.cos(Math.PI/8),0,Math.cos(a)*radius*Math.cos(Math.PI/8));
   const panel=new THREE.Mesh(wireGeometry,mat);panel.position.copy(center);panel.rotation.y=a;panel.name='rete metallica';this.cage.add(panel);
   const postAngle=i*Math.PI/4;const post=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,height+.12,10),pad);post.position.set(Math.sin(postAngle)*radius,height/2,Math.cos(postAngle)*radius);this.cage.add(post);
   const rail=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,width,8),pad);rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(a),0,-Math.sin(a)));rail.position.copy(center).setY(height);this.cage.add(rail);
  }
 }
 setMatch(names){
  const text=names.join('  VS  ').toUpperCase();if(text===this.matchText)return;this.matchText=text;
  for(const screen of this.panels){const old=screen.material.map;screen.material.map=label(text,'#101d30','#e0c991',1024,384);screen.material.needsUpdate=true;old.dispose();}
 }
 update(dt,cam){this.time+=Math.min(.1,dt);this.effects.update(dt,cam);this.spectators.update(dt);for(let i=0;i<this.panels.length;i++)this.panels[i].material.color.setScalar(.93+.05*Math.sin(this.time*.65+i));}
 dispose(){this.dead=true;this.effects.dispose();this.spectators.dispose();}
}
