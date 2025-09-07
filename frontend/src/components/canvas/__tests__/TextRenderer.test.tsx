import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextRenderer } from '../renderers/TextRenderer';
import { Text } from 'react-konva';

// Mock react-konva
jest.mock('react-konva', () => ({
  Text: jest.fn(() => null),
}));

const MockText = Text as jest.MockedFunction<any>;

describe('TextRenderer', () => {
  const mockObj = {
    id: 'text-1',
    type: 'text' as const,
    x: 100,
    y: 200,
    width: 150,
    height: 50,
    rotation: 0,
    properties: {
      text: 'Hello World',
      fontSize: 24,
      fontFamily: 'Arial',
      fontStyle: 'normal',
      textDecoration: 'none',
      align: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      fill: '#000000',
      stroke: '#000000',
      strokeWidth: 0,
    },
    animationType: 'none' as const,
  };

  const mockAnimatedProps = {
    x: 100,
    y: 200,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  const defaultProps = {
    obj: mockObj,
    animatedProps: mockAnimatedProps,
    currentTime: 1,
    isSelected: false,
    tool: 'select' as const,
    onClick: jest.fn(),
    onDragEnd: jest.fn(),
    onTransformEnd: jest.fn(),
    onDblClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Text with correct props and emoji fallbacks in fontFamily', () => {
    render(<TextRenderer {...defaultProps} />);

    const call = MockText.mock.calls[0][0];
    expect(call).toEqual(
      expect.objectContaining({
        id: 'text-1',
        x: 100,
        y: 200,
        width: 150,
        text: 'Hello World',
        fontSize: 24,
        fontStyle: 'normal',
        textDecoration: 'none',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        fill: '#000000',
        stroke: undefined,
        strokeWidth: 0,
        draggable: true,
      })
    );
    expect(typeof call.fontFamily).toBe('string');
    expect(call.fontFamily).toContain('Arial');
    expect(call.fontFamily).toMatch(/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
  });

  it('applies selected styling when isSelected is true', () => {
    render(<TextRenderer {...defaultProps} isSelected={true} />);
    const call = MockText.mock.calls[0][0];
    expect(call.stroke).toBe('#4f46e5');
    expect(call.strokeWidth).toBe(1);
    expect(call.dash).toEqual([4, 4]);
    expect(call.fill).toBe('#000'); // Should preserve original color
  });

  it('renders with stroke when strokeWidth > 0', () => {
    const objWithStroke = {
      ...mockObj,
      properties: {
        ...mockObj.properties,
        strokeWidth: 2,
        stroke: '#ff0000',
      },
    };

    render(<TextRenderer {...defaultProps} obj={objWithStroke} />);
    const call = MockText.mock.calls[0][0];
    expect(call.stroke).toBe('#ff0000');
    expect(call.strokeWidth).toBe(2);
  });

  it('handles typewriter animation type', () => {
    const objWithTypewriter = { ...mockObj, animationType: 'typewriter' as const };
    render(<TextRenderer {...defaultProps} obj={objWithTypewriter} />);
    const call = MockText.mock.calls[0][0];
    expect(call.text).toBeDefined();
    expect(call.text).not.toBe('Hello World');
  });

  it('calls onClick and cancels bubbling', () => {
    const onClick = jest.fn();
    render(<TextRenderer {...defaultProps} onClick={onClick} />);
    const props = MockText.mock.calls[0][0];
    const evt = { cancelBubble: false } as any;
    props.onClick(evt);
    expect(onClick).toHaveBeenCalledWith(evt);
    expect(evt.cancelBubble).toBe(true);
  });

  it('calls onDblClick with object id', () => {
    const onDblClick = jest.fn();
    render(<TextRenderer {...defaultProps} onDblClick={onDblClick} />);
    const props = MockText.mock.calls[0][0];
    props.onDblClick();
    expect(onDblClick).toHaveBeenCalledWith('text-1');
  });

  it('is not draggable when tool is not select', () => {
    render(<TextRenderer {...defaultProps} tool="pen" />);
    const call = MockText.mock.calls[0][0];
    expect(call.draggable).toBe(false);
  });

  it('uses default values when properties are missing', () => {
    const objWithMinimalProps = { ...mockObj, properties: {} as any };
    render(<TextRenderer {...defaultProps} obj={objWithMinimalProps} />);
    const call = MockText.mock.calls[0][0];
    expect(call).toEqual(
      expect.objectContaining({
        text: 'Text',
        fontSize: 16,
        fontStyle: 'normal',
        textDecoration: 'none',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        fill: '#000',
        stroke: undefined,
        strokeWidth: 0,
      })
    );
    expect(call.fontFamily).toContain('Arial');
    expect(call.fontFamily).toMatch(/Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji/);
  });
});

