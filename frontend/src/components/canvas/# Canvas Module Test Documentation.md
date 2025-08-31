# Canvas Module Test Documentation

## Overview
This document outlines the testing strategy for the Canvas module in Scribe Animator. Tests ensure the modular architecture (CanvasContext, RendererRegistry, renderers, AnimationEngine, etc.) functions correctly, with a focus on unit tests for isolated components and integration tests for interactions. UI testing is supported for full canvas workflows.

## Testing Setup
- **Framework**: Jest + React Testing Library (for React components and hooks).
- **Mocks**: 
    - Konva.js: Use `jest-canvas-mock` to mock the Stage and Layer.
    - Zustand: Mock stores for state management.
    - requestAnimationFrame: Use `jest.useFakeTimers()` for animation tests.
- **Dependencies**: Install via `npm install --save-dev @testing-library/react @testing-library/jest-dom jest-canvas-mock`.
- **Test Directory**: Place tests in `frontend/src/components/canvas/__tests__/` (e.g., `RendererRegistry.test.tsx`).
- **Run Tests**: `npm test -- --testPathPattern="canvas/__tests__"`.

## Test Categories
- **Unit Tests**: Test individual functions/hooks (e.g., RendererRegistry, useCanvasEvents).
- **Component Tests**: Test React components/renderers (e.g., TextRenderer, CanvasProvider).
- **Integration Tests**: Test module interactions (e.g., rendering objects via RendererRegistry in CanvasContext).
- **UI Tests**: Use Cypress for end-to-end testing of canvas interactions (e.g., drawing paths, selecting objects).
- **Performance Tests**: Benchmark AnimationEngine and CanvasDiagnostics.

## Sample Test Code

### 1. RendererRegistry Unit Test (`__tests__/RendererRegistry.test.tsx`)
Tests registration and retrieval of renderers.
