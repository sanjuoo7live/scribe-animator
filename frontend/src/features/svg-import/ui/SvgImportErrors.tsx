import React from 'react';

type Props = { error: string | null };

const SvgImportErrors: React.FC<Props> = ({ error }) => {
  if (!error) return null;
  return <div>{error}</div>;
};

export default SvgImportErrors;
