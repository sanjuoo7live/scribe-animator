export const flags = {
  // PHASE1: adaptive sampler and lazy LUT defaults
  sampler: {
    adaptive: true,
    preview: { minStep: 2.75, maxStep: 7.0 },
    export: { minStep: 1.25, maxStep: 4.0 }
  },
  handFollower: { lazyLUT: true },
  preview: { dprCap: 1.5 }
} as const;
export type Flags = typeof flags;
