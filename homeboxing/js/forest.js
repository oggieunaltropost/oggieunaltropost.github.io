// La Foresta: Blender geometry, GPU rain and impacts, wet canvas and storm audio.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ForestAudio } from './forest_audio.js?v=20261012215037';
import { Deer } from './deer.js?v=20261012215037';

export const FOREST_FOG = 0x97a3a8;

const rand = (a, b) => a + Math.random() * (b - a);

export class Forest {
  constructor(size = 3.2) {
    this.group = new THREE.Group(); this.group.name = 'foresta';
    this.time = 0; this.ringHalf = (size + .5) / 2; this.dead = false;
    this.skyLoaded = false; this.audio = new ForestAudio(); this.nextStrike = 10;
    this.strikeAge = 10; this.flash = 0; this.loadError = null;
    this._sky(); this._ground(); this._rain(); this._splashes(); this._spray(); this._wetRing(); this._lightning();
    this.deer = new Deer(this.group,this.ringHalf);
    this.deer.onPosition = p => this.audio.moveDeer(p);
    this.deer.onStep = (p,weight) => this.audio.deerStep(p,weight);
    this.ready = new GLTFLoader().loadAsync('assets/foresta/forest.glb?v=20261012215037').then(gltf => {
      if (this.dead) { this._release(gltf.scene); return; }
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        // The ring light's small shadow map is for the fighters. Sampling it
        // over the entire forest wastes time in both eyes without useful shadows.
        o.castShadow = false; o.receiveShadow = false;
        if (o.name.includes('Leaves')) {
          // Foliage does not need per-pixel PBR/environment reflections.
          const original = o.material;
          o.material = new THREE.MeshLambertMaterial({map:original.map,color:original.color,
            alphaTest:.5,side:THREE.DoubleSide,alphaToCoverage:false});
          original.dispose();
          o.material.onBeforeCompile = sh => {
            sh.uniforms.uForestTime = this.timeUniform;
            sh.vertexShader = 'uniform float uForestTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
              `#include <begin_vertex>
              float bend = smoothstep(2.,14.,position.y);
              transformed.x += sin(uForestTime*1.2+position.x*.19+position.z*.25)*bend*.16;
              transformed.z += sin(uForestTime*.8+position.z*.22)*bend*.09;`);
          };
        }
      });
      this.group.add(gltf.scene); this.skyLoaded = true; this.onSkyLoad?.();
    }).catch(e => {
      if (this.dead) return;
      // Release the loading curtain and expose a clear error if an asset is missing.
      this.loadError = e; this.skyLoaded = true; console.error('La Foresta: model failed to load', e);
    });
  }
  _release(root) {
    const textures = new Set();
    root.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) {
      for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); m.dispose();
    } });
    for (const t of textures) t.dispose();
  }
  _sky() {
    this.timeUniform = { value: 0 }; this.flashUniform = { value: 0 };
    const tex = new THREE.TextureLoader().load('assets/foresta/storm_sky.jpg?v=20261012215037');
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      uniforms: { uSky: { value: tex }, uFlash: this.flashUniform, uFogColor: { value: new THREE.Color(FOREST_FOG) } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D uSky;uniform float uFlash;uniform vec3 uFogColor;varying vec2 vUv;
      void main(){vec3 c=mix(uFogColor,texture2D(uSky,vUv).rgb,smoothstep(.015,.15,abs(vUv.y-.5)));
      c+=uFlash*vec3(.24,.28,.34);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(85,32,16), mat);
    sky.frustumCulled = false; sky.renderOrder = -10; this.group.add(sky);
  }
  _ground() {
    const loader = new THREE.TextureLoader();
    const map = loader.load('assets/foresta/ground.jpg?v=20261012215037'); map.colorSpace = THREE.SRGBColorSpace;
    const rough = loader.load('assets/foresta/ground_rough.jpg?v=20261012215037');
    for (const t of [map,rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(22,22); t.anisotropy = 4; }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(44,80), new THREE.MeshStandardMaterial({map,roughness:.96}));
    // Keep roughness texture owned by the ground so the shared freeGPU releases it.
    ground.material.roughnessMap=rough;
    ground.material.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n roughnessFactor = max(roughnessFactor, 0.76);');};
    ground.rotation.x = -Math.PI/2; ground.position.y = -.905; ground.receiveShadow = true; this.group.add(ground);
  }
  _particles(count) {
    const base = new THREE.PlaneGeometry(1,1), g = new THREE.InstancedBufferGeometry();
    g.index = base.index.clone();
    for (const [k,v] of Object.entries(base.attributes)) g.setAttribute(k,v.clone());
    base.dispose();
    const seeds = new Float32Array(count*4);
    for(let i=0;i<seeds.length;i++) seeds[i]=Math.random();
    g.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4)); g.instanceCount=count; return g;
  }
  _rain() {
    const geo = this._particles(4200);
    this.rainMat = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uTime:this.timeUniform,uFlash:this.flashUniform,uRing:{value:this.ringHalf},uWind:{value:1}},
      vertexShader:`attribute vec4 aSeed;uniform float uTime,uRing,uWind;varying vec2 vUv;varying float vFade;
      void main(){vUv=uv;float speed=mix(7.,11.,aSeed.w);float phase=fract(aSeed.z+uTime*speed/12.);
      vec2 xz=(aSeed.xy-.5)*26.; if(aSeed.w>.78) xz=(aSeed.xy-.5)*(uRing*2.);
      vec2 drift=vec2(.65,.2)*uWind;
      xz+=drift*(1.-phase);float onRing=step(abs(xz.x),uRing)*step(abs(xz.y),uRing);
      float bottom=mix(-.9,.006,onRing);vec3 p=vec3(xz.x,bottom+12.*(1.-phase),xz.y);
      vec3 fall=normalize(vec3(-drift.x,-12.,-drift.y));
      vec3 eye=vec3(modelViewMatrix*vec4(p,1.));vec3 f=normalize(mat3(modelViewMatrix)*fall);
      vec3 right=normalize(cross(f,normalize(-eye)));
      eye+=right*position.x*mix(.004,.009,aSeed.w)+f*position.y*mix(.09,.21,aSeed.z);
      vFade=smoothstep(0.,.04,phase)*smoothstep(0.,.04,1.-phase);
      gl_Position=projectionMatrix*vec4(eye,1.);}`,
      fragmentShader:`uniform float uFlash;varying vec2 vUv;varying float vFade;
      void main(){float edge=1.-abs(vUv.x*2.-1.);float a=edge*pow(sin(vUv.y*3.14159),.65)*vFade*.28;
      gl_FragColor=vec4(vec3(.62,.73,.79)+uFlash*.22,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    const rain = new THREE.Mesh(geo,this.rainMat); rain.frustumCulled=false; rain.renderOrder=4; this.group.add(rain);
  }
  _splashes() {
    this.splashMat = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uTime:this.timeUniform,uFlash:this.flashUniform,uRing:{value:this.ringHalf}},
      vertexShader:`attribute vec4 aSeed;uniform float uTime,uRing;varying vec2 vUv;varying float vAge;
      void main(){vUv=uv;vAge=fract(aSeed.z+uTime*mix(1.2,2.5,aSeed.w));
      vec2 p=(aSeed.xy-.5)*22.;if(aSeed.w>.55)p=(aSeed.xy-.5)*(uRing*2.);
      float hit=step(abs(p.x),uRing)*step(abs(p.y),uRing);float y=mix(-.891,.008,hit);
      float scale=mix(.055,.16,vAge);vec3 pos=vec3(p.x+position.x*scale,y,p.y+position.y*scale);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);}`,
      fragmentShader:`uniform float uFlash;varying vec2 vUv;varying float vAge;
      void main(){vec2 p=vUv*2.-1.;float r=length(p);float ring=1.-smoothstep(.04,.10,abs(r-(.15+vAge*.64)));
      float specks=pow(max(0.,sin(atan(p.y,p.x)*7.+vAge*5.)),18.)*(1.-smoothstep(.03,.14,abs(r-.42)));
      float a=(ring+specks*.65)*pow(1.-vAge,2.)*.36;
      gl_FragColor=vec4(vec3(.67,.76,.80)+uFlash*.2,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    const splashes = new THREE.Mesh(this._particles(850),this.splashMat); splashes.frustumCulled=false; splashes.renderOrder=3; this.group.add(splashes);
  }
  _wetRing() {
    // A thin clear water sheen overlays the existing branded canvas.
    const mat=new THREE.MeshPhysicalMaterial({color:0x91aab4,transparent:true,opacity:.13,roughness:.21,metalness:.08,clearcoat:1,clearcoatRoughness:.17,depthWrite:false});
    mat.onBeforeCompile=sh=>{
      sh.uniforms.uForestTime=this.timeUniform;
      sh.vertexShader='varying vec2 vForestCanvas;\n'+sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n vForestCanvas = position.xy;');
      sh.fragmentShader='uniform float uForestTime;\nvarying vec2 vForestCanvas;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec2 ripple = vec2(sin(vForestCanvas.x*180.+uForestTime*3.),sin(vForestCanvas.y*170.-uForestTime*2.))*.012;
        normal = normalize(normal + mat3(viewMatrix) * vec3(ripple.x,0.,-ripple.y));`);
    };
    this.wetRing=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat); this.wetRing.rotation.x=-Math.PI/2; this.wetRing.position.y=.0065;
    this.wetRing.renderOrder=2; this.group.add(this.wetRing); this.setRing(this.ringHalf*2-.5);
  }
  _spray() {
    this.sprayMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{uTime:this.timeUniform,uRing:{value:this.ringHalf},uFlash:this.flashUniform},
      vertexShader:`attribute vec4 aSeed;uniform float uTime,uRing;varying vec2 vUv;varying float vAlpha;
      void main(){vUv=uv;float age=fract(aSeed.z+uTime*1.8);float t=age*.42;
      vec2 p=(aSeed.xy-.5)*16.;if(aSeed.w>.5)p=(aSeed.xy-.5)*(uRing*2.);
      float ring=step(abs(p.x),uRing)*step(abs(p.y),uRing);float bottom=mix(-.889,.012,ring);
      float angle=aSeed.z*62.83;float height=max(0.,1.1*t-4.9*t*t);
      p+=vec2(cos(angle),sin(angle))*t*.25;
      vec4 eye=modelViewMatrix*vec4(p.x,bottom+height,p.y,1.);eye.xy+=position.xy*.008;
      vAlpha=(1.-age)*step(.005,height);gl_Position=projectionMatrix*eye;}`,
      fragmentShader:`uniform float uFlash;varying vec2 vUv;varying float vAlpha;
      void main(){float a=(1.-smoothstep(.2,.5,length(vUv-.5)))*vAlpha*.46;
      gl_FragColor=vec4(vec3(.72,.81,.85)+uFlash*.2,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    const spray=new THREE.Mesh(this._particles(1100),this.sprayMat);spray.frustumCulled=false;spray.renderOrder=4;this.group.add(spray);
  }
  _lightning() {
    this.boltGeo=new THREE.BufferGeometry(); this.boltGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(240*3),3));
    this.boltGeo.setDrawRange(0,0);
    this.bolt=new THREE.LineSegments(this.boltGeo,new THREE.LineBasicMaterial({color:0xdcecff,transparent:true,opacity:0,toneMapped:false}));
    this.bolt.frustumCulled=false; this.group.add(this.bolt);
    this.light=new THREE.DirectionalLight(0xc1d8ff,0); this.light.position.set(-14,20,-18); this.group.add(this.light,this.light.target);
  }
  strike() {
    if(this.dead)return;
    const a=rand(0,Math.PI*2),r=rand(22,31),x=Math.cos(a)*r,z=Math.sin(a)*r;
    const arr=this.boltGeo.attributes.position.array;let i=0;
    const segment=(a,b)=>{for(const p of [a,b]){arr[i++]=p.x;arr[i++]=p.y;arr[i++]=p.z;}};
    let p=new THREE.Vector3(x,27,z);
    for(let j=1;j<=19;j++){
      const q=new THREE.Vector3(x+rand(-1,1),27-j*1.45,z+rand(-.6,.6));segment(p,q);
      if(j%5===0){const b=q.clone().add(new THREE.Vector3(rand(-3,3),-2,rand(-2,2)));segment(q,b);segment(b,b.clone().add(new THREE.Vector3(rand(-2,2),-2,rand(-1,1))));}
      p=q;
    }
    this.boltGeo.attributes.position.needsUpdate=true;this.boltGeo.setDrawRange(0,i/3);
    this.light.position.set(x,20,z); this.strikeAge=0;
    this.group.updateWorldMatrix(true,false);
    const source=this.group.localToWorld(new THREE.Vector3(x,3,z));
    this.audio.thunder(source,r/343+rand(.18,.4),Math.floor(rand(0,3)));
    this.deer.onThunder();
    this.nextStrike=rand(13,27);
  }
  setRing(size) {
    this.ringHalf=(size+.5)/2;
    for(const mat of [this.rainMat,this.splashMat,this.sprayMat]) if(mat) mat.uniforms.uRing.value=this.ringHalf;
    this.wetRing?.scale.set(this.ringHalf*2,this.ringHalf*2,1);
    this.deer?.setRing(this.ringHalf);
  }
  update(dt,cam,observation=null) {
    if(this.dead)return 0;
    dt=Math.min(.1,Math.max(0,dt));this.time+=dt;this.timeUniform.value=this.time;
    const wind=.7+.3*Math.sin(this.time*.43)+.14*Math.sin(this.time*.91);
    this.rainMat.uniforms.uWind.value=wind;
    this.audio.update(cam,wind);
    this.deer.update(dt,observation?.observer,!!observation?.hold);
    this.nextStrike-=dt; if(this.nextStrike<=0 && this.skyLoaded)this.strike();
    this.strikeAge+=dt;const age=this.strikeAge;
    this.flash=age<.44?(Math.exp(-age*19)+.43*Math.exp(-Math.pow((age-.18)*35,2))):0;
    this.flashUniform.value=this.flash;this.light.intensity=this.flash*2.7;
    this.bolt.material.opacity=this.flash*.9;
    return this.flash;
  }
  dispose() { this.dead=true;this.onSkyLoad=null;this.audio.dispose();this.deer.dispose(); }
}
