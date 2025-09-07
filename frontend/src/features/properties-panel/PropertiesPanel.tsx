import React from 'react';
import { useAppStore } from '../../store/appStore';
import { PositionEditor } from './editors/PositionEditor';
import { TextEditor } from './editors/TextEditor';
import { ShapeEditor } from './editors/ShapeEditor';
import { ImageEditor } from './editors/ImageEditor';
import { SvgPathEditor } from './editors/SvgPathEditor';
import { AnimationEditor } from './editors/AnimationEditor';
import { LayerOrderEditor } from './editors/LayerOrderEditor';
import CollapsibleSection from './CollapsibleSection';

const PropertiesPanel: React.FC = () => {
  // Subscribe to only what we need to avoid broad re-renders
  const currentProject = useAppStore((s) => s.currentProject);
  const selectedObject = useAppStore((s) => s.selectedObject);
  const obj = currentProject?.objects.find((o) => o.id === selectedObject);

  // Note: normalization now runs in store.addObject; the panel no longer writes

  if (!obj) {
    return (
      <div className="h-full p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
        <p className="text-gray-500 text-sm">Select an object to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 bg-gray-800 text-white overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
      <div
        className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4"
        data-testid="properties-grid"
      >
        <CollapsibleSection title="Object Info">
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <input
                type="text"
                value={obj.type}
                readOnly
                className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ID</label>
              <input
                type="text"
                value={obj.id}
                readOnly
                className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm text-xs"
              />
            </div>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Position">
          <PositionEditor />
        </CollapsibleSection>
        {obj.type === 'text' && (
          <CollapsibleSection title="Text">
            <TextEditor />
          </CollapsibleSection>
        )}
        {obj.type === 'shape' && (
          <CollapsibleSection title="Shape">
            <ShapeEditor />
          </CollapsibleSection>
        )}
        {obj.type === 'image' && (
          <CollapsibleSection title="Image">
            <ImageEditor />
          </CollapsibleSection>
        )}
        {obj.type === 'svgPath' && (
          <CollapsibleSection title="SVG Path">
            <SvgPathEditor />
          </CollapsibleSection>
        )}
        <CollapsibleSection title="Animation">
          <AnimationEditor />
        </CollapsibleSection>
        <CollapsibleSection title="Layer Order">
          <LayerOrderEditor />
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default React.memo(PropertiesPanel);
