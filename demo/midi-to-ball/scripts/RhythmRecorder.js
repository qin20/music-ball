import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

export class RhythmRecorder {
  constructor(rhythm, options = {}) {
    this.rhythm = rhythm;
    this.canvas = rhythm.canvas;
    this.ctx = this.canvas.getContext('2d');

    this.options = {
      fps: 60,
      duration: options.duration || 10000, // 默认10秒
      width: this.canvas.width,
      height: this.canvas.height,
      encoder: 'image-sequence', // 或 'webm'
      ...options
    };

    this.frames = [];
    this.msPerFrame = 1000 / this.options.fps;
    this.totalFrames = Math.ceil(this.options.duration / this.msPerFrame);
  }

  async record() {
    for (let i = 0; i < this.totalFrames; i++) {
      const currentTime = i * this.msPerFrame;

      // 驱动节奏动画
      this.rhythm.setCurrentTime(currentTime);

      // 渲染当前帧
      this.rhythm.render();

      // 导出帧图像
      const frame = this.canvas.toDataURL('image/webp', 1.0); // 或 'image/png'
      this.frames.push(frame);

      await new Promise(r => setTimeout(r, 1)); // 避免阻塞（模拟异步）
    }

    return this.frames;
  }

  async exportImages() {
    const zip = new JSZip();
    this.frames.forEach((dataUrl, i) => {
      const base64 = dataUrl.split(',')[1];
      zip.file(`frame_${String(i).padStart(4, '0')}.webp`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'frames.zip';
    a.click();
  }

  async exportWebM() {
    const stream = this.canvas.captureStream(this.options.fps);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rhythm-video.webm';
      a.click();
    };

    recorder.start();
    await this.record(); // 驱动节奏
    recorder.stop();
  }
}
