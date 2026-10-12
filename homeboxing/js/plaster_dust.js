import * as THREE from 'three';

// Fixed pools: two draw calls, no allocations or scene growth after a punch.
export class PlasterDust {
  constructor(parent) {
    this.group=new THREE.Group();this.group.name='polvere intonaco';parent.add(this.group);
    this.cooldown=0;this.cursor=0;this.particles=Array.from({length:256},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:0,ground:false,angle:0}));
    this.fade=new THREE.InstancedBufferAttribute(new Float32Array(96),1);
    const geo=new THREE.DodecahedronGeometry(1,0);geo.setAttribute('dustFade',this.fade);
    const mat=new THREE.MeshLambertMaterial({color:0x424449,transparent:true,depthWrite:false});
    mat.onBeforeCompile=s=>{
      s.vertexShader='attribute float dustFade; varying float vDustFade;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDustFade=dustFade;');
      s.fragmentShader='varying float vDustFade;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vDustFade;');
    };
    this.flakes=new THREE.InstancedMesh(geo,mat,96);this.flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.flakes.frustumCulled=false;this.group.add(this.flakes);
    for(let i=0;i<96;i++)this.flakes.setColorAt(i,new THREE.Color().setScalar(.65+Math.random()*.45));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const g=canvas.getContext('2d');
    const gradient=g.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,255,255,.4)');gradient.addColorStop(.4,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gradient;g.fillRect(0,0,32,32);
    const pg=new THREE.BufferGeometry();this.positions=new Float32Array(160*3);this.pointFade=new THREE.BufferAttribute(new Float32Array(160),1);
    pg.setAttribute('position',new THREE.BufferAttribute(this.positions,3));pg.setAttribute('dustFade',this.pointFade);
    const pm=new THREE.PointsMaterial({map:new THREE.CanvasTexture(canvas),size:.065,color:0x45474c,transparent:true,depthWrite:false});
    pm.onBeforeCompile=s=>{
      s.vertexShader='attribute float dustFade; varying float vDustFade;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDustFade=dustFade;');
      s.fragmentShader='varying float vDustFade;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vDustFade;');
    };
    this.cloud=new THREE.Points(pg,pm);this.cloud.frustumCulled=false;this.group.add(this.cloud);this.dummy=new THREE.Object3D();this.clear();
  }
  impact(speed) {
    if(speed<7 || this.cooldown>0)return false;
    this.cooldown=2.5;
    const strength=Math.min(1,(speed-7)/5),chunks=Math.round(28+strength*16),fine=Math.round(52+strength*30);
    for(const [start,end,count] of [[0,96,chunks],[96,256,fine]]){
      for(let k=0;k<count;k++){
        const i=start+((this.cursor+k)%(end-start)),p=this.particles[i],a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.55;
        Object.assign(p,{life:14+Math.random()*6,x:Math.cos(a)*r,y:4.57-Math.random()*.05,z:Math.sin(a)*r,vx:(Math.random()-.5)*.35,vy:-.1-Math.random()*.2,vz:(Math.random()-.5)*.35,size:.006+Math.random()*.011,ground:false,angle:Math.random()*Math.PI});
      }
    }
    this.cursor+=83;this.group.visible=true;return true;
  }
  update(dt) {
    this.cooldown=Math.max(0,this.cooldown-dt);let active=0;
    for(let i=0;i<256;i++){
      const p=this.particles[i];p.life=Math.max(0,p.life-dt);
      if(p.life>0){active++;
        if(!p.ground){const fine=i>=96;p.vy=Math.max(fine?-1.15:-5,p.vy-dt*(fine?1.2:5.5));p.angle+=dt*(fine?.4:1.2);p.x+=(p.vx+Math.sin(p.angle*2)*.045)*dt;p.z+=(p.vz+Math.cos(p.angle*1.7)*.045)*dt;p.y+=p.vy*dt;
          if(p.y<=.014){p.y=.014;p.ground=true;p.life=Math.min(p.life,9+Math.random()*4);}
        }
      }
      const fade=p.life>0?Math.min(1,p.life/4):0;
      if(i<96){this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.ground?0:p.angle,p.angle,p.ground?0:p.angle*.3);this.dummy.scale.set(p.size,p.ground?.0015:p.size*.22,p.size*.8);this.dummy.updateMatrix();this.flakes.setMatrixAt(i,this.dummy.matrix);this.fade.array[i]=fade;}
      else {const j=i-96;this.positions[j*3]=p.x;this.positions[j*3+1]=p.y;this.positions[j*3+2]=p.z;this.pointFade.array[j]=fade*(p.ground?.35:.75);}
    }
    this.flakes.instanceMatrix.needsUpdate=true;this.fade.needsUpdate=true;this.cloud.geometry.attributes.position.needsUpdate=true;this.pointFade.needsUpdate=true;this.group.visible=active>0;
  }
  clear(){for(const p of this.particles)p.life=0;this.cooldown=0;this.update(0);}
}
