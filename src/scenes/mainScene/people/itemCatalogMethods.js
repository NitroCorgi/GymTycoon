import { ITEM_CATALOG, REPAIR_SECONDS } from '../../mainSceneConfig.js';
import { PEOPLE_CONFIG } from './peopleConfig.js';

/**
 * Item querying, maintenance, and capacity helpers used by people flows.
 */
export const itemCatalogMethods = {
  isItemBroken(item) {
    return item.repairSecondsRemaining > 0;
  },

  applyMaintenanceAfterUse(item) {
    const staffReduction = this.getStaffBreakChanceReduction?.() ?? 0;
    const chance = Math.max(0, item.breakChance - staffReduction);

    item.totalUses += 1;
    if (this.shouldIncreaseDeviceBreakChance()) {
      item.breakChance = Math.min(0.96, item.breakChance + 0.02);
    }

    if (Math.random() < chance) {
      item.repairDurationSeconds = this.getRepairDurationSeconds?.() ?? REPAIR_SECONDS;
      item.repairSecondsRemaining = item.repairDurationSeconds;
      item.occupiedByPersonId = null;
    }
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
              ITEM_CATALOG[item.key].type !== 'shower' &&
              ITEM_CATALOG[item.key].type !== 'facility'
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
              ITEM_CATALOG[item.key].type !== 'shower' &&
              ITEM_CATALOG[item.key].type !== 'facility'
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

  findFreeVendingMachine() {
    const freeVendingMachines = this.items.filter(
      (item) =>
        item.key === 'vendingMachine' &&
        !this.isItemBroken(item) &&
        item.occupiedByPersonId === null &&
        (item.vendingStock ?? 0) > 0
    );
    if (freeVendingMachines.length === 0) return null;

    return freeVendingMachines[Math.floor(Math.random() * freeVendingMachines.length)];
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
      return type !== 'check-in' && type !== 'locker' && type !== 'shower' && type !== 'facility';
    });

    if (devices.length === 0) {
      return false;
    }

    const brokenCount = devices.filter((item) => this.isItemBroken(item)).length;
    return brokenCount / devices.length > PEOPLE_CONFIG.deviceHealth.brokenDeviceRatioWarningThreshold;
  }
};
