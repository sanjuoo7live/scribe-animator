import React from 'react';
import type { ImportedSvg } from '../domain/types';

type Props = { svg: ImportedSvg; fitContainer?: boolean };

const SvgImportPreview: React.FC<Props> = ({ svg, fitContainer }) => {
  const common = { viewBox: svg.viewBox.join(' ') } as any;
  const styleContain = { width: '100%', height: '100%', display: 'block' } as React.CSSProperties;
  const styleAuto = { maxWidth: '100%', height: 'auto', border: '1px solid #ccc' } as React.CSSProperties;
  return (
    <svg
      {...common}
      {...(fitContainer ? {} : { width: svg.width, height: svg.height })}
      style={fitContainer ? styleContain : styleAuto}
      preserveAspectRatio="xMidYMid meet"
    >
      {svg.paths.map(p => (
        <path
          key={p.hash}
          d={p.d}
          fill={p.fill || 'none'}
          stroke={p.stroke || 'none'}
          strokeWidth={p.strokeWidth}
          opacity={p.opacity}
        />
      ))}
    </svg>
  );
};

export default SvgImportPreview;
