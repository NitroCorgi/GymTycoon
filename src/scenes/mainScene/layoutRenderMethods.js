import { drawText } from '../../ui/drawText.js';
import { EXTERIOR_MAP_STYLE, getItemUsageSeconds, ITEM_CATALOG, REPAIR_SECONDS } from '../mainSceneConfig.js';
import defaultFloorTileAsset from '../../assets/components/floor_default.png';
import wallLeftAsset from '../../assets/components/wall_left.png';
import wallLeftEntranceAsset from '../../assets/components/wall_left_entrance.png';
import wallRightAsset from '../../assets/components/wall_right.png';

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

  drawExteriorTile(context, row, outsideDistance, mapLayout, tileType, variationIndex) {
    const tileStyle = EXTERIOR_MAP_STYLE.tileTypes?.[tileType] ?? {};
    const fallbackColor = tileStyle.fallbackColor ?? '#9ca3af';
    const image = this.getAssetImage(tileStyle.assetPath);
    const hasDrawableImage = image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
    const tileX = -outsideDistance;
    const tileY = row;
    const center = this.tileToScreen(row, tileX, mapLayout);

    context.beginPath();
    context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
    context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
    context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
    context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
    context.closePath();

    if (hasDrawableImage) {
      this.drawIsoGroundSprite(context, image, tileX, tileY, mapLayout);
    } else {
      const fallbackShade = variationIndex % 2 === 0 ? fallbackColor : this.tintHex(fallbackColor, -8);
      context.fillStyle = fallbackShade;
      context.fill();
    }
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

    const exteriorTiles = [];

    for (let row = startRow; row <= endRow; row += 1) {
      for (let outsideDistance = totalBandWidth; outsideDistance >= 1; outsideDistance -= 1) {
        const tileType = this.getExteriorTileType(outsideDistance);
        if (!tileType) {
          continue;
        }

        exteriorTiles.push({
          row,
          outsideDistance,
          tileType,
          depth: row - outsideDistance
        });
      }
    }

    exteriorTiles.sort((left, right) => {
      if (left.depth !== right.depth) {
        return left.depth - right.depth;
      }
      return left.row - right.row;
    });

    for (const tile of exteriorTiles) {
      this.drawExteriorTile(
        context,
        tile.row,
        tile.outsideDistance,
        mapLayout,
        tile.tileType,
        tile.row + tile.outsideDistance
      );
    }
  },

  getMapLayout(canvasWidth, canvasHeight) {
    const zoom = this.mapZoom ?? 1;
    const halfTileWidth = Math.max(1, Math.round(32 * zoom));
    const halfTileHeight = Math.max(1, Math.round(16 * zoom));
    const tileWidth = halfTileWidth * 2;
    const tileHeight = halfTileHeight * 2;

    const wallSpriteWidth = Math.max(1, Math.round(32 * zoom));
    const wallSpriteHeight = Math.max(1, Math.round(96 * zoom));

    const mapWidth = (this.mapCols + this.mapRows) * halfTileWidth;
    const mapHeight = (this.mapCols + this.mapRows) * halfTileHeight;
    const mapMinX = (canvasWidth - mapWidth) / 2 + this.mapOffsetX;
    const originX = Math.round(mapMinX + (this.mapRows - 1) * halfTileWidth);
    const originY = Math.round((canvasHeight - mapHeight) / 2 + this.mapOffsetY);

    return {
      tileWidth,
      tileHeight,
      halfTileWidth,
      halfTileHeight,
      wallSpriteWidth,
      wallSpriteHeight,
      mapWidth,
      mapHeight,
      originX,
      originY
    };
  },

  getWallHeight(mapLayout) {
    return Math.max(1, mapLayout.wallSpriteHeight - mapLayout.tileHeight);
  },

  gridToScreen(tileX, tileY, mapLayout) {
    return {
      x: (tileX - tileY) * mapLayout.halfTileWidth + mapLayout.originX,
      y: (tileX + tileY) * mapLayout.halfTileHeight + mapLayout.originY
    };
  },

  drawIsoGroundSprite(context, image, tileX, tileY, mapLayout) {
    const screen = this.gridToScreen(tileX, tileY, mapLayout);
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(image, Math.round(screen.x), Math.round(screen.y), mapLayout.tileWidth, mapLayout.tileHeight);
    context.restore();
  },

  drawIsoAnchoredSprite(
    context,
    image,
    tileX,
    tileY,
    mapLayout,
    { anchorX, anchorY, baseOffsetX, baseOffsetY, drawWidth, drawHeight }
  ) {
    const screen = this.gridToScreen(tileX, tileY, mapLayout);
    const resolvedBaseOffsetX = baseOffsetX ?? mapLayout.tileWidth / 2;
    const resolvedBaseOffsetY = baseOffsetY ?? mapLayout.tileHeight;
    const resolvedDrawWidth = drawWidth ?? image.naturalWidth;
    const resolvedDrawHeight = drawHeight ?? image.naturalHeight;
    const resolvedAnchorX = anchorX ?? resolvedDrawWidth / 2;
    const resolvedAnchorY = anchorY ?? resolvedDrawHeight;

    const drawX = Math.round(screen.x + resolvedBaseOffsetX - resolvedAnchorX);
    const drawY = Math.round(screen.y + resolvedBaseOffsetY - resolvedAnchorY);

    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(image, drawX, drawY, resolvedDrawWidth, resolvedDrawHeight);
    context.restore();
  },

  getWeeklyOpenHours() {
    if (!this.openingHoursSchedule?.getHoursForWeekday) {
      return 24 * 7;
    }

    let totalOpenHours = 0;
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const { openHour = 0, closeHour = 24 } = this.openingHoursSchedule.getHoursForWeekday(weekday);
      totalOpenHours += Math.max(0, closeHour - openHour);
    }

    return totalOpenHours;
  },

  getStaffMonthlyCosts() {
    const staffCostPerHour = this.getStaffCostPerHour?.() ?? 0;
    return staffCostPerHour * this.getWeeklyOpenHours();
  },

  getMonthlyCosts() {
    const itemMonthlyCosts = this.items.reduce((sum, item) => sum + (ITEM_CATALOG[item.key].monthlyCost ?? 0), 0);
    const upgradeMonthlyCosts = this.getPurchasedGymUpgradeMonthlyCost?.() ?? 0;
    const staffMonthlyCosts = this.getStaffMonthlyCosts?.() ?? 0;
    return this.rentAmount + itemMonthlyCosts + upgradeMonthlyCosts + staffMonthlyCosts;
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
    const topLeft = this.gridToScreen(col, row, mapLayout);
    return {
      x: topLeft.x + mapLayout.halfTileWidth,
      y: topLeft.y + mapLayout.halfTileHeight
    };
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

  getWallDecorAssetSource(itemKey, side) {
    const itemConfig = ITEM_CATALOG[itemKey];
    if (!itemConfig || itemConfig.decorTarget !== 'wall') {
      return null;
    }

    if (itemConfig.wallAssetBySide) {
      const sideKey = side === 'left' ? 'left' : 'right';
      const sideAsset = itemConfig.wallAssetBySide[sideKey];
      if (sideAsset) {
        return sideAsset;
      }
    }

    return this.getItemAssetForRotation(itemKey, side === 'left' ? 0 : 1);
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

  getWallTintedSprite(assetSource, tintHex, options = {}) {
    const sourceImage = this.getAssetImage(assetSource);
    if (!sourceImage?.complete || sourceImage.naturalWidth <= 0 || sourceImage.naturalHeight <= 0) {
      return null;
    }

    const normalizedTintHex = typeof tintHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(tintHex) ? tintHex : '#6ea0ff';
    const [targetRed, targetGreen, targetBlue] = this.hexToRgb(normalizedTintHex);
    const replaceSecondaryGray = options?.replaceSecondaryGray === true;
    const secondaryGrayValues =
      Array.isArray(options?.secondaryGrayValues) && options.secondaryGrayValues.length > 0
        ? options.secondaryGrayValues
            .filter((value) => Number.isFinite(value))
            .map((value) => Math.max(0, Math.min(255, Math.round(value))))
        : [199, 204];
    const secondaryGrayValueSet = new Set(secondaryGrayValues);
    const secondaryScale = Number.isFinite(options?.secondaryScale) ? options.secondaryScale : 0.75;
    const secondaryRed = Math.round(targetRed * secondaryScale);
    const secondaryGreen = Math.round(targetGreen * secondaryScale);
    const secondaryBlue = Math.round(targetBlue * secondaryScale);
    const replaceTertiaryGray = options?.replaceTertiaryGray === true;
    const tertiaryScale = Number.isFinite(options?.tertiaryScale) ? options.tertiaryScale : 0.5;
    const tertiaryRed = Math.round(targetRed * tertiaryScale);
    const tertiaryGreen = Math.round(targetGreen * tertiaryScale);
    const tertiaryBlue = Math.round(targetBlue * tertiaryScale);

    if (!this.wallTintedSpriteCache) {
      this.wallTintedSpriteCache = new Map();
    }

    const cacheKey = `${assetSource}|${normalizedTintHex.toLowerCase()}|${replaceSecondaryGray ? 'gray2' : 'none2'}|${secondaryGrayValues.join(',')}|${secondaryScale}|${replaceTertiaryGray ? 'gray3' : 'none3'}|${tertiaryScale}`;
    const cachedCanvas = this.wallTintedSpriteCache.get(cacheKey);
    if (cachedCanvas) {
      return cachedCanvas;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;

    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      return sourceImage;
    }

    canvasContext.drawImage(sourceImage, 0, 0);
    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < imageData.data.length; index += 4) {
      const red = imageData.data[index];
      const green = imageData.data[index + 1];
      const blue = imageData.data[index + 2];
      const alpha = imageData.data[index + 3];

      if (alpha > 0 && red === 255 && green === 255 && blue === 255) {
        imageData.data[index] = targetRed;
        imageData.data[index + 1] = targetGreen;
        imageData.data[index + 2] = targetBlue;
      } else if (
        replaceSecondaryGray &&
        alpha > 0 &&
        red === green &&
        green === blue &&
        secondaryGrayValueSet.has(red)
      ) {
        imageData.data[index] = secondaryRed;
        imageData.data[index + 1] = secondaryGreen;
        imageData.data[index + 2] = secondaryBlue;
      } else if (replaceTertiaryGray && alpha > 0 && red === 145 && green === 145 && blue === 145) {
        imageData.data[index] = tertiaryRed;
        imageData.data[index + 1] = tertiaryGreen;
        imageData.data[index + 2] = tertiaryBlue;
      }
    }

    canvasContext.putImageData(imageData, 0, 0);
    this.wallTintedSpriteCache.set(cacheKey, canvas);
    return canvas;
  },

  hexToRgb(hex) {
    const safeHex = typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#6ea0ff';
    const numericHex = Number.parseInt(safeHex.slice(1), 16);
    return [(numericHex >> 16) & 255, (numericHex >> 8) & 255, numericHex & 255];
  },

  drawWallFaceSprite(context, polygon, assetSource, tintColor, fallbackColor = '#111827') {
    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    context.lineTo(polygon[1].x, polygon[1].y);
    context.lineTo(polygon[2].x, polygon[2].y);
    context.lineTo(polygon[3].x, polygon[3].y);
    context.closePath();

    const tintedSprite = this.getWallTintedSprite(assetSource, tintColor);
    const hasDrawableSprite = tintedSprite && tintedSprite.width > 0 && tintedSprite.height > 0;

    if (!hasDrawableSprite) {
      context.fillStyle = fallbackColor;
      context.fill();
      return;
    }

    const minX = Math.min(polygon[0].x, polygon[1].x, polygon[2].x, polygon[3].x);
    const maxX = Math.max(polygon[0].x, polygon[1].x, polygon[2].x, polygon[3].x);
    const minY = Math.min(polygon[0].y, polygon[1].y, polygon[2].y, polygon[3].y);
    const maxY = Math.max(polygon[0].y, polygon[1].y, polygon[2].y, polygon[3].y);
    const drawX = Math.floor(minX) - 1;
    const drawY = Math.floor(minY) - 1;
    const drawWidth = Math.ceil(maxX) - Math.floor(minX) + 2;
    const drawHeight = Math.ceil(maxY) - Math.floor(minY) + 2;

    context.save();
    context.clip();
    context.imageSmoothingEnabled = false;
    context.drawImage(tintedSprite, drawX, drawY, drawWidth, drawHeight);
    context.restore();
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

    const drawSource =
      itemConfig.gymColorTint && this.gymMainColor
        ? this.getWallTintedSprite(assetSource, this.gymMainColor, {
            replaceSecondaryGray: itemConfig.gymColorTintSecondaryShade === true,
            secondaryScale: 0.75,
            replaceTertiaryGray: itemConfig.gymColorTintTertiaryShade === true,
            tertiaryScale: 0.5
          }) ?? image
        : image;

    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(drawSource, drawX, drawY, drawWidth, drawHeight);
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
    this.drawGymNameProjection(context, mapLayout);
    this.drawItems(context, mapLayout);
    this.drawPlacementPreview(context, mapLayout);
    this.drawPeople(context, 'inside');
    this.drawHud(context);
    this.drawPeopleSatisfactionOverlay(context);
  },

  drawGymNameProjection(context, mapLayout) {
    const gymName = typeof this.gymName === 'string' ? this.gymName.trim() : '';
    if (!gymName) {
      return;
    }

    const northEastCorner = this.getTileVertices(0, this.mapCols - 1, mapLayout).east;
    const southEastCorner = this.getTileVertices(this.mapRows - 1, this.mapCols - 1, mapLayout).south;
    const wallMidpoint = {
      x: (northEastCorner.x + southEastCorner.x) / 2,
      y: (northEastCorner.y + southEastCorner.y) / 2
    };
    const mapCenter = this.tileToScreen((this.mapRows - 1) / 2, (this.mapCols - 1) / 2, mapLayout);
    const outwardVector = {
      x: wallMidpoint.x - mapCenter.x,
      y: wallMidpoint.y - mapCenter.y
    };
    const outwardLength = Math.hypot(outwardVector.x, outwardVector.y) || 1;
    const outwardUnit = {
      x: outwardVector.x / outwardLength,
      y: outwardVector.y / outwardLength
    };
    const outwardDistance = mapLayout.tileWidth * 1.5;
    const labelX = wallMidpoint.x + outwardUnit.x * outwardDistance;
    const labelY = wallMidpoint.y + outwardUnit.y * outwardDistance;
    const fontSize = Math.max(26, Math.round(mapLayout.tileWidth * 0.82));

    context.save();
    context.translate(labelX, labelY);
    context.rotate(-Math.PI / 6);
    context.globalAlpha = 0.5;
    context.font = `900 ${fontSize}px Nunito, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#f8fafc';
    context.shadowColor = 'rgb(2 6 23 / 78%)';
    context.shadowOffsetX = 0;
    context.shadowOffsetY = Math.max(3, Math.round(fontSize * 0.1));
    context.shadowBlur = Math.max(4, Math.round(fontSize * 0.08));
    context.fillText(gymName.slice(0, 24), 0, 0);
    context.restore();
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

    for (let depth = 0; depth <= this.mapRows + this.mapCols - 2; depth += 1) {
      const rowStart = Math.max(0, depth - (this.mapCols - 1));
      const rowEnd = Math.min(this.mapRows - 1, depth);

      for (let row = rowStart; row <= rowEnd; row += 1) {
        const col = depth - row;
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
          context.fill();
        } else if (isPlacementTile) {
          context.fillStyle = placementValid ? '#14532d' : '#7f1d1d';
          context.fill();
        } else {
          const floorDecorKey = this.floorDecorTiles?.[row]?.[col];
          const hasWoodFloor = ITEM_CATALOG[floorDecorKey]?.decorTarget === 'floor';
          const floorDecorAssetSource = hasWoodFloor ? this.getItemAssetForRotation(floorDecorKey, 0) : null;
          const floorDecorImage = this.getAssetImage(floorDecorAssetSource);
          const hasFloorDecorSprite =
            floorDecorImage?.complete && floorDecorImage.naturalWidth > 0 && floorDecorImage.naturalHeight > 0;
          const defaultFloorImage = this.getAssetImage(defaultFloorTileAsset);
          const hasDefaultFloorSprite =
            defaultFloorImage?.complete && defaultFloorImage.naturalWidth > 0 && defaultFloorImage.naturalHeight > 0;

          if (hasWoodFloor && hasFloorDecorSprite) {
            this.drawIsoGroundSprite(context, floorDecorImage, col, row, mapLayout);

            if (hovered) {
              context.beginPath();
              context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
              context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
              context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
              context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
              context.closePath();
              context.fillStyle = 'rgb(51 65 85 / 45%)';
              context.fill();
            }
          } else if (!hasWoodFloor && hasDefaultFloorSprite) {
            this.drawIsoGroundSprite(context, defaultFloorImage, col, row, mapLayout);

            if (hovered) {
              context.beginPath();
              context.moveTo(center.x, center.y - mapLayout.tileHeight / 2);
              context.lineTo(center.x + mapLayout.tileWidth / 2, center.y);
              context.lineTo(center.x, center.y + mapLayout.tileHeight / 2);
              context.lineTo(center.x - mapLayout.tileWidth / 2, center.y);
              context.closePath();
              context.fillStyle = 'rgb(51 65 85 / 45%)';
              context.fill();
            }
          } else {
            const floorColor = hasWoodFloor
              ? (row + col) % 2 === 0
                ? '#7c4a20'
                : '#6b3f1b'
              : (row + col) % 2 === 0
                ? '#1f2937'
                : '#17202f';
            context.fillStyle = hovered ? '#334155' : floorColor;
            context.fill();
          }
        }

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
    const primaryColor =
      typeof this.gymMainColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(this.gymMainColor)
        ? this.gymMainColor
        : '#6ea0ff';

    const entranceWallSprite = this.getWallTintedSprite(wallLeftEntranceAsset, primaryColor);
    if (entranceWallSprite) {
      this.drawIsoAnchoredSprite(context, entranceWallSprite, -1, this.entranceTile.row, mapLayout, {
        anchorX: 0,
        anchorY: mapLayout.wallSpriteHeight,
        baseOffsetX: mapLayout.tileWidth / 2,
        baseOffsetY: mapLayout.tileHeight,
        drawWidth: mapLayout.wallSpriteWidth,
        drawHeight: mapLayout.wallSpriteHeight
      });
    }
  },

  drawWallOverlays(context, mapLayout) {
    this.drawSideWalls(context, mapLayout);
    this.drawEntranceWall(context, mapLayout);
  },

  drawWallTopStripe(context, edge, wallHeight, stripeHeight) {
    const stripeColor =
      typeof this.gymMainColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(this.gymMainColor)
        ? this.gymMainColor
        : '#6ea0ff';
    const topA = { x: edge.a.x, y: edge.a.y - wallHeight };
    const topB = { x: edge.b.x, y: edge.b.y - wallHeight };
    const bottomA = { x: topA.x, y: topA.y + stripeHeight };
    const bottomB = { x: topB.x, y: topB.y + stripeHeight };

    context.beginPath();
    context.moveTo(topA.x, topA.y);
    context.lineTo(topB.x, topB.y);
    context.lineTo(bottomB.x, bottomB.y);
    context.lineTo(bottomA.x, bottomA.y);
    context.closePath();
    context.fillStyle = stripeColor;
    context.fill();
  },

  drawSideWalls(context, mapLayout) {
    const wallHeight = this.getWallHeight(mapLayout);
    const primaryColor =
      typeof this.gymMainColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(this.gymMainColor)
        ? this.gymMainColor
        : '#6ea0ff';

    const wallSegments = [];

    for (let col = 0; col < this.mapCols; col += 1) {
      if (!this.isTileAvailable(0, col)) {
        continue;
      }

      const wallpaperKey = this.wallpaperTopByCol?.[col];
      const wallDecorAssetSource = this.getWallDecorAssetSource(wallpaperKey, 'top');
      const tintColor = wallDecorAssetSource ? null : primaryColor;

      wallSegments.push({
        tileX: col,
        tileY: -1,
        side: 'top',
        index: col,
        tintColor,
        wallDecorAssetSource,
        assetSource: wallRightAsset
      });

      if (this.selectedDecor?.decorTarget === 'wall' && this.selectedDecor?.side === 'top' && this.selectedDecor?.col === col) {
        const topEdge = this.getTopBorderEdge(col, mapLayout);
        context.beginPath();
        context.moveTo(topEdge.a.x + mapLayout.halfTileWidth, topEdge.a.y - mapLayout.halfTileHeight);
        context.lineTo(topEdge.b.x + mapLayout.halfTileWidth, topEdge.b.y - mapLayout.halfTileHeight);
        context.lineTo(
          topEdge.b.x + mapLayout.halfTileWidth,
          topEdge.b.y - mapLayout.halfTileHeight - wallHeight
        );
        context.lineTo(
          topEdge.a.x + mapLayout.halfTileWidth,
          topEdge.a.y - mapLayout.halfTileHeight - wallHeight
        );
        context.closePath();
        context.strokeStyle = '#f8fafc';
        context.lineWidth = 2;
        context.stroke();
        context.lineWidth = 1;
      }
    }

    for (let row = 0; row < this.mapRows; row += 1) {
      if (row === this.entranceTile.row) {
        continue;
      }
      if (!this.isTileAvailable(row, 0)) {
        continue;
      }

      const wallpaperKey = this.wallpaperLeftByRow?.[row];
      const wallDecorAssetSource = this.getWallDecorAssetSource(wallpaperKey, 'left');
      const tintColor = wallDecorAssetSource ? null : primaryColor;

      wallSegments.push({
        tileX: -1,
        tileY: row,
        side: 'left',
        index: row,
        tintColor,
        wallDecorAssetSource,
        assetSource: wallLeftAsset
      });

      if (this.selectedDecor?.decorTarget === 'wall' && this.selectedDecor?.side === 'left' && this.selectedDecor?.row === row) {
        const leftEdge = this.getLeftBorderEdge(row, mapLayout);
        context.beginPath();
        context.moveTo(leftEdge.a.x - mapLayout.halfTileWidth, leftEdge.a.y - mapLayout.halfTileHeight);
        context.lineTo(leftEdge.b.x - mapLayout.halfTileWidth, leftEdge.b.y - mapLayout.halfTileHeight);
        context.lineTo(
          leftEdge.b.x - mapLayout.halfTileWidth,
          leftEdge.b.y - mapLayout.halfTileHeight - wallHeight
        );
        context.lineTo(
          leftEdge.a.x - mapLayout.halfTileWidth,
          leftEdge.a.y - mapLayout.halfTileHeight - wallHeight
        );
        context.closePath();
        context.strokeStyle = '#f8fafc';
        context.lineWidth = 2;
        context.stroke();
        context.lineWidth = 1;
      }
    }

    wallSegments.sort((left, right) => {
      const leftDepth = left.tileX + left.tileY;
      const rightDepth = right.tileX + right.tileY;
      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }
      return left.tileX - right.tileX;
    });

    for (const segment of wallSegments) {
      const decorSprite = this.getWallTintedSprite(segment.wallDecorAssetSource, primaryColor);
      const hasDecorSprite =
        !!decorSprite &&
        (decorSprite.naturalWidth ?? decorSprite.width ?? 0) > 0 &&
        (decorSprite.naturalHeight ?? decorSprite.height ?? 0) > 0;
      const wallSprite = hasDecorSprite
        ? decorSprite
        : this.getWallTintedSprite(segment.assetSource, segment.tintColor);
      if (!wallSprite) {
        continue;
      }

      this.drawIsoAnchoredSprite(context, wallSprite, segment.tileX, segment.tileY, mapLayout, {
        anchorX: segment.side === 'left' ? 0 : mapLayout.wallSpriteWidth,
        anchorY: mapLayout.wallSpriteHeight,
        baseOffsetX: mapLayout.tileWidth / 2,
        baseOffsetY: mapLayout.tileHeight,
        drawWidth: mapLayout.wallSpriteWidth,
        drawHeight: mapLayout.wallSpriteHeight
      });
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
      const wallDecorAssetSource = this.getWallDecorAssetSource(this.selectedItemKey, wallTarget.side);
      const previewTintColor =
        typeof this.gymMainColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(this.gymMainColor)
          ? this.gymMainColor
          : '#6ea0ff';
      const wallDecorSprite = this.getWallTintedSprite(wallDecorAssetSource, previewTintColor);
      const hasWallDecorSprite =
        !!wallDecorSprite &&
        (wallDecorSprite.naturalWidth ?? wallDecorSprite.width ?? 0) > 0 &&
        (wallDecorSprite.naturalHeight ?? wallDecorSprite.height ?? 0) > 0;

      if (hasWallDecorSprite) {
        context.save();
        context.globalAlpha = canPlace ? 0.68 : 0.38;
        this.drawIsoAnchoredSprite(
          context,
          wallDecorSprite,
          wallTarget.side === 'top' ? wallTarget.col : -1,
          wallTarget.side === 'top' ? -1 : wallTarget.row,
          mapLayout,
          {
            anchorX: wallTarget.side === 'left' ? 0 : mapLayout.wallSpriteWidth,
            anchorY: mapLayout.wallSpriteHeight,
            baseOffsetX: mapLayout.tileWidth / 2,
            baseOffsetY: mapLayout.tileHeight,
            drawWidth: mapLayout.wallSpriteWidth,
            drawHeight: mapLayout.wallSpriteHeight
          }
        );
        context.restore();
      }

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
      const totalRepairSeconds = item.repairDurationSeconds ?? REPAIR_SECONDS;
      const repairProgress = Math.min(1, Math.max(0, 1 - item.repairSecondsRemaining / totalRepairSeconds));
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
    const barHeight = 16;
    const timeUiState = this.getTimeBarUiState?.();
    const progress = Math.max(0, Math.min(1, timeUiState?.dayProgressNormalized ?? 0));
    const calendarLabel = timeUiState?.summaryLabel ?? 'Day 1/7 • Mon, 01 / 26';
    const timeLabel = `${timeUiState?.timeLabel ?? '00:00'} • ${timeUiState?.isOpen ? 'Open' : 'Closed'}`;
    const weatherLabel = timeUiState?.weatherEmoji ?? '☁️';
    const centerX = x + barWidth / 2;

    context.fillStyle = '#0f172a';
    context.fillRect(x, y, barWidth, barHeight);

    context.strokeStyle = '#334155';
    context.strokeRect(x, y, barWidth, barHeight);

    const activeGradient = context.createLinearGradient(x + 1, y, x + barWidth - 1, y);
    const darkBlue = '#1e1c75';
    const orange = '#f59e0b';
    const lightBlue = '#bfe9ff';

    activeGradient.addColorStop(0.0, darkBlue);
    activeGradient.addColorStop(0.15, darkBlue);
    activeGradient.addColorStop(0.25, orange);
    activeGradient.addColorStop(0.25, orange);
    activeGradient.addColorStop(0.35, lightBlue);
    activeGradient.addColorStop(0.65, lightBlue);
    activeGradient.addColorStop(0.75, orange);
    activeGradient.addColorStop(0.75, orange);
    activeGradient.addColorStop(0.85, darkBlue);
    activeGradient.addColorStop(1.0, darkBlue);

    context.fillStyle = activeGradient;
    context.fillRect(x + 1, y + 1, (barWidth - 2) * progress, barHeight - 2);

    context.save();
    context.fillStyle = '#cbd5e1';
    context.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(calendarLabel, centerX, y - 6);
    context.textBaseline = 'top';
    context.fillText(timeLabel, centerX, y + barHeight + 6);
    context.fillText(weatherLabel, centerX, y + barHeight + 24);
    context.restore();
  }
};
