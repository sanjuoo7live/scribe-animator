export type ImportProgress =
  | { stage: 'sanitize' }
  | { stage: 'parse'; readBytes?: number; totalBytes?: number }
  | { stage: 'extract'; elementsSeen: number }
  | { stage: 'flatten'; resolvedUses: number }
  | { stage: 'validate'; paths: number }
  | { stage: 'normalize'; paths: number }
  | { stage: 'done' }
  | { stage: 'error'; message: string };
