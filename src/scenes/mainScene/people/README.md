# People Subsystem

This folder modularizes person behavior previously stored in one large file.

## File responsibilities

- `lifecycleMethods.js`: central state progression and entry initialization.
- `checkInLockerMethods.js`: check-in/locker occupancy and changing flow.
- `trainingMethods.js`: training plan, device assignment, training completion.
- `queueMethods.js`: queue movement and queue timeout interactions.
- `itemCatalogMethods.js`: reusable item filtering, capacity, and maintenance helpers.
- `movementMethods.js`: tile movement and exterior path transitions.
- `exitAndShowerMethods.js`: shower, exit traversal, and subscription conversion.
- `peopleConfig.js`: shared gameplay tuning constants (queue thresholds, attempts, satisfaction deltas).

## Maintenance notes

- Methods are plain object methods and rely on `this` being the `MainScene` instance.
- Keep method names stable to preserve compatibility with `Object.assign(MainScene.prototype, peopleMethods, ...)`.
- Add new behavior in the most specific module; avoid cross-cutting utility duplication.
