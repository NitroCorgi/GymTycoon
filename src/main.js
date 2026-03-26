import './styles/main.css';
import { Game } from './systems/Game.js';
import { Input } from './systems/Input.js';
import { SceneManager } from './systems/SceneManager.js';
import { MainScene } from './scenes/MainScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { CampaignScene } from './scenes/CampaignScene.js';
import { FREE_MODE_DIFFICULTIES, FREE_MODE_LOCATIONS } from './scenes/mainSceneConfig.js';
import { getGameUi } from './ui/getGameUi.js';

const ui = getGameUi();
const { canvas } = ui;

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected a canvas element with id "game-canvas".');
}

const input = new Input();
const sceneManager = new SceneManager();
const gameOverScene = new GameOverScene({
  ui,
  onReturnToMenu: () => sceneManager.setActive('title')
});
const mainScene = new MainScene({
  ui,
  onGameOver: ({ bank }) => {
    gameOverScene.setResult({ bank });
    sceneManager.setActive('game-over');
  }
});

sceneManager.register('main', mainScene);
sceneManager.register('game-over', gameOverScene);
sceneManager.register(
  'campaign',
  new CampaignScene({
    ui,
    onReturnToMenu: () => sceneManager.setActive('title')
  })
);
sceneManager.register(
  'location',
  new LocationScene({
    ui,
    onStartGame: ({ locationId, difficultyId, gymName, gymMainColor }) => {
      const selectedLocation = FREE_MODE_LOCATIONS.find((location) => location.id === locationId) ?? FREE_MODE_LOCATIONS[0];
      const selectedDifficulty = FREE_MODE_DIFFICULTIES.find((difficulty) => difficulty.id === difficultyId)
        ?? FREE_MODE_DIFFICULTIES[0];
      mainScene.startNewGame(selectedLocation, selectedDifficulty, true, {
        gymName,
        gymMainColor
      });
      sceneManager.setActive('main');
    }
  })
);
sceneManager.register(
  'title',
  new TitleScene({
    ui,
    onStartCampaign: () => sceneManager.setActive('campaign'),
    onStartFreeMode: () => sceneManager.setActive('location')
  })
);
sceneManager.setActive('title');

const game = new Game({
  canvas,
  input,
  sceneManager,
  background: '#10131a'
});

game.start();
