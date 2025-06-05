// pose-sequence.js
import { StickmanEditor } from '../StickmanEditor.js';

const upload = document.getElementById("upload");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const analyzeBtn = document.getElementById("analyze");
const copyAllBtn = document.getElementById("copyAll");
const frameList = document.getElementById("frameList");
const canvas = document.getElementById("canvas");

const editor = new StickmanEditor(canvas);
let sourceImage = null;
let poses = [];
let frameImages = [];
let currentFrameIndex = 0;

editor.eventEmitter.on("edit", updatedPose => {
  if (poses[currentFrameIndex]) {
    poses[currentFrameIndex] = { ...updatedPose };
  }
});

// ✅ 单 Pose 实例 + 任务队列
const pose = new Pose({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
});
pose.setOptions({
  staticImageMode: true,
  modelComplexity: 1,
  selfieMode: false,
  minDetectionConfidence: 0.5
});

let poseQueue = Promise.resolve();

function recognizeFrame(index, image) {
  return new Promise(resolve => {
    poseQueue = poseQueue.then(() =>
      new Promise(innerResolve => {
        pose.onResults(results => {
          const item = frameList.children[index];
          if (!results.poseLandmarks) {
            poses[index] = null;
            if (item) item.classList.add("failed");
            innerResolve();
            return resolve();
          }

          if (item) item.classList.remove("failed");

          const get = name => results.poseLandmarks[POSE_LANDMARKS[name]];
          const deg = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          const hipCenter = midpoint(get("LEFT_HIP"), get("RIGHT_HIP"));
          const shoulderCenter = midpoint(get("LEFT_SHOULDER"), get("RIGHT_SHOULDER"));
          const chestAngle = deg(hipCenter, shoulderCenter);

          poses[index] = {
            hip: 0,
            chest: chestAngle,
            neck: chestAngle,
            head: chestAngle,
            elbowL: deg(get("LEFT_SHOULDER"), get("LEFT_ELBOW")),
            handL: deg(get("LEFT_ELBOW"), get("LEFT_WRIST")),
            palmL: deg(get("LEFT_WRIST"), get("LEFT_INDEX") ?? get("LEFT_WRIST")),
            elbowR: deg(get("RIGHT_SHOULDER"), get("RIGHT_ELBOW")),
            handR: deg(get("RIGHT_ELBOW"), get("RIGHT_WRIST")),
            palmR: deg(get("RIGHT_WRIST"), get("RIGHT_INDEX") ?? get("RIGHT_WRIST")),
            kneeL: deg(get("LEFT_HIP"), get("LEFT_KNEE")),
            footL: deg(get("LEFT_KNEE"), get("LEFT_ANKLE")),
            soleL: deg(get("LEFT_HEEL"), get("LEFT_FOOT_INDEX") ?? get("LEFT_ANKLE")),
            kneeR: deg(get("RIGHT_HIP"), get("RIGHT_KNEE")),
            footR: deg(get("RIGHT_KNEE"), get("RIGHT_ANKLE")),
            soleR: deg(get("RIGHT_HEEL"), get("RIGHT_FOOT_INDEX") ?? get("RIGHT_ANKLE"))
          };

          innerResolve();
          resolve();
        });

        pose.send({ image });
      })
    );
  });
}

upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  sourceImage = new Image();
  sourceImage.onload = () => {};
  sourceImage.src = URL.createObjectURL(file);
});

analyzeBtn.addEventListener("click", async () => {
  if (!sourceImage) return;

  const rows = parseInt(rowsInput.value);
  const cols = parseInt(colsInput.value);
  const cellW = sourceImage.width / cols;
  const cellH = sourceImage.height / rows;
  poses = new Array(rows * cols);
  frameImages = [];
  frameList.innerHTML = "";

  const offscreen = document.createElement("canvas");
  offscreen.width = cellW;
  offscreen.height = cellH;
  const offCtx = offscreen.getContext("2d");

  const tasks = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      offCtx.clearRect(0, 0, cellW, cellH);
      offCtx.drawImage(sourceImage, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
      const url = offscreen.toDataURL();
      const frameIndex = frameImages.length;
      frameImages.push(url);

      const img = document.createElement("img");
      img.src = url;
      img.onclick = () => selectFrame(frameIndex);

      const copyBtn = document.createElement("button");
      copyBtn.textContent = "📋";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(JSON.stringify(poses[frameIndex], null, 2));
      };

      const reanalyzeBtn = document.createElement("button");
      reanalyzeBtn.textContent = "🧠";
      reanalyzeBtn.onclick = async () => {
        const tmpImg = new Image();
        tmpImg.src = url;
        await new Promise(resolve => {
          tmpImg.onload = () => recognizeFrame(frameIndex, tmpImg).then(resolve);
        });
        if (currentFrameIndex === frameIndex) {
          editor.draw(200, 250, poses[frameIndex]);
        }
      };

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.className = "frame-checkbox";
      checkbox.dataset.index = frameIndex;

      const actions = document.createElement("div");
      actions.className = "frame-actions";
      actions.appendChild(copyBtn);
      actions.appendChild(reanalyzeBtn);

      const item = document.createElement("div");
      item.className = "frame-item";
      item.appendChild(checkbox); // 在 frame-item 中显示
      item.appendChild(img);
      item.appendChild(actions);
      frameList.appendChild(item);

      const task = new Promise(resolve => {
        const frameImg = new Image();
        frameImg.src = url;
        frameImg.onload = () => recognizeFrame(frameIndex, frameImg).then(resolve);
      });
      tasks.push(task);
    }
  }

  await Promise.all(tasks);
  selectFrame(0);
});

function selectFrame(index) {
  currentFrameIndex = index;
  editor.draw(200, 250, poses[index]);
  [...frameList.querySelectorAll("img")].forEach((img, i) => {
    img.classList.toggle("active", i === index);
  });
}

copyAllBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(JSON.stringify(poses, null, 2));
});

function interpolatePose(p1, p2, t) {
  const result = {};
  for (const key in p1) {
    if (p2.hasOwnProperty(key)) {
      const a = p1[key];
      const b = p2[key];
      const delta = ((b - a + 540) % 360) - 180; // 最短角度差
      result[key] = a + delta * t;
    }
  }
  return result;
}

function playSequence() {
  const checkedIndexes = [...frameList.querySelectorAll(".frame-checkbox")]
    .map((cb, i) => cb.checked ? i : -1)
    .filter(i => i !== -1);

  if (checkedIndexes.length < 1) return;

  let frame = 0;
  function playFrame() {
    if (frame === checkedIndexes.length - 1) {
      editor.draw(200, 250, poses[checkedIndexes[frame]]);
      return;
    }

    const p1 = poses[checkedIndexes[frame]];
    const p2 = poses[checkedIndexes[frame + 1]];
    const duration = 500;
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const pose = interpolatePose(p1, p2, t);
      editor.draw(200, 250, pose);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        frame++;
        requestAnimationFrame(playFrame);
      }
    }

    requestAnimationFrame(step);
  }

  playFrame();
}

document.getElementById("play").addEventListener("click", playSequence);

const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};
