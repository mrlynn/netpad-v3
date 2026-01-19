/**
 * Template Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_TEMPLATES,
  allTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getFeaturedTemplates,
  searchTemplates,
  getTemplateCounts,
  filterTemplates,
  businessSalesTemplates,
  healthcareWellnessTemplates,
  TEMPLATE_CATEGORIES,
} from '../index';

describe('@netpad/templates', () => {
  describe('allTemplates / ALL_TEMPLATES', () => {
    it('should export 100+ templates', () => {
      expect(ALL_TEMPLATES.length).toBeGreaterThanOrEqual(100);
      expect(allTemplates.length).toBe(ALL_TEMPLATES.length);
    });

    it('should have unique IDs', () => {
      const ids = ALL_TEMPLATES.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = TEMPLATE_CATEGORIES.map(c => c.id);
      ALL_TEMPLATES.forEach(t => {
        expect(validCategories).toContain(t.category);
      });
    });

    it('should have required fields for each template', () => {
      ALL_TEMPLATES.forEach(t => {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.shortDescription).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.fieldConfigs).toBeDefined();
        expect(Array.isArray(t.fieldConfigs)).toBe(true);
        expect(t.theme).toBeDefined();
      });
    });
  });

  describe('getTemplateById', () => {
    it('should find existing template by ID', () => {
      const template = getTemplateById('contact-form');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Contact Form');
    });

    it('should return undefined for non-existent template', () => {
      const template = getTemplateById('non-existent-template');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for a category', () => {
      const templates = getTemplatesByCategory('business-sales');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => {
        expect(t.category).toBe('business-sales');
      });
    });

    it('should return empty array for invalid category', () => {
      const templates = getTemplatesByCategory('invalid-category');
      expect(templates).toEqual([]);
    });
  });

  describe('getFeaturedTemplates', () => {
    it('should return featured templates', () => {
      const featured = getFeaturedTemplates();
      expect(featured.length).toBeGreaterThan(0);
      featured.forEach(t => {
        expect(t.isFeatured).toBe(true);
      });
    });

    it('should respect limit parameter', () => {
      const featured = getFeaturedTemplates(5);
      expect(featured.length).toBeLessThanOrEqual(5);
    });
  });

  describe('searchTemplates', () => {
    it('should find templates by name', () => {
      const results = searchTemplates('contact');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.toLowerCase().includes('contact'))).toBe(true);
    });

    it('should find templates by tag', () => {
      const results = searchTemplates('healthcare');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = searchTemplates('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  describe('getTemplateCounts', () => {
    it('should return counts for all categories', () => {
      const counts = getTemplateCounts();
      expect(Object.keys(counts).length).toBeGreaterThan(0);

      // All counts should be positive numbers
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });

    it('should sum to total template count', () => {
      const counts = getTemplateCounts();
      const totalFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(totalFromCounts).toBe(ALL_TEMPLATES.length);
    });
  });

  describe('filterTemplates', () => {
    it('should filter by category', () => {
      const results = filterTemplates({ category: 'healthcare-wellness' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe('healthcare-wellness');
      });
    });

    it('should filter by complexity', () => {
      const results = filterTemplates({ complexity: 'simple' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.complexity).toBe('simple');
      });
    });

    it('should filter by featured', () => {
      const results = filterTemplates({ featured: true });
      results.forEach(t => {
        expect(t.isFeatured).toBe(true);
      });
    });

    it('should combine multiple filters', () => {
      const results = filterTemplates({
        category: 'business-sales',
        complexity: 'simple',
      });
      results.forEach(t => {
        expect(t.category).toBe('business-sales');
        expect(t.complexity).toBe('simple');
      });
    });
  });

  describe('category exports', () => {
    it('should export businessSalesTemplates', () => {
      expect(businessSalesTemplates.length).toBeGreaterThan(0);
      businessSalesTemplates.forEach(t => {
        expect(t.category).toBe('business-sales');
      });
    });

    it('should export healthcareWellnessTemplates', () => {
      expect(healthcareWellnessTemplates.length).toBeGreaterThan(0);
      healthcareWellnessTemplates.forEach(t => {
        expect(t.category).toBe('healthcare-wellness');
      });
    });
  });

  describe('TEMPLATE_CATEGORIES', () => {
    it('should have 15 categories', () => {
      expect(TEMPLATE_CATEGORIES.length).toBe(15);
    });

    it('should have required metadata for each category', () => {
      TEMPLATE_CATEGORIES.forEach(cat => {
        expect(cat.id).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.description).toBeDefined();
        expect(cat.icon).toBeDefined();
        expect(cat.color).toBeDefined();
      });
    });
  });
});
