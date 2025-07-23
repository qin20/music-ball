export class TextureManager {
  /**
   * 加载图像并返回 CanvasPattern，用于填充纹理
   * @param src 图像资源路径
   * @returns Promise<CanvasPattern>
   */
  static async loadPattern(src: string): Promise<CanvasPattern> {
    const img = new Image();
    img.src = src;

    await img.decode(); // 等待图片解码

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('TextureManager: Failed to get 2D context');
    }

    const pattern = ctx.createPattern(img, 'repeat');

    if (!pattern) {
      throw new Error('TextureManager: Failed to create pattern');
    }

    return pattern;
  }
}
