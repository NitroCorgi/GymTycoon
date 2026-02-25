import { ITEM_CATALOG } from '../mainSceneConfig.js';

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
    const wallHeight = mapLayout.tileHeight * 2.9;
    const topEdge = this.getTopBorderEdge(col, mapLayout);
    return [
      { x: topEdge.a.x, y: topEdge.a.y },
      { x: topEdge.b.x, y: topEdge.b.y },
      { x: topEdge.b.x, y: topEdge.b.y - wallHeight },
      { x: topEdge.a.x, y: topEdge.a.y - wallHeight }
    ];
  },

  getLeftWallPolygon(row, mapLayout) {
    const wallHeight = mapLayout.tileHeight * 2.9;
    const leftEdge = this.getLeftBorderEdge(row, mapLayout);
    return [
      { x: leftEdge.a.x, y: leftEdge.a.y },
      { x: leftEdge.b.x, y: leftEdge.b.y },
      { x: leftEdge.b.x, y: leftEdge.b.y - wallHeight },
      { x: leftEdge.a.x, y: leftEdge.a.y - wallHeight }
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
    if (this.money < selected.cost) return;

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
      repairSecondsRemaining: 0
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
      popularityValue,
      monthlyCostsValue,
      projectedIncomeValue,
      membersValue,
      lockersValue,
      satisfactionValue,
      subscriptionInput,
      membersGainedValue,
      membersLostValue,
      statisticsButton,
      statisticsPanel,
      statisticsBody,
      deviceName,
      deviceBreakProb,
      deviceSellValue,
      sellDeviceButton,
      deviceCard,
      customerName,
      customerMember,
      customerSatisfaction,
      customerShowerPlan,
      customerTrainingList,
      customerThoughtsList,
      customerCard
    } = this.ui;

    const averageSatisfaction = this.getAverageSatisfaction();

    if (bankValue) bankValue.textContent = this.formatEuro(this.money);
    if (popularityValue) popularityValue.textContent = this.getPopularityStars();
    if (monthlyCostsValue) monthlyCostsValue.textContent = this.formatEuro(this.getMonthlyCosts());
    if (projectedIncomeValue) {
      projectedIncomeValue.textContent = this.formatEuro(this.members * this.subscriptionFee);
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
    if (subscriptionInput && document.activeElement !== subscriptionInput) {
      subscriptionInput.value = this.formatEuro(this.subscriptionFee);
    }
    if (membersGainedValue) membersGainedValue.textContent = `${this.lastCycleGained}`;
    if (membersLostValue) membersLostValue.textContent = `${this.lastCycleChurn}`;
    statisticsButton?.classList.toggle('is-active', this.statisticsVisible);
    statisticsPanel?.classList.toggle('is-open', this.statisticsVisible);
    this.renderStatisticsTable(statisticsBody);

    const selected = this.items.find((item) => item.id === this.selectedDeviceId) ?? null;
    const selectedDecor = this.selectedDecor;
    const selectedDecorConfig = selectedDecor ? ITEM_CATALOG[selectedDecor.itemKey] : null;
    deviceCard?.classList.toggle('is-hidden', !selected && !selectedDecorConfig);

    if (deviceName) {
      if (!selected && !selectedDecorConfig) {
        deviceName.textContent = 'None selected';
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
        : 'Break chance next use: -';
    }

    if (deviceSellValue) {
      deviceSellValue.textContent = selectedDecorConfig
        ? `Sell price: $${Math.floor(selectedDecorConfig.cost / 2)}`
        : selected
        ? `Sell price: $${this.getSellPrice(selected)}`
        : 'Sell price: -';
    }

    if (sellDeviceButton) {
      sellDeviceButton.disabled = !selected && !selectedDecorConfig;
    }

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

  renderStatisticsTable(statisticsBody) {
    if (!statisticsBody) return;

    statisticsBody.innerHTML = '';

    for (let index = 0; index < 6; index += 1) {
      const row = document.createElement('tr');
      const entry = this.monthlyStatistics[index] ?? null;

      const monthCell = document.createElement('td');
      const gainedCell = document.createElement('td');
      const lostCell = document.createElement('td');
      const profitCell = document.createElement('td');

      monthCell.textContent = entry ? entry.monthLabel : '-';
      gainedCell.textContent = entry ? `${entry.membersGained}` : '-';
      lostCell.textContent = entry ? `${entry.membersLost}` : '-';
      profitCell.textContent = entry ? this.formatSignedEuro(entry.profit) : '-';

      if (entry && entry.profit < 0) {
        profitCell.classList.add('is-negative');
      }

      row.appendChild(monthCell);
      row.appendChild(gainedCell);
      row.appendChild(lostCell);
      row.appendChild(profitCell);
      statisticsBody.appendChild(row);
    }
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
      const cancelChance = Math.max(0, 90 - member.lastVisitSatisfaction);
      meta.textContent = `${member.type} • Cancel: ${cancelChance}% • ${member.monthsSubscribed} mo`;

      info.appendChild(name);
      info.appendChild(meta);
      row.appendChild(icon);
      row.appendChild(info);
      memberListBody.appendChild(row);
    }
  }
};
