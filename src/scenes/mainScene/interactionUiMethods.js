import { GYM_UPGRADES, ITEM_CATALOG, VENDING_MAX_STOCK, VENDING_RESTOCK_COST_PER_ITEM } from '../mainSceneConfig.js';
import { WEEKDAY_NAMES } from '../../systems/simulation/config.js';

export const interactionUiMethods = {
  pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  },

  getTopWallPolygon(col, mapLayout) {
    const wallHeight = this.getWallHeight(mapLayout);
    const topEdge = this.getTopBorderEdge(col, mapLayout);
    return [
      { x: topEdge.a.x + mapLayout.halfTileWidth, y: topEdge.a.y - mapLayout.halfTileHeight },
      { x: topEdge.b.x + mapLayout.halfTileWidth, y: topEdge.b.y - mapLayout.halfTileHeight },
      { x: topEdge.b.x + mapLayout.halfTileWidth, y: topEdge.b.y - mapLayout.halfTileHeight - wallHeight },
      { x: topEdge.a.x + mapLayout.halfTileWidth, y: topEdge.a.y - mapLayout.halfTileHeight - wallHeight }
    ];
  },

  getLeftWallPolygon(row, mapLayout) {
    const wallHeight = this.getWallHeight(mapLayout);
    const leftEdge = this.getLeftBorderEdge(row, mapLayout);
    return [
      { x: leftEdge.a.x - mapLayout.halfTileWidth, y: leftEdge.a.y - mapLayout.halfTileHeight },
      { x: leftEdge.b.x - mapLayout.halfTileWidth, y: leftEdge.b.y - mapLayout.halfTileHeight },
      { x: leftEdge.b.x - mapLayout.halfTileWidth, y: leftEdge.b.y - mapLayout.halfTileHeight - wallHeight },
      { x: leftEdge.a.x - mapLayout.halfTileWidth, y: leftEdge.a.y - mapLayout.halfTileHeight - wallHeight }
    ];
  },

  getWallSegmentAtPointer(pointer, mapLayout) {
    if (!pointer || !mapLayout) return null;

    for (let col = this.mapCols - 1; col >= 0; col -= 1) {
      if (!this.isTileAvailable(0, col)) continue;
      const polygon = this.getTopWallPolygon(col, mapLayout);
      if (this.pointInPolygon(pointer, polygon)) {
        return { side: 'top', index: col };
      }
    }

    for (let row = this.mapRows - 1; row >= 0; row -= 1) {
      if (row === this.entranceTile.row) continue;
      if (!this.isTileAvailable(row, 0)) continue;
      const polygon = this.getLeftWallPolygon(row, mapLayout);
      if (this.pointInPolygon(pointer, polygon)) {
        return { side: 'left', index: row };
      }
    }

    return null;
  },

  getWallpaperPlacementTarget() {
    if (this.hoveredWallSegment?.side === 'top') {
      if (!this.isTileAvailable(0, this.hoveredWallSegment.index)) return null;
      return { row: 0, col: this.hoveredWallSegment.index, side: 'top' };
    }

    if (this.hoveredWallSegment?.side === 'left') {
      if (!this.isTileAvailable(this.hoveredWallSegment.index, 0)) return null;
      return { row: this.hoveredWallSegment.index, col: 0, side: 'left' };
    }

    if (!this.hoveredTile) return null;

    if (this.hoveredTile.row === 0 && this.isTileAvailable(0, this.hoveredTile.col)) {
      return { row: 0, col: this.hoveredTile.col, side: 'top' };
    }

    if (
      this.hoveredTile.col === 0 &&
      this.hoveredTile.row !== this.entranceTile.row &&
      this.isTileAvailable(this.hoveredTile.row, 0)
    ) {
      return { row: this.hoveredTile.row, col: 0, side: 'left' };
    }

    return null;
  },

  getPlacementDimensions(itemKey, rotation = this.currentPlacementRotation ?? 0) {
    const itemConfig = ITEM_CATALOG[itemKey];
    const baseRows = itemConfig?.footprintRows ?? 1;
    const baseCols = itemConfig?.footprintCols ?? 1;

    if ((rotation ?? 0) % 2 === 1) {
      return { rows: baseCols, cols: baseRows };
    }

    return { rows: baseRows, cols: baseCols };
  },

  getPlacementTilesForItem(row, col, itemKey, rotation = this.currentPlacementRotation ?? 0) {
    const { rows, cols } = this.getPlacementDimensions(itemKey, rotation);
    const tiles = [];

    for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
      for (let colOffset = 0; colOffset < cols; colOffset += 1) {
        tiles.push({
          row: row + rowOffset,
          col: col + colOffset
        });
      }
    }

    return tiles;
  },

  getItemTiles(item) {
    return this.getPlacementTilesForItem(item.row, item.col, item.key, item.rotation ?? 0);
  },

  isDecorFloorItem(itemKey) {
    return ITEM_CATALOG[itemKey]?.decorTarget === 'floor';
  },

  isDecorWallItem(itemKey) {
    return ITEM_CATALOG[itemKey]?.decorTarget === 'wall';
  },

  canPlaceItemAt(row, col, itemKey, rotation = this.currentPlacementRotation ?? 0) {
    if (this.isDecorFloorItem(itemKey)) {
      return this.isTileAvailable(row, col);
    }

    if (this.isDecorWallItem(itemKey)) {
      const onTopWall = row === 0 && this.isTileAvailable(0, col);
      const onLeftWall = col === 0 && row !== this.entranceTile.row && this.isTileAvailable(row, 0);
      return onTopWall || onLeftWall;
    }

    const placementTiles = this.getPlacementTilesForItem(row, col, itemKey, rotation);

    for (const placementTile of placementTiles) {
      if (!this.isTileAvailable(placementTile.row, placementTile.col)) {
        return false;
      }

      if (this.tiles[placementTile.row][placementTile.col]) {
        return false;
      }

      if (placementTile.row === this.entranceTile.row && placementTile.col === this.entranceTile.col) {
        return false;
      }
    }

    return true;
  },

  occupyItemTiles(item) {
    for (const itemTile of this.getItemTiles(item)) {
      this.tiles[itemTile.row][itemTile.col] = item;
    }
  },

  clearItemTiles(item) {
    for (const itemTile of this.getItemTiles(item)) {
      if (!this.isTileAvailable(itemTile.row, itemTile.col)) continue;

      if (this.tiles[itemTile.row][itemTile.col]?.id === item.id) {
        this.tiles[itemTile.row][itemTile.col] = null;
      }
    }
  },

  handleMapDrag(game) {
    const pointer = game.input.getPointerPosition();
    if (game.input.wasPointerPressed()) {
      const pressedOnCanvas = this.isPointerOnCanvas(game, pointer);
      this.isDraggingMap = pressedOnCanvas;
      this.lastDragPointer = pressedOnCanvas && pointer ? { ...pointer } : null;
      this.didDragInCurrentPointer = false;
      this.consumeReleaseClick = false;
    }

    if (this.isDraggingMap && pointer && game.input.isPointerDown() && this.lastDragPointer) {
      const dragX = pointer.x - this.lastDragPointer.x;
      const dragY = pointer.y - this.lastDragPointer.y;

      if (Math.abs(dragX) > 0 || Math.abs(dragY) > 0) {
        this.mapOffsetX += dragX;
        this.mapOffsetY += dragY;

        for (const person of this.people) {
          person.x += dragX;
          person.y += dragY;
          if (typeof person.targetX === 'number') {
            person.targetX += dragX;
          }
          if (typeof person.targetY === 'number') {
            person.targetY += dragY;
          }
        }
      }

      if (Math.hypot(dragX, dragY) > 1) {
        this.didDragInCurrentPointer = true;
      }

      this.lastDragPointer = { ...pointer };
    }

    if (game.input.wasPointerReleased()) {
      this.consumeReleaseClick = this.didDragInCurrentPointer;
      this.isDraggingMap = false;
      this.lastDragPointer = null;
      this.didDragInCurrentPointer = false;
    }
  },

  handleMapZoom(game) {
    const wheelDeltaY = game.input.getWheelDeltaY();
    if (!Number.isFinite(wheelDeltaY) || wheelDeltaY === 0) {
      return;
    }

    const pointer = game.input.getPointerPosition();
    if (!this.isPointerOnCanvas(game, pointer)) {
      return;
    }

    const zoomDirection = wheelDeltaY < 0 ? 1 : -1;
    const nextZoom = Math.max(
      this.mapZoomMin,
      Math.min(this.mapZoomMax, this.mapZoom + this.mapZoomStep * zoomDirection)
    );

    if (nextZoom === this.mapZoom) {
      return;
    }

    const previousMapLayout = this.getMapLayout(game.canvas.width, game.canvas.height);
    this.mapZoom = nextZoom;
    const nextMapLayout = this.getMapLayout(game.canvas.width, game.canvas.height);

    this.reprojectPeopleForMapLayout(previousMapLayout, nextMapLayout);

    if (this.lastMapLayout) {
      this.lastMapLayout = nextMapLayout;
    }
  },

  screenPointToMapCoordinates(pointX, pointY, mapLayout) {
    const halfTileWidth = mapLayout.halfTileWidth ?? mapLayout.tileWidth / 2;
    const halfTileHeight = mapLayout.halfTileHeight ?? mapLayout.tileHeight / 2;
    const normalizedX = (pointX - (mapLayout.originX + halfTileWidth)) / halfTileWidth;
    const normalizedY = (pointY - (mapLayout.originY + halfTileHeight)) / halfTileHeight;
    return {
      row: (normalizedY - normalizedX) / 2,
      col: (normalizedY + normalizedX) / 2
    };
  },

  reprojectPointForMapLayout(point, previousMapLayout, nextMapLayout) {
    if (!point) {
      return point;
    }

    const mapCoordinates = this.screenPointToMapCoordinates(point.x, point.y, previousMapLayout);
    return this.tileToScreen(mapCoordinates.row, mapCoordinates.col, nextMapLayout);
  },

  reprojectPeopleForMapLayout(previousMapLayout, nextMapLayout) {
    if (!previousMapLayout || !nextMapLayout) {
      return;
    }

    for (const person of this.people) {
      const projectedPosition = this.reprojectPointForMapLayout(person, previousMapLayout, nextMapLayout);
      if (projectedPosition) {
        person.x = projectedPosition.x;
        person.y = projectedPosition.y;
      }

      if (typeof person.targetX === 'number' && typeof person.targetY === 'number') {
        const projectedTarget = this.reprojectPointForMapLayout(
          { x: person.targetX, y: person.targetY },
          previousMapLayout,
          nextMapLayout
        );

        if (projectedTarget) {
          person.targetX = projectedTarget.x;
          person.targetY = projectedTarget.y;
        }
      }
    }
  },

  formatNumberWithThousands(value) {
    const numericValue = Math.max(0, Math.floor(Number(value) || 0));
    return numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  formatEuro(value) {
    return `€${this.formatNumberWithThousands(value)}`;
  },

  getPopularityStars() {
    const stars = Math.min(5, Math.max(1, Math.floor(this.popularity / 20) + 1));
    return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
  },

  getSatisfactionEmoji(value) {
    if (value < 50) return '☹️';
    if (value <= 80) return '😐';
    return '😊';
  },

  formatSignedEuro(value) {
    if (value < 0) {
      return `-€${this.formatNumberWithThousands(Math.abs(value))}`;
    }

    return `€${this.formatNumberWithThousands(value)}`;
  },

  updateHoveredTile(game, mapLayout) {
    const pointer = this.getPointerInCanvasSpace(game);
    if (!pointer) {
      this.hoveredTile = null;
      this.hoveredWallSegment = null;
      return;
    }

    this.hoveredTile = this.screenToTile(pointer.x, pointer.y, mapLayout);
    this.hoveredWallSegment = this.getWallSegmentAtPointer(pointer, mapLayout);
  },

  handlePlacementRotation(game) {
    if (!this.buyMode) return;
    if (!ITEM_CATALOG[this.selectedItemKey]) return;
    if (!game.input.wasPressed('KeyR')) return;

    this.currentPlacementRotation = (this.currentPlacementRotation + 1) % 4;
  },

  handlePlacementClick(game) {
    if (!this.buyMode) return;
    if (!game.input.wasPointerReleased()) return;
    if (this.consumeReleaseClick) return;
    if (!this.isPointerOnCanvas(game, game.input.getPointerPosition())) return;

    const selected = ITEM_CATALOG[this.selectedItemKey];
    if (!selected) return;

    if (selected.decorTarget === 'floor') {
      if (!this.hoveredTile) return;

      const { row, col } = this.hoveredTile;
      if (!this.canPlaceItemAt(row, col, this.selectedItemKey, this.currentPlacementRotation)) return;
      this.money -= selected.cost;
      this.floorDecorTiles[row][col] = this.selectedItemKey;
      this.updateUiMetrics();
      return;
    }

    if (selected.decorTarget === 'wall') {
      const wallTarget = this.getWallpaperPlacementTarget();
      if (!wallTarget) return;

      const { row, col, side } = wallTarget;
      if (!this.canPlaceItemAt(row, col, this.selectedItemKey, this.currentPlacementRotation)) return;

      this.money -= selected.cost;

      if (side === 'top') {
        this.wallpaperTopByCol[col] = this.selectedItemKey;
      }

      if (side === 'left') {
        this.wallpaperLeftByRow[row] = this.selectedItemKey;
      }

      this.updateUiMetrics();
      return;
    }

    if (!this.hoveredTile) return;
    const { row, col } = this.hoveredTile;
    if (!this.canPlaceItemAt(row, col, this.selectedItemKey, this.currentPlacementRotation)) return;

    this.money -= selected.cost;

    const item = {
      id: this.nextItemId,
      key: this.selectedItemKey,
      row,
      col,
      rotation: this.currentPlacementRotation,
      occupiedByPersonId: null,
      lockerOccupants: [],
      queue: [],
      totalUses: 0,
      breakChance: selected.initialBreakChance,
      repairDurationSeconds: 0,
      repairSecondsRemaining: 0,
      vendingStock: this.selectedItemKey === 'vendingMachine' ? VENDING_MAX_STOCK : 0,
      vendingPurchases: 0,
      vendingRevenue: 0
    };

    this.nextItemId += 1;
    this.occupyItemTiles(item);
    this.items.push(item);
    this.updatePopularity();
  },

  handleDeviceSelectionClick(game) {
    if (!game.input.wasPointerReleased()) return;
    if (this.consumeReleaseClick) return;
    if (!this.isPointerOnCanvas(game, game.input.getPointerPosition())) {
      return;
    }

    const pointer = this.getPointerInCanvasSpace(game);
    if (!pointer) {
      this.selectedPersonId = null;
      this.selectedDeviceId = null;
      this.selectedDecor = null;
      return;
    }

    const selectedPerson = this.findPersonAt(pointer.x, pointer.y);
    if (selectedPerson) {
      this.selectedPersonId = selectedPerson.id;
      this.selectedDeviceId = null;
      this.selectedDecor = null;
      return;
    }

    const wallSegment = this.getWallSegmentAtPointer(pointer, this.lastMapLayout);
    if (wallSegment?.side === 'top') {
      const decorKey = this.wallpaperTopByCol?.[wallSegment.index] ?? null;
      this.selectedPersonId = null;
      this.selectedDeviceId = null;
      this.selectedDecor = decorKey
        ? {
            itemKey: decorKey,
            decorTarget: 'wall',
            side: 'top',
            row: 0,
            col: wallSegment.index
          }
        : null;
      return;
    }

    if (wallSegment?.side === 'left') {
      const decorKey = this.wallpaperLeftByRow?.[wallSegment.index] ?? null;
      this.selectedPersonId = null;
      this.selectedDeviceId = null;
      this.selectedDecor = decorKey
        ? {
            itemKey: decorKey,
            decorTarget: 'wall',
            side: 'left',
            row: wallSegment.index,
            col: 0
          }
        : null;
      return;
    }

    if (!this.hoveredTile) {
      this.selectedPersonId = null;
      this.selectedDeviceId = null;
      this.selectedDecor = null;
      return;
    }

    const selected = this.tiles[this.hoveredTile.row][this.hoveredTile.col];
    const floorDecorKey = this.floorDecorTiles?.[this.hoveredTile.row]?.[this.hoveredTile.col] ?? null;
    this.selectedPersonId = null;
    this.selectedDeviceId = selected?.id ?? null;
    this.selectedDecor =
      selected?.id ?? null
        ? null
        : floorDecorKey
          ? {
              itemKey: floorDecorKey,
              decorTarget: 'floor',
              row: this.hoveredTile.row,
              col: this.hoveredTile.col
            }
          : null;
  },

  findPersonAt(x, y) {
    const clickRadius = 12;
    for (let index = this.people.length - 1; index >= 0; index -= 1) {
      const person = this.people[index];
      const dx = x - person.x;
      const dy = y - person.y;
      if (Math.hypot(dx, dy) <= clickRadius) {
        return person;
      }
    }

    return null;
  },

  formatTrainingTypeLabel(type) {
    if (type && ITEM_CATALOG[type]) {
      return ITEM_CATALOG[type].label;
    }

    const match = Object.values(ITEM_CATALOG).find((item) => item.type === type);
    if (match) {
      return match.label;
    }

    if (!type) return '-';
    return type.charAt(0).toUpperCase() + type.slice(1);
  },

  getSelectedPerson() {
    if (this.selectedPersonId === null) return null;
    return this.people.find((person) => person.id === this.selectedPersonId) ?? null;
  },

  getCustomerThoughts(person) {
    const thoughts = [];

    const trainingPlanLength = Array.isArray(person.trainingPlan) ? person.trainingPlan.length : 0;
    const skippedCount = Array.isArray(person.trainingPlanResults)
      ? person.trainingPlanResults.filter((result) => result === 'skipped').length
      : 0;

    if (trainingPlanLength > 0 && skippedCount > trainingPlanLength / 2) {
      thoughts.push('this gym is lacking some cruicial devices!');
    }

    if (person.thoughtPriceTooHigh) {
      thoughts.push('The price of this gym is way too high for what it offers');
    }

    if (person.thoughtPriceGreatDeal) {
      thoughts.push('This gym offers a really good deal for what it offers');
    }

    if (person.thoughtNoShower) {
      thoughts.push("This gym doesn't have any showers!");
    }

    if (person.thoughtLongQueue) {
      thoughts.push("There's too few devices for too many people!");
    }

    if (person.thoughtNoLocker) {
      thoughts.push("This gym is packed! No place to store my clothes!");
    }

    if (person.thoughtBrokenDevices) {
      thoughts.push('So many broken devices...');
    }

    if (person.visitSatisfaction > 90) {
      thoughts.push('This is the best gym ever!');
    }

    if (person.visitSatisfaction > 80) {
      thoughts.push('Great Training today!');
    }

    return thoughts;
  },

  renderSelectedCustomer(
    customerCard,
    customerName,
    customerMember,
    customerSatisfaction,
    customerShowerPlan,
    customerTrainingList,
    customerThoughtsList
  ) {
    if (
      !customerName ||
      !customerMember ||
      !customerSatisfaction ||
      !customerShowerPlan ||
      !customerTrainingList ||
      !customerThoughtsList
    ) {
      return;
    }

    const selectedPerson = this.getSelectedPerson();
    customerCard?.classList.toggle('is-hidden', !selectedPerson);

    if (!selectedPerson) {
      customerName.textContent = 'None selected';
      customerMember.textContent = '';
      customerSatisfaction.textContent = 'Satisfaction: -';
      customerShowerPlan.textContent = '';
      customerTrainingList.innerHTML = '';
      customerThoughtsList.innerHTML = '';

      const emptyState = document.createElement('p');
      emptyState.className = 'customer-plan-empty';
      emptyState.textContent = 'No customer selected';
      customerTrainingList.appendChild(emptyState);

      const thoughtsEmptyState = document.createElement('p');
      thoughtsEmptyState.className = 'customer-plan-empty';
      thoughtsEmptyState.textContent = 'No customer selected';
      customerThoughtsList.appendChild(thoughtsEmptyState);
      return;
    }

    customerName.textContent = selectedPerson.name;
    customerMember.textContent = selectedPerson.isMember ? 'Member ★' : '';
    const roundedSatisfaction = Math.round(selectedPerson.visitSatisfaction);
    customerSatisfaction.textContent = `${this.getSatisfactionEmoji(roundedSatisfaction)} ${roundedSatisfaction}`;
    customerShowerPlan.textContent = selectedPerson.plansShower ? 'Wants to shower after training' : '';

    customerTrainingList.innerHTML = '';
    if (!Array.isArray(selectedPerson.trainingPlan) || selectedPerson.trainingPlan.length === 0) {
      const waitingState = document.createElement('p');
      waitingState.className = 'customer-plan-empty';
      waitingState.textContent = 'Plan not started yet';
      customerTrainingList.appendChild(waitingState);
    } else {
      const completedCount = Math.max(0, Math.min(selectedPerson.trainingPlanIndex, selectedPerson.trainingPlan.length));
      for (let index = 0; index < selectedPerson.trainingPlan.length; index += 1) {
        const exerciseType = selectedPerson.trainingPlan[index];
        const result = Array.isArray(selectedPerson.trainingPlanResults)
          ? selectedPerson.trainingPlanResults[index] ?? 'pending'
          : index < completedCount
            ? 'completed'
            : 'pending';
        const item = document.createElement('p');
        item.className = `customer-plan-item${result === 'completed' ? ' is-complete' : ''}${result === 'skipped' ? ' is-skipped' : ''}`;
        const symbol = result === 'completed' ? '✓' : result === 'skipped' ? '✗' : '☐';
        item.textContent = `${symbol} ${this.formatTrainingTypeLabel(exerciseType)}`;
        customerTrainingList.appendChild(item);
      }
    }

    customerThoughtsList.innerHTML = '';
    const thoughts = this.getCustomerThoughts(selectedPerson);
    if (thoughts.length === 0) {
      const noThoughts = document.createElement('p');
      noThoughts.className = 'customer-plan-empty';
      noThoughts.textContent = 'No notable thoughts yet';
      customerThoughtsList.appendChild(noThoughts);
      return;
    }

    for (const thought of thoughts) {
      const thoughtItem = document.createElement('p');
      thoughtItem.className = 'customer-plan-item';
      thoughtItem.textContent = thought;
      customerThoughtsList.appendChild(thoughtItem);
    }
  },

  isPointerOnCanvas(game, pointer) {
    if (!pointer) return false;

    const topElement = document.elementFromPoint(pointer.x, pointer.y);
    return topElement === game.canvas;
  },

  sellSelectedDevice() {
    const selected = this.items.find((item) => item.id === this.selectedDeviceId);
    if (!selected && !this.selectedDecor) return;
    if (selected && !this.lastMapLayout) return;

    if (!selected && this.selectedDecor) {
      const decorConfig = ITEM_CATALOG[this.selectedDecor.itemKey];
      if (!decorConfig) return;

      this.money += Math.floor(decorConfig.cost / 2);

      if (this.selectedDecor.decorTarget === 'floor') {
        if (this.floorDecorTiles[this.selectedDecor.row]?.[this.selectedDecor.col] === this.selectedDecor.itemKey) {
          this.floorDecorTiles[this.selectedDecor.row][this.selectedDecor.col] = null;
        }
      }

      if (this.selectedDecor.decorTarget === 'wall') {
        if (this.selectedDecor.side === 'top') {
          if (this.wallpaperTopByCol[this.selectedDecor.col] === this.selectedDecor.itemKey) {
            this.wallpaperTopByCol[this.selectedDecor.col] = null;
          }
        }

        if (this.selectedDecor.side === 'left') {
          if (this.wallpaperLeftByRow[this.selectedDecor.row] === this.selectedDecor.itemKey) {
            this.wallpaperLeftByRow[this.selectedDecor.row] = null;
          }
        }
      }

      this.selectedDecor = null;
      this.updateUiMetrics();
      return;
    }

    if (ITEM_CATALOG[selected.key].type === 'locker' && this.getLockerOccupancy(selected) > 0) {
      return;
    }

    this.money += this.getSellPrice(selected);
    this.clearItemTiles(selected);
    this.items = this.items.filter((item) => item.id !== selected.id);

    for (const person of this.people) {
      if (
        person.targetItemId !== selected.id &&
        person.queuedItemId !== selected.id &&
        person.assignedLockerItemId !== selected.id
      ) {
        continue;
      }

      this.removeFromCurrentQueue(person);
      person.targetItemId = null;
      person.queuedItemId = null;
      person.trainingRemaining = 0;
      if (person.assignedLockerItemId === selected.id) {
        person.assignedLockerItemId = null;
      }

      const shouldRouteToCheckIn = this.hasAnyCheckInItems() && !person.paidDailyTicket;
      const rerouted = shouldRouteToCheckIn
        ? this.assignCheckInToPerson(person, this.lastMapLayout)
        : this.assignDeviceToPerson(person, null, this.lastMapLayout);

      if (!rerouted) {
        this.sendPersonToExit(person, this.lastMapLayout);
      }
    }

    this.selectedDeviceId = null;
    this.selectedDecor = null;
    this.updatePopularity();
    this.updateUiMetrics();
  },

  restockSelectedVendingMachine() {
    const selected = this.items.find((item) => item.id === this.selectedDeviceId);
    if (!selected || selected.key !== 'vendingMachine') return;

    const currentStock = Math.max(0, Math.floor(selected.vendingStock ?? 0));
    const missingStock = Math.max(0, VENDING_MAX_STOCK - currentStock);
    if (missingStock === 0) return;

    const restockCost = missingStock * VENDING_RESTOCK_COST_PER_ITEM;
    if (this.money < restockCost) return;

    this.money -= restockCost;
    selected.vendingStock = VENDING_MAX_STOCK;
    this.updateUiMetrics();
  },

  getSellPrice(item) {
    if (this.isItemBroken(item)) return 0;

    return Math.floor(ITEM_CATALOG[item.key].cost / 2);
  },

  getPointerInCanvasSpace(game) {
    const pointer = game.input.getPointerPosition();
    if (!pointer) return null;

    const rect = game.canvas.getBoundingClientRect();
    const x = pointer.x - rect.left;
    const y = pointer.y - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return null;
    }

    return {
      x: (x / rect.width) * game.canvas.width,
      y: (y / rect.height) * game.canvas.height
    };
  },

  updateUiMetrics() {
    if (!this.ui) return;

    const {
      bankValue,
      bankWarningMessage,
      popularityValue,
      monthlyCostsValue,
      projectedIncomeValue,
      membersValue,
      lockersValue,
      satisfactionValue,
      metricStatButtons,
      subscriptionInput,
      subscriptionValue,
      membersGainedValue,
      membersLostValue,
      statsModal,
      statsModalTitle,
      statsModalBody,
      gymUpgradesButton,
      gymUpgradesModal,
      gymUpgradesBody,
      gymAdministrationButton,
      gymAdministrationModal,
      gymAdministrationBody,
      memberListButton,
      memberListModal,
      memberListBody,
      deviceName,
      deviceBreakProb,
      deviceSellValue,
      deviceVendingStock,
      deviceVendingPurchases,
      deviceVendingRevenue,
      sellDeviceButton,
      vendingRestockButton,
      deviceCard,
      customerName,
      customerMember,
      customerSatisfaction,
      customerShowerPlan,
      customerTrainingList,
      customerThoughtsList,
      customerCard,
      guideButton,
      tutorialModal,
      tutorialChecklistBody,
      tutorialWelcomeModal,
      tutorialCompleteModal
    } = this.ui;

    this.updateTutorialProgress();

    const averageSatisfaction = this.getAverageSatisfaction();
    const projectedMembersIncome = this.members * this.subscriptionFee;
    const projectedDayTicketIncome = this.lastCycleDayTicketIncome;
    const totalProjectedIncome = projectedMembersIncome + projectedDayTicketIncome;

    if (bankValue) {
      bankValue.textContent = this.formatSignedEuro(this.money);
      bankValue.classList.toggle('is-danger', this.money < 0);
    }
    if (bankWarningMessage) {
      const gameOverLimit = this.gameOverBankLimit ?? -50000;
      const shouldShowWarning = this.money < 0 && this.money > gameOverLimit;
      bankWarningMessage.classList.toggle('is-open', shouldShowWarning);
      bankWarningMessage.textContent = `Warning: Game over at -€${this.formatNumberWithThousands(
        Math.abs(gameOverLimit)
      )}.`;
    }

    if (popularityValue) popularityValue.textContent = this.getPopularityStars();
    if (monthlyCostsValue) monthlyCostsValue.textContent = this.formatEuro(this.getMonthlyCosts());
    if (projectedIncomeValue) {
      projectedIncomeValue.textContent = this.formatEuro(totalProjectedIncome);
    }
    if (membersValue) membersValue.textContent = `👤 ${this.members}`;
    if (lockersValue) {
      const freeLockers = this.getFreeLockerCapacity();
      lockersValue.textContent = `${freeLockers}`;
      lockersValue.classList.toggle('is-danger', freeLockers === 0);
    }
    if (satisfactionValue) {
      satisfactionValue.textContent = `${this.getSatisfactionEmoji(averageSatisfaction)} ${averageSatisfaction}`;
    }
    if (subscriptionInput) {
      const clampedFee = Math.max(0, Math.min(150, Math.floor(this.subscriptionFee)));
      subscriptionInput.value = String(clampedFee);
      const sliderPercent = (clampedFee / 150) * 100;
      const fillColor = this.gymMainColor ?? '#6ea0ff';
      subscriptionInput.style.background = `linear-gradient(90deg, ${fillColor} 0%, ${fillColor} ${sliderPercent}%, #111b2c ${sliderPercent}%, #111b2c 100%)`;
    }
    if (subscriptionValue) {
      subscriptionValue.textContent = this.formatEuro(this.subscriptionFee);
    }
    if (membersGainedValue) membersGainedValue.textContent = `${this.lastCycleGained}`;
    if (membersLostValue) membersLostValue.textContent = `${this.lastCycleChurn}`;
    metricStatButtons?.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.statKey === this.activeStatisticKey);
    });

    statsModal?.classList.toggle('is-open', Boolean(this.activeStatisticKey));
    if (statsModal) {
      statsModal.setAttribute('aria-hidden', this.activeStatisticKey ? 'false' : 'true');
    }

    if (this.activeStatisticKey && statsModalTitle && statsModalBody) {
      this.renderStatisticModalContent(this.activeStatisticKey, statsModalTitle, statsModalBody);
    } else if (statsModalBody) {
      statsModalBody.innerHTML = '';
    }

    memberListButton?.classList.toggle('is-active', this.memberListVisible);
    memberListModal?.classList.toggle('is-open', this.memberListVisible);
    if (memberListModal) {
      memberListModal.setAttribute('aria-hidden', this.memberListVisible ? 'false' : 'true');
    }
    this.renderMemberList(memberListBody);

    gymUpgradesButton?.classList.toggle('is-active', this.gymUpgradesVisible);
    gymUpgradesModal?.classList.toggle('is-open', this.gymUpgradesVisible);
    if (gymUpgradesModal) {
      gymUpgradesModal.setAttribute('aria-hidden', this.gymUpgradesVisible ? 'false' : 'true');
    }
    this.renderGymUpgrades(gymUpgradesBody);

    gymAdministrationButton?.classList.toggle('is-active', this.gymAdministrationVisible);
    gymAdministrationModal?.classList.toggle('is-open', this.gymAdministrationVisible);
    if (gymAdministrationModal) {
      gymAdministrationModal.setAttribute('aria-hidden', this.gymAdministrationVisible ? 'false' : 'true');
    }
    this.renderGymAdministration(gymAdministrationBody);

    const selected = this.items.find((item) => item.id === this.selectedDeviceId) ?? null;
    const selectedDecor = this.selectedDecor;
    const selectedDecorConfig = selectedDecor ? ITEM_CATALOG[selectedDecor.itemKey] : null;
    const selectedBuyCatalogConfig =
      !selected && !selectedDecorConfig && this.buyMode && ITEM_CATALOG[this.selectedItemKey]
        ? ITEM_CATALOG[this.selectedItemKey]
        : null;
    deviceCard?.classList.toggle('is-hidden', !selected && !selectedDecorConfig && !selectedBuyCatalogConfig);

    if (deviceName) {
      if (!selected && !selectedDecorConfig) {
        deviceName.textContent = selectedBuyCatalogConfig
          ? `${selectedBuyCatalogConfig.label} (${selectedBuyCatalogConfig.type})`
          : 'None selected';
      } else if (selectedDecorConfig) {
        deviceName.textContent = `${selectedDecorConfig.label} (decor)`;
      } else {
        const info = ITEM_CATALOG[selected.key];
        deviceName.textContent = `${info.label} (${info.type})`;
      }
    }

    if (deviceBreakProb) {
      deviceBreakProb.textContent = selectedDecorConfig
        ? 'Break chance next use: -'
        : selected
        ? `Break chance next use: ${(selected.breakChance * 100).toFixed(1)}%`
        : selectedBuyCatalogConfig
        ? `Break chance next use: ${(selectedBuyCatalogConfig.initialBreakChance * 100).toFixed(1)}%`
        : 'Break chance next use: -';
    }

    if (deviceSellValue) {
      deviceSellValue.textContent = selectedDecorConfig
        ? `Sell price: $${Math.floor(selectedDecorConfig.cost / 2)}`
        : selected
        ? `Sell price: $${this.getSellPrice(selected)}`
        : 'Sell price: -';
    }

    const selectedIsVendingMachine = selected?.key === 'vendingMachine';
    const vendingStock = Math.max(0, Math.floor(selected?.vendingStock ?? 0));
    const vendingPurchases = Math.max(0, Math.floor(selected?.vendingPurchases ?? 0));
    const vendingRevenue = Math.max(0, Math.floor(selected?.vendingRevenue ?? 0));
    const vendingRestockCost = Math.max(0, (VENDING_MAX_STOCK - vendingStock) * VENDING_RESTOCK_COST_PER_ITEM);

    if (deviceVendingStock) {
      deviceVendingStock.classList.toggle('is-hidden', !selectedIsVendingMachine);
      deviceVendingStock.textContent = `Stock: ${vendingStock}/${VENDING_MAX_STOCK}`;
    }

    if (deviceVendingPurchases) {
      deviceVendingPurchases.classList.toggle('is-hidden', !selectedIsVendingMachine);
      deviceVendingPurchases.textContent = `Purchases total: ${vendingPurchases}`;
    }

    if (deviceVendingRevenue) {
      deviceVendingRevenue.classList.toggle('is-hidden', !selectedIsVendingMachine);
      deviceVendingRevenue.textContent = `Revenue total: ${this.formatEuro(vendingRevenue)}`;
    }

    if (vendingRestockButton) {
      vendingRestockButton.classList.toggle('is-hidden', !selectedIsVendingMachine);
      vendingRestockButton.disabled =
        !selectedIsVendingMachine || vendingStock >= VENDING_MAX_STOCK || this.money < vendingRestockCost;
      vendingRestockButton.textContent = `RESTOCK (${this.formatEuro(vendingRestockCost)})`;
    }

    if (sellDeviceButton) {
      sellDeviceButton.disabled = !selected && !selectedDecorConfig;
    }

    guideButton?.classList.toggle('is-active', this.tutorialVisible);

    tutorialModal?.classList.toggle('is-open', this.tutorialVisible);
    if (tutorialModal) {
      tutorialModal.setAttribute('aria-hidden', this.tutorialVisible ? 'false' : 'true');
    }

    tutorialWelcomeModal?.classList.toggle('is-open', this.tutorialWelcomeVisible);
    if (tutorialWelcomeModal) {
      tutorialWelcomeModal.setAttribute('aria-hidden', this.tutorialWelcomeVisible ? 'false' : 'true');
    }

    tutorialCompleteModal?.classList.toggle('is-open', this.tutorialCompleteVisible);
    if (tutorialCompleteModal) {
      tutorialCompleteModal.setAttribute('aria-hidden', this.tutorialCompleteVisible ? 'false' : 'true');
    }

    this.renderTutorialChecklist(tutorialChecklistBody);

    this.renderSelectedCustomer(
      customerCard,
      customerName,
      customerMember,
      customerSatisfaction,
      customerShowerPlan,
      customerTrainingList,
      customerThoughtsList
    );
  },

  renderStatisticModalContent(statKey, titleElement, bodyElement) {
    const titleByKey = {
      bank: 'Bank by Month',
      popularity: 'Popularity by Month',
      'monthly-costs': 'Monthly Cost Breakdown',
      'projected-income': 'Projected Income Breakdown',
      members: 'Members by Month',
      'free-lockers': 'Free Lockers',
      satisfaction: 'Satisfaction by Month'
    };

    titleElement.textContent = titleByKey[statKey] ?? 'Statistics';
    bodyElement.innerHTML = '';

    if (statKey === 'bank') {
      this.renderLineChart(
        bodyElement,
        [...this.monthlyBankHistory].reverse(),
        (entry) => entry.value,
        (value) => this.formatSignedEuro(value),
        {
          yAxisLabel: 'EUR'
        }
      );
      return;
    }

    if (statKey === 'popularity') {
      this.renderColumnChart(
        bodyElement,
        [...this.monthlyPopularityHistory].reverse(),
        (entry) => entry.value,
        (value) => this.formatPopularityStarsValue(value),
        {
          yAxisLabel: 'Stars',
          yTickFormatter: (value) => this.formatPopularityStarsValue(value)
        }
      );
      return;
    }

    if (statKey === 'monthly-costs') {
      const itemMonthlyCosts = this.items.reduce((sum, item) => sum + (ITEM_CATALOG[item.key].monthlyCost ?? 0), 0);
      const upgradeMonthlyCosts = this.getPurchasedGymUpgradeMonthlyCost();
      this.renderPieChart(bodyElement, [
        { label: 'Rent', value: this.rentAmount, color: '#6ea0ff' },
        { label: 'Devices/Facilities', value: itemMonthlyCosts, color: '#34d399' },
        { label: 'Upgrades', value: upgradeMonthlyCosts, color: '#f97316' }
      ]);
      return;
    }

    if (statKey === 'projected-income') {
      const membersIncome = this.members * this.subscriptionFee;
      const dayTicketIncome = this.lastCycleDayTicketIncome;
      this.renderPieChart(bodyElement, [
        { label: 'Projected membership fees', value: membersIncome, color: '#6ea0ff' },
        { label: 'Projected day tickets', value: dayTicketIncome, color: '#fbbf24' }
      ]);
      return;
    }

    if (statKey === 'members') {
      this.renderColumnChart(
        bodyElement,
        [...this.monthlyMemberHistory].reverse(),
        (entry) => entry.value,
        (value) => `${Math.round(value)} members`,
        {
          yAxisLabel: 'Members'
        }
      );
      return;
    }

    if (statKey === 'free-lockers') {
      const valueGrid = document.createElement('div');
      valueGrid.className = 'stats-value-grid';

      const freeNow = document.createElement('article');
      freeNow.className = 'stats-value-card';
      const freeNowLabel = document.createElement('span');
      freeNowLabel.textContent = 'Free lockers now';
      const freeNowValue = document.createElement('strong');
      freeNowValue.textContent = `${this.getFreeLockerCapacity()}`;
      freeNow.appendChild(freeNowLabel);
      freeNow.appendChild(freeNowValue);

      const turnedDown = document.createElement('article');
      turnedDown.className = 'stats-value-card';
      const turnedDownLabel = document.createElement('span');
      turnedDownLabel.textContent = 'Customers turned down this month';
      const turnedDownValue = document.createElement('strong');
      turnedDownValue.textContent = `${this.currentCycleLockerTurnedDown}`;
      turnedDown.appendChild(turnedDownLabel);
      turnedDown.appendChild(turnedDownValue);

      valueGrid.appendChild(freeNow);
      valueGrid.appendChild(turnedDown);
      bodyElement.appendChild(valueGrid);
      return;
    }

    if (statKey === 'satisfaction') {
      this.renderLineChart(
        bodyElement,
        [...this.monthlySatisfactionHistory].reverse(),
        (entry) => entry.value,
        (value) => `${Math.round(value)}%`,
        {
          yAxisLabel: '%',
          yTickFormatter: (value) => `${Math.round(value)}%`,
          minValue: 0,
          maxValue: 100
        }
      );
    }
  },

  formatPopularityStarsValue(value) {
    const stars = Math.min(5, Math.max(1, Math.floor((Number(value) || 0) / 20) + 1));
    return `${stars}★`;
  },

  createChartSvgElement(tag, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  },

  getChartDomain(values, options = {}) {
    const hasFixedMin = Number.isFinite(options.minValue);
    const hasFixedMax = Number.isFinite(options.maxValue);

    if (hasFixedMin || hasFixedMax) {
      const fallbackValues = values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      const fallbackMin = fallbackValues.length > 0 ? Math.min(...fallbackValues) : 0;
      const fallbackMax = fallbackValues.length > 0 ? Math.max(...fallbackValues) : 1;

      const minValue = hasFixedMin ? Number(options.minValue) : fallbackMin;
      let maxValue = hasFixedMax ? Number(options.maxValue) : fallbackMax;

      if (minValue === maxValue) {
        maxValue = minValue + 1;
      }

      const range = maxValue - minValue;
      return { minValue, maxValue, range };
    }

    const numericValues = values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) {
      return { minValue: 0, maxValue: 1, range: 1 };
    }

    let minValue = Math.min(...numericValues);
    let maxValue = Math.max(...numericValues);

    if (minValue === maxValue) {
      if (minValue === 0) {
        maxValue = 1;
      } else {
        const padding = Math.abs(minValue) * 0.1;
        minValue -= padding;
        maxValue += padding;
      }
    }

    const range = maxValue - minValue || 1;
    return { minValue, maxValue, range };
  },

  getChartYTickValues(minValue, maxValue) {
    const values = [maxValue, minValue + (maxValue - minValue) / 2, minValue];

    if (minValue < 0 && maxValue > 0) {
      values.push(0);
    }

    const sorted = values.sort((a, b) => b - a);
    const uniqueValues = [];
    for (const value of sorted) {
      const duplicate = uniqueValues.some((existing) => Math.abs(existing - value) < 0.0001);
      if (!duplicate) {
        uniqueValues.push(value);
      }
    }

    return uniqueValues;
  },

  renderLineChart(container, entries, valueAccessor, valueFormatter, options = {}) {
    const safeEntries = Array.isArray(entries) ? entries.slice(-6) : [];
    if (safeEntries.length === 0) {
      container.textContent = 'No monthly data yet.';
      return;
    }

    const yAxisLabel = options.yAxisLabel ?? '';
    const yTickFormatter = options.yTickFormatter ?? valueFormatter;

    const chart = document.createElement('div');
    chart.className = 'stats-chart';
    const svg = this.createChartSvgElement('svg', { viewBox: '0 0 600 240', role: 'img' });

    const left = 72;
    const top = 16;
    const width = 512;
    const height = 168;
    const values = safeEntries.map((entry) => Number(valueAccessor(entry) || 0));
    const { minValue, maxValue, range } = this.getChartDomain(values, options);
    const toChartY = (value) => top + height - ((value - minValue) / range) * height;
    const axisXPosition = toChartY(0);

    const axisY = this.createChartSvgElement('line', {
      x1: left,
      y1: top,
      x2: left,
      y2: top + height,
      stroke: '#2f435f',
      'stroke-width': 1
    });
    const axisX = this.createChartSvgElement('line', {
      x1: left,
      y1: axisXPosition,
      x2: left + width,
      y2: axisXPosition,
      stroke: '#2f435f',
      'stroke-width': 1
    });
    svg.appendChild(axisY);
    svg.appendChild(axisX);

    const yTickValues = this.getChartYTickValues(minValue, maxValue);
    for (const tickValue of yTickValues) {
      const y = toChartY(tickValue);
      const tickMark = this.createChartSvgElement('line', {
        x1: left - 4,
        y1: y,
        x2: left,
        y2: y,
        stroke: '#2f435f',
        'stroke-width': 1
      });
      const tickText = this.createChartSvgElement('text', {
        x: left - 7,
        y: y + 3,
        fill: '#93a8c7',
        'font-size': 10,
        'text-anchor': 'end'
      });
      tickText.textContent = yTickFormatter(tickValue);
      svg.appendChild(tickMark);
      svg.appendChild(tickText);
    }

    if (yAxisLabel) {
      const axisTitle = this.createChartSvgElement('text', {
        x: 18,
        y: top + height / 2,
        fill: '#cbd5e1',
        'font-size': 11,
        'font-weight': 600,
        'text-anchor': 'middle',
        transform: `rotate(-90 18 ${top + height / 2})`
      });
      axisTitle.textContent = yAxisLabel;
      svg.appendChild(axisTitle);
    }

    const points = safeEntries.map((entry, index) => {
      const value = Number(valueAccessor(entry) || 0);
      const x = left + (safeEntries.length === 1 ? width / 2 : (width * index) / (safeEntries.length - 1));
      const y = toChartY(value);
      return { x, y, value, label: entry.monthLabel };
    });

    const polyline = this.createChartSvgElement('polyline', {
      points: points.map((point) => `${point.x},${point.y}`).join(' '),
      fill: 'none',
      stroke: '#6ea0ff',
      'stroke-width': 2.5
    });
    svg.appendChild(polyline);

    for (const point of points) {
      const dot = this.createChartSvgElement('circle', {
        cx: point.x,
        cy: point.y,
        r: 3,
        fill: '#cbd5e1'
      });
      const xLabel = this.createChartSvgElement('text', {
        x: point.x,
        y: top + height + 16,
        fill: '#93a8c7',
        'font-size': 10,
        'text-anchor': 'middle'
      });
      xLabel.textContent = point.label;
      svg.appendChild(dot);
      svg.appendChild(xLabel);
    }

    const maxLabel = document.createElement('p');
    maxLabel.className = 'stats-legend-item';
    maxLabel.textContent = `Range: ${valueFormatter(minValue)} to ${valueFormatter(maxValue)}`;

    chart.appendChild(svg);
    container.appendChild(chart);
    container.appendChild(maxLabel);
  },

  renderColumnChart(container, entries, valueAccessor, valueFormatter, options = {}) {
    const safeEntries = Array.isArray(entries) ? entries.slice(-6) : [];
    if (safeEntries.length === 0) {
      container.textContent = 'No monthly data yet.';
      return;
    }

    const yAxisLabel = options.yAxisLabel ?? '';
    const yTickFormatter = options.yTickFormatter ?? valueFormatter;

    const chart = document.createElement('div');
    chart.className = 'stats-chart';
    const svg = this.createChartSvgElement('svg', { viewBox: '0 0 600 240', role: 'img' });

    const left = 72;
    const top = 16;
    const width = 512;
    const height = 168;
    const values = safeEntries.map((entry) => Number(valueAccessor(entry) || 0));
    const { minValue, maxValue, range } = this.getChartDomain(values, options);
    const toChartY = (value) => top + height - ((value - minValue) / range) * height;
    const baselineY = toChartY(0);
    const slotWidth = width / safeEntries.length;
    const barWidth = slotWidth * 0.62;

    const axisY = this.createChartSvgElement('line', {
      x1: left,
      y1: top,
      x2: left,
      y2: top + height,
      stroke: '#2f435f',
      'stroke-width': 1
    });
    const axisX = this.createChartSvgElement('line', {
      x1: left,
      y1: baselineY,
      x2: left + width,
      y2: baselineY,
      stroke: '#2f435f',
      'stroke-width': 1
    });
    svg.appendChild(axisY);
    svg.appendChild(axisX);

    const yTickValues = this.getChartYTickValues(minValue, maxValue);
    for (const tickValue of yTickValues) {
      const y = toChartY(tickValue);
      const tickMark = this.createChartSvgElement('line', {
        x1: left - 4,
        y1: y,
        x2: left,
        y2: y,
        stroke: '#2f435f',
        'stroke-width': 1
      });
      const tickText = this.createChartSvgElement('text', {
        x: left - 7,
        y: y + 3,
        fill: '#93a8c7',
        'font-size': 10,
        'text-anchor': 'end'
      });
      tickText.textContent = yTickFormatter(tickValue);
      svg.appendChild(tickMark);
      svg.appendChild(tickText);
    }

    if (yAxisLabel) {
      const axisTitle = this.createChartSvgElement('text', {
        x: 18,
        y: top + height / 2,
        fill: '#cbd5e1',
        'font-size': 11,
        'font-weight': 600,
        'text-anchor': 'middle',
        transform: `rotate(-90 18 ${top + height / 2})`
      });
      axisTitle.textContent = yAxisLabel;
      svg.appendChild(axisTitle);
    }

    for (let index = 0; index < safeEntries.length; index += 1) {
      const entry = safeEntries[index];
      const value = Number(valueAccessor(entry) || 0);
      const valueY = toChartY(value);
      const y = Math.min(baselineY, valueY);
      const barHeight = Math.abs(valueY - baselineY);
      const x = left + slotWidth * index + (slotWidth - barWidth) / 2;

      const bar = this.createChartSvgElement('rect', {
        x,
        y,
        width: barWidth,
        height: Math.max(1, barHeight),
        fill: '#34d399'
      });
      const label = this.createChartSvgElement('text', {
        x: x + barWidth / 2,
        y: top + height + 16,
        fill: '#93a8c7',
        'font-size': 10,
        'text-anchor': 'middle'
      });
      label.textContent = entry.monthLabel;

      svg.appendChild(bar);
      svg.appendChild(label);
    }

    const maxLabel = document.createElement('p');
    maxLabel.className = 'stats-legend-item';
    maxLabel.textContent = `Range: ${valueFormatter(minValue)} to ${valueFormatter(maxValue)}`;

    chart.appendChild(svg);
    container.appendChild(chart);
    container.appendChild(maxLabel);
  },

  renderPieChart(container, slices) {
    const safeSlices = slices.filter((slice) => Number(slice.value) > 0);
    const total = safeSlices.reduce((sum, slice) => sum + Number(slice.value), 0);

    if (total <= 0) {
      container.textContent = 'No data available yet.';
      return;
    }

    const chart = document.createElement('div');
    chart.className = 'stats-chart';
    const svg = this.createChartSvgElement('svg', { viewBox: '0 0 420 240', role: 'img' });

    const centerX = 140;
    const centerY = 120;
    const radius = 82;
    let startAngle = -Math.PI / 2;

    for (const slice of safeSlices) {
      const value = Number(slice.value);
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const largeArc = angle > Math.PI ? 1 : 0;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const path = this.createChartSvgElement('path', {
        d: pathData,
        fill: slice.color
      });

      svg.appendChild(path);
      startAngle = endAngle;
    }

    chart.appendChild(svg);
    container.appendChild(chart);

    const legend = document.createElement('div');
    legend.className = 'stats-legend';
    for (const slice of safeSlices) {
      const item = document.createElement('p');
      item.className = 'stats-legend-item';
      const percentage = Math.round((Number(slice.value) / total) * 100);
      item.textContent = `${slice.label}: ${this.formatEuro(slice.value)} (${percentage}%)`;
      legend.appendChild(item);
    }
    container.appendChild(legend);
  },

  renderMemberList(memberListBody) {
    if (!memberListBody) return;

    memberListBody.innerHTML = '';

    if (this.memberProfiles.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'member-list-empty';
      emptyState.textContent = 'No active members';
      memberListBody.appendChild(emptyState);
      return;
    }

    for (const member of this.memberProfiles) {
      const row = document.createElement('div');
      row.className = 'member-row';

      const icon = document.createElement('span');
      icon.className = 'member-icon';
      icon.style.backgroundColor = member.color;

      const info = document.createElement('div');
      info.className = 'member-info';

      const name = document.createElement('p');
      name.className = 'member-name';
      name.textContent = member.name;

      const meta = document.createElement('p');
      meta.className = 'member-meta';
      meta.textContent = `Last satisfaction: ${member.lastVisitSatisfaction} • Subscribed: ${member.monthsSubscribed} mo`;

      info.appendChild(name);
      info.appendChild(meta);
      row.appendChild(icon);
      row.appendChild(info);
      memberListBody.appendChild(row);
    }
  },

  renderGymUpgrades(gymUpgradesBody) {
    if (!gymUpgradesBody) return;

    const renderState = Object.entries(GYM_UPGRADES).map(([upgradeKey]) => {
      const purchaseState = this.getGymUpgradePurchaseState(upgradeKey);
      return {
        upgradeKey,
        purchased: purchaseState.purchased,
        hasEnoughMoney: purchaseState.hasEnoughMoney,
        unmetRequirements: purchaseState.unmetRequirements
      };
    });
    const renderKey = JSON.stringify(renderState);

    if (renderKey === this.gymUpgradesRenderStateKey) {
      return;
    }

    this.gymUpgradesRenderStateKey = renderKey;

    gymUpgradesBody.innerHTML = '';

    for (const [upgradeKey, upgrade] of Object.entries(GYM_UPGRADES)) {
      const purchaseState = this.getGymUpgradePurchaseState(upgradeKey);

      const row = document.createElement('article');
      row.className = 'upgrade-row';

      const header = document.createElement('div');
      header.className = 'upgrade-row-header';

      const title = document.createElement('h3');
      title.className = 'upgrade-row-title';
      title.textContent = upgrade.name;

      const status = document.createElement('span');
      status.className = 'upgrade-row-status';
      status.textContent = purchaseState.purchased ? 'Purchased' : '';

      header.appendChild(title);
      header.appendChild(status);

      const description = document.createElement('p');
      description.className = 'upgrade-row-text';
      description.textContent = upgrade.description;

      const effect = document.createElement('p');
      effect.className = 'upgrade-row-text';
      effect.textContent = `Effect: ${upgrade.effect}`;

      const meta = document.createElement('p');
      meta.className = 'upgrade-row-meta';
      meta.textContent = `Price: ${this.formatEuro(upgrade.purchasePrice)} • Monthly: ${this.formatEuro(
        upgrade.monthlyCost
      )}`;

      const requirements = document.createElement('p');
      requirements.className = 'upgrade-row-meta';
      if ((upgrade.requires ?? []).length === 0) {
        requirements.textContent = 'Requirements: none';
      } else {
        const requirementNames = (upgrade.requires ?? []).map((requiredUpgradeKey) => {
          return GYM_UPGRADES[requiredUpgradeKey]?.name ?? requiredUpgradeKey;
        });
        requirements.textContent = `Requirements: ${requirementNames.join(', ')}`;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-row-button';
      button.dataset.upgradeKey = upgradeKey;

      if (purchaseState.purchased) {
        button.disabled = true;
        button.textContent = 'Purchased';
      } else if (purchaseState.unmetRequirements.length > 0) {
        button.disabled = true;
        const unmetNames = purchaseState.unmetRequirements.map((requiredUpgradeKey) => {
          return GYM_UPGRADES[requiredUpgradeKey]?.name ?? requiredUpgradeKey;
        });
        button.textContent = `Requires ${unmetNames.join(', ')}`;
      } else if (!purchaseState.hasEnoughMoney) {
        button.disabled = true;
        button.textContent = 'Not enough money';
      } else {
        button.textContent = 'Purchase';
      }

      row.appendChild(header);
      row.appendChild(description);
      row.appendChild(effect);
      row.appendChild(meta);
      row.appendChild(requirements);
      row.appendChild(button);
      gymUpgradesBody.appendChild(row);
    }
  },

  renderGymAdministration(gymAdministrationBody) {
    if (!gymAdministrationBody || !this.openingHoursSchedule) return;

    const scheduleSnapshot = this.openingHoursSchedule.getScheduleSnapshot();
    const renderKey = JSON.stringify({
      tab: this.gymAdministrationTab,
      scheduleSnapshot,
      staffSalaryPerHour: this.staffSalaryPerHour,
      staffCount: this.staffCount,
      staffCostPerHour: this.getStaffCostPerHour?.() ?? 0,
      staffUtilization: this.getStaffUtilizationLabel?.() ?? 'Good',
      staffHappiness: this.getStaffHappinessLabel?.() ?? 'Okay'
    });
    if (renderKey === this.gymAdministrationRenderStateKey) {
      return;
    }

    this.gymAdministrationRenderStateKey = renderKey;
    gymAdministrationBody.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'admin-tabs';

    const openingHoursTab = document.createElement('button');
    openingHoursTab.type = 'button';
    openingHoursTab.className = `admin-tab${this.gymAdministrationTab === 'opening-hours' ? ' is-active' : ''}`;
    openingHoursTab.dataset.adminTab = 'opening-hours';
    openingHoursTab.textContent = 'Opening Hours';

    const employeesTab = document.createElement('button');
    employeesTab.type = 'button';
    employeesTab.className = `admin-tab${this.gymAdministrationTab === 'employees' ? ' is-active' : ''}`;
    employeesTab.dataset.adminTab = 'employees';
    employeesTab.textContent = 'Employees';

    tabs.appendChild(openingHoursTab);
    tabs.appendChild(employeesTab);
    gymAdministrationBody.appendChild(tabs);

    if (this.gymAdministrationTab === 'employees') {
      const employeesPanel = document.createElement('article');
      employeesPanel.className = 'admin-employees-panel';

      const salaryRow = document.createElement('div');
      salaryRow.className = 'admin-employee-row';
      const salaryLabel = document.createElement('label');
      salaryLabel.textContent = 'Salary per Hour';

      const salaryRange = document.createElement('div');
      salaryRange.className = 'admin-employee-range';
      const salaryPercent = ((this.staffSalaryPerHour - 5) / (25 - 5)) * 100;
      const fillColor = this.gymMainColor ?? '#6ea0ff';
      salaryRange.style.background = `linear-gradient(90deg, ${fillColor} 0%, ${fillColor} ${salaryPercent}%, #111b2c ${salaryPercent}%, #111b2c 100%)`;

      const salaryInput = document.createElement('input');
      salaryInput.type = 'range';
      salaryInput.className = 'admin-employee-range-input';
      salaryInput.min = '5';
      salaryInput.max = '25';
      salaryInput.step = '1';
      salaryInput.value = String(this.staffSalaryPerHour);
      salaryInput.dataset.employeeMode = 'salary';
      const salaryValue = document.createElement('span');
      salaryValue.textContent = `${this.formatEuro(this.staffSalaryPerHour)}`;
      salaryRow.appendChild(salaryLabel);
      salaryRange.appendChild(salaryInput);
      salaryRow.appendChild(salaryRange);
      salaryRow.appendChild(salaryValue);

      const staffCountRow = document.createElement('div');
      staffCountRow.className = 'admin-employee-row';
      const staffCountLabel = document.createElement('label');
      staffCountLabel.textContent = 'Staff Count';

      const staffCountRange = document.createElement('div');
      staffCountRange.className = 'admin-employee-range';
      const staffCountPercent = ((this.staffCount - 1) / (10 - 1)) * 100;
      staffCountRange.style.background = `linear-gradient(90deg, ${fillColor} 0%, ${fillColor} ${staffCountPercent}%, #111b2c ${staffCountPercent}%, #111b2c 100%)`;

      const staffCountInput = document.createElement('input');
      staffCountInput.type = 'range';
      staffCountInput.className = 'admin-employee-range-input';
      staffCountInput.min = '1';
      staffCountInput.max = '10';
      staffCountInput.step = '1';
      staffCountInput.value = String(this.staffCount);
      staffCountInput.dataset.employeeMode = 'count';
      const staffCountValue = document.createElement('span');
      staffCountValue.textContent = `${this.staffCount}`;
      staffCountRow.appendChild(staffCountLabel);
      staffCountRange.appendChild(staffCountInput);
      staffCountRow.appendChild(staffCountRange);
      staffCountRow.appendChild(staffCountValue);

      const infoList = document.createElement('div');
      infoList.className = 'admin-employee-metrics';

      const staffCost = document.createElement('p');
      staffCost.className = 'admin-employee-metric';
      staffCost.textContent = `Staff Cost per Hour: ${this.formatEuro(this.getStaffCostPerHour?.() ?? 0)}`;

      const staffUtilization = document.createElement('p');
      staffUtilization.className = 'admin-employee-metric';
      staffUtilization.textContent = `Staff Utilization: ${this.getStaffUtilizationLabel?.() ?? 'Good'}`;

      const staffHappiness = document.createElement('p');
      staffHappiness.className = 'admin-employee-metric';
      staffHappiness.textContent = `Staff Happiness: ${this.getStaffHappinessLabel?.() ?? 'Okay'}`;

      infoList.appendChild(staffCost);
      infoList.appendChild(staffUtilization);
      infoList.appendChild(staffHappiness);

      employeesPanel.appendChild(salaryRow);
      employeesPanel.appendChild(staffCountRow);
      employeesPanel.appendChild(infoList);
      gymAdministrationBody.appendChild(employeesPanel);
      return;
    }

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const hours = this.openingHoursSchedule.getHoursForWeekday(weekday);

      const row = document.createElement('article');
      row.className = 'admin-hours-row';

      const header = document.createElement('div');
      header.className = 'admin-hours-header';

      const title = document.createElement('h3');
      title.className = 'admin-hours-title';
      title.textContent = WEEKDAY_NAMES[weekday] ?? `Day ${weekday + 1}`;

      const value = document.createElement('p');
      value.className = 'admin-hours-value';
      value.textContent = `${String(hours.openHour).padStart(2, '0')}:00 - ${String(hours.closeHour).padStart(2, '0')}:00`;

      header.appendChild(title);
      header.appendChild(value);

      const sliders = document.createElement('div');
      sliders.className = 'admin-hours-sliders';

      const rangeTrack = document.createElement('div');
      rangeTrack.className = 'admin-hours-range';
      rangeTrack.dataset.weekday = String(weekday);
      const openPercent = (hours.openHour / 24) * 100;
      const closePercent = (hours.closeHour / 24) * 100;
      const fillColor = this.gymMainColor ?? '#6ea0ff';
      rangeTrack.style.background = `linear-gradient(90deg, #111b2c 0%, #111b2c ${openPercent}%, ${fillColor} ${openPercent}%, ${fillColor} ${closePercent}%, #111b2c ${closePercent}%, #111b2c 100%)`;

      const openInput = document.createElement('input');
      openInput.type = 'range';
      openInput.className = 'admin-hours-range-input admin-hours-range-input--open';
      openInput.min = '0';
      openInput.max = '24';
      openInput.step = '1';
      openInput.value = String(hours.openHour);
      openInput.dataset.weekday = String(weekday);
      openInput.dataset.mode = 'open';

      const closeInput = document.createElement('input');
      closeInput.type = 'range';
      closeInput.className = 'admin-hours-range-input admin-hours-range-input--close';
      closeInput.min = '0';
      closeInput.max = '24';
      closeInput.step = '1';
      closeInput.value = String(hours.closeHour);
      closeInput.dataset.weekday = String(weekday);
      closeInput.dataset.mode = 'close';

      rangeTrack.appendChild(openInput);
      rangeTrack.appendChild(closeInput);

      const valueRow = document.createElement('div');
      valueRow.className = 'admin-hours-value-row';

      const openValue = document.createElement('span');
      openValue.textContent = `Open ${String(hours.openHour).padStart(2, '0')}:00`;

      const closeValue = document.createElement('span');
      closeValue.textContent = `Close ${String(hours.closeHour).padStart(2, '0')}:00`;

      valueRow.appendChild(openValue);
      valueRow.appendChild(closeValue);

      sliders.appendChild(rangeTrack);
      sliders.appendChild(valueRow);

      row.appendChild(header);
      row.appendChild(sliders);
      gymAdministrationBody.appendChild(row);
    }
  }
};
