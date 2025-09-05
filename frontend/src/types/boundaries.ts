/**
 * Architectural Boundary Configuration
 *
 * This file defines the boundaries for the domain-driven architecture
 * and ensures proper separation of concerns.
 *
 * BOUNDARY LOCKS IMPLEMENTED:
 * ✅ TypeScript path mappings for clean imports
 * ✅ ESLint rules to enforce architectural constraints
 * ✅ Domain-driven feature organization
 * ✅ Component organization by responsibility
 */

export const ARCHITECTURAL_BOUNDARIES = {
  // Feature boundaries - each feature is a bounded context
  features: {
    animation: {
      domain: 'Business logic for animation system',
      app: 'Application services and use cases',
      infra: 'Infrastructure concerns (API, storage)',
      ui: 'UI components and presentation logic'
    },
    assets: {
      domain: 'Asset management business logic',
      app: 'Asset application services',
      infra: 'Asset storage and retrieval',
      ui: 'Asset UI components'
    },
    collaboration: {
      domain: 'Collaboration business logic',
      app: 'Collaboration services',
      infra: 'Real-time communication',
      ui: 'Collaboration UI'
    },
    export: {
      domain: 'Export business logic',
      app: 'Export services',
      infra: 'File generation and storage',
      ui: 'Export UI components'
    },
    project: {
      domain: 'Project management logic',
      app: 'Project services',
      infra: 'Project persistence',
      ui: 'Project UI'
    },
    'svg-import': {
      domain: 'SVG processing and import business logic',
      app: 'SVG import application services and orchestration',
      infra: 'File handling, tracing, and external integrations',
      ui: 'SVG import UI components and controls'
    }
  },

  // Component boundaries - organized by responsibility
  components: {
    core: 'Core application components',
    panels: 'Panel components for sidebars/toolbars',
    dialogs: 'Modal and dialog components',
    shared: 'Shared/reusable components',
    hands: 'Hand-related components'
  },

  // Infrastructure boundaries
  infrastructure: {
    store: 'Global state management',
    types: 'TypeScript type definitions',
    utils: 'Utility functions',
    services: 'External service integrations',
    hooks: 'Custom React hooks',
    constants: 'Application constants'
  }
} as const;

/**
 * Import Rules Enforced by Boundary Locks:
 *
 * 1. PATH MAPPINGS: Use @features/*, @components/*, @store/*, etc.
 *    Example: import { useTimeline } from '@features/animation/domain/useTimeline'
 *
 * 2. ARCHITECTURAL CONSTRAINTS:
 *    - Domain layers cannot directly use React hooks
 *    - UI layers cannot make direct API calls
 *    - Infrastructure layers cannot contain React components
 *
 * 3. CROSS-LAYER COMMUNICATION:
 *    - Use dependency injection for domain services
 *    - Define interfaces for cross-boundary contracts
 *    - Application layer orchestrates domain and infrastructure
 */
export type BoundaryLayer = keyof typeof ARCHITECTURAL_BOUNDARIES;