/**
 * MongoInsertNode - Insert document(s) into MongoDB
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function MongoInsertNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { collection?: string } | undefined;
  const configPreview = config?.collection || undefined;

  return (
    <BaseNode
      category="data"
      icon="➕"
      label={data.label || 'MongoDB Insert'}
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

export const MongoInsertNode = memo(MongoInsertNodeComponent);
export default MongoInsertNode;
