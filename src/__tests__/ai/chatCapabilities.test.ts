/**
 * Tests for Chat Capabilities Module
 *
 * Tests that capability functions return well-structured content
 * derived from helpContent.
 */

import {
  getSearchFormsCapability,
  getTemplateGalleryCapability,
  getConversationalFormsCapability,
  getNpmPackagesCapability,
  getApplicationContractsCapability,
} from '@/lib/ai/chatCapabilities';

describe('getSearchFormsCapability', () => {
  it('returns a non-empty string', () => {
    const result = getSearchFormsCapability();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('mentions search forms', () => {
    const result = getSearchFormsCapability();
    expect(result.toLowerCase()).toContain('search');
    expect(result.toLowerCase()).toContain('form');
  });

  it('mentions formType search', () => {
    const result = getSearchFormsCapability();
    expect(result).toContain("formType: 'search'");
  });

  it('mentions key search templates', () => {
    const result = getSearchFormsCapability();
    expect(result).toContain('Customer Search');
    expect(result).toContain('Order Search');
    expect(result).toContain('Support Ticket Search');
  });

  it('mentions form types', () => {
    const result = getSearchFormsCapability();
    expect(result).toContain('data-entry');
    expect(result).toContain('conversational');
  });
});

describe('getTemplateGalleryCapability', () => {
  it('returns a non-empty string', () => {
    const result = getTemplateGalleryCapability();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('mentions template gallery', () => {
    const result = getTemplateGalleryCapability();
    expect(result).toContain('Template Gallery');
  });

  it('mentions browsing by category', () => {
    const result = getTemplateGalleryCapability();
    expect(result.toLowerCase()).toContain('category');
  });

  it('mentions preview functionality', () => {
    const result = getTemplateGalleryCapability();
    expect(result.toLowerCase()).toContain('preview');
  });
});

describe('getConversationalFormsCapability', () => {
  it('returns a non-empty string', () => {
    const result = getConversationalFormsCapability();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('mentions conversational forms', () => {
    const result = getConversationalFormsCapability();
    expect(result).toContain('Conversational Forms');
  });

  it('mentions AI assistant interaction', () => {
    const result = getConversationalFormsCapability();
    expect(result.toLowerCase()).toContain('ai');
    expect(result.toLowerCase()).toContain('chat');
  });

  it('mentions built-in templates', () => {
    const result = getConversationalFormsCapability();
    expect(result).toContain('IT Helpdesk');
    expect(result).toContain('Customer Feedback');
    expect(result).toContain('Patient Intake');
  });

  it('mentions personas', () => {
    const result = getConversationalFormsCapability();
    expect(result.toLowerCase()).toContain('persona');
  });
});

describe('getNpmPackagesCapability', () => {
  it('returns a non-empty string', () => {
    const result = getNpmPackagesCapability();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('mentions npm packages', () => {
    const result = getNpmPackagesCapability();
    expect(result).toContain('npm');
  });

  it('mentions package scopes', () => {
    const result = getNpmPackagesCapability();
    expect(result).toContain('@netpad/');
  });

  it('mentions marketplace features', () => {
    const result = getNpmPackagesCapability();
    expect(result.toLowerCase()).toContain('marketplace');
  });

  it('mentions semantic versioning', () => {
    const result = getNpmPackagesCapability();
    expect(result.toLowerCase()).toContain('versioning');
  });
});

describe('getApplicationContractsCapability', () => {
  it('returns a non-empty string', () => {
    const result = getApplicationContractsCapability();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('mentions contracts', () => {
    const result = getApplicationContractsCapability();
    expect(result).toContain('Contract');
  });

  it('mentions breaking changes', () => {
    const result = getApplicationContractsCapability();
    expect(result.toLowerCase()).toContain('breaking');
  });

  it('mentions contract lifecycle', () => {
    const result = getApplicationContractsCapability();
    expect(result).toContain('Draft');
    expect(result).toContain('Active');
    expect(result).toContain('Deprecated');
  });

  it('mentions component protection', () => {
    const result = getApplicationContractsCapability();
    expect(result.toLowerCase()).toContain('protection');
    expect(result.toLowerCase()).toContain('lock');
  });

  it('mentions migration guides', () => {
    const result = getApplicationContractsCapability();
    expect(result.toLowerCase()).toContain('migration');
  });
});
