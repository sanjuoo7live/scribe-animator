import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextRenderer } from '../renderers/TextRenderer';
import { Text } from 'react-konva';

// Use simple mock for Text
jest.mock('react-konva', () => ({
  Text: jest.fn(() => null),
}));

const MockText = Text as jest.MockedFunction<any>;

const baseProps = {
  animatedProps: {},
  currentTime: 0,
  isSelected: false,
  tool: 'select' as const,
  onClick: jest.fn(),
  onDragEnd: jest.fn(),
  onTransformEnd: jest.fn(),
};

describe('TextRenderer Emoji Font Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes emoji fonts when text contains emoji', () => {
    const obj = {
      id: 't1', type: 'text' as const, x: 0, y: 0, width: 100, height: 40, rotation: 0,
      properties: { text: '🤔🙂', fontFamily: "Arial, 'Apple Color Emoji'" },
      animationType: 'none' as const,
    };

    render(<TextRenderer {...baseProps} obj={obj as any} />);
    const call = MockText.mock.calls[0][0];
    expect(call.fontFamily).toMatch(/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
  });

  it('respects forceEmojiFont flag even without emoji', () => {
    const obj = {
      id: 't2', type: 'text' as const, x: 0, y: 0, width: 100, height: 40, rotation: 0,
      properties: { text: 'Hello', forceEmojiFont: true, fontFamily: 'Arial' },
      animationType: 'none' as const,
    };

    render(<TextRenderer {...baseProps} obj={obj as any} />);
    const call = MockText.mock.calls[0][0];
    expect(call.fontFamily.startsWith("'Apple Color Emoji'"))
      .toBe(true);
  });

  it('appends custom font instead of replacing the fallback', () => {
    const obj = {
      id: 't3', type: 'text' as const, x: 0, y: 0, width: 100, height: 40, rotation: 0,
      properties: { text: '🙂', fontFamily: 'Arial', fontFamilyCustom: 'Inter' },
      animationType: 'none' as const,
    };

    render(<TextRenderer {...baseProps} obj={obj as any} />);
    const call = MockText.mock.calls[0][0];
    expect(call.fontFamily).toContain('Inter');
    expect(call.fontFamily).toMatch(/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
  });
});
