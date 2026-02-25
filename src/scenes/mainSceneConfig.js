import treadmillRotation0 from '../assets/devices/treadmill/treadmill-r0.png';
import treadmillRotation1 from '../assets/devices/treadmill/treadmill-r1.png';
import treadmillRotation2 from '../assets/devices/treadmill/treadmill-r2.png';
import treadmillRotation3 from '../assets/devices/treadmill/treadmill-r3.png';
import ellipticalRotation0 from '../assets/devices/elliptical/elliptical-r0.png';
import ellipticalRotation1 from '../assets/devices/elliptical/elliptical-r1.png';
import ellipticalRotation2 from '../assets/devices/elliptical/elliptical-r2.png';
import ellipticalRotation3 from '../assets/devices/elliptical/elliptical-r3.png';

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
    color: '#facc15'
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
  rowingMachine: {
    label: 'Rowing Machine',
    type: 'cardio',
    shortLabel: 'RM',
    footprintRows: 1,
    footprintCols: 2,
    cost: 2200,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 4,
    initialBreakChance: 0.04,
    color: '#06b6d4'
  },
  stairClimber: {
    label: 'Stair Climber',
    type: 'cardio',
    shortLabel: 'SC',
    cost: 2500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 5,
    initialBreakChance: 0.03,
    color: '#0891b2'
  },
  chestPress: {
    label: 'Chest Press Machine',
    type: 'strength',
    shortLabel: 'CP',
    cost: 1700,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 3,
    initialBreakChance: 0.08,
    color: '#f87171'
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
  smithMachine: {
    label: 'Smith Machine',
    type: 'strength',
    shortLabel: 'SM',
    cost: 3000,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 5,
    initialBreakChance: 0.05,
    color: '#dc2626'
  },
  barbellRack: {
    label: 'Barbell Rack',
    type: 'weightlifting',
    shortLabel: 'BR',
    cost: 2000,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 4,
    initialBreakChance: 0.06,
    color: '#fbbf24'
  },
  powerRack: {
    label: 'Power Rack',
    type: 'weightlifting',
    shortLabel: 'PR',
    cost: 3500,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 5,
    initialBreakChance: 0.04,
    color: '#f59e0b'
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
    color: '#d97706'
  },
  kettlebellSet: {
    label: 'Kettlebell Set',
    type: 'functional',
    shortLabel: 'KB',
    cost: 1400,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 3,
    initialBreakChance: 0.03,
    color: '#34d399'
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
    color: '#10b981'
  },
  massageChair: {
    label: 'Massage Chair',
    type: 'recovery',
    shortLabel: 'MC',
    cost: 4000,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 4,
    initialBreakChance: 0.02,
    color: '#a78bfa'
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
    cost: 1000,
    monthlyCost: 500,
    checkInSeconds: 5,
    popularity: 0,
    initialBreakChance: 0,
    color: '#9ca3af'
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
    color: '#94a3b8'
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
    color: '#14532d'
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
    color: '#166534'
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
    color: '#64748b'
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
    decorTarget: 'floor'
  },
  wallpaperWhite: {
    label: 'Wallpaper (White)',
    type: 'decor',
    shortLabel: 'WW',
    cost: 10,
    monthlyCost: 0,
    checkInSeconds: 0,
    popularity: 0,
    initialBreakChance: 0,
    color: '#e5e7eb',
    decorTarget: 'wall'
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

export const FREE_MODE_LOCATIONS = [
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
      assetPath: '/assets/tiles/sidewalk/sidewalk-tile.png',
      fallbackColor: '#d1d5db'
    },
    street: {
      assetPath: '/assets/tiles/street/street-tile.png',
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
