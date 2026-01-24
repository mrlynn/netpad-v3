/**
 * VariableSetNode - Set a workflow variable
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function VariableSetNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { name?: string; variableName?: string } | undefined;
  const configPreview = config?.name || config?.variableName || undefined;

  return (
    <BaseNode
      category="utility"
      icon="📥"
      label={data.label || 'Set Variable'}
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

export const VariableSetNode = memo(VariableSetNodeComponent);
export default VariableSetNode;
