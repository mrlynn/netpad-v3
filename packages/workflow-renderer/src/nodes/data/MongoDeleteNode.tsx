/**
 * MongoDeleteNode - Delete document(s) from MongoDB
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function MongoDeleteNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { collection?: string } | undefined;
  const configPreview = config?.collection || undefined;

  return (
    <BaseNode
      category="data"
      icon="🗑️"
      label={data.label || 'MongoDB Delete'}
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

export const MongoDeleteNode = memo(MongoDeleteNodeComponent);
export default MongoDeleteNode;
