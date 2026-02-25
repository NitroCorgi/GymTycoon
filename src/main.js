import './styles/main.css';
import { Game } from './systems/Game.js';
import { Input } from './systems/Input.js';
import { SceneManager } from './systems/SceneManager.js';
import { MainScene } from './scenes/MainScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { FREE_MODE_LOCATIONS } from './scenes/mainSceneConfig.js';
import { getGameUi } from './ui/getGameUi.js';

const ui = getGameUi();
const { canvas } = ui;

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Expected a canvas element with id "game-canvas".');
}

const input = new Input();
const sceneManager = new SceneManager();
const mainScene = new MainScene({ ui });

sceneManager.register('main', mainScene);
sceneManager.register(
  'location',
  new LocationScene({
    ui,
    onSelectLocation: (locationId) => {
      const selectedLocation = FREE_MODE_LOCATIONS.find((location) => location.id === locationId) ?? FREE_MODE_LOCATIONS[0];
      mainScene.startNewGame(selectedLocation);
      sceneManager.setActive('main');
    }
  })
);
sceneManager.register(
  'title',
  new TitleScene({
    ui,
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
