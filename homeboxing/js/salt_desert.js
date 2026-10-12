// Uyuni: anchored dry salt crust and a stationary distant daytime panorama.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Llamas } from './llamas.js?v=20261012215037';
import { contactShadow } from './contact_shadow.js?v=20261012215037';
import { SaltAudio } from './salt_audio.js?v=20261012215037';

export class SaltDesert {
  constructor(size=3.2){
    this.group=new THREE.Group();this.group.name='Deserto di sale';this.dead=false;this.skyLoaded=false;this.time=0;
    this.sunDir=new THREE.Vector3(-.39,.86,-.33).normalize();this.setRing(size);
    const loader=new THREE.TextureLoader();
    const skyReady=new Promise((resolve,reject)=>{this.skyTex=loader.load('assets/sale/uyuni_panorama.webp?v=20261012215037',resolve,undefined,reject);});this.skyTex.colorSpace=THREE.SRGBColorSpace;this.skyTex.minFilter=THREE.LinearFilter;this.skyTex.generateMipmaps=false;
    // Blend the longitude seam in the shader; geometry remains entirely stationary.
    const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{pano:{value:this.skyTex}},
      vertexShader:`varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D pano;varying vec3 vD;void main(){vec3 d=normalize(vD);vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5);vec3 c=texture2D(pano,uv).rgb;float edge=min(uv.x,1.-uv.x);if(edge<.018){float opposite=uv.x<.5?1.-edge:edge;vec3 b=texture2D(pano,vec2(opposite,uv.y)).rgb;c=mix((c+b)*.5,c,smoothstep(0.,.018,edge));}gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(900,64,32),skyMat);this.sky.name='cielo Uyuni';this.sky.position.y=2.55;this.sky.renderOrder=-10;this.sky.frustumCulled=false;this.group.add(this.sky);
    const albedo=loader.load('assets/sale/salt_albedo.webp?v=20261012215037'),normal=loader.load('assets/sale/salt_normal.png?v=20261012215037'),roughness=loader.load('assets/sale/salt_roughness.webp?v=20261012215037');
    albedo.colorSpace=THREE.SRGBColorSpace;for(const tx of [albedo,normal,roughness]){tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(1200/18,-1200/18);tx.offset.set(-600/18,600/18);tx.anisotropy=4;}
    const mat=new THREE.MeshStandardMaterial({map:albedo,normalMap:normal,normalScale:new THREE.Vector2(.5,.5),roughnessMap:roughness,roughness:.95,metalness:0,envMapIntensity:.1});
    // Real plane extends under the ring and beyond the visible horizon: no panorama-depth gaps.
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),mat);this.ground.rotation.x=-Math.PI/2;this.ground.position.y=0;this.ground.name='crosta di sale';this.group.add(this.ground);
    this.ringShadow=contactShadow(size+1.2,size+1.4,.28);this.ringShadow.material.map=this.ringShadow.material.map.clone();this.ringShadow.position.set(.22,.025,.18);this.group.add(this.ringShadow);
    this.llamas=new Llamas(this.group,this.ringHalf);
    this.audio=new SaltAudio();this.llamas.onStep=(pos,weight)=>this.audio.step(pos,weight);
    this.ready=Promise.all([skyReady,new GLTFLoader().loadAsync('assets/sale/salt_ridges.glb?v=20261012215037').then(g=>{if(this.dead){g.scene.traverse(o=>o.geometry?.dispose());return;}this.ridges=g.scene;g.scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;const old=o.material;o.material=new THREE.MeshLambertMaterial({color:0xe3e0d5,vertexColors:!!o.geometry.attributes.color});old.dispose();}});this.group.add(g.scene);})]).then(()=>{if(!this.dead){this.skyLoaded=true;this.onSkyLoad?.();}}).catch(e=>{if(!this.dead){this.loadError=e;this.skyLoaded=true;console.error('Deserto di sale:',e);}});
  }
  setRing(size){this.ringHalf=(size+.5)/2;this.llamas?.setRing(this.ringHalf);if(this.ringShadow)this.ringShadow.scale.set(size+1.2,size+1.4,1);}
  update(dt,cam=null){if(this.dead)return;this.time+=Math.min(.1,dt);this.audio.update(cam);this.llamas.update(dt);}
  dispose(){this.dead=true;this.onSkyLoad=null;this.llamas.dispose();this.audio.dispose();}
}
