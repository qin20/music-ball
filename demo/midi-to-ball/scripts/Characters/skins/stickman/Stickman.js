export class Stickman {
  constructor(options = {}) {
    this.color = options.color || "#000";
    this.scale = (options.size || 210) / 210;
    this.lineWidth = (options.lineWidth || 18) * this.scale;
    this.headRadius = (options.headRadius || 24) * this.scale;

    this.lengths = {
      upperArm: 60 * this.scale,
      lowerArm: 55 * this.scale,
      palm: 10 * this.scale,
      neckToChest: 25 * this.scale,
      chestToHip: 50 * this.scale,
      upperLeg: 65 * this.scale,
      lowerLeg: 60 * this.scale,
      sole: 10 * this.scale
    };
  }

  generatePose(x, y, angles = {}) {
    const L = this.lengths;
    const rad = deg => deg * Math.PI / 180;
    const pointAt = (p, length, angle) => ({
      x: p.x + Math.cos(angle) * length,
      y: p.y + Math.sin(angle) * length,
    });

    const joints = {};

    joints.head = { x, y };
    joints.neck = { x, y: y + this.headRadius };
    joints.chest = { x, y: joints.neck.y + L.neckToChest };
    joints.hip = { x, y: joints.chest.y + L.chestToHip };

    // 上肢（角度控制）
    const a1 = rad(angles.upperArmR || 30);
    const a2 = rad(angles.lowerArmR || 20);
    const aPalmR = rad(angles.palmR || 15);
    joints.elbowR = pointAt(joints.neck, L.upperArm, a1);
    joints.handR = pointAt(joints.elbowR, L.lowerArm, a1 + a2);
    joints.palmR = pointAt(joints.handR, L.palm, a1 + a2 + aPalmR);

    const a1L = rad(angles.upperArmL || 150);
    const a2L = rad(angles.lowerArmL || -20);
    const aPalmL = rad(angles.palmL || -15);
    joints.elbowL = pointAt(joints.neck, L.upperArm, a1L);
    joints.handL = pointAt(joints.elbowL, L.lowerArm, a1L + a2L);
    joints.palmL = pointAt(joints.handL, L.palm, a1L + a2L + aPalmL);

    // 下肢（角度控制）
    const a3 = rad(angles.upperLegR || 100);
    const a4 = rad(angles.lowerLegR || 30);
    const aSoleR = rad(angles.soleR || 20);
    joints.kneeR = pointAt(joints.hip, L.upperLeg, a3);
    joints.footR = pointAt(joints.kneeR, L.lowerLeg, a3 + a4);
    joints.soleR = pointAt(joints.footR, L.sole, a3 + a4 + aSoleR);

    const a3L = rad(angles.upperLegL || 80);
    const a4L = rad(angles.lowerLegL || 30);
    const aSoleL = rad(angles.soleL || -20);
    joints.kneeL = pointAt(joints.hip, L.upperLeg, a3L);
    joints.footL = pointAt(joints.kneeL, L.lowerLeg, a3L + a4L);
    joints.soleL = pointAt(joints.footL, L.sole, a3L + a4L + aSoleL);

    return joints;
  }

  drawWithPose(ctx, joints) {
    const w = this.lineWidth;

    // 躯干
    this.#drawLine(ctx, joints.neck, joints.chest, w, this.color);
    this.#drawLine(ctx, joints.chest, joints.hip, w, this.color);

    // 头
    this.#drawHead(ctx, joints.neck, this.headRadius, this.color);

    // 左臂
    this.#drawLine(ctx, joints.neck, joints.elbowL, w, this.color);
    this.#drawLine(ctx, joints.elbowL, joints.handL, w, this.color);
    this.#drawLine(ctx, joints.handL, joints.palmL, w, this.color);

    // 右臂
    this.#drawLine(ctx, joints.neck, joints.elbowR, w, this.color);
    this.#drawLine(ctx, joints.elbowR, joints.handR, w, this.color);
    this.#drawLine(ctx, joints.handR, joints.palmR, w, this.color);

    // 左腿
    this.#drawLine(ctx, joints.hip, joints.kneeL, w, this.color);
    this.#drawLine(ctx, joints.kneeL, joints.footL, w, this.color);
    this.#drawLine(ctx, joints.footL, joints.soleL, w, this.color);

    // 右腿
    this.#drawLine(ctx, joints.hip, joints.kneeR, w, this.color);
    this.#drawLine(ctx, joints.kneeR, joints.footR, w, this.color);
    this.#drawLine(ctx, joints.footR, joints.soleR, w, this.color);

    // 红色骨骼点（调试用）
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
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  #drawJoint(ctx, p, radius = 4) {
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
