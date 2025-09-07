export const dispatchPanelUpdate = (fn: () => void) => {
  // TODO: wire rAF-batched updates + one-gesture-one-undo
  fn();
};
