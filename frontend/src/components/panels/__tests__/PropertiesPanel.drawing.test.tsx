import React from 'react';
import { render } from '@testing-library/react';
import PropertiesPanel from '../PropertiesPanel';
import { useAppStore } from '../../../store/appStore';

describe('PropertiesPanel drawing snapshot', () => {
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
            type: 'drawing',
            x: 0,
            y: 0,
            properties: {}
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });
  });

  it('matches snapshot for drawing object', () => {
    const { container } = render(<PropertiesPanel />);
    expect(container).toMatchSnapshot();
  });
});
