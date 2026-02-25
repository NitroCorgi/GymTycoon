import { checkInLockerMethods } from './people/checkInLockerMethods.js';
import { exitAndShowerMethods } from './people/exitAndShowerMethods.js';
import { itemCatalogMethods } from './people/itemCatalogMethods.js';
import { lifecycleMethods } from './people/lifecycleMethods.js';
import { movementMethods } from './people/movementMethods.js';
import { queueMethods } from './people/queueMethods.js';
import { trainingMethods } from './people/trainingMethods.js';

/**
 * Public people behavior API mixed into MainScene.prototype.
 *
 * Keeping this export stable allows internals to be modular without
 * changing the existing MainScene integration points.
 */
export const peopleMethods = {
  ...lifecycleMethods,
  ...checkInLockerMethods,
  ...trainingMethods,
  ...queueMethods,
  ...exitAndShowerMethods,
  ...itemCatalogMethods,
  ...movementMethods
};
