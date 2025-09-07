// Basic shared validation helpers for the properties panel
// Ranges and steps will migrate to constants/schema-driven values.
export const clampNumber = (val: number, min: number, max: number): number => {
  if (Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
};
