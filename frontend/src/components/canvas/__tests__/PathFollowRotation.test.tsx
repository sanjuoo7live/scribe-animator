import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextRenderer } from '../renderers/TextRenderer';
import { ImageRenderer } from '../renderers/ImageRenderer';
import { Text, Group } from 'react-konva';

jest.mock('react-konva', () => ({
  Text: jest.fn(() => null),
  Group: jest.fn(({ children }: any) => <div>{children}</div>),
  Image: jest.fn(() => null),
  Rect: jest.fn(() => null),
}));

const MockText = Text as jest.MockedFunction<any>;
const MockGroup = Group as jest.MockedFunction<any>;

const base = {
  currentTime: 0.5,
  isSelected: false,
  tool: 'select' as const,
  onClick: jest.fn(),
  onDragEnd: jest.fn(),
  onTransformEnd: jest.fn(),
};

describe('PathFollow rotation propagation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('TextRenderer uses animated rotation when provided', () => {
    const obj = { id: 't', type: 'text', x: 100, y: 100, width: 100, height: 40, rotation: 0, properties: { text: 'A' }, animationType: 'pathFollow' };
    render(<TextRenderer {...base} obj={obj as any} animatedProps={{ rotation: 45, x: 120, y: 130 }} />);
    const call = MockText.mock.calls[0][0];
    expect(call.rotation).toBe(45);
    expect(call.x).toBe(120);
    expect(call.y).toBe(130);
  });

  it('ImageRenderer uses animated rotation when provided', () => {
    const obj = { id: 'i', type: 'image', x: 100, y: 100, width: 100, height: 40, rotation: 0, properties: { src: 'https://example.com/a.png' }, animationType: 'pathFollow' };
    render(<ImageRenderer {...base} obj={obj as any} animatedProps={{ rotation: 90, x: 150, y: 160 }} />);
    const groupProps = MockGroup.mock.calls[0][0];
    expect(groupProps.rotation).toBe(90);
    expect(groupProps.x).toBe(150);
    expect(groupProps.y).toBe(160);
  });
});
