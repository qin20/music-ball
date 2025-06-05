export async function loadCharacterSkin(skin) {
  if (skin.sprite) return skin; // 已加载过

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      skin.sprite = img;
      resolve(skin);
    };
    img.onerror = reject;
    img.src = skin.src;
  });
}
