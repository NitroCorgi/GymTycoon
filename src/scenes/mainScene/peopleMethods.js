import {
  CUSTOMER_TYPES,
  getItemUsageSeconds,
  ITEM_CATALOG,
  REPAIR_SECONDS
} from '../mainSceneConfig.js';

export const peopleMethods = {
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

  hasAnyCheckInItems() {
    return this.items.some((item) => ITEM_CATALOG[item.key].type === 'check-in');
  },

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

    if (queuedCheckIn.queue.length > 2) {
      person.thoughtLongQueue = true;
      this.addSatisfaction(person, -2);
    }

    person.queuedItemId = queuedCheckIn.id;
    person.queueSeconds = 0;
    person.state = 'queued-check-in';
    this.updateQueuedTargetPosition(person, queuedCheckIn, mapLayout);
    return true;
  },

  getTrainingExerciseKeys() {
    return Object.entries(ITEM_CATALOG)
      .filter(
        ([, item]) =>
          item.type !== 'check-in' &&
          item.type !== 'locker' &&
          item.type !== 'shower' &&
          item.type !== 'decor'
      )
      .map(([itemKey]) => itemKey);
  },

  createTrainingPlanForPerson() {
    const exerciseKeys = [...this.getTrainingExerciseKeys()];
    for (let index = exerciseKeys.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [exerciseKeys[index], exerciseKeys[swapIndex]] = [exerciseKeys[swapIndex], exerciseKeys[index]];
    }

    const desiredCount = this.randomIntInclusive(3, 5);
    const planCount = Math.min(desiredCount, exerciseKeys.length);
    return exerciseKeys.slice(0, planCount);
  },

  initializeTrainingPlan(person) {
    person.trainingPlan = this.createTrainingPlanForPerson();
    person.trainingPlanIndex = 0;
    person.trainingPlanResults = person.trainingPlan.map(() => 'pending');
    person.trainingPlanAttemptCounts = person.trainingPlan.map(() => 0);
    const firstExerciseKey = person.trainingPlan[0] ?? null;
    person.destinationItemKey = firstExerciseKey;
    person.destinationType = firstExerciseKey ? ITEM_CATALOG[firstExerciseKey]?.type ?? null : null;
  },

  hasOtherOpenTrainingPlanItems(person) {
    if (!Array.isArray(person.trainingPlanResults)) {
      return false;
    }

    return person.trainingPlanResults.some(
      (result, index) => index !== person.trainingPlanIndex && result === 'pending'
    );
  },

  incrementCurrentTrainingPlanAttempts(person) {
    if (!Array.isArray(person.trainingPlanAttemptCounts)) {
      person.trainingPlanAttemptCounts = person.trainingPlan.map(() => 0);
    }

    if (person.trainingPlanIndex < 0 || person.trainingPlanIndex >= person.trainingPlan.length) {
      return 0;
    }

    const previousAttempts = person.trainingPlanAttemptCounts[person.trainingPlanIndex] ?? 0;
    const nextAttempts = previousAttempts + 1;
    person.trainingPlanAttemptCounts[person.trainingPlanIndex] = nextAttempts;
    return nextAttempts;
  },

  moveCurrentTrainingPlanItemToEnd(person) {
    if (person.trainingPlanIndex < 0 || person.trainingPlanIndex >= person.trainingPlan.length) {
      return;
    }

    const [exerciseKey] = person.trainingPlan.splice(person.trainingPlanIndex, 1);
    const [result] = person.trainingPlanResults.splice(person.trainingPlanIndex, 1);

    const attemptsArray = Array.isArray(person.trainingPlanAttemptCounts)
      ? person.trainingPlanAttemptCounts
      : person.trainingPlan.map(() => 0);
    const [attemptCount] = attemptsArray.splice(person.trainingPlanIndex, 1);
    person.trainingPlanAttemptCounts = attemptsArray;

    person.trainingPlan.push(exerciseKey);
    person.trainingPlanResults.push(result ?? 'pending');
    person.trainingPlanAttemptCounts.push(attemptCount ?? 0);
  },

  handleTrainingPlanAttemptFailure(person) {
    const attempts = this.incrementCurrentTrainingPlanAttempts(person);
    const hasOtherOpenItems = this.hasOtherOpenTrainingPlanItems(person);

    if (attempts < 3 && hasOtherOpenItems) {
      this.moveCurrentTrainingPlanItemToEnd(person);
      const nextExerciseKey = this.getCurrentTrainingPlanType(person);
      person.destinationItemKey = nextExerciseKey;
      person.destinationType = nextExerciseKey ? ITEM_CATALOG[nextExerciseKey]?.type ?? null : null;
      return;
    }

    this.markCurrentTrainingPlanResult(person, 'skipped');
    this.advanceTrainingPlan(person);
  },

  markCurrentTrainingPlanResult(person, result) {
    if (!Array.isArray(person.trainingPlanResults)) {
      person.trainingPlanResults = [];
    }

    if (person.trainingPlanIndex < 0 || person.trainingPlanIndex >= person.trainingPlan.length) {
      return;
    }

    person.trainingPlanResults[person.trainingPlanIndex] = result;
  },

  getCurrentTrainingPlanType(person) {
    if (!Array.isArray(person.trainingPlan)) {
      return null;
    }

    if (person.trainingPlanIndex < 0 || person.trainingPlanIndex >= person.trainingPlan.length) {
      return null;
    }

    return person.trainingPlan[person.trainingPlanIndex] ?? null;
  },

  advanceTrainingPlan(person) {
    person.trainingPlanIndex += 1;
    const nextExerciseKey = this.getCurrentTrainingPlanType(person);
    person.destinationItemKey = nextExerciseKey;
    person.destinationType = nextExerciseKey ? ITEM_CATALOG[nextExerciseKey]?.type ?? null : null;
  },

  handleCompletedTrainingPlan(person, mapLayout) {
    person.destinationType = null;
    person.destinationItemKey = null;
    person.showLeaveSatisfaction = true;

    if (person.plansShower) {
      if (this.assignShowerToPerson(person, mapLayout)) {
        return true;
      }

      const hasAnyShower = this.items.some((item) => ITEM_CATALOG[item.key].type === 'shower');
      if (!hasAnyShower) {
        person.thoughtNoShower = true;
      }

      this.addSatisfaction(person, -25);
    }

    this.sendPersonToExit(person, mapLayout);
    return false;
  },

  assignDeviceToPerson(person, _excludeType, mapLayout) {
    if (this.items.length === 0) {
      return false;
    }

    while (true) {
      const destinationItemKey = this.getCurrentTrainingPlanType(person);
      if (!destinationItemKey) {
        return this.handleCompletedTrainingPlan(person, mapLayout);
      }

      const destinationType = ITEM_CATALOG[destinationItemKey]?.type;
      if (!destinationType) {
        this.handleTrainingPlanAttemptFailure(person);
        continue;
      }

      person.destinationItemKey = destinationItemKey;
      person.destinationType = destinationType;

      const freeTarget = this.findFreeDeviceByKey(destinationItemKey);
      if (freeTarget) {
        person.targetItemId = freeTarget.id;
        person.queuedItemId = null;

        this.addSatisfaction(person, 10);

        const devicePos = this.getDeviceAnchor(freeTarget, mapLayout);
        person.state = 'to-device';
        person.targetX = devicePos.x;
        person.targetY = devicePos.y;
        return true;
      }

      const queuedTarget = this.findBestQueuedDeviceByKey(destinationItemKey);
      if (!queuedTarget) {
        this.setSatisfaction(person, 0);
        this.handleTrainingPlanAttemptFailure(person);
        continue;
      }

      person.targetItemId = queuedTarget.id;

      if (!queuedTarget.queue.includes(person.id)) {
        queuedTarget.queue.push(person.id);
      }

      if (queuedTarget.queue.length > 2) {
        person.thoughtLongQueue = true;
        this.addSatisfaction(person, -10);
      }

      person.queuedItemId = queuedTarget.id;
      person.queueSeconds = 0;
      person.state = 'queued';
      this.updateQueuedTargetPosition(person, queuedTarget, mapLayout);
      return true;
    }
  },

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
    if (person.queueSeconds > 30) {
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
      this.addSatisfaction(person, 10);
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
  },

  updateQueuedTargetPosition(person, item, mapLayout) {
    const queueIndex = Math.max(0, item.queue.indexOf(person.id));
    const center = this.tileToScreen(item.row, item.col, mapLayout);

    person.targetX = center.x - (queueIndex + 1) * (mapLayout.tileWidth * 0.2);
    person.targetY = center.y + (queueIndex + 1) * (mapLayout.tileHeight * 0.28);
  },

  tryStartTraining(person, mapLayout) {
    const item = this.items.find((entry) => entry.id === person.targetItemId);
    if (!item) {
      person.targetItemId = null;
      this.handleTrainingPlanAttemptFailure(person);
      if (!this.assignDeviceToPerson(person, null, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    if (this.isItemBroken(item)) {
      person.targetItemId = null;
      this.handleTrainingPlanAttemptFailure(person);
      if (!this.assignDeviceToPerson(person, null, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    if (item.occupiedByPersonId !== null) {
      if (!this.assignDeviceToPerson(person, null, mapLayout)) {
        this.sendPersonToExit(person, mapLayout);
      }
      return;
    }

    item.occupiedByPersonId = person.id;
    person.queueSeconds = 0;
    const itemType = ITEM_CATALOG[item.key].type;
    person.trainingRemaining = getItemUsageSeconds(item.key);
    person.activityDuration = person.trainingRemaining;
    person.state = 'training';
    person.lastDeviceType = itemType;

    const anchor = this.getDeviceAnchor(item, mapLayout);
    person.x = anchor.x;
    person.y = anchor.y;
  },

  finishTraining(person, mapLayout) {
    const currentItem = this.items.find((entry) => entry.id === person.targetItemId);
    let deviceBroke = false;

    if (currentItem?.occupiedByPersonId === person.id) {
      currentItem.occupiedByPersonId = null;
      this.applyMaintenanceAfterUse(currentItem);
      deviceBroke = this.isItemBroken(currentItem);
    }

    if (deviceBroke) {
      this.addSatisfaction(person, -15);
    } else {
      this.addSatisfaction(person, 5);
    }

    this.markCurrentTrainingPlanResult(person, 'completed');

    this.advanceTrainingPlan(person);

    if (this.assignDeviceToPerson(person, person.lastDeviceType, mapLayout)) {
      return;
    }

    this.sendPersonToExit(person, mapLayout);
  },

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

    this.addSatisfaction(person, 25);

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
  },

  handleQueueTimeout(person, mapLayout) {
    person.unhappy = true;
    person.canSubscribe = false;

    this.sendPersonToExit(person, mapLayout);
  },

  getReturningMemberVisitChance() {
    return Math.min(0.7, this.memberProfiles.length / (this.memberProfiles.length + 12));
  },

  isItemBroken(item) {
    return item.repairSecondsRemaining > 0;
  },

  applyMaintenanceAfterUse(item) {
    const chance = item.breakChance;

    item.totalUses += 1;
    item.breakChance = Math.min(0.96, item.breakChance + 0.02);

    if (Math.random() < chance) {
      item.repairSecondsRemaining = REPAIR_SECONDS;
      item.occupiedByPersonId = null;
    }
  },

  removeFromCurrentQueue(person) {
    if (!person.queuedItemId) return;

    const queuedItem = this.items.find((entry) => entry.id === person.queuedItemId);
    if (!queuedItem) return;

    queuedItem.queue = queuedItem.queue.filter((personId) => personId !== person.id);
  },

  pickDestinationType(excludeType) {
    const availableTypes = [
      ...new Set(
        this.items
          .filter(
            (item) =>
              !this.isItemBroken(item) &&
              ITEM_CATALOG[item.key].type !== 'check-in' &&
              ITEM_CATALOG[item.key].type !== 'locker' &&
              ITEM_CATALOG[item.key].type !== 'shower'
          )
          .map((item) => ITEM_CATALOG[item.key].type)
      )
    ];
    const filtered = excludeType ? availableTypes.filter((type) => type !== excludeType) : availableTypes;
    const pool = filtered.length > 0 ? filtered : availableTypes;
    if (pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)];
  },

  pickDestinationTypeForPerson(person, excludeType) {
    const preferredType = person.customerType?.preferredType ?? null;
    const availableTypes = [
      ...new Set(
        this.items
          .filter(
            (item) =>
              !this.isItemBroken(item) &&
              ITEM_CATALOG[item.key].type !== 'check-in' &&
              ITEM_CATALOG[item.key].type !== 'locker' &&
              ITEM_CATALOG[item.key].type !== 'shower'
          )
          .map((item) => ITEM_CATALOG[item.key].type)
      )
    ];

    const preferredAllowed = preferredType && preferredType !== excludeType && availableTypes.includes(preferredType);
    if (preferredAllowed) {
      return preferredType;
    }

    return this.pickDestinationType(excludeType);
  },

  findFreeDeviceByKey(itemKey) {
    if (!itemKey) return null;

    const freeDevices = this.items.filter(
      (item) =>
        item.key === itemKey && !this.isItemBroken(item) && item.occupiedByPersonId === null && item.queue.length === 0
    );
    if (freeDevices.length === 0) return null;

    return freeDevices[Math.floor(Math.random() * freeDevices.length)];
  },

  findBestQueuedDeviceByKey(itemKey) {
    if (!itemKey) return null;

    const matchingDevices = this.items.filter((item) => item.key === itemKey && !this.isItemBroken(item));
    if (matchingDevices.length === 0) return null;

    return matchingDevices.reduce((best, current) => {
      if (!best) return current;
      if (current.queue.length < best.queue.length) return current;
      if (current.queue.length === best.queue.length && current.occupiedByPersonId === null) return current;
      return best;
    }, null);
  },

  findFreeDeviceByType(deviceType) {
    if (!deviceType) return null;

    const freeDevices = this.items.filter(
      (item) =>
        ITEM_CATALOG[item.key].type === deviceType &&
        !this.isItemBroken(item) &&
        item.occupiedByPersonId === null &&
        item.queue.length === 0
    );
    if (freeDevices.length === 0) return null;

    return freeDevices[Math.floor(Math.random() * freeDevices.length)];
  },

  findBestQueuedDeviceByType(deviceType) {
    if (!deviceType) return null;

    const sameTypeDevices = this.items.filter(
      (item) => ITEM_CATALOG[item.key].type === deviceType && !this.isItemBroken(item)
    );
    if (sameTypeDevices.length === 0) return null;

    return sameTypeDevices.reduce((best, current) => {
      if (!best) return current;
      return current.queue.length < best.queue.length ? current : best;
    }, null);
  },

  findFreeCheckInItem() {
    const freeItems = this.items.filter(
      (item) => ITEM_CATALOG[item.key].type === 'check-in' && item.occupiedByPersonId === null && item.queue.length === 0
    );
    if (freeItems.length === 0) return null;

    return freeItems[Math.floor(Math.random() * freeItems.length)];
  },

  findBestQueuedCheckInItem() {
    const checkInItems = this.items.filter((item) => ITEM_CATALOG[item.key].type === 'check-in');
    if (checkInItems.length === 0) return null;

    return checkInItems.reduce((best, current) => {
      if (!best) return current;
      return current.queue.length < best.queue.length ? current : best;
    }, null);
  },

  findFreeShowerItem() {
    const freeShowers = this.items.filter(
      (item) => ITEM_CATALOG[item.key].type === 'shower' && item.occupiedByPersonId === null
    );
    if (freeShowers.length === 0) return null;

    return freeShowers[Math.floor(Math.random() * freeShowers.length)];
  },

  findLockerWithFreeSlot() {
    const lockerItems = this.items.filter((item) => ITEM_CATALOG[item.key].type === 'locker');
    if (lockerItems.length === 0) return null;

    return (
      lockerItems
        .filter((item) => this.getLockerOccupancy(item) < this.getLockerCapacity(item))
        .sort((left, right) => {
          const leftFree = this.getLockerCapacity(left) - this.getLockerOccupancy(left);
          const rightFree = this.getLockerCapacity(right) - this.getLockerOccupancy(right);
          return rightFree - leftFree;
        })[0] ?? null
    );
  },

  getLockerCapacity(item) {
    return ITEM_CATALOG[item.key].lockerCapacity ?? 0;
  },

  getLockerOccupancy(item) {
    return item.lockerOccupants?.length ?? 0;
  },

  getTotalLockerCapacity() {
    return this.items.reduce((sum, item) => {
      if (ITEM_CATALOG[item.key].type !== 'locker') return sum;
      return sum + this.getLockerCapacity(item);
    }, 0);
  },

  getUsedLockerCapacity() {
    return this.items.reduce((sum, item) => {
      if (ITEM_CATALOG[item.key].type !== 'locker') return sum;
      return sum + this.getLockerOccupancy(item);
    }, 0);
  },

  getFreeLockerCapacity() {
    return Math.max(0, this.getTotalLockerCapacity() - this.getUsedLockerCapacity());
  },

  hasMoreThanTenPercentBrokenDevices() {
    const devices = this.items.filter((item) => {
      const type = ITEM_CATALOG[item.key].type;
      return type !== 'check-in' && type !== 'locker' && type !== 'shower';
    });

    if (devices.length === 0) {
      return false;
    }

    const brokenCount = devices.filter((item) => this.isItemBroken(item)).length;
    return brokenCount / devices.length > 0.1;
  },

  movePersonToTarget(person, deltaSeconds) {
    const dx = person.targetX - person.x;
    const dy = person.targetY - person.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.1) {
      person.x = person.targetX;
      person.y = person.targetY;
      return true;
    }

    const moveDistance = person.speed * deltaSeconds;
    if (moveDistance >= distance) {
      person.x = person.targetX;
      person.y = person.targetY;
      return true;
    }

    person.x += (dx / distance) * moveDistance;
    person.y += (dy / distance) * moveDistance;
    return false;
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

  handleReachedStreet(person, mapLayout) {
    const streetOutsideDistance = person.streetOutsideDistance ?? this.getStreetCenterOutsideDistance() ?? 1;
    const targetRow = person.wantsToEnterGym ? this.entranceTile.row : person.passThroughRow;
    const targetPoint = this.getExteriorTileCenter(targetRow, streetOutsideDistance, mapLayout);

    person.state = person.wantsToEnterGym ? 'street-to-entrance' : 'street-passing';
    person.targetX = targetPoint.x;
    person.targetY = targetPoint.y;
  },

  handleReachedStreetEntranceRow(person, mapLayout) {
    const nearSidewalkOutsideDistance =
      person.nearSidewalkOutsideDistance ?? this.getNearSidewalkOutsideDistance() ?? 1;
    const sidewalkPoint = this.getExteriorTileCenter(this.entranceTile.row, nearSidewalkOutsideDistance, mapLayout);

    person.state = 'to-entrance-sidewalk';
    person.targetX = sidewalkPoint.x;
    person.targetY = sidewalkPoint.y;
  },

  handleReachedEntranceSidewalk(person, mapLayout) {
    const entryPoints = this.getEntrancePoints(mapLayout);

    person.state = 'entering';
    person.targetX = entryPoints.inside.x;
    person.targetY = entryPoints.inside.y;
  },

  handleReachedExitDoor(person, mapLayout) {
    const streetOutsideDistance = this.getStreetCenterOutsideDistance() ?? 1;
    const streetPoint = this.getExteriorTileCenter(this.entranceTile.row, streetOutsideDistance, mapLayout);

    person.state = 'leaving-cross-street';
    person.targetX = streetPoint.x;
    person.targetY = streetPoint.y;
  },

  handleReachedLeavingStreet(person, mapLayout) {
    const farSidewalkOutsideDistance = this.getFarSidewalkOutsideDistance() ?? this.getNearSidewalkOutsideDistance() ?? 1;
    const farSidewalkPoint = this.getExteriorTileCenter(this.entranceTile.row, farSidewalkOutsideDistance, mapLayout);

    person.state = 'leaving-far-sidewalk';
    person.targetX = farSidewalkPoint.x;
    person.targetY = farSidewalkPoint.y;
  },

  handleReachedLeavingFarSidewalk(person, mapLayout) {
    const farSidewalkOutsideDistance = this.getFarSidewalkOutsideDistance() ?? this.getNearSidewalkOutsideDistance() ?? 1;
    const { startRow, endRow } = this.getExteriorTraversalRowBounds();
    const exitRow = Number.isFinite(person.exitSidewalkEdgeRow)
      ? person.exitSidewalkEdgeRow
      : (Math.random() < 0.5 ? startRow : endRow);
    const exitPoint = this.getExteriorTileCenter(exitRow, farSidewalkOutsideDistance, mapLayout);

    person.state = 'leaving';
    person.targetX = exitPoint.x;
    person.targetY = exitPoint.y;
  }
};
