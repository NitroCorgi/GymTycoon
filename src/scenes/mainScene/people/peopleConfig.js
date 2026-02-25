/**
 * Shared configuration constants for MainScene people behavior.
 *
 * Keep gameplay tuning values here to avoid magic numbers in method modules.
 */
export const PEOPLE_CONFIG = {
  queue: {
    longQueueThreshold: 2,
    timeoutSeconds: 30
  },
  trainingPlan: {
    maxAttemptsBeforeSkip: 3
  },
  deviceHealth: {
    brokenDeviceRatioWarningThreshold: 0.1
  },
  satisfaction: {
    checkInLongQueuePenalty: -2,
    lockerAvailabilityBonus: 10,
    trainingDeviceAssignedBonus: 10,
    trainingNoDevicePenalty: -15,
    trainingLongQueuePenalty: -10,
    trainingCompleteBonus: 5,
    trainingDeviceBrokePenalty: -15,
    noShowerPenalty: -25,
    showerCompletedBonus: 25
  }
};
