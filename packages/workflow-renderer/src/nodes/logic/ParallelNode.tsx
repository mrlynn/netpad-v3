/**
 * ParallelNode - Execute multiple branches simultaneously
 */

import React, { memo, useMemo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps, OutputHandleDefinition } from '../../types/workflow';

function ParallelNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { branches?: number } | undefined;
  const branchCount = config?.branches || 2;

  const outputHandleDefs = useMemo<OutputHandleDefinition[]>(() => {
    const outputs: OutputHandleDefinition[] = [];
    for (let i = 1; i <= branchCount; i++) {
      outputs.push({
        id: `branch_${i}`,
        label: `Branch ${i}`,
      });
    }
    return outputs;
  }, [branchCount]);

  return (
    <BaseNode
      category="logic"
      icon="⚡"
      label={data.label || 'Parallel'}
      description={data.description}
      selected={selected}
      configPreview={`${branchCount} branches`}
      inputHandles={1}
      outputHandleDefs={outputHandleDefs}
      status={data.status}
      error={data.error}
    />
  );
}

export const ParallelNode = memo(ParallelNodeComponent);
export default ParallelNode;
