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
    type: 'text',
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
    animationType: 'none',
  };

  const mockAnimatedProps = {
    x: 100,
    y: 200,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  const mockProps = {
    obj: mockObj,
    animatedProps: mockAnimatedProps,
    isSelected: false,
    tool: 'select',
    onClick: jest.fn(),
    onDragEnd: jest.fn(),
    onTransformEnd: jest.fn(),
    onDblClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Text component with correct props', () => {
    render(<TextRenderer {...mockProps} />);

    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'text-1',
        x: 100,
        y: 200,
        text: 'Hello World',
        fontSize: 24,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        textDecoration: 'none',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        width: 150,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        fill: '#000000',
        stroke: undefined,
        strokeWidth: 0,
        draggable: true,
      }),
      undefined
    );
  });

  it('applies selected styling when isSelected is true', () => {
    render(<TextRenderer {...mockProps} isSelected={true} />);

    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        fill: '#4f46e5',
      }),
      undefined
    );
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

    render(<TextRenderer {...mockProps} obj={objWithStroke} />);

    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        stroke: '#ff0000',
        strokeWidth: 2,
      }),
      undefined
    );
  });

  it('handles typewriter animation type', () => {
    const objWithTypewriter = {
      ...mockObj,
      animationType: 'typewriter',
    };

    render(<TextRenderer {...mockProps} obj={objWithTypewriter} />);

    // Should still render the full text for now
    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello World',
      }),
      undefined
    );
  });

  it('calls onClick with correct parameters', () => {
    const mockOnClick = jest.fn();
    render(<TextRenderer {...mockProps} onClick={mockOnClick} />);

    // Get the onClick handler from the Text mock
    const textProps = MockText.mock.calls[0][0];
    const mockEvent = { cancelBubble: false };

    textProps.onClick(mockEvent);

    expect(mockOnClick).toHaveBeenCalledWith(mockEvent);
    expect(mockEvent.cancelBubble).toBe(true);
  });

  it('calls onDblClick with object id', () => {
    const mockOnDblClick = jest.fn();
    render(<TextRenderer {...mockProps} onDblClick={mockOnDblClick} />);

    const textProps = MockText.mock.calls[0][0];

    textProps.onDblClick();

    expect(mockOnDblClick).toHaveBeenCalledWith('text-1');
  });

  it('is not draggable when tool is not select', () => {
    render(<TextRenderer {...mockProps} tool="pen" />);

    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        draggable: false,
      }),
      undefined
    );
  });

  it('uses default values when properties are missing', () => {
    const objWithMinimalProps = {
      ...mockObj,
      properties: {},
    };

    render(<TextRenderer {...mockProps} obj={objWithMinimalProps} />);

    expect(MockText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Text',
        fontSize: 16,
        fontFamily: 'Arial',
        fontStyle: 'normal',
        textDecoration: 'none',
        align: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        fill: '#000',
        stroke: undefined,
        strokeWidth: 0,
      }),
      undefined
    );
  });
});
