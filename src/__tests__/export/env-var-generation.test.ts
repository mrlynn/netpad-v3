/**
 * Environment Variable Generation Tests
 * 
 * Tests for environment variable template generation from project contents
 */

import '@testing-library/jest-dom';
import { generateEnvVarTemplate, generateDeploymentConfig } from '@/lib/templates/export';
import { FormDefinition, WorkflowDefinition } from '@/types/template';

describe('Environment Variable Generation', () => {
  describe('generateEnvVarTemplate', () => {
    it('should generate core required environment variables', () => {
      const { required, optional } = generateEnvVarTemplate(
        'Test Project',
        [],
        [],
        []
      );

      const requiredNames = required.map(v => v.name);
      
      // Core required vars
      expect(requiredNames).toContain('MONGODB_URI');
      expect(requiredNames).toContain('SESSION_SECRET');
      expect(requiredNames).toContain('VAULT_ENCRYPTION_KEY');
      expect(requiredNames).toContain('NEXT_PUBLIC_APP_URL');

      // Check descriptions
      const mongodbVar = required.find(v => v.name === 'MONGODB_URI');
      expect(mongodbVar?.description).toBeDefined();
      expect(mongodbVar?.required).toBe(true);
      expect(mongodbVar?.generator).toBe('none');
    });

    it('should generate optional MongoDB database variable', () => {
      const { optional } = generateEnvVarTemplate(
        'Test Project',
        [],
        [],
        []
      );

      const optionalNames = optional.map(v => v.name);
      expect(optionalNames).toContain('MONGODB_DATABASE');
      
      const dbVar = optional.find(v => v.name === 'MONGODB_DATABASE');
      expect(dbVar?.default).toBe('netpad_app');
      expect(dbVar?.required).toBe(false);
    });

    it('should detect email integration from workflow nodes', () => {
      const workflows: WorkflowDefinition[] = [
        {
          name: 'Email Workflow',
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

      const { required } = generateEnvVarTemplate(
        'Email Project',
        [],
        workflows,
        []
      );

      const varNames = required.map(v => v.name);
      expect(varNames).toContain('SMTP_HOST');
      expect(varNames).toContain('SMTP_PORT');
      expect(varNames).toContain('SMTP_USER');
      expect(varNames).toContain('SMTP_PASS');
      expect(varNames).toContain('FROM_EMAIL');
    });

    it('should detect Slack integration from workflow nodes', () => {
      const workflows: WorkflowDefinition[] = [
        {
          name: 'Slack Workflow',
          canvas: {
            nodes: [
              {
                id: 'node_1',
                type: 'slack-send',
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
          },
          settings: {},
        },
      ];

      const { optional } = generateEnvVarTemplate(
        'Slack Project',
        [],
        workflows,
        []
      );

      const varNames = optional.map(v => v.name);
      expect(varNames).toContain('SLACK_CLIENT_ID');
      expect(varNames).toContain('SLACK_CLIENT_SECRET');
    });

    it('should detect AI integration from workflow nodes', () => {
      const workflows: WorkflowDefinition[] = [
        {
          name: 'AI Workflow',
          canvas: {
            nodes: [
              {
                id: 'node_1',
                type: 'ai-prompt',
                position: { x: 0, y: 0 },
                data: {},
              },
            ],
            edges: [],
          },
          settings: {},
        },
      ];

      const { optional } = generateEnvVarTemplate(
        'AI Project',
        [],
        workflows,
        []
      );

      const varNames = optional.map(v => v.name);
      expect(varNames).toContain('OPENAI_API_KEY');
    });

    it('should detect Turnstile bot protection from forms', () => {
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

      const { required } = generateEnvVarTemplate(
        'Protected Project',
        forms,
        [],
        []
      );

      const varNames = required.map(v => v.name);
      expect(varNames).toContain('TURNSTILE_SITE_KEY');
      expect(varNames).toContain('TURNSTILE_SECRET_KEY');
    });

    it('should detect file upload requirements from forms', () => {
      const forms: FormDefinition[] = [
        {
          name: 'File Form',
          fieldConfigs: [
            {
              path: 'document',
              label: 'Document',
              type: 'file',
              included: true,
            },
            {
              path: 'image',
              label: 'Image',
              type: 'image',
              included: true,
            },
          ],
        },
      ];

      const { required } = generateEnvVarTemplate(
        'File Project',
        forms,
        [],
        []
      );

      const varNames = required.map(v => v.name);
      expect(varNames).toContain('BLOB_READ_WRITE_TOKEN');
    });

    it('should not duplicate environment variables', () => {
      const workflows: WorkflowDefinition[] = [
        {
          name: 'Workflow 1',
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
        {
          name: 'Workflow 2',
          canvas: {
            nodes: [
              {
                id: 'node_2',
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

      const { required } = generateEnvVarTemplate(
        'Duplicate Test',
        [],
        workflows,
        []
      );

      const varNames = required.map(v => v.name);
      const uniqueNames = new Set(varNames);
      
      // Should have no duplicates
      expect(varNames.length).toBe(uniqueNames.size);
    });

    it('should include optional OAuth variables', () => {
      const { optional } = generateEnvVarTemplate(
        'OAuth Project',
        [],
        [],
        []
      );

      const varNames = optional.map(v => v.name);
      expect(varNames).toContain('GOOGLE_CLIENT_ID');
      expect(varNames).toContain('GOOGLE_CLIENT_SECRET');
      expect(varNames).toContain('GITHUB_CLIENT_ID');
      expect(varNames).toContain('GITHUB_CLIENT_SECRET');
    });
  });

  describe('generateDeploymentConfig', () => {
    it('should generate complete deployment config', () => {
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

      expect(config.mode).toBe('standalone');
      expect(config.database.provisioning).toBe('auto');
      expect(config.seed.forms).toBe(true);
      expect(config.seed.workflows).toBe(true);
      expect(config.branding?.appName).toBe('Test Project');
    });

    it('should generate collections for forms and workflows', () => {
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

      const config = generateDeploymentConfig(
        'Collections Test',
        forms,
        workflows,
        []
      );

      const collectionNames = config.database.collections.map(c => c.name);
      
      expect(collectionNames).toContain('forms');
      expect(collectionNames).toContain('form_submissions');
      expect(collectionNames).toContain('workflows');
      expect(collectionNames).toContain('workflow_executions');
      expect(collectionNames).toContain('workflow_jobs');
    });

    it('should generate indexes for collections', () => {
      const config = generateDeploymentConfig(
        'Indexes Test',
        [],
        [],
        []
      );

      const formsCollection = config.database.collections.find(
        c => c.name === 'forms'
      );
      
      expect(formsCollection?.indexes).toBeDefined();
      expect(formsCollection?.indexes?.length).toBeGreaterThan(0);
      
      // Check for slug index
      const slugIndex = formsCollection?.indexes?.find(
        i => i.name === 'forms_slug_idx'
      );
      expect(slugIndex).toBeDefined();
      expect(slugIndex?.unique).toBe(true);
    });

    it('should respect custom options', () => {
      const config = generateDeploymentConfig(
        'Custom Project',
        [],
        [],
        [],
        {
          mode: 'connected',
          provisioning: 'manual',
          seedSampleData: true,
          branding: {
            primaryColor: '#FF0000',
            logo: 'https://example.com/logo.png',
          },
        }
      );

      expect(config.mode).toBe('connected');
      expect(config.database.provisioning).toBe('manual');
      expect(config.seed.sampleData).toBe(true);
      expect(config.branding?.primaryColor).toBe('#FF0000');
      expect(config.branding?.logo).toBe('https://example.com/logo.png');
    });

    it('should not include workflow collections when no workflows', () => {
      const config = generateDeploymentConfig(
        'Forms Only',
        [
          {
            name: 'Form 1',
            fieldConfigs: [],
          },
        ],
        [],
        []
      );

      const collectionNames = config.database.collections.map(c => c.name);
      
      expect(collectionNames).toContain('forms');
      expect(collectionNames).toContain('form_submissions');
      expect(collectionNames).not.toContain('workflows');
      expect(collectionNames).not.toContain('workflow_executions');
    });
  });
});
