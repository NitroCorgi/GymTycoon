import { drawText } from '../../ui/drawText.js';
import { EXTERIOR_MAP_STYLE, getItemUsageSeconds, ITEM_CATALOG, REPAIR_SECONDS } from '../mainSceneConfig.js';

export const layoutRenderMethods = {
  getExteriorBandRanges() {
    let coveredDistance = 0;
    return EXTERIOR_MAP_STYLE.tileBandsFromEntranceOutward.map((band) => {
      const width = Math.max(0, Math.floor(band.width ?? 0));
      const startDistance = coveredDistance + 1;
      coveredDistance += width;
      return {
        type: band.type,
        width,
        startDistance,
        endDistance: coveredDistance
      };
    });
  },

  getExteriorCenterDistanceForType(type, position = 'first') {
    const matchingRanges = this.getExteriorBandRanges().filter((range) => range.type === type && range.width > 0);
    if (matchingRanges.length === 0) {
      return null;
    }

    const range = position === 'last' ? matchingRanges[matchingRanges.length - 1] : matchingRanges[0];
    return Math.round((range.startDistance + range.endDistance) / 2);
  },

  getStreetCenterOutsideDistance() {
    return this.getExteriorCenterDistanceForType('street', 'first');
  },

  getNearSidewalkOutsideDistance() {
    return this.getExteriorCenterDistanceForType('sidewalk', 'first');
  },

  getFarSidewalkOutsideDistance() {
    return this.getExteriorCenterDistanceForType('sidewalk', 'last');
  },

  getExteriorTraversalRowBounds() {
    const edgeOverscanTiles = Math.max(0, Math.floor(EXTERIOR_MAP_STYLE.edgeOverscanTiles ?? 0));
    return {
      startRow: -edgeOverscanTiles,
      endRow: this.mapRows + edgeOverscanTiles - 1
    };
  },

  getExteriorTileCenter(row, outsideDistanceFromEntrance, mapLayout) {
    return this.tileToScreen(row, -outsideDistanceFromEntrance, mapLayout);
  },

  getExteriorTileType(outsideDistanceFromEntrance) {
    if (!Number.isFinite(outsideDistanceFromEntrance) || outsideDistanceFromEntrance < 1) {
      return null;
    }

    let coveredDistance = 0;
    for (const band of EXTERIOR_MAP_STYLE.tileBandsFromEntranceOutward) {
      const bandWidth = Math.max(0, Math.floor(band.width ?? 0));
      coveredDistance += bandWidth;
      if (outsideDistanceFromEntrance <= coveredDistance) {
        return band.type ?? null;
      }
    }

    return null;
  },

  drawExteriorTile(context, center, mapLayout, tileType, variationIndex) {
    const tileStyle = EXTERIOR_MAP_STYLE.tileTypes?.[tileType] ?? {};
    const fallbackColor = tileStyle.fallbackColor ?? '#9ca3af';
    const image = this.getAssetImage(tileStyle.assetPath);
    const hasDrawableImage = image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;

    context.beginPath();
    context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
    context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
    context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
    context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
    context.closePath();

    if (hasDrawableImage) {
      context.save();
      context.clip();
      context.imageSmoothingEnabled = true;
      context.drawImage(
        image,
        center.x - mapLayout.tileWidth / 2,
        center.y - mapLayout.tileHeight / 2,
        mapLayout.tileWidth,
        mapLayout.tileHeight
      );
      context.restore();
    } else {
      const fallbackShade = variationIndex % 2 === 0 ? fallbackColor : this.tintHex(fallbackColor, -8);
      context.fillStyle = fallbackShade;
      context.fill();
    }

    context.strokeStyle = '#0f172a';
    context.stroke();
  },

  drawExteriorGround(context, mapLayout) {
    const { startRow, endRow } = this.getExteriorTraversalRowBounds();
    const totalBandWidth = EXTERIOR_MAP_STYLE.tileBandsFromEntranceOutward.reduce((sum, band) => {
      const width = Math.max(0, Math.floor(band.width ?? 0));
      return sum + width;
    }, 0);

    if (totalBandWidth <= 0) {
      return;
    }

    for (let row = startRow; row <= endRow; row += 1) {
      for (let outsideDistance = totalBandWidth; outsideDistance >= 1; outsideDistance -= 1) {
        const tileType = this.getExteriorTileType(outsideDistance);
        if (!tileType) {
          continue;
        }

        const center = this.getExteriorTileCenter(row, outsideDistance, mapLayout);
        this.drawExteriorTile(context, center, mapLayout, tileType, row + outsideDistance);
      }
    }
  },

  getMapLayout(canvasWidth, canvasHeight) {
    const padding = 0;
    const availableWidth = Math.max(220, canvasWidth - padding * 2);
    const availableHeight = Math.max(180, canvasHeight - padding * 2);

    const tileWidthByWidth = availableWidth / (this.mapCols + this.mapRows);
    const tileWidthByHeight = (availableHeight * 2) / (this.mapCols + this.mapRows);
    const tileWidth = Math.floor(Math.min(tileWidthByWidth, tileWidthByHeight));
    const tileHeight = tileWidth / 2;

    const mapHeight = ((this.mapCols + this.mapRows) * tileHeight) / 2;
    const originX = canvasWidth / 2 + this.mapOffsetX;
    const originY = (canvasHeight - mapHeight) / 2 + tileHeight + this.mapOffsetY;

    return {
      tileWidth,
      tileHeight,
      originX,
      originY
    };
  },

  getMonthlyCosts() {
    const itemMonthlyCosts = this.items.reduce((sum, item) => sum + (ITEM_CATALOG[item.key].monthlyCost ?? 0), 0);
    return this.rentAmount + itemMonthlyCosts;
  },

  getEntrancePoints(mapLayout) {
    const doorEdge = this.getLeftBorderEdge(this.entranceTile.row, mapLayout);
    const doorMidX = (doorEdge.a.x + doorEdge.b.x) / 2;
    const doorMidY = (doorEdge.a.y + doorEdge.b.y) / 2;

    return {
      inside: {
        x: doorMidX + mapLayout.tileWidth * 0.26,
        y: doorMidY + mapLayout.tileHeight * 0.1
      },
      outside: {
        x: doorMidX - mapLayout.tileWidth * 0.9,
        y: doorMidY - mapLayout.tileHeight * 0.9
      }
    };
  },

  tileToScreen(row, col, mapLayout) {
    const x = mapLayout.originX + (col - row) * (mapLayout.tileWidth / 2);
    const y = mapLayout.originY + (col + row) * (mapLayout.tileHeight / 2);
    return { x, y };
  },

  getDeviceAnchor(item, mapLayout) {
    const center = this.tileToScreen(item.row, item.col, mapLayout);
    return {
      x: center.x,
      y: center.y + mapLayout.tileHeight * 0.02
    };
  },

  getItemAssetForRotation(itemKey, rotation = 0) {
    const itemConfig = ITEM_CATALOG[itemKey];
    const assetRotations = itemConfig?.assetRotations;
    if (!Array.isArray(assetRotations) || assetRotations.length === 0) {
      return null;
    }

    const normalizedRotation = ((rotation % assetRotations.length) + assetRotations.length) % assetRotations.length;
    return assetRotations[normalizedRotation] ?? assetRotations[0] ?? null;
  },

  getAssetImage(assetSource) {
    if (!assetSource) return null;

    if (!this.assetImageCache) {
      this.assetImageCache = new Map();
    }

    const cachedImage = this.assetImageCache.get(assetSource);
    if (cachedImage) {
      return cachedImage;
    }

    const image = new Image();
    image.src = assetSource;
    this.assetImageCache.set(assetSource, image);
    return image;
  },

  drawItemAssetSprite(context, item, mapLayout, center, footprint) {
    const itemConfig = ITEM_CATALOG[item.key] ?? {};
    const assetSource = this.getItemAssetForRotation(item.key, item.rotation ?? 0);
    if (!assetSource) return false;

    const image = this.getAssetImage(assetSource);
    if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return false;
    }

    const normalizedRotation = ((item.rotation ?? 0) % 4 + 4) % 4;
    const assetGroundScale = itemConfig.assetGroundScale ?? 1;
    const assetOffsetX =
      itemConfig.assetOffsetXByRotation?.[normalizedRotation] ?? itemConfig.assetOffsetX ?? 0;
    const assetOffsetY =
      itemConfig.assetOffsetYByRotation?.[normalizedRotation] ?? itemConfig.assetOffsetY ?? 0;

    const baseWest = this.tileToScreen(item.row + footprint.rows - 0.5, item.col - 0.5, mapLayout);
    const baseEast = this.tileToScreen(item.row - 0.5, item.col + footprint.cols - 0.5, mapLayout);
    const baseSouth = this.tileToScreen(item.row + footprint.rows - 0.5, item.col + footprint.cols - 0.5, mapLayout);

    const footprintWidth = Math.abs(baseEast.x - baseWest.x);
    const imageAspect = image.naturalHeight / image.naturalWidth;

    const drawWidth = footprintWidth * assetGroundScale;
    const drawHeight = drawWidth * imageAspect;
    const anchorX = center.x + mapLayout.tileWidth * assetOffsetX;
    const anchorY = baseSouth.y + mapLayout.tileHeight * assetOffsetY;
    const drawX = anchorX - drawWidth / 2;
    const drawY = anchorY - drawHeight;

    context.save();
    context.imageSmoothingEnabled = true;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
    return true;
  },

  getTileVertices(row, col, mapLayout) {
    const center = this.tileToScreen(row, col, mapLayout);
    return {
      north: { x: center.x, y: center.y - mapLayout.tileHeight / 2 },
      east: { x: center.x + mapLayout.tileWidth / 2, y: center.y },
      south: { x: center.x, y: center.y + mapLayout.tileHeight / 2 },
      west: { x: center.x - mapLayout.tileWidth / 2, y: center.y }
    };
  },

  getTopBorderEdge(col, mapLayout) {
    const vertices = this.getTileVertices(0, col, mapLayout);
    return {
      a: vertices.north,
      b: vertices.east
    };
  },

  getLeftBorderEdge(row, mapLayout) {
    const vertices = this.getTileVertices(row, 0, mapLayout);
    return {
      a: vertices.north,
      b: vertices.west
    };
  },

  screenToTile(x, y, mapLayout) {
    const dx = x - mapLayout.originX;
    const dy = y - mapLayout.originY;

    const col = Math.floor((dx / (mapLayout.tileWidth / 2) + dy / (mapLayout.tileHeight / 2)) / 2);
    const row = Math.floor((dy / (mapLayout.tileHeight / 2) - dx / (mapLayout.tileWidth / 2)) / 2);

    if (!this.isTileAvailable(row, col)) {
      return null;
    }

    const center = this.tileToScreen(row, col, mapLayout);
    const inDiamond =
      Math.abs(x - center.x) / (mapLayout.tileWidth / 2) +
        Math.abs(y - center.y) / (mapLayout.tileHeight / 2) <=
      1;

    if (!inDiamond) {
      return null;
    }

    return this.isTileAvailable(row, col) ? { row, col } : null;
  },

  render(context, game) {
    const mapLayout = this.getMapLayout(game.canvas.width, game.canvas.height);
    this.drawMap(context, mapLayout);
    this.drawPeople(context, 'outside');
    this.drawWallOverlays(context, mapLayout);
    this.drawItems(context, mapLayout);
    this.drawPlacementPreview(context, mapLayout);
    this.drawPeople(context, 'inside');
    this.drawHud(context);
    this.drawPeopleSatisfactionOverlay(context);
  },

  drawMap(context, mapLayout) {
    this.drawExteriorGround(context, mapLayout);

    let placementPreviewKeys = null;
    let placementValid = false;

    if (this.buyMode && this.hoveredTile && ITEM_CATALOG[this.selectedItemKey]) {
      const previewTiles = this.getPlacementTilesForItem(
        this.hoveredTile.row,
        this.hoveredTile.col,
        this.selectedItemKey,
        this.currentPlacementRotation
      );

      placementPreviewKeys = new Set(
        previewTiles
          .filter((tile) => this.isTileAvailable(tile.row, tile.col))
          .map((tile) => `${tile.row}:${tile.col}`)
      );

      placementValid = this.canPlaceItemAt(
        this.hoveredTile.row,
        this.hoveredTile.col,
        this.selectedItemKey,
        this.currentPlacementRotation
      );
    }

    for (let row = 0; row < this.mapRows; row += 1) {
      for (let col = 0; col < this.mapCols; col += 1) {
        if (!this.isTileAvailable(row, col)) {
          continue;
        }

        const center = this.tileToScreen(row, col, mapLayout);
        const hovered = this.hoveredTile?.row === row && this.hoveredTile?.col === col;
        const isEntrance = this.entranceTile.row === row && this.entranceTile.col === col;
        const isPlacementTile = placementPreviewKeys?.has(`${row}:${col}`) ?? false;
        const isSelectedFloorDecor =
          this.selectedDecor?.decorTarget === 'floor' &&
          this.selectedDecor?.row === row &&
          this.selectedDecor?.col === col;

        context.beginPath();
        context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
        context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
        context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
        context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
        context.closePath();

        if (isEntrance) {
          context.fillStyle = '#166534';
        } else if (isPlacementTile) {
          context.fillStyle = placementValid ? '#14532d' : '#7f1d1d';
        } else {
          const floorDecorKey = this.floorDecorTiles?.[row]?.[col];
          const hasWoodFloor = ITEM_CATALOG[floorDecorKey]?.decorTarget === 'floor';
          const floorColor = hasWoodFloor ? ((row + col) % 2 === 0 ? '#7c4a20' : '#6b3f1b') : (row + col) % 2 === 0 ? '#1f2937' : '#17202f';
          context.fillStyle = hovered ? '#334155' : floorColor;
        }
        context.fill();

        context.strokeStyle = '#0f172a';
        context.stroke();

        if (isSelectedFloorDecor) {
          context.strokeStyle = '#f8fafc';
          context.lineWidth = 2;
          context.stroke();
          context.lineWidth = 1;
        }
      }
    }

  },

  drawEntranceWall(context, mapLayout) {
    const doorEdge = this.getLeftBorderEdge(this.entranceTile.row, mapLayout);
    const wallHeight = mapLayout.tileHeight * 2.9;

    context.fillStyle = '#0f2d1a';
    context.beginPath();
    context.moveTo(doorEdge.a.x, doorEdge.a.y);
    context.lineTo(doorEdge.b.x, doorEdge.b.y);
    context.lineTo(doorEdge.b.x, doorEdge.b.y - wallHeight);
    context.lineTo(doorEdge.a.x, doorEdge.a.y - wallHeight);
    context.closePath();
    context.fill();

    context.strokeStyle = '#86efac';
    context.stroke();

    context.fillStyle = '#0b131f';
    context.beginPath();
    context.moveTo(doorEdge.a.x, doorEdge.a.y);
    context.lineTo(doorEdge.b.x, doorEdge.b.y);
    context.lineTo(doorEdge.b.x, doorEdge.b.y - wallHeight * 0.72);
    context.lineTo(doorEdge.a.x, doorEdge.a.y - wallHeight * 0.72);
    context.closePath();
    context.fill();
  },

  drawWallOverlays(context, mapLayout) {
    this.drawSideWalls(context, mapLayout);
    this.drawEntranceWall(context, mapLayout);
  },

  drawSideWalls(context, mapLayout) {
    const wallHeight = mapLayout.tileHeight * 2.9;

    for (let col = 0; col < this.mapCols; col += 1) {
      if (!this.isTileAvailable(0, col)) {
        continue;
      }

      const topEdge = this.getTopBorderEdge(col, mapLayout);

      context.beginPath();
      context.moveTo(topEdge.a.x, topEdge.a.y);
      context.lineTo(topEdge.b.x, topEdge.b.y);
      context.lineTo(topEdge.b.x, topEdge.b.y - wallHeight);
      context.lineTo(topEdge.a.x, topEdge.a.y - wallHeight);
      context.closePath();

      const wallpaperKey = this.wallpaperTopByCol?.[col];
      const hasWallpaper = ITEM_CATALOG[wallpaperKey]?.decorTarget === 'wall';
      context.fillStyle = hasWallpaper ? '#f3f4f6' : '#111827';
      context.fill();

      if (this.selectedDecor?.decorTarget === 'wall' && this.selectedDecor?.side === 'top' && this.selectedDecor?.col === col) {
        context.strokeStyle = '#f8fafc';
        context.lineWidth = 2;
        context.stroke();
        context.lineWidth = 1;
      }

      context.strokeStyle = '#0b1220';
      context.stroke();
    }

    for (let row = 0; row < this.mapRows; row += 1) {
      if (row === this.entranceTile.row) {
        continue;
      }
      if (!this.isTileAvailable(row, 0)) {
        continue;
      }

      const leftEdge = this.getLeftBorderEdge(row, mapLayout);

      context.beginPath();
      context.moveTo(leftEdge.a.x, leftEdge.a.y);
      context.lineTo(leftEdge.b.x, leftEdge.b.y);
      context.lineTo(leftEdge.b.x, leftEdge.b.y - wallHeight);
      context.lineTo(leftEdge.a.x, leftEdge.a.y - wallHeight);
      context.closePath();

      const wallpaperKey = this.wallpaperLeftByRow?.[row];
      const hasWallpaper = ITEM_CATALOG[wallpaperKey]?.decorTarget === 'wall';
      context.fillStyle = hasWallpaper ? '#e5e7eb' : '#0f172a';
      context.fill();

      if (this.selectedDecor?.decorTarget === 'wall' && this.selectedDecor?.side === 'left' && this.selectedDecor?.row === row) {
        context.strokeStyle = '#f8fafc';
        context.lineWidth = 2;
        context.stroke();
        context.lineWidth = 1;
      }

      context.strokeStyle = '#0b1220';
      context.stroke();
    }
  },

  drawItems(context, mapLayout) {
    const sortedItems = [...this.items].sort((left, right) => {
      const leftFootprint = this.getPlacementDimensions(left.key, left.rotation ?? 0);
      const rightFootprint = this.getPlacementDimensions(right.key, right.rotation ?? 0);
      const leftDepth = left.row + left.col + (leftFootprint.rows + leftFootprint.cols) * 0.5;
      const rightDepth = right.row + right.col + (rightFootprint.rows + rightFootprint.cols) * 0.5;

      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }

      if (left.row !== right.row) {
        return left.row - right.row;
      }

      return left.col - right.col;
    });

    for (const item of sortedItems) {
      this.drawSingleItem(context, mapLayout, item);
    }
  },

  drawPlacementPreview(context, mapLayout) {
    if (!this.buyMode) return;
    if (!ITEM_CATALOG[this.selectedItemKey]) return;

    const selectedItem = ITEM_CATALOG[this.selectedItemKey];
    if (selectedItem.decorTarget === 'floor') {
      if (!this.hoveredTile) return;

      const center = this.tileToScreen(this.hoveredTile.row, this.hoveredTile.col, mapLayout);
      const canPlace = this.canPlaceItemAt(
        this.hoveredTile.row,
        this.hoveredTile.col,
        this.selectedItemKey,
        this.currentPlacementRotation
      );

      context.save();
      context.globalAlpha = canPlace ? 0.6 : 0.35;
      context.beginPath();
      context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
      context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
      context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
      context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
      context.closePath();
      context.fillStyle = canPlace ? '#b45309' : '#7f1d1d';
      context.fill();
      context.restore();
      return;
    }

    if (selectedItem.decorTarget === 'wall') {
      const wallTarget = this.getWallpaperPlacementTarget();
      if (!wallTarget) return;

      const canPlace = this.canPlaceItemAt(
        wallTarget.row,
        wallTarget.col,
        this.selectedItemKey,
        this.currentPlacementRotation
      );
      const wallHeight = mapLayout.tileHeight * 2.9;

      context.save();
      context.globalAlpha = canPlace ? 0.6 : 0.35;

      if (wallTarget.side === 'top') {
        const topEdge = this.getTopBorderEdge(wallTarget.col, mapLayout);
        context.beginPath();
        context.moveTo(topEdge.a.x, topEdge.a.y);
        context.lineTo(topEdge.b.x, topEdge.b.y);
        context.lineTo(topEdge.b.x, topEdge.b.y - wallHeight);
        context.lineTo(topEdge.a.x, topEdge.a.y - wallHeight);
        context.closePath();
        context.fillStyle = canPlace ? '#f8fafc' : '#7f1d1d';
        context.fill();
      }

      if (wallTarget.side === 'left') {
        const leftEdge = this.getLeftBorderEdge(wallTarget.row, mapLayout);
        context.beginPath();
        context.moveTo(leftEdge.a.x, leftEdge.a.y);
        context.lineTo(leftEdge.b.x, leftEdge.b.y);
        context.lineTo(leftEdge.b.x, leftEdge.b.y - wallHeight);
        context.lineTo(leftEdge.a.x, leftEdge.a.y - wallHeight);
        context.closePath();
        context.fillStyle = canPlace ? '#f8fafc' : '#7f1d1d';
        context.fill();
      }

      context.restore();
      return;
    }

    if (!this.hoveredTile) return;

    const previewItem = {
      id: 0,
      key: this.selectedItemKey,
      row: this.hoveredTile.row,
      col: this.hoveredTile.col,
      rotation: this.currentPlacementRotation,
      occupiedByPersonId: null,
      queue: [],
      repairSecondsRemaining: 0
    };

    const canPlace = this.canPlaceItemAt(
      this.hoveredTile.row,
      this.hoveredTile.col,
      this.selectedItemKey,
      this.currentPlacementRotation
    );

    this.drawSingleItem(context, mapLayout, previewItem, {
      alpha: canPlace ? 0.5 : 0.32,
      drawStatus: false,
      drawProgress: false,
      drawQueue: false
    });
  },

  drawSingleItem(
    context,
    mapLayout,
    item,
    { alpha = 1, drawStatus = true, drawProgress = true, drawQueue = true } = {}
  ) {
    const itemConfig = ITEM_CATALOG[item.key];
    if (!itemConfig) return;

    const { rows: footprintRows, cols: footprintCols } = this.getPlacementDimensions(item.key, item.rotation ?? 0);
    const center = this.tileToScreen(
      item.row + (footprintRows - 1) / 2,
      item.col + (footprintCols - 1) / 2,
      mapLayout
    );

    context.save();
    context.globalAlpha = alpha;

    const renderedItemAsset = this.drawItemAssetSprite(context, item, mapLayout, center, {
      rows: footprintRows,
      cols: footprintCols
    });

    if (!renderedItemAsset) {
      const isTurnstile = item.key === 'turnstile';
      const cubeHeight = isTurnstile ? mapLayout.tileHeight * 0.45 : mapLayout.tileHeight * 0.75;
      let baseNorth = this.tileToScreen(item.row - 0.5, item.col - 0.5, mapLayout);
      let baseEast = this.tileToScreen(item.row - 0.5, item.col + footprintCols - 0.5, mapLayout);
      let baseSouth = this.tileToScreen(item.row + footprintRows - 0.5, item.col + footprintCols - 0.5, mapLayout);
      let baseWest = this.tileToScreen(item.row + footprintRows - 0.5, item.col - 0.5, mapLayout);

      if (isTurnstile) {
        const shrink = 0.68;
        baseNorth = {
          x: center.x + (baseNorth.x - center.x) * shrink,
          y: center.y + (baseNorth.y - center.y) * shrink
        };
        baseEast = {
          x: center.x + (baseEast.x - center.x) * shrink,
          y: center.y + (baseEast.y - center.y) * shrink
        };
        baseSouth = {
          x: center.x + (baseSouth.x - center.x) * shrink,
          y: center.y + (baseSouth.y - center.y) * shrink
        };
        baseWest = {
          x: center.x + (baseWest.x - center.x) * shrink,
          y: center.y + (baseWest.y - center.y) * shrink
        };
      }

      const topNorth = { x: baseNorth.x, y: baseNorth.y - cubeHeight };
      const topEast = { x: baseEast.x, y: baseEast.y - cubeHeight };
      const topSouth = { x: baseSouth.x, y: baseSouth.y - cubeHeight };
      const topWest = { x: baseWest.x, y: baseWest.y - cubeHeight };

      const topColor = itemConfig.color;
      const leftColor = this.tintHex(itemConfig.color, -26);
      const rightColor = this.tintHex(itemConfig.color, -14);

      context.beginPath();
      context.moveTo(topNorth.x, topNorth.y);
      context.lineTo(topEast.x, topEast.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.lineTo(topWest.x, topWest.y);
      context.closePath();
      context.fillStyle = topColor;
      context.fill();

      context.beginPath();
      context.moveTo(topWest.x, topWest.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.lineTo(baseSouth.x, baseSouth.y);
      context.lineTo(baseWest.x, baseWest.y);
      context.closePath();
      context.fillStyle = leftColor;
      context.fill();

      context.beginPath();
      context.moveTo(topEast.x, topEast.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.lineTo(baseSouth.x, baseSouth.y);
      context.lineTo(baseEast.x, baseEast.y);
      context.closePath();
      context.fillStyle = rightColor;
      context.fill();

      context.strokeStyle = '#020617';
      context.beginPath();
      context.moveTo(topNorth.x, topNorth.y);
      context.lineTo(topEast.x, topEast.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.lineTo(topWest.x, topWest.y);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.moveTo(topWest.x, topWest.y);
      context.lineTo(baseWest.x, baseWest.y);
      context.lineTo(baseSouth.x, baseSouth.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.stroke();
      context.beginPath();
      context.moveTo(topEast.x, topEast.y);
      context.lineTo(baseEast.x, baseEast.y);
      context.lineTo(baseSouth.x, baseSouth.y);
      context.lineTo(topSouth.x, topSouth.y);
      context.stroke();

      context.save();
      context.font = '9px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      context.fillStyle = '#f8fafc';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      const leftLabelX = (topWest.x + baseSouth.x) / 2 - mapLayout.tileWidth * 0.06;
      const leftLabelY = (topWest.y + baseSouth.y) / 2;
      context.save();
      context.translate(leftLabelX, leftLabelY);
      context.rotate(-0.56);
      context.fillText(itemConfig.shortLabel, 0, 0);
      context.restore();

      const rightLabelX = (topEast.x + baseSouth.x) / 2 + mapLayout.tileWidth * 0.06;
      const rightLabelY = (topEast.y + baseSouth.y) / 2;
      context.save();
      context.translate(rightLabelX, rightLabelY);
      context.rotate(0.56);
      context.fillText(itemConfig.shortLabel, 0, 0);
      context.restore();

      context.restore();
    }

    context.restore();

    const isBroken = this.isItemBroken(item);
    const isLocker = itemConfig.type === 'locker';
    const lockerStatus = `${this.getLockerOccupancy(item)}/${this.getLockerCapacity(item)}`;
    const isBusy = item.occupiedByPersonId !== null;
    const statusText = isLocker ? lockerStatus : isBroken ? 'Broken' : isBusy ? 'Busy' : '';
    if (drawStatus && statusText) {
      drawText(
        context,
        statusText,
        center.x - mapLayout.tileWidth * 0.2,
        center.y + mapLayout.tileHeight * 0.62,
        isBroken ? '#fda4af' : '#cbd5e1'
      );
    }

    if (drawProgress && isBroken) {
      const repairProgress = Math.min(1, Math.max(0, 1 - item.repairSecondsRemaining / REPAIR_SECONDS));
      const barWidth = mapLayout.tileWidth * 0.34;
      const barX = center.x - barWidth / 2;
      const barY = center.y + mapLayout.tileHeight * 0.73;

      context.fillStyle = '#3f1728';
      context.fillRect(barX, barY, barWidth, 4);

      context.fillStyle = '#fb7185';
      context.fillRect(barX, barY, barWidth * repairProgress, 4);
    } else if (drawProgress && item.occupiedByPersonId !== null && itemConfig.type !== 'locker') {
      const busyProgress = this.getBusyProgress(item);
      const barWidth = mapLayout.tileWidth * 0.34;
      const barX = center.x - barWidth / 2;
      const barY = center.y + mapLayout.tileHeight * 0.73;

      context.fillStyle = '#1e293b';
      context.fillRect(barX, barY, barWidth, 4);

      context.fillStyle = '#22d3ee';
      context.fillRect(barX, barY, barWidth * busyProgress, 4);
    }

    if (drawQueue && item.queue.length > 0 && itemConfig.type !== 'locker') {
      drawText(
        context,
        `Queue: ${item.queue.length}`,
        center.x - mapLayout.tileWidth * 0.24,
        center.y + mapLayout.tileHeight * 1.08,
        '#facc15'
      );
    }
  },

  getBusyProgress(item) {
    const occupiedPerson = this.people.find((person) => person.id === item.occupiedByPersonId);
    if (!occupiedPerson) return 0;

    const totalDuration = occupiedPerson.activityDuration ?? getItemUsageSeconds(item.key);

    const safeDuration = Math.max(1, totalDuration);
    const remainingRatio = occupiedPerson.trainingRemaining / safeDuration;
    return Math.min(1, Math.max(0, 1 - remainingRatio));
  },

  isPersonOutside(person) {
    return (
      person.state === 'to-entrance-sidewalk' ||
      person.state === 'sidewalk-passing' ||
      person.state === 'to-street' ||
      person.state === 'street-to-entrance' ||
      person.state === 'street-passing' ||
      person.state === 'entering' ||
      person.state === 'leaving' ||
      person.state === 'leaving-cross-street' ||
      person.state === 'leaving-far-sidewalk'
    );
  },

  drawPeople(context, layer = 'inside') {
    for (const person of this.people) {
      const isOutside = this.isPersonOutside(person);
      if (layer === 'outside' && !isOutside) {
        continue;
      }
      if (layer === 'inside' && isOutside) {
        continue;
      }

      if (person.id === this.selectedPersonId) {
        context.beginPath();
        context.arc(person.x, person.y, 10, 0, Math.PI * 2);
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.stroke();
        context.lineWidth = 1;
      }

      context.beginPath();
      context.arc(person.x, person.y, 7, 0, Math.PI * 2);
      const personColor = person.hasCompletedCheckIn && person.customerType?.color
        ? person.customerType.color
        : '#9ca3af';
      context.fillStyle = personColor;
      context.fill();
      context.strokeStyle = '#1e293b';
      context.stroke();

      if (person.isMember) {
        context.save();
        context.font = '9px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        context.fillStyle = '#f8fafc';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('★', person.x, person.y + 0.5);
        context.restore();
      }

    }
  },

  drawPeopleSatisfactionOverlay(context) {
    for (const person of this.people) {
      if (!person.showLeaveSatisfaction) {
        continue;
      }

      context.save();
      context.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      context.fillStyle = '#f8fafc';
      context.strokeStyle = '#020617';
      context.lineWidth = 3;
      context.textAlign = 'center';
      context.textBaseline = 'bottom';

      const satisfactionText = `${Math.round(person.visitSatisfaction)}`;
      const labelX = person.x;
      const labelY = person.y - 11;

      context.strokeText(satisfactionText, labelX, labelY);
      context.fillText(satisfactionText, labelX, labelY);
      context.restore();
    }
  },

  tintHex(hex, amount) {
    const hexValue = hex.replace('#', '');
    const bigint = Number.parseInt(hexValue, 16);

    const r = Math.min(255, Math.max(0, ((bigint >> 16) & 255) + amount));
    const g = Math.min(255, Math.max(0, ((bigint >> 8) & 255) + amount));
    const b = Math.min(255, Math.max(0, (bigint & 255) + amount));

    return `rgb(${r}, ${g}, ${b})`;
  },

  drawHud(context) {
    this.drawCycleProgressBar(context, 26, 24);
  },

  drawCycleProgressBar(context, x, y) {
    const barWidth = 140;
    const barHeight = 12;
    const progress = Math.min(1, this.cycleTimer / this.cycleIntervalSeconds);
    const monthLabel = `${String(this.currentMonth).padStart(2, '0')}/${String(this.currentYear).padStart(2, '0')}`;

    context.fillStyle = '#0f172a';
    context.fillRect(x, y, barWidth, barHeight);

    context.strokeStyle = '#334155';
    context.strokeRect(x, y, barWidth, barHeight);

    context.strokeStyle = '#22d3ee';
    context.fillStyle = '#22d3ee';
    context.fillRect(x + 1, y + 1, (barWidth - 2) * progress, barHeight - 2);

    drawText(context, monthLabel, x + 46, y - 6, '#cbd5e1');
  }
};
