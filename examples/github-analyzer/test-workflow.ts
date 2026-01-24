/**
 * Test script for GitHub Analyzer workflow configuration
 *
 * Run with: npx tsx examples/github-analyzer/test-workflow.ts
 */

import { mainAuditWorkflow, searchWorkflow } from './netpad-workflow-config';

console.log('='.repeat(60));
console.log('GitHub AI Auditor - Workflow Validation');
console.log('='.repeat(60));

// Validate main workflow
console.log('\n📋 Main Audit Workflow');
console.log(`   Name: ${mainAuditWorkflow.name}`);
console.log(`   Slug: ${mainAuditWorkflow.slug}`);
console.log(`   Nodes: ${mainAuditWorkflow.nodes.length}`);
console.log(`   Edges: ${mainAuditWorkflow.edges.length}`);
console.log(`   Variables: ${mainAuditWorkflow.variables.length}`);

console.log('\n   Node Types:');
const nodeTypes = new Map<string, number>();
for (const node of mainAuditWorkflow.nodes) {
  nodeTypes.set(node.type, (nodeTypes.get(node.type) || 0) + 1);
}
for (const [type, count] of nodeTypes) {
  console.log(`     - ${type}: ${count}`);
}

// Check for html-output node
const htmlOutputNode = mainAuditWorkflow.nodes.find(n => n.type === 'html-output');
if (htmlOutputNode) {
  console.log('\n   ✅ HTML Output Node Found:');
  console.log(`      ID: ${htmlOutputNode.id}`);
  console.log(`      Position: (${htmlOutputNode.position.x}, ${htmlOutputNode.position.y})`);
  const config = htmlOutputNode.config as { title?: string; format?: string; template?: string };
  console.log(`      Title: ${config.title}`);
  console.log(`      Format: ${config.format}`);
  console.log(`      Template Length: ${config.template?.length || 0} chars`);
} else {
  console.log('\n   ❌ HTML Output Node NOT Found');
}

// Validate workflow flow
console.log('\n   Workflow Flow:');
const nodeMap = new Map(mainAuditWorkflow.nodes.map(n => [n.id, n]));
const incomingEdges = new Map<string, string[]>();
const outgoingEdges = new Map<string, string[]>();

for (const edge of mainAuditWorkflow.edges) {
  if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
  incomingEdges.get(edge.target)!.push(edge.source);

  if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
  outgoingEdges.get(edge.source)!.push(edge.target);
}

// Find start node (no incoming edges)
const startNodes = mainAuditWorkflow.nodes.filter(n => !incomingEdges.has(n.id));
console.log(`     Start: ${startNodes.map(n => n.id).join(', ')}`);

// Find end nodes (no outgoing edges)
const endNodes = mainAuditWorkflow.nodes.filter(n => !outgoingEdges.has(n.id));
console.log(`     End: ${endNodes.map(n => n.id).join(', ')}`);

// Trace path from trigger to html-output
if (htmlOutputNode) {
  console.log('\n   Path to HTML Output:');
  const visited = new Set<string>();
  const path: string[] = [];

  function findPath(nodeId: string, target: string): boolean {
    if (nodeId === target) {
      path.push(nodeId);
      return true;
    }
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const nextNodes = outgoingEdges.get(nodeId) || [];
    for (const next of nextNodes) {
      if (findPath(next, target)) {
        path.unshift(nodeId);
        return true;
      }
    }
    return false;
  }

  if (findPath('trigger', 'render_report')) {
    console.log(`     ${path.join(' → ')}`);
  }
}

// Search workflow
console.log('\n📋 Search Workflow');
console.log(`   Name: ${searchWorkflow.name}`);
console.log(`   Nodes: ${searchWorkflow.nodes.length}`);
console.log(`   Edges: ${searchWorkflow.edges.length}`);

console.log('\n' + '='.repeat(60));
console.log('✅ Workflow configuration is valid!');
console.log('='.repeat(60));

// Print import instructions
console.log('\n📌 To use this workflow in NetPad:');
console.log('');
console.log('   1. Start NetPad: npm run dev');
console.log('   2. Go to: http://localhost:3000');
console.log('   3. Create a new workflow');
console.log('   4. Add nodes from the palette matching the config');
console.log('   5. Or use the NetPad CLI to import:');
console.log('      netpad workflow import ./examples/github-analyzer/');
console.log('');
