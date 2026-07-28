// frontend/tools/make-avatar.mjs
// Generates a RIGGED, skin-coloured, upper-body humanoid -> frontend/public/avatar.glb
// Bone names are chosen to match AvatarCanvas.jsx's findBone() keyword table,
// so the existing signing logic drives it with ZERO code changes.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---- palette ----
const SKIN  = new THREE.Color('#cf9a7e');
const SKIN2 = new THREE.Color('#b9826a');
const EYE   = new THREE.Color('#241a16');
const LIP   = new THREE.Color('#7c3b34');
const BROW  = new THREE.Color('#3a2a22');

// ---- bind-pose joint positions (world space, Y up, metres). Upper body only. ----
// Right side uses -X so it reads as the character's right hand when facing the +Z camera.
const R = {
  Hips:[0,1.00,0], Spine:[0,1.18,0], Neck:[0,1.46,0], Head:[0,1.58,0],
  RightArm:[-0.17,1.42,0], RightForeArm:[-0.42,1.12,0], RightHand:[-0.62,0.86,0],
  LeftArm:[ 0.17,1.42,0], LeftForeArm:[ 0.42,1.12,0], LeftHand:[ 0.62,0.86,0],
  RightHandIndex1:[-0.660,0.80,0.00], RightHandIndex2:[-0.720,0.73,0],
  RightHandMiddle1:[-0.645,0.79,0.00], RightHandMiddle2:[-0.705,0.71,0],
  RightHandRing1:[-0.630,0.80,0.00], RightHandRing2:[-0.685,0.73,0],
  RightHandPinky1:[-0.615,0.81,0.00], RightHandPinky2:[-0.660,0.75,0],
  RightHandThumb1:[-0.575,0.87,0.05],
};
const PARENT = {
  Spine:'Hips', Neck:'Spine', Head:'Neck',
  RightArm:'Spine', RightForeArm:'RightArm', RightHand:'RightForeArm',
  LeftArm:'Spine', LeftForeArm:'LeftArm', LeftHand:'LeftForeArm',
  RightHandIndex1:'RightHand', RightHandIndex2:'RightHandIndex1',
  RightHandMiddle1:'RightHand', RightHandMiddle2:'RightHandMiddle1',
  RightHandRing1:'RightHand', RightHandRing2:'RightHandRing1',
  RightHandPinky1:'RightHand', RightHandPinky2:'RightHandPinky1',
  RightHandThumb1:'RightHand',
};
// Creation order == skinIndex order. Includes every joint your code looks for.
const ORDER = ['Hips','Spine','Neck','Head',
  'RightArm','RightForeArm','RightHand',
  'RightHandIndex1','RightHandIndex2','RightHandMiddle1','RightHandMiddle2',
  'RightHandRing1','RightHandRing2','RightHandPinky1','RightHandPinky2','RightHandThumb1',
  'LeftArm','LeftForeArm','LeftHand'];

// ---- build the bone hierarchy ----
const bones = {}, boneList = [];
for (const name of ORDER) { const b = new THREE.Bone(); b.name = name; bones[name] = b; boneList.push(b); }
for (const name of ORDER) {
  const p = PARENT[name], w = R[name];
  if (p) { bones[p].add(bones[name]); const pw = R[p]; bones[name].position.set(w[0]-pw[0], w[1]-pw[1], w[2]-pw[2]); }
  else   { bones[name].position.set(w[0], w[1], w[2]); }
}
bones.Hips.updateWorldMatrix(true, true);

// ---- merged-geometry buffers (rigid skinning: 1 bone per vertex) ----
const pos = [], nrm = [], col = [], sIdx = [], sWgt = [];
function push(geom, boneName, color) {
  const g = geom.toNonIndexed(); g.computeVertexNormals();
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  const bi = ORDER.indexOf(boneName), c = new THREE.Color(color), v = p.length / 3;
  for (let i = 0; i < v; i++) {
    pos.push(p[i*3], p[i*3+1], p[i*3+2]);
    nrm.push(n[i*3], n[i*3+1], n[i*3+2]);
    col.push(c.r, c.g, c.b);
    sIdx.push(bi, 0, 0, 0); sWgt.push(1, 0, 0, 0);
  }
}
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function box(w,h,d,x,y,z){ return new THREE.BoxGeometry(w,h,d).translate(x,y,z); }
function sph(r,x,y,z){ return new THREE.SphereGeometry(r, 20, 14).translate(x,y,z); }
function limb(p0, p1, r){           // cylinder baked between two world points
  const a = V3(p0), b = V3(p1), dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r, r*0.9, len, 14, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
  geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5), q, new THREE.Vector3(1,1,1)));
  return geo;
}
const tip = (b1, b2, ext=0.05) => {   // a point beyond joint b2, along the bone direction
  const a = V3(b1), b = V3(b2), d = new THREE.Vector3().subVectors(b,a).normalize().multiplyScalar(ext);
  return [b[0]+d.x, b[1]+d.y, b[2]+d.z];
};

// ---- body parts (each rigidly bound to one bone) ----
push(box(0.30,0.16,0.18, 0,1.02,0),                 'Hips',  SKIN);   // pelvis
push(box(0.34,0.30,0.20, 0,1.28,0),                 'Spine', SKIN);   // torso
push(sph(0.16, 0,1.34,0.05),                        'Spine', SKIN);   // chest
push(limb([0,1.44,0],[0,1.52,0], 0.05),             'Neck',  SKIN);   // neck
push(sph(0.115, 0,1.64,0.0),                        'Head',  SKIN);   // skull
push(sph(0.018, -0.040,1.660,0.095),                'Head',  EYE);    // eyes
push(sph(0.018,  0.040,1.660,0.095),                'Head',  EYE);
push(box(0.030,0.008,0.012, -0.040,1.685,0.090),    'Head',  BROW);   // brows
push(box(0.030,0.008,0.012,  0.040,1.685,0.090),    'Head',  BROW);
push(sph(0.022, 0,1.620,0.105),                     'Head',  SKIN2);  // nose
push(box(0.045,0.012,0.012, 0,1.585,0.092),         'Head',  LIP);    // mouth
push(sph(0.028, -0.112,1.630,0.0),                  'Head',  SKIN2);  // ears
push(sph(0.028,  0.112,1.630,0.0),                  'Head',  SKIN2);
push(sph(0.060, ...R.RightArm),                     'RightArm', SKIN);// shoulders
push(sph(0.060, ...R.LeftArm),                      'LeftArm',  SKIN);
push(limb(R.RightArm, R.RightForeArm, 0.050),       'RightArm',     SKIN); // R upper arm
push(limb(R.RightForeArm, R.RightHand, 0.042),      'RightForeArm', SKIN); // R forearm
push(sph(0.050, ...R.RightHand),                    'RightHand',    SKIN); // R palm
push(limb(R.RightHandIndex1, R.RightHandIndex2, 0.013),  'RightHandIndex1',  SKIN2);
push(limb(R.RightHandIndex2, tip(R.RightHandIndex1, R.RightHandIndex2), 0.011), 'RightHandIndex2', SKIN2);
push(limb(R.RightHandMiddle1, R.RightHandMiddle2, 0.013),'RightHandMiddle1', SKIN2);
push(limb(R.RightHandMiddle2, tip(R.RightHandMiddle1, R.RightHandMiddle2), 0.011),'RightHandMiddle2',SKIN2);
push(limb(R.RightHandRing1, R.RightHandRing2, 0.013),    'RightHandRing1',   SKIN2);
push(limb(R.RightHandRing2, tip(R.RightHandRing1, R.RightHandRing2), 0.011), 'RightHandRing2', SKIN2);
push(limb(R.RightHandPinky1, R.RightHandPinky2, 0.012),  'RightHandPinky1',  SKIN2);
push(limb(R.RightHandPinky2, tip(R.RightHandPinky1, R.RightHandPinky2), 0.010),'RightHandPinky2',SKIN2);
push(limb(R.RightHandThumb1, tip(R.RightHandThumb1, R.RightHand, 0.06), 0.014),'RightHandThumb1',SKIN2);
push(limb(R.LeftArm, R.LeftForeArm, 0.050),         'LeftArm',      SKIN); // L upper arm
push(limb(R.LeftForeArm, R.LeftHand, 0.042),        'LeftForeArm',  SKIN); // L forearm
push(sph(0.050, ...R.LeftHand),                     'LeftHand',     SKIN); // L palm

// ---- assemble SkinnedMesh + Skeleton ----
const geo = new THREE.BufferGeometry();
geo.setAttribute('position',   new THREE.Float32BufferAttribute(pos, 3));
geo.setAttribute('normal',     new THREE.Float32BufferAttribute(nrm, 3));
geo.setAttribute('color',      new THREE.Float32BufferAttribute(col, 3));
geo.setAttribute('skinIndex',  new THREE.Uint16BufferAttribute(sIdx, 4));
geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sWgt, 4));
const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 });
const mesh = new THREE.SkinnedMesh(geo, mat);
mesh.name = 'DigitalHuman';
mesh.frustumCulled = false;

const scene = new THREE.Scene();
scene.add(bones.Hips);
scene.add(mesh);
scene.updateMatrixWorld(true);
mesh.bind(new THREE.Skeleton(boneList));   // bind in current (bind) pose

// ---- export to GLB ----
const exporter = new GLTFExporter();
const buf = await exporter.parseAsync(scene, { binary: true });
const outPath = new URL('../public/avatar.glb', import.meta.url);
writeFileSync(outPath, Buffer.from(buf));
console.log('✅ Wrote', fileURLToPath(outPath), (buf.byteLength/1024).toFixed(1), 'KB');
console.log('   Bones:', ORDER.length, '| Verts:', pos.length/3);