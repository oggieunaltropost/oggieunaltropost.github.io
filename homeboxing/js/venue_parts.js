import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function beam(a,b,r=.025){
  const length=a.distanceTo(b),g=new THREE.CylinderGeometry(r,r,length,6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
  g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);return g;
}
export function mergeParts(parts,material,parent){const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;}
export function label(text,bg='#161b24',fg='#eee9db',width=1024,height=192){
 const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');
 g.fillStyle=bg;g.fillRect(0,0,width,height);g.strokeStyle=fg;g.lineWidth=3;g.strokeRect(12,12,width-24,height-24);
 g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font=`700 ${height*.45}px Georgia`;g.fillText(text,width/2,height/2,width*.92);
 const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
// Reuse the existing photographs of Blender spectators at their native aspect.
export function audience(parent,{rows=4,count=48,radius=9,rise=.55,warm=false}={}){
 const countAll=rows*count,matrix=new THREE.Object3D(),cells=new Float32Array(countAll*2),poses=new Float32Array(countAll),tints=new Float32Array(countAll);
 const texture=new THREE.Texture();let dead=false;
 const ready=new THREE.TextureLoader().loadAsync('assets/pubblico.webp?v=20261012215037').then(tx=>{if(dead){tx.dispose();return;}texture.copy(tx);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;});
 const geometry=new THREE.PlaneGeometry(1.15,2.3);geometry.translate(0,1.15-2.3*12/512,0);
 geometry.setAttribute('aCell',new THREE.InstancedBufferAttribute(cells,2));const poseAttribute=new THREE.InstancedBufferAttribute(poses,1);geometry.setAttribute('aPose',poseAttribute);geometry.setAttribute('aTint',new THREE.InstancedBufferAttribute(tints,1));
 const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.55,alphaToCoverage:true,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 aCell;attribute float aPose;attribute float aTint;varying float vTint;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=vec2((aCell.x+aPose+uv.x)/8.,1.-(aCell.y+1.-uv.y)/8.);vTint=aTint;');
  shader.fragmentShader='varying float vTint;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=vTint*smoothstep(.45,.95,diffuseColor.a);');
 };
 const crowd=new THREE.InstancedMesh(geometry,material,countAll);crowd.frustumCulled=false;
 for(let row=0;row<rows;row++)for(let i=0;i<count;i++){
  const n=row*count+i,angle=(i+.5*(row%2))*Math.PI*2/count,r=radius+row*.8,y=-.72+row*rise;
  matrix.position.set(Math.sin(angle)*r,y,Math.cos(angle)*r);matrix.rotation.set(0,angle+Math.PI,0);matrix.scale.setScalar(.78);matrix.updateMatrix();crowd.setMatrixAt(n,matrix.matrix);
  const who=(i+row*5)%16;cells[n*2]=(who%2)*4;cells[n*2+1]=Math.floor(who/2);poses[n]=3;tints[n]=(warm?.78:.58)+(i%5)*.035;
 }
 parent.add(crowd);return {ready,update(time){for(let n=0;n<countAll;n++)poses[n]=(Math.sin(time*.35+n*1.71)>.97)?1:3;poseAttribute.needsUpdate=true;},dispose(){dead=true;}};
}
