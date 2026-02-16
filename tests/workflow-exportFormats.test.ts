import {
  workflowToMermaid,
  workflowToN8n,
  exportWorkflow,
} from '@/lib/workflow/exportFormats';

function makeWorkflow(overrides: any = {}) {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    description: 'A test workflow',
    canvas: {
      nodes: [
        { id: 'node-1', type: 'form-trigger', label: 'Start', position: { x: 0, y: 0 }, enabled: true, config: {} },
        { id: 'node-2', type: 'http-request', label: 'Fetch Data', position: { x: 200, y: 0 }, enabled: true, config: { url: 'https://api.example.com', method: 'GET' } },
        { id: 'node-3', type: 'conditional', label: 'Check Status', position: { x: 400, y: 0 }, enabled: true, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', sourceHandle: 'default', targetHandle: 'input' },
        { id: 'e2', source: 'node-2', target: 'node-3', sourceHandle: 'default', targetHandle: 'input', condition: { label: 'success', expression: '' } },
      ],
    },
    status: 'active',
    tags: ['test'],
    ...overrides,
  };
}

describe('workflowToMermaid', () => {
  it('generates TB flowchart', () => {
    const mermaid = workflowToMermaid(makeWorkflow(), 'TB');
    expect(mermaid).toContain('flowchart TB');
    expect(mermaid).toContain('node_1');
    expect(mermaid).toContain('"Start"');
    expect(mermaid).toContain('"Fetch Data"');
  });

  it('generates LR flowchart', () => {
    const mermaid = workflowToMermaid(makeWorkflow(), 'LR');
    expect(mermaid).toContain('flowchart LR');
  });

  it('defaults to TB', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('flowchart TB');
  });

  it('includes workflow name as comment', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('%% Workflow: Test Workflow');
  });

  it('includes description as comment', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('%% A test workflow');
  });

  it('creates subgraph for trigger nodes', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('subgraph Triggers');
  });

  it('uses stadium shape for triggers', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toMatch(/node_1\(\[/);
  });

  it('uses diamond shape for conditionals', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toMatch(/node_3\{"/);
  });

  it('uses rectangle shape for http-request', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toMatch(/node_2\["/);
  });

  it('renders edge with condition label', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('|success|');
  });

  it('renders animated edges as dashed', () => {
    const wf = makeWorkflow();
    wf.canvas.edges[0].animated = true;
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).toContain('-.->');
  });

  it('sanitizes IDs (removes special chars)', () => {
    const wf = makeWorkflow();
    wf.canvas.nodes = [{ id: 'my-node.1', type: 'http-request', label: 'Test', position: { x: 0, y: 0 }, enabled: true, config: {} }];
    wf.canvas.edges = [];
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).toContain('my_node_1');
  });

  it('sanitizes labels (escapes brackets)', () => {
    const wf = makeWorkflow();
    wf.canvas.nodes = [{ id: 'n1', type: 'http-request', label: 'Test [1] {2}', position: { x: 0, y: 0 }, enabled: true, config: {} }];
    wf.canvas.edges = [];
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).toContain('Test (1) (2)');
  });

  it('truncates long labels to 50 chars', () => {
    const wf = makeWorkflow();
    const longLabel = 'A'.repeat(100);
    wf.canvas.nodes = [{ id: 'n1', type: 'http-request', label: longLabel, position: { x: 0, y: 0 }, enabled: true, config: {} }];
    wf.canvas.edges = [];
    const mermaid = workflowToMermaid(wf);
    // The label in the output should be 50 chars
    expect(mermaid).toContain('A'.repeat(50));
    expect(mermaid).not.toContain('A'.repeat(51));
  });

  it('includes styling classes', () => {
    const mermaid = workflowToMermaid(makeWorkflow());
    expect(mermaid).toContain('classDef trigger');
    expect(mermaid).toContain('classDef logic');
    expect(mermaid).toContain('classDef action');
  });

  it('handles workflow with no description', () => {
    const wf = makeWorkflow({ description: undefined });
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).not.toContain('%% undefined');
  });

  it('uses sourceHandle as label when no condition', () => {
    const wf = makeWorkflow();
    wf.canvas.edges = [{ id: 'e1', source: 'node-1', target: 'node-2', sourceHandle: 'yes', targetHandle: 'input' }];
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).toContain('|yes|');
  });

  it('handles empty workflow', () => {
    const wf = makeWorkflow();
    wf.canvas.nodes = [];
    wf.canvas.edges = [];
    const mermaid = workflowToMermaid(wf);
    expect(mermaid).toContain('flowchart TB');
  });
});

describe('workflowToN8n', () => {
  it('converts nodes with correct types', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.name).toBe('Test Workflow');
    expect(n8n.nodes).toHaveLength(3);
    expect(n8n.nodes[0].type).toBe('n8n-nodes-base.formTrigger');
    expect(n8n.nodes[1].type).toBe('n8n-nodes-base.httpRequest');
    expect(n8n.nodes[2].type).toBe('n8n-nodes-base.if');
  });

  it('maps positions', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.nodes[1].position).toEqual([200, 0]);
  });

  it('builds connections', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.connections['Start']).toBeDefined();
    expect(n8n.connections['Start'].main[0][0].node).toBe('Fetch Data');
  });

  it('sets active from status', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.active).toBe(true);
  });

  it('includes meta', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.meta.exportedFrom).toBe('NetPad');
    expect(n8n.meta.originalId).toBe('wf-1');
  });

  it('uses noOp for unknown node types', () => {
    const wf = makeWorkflow();
    wf.canvas.nodes = [{ id: 'n1', type: 'unknown-type', label: 'X', position: { x: 0, y: 0 }, enabled: true, config: {} }];
    wf.canvas.edges = [];
    const n8n = workflowToN8n(wf) as any;
    expect(n8n.nodes[0].type).toBe('n8n-nodes-base.noOp');
  });

  it('converts http-request config', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    const httpNode = n8n.nodes.find((n: any) => n.type === 'n8n-nodes-base.httpRequest');
    expect(httpNode.parameters.url).toBe('https://api.example.com');
    expect(httpNode.parameters.method).toBe('GET');
  });

  it('includes tags', () => {
    const n8n = workflowToN8n(makeWorkflow()) as any;
    expect(n8n.tags).toEqual(['test']);
  });
});

describe('exportWorkflow', () => {
  it('exports as JSON', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'json' });
    expect(result.mimeType).toBe('application/json');
    expect(result.fileExtension).toBe('json');
    expect(JSON.parse(result.content).name).toBe('Test Workflow');
  });

  it('exports as mermaid-tb', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'mermaid-tb' });
    expect(result.content).toContain('flowchart TB');
    expect(result.fileExtension).toBe('mmd');
  });

  it('exports as mermaid-lr', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'mermaid-lr' });
    expect(result.content).toContain('flowchart LR');
  });

  it('exports as n8n', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'n8n' });
    const parsed = JSON.parse(result.content);
    expect(parsed.meta.exportedFrom).toBe('NetPad');
  });

  it('exports as make', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'make' });
    const parsed = JSON.parse(result.content);
    expect(parsed.metadata.exportedFrom).toBe('NetPad');
  });

  it('throws for unsupported format', () => {
    expect(() => exportWorkflow(makeWorkflow(), { format: 'yaml' as any })).toThrow('Unsupported');
  });

  it('generates correct filename', () => {
    const result = exportWorkflow(makeWorkflow(), { format: 'json' });
    expect(result.filename).toBe('test-workflow-definition.json');
  });
});
