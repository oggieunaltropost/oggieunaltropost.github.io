// Guard -> load -> strike -> direct recovery. Distances are metres in world space.
import * as THREE from 'three';
const up=new THREE.Vector3(0,1,0),clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

export function punchMotion(name,side,shoulder,wrist,elbow,aim,forward,lengths) {
  const hook=name.startsWith('hook'),uppercut=name.startsWith('uppercut'),sign=side==='l'?1:-1;
  const scale=(lengths[0]+lengths[1])/.60;
  const lateral=new THREE.Vector3(forward.z,0,-forward.x).multiplyScalar(sign);
  const start=wrist.clone(),startPole=elbow.clone().sub(shoulder);
  const endpoint=aim.clone().addScaledVector(forward,-.085*scale);
  // Compact hooks/uppercuts never become straight punches to reach a distant target.
  const required=Math.acos(clamp((lengths[0]**2+lengths[1]**2-endpoint.distanceToSquared(shoulder))/(2*lengths[0]*lengths[1]),-1,1))*180/Math.PI;
  const armAngle=hook?clamp(required,88,120):uppercut?98:165;
  const minArmAngle=hook?88:uppercut?90:0;
  const maxReach=Math.sqrt(lengths[0]**2+lengths[1]**2-2*lengths[0]*lengths[1]*Math.cos(THREE.MathUtils.degToRad(armAngle)));
  const reach=endpoint.clone().sub(shoulder);reach.clampLength(0,maxReach);endpoint.copy(shoulder).add(reach);
  let load=start.clone();
  if(hook)load.copy(shoulder).add(reach.clone().applyAxisAngle(up,sign*.95));
  if(uppercut) {
    // Hand drops beside the ribs; elbow is tucked down and slightly behind.
    load.copy(start).addScaledVector(forward,-.065*scale);load.y=Math.min(start.y-.23*scale,endpoint.y-.24*scale);
    load.addScaledVector(lateral,.025*scale);
  }
  const curve=t=>{
    if(hook)return shoulder.clone().add(reach.clone().applyAxisAngle(up,sign*.95*(1-t)));
    if(uppercut){
      // Upward scoop, not a rising straight: forward reach develops before the lift.
      const control=load.clone().addScaledVector(forward,.20*scale);control.y=load.y+.025*scale;
      return load.clone().multiplyScalar((1-t)**2).addScaledVector(control,2*(1-t)*t).addScaledVector(endpoint,t*t);
    }
    return start.clone().lerp(endpoint,t);
  };
  const strikePole=(hand,currentShoulder)=>{
    if(hook){const axis=hand.clone().sub(currentShoulder).normalize(),p=lateral.clone().addScaledVector(up,(hand.y-currentShoulder.y)/Math.max(.08,Math.hypot(...lengths)));return p.addScaledVector(axis,-p.dot(axis));}
    return lateral.clone().multiplyScalar(uppercut?.12:.28).addScaledVector(up,-1).addScaledVector(forward,uppercut?-.30:0);
  };
  const fistAt=t=>{
    const hand=curve(t),axis=hand.clone().sub(shoulder),[a,b]=lengths;
    const min=hook||uppercut?Math.sqrt(a*a+b*b-2*a*b*Math.cos(THREE.MathUtils.degToRad(minArmAngle))):Math.abs(a-b)+.01;
    const distance=clamp(axis.length(),min,maxReach);axis.normalize();hand.copy(shoulder).addScaledVector(axis,distance);
    const pole=strikePole(hand,shoulder);pole.addScaledVector(axis,-pole.dot(axis));pole.normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance),elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)));
    return hand.clone().addScaledVector(hand.clone().sub(elbow).normalize(),.09);
  };
  // Calibrate the PADDED CENTRE after IK, including forearm rotation: wrist
  // length alone underestimates the upward scoop and makes uppercuts too fast.
  const table=[0];let last=fistAt(0),length=0;
  for(let i=1;i<=64;i++){const p=fistAt(i/64);length+=p.distanceTo(last);table.push(length);last=p;}
  const strike=distance=>{
    const d=clamp(distance,0,1)*length;let i=1;while(i<64&&table[i]<d)i++;
    return curve((i-1+(d-table[i-1])/Math.max(1e-8,table[i]-table[i-1]))/64);
  };
  const loadLength=start.distanceTo(load);
  const loadTime=loadLength/.70;
  const loadFraction=clamp(loadTime/Math.max(.001,loadTime+length),.06,.72);
  const sample=phase=>{
    if(phase<loadFraction)return start.clone().lerp(load,smooth(phase/loadFraction));
    // Common acceleration envelope; impact is at phase 1 for all punches.
    return strike(smooth((phase-loadFraction)/(1-loadFraction)));
  };
  const pole=(phase,hand,currentShoulder)=>{
    if(phase<loadFraction)return startPole.clone().lerp(hook?lateral.clone():lateral.clone().multiplyScalar(.12).addScaledVector(up,-1).addScaledVector(forward,-.25),smooth(phase/loadFraction));
    return strikePole(hand,currentShoulder);
  };
  return {start,load,endpoint,length,loadFraction,maxReach,armAngle,minArmAngle,sample,pole,
    // Mean strike speed, excluding deliberate preparation, is identical.
    outboundTime:speed=>(loadTime+length)/Math.max(.1,speed)};
}
