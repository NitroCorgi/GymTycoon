import { getItemUsageSeconds, ITEM_CATALOG } from '../../mainSceneConfig.js';
import { PEOPLE_CONFIG } from './peopleConfig.js';

/**
 * Owns training plan generation, device assignment, and training execution.
 */
export const trainingMethods = {
  getTrainingExerciseKeys() {
    return Object.entries(ITEM_CATALOG)
      .filter(
        ([, item]) =>
          item.type !== 'check-in' &&
          item.type !== 'locker' &&
          item.type !== 'shower' &&
          item.type !== 'facility' &&
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

    if (attempts < PEOPLE_CONFIG.trainingPlan.maxAttemptsBeforeSkip && hasOtherOpenItems) {
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

    if (this.tryAssignVendingVisit(person, mapLayout, 'post-workout')) {
      return true;
    }

    return this.routePersonAfterWorkout(person, mapLayout);
  },

  routePersonAfterWorkout(person, mapLayout) {
    if (person.plansShower) {
      if (this.assignShowerToPerson(person, mapLayout)) {
        return true;
      }

      const hasAnyShower = this.items.some((item) => ITEM_CATALOG[item.key].type === 'shower');
      if (!hasAnyShower) {
        person.thoughtNoShower = true;
      }

      this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.noShowerPenalty);
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

        this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.trainingDeviceAssignedBonus);

        const devicePos = this.getDeviceAnchor(freeTarget, mapLayout);
        person.state = 'to-device';
        person.targetX = devicePos.x;
        person.targetY = devicePos.y;
        return true;
      }

      const queuedTarget = this.findBestQueuedDeviceByKey(destinationItemKey);
      if (!queuedTarget) {
        this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.trainingNoDevicePenalty);
        this.handleTrainingPlanAttemptFailure(person);
        continue;
      }

      person.targetItemId = queuedTarget.id;

      if (!queuedTarget.queue.includes(person.id)) {
        queuedTarget.queue.push(person.id);
      }

      if (queuedTarget.queue.length > PEOPLE_CONFIG.queue.longQueueThreshold) {
        person.thoughtLongQueue = true;
        this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.trainingLongQueuePenalty);
      }

      person.queuedItemId = queuedTarget.id;
      person.queueSeconds = 0;
      person.state = 'queued';
      this.updateQueuedTargetPosition(person, queuedTarget, mapLayout);
      return true;
    }
  },

  getTrainingDurationSeconds(person, item) {
    const itemType = ITEM_CATALOG[item.key]?.type;
    const baseTrainingSeconds = getItemUsageSeconds(item.key) * 0.5;
    const isPreferredType = person.customerType?.preferredType === itemType;
    const preferredDuration = isPreferredType ? baseTrainingSeconds * 2 : baseTrainingSeconds;
    return preferredDuration * this.getWorkoutDurationMultiplier();
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
    person.trainingRemaining = this.getTrainingDurationSeconds(person, item);
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
      this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.trainingDeviceBrokePenalty);
    } else {
      this.addSatisfaction(person, PEOPLE_CONFIG.satisfaction.trainingCompleteBonus);
    }

    this.markCurrentTrainingPlanResult(person, 'completed');

    this.advanceTrainingPlan(person);

    if (this.assignDeviceToPerson(person, person.lastDeviceType, mapLayout)) {
      return;
    }

    this.sendPersonToExit(person, mapLayout);
  }
};
