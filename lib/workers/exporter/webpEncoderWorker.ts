self.onmessage = async (event: MessageEvent) => {
  const bitmap = event.data as ImageBitmap;

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
  const dataURL = await blobToDataURL1(blob);

  self.postMessage(dataURL);
};

function blobToDataURL1(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
