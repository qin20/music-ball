import { EventEmitter } from './EventEmitter.js';

export class StickmanEditor {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dragging = null;
    this.dragRadius = 10;
    this.lastMouse = { x: 0, y: 0 };
    this.anchor = 'hip';
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.bind(this);

    const scale = (options.size || 210) / 210;
    this.options = {
      color: options.color || "#000",
      scale,
      lineWidth: (options.lineWidth || 18) * scale,
      headRadius: (options.headRadius || 24) * scale
    };

    this.lengths = {
      chestToHip: 40 * scale,
      neckToChest: 40 * scale,
      neckToHead: 28 * scale,
      upperArm: 45 * scale,
      lowerArm: 45 * scale,
      palm: 10 * scale,
      upperLeg: 55 * scale,
      lowerLeg: 55 * scale,
      sole: 10 * scale
    };

    this.skeleton = {
      hip:    { lengthFrom: null, connectTo: ['chest'], length: 0 },
      chest:  { lengthFrom: 'hip', length: this.lengths.chestToHip, connectTo: ['neck'] },
      neck:   { lengthFrom: 'chest', length: this.lengths.neckToChest, connectTo: ['head', 'elbowL', 'elbowR'] },
      head:   { lengthFrom: 'neck', length: this.lengths.neckToHead },

      elbowR: { lengthFrom: 'neck', length: this.lengths.upperArm, connectTo: ['handR'] },
      handR:  { lengthFrom: 'elbowR', length: this.lengths.lowerArm, connectTo: ['palmR'] },
      palmR:  { lengthFrom: 'handR', length: this.lengths.palm },

      elbowL: { lengthFrom: 'neck', length: this.lengths.upperArm, connectTo: ['handL'] },
      handL:  { lengthFrom: 'elbowL', length: this.lengths.lowerArm, connectTo: ['palmL'] },
      palmL:  { lengthFrom: 'handL', length: this.lengths.palm },

      kneeR:  { lengthFrom: 'hip', length: this.lengths.upperLeg, connectTo: ['footR'] },
      footR:  { lengthFrom: 'kneeR', length: this.lengths.lowerLeg, connectTo: ['soleR'] },
      soleR:  { lengthFrom: 'footR', length: this.lengths.sole },

      kneeL:  { lengthFrom: 'hip', length: this.lengths.upperLeg, connectTo: ['footL'] },
      footL:  { lengthFrom: 'kneeL', length: this.lengths.lowerLeg, connectTo: ['soleL'] },
      soleL:  { lengthFrom: 'footL', length: this.lengths.sole }
    };

    this.currentPose = {
      hip: 0,
      chest: -90,
      neck: -90,
      head: -90,
      elbowR: 30,
      handR: 30,
      palmR: 30,
      elbowL: 150,
      handL: 150,
      palmL: 150,
      kneeR: 100,
      footR: 100,
      soleR: 100,
      kneeL: 80,
      footL: 80,
      soleL: 80
    };

    this.childrenMap = {};
    for (const key in this.skeleton) {
      const parent = this.skeleton[key].lengthFrom;
      if (parent) {
        if (!this.childrenMap[parent]) this.childrenMap[parent] = [];
        this.childrenMap[parent].push(key);
      }
    }

    this.joints = {};
    canvas.addEventListener("mousedown", this.#onMouseDown.bind(this));
    canvas.addEventListener("mousemove", this.#onMouseMove.bind(this));
    canvas.addEventListener("mouseup", this.#onMouseUp.bind(this));
    canvas.addEventListener("mouseleave", this.#onMouseUp.bind(this));
  }

  draw(anchorX, anchorY, pose = this.currentPose) {
    this.#generateJoints(anchorX, anchorY, pose);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.#drawStickman(this.joints);
    this.currentPose = { ...pose };
  }

  getCurrentPose() {
    return { ...this.currentPose };
  }

  #generateJoints(anchorX, anchorY, pose) {
    const joints = {};
    const skeleton = this.skeleton;

    const placeJoint = (key) => {
      const joint = skeleton[key];
      if (joint.lengthFrom === null) {
        joints[key] = { x: anchorX, y: anchorY };
      } else {
        const from = joints[joint.lengthFrom];
        const angleRad = (pose[key] || 0) * Math.PI / 180;
        joints[key] = {
          x: from.x + Math.cos(angleRad) * joint.length,
          y: from.y + Math.sin(angleRad) * joint.length
        };
      }
    };

    const walk = (key) => {
      placeJoint(key);
      const children = this.childrenMap[key] || [];
      for (const child of children) walk(child);
    };

    walk(this.anchor);
    this.joints = joints;
  }

  #drawStickman(joints) {
    const { ctx } = this;
    const { color, lineWidth, headRadius } = this.options;

    const pairs = [
      ['hip', 'chest'], ['chest', 'neck'], ['neck', 'head'],
      ['neck', 'elbowR'], ['elbowR', 'handR'], ['handR', 'palmR'],
      ['neck', 'elbowL'], ['elbowL', 'handL'], ['handL', 'palmL'],
      ['hip', 'kneeR'], ['kneeR', 'footR'], ['footR', 'soleR'],
      ['hip', 'kneeL'], ['kneeL', 'footL'], ['footL', 'soleL']
    ];

    for (const [a, b] of pairs) {
      this.#drawLine(ctx, joints[a], joints[b], lineWidth, color);
    }

    this.#drawHead(ctx, joints.head, headRadius, color);

    for (const key in joints) {
      const isAnchor = key === this.anchor;
      this.#drawJoint(ctx, joints[key], 4, isAnchor ? '#fc0' : '#f00');
    }
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

  #drawHead(ctx, center, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  #drawJoint(ctx, p, radius = 4, color = '#f00') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  #onMouseDown(e) {
    const { offsetX, offsetY } = e;
    this.lastMouse = { x: offsetX, y: offsetY };

    const candidates = [];
    for (const key in this.joints) {
      const p = this.joints[key];
      const dx = offsetX - p.x;
      const dy = offsetY - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < this.dragRadius ** 2) {
        const depth = this.#getDepth(key);
        candidates.push({ key, distSq, depth });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (b.depth !== a.depth) return b.depth - a.depth;
        return a.distSq - b.distSq;
      });
      this.dragging = candidates[0].key;
    }
  }

  #getDepth(key) {
    let depth = 0;
    while (this.skeleton[key].lengthFrom) {
      key = this.skeleton[key].lengthFrom;
      depth++;
    }
    return depth;
  }

  #onMouseMove(e) {
    if (!this.dragging || this.dragging === this.anchor) return;

    const { offsetX, offsetY } = e;
    const key = this.dragging;
    const parentKey = this.skeleton[key].lengthFrom;
    if (!parentKey) return;

    const from = this.joints[parentKey];
    const angleBefore = (this.currentPose[key] || 0) * Math.PI / 180;
    const angleAfter = Math.atan2(offsetY - from.y, offsetX - from.x);
    const delta = angleAfter - angleBefore;

    const rotateRecursive = (k) => {
      this.currentPose[k] += delta * 180 / Math.PI;
      const children = this.childrenMap[k] || [];
      for (const child of children) rotateRecursive(child);
    };
    rotateRecursive(key);

    this.lastMouse = { x: offsetX, y: offsetY };
    this.draw(this.joints[this.anchor].x, this.joints[this.anchor].y);
    this.emit("edit", this.getCurrentPose());
  }

  #onMouseUp() {
    this.dragging = null;
  }
}
