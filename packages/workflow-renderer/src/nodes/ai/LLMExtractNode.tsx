/**
 * LLMExtractNode - Extract structured data from text
 */

import React, { memo } from 'react';

import { BaseNode } from '../BaseNode';
import type { RendererNodeProps } from '../../types/workflow';

function LLMExtractNodeComponent({ data, selected }: RendererNodeProps) {
  const config = data.config as { fields?: string[] } | undefined;
  const fieldCount = config?.fields?.length;
  const configPreview = fieldCount ? `${fieldCount} fields` : undefined;

  return (
    <BaseNode
      category="ai"
      icon="📤"
      label={data.label || 'LLM Extract'}
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

export const LLMExtractNode = memo(LLMExtractNodeComponent);
export default LLMExtractNode;
