/**
 * Movement helpers and exterior traversal state transitions.
 */
export const movementMethods = {
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
    const farSidewalkOutsideDistance =
      this.getFarSidewalkOutsideDistance() ?? this.getNearSidewalkOutsideDistance() ?? 1;
    const farSidewalkPoint = this.getExteriorTileCenter(this.entranceTile.row, farSidewalkOutsideDistance, mapLayout);

    person.state = 'leaving-far-sidewalk';
    person.targetX = farSidewalkPoint.x;
    person.targetY = farSidewalkPoint.y;
  },

  handleReachedLeavingFarSidewalk(person, mapLayout) {
    const farSidewalkOutsideDistance =
      this.getFarSidewalkOutsideDistance() ?? this.getNearSidewalkOutsideDistance() ?? 1;
    const { startRow, endRow } = this.getExteriorTraversalRowBounds();
    const exitRow = Number.isFinite(person.exitSidewalkEdgeRow)
      ? person.exitSidewalkEdgeRow
      : Math.random() < 0.5
        ? startRow
        : endRow;
    const exitPoint = this.getExteriorTileCenter(exitRow, farSidewalkOutsideDistance, mapLayout);

    person.state = 'leaving';
    person.targetX = exitPoint.x;
    person.targetY = exitPoint.y;
  }
};
