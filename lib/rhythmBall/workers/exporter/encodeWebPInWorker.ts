const worker = new Worker(new URL('./webpEncoderWorker.ts', import.meta.url), { type: 'module' });

export async function encodeWebPInWorker(bitmap: ImageBitmap): Promise<string> {
  return new Promise((resolve) => {
    const handle = (event: MessageEvent) => {
      resolve(event.data as string);
      worker.removeEventListener("message", handle);
    };
    worker.addEventListener("message", handle);
    worker.postMessage(bitmap, [bitmap]); // transferrable!
  });
}
