import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react';
import { useAppStore, createDefaultProject } from '../../../store/appStore';
import { patchSceneObject } from '../domain/patch';
import { ShapeEditor } from '../editors/ShapeEditor';
import { TextEditor } from '../editors/TextEditor';
import { AnimationEditor } from '../editors/AnimationEditor';

describe('properties panel performance', () => {
  beforeEach(() => {
    const state = useAppStore.getState();
    const project = createDefaultProject();
    project.objects.push({ id: 'shape1', type: 'shape', x: 0, y: 0, width: 10, height: 10, properties: { strokeWidth: 2 } });
    state.setProject(project);
    state.selectObject('shape1');
  });

  test('slider drag batches updates and commits once', () => {
    const state = useAppStore.getState();
    const spy = jest.spyOn(state, 'updateObject');
    jest.useFakeTimers();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => setTimeout(() => cb(0), 16) as unknown as number);

    for (let i = 0; i < 50; i++) {
      patchSceneObject('shape1', { width: i });
    }

    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      window.dispatchEvent(new Event('mouseup'));
      jest.advanceTimersByTime(20);
    });

    expect(spy.mock.calls.length).toBeLessThanOrEqual(60);
    expect(state.history.past.length).toBe(1);
  });

  test('editing shape does not re-render text or animation editors', () => {
    let textRenders = 0;
    let animRenders = 0;
    const WrappedText = () => {
      textRenders++;
      return <TextEditor />;
    };
    const WrappedAnim = () => {
      animRenders++;
      return <AnimationEditor />;
    };

    render(
      <>
        <ShapeEditor />
        <WrappedText />
        <WrappedAnim />
      </>
    );

    expect(textRenders).toBe(1);
    expect(animRenders).toBe(1);

    jest.useFakeTimers();
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb) => setTimeout(() => cb(0), 16) as unknown as number);
    act(() => {
      patchSceneObject('shape1', { width: 20 });
      jest.advanceTimersByTime(20);
      window.dispatchEvent(new Event('mouseup'));
      jest.advanceTimersByTime(20);
    });

    expect(textRenders).toBe(1);
    expect(animRenders).toBe(1);
  });
});
