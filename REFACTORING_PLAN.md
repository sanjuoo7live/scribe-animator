# Codebase Anal### Very Large Components (700-1000 lines) - HIGH PRIORITY

| Component | Lines | Location | Refactoring Priority |
|-----------|-------|----------|---------------------|
| `DrawPathEditor.tsx` | 916 | `/frontend/src/components/` | HIGH |
| `CanvasEditorRefactored.tsx` | 816 | `/frontend/src/components/` | **PARTIALLY REFACTORED** |
### Migration Steps
1. **Phase 1: Create new structure** ✅ COMPLETED
   - Create new directories
   - Move existing files to appropriate locations

2. **Phase 2: Update imports** ✅ COMPLETED
   - Update all import statements
   - Fix relative paths

3. **Phase 3: Component refactoring**
   - Break down large components
   - Implement new modular structure

## Domain-Driven Feature Structure ✅ COMPLETED

### Features Internal Structure:
```
features/<slice>/{domain,app,infra,ui}
├── ui/            # React components (HandLayer, CalibrationModal…)
├── app/           # hooks/orchestrators (useHandRuntime, useCalibration…)
├── domain/        # pure math: IK, tool offsets, tangent/normal math
└── infra/         # images, worker bootstrap, loaders
```

### Current Feature Organization:
- **Animation**: UI components in `ui/`, pure logic in `domain/`
- **Export**: UI components in `ui/`, orchestrators in `app/`
- **Collaboration**: UI components in `ui/`, system logic in `app/`
- **Project**: UI components in `ui/`, management logic in `app/`
- **Assets**: Ready for future developmentnderer.tsx` | 703 | `/frontend/src/components/canvas/renderers/` | HIGH |

**Note:** The `/components/canvas/` module is already well-structured with modular components. Focus refactoring efforts on the remaining large monolithic components.d Refactoring Plan

## Executive Summary
This document outlines the comprehensive analysis of the Scribe Animator codebase, identifying ALL large components that need refactoring and proposing a folder structure reorganization plan.

## Component Size Analysis

### Extremely Large Components (>1000 lines) - CRITICAL PRIORITY

| Component | Lines | Location | Refactoring Priority |
|-----------|-------|----------|---------------------|
| `SvgImporter.tsx` | 2026 | `/frontend/src/components/` | CRITICAL |
| `PropertiesPanel.tsx` | 1130 | `/frontend/src/components/` | CRITICAL |
| `Timeline.tsx` | 1188 | `/frontend/src/components/` | CRITICAL |

### Very Large Components (700-1000 lines) - HIGH PRIORITY

| Component | Lines | Location | Refactoring Priority |
|-----------|-------|----------|---------------------|
| `DrawPathEditor.tsx` | 916 | `/frontend/src/components/` | HIGH |
| `CanvasEditorRefactored.tsx` | 816 | `/frontend/src/components/` | **PARTIALLY REFACTORED** |
| `SvgPathRenderer.tsx` | 703 | `/frontend/src/components/canvas/renderers/` | HIGH |

### Large Components (400-700 lines) - MEDIUM PRIORITY

| Component | Lines | Location | Refactoring Priority |
|-----------|-------|----------|---------------------|
| `AssetPanel.tsx` | 693 | `/frontend/src/components/` | MEDIUM |
| `HandTesting.tsx` | 579 | `/frontend/src/components/` | MEDIUM |
| `CustomAssets.tsx` | 522 | `/frontend/src/components/` | MEDIUM |
| `PluginSystem.tsx` | 476 | `/frontend/src/components/` | MEDIUM |
| `CollaborationSystem.tsx` | 433 | `/frontend/src/components/` | MEDIUM |
| `AssetLibraryPopup.tsx` | 431 | `/frontend/src/components/` | MEDIUM |
| `AnimationCurveEditor.tsx` | 427 | `/frontend/src/components/` | MEDIUM |
| `EnhancedHandLibrary.tsx` | 444 | `/frontend/src/components/` | MEDIUM |
| `HandFollowerCalibrationModal.tsx` | 448 | `/frontend/src/components/hands/` | MEDIUM |
| `App.tsx` | 466 | `/frontend/src/` | MEDIUM |

### Medium Components (300-400 lines) - LOW PRIORITY

| Component | Lines | Location | Refactoring Priority |
|-----------|-------|----------|---------------------|
| `EnhancedPropsLibrary.tsx` | 411 | `/frontend/src/components/` | LOW |
| `EnhancedTextLibrary.tsx` | 391 | `/frontend/src/components/` | LOW |
| `ProjectManager.tsx` | 382 | `/frontend/src/components/` | LOW |
| `PerformanceAnalytics.tsx` | 373 | `/frontend/src/components/` | LOW |
| `EnhancedCharacterLibrary.tsx` | 374 | `/frontend/src/components/` | LOW |
| `AudioManager.tsx` | 364 | `/frontend/src/components/` | LOW |
| `ExportSystem.tsx` | 338 | `/frontend/src/components/` | LOW |
| `AdvancedTimeline.tsx` | 305 | `/frontend/src/components/` | LOW |
| `appStore.ts` | 304 | `/frontend/src/store/` | LOW |

### Small Components (<300 lines) - NO REFACTORING NEEDED
- Various components: 100-300 lines (AssetLibrary.tsx, DrawPathRenderer.tsx, etc.)

## Refactoring Recommendations

### CRITICAL PRIORITY (>1000 lines)

#### 1. SvgImporter.tsx (2026 lines) - CRITICAL PRIORITY
**Issues:**
- Massive file handling SVG import, parsing, and processing
- Multiple responsibilities: file upload, SVG parsing, path extraction, validation
- Complex state management for import process

**Proposed Refactoring:**
```tsx
// Break into:
- SvgImporterCore.tsx (main import UI)
- SvgParser.tsx (SVG parsing logic)
- PathExtractor.tsx (path extraction utilities)
- SvgValidator.tsx (validation logic)
- ImportProgressManager.tsx (progress tracking)
- SvgImportStore.ts (state management)
```

#### 2. PropertiesPanel.tsx (1130 lines) - CRITICAL PRIORITY
**Issues:**
- Handles all object properties editing
- Complex conditional rendering for different object types
- Mixed concerns: UI rendering, state management, validation

**Proposed Refactoring:**
```tsx
// Break into:
- PropertiesPanelCore.tsx (main panel)
- ObjectPropertyEditors/ (folder with individual editors)
  - TextPropertyEditor.tsx
  - ShapePropertyEditor.tsx
  - AnimationPropertyEditor.tsx
  - SvgPropertyEditor.tsx
- PropertyValidation.ts (validation logic)
- PropertyStateManager.tsx (state management)
```

#### 3. Timeline.tsx (1188 lines) - CRITICAL PRIORITY
**Issues:**
- Complex timeline rendering and interaction
- Multiple timeline views and controls
- Animation playback management
- Keyframe editing functionality

**Proposed Refactoring:**
```tsx
// Break into:
- TimelineCore.tsx (main timeline)
- TimelineControls.tsx (play/pause/scrub controls)
- TimelineTrack.tsx (individual track rendering)
- KeyframeEditor.tsx (keyframe manipulation)
- TimelineStateManager.tsx (timeline state)
- AnimationPlaybackEngine.tsx (playback logic)
```

### HIGH PRIORITY (700-1000 lines)

#### 4. DrawPathEditor.tsx (916 lines) - HIGH PRIORITY
**Issues:**
- Complex drawing path creation and editing
- Multiple tools and modes
- Path manipulation logic

**Proposed Refactoring:**
```tsx
// Break into:
- DrawPathEditorCore.tsx (main editor)
- DrawingTools.tsx (tool selection)
- PathManipulation.tsx (path editing)
- DrawingCanvas.tsx (canvas rendering)
- PathStorage.tsx (path data management)
```

#### 5. CanvasEditorRefactored.tsx (816 lines) - PARTIALLY REFACTORED
**Current Status:** Already refactored to use modular canvas system
**Issues:**
- Still contains main canvas logic and UI
- Could be further broken down into smaller components
- Event handling and state management still centralized

**Proposed Refactoring:**
```tsx
// Further break down (beyond current modular integration):
- CanvasEditorCore.tsx (main canvas container)
- CanvasToolbar.tsx (tools and controls)
- CanvasViewport.tsx (stage and layer management)
- CanvasObjectRenderer.tsx (object rendering coordination)
```

#### 6. SvgPathRenderer.tsx (703 lines) - HIGH PRIORITY
**Issues:**
- Complex path sampling and rendering logic
- Hand animation integration
- Multiple animation modes

**Proposed Refactoring:**
```tsx
// Break into:
- SvgPathCoreRenderer.tsx (main rendering)
- SvgPathAnimationEngine.tsx (animation logic)
- SvgPathHandFollower.tsx (hand animation)
- SvgPathUtils.tsx (utility functions)
```

### MEDIUM PRIORITY (400-700 lines)

#### 7. AssetPanel.tsx (693 lines) - MEDIUM PRIORITY
**Issues:**
- Multiple library components integrated
- Complex state management for popups

**Proposed Refactoring:**
```tsx
// Break into:
- AssetPanelCore.tsx (main panel)
- AssetCategoryManager.tsx (category handling)
- AssetPopupManager.tsx (popup logic)
- AssetLibraryContainer.tsx (library wrapper)
```

#### 8. HandTesting.tsx (579 lines) - MEDIUM PRIORITY
**Issues:**
- Hand animation testing interface
- Multiple test scenarios
- Complex UI for testing parameters

**Proposed Refactoring:**
```tsx
// Break into:
- HandTestingCore.tsx (main interface)
- TestScenarioManager.tsx (test scenarios)
- HandAnimationTester.tsx (animation testing)
- TestResultsDisplay.tsx (results visualization)
```

#### 9. CustomAssets.tsx (522 lines) - MEDIUM PRIORITY
**Issues:**
- Custom asset management
- File upload and processing
- Asset organization

**Proposed Refactoring:**
```tsx
// Break into:
- CustomAssetsCore.tsx (main interface)
- AssetUploader.tsx (upload functionality)
- AssetOrganizer.tsx (organization logic)
- AssetPreview.tsx (preview components)
```

#### 10. PluginSystem.tsx (476 lines) - MEDIUM PRIORITY
**Issues:**
- Plugin management system
- Plugin loading and execution
- Complex plugin architecture

**Proposed Refactoring:**
```tsx
// Break into:
- PluginSystemCore.tsx (main system)
- PluginLoader.tsx (loading logic)
- PluginExecutor.tsx (execution engine)
- PluginRegistry.tsx (plugin management)
```

#### 11. CollaborationSystem.tsx (433 lines) - MEDIUM PRIORITY
**Issues:**
- Real-time collaboration features
- User management
- Synchronization logic

**Proposed Refactoring:**
```tsx
// Break into:
- CollaborationCore.tsx (main system)
- UserManager.tsx (user management)
- SyncEngine.tsx (synchronization)
- CollaborationUI.tsx (UI components)
```

#### 12. AssetLibraryPopup.tsx (431 lines) - MEDIUM PRIORITY
**Issues:**
- Asset library popup interface
- Search and filtering
- Asset selection logic

**Proposed Refactoring:**
```tsx
// Break into:
- AssetLibraryPopupCore.tsx (main popup)
- AssetSearch.tsx (search functionality)
- AssetFilter.tsx (filtering logic)
- AssetSelector.tsx (selection interface)
```

#### 13. AnimationCurveEditor.tsx (427 lines) - MEDIUM PRIORITY
**Issues:**
- Animation curve editing interface
- Curve manipulation
- Keyframe editing

**Proposed Refactoring:**
```tsx
// Break into:
- AnimationCurveEditorCore.tsx (main editor)
- CurveManipulator.tsx (curve editing)
- KeyframeManager.tsx (keyframe handling)
- CurveVisualizer.tsx (visualization)
```

#### 14. EnhancedHandLibrary.tsx (444 lines) - MEDIUM PRIORITY
**Issues:**
- Hand asset library management
- Asset preview and selection

**Proposed Refactoring:**
```tsx
// Break into:
- EnhancedHandLibraryCore.tsx (main library)
- HandAssetPreview.tsx (preview components)
- HandAssetSelector.tsx (selection logic)
```

#### 15. HandFollowerCalibrationModal.tsx (448 lines) - MEDIUM PRIORITY
**Issues:**
- Hand calibration interface
- Complex calibration logic
- Multiple calibration modes

**Proposed Refactoring:**
```tsx
// Break into:
- HandCalibrationCore.tsx (main modal)
- CalibrationTools.tsx (calibration tools)
- CalibrationPreview.tsx (preview functionality)
```

#### 16. App.tsx (466 lines) - MEDIUM PRIORITY
**Issues:**
- Main application logic
- Multiple panel management
- Project management integration

**Proposed Refactoring:**
```tsx
// Break into:
- AppCore.tsx (main app structure)
- AppLayoutManager.tsx (layout logic)
- AppProjectManager.tsx (project operations)
- AppUIStateManager.tsx (UI state)
```

## Folder Structure Reorganization Plan

### Current Issues
- Files scattered in root directory
- Mixed concerns in components folder
- No clear separation of features
- Test files mixed with source

### Proposed New Structure
```
frontend/src/
├── components/
│   ├── core/           # Core UI components
│   ├── canvas/         # Canvas-related (already good)
│   ├── panels/         # Side panels (Asset, Properties, etc.)
│   ├── dialogs/        # Modal dialogs
│   └── shared/         # Shared/reusable components
├── features/           # Feature-based organization
│   ├── animation/
│   ├── assets/
│   ├── export/
│   ├── project/
│   └── collaboration/
├── hooks/              # Custom hooks (already exists)
├── store/              # State management (already exists)
├── utils/              # Utilities (already exists)
├── types/              # Type definitions (already exists)
├── services/           # API services
├── constants/          # App constants
└── __tests__/          # All tests consolidated
```

### Migration Steps
1. **Phase 1: Create new structure** ✅ COMPLETED
   - Create new directories
   - Move existing files to appropriate locations

2. **Phase 2: Update imports** ✅ COMPLETED
   - Update all import statements
   - Fix relative paths

3. **Phase 3: Component refactoring**
   - Break down large components
   - Implement new modular structure

4. **Phase 4: Testing and validation**
   - Ensure all functionality works
   - Update tests

## Implementation Timeline

### Phase 1: Critical Components (Weeks 1-4)
**Focus:** Extremely large components (>1000 lines)
- **Week 1:** SvgImporter.tsx refactoring
- **Week 2:** PropertiesPanel.tsx refactoring  
- **Week 3:** Timeline.tsx refactoring
- **Week 4:** Testing and integration of Phase 1 components

### Phase 2: High Priority Components (Weeks 5-8)
**Focus:** Very large components (700-1000 lines) - excluding already refactored canvas module
- **Week 5:** DrawPathEditor.tsx refactoring
- **Week 6:** Further CanvasEditorRefactored.tsx breakdown (already uses modular canvas system)
- **Week 7:** SvgPathRenderer.tsx refactoring
- **Week 8:** Integration testing

### Phase 3: Medium Priority Components (Weeks 9-12)
**Focus:** Large components (400-700 lines)
- **Week 9:** AssetPanel.tsx and HandTesting.tsx
- **Week 10:** CustomAssets.tsx and PluginSystem.tsx
- **Week 11:** CollaborationSystem.tsx and AssetLibraryPopup.tsx
- **Week 12:** AnimationCurveEditor.tsx and remaining medium components

### Phase 4: Folder Structure & Testing (Weeks 13-16)
- **Week 13:** Create new directory structure
- **Week 14:** Move files and update imports
- **Week 15:** Comprehensive testing
- **Week 16:** Documentation and final cleanup

### Phase 5: Low Priority & Polish (Weeks 17-20)
- **Week 17:** Medium components (300-400 lines)
- **Week 18:** Code optimization and performance improvements
- **Week 19:** Final testing and bug fixes
- **Week 20:** Documentation update and project handover

## Benefits of This Plan

1. **Massive Maintainability Improvement**: Breaking down 16+ large components into 50+ focused modules
2. **Enhanced Scalability**: Better organized codebase supports future feature development
3. **Improved Developer Experience**: Smaller, focused components are easier to understand and modify
4. **Better Performance**: Individual components can be optimized and lazy-loaded
5. **Easier Testing**: Smaller components enable more focused unit tests
6. **Reduced Bug Surface**: Isolated concerns reduce the impact of changes
7. **Better Code Reusability**: Modular components can be reused across features
8. **Simplified Debugging**: Issues can be isolated to specific modules
9. **Enhanced Collaboration**: Multiple developers can work on different modules simultaneously
10. **Future-Proof Architecture**: Clean separation of concerns supports long-term maintenance
11. **Canvas Module Already Optimized**: The `/components/canvas/` module is already well-structured and modular

## Risk Assessment

### High-Risk Components
- **SvgImporter.tsx (2026 lines)**: Complex SVG parsing logic - high risk of breaking imports
- **Timeline.tsx (1188 lines)**: Critical animation timing - high risk of breaking playback
- **PropertiesPanel.tsx (1130 lines)**: Affects all object editing - high risk of breaking UI

### Mitigation Strategies
1. **Incremental Refactoring**: Break down components gradually with thorough testing
2. **Feature Flags**: Use feature flags for new implementations
3. **Comprehensive Testing**: Implement extensive test coverage before refactoring
4. **Backup Strategy**: Maintain working backups of original components
5. **Team Review**: Multiple team members review critical refactors

## Next Steps

1. **Immediate Actions (This Week):**
   - Review and approve the comprehensive refactoring plan
   - Prioritize which critical components to tackle first
   - Set up development branches for refactoring work

2. **Short-term Goals (Next 2 Weeks):**
   - Begin with SvgImporter.tsx refactoring (highest risk, highest impact)
   - Establish refactoring patterns and best practices
   - Set up automated testing for refactored components

3. **Medium-term Goals (Next Month):**
   - Complete Phase 1 critical components
   - Implement new folder structure
   - Update import paths and dependencies

4. **Long-term Goals (2-3 Months):**
   - Complete all component refactoring
   - Full folder structure migration
   - Performance optimization and final testing

## Success Metrics

- **Code Quality**: Reduce average component size from 500+ lines to <200 lines
- **Maintainability**: Achieve clear separation of concerns in all major components
- **Performance**: Maintain or improve application performance
- **Testability**: Increase test coverage for refactored components
- **Developer Productivity**: Reduce time spent on debugging and maintenance
- **Canvas Module**: Already well-structured and modular (no refactoring needed)

---

*This comprehensive plan was generated based on detailed codebase analysis performed on 5 September 2025. Total components analyzed: 50+ | Large components identified: 16+ | Estimated refactoring effort: 5 months*

**Update Note (5 September 2025):** CanvasEditorRefactored.tsx has been confirmed to be actively used and partially refactored to use the modular canvas system. The `/components/canvas/` module is already well-structured and does not require refactoring.
