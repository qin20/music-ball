export class Stickman {
  constructor(options = {}) {
    const defaultHeight = 210;
    this.size = options.size || defaultHeight;
    this.scale = this.size / defaultHeight;

    this.color = options.color || "#000";
    this.lineWidth = (options.lineWidth || 18) * this.scale;
    this.headRadius = (options.headRadius || 26) * this.scale;
  }

  computePose(x, y) {
    const s = this.scale;

    const len = {
      head: this.headRadius,
      neckToChest: 25 * s,
      chestToHip: 50 * s,
      upperArm: 60 * s,
      lowerArm: 55 * s,
      palm: 10 * s,
      upperLeg: 65 * s,
      lowerLeg: 60 * s,
      sole: 10 * s
    };

    const joints = {};
    joints.head = { x, y };
    joints.neck = { x, y: y + len.head };
    joints.chest = { x, y: joints.neck.y + len.neckToChest };
    joints.hip = { x, y: joints.chest.y + len.chestToHip };

    joints.elbowL = { x: x - len.upperArm, y: joints.chest.y + 5 * s };
    joints.handL = { x: joints.elbowL.x - len.lowerArm, y: joints.elbowL.y + 20 * s };
    joints.palmL = { x: joints.handL.x - len.palm, y: joints.handL.y + 5 * s };

    joints.elbowR = { x: x + len.upperArm, y: joints.chest.y + 5 * s };
    joints.handR = { x: joints.elbowR.x + len.lowerArm, y: joints.elbowR.y + 20 * s };
    joints.palmR = { x: joints.handR.x + len.palm, y: joints.handR.y + 5 * s };

    joints.kneeL = { x: x - 20 * s, y: joints.hip.y + len.upperLeg };
    joints.footL = { x: joints.kneeL.x - 5 * s, y: joints.kneeL.y + len.lowerLeg };
    joints.soleL = { x: joints.footL.x - 5 * s, y: joints.footL.y + len.sole };

    joints.kneeR = { x: x + 20 * s, y: joints.hip.y + len.upperLeg };
    joints.footR = { x: joints.kneeR.x + 5 * s, y: joints.kneeR.y + len.lowerLeg };
    joints.soleR = { x: joints.footR.x + 5 * s, y: joints.footR.y + len.sole };

    return joints;
  }

  draw(ctx, x, y) {
    const joints = this.computePose(x, y);
    const w = this.lineWidth;

    this.#drawLine(ctx, joints.neck, joints.chest, w, this.color);
    this.#drawLine(ctx, joints.chest, joints.hip, w, this.color);
    this.#drawHead(ctx, joints.neck, this.headRadius, this.color);

    this.#drawLimb(ctx, joints.neck, joints.elbowL, joints.handL, w, this.color);
    this.#drawLine(ctx, joints.handL, joints.palmL, w, this.color);

    this.#drawLimb(ctx, joints.neck, joints.elbowR, joints.handR, w, this.color);
    this.#drawLine(ctx, joints.handR, joints.palmR, w, this.color);

    this.#drawLimb(ctx, joints.hip, joints.kneeL, joints.footL, w, this.color);
    this.#drawLine(ctx, joints.footL, joints.soleL, w, this.color);

    this.#drawLimb(ctx, joints.hip, joints.kneeR, joints.footR, w, this.color);
    this.#drawLine(ctx, joints.footR, joints.soleR, w, this.color);

    for (const key in joints) {
      this.#drawJoint(ctx, joints[key], 4 * this.scale);
    }
  }

  drawWithPose(ctx, joints) {
    const w = this.lineWidth;

    this.#drawLine(ctx, joints.neck, joints.chest, w, this.color);
    this.#drawLine(ctx, joints.chest, joints.hip, w, this.color);
    this.#drawHead(ctx, joints.neck, this.headRadius, this.color);

    this.#drawLimb(ctx, joints.neck, joints.elbowL, joints.handL, w, this.color);
    this.#drawLine(ctx, joints.handL, joints.palmL, w, this.color);

    this.#drawLimb(ctx, joints.neck, joints.elbowR, joints.handR, w, this.color);
    this.#drawLine(ctx, joints.handR, joints.palmR, w, this.color);

    this.#drawLimb(ctx, joints.hip, joints.kneeL, joints.footL, w, this.color);
    this.#drawLine(ctx, joints.footL, joints.soleL, w, this.color);

    this.#drawLimb(ctx, joints.hip, joints.kneeR, joints.footR, w, this.color);
    this.#drawLine(ctx, joints.footR, joints.soleR, w, this.color);

    for (const key in joints) {
      this.#drawJoint(ctx, joints[key], 4 * this.scale);
    }
  }

  #drawHead(ctx, neck, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(neck.x, neck.y - radius, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  #drawLine(ctx, a, b, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  #drawLimb(ctx, a, b, c, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
    ctx.stroke();
  }

  #drawJoint(ctx, p, radius = 4) {
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  #interpolatePose(p1, p2, t) {
    const pose = {};
    for (const key in p1) {
      pose[key] = {
        x: p1[key].x + (p2[key].x - p1[key].x) * t,
        y: p1[key].y + (p2[key].y - p1[key].y) * t
      };
    }
    return pose;
  }

  playAnimation(ctx, x, y, poses, frameDuration, elapsed) {
    const totalFrames = poses.length - 1;
    const totalTime = totalFrames * frameDuration;

    const t = Math.min(elapsed, totalTime);
    const frameIndex = Math.floor(t / frameDuration);

    if (frameIndex >= totalFrames) {
      this.drawWithPose(ctx, poses[totalFrames]); // 最后一帧
      return;
    }

    const frameT = (t % frameDuration) / frameDuration;
    const pose = this.#interpolatePose(poses[frameIndex], poses[frameIndex + 1], frameT);
    this.drawWithPose(ctx, pose);
  }
}
