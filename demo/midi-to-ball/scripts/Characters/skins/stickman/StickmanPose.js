export class StickmanPose {
  static makeIdle(stickman, x, y) {
    return stickman.generatePose(x, y, {
      upperArmR: 30,
      lowerArmR: 20,
      palmR: 15,
      upperArmL: 150,
      lowerArmL: -20,
      palmL: -15,
      upperLegR: 100,
      lowerLegR: 30,
      soleR: 20,
      upperLegL: 80,
      lowerLegL: 30,
      soleL: -20
    });
  }

  static makePunch(stickman, x, y) {
    const poses = [];
    const baseAngles = {
      upperArmL: 150, lowerArmL: -20, palmL: -15,
      upperLegR: 100, lowerLegR: 30, soleR: 20,
      upperLegL: 80, lowerLegL: 30, soleL: -20
    };

    const make = (ua, la, palm, chestOffset = 0, hipOffset = 0, leftElbowOffset = 0) => {
      const joints = stickman.generatePose(x, y, {
        ...baseAngles,
        upperArmR: ua,
        lowerArmR: la,
        palmR: palm
      });

      // 胸部/骨盆偏移（模拟身体旋转）
      joints.chest.x += chestOffset;
      joints.hip.x += hipOffset;

      // 左臂协助动作（收紧）
      joints.elbowL.x += leftElbowOffset;
      joints.handL.x += leftElbowOffset;
      joints.palmL.x += leftElbowOffset;

      return joints;
    };

    poses.push(make(30, 20, 15, 0, 0, 0));      // p0：站立
    poses.push(make(10, -5, 10, 5, -3, 5));      // p1：身体带动准备
    poses.push(make(0, 0, 0, 10, -5, 10));       // p2：出拳冲击帧
    poses.push(make(45, -45, 10, 0, 0, 0));      // p3：回收

    return poses;
  }
}
