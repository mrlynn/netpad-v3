/**
 * @netpad/collaborate UI Components
 *
 * React components for the collaborate extension.
 * These can be used to build collaborate pages or integrate
 * collaborate features into existing pages.
 *
 * Usage:
 * ```tsx
 * import {
 *   GalleryGrid,
 *   ContributorCard,
 *   ContributorLeaderboard,
 *   CollaborateHero,
 * } from '@netpad/collaborate/components';
 * ```
 */

// Component exports
export { GalleryGrid } from './GalleryGrid';
export type { GalleryGridProps } from './GalleryGrid';

export { ContributorCard } from './ContributorCard';
export type { ContributorCardProps } from './ContributorCard';

export { ContributorLeaderboard } from './ContributorLeaderboard';
export type { ContributorLeaderboardProps } from './ContributorLeaderboard';

export { CollaborateHero } from './CollaborateHero';
export type { CollaborateHeroProps } from './CollaborateHero';

// Component IDs for extension system
export const COLLABORATE_COMPONENTS = {
  // Component IDs that can be overridden
  COLLABORATOR_FORM: 'collaborate:form',
  GALLERY_GRID: 'collaborate:gallery',
  CONTRIBUTOR_CARD: 'collaborate:contributor',
  LEADERBOARD: 'collaborate:leaderboard',
  HERO: 'collaborate:hero',
} as const;

// Type for component IDs
export type CollaborateComponentId = (typeof COLLABORATE_COMPONENTS)[keyof typeof COLLABORATE_COMPONENTS];
