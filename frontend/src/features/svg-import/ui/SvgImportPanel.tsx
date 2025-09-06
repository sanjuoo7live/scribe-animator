import React, { useCallback, useState } from 'react';
import { useSvgImportFlow } from '../app/useSvgImportFlow';
import SvgImportDropzone from './SvgImportDropzone';
import SvgImportPreview from './SvgImportPreview';
import SvgImportErrors from './SvgImportErrors';
import SvgImportDrawPreview from './SvgImportDrawPreview';
import SvgDrawSettings, { SvgDrawOptions, defaultSvgDrawOptions } from '../../../components/shared/SvgDrawSettings';
import { useAppStore } from '../../../store/appStore';
import SvgTracePanel from './SvgTracePanel';

const SvgImportPanel: React.FC = () => {
  const { start, cancel, progress, result, error } = useSvgImportFlow();
  const addObject = useAppStore(s => s.addObject);
  const [drawOptions, setDrawOptions] = useState<SvgDrawOptions>(defaultSvgDrawOptions);
  const [showDrawPreview, setShowDrawPreview] = useState<boolean>(false);

  const handleText = useCallback((text: string) => {
    start(text).catch(() => {});
  }, [start]);

  const handleAdd = useCallback((payload: { paths: { d: string; stroke?: string; strokeWidth?: number; fill?: string; len?: number }[]; totalLen: number; durationSec: number }) => {
    if (!result) return;
    const w = result.viewBox[2];
    const h = result.viewBox[3];
    addObject({
      id: `draw-${Date.now()}`,
      type: 'svgPath',
      x: 150,
      y: 150,
      width: w,
      height: h,
      rotation: 0,
      properties: {
        paths: payload.paths,
        totalLen: payload.totalLen,
        previewDraw: drawOptions.mode === 'preview',
        drawOptions,
      },
      animationType: 'drawIn',
      animationStart: 0,
      animationDuration: payload.durationSec,
      animationEasing: 'linear',
    });
  }, [addObject, drawOptions, result]);

  const [tab, setTab] = useState<'import' | 'trace'>('import');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <button onClick={() => setTab('import')} className={`chip ${tab==='import' ? 'chip-active' : ''}`}>Import SVG</button>
        <button onClick={() => setTab('trace')} className={`chip ${tab==='trace' ? 'chip-active' : ''}`}>Trace Image</button>
      </div>
      {tab === 'import' ? (
        <>
          <SvgImportDropzone onText={handleText} />
          <div className="text-xs text-gray-300">Stage: {progress.stage}</div>
          {error && <SvgImportErrors error={error} />}
          {result && (
            <>
              <SvgImportPreview svg={result} />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input type="checkbox" checked={showDrawPreview} onChange={e => setShowDrawPreview(e.target.checked)} />
                  Show Draw Preview
                </label>
              </div>
              <SvgDrawSettings value={drawOptions} onChange={setDrawOptions} totalLen={undefined} compact />
              {showDrawPreview && (
                <SvgImportDrawPreview svg={result} drawOptions={drawOptions} />
              )}
            </>
          )}
          {progress.stage !== 'done' && progress.stage !== 'error' && (
            <button onClick={cancel} className="chip">Cancel</button>
          )}
        </>
      ) : (
        <SvgTracePanel />
      )}
    </div>
  );
};

export default SvgImportPanel;
