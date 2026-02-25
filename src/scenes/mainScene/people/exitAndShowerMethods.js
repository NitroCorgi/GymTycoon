import { getItemUsageSeconds, ITEM_CATALOG } from '../../mainSceneConfig.js';
import { PEOPLE_CONFIG } from './peopleConfig.js';

/**
 * Post-workout shower handling, gym exit routing, and membership conversion.
 */
export const exitAndShowerMethods = {
  assignShowerToPerson(person, mapLayout) {
    const showerItem = this.findFreeShowerItem();
    if (!showerItem) {
      return false;
    }

    person.targetItemId = showerItem.id;
    person.state = 'to-shower';
    person.queueSeconds = 0;

    const showerPos = this.getDeviceAnchor(showerItem, mapLayout);
    person.targetX = showerPos.x;
    person.targetY = showerPos.y;
    return true;
  },

  tryStartShowering(person, mapLayout) {
    const showerItem = this.items.find((entry) => entry.id === person.targetItemId);
    if (!showerItem || ITEM_CATALOG[showerItem.key].type !== 'shower') {
      if (!this.assignShowerToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    if (showerItem.occupiedByPersonId !== null) {
      if (!this.assignShowerToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    showerItem.occupiedByPersonId = person.id;
    person.state = 'showering';
    person.trainingRemaining = getItemUsageSeconds(showerItem.key);
    person.activityDuration = person.trainingRemaining;

    const anchor = this.getDeviceAnchor(showerItem, mapLayout);
    person.x = anchor.x;
    person.y = anchor.y;
  },

  finishShowering(person, mapLayout) {
    const showerItem = this.items.find((entry) => entry.id === person.targetItemId);
    if (showerItem?.occupiedByPersonId === person.id) {
      showerItem.occupiedByPersonId = null;
    }

    this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.showerCompletedBonus);

    person.targetItemId = null;
    this.sendPersonToExit(person, mapLayout);
  },

  sendPersonToExit(person, mapLayout) {
    this.removeFromCurrentQueue(person);

    if (person.assignedLockerItemId) {
      const lockerItem = this.items.find((entry) => entry.id === person.assignedLockerItemId);
      if (lockerItem && ITEM_CATALOG[lockerItem.key].type === 'locker') {
        const lockerPos = this.getDeviceAnchor(lockerItem, mapLayout);
        person.state = 'to-locker-out';
        person.targetItemId = lockerItem.id;
        person.targetX = lockerPos.x;
        person.targetY = lockerPos.y;
        person.queuedItemId = null;
        person.queueSeconds = 0;
        person.destinationType = null;
        person.destinationItemKey = null;
        return;
      }
    }

    this.finalizePersonExit(person, mapLayout);
  },

  finalizePersonExit(person, mapLayout) {
    const entryPoints = this.getEntrancePoints(mapLayout);
    const { startRow, endRow } = this.getExteriorTraversalRowBounds();
    const exitSidewalkEdgeRow = Math.random() < 0.5 ? startRow : endRow;

    this.trySubscribePerson(person);
    this.registerVisitSatisfaction(person);

    person.state = 'leaving-door';
    person.targetX = entryPoints.inside.x;
    person.targetY = entryPoints.inside.y;
    person.exitSidewalkEdgeRow = exitSidewalkEdgeRow;
    person.targetItemId = null;
    person.queuedItemId = null;
    person.queueSeconds = 0;
    person.destinationType = null;
    person.destinationItemKey = null;
  },

  trySubscribePerson(person) {
    if (person.didConversionCheck) return;

    person.didConversionCheck = true;

    const satisfactionPercent = this.clampSatisfaction(Math.round(person.visitSatisfaction));

    if (person.isMember) {
      if (person.memberId !== null) {
        this.updateMemberProfileVisit(person.memberId, satisfactionPercent);
      }

      const cancelChancePercent = Math.max(0, 50 - satisfactionPercent);
      if (Math.random() < cancelChancePercent / 100) {
        if (person.memberId !== null && this.removeMemberProfile(person.memberId)) {
          this.currentCycleChurn += 1;
        }
        person.isMember = false;
        person.memberId = null;
      }
      return;
    }

    const subscribeChancePercent = satisfactionPercent;
    if (Math.random() < subscribeChancePercent / 100) {
      const memberProfile = this.createMemberProfile(person);
      this.currentCycleGained += 1;
      person.isMember = true;
      person.memberId = memberProfile.id;
    }
  }
};
