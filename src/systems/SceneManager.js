export class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeSceneId = null;
  }

  register(id, scene) {
    this.scenes.set(id, scene);
  }

  setActive(id) {
    if (!this.scenes.has(id)) {
      throw new Error(`Cannot activate unknown scene "${id}".`);
    }

    const previousScene = this.getActive();
    previousScene?.onExit?.();

    this.activeSceneId = id;

    const nextScene = this.getActive();
    nextScene?.onEnter?.();
  }

  getActive() {
    if (!this.activeSceneId) return null;
    return this.scenes.get(this.activeSceneId) ?? null;
  }
}
