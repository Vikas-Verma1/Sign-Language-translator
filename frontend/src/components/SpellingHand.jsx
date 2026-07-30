// frontend/src/components/SpellingHand.jsx
// Isolated inset hand that fingerspells A–Z. Shown in the stage corner during letters.
// Skinning-free (plain meshes parented to bones) so it cannot hang the page.
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
const OPEN = { index:0, middle:0, ring:0, pinky:0, thumb:0 };

export default function SpellingHand({ letter, visible }) {
  const mountRef = useRef(null);
  const bonesRef = useRef({});
  const targetRef = useRef(OPEN);

  // update target handshape when the letter changes (or relax when hidden)
  useEffect(() => {
    targetRef.current = (visible && letter && ASL_ALPHABET[letter]) ? ASL_ALPHABET[letter] : OPEN;
  }, [letter, visible]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const w = el.clientWidth || 150, h = el.clientHeight || 150;

    const scene = new THREE.Scene(); scene.background = null;
    const camera = new THREE.PerspectiveCamera(32, w/h, 0.01, 10);
    camera.position.set(0, 0.04, 0.42); camera.lookAt(0, 0.04, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(2,3,4); scene.add(d);
    const d2 = new THREE.DirectionalLight(0x9fc4ff, 0.5); d2.position.set(-3,1,2); scene.add(d2);

    const matSkin  = new THREE.MeshStandardMaterial({ color: 0xcf9a7e, roughness: 0.5, metalness: 0 });
    const matSkin2 = new THREE.MeshStandardMaterial({ color: 0xb9826a, roughness: 0.5, metalness: 0 });

    const group = new THREE.Group();
    const bones = {};
    const mkBone = (name, x, y, z, parent) => {
      const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z);
      (parent ? parent : group).add(b); bones[name] = b; return b;
    };
    // palm + 4 fingers (2 joints each) + thumb, all identity orientation at rest (palm faces +Z)
    mkBone('Palm', 0, 0, 0, null);
    const fx = { index:0.030, middle:0.010, ring:-0.010, pinky:-0.030 };
    for (const f of Object.keys(fx)) {
      const x = fx[f];
      const b1 = mkBone(f+'1', x, 0.060, 0, bones.Palm);
      mkBone(f+'2', 0, 0.050, 0, b1);
    }
    mkBone('Thumb1', -0.050, -0.005, 0.005, bones.Palm);

    scene.add(group);
    group.updateMatrixWorld(true); // bake rest (identity) matrices before attaching geometry

    const cyl = (p0,p1,r) => {
      const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
      const dir = new THREE.Vector3().subVectors(b, a); const len = Math.max(dir.length(), 1e-4);
      const g = new THREE.CylinderGeometry(r, r*0.85, len, 12, 1);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5), q, new THREE.Vector3(1,1,1)));
      return g;
    };
    const sph = (r,x,y,z) => new THREE.SphereGeometry(r, 14, 10).translate(x,y,z);
    const box = (sx,sy,sz,x,y,z) => new THREE.BoxGeometry(sx,sy,sz).translate(x,y,z);
    // attach world-space geometry to a bone (un-transform into its local frame)
    const part = (geom, boneName, mat) => {
      geom.applyMatrix4(bones[boneName].matrixWorld.clone().invert());
      const m = new THREE.Mesh(geom, mat); m.frustumCulled = false; bones[boneName].add(m);
    };

    part(box(0.085, 0.10, 0.035, 0, 0.005, 0), 'Palm', matSkin);     // palm
    part(sph(0.05, 0, 0.0, 0.0), 'Palm', matSkin);                   // palm heel
    for (const f of Object.keys(fx)) {
      const x = fx[f];
      part(sph(0.013, x, 0.060, 0.0), 'Palm', matSkin2);             // knuckle
      part(cyl([x,0.060,0],[x,0.110,0], 0.012), f+'1', matSkin2);    // proximal
      part(sph(0.011, x, 0.110, 0.0), f+'1', matSkin2);              // mid joint
      part(cyl([x,0.110,0],[x,0.150,0], 0.010), f+'2', matSkin2);    // distal
      part(sph(0.010, x, 0.150, 0.0), f+'2', matSkin2);              // fingertip
    }
    part(sph(0.016, -0.050, -0.005, 0.010), 'Palm', matSkin2);       // thumb base
    part(cyl([-0.050,-0.005,0.012],[-0.085,0.020,0.020], 0.013), 'Thumb1', matSkin2);
    part(sph(0.012, -0.085, 0.020, 0.020), 'Thumb1', matSkin2);

    bonesRef.current = bones;

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = targetRef.current;
      const bend = (b1, b2, v) => {
        const a = bones[b1], c = bones[b2];
        if (a) a.rotation.x += (v - a.rotation.x) * 0.30;       // +X curls toward the palm/camera
        if (c) c.rotation.x += (v*0.9 - c.rotation.x) * 0.30;
      };
      bend('index1','index2', t.index);
      bend('middle1','middle2', t.middle);
      bend('ring1','ring2', t.ring);
      bend('pinky1','pinky2', t.pinky);
      if (bones.Thumb1) bones.Thumb1.rotation.x += (t.thumb*0.8 - bones.Thumb1.rotation.x) * 0.30;
      renderer.render(scene, camera);
    };
    animate();

    return () => { cancelAnimationFrame(raf); if (el) el.innerHTML = ''; };
  }, []);

  return (
    <div style={pipWrap(visible)}>
      <div style={pipCaption}>FINGERSPELLING{letter ? ` · ${letter}` : ''}</div>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

const pipWrap = (visible) => ({
  position: 'absolute', right: 16, bottom: 16, width: 168, height: 188, zIndex: 12,
  background: 'rgba(10,12,20,0.72)', border: '1px solid rgba(124,92,255,0.35)',
  borderRadius: 14, backdropFilter: 'blur(8px)', overflow: 'hidden',
  opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
  transition: 'opacity .25s ease, transform .25s ease', pointerEvents: 'none',
  display: 'flex', flexDirection: 'column',
});
const pipCaption = {
  fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: '#cdbcff',
  padding: '7px 10px 0', fontWeight: 700,
};