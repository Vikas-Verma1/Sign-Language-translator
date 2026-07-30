// frontend/src/components/AvatarCanvas.jsx
// Your liked code is kept VERBATIM (RPM_POSES, ASL_ALPHABET, SPELL_ARM, FINGER_SHAPES,
// findBone, buildProceduralHuman + its local-euler posing). The procedural signer path is
// unchanged. ADDED: for your /avatar.glb (unknown bone axes) a posture+sign layer that
//   (1) stops zeroing the head -> head looks FORWARD, not up;
//   (2) world-space-aims the arms to a natural standing pose at REST (no T-pose);
//   (3) world-space-aims the arms per word so signs visibly move on ANY rig.
// Letters idle the body; the inset <SpellingHand> shows A-Z (this model has no finger bones).
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* ===================== CORE LOGIC (UNCHANGED) ===================== */
const FINGER_SHAPES = {
  OPEN_PALM: { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0 },
  FIST:      { index: 1.4, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
  POINT:     { index: 0, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
  FLAT_O:    { index: 0.8, middle: 0.8, ring: 0.8, pinky: 0.8, thumb: 0.9 },
};

const ASL_ALPHABET = {
  A:{index:1.4,middle:1.4,ring:1.4,pinky:1.4,thumb:0.3}, B:{index:0,middle:0,ring:0,pinky:0,thumb:0.9},
  C:{index:0.7,middle:0.7,ring:0.7,pinky:0.7,thumb:0.7}, D:{index:0,middle:1.2,ring:1.2,pinky:1.2,thumb:0.9},
  E:{index:1.1,middle:1.1,ring:1.1,pinky:1.1,thumb:1.0}, F:{index:0.9,middle:0,ring:0,pinky:0,thumb:0.9},
  G:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0.6},   H:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.6},
  I:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0.8},   J:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0.8},
  K:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.4},     L:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0},
  M:{index:1.2,middle:1.2,ring:1.2,pinky:1.4,thumb:0.6}, N:{index:1.2,middle:1.2,ring:1.4,pinky:1.4,thumb:0.6},
  O:{index:0.9,middle:0.9,ring:0.9,pinky:0.9,thumb:0.9}, P:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.5},
  Q:{index:0.9,middle:1.4,ring:1.4,pinky:1.4,thumb:0.9}, R:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.6},
  S:{index:1.4,middle:1.4,ring:1.4,pinky:1.4,thumb:0.9}, T:{index:1.2,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
  U:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.8},     V:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.8},
  W:{index:0,middle:0,ring:0,pinky:1.4,thumb:0.8},       X:{index:0.8,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
  Y:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0},     Z:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
};

const SPELL_ARM = { RightArm:[-1.2,0,0.5], RightForeArm:[-1.7,0,0.2], LeftArm:[0.2,0,-0.8], LeftForeArm:[0,0,0] };

const RPM_POSES = {
  REST:   { arm:{RightArm:[0.2,0,0.8],RightForeArm:[0,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  HELLO:  { arm:{RightArm:[-0.8,0,1.8],RightForeArm:[0,0,1.0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  YOU:    { arm:{RightArm:[-1.2,0,0.2],RightForeArm:[-0.4,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
  YOUR:   { arm:{RightArm:[-1.2,0,0.4],RightForeArm:[-0.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  ME:     { arm:{RightArm:[-0.6,0.5,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
  MY:     { arm:{RightArm:[-0.6,0.5,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  THANKS: { arm:{RightArm:[-1.1,0,0.3],RightForeArm:[-0.8,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  WHAT:   { arm:{RightArm:[-0.7,0.4,0.5],RightForeArm:[-0.8,0,0],LeftArm:[-0.7,-0.4,-0.5],LeftForeArm:[-0.8,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  WHERE:  { arm:{RightArm:[-1.0,0.2,0.6],RightForeArm:[-0.6,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
  NAME:   { arm:{RightArm:[-0.9,0.2,0.3],RightForeArm:[-1.1,0,0],LeftArm:[-0.9,-0.2,-0.3],LeftForeArm:[-1.1,0,0]}, hand:FINGER_SHAPES.POINT },
  PLEASE: { arm:{RightArm:[-0.5,0.3,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
  YES:    { arm:{RightArm:[-0.9,0,0.5],RightForeArm:[-0.7,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.FIST },
  NO:     { arm:{RightArm:[-1.0,0,0.4],RightForeArm:[-0.5,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
  LIKE:   { arm:{RightArm:[-0.7,0.4,0.3],RightForeArm:[-1.3,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
};
const FALLBACK_POSE = { arm:{RightArm:[-0.9,0.2,0.5],RightForeArm:[-0.8,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM };

const ARM_KEYS = ['RightArm','RightForeArm','LeftArm','LeftForeArm'];
const FINGER_KEYS = ['R_Index1','R_Index2','R_Middle1','R_Middle2','R_Ring1','R_Ring2','R_Pinky1','R_Pinky2','R_Thumb1'];

function findBone(scene, keywords) {
  let matched = null;
  scene.traverse((c) => {
    if (c.isBone && !matched) {
      const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const kw of keywords) if (name.includes(kw.toLowerCase())) { matched = c; break; }
    }
  });
  return matched;
}

const KEYWORDS = {
  RightArm:['rightarm','armr','upperarmr','shoulderr','mixamorigrightarm'],
  RightForeArm:['rightforearm','forearmr','lowerarmr','elbowr','mixamorigrightforearm'],
  LeftArm:['leftarm','arml','upperarml','shoulderl','mixamorigleftarm'],
  LeftForeArm:['leftforearm','forearml','lowerarml','elbowl','mixamorigleftforearm'],
  RightHand:['mixamorigrighthand','righthand','handright'],   // added (for forearm aim)
  LeftHand:['mixamoriglefthand','lefthand','handleft'],       // added
  R_Index1:['righthandindex1','index1r','handindex1r'], R_Index2:['righthandindex2','index2r','handindex2r'],
  R_Middle1:['righthandmiddle1','middle1r','handmiddle1r'], R_Middle2:['righthandmiddle2','middle2r','handmiddle2r'],
  R_Ring1:['righthandring1','ring1r','handring1r'], R_Ring2:['righthandring2','ring2r','handring2r'],
  R_Pinky1:['righthandpinky1','pinky1r','handpinky1r'], R_Pinky2:['righthandpinky2','pinky2r','handpinky2r'],
  R_Thumb1:['righthandthumb1','thumb1r','handthumb1r'],
};

/* ===================== ADDED: world-space sign directions (for avatar.glb) =====================
   World frame: +X = viewer-right, +Y = up, +Z = toward viewer. Each entry gives the WORLD
   direction the upper-arm (u) and forearm (f) should point. null = "use the standing pose".
   These read identically on every rig because we aim in world space, not local bone axes.   */
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const STAND = { ru:V(-0.10,-0.95,0.12), rf:V(-0.06,-0.85,0.40), lu:V(0.10,-0.95,0.12), lf:V(0.06,-0.85,0.40) };
const SIGN_DIR = {
  REST:   {}, // -> STAND
  HELLO:  { ru:V(0,0.6,0.8),  rf:V(0,1,0.2) },
  YOU:    { ru:V(0,-0.2,1),   rf:V(0,0,1) },
  YOUR:   { ru:V(0,-0.3,0.95),rf:V(0,0.3,0.95) },
  ME:     { ru:V(0.3,-0.5,0.6),rf:V(0.5,0.7,0.4) },
  MY:     { ru:V(0.3,-0.5,0.6),rf:V(0.5,0.6,0.5) },
  THANKS: { ru:V(0.1,-0.3,0.9),rf:V(0.3,0.6,0.7) },
  WHAT:   { ru:V(-0.5,0.6,0.3),rf:V(0,1,0.3),    lu:V(0.5,0.6,0.3), lf:V(0,1,0.3) },
  WHO:    { ru:V(0,0.1,0.95), rf:V(0.3,0.8,0.4) },
  WHY:    { ru:V(0,0.6,0.5),  rf:V(0.3,0.7,0.5) },
  HOW:    { ru:V(0.2,-0.4,0.6),rf:V(0.5,0.5,0.4), lu:V(-0.2,-0.4,0.6),lf:V(-0.5,0.5,0.4) },
  WHEN:   { ru:V(0.2,0.7,0.3),rf:V(0,1,0.2),     lu:V(-0.2,0.7,0.3), lf:V(0,1,0.2) },
  WHERE:  { ru:V(0,0.85,0.3), rf:V(0,1,0.2) },
  NAME:   { ru:V(0.3,-0.2,0.85),rf:V(0.4,0.6,0.5),lu:V(-0.3,-0.2,0.85),lf:V(-0.4,0.6,0.5) },
  PLEASE: { ru:V(0.2,-0.4,0.7),rf:V(0.4,0.7,0.4) },
  YES:    { ru:V(0,-0.4,0.7), rf:V(0.2,0.8,0.3) },
  NO:     { ru:V(0,-0.1,0.95),rf:V(0,0.3,0.9) },
  LIKE:   { ru:V(0.3,-0.3,0.7),rf:V(0.4,0.7,0.4) },
};
const FALLBACK_DIR = { ru:V(0.15,-0.3,0.9), rf:V(0.3,0.4,0.85) };
/* ===================== /ADDED ===================== */

/* ---------- In-browser procedural rigged human (UNCHANGED) ---------- */
function buildProceduralHuman() {
  const SKIN = new THREE.Color('#cf9a7e'), SKIN2 = new THREE.Color('#b9826a');
  const EYE = new THREE.Color('#241a16'), LIP = new THREE.Color('#7c3b34'), BROW = new THREE.Color('#3a2a22');
  const Y = new THREE.Vector3(0, 1, 0);
  const FINGER_REST = new THREE.Quaternion().setFromAxisAngle(Y, -Math.PI / 2);

  const W = {
    Hips:[0,1.00,0], Spine:[0,1.18,0], Neck:[0,1.46,0], Head:[0,1.58,0],
    RightArm:[-0.18,1.42,0], RightForeArm:[-0.50,1.42,0], RightHand:[-0.78,1.42,0],
    LeftArm:[0.18,1.42,0], LeftForeArm:[0.50,1.42,0], LeftHand:[0.78,1.42,0],
    R_Index1:[-0.84,1.42,0.030], R_Index2:[-0.90,1.42,0.030],
    R_Middle1:[-0.85,1.42,0.010], R_Middle2:[-0.92,1.42,0.010],
    R_Ring1:[-0.84,1.42,-0.012], R_Ring2:[-0.90,1.42,-0.012],
    R_Pinky1:[-0.82,1.42,-0.032], R_Pinky2:[-0.87,1.42,-0.032],
    R_Thumb1:[-0.80,1.40,0.060],
  };
  const PARENT = {
    Spine:'Hips', Neck:'Spine', Head:'Neck',
    RightArm:'Spine', RightForeArm:'RightArm', RightHand:'RightForeArm',
    LeftArm:'Spine', LeftForeArm:'LeftArm', LeftHand:'LeftForeArm',
    R_Index1:'RightHand', R_Index2:'R_Index1', R_Middle1:'RightHand', R_Middle2:'R_Middle1',
    R_Ring1:'RightHand', R_Ring2:'R_Ring1', R_Pinky1:'RightHand', R_Pinky2:'R_Pinky1', R_Thumb1:'RightHand',
  };
  const ORDER = ['Hips','Spine','Neck','Head','RightArm','RightForeArm','RightHand',
    'R_Index1','R_Index2','R_Middle1','R_Middle2','R_Ring1','R_Ring2','R_Pinky1','R_Pinky2','R_Thumb1',
    'LeftArm','LeftForeArm','LeftHand'];
  const isRFinger = (n) => n.startsWith('R_');

  const bones = {}, worldRot = {};
  for (const n of ORDER) {
    const b = new THREE.Bone(); b.name = n; bones[n] = b;
    b.quaternion.copy(isRFinger(n) ? FINGER_REST : new THREE.Quaternion());
  }
  for (const n of ORDER) {
    const p = PARENT[n];
    if (!p) { bones[n].position.set(...W[n]); worldRot[n] = bones[n].quaternion.clone(); continue; }
    bones[p].add(bones[n]);
    const wrParent = worldRot[p];
    const diff = new THREE.Vector3(W[n][0]-W[p][0], W[n][1]-W[p][1], W[n][2]-W[p][2]);
    bones[n].position.copy(diff.applyQuaternion(wrParent.clone().invert()));
    worldRot[n] = wrParent.clone().multiply(bones[n].quaternion);
  }

  const pos=[], nrm=[], col=[], sIdx=[], sWgt=[];
  const push = (geom, boneName, color) => {
    const g = geom.toNonIndexed(); g.computeVertexNormals();
    const pa=g.attributes.position.array, na=g.attributes.normal.array;
    const bi=ORDER.indexOf(boneName), c=new THREE.Color(color), v=pa.length/3;
    for (let i=0;i<v;i++){ pos.push(pa[i*3],pa[i*3+1],pa[i*3+2]); nrm.push(na[i*3],na[i*3+1],na[i*3+2]);
      col.push(c.r,c.g,c.b); sIdx.push(bi,0,0,0); sWgt.push(1,0,0,0); }
  };
  const V3=(a)=>new THREE.Vector3(a[0],a[1],a[2]);
  const box=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
  const sph=(r,x,y,z)=>new THREE.SphereGeometry(r,18,12).translate(x,y,z);
  const limb=(p0,p1,r)=>{ const a=V3(p0),b=V3(p1),dir=new THREE.Vector3().subVectors(b,a); const len=dir.length();
    const geo=new THREE.CylinderGeometry(r,r*0.9,len,12,1);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5),q,new THREE.Vector3(1,1,1)));
    return geo; };
  const tip=(n,ext=0.05)=>{ const p=PARENT[n],d=new THREE.Vector3(W[n][0]-W[p][0],W[n][1]-W[p][1],W[n][2]-W[p][2]).normalize().multiplyScalar(ext);
    return [W[n][0]+d.x,W[n][1]+d.y,W[n][2]+d.z]; };

  push(box(0.30,0.16,0.18,0,1.02,0),'Hips',SKIN);
  push(box(0.34,0.30,0.20,0,1.28,0),'Spine',SKIN); push(sph(0.16,0,1.34,0.05),'Spine',SKIN);
  push(limb([0,1.44,0],[0,1.52,0],0.05),'Neck',SKIN);
  push(sph(0.115,0,1.64,0),'Head',SKIN);
  push(sph(0.018,-0.040,1.660,0.095),'Head',EYE); push(sph(0.018,0.040,1.660,0.095),'Head',EYE);
  push(box(0.030,0.008,0.012,-0.040,1.685,0.090),'Head',BROW); push(box(0.030,0.008,0.012,0.040,1.685,0.090),'Head',BROW);
  push(sph(0.022,0,1.620,0.105),'Head',SKIN2); push(box(0.045,0.012,0.012,0,1.585,0.092),'Head',LIP);
  push(sph(0.028,-0.112,1.630,0),'Head',SKIN2); push(sph(0.028,0.112,1.630,0),'Head',SKIN2);
  push(sph(0.060,...W.RightArm),'RightArm',SKIN); push(sph(0.060,...W.LeftArm),'LeftArm',SKIN);
  push(limb(W.RightArm,W.RightForeArm,0.050),'RightArm',SKIN); push(limb(W.RightForeArm,W.RightHand,0.042),'RightForeArm',SKIN);
  push(sph(0.050,...W.RightHand),'RightHand',SKIN);
  push(limb(W.LeftArm,W.LeftForeArm,0.050),'LeftArm',SKIN); push(limb(W.LeftForeArm,W.LeftHand,0.042),'LeftForeArm',SKIN);
  push(sph(0.050,...W.LeftHand),'LeftHand',SKIN);
  for (const n of FINGER_KEYS) {
    const r = n==='R_Thumb1'?0.014:(n.endsWith('2')?0.011:0.013);
    push(limb(W[n], tip(n, n.endsWith('2')?0.05:0.06), r), n, SKIN2);
  }

  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sIdx,4));
  geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sWgt,4));
  const mat=new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.55, metalness:0.0 });
  const mesh=new THREE.SkinnedMesh(geo,mat); mesh.name='ProceduralSigner'; mesh.frustumCulled=false;

  const group=new THREE.Group(); group.add(bones.Hips); group.add(mesh);
  const b3=new THREE.Box3().setFromObject(group); const sz=b3.getSize(new THREE.Vector3()); const ce=b3.getCenter(new THREE.Vector3());
  group.position.set(-ce.x, -(b3.min.y+sz.y*0.68), -ce.z);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(ORDER.map((n)=>bones[n])));

  const driven = {};
  for (const k of [...ARM_KEYS, ...FINGER_KEYS]) driven[k] = bones[k];
  return { group, driven, head: bones.Head };
}
/* =================== /CORE LOGIC =================== */

export default function AvatarCanvas({ currentToken, nmm }) {
  const mountRef = useRef(null);
  const bonesRef = useRef({});
  const curRot = useRef({});                 // procedural local-euler offsets
  const targetPose = useRef(RPM_POSES.REST); // procedural target
  const signRef = useRef(SIGN_DIR.REST);     // glTF world-space target
  const isGLTFRef = useRef(false);           // which posing path to run
  const nmmRef = useRef(null);
  const [loadingState, setLoadingState] = useState({ loading: true, error: null });
  const [rig, setRig] = useState(null);
  const modelUrl = '/avatar.glb';

  useEffect(() => { nmmRef.current = nmm || null; }, [nmm]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth, height = mountRef.current.clientHeight;
    const scene = new THREE.Scene(); scene.background = null;
    const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
    camera.position.set(0, 0.05, 1.9); camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    mountRef.current.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(3,4,5); scene.add(key);
    const fill=new THREE.DirectionalLight(0x9fc4ff,0.6); fill.position.set(-4,1,2); scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffd9b0,0.9); rim.position.set(0,2,-4); scene.add(rim);

    // scratch objects (no per-frame allocation)
    const _euler = new THREE.Euler(), _quat = new THREE.Quaternion();
    const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
    const _wp = new THREE.Vector3(), _wc = new THREE.Vector3();
    const worldPos = (b, o) => { b.getWorldPosition(o); return o; };

    // ADDED: measure one arm's bind geometry for world-space aiming.
    const measure = (upper, fore, hand) => {
      if (!upper || !fore) return;
      upper.userData.restWorldQ = upper.getWorldQuaternion(new THREE.Quaternion());
      upper.userData.parentInvQ = upper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      upper.userData.restDir = worldPos(fore, _wp).sub(worldPos(upper, _wc)).normalize().clone();
      upper.userData.targetQ = upper.quaternion.clone();
      fore.userData.restWorldQ = fore.getWorldQuaternion(new THREE.Quaternion());
      const fdir = hand ? worldPos(hand, _wp).sub(worldPos(fore, _wc)).normalize() : upper.userData.restDir.clone();
      fore.userData.restDir = fdir.clone();
      fore.userData.targetQ = fore.quaternion.clone();
    };
    // ADDED: aim one arm in world space -> store local target quaternion.
    const solveSide = (upper, fore, ut, ft) => {
      if (!upper || !fore || !upper.userData.restDir) return;
      _qa.setFromUnitVectors(upper.userData.restDir, ut).multiply(upper.userData.restWorldQ); // upper world target
      upper.userData.targetQ.copy(upper.userData.parentInvQ).multiply(_qa);                  // -> local
      _qb.setFromUnitVectors(fore.userData.restDir, ft).multiply(fore.userData.restWorldQ);  // fore world target
      fore.userData.targetQ.copy(_qa).invert().multiply(_qb);                                // -> local
    };

    const useRig = (obj, driven, headBone, source) => {
      // local rest quats (used by the procedural path; harmless for glTF)
      for (const k of [...ARM_KEYS, ...FINGER_KEYS]) {
        const b = driven[k];
        if (b) { b.userData.restQuat = b.quaternion.clone(); curRot.current[k] = { x:0, y:0, z:0 }; }
      }
      if (headBone) headBone.userData.restQuat = headBone.quaternion.clone();
      bonesRef.current = { ...driven, __head: headBone || null, __morphMesh: null, __morphMap: null };
      if (obj) {
        obj.traverse((c) => { if (c.isSkinnedMesh && c.morphTargetDictionary && !bonesRef.current.__morphMesh) {
          bonesRef.current.__morphMesh = c; bonesRef.current.__morphMap = c.morphTargetDictionary; } });
        scene.add(obj);
      }
      const arms = ARM_KEYS.filter((k) => driven[k]).length;
      const fingers = FINGER_KEYS.filter((k) => driven[k]).length;

      if (source === 'glTF') {
        // ADDED: bake bind world transforms, then measure arms for world-space posing.
        scene.updateMatrixWorld(true);
        measure(driven.RightArm, driven.RightForeArm, driven.RightHand);
        measure(driven.LeftArm, driven.LeftForeArm, driven.LeftHand);
        isGLTFRef.current = true;
      } else {
        isGLTFRef.current = false;
      }

      setRig({ source, arms, fingers });
      console.table(Object.fromEntries([...ARM_KEYS, ...FINGER_KEYS].map((k) => [k, driven[k] ? '✅ found' : '❌ missing'])));
      setLoadingState({ loading: false, error: null });
    };

    const useProcedural = (reason) => {
      console.warn('[Avatar] Using procedural signer:', reason);
      const { group, driven, head } = buildProceduralHuman();
      useRig(group, driven, head, 'procedural');
    };

    new GLTFLoader().load(modelUrl, (gltf) => {
      const avatar = gltf.scene;
      const b3=new THREE.Box3().setFromObject(avatar); const sz=b3.getSize(new THREE.Vector3()); const ce=b3.getCenter(new THREE.Vector3());
      avatar.position.set(-ce.x, -(b3.min.y+sz.y*0.68), -ce.z);
      const driven = {}; for (const k of [...ARM_KEYS, ...FINGER_KEYS, 'RightHand', 'LeftHand']) driven[k] = findBone(avatar, KEYWORDS[k]);
      const headBone = findBone(avatar, ['mixamorighead','head']);
      if (ARM_KEYS.filter((k) => driven[k]).length === 0) { useProcedural('avatar.glb has no drivable arm bones'); return; }
      useRig(avatar, driven, headBone, 'glTF');
    }, undefined, () => useProcedural('avatar.glb failed to load'));

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const B = bonesRef.current;
      if (B && (B.RightArm || B.__head)) {

        if (isGLTFRef.current) {
          /* ---- ADDED path: your avatar.glb (world-space posture + signs) ---- */
          const s = signRef.current || SIGN_DIR.REST;
          const ru = s.ru || STAND.ru, rf = s.rf || STAND.rf, lu = s.lu || STAND.lu, lf = s.lf || STAND.lf;
          solveSide(B.RightArm, B.RightForeArm, ru, rf);
          solveSide(B.LeftArm,  B.LeftForeArm,  lu, lf);
          for (const k of ARM_KEYS) {
            const bone = B[k];
            if (bone && bone.userData.targetQ) bone.quaternion.slerp(bone.userData.targetQ, 0.18);
          }
        } else {
          /* ---- UNCHANGED path: procedural signer (your local-euler poses) ---- */
          const target = {};
          const arm = targetPose.current.arm || RPM_POSES.REST.arm;
          for (const k of Object.keys(arm)) target[k] = { x:arm[k][0], y:arm[k][1], z:arm[k][2] };
          const h = targetPose.current.hand || FINGER_SHAPES.OPEN_PALM;
          target.R_Index1={x:h.index}; target.R_Index2={y:h.index*0.8};
          target.R_Middle1={x:h.middle}; target.R_Middle2={y:h.middle*0.8};
          target.R_Ring1={x:h.ring}; target.R_Ring2={y:h.ring*0.8};
          target.R_Pinky1={x:h.pinky}; target.R_Pinky2={y:h.pinky*0.8};
          target.R_Thumb1={z:h.thumb};
          for (const k of [...ARM_KEYS, ...FINGER_KEYS]) {
            const bone = B[k]; if (!bone || !bone.userData.restQuat) continue;
            const t = target[k] || { x:0, y:0, z:0 };
            const c = curRot.current[k] || (curRot.current[k] = { x:0, y:0, z:0 });
            const f = FINGER_KEYS.includes(k) ? 0.22 : 0.12;
            c.x += (t.x - c.x) * f; c.y += (t.y - c.y) * f; c.z += (t.z - c.z) * f;
            _euler.set(c.x, c.y, c.z, 'XYZ'); _quat.setFromEuler(_euler);
            bone.quaternion.copy(bone.userData.restQuat).multiply(_quat);
          }
        }

        /* ---- head: FIXED. glTF keeps its bind orientation (restQuat) + tiny NMM offset;
                  procedural keeps the original behaviour (its bind head euler is ~0). ---- */
        const head = B.__head, now = performance.now()/1000, mode = nmmRef.current;
        let tz=0, tx=0, sy=0, brow=0, frown=0;
        if (mode==='question') { tz=0.12; tx=-0.06; brow=1; }
        else if (mode==='negation') { sy=Math.sin(now*9)*0.22; brow=0.3; frown=0.5; }
        if (head) {
          if (isGLTFRef.current && head.userData.restQuat) {
            _qa.setFromEuler(_euler.set(tx, sy, tz, 'XYZ'));          // small rest-relative NMM
            head.quaternion.slerp(_qb.copy(head.userData.restQuat).multiply(_qa), 0.15); // NEVER zeroed
          } else {
            head.rotation.z += (tz-head.rotation.z)*0.1; head.rotation.x += (tx-head.rotation.x)*0.1; head.rotation.y += (sy-head.rotation.y)*0.12;
          }
        }
        const mm=B.__morphMesh, map=B.__morphMap;
        if (mm && map) {
          const setM=(n,v)=>{ const i=map[n]; if (i!=null) mm.morphTargetInfluences[i]+=(v-(mm.morphTargetInfluences[i]||0))*0.15; };
          setM('browInnerUp',brow); setM('browOuterUp',brow); setM('mouthFrownLeft',frown); setM('mouthFrownRight',frown);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(raf); pmrem.dispose(); if (mountRef.current) mountRef.current.innerHTML=''; };
  }, []);

  useEffect(() => {
    const isLetter = currentToken?.kind === 'letter';
    const isRest = !currentToken || isLetter;
    // procedural targets (UNCHANGED behaviour)
    if (!currentToken) targetPose.current = RPM_POSES.REST;
    else if (isLetter) targetPose.current = { arm: SPELL_ARM, hand: ASL_ALPHABET[currentToken.value] || FINGER_SHAPES.OPEN_PALM };
    else { const g = String(currentToken.value || '').trim().toUpperCase(); targetPose.current = RPM_POSES[g] || FALLBACK_POSE; }
    // glTF targets (ADDED): stand at rest/letters, world-space sign for words
    if (isRest) signRef.current = SIGN_DIR.REST;
    else { const g = String(currentToken.value || '').trim().toUpperCase(); signRef.current = SIGN_DIR[g] || FALLBACK_DIR; }
  }, [currentToken]);

  const rigOk = rig && rig.arms > 0;
  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      {loadingState.loading && <div style={overlayStyle}>Loading Avatar…</div>}
      {loadingState.error && <div style={{ ...overlayStyle, color:'#ff6b6b' }}>{loadingState.error}</div>}
      {rig && (
        <div style={rigBadge(rigOk)}>
          <b style={{ color: rigOk ? '#34d399' : '#fbbf24' }}>RIG {rigOk ? '✅' : '⚠️'}</b>{' '}
          {rig.source === 'procedural' ? 'procedural signer' : 'glTF model'} · arms {rig.arms}/4 · fingers {rig.fingers}/9
          {!rigOk && <div style={{ marginTop:4, opacity:0.85 }}>avatar.glb has no rig → showing built-in signer. Drop a rigged T-pose model in public/avatar.glb for a realistic one.</div>}
          {rigOk && rig.fingers === 0 && <div style={{ marginTop:4, opacity:0.85 }}>Posture auto-corrected (stands naturally, head forward). This model has no finger bones → letters shown by the inset signing hand.</div>}
        </div>
      )}
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
    </div>
  );
}

const overlayStyle = {
  position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
  color:'#fff', fontSize:'0.9rem', background:'rgba(0,0,0,0.85)',
  padding:'16px 24px', borderRadius:'8px', textAlign:'center', maxWidth:'80%', zIndex:10,
};
const rigBadge = (ok) => ({
  position:'absolute', top:12, left:12, zIndex:11, maxWidth:330,
  background:'rgba(10,12,20,0.78)', border:`1px solid ${ok ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
  color:'#cfd3e6', fontSize:'11.5px', lineHeight:1.4, padding:'8px 12px', borderRadius:10,
  backdropFilter:'blur(8px)', pointerEvents:'none',
});











// // frontend/src/components/AvatarCanvas.jsx
// import React, { useEffect, useRef, useState } from 'react';
// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// /* ===================== CORE LOGIC ===================== */
// const FINGER_SHAPES = {
//   OPEN_PALM: { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0 },
//   FIST:      { index: 1.4, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
//   POINT:     { index: 0, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
//   FLAT_O:    { index: 0.8, middle: 0.8, ring: 0.8, pinky: 0.8, thumb: 0.9 },
// };

// // 26-letter American Manual Alphabet (static handshapes; bend in radians).
// const ASL_ALPHABET = {
//   A:{index:1.4,middle:1.4,ring:1.4,pinky:1.4,thumb:0.3}, B:{index:0,middle:0,ring:0,pinky:0,thumb:0.9},
//   C:{index:0.7,middle:0.7,ring:0.7,pinky:0.7,thumb:0.7}, D:{index:0,middle:1.2,ring:1.2,pinky:1.2,thumb:0.9},
//   E:{index:1.1,middle:1.1,ring:1.1,pinky:1.1,thumb:1.0}, F:{index:0.9,middle:0,ring:0,pinky:0,thumb:0.9},
//   G:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0.6},   H:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.6},
//   I:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0.8},   J:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0.8},
//   K:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.4},     L:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0},
//   M:{index:1.2,middle:1.2,ring:1.2,pinky:1.4,thumb:0.6}, N:{index:1.2,middle:1.2,ring:1.4,pinky:1.4,thumb:0.6},
//   O:{index:0.9,middle:0.9,ring:0.9,pinky:0.9,thumb:0.9}, P:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.5},
//   Q:{index:0.9,middle:1.4,ring:1.4,pinky:1.4,thumb:0.9}, R:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.6},
//   S:{index:1.4,middle:1.4,ring:1.4,pinky:1.4,thumb:0.9}, T:{index:1.2,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
//   U:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.8},     V:{index:0,middle:0,ring:1.4,pinky:1.4,thumb:0.8},
//   W:{index:0,middle:0,ring:0,pinky:1.4,thumb:0.8},       X:{index:0.8,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
//   Y:{index:1.4,middle:1.4,ring:1.4,pinky:0,thumb:0},     Z:{index:0,middle:1.4,ring:1.4,pinky:1.4,thumb:0.8},
// };

// const SPELL_ARM = { RightArm:[-1.2,0,0.5], RightForeArm:[-1.7,0,0.2], LeftArm:[0.2,0,-0.8], LeftForeArm:[0,0,0] };

// const RPM_POSES = {
//   REST:   { arm:{RightArm:[0.2,0,0.8],RightForeArm:[0,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   HELLO:  { arm:{RightArm:[-0.8,0,1.8],RightForeArm:[0,0,1.0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   YOU:    { arm:{RightArm:[-1.2,0,0.2],RightForeArm:[-0.4,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
//   YOUR:   { arm:{RightArm:[-1.2,0,0.4],RightForeArm:[-0.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   ME:     { arm:{RightArm:[-0.6,0.5,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
//   MY:     { arm:{RightArm:[-0.6,0.5,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   THANKS: { arm:{RightArm:[-1.1,0,0.3],RightForeArm:[-0.8,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   WHAT:   { arm:{RightArm:[-0.7,0.4,0.5],RightForeArm:[-0.8,0,0],LeftArm:[-0.7,-0.4,-0.5],LeftForeArm:[-0.8,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   WHERE:  { arm:{RightArm:[-1.0,0.2,0.6],RightForeArm:[-0.6,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
//   NAME:   { arm:{RightArm:[-0.9,0.2,0.3],RightForeArm:[-1.1,0,0],LeftArm:[-0.9,-0.2,-0.3],LeftForeArm:[-1.1,0,0]}, hand:FINGER_SHAPES.POINT },
//   PLEASE: { arm:{RightArm:[-0.5,0.3,0.2],RightForeArm:[-1.2,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM },
//   YES:    { arm:{RightArm:[-0.9,0,0.5],RightForeArm:[-0.7,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.FIST },
//   NO:     { arm:{RightArm:[-1.0,0,0.4],RightForeArm:[-0.5,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
//   LIKE:   { arm:{RightArm:[-0.7,0.4,0.3],RightForeArm:[-1.3,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.POINT },
// };
// const FALLBACK_POSE = { arm:{RightArm:[-0.9,0.2,0.5],RightForeArm:[-0.8,0,0],LeftArm:[0.2,0,-0.8],LeftForeArm:[0,0,0]}, hand:FINGER_SHAPES.OPEN_PALM };

// const ARM_KEYS = ['RightArm','RightForeArm','LeftArm','LeftForeArm'];
// const FINGER_KEYS = ['R_Index1','R_Index2','R_Middle1','R_Middle2','R_Ring1','R_Ring2','R_Pinky1','R_Pinky2','R_Thumb1'];

// function findBone(scene, keywords) {
//   let matched = null;
//   scene.traverse((c) => {
//     if (c.isBone && !matched) {
//       const name = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
//       for (const kw of keywords) if (name.includes(kw.toLowerCase())) { matched = c; break; }
//     }
//   });
//   return matched;
// }

// const KEYWORDS = {
//   RightArm:['rightarm','armr','upperarmr','shoulderr','mixamorigrightarm'],
//   RightForeArm:['rightforearm','forearmr','lowerarmr','elbowr','mixamorigrightforearm'],
//   LeftArm:['leftarm','arml','upperarml','shoulderl','mixamorigleftarm'],
//   LeftForeArm:['leftforearm','forearml','lowerarml','elbowl','mixamorigleftforearm'],
//   R_Index1:['righthandindex1','index1r','handindex1r'], R_Index2:['righthandindex2','index2r','handindex2r'],
//   R_Middle1:['righthandmiddle1','middle1r','handmiddle1r'], R_Middle2:['righthandmiddle2','middle2r','handmiddle2r'],
//   R_Ring1:['righthandring1','ring1r','handring1r'], R_Ring2:['righthandring2','ring2r','handring2r'],
//   R_Pinky1:['righthandpinky1','pinky1r','handpinky1r'], R_Pinky2:['righthandpinky2','pinky2r','handpinky2r'],
//   R_Thumb1:['righthandthumb1','thumb1r','handthumb1r'],
// };

// /* ---------- In-browser procedural rigged human (used when avatar.glb has no rig) ---------- */
// function buildProceduralHuman() {
//   const SKIN = new THREE.Color('#cf9a7e'), SKIN2 = new THREE.Color('#b9826a');
//   const EYE = new THREE.Color('#241a16'), LIP = new THREE.Color('#7c3b34'), BROW = new THREE.Color('#3a2a22');
//   const Y = new THREE.Vector3(0, 1, 0);
//   const FINGER_REST = new THREE.Quaternion().setFromAxisAngle(Y, -Math.PI / 2); // makes local-X the curl axis

//   // WORLD positions (T-pose: arms along X). Right hand fingers will carry FINGER_REST.
//   const W = {
//     Hips:[0,1.00,0], Spine:[0,1.18,0], Neck:[0,1.46,0], Head:[0,1.58,0],
//     RightArm:[-0.18,1.42,0], RightForeArm:[-0.50,1.42,0], RightHand:[-0.78,1.42,0],
//     LeftArm:[0.18,1.42,0], LeftForeArm:[0.50,1.42,0], LeftHand:[0.78,1.42,0],
//     R_Index1:[-0.84,1.42,0.030], R_Index2:[-0.90,1.42,0.030],
//     R_Middle1:[-0.85,1.42,0.010], R_Middle2:[-0.92,1.42,0.010],
//     R_Ring1:[-0.84,1.42,-0.012], R_Ring2:[-0.90,1.42,-0.012],
//     R_Pinky1:[-0.82,1.42,-0.032], R_Pinky2:[-0.87,1.42,-0.032],
//     R_Thumb1:[-0.80,1.40,0.060],
//   };
//   const PARENT = {
//     Spine:'Hips', Neck:'Spine', Head:'Neck',
//     RightArm:'Spine', RightForeArm:'RightArm', RightHand:'RightForeArm',
//     LeftArm:'Spine', LeftForeArm:'LeftArm', LeftHand:'LeftForeArm',
//     R_Index1:'RightHand', R_Index2:'R_Index1', R_Middle1:'RightHand', R_Middle2:'R_Middle1',
//     R_Ring1:'RightHand', R_Ring2:'R_Ring1', R_Pinky1:'RightHand', R_Pinky2:'R_Pinky1', R_Thumb1:'RightHand',
//   };
//   const ORDER = ['Hips','Spine','Neck','Head','RightArm','RightForeArm','RightHand',
//     'R_Index1','R_Index2','R_Middle1','R_Middle2','R_Ring1','R_Ring2','R_Pinky1','R_Pinky2','R_Thumb1',
//     'LeftArm','LeftForeArm','LeftHand'];
//   const isRFinger = (n) => n.startsWith('R_');

//   const bones = {}, worldRot = {};
//   for (const n of ORDER) {
//     const b = new THREE.Bone(); b.name = n; bones[n] = b;
//     b.quaternion.copy(isRFinger(n) ? FINGER_REST : new THREE.Quaternion());
//   }
//   // Link with correct LOCAL offsets (account for parent world rotation).
//   for (const n of ORDER) {
//     const p = PARENT[n];
//     if (!p) { bones[n].position.set(...W[n]); worldRot[n] = bones[n].quaternion.clone(); continue; }
//     bones[p].add(bones[n]);
//     const wrParent = worldRot[p];
//     const diff = new THREE.Vector3(W[n][0]-W[p][0], W[n][1]-W[p][1], W[n][2]-W[p][2]);
//     bones[n].position.copy(diff.applyQuaternion(wrParent.clone().invert()));
//     worldRot[n] = wrParent.clone().multiply(bones[n].quaternion);
//   }

//   // ---- geometry buffers (rigid skinning) ----
//   const pos=[], nrm=[], col=[], sIdx=[], sWgt=[];
//   const push = (geom, boneName, color) => {
//     const g = geom.toNonIndexed(); g.computeVertexNormals();
//     const pa=g.attributes.position.array, na=g.attributes.normal.array;
//     const bi=ORDER.indexOf(boneName), c=new THREE.Color(color), v=pa.length/3;
//     for (let i=0;i<v;i++){ pos.push(pa[i*3],pa[i*3+1],pa[i*3+2]); nrm.push(na[i*3],na[i*3+1],na[i*3+2]);
//       col.push(c.r,c.g,c.b); sIdx.push(bi,0,0,0); sWgt.push(1,0,0,0); }
//   };
//   const V3=(a)=>new THREE.Vector3(a[0],a[1],a[2]);
//   const box=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
//   const sph=(r,x,y,z)=>new THREE.SphereGeometry(r,18,12).translate(x,y,z);
//   const limb=(p0,p1,r)=>{ const a=V3(p0),b=V3(p1),dir=new THREE.Vector3().subVectors(b,a); const len=dir.length();
//     const geo=new THREE.CylinderGeometry(r,r*0.9,len,12,1);
//     const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
//     geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5),q,new THREE.Vector3(1,1,1)));
//     return geo; };
//   const tip=(n,ext=0.05)=>{ const p=PARENT[n],d=new THREE.Vector3(W[n][0]-W[p][0],W[n][1]-W[p][1],W[n][2]-W[p][2]).normalize().multiplyScalar(ext);
//     return [W[n][0]+d.x,W[n][1]+d.y,W[n][2]+d.z]; };

//   push(box(0.30,0.16,0.18,0,1.02,0),'Hips',SKIN);
//   push(box(0.34,0.30,0.20,0,1.28,0),'Spine',SKIN); push(sph(0.16,0,1.34,0.05),'Spine',SKIN);
//   push(limb([0,1.44,0],[0,1.52,0],0.05),'Neck',SKIN);
//   push(sph(0.115,0,1.64,0),'Head',SKIN);
//   push(sph(0.018,-0.040,1.660,0.095),'Head',EYE); push(sph(0.018,0.040,1.660,0.095),'Head',EYE);
//   push(box(0.030,0.008,0.012,-0.040,1.685,0.090),'Head',BROW); push(box(0.030,0.008,0.012,0.040,1.685,0.090),'Head',BROW);
//   push(sph(0.022,0,1.620,0.105),'Head',SKIN2); push(box(0.045,0.012,0.012,0,1.585,0.092),'Head',LIP);
//   push(sph(0.028,-0.112,1.630,0),'Head',SKIN2); push(sph(0.028,0.112,1.630,0),'Head',SKIN2);
//   push(sph(0.060,...W.RightArm),'RightArm',SKIN); push(sph(0.060,...W.LeftArm),'LeftArm',SKIN);
//   push(limb(W.RightArm,W.RightForeArm,0.050),'RightArm',SKIN); push(limb(W.RightForeArm,W.RightHand,0.042),'RightForeArm',SKIN);
//   push(sph(0.050,...W.RightHand),'RightHand',SKIN);
//   push(limb(W.LeftArm,W.LeftForeArm,0.050),'LeftArm',SKIN); push(limb(W.LeftForeArm,W.LeftHand,0.042),'LeftForeArm',SKIN);
//   push(sph(0.050,...W.LeftHand),'LeftHand',SKIN);
//   // right fingers
//   for (const n of FINGER_KEYS) {
//     const r = n==='R_Thumb1'?0.014:(n.endsWith('2')?0.011:0.013);
//     push(limb(W[n], tip(n, n.endsWith('2')?0.05:0.06), r), n, SKIN2);
//   }

//   const geo=new THREE.BufferGeometry();
//   geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
//   geo.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));
//   geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
//   geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(sIdx,4));
//   geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sWgt,4));
//   const mat=new THREE.MeshStandardMaterial({ vertexColors:true, roughness:0.55, metalness:0.0 });
//   const mesh=new THREE.SkinnedMesh(geo,mat); mesh.name='ProceduralSigner'; mesh.frustumCulled=false;

//   const group=new THREE.Group(); group.add(bones.Hips); group.add(mesh);
//   // frame upper body BEFORE binding (bind bakes world matrices)
//   const b3=new THREE.Box3().setFromObject(group); const sz=b3.getSize(new THREE.Vector3()); const ce=b3.getCenter(new THREE.Vector3());
//   group.position.set(-ce.x, -(b3.min.y+sz.y*0.68), -ce.z);
//   group.updateMatrixWorld(true);
//   mesh.bind(new THREE.Skeleton(ORDER.map((n)=>bones[n])));

//   const driven = {};
//   for (const k of [...ARM_KEYS, ...FINGER_KEYS]) driven[k] = bones[k];
//   return { group, driven, head: bones.Head };
// }
// /* =================== /CORE LOGIC =================== */

// export default function AvatarCanvas({ currentToken, nmm }) {
//   const mountRef = useRef(null);
//   const bonesRef = useRef({});
//   const curRot = useRef({});          // lerped per-bone offset euler {x,y,z}
//   const targetPose = useRef(RPM_POSES.REST);
//   const nmmRef = useRef(null);
//   const [loadingState, setLoadingState] = useState({ loading: true, error: null });
//   const [rig, setRig] = useState(null); // { source, arms, fingers }
//   const modelUrl = '/avatar.glb';

//   useEffect(() => { nmmRef.current = nmm || null; }, [nmm]);

//   useEffect(() => {
//     if (!mountRef.current) return;
//     const width = mountRef.current.clientWidth, height = mountRef.current.clientHeight;
//     const scene = new THREE.Scene(); scene.background = null;
//     const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
//     camera.position.set(0, 0.05, 1.9); camera.lookAt(0, 0, 0);

//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(width, height); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     renderer.outputColorSpace = THREE.SRGBColorSpace;
//     renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
//     mountRef.current.appendChild(renderer.domElement);

//     const pmrem = new THREE.PMREMGenerator(renderer);
//     scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
//     scene.add(new THREE.AmbientLight(0xffffff, 0.5));
//     const key=new THREE.DirectionalLight(0xffffff,1.6); key.position.set(3,4,5); scene.add(key);
//     const fill=new THREE.DirectionalLight(0x9fc4ff,0.6); fill.position.set(-4,1,2); scene.add(fill);
//     const rim=new THREE.DirectionalLight(0xffd9b0,0.9); rim.position.set(0,2,-4); scene.add(rim);

//     const _euler = new THREE.Euler(), _quat = new THREE.Quaternion();

//     // Capture rest quaternions + report, then hand off to the render loop.
//     const useRig = (obj, driven, headBone, source) => {
//       // store rest pose for rest-relative posing
//       for (const k of [...ARM_KEYS, ...FINGER_KEYS]) {
//         const b = driven[k];
//         if (b) { b.userData.restQuat = b.quaternion.clone(); curRot.current[k] = { x:0, y:0, z:0 }; }
//       }
//       bonesRef.current = { ...driven, __head: headBone || null, __morphMesh: null, __morphMap: null };
//       if (obj) {
//         obj.traverse((c) => { if (c.isSkinnedMesh && c.morphTargetDictionary && !bonesRef.current.__morphMesh) {
//           bonesRef.current.__morphMesh = c; bonesRef.current.__morphMap = c.morphTargetDictionary; } });
//         scene.add(obj);
//       }
//       const arms = ARM_KEYS.filter((k) => driven[k]).length;
//       const fingers = FINGER_KEYS.filter((k) => driven[k]).length;
//       setRig({ source, arms, fingers });
//       console.table(Object.fromEntries([...ARM_KEYS, ...FINGER_KEYS].map((k) => [k, driven[k] ? '✅ found' : '❌ missing'])));
//       setLoadingState({ loading: false, error: null });
//     };

//     const useProcedural = (reason) => {
//       console.warn('[Avatar] Using procedural signer:', reason);
//       const { group, driven, head } = buildProceduralHuman();
//       useRig(group, driven, head, 'procedural');
//     };

//     new GLTFLoader().load(modelUrl, (gltf) => {
//       const avatar = gltf.scene;
//       const b3=new THREE.Box3().setFromObject(avatar); const sz=b3.getSize(new THREE.Vector3()); const ce=b3.getCenter(new THREE.Vector3());
//       avatar.position.set(-ce.x, -(b3.min.y+sz.y*0.68), -ce.z);
//       const driven = {}; for (const k of [...ARM_KEYS, ...FINGER_KEYS]) driven[k] = findBone(avatar, KEYWORDS[k]);
//       const headBone = findBone(avatar, ['mixamorighead','head']);
//       if (ARM_KEYS.filter((k) => driven[k]).length === 0) { useProcedural('avatar.glb has no drivable arm bones'); return; }
//       useRig(avatar, driven, headBone, 'glTF');
//     }, undefined, () => useProcedural('avatar.glb failed to load'));

//     let raf;
//     const animate = () => {
//       raf = requestAnimationFrame(animate);
//       const B = bonesRef.current;
//       if (B && B.RightArm) {
//         // build per-bone target offset from current pose
//         const target = {};
//         const arm = targetPose.current.arm || RPM_POSES.REST.arm;
//         for (const k of Object.keys(arm)) target[k] = { x:arm[k][0], y:arm[k][1], z:arm[k][2] };
//         const h = targetPose.current.hand || FINGER_SHAPES.OPEN_PALM;
//         target.R_Index1={x:h.index}; target.R_Index2={y:h.index*0.8};
//         target.R_Middle1={x:h.middle}; target.R_Middle2={y:h.middle*0.8};
//         target.R_Ring1={x:h.ring}; target.R_Ring2={y:h.ring*0.8};
//         target.R_Pinky1={x:h.pinky}; target.R_Pinky2={y:h.pinky*0.8};
//         target.R_Thumb1={z:h.thumb};

//         for (const k of [...ARM_KEYS, ...FINGER_KEYS]) {
//           const bone = B[k]; if (!bone || !bone.userData.restQuat) continue;
//           const t = target[k] || { x:0, y:0, z:0 };
//           const c = curRot.current[k] || (curRot.current[k] = { x:0, y:0, z:0 });
//           const f = FINGER_KEYS.includes(k) ? 0.22 : 0.12; // snappier fingers
//           c.x += (t.x - c.x) * f; c.y += (t.y - c.y) * f; c.z += (t.z - c.z) * f;
//           _euler.set(c.x, c.y, c.z, 'XYZ'); _quat.setFromEuler(_euler);
//           bone.quaternion.copy(bone.userData.restQuat).multiply(_quat); // rest-relative pose
//         }

//         // non-manual markers (head + optional blendshapes)
//         const head = B.__head, now = performance.now()/1000, mode = nmmRef.current;
//         let tz=0, tx=0, sy=0, brow=0, frown=0;
//         if (mode==='question') { tz=0.12; tx=-0.06; brow=1; }
//         else if (mode==='negation') { sy=Math.sin(now*9)*0.22; brow=0.3; frown=0.5; }
//         if (head) {
//           head.rotation.z += (tz-head.rotation.z)*0.1; head.rotation.x += (tx-head.rotation.x)*0.1; head.rotation.y += (sy-head.rotation.y)*0.12;
//         }
//         const mm=B.__morphMesh, map=B.__morphMap;
//         if (mm && map) {
//           const setM=(n,v)=>{ const i=map[n]; if (i!=null) mm.morphTargetInfluences[i]+=(v-(mm.morphTargetInfluences[i]||0))*0.15; };
//           setM('browInnerUp',brow); setM('browOuterUp',brow); setM('mouthFrownLeft',frown); setM('mouthFrownRight',frown);
//         }
//       }
//       renderer.render(scene, camera);
//     };
//     animate();

//     return () => { cancelAnimationFrame(raf); pmrem.dispose(); if (mountRef.current) mountRef.current.innerHTML=''; };
//   }, []);

//   useEffect(() => {
//     if (!currentToken) { targetPose.current = RPM_POSES.REST; return; }
//     if (currentToken.kind === 'letter') {
//       targetPose.current = { arm: SPELL_ARM, hand: ASL_ALPHABET[currentToken.value] || FINGER_SHAPES.OPEN_PALM };
//     } else {
//       const g = String(currentToken.value || '').trim().toUpperCase();
//       targetPose.current = RPM_POSES[g] || FALLBACK_POSE;
//     }
//   }, [currentToken]);

//   const rigOk = rig && rig.arms > 0;
//   return (
//     <div style={{ width:'100%', height:'100%', position:'relative' }}>
//       {loadingState.loading && <div style={overlayStyle}>Loading Avatar…</div>}
//       {loadingState.error && <div style={{ ...overlayStyle, color:'#ff6b6b' }}>{loadingState.error}</div>}
//       {rig && (
//         <div style={rigBadge(rigOk)}>
//           <b style={{ color: rigOk ? '#34d399' : '#fbbf24' }}>RIG {rigOk ? '✅' : '⚠️'}</b>{' '}
//           {rig.source === 'procedural' ? 'procedural signer' : 'glTF model'} · arms {rig.arms}/4 · fingers {rig.fingers}/9
//           {!rigOk && <div style={{ marginTop:4, opacity:0.85 }}>avatar.glb has no rig → showing built-in signer. Drop a rigged T-pose model in public/avatar.glb for a realistic one.</div>}
//           {rigOk && rig.fingers === 0 && <div style={{ marginTop:4, opacity:0.85 }}>Arms move, but this model has no finger bones → letters won't show. Use a model with hand bones.</div>}
//         </div>
//       )}
//       <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
//     </div>
//   );
// }

// const overlayStyle = {
//   position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
//   color:'#fff', fontSize:'0.9rem', background:'rgba(0,0,0,0.85)',
//   padding:'16px 24px', borderRadius:'8px', textAlign:'center', maxWidth:'80%', zIndex:10,
// };
// const rigBadge = (ok) => ({
//   position:'absolute', top:12, left:12, zIndex:11, maxWidth:330,
//   background:'rgba(10,12,20,0.78)', border:`1px solid ${ok ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`,
//   color:'#cfd3e6', fontSize:'11.5px', lineHeight:1.4, padding:'8px 12px', borderRadius:10,
//   backdropFilter:'blur(8px)', pointerEvents:'none',
// });