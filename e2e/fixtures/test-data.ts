/**
 * Test data fixtures for Advanced Estimate E2E tests
 */

export const testCustomer = {
  name: 'E2E Test Customer',
  email: 'e2e-test@example.com',
  phone: '555-0100',
  address: '123 Test St, Test City, TS 12345',
};

export const simpleFenceConfig = {
  fenceType: 'Wood Privacy Fence',
  material: 'cedar',
  style: '6ft Board-on-Board',
  height: 6,
  postSpacing: 8,
  soilType: 'normal',
};

export const singleRun = {
  length: 100,
  slope: 'flat',
  terrain: 'normal',
};

export const multipleRuns = [
  { length: 100, slope: 'flat', terrain: 'normal' },
  { length: 50, slope: 'slight_slope', terrain: 'normal' },
  { length: 75, slope: 'flat', terrain: 'rocky' },
];

export const singleGate = {
  type: 'walk_gate',
  width: 4,
};

export const multipleGates = [
  { type: 'walk_gate', width: 4 },
  { type: 'double_drive', width: 16 },
];

export const commonOptions = {
  capRail: true,
  kickboard: false,
  concreteFooters: true,
};

// AI extraction test prompts
export const aiTestPrompts = {
  simple: '100 feet of 6 foot cedar privacy fence with one walk gate',

  complex: `Need a wood privacy fence quote:
- North side: 100 feet flat ground
- East side: 50 feet with slight slope
- South side: 75 feet on rocky terrain
- West side: 60 feet flat
Gates needed:
- 1 walk gate (4 feet)
- 1 double drive gate (16 feet)
6 foot height, cedar, board-on-board style`,

  ambiguous: 'fence around backyard, maybe 6ft high, need gate',

  incomplete: '150 feet of fence',
};
