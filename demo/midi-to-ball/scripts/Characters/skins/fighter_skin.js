function getSpriteFramesByPositions(spriteWidth, spriteHeight, positions) {
  return positions.map(([row, col]) => ({
    x: col * spriteWidth,
    y: row * spriteHeight,
    w: spriteWidth,
    h: spriteHeight,
  }));
}

function getFramesByRow(spriteWidth, spriteHeight, row, cols) {
  const positions = cols.map(col => [row, col]);
  return getSpriteFramesByPositions(spriteWidth, spriteHeight, positions);
}

export const fighterSkin = {
  name: 'fighter',
  src: './scripts/Characters/skins/stickman.png', // 👈 请将生成的图另存为此路径
  sprite: null,

  anchor: 'center',  // 🧍‍♂️ 脚落地对准路径点
  frameBox: { w: 669, h: 569 }, // 每帧原始大小

  frames: {
    idle: getFramesByRow(220, 220, 0, [0]),
    // ✅ 四方向移动帧
    move_up_left: getFramesByRow(220, 220, 0, [10]),
    move_up_right: getFramesByRow(220, 220, 0, [0]),
    move_down_left: getFramesByRow(220, 220, 0, [8]),
    move_down_right: getFramesByRow(220, 220, 0, [9]),
    attack_left: getFramesByRow(220, 220, 0, [
      7,
    ]),
    attack_right: getFramesByRow(220, 220, 0, [
      7,
    ]),
    attack_up: getFramesByRow(220, 220, 0, [
      7,
    ]),
    attack_down: getFramesByRow(220, 220, 0, [
      7,
    ]),
  },

  behavior: {
    defaultState: 'idle',
    frameInterval: 100, // 每帧持续时间 (ms)
    hitAutoReturn: true,
    durationMap: {
      idle: 500,
      move_up_left: 600,
      move_up_right: 600,
      move_down_left: 600,
      move_down_right: 600,
      attack_left: 400,
      attack_right: 300,
      attack_up: 300,
      attack_down: 300,
    },
    moveMap: {
      'up-left': 'move_up_left',
      'up-right': 'move_up_right',
      'down-left': 'move_down_left',
      'down-right': 'move_down_right'
    },
    attackMap: {
      left: 'attack_left',
      right: 'attack_right',
      up: 'attack_up',
      down: 'attack_down'
    },
    impactFrames: {
      attack_left: 0,
      attack_right: 0,
      attack_up: 0,
      attack_down: 0,
    }
  }
};
