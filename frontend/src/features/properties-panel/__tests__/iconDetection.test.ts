import { isIconText } from '../utils/iconDetection';

describe('Icon Detection Utility', () => {
  test('should detect emoji as icon text', () => {
    expect(isIconText('😊')).toBe(true);
    expect(isIconText('👍')).toBe(true);
    expect(isIconText('🔥')).toBe(true);
    expect(isIconText('💡')).toBe(true);
  });

  test('should detect symbols as icon text', () => {
    expect(isIconText('→')).toBe(true);
    expect(isIconText('★')).toBe(true);
    expect(isIconText('◆')).toBe(true);
    expect(isIconText('♠')).toBe(true);
  });

  test('should not detect regular text as icon text', () => {
    expect(isIconText('Hello World')).toBe(false);
    expect(isIconText('123')).toBe(false);
    expect(isIconText('abc')).toBe(false);
    expect(isIconText('Hello 123')).toBe(false);
  });

  test('should handle empty and undefined text', () => {
    expect(isIconText('')).toBe(false);
    expect(isIconText(null as any)).toBe(false);
    expect(isIconText(undefined as any)).toBe(false);
  });

  test('should detect single character unicode as icon', () => {
    expect(isIconText('©')).toBe(true);
    expect(isIconText('®')).toBe(true);
    expect(isIconText('™')).toBe(true);
  });

  test('should not detect regular single characters as icons', () => {
    expect(isIconText('a')).toBe(false);
    expect(isIconText('1')).toBe(false);
    expect(isIconText('!')).toBe(false);
  });
});
