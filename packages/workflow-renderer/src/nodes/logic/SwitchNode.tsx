/**
 * SwitchNode - Multi-way branching based on value
 */

import React, { memo, useMemo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps, OutputHandleDefinition } from '../../types/workflow';

function SwitchNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { cases?: Array<{ value: string; label?: string }> } | undefined;

  // Generate output handles from cases configuration
  const outputHandleDefs = useMemo<OutputHandleDefinition[]>(() => {
    const outputs: OutputHandleDefinition[] = [];

    if (config?.cases && Array.isArray(config.cases)) {
      config.cases.forEach((caseItem, index) => {
        outputs.push({
          id: `case_${index}`,
          label: caseItem.label || String(caseItem.value),
        });
      });
    }

    // Always add default output
    outputs.push({
      id: 'default',
      label: 'Default',
      color: '#64748B',
    });

    return outputs;
  }, [config?.cases]);

  return (
    <BaseNode
      category="logic"
      icon="🔀"
      label={data.label || 'Switch'}
      description={data.description}
      selected={selected}
      inputHandles={1}
      outputHandleDefs={outputHandleDefs}
      status={data.status}
      error={data.error}
    />
  );
}

export const SwitchNode = memo(SwitchNodeComponent);
export default SwitchNode;
