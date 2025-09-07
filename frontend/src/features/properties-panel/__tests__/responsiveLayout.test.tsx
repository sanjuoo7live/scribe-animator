import React from 'react';
import { render } from '@testing-library/react';
import PropertiesPanel from '../PropertiesPanel';
import { useAppStore, createDefaultProject } from '../../../store/appStore';

test('properties panel uses responsive grid layout', () => {
  const state = useAppStore.getState();
  const project = createDefaultProject();
  project.objects.push({ id: 'shape1', type: 'shape', x: 0, y: 0, width: 10, height: 10, properties: { strokeWidth: 2 } });
  state.setProject(project);
  state.selectObject('shape1');

  const { getByTestId } = render(<PropertiesPanel />);
  expect(getByTestId('properties-grid')).toHaveClass('md:grid-cols-2');
});
