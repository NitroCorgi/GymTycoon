import './styles/main.css';
import { Game } from './systems/Game.js';
import { Input } from './systems/Input.js';
import { SceneManager } from './systems/SceneManager.js';
import { MainScene } from './scenes/MainScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { CampaignScene } from './scenes/CampaignScene.js';
import { CampaignVictoryScene } from './scenes/CampaignVictoryScene.js';
import { CAMPAIGN_LEVELS, FREE_MODE_DIFFICULTIES, FREE_MODE_LOCATIONS } from './scenes/mainSceneConfig.js';
import { SCENE_IDS } from './scenes/sceneIds.js';
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
  onReturnToMenu: () => sceneManager.setActive(SCENE_IDS.TITLE)
});
const campaignVictoryScene = new CampaignVictoryScene({
  ui,
  onReturnToMenu: () => sceneManager.setActive(SCENE_IDS.TITLE)
});
const mainScene = new MainScene({
  ui,
  onGameOver: ({ bank }) => {
    gameOverScene.setResult({ bank });
    sceneManager.setActive(SCENE_IDS.GAME_OVER);
  },
  onCampaignVictory: ({ levelId, levelLabel, gymName }) => {
    campaignVictoryScene.setResult({ levelId, levelLabel, gymName });
    sceneManager.setActive(SCENE_IDS.CAMPAIGN_VICTORY);
  }
});

sceneManager.register(SCENE_IDS.MAIN, mainScene);
sceneManager.register(SCENE_IDS.GAME_OVER, gameOverScene);
sceneManager.register(SCENE_IDS.CAMPAIGN_VICTORY, campaignVictoryScene);
sceneManager.register(
  SCENE_IDS.CAMPAIGN,
  new CampaignScene({
    ui,
    onReturnToMenu: () => sceneManager.setActive(SCENE_IDS.TITLE),
    onStartLevel: ({ levelId, gymName, gymMainColor }) => {
      const selectedLevel = CAMPAIGN_LEVELS.find((level) => level.id === levelId && level.isAvailable);
      if (!selectedLevel) return;

      const selectedLocation = FREE_MODE_LOCATIONS.find((location) => location.id === selectedLevel.locationId)
        ?? FREE_MODE_LOCATIONS[0];
      const shouldShowLevelIntro = Array.isArray(selectedLevel.introDialoguePages)
        && selectedLevel.introDialoguePages.length > 0;

      mainScene.startNewGame(
        selectedLocation,
        {
          id: selectedLevel.id,
          label: selectedLevel.label,
          startingBank: selectedLevel.startingBank
        },
        shouldShowLevelIntro,
        {
          gymName,
          gymMainColor,
          startingBank: selectedLevel.startingBank,
          startingMembers: selectedLevel.startingMembers,
          campaignConfig: selectedLevel
        }
      );

      sceneManager.setActive(SCENE_IDS.MAIN);
    }
  })
);
sceneManager.register(
  SCENE_IDS.LOCATION,
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
      sceneManager.setActive(SCENE_IDS.MAIN);
    }
  })
);
sceneManager.register(
  SCENE_IDS.TITLE,
  new TitleScene({
    ui,
    onStartCampaign: () => sceneManager.setActive(SCENE_IDS.CAMPAIGN),
    onStartFreeMode: () => sceneManager.setActive(SCENE_IDS.LOCATION)
  })
);
sceneManager.setActive(SCENE_IDS.TITLE);

const game = new Game({
  canvas,
  input,
  sceneManager,
  background: '#10131a'
});

game.start();
