// Shared font constants used across the application
export const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Helvetica',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Lucida Console',
  'Palatino Linotype'
] as const;

export type FontFamily = typeof FONT_FAMILIES[number];
