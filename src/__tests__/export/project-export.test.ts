/**
 * Project Export Tests
 * 
 * Tests for project bundle export functionality
 */

import '@testing-library/jest-dom';
import { 
  cleanFormForExport, 
  cleanWorkflowForExport,
  createManifest,
  createBundleExport,
  generateDeploymentConfig,
} from '@/lib/templates/export';
import { FormDefinition, WorkflowDefinition, BundleExport } from '@/types/template';
import { FormConfiguration } from '@/types/form';
import { WorkflowDocument } from '@/types/workflow';

describe('Project Export', () => {
  describe('cleanFormForExport', () => {
    it('should remove sensitive fields from form', () => {
      const form: FormConfiguration = {
        id: 'form_123',
        name: 'Test Form',
        description: 'A test form',
        collection: 'test_collection',
        database: 'test_db',
        fieldConfigs: [],
        organizationId: 'org_123',
        createdBy: 'user_123',
        connectionString: 'mongodb://secret',
        dataSource: {
          vaultId: 'vault_123',
          collection: 'test_collection',
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const cleaned = cleanFormForExport(form);

      expect(cleaned).not.toHaveProperty('id');
      expect(cleaned).not.toHaveProperty('organizationId');
      expect(cleaned).not.toHaveProperty('createdBy');
      expect(cleaned).not.toHaveProperty('connectionString');
      expect(cleaned).not.toHaveProperty('dataSource');
      expect(cleaned).toHaveProperty('name', 'Test Form');
      expect(cleaned).toHaveProperty('description', 'A test form');
      expect(cleaned).toHaveProperty('fieldConfigs', []);
    });

    it('should preserve exportable fields', () => {
      const form: FormConfiguration = {
        name: 'Test Form',
        fieldConfigs: [
          {
            path: 'email',
            label: 'Email',
            type: 'email',
            included: true,
          },
        ],
        theme: {
          primaryColor: '#00ED64',
        },
        slug: 'test-form',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const cleaned = cleanFormForExport(form);

      expect(cleaned.name).toBe('Test Form');
      expect(cleaned.fieldConfigs).toHaveLength(1);
      expect(cleaned.theme).toEqual({ primaryColor: '#00ED64' });
      expect(cleaned.slug).toBe('test-form');
    });
  });

  describe('cleanWorkflowForExport', () => {
    it('should remove sensitive fields from workflow', () => {
      const workflow: WorkflowDocument = {
        id: 'workflow_123',
        orgId: 'org_123',
        projectId: 'proj_123',
        name: 'Test Workflow',
        description: 'A test workflow',
        slug: 'test-workflow',
        canvas: {
          nodes: [],
          edges: [],
        },
        settings: {
          enabled: true,
        },
        variables: [],
        status: 'active',
        version: 1,
        tags: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'user_123',
        lastModifiedBy: 'user_123',
        stats: {
          executionCount: 0,
        },
      };

      const cleaned = cleanWorkflowForExport(workflow);

      expect(cleaned).not.toHaveProperty('id');
      expect(cleaned).not.toHaveProperty('orgId');
      expect(cleaned).not.toHaveProperty('createdBy');
      expect(cleaned).not.toHaveProperty('lastModifiedBy');
      expect(cleaned).not.toHaveProperty('stats');
      expect(cleaned).toHaveProperty('name', 'Test Workflow');
      expect(cleaned).toHaveProperty('canvas');
      expect(cleaned).toHaveProperty('settings');
    });

    it('should preserve exportable workflow fields', () => {
      const workflow: WorkflowDocument = {
        id: 'workflow_123',
        orgId: 'org_123',
        name: 'Test Workflow',
        slug: 'test-workflow',
        canvas: {
          nodes: [
            {
              id: 'node_1',
              type: 'form-trigger',
              position: { x: 0, y: 0 },
              data: { formId: 'form_123' },
            },
          ],
          edges: [],
        },
        settings: {
          enabled: true,
        },
        variables: [],
        status: 'active',
        version: 1,
        tags: ['test'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        createdBy: 'user_123',
        lastModifiedBy: 'user_123',
        stats: {
          executionCount: 0,
        },
      };

      const cleaned = cleanWorkflowForExport(workflow);

      expect(cleaned.name).toBe('Test Workflow');
      expect(cleaned.canvas.nodes).toHaveLength(1);
      expect(cleaned.settings).toEqual({ enabled: true });
      expect(cleaned.tags).toEqual(['test']);
    });
  });

  describe('createManifest', () => {
    it('should create manifest with form and workflow assets', () => {
      const forms: FormDefinition[] = [
        {
          name: 'Form 1',
          fieldConfigs: [],
        },
        {
          name: 'Form 2',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Workflow 1',
          canvas: { nodes: [], edges: [] },
          settings: {},
        },
      ];

      const manifest = createManifest(
        'Test Project',
        '1.0.0',
        {
          description: 'Test project description',
          forms,
          workflows,
          tags: ['test', 'export'],
        }
      );

      expect(manifest.name).toBe('Test Project');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('Test project description');
      expect(manifest.assets.forms).toHaveLength(2);
      expect(manifest.assets.workflows).toHaveLength(1);
      expect(manifest.tags).toEqual(['test', 'export']);
      expect(manifest.createdAt).toBeDefined();
      expect(manifest.updatedAt).toBeDefined();
    });

    it('should create manifest without forms or workflows', () => {
      const manifest = createManifest('Empty Project', '1.0.0', {
        description: 'Empty project',
      });

      expect(manifest.name).toBe('Empty Project');
      expect(manifest.assets.forms).toBeUndefined();
      expect(manifest.assets.workflows).toBeUndefined();
    });
  });

  describe('createBundleExport', () => {
    it('should create bundle with all components', () => {
      const manifest = createManifest('Test Project', '1.0.0', {
        description: 'Test project',
      });

      const forms: FormDefinition[] = [
        {
          name: 'Test Form',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Test Workflow',
          canvas: { nodes: [], edges: [] },
          settings: {},
        },
      ];

      const theme = {
        primaryColor: '#00ED64',
      };

      const bundle = createBundleExport(manifest, forms, workflows, theme);

      expect(bundle.manifest).toEqual(manifest);
      expect(bundle.forms).toEqual(forms);
      expect(bundle.workflows).toEqual(workflows);
      expect(bundle.theme).toEqual(theme);
    });

    it('should create bundle without optional components', () => {
      const manifest = createManifest('Minimal Project', '1.0.0', {});

      const bundle = createBundleExport(manifest);

      expect(bundle.manifest).toEqual(manifest);
      expect(bundle.forms).toBeUndefined();
      expect(bundle.workflows).toBeUndefined();
      expect(bundle.theme).toBeUndefined();
    });
  });

  describe('generateDeploymentConfig', () => {
    it('should generate deployment config with required env vars', () => {
      const forms: FormDefinition[] = [
        {
          name: 'Test Form',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Test Workflow',
          canvas: {
            nodes: [
              {
                id: 'node_1',
                type: 'email-send',
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
          },
          settings: {},
        },
      ];

      const config = generateDeploymentConfig(
        'Test Project',
        forms,
        workflows,
        []
      );

      expect(config.mode).toBe('standalone');
      expect(config.environment.required).toBeDefined();
      expect(config.environment.required.length).toBeGreaterThan(0);
      
      // Should include core required vars
      const varNames = config.environment.required.map(v => v.name);
      expect(varNames).toContain('MONGODB_URI');
      expect(varNames).toContain('SESSION_SECRET');
      expect(varNames).toContain('VAULT_ENCRYPTION_KEY');
      
      // Should detect email integration
      expect(varNames).toContain('SMTP_HOST');
      expect(varNames).toContain('SMTP_PORT');
      expect(varNames).toContain('FROM_EMAIL');
    });

    it('should detect file upload requirements', () => {
      const forms: FormDefinition[] = [
        {
          name: 'File Form',
          fieldConfigs: [
            {
              path: 'file',
              label: 'Upload File',
              type: 'file',
              included: true,
            },
          ],
        },
      ];

      const config = generateDeploymentConfig(
        'File Project',
        forms,
        [],
        []
      );

      const varNames = config.environment.required.map(v => v.name);
      expect(varNames).toContain('BLOB_READ_WRITE_TOKEN');
    });

    it('should detect bot protection requirements', () => {
      const forms: FormDefinition[] = [
        {
          name: 'Protected Form',
          fieldConfigs: [],
          botProtection: {
            turnstile: {
              enabled: true,
            },
          },
        },
      ];

      const config = generateDeploymentConfig(
        'Protected Project',
        forms,
        [],
        []
      );

      const varNames = config.environment.required.map(v => v.name);
      expect(varNames).toContain('TURNSTILE_SITE_KEY');
      expect(varNames).toContain('TURNSTILE_SECRET_KEY');
    });

    it('should generate database collections', () => {
      const forms: FormDefinition[] = [
        {
          name: 'Test Form',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Test Workflow',
          canvas: { nodes: [], edges: [] },
          settings: {},
        },
      ];

      const config = generateDeploymentConfig(
        'Test Project',
        forms,
        workflows,
        []
      );

      expect(config.database.collections).toBeDefined();
      expect(config.database.collections.length).toBeGreaterThan(0);
      
      // Should include forms collection
      const collectionNames = config.database.collections.map(c => c.name);
      expect(collectionNames).toContain('forms');
      expect(collectionNames).toContain('form_submissions');
      expect(collectionNames).toContain('workflows');
      expect(collectionNames).toContain('workflow_executions');
    });

    it('should include branding in deployment config', () => {
      const config = generateDeploymentConfig(
        'Branded Project',
        [],
        [],
        [],
        {
          branding: {
            primaryColor: '#00ED64',
            logo: 'https://example.com/logo.png',
          },
        }
      );

      expect(config.branding).toBeDefined();
      expect(config.branding?.appName).toBe('Branded Project');
      expect(config.branding?.primaryColor).toBe('#00ED64');
      expect(config.branding?.logo).toBe('https://example.com/logo.png');
    });
  });

  describe('Bundle Structure Validation', () => {
    it('should create valid bundle structure', () => {
      const forms: FormDefinition[] = [
        {
          name: 'Form 1',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Workflow 1',
          canvas: { nodes: [], edges: [] },
          settings: {},
        },
      ];

      const manifest = createManifest('Test Project', '1.0.0', {
        forms,
        workflows,
      });

      const bundle = createBundleExport(manifest, forms, workflows);

      // Validate bundle structure
      expect(bundle).toHaveProperty('manifest');
      expect(bundle).toHaveProperty('forms');
      expect(bundle).toHaveProperty('workflows');
      expect(bundle.manifest.name).toBe('Test Project');
      expect(bundle.forms).toHaveLength(1);
      expect(bundle.workflows).toHaveLength(1);
    });

    it('should preserve form and workflow relationships', () => {
      const formId = 'form_123';
      const forms: FormDefinition[] = [
        {
          name: 'Test Form',
          slug: 'test-form',
          fieldConfigs: [],
        },
      ];

      const workflows: WorkflowDefinition[] = [
        {
          name: 'Test Workflow',
          canvas: {
            nodes: [
              {
                id: 'node_1',
                type: 'form-trigger',
                position: { x: 0, y: 0 },
                data: { formId },
              },
            ],
            edges: [],
          },
          settings: {},
        },
      ];

      const manifest = createManifest('Linked Project', '1.0.0', {
        forms,
        workflows,
      });

      const bundle = createBundleExport(manifest, forms, workflows);

      // Verify relationships are preserved
      expect(bundle.workflows?.[0].canvas.nodes[0].data.formId).toBe(formId);
      expect(bundle.forms?.[0].slug).toBe('test-form');
    });
  });
});
