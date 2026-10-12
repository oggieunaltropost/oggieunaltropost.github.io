// Shared contact and conditioning rules for human, sparring and CPU fights.
import * as THREE from 'three';
const clamp=THREE.MathUtils.clamp;
export const PUNCH_LIMITS={peak:1.8,current:1.2,travel:.12};
export function closestOnSegment(p,a,b){const d=b.clone().sub(a),t=clamp(p.clone().sub(a).dot(d)/Math.max(1e-12,d.lengthSq()),0,1);return a.clone().addScaledVector(d,t);}
// Earliest entry into a sphere/capsule, including very fast sweeps between frames.
export function sweepContact(a,b,shape,radius=.075){
 const r=radius+shape.radius,at=t=>a.clone().lerp(b,t);
 const c0=shape.prevCenter||shape.center,e0=shape.prevEnd||shape.end||c0;
 const c1=shape.center,e1=shape.end||c1;
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
 const distance=t=>{
  const cx=c0.x+(c1.x-c0.x)*t,cy=c0.y+(c1.y-c0.y)*t,cz=c0.z+(c1.z-c0.z)*t;
  const ex=e0.x+(e1.x-e0.x)*t-cx,ey=e0.y+(e1.y-e0.y)*t-cy,ez=e0.z+(e1.z-e0.z)*t-cz,length=ex*ex+ey*ey+ez*ez;
  const x=a.x+dx*t-cx,y=a.y+dy*t-cy,z=a.z+dz*t-cz;
  const u=length>1e-12?clamp((x*ex+y*ey+z*ez)/length,0,1):0;
  return (x-u*ex)**2+(y-u*ey)**2+(z-u*ez)**2;
 };
 let lo=0,hi=1;
 for(let i=0;i<26;i++){const x=(2*lo+hi)/3,y=(lo+2*hi)/3;if(distance(x)<distance(y))hi=y;else lo=x;}
 const minimum=(lo+hi)/2;
 if(Math.min(distance(minimum),distance(0),distance(1))>r*r)return null;
 let t=0;
 if(distance(0)>r*r){lo=0;hi=distance(1)<distance(minimum)?1:minimum;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(distance(m)>r*r)lo=m;else hi=m;}t=hi;}
 const point=at(t),c=c0.clone().lerp(c1,t),e=e0.clone().lerp(e1,t);
 const normal=point.clone().sub(closestOnSegment(point,c,e)).normalize(),direction=b.clone().sub(a).normalize();
 const alignment=clamp(-direction.dot(normal),0,1);
 return {...shape,t,point,normal,quality:clamp(.25+.75*alignment,.25,1)};
}
export function firstContact(a,b,shapes,radius=.075){let best=null;for(const shape of shapes){const c=sweepContact(a,b,shape,radius);if(c&&(!best||c.t<best.t-1e-5||(Math.abs(c.t-best.t)<=1e-5&&c.kind==='block')))best=c;}return best;}
export function fighterShapes(f){
 const [top,bottom]=f.torso(),shapes=[{kind:'hit',zone:'head',center:f.headCenter(),radius:.105},{kind:'hit',zone:'body',center:top,end:bottom,radius:.15}];
 for(const s of ['l','r']){
  shapes.push({kind:'block',side:s==='l'?'left':'right',center:f.glove(s).center,radius:.065});
  shapes.push({kind:'block',side:s==='l'?'left':'right',center:f.bonePos('lowerarm_'+s),end:f.bonePos('hand_'+s),radius:.045});
 }
 shapes.forEach((shape,i)=>{const previous=f.previousCollisionShapes?.[i];if(previous){shape.prevCenter=previous.center;shape.prevEnd=previous.end;}});
 return shapes;
}
export function playerShapes(player){
 if(player.f)return fighterShapes(player.f);
 const h=player.head,shapes=[{kind:'hit',zone:'head',center:h.clone(),radius:.105},{kind:'hit',zone:'body',center:h.clone().add(new THREE.Vector3(0,-.28,0)),end:h.clone().add(new THREE.Vector3(0,-.62,0)),radius:.15}];
 for(const g of Object.values(player.gloves))if(g.mesh.visible&&!g.coasting){
  shapes.push(g.guardBack?{kind:'block',side:g.side,center:g.guardBack.clone(),end:g.guardFront.clone(),prevCenter:g.prevGuardBack.clone(),prevEnd:g.prevGuardFront.clone(),radius:.062}:
   {kind:'block',side:g.side,center:g.center.clone(),prevCenter:g.prev?.clone(),radius:.075});
 }
 return shapes;
}
export function conditioning(state){state.stamina??=100;state.shock??=0;state.exertion??=0;return state;}
export function exert(state,cost=2){conditioning(state);state.stamina=Math.max(0,state.stamina-cost);state.exertion=.65;}
export function recoverCombat(state,dt,rest=false){
 conditioning(state);state.exertion=Math.max(0,state.exertion-dt);
 state.stamina=Math.min(100,state.stamina+dt*(rest?18:state.exertion>0?1.5:7));
 state.shock=Math.max(0,state.shock-dt*(rest?18:9));
 if(!rest)state.dmg=Math.max(0,(state.dmg||0)-dt*.12);
}
export function impactPower(speed,quality=1,stamina=100){return clamp(speed/5,.22,2.2)*clamp(quality,.25,1)*(.7+.3*clamp(stamina/100,0,1));}
export function applyImpact(state,zone,power,quality=1){
 conditioning(state);const damage=(zone==='head'?3.5+6*power:2+3.5*power)*clamp(quality,.25,1);
 state.dmg=Math.min(100,(state.dmg||0)+damage);
 state.shock=Math.min(100,state.shock+(zone==='head'?damage*1.6:damage*.45));
 if(zone==='body')exert(state,damage*.65);
 return {damage,down:state.dmg>=100||state.shock>=100,stun:clamp(.08+damage*.016,.12,.48)};
}
