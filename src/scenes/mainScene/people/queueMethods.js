import { ITEM_CATALOG } from '../../mainSceneConfig.js';
import { PEOPLE_CONFIG } from './peopleConfig.js';

/**
 * Queue positioning and queue progression for check-in and training devices.
 */
export const queueMethods = {
  updateQueuedPerson(person, deltaSeconds, mapLayout) {
    const item = this.items.find((entry) => entry.id === person.queuedItemId);
    if (!item || this.isItemBroken(item)) {
      this.removeFromCurrentQueue(person);
      person.targetItemId = null;
      person.queuedItemId = null;
      person.queueSeconds = 0;

      this.handleTrainingPlanAttemptFailure(person);

      if (!this.assignDeviceToPerson(person, null, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    person.queueSeconds += deltaSeconds;
    if (person.queueSeconds > PEOPLE_CONFIG.queue.timeoutSeconds) {
      this.handleQueueTimeout(person, mapLayout);
      return;
    }

    const freeTarget = this.findFreeDeviceByKey(person.destinationItemKey);
    if (freeTarget) {
      this.removeFromCurrentQueue(person);

      person.targetItemId = freeTarget.id;
      person.queuedItemId = null;
      person.queueSeconds = 0;
      person.state = 'to-device';

      const freePos = this.getDeviceAnchor(freeTarget, mapLayout);
      person.targetX = freePos.x;
      person.targetY = freePos.y;
      return;
    }

    this.updateQueuedTargetPosition(person, item, mapLayout);
    this.movePersonToTarget(person, deltaSeconds);

    const isFirstInQueue = item.queue[0] === person.id;
    if (isFirstInQueue && item.occupiedByPersonId === null) {
      item.queue.shift();
      person.queuedItemId = null;
      person.queueSeconds = 0;

      const devicePos = this.getDeviceAnchor(item, mapLayout);
      person.state = 'to-device';
      person.targetItemId = item.id;
      person.targetX = devicePos.x;
      person.targetY = devicePos.y;
    }
  },

  updateQueuedCheckInPerson(person, deltaSeconds, mapLayout) {
    const item = this.items.find((entry) => entry.id === person.queuedItemId);
    if (!item || ITEM_CATALOG[item.key].type !== 'check-in') {
      this.removeFromCurrentQueue(person);
      person.queuedItemId = null;
      person.queueSeconds = 0;

      if (!this.assignCheckInToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    person.queueSeconds += deltaSeconds;
    this.updateQueuedTargetPosition(person, item, mapLayout);
    this.movePersonToTarget(person, deltaSeconds);

    const isFirstInQueue = item.queue[0] === person.id;
    if (isFirstInQueue && item.occupiedByPersonId === null) {
      item.queue.shift();
      person.queuedItemId = null;
      person.queueSeconds = 0;

      const checkInPos = this.getDeviceAnchor(item, mapLayout);
      person.state = 'to-check-in';
      person.targetItemId = item.id;
      person.targetX = checkInPos.x;
      person.targetY = checkInPos.y;
    }
  },

  updateQueuedTargetPosition(person, item, mapLayout) {
    const queueIndex = Math.max(0, item.queue.indexOf(person.id));
    const center = this.tileToScreen(item.row, item.col, mapLayout);

    person.targetX = center.x - (queueIndex + 1) * (mapLayout.tileWidth * 0.2);
    person.targetY = center.y + (queueIndex + 1) * (mapLayout.tileHeight * 0.28);
  },

  removeFromCurrentQueue(person) {
    if (!person.queuedItemId) return;

    const queuedItem = this.items.find((entry) => entry.id === person.queuedItemId);
    if (!queuedItem) return;

    queuedItem.queue = queuedItem.queue.filter((personId) => personId !== person.id);
  }
};
