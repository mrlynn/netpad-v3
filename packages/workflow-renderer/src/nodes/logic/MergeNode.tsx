/**
 * MergeNode - Combine multiple branches into one
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function MergeNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { strategy?: string } | undefined;
  const configPreview = config?.strategy || undefined;

  return (
    <BaseNode
      category="logic"
      icon="🔄"
      label={data.label || 'Merge'}
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

export const MergeNode = memo(MergeNodeComponent);
export default MergeNode;
