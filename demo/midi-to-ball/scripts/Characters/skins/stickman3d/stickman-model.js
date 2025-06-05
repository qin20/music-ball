// ✅ stickman-model.js
// 使用 Three.js 构建火柴人骨架结构并连接动画模块，新增武术动作与特效

import * as THREE from 'https://esm.sh/three';
import { MotionPlayer, ActionQueue, ActionLibrary } from './stickman-motion.js';

export function createStickman(scene) {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function joint(radius = 0.05) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 8),
      material.clone()
    );
  }

  function bone(length) {
    const geom = new THREE.CylinderGeometry(0.02, 0.02, length, 6);
    return new THREE.Mesh(geom, material.clone());
  }

  const stickman = {
    root: new THREE.Object3D(),
    spine: new THREE.Object3D(),
    head: joint(0.1),
    leftArm: new THREE.Object3D(),
    rightArm: new THREE.Object3D(),
    leftLeg: new THREE.Object3D(),
    rightLeg: new THREE.Object3D(),
  };

  stickman.root.position.set(0, 1, 0);
  scene.add(stickman.root);

  stickman.root.add(stickman.spine);
  stickman.spine.position.y = 0.5;
  stickman.spine.add(stickman.head);
  stickman.head.position.y = 0.5;

  const leftShoulder = joint();
  const rightShoulder = joint();
  stickman.spine.add(stickman.leftArm);
  stickman.spine.add(stickman.rightArm);
  stickman.leftArm.position.set(-0.3, 0.4, 0);
  stickman.rightArm.position.set(0.3, 0.4, 0);
  stickman.leftArm.add(leftShoulder);
  stickman.rightArm.add(rightShoulder);
  leftShoulder.add(bone(0.4)).position.y = -0.2;
  rightShoulder.add(bone(0.4)).position.y = -0.2;

  const leftHip = joint();
  const rightHip = joint();
  stickman.root.add(stickman.leftLeg);
  stickman.root.add(stickman.rightLeg);
  stickman.leftLeg.position.set(-0.2, 0, 0);
  stickman.rightLeg.position.set(0.2, 0, 0);
  stickman.leftLeg.add(leftHip);
  stickman.rightLeg.add(rightHip);
  leftHip.add(bone(0.5)).position.y = -0.25;
  rightHip.add(bone(0.5)).position.y = -0.25;

  return stickman;
}

export function initStickmanDemo() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const stickman = createStickman(scene);
  const player = new MotionPlayer(stickman);
  const queue = new ActionQueue(player);

  camera.position.set(0, 1.5, 3);

  // 让相机跟随 root 节点（镜头跟随）
  function updateCamera() {
    const target = stickman.root.position;
    camera.lookAt(target.x, target.y + 0.5, target.z);
  }

  // 添加更多帅气动作
  const flash = {
    name: "flash",
    duration: 0.3,
    keyframes: [
      { time: 0, pose: { root: { positionY: 0 } } },
      { time: 0.15, pose: { root: { positionY: 0.1 } } },
      { time: 0.3, pose: { root: { positionY: 0 } } },
    ].map(kf => ({ time: kf.time, pose: { values: kf.pose } }))
  };

  const retreat = {
    name: "retreat",
    duration: 0.4,
    keyframes: [
      { time: 0, pose: { root: { positionY: 0 } } },
      { time: 0.2, pose: { root: { positionY: 0, z: -0.5 } } },
      { time: 0.4, pose: { root: { positionY: 0 } } },
    ].map(kf => ({ time: kf.time, pose: { values: kf.pose } }))
  };

  // 动作组合技
  async function combo() {
    await player.playMotion(ActionLibrary.jump);
    await player.playMotion(ActionLibrary.kickLeft);
    await player.playMotion(ActionLibrary.punchTurn);
  }

  // 低速动作演示
  async function slowMo() {
    const original = player.tweenToPose;
    player.tweenToPose = (pose, duration) => original.call(player, pose, duration * 2);
    await combo();
    player.tweenToPose = original;
  }

  // 自动执行动作序列
  setTimeout(() => queue.enqueue(ActionLibrary.punchTurn), 1000);
  setTimeout(() => queue.enqueue(ActionLibrary.jump), 2000);
  setTimeout(() => queue.enqueue(ActionLibrary.kickLeft), 3000);
  setTimeout(() => queue.enqueue(flash), 4000);
  setTimeout(() => queue.enqueue(retreat), 4500);
  setTimeout(() => slowMo(), 5000);

  function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    renderer.render(scene, camera);
  }
  animate();
}
