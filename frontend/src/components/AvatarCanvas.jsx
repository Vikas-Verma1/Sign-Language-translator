import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Handshape presets (Finger bending in Radians: [Joint1, Joint2, Joint3])
const FINGER_SHAPES = {
  OPEN_PALM: { index: 0, middle: 0, ring: 0, pinky: 0, thumb: 0 },
  FIST: { index: 1.4, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
  POINT: { index: 0, middle: 1.4, ring: 1.4, pinky: 1.4, thumb: 0.8 },
  FLAT_O: { index: 0.8, middle: 0.8, ring: 0.8, pinky: 0.8, thumb: 0.9 },
};

// Map ASL Gloss tokens to both Arm Poses AND Finger Handshapes
const RPM_POSES = {
  REST: {
    arm: { RightArm: [0.2, 0, 0.8], RightForeArm: [0, 0, 0], LeftArm: [0.2, 0, -0.8], LeftForeArm: [0, 0, 0] },
    hand: FINGER_SHAPES.OPEN_PALM,
  },
  HELLO: {
    arm: { RightArm: [-0.8, 0, 1.8], RightForeArm: [0, 0, 1.0], LeftArm: [0.2, 0, -0.8], LeftForeArm: [0, 0, 0] },
    hand: FINGER_SHAPES.OPEN_PALM, // Open hand wave
  },
  YOU: {
    arm: { RightArm: [-1.2, 0, 0.2], RightForeArm: [-0.4, 0, 0], LeftArm: [0.2, 0, -0.8], LeftForeArm: [0, 0, 0] },
    hand: FINGER_SHAPES.POINT, // Pointing index finger forward
  },
  YOUR: {
    arm: { RightArm: [-1.2, 0, 0.4], RightForeArm: [-0.2, 0, 0], LeftArm: [0.2, 0, -0.8], LeftForeArm: [0, 0, 0] },
    hand: FINGER_SHAPES.OPEN_PALM, // Open palm pushed forward
  },
  WHAT: {
    arm: { RightArm: [-0.7, 0.4, 0.5], RightForeArm: [-0.8, 0, 0], LeftArm: [-0.7, -0.4, -0.5], LeftForeArm: [-0.8, 0, 0] },
    hand: FINGER_SHAPES.OPEN_PALM, // Both open hands shrugging
  },
  NAME: {
    arm: { RightArm: [-0.9, 0.2, 0.3], RightForeArm: [-1.1, 0, 0], LeftArm: [-0.9, -0.2, -0.3], LeftForeArm: [-1.1, 0, 0] },
    hand: FINGER_SHAPES.POINT, // Index fingers tapping
  },
};

// Helper function to find bones regardless of naming conventions
function findBone(scene, keywords) {
  let matchedBone = null;
  scene.traverse((child) => {
    if (child.isBone && !matchedBone) {
      const name = child.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const kw of keywords) {
        if (name.includes(kw.toLowerCase())) {
          matchedBone = child;
          break;
        }
      }
    }
  });
  return matchedBone;
}

export default function AvatarCanvas({ currentGloss }) {
  const mountRef = useRef(null);
  const bonesRef = useRef({});
  const targetPose = useRef(RPM_POSES.REST);
  const [loadingState, setLoadingState] = useState({ loading: true, error: null });

  const modelUrl = '/avatar.glb';

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.2, 2.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 3, 2);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const avatar = gltf.scene;

        const box = new THREE.Box3().setFromObject(avatar);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        avatar.position.x = -center.x;
        avatar.position.y = -center.y - 0.1;
        avatar.position.z = -center.z;

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 1.15 / maxDim;
          avatar.scale.set(scale, scale, scale);
        }

        // Map Arm Bones
        const detectedBones = {
          RightArm: findBone(avatar, ['rightarm', 'armr', 'upperarmr', 'shoulderr']),
          RightForeArm: findBone(avatar, ['rightforearm', 'forearmr', 'lowerarmr', 'elbowr']),
          LeftArm: findBone(avatar, ['leftarm', 'arml', 'upperarml', 'shoulderl']),
          LeftForeArm: findBone(avatar, ['leftforearm', 'forearml', 'lowerarml', 'elbowl']),

          // Right Hand Finger Joints (Joint 1, 2, 3 for curling)
          R_Index1: findBone(avatar, ['righthandindex1', 'index1r', 'handindex1r']),
          R_Index2: findBone(avatar, ['righthandindex2', 'index2r', 'handindex2r']),
          R_Middle1: findBone(avatar, ['righthandmiddle1', 'middle1r', 'handmiddle1r']),
          R_Middle2: findBone(avatar, ['righthandmiddle2', 'middle2r', 'handmiddle2r']),
          R_Ring1: findBone(avatar, ['righthandring1', 'ring1r', 'handring1r']),
          R_Ring2: findBone(avatar, ['righthandring2', 'ring2r', 'handring2r']),
          R_Pinky1: findBone(avatar, ['righthandpinky1', 'pinky1r', 'handpinky1r']),
          R_Pinky2: findBone(avatar, ['righthandpinky2', 'pinky2r', 'handpinky2r']),
          R_Thumb1: findBone(avatar, ['righthandthumb1', 'thumb1r', 'handthumb1r']),
        };

        bonesRef.current = detectedBones;
        scene.add(avatar);
        setLoadingState({ loading: false, error: null });
      },
      undefined,
      (error) => {
        console.error('Failed to load avatar.glb:', error);
        setLoadingState({ loading: false, error: 'Could not load /public/avatar.glb' });
      }
    );

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (bonesRef.current) {
        // 1. Interpolate Arm Rotations
        const armTargets = targetPose.current.arm || RPM_POSES.REST.arm;
        Object.keys(armTargets).forEach((key) => {
          const bone = bonesRef.current[key];
          if (bone) {
            const [targetX, targetY, targetZ] = armTargets[key];
            bone.rotation.x += (targetX - bone.rotation.x) * 0.1;
            bone.rotation.y += (targetY - bone.rotation.y) * 0.1;
            bone.rotation.z += (targetZ - bone.rotation.z) * 0.1;
          }
        });

        // 2. Interpolate Finger Rotations for Handshapes
        const handTarget = targetPose.current.hand || FINGER_SHAPES.OPEN_PALM;
        const applyFingerBend = (boneKey1, boneKey2, bendAngle) => {
          const b1 = bonesRef.current[boneKey1];
          const b2 = bonesRef.current[boneKey2];
          if (b1) b1.rotation.x += (bendAngle - b1.rotation.x) * 0.1;
          if (b2) b2.rotation.y += (bendAngle * 0.8 - b2.rotation.y) * 0.1;
        };

        applyFingerBend('R_Index1', 'R_Index2', handTarget.index);
        applyFingerBend('R_Middle1', 'R_Middle2', handTarget.middle);
        applyFingerBend('R_Ring1', 'R_Ring2', handTarget.ring);
        applyFingerBend('R_Pinky1', 'R_Pinky2', handTarget.pinky);
        if (bonesRef.current['R_Thumb1']) {
          bonesRef.current['R_Thumb1'].rotation.z += (handTarget.thumb - bonesRef.current['R_Thumb1'].rotation.z) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    if (!currentGloss) return;
    targetPose.current = RPM_POSES[currentGloss] || RPM_POSES.REST;
  }, [currentGloss]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loadingState.loading && <div style={overlayStyle}>Loading Avatar...</div>}
      {loadingState.error && <div style={{ ...overlayStyle, color: '#ff6b6b' }}>{loadingState.error}</div>}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

const overlayStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#fff',
  fontSize: '0.9rem',
  background: 'rgba(0,0,0,0.85)',
  padding: '16px 24px',
  borderRadius: '8px',
  textAlign: 'center',
  maxWidth: '80%',
  zIndex: 10,
};