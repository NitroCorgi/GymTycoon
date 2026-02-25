import { getItemUsageSeconds, ITEM_CATALOG } from '../../mainSceneConfig.js';
import { PEOPLE_CONFIG } from './peopleConfig.js';

/**
 * Handles check-in flow and locker usage from arrival through changing.
 */
export const checkInLockerMethods = {
  assignCheckInToPerson(person, mapLayout) {
    const freeCheckIn = this.findFreeCheckInItem();
    if (freeCheckIn) {
      person.targetItemId = freeCheckIn.id;
      person.queuedItemId = null;
      person.queueSeconds = 0;
      person.state = 'to-check-in';

      const checkInPos = this.getDeviceAnchor(freeCheckIn, mapLayout);
      person.targetX = checkInPos.x;
      person.targetY = checkInPos.y;
      return true;
    }

    const queuedCheckIn = this.findBestQueuedCheckInItem();
    if (!queuedCheckIn) {
      return false;
    }

    person.targetItemId = queuedCheckIn.id;
    if (!queuedCheckIn.queue.includes(person.id)) {
      queuedCheckIn.queue.push(person.id);
    }

    if (queuedCheckIn.queue.length > PEOPLE_CONFIG.queue.longQueueThreshold) {
      person.thoughtLongQueue = true;
      this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.checkInLongQueuePenalty);
    }

    person.queuedItemId = queuedCheckIn.id;
    person.queueSeconds = 0;
    person.state = 'queued-check-in';
    this.updateQueuedTargetPosition(person, queuedCheckIn, mapLayout);
    return true;
  },

  tryStartCheckIn(person, mapLayout) {
    const item = this.items.find((entry) => entry.id === person.targetItemId);
    if (!item || ITEM_CATALOG[item.key].type !== 'check-in') {
      if (!this.assignCheckInToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    if (item.occupiedByPersonId !== null) {
      if (!this.assignCheckInToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    item.occupiedByPersonId = person.id;
    person.state = 'checking-in';
    person.queueSeconds = 0;
    person.trainingRemaining = getItemUsageSeconds(item.key);
    person.activityDuration = person.trainingRemaining;

    const anchor = this.getDeviceAnchor(item, mapLayout);
    person.x = anchor.x;
    person.y = anchor.y;
  },

  finishCheckIn(person, mapLayout) {
    const checkInItem = this.items.find((entry) => entry.id === person.targetItemId);
    if (checkInItem?.occupiedByPersonId === person.id) {
      checkInItem.occupiedByPersonId = null;
    }
    person.targetItemId = null;

    this.assignCustomerTypeAfterEntry(person);
    person.hasCompletedCheckIn = true;

    const preferredType = person.customerType?.preferredType;
    const hasPreferredDevice = preferredType
      ? this.items.some((item) => ITEM_CATALOG[item.key].type === preferredType && !this.isItemBroken(item))
      : false;
    person.canSubscribe = hasPreferredDevice;
    person.unhappy = !hasPreferredDevice;

    const lockerAssigned = this.assignLockerToPerson(person, mapLayout);
    if (!lockerAssigned) {
      this.setSatisfaction(person, 0);
      this.sendPersonToExit(person, mapLayout);
      return;
    }

    if (!person.isMember && !person.paidDailyTicket) {
      const dayTicketIncome = Math.floor(this.subscriptionFee / 2);
      this.money += dayTicketIncome;
      this.currentCycleDayTicketIncome += dayTicketIncome;
      person.paidDailyTicket = true;
    }
  },

  assignLockerToPerson(person, mapLayout) {
    const freeLocker = this.findLockerWithFreeSlot();
    if (!freeLocker) {
      person.thoughtNoLocker = true;
      this.currentCycleLockerTurnedDown += 1;
      return false;
    }

    if (this.getFreeLockerCapacity() > this.getTotalLockerCapacity() / 2) {
      this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.lockerAvailabilityBonus);
    }

    if (!freeLocker.lockerOccupants.includes(person.id)) {
      freeLocker.lockerOccupants.push(person.id);
    }

    person.assignedLockerItemId = freeLocker.id;
    person.targetItemId = freeLocker.id;
    person.state = 'to-locker-in';
    person.queueSeconds = 0;

    const lockerPos = this.getDeviceAnchor(freeLocker, mapLayout);
    person.targetX = lockerPos.x;
    person.targetY = lockerPos.y;
    return true;
  },

  tryStartLockerChangeIn(person, mapLayout) {
    const lockerItem = this.items.find((entry) => entry.id === person.assignedLockerItemId);
    if (!lockerItem || ITEM_CATALOG[lockerItem.key].type !== 'locker') {
      person.assignedLockerItemId = null;
      this.sendPersonToExit(person, mapLayout);
      return;
    }

    person.state = 'changing-in';
    person.trainingRemaining = getItemUsageSeconds(lockerItem.key);
    person.activityDuration = person.trainingRemaining;

    const anchor = this.getDeviceAnchor(lockerItem, mapLayout);
    person.x = anchor.x;
    person.y = anchor.y;
  },

  finishLockerChangeIn(person, mapLayout) {
    person.targetItemId = null;
    this.initializeTrainingPlan(person);

    if (!this.assignDeviceToPerson(person, null, mapLayout)) {
      this.sendPersonToExit(person, mapLayout);
    }
  },

  tryStartLockerChangeOut(person, mapLayout) {
    const lockerItem = this.items.find((entry) => entry.id === person.assignedLockerItemId);
    if (!lockerItem || ITEM_CATALOG[lockerItem.key].type !== 'locker') {
      person.assignedLockerItemId = null;
      this.finalizePersonExit(person, mapLayout);
      return;
    }

    person.state = 'changing-out';
    person.trainingRemaining = getItemUsageSeconds(lockerItem.key);
    person.activityDuration = person.trainingRemaining;

    const anchor = this.getDeviceAnchor(lockerItem, mapLayout);
    person.x = anchor.x;
    person.y = anchor.y;
  },

  finishLockerChangeOut(person, mapLayout) {
    const lockerItem = this.items.find((entry) => entry.id === person.assignedLockerItemId);
    if (lockerItem?.lockerOccupants) {
      lockerItem.lockerOccupants = lockerItem.lockerOccupants.filter((personId) => personId !== person.id);
    }

    person.assignedLockerItemId = null;
    this.finalizePersonExit(person, mapLayout);
  }
};
