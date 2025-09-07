import React from 'react';
import { render } from '@testing-library/react';
import PropertiesPanel from '../PropertiesPanel';
import { useAppStore } from '../../../store/appStore';

describe('PropertiesPanel drawPath snapshot', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentProject: {
        id: 'p1',
        name: 'Test',
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 10,
        objects: [
          {
            id: 'obj1',
            type: 'drawPath',
            x: 0,
            y: 0,
            properties: { points: [{ x: 0, y: 0 }] }
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });
  });

  it('matches snapshot for drawPath object', () => {
    const { container } = render(<PropertiesPanel />);
    expect(container).toMatchSnapshot();
  });
});
