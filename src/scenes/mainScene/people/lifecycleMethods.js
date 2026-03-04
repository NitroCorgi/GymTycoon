import { CUSTOMER_TYPES, ITEM_CATALOG } from '../../mainSceneConfig.js';

/**
 * High-level lifecycle methods that advance person states
 * and initialize person context after gym entry.
 */
export const lifecycleMethods = {
  updatePeople(deltaSeconds, mapLayout) {
    for (const person of this.people) {
      if (this.hasMoreThanTenPercentBrokenDevices()) {
        person.thoughtBrokenDevices = true;
      }

      if (person.state === 'showering') {
        person.trainingRemaining = Math.max(0, person.trainingRemaining - deltaSeconds);
        if (person.trainingRemaining === 0) {
          this.finishShowering(person, mapLayout);
        }
        continue;
      }

      if (person.state === 'using-vending') {
        person.trainingRemaining = Math.max(0, person.trainingRemaining - deltaSeconds);
        if (person.trainingRemaining === 0) {
          this.finishVendingVisit(person, mapLayout);
        }
        continue;
      }

      if (person.state === 'changing-in' || person.state === 'changing-out') {
        person.trainingRemaining = Math.max(0, person.trainingRemaining - deltaSeconds);
        if (person.trainingRemaining === 0) {
          if (person.state === 'changing-in') {
            this.finishLockerChangeIn(person, mapLayout);
          } else {
            this.finishLockerChangeOut(person, mapLayout);
          }
        }
        continue;
      }

      if (person.state === 'checking-in') {
        person.trainingRemaining = Math.max(0, person.trainingRemaining - deltaSeconds);
        if (person.trainingRemaining === 0) {
          this.finishCheckIn(person, mapLayout);
        }
        continue;
      }

      if (person.state === 'training') {
        person.trainingRemaining = Math.max(0, person.trainingRemaining - deltaSeconds);
        if (person.trainingRemaining === 0) {
          this.finishTraining(person, mapLayout);
        }
        continue;
      }

      if (person.state === 'queued-check-in') {
        this.updateQueuedCheckInPerson(person, deltaSeconds, mapLayout);
        continue;
      }

      if (person.state === 'queued') {
        this.updateQueuedPerson(person, deltaSeconds, mapLayout);
        continue;
      }

      const arrived = this.movePersonToTarget(person, deltaSeconds);
      if (!arrived) {
        continue;
      }

      if (person.state === 'entering') {
        this.handleEnteredGym(person, mapLayout);
        continue;
      }

      if (person.state === 'to-street') {
        this.handleReachedStreet(person, mapLayout);
        continue;
      }

      if (person.state === 'street-to-entrance') {
        this.handleReachedStreetEntranceRow(person, mapLayout);
        continue;
      }

      if (person.state === 'to-entrance-sidewalk') {
        this.handleReachedEntranceSidewalk(person, mapLayout);
        continue;
      }

      if (person.state === 'leaving-door') {
        this.handleReachedExitDoor(person, mapLayout);
        continue;
      }

      if (person.state === 'leaving-cross-street') {
        this.handleReachedLeavingStreet(person, mapLayout);
        continue;
      }

      if (person.state === 'leaving-far-sidewalk') {
        this.handleReachedLeavingFarSidewalk(person, mapLayout);
        continue;
      }

      if (person.state === 'street-passing') {
        person.state = 'remove';
        continue;
      }

      if (person.state === 'sidewalk-passing') {
        person.state = 'remove';
        continue;
      }

      if (person.state === 'to-check-in') {
        this.tryStartCheckIn(person, mapLayout);
        continue;
      }

      if (person.state === 'to-locker-in') {
        this.tryStartLockerChangeIn(person, mapLayout);
        continue;
      }

      if (person.state === 'to-locker-out') {
        this.tryStartLockerChangeOut(person, mapLayout);
        continue;
      }

      if (person.state === 'to-shower') {
        this.tryStartShowering(person, mapLayout);
        continue;
      }

      if (person.state === 'to-vending') {
        this.tryStartVendingVisit(person, mapLayout);
        continue;
      }

      if (person.state === 'to-device') {
        this.tryStartTraining(person, mapLayout);
        continue;
      }

      if (person.state === 'leaving') {
        person.state = 'remove';
      }
    }

    this.people = this.people.filter((person) => person.state !== 'remove');

    if (this.selectedPersonId !== null && !this.people.some((person) => person.id === this.selectedPersonId)) {
      this.selectedPersonId = null;
    }
  },

  handleEnteredGym(person, mapLayout) {
    this.initializeVisitSatisfaction(person);
    person.canSubscribe = true;
    person.unhappy = false;

    if (this.hasAnyCheckInItems()) {
      if (!this.assignCheckInToPerson(person, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    this.assignCustomerTypeAfterEntry(person);
    person.hasCompletedCheckIn = true;

    if (!this.assignLockerToPerson(person, mapLayout)) {
      person.thoughtNoLocker = true;
      this.setSatisfaction(person, 0);
      this.sendPersonToExit(person, mapLayout);
    }
  },

  handleQueueTimeout(person, mapLayout) {
    person.unhappy = true;
    person.canSubscribe = false;

    this.sendPersonToExit(person, mapLayout);
  },

  getReturningMemberVisitChance() {
    return Math.min(0.7, this.memberProfiles.length / (this.memberProfiles.length + 12));
  },

  assignCustomerTypeAfterEntry(person) {
    if (person.customerType?.preferredType) {
      return;
    }

    if (person.isMember && person.memberId !== null) {
      const memberProfile = this.memberProfiles.find((entry) => entry.id === person.memberId);
      const memberType = CUSTOMER_TYPES.find((entry) => entry.preferredType === memberProfile?.type);
      if (memberType) {
        person.customerType = memberType;
        return;
      }
    }

    person.customerType = this.pickRandomCustomerType();
  },

  hasAnyCheckInItems() {
    return this.items.some((item) => ITEM_CATALOG[item.key].type === 'check-in');
  }
};
