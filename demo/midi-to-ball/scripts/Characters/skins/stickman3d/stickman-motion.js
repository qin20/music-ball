// ✅ stickman-motion.js
// 火柴人动作模块：包含 Pose、Motion、Player、ActionLibrary，支持多关节动作、混合、位移动画

import gsap from 'https://esm.sh/gsap';

export class Pose {
  constructor(values = {}) {
    this.values = values; // { jointName: { rotationZ?, positionY? } }
  }
}

export class Motion {
  constructor(name, duration, keyframes = []) {
    this.name = name;
    this.duration = duration; // 秒
    this.keyframes = keyframes; // [{ time: 秒, pose: Pose }]
  }
}

export class MotionPlayer {
  constructor(stickman) {
    this.stickman = stickman;
    this.currentTween = null;
  }

  async playMotion(motion) {
    for (let i = 0; i < motion.keyframes.length - 1; i++) {
      const current = motion.keyframes[i];
      const next = motion.keyframes[i + 1];
      const duration = next.time - current.time;
      await this.tweenToPose(next.pose.values, duration);
    }
  }

  tweenToPose(poseValues, duration) {
    return new Promise(resolve => {
      const tweens = [];
      for (const joint in poseValues) {
        const jointObj = this.stickman[joint];
        if (!jointObj) continue;
        const target = poseValues[joint];

        if (target.rotationZ !== undefined) {
          tweens.push(gsap.to(jointObj.rotation, {
            z: target.rotationZ,
            duration,
            ease: 'power2.inOut'
          }));
        }
        if (target.positionY !== undefined) {
          tweens.push(gsap.to(jointObj.position, {
            y: target.positionY,
            duration,
            ease: 'power2.inOut'
          }));
        }
      }
      gsap.delayedCall(duration, resolve);
    });
  }

  blendPose(poseValues, blend = 0.5, duration = 0.2) {
    for (const joint in poseValues) {
      const jointObj = this.stickman[joint];
      if (!jointObj) continue;
      const target = poseValues[joint];
      if (target.rotationZ !== undefined) {
        const currentZ = jointObj.rotation.z;
        const targetZ = currentZ * (1 - blend) + target.rotationZ * blend;
        gsap.to(jointObj.rotation, { z: targetZ, duration, ease: 'power2.out' });
      }
      if (target.positionY !== undefined) {
        const currentY = jointObj.position.y;
        const targetY = currentY * (1 - blend) + target.positionY * blend;
        gsap.to(jointObj.position, { y: targetY, duration, ease: 'power2.out' });
      }
    }
  }
}

export const ActionLibrary = {
  punchTurn: new Motion("punchTurn", 0.5, [
    { time: 0, pose: new Pose({ rightArm: { rotationZ: 0 }, root: { rotationZ: 0 } }) },
    { time: 0.25, pose: new Pose({ rightArm: { rotationZ: -1.2 }, root: { rotationZ: 0.3 } }) },
    { time: 0.5, pose: new Pose({ rightArm: { rotationZ: 0 }, root: { rotationZ: 0 } }) }
  ]),

  jump: new Motion("jump", 0.6, [
    { time: 0, pose: new Pose({ root: { positionY: 0 } }) },
    { time: 0.3, pose: new Pose({ root: { positionY: 1.0 } }) },
    { time: 0.6, pose: new Pose({ root: { positionY: 0 } }) }
  ]),

  kickLeft: new Motion("kickLeft", 0.5, [
    { time: 0, pose: new Pose({ leftLeg: { rotationZ: 0 } }) },
    { time: 0.2, pose: new Pose({ leftLeg: { rotationZ: 1.2 } }) },
    { time: 0.5, pose: new Pose({ leftLeg: { rotationZ: 0 } }) }
  ])
};

export class ActionQueue {
  constructor(player) {
    this.player = player;
    this.queue = [];
    this.playing = false;
  }

  enqueue(motion) {
    this.queue.push(motion);
    this.playNext();
  }

  async playNext() {
    if (this.playing || this.queue.length === 0) return;
    this.playing = true;
    const motion = this.queue.shift();
    await this.player.playMotion(motion);
    this.playing = false;
    this.playNext();
  }
}

// ✅ 用法示例：
// const player = new MotionPlayer(stickman);
// const queue = new ActionQueue(player);
// queue.enqueue(ActionLibrary.punchTurn);
