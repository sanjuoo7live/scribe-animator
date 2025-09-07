import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<Props> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = React.useCallback(() => setOpen((o) => !o), []);

  return (
    <section className="bg-gray-800 rounded-md border border-gray-700">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex justify-between items-center px-2 py-1 text-sm font-semibold text-gray-300"
      >
        {title}
        <span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-2">{children}</div>}
    </section>
  );
};

export default React.memo(CollapsibleSection);
