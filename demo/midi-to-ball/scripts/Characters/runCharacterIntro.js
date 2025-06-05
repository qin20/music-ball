// runCharacterIntro.js
import { RhythmCharacter } from './RhythmCharacter.js';
import { RobotSkin } from './skins/RobotSkin.js';

export function runCharacterIntro(ctx, rhythm) {
  return new Promise(resolve => {
    const character = new RhythmCharacter(RobotSkin);
    character.pos = { x: rhythm.center.x, y: rhythm.center.y - 100 };
    character.startLaunch(rhythm.walls.getPath()[0]);

    let last = performance.now();
    function loop(now) {
      const dt = now - last;
      last = now;
      character.update(dt);

      rhythm.render();
      character.draw(ctx);

      if (character.isFinished()) {
        resolve();
      } else {
        requestAnimationFrame(loop);
      }
    }

    requestAnimationFrame(loop);
  });
}
