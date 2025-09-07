import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import PropertiesPanel from '../PropertiesPanel';
import { useAppStore } from '../../../store/appStore';

describe('PropertiesPanel interaction probes', () => {
  it('moves and resizes shape and updates colors', () => {
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
            type: 'shape',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 }
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });

    const { container } = render(<PropertiesPanel />);
    const nums = container.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: '10' } });
    fireEvent.change(nums[1], { target: { value: '20' } });
    fireEvent.change(nums[2], { target: { value: '200' } });
    fireEvent.change(nums[3], { target: { value: '150' } });
    const colors = container.querySelectorAll('input[type="color"]');
    fireEvent.change(colors[0], { target: { value: '#ff0000' } });
    fireEvent.change(colors[1], { target: { value: '#00ff00' } });
    const strokeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(strokeSlider, { target: { value: '5' } });

    const obj = useAppStore.getState().currentProject!.objects[0];
    expect(obj.x).toBe(10);
    expect(obj.y).toBe(20);
    expect(obj.width).toBe(200);
    expect(obj.height).toBe(150);
    expect(obj.properties.fill).toBe('#ff0000');
    expect(obj.properties.stroke).toBe('#00ff00');
    expect(obj.properties.strokeWidth).toBe(5);
  });

  it('updates text content and font settings', () => {
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
            type: 'text',
            x: 0,
            y: 0,
            properties: { text: 'Hello', fontSize: 16, fontFamily: 'Arial', fill: '#000000' }
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });

    const { container } = render(<PropertiesPanel />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'World' } });
    const sizeSlider = container.querySelector('input[type="range"]') as HTMLInputElement;
    fireEvent.change(sizeSlider, { target: { value: '24' } });
    const fontSelect = container.querySelector('select')!;
    fireEvent.change(fontSelect, { target: { value: 'Helvetica' } });

    const obj = useAppStore.getState().currentProject!.objects[0];
    expect(obj.properties.text).toBe('World');
    expect(obj.properties.fontSize).toBe(24);
    expect(obj.properties.fontFamily).toBe('Helvetica');
  });

  it('updates animation properties', () => {
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
            type: 'shape',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            properties: { fill: '#ffffff', stroke: '#000000', strokeWidth: 2 },
            animationStart: 0,
            animationDuration: 5,
            animationType: 'none',
            animationEasing: 'easeOut'
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });

    render(<PropertiesPanel />);
    const startInput = screen.getByText('Start Time (seconds)').parentElement!.querySelector('input')!;
    const durationInput = screen.getByText('Duration (seconds)').parentElement!.querySelector('input')!;
    const typeSelect = screen.getByText('Animation Type').parentElement!.querySelector('select')!;
    const easingSelect = screen.getByText('Easing').parentElement!.querySelector('select')!;

    fireEvent.change(startInput, { target: { value: '1.5' } });
    fireEvent.change(durationInput, { target: { value: '4' } });
    fireEvent.change(typeSelect, { target: { value: 'fadeIn' } });
    fireEvent.change(easingSelect, { target: { value: 'easeIn' } });

    const obj = useAppStore.getState().currentProject!.objects[0];
    expect(obj.animationStart).toBe(1.5);
    expect(obj.animationDuration).toBe(4);
    expect(obj.animationType).toBe('fadeIn');
    expect(obj.animationEasing).toBe('easeIn');
  });

  it('toggles hand follower options on svgPath', () => {
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
            type: 'svgPath',
            x: 0,
            y: 0,
            properties: { drawOptions: {}, totalLen: 100, handFollower: {} },
            animationType: 'drawIn',
            animationDuration: 5
          }
        ],
        boardStyle: 'whiteboard',
        backgroundColor: '#ffffff',
        cameraPosition: { x: 0, y: 0, zoom: 1 }
      },
      selectedObject: 'obj1'
    });

    const { container } = render(<PropertiesPanel />);
    fireEvent.click(screen.getByLabelText('Show hand following path'));
    fireEvent.click(screen.getByLabelText('Mirror Left/Right'));
    const scaleSlider = screen.getByText('Hand Scale').parentElement!.querySelector('input[type="range"]')!;
    fireEvent.change(scaleSlider, { target: { value: '1.5' } });
    fireEvent.click(screen.getByLabelText('Enable smooth movement'));
    fireEvent.click(screen.getByLabelText('Lift hand at sharp corners'));

    const hf = useAppStore.getState().currentProject!.objects[0].properties.handFollower;
    expect(hf.enabled).toBe(true);
    expect(hf.mirror).toBe(true);
    expect(hf.scale).toBeCloseTo(1.5);
    expect(hf.smoothing.enabled).toBe(true);
    expect(hf.cornerLifts.enabled).toBe(true);
  });
});
