/**
 * LLMClassifyNode - Classify text into categories
 */

import React, { memo, useMemo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps, OutputHandleDefinition } from '../../types/workflow';

function LLMClassifyNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { categories?: string[] } | undefined;

  // Generate output handles from categories
  const outputHandleDefs = useMemo<OutputHandleDefinition[]>(() => {
    if (!config?.categories || config.categories.length === 0) {
      return [
        { id: 'output', label: 'Result' },
      ];
    }

    return config.categories.map((category, index) => ({
      id: `category_${index}`,
      label: category,
    }));
  }, [config?.categories]);

  return (
    <BaseNode
      category="ai"
      icon="🏷️"
      label={data.label || 'LLM Classify'}
      description={data.description}
      selected={selected}
      inputHandles={1}
      outputHandleDefs={outputHandleDefs.length > 1 ? outputHandleDefs : undefined}
      outputHandles={outputHandleDefs.length > 1 ? 0 : 1}
      status={data.status}
      error={data.error}
    />
  );
}

export const LLMClassifyNode = memo(LLMClassifyNodeComponent);
export default LLMClassifyNode;
