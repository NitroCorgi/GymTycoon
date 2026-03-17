import treadmillRotation0 from '../assets/devices/treadmill/treadmill-r0.png';
import treadmillRotation1 from '../assets/devices/treadmill/treadmill-r1.png';
import treadmillRotation2 from '../assets/devices/treadmill/treadmill-r2.png';
import treadmillRotation3 from '../assets/devices/treadmill/treadmill-r3.png';
import ellipticalRotation0 from '../assets/devices/elliptical/elliptical-r0.png';
import ellipticalRotation1 from '../assets/devices/elliptical/elliptical-r1.png';
import ellipticalRotation2 from '../assets/devices/elliptical/elliptical-r2.png';
import ellipticalRotation3 from '../assets/devices/elliptical/elliptical-r3.png';
import dumbbellStationRotation1 from '../assets/devices/dumbbellStation/dumbbellStation-r1.png';
import benchPressRotation1 from '../assets/devices/benchPress/benchPress-r1.png';
import battleRopesRotation1 from '../assets/devices/battleRopes/battleRopes-r1.png';
import floorTilesWoodAsset from '../assets/decor/floorTilesWood/floorTilesWood.png';
import windowLeftAsset from '../assets/decor/window/window_left.png';
import windowRightAsset from '../assets/decor/window/window_right.png';
import sidewalkTileSprite from '../assets/components/sidewalk.png';
import streetTileSprite from '../assets/components/street.png';

const DEVICE_ASSET_MODULES = import.meta.glob('../assets/devices/*/*-r[0-3].png', {
  eager: true,
  import: 'default'
});

const CHECK_IN_ASSET_MODULES = import.meta.glob('../assets/checkIn/*/*-r[0-3].png', {
  eager: true,
  import: 'default'
});

const FACILITIES_ASSET_MODULES = import.meta.glob('../assets/facilities/*/*-r[0-3].png', {
  eager: true,
  import: 'default'
});

const DECOR_ASSET_MODULES = import.meta.glob('../assets/decor/*/*-r[0-3].png', {
  eager: true,
  import: 'default'
});

function getAssetCategoryFolder(itemType) {
  if (itemType === 'check-in') return 'checkIn';
  if (itemType === 'locker' || itemType === 'shower' || itemType === 'facility') return 'facilities';
  if (itemType === 'decor') return 'decor';
  return 'devices';
}

function getAssetModulesByCategory(categoryFolder) {
  if (categoryFolder === 'checkIn') return CHECK_IN_ASSET_MODULES;
  if (categoryFolder === 'facilities') return FACILITIES_ASSET_MODULES;
  if (categoryFolder === 'decor') return DECOR_ASSET_MODULES;
  return DEVICE_ASSET_MODULES;
}

function getCatalogAssetRotations(itemKey, itemType) {
  const categoryFolder = getAssetCategoryFolder(itemType);
  const assetModules = getAssetModulesByCategory(categoryFolder);

  const rotationSources = [0, 1, 2, 3].map(
    (rotationIndex) =>
      assetModules[`../assets/${categoryFolder}/${itemKey}/${itemKey}-r${rotationIndex}.png`] ?? null
  );
  const firstAvailableSource = rotationSources.find(Boolean);

  if (!firstAvailableSource) {
    return null;
  }

  return rotationSources.map((source) => source ?? firstAvailableSource);
}

export const ITEM_CATALOG = {
  treadmill: {
    label: 'Treadmill',
    type: 'cardio',
    shortLabel: 'TM',
    footprintRows: 1,
    footprintCols: 2,
    cost: 1000,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 2,
    initialBreakChance: 0.05,
    color: '#38bdf8',
    assetGroundScale: 1,
    assetOffsetXByRotation: [-0.07, -0.02, 0, 0],
    assetOffsetYByRotation: [0.03, 0.03, 0.03, 0.03],
    assetRotations: [
      treadmillRotation0,
      treadmillRotation1,
      treadmillRotation2,
      treadmillRotation3
    ]
  },
  legPress: {
    label: 'Leg Press',
    type: 'strength',
    shortLabel: 'LP',
    cost: 1500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 3,
    initialBreakChance: 0.05,
    color: '#fb7185'
  },
  dumbbellStation: {
    label: 'Dumbbell Station',
    type: 'weightlifting',
    shortLabel: 'DB',
    cost: 1200,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 2,
    initialBreakChance: 0.05,
    color: '#facc15',
    assetRotations: [dumbbellStationRotation1]
  },
  elliptical: {
    label: 'Elliptical Trainer',
    type: 'cardio',
    shortLabel: 'EL',
    footprintRows: 1,
    footprintCols: 2,
    cost: 1800,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 3,
    initialBreakChance: 0.05,
    color: '#22d3ee',
    assetGroundScale: 1,
    assetRotations: [
      ellipticalRotation0,
      ellipticalRotation1,
      ellipticalRotation2,
      ellipticalRotation3
    ]
  },
  latPulldown: {
    label: 'Lat Pulldown',
    type: 'strength',
    shortLabel: 'LPD',
    cost: 1600,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 3,
    initialBreakChance: 0.07,
    color: '#ef4444'
  },
  benchPress: {
    label: 'Bench Press',
    type: 'weightlifting',
    shortLabel: 'BP',
    footprintRows: 1,
    footprintCols: 2,
    cost: 2500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 4,
    initialBreakChance: 0.05,
    color: '#d97706',
    assetRotations: [benchPressRotation1]
  },
  battleRopes: {
    label: 'Battle Ropes',
    type: 'functional',
    shortLabel: 'BRP',
    footprintRows: 1,
    footprintCols: 2,
    cost: 1000,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 4,
    initialBreakChance: 0.04,
    color: '#10b981',
    assetRotations: [battleRopesRotation1]
  },
  stretchZone: {
    label: 'Stretch Zone',
    type: 'recovery',
    shortLabel: 'SZ',
    footprintRows: 1,
    footprintCols: 2,
    cost: 1500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 2,
    initialBreakChance: 0.01,
    color: '#8b5cf6'
  },
  receptionDesk: {
    label: 'Reception Desk',
    type: 'check-in',
    shortLabel: 'CI',
    footprintRows: 1,
    footprintCols: 2,
    cost: 1000,
    monthlyCost: 500,
    checkInSeconds: 5,
    popularity: 0,
    initialBreakChance: 0,
    color: '#9ca3af',
    gymColorTint: true,
    gymColorTintSecondaryShade: true
  },
  turnstile: {
    label: 'Turnstile',
    type: 'check-in',
    shortLabel: 'TS',
    cost: 10000,
    monthlyCost: 100,
    checkInSeconds: 2,
    popularity: 0,
    initialBreakChance: 0,
    color: '#94a3b8',
    gymColorTint: true
  },
  lockerRack2: {
    label: '2x Locker Rack',
    type: 'locker',
    shortLabel: 'L2',
    cost: 500,
    monthlyCost: 0,
    checkInSeconds: 0,
    lockerCapacity: 2,
    popularity: 0,
    initialBreakChance: 0,
    color: '#14532d',
    gymColorTint: true
  },
  lockerRack4: {
    label: '4x Locker Rack',
    type: 'locker',
    shortLabel: 'L4',
    cost: 800,
    monthlyCost: 0,
    checkInSeconds: 0,
    lockerCapacity: 4,
    popularity: 0,
    initialBreakChance: 0,
    color: '#166534',
    gymColorTint: true
  },
  lockerRack6: {
    label: '6x Locker Rack',
    type: 'locker',
    shortLabel: 'L6',
    cost: 1200,
    monthlyCost: 0,
    checkInSeconds: 0,
    lockerCapacity: 6,
    popularity: 0,
    initialBreakChance: 0,
    color: '#065f46',
    gymColorTint: true
  },
  vendingMachine: {
    label: 'Vending Machine',
    type: 'facility',
    shortLabel: 'VM',
    cost: 2500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 0,
    initialBreakChance: 0,
    color: '#374151'
  },
  shower: {
    label: 'Shower',
    type: 'shower',
    shortLabel: 'SH',
    cost: 500,
    monthlyCost: 150,
    checkInSeconds: 0,
    lockerCapacity: 0,
    popularity: 0,
    initialBreakChance: 0.02,
    color: '#64748b',
    gymColorTint: true,
    gymColorTintSecondaryShade: true,
    gymColorTintTertiaryShade: true
  },
  floorTilesWood: {
    label: 'Floor Tiles (Wood)',
    type: 'decor',
    shortLabel: 'FW',
    cost: 10,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 0,
    initialBreakChance: 0,
    color: '#b45309',
    decorTarget: 'floor',
    assetRotations: [floorTilesWoodAsset]
  },
  window: {
    label: 'Window',
    type: 'decor',
    shortLabel: 'WN',
    cost: 250,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 0,
    initialBreakChance: 0,
    color: '#e5e7eb',
    decorTarget: 'wall',
    wallAssetBySide: {
      left: windowLeftAsset,
      right: windowRightAsset
    }
  }
};

for (const [itemKey, itemConfig] of Object.entries(ITEM_CATALOG)) {
  if (getAssetCategoryFolder(itemConfig.type) === 'devices') {
    itemConfig.gymColorTint = true;
    itemConfig.gymColorTintSecondaryShade = true;
  }

  const catalogAssetRotations = getCatalogAssetRotations(itemKey, itemConfig.type);
  if (!catalogAssetRotations) {
    continue;
  }

  itemConfig.assetRotations = catalogAssetRotations;
}

export const GYM_UPGRADES = {
  ventilation: {
    key: 'ventilation',
    name: 'Ventilation',
    description: 'Provides some air circulation in the gym.',
    effect: 'Reduces workout time by 10%',
    purchasePrice: 10000,
    monthlyCost: 100,
    requires: []
  },
  airConditioning: {
    key: 'airConditioning',
    name: 'Air Conditioning',
    description: 'Provides a pleasant temperature across all seasons.',
    effect: 'Reduces workout time by 25%',
    purchasePrice: 30000,
    monthlyCost: 300,
    requires: ['ventilation']
  },
  musicSystem: {
    key: 'musicSystem',
    name: 'Music System',
    description: 'Plays an energetic mix of music in the studio.',
    effect: 'Increases base happiness by 10',
    purchasePrice: 15000,
    monthlyCost: 75,
    requires: []
  },
  dedicatedTechnician: {
    key: 'dedicatedTechnician',
    name: 'Dedicated Technician',
    description: 'A dedicated technician will provide quicker service to fix broken devices.',
    effect: 'Cuts down device repair time by 40%',
    purchasePrice: 20000,
    monthlyCost: 1000,
    requires: []
  },
  maintenanceSpecialist: {
    key: 'maintenanceSpecialist',
    name: 'Maintenance Specialist',
    description: 'Maintains devices and prevents them from breaking too quickly.',
    effect: 'Device break chance no longer increases after use',
    purchasePrice: 25000,
    monthlyCost: 2000,
    requires: []
  },
  receptionStaff: {
    key: 'receptionStaff',
    name: 'Reception Staff',
    description: 'Provides customer service and helps keep the training area clean.',
    effect: 'Reduces check-in time by 25% and increases base happiness by 5',
    purchasePrice: 17000,
    monthlyCost: 1500,
    requires: []
  }
};

export const CUSTOMER_TYPES = [
  {
    id: 'blue',
    color: '#60a5fa',
    preferredType: 'cardio'
  },
  {
    id: 'red',
    color: '#f87171',
    preferredType: 'strength'
  },
  {
    id: 'yellow',
    color: '#facc15',
    preferredType: 'weightlifting'
  },
  {
    id: 'functional',
    color: '#34d399',
    preferredType: 'functional'
  },
  {
    id: 'relax',
    color: '#a78bfa',
    preferredType: 'recovery'
  }
];

export const FIRST_NAMES = ['Liam', 'Emma', 'Noah', 'Olivia', 'Mason', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Sophia'];
export const LAST_NAMES = ['Miller', 'Johnson', 'Davis', 'Taylor', 'Moore', 'Anderson', 'Clark', 'Lewis', 'Walker', 'Young'];

export const TRAINING_SECONDS = 10;
export const REPAIR_SECONDS = 30;
export const LOCKER_CHANGE_SECONDS = 5;
export const SHOWER_SECONDS = 15;
export const SATISFACTION_MIN = 0;
export const SATISFACTION_MAX = 100;

export const DEFAULT_DEVICE_USAGE_SECONDS = 15;
export const RECEPTION_DESK_USAGE_SECONDS = 3;
export const TURNSTILE_USAGE_SECONDS = 1;
export const LOCKER_USAGE_SECONDS = 5;
export const SHOWER_USAGE_SECONDS = 10;
export const VENDING_USAGE_SECONDS = 2;
export const VENDING_MAX_STOCK = 100;
export const VENDING_RESTOCK_COST_PER_ITEM = 2;

export const FREE_MODE_LOCATIONS = [
  {
    id: 'home-ground-floor',
    label: "Empty Room (Home Ground Floor)",
    mapRows: 6,
    mapCols: 6,
    mapAreas: [
      {
        startRow: 0,
        startCol: 0,
        rows: 6,
        cols: 6
      }
    ],
    entranceTile: { row: 2, col: 0 },
    monthlyRent: 200,
    monthlyEncountersBase: 5,
    monthlyEncountersGrowth: 1
  },
  {
    id: 'small-rural',
    label: 'Small Property (Rural Area)',
    mapRows: 8,
    mapCols: 8,
    mapAreas: [
      {
        startRow: 0,
        startCol: 0,
        rows: 8,
        cols: 8
      }
    ],
    entranceTile: { row: 3, col: 0 },
    monthlyRent: 500,
    monthlyEncountersBase: 10,
    monthlyEncountersGrowth: 1
  },
  {
    id: 'medium-suburban',
    label: 'Medium Property (Suburban District)',
    mapRows: 12,
    mapCols: 10,
    mapAreas: [
      {
        startRow: 0,
        startCol: 0,
        rows: 12,
        cols: 10
      }
    ],
    entranceTile: { row: 5, col: 0 },
    monthlyRent: 1500,
    monthlyEncountersBase: 20,
    monthlyEncountersGrowth: 2
  },
  {
    id: 'downtown-prime',
    label: 'Downtown Property (Prime Location)',
    mapRows: 13,
    mapCols: 12,
    mapAreas: [
      {
        startRow: 0,
        startCol: 0,
        rows: 10,
        cols: 12
      },
      {
        startRow: 10,
        startCol: 0,
        rows: 3,
        cols: 5
      }
    ],
    entranceTile: { row: 5, col: 0 },
    monthlyRent: 3000,
    monthlyEncountersBase: 30,
    monthlyEncountersGrowth: 3
  }
];

export const FREE_MODE_DIFFICULTIES = [
  {
    id: 'sanbox',
    label: 'Sanbox',
    startingBank: 9999999
  },
  {
    id: 'easy',
    label: 'Easy',
    startingBank: 100000
  },
  {
    id: 'medium',
    label: 'Medium',
    startingBank: 50000
  },
  {
    id: 'hard',
    label: 'Hard',
    startingBank: 30000
  }
];

export const EXTERIOR_MAP_STYLE = {
  edgeOverscanTiles: 10,
  tileBandsFromEntranceOutward: [
    { type: 'sidewalk', width: 2 },
    { type: 'street', width: 5 },
    { type: 'sidewalk', width: 2 }
  ],
  tileTypes: {
    sidewalk: {
      assetPath: sidewalkTileSprite,
      fallbackColor: '#d1d5db'
    },
    street: {
      assetPath: streetTileSprite,
      fallbackColor: '#374151'
    }
  }
};

export function getItemUsageSeconds(itemKey) {
  const item = ITEM_CATALOG[itemKey];
  if (!item) return DEFAULT_DEVICE_USAGE_SECONDS;

  if (itemKey === 'receptionDesk') return RECEPTION_DESK_USAGE_SECONDS;
  if (itemKey === 'turnstile') return TURNSTILE_USAGE_SECONDS;
  if (item.type === 'locker') return LOCKER_USAGE_SECONDS;
  if (item.type === 'shower') return SHOWER_USAGE_SECONDS;

  return DEFAULT_DEVICE_USAGE_SECONDS;
}
