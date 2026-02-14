/**
 * Tests for tour content definitions
 * @module lib/tourContent
 */

import {
  workflowEditorTourSteps,
  pipelineBuilderTourSteps,
  formBuilderTourSteps,
  quickStartTips,
} from '@/lib/tourContent';

const allTours = [
  { name: 'workflowEditorTourSteps', steps: workflowEditorTourSteps },
  { name: 'pipelineBuilderTourSteps', steps: pipelineBuilderTourSteps },
  { name: 'formBuilderTourSteps', steps: formBuilderTourSteps },
];

describe('tourContent', () => {
  describe.each(allTours)('$name', ({ steps }) => {
    it('is a non-empty array', () => {
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('every step has target, title, and content', () => {
      for (const step of steps) {
        expect(step.target).toBeTruthy();
        expect(step.title).toBeTruthy();
        expect(step.content).toBeTruthy();
      }
    });

    it('placement values are valid when set', () => {
      const valid = ['top', 'bottom', 'left', 'right', 'center'];
      for (const step of steps) {
        if (step.placement) {
          expect(valid).toContain(step.placement);
        }
      }
    });

    it('spotlightPadding is positive when set', () => {
      for (const step of steps) {
        if (step.spotlightPadding !== undefined) {
          expect(step.spotlightPadding).toBeGreaterThan(0);
        }
      }
    });

    it('has no duplicate titles', () => {
      const titles = steps.map((s: any) => s.title);
      expect(new Set(titles).size).toBe(titles.length);
    });

    it('first step is a welcome/intro step', () => {
      const first = steps[0];
      expect(
        first.title.toLowerCase().includes('welcome') ||
        first.target === 'center'
      ).toBe(true);
    });
  });

  describe('workflowEditorTourSteps', () => {
    it('has at least 5 steps', () => {
      expect(workflowEditorTourSteps.length).toBeGreaterThanOrEqual(5);
    });

    it('covers toolbar, palette, and canvas', () => {
      const targets = workflowEditorTourSteps.map(s => s.target).join(' ');
      expect(targets).toContain('toolbar');
      expect(targets).toContain('palette');
      expect(targets).toContain('canvas');
    });
  });

  describe('pipelineBuilderTourSteps', () => {
    it('has at least 3 steps', () => {
      expect(pipelineBuilderTourSteps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('formBuilderTourSteps', () => {
    it('has at least 3 steps', () => {
      expect(formBuilderTourSteps.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('quickStartTips', () => {
    it('is defined and is an object', () => {
      expect(quickStartTips).toBeDefined();
      expect(typeof quickStartTips).toBe('object');
    });

    it('has at least one tip category', () => {
      expect(Object.keys(quickStartTips).length).toBeGreaterThan(0);
    });

    it('each category has non-empty entries', () => {
      for (const [key, value] of Object.entries(quickStartTips)) {
        expect(key).toBeTruthy();
        if (Array.isArray(value)) {
          expect(value.length).toBeGreaterThan(0);
        } else {
          expect(value).toBeTruthy();
        }
      }
    });
  });
});
