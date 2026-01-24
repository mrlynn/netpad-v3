/**
 * TransformNode - Transform data between nodes
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function TransformNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { type?: string } | undefined;
  const configPreview = config?.type || undefined;

  return (
    <BaseNode
      category="data"
      icon="🔄"
      label={data.label || 'Transform'}
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

export const TransformNode = memo(TransformNodeComponent);
export default TransformNode;
