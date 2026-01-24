/**
 * FunctionNode - Execute custom function/code
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function FunctionNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { name?: string; functionName?: string } | undefined;
  const configPreview = config?.name || config?.functionName || undefined;

  return (
    <BaseNode
      category="action"
      icon="⚙️"
      label={data.label || 'Function'}
      description={data.description}
      selected={selected}
      configPreview={configPreview}
      inputHandles={1}
      outputHandles={1}
      status={data.status}
      error={data.error}
    />
  );
}

export const FunctionNode = memo(FunctionNodeComponent);
export default FunctionNode;
