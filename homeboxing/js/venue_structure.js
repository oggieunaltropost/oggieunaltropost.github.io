import * as THREE from 'three';
import {beam,mergeParts} from './venue_parts.js?v=20261012215037';
function seatPanel(w,h,depth){
 const shape=new THREE.Shape(),x=-w/2,y=-h/2,r=.045;
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.01,bevelThickness:.008,bevelSegments:1,steps:1,curveSegments:3});g.translate(0,0,-depth/2);return g;
}

// Solid risers, illuminated nosings and individual seats: no open planes below the crowd.
export function grandstands(parent,{rows,radius,base=0,warm=false}){
 const structure=new THREE.MeshStandardMaterial({color:warm?0x765039:0x475365,roughness:.9,emissive:warm?0x28170e:0x101923,emissiveIntensity:.65});
 const trim=new THREE.MeshBasicMaterial({color:warm?0xa88b5b:0x718da6});
 const seatMat=new THREE.MeshStandardMaterial({color:warm?0x963d32:0x305e83,roughness:.55,emissive:warm?0x30120e:0x0c2033,emissiveIntensity:.20});
 const pieces=[],edges=[],seats=[],backs=[],slots=[],supports=[];
 for(let row=0;row<rows;row++){
  const inner=radius+row*.8,outer=inner+.8,y=base+row*.55;
  const top=new THREE.RingGeometry(inner,outer,96);top.rotateX(-Math.PI/2);top.translate(0,y,0);pieces.push(top);
  const face=new THREE.CylinderGeometry(inner,inner,.55,96,1,true);face.translate(0,y-.275,0);pieces.push(face);
  const lip=new THREE.TorusGeometry(inner+.025,.018,4,96);lip.rotateX(Math.PI/2);lip.translate(0,y+.02,0);edges.push(lip);
  const count=warm?56:64;
  for(let i=0;i<count;i++){
   if(i%16===0)continue; // four aisles
   const a=(i+.5*(row%2))*Math.PI*2/count,r=inner+.42;
   const bottom=seatPanel(.47,.44,.07);bottom.rotateX(-Math.PI/2);bottom.rotateY(a);bottom.translate(Math.sin(a)*r,y+.46,Math.cos(a)*r);seats.push(bottom);
   const back=seatPanel(.47,.37,.08);back.rotateX(.10);back.rotateY(a);back.translate(Math.sin(a)*(r+.21),y+.68,Math.cos(a)*(r+.21));backs.push(back);
   const stem=new THREE.BoxGeometry(.08,.44,.20);stem.rotateY(a);stem.translate(Math.sin(a)*r,y+.22,Math.cos(a)*r);supports.push(stem);
   slots.push({x:Math.sin(a)*(r-.06),y,z:Math.cos(a)*(r-.06),rot:a+Math.PI});
  }
 }
 mergeParts(pieces,structure,parent);mergeParts(edges,trim,parent);mergeParts([...seats,...backs],seatMat,parent);
 mergeParts(supports,structure,parent);return slots;
}

export function arenaRoof(parent,span=24,height=10.5,ringSpan=4.4,rigHeight=4.2,screenHeight=null){
 const steel=new THREE.MeshStandardMaterial({color:0x657382,metalness:.65,roughness:.45,emissive:0x15202c,emissiveIntensity:.35});
 const roofMat=new THREE.MeshStandardMaterial({color:0x222b38,roughness:.9,metalness:.25,emissive:0x111823,emissiveIntensity:.4,side:THREE.DoubleSide});
 const roof=new THREE.Mesh(new THREE.PlaneGeometry(span+4,span+4),roofMat);roof.rotation.x=Math.PI/2;roof.position.y=height+.25;parent.add(roof);
 const walls=[],ribs=[];
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,wallRadius=span/2+2,g=new THREE.BoxGeometry(span+4,6.5,.15);g.rotateY(a);g.translate(Math.sin(a)*wallRadius,height-3.25,Math.cos(a)*wallRadius);walls.push(g);
  for(let k=-4;k<=4;k++){const rib=new THREE.BoxGeometry(.09,6.5,.23);rib.rotateY(a);rib.translate(Math.sin(a)*wallRadius+Math.cos(a)*k*3,height-3.25,Math.cos(a)*wallRadius-Math.sin(a)*k*3);ribs.push(rib);}
 }
 mergeParts(walls,roofMat,parent);mergeParts(ribs,steel,parent);
 const beams=[],wires=[],lights=[],cases=[];const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 for(let x=-span/2;x<=span/2;x+=3){
  beams.push(beam(v(x,height,-span/2),v(x,height,span/2),.09));
  for(let z=-span/2;z<span/2;z+=3){beams.push(beam(v(x,height,z),v(x,height-.55,z+1.5),.027),beam(v(x,height-.55,z+1.5),v(x,height,z+3),.027));}
  beams.push(beam(v(x,height-.55,-span/2),v(x,height-.55,span/2),.05));
 }
 for(let z=-span/2;z<=span/2;z+=3)beams.push(beam(v(-span/2,height,z),v(span/2,height,z),.045));
 if(screenHeight!==null)for(const x of [-.65,.65])for(const z of [-.65,.65])wires.push(beam(v(x,screenHeight+.45,z),v(x,height,z),.012));
 for(let side=0;side<4;side++){
  const a=side*Math.PI/2,point=(x,y,offset=0)=>v(Math.cos(a)*x+Math.sin(a)*(ringSpan/2+offset),y,-Math.sin(a)*x+Math.cos(a)*(ringSpan/2+offset));
  for(const dy of [0,.32])for(const dz of [-.13,.13])beams.push(beam(point(-ringSpan/2,rigHeight+dy,dz),point(ringSpan/2,rigHeight+dy,dz),.03));
  for(let k=0;k<8;k++){const x=-ringSpan/2+k*ringSpan/8,next=x+ringSpan/8;for(const dz of [-.13,.13])beams.push(beam(point(x,rigHeight,dz),point(next,rigHeight+.32,dz),.014));}
  wires.push(beam(point(-ringSpan/2,rigHeight+.32),point(-ringSpan/2,height),.014));
  for(let k=-1;k<=1;k++){
   const pos=point(k*ringSpan/3,rigHeight-.13),q=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),v(-pos.x,-rigHeight,-pos.z).normalize());
   const casing=new THREE.CylinderGeometry(.18,.14,.28,12);casing.applyQuaternion(q);casing.translate(pos.x,pos.y,pos.z);cases.push(casing);
   const lens=new THREE.CircleGeometry(.135,12);lens.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0,0,1),v(-pos.x,-rigHeight,-pos.z).normalize()));const dir=v(-pos.x,-rigHeight,-pos.z).normalize().multiplyScalar(.15);lens.translate(pos.x+dir.x,pos.y+dir.y,pos.z+dir.z);lights.push(lens);
  }
 }
 mergeParts(beams,steel,parent);mergeParts(wires,steel,parent);
 mergeParts(cases,new THREE.MeshStandardMaterial({color:0x171c24,roughness:.65,metalness:.45}),parent);
 mergeParts(lights,new THREE.MeshBasicMaterial({color:0xffe9c0,side:THREE.DoubleSide}),parent);
 const ribbon=[];for(let i=0;i<4;i++){const g=new THREE.BoxGeometry(span,.035,.08);g.rotateY(i*Math.PI/2);g.translate(Math.sin(i*Math.PI/2)*span/2,6.8,Math.cos(i*Math.PI/2)*span/2);ribbon.push(g);}
 mergeParts(ribbon,new THREE.MeshBasicMaterial({color:0x6686ac}),parent);
}
