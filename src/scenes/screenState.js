const SCREEN_KEYS = ['title', 'campaign', 'campaignVictory', 'location', 'gameOver'];

const SCREEN_BY_KEY = {
  title: 'titleScreen',
  campaign: 'campaignScreen',
  campaignVictory: 'campaignVictoryScreen',
  location: 'locationScreen',
  gameOver: 'gameOverScreen'
};

export function showOnlyScreen(ui, screenKey, { titleMode = true } = {}) {
  if (!ui) return;

  ui.root?.classList.toggle('is-title-screen', titleMode);

  for (const key of SCREEN_KEYS) {
    const prop = SCREEN_BY_KEY[key];
    ui[prop]?.classList.toggle('is-open', key === screenKey);
  }
}

export function hideAllScreens(ui, { titleMode = false } = {}) {
  if (!ui) return;

  ui.root?.classList.toggle('is-title-screen', titleMode);

  for (const key of SCREEN_KEYS) {
    const prop = SCREEN_BY_KEY[key];
    ui[prop]?.classList.remove('is-open');
  }
}
