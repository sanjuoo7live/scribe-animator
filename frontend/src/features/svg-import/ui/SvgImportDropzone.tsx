import React, { useCallback, useRef } from 'react';

type Props = { onText: (text: string) => void };

// Simple file drop/choose component. Calls onText with the file's contents.
const SvgImportDropzone: React.FC<Props> = ({ onText }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      onText(text);
    };
    reader.readAsText(f);
  }, [onText]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={{ border: '2px dashed #888', padding: '1rem' }}>
      <input type="file" accept=".svg" ref={inputRef} onChange={onChange} />
      <p>Drop SVG file here or click to choose.</p>
    </div>
  );
};

export default SvgImportDropzone;

