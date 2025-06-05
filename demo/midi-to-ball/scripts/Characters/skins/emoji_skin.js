export const emojiSkin = {
  sprite: null, // loadImage() 后赋值
  frames: {
    idle: [{ x: 0, y: 0, w: 64, h: 64 }],
    attack_left: [{ x: 64, y: 0, w: 64, h: 64 }],
    attack_right: [{ x: 128, y: 0, w: 64, h: 64 }],
    attack_up: [{ x: 192, y: 0, w: 64, h: 64 }],
    attack_down: [{ x: 256, y: 0, w: 64, h: 64 }]
  },
  behavior: {
    defaultState: 'idle',
    frameInterval: 120,
    hitAutoReturn: true,
    attackMap: {
      left: 'attack_left',
      right: 'attack_right',
      up: 'attack_up',
      down: 'attack_down'
    }
  }
};
