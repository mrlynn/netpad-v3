/**
 * LoopNode - Iterate over array items
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import { LOGIC_NODE_OUTPUTS, type RendererNodeProps } from '../../types/workflow';

function LoopNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { iterator?: string } | undefined;
  const configPreview = config?.iterator || undefined;

  return (
    <BaseNode
      category="logic"
      icon="🔁"
      label={data.label || 'Loop'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={1}
      outputHandleDefs={LOGIC_NODE_OUTPUTS.loop}
      status={data.status}
      error={data.error}
    />
  );
}

export const LoopNode = memo(LoopNodeComponent);
export default LoopNode;
