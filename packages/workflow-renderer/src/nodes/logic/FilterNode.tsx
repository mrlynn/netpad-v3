/**
 * FilterNode - Conditional branching (Yes/No)
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import { LOGIC_NODE_OUTPUTS, type RendererNodeProps } from '../../types/workflow';

function FilterNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { condition?: string } | undefined;
  const configPreview = config?.condition || undefined;

  return (
    <BaseNode
      category="logic"
      icon="🔍"
      label={data.label || 'Filter'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={1}
      outputHandleDefs={LOGIC_NODE_OUTPUTS.filter}
      status={data.status}
      error={data.error}
    />
  );
}

export const FilterNode = memo(FilterNodeComponent);
export default FilterNode;
