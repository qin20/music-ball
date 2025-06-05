export class TextureManager {
  static async loadPattern(src) {
    const img = new Image();
    img.src = src;
    await img.decode(); // 等待加载完成
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ctx.createPattern(img, 'repeat');
  }
}
