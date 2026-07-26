import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { POSE_DICTIONARY } from '../utils/glossEngine';

export default function AvatarCanvas({ currentGloss }) {
  const mountRef = useRef(null);
  const armsRef = useRef({ rightUpperArm: null, leftUpperArm: null });
  const targetPose = useRef(POSE_DICTIONARY.REST);

  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.4, 2.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(1, 2, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // 2. Build Procedural Avatar Skeleton
    const avatarGroup = new THREE.Group();

    // Head & Body
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    head.position.y = 1.5;
    avatarGroup.add(head);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x3366cc }));
    torso.position.y = 1.0;
    avatarGroup.add(torso);

    // Right Arm Assembly
    const rightUpperArm = new THREE.Group();
    rightUpperArm.position.set(-0.25, 1.2, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    rightArmMesh.position.y = -0.2;
    rightUpperArm.add(rightArmMesh);
    avatarGroup.add(rightUpperArm);

    // Left Arm Assembly
    const leftUpperArm = new THREE.Group();
    leftUpperArm.position.set(0.25, 1.2, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
    leftArmMesh.position.y = -0.2;
    leftUpperArm.add(leftArmMesh);
    avatarGroup.add(leftUpperArm);

    armsRef.current = { rightUpperArm, leftUpperArm };
    scene.add(avatarGroup);

    // 3. Animation Loop with Linear Interpolation (Smooth Gesture Blending)
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const targetR = targetPose.current.rightArm;
      const targetL = targetPose.current.leftArm;

      if (armsRef.current.rightUpperArm) {
        armsRef.current.rightUpperArm.rotation.x += (targetR[0] - armsRef.current.rightUpperArm.rotation.x) * 0.1;
        armsRef.current.rightUpperArm.rotation.y += (targetR[1] - armsRef.current.rightUpperArm.rotation.y) * 0.1;
        armsRef.current.rightUpperArm.rotation.z += (targetR[2] - armsRef.current.rightUpperArm.rotation.z) * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  // Whenever the active Gloss Token changes, update target pose
  useEffect(() => {
    if (!currentGloss) return;
    const pose = POSE_DICTIONARY[currentGloss] || POSE_DICTIONARY.REST;
    targetPose.current = pose;
  }, [currentGloss]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}